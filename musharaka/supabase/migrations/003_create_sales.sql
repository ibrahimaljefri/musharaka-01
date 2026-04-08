-- ============================================================
-- Migration 003: Create sales table
-- ============================================================

CREATE TABLE IF NOT EXISTS sales (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number    VARCHAR(100),
  branch_id         UUID        NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  input_type        TEXT        NOT NULL CHECK (input_type IN ('daily','monthly','range')),
  sale_date         DATE        NOT NULL,
  month             SMALLINT    CHECK (month BETWEEN 1 AND 12),
  year              SMALLINT    CHECK (year BETWEEN 2000 AND 2100),
  period_start_date DATE,
  period_end_date   DATE,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  notes             TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','sent')),
  submission_id     UUID        REFERENCES submissions(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_branch_date
  ON sales(branch_id, sale_date);

CREATE INDEX IF NOT EXISTS idx_sales_status
  ON sales(status);

CREATE INDEX IF NOT EXISTS idx_sales_branch_period
  ON sales(branch_id, year, month);

CREATE INDEX IF NOT EXISTS idx_sales_submission
  ON sales(submission_id);

CREATE TRIGGER sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_select" ON sales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sales_insert" ON sales
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sales_update" ON sales
  FOR UPDATE TO authenticated
  USING (status = 'pending');

CREATE POLICY "sales_delete" ON sales
  FOR DELETE TO authenticated
  USING (status = 'pending');
