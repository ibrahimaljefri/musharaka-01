-- 005: Tenants (one row per client company)
-- No RLS — tenant isolation enforced at app level via req.tenantId

CREATE TABLE IF NOT EXISTS tenants (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      VARCHAR(255) NOT NULL,
  slug                      VARCHAR(100) UNIQUE NOT NULL,
  plan                      VARCHAR(50)  NOT NULL DEFAULT 'basic'
                            CHECK (plan IN ('basic','professional','enterprise')),
  status                    VARCHAR(20)  NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','suspended','expired')),
  activated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  expires_at                TIMESTAMPTZ,
  allowed_input_types       JSONB        NOT NULL DEFAULT '["daily"]',
  allow_advanced_dashboard  BOOLEAN      NOT NULL DEFAULT false,
  allow_import              BOOLEAN      NOT NULL DEFAULT false,
  allow_reports             BOOLEAN      NOT NULL DEFAULT false,
  commercial_registration   TEXT,
  primary_phone             TEXT,
  account_number            TEXT,
  max_branches              INTEGER      DEFAULT 3  CHECK (max_branches >= 1),
  max_users                 INTEGER      DEFAULT 10 CHECK (max_users    >= 1),
  plan_id                   UUID,   -- FK to subscription_plans added after that table is created
  cenomi_api_token          TEXT,
  notes                     TEXT,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
