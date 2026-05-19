package com.comnet360.iam.service;

import com.comnet360.iam.dto.request.LoginRequest;
import com.comnet360.iam.dto.request.RegisterRequest;
import com.comnet360.iam.dto.response.AuthResponse;
import com.comnet360.iam.entity.RefreshToken;
import com.comnet360.iam.entity.User;
import com.comnet360.iam.enums.Role;
import com.comnet360.iam.exception.ConflictException;
import com.comnet360.iam.exception.UnauthorizedException;
import com.comnet360.iam.repository.RefreshTokenRepository;
import com.comnet360.iam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository          userRepository;
    private final RefreshTokenRepository  refreshTokenRepository;
    private final JwtService              jwtService;
    private final AuditLogService         auditLogService;
    private final PasswordEncoder         passwordEncoder;
    private final AuthenticationManager   authenticationManager;

    // ── Register ─────────────────────────────────────────────────

    @Transactional
    public AuthResponse register(RegisterRequest request, String ipAddress) {

        // 1. Check email not already taken
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("Email already registered: " + request.getEmail());
        }

        // 2. Build and save the user
        // First user ever registered becomes ADMIN automatically (bootstrap — no SQL needed)
        Role role = userRepository.count() == 0 ? Role.ADMIN : Role.ENTERPRISE_USER;

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(role)
                .isActive(true)
                .build();

        user = userRepository.save(user);
        log.info("New user registered: {}", user.getEmail());

        // 3. Generate tokens
        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = generateAndSaveRefreshToken(user);

        // 4. Write audit log
        auditLogService.log(user.getUserId(), "USER_REGISTERED",
                "User", String.valueOf(user.getUserId()),
                "New user registered with email: " + user.getEmail(),
                ipAddress);

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    // ── Login ────────────────────────────────────────────────────

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress) {

        // 1. Authenticate via Spring Security (checks password + account status)
        // DaoAuthenticationProvider checks isAccountNonLocked() BEFORE the password,
        // so a deactivated user throws LockedException / DisabledException — catch
        // these specifically so the message distinguishes "disabled" from "bad password".
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()
                    )
            );
        } catch (LockedException | DisabledException e) {
            log.warn("Deactivated account login attempt: {}", request.getEmail());
            throw new UnauthorizedException("Account is deactivated");
        } catch (AuthenticationException e) {
            log.warn("Failed login attempt for email: {}", request.getEmail());
            throw new UnauthorizedException("Invalid email or password");
        }

        // 2. Load the user
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // 3. Redundant guard — authenticationManager already caught this above,
        //    kept as a safety net in case the provider configuration changes.
        if (!user.getIsActive()) {
            throw new UnauthorizedException("Account is deactivated");
        }

        // 4. Revoke old refresh tokens and generate new ones
        refreshTokenRepository.revokeAllUserTokens(user.getUserId());
        String accessToken  = jwtService.generateAccessToken(user);
        String refreshToken = generateAndSaveRefreshToken(user);

        // 5. Write audit log
        auditLogService.log(user.getUserId(), "USER_LOGIN", ipAddress);

        log.info("User logged in: {}", user.getEmail());
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    // ── Refresh Token ────────────────────────────────────────────

    @Transactional
    public AuthResponse refreshToken(String refreshTokenValue, String ipAddress) {

        // 1. Find token in DB
        RefreshToken refreshToken = refreshTokenRepository
                .findByToken(refreshTokenValue)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        // 2. Check it's still valid
        if (!refreshToken.isValid()) {
            throw new UnauthorizedException("Refresh token expired or revoked");
        }

        // 3. Load user
        User user = userRepository.findById(refreshToken.getUserId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // 4. Revoke old and issue new tokens
        refreshTokenRepository.revokeAllUserTokens(user.getUserId());
        String newAccessToken  = jwtService.generateAccessToken(user);
        String newRefreshToken = generateAndSaveRefreshToken(user);

        auditLogService.log(user.getUserId(), "TOKEN_REFRESHED", ipAddress);

        return buildAuthResponse(user, newAccessToken, newRefreshToken);
    }

    // ── Logout ───────────────────────────────────────────────────

    @Transactional
    public void logout(Long userId, String ipAddress) {
        refreshTokenRepository.revokeAllUserTokens(userId);
        auditLogService.log(userId, "USER_LOGOUT", ipAddress);
        log.info("User logged out: userId={}", userId);
    }

    // ── Private Helpers ──────────────────────────────────────────

    private String generateAndSaveRefreshToken(User user) {
        String tokenValue = jwtService.generateRefreshToken();

        RefreshToken refreshToken = RefreshToken.builder()
                .userId(user.getUserId())
                .token(tokenValue)
                .expiresAt(LocalDateTime.now().plusSeconds(
                        jwtService.getRefreshExpirationMs() / 1000))
                .revoked(false)
                .build();

        refreshTokenRepository.save(refreshToken);
        return tokenValue;
    }

    private AuthResponse buildAuthResponse(User user,
                                           String accessToken,
                                           String refreshToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationMs())
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}