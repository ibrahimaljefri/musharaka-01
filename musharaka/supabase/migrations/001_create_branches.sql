-- ============================================================
-- Migration 001: Create branches table
-- ============================================================

CREATE TABLE IF NOT EXISTS branches (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code            VARCHAR(50)  UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  contract_number VARCHAR(100),
  brand_name      VARCHAR(255),
  unit_number     VARCHAR(100),
  token           TEXT,
  location        VARCHAR(255),
  address         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_select" ON branches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "branches_insert" ON branches
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "branches_update" ON branches
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "branches_delete" ON branches
  FOR DELETE TO authenticated USING (true);
