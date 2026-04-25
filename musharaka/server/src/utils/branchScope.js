/**
 * Branch-scope helper — used by tenant routes to filter SQL by the
 * caller's allowed branch list (populated by tenantMiddleware).
 *
 * Semantics:
 *   - req.allowedBranchIds === null   → admin / super-admin → no-op
 *   - req.allowedBranchIds === []     → member with no scope → force empty result
 *   - req.allowedBranchIds === [...]  → push `${col} = ANY($N)` predicate
 *
 * Mutates `where` and `params` in place; returns nothing.
 */
function applyBranchScope(req, where, params, col = 'branch_id') {
  if (!req.allowedBranchIds) return                       // admin — no-op
  if (req.allowedBranchIds.length === 0) {
    where.push('FALSE')                                    // member with no assignment
    return
  }
  params.push(req.allowedBranchIds)
  where.push(`${col} = ANY($${params.length})`)
}

/**
 * True when the caller is a member with an explicit branch list and the
 * given branchId is NOT in it. Admin / super-admin are never blocked.
 */
function isBranchOutOfScope(req, branchId) {
  if (!req.allowedBranchIds) return false                 // admin / super-admin
  if (!branchId)             return false                 // unknown — let downstream validate
  return !req.allowedBranchIds.includes(branchId)
}

module.exports = { applyBranchScope, isBranchOutOfScope }
