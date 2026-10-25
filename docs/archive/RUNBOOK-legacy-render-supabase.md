> **ARCHIVED — OBSOLETE.** This runbook describes the retired Render + Supabase +
> apps.stepup2you.com stack. The server now uses PostgreSQL via `DATABASE_URL`, runs as a
> cPanel Node.js Selector app, and is served at https://musharakah.urrwah.com.
> Current procedures: [docs/RUNBOOK.md](../RUNBOOK.md) and [docs/DEPLOYMENT.md](../DEPLOYMENT.md).

# Musharaka Operations Runbook

> Deployment, monitoring, troubleshooting, and incident response procedures

---

## Table of Contents

1. [Deployment Procedures](#deployment-procedures)
2. [Health Checks & Monitoring](#health-checks--monitoring)
3. [Rollback Procedures](#rollback-procedures)
4. [Common Issues & Fixes](#common-issues--fixes)
5. [Database Operations](#database-operations)
6. [Performance & Scaling](#performance--scaling)
7. [Security & Access](#security--access)
8. [Incident Response](#incident-response)

---

## Deployment Procedures

### Pre-Deployment Checklist

Before deploying to production, verify:

```bash
# 1. All tests pass
npm run test:unit           # Server unit tests
npm run test:e2e            # E2E suite (might take 20+ mins)
npm run test:e2e api        # API regression only (faster)

# 2. No uncommitted changes
git status                  # Should be clean

# 3. On master branch
git branch                  # Should show * master

# 4. Up to date with remote
git fetch origin
git log origin/master..HEAD # Should be empty

# 5. Build artifacts succeed
cd musharaka/client && npm run build
cd ../.. && echo "✓ Client build OK"

# 6. No console errors or debug code
grep -r "console\." musharaka/server/src --include="*.js" | grep -v "^Binary" | head -5
grep -r "debugger" musharaka --include="*.js"
```

**If any check fails:** Fix before proceeding.

### Backend Deployment (Render)

**Note:** Render auto-deploys from `master` branch. Manual push triggers deploy automatically.

```bash
# 1. Ensure all changes committed and pushed
git add musharaka/server musharaka/supabase
git commit -m "chore: bump backend version"
git push origin master

# 2. Watch deploy on Render dashboard
# https://dashboard.render.com/services/srv-xxx
# Status: "Building" → "Deploying" → "Live"

# 3. Verify backend health
curl https://api.stepup2you.com/api/health
# Expected: {"status":"ok"}

# 4. Check server logs (optional)
# Render → musharaka-01 → Logs tab
```

**Deployment time:** ~3-5 minutes

**Rollback (if needed):** Render dashboard → Select previous successful deploy → Click "Rollback"

### Frontend Deployment

**Client is deployed via GitHub Pages or CDN (update as needed for your hosting):**

```bash
# 1. Build production bundle
cd musharaka/client
npm run build

# 2. Output ready at: dist/

# 3. Deploy to hosting (example: GitHub Pages)
# For GitHub Pages:
cp -r dist/* ../../../docs  # or commit to gh-pages branch
git add docs
git commit -m "chore: update dist [skip ci]"
git push origin master

# 4. Verify live
# Open https://apps.stepup2you.com in browser
# Check console for errors
# Verify API calls succeed (DevTools Network tab)
```

**Frontend deployment time:** ~1-2 minutes

### Database Migrations (Supabase)

**Prerequisites:**
- Supabase CLI installed: `npm install -g supabase`
- Link to project: `supabase link --project-ref PROJECT_ID`

**Apply pending migrations:**

```bash
cd musharaka

# 1. Review pending migrations
supabase migration list
# Shows which migrations haven't been applied

# 2. Push to production
supabase db push
# Prompts: "Apply X migrations to production? (y/n)"
# Review migration files before confirming

# 3. Verify schema updated
supabase db pull  # Pull remote schema locally
git diff         # Review changes
```

**Rollback migration (if needed):**

```bash
# For additive migrations (ADD COLUMN, CREATE TABLE):
# Create a rollback migration in supabase/migrations/
# Example rollback for migration 014:
supabase migration new rollback_014

# Edit the new migration file with DROP commands:
# ALTER TABLE tenants DROP COLUMN max_branches;
# ALTER TABLE tenants DROP COLUMN max_users;
# ALTER TABLE tenants DROP COLUMN plan_id;

# Then push:
supabase db push
```

**Destructive migrations:** Test on staging first. Never run directly on production unless critical bug.

### Environment Variables

**Backend (Render):**

Check current env vars on Render dashboard:
```
Services → musharaka-01 → Environment
```

Update an env var:
1. Click variable name
2. Edit value
3. Save
4. Render auto-redeploys (takes 2-3 minutes)

**Critical variables (verify before each deploy):**

| Variable | Expected Value | Impact |
|----------|---|---|
| `SUPABASE_URL` | `https://dadacgwzzgvlhfonvymk.supabase.co` | Auth & database |
| `SUPABASE_SERVICE_ROLE_KEY` | Matches production project | API operations |
| `CLIENT_ORIGIN` | `https://apps.stepup2you.com` | CORS, auth redirect |
| `REDIS_URL` | `redis://prod-redis:6379` | Job queues, caching |
| `ENCRYPTION_KEY` | Valid 64-char hex | Data encryption |
| `PORT` | `3001` | Server port |

**Check:**
```bash
# SSH to Render box (if available):
ssh render-app-server
env | grep SUPABASE
# Or use Render dashboard → Logs
```

---

## Health Checks & Monitoring

### Endpoint Health Checks

<!-- AUTO-GENERATED -->

**Backend API:**
```bash
curl https://api.stepup2you.com/api/health
# Expected: {"status":"ok"}
# Status 200 = Backend running
```

**Frontend:**
```bash
curl https://apps.stepup2you.com/
# HTTP 200 + HTML response
# Check DevTools Console for JS errors
```

**Database:**
```bash
# Via Supabase CLI:
supabase status

# Or via dashboard:
# https://app.supabase.com → Project Settings → Status
# Shows database uptime and connection count
```

**Redis (job queue):**
```bash
redis-cli PING
# Expected: "PONG"
# If error: check REDIS_URL in server .env
```

<!-- /AUTO-GENERATED -->

### Monitoring Setup

**Backend (Render):**
- Auto monitoring: Render provides uptime & response time charts
- Logs: Real-time streaming at Render dashboard
- Alerts: (Configure in Render dashboard if needed)

**Frontend:**
- Error tracking: Check browser console on app pages
- Sentry (optional): Add Sentry SDK for JavaScript error reporting
  ```javascript
  // In musharaka/client/src/main.jsx
  import * as Sentry from "@sentry/react";
  Sentry.init({ dsn: "https://your-sentry-dsn" });
  ```

**Database:**
- Supabase dashboard: Shows active connections, disk usage
- Slow queries: Check `extensions.pg_stat_statements` table in SQL editor

### Key Metrics to Track

| Metric | Target | Check |
|--------|--------|-------|
| API response time | <500ms | Render logs, browser Network tab |
| Backend uptime | >99.5% | Render dashboard |
| Database queries/sec | <100 | Supabase Studio → Metrics |
| Error rate | <0.1% | Backend logs |
| Test pass rate | 100% | GitHub Actions log |

---

## Rollback Procedures

### Backend Rollback (Render)

**If backend deploy breaks production:**

```bash
# 1. Immediate: Use Render web dashboard
# Services → musharaka-01 → Deploys
# Find last successful deploy (green checkmark)
# Click "Rollback" button
# Wait 3-5 minutes for rollback to complete

# 2. Verify rollback
curl https://api.stepup2you.com/api/health
# Should respond with {"status":"ok"}

# 3. Post-incident (what went wrong?)
git log --oneline origin/master..origin/develop  # Diff between branches
git show <commit-hash>                             # Review failing commit
```

### Frontend Rollback

**If frontend deploy breaks UI:**

```bash
# 1. Rebuild & redeploy previous working version
git checkout <last-good-commit>
cd musharaka/client
npm run build
# Deploy dist/ to hosting

# 2. Or restore from git history:
git revert <broken-commit>
git push origin master
# Frontend auto-rebuilds and redeploys

# 3. Verify
# Open https://apps.stepup2you.com
# Check console for JS errors
```

### Database Rollback

**If migration breaks data model:**

```bash
# 1. Stop the backend (to prevent further data corruption)
# Render dashboard → Services → musharaka-01 → Settings → Pause Service

# 2. Create and apply rollback migration
cd musharaka
supabase migration new rollback_xxx
# Edit rollback migration file with DROP/ALTER commands

# 3. Apply rollback
supabase db push  # Select rollback migration

# 4. Verify data integrity
supabase db pull
git diff  # Review what was rolled back

# 5. Restart backend
# Render dashboard → Services → musharaka-01 → Resume Service

# 6. Run tests to ensure consistency
npm run test:e2e api  # Quick API regression check
```

---

## Common Issues & Fixes

### Issue: Backend returns 401 (Unauthorized) on authenticated endpoints

**Symptoms:**
- Requests to `/api/branches`, `/api/sales` fail with 401
- Frontend shows "Session expired" message

**Root causes:**
1. JWT token expired (normal)
2. Supabase service-role key doesn't match project
3. Token signature validation fails
4. Clock skew (server time out of sync)

**Fix:**

```bash
# 1. Check token expiration
# Frontend DevTools Console:
JSON.parse(localStorage['sb-YOUR_PROJECT_ID-auth-token']).expires_at

# 2. Verify Supabase env vars on Render
# Render dashboard → Environment
# SUPABASE_URL must match the project sending the token
# SUPABASE_SERVICE_ROLE_KEY must match that project

# 3. Check server logs for detailed error
# Render → Logs tab, search for "401" or "JWT"
# Look for: "getUser rejected token { reason: ... }"

# 4. Refresh token (frontend handles this, but you can test):
# Frontend DevTools Console:
localStorage.removeItem('sb-YOUR_PROJECT_ID-auth-token')
window.location.reload()
# User redirected to login

# 5. If clock skew suspected, restart backend:
# Render dashboard → Services → musharaka-01 → Restart
```

See `DEPLOY.md` Step 4 for detailed JWT debugging procedure.

### Issue: Database connection refused

**Symptoms:**
- Backend logs: `Error: connect ECONNREFUSED 127.0.0.1:5432`
- All API endpoints return 500

**Root causes:**
1. Supabase project down (rare)
2. `SUPABASE_URL` incorrect
3. Service-role key invalid
4. Network/firewall blocking connection

**Fix:**

```bash
# 1. Check Supabase status
# https://app.supabase.com → Project Settings → Status
# Should show "Database: Active"

# 2. Verify env vars on server
# Render dashboard → Environment
# SUPABASE_URL should start with https://
# SUPABASE_SERVICE_ROLE_KEY should not be empty

# 3. Test connection locally
cd musharaka/server
# Update .env with remote credentials
npx node -e "
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  sb.from('tenants').select('count').then(r => console.log(r));
"

# 4. Restart backend
# Render dashboard → Services → musharaka-01 → Restart
```

### Issue: Redis queue not processing jobs

**Symptoms:**
- Background tasks (emails, exports) don't execute
- Job queue grows indefinitely
- Backend logs: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Root causes:**
1. Redis server down
2. `REDIS_URL` incorrect or expired
3. Network/firewall blocking Redis

**Fix:**

```bash
# 1. Check Redis connection
redis-cli -u redis://YOUR_REDIS_URL PING
# Should return "PONG"

# 2. View pending jobs
redis-cli
> KEYS bull:*       # List all Bull queues
> LLEN bull:email   # Count pending email jobs
> LPOP bull:email   # Inspect job details

# 3. Clear stuck jobs (use with caution)
redis-cli
> DEL bull:email    # Delete all email jobs
> LPUSH bull:email "{\"data\":\"test\"}"  # Add test job

# 4. Restart workers
# Render dashboard → Services → musharaka-01 → Restart
# Or kill nodemon and restart locally: npm run dev:server
```

### Issue: Frontend shows "Cannot GET /" or blank page

**Symptoms:**
- Browser loads but shows 404 or blank page
- Console shows network errors

**Root causes:**
1. Frontend build failed or not deployed
2. Wrong `VITE_API_URL` points to offline backend
3. JavaScript bundle failed to load

**Fix:**

```bash
# 1. Check frontend is deployed
curl -I https://apps.stepup2you.com/
# Should return HTTP 200 + HTML

# 2. Verify API URL in frontend config
# musharaka/client/.env:
VITE_API_URL=https://api.stepup2you.com  # Must be reachable

# 3. Rebuild frontend
cd musharaka/client
npm run build
# If build fails, fix errors (usually TypeScript or import errors)

# 4. Check browser console
# F12 → Console tab
# Look for syntax errors or failed chunk loads
# If 404 on .js chunks, check CDN/hosting path

# 5. Clear browser cache
# Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### Issue: Tests fail with "Timeout: 30s" exceeded

**Symptoms:**
- E2E tests hang and timeout
- Often on login or setup steps
- Works locally but fails on CI

**Root causes:**
1. Website slow or overloaded
2. Test waiting for element that doesn't exist
3. Network latency
4. CI machine running multiple jobs simultaneously

**Fix:**

```bash
# 1. Increase timeout (temporary)
# tests/playwright.config.ts:
// timeout: 30000,  // Default
timeout: 60000,     // Extended

# 2. Check website performance
curl -w '@- ' https://apps.stepup2you.com/dashboard << 'EOF'
    time_namelookup:  %{time_namelookup}s\n
    time_connect:     %{time_connect}s\n
    time_appconnect:  %{time_appconnect}s\n
    time_pretransfer: %{time_pretransfer}s\n
    time_starttransfer: %{time_starttransfer}s\n
    time_total:       %{time_total}s\n
EOF
# If total >10s, server is slow

# 3. Run test in UI mode to see what's happening
cd tests
npx playwright test --ui --debug
# Visually step through and identify bottleneck

# 4. Make tests more robust
// Instead of:
await page.waitForTimeout(5000);  // ❌ Flaky

// Use:
await page.waitForSelector('text=Dashboard');  // ✓ Deterministic
await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
```

---

## Database Operations

### Taking a Database Backup

```bash
# Supabase automatically backs up daily
# Manual backup via Supabase CLI:

supabase db pull  # Download schema as local migration

# Or via Supabase dashboard:
# Settings → Backups → Download
# Creates a .sql file you can restore
```

### Restore from Backup

```bash
# 1. Get backup file (download from dashboard or use local SQL file)

# 2. Restore to fresh database (use with caution)
psql postgresql://user:pass@db.host/dbname < backup.sql

# 3. Or restore via Supabase dashboard:
# Settings → Backups → Select backup → Restore
# This overwrites production data!
```

### Running SQL Queries

```bash
# Via Supabase CLI:
supabase sql << 'EOF'
  SELECT tenant_id, COUNT(*) as sales_count
  FROM sales
  GROUP BY tenant_id
  ORDER BY sales_count DESC;
EOF

# Via Supabase dashboard:
# SQL Editor → New query → Write and execute
```

### Fixing Data Corruption

**Example: Duplicate branch codes**

```sql
-- Find duplicates per tenant
SELECT tenant_id, code, COUNT(*) as cnt
FROM branches
GROUP BY tenant_id, code
HAVING COUNT(*) > 1;

-- Delete duplicates (keep oldest)
DELETE FROM branches
WHERE id NOT IN (
  SELECT MIN(id)
  FROM branches
  GROUP BY tenant_id, code
);
```

**Always test on staging first before running on production.**

---

## Performance & Scaling

### Frontend Performance

**Check Core Web Vitals:**

```bash
cd musharaka/client
npm run build
npx lighthouse https://apps.stepup2you.com/dashboard --view
```

**Targets:**
- **LCP** (Largest Contentful Paint): < 2.5s
- **INP** (Interaction to Next Paint): < 200ms
- **CLS** (Cumulative Layout Shift): < 0.1

**Optimization techniques:**
- Code splitting: `import { lazy } from 'react'`
- Image optimization: Use WebP, set explicit dimensions
- Bundle analysis: `npx vite-bundle-visualizer`
- Caching: Set long TTL for static assets

### Backend Performance

**Monitor API response times:**

```bash
# Check slowest endpoints
tail -f <server-logs> | grep "ms"
# Requests >500ms are slow

# Or use frontend DevTools Network tab
# F12 → Network → filter by slow responses
```

**Optimization:**
1. Add database indexes on frequently queried columns
2. Use pagination: Fetch only 50 items per request
3. Cache: Redis for expensive queries
4. Batch operations: Combined imports instead of individual inserts

### Database Performance

**Monitor slow queries:**

```sql
-- View slow queries (requires pg_stat_statements extension)
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Optimize:**
1. Add indexes: `CREATE INDEX idx_sales_tenant ON sales(tenant_id)`
2. Analyze: `ANALYZE sales;`
3. Avoid N+1: Use JOINs instead of loops

### Scaling Strategy

| Layer | Scaling Method | When |
|-------|---|---|
| **Frontend** | CDN caching | Slow load times |
| **Backend** | Horizontal scaling (multiple instances) | High CPU/memory |
| **Database** | Read replicas, connection pooling | High query load |
| **Jobs** | Multiple workers on separate instance | Queue backlog |

---

## Security & Access

### Access Control

**Who can deploy?**
- Currently: Maintainers with Git push + Render dashboard access
- CI/CD: GitHub Actions (auto-deploy on master)

**To add deployer access:**
1. Grant GitHub push access to `master` branch (protected)
2. Request Render dashboard invite from account owner
3. Add to Supabase project (Settings → Team → Invite)

### Secrets Management

**Production secrets stored in:**
- Render: Environment variables (dashboard)
- Supabase: Project settings
- GitHub: Secrets (for CI/CD)

**Never commit:**
- `.env` files
- API keys, tokens, passwords
- Private encryption keys
- Database credentials

**If secret leaked:**
1. Immediately rotate on hosting platform (Render, Supabase)
2. Review logs for unauthorized access
3. Update `.env.example` (without actual values)
4. Commit rotation as emergency security fix

```bash
# Example: rotate Redis URL
# Render dashboard → Environment
# REDIS_URL → Edit → New value → Save
# Auto-redeploy happens in ~2 mins
```

### Audit Logging

**Enable audit logs to track changes:**

```sql
-- View recent changes to critical tables
SELECT * FROM audit_log
WHERE table_name IN ('tenants', 'users', 'api_keys')
ORDER BY created_at DESC
LIMIT 20;
```

---

## Incident Response

### Incident Classification

| Severity | Impact | SLA |
|----------|--------|-----|
| **P1 (Critical)** | Service completely down, data loss | Respond in 15 min |
| **P2 (High)** | Major feature broken, many users affected | Respond in 30 min |
| **P3 (Medium)** | Minor feature broken, single user or workaround exists | Respond in 2 hours |
| **P4 (Low)** | Cosmetic issue, no impact on usage | Best effort |

### Incident Response Workflow

#### 1. Detect & Alert

```bash
# Automated: Uptime monitoring (if configured)
# Manual: Check dashboards regularly
#   - Render status: https://dashboard.render.com
#   - Supabase: https://app.supabase.com
#   - GitHub: https://github.com/your-repo/actions
```

#### 2. Acknowledge & Respond

```bash
# 1. Acknowledge in team Slack/Discord
# "🚨 P1: Backend responding with 500 errors since 14:30 UTC"

# 2. Assign incident lead
# (Tech lead or on-call engineer)

# 3. Gather information
curl https://api.stepup2you.com/api/health  # Status check
git log --oneline -5                         # Recent changes
# Render logs → Look for errors
```

#### 3. Mitigate

**If recent deploy broke production:**

```bash
git log --oneline origin/master | head -5
# Identify the breaking commit

# Option A: Rollback (fastest)
# See "Rollback Procedures" section above

# Option B: Hotfix (if rollback loses data)
git checkout master
git revert <breaking-commit>
git push origin master
# Render auto-redeploys
```

**If database issue:**
```bash
# Check Supabase status
# If down: Wait for Supabase infrastructure team
# If reachable: Check env vars and restart backend
```

**If Redis queue stuck:**
```bash
redis-cli -u $REDIS_URL FLUSHALL  # Clear all jobs (use cautiously)
# Or delete specific queue: redis-cli DEL bull:email
```

#### 4. Communicate

**Keep stakeholders informed:**
- Team: "Working on fix, ETA 10 minutes"
- Users: Post status update (if service is critical)
- Partners: Notify of extended outage (>30 mins)

#### 5. Resolve

```bash
# Verify service is restored
curl https://api.stepup2you.com/api/health
curl https://apps.stepup2you.com/
# Test critical user flows in browser
```

#### 6. Post-Incident Review (within 24 hours)

```markdown
## Incident Summary
- **Start time:** 2026-04-24 14:30 UTC
- **End time:** 2026-04-24 14:45 UTC (15 min)
- **Severity:** P1 (Critical)
- **Root cause:** Breaking change in commit abc123
- **Timeline:**
  - 14:30 Backend deploy completed
  - 14:32 Monitoring alert triggered
  - 14:35 Team investigated, identified commit
  - 14:40 Rolled back to previous version
  - 14:45 Service restored

## Impact
- ~200 users unable to log in for 15 minutes
- Data integrity: No data loss

## Resolution
- Reverted commit abc123
- Improved code review process to catch issues before deploy

## Action Items
- [ ] Add regression test case for this scenario
- [ ] Add health check before committing
- [ ] Document procedure for future rollbacks
```

---

## Monitoring Checklist (Daily)

```bash
# 5-minute health check
curl https://api.stepup2you.com/api/health
curl -I https://apps.stepup2you.com/

# View recent logs
# Render → Logs (search for "ERROR", "WARN")

# Check test results
# GitHub → Actions → Latest workflow run
# Should show all tests passing

# Review pending PRs
# GitHub → Pull Requests
# Approve and merge if ready
```

---

## Useful Commands Reference

```bash
# Backend logs (Render)
# Render dashboard → Services → musharaka-01 → Logs

# Database queries
supabase sql "SELECT * FROM audit_log LIMIT 10;"

# Check dependencies for vulnerabilities
npm audit
npm audit fix  # Auto-fix low/medium

# Git commands for incident response
git log --oneline --graph --all
git show <commit>
git revert <commit>
git reset --hard origin/master  # Discard local changes
```

---

## Emergency Contacts

- **Tech Lead:** Ibrahim Al Jefri (ibrahimaljefri90@gmail.com)
- **Hosting Support:** Render (https://dashboard.render.com/support)
- **Database Support:** Supabase (https://app.supabase.com/support)
- **Monitoring:** GitHub Actions (https://github.com/your-repo/actions)

---

**Last Updated:** April 2026  
**Document Owner:** Ibrahim Al Jefri  
**Review Schedule:** Every 3 months
