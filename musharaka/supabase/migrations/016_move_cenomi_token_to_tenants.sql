-- Migration 016: Move Cenomi API token from branches to tenants
-- Cenomi issues one token per customer (tenant), not per branch.
-- The token field on branches stays for now and will be dropped in Phase 2.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS cenomi_api_token TEXT;

-- Copy the first non-null branch token up to each tenant (most tenants have one branch).
-- Super-admin can correct multi-branch tenants via the admin panel after migration.
UPDATE tenants t
SET cenomi_api_token = b.token
FROM (
  SELECT DISTINCT ON (tenant_id) tenant_id, token
  FROM branches
  WHERE token IS NOT NULL
  ORDER BY tenant_id, created_at
) b
WHERE t.id = b.tenant_id
  AND t.cenomi_api_token IS NULL;
