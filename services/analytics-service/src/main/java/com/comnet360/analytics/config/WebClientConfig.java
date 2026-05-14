package com.comnet360.analytics.config;

import org.springframework.cloud.client.loadbalancer.reactive.ReactorLoadBalancerExchangeFilterFunction;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean("provisioningClient")
    public WebClient provisioningClient(
            ReactorLoadBalancerExchangeFilterFunction lbFunction) {
        return WebClient.builder()
                .baseUrl("http://provisioning-service")
                .filter(lbFunction)
                .build();
    }

    @Bean("usageSlaClient")
    public WebClient usageSlaClient(
            ReactorLoadBalancerExchangeFilterFunction lbFunction) {
        return WebClient.builder()
                .baseUrl("http://usage-sla-service")
                .filter(lbFunction)
                .build();
    }

    @Bean("incidentClient")
    public WebClient incidentClient(
            ReactorLoadBalancerExchangeFilterFunction lbFunction) {
        return WebClient.builder()
                .baseUrl("http://incident-service")
                .filter(lbFunction)
                .build();
    }
}