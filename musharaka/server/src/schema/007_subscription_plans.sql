-- 007: Subscription plans catalog

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar           TEXT    NOT NULL,
  name_en           TEXT    NOT NULL,
  price_sar         INTEGER NOT NULL,
  billing_period    TEXT    NOT NULL DEFAULT 'annual',
  max_users         INTEGER NOT NULL,
  max_branches      INTEGER NOT NULL,
  extra_branch_sar  INTEGER NOT NULL DEFAULT 0,
  extra_user_sar    INTEGER NOT NULL DEFAULT 0,
  features          JSONB   DEFAULT '{}',
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now()
);

INSERT INTO subscription_plans
  (name_ar, name_en, price_sar, billing_period, max_users, max_branches, extra_branch_sar, extra_user_sar)
VALUES
  ('أساسي',  'Basic',        999,  'annual', 3,  3,  300, 240),
  ('متوسط',  'Standard',     1999, 'annual', 8,  8,  300, 240),
  ('متقدم',  'Professional', 3999, 'annual', 15, 15, 300, 240)
ON CONFLICT DO NOTHING;

-- Wire FK on tenants now that subscription_plans exists
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_plan_id_fkey;
ALTER TABLE tenants
  ADD CONSTRAINT tenants_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id);
