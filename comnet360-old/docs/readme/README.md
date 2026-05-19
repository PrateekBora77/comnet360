# ComNet360 — Enterprise Communications & Service Management Platform

> **Backend Platform — Complete Documentation**
> Spring Boot 3.2.5 · Java 17 · MySQL 8.0 · Spring Cloud Gateway · Eureka Server

---

## Platform Summary

ComNet360 is an enterprise communications management platform that manages the complete lifecycle of Voice, Video, and Messaging services. It tracks usage, monitors SLA compliance, manages incidents, delivers analytics, and sends notifications — all through a microservices architecture secured by JWT-based RBAC.

| Metric | Value |
|--------|-------|
| Microservices | 7 (6 business services + API Gateway) |
| Service Registry | Eureka Server (port 8761) |
| Databases | 6 MySQL 8.0 databases, 18 tables |
| REST Endpoints | 60+ across all services |
| Security | BCrypt + JWT (HS512) + Refresh Token Rotation |
| Background Jobs | SLA breach detection scheduler (every 60s) |
| Async Processing | Non-blocking email via @Async + JavaMailSender |
| Cross-service Calls | WebClient with Eureka load balancing |

---

## Architecture

```
React Frontend (Vite + TypeScript)  →  port 5173
           │
           │  All API calls to port 8080
           ▼
  ┌──────────────────────────────┐
  │      API Gateway (8080)       │  JWT validation + routing
  │   Spring Cloud Gateway        │  X-User-* header injection
  └──────────┬───────────────────┘  CORS for localhost:5173
             │
    ┌────────┼──────────┬──────────┬──────────┬──────────┐
    ▼        ▼          ▼          ▼          ▼          ▼
 IAM(8081) Prov(8082) Usage(8083) Inc(8084) Anal(8085) Notif(8086)
  iam_db   prov_db    usage_db   inc_db    anal_db    notif_db

                    ▲
          Eureka Server (8761)
          All 7 components register here
```

---

## Service Directory

| Port | Service | Database | Documentation |
|------|---------|----------|---------------|
| 8761 | Eureka Server | None | [Eureka Setup](docs/eureka-server.md) |
| 8080 | API Gateway | None | [Gateway](docs/gateway.md) |
| 8081 | IAM Service | iam_db | [IAM Service](docs/iam-service.md) |
| 8082 | Provisioning Service | provisioning_db | [Provisioning](docs/provisioning-service.md) |
| 8083 | Usage & SLA Service | usage_db | [Usage & SLA](docs/usage-sla-service.md) |
| 8084 | Incident Service | incident_db | [Incident](docs/incident-service.md) |
| 8085 | Analytics Service | analytics_db | [Analytics](docs/analytics-service.md) |
| 8086 | Notification Service | notification_db | [Notification](docs/notification-service.md) |

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [Platform Overview](docs/platform-overview.md) | Full architecture, design decisions, tech stack |
| [Database Documentation](docs/database.md) | All 6 databases and 18 tables |
| [Eureka Server](docs/eureka-server.md) | Service registry setup and configuration |
| [API Gateway](docs/gateway.md) | Routing, JWT filter, CORS |
| [IAM Service](docs/iam-service.md) | Auth, JWT, RBAC, audit logs — with Swagger tests |
| [Provisioning Service](docs/provisioning-service.md) | Service lifecycle management |
| [Usage & SLA Service](docs/usage-sla-service.md) | Usage recording, SLA scheduler, breach detection |
| [Incident Service](docs/incident-service.md) | Incident management, resolution workflows |
| [Analytics Service](docs/analytics-service.md) | KPI reports, WebClient aggregation, snapshots |
| [Notification Service](docs/notification-service.md) | In-app & email alerts, preferences |
| [RBAC & Roles](docs/rbac-roles.md) | All 6 roles, endpoint access matrix |
| [Team Presentation Guide](docs/team-presentation-guide.md) | Live demo walkthrough for team members |

---

## Tech Stack

### Backend
- **Framework:** Spring Boot 3.2.5
- **Language:** Java 17
- **Gateway:** Spring Cloud Gateway 2023.0.1
- **Service Registry:** Netflix Eureka Server + Client
- **Security:** Spring Security 6 — stateless RBAC
- **JWT:** jjwt 0.12.5 — HS512 algorithm
- **Password hashing:** BCryptPasswordEncoder (strength 12)
- **Database:** MySQL 8.0
- **ORM:** Spring Data JPA + Hibernate 6.4
- **HTTP Client:** Spring WebFlux WebClient (with Eureka load balancing)
- **Email:** JavaMailSender (SMTP)
- **Async:** @EnableAsync + @Async
- **Scheduling:** @EnableScheduling + @Scheduled
- **API Docs:** SpringDoc OpenAPI 2.5.0 (Swagger UI)
- **Build:** Maven (parent POM)

### Frontend (Pending)
- React 18 + TypeScript + Vite
- TailwindCSS
- React Query (TanStack)
- Recharts
- React Router v6

---

## Startup Order

```
1. MySQL 8.0            — all 6 databases must be accessible
2. Eureka Server (8761) — must start before any service registers
3. IAM Service    (8081)
4. Provisioning   (8082)
5. Usage & SLA    (8083) — SLA scheduler starts 10s after boot
6. Incident       (8084)
7. Analytics      (8085)
8. Notification   (8086)
9. API Gateway    (8080) — last, after all services are registered
10. React Frontend (5173) — after gateway is up
```

---

## JWT Shared Secret

All 7 components share this secret in their `application.yml`:

```yaml
jwt:
  secret: "3a7f9c2b8e1d4f6a0c5b9e3d7f2a8c1b4e6f0a3d9c7b2e5f8a1d4c6b0e3f7a2d"
```

---

## Swagger UI URLs

| Service | URL |
|---------|-----|
| IAM | http://localhost:8081/swagger-ui.html |
| Provisioning | http://localhost:8082/swagger-ui.html |
| Usage & SLA | http://localhost:8083/swagger-ui.html |
| Incident | http://localhost:8084/swagger-ui.html |
| Analytics | http://localhost:8085/swagger-ui.html |
| Notification | http://localhost:8086/swagger-ui.html |
| Eureka Dashboard | http://localhost:8761 |

---

## Security Model

| Layer | Implementation |
|-------|----------------|
| Password hashing | BCrypt strength 12 — 4096 rounds |
| Access token | JWT HS512, 24-hour expiry, stateless |
| Refresh token | UUID stored in DB, 7-day expiry, revocable |
| Token rotation | New pair issued on every refresh, old revoked |
| Gateway perimeter | JWT validated once at gateway edge |
| Header contract | X-User-Email, X-User-Role, X-User-Id injected |
| Method security | @PreAuthorize on every controller method |
| Audit trail | Immutable audit_logs — insert only |

---

## Project Status

| Component | Status |
|-----------|--------|
| MySQL Schema | ✅ Complete |
| Eureka Server | ✅ Complete |
| API Gateway | ✅ Complete |
| IAM Service | ✅ Complete |
| Provisioning Service | ✅ Complete |
| Usage & SLA Service | ✅ Complete |
| Incident Service | ✅ Complete |
| Analytics Service | ✅ Complete |
| Notification Service | ✅ Complete |
| React Frontend | ⏳ Pending |
| JUnit Tests | ⏳ Pending |
| Docker Compose | ⏳ Pending |
