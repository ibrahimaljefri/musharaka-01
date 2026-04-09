-- Migration 010: Tenant business identifiers
-- Replaces the incorrectly added contract_number (belongs on branches, not tenants).
-- Tenants are business entities identified by their commercial registration,
-- primary contact phone, and an internal account number.

-- Remove incorrectly added contract_number from tenants
ALTER TABLE tenants DROP COLUMN IF EXISTS contract_number;

-- Add 3 correct tenant-level business identifiers
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS commercial_registration TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_phone           TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS account_number          TEXT;

COMMENT ON COLUMN tenants.commercial_registration IS 'رقم السجل التجاري — Saudi commercial registration number';
COMMENT ON COLUMN tenants.primary_phone           IS 'رقم الجوال الرئيسي — primary contact phone, used for WhatsApp bot contact';
COMMENT ON COLUMN tenants.account_number          IS 'رقم الحساب الداخلي — internal subscription/account number assigned by admin';
