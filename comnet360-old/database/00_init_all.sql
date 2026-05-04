-- ============================================================
-- ComNet360 - Master Database Initialization Script
-- Run this file to create all databases and tables at once.
--
-- Usage:
--   mysql -u root -p < 00_init_all.sql
--
-- Order matters — run sequentially:
-- ============================================================

SOURCE 01_iam_db.sql;
SOURCE 02_provisioning_db.sql;
SOURCE 03_usage_db.sql;
SOURCE 04_incident_db.sql;
SOURCE 05_analytics_db.sql;
SOURCE 06_notification_db.sql;

-- Verify all databases were created
SELECT schema_name AS 'Database Created'
FROM information_schema.schemata
WHERE schema_name IN (
    'iam_db',
    'provisioning_db',
    'usage_db',
    'incident_db',
    'analytics_db',
    'notification_db'
)
ORDER BY schema_name;
