-- 011: Sales

CREATE TABLE IF NOT EXISTS sales (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  invoice_number    VARCHAR(100),
  input_type        TEXT NOT NULL CHECK (input_type IN ('daily','monthly','range')),
  sale_date         DATE NOT NULL,
  month             SMALLINT CHECK (month BETWEEN 1 AND 12),
  year              SMALLINT CHECK (year  BETWEEN 2000 AND 2100),
  period_start_date DATE,
  period_end_date   DATE,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent')),
  submission_id     UUID REFERENCES submissions(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_tenant     ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch     ON sales(branch_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_status     ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_period     ON sales(branch_id, year, month);
CREATE INDEX IF NOT EXISTS idx_sales_submission ON sales(submission_id);

CREATE TRIGGER sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
