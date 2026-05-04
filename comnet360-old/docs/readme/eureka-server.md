# Eureka Server — Service Registry

> 📚 [Back to README](../README.md) | [Documentation Index](../README.md#documentation-index)

---


> Port: **8761** | Spring Cloud Netflix Eureka Server

---

## Overview

The Eureka Server is the service registry for the ComNet360 platform. All 6 microservices and the API Gateway register themselves with Eureka on startup. This enables dynamic service discovery — the gateway uses service names (`lb://iam-service`) instead of hardcoded ports (`http://localhost:8081`).

| Item | Detail |
|------|--------|
| Port | 8761 |
| Dashboard | http://localhost:8761 |
| Dependency | spring-cloud-starter-netflix-eureka-server |
| Main annotation | @EnableEurekaServer |

---

## Why Eureka?

**Without Eureka (hardcoded ports):**
```
Gateway routes to: http://localhost:8081  ← breaks if port changes
                   http://localhost:8082  ← breaks in Docker/Cloud
```

**With Eureka (service discovery):**
```
Gateway routes to: lb://iam-service        ← resolved dynamically
                   lb://provisioning-service ← works in any environment
```

Benefits:
- Services register at startup with their actual IP and port
- Gateway resolves service names at request time via Eureka
- Works correctly in Docker and Kubernetes where ports are dynamic
- Built-in load balancing — multiple instances of one service auto-balanced
- Health monitoring — Eureka dashboard shows UP/DOWN status of all services

---

## Project Structure

```
eureka-server/
├── pom.xml
└── src/main/
    ├── java/com/comnet360/eurekaserver/
    │   └── EurekaServerApplication.java
    └── resources/
        └── application.yml
```

---

## pom.xml

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
</dependency>
```

Only one dependency needed — no database, no security, no Swagger required.

---

## EurekaServerApplication.java

```java
@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
```

`@EnableEurekaServer` is the only annotation required beyond `@SpringBootApplication`.

---

## application.yml

```yaml
server:
  port: 8761

spring:
  application:
    name: eureka-server

eureka:
  instance:
    hostname: localhost
  client:
    register-with-eureka: false   # server does not register itself
    fetch-registry: false          # server does not fetch from itself
    service-url:
      defaultZone: http://localhost:8761/eureka/
  server:
    enable-self-preservation: false   # disable for local dev
    eviction-interval-timer-in-ms: 5000

logging:
  level:
    com.netflix.eureka: WARN
    com.netflix.discovery: WARN
```

---

## Eureka Client Config (added to all 6 services + gateway)

Each service has this block added to its `application.yml`:

```yaml
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
    register-with-eureka: true
    fetch-registry: true
  instance:
    prefer-ip-address: true
    lease-renewal-interval-in-seconds: 10
    lease-expiration-duration-in-seconds: 30
    instance-id: ${spring.application.name}:${server.port}
```

And this dependency added to each `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```

---

## Registered Services

After all services start, the Eureka dashboard at `http://localhost:8761` shows:

```
Application              Status
─────────────────────────────────────
ANALYTICS-SERVICE        UP (1)
GATEWAY                  UP (1)
IAM-SERVICE              UP (1)
INCIDENT-SERVICE         UP (1)
NOTIFICATION-SERVICE     UP (1)
PROVISIONING-SERVICE     UP (1)
USAGE-SLA-SERVICE        UP (1)
```

---

## Gateway Routes with Eureka

The gateway `application.yml` uses `lb://` prefix to enable Eureka-based routing:

```yaml
routes:
  - id: iam-auth
    uri: lb://iam-service         # was: http://localhost:8081
    predicates:
      - Path=/api/auth/**

  - id: usage-sla
    uri: lb://usage-sla-service   # was: http://localhost:8083
    predicates:
      - Path=/api/usage/**, /api/sla/**
    filters:
      - name: JwtAuthFilter
```

The `lb://` prefix tells Spring Cloud Gateway to use Eureka for service resolution with client-side load balancing.

---

## Analytics WebClient with Eureka

The Analytics service WebClient beans use `ReactorLoadBalancerExchangeFilterFunction` to resolve service names through Eureka:

```java
@Bean("usageSlaClient")
public WebClient usageSlaClient(
        ReactorLoadBalancerExchangeFilterFunction lbFunction) {
    return WebClient.builder()
            .baseUrl("http://usage-sla-service")   // service name, not port
            .filter(lbFunction)                     // Eureka resolution
            .build();
}
```

Required additional dependency in analytics-service `pom.xml`:

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-loadbalancer</artifactId>
</dependency>
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| 503 from gateway | Service not registered yet | Wait 30s after service starts |
| Service not in dashboard | Missing eureka client config in application.yml | Check eureka block was added |
| `No instances available` in Analytics | usage-sla or incident not registered | Start those services first, wait for UP status |
| Self-preservation warning | Too few heartbeats in dev | Already disabled via enable-self-preservation: false |
