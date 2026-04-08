-- ============================================================
-- Migration 009: Replace broad RLS with tenant-scoped policies
-- ============================================================

-- ── BRANCHES ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "branches_select" ON branches;
DROP POLICY IF EXISTS "branches_insert" ON branches;
DROP POLICY IF EXISTS "branches_update" ON branches;
DROP POLICY IF EXISTS "branches_delete" ON branches;

CREATE POLICY "branches_tenant_select" ON branches
  FOR SELECT TO authenticated
  USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY "branches_tenant_insert" ON branches
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY "branches_tenant_update" ON branches
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY "branches_tenant_delete" ON branches
  FOR DELETE TO authenticated
  USING (is_super_admin() OR tenant_id = current_tenant_id());

-- ── SALES ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sales_select" ON sales;
DROP POLICY IF EXISTS "sales_insert" ON sales;
DROP POLICY IF EXISTS "sales_update" ON sales;
DROP POLICY IF EXISTS "sales_delete" ON sales;

CREATE POLICY "sales_tenant_select" ON sales
  FOR SELECT TO authenticated
  USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY "sales_tenant_insert" ON sales
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY "sales_tenant_update" ON sales
  FOR UPDATE TO authenticated
  USING (
    (is_super_admin() OR tenant_id = current_tenant_id())
    AND status = 'pending'
  );

CREATE POLICY "sales_tenant_delete" ON sales
  FOR DELETE TO authenticated
  USING (
    (is_super_admin() OR tenant_id = current_tenant_id())
    AND status = 'pending'
  );

-- ── SUBMISSIONS ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "submissions_select" ON submissions;
DROP POLICY IF EXISTS "submissions_insert" ON submissions;
DROP POLICY IF EXISTS "submissions_update" ON submissions;

CREATE POLICY "submissions_tenant_select" ON submissions
  FOR SELECT TO authenticated
  USING (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY "submissions_tenant_insert" ON submissions
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin() OR tenant_id = current_tenant_id());

CREATE POLICY "submissions_tenant_update" ON submissions
  FOR UPDATE TO authenticated
  USING (is_super_admin() OR tenant_id = current_tenant_id());
