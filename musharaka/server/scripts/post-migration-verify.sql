-- post-migration-verify.sql
-- Run this in cPanel psql AFTER migration to verify row counts.
-- Compare results against pre-migration-audit.sql output.

SELECT
  'app_users'        AS tbl, count(*)::int AS cpanel_count FROM app_users
UNION ALL
SELECT 'tenants',            count(*)::int FROM tenants
UNION ALL
SELECT 'super_admins',       count(*)::int FROM super_admins
UNION ALL
SELECT 'tenant_users',       count(*)::int FROM tenant_users
UNION ALL
SELECT 'branches',           count(*)::int FROM branches
UNION ALL
SELECT 'submissions',        count(*)::int FROM submissions
UNION ALL
SELECT 'sales',              count(*)::int FROM sales
UNION ALL
SELECT 'support_tickets',    count(*)::int FROM support_tickets
UNION ALL
SELECT 'api_keys',           count(*)::int FROM api_keys
UNION ALL
SELECT 'bot_subscribers',    count(*)::int FROM bot_subscribers
ORDER BY tbl;
