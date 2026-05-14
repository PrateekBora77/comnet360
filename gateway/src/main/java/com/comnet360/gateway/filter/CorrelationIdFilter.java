package com.comnet360.gateway.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Slf4j
@Component
public class CorrelationIdFilter implements GlobalFilter, Ordered {

    static final String CORRELATION_ID_HEADER = "X-Correlation-Id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String correlationId = exchange.getRequest().getHeaders()
                .getFirst(CORRELATION_ID_HEADER);

        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        final String finalCorrelationId = correlationId;
        final long startTime = System.currentTimeMillis();

        // Stamp correlation ID on the request forwarded to downstream services
        ServerWebExchange mutatedExchange = exchange.mutate()
                .request(exchange.getRequest().mutate()
                        .header(CORRELATION_ID_HEADER, finalCorrelationId)
                        .build())
                .build();

        log.info("→ REQUEST  [{} {}] correlationId={}",
                exchange.getRequest().getMethod(),
                exchange.getRequest().getURI().getPath(),
                finalCorrelationId);

        return chain.filter(mutatedExchange)
                .doFinally(signal -> {
                    long duration = System.currentTimeMillis() - startTime;
                    log.info("← RESPONSE [{} {}] status={} duration={}ms correlationId={}",
                            mutatedExchange.getRequest().getMethod(),
                            mutatedExchange.getRequest().getURI().getPath(),
                            mutatedExchange.getResponse().getStatusCode(),
                            duration,
                            finalCorrelationId);
                });
    }

    // Run before JwtAuthFilter (which is a GatewayFilter, not GlobalFilter)
    // so correlation ID is available on every request including public routes
    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
