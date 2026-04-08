-- ============================================================
-- Development seed data
-- Run after migrations to get a working dev environment
-- ============================================================

-- Seed a test branch (token is a placeholder AES-encrypted value)
INSERT INTO branches (code, name, contract_number, brand_name, location, token)
VALUES (
  'BR-001',
  'فرع الرياض الرئيسي',
  'CNT-2024-001',
  'مشاركة',
  'الرياض، حي العليا',
  'dev-token-placeholder'
)
ON CONFLICT (code) DO NOTHING;

-- Seed a few sample daily sales for the test branch
INSERT INTO sales (branch_id, input_type, sale_date, amount, invoice_number, notes)
SELECT
  b.id,
  'daily',
  CURRENT_DATE - (generate_series(0, 9) || ' days')::INTERVAL,
  (random() * 9000 + 1000)::NUMERIC(12,2),
  'INV-' || LPAD(generate_series(1,10)::TEXT, 4, '0'),
  'بيانات تجريبية'
FROM branches b
WHERE b.code = 'BR-001';
