-- Backfill tenant_user_branches so existing members keep full access.
--
-- After Phase B ships, every existing 'member' is given rows for ALL branches
-- of their tenant. This means no behavior change on day one — tenant admins
-- then narrow access via the new UserScopes UI when they want to.
--
-- Safe to re-run: ON CONFLICT DO NOTHING.

INSERT INTO tenant_user_branches (tenant_id, user_id, branch_id)
SELECT tu.tenant_id, tu.user_id, b.id
  FROM tenant_users tu
  JOIN branches b ON b.tenant_id = tu.tenant_id
 WHERE tu.role = 'member'
ON CONFLICT DO NOTHING;
