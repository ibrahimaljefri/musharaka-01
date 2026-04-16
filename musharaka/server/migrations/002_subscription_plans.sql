-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar           text NOT NULL,
  name_en           text NOT NULL,
  price_sar         integer NOT NULL,        -- annual price in SAR
  billing_period    text NOT NULL DEFAULT 'annual', -- 'annual' only for now
  max_users         integer NOT NULL,        -- no unlimited — hard cap per plan
  max_branches      integer NOT NULL,        -- no unlimited — hard cap per plan
  extra_branch_sar  integer NOT NULL DEFAULT 0, -- extra cost per additional branch/year
  extra_user_sar    integer NOT NULL DEFAULT 0, -- extra cost per additional user/year
  features          jsonb DEFAULT '{}',
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

-- Seed 3 annual plans (999 / 1,999 / 3,999 ر.س/year)
INSERT INTO subscription_plans
  (name_ar, name_en, price_sar, billing_period, max_users, max_branches, extra_branch_sar, extra_user_sar)
VALUES
  ('أساسي',  'Basic',        999,  'annual', 3,  3,  300, 240),
  ('متوسط',  'Standard',     1999, 'annual', 8,  8,  300, 240),
  ('متقدم',  'Professional', 3999, 'annual', 15, 15, 300, 240)
ON CONFLICT DO NOTHING;

-- Add columns to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS max_branches integer DEFAULT 3 CHECK (max_branches >= 1),
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES subscription_plans(id);

-- Row Level Security for subscription_plans (read-only for authenticated users)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "subscription_plans_select" ON subscription_plans
  FOR SELECT TO authenticated USING (is_active = true);
