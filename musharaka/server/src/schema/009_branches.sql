-- 009: Branches

CREATE TABLE IF NOT EXISTS branches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code            VARCHAR(50)  NOT NULL,
  name            VARCHAR(255) NOT NULL,
  contract_number VARCHAR(100),
  brand_name      VARCHAR(255),
  unit_number     VARCHAR(100),
  token           TEXT,   -- legacy column; will be dropped after Phase 2 data migration
  location        VARCHAR(255),
  address         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_code   ON branches(tenant_id, code);

CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
