-- ============================================================
-- Migration 005: Tenants + super_admins + helper functions
-- ============================================================

-- Tenants (one record per client company)
CREATE TABLE IF NOT EXISTS tenants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  slug                VARCHAR(100) UNIQUE NOT NULL,
  plan                VARCHAR(50)  NOT NULL DEFAULT 'basic'
                      CHECK (plan IN ('basic','professional','enterprise')),
  status              VARCHAR(20)  NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','suspended','expired')),
  activated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ,
  -- Feature flags per tenant
  allowed_input_types       JSONB    NOT NULL DEFAULT '["daily"]',
  allow_advanced_dashboard  BOOLEAN  NOT NULL DEFAULT false,
  notes               TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Super-admins table (only Ibrahim's user_id lives here)
CREATE TABLE IF NOT EXISTS super_admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Helper functions used by RLS policies ─────────────────────────────────────

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM super_admins WHERE user_id = auth.uid())
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE tenants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Only super-admins can manage tenants
CREATE POLICY "tenants_super_admin" ON tenants
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Tenant members can read their own tenant (for subscription status checks)
CREATE POLICY "tenants_member_read" ON tenants
  FOR SELECT TO authenticated
  USING (id = current_tenant_id());

-- Only super-admins can see the super_admins table
CREATE POLICY "super_admins_read" ON super_admins
  FOR SELECT USING (is_super_admin());
