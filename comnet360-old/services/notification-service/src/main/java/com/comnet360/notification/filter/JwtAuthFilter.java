package com.comnet360.notification.filter;

import com.comnet360.notification.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
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
import java.util.*;

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

        // ── Path 1: Gateway headers (production flow) ────────────
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

        // ── Path 2: Direct JWT (Swagger / dev testing) ───────────
        // Extracts user info from the token and injects it as request headers
        // so downstream controllers can read X-User-Id, X-User-Email, X-User-Role.
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.isTokenValid(token)) {
                try {
                    String email  = jwtUtil.extractEmail(token);
                    String role   = jwtUtil.extractRole(token);
                    Long   userId = jwtUtil.extractUserId(token);

                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    email, null,
                                    List.of(new SimpleGrantedAuthority("ROLE_" + role))
                            );
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.debug("Auth via direct JWT: {} role: {}", email, role);

                    HeaderMutatingRequest wrapped = new HeaderMutatingRequest(request);
                    wrapped.addHeader("X-User-Email", email);
                    wrapped.addHeader("X-User-Role",  role);
                    wrapped.addHeader("X-User-Id",    String.valueOf(userId));
                    filterChain.doFilter(wrapped, response);
                    return;
                } catch (Exception e) {
                    log.warn("Direct JWT auth failed: {}", e.getMessage());
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private static class HeaderMutatingRequest extends HttpServletRequestWrapper {

        private final Map<String, String> extraHeaders = new HashMap<>();

        public HeaderMutatingRequest(HttpServletRequest request) { super(request); }

        public void addHeader(String name, String value) { extraHeaders.put(name, value); }

        @Override
        public String getHeader(String name) {
            String v = extraHeaders.get(name);
            return v != null ? v : super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            List<String> names = Collections.list(super.getHeaderNames());
            names.addAll(extraHeaders.keySet());
            return Collections.enumeration(names);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            List<String> values = Collections.list(super.getHeaders(name));
            if (extraHeaders.containsKey(name)) values.add(extraHeaders.get(name));
            return Collections.enumeration(values);
        }
    }
}
