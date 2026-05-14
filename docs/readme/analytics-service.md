# Analytics Service

> 📚 [Back to README](../README.md) | [Documentation Index](../README.md#documentation-index)

---


> ComNet360 — Enterprise Communications & Service Management Platform

---

ComNet360
Analytics Service — Module Documentation
KPI Reports, SLA Compliance & Dashboard Snapshots
Port 8085  |  Spring Boot 3.2.5  |  Java 17  |  MySQL 8.0
Phase 3 — Step 3.1  |  Version 1.0
26 Files  ·  11 Packages  ·  2 Controllers  ·  3 Services  ·  9 Endpoints

## 1. Overview

The Analytics Service is the reporting and intelligence layer of the ComNet360 platform. It aggregates data from other microservices using WebClient, generates KPI reports, calculates SLA compliance percentages, produces incident summaries with MTTR metrics, and saves pre-computed dashboard snapshots for fast frontend loading.
This is the only service in the platform that makes outbound HTTP calls to other services. It uses Spring WebFlux WebClient to fetch data from the usage-sla-service and incident-service, then processes and persists the results in its own analytics_db database.

## 2. Package Structure


## 3. Enums Package


### 3.1  ReportType.java

Defines the types of KPI reports the analytics service can generate. Each type triggers different metrics to be included in the report JSON payload.

### 3.2  SnapshotType.java

Defines the types of dashboard snapshots that can be stored. Each type corresponds to a specific role dashboard in the React frontend.

## 4. Entity Package


### 4.1  KpiReport.java

Mapped to kpi_reports table. Every generated report is persisted here with its full metrics payload as a JSON string. Reports can be retrieved later without re-running the calculation. The generatedDate is set automatically by @PrePersist.

### 4.2  DashboardSnapshot.java

Mapped to dashboard_snapshots table. Pre-computed metrics saved periodically so dashboards load instantly without querying multiple services live. Multiple snapshots per type are allowed — the frontend always fetches the most recent one.

## 5. Repository Package


### 5.1  KpiReportRepository.java


### 5.2  DashboardSnapshotRepository.java


## 6. DTO Package


### 6.1  Request DTOs


### 6.2  Response DTOs


## 7. Exception Package


## 8. Filter & Config Package


### 8.1  JwtAuthFilter.java

Same dual-path pattern as all other services — gateway headers first, direct JWT fallback for Swagger. No changes from the established pattern.

### 8.2  SecurityConfig.java

Standard stateless configuration. All Swagger paths whitelisted. @EnableMethodSecurity enables @PreAuthorize on controllers.

### 8.3  WebClientConfig.java — Unique to this service

This is the only config class in the entire platform that is unique to the analytics service. It creates three pre-configured WebClient beans — one for each downstream service it needs to call. Each bean has its base URL read from application.yml under the services block.
Why WebClient instead of RestTemplate? WebClient is the modern Spring reactive HTTP client. It supports both blocking (using .block()) and non-blocking calls. The analytics service uses blocking calls for simplicity since it is a standard MVC service not a reactive one.

## 9. Service Layer


### 9.1  ReportService.java

Orchestrates report generation and persistence. Delegates data aggregation to AnalyticsDataService and stores results in analytics_db. Validates date ranges before processing.

### 9.2  AnalyticsDataService.java — The Core Aggregator

The most important and unique service in this module. Makes live HTTP calls to downstream microservices using WebClient to fetch and aggregate data. All calls include X-User-Role: ADMIN and X-User-Email headers so downstream JwtAuthFilters authenticate them via Path 1 (gateway headers).

#### Internal service identity

Every WebClient call sends these headers so downstream services trust the request without a JWT token:
X-User-Email: analytics@comnet360.internal
X-User-Role:  ADMIN
X-User-Id:    0
This is how microservices authenticate internal service-to-service calls. The analytics service identifies itself with a fixed internal identity that has ADMIN privileges on downstream services.

#### Error handling strategy

Both methods wrap their logic in try-catch blocks. If a downstream service is unavailable or returns an error, the method logs the error and returns a response with all counts set to zero instead of propagating the exception. This means the analytics service always responds, even when other services are down.

### 9.3  SnapshotService.java

Manages dashboard snapshots — pre-computed metric bundles stored in the database for fast frontend loading. Snapshots are saved as JSON strings and retrieved by type.

## 10. Controller Layer


### 10.1  ReportController.java

Handles KPI report generation and retrieval. X-User-Id is optional — defaults to 0L for direct Swagger calls. The GET /api/reports endpoint supports optional type filtering via query param.

### 10.2  SnapshotController.java


## 11. Complete File List


## 12. How WebClient Aggregation Works

This section explains the data flow when the analytics service fetches live data from downstream services.

#### SLA Compliance flow

ReportController receives GET /api/reports/sla-compliance?serviceId=1&from=...&to=...
Delegates to ReportService.getSlaCompliance()
ReportService delegates to AnalyticsDataService.buildSlaCompliance()
AnalyticsDataService calls usageSlaClient.get('/api/sla/breaches/service/1') with internal headers
usage-sla-service JwtAuthFilter reads X-User-Role:ADMIN header, authenticates the call
usage-sla-service returns JSON array of breach events
AnalyticsDataService also calls /api/sla/service/1 to get the metric name
Counts resolved and unresolved breaches, calculates compliance percentage
Returns SlaComplianceResponse to the controller which returns it to the caller

#### Incident Summary flow

ReportController receives GET /api/reports/incident-summary?from=...&to=...
Delegates to ReportService.getIncidentSummary()
ReportService delegates to AnalyticsDataService.buildIncidentSummary()
AnalyticsDataService calls incidentClient.get('/api/incidents') with internal headers
incident-service returns JSON array of all incidents
Counts by status (OPEN/IN_PROGRESS/RESOLVED/CLOSED) and severity (CRITICAL/HIGH/MEDIUM/LOW)
Calculates MTTR by parsing detectedDate and resolvedDate for resolved incidents
Returns IncidentSummaryResponse

#### Why .block() is used

WebClient is reactive by default and returns Mono<String>. The analytics service is a standard Spring MVC service (not reactive), so it needs to block and wait for the result. Calling .block() converts the reactive Mono into a synchronous result. In a fully reactive application this would be avoided, but for simplicity in a microservices context it is acceptable.

## 13. Swagger UI Testing Guide

Swagger UI: http://localhost:8085/swagger-ui.html
Prerequisites: All downstream services must be running — usage-sla-service (8083) and incident-service (8084) for live data endpoints.

#### Authorize

Get ADMIN token from http://localhost:8081/swagger-ui.html → POST /api/auth/login.
Open http://localhost:8085/swagger-ui.html.
Click Authorize → paste token → Authorize → Close.

### 13.1  Report Generation Tests


### 13.2  Report Read Tests


### 13.3  Live Data Aggregation Tests

These tests call downstream services to fetch real data. Make sure usage-sla-service (8083) and incident-service (8084) are running.

### 13.4  Dashboard Snapshot Tests


### 13.5  Delete & RBAC Tests


### 13.6  MySQL Verification Queries

USE analytics_db;
-- All generated reports
SELECT report_id, title, report_type, scope,
from_date, to_date, generated_by, generated_date
FROM kpi_reports ORDER BY generated_date DESC;
-- Report metrics content
SELECT report_id, title, report_type,
LEFT(metrics, 100) as metrics_preview
FROM kpi_reports;
-- All dashboard snapshots newest first
SELECT snapshot_id, snapshot_type,
LEFT(data, 80) as data_preview, captured_at
FROM dashboard_snapshots
ORDER BY captured_at DESC;
-- Latest snapshot per type
SELECT snapshot_type,
MAX(captured_at) as latest_capture
FROM dashboard_snapshots
GROUP BY snapshot_type;

## 14. Next Steps

Analytics Service is complete with KPI report generation, live data aggregation from downstream services, dashboard snapshots, and full Swagger testing with 30 test cases.
Step 3.2 — Notification Service (port 8086): In-app and email alert delivery using JavaMailSender. Sends alerts for SLA breaches, incidents, and service status changes.
Step 3.3 — React Frontend: Six role-specific dashboards built with Vite, TypeScript, TailwindCSS, React Query, and Recharts. Connects to all services through the gateway on port 8080.
Phase 4 — Testing & Docker: JUnit tests for all services, docker-compose.yml to run the entire platform with a single command.