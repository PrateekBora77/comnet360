# API Gateway

> 📚 [Back to README](../README.md) | [Documentation Index](../README.md#documentation-index)

---


> ComNet360 — Enterprise Communications & Service Management Platform

---

ComNet360
API Gateway — Module Documentation
Single Entry Point for all Microservices
Port 8080  |  Spring Cloud Gateway  |  Spring Boot 3.2.5  |  Java 17
Phase 1 — Step 1.3  |  Version 1.0
4 Files  ·  3 Packages  ·  7 Routes  ·  JWT Validation

## 1. Overview

The API Gateway is the single entry point for the entire ComNet360 platform. Every request from the React frontend passes through the gateway on port 8080 before reaching any microservice. No microservice is ever called directly by the frontend.
The gateway has three core responsibilities. First, it validates JWT tokens on every protected route so individual microservices do not need to repeat that logic. Second, it routes requests to the correct microservice based on the URL path. Third, it handles CORS so the React app running on localhost:5173 is allowed to make cross-origin requests.

## 2. Package Structure

The gateway is intentionally minimal. It does not contain entities, repositories, services, or controllers. Its only job is to validate tokens and route requests.

## 3. File Details


### 3.1  application.yml

The most important configuration file in the gateway. Defines everything about how the gateway behaves — port, routes, CORS, and JWT secret. No Java code needs to change when adding new routes; only this file needs updating.

#### Server configuration

Sets the gateway port to 8080. The spring.application.name is used in logs and monitoring to identify this service.

#### CORS configuration

Configured under spring.cloud.gateway.globalcors. Applied to every route globally so individual routes do not need CORS settings. Allows the React dev server at localhost:5173 to make requests with any header and any of the standard HTTP methods. allowCredentials:true is required for the Authorization header to be forwarded.

#### Route definitions

Each route has three parts. The id is a unique name for logging. The uri is the destination microservice address. The predicates define which URL patterns match this route. The filters define what processing happens before forwarding — either StripPrefix:0 (pass URL as-is) or the JwtAuthFilter for protected routes.

#### JWT configuration

The jwt.secret must be identical to the secret in every microservice's application.yml. This shared secret is what allows the gateway to validate tokens that were issued by the IAM service. The jwt.expiration value is 86400000 milliseconds (24 hours).

#### Actuator and logging

Exposes the /actuator/health endpoint for health checks. DEBUG logging is enabled for the gateway package during development so every routing decision is visible in the console.

### 3.2  JwtUtil.java

A Spring @Component responsible for all JWT operations needed by the gateway — validating token signatures and extracting user information from valid tokens. Uses the same HS512 algorithm and secret key as the IAM service.

### 3.3  JwtAuthFilter.java

The most important class in the gateway. Extends AbstractGatewayFilterFactory which is the correct base class for named Spring Cloud Gateway filters. The filter name JwtAuthFilter matches the name: JwtAuthFilter entry in application.yml routes.
The filter is reactive — it works with Mono and the ServerWebExchange API because Spring Cloud Gateway is built on WebFlux, not the standard servlet stack. This is why the gateway uses a different filter base class than the IAM service's OncePerRequestFilter.

#### Processing flow for every protected request

Read the Authorization header from the incoming request.
If header is missing or does not start with 'Bearer ', immediately return 401 Unauthorized with JSON error body. Request never reaches the microservice.
Extract the token string — everything after 'Bearer '.
Call JwtUtil.isTokenValid(token). If false, return 401 Unauthorized.
Token is valid — extract email, role, and userId from the token claims.
Mutate the outgoing request to add three new headers: X-User-Email, X-User-Role, X-User-Id.
Forward the mutated request to the destination microservice.
Downstream microservices read the X-User-Email, X-User-Role, and X-User-Id headers to know who is making the request. They never need to validate the JWT themselves — they trust what the gateway injected.

#### The Config inner class

AbstractGatewayFilterFactory requires a generic Config type. The empty Config class is required by the framework even though we have no per-route configuration. It can be extended later to add route-specific options such as required roles per endpoint.

#### unauthorizedResponse() helper

A private reactive helper that sets HTTP status 401, adds Content-Type: application/json, and writes a JSON error body to the response. Returns Mono<Void> which signals to the reactive pipeline that the response is complete and no further processing should occur.

### 3.4  GatewayConfig.java

A minimal Spring Security configuration class. Because Spring Cloud Gateway is built on WebFlux it requires @EnableWebFluxSecurity instead of the standard @EnableWebSecurity used in the microservices. This is why the spring-boot-starter-security dependency was added to the gateway pom.xml.
The securityFilterChain bean disables CSRF protection (not needed for stateless JWT APIs) and permits all exchanges. This is intentional — we do not want Spring Security's default authentication logic interfering with our JwtAuthFilter. The gateway's security is entirely handled by the route-level JwtAuthFilter configuration in application.yml.

## 4. Complete Request Flow

This section traces the exact path of two types of requests through the gateway.

### 4.1  Public Request — Login

React sends POST http://localhost:8080/api/auth/login with JSON body.
Gateway receives request and matches route iam-auth (/api/auth/**).
No JwtAuthFilter is applied to this route — it only has StripPrefix:0.
Gateway forwards the request as-is to http://localhost:8081/api/auth/login.
IAM service processes login and returns AuthResponse with tokens.
Gateway forwards the response back to React.

### 4.2  Protected Request — Get Incidents

React sends GET http://localhost:8080/api/incidents with Authorization: Bearer <token>.
Gateway receives request and matches route incident (/api/incidents/**).
JwtAuthFilter runs — reads Authorization header.
Extracts token, calls JwtUtil.isTokenValid(). Token is valid.
Extracts email, role, userId from token claims.
Mutates request — adds X-User-Email, X-User-Role, X-User-Id headers.
Forwards mutated request to http://localhost:8084/api/incidents.
Incident service reads X-User-Role to check permissions and returns data.
Gateway forwards response back to React.

### 4.3  Invalid Token Request

React sends GET http://localhost:8080/api/users with expired token.
Gateway matches route iam-users. JwtAuthFilter runs.
JwtUtil.isTokenValid() returns false — token is expired.
JwtAuthFilter calls unauthorizedResponse() — writes 401 JSON response.
Request is terminated. Never reaches IAM service.
React receives 401 and redirects user to login page.

## 5. Complete File List


## 6. Headers Reference

These are the headers used by the gateway on every request. Microservices should read the X-User-* headers to identify the caller — never re-validate the JWT token themselves.

### 6.1  Headers sent by React to Gateway


### 6.2  Headers injected by Gateway into downstream requests

Example — a request to GET /api/users arrives at IAM service with these extra headers already attached by the gateway:
GET /api/users HTTP/1.1
Host: localhost:8081
Authorization: Bearer eyJhbGci...
X-User-Email: admin@comnet360.com
X-User-Role: ADMIN
X-User-Id: 2

## 7. Routing Reference

Complete routing table showing every path pattern, destination service, port, and whether JWT validation is applied.

## 8. Error Responses

The gateway produces its own error responses before any microservice is reached. These are always JSON with Content-Type: application/json.

## 9. Testing Guide — Postman

Prerequisites: Gateway running on port 8080. IAM service running on port 8081. Both services started before running any test.
Important: Start both services in IntelliJ before testing. Right-click GatewayApplication.java and Run, then right-click IamServiceApplication.java and Run.

### 9.1  Route Tests — Verify Routing Works


### 9.2  JWT Validation Tests


### 9.3  Header Injection Tests — Verify X-User-* Headers

To verify the gateway is correctly injecting X-User-* headers, check the IAM service console logs after making a request. The DEBUG logging will show the headers received by the service.
Alternatively in the IAM service UserController.java, the /api/users/me endpoint reads X-User-Email — if it returns your profile correctly, the header injection is working.

### 9.4  CORS Tests

To test CORS from the browser (before the React app is built), open your browser developer console and run:
fetch('http://localhost:8080/api/auth/login', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ email: 'admin@comnet360.com', password: 'Admin@123' })
}).then(r => r.json()).then(console.log)
Expected: Response logged to console with no CORS error. If you see 'Access-Control-Allow-Origin' error, the CORS config in application.yml needs review.

### 9.5  Routing Isolation Test — Confirm Services Don't Mix


### 9.6  Complete Test Summary


## 10. Extending the Gateway

When new microservices or endpoints are added to the platform, only application.yml needs updating. No Java code changes are required.

### 10.1  Adding a new route

Add a new entry under spring.cloud.gateway.routes in application.yml:
- id: new-service
uri: http://localhost:8087
predicates:
- Path=/api/new-endpoint/**
filters:
- StripPrefix=0
- name: JwtAuthFilter

### 10.2  Adding role-based routing

The JwtAuthFilter.Config inner class is currently empty. To add per-route role requirements in future, add a requiredRole field to Config and read it inside the apply() method to compare against the X-User-Role header.

### 10.3  Future enhancements planned for Phase 4

Rate limiting — Spring Cloud Gateway has built-in RequestRateLimiter filter
Circuit breaker — add spring-cloud-starter-circuitbreaker-reactor-resilience4j
Request logging filter — log every request with method, path, user, and response time
Docker networking — change localhost URIs to Docker service names e.g. http://iam-service:8081

## 11. Next Steps

The API Gateway is complete and fully tested. It will require no changes until Phase 4 when Docker deployment is configured. All remaining work happens inside the individual microservices.
Step 1.4 — IAM Service: Authentication, JWT issuance, RBAC, audit logging. COMPLETE.
Step 2.1 — Provisioning Service (port 8082): Voice, video, messaging service lifecycle.
Step 2.2 — Usage & SLA Service (port 8083): Metrics recording and SLA breach detection.
Step 2.3 — Incident Service (port 8084): Outage management and resolution workflows.
Step 3.1 — Analytics Service (port 8085): KPI reports and dashboard snapshots.
Step 3.2 — Notification Service (port 8086): In-app and email alert delivery.
Step 3.3 — React Frontend: Six role-specific dashboards.