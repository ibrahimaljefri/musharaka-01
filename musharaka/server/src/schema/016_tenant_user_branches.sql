-- 016: Tenant-user-branch scope (Phase B: per-branch user scoping)
--
-- Members of a tenant can be limited to specific branches via this M:N table.
-- Admins (tenant role = 'admin') and super-admins ignore this table entirely
-- and have access to every branch of their tenant.
--
-- Behavior matrix:
--   Role     | Rows in this table | Effective access
--   ---------+--------------------+----------------------------------------
--   admin    | ignored            | all branches of tenant
--   member   | 1..N rows          | only those branch_ids
--   member   | 0 rows             | nothing visible
--
-- This migration is idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS tenant_user_branches (
  tenant_id   UUID NOT NULL REFERENCES tenants(id)    ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES app_users(id)  ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES branches(id)   ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_tub_user   ON tenant_user_branches(user_id);
CREATE INDEX IF NOT EXISTS idx_tub_branch ON tenant_user_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_tub_tenant ON tenant_user_branches(tenant_id);
