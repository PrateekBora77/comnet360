-- ============================================================
-- ComNet360 - IAM Service Database
-- Database: iam_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS iam_db;
USE iam_db;

-- ------------------------------------------------------------
-- Table: users
-- Stores all platform users with their roles
-- ------------------------------------------------------------
CREATE TABLE users (
    user_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)        NOT NULL,
    email         VARCHAR(150)        NOT NULL UNIQUE,
    password_hash VARCHAR(255)        NOT NULL,
    phone         VARCHAR(20),
    role          ENUM(
                    'ADMIN',
                    'SERVICE_MANAGER',
                    'NETWORK_ENGINEER',
                    'ENTERPRISE_USER',
                    'OPERATIONS_HEAD',
                    'COMPLIANCE_OFFICER'
                  )                   NOT NULL DEFAULT 'ENTERPRISE_USER',
    is_active     BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at    DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_email (email),
    INDEX idx_role  (role)
);

-- ------------------------------------------------------------
-- Table: audit_logs
-- Immutable record of every user action in the system
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
    audit_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT          NOT NULL,
    action      VARCHAR(255)    NOT NULL,
    entity_type VARCHAR(100),
    entity_id   VARCHAR(100),
    details     TEXT,
    ip_address  VARCHAR(45),
    timestamp   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id  (user_id),
    INDEX idx_timestamp (timestamp),

    CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- Table: refresh_tokens
-- Stores JWT refresh tokens for session management
-- ------------------------------------------------------------
CREATE TABLE refresh_tokens (
    token_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT          NOT NULL,
    token       VARCHAR(512)    NOT NULL UNIQUE,
    expires_at  DATETIME        NOT NULL,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked     BOOLEAN         NOT NULL DEFAULT FALSE,

    INDEX idx_token   (token),
    INDEX idx_user_id (user_id),

    CONSTRAINT fk_token_user FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Seed Data: Default admin user
-- Password: Admin@123 (bcrypt hashed - change in production)
-- ------------------------------------------------------------
INSERT INTO users (name, email, password_hash, phone, role)
VALUES (
    'System Admin',
    'admin@comnet360.com',
    '$2a$12$eImiTXuWVxfM37uY4JANjQ==',  -- placeholder, replace with real bcrypt hash
    '+1000000000',
    'ADMIN'
);

select * from users;
select * from audit_logs;
select * from refresh_tokens;

UPDATE users SET role = 'ADMIN' WHERE email = 'admin@comnet360.com';
UPDATE users SET role = 'SERVICE_MANAGER' WHERE email = 'manager@comnet360.com';

SELECT user_id, name, email, role FROM users;
