-- Migration 006: add data_entry_from column to tenants
-- This column allows admins to set an independent lower bound for data entry,
-- separate from activated_at (the billing/subscription start date).
-- NULL = falls back to activated_at (fully backward-compatible).

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS data_entry_from TIMESTAMPTZ;

COMMENT ON COLUMN tenants.data_entry_from IS
  'Earliest date the tenant may enter sales data. NULL = falls back to activated_at.';
