-- ============================================================
-- ComNet360 - Notification Service Database
-- Database: notification_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS notification_db;
USE notification_db;

-- ------------------------------------------------------------
-- Table: notifications
-- All notifications sent to users (in-app + email)
-- ------------------------------------------------------------
CREATE TABLE notifications (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT          NOT NULL,
    title           VARCHAR(255)    NOT NULL,
    message         TEXT            NOT NULL,
    category        ENUM(
                        'INCIDENT',
                        'SLA_BREACH',
                        'SERVICE_UPDATE',
                        'SYSTEM_ALERT',
                        'GENERAL'
                    )               NOT NULL DEFAULT 'GENERAL',
    channel         ENUM(
                        'IN_APP',
                        'EMAIL',
                        'BOTH'
                    )               NOT NULL DEFAULT 'IN_APP',
    status          ENUM(
                        'UNREAD',
                        'READ'
                    )               NOT NULL DEFAULT 'UNREAD',
    reference_id    BIGINT,
    reference_type  VARCHAR(100),
    created_date    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at         DATETIME,

    INDEX idx_user_id      (user_id),
    INDEX idx_status       (status),
    INDEX idx_category     (category),
    INDEX idx_created_date (created_date)
);

-- ------------------------------------------------------------
-- Table: email_logs
-- Tracks every email attempt (for debugging and audit)
-- ------------------------------------------------------------
CREATE TABLE email_logs (
    log_id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    notification_id     BIGINT          NOT NULL,
    recipient_email     VARCHAR(150)    NOT NULL,
    subject             VARCHAR(255)    NOT NULL,
    status              ENUM(
                            'SENT',
                            'FAILED',
                            'PENDING'
                        )               NOT NULL DEFAULT 'PENDING',
    error_message       TEXT,
    sent_at             DATETIME,
    created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_notification_id  (notification_id),
    INDEX idx_status           (status),

    CONSTRAINT fk_log_notification FOREIGN KEY (notification_id)
        REFERENCES notifications (notification_id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Table: notification_preferences
-- Per-user preferences for notification channels
-- ------------------------------------------------------------
CREATE TABLE notification_preferences (
    pref_id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT          NOT NULL UNIQUE,
    email_enabled   BOOLEAN         NOT NULL DEFAULT TRUE,
    in_app_enabled  BOOLEAN         NOT NULL DEFAULT TRUE,
    categories      JSON,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id)
);

-- Change status column from ENUM to VARCHAR
ALTER TABLE email_logs
    MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING';

-- All notifications
SELECT notification_id, user_id, title, category,
       channel, status, created_date, read_at
FROM notifications
ORDER BY created_date DESC;

-- Email delivery logs
SELECT log_id, notification_id, recipient_email,
       subject, status, error_message, sent_at
FROM email_logs
ORDER BY created_at DESC;

-- User preferences
SELECT pref_id, user_id, email_enabled,
       in_app_enabled, categories
FROM notification_preferences;