# Incident Service

> 📚 [Back to README](../README.md) | [Documentation Index](../README.md#documentation-index)

---


> ComNet360 — Enterprise Communications & Service Management Platform

---

ComNet360
Incident Service — Module Documentation
Incident Management, Resolution Workflows & Collaboration
Port 8084  |  Spring Boot 3.2.5  |  Java 17  |  MySQL 8.0
Phase 2 — Step 2.3  |  Version 1.0
31 Files  ·  11 Packages  ·  3 Controllers  ·  3 Services  ·  16 Endpoints  ·  29 Test Cases

## 1. Overview

The Incident Service manages the complete lifecycle of outages, performance degradations, and exceptions on the ComNet360 platform. When something goes wrong with a communication service, this is where it gets logged, tracked, assigned to engineers, and resolved.
The service supports three interconnected workflows. First, incident management — creating, updating, assigning, resolving, and closing incidents with strict status transition rules. Second, resolution actions — individual tasks assigned to specific engineers with due dates and completion tracking. Third, collaborative comments — a threaded discussion on each incident for handover notes and status updates between team members.

## 2. Package Structure


## 3. Enums Package


### 3.1  IncidentSeverity.java

Defines how critical an incident is. Drives escalation rules, notification urgency, and dashboard highlighting. Set at creation and can be updated if the situation changes.

### 3.2  IncidentStatus.java

Defines the lifecycle state of an incident. Transitions between states are strictly validated — not all transitions are allowed. This prevents engineers from accidentally skipping workflow steps.
Valid status transitions:
OPEN → IN_PROGRESS (when assigned to an engineer)
OPEN → RESOLVED (direct resolution without assignment)
IN_PROGRESS → RESOLVED
RESOLVED → CLOSED
All other transitions are rejected with 400 Bad Request

### 3.3  ActionStatus.java

Defines the state of individual resolution tasks. Once COMPLETED or CANCELLED, the action cannot be updated.

## 4. Entity Package


### 4.1  Incident.java

The primary entity mapped to the incidents table. Represents a single outage or performance issue on the platform. The detectedDate is set automatically by @PrePersist and never changes. resolvedDate is set by the service layer when status transitions to RESOLVED.

### 4.2  ResolutionAction.java

Mapped to resolution_actions table. Represents a specific task that needs to be completed to resolve an incident. An incident can have multiple actions assigned to different engineers. Cascade delete from incident ensures actions are removed when incident is deleted.

### 4.3  IncidentComment.java

Mapped to incident_comments table. Insert-only — comments are never edited or deleted. Ordered by createdAt ascending so the thread reads chronologically from top to bottom. Essential for team handovers during long-running incidents.

## 5. Repository Package


### 5.1  IncidentRepository.java


### 5.2  ResolutionActionRepository.java


### 5.3  IncidentCommentRepository.java


## 6. DTO Package


### 6.1  Request DTOs


### 6.2  Response DTOs


## 7. Exception Package


## 8. Filter & Security


### 8.1  JwtAuthFilter.java — Dual-Path

Same pattern as provisioning and usage-sla services. Checks for X-User-Email and X-User-Role headers first (gateway path), falls back to parsing the Bearer JWT directly (Swagger path). This means the service works correctly both in production through the gateway and during direct development testing via Swagger UI.

### 8.2  SecurityConfig.java

Standard stateless configuration. All Swagger paths whitelisted. @EnableMethodSecurity activates @PreAuthorize on all controllers. No BCrypt bean needed — this service does not manage passwords.

## 9. Service Layer


### 9.1  IncidentService.java

Core business logic for incident lifecycle management. All write operations are @Transactional. The validateStatusTransition method enforces the workflow rules and throws BadRequestException for invalid transitions.

### 9.2  ResolutionActionService.java

Manages resolution tasks for incidents. Verifies the parent incident exists before creating actions. Prevents updates to COMPLETED or CANCELLED actions.

### 9.3  CommentService.java

Simple insert-and-read service for incident comments. Comments are never edited or deleted — they form an immutable audit trail of the incident discussion.

## 10. Controller Layer


### 10.1  IncidentController.java

Handles the full incident lifecycle. X-User-Id header is optional — defaults to 0L for direct Swagger calls. The GET endpoint supports optional query params for filtering by status and severity.

### 10.2  ActionController.java


### 10.3  CommentController.java


## 11. Complete File List


## 12. Swagger UI Testing Guide

Swagger UI: http://localhost:8084/swagger-ui.html
Authorize: get ADMIN token from http://localhost:8081/swagger-ui.html → POST /api/auth/login → copy accessToken → paste in Authorize dialog.
Important: When testing PUT endpoints, only include the fields you want to change. Do NOT include the status field unless you specifically want to change it — including status:OPEN when current status is already OPEN will return 400.

### 12.1  Incident Creation Tests


### 12.2  Incident Read Tests


### 12.3  Incident Update Tests

Important: Only include the fields you want to change. Never include status unless changing it.

### 12.4  Incident Workflow Tests


### 12.5  Resolution Action Tests


### 12.6  Comment Tests


### 12.7  RBAC & Security Tests


### 12.8  MySQL Verification Queries

USE incident_db;
-- All incidents with full status
SELECT incident_id, service_id, title, severity, status,
detected_date, resolved_date, assigned_to
FROM incidents ORDER BY detected_date DESC;
-- Resolution actions per incident
SELECT a.action_id, a.incident_id, a.owner_id,
LEFT(a.action_description,40) as description,
a.status, a.completed_at
FROM resolution_actions a
ORDER BY a.incident_id, a.created_at;
-- Comment thread for incident 2
SELECT comment_id, author_id,
LEFT(comment,60) as comment_preview, created_at
FROM incident_comments
WHERE incident_id = 2
ORDER BY created_at ASC;
-- Mean Time To Resolve (MTTR) for resolved incidents
SELECT incident_id, title,
TIMESTAMPDIFF(MINUTE, detected_date, resolved_date) as mttr_minutes
FROM incidents
WHERE resolved_date IS NOT NULL;

## 13. Status Transition Reference

This table shows all valid and invalid status transitions for incidents:
Action status transitions:
PENDING → IN_PROGRESS or COMPLETED or CANCELLED
IN_PROGRESS → COMPLETED or CANCELLED
COMPLETED → no further changes allowed
CANCELLED → no further changes allowed

## 14. Next Steps

Incident Service is complete with full lifecycle management, resolution workflows, collaborative comments, and 45 Swagger test cases.
Step 3.1 — Analytics Service (port 8085): Aggregates data from provisioning, usage, and incident services to generate KPI reports and pre-computed dashboard snapshots for fast loading.
Step 3.2 — Notification Service (port 8086): Delivers in-app and email alerts for SLA breaches, incidents, and service status changes using JavaMailSender.
Step 3.3 — React Frontend: Six role-specific dashboards connecting to all services through the gateway on port 8080.