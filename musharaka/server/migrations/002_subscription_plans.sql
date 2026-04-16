-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar     text NOT NULL,
  name_en     text NOT NULL,
  price_sar   integer NOT NULL,
  max_users   integer,           -- NULL = unlimited
  max_branches integer,          -- NULL = unlimited
  features    jsonb DEFAULT '{}',
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- Seed 4 plans
INSERT INTO subscription_plans (name_ar, name_en, price_sar, max_users, max_branches) VALUES
  ('أساسي',    'Basic',        699,  3,    5),
  ('متوسط',    'Standard',     999,  10,   15),
  ('متقدم',    'Professional', 1499, 25,   40),
  ('مؤسسي',   'Enterprise',   2499, NULL, NULL)
ON CONFLICT DO NOTHING;

-- Add max_branches column to tenants (default 5, min 5)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS max_branches integer DEFAULT 5 CHECK (max_branches >= 5),
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES subscription_plans(id);

-- Row Level Security for subscription_plans (read-only for authenticated users)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "subscription_plans_select" ON subscription_plans
  FOR SELECT TO authenticated USING (is_active = true);
