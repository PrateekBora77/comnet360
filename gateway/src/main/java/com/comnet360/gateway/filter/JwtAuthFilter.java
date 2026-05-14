package com.comnet360.gateway.filter;

import com.comnet360.gateway.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Slf4j
@Component
public class JwtAuthFilter extends AbstractGatewayFilterFactory<JwtAuthFilter.Config> {

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        super(Config.class);
        this.jwtUtil = jwtUtil;
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {

            String path = exchange.getRequest().getURI().getPath();
            log.debug("JwtAuthFilter processing request: {}", path);

            // 1. Get the Authorization header
            String authHeader = exchange.getRequest()
                    .getHeaders()
                    .getFirst(HttpHeaders.AUTHORIZATION);

            // 2. Check header exists and starts with "Bearer "
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.warn("Missing or invalid Authorization header for path: {}", path);
                return unauthorizedResponse(exchange, "Missing or invalid Authorization header");
            }

            // 3. Extract the token
            String token = authHeader.substring(7);

            // 4. Validate the token
            if (!jwtUtil.isTokenValid(token)) {
                log.warn("Invalid or expired JWT token for path: {}", path);
                return unauthorizedResponse(exchange, "Invalid or expired token");
            }

            // 5. Token is valid — extract user info and forward as headers
            // Downstream services read these headers to know who is calling
            String email  = jwtUtil.extractEmail(token);
            String role   = jwtUtil.extractRole(token);
            Long   userId = jwtUtil.extractUserId(token);

            log.debug("Authenticated user: {} with role: {}", email, role);

            // 6. Forward the request with extra headers added
            ServerWebExchange mutatedExchange = exchange.mutate()
                    .request(exchange.getRequest().mutate()
                            .header("X-User-Email",  email)
                            .header("X-User-Role",   role)
                            .header("X-User-Id",     String.valueOf(userId))
                            .build())
                    .build();

            return chain.filter(mutatedExchange);
        };
    }

    // Helper — returns 401 Unauthorized response
    private Mono<Void> unauthorizedResponse(ServerWebExchange exchange, String message) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().add("Content-Type", "application/json");
        var buffer = exchange.getResponse()
                .bufferFactory()
                .wrap(("{\"error\":\"" + message + "\"}").getBytes());
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }

    // Config class — required by AbstractGatewayFilterFactory
    // Can be extended later to add per-route config (e.g. required roles)
    public static class Config {
    }
}