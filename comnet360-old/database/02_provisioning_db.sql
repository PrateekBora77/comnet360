-- ============================================================
-- ComNet360 - Provisioning Service Database
-- Database: provisioning_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS provisioning_db;
USE provisioning_db;

-- ------------------------------------------------------------
-- Table: services
-- Communication services provisioned on the platform
-- ------------------------------------------------------------
CREATE TABLE services (
    service_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150)    NOT NULL,
    type            ENUM(
                        'VOICE',
                        'VIDEO',
                        'MESSAGING'
                    )               NOT NULL,
    status          ENUM(
                        'DRAFT',
                        'ACTIVE',
                        'INACTIVE',
                        'DECOMMISSIONED'
                    )               NOT NULL DEFAULT 'DRAFT',
    config_details  JSON,
    owner_user_id   BIGINT          NOT NULL,
    description     TEXT,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status       (status),
    INDEX idx_type         (type),
    INDEX idx_owner_user   (owner_user_id)
);

-- ------------------------------------------------------------
-- Table: configurations
-- Versioned configuration parameters for each service
-- ------------------------------------------------------------
CREATE TABLE configurations (
    config_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
    service_id      BIGINT          NOT NULL,
    parameter       VARCHAR(150)    NOT NULL,
    value           TEXT            NOT NULL,
    effective_date  DATE            NOT NULL,
    created_by      BIGINT          NOT NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_service_id    (service_id),
    INDEX idx_effective     (effective_date),

    CONSTRAINT fk_config_service FOREIGN KEY (service_id)
        REFERENCES services (service_id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Table: service_lifecycle_events
-- Tracks every status change (activation, deactivation, etc.)
-- ------------------------------------------------------------
CREATE TABLE service_lifecycle_events (
    event_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    service_id      BIGINT          NOT NULL,
    from_status     VARCHAR(50),
    to_status       VARCHAR(50)     NOT NULL,
    changed_by      BIGINT          NOT NULL,
    reason          TEXT,
    event_time      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_service_id (service_id),
    INDEX idx_event_time (event_time),

    CONSTRAINT fk_lifecycle_service FOREIGN KEY (service_id)
        REFERENCES services (service_id)
        ON DELETE CASCADE
);

SELECT service_id, name, type, status, owner_user_id
FROM services;

SELECT * FROM service_lifecycle_events
WHERE service_id = 1
ORDER BY event_time;

SELECT * FROM configurations
WHERE service_id = 2;