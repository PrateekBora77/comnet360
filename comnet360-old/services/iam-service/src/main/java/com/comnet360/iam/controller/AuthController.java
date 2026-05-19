package com.comnet360.iam.controller;

import com.comnet360.iam.dto.request.LoginRequest;
import com.comnet360.iam.dto.request.RegisterRequest;
import com.comnet360.iam.dto.response.AuthResponse;
import com.comnet360.iam.service.AuthService;
import com.comnet360.iam.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {

        AuthResponse response = authService.register(
                request, httpRequest.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        AuthResponse response = authService.login(
                request, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(response);
    }

    // POST /api/auth/refresh
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest) {

        String refreshToken = body.get("refreshToken");
        AuthResponse response = authService.refreshToken(
                refreshToken, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(response);
    }

    // POST /api/auth/logout
    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> logout(
            Authentication authentication,
            HttpServletRequest httpRequest) {

        User currentUser = (User) authentication.getPrincipal();
        authService.logout(currentUser.getUserId(), httpRequest.getRemoteAddr());
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }
}