-- ============================================================
-- ComNet360 - Analytics Service Database
-- Database: analytics_db
-- ============================================================

CREATE DATABASE IF NOT EXISTS analytics_db;
USE analytics_db;

-- ------------------------------------------------------------
-- Table: kpi_reports
-- Generated KPI snapshots for a given scope and time range
-- ------------------------------------------------------------
CREATE TABLE kpi_reports (
    report_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(255)    NOT NULL,
    scope           VARCHAR(150)    NOT NULL,
    report_type     ENUM(
                        'SLA_COMPLIANCE',
                        'USAGE_TREND',
                        'INCIDENT_SUMMARY',
                        'SERVICE_HEALTH',
                        'CUSTOM'
                    )               NOT NULL,
    metrics         JSON            NOT NULL,
    from_date       DATE            NOT NULL,
    to_date         DATE            NOT NULL,
    generated_by    BIGINT          NOT NULL,
    generated_date  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_report_type    (report_type),
    INDEX idx_generated_date (generated_date),
    INDEX idx_generated_by   (generated_by)
);

-- ------------------------------------------------------------
-- Table: dashboard_snapshots
-- Periodic snapshots of key metrics for fast dashboard loads
-- ------------------------------------------------------------
CREATE TABLE dashboard_snapshots (
    snapshot_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    snapshot_type   VARCHAR(100)    NOT NULL,
    data            JSON            NOT NULL,
    captured_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_snapshot_type (snapshot_type),
    INDEX idx_captured_at   (captured_at)
);

-- All generated reports
SELECT report_id, title, report_type, scope,
       from_date, to_date, generated_by, generated_date
FROM kpi_reports
ORDER BY generated_date DESC;

-- All dashboard snapshots
SELECT snapshot_id, snapshot_type,
    LEFT(data, 80) as data_preview,
    captured_at
FROM dashboard_snapshots
ORDER BY captured_at DESC;
