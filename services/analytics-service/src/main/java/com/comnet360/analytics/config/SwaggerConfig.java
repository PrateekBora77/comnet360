package com.comnet360.analytics.config;

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
                        .title("ComNet360 — Analytics Service API")
                        .description("""
                                Analytics and Reporting Service.
                                Generates KPI reports, SLA compliance summaries,
                                incident analytics, and pre-computed dashboard
                                snapshots for fast frontend loading.
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
                                .url("http://localhost:8085")
                                .description("Analytics Service — Direct"),
                        new Server()
                                .url("http://localhost:8080")
                                .description("API Gateway")));
    }
}