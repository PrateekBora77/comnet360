# Provisioning Service

> 📚 [Back to README](../README.md) | [Documentation Index](../README.md#documentation-index)

---


> ComNet360 — Enterprise Communications & Service Management Platform

---

ComNet360
Provisioning Service — Module Documentation
Service Lifecycle & Configuration Management
Port 8082  |  Spring Boot 3.2.5  |  Java 17  |  MySQL 8.0
Phase 2 — Step 2.1  |  Version 1.0
25 Files  ·  10 Packages  ·  2 Controllers  ·  2 Services  ·  11 Endpoints

## 1. Overview

The Provisioning Service is responsible for the complete lifecycle management of all communication services on the ComNet360 platform. It handles Voice, Video, and Messaging services — from initial creation in DRAFT status, through activation, deactivation, and finally decommissioning.
It also manages versioned configuration parameters for each service, allowing flexible settings like codec type, bandwidth limits, and recording preferences to be stored and updated independently of the service itself.

## 2. Package Structure

All files live under com.comnet360.provisioning. The package layout follows the same layered architecture as the IAM service — each layer has a single clear responsibility.

## 3. Enums Package


### 3.1  ServiceType.java

Defines the three types of communication services supported by the platform. Stored as a string in the database using @Enumerated(EnumType.STRING).

### 3.2  ServiceStatus.java

Defines the four lifecycle states a service can be in. Transitions between states follow strict rules enforced by the validateTransition() method in ProvisioningService.
Valid lifecycle transitions:
DRAFT → ACTIVE (first activation)
INACTIVE → ACTIVE (reactivation)
ACTIVE → INACTIVE (deactivation)
DRAFT → DECOMMISSIONED (retire before activating)
INACTIVE → DECOMMISSIONED (retire after deactivating)
ACTIVE → DECOMMISSIONED is NOT allowed — must deactivate first

## 4. Entity Package


### 4.1  Service.java

The master record for every communication service on the platform. Mapped to the services table in provisioning_db. Every other service in the platform references a serviceId as a plain Long — this entity is the source of truth.

### 4.2  Configuration.java

Stores versioned configuration parameters for each service. A service can have many configurations — different parameters, each with its own effective date. This allows future-dated configuration changes to be scheduled in advance.

### 4.3  ServiceLifecycleEvent.java

Records every status change a service goes through. Provides a complete immutable audit history for compliance and debugging. For example — understanding when a service was deactivated and why is critical for post-incident investigation.

## 5. Repository Package

All three repositories extend JpaRepository which provides save(), findById(), findAll(), delete() and more automatically. Custom methods are derived from method names — Spring Data JPA generates the SQL automatically.

### 5.1  ServiceRepository.java


### 5.2  ConfigurationRepository.java


### 5.3  ServiceLifecycleEventRepository.java


## 6. DTO Package


### 6.1  Request DTOs


### 6.2  Response DTOs


## 7. Exception Package


## 8. Filter & Security


### 8.1  JwtAuthFilter.java

This filter works differently from the IAM service filter. Instead of parsing the JWT token itself, it reads the X-User-* headers that the API Gateway already injected after validating the token. This is the correct microservices pattern — validate once at the gateway, trust the headers downstream.
Why this approach is better than re-parsing JWT in every service:
Performance — no cryptographic verification on every service request
Single source of truth — gateway validates once, all services trust the result
Simpler code — no need for JwtService or UserDetailsService in downstream services
Easier to change — update JWT logic in one place (gateway) only

### 8.2  SecurityConfig.java

Configures Spring Security for the provisioning service. Stateless — no HTTP session. All authentication comes from the X-User-* headers set by JwtAuthFilter.

## 9. Service Layer


### 9.1  ProvisioningService.java

The core business logic for service lifecycle management. All write operations are @Transactional — if anything fails, the entire operation rolls back. Every status change writes a ServiceLifecycleEvent for the audit trail.

### 9.2  ConfigurationService.java

Manages configuration parameters for services. Each service can have multiple configurations with different effective dates, enabling scheduled configuration changes.

## 10. Controller Layer


### 10.1  ServiceController.java

Handles all service lifecycle endpoints. Reads X-User-Id from the header (injected by gateway) to know who is performing the action. Uses @PreAuthorize for role-based access on each method.

### 10.2  ConfigurationController.java

Manages configuration parameters for services. All endpoints require at least SERVICE_MANAGER role. Delete is restricted to ADMIN only.

## 11. Complete File List

All 25 files in the provisioning service with their package locations:

## 12. Swagger UI Testing Guide

Base URL for direct access: http://localhost:8082  |  Via Gateway: http://localhost:8080
Swagger UI: http://localhost:8082/swagger-ui.html
Before running any test — open Swagger UI, click Authorize (lock icon), paste your ADMIN accessToken, click Authorize then Close.
To get an ADMIN token: open http://localhost:8081/swagger-ui.html → POST /api/auth/login → execute with admin credentials → copy accessToken from response.

### 12.1  Service Creation Tests


### 12.2  Service Read Tests


### 12.3  Service Update Tests


### 12.4  Service Lifecycle Tests


### 12.5  Configuration Tests


### 12.6  RBAC & Security Tests

Register a plain ENTERPRISE_USER and use their token to test access restrictions:

### 12.7  MySQL Verification Queries

Run these in MySQL Workbench after testing to confirm all data is persisted correctly:
USE provisioning_db;
-- All services with current status
SELECT service_id, name, type, status, owner_user_id FROM services;
-- Complete lifecycle history ordered newest first
SELECT e.event_id, s.name, e.from_status, e.to_status,
e.changed_by, e.reason, e.event_time
FROM service_lifecycle_events e
JOIN services s ON e.service_id = s.service_id
ORDER BY e.event_time DESC;
-- Configurations for service 3
SELECT * FROM configurations
WHERE service_id = 3
ORDER BY effective_date DESC;

## 13. How to Use Swagger UI for This Service

Open http://localhost:8082/swagger-ui.html in your browser.
Click the Authorize button (lock icon) at top right.
Paste your ADMIN accessToken in the Value field — no need to type Bearer.
Click Authorize then Close.
You will see two controller groups: service-controller and configuration-controller.
Click any endpoint to expand it, then click Try it out.
Fill in path variables (id fields), request body (JSON), and query params as needed.
Click Execute to send the request.
The Response Body section shows the exact JSON returned by the service.
Important tips for Swagger testing:
The X-User-Id and X-User-Email headers are injected by the gateway automatically when going through port 8080. When calling directly on port 8082 via Swagger, these headers may need to be added manually in the request headers section.
The configDetails field accepts any valid JSON string — wrap it in escaped quotes e.g. "{\"codec\":\"G711\"}" in the Swagger request body.
effectiveDate must be in YYYY-MM-DD format e.g. 2026-05-01.
When testing lifecycle transitions follow the order: DRAFT → ACTIVE → INACTIVE → DECOMMISSIONED.

## 14. Next Steps

Provisioning Service is complete and fully tested. The build order continues:
Step 2.2 — Usage & SLA Service (port 8083): Records usage metrics per service and user. Runs a Spring Scheduler job every minute to evaluate SLA thresholds and log breaches.
Step 2.3 — Incident Service (port 8084): Logs outages and performance issues. Manages resolution actions assigned to network engineers and tracks escalation.
Step 3.1 — Analytics Service (port 8085): Aggregates data from provisioning, usage, and incident services to generate KPI reports and dashboard snapshots.
Step 3.2 — Notification Service (port 8086): Sends in-app and email alerts for SLA breaches, incidents, and service status changes.
Step 3.3 — React Frontend: Six role-specific dashboards connecting to all services through the gateway on port 8080.