# Usage & SLA Service

> 📚 [Back to README](../README.md) | [Documentation Index](../README.md#documentation-index)

---


> ComNet360 — Enterprise Communications & Service Management Platform

---

ComNet360
Usage & SLA Service — Module Documentation
Usage Monitoring, SLA Tracking & Automated Breach Detection
Port 8083  |  Spring Boot 3.2.5  |  Java 17  |  MySQL 8.0
Phase 2 — Step 2.2  |  Version 1.0
29 Files  ·  11 Packages  ·  2 Controllers  ·  2 Services  ·  1 Scheduler  ·  15 Endpoints

## 1. Overview

The Usage & SLA Service is responsible for two closely related functions. First it records every measurable usage event across all communication services on the platform — call durations, data transfers, message counts, video minutes, API calls, and bandwidth consumption. Second it defines Service Level Agreements (SLAs) and automatically detects when those agreements are being violated.
The most unique feature of this service is the SlaScheduler — a background job that runs every 60 seconds, evaluates all active SLA definitions against recent usage data, and automatically logs breach events when thresholds are exceeded. It also auto-resolves breaches when metrics return to acceptable levels.

## 2. Package Structure


## 3. Enums Package


### 3.1  MetricType.java

Defines all measurable usage metrics supported by the platform. Stored as strings in usage_records. The scheduler uses MetricType.valueOf() to match SLA metric names to these enum values.

### 3.2  SlaOperator.java

Defines how the actual metric value is compared against the threshold. This makes SLA definitions flexible — response time must be LESS_THAN 200ms, but uptime percentage must be GREATER_THAN_OR_EQUAL to 99.9.

### 3.3  SlaStatus.java

Controls whether a SLA definition is evaluated by the scheduler.

## 4. Entity Package


### 4.1  UsageRecord.java

Mapped to usage_records table. Every measurable usage event on the platform gets a row here. This is the fastest-growing table — indexes on service_id, user_id, metric_type, and recorded_at ensure dashboard queries remain fast even with millions of rows.

### 4.2  SlaDefinition.java

Mapped to sla_definitions table. Defines what good service looks like for a specific metric on a specific service. Each SLA has a threshold and an operator that together define the pass/fail condition evaluated every minute by the scheduler.

### 4.3  SlaBreachEvent.java

Mapped to sla_breach_events table. Created by the scheduler when a breach is first detected. Kept separate from sla_definitions so breach history is preserved even if the SLA threshold is later changed or deleted. The resolved and resolvedAt fields track the complete lifecycle of each breach.

## 5. Repository Package


### 5.1  UsageRecordRepository.java


### 5.2  SlaDefinitionRepository.java


### 5.3  SlaBreachEventRepository.java


## 6. DTO Package


### 6.1  Request DTOs


### 6.2  Response DTOs


## 7. Exception Package


## 8. Filter Package


### 8.1  JwtAuthFilter.java — Dual-Path Authentication

This filter solves a real microservices development problem — how to test services directly via Swagger when the gateway is not involved. It implements two authentication paths in sequence.

#### Path 1 — Gateway headers (production flow)

When a request arrives through the API Gateway, the gateway has already validated the JWT and injected X-User-Email, X-User-Role, and X-User-Id headers. The filter reads these headers and builds the Spring Security context from them. No JWT parsing needed.

#### Path 2 — Direct JWT (Swagger / development)

When calling the service directly on port 8083 (e.g. via Swagger UI), there are no gateway headers. The filter falls back to reading the Authorization: Bearer header directly, parses the JWT using JwtUtil, extracts the email and role, and builds the security context from those.
Why this dual-path approach matters for all downstream services going forward — every service from this point uses this same pattern so they work correctly both through the gateway in production and directly via Swagger during development.

## 9. Service Layer


### 9.1  UsageService.java

Handles all usage record operations. The recordUsage method is the most frequently called — it is triggered every time a user makes a call, sends a message, or uses any monitored service.

### 9.2  SlaService.java

Manages SLA definitions and breach events. Provides CRUD for SLA definitions and query operations for breach events. Does not contain the breach detection logic — that lives in SlaScheduler.

## 10. Scheduler Package — The Core of This Service


### 10.1  SlaScheduler.java

The SlaScheduler is the most important and unique component of this service. It is a Spring @Component annotated with @Scheduled that runs automatically every 60 seconds without any HTTP trigger. It requires @EnableScheduling on the main application class to activate.
The scheduler implements intelligent breach lifecycle management — it detects new breaches, avoids duplicate records for ongoing breaches, and auto-resolves breaches when metrics recover.

#### evaluateAllSlas() — the main job

Runs every 60 seconds with a 10-second initial delay after startup. Loads all ACTIVE SLA definitions, evaluates each one, logs a summary of new breaches, ongoing breaches, recovered breaches, and healthy SLAs.

#### evaluateSla(sla) — single SLA evaluation

For each SLA, queries the sum of its metric over the past 24 hours. Compares the actual value against the threshold using the operator. Then makes one of four decisions based on the current breach state:

#### isBreached(actual, threshold, operator) — the comparison logic

Uses a Java switch expression to compare actual vs threshold based on the operator. Returns true if the SLA condition is violated:

#### The 24-hour evaluation window

The scheduler sums usage from the past 24 hours using LocalDateTime.now().minusHours(24). This window captures all recent usage for testing and development. In a production system this window can be made configurable per SLA definition — some SLAs may need a 1-hour window, others a daily or weekly window.

#### @EnableScheduling requirement

The @Scheduled annotation on SlaScheduler.evaluateAllSlas() does nothing unless @EnableScheduling is present on the main application class UsageSlaServiceApplication. This is a common mistake — no error is thrown, the scheduler just silently never runs. The annotation activates Spring's scheduling infrastructure.

## 11. Controller Layer


### 11.1  UsageController.java

Handles usage metric recording and retrieval. The X-User-Id header is marked as optional — when calling through the gateway it is injected automatically; when calling directly via Swagger it defaults to 0L.

### 11.2  SlaController.java

Manages SLA definitions and breach events. Split into two logical groups — SLA CRUD operations and breach event management.

## 12. Complete File List

All 29 files in the Usage & SLA service:

## 13. Swagger UI Testing Guide

Swagger UI: http://localhost:8083/swagger-ui.html
Make sure the Usage SLA service is running on port 8083 before testing.

#### Authorize in Swagger

Open http://localhost:8081/swagger-ui.html → POST /api/auth/login with admin credentials.
Copy the accessToken from the response.
Open http://localhost:8083/swagger-ui.html.
Click Authorize (lock icon) → paste accessToken → Authorize → Close.

### 13.1  SLA Definition Tests


### 13.2  Usage Recording Tests


### 13.3  Usage Query Tests


### 13.4  SLA Breach Detection Tests

These tests verify the complete breach lifecycle. Follow the steps in order.

### 13.5  Breach Resolution Tests


### 13.6  Auto-Recovery Tests

Simulate metric recovery by raising the SLA threshold in MySQL:
USE usage_db;
UPDATE sla_definitions SET threshold = 1000.0000 WHERE sla_id = 1;

### 13.7  SLA Status & Delete Tests


### 13.8  RBAC & Security Tests


### 13.9  MySQL Verification Queries

USE usage_db;
-- All usage records
SELECT usage_id, service_id, user_id, metric_type, value, unit, recorded_at
FROM usage_records ORDER BY recorded_at DESC;
-- Verify sum used by scheduler (past 24 hours)
SELECT metric_type, SUM(value) as total
FROM usage_records
WHERE service_id = 1 AND recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY metric_type;
-- All SLA definitions with status
SELECT sla_id, service_id, metric, threshold, operator, status
FROM sla_definitions;
-- All breach events with resolution status
SELECT breach_id, sla_id, service_id, actual_value,
threshold_value, resolved, breach_time, resolved_at
FROM sla_breach_events ORDER BY breach_time DESC;
-- Count breaches per SLA
SELECT sla_id, COUNT(*) as total_breaches,
SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) as resolved_count
FROM sla_breach_events GROUP BY sla_id;

## 14. Scheduler Behaviour Summary

This table summarises every possible state the scheduler can encounter for each SLA per run:

## 15. Next Steps

Usage & SLA Service is complete with automated breach detection, duplicate prevention, auto-recovery, and full Swagger testing with 45 test cases.
Step 2.3 — Incident Service (port 8084): Outage management, resolution actions assigned to engineers, comments, and escalation tracking.
Step 3.1 — Analytics Service (port 8085): Aggregates data from provisioning, usage, and incident services to generate KPI reports and pre-computed dashboard snapshots.
Step 3.2 — Notification Service (port 8086): In-app and email alerts for SLA breaches, incidents, and service status changes.
Step 3.3 — React Frontend: Six role-specific dashboards connecting to all services through the gateway on port 8080.