-- Add subscription / tenant-cap columns that the application expects on `tenants`.
--
-- Background: `server/migrations/002_subscription_plans.sql` defined these
-- columns, but Supabase CLI only runs migrations from `supabase/migrations/`,
-- so the change never reached the managed Supabase project. The frontend
-- `authStore._loadTenantContext()` selects `max_branches` via a
-- tenant_users → tenants join, which fails with 400:
--   column tenants_1.max_branches does not exist
-- This migration applies the missing schema to the Supabase project.

-- 1) subscription_plans catalog (idempotent)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar           text NOT NULL,
  name_en           text NOT NULL,
  price_sar         integer NOT NULL,
  billing_period    text NOT NULL DEFAULT 'annual',
  max_users         integer NOT NULL,
  max_branches      integer NOT NULL,
  extra_branch_sar  integer NOT NULL DEFAULT 0,
  extra_user_sar    integer NOT NULL DEFAULT 0,
  features          jsonb DEFAULT '{}',
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

INSERT INTO subscription_plans
  (name_ar, name_en, price_sar, billing_period, max_users, max_branches, extra_branch_sar, extra_user_sar)
VALUES
  ('أساسي',  'Basic',        999,  'annual', 3,  3,  300, 240),
  ('متوسط',  'Standard',     1999, 'annual', 8,  8,  300, 240),
  ('متقدم',  'Professional', 3999, 'annual', 15, 15, 300, 240)
ON CONFLICT DO NOTHING;

-- 2) Tenant caps — columns the app selects on every session
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS max_branches integer DEFAULT 3  CHECK (max_branches >= 1),
  ADD COLUMN IF NOT EXISTS max_users    integer DEFAULT 10 CHECK (max_users    >= 1),
  ADD COLUMN IF NOT EXISTS plan_id      uuid REFERENCES subscription_plans(id);

-- Grandfather existing tenants to sensible defaults
UPDATE tenants SET max_branches = 3  WHERE max_branches IS NULL;
UPDATE tenants SET max_users    = 10 WHERE max_users    IS NULL;

-- 3) RLS for subscription_plans — read-only for authenticated users
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_select" ON subscription_plans;
CREATE POLICY "subscription_plans_select" ON subscription_plans
  FOR SELECT TO authenticated USING (is_active = true);
