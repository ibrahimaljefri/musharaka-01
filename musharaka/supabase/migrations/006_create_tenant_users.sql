-- ============================================================
-- Migration 006: Tenant users (links Supabase auth users → tenant)
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id)    ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL DEFAULT 'member'
             CHECK (role IN ('admin','member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user   ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);

-- RLS
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- Users see only their own membership; super-admins see all
CREATE POLICY "tenant_users_self_read" ON tenant_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_super_admin());

-- Only super-admins can insert/update/delete memberships
CREATE POLICY "tenant_users_super_admin_write" ON tenant_users
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "tenant_users_super_admin_update" ON tenant_users
  FOR UPDATE USING (is_super_admin());

CREATE POLICY "tenant_users_super_admin_delete" ON tenant_users
  FOR DELETE USING (is_super_admin());
