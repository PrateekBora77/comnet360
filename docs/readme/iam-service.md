# IAM Service

> 📚 [Back to README](../README.md) | [Documentation Index](../README.md#documentation-index)

---


> ComNet360 — Enterprise Communications & Service Management Platform

---

ComNet360
IAM Service — Identity & Access Management
Complete Module Documentation with Swagger Testing
Port 8081  |  Spring Boot 3.2.5  |  Java 17  |  MySQL 8.0
Phase 1 — Step 1.4  |  Version 2.0
24 Files  ·  9 Packages  ·  3 Controllers  ·  5 Services  ·  11 Endpoints  ·  37 Test Cases

## 1. Overview

The IAM Service is the most critical microservice in the ComNet360 platform. Every other service depends on it because all user identities, roles, and authentication tokens are managed here. No other service stores user data — they reference user_id as a plain integer and trust the JWT token validated by the API Gateway.
The service runs on port 8081 and exposes REST APIs for registration, login, token refresh, logout, user management, role assignment, and audit log retrieval.

## 2. Package Structure

All files live under com.comnet360.iam. Each package has a single well-defined responsibility. Controllers call services, services call repositories — never the reverse.

## 3. Enums Package


### 3.1  Role.java

Defines all 6 roles available on the platform. Spring Security uses these as GrantedAuthority values prefixed with ROLE_ — so ADMIN becomes ROLE_ADMIN in @PreAuthorize expressions.

## 4. Entity Package


### 4.1  User.java

The central user entity mapped to the users table in iam_db. Implements Spring Security's UserDetails interface so it can be used directly by the authentication framework without any adapter.

### 4.2  AuditLog.java

Mapped to audit_logs. Insert-only — rows are never updated or deleted. @PrePersist sets timestamp automatically. Used by Compliance Officers for regulatory reporting.

### 4.3  RefreshToken.java

Mapped to refresh_tokens. Stores UUID-based refresh tokens enabling session renewal. Setting revoked=TRUE is how logout works with stateless JWT.

## 5. Repository Package


### 5.1  UserRepository


### 5.2  AuditLogRepository


### 5.3  RefreshTokenRepository


## 6. DTO Package


### 6.1  Request DTOs


### 6.2  Response DTOs


## 7. Exception Package

Standard error response format from this service:
{
"timestamp": "2026-04-22T10:30:00",
"status": 404,
"error": "Not Found",
"message": "User not found with id: 999",
"details": { "field": "error" }  // validation errors only
}

## 8. Filter Package


### 8.1  JwtAuthFilter.java

Extends OncePerRequestFilter — runs exactly once per request. Validates the JWT token and sets the Spring Security context so @PreAuthorize annotations work correctly on controller methods.
Processing flow:
Read Authorization header. If missing or not starting with Bearer, skip and continue.
Extract token string after Bearer.
Call JwtService.isTokenValid(). If false, skip (Spring Security will reject downstream).
Extract email from token. Load User via UserDetailsServiceImpl.
Create UsernamePasswordAuthenticationToken with user authorities.
Set in SecurityContextHolder. Request proceeds to controller.

## 9. Service Layer


### 9.1  JwtService.java

Handles all JWT operations. Uses HS512 algorithm with a 64-character secret shared with the API Gateway.

### 9.2  AuditLogService.java


### 9.3  AuthService.java

Core authentication service. All methods are @Transactional for database consistency.

### 9.4  UserService.java


### 9.5  UserDetailsServiceImpl.java

Implements Spring Security's UserDetailsService. Lives in service package — keeping it separate from SecurityConfig prevents the circular dependency. The single loadUserByUsername() method loads a User by email for Spring Security authentication.

## 10. Config Package


### 10.1  SecurityConfig.java

Spring Security configuration. Stateless JWT — no HTTP sessions. @EnableMethodSecurity enables @PreAuthorize on controller methods.
Public endpoints (no token required):
/api/auth/register, /api/auth/login, /api/auth/refresh
/actuator/**, /swagger-ui/**, /swagger-ui.html, /v3/api-docs/**, /webjars/**
Role-restricted endpoints:
PUT /api/users/*/role — ADMIN only
PUT /api/users/*/status — ADMIN only
GET /api/audit-logs/** — ADMIN and COMPLIANCE_OFFICER only

### 10.2  SwaggerConfig.java

Configures OpenAPI documentation metadata and sets up Bearer JWT authentication scheme so tokens can be entered once in the Swagger UI Authorize dialog and applied to all requests automatically.

## 11. Controller Layer


### 11.1  AuthController.java

All authentication endpoints. Public — no token required. Reads client IP from HttpServletRequest for audit logging.

### 11.2  UserController.java

User management endpoints. Uses @PreAuthorize for fine-grained role checks. Reads X-User-Email and X-User-Id from headers injected by the API Gateway.

### 11.3  AuditLogController.java

Audit log endpoints. All require ADMIN or COMPLIANCE_OFFICER role.

## 12. Complete File List


## 13. Swagger UI Testing Guide

Swagger UI URL: http://localhost:8081/swagger-ui.html
Make sure IAM service is running on port 8081 before testing.

#### How to Authorize in Swagger

Open http://localhost:8081/swagger-ui.html in browser.
First run POST /api/auth/login to get a token (see Test 4 below).
Click the Authorize button (lock icon) at top right.
Paste only the accessToken value — no need to type Bearer.
Click Authorize then Close. All requests now include the token automatically.

### 13.1  Registration & Login Tests


### 13.2  Token Refresh & Logout Tests

Use the refreshToken from Test 4 for these tests:

### 13.3  User Profile Tests

Login again to get a fresh token after logout. Use this token for the tests below:

### 13.4  Admin User Management Tests

First update role to ADMIN in MySQL Workbench, then login again for a fresh ADMIN token:
USE iam_db;
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@comnet360.com';
Login again → copy the new accessToken → Authorize in Swagger with new token.

### 13.5  Role Update Tests

Register a second user first:

### 13.6  User Status Tests


### 13.7  Audit Log Tests

Use ADMIN token for all audit log tests:

### 13.8  Security Boundary Tests


### 13.9  MySQL Verification Queries

Run these in MySQL Workbench after testing to confirm all data is persisted correctly:
USE iam_db;
-- All users with roles and status
SELECT user_id, name, email, role, is_active, created_at FROM users;
-- Full audit trail newest first
SELECT audit_id, user_id, action, entity_type, ip_address, timestamp
FROM audit_logs ORDER BY timestamp DESC;
-- Refresh token status
SELECT token_id, user_id, revoked, expires_at FROM refresh_tokens;
-- Count actions per type
SELECT action, COUNT(*) as total
FROM audit_logs GROUP BY action ORDER BY total DESC;

## 14. Swagger UI Usage Tips


## 15. Next Steps

IAM Service is complete with full Swagger UI documentation and 37 test cases covering all endpoints and edge cases.
Step 2.1 — Provisioning Service (port 8082): COMPLETE — Voice, video, messaging service lifecycle.
Step 2.2 — Usage & SLA Service (port 8083): Usage metrics recording and SLA breach detection scheduler.
Step 2.3 — Incident Service (port 8084): Outage management and resolution workflows.
Step 3.1 — Analytics Service (port 8085): KPI reports and dashboard snapshots.
Step 3.2 — Notification Service (port 8086): In-app and email alert delivery.
Step 3.3 — React Frontend: Six role-specific dashboards.