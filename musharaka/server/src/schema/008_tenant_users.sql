-- 008: Tenant users — links app_users to tenants

CREATE TABLE IF NOT EXISTS tenant_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id)    ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES app_users(id)  ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL DEFAULT 'member'
             CHECK (role IN ('admin','member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user   ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
