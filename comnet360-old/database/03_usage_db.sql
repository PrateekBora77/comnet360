-- ============================================================
-- ComNet360 - Usage & SLA Service Database
-- Database: usage_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS usage_db;
USE usage_db;

-- ------------------------------------------------------------
-- Table: usage_records
-- Stores all usage metrics per service and user
-- ------------------------------------------------------------
CREATE TABLE usage_records (
    usage_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    service_id      BIGINT              NOT NULL,
    user_id         BIGINT              NOT NULL,
    metric_type     ENUM(
                        'CALL_DURATION',
                        'DATA_TRANSFER',
                        'MESSAGE_COUNT',
                        'VIDEO_MINUTES',
                        'API_CALLS',
                        'BANDWIDTH'
                    )                   NOT NULL,
    value           DECIMAL(15, 4)      NOT NULL,
    unit            VARCHAR(30)         NOT NULL,
    recorded_at     DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_service_id   (service_id),
    INDEX idx_user_id      (user_id),
    INDEX idx_recorded_at  (recorded_at),
    INDEX idx_metric_type  (metric_type)
);

-- ------------------------------------------------------------
-- Table: sla_definitions
-- SLA thresholds defined per service and metric
-- ------------------------------------------------------------
CREATE TABLE sla_definitions (
    sla_id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    service_id      BIGINT              NOT NULL,
    metric          VARCHAR(100)        NOT NULL,
    threshold       DECIMAL(15, 4)      NOT NULL,
    unit            VARCHAR(30)         NOT NULL,
    operator        ENUM(
                        'LESS_THAN',
                        'GREATER_THAN',
                        'EQUAL_TO',
                        'LESS_THAN_OR_EQUAL',
                        'GREATER_THAN_OR_EQUAL'
                    )                   NOT NULL DEFAULT 'LESS_THAN',
    status          ENUM(
                        'ACTIVE',
                        'INACTIVE'
                    )                   NOT NULL DEFAULT 'ACTIVE',
    description     TEXT,
    created_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_service_id (service_id),
    INDEX idx_status     (status)
);

-- ------------------------------------------------------------
-- Table: sla_breach_events
-- Logged every time a scheduled job detects an SLA breach
-- ------------------------------------------------------------
CREATE TABLE sla_breach_events (
    breach_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
    sla_id          BIGINT              NOT NULL,
    service_id      BIGINT              NOT NULL,
    actual_value    DECIMAL(15, 4)      NOT NULL,
    threshold_value DECIMAL(15, 4)      NOT NULL,
    breach_time     DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved        BOOLEAN             NOT NULL DEFAULT FALSE,
    resolved_at     DATETIME,

    INDEX idx_sla_id      (sla_id),
    INDEX idx_service_id  (service_id),
    INDEX idx_breach_time (breach_time),

    CONSTRAINT fk_breach_sla FOREIGN KEY (sla_id)
        REFERENCES sla_definitions (sla_id)
        ON DELETE CASCADE
);

-- All usage records
SELECT usage_id, service_id, user_id, metric_type,
       value, unit, recorded_at
FROM usage_records
ORDER BY recorded_at DESC;

-- All SLA definitions
SELECT sla_id, service_id, metric,
       threshold, operator, status
FROM sla_definitions;

-- All breach events
SELECT breach_id, sla_id, service_id,
       actual_value, threshold_value,
       resolved, breach_time, resolved_at
FROM sla_breach_events;

SELECT * FROM sla_breach_events ORDER BY breach_time;
SET SQL_SAFE_UPDATES = 0;
DELETE FROM sla_breach_events
WHERE breach_id NOT IN (
    SELECT max_id FROM (
        SELECT MAX(breach_id) as max_id
        FROM sla_breach_events
        GROUP BY sla_id
    ) as t
);
SELECT * FROM sla_breach_events;

UPDATE sla_definitions
SET threshold = 500.0000
WHERE sla_id = 1;
