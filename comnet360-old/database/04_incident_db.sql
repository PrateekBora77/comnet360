-- ============================================================
-- ComNet360 - Incident Service Database
-- Database: incident_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS incident_db;
USE incident_db;

-- ------------------------------------------------------------
-- Table: incidents
-- Logs outages, degradations, and exceptions per service
-- ------------------------------------------------------------
CREATE TABLE incidents (
    incident_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    service_id      BIGINT          NOT NULL,
    title           VARCHAR(255)    NOT NULL,
    description     TEXT,
    severity        ENUM(
                        'LOW',
                        'MEDIUM',
                        'HIGH',
                        'CRITICAL'
                    )               NOT NULL DEFAULT 'MEDIUM',
    status          ENUM(
                        'OPEN',
                        'IN_PROGRESS',
                        'RESOLVED',
                        'CLOSED'
                    )               NOT NULL DEFAULT 'OPEN',
    detected_date   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_date   DATETIME,
    reported_by     BIGINT          NOT NULL,
    assigned_to     BIGINT,

    INDEX idx_service_id    (service_id),
    INDEX idx_status        (status),
    INDEX idx_severity      (severity),
    INDEX idx_detected_date (detected_date)
);

-- ------------------------------------------------------------
-- Table: resolution_actions
-- Tasks assigned to engineers to resolve an incident
-- ------------------------------------------------------------
CREATE TABLE resolution_actions (
    action_id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id         BIGINT          NOT NULL,
    owner_id            BIGINT          NOT NULL,
    action_description  TEXT            NOT NULL,
    due_date            DATETIME,
    status              ENUM(
                            'PENDING',
                            'IN_PROGRESS',
                            'COMPLETED',
                            'CANCELLED'
                        )               NOT NULL DEFAULT 'PENDING',
    completed_at        DATETIME,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_incident_id (incident_id),
    INDEX idx_owner_id    (owner_id),
    INDEX idx_status      (status),

    CONSTRAINT fk_action_incident FOREIGN KEY (incident_id)
        REFERENCES incidents (incident_id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Table: incident_comments
-- Threaded comments on an incident for collaboration
-- ------------------------------------------------------------
CREATE TABLE incident_comments (
    comment_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id     BIGINT          NOT NULL,
    author_id       BIGINT          NOT NULL,
    comment         TEXT            NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_incident_id (incident_id),

    CONSTRAINT fk_comment_incident FOREIGN KEY (incident_id)
        REFERENCES incidents (incident_id)
        ON DELETE CASCADE
);

-- All incidents with status
SELECT incident_id, service_id, title, severity,
       status, detected_date, resolved_date
FROM incidents ORDER BY detected_date DESC;

-- All resolution actions
SELECT action_id, incident_id, owner_id,
       status, completed_at
FROM resolution_actions;

-- All comments
SELECT comment_id, incident_id, author_id,
       LEFT(comment, 50) as comment_preview, created_at
FROM incident_comments
ORDER BY created_at;
