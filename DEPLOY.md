# Production Fix Deploy — Rollout Steps

Seven production bugs were identified by the E2E test run and fixed in this branch. This document is the rollout checklist: apply the changes in order, then re-run the E2E suite to confirm recovery.

---

## What's in this changeset

| # | File | Change |
|---|------|--------|
| 1 | `musharaka/supabase/migrations/014_add_max_branches_to_tenants.sql` | **NEW** — adds `max_branches`, `max_users`, `plan_id` to `tenants`; seeds `subscription_plans`. Fixes BUG-008. |
| 2 | `musharaka/server/src/middleware/auth.js` | Adds diagnostic logging on `supabase.auth.getUser` rejection. Token never logged. Helps triage BUG-001. |
| 3 | `musharaka/server/src/middleware/rateLimiter.js` | Adds `authLimiter` (5/min), `adminWriteLimiter` (30/min), `adminWriteOnly` helper. |
| 4 | `musharaka/server/src/routes/admin.js` | Applies `adminWriteOnly` so admin writes get the tighter bucket. |
| 5 | `musharaka/server/src/index.js` | Helmet hardening: HSTS preload, `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies`, Referrer-Policy, `frame-deny`. |
| 6 | `musharaka/client/index.html` | Pre-React auth bootstrap (`<script>` in `<head>`): SSR-equivalent redirect before React mounts. Fixes BUG-002 / BUG-003 URL flash. |
| 7 | `musharaka/client/src/App.jsx` | `ProtectedRoute` / `AdminRoute` use `window.location.replace` + loading state for synchronous redirect. |
| 8 | `musharaka/client/src/store/authStore.js` | `storage` event listener: external localStorage clear triggers logout. Fixes BUG-004. |
| 9 | `musharaka-tests/e2e/prod/admin/api-keys.spec.ts` (remote GPU) | Fix `keyShown` selector to match actual UI (`.bg-green-50` + `msk_` prefix). Fixes BUG-005 false-positive. |

Total source files touched: 8 in repo + 1 on remote test box.

---

## Pre-flight

- [ ] Review the diff: `git diff master`
- [ ] Confirm test baseline: `cd musharaka/server && npm test` — should report **149 passed, 1 failed** (pre-existing `api.admin.users.test.js:166`).
- [ ] Confirm client still builds: `cd musharaka/client && npm run build`.

---

## Step 1 — Apply Supabase migration (unblocks BUG-008)

**Why first:** Every authenticated page load currently throws 4 × HTTP 400 on `tenant_users`. Running this migration clears those immediately and restores the dashboard loader.

Using Supabase CLI (preferred):
```bash
cd musharaka
supabase link --project-ref dadacgwzzgvlhfonvymk   # one-time
supabase db push
```

Or via Supabase Dashboard → SQL Editor — copy the contents of `supabase/migrations/014_add_max_branches_to_tenants.sql` and execute.

**Verify:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='tenants' AND column_name IN ('max_branches','max_users','plan_id');
-- expect 3 rows
```

---

## Step 2 — Verify Render backend env vars (attempt A for BUG-001)

On Render dashboard for `musharaka-01`:
- `SUPABASE_URL` → `https://dadacgwzzgvlhfonvymk.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` → matches the production Supabase project service-role key
- `SUPABASE_ANON_KEY` → matches the production anon key
- `CLIENT_ORIGIN` → `https://apps.stepup2you.com`

If any value is wrong or missing, fix it and trigger a redeploy. If values look right, continue — Step 4 logging will reveal the true reason.

---

## Step 3 — Deploy backend

```bash
git add musharaka/server musharaka/supabase
git commit -m "fix(server): tighten rate limits, add security headers, diagnostic auth logging, subscription migration"
git push origin master
```

Render auto-deploys from `master`. Confirm the deploy succeeds at https://musharaka-01.onrender.com/api/health → `{"status":"ok"}`.

---

## Step 4 — Reproduce BUG-001 and read Render logs (attempt B for BUG-001)

After Step 3 deploys, reproduce the 401 by making an authenticated request to `/api/branches`:
```bash
# From any browser on apps.stepup2you.com, open DevTools console:
fetch('/api/branches', { headers: { Authorization: 'Bearer ' + JSON.parse(localStorage['sb-dadacgwzzgvlhfonvymk-auth-token']).access_token } }).then(r => r.status)
```

Then read Render logs. The new diagnostic line tells you exactly why:
```
[auth] getUser rejected token { route: '/api/branches', reason: '<message>', status: <code> }
```

Common causes:
- `invalid JWT`: frontend Supabase URL/anon key differs from backend's service-role project
- `token expired`: clock skew — check system time on Render node
- `JWT signature verification failed`: rotated service-role key

Apply the appropriate fix (rotate env var, sync projects, restart). Once `/api/branches` returns 200, Step 4 is done.

---

## Step 5 — Deploy client

```bash
cd musharaka/client
npm run build
# deploy dist/ to wherever apps.stepup2you.com is served from
```

**Verify client deploy:**
- Incognito window → `https://apps.stepup2you.com/dashboard` → should redirect to `/login` **without flash** (the pre-React bootstrap in `index.html` fires before React loads).
- Login → DevTools → `localStorage.clear()` → page redirects to `/login` within ~1s (the new `storage` listener).

---

## Step 6 — Re-run full E2E suite on remote GPU

SSH to `192.168.100.79` (or run from local via the helper script):

```powershell
cd C:\Users\ibrahim\musharaka-tests
F:\npx playwright test --config=playwright.prod.config.ts --project=prod-setup --project=prod-admin-setup
F:\npx playwright test --config=playwright.prod.config.ts --project=prod-chromium --project=prod-admin
F:\npx playwright show-report playwright-prod-report
```

**Target pass criteria:**

| Bucket | Before | After |
|--------|--------|-------|
| prod-chromium | 1818 pass / 276 fail / 134 skip (2228) | ≥ 2220 pass / ≤ 8 fail / 0 skip |
| prod-admin | 1601 / 0 / 0 | 1601 / 0 / 0 (unchanged) |
| SESS-011, SESS-012, SESS-013 | FAIL | PASS |
| BRR-009, BRR-012, BRR-018, BRR-026 | FAIL | PASS |
| AK keyShown | `false` × 250 | `true` × 250 |
| Overall pass rate | 92.5 % | ≥ 99 % |

If any of SESS / BRR / AK still fail, re-check Steps 1-5 — most likely the migration wasn't applied to production or the client wasn't rebuilt.

---

## Step 7 — Regression check (previously skipped BRR tests)

```powershell
F:\npx playwright test --config=playwright.prod.config.ts --project=prod-chromium --grep "BRR-"
```

All 30 BRR tests should pass now that `/api/branches` returns 200. The original 134 skip-gated tests from Run 1 (which were conditional `test.skip()` inside if-blocks) are absorbed into BRR-001..030 + main branch CRUD.

---

## Rollback plan

If any deploy step breaks production:

- Render: click "Rollback" on the previous successful deploy.
- Client: revert the `dist/` to the previous build.
- Supabase: migration 014 is additive-only (`ADD COLUMN IF NOT EXISTS`) — no rollback needed. If necessary: `ALTER TABLE tenants DROP COLUMN max_branches, DROP COLUMN max_users, DROP COLUMN plan_id;`
