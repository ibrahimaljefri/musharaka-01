-- ============================================================
-- Migration 002: Create submissions table
-- (Must run before sales due to FK constraint)
-- ============================================================

CREATE TABLE IF NOT EXISTS submissions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id     UUID        NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  month         SMALLINT    NOT NULL CHECK (month BETWEEN 1 AND 12),
  year          SMALLINT    NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status        TEXT        NOT NULL DEFAULT 'sent'
                            CHECK (status IN ('sent', 'failed')),
  invoice_count INT         NOT NULL DEFAULT 0,
  total_amount  NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_submission_branch_month_year UNIQUE (branch_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_submissions_branch_period
  ON submissions(branch_id, year, month);

-- RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions_select" ON submissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "submissions_insert" ON submissions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "submissions_update" ON submissions
  FOR UPDATE TO authenticated USING (true);
