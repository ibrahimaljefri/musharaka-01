-- pre-migration-audit.sql
-- Run this in Supabase SQL editor BEFORE starting the migration.
-- Record the output as the baseline. cPanel counts must match after migration.

SELECT
  'app_users (auth.users)'     AS tbl, count(*)::int AS supabase_count FROM auth.users
UNION ALL
SELECT 'tenants',              count(*)::int FROM tenants
UNION ALL
SELECT 'super_admins',         count(*)::int FROM super_admins
UNION ALL
SELECT 'tenant_users',         count(*)::int FROM tenant_users
UNION ALL
SELECT 'branches',             count(*)::int FROM branches
UNION ALL
SELECT 'submissions',          count(*)::int FROM submissions
UNION ALL
SELECT 'sales',                count(*)::int FROM sales
UNION ALL
SELECT 'support_tickets',      count(*)::int FROM support_tickets
UNION ALL
SELECT 'api_keys',             count(*)::int FROM api_keys
UNION ALL
SELECT 'bot_subscribers',      count(*)::int FROM bot_subscribers
ORDER BY tbl;
