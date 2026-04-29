package com.comnet360.incident.filter;

import com.comnet360.incident.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        // Path 1 — Gateway headers (production)
        String userEmail = request.getHeader("X-User-Email");
        String userRole  = request.getHeader("X-User-Role");

        if (userEmail != null && userRole != null) {
            try {
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userEmail, null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + userRole))
                        );
                SecurityContextHolder.getContext().setAuthentication(authToken);
                log.debug("Auth via gateway headers: {} role: {}", userEmail, userRole);
            } catch (Exception e) {
                log.warn("Gateway header auth failed: {}", e.getMessage());
            }
            filterChain.doFilter(request, response);
            return;
        }

        // Path 2 — Direct JWT (Swagger / dev)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.isTokenValid(token)) {
                try {
                    String email = jwtUtil.extractEmail(token);
                    String role  = jwtUtil.extractRole(token);
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    email, null,
                                    List.of(new SimpleGrantedAuthority("ROLE_" + role))
                            );
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.debug("Auth via direct JWT: {} role: {}", email, role);
                } catch (Exception e) {
                    log.warn("Direct JWT auth failed: {}", e.getMessage());
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}