-- ============================================================
-- Migration 008: Add tenant_id to branches, sales, submissions
-- NOTE: Run against a fresh DB (seed data can be wiped first)
-- ============================================================

-- BRANCHES
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL
  REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);

-- SUBMISSIONS (must come before sales due to FK)
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL
  REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_submissions_tenant ON submissions(tenant_id);

-- SALES
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL
  REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
