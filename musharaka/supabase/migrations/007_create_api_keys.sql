-- ============================================================
-- Migration 007: API keys (machine-to-machine access per tenant)
-- ============================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label          VARCHAR(255) NOT NULL,
  key_prefix     VARCHAR(12)  NOT NULL,     -- first chars, shown in UI for identification
  key_hash       VARCHAR(255) NOT NULL,     -- SHA-256 of the full key (never stored plain)
  -- Field-level control: which fields are exposed when this key is used
  allowed_fields JSONB NOT NULL DEFAULT
    '["contract_number","period_from_date","period_to_date","amount"]',
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  last_used_at   TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant    ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash  ON api_keys(key_hash);

-- RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Super-admins have full access
CREATE POLICY "api_keys_super_admin" ON api_keys
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Tenant members can only read their own keys (not create/delete)
CREATE POLICY "api_keys_tenant_read" ON api_keys
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id());
