-- 018: Per-tenant Cenomi configuration (URL + post mode)
-- Adds two columns to tenants so each client can have its own Cenomi
-- endpoint and choose whether sales post daily or monthly.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS cenomi_api_url   TEXT,
  ADD COLUMN IF NOT EXISTS cenomi_post_mode TEXT NOT NULL DEFAULT 'monthly'
    CHECK (cenomi_post_mode IN ('daily','monthly'));

COMMENT ON COLUMN tenants.cenomi_api_url IS
  'Per-tenant Cenomi endpoint URL (http:// or https://) incl. /daily or /monthly suffix';
COMMENT ON COLUMN tenants.cenomi_post_mode IS
  'How tenant sales are posted to Cenomi: daily (per-day array) or monthly (one aggregated row)';
