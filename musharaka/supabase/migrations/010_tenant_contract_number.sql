-- Migration 010: Add contract_number to tenants
-- Required for bot phase: bot confirmation replies show tenant contract number

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS contract_number TEXT;

COMMENT ON COLUMN tenants.contract_number
  IS 'Contract or service agreement number for this tenant (e.g. CNT-2024-001)';
