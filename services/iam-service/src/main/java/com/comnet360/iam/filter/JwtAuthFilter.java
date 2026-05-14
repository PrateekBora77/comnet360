package com.comnet360.iam.filter;

import com.comnet360.iam.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService         jwtService;
    private final UserDetailsService  userDetailsService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── Path 1: Gateway headers (production flow) ─────────────────────────
        // Gateway has already validated the JWT and injected X-User-Email and
        // X-User-Id. We still load UserDetails so that SpEL expressions such as
        // `authentication.principal.userId` work in @PreAuthorize annotations.
        String gatewayEmail  = request.getHeader("X-User-Email");
        String gatewayUserId = request.getHeader("X-User-Id");

        if (gatewayEmail != null && gatewayUserId != null) {
            try {
                UserDetails userDetails = userDetailsService.loadUserByUsername(gatewayEmail);
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
                log.debug("Auth via gateway headers: {}", gatewayEmail);
            } catch (Exception e) {
                log.warn("Gateway header auth failed: {}", e.getMessage());
            }
            filterChain.doFilter(request, response);
            return;
        }

        // ── Path 2: Direct JWT (Swagger / dev testing) ────────────────────────
        // Validates the JWT, loads UserDetails (for SpEL principal), then wraps
        // the request to inject X-User-Email, X-User-Role, and X-User-Id headers
        // so controllers that read those headers work without the gateway.
        final String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7);
        try {
            if (jwtService.isTokenValid(token)) {
                String email  = jwtService.extractEmail(token);
                Long   userId = jwtService.extractUserId(token);
                String role   = jwtService.extractRole(token);

                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
                log.debug("Auth via direct JWT: {} role: {}", email, role);

                HeaderMutatingRequest wrapped = new HeaderMutatingRequest(request);
                wrapped.addHeader("X-User-Email", email);
                wrapped.addHeader("X-User-Role",  role);
                wrapped.addHeader("X-User-Id",    String.valueOf(userId));
                filterChain.doFilter(wrapped, response);
                return;
            }
        } catch (Exception e) {
            log.warn("JWT authentication failed: {}", e.getMessage());
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
