package com.comnet360.incident.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("ComNet360 — Incident Service API")
                        .description("""
                                Incident and Exception Management Service.
                                Handles outage detection, incident logging,
                                resolution workflows, escalation management,
                                and collaborative comments.
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("ComNet360 Team")
                                .email("admin@comnet360.com")))
                .addSecurityItem(new SecurityRequirement()
                        .addList("Bearer Authentication"))
                .components(new Components()
                        .addSecuritySchemes("Bearer Authentication",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Paste your JWT access token here")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8084")
                                .description("Incident Service — Direct"),
                        new Server()
                                .url("http://localhost:8080")
                                .description("API Gateway")));
    }
}