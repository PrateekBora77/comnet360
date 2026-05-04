# Notification Service

> 📚 [Back to README](../README.md) | [Documentation Index](../README.md#documentation-index)

---


> ComNet360 — Enterprise Communications & Service Management Platform

---

ComNet360
Notification Service — Module Documentation
In-App & Email Alerts, Preferences & Delivery Audit
Port 8086  |  Spring Boot 3.2.5  |  Java 17  |  MySQL 8.0
Phase 3 — Step 3.2  |  Version 1.0
31 Files  ·  11 Packages  ·  3 Controllers  ·  3 Services  ·  13 Endpoints

## 1. Overview

The Notification Service handles all communication sent to users on the ComNet360 platform. It supports two delivery channels — in-app notifications stored in the database and emails sent via JavaMailSender over SMTP. The service is designed for simplicity and extensibility — the current email implementation can be replaced with SendGrid, Twilio, or any other provider by swapping out the EmailService implementation.
The service also manages per-user notification preferences (email on/off, in-app on/off, category filters) and maintains a full email delivery audit log for debugging and compliance.

## 2. Package Structure


## 3. Enums Package


### 3.1  NotificationCategory.java

Defines what type of event triggered the notification. Used for filtering in the UI — users can configure preferences to only receive certain categories.

### 3.2  NotificationChannel.java

Controls how the notification is delivered. Determines whether the notification triggers an email send, is stored for in-app display, or both.

### 3.3  NotificationStatus.java

Tracks whether the user has seen the notification. Drives the unread badge count in the frontend UI.

## 4. Entity Package


### 4.1  Notification.java

Mapped to the notifications table. Every notification sent to any user is stored here regardless of channel. The referenceId and referenceType link each notification back to its source — e.g. an INCIDENT notification links to incidentId 1 in the incident-service.

### 4.2  EmailLog.java

Mapped to email_logs table. Every email delivery attempt is logged here regardless of success or failure. The status field uses VARCHAR(20) — not an ENUM — for flexibility to add new statuses without schema changes.

### 4.3  NotificationPreference.java

Mapped to notification_preferences table. One record per user — enforced by unique constraint on userId. Auto-created with defaults when a user accesses preferences for the first time. The categories JSON field allows fine-grained control — null means receive all categories.

## 5. Repository Package


### 5.1  NotificationRepository.java


### 5.2  EmailLogRepository.java


### 5.3  NotificationPreferenceRepository.java


## 6. DTO Package


### 6.1  Request DTOs


### 6.2  Response DTOs


## 7. Exception Package


## 8. Filter & Config


### 8.1  JwtAuthFilter.java

Same dual-path pattern used across all services — gateway headers first, direct JWT fallback. No changes from the established pattern.

### 8.2  SecurityConfig.java

Standard stateless configuration. All Swagger paths whitelisted. @EnableMethodSecurity activates @PreAuthorize.
Note on PreAuthorize in controllers: The preference and notification user-specific endpoints use isAuthenticated() rather than a userId comparison check. This is because authentication.name in Spring Security returns the email address (set in JwtAuthFilter), not the userId integer. Comparing #userId.toString() == authentication.name would always fail. In production, a custom security expression or userId extracted from the JWT claims would provide proper ownership enforcement.

## 9. Service Layer


### 9.1  EmailService.java

Handles all email operations. Both send methods are annotated with @Async meaning they run in a background thread. The HTTP response is returned immediately — the caller does not wait for the email to be sent. Each send attempt creates an EmailLog record that is updated with SENT or FAILED status after the attempt.
When app.mail.enabled is false in application.yml, the service skips actual SMTP delivery and marks the log as SENT immediately. This allows full development and testing without an email account.

### 9.2  NotificationService.java

Orchestrates the full notification delivery flow. Checks user preferences before sending, saves the notification record, and triggers email delivery asynchronously when required.

### 9.3  PreferenceService.java

Manages user notification preferences. Auto-creates a default preference record (both channels enabled, all categories) when a user accesses preferences for the first time. This means users always have preferences without needing to explicitly create them.

## 10. Controller Layer


### 10.1  NotificationController.java

Handles notification CRUD and read-state management. POST is restricted to service roles — only ADMIN, SERVICE_MANAGER, and NETWORK_ENGINEER can create notifications (typically triggered programmatically by other services). All read and mark-as-read endpoints require isAuthenticated().

### 10.2  PreferenceController.java


### 10.3  EmailLogController.java

Provides visibility into email delivery status for Admins and Compliance Officers. Useful for debugging delivery failures and compliance reporting.

## 11. Complete File List


## 12. Email Delivery Flow

This section explains the complete flow from sending a notification to email delivery and logging.
POST /api/notifications received with channel: EMAIL or BOTH.
NotificationService validates recipientEmail is present.
Checks NotificationPreference.emailEnabled for userId — defaults to true if no preference record.
Saves Notification entity to DB — this happens synchronously.
HTTP 201 Created response returned to caller immediately.
EmailService.sendEmail() is called — runs asynchronously in background thread due to @Async.
EmailService creates EmailLog with status=PENDING.
If app.mail.enabled=false: marks log as SENT, logs to console, returns.
If app.mail.enabled=true: creates SimpleMailMessage, calls JavaMailSender.send().
On success: updates EmailLog status=SENT, sentAt=now.
On failure: updates EmailLog status=FAILED, errorMessage=exception message.
The async email dispatch is the most important architectural decision in this service. Without @Async, a slow SMTP server would delay every notification response. With @Async, the notification is saved and the 201 response goes back instantly — the email delivery happens separately in the background.
The @EnableAsync annotation on NotificationServiceApplication activates Spring's async execution. Without it, @Async is silently ignored and emails block the response thread.

## 13. Swagger UI Testing Guide

Swagger UI: http://localhost:8086/swagger-ui.html
Authorize: get ADMIN token from http://localhost:8081/swagger-ui.html → POST /api/auth/login → paste token in Authorize dialog.
Email configuration: set app.mail.enabled: false in application.yml for testing without SMTP. The service logs what would have been sent and marks email logs as SENT.

### 13.1  Notification Send Tests


### 13.2  Notification Read Tests


### 13.3  Mark As Read Tests


### 13.4  Preference Tests


### 13.5  Email Log Tests


### 13.6  RBAC Tests


### 13.7  MySQL Verification Queries

USE notification_db;
-- All notifications with status
SELECT notification_id, user_id, title, category,
channel, status, created_date, read_at
FROM notifications ORDER BY created_date DESC;
-- Email delivery audit log
SELECT log_id, notification_id, recipient_email,
subject, status, error_message, sent_at
FROM email_logs ORDER BY created_at DESC;
-- User preferences
SELECT pref_id, user_id, email_enabled,
in_app_enabled, categories, updated_at
FROM notification_preferences;
-- Unread count per user
SELECT user_id, COUNT(*) as unread_count
FROM notifications
WHERE status = 'UNREAD'
GROUP BY user_id;

## 14. Extending the Email Service

The EmailService is designed for easy replacement. The current implementation uses JavaMailSender with SMTP. To switch to SendGrid, Twilio, or AWS SES:
Add the provider's SDK dependency to notification-service/pom.xml.
Create a new service class e.g. SendGridEmailService.java that implements the same method signatures.
Replace the JavaMailSender injection in EmailService with the new provider's client.
Update application.yml with the new provider's API key and configuration.
The rest of the system — NotificationService, controllers, DB schema — requires no changes.
This is why we used a service abstraction layer rather than calling JavaMailSender directly from the controller. The email delivery mechanism is fully isolated in EmailService.

## 15. Next Steps

Notification Service is complete with in-app and email delivery, user preferences, delivery audit logging, and 31 Swagger test cases.
All 6 microservices are now complete:
IAM Service (8081) — Authentication, JWT, RBAC, audit logs
Provisioning Service (8082) — Service lifecycle management
Usage & SLA Service (8083) — Usage monitoring and automated breach detection
Incident Service (8084) — Incident management and resolution workflows
Analytics Service (8085) — KPI reports and dashboard snapshots
Notification Service (8086) — In-app and email alerts
Step 3.3 — React Frontend: Six role-specific dashboards built with Vite, TypeScript, TailwindCSS, React Query, and Recharts. Connects to all services through the gateway on port 8080.
Phase 4 — Testing: JUnit 5 unit tests and integration tests for all services.
Phase 4 — Docker Compose: Single docker-compose.yml to run the entire platform with one command.