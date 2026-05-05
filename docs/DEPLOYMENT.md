# Deployment — Musharaka / urrwah.com

This project uses the [`cpanel-deploy`](~/.claude/skills/cpanel-deploy/) skill
for deploys to a cPanel + VPS environment.

## TL;DR

| Want to… | Do this |
|---|---|
| Ship to dev (`dev.urrwah.com`)  | `git push origin dev` (auto via GitHub Actions) |
| Ship to prod (`urrwah.com`)     | `ssh urrwah@urrwah.com` then `bash ~/deploy.sh prod` |
| Code-only prod deploy           | `bash ~/deploy.sh prod --skip-migrate` |
| Roll back prod                  | `bash ~/deploy.sh prod --rollback <sha>` |
| Verify deployed version         | `curl https://urrwah.com/api/version` |

## Architecture

```
┌─ urrwah.com ────────────────────────────┐    ┌─ dev.urrwah.com ───────────────┐
│                                         │    │                                │
│  Apache → 127.0.0.1:3001 (urrwah-api)   │    │  Apache → 127.0.0.1:3002       │
│       │                                 │    │         (urrwah-dev-api)       │
│       └→ urrwah_prod (Postgres :5432)   │    │       └→ urrwah_dev (:5433)    │
│                                         │    │                                │
│  Branch: master                         │    │  Branch: dev                   │
│  Trigger: manual SSH `bash ~/deploy.sh` │    │  Trigger: GitHub Actions push  │
│                                         │    │                                │
└─────────────────────────────────────────┘    └────────────────────────────────┘
            ▲                                                ▲
            │                                                │
            └──── /api/version returns the deployed SHA ─────┘
                    so post-deploy you can verify exactly what's running
```

Two **separate Postgres clusters** — full isolation. Different ports, different
data, different passwords.

## Branches

- `master` → urrwah.com (production)
- `dev`    → dev.urrwah.com (development)
- Feature branches → PR into `dev` → after UAT, merge `dev` into `master`

## Files involved

| File | Purpose |
|---|---|
| `.deploy-config.json`                  | Deploy paths, branches, ports, app names |
| `.github/workflows/deploy-dev.yml`     | Auto-deploys on push to `dev` |
| `musharaka/server/src/index.js`        | `/api/health` and `/api/version` endpoints |
| `musharaka/server/scripts/seed-fresh-prod.sh`  | One-time fresh-DB seed (superadmin + admin@admin.com) |
| `musharaka/server/scripts/seed-fresh-prod.sql` | SQL template for above |
| `~/deploy.sh` (lives on VPS)           | The actual deploy entrypoint |
| `~/.env.deploy` (lives on VPS)         | DB passwords + ENCRYPTION_KEY (never in git) |

## First-time bring-up

If urrwah.com doesn't exist yet:

1. Follow the [`vps-setup.md`](~/.claude/skills/cpanel-deploy/vps-setup.md) checklist
2. Follow the [`migration-plan.md`](~/.claude/skills/cpanel-deploy/migration-plan.md) bring-up runbook
3. Production starts with **only two users**: `superadmin@urrwah.com` and `admin@admin.com`. No tenants/branches/sales carry over from stepup2you.

## Pre-flight checks

Before any deploy, the cpanel-deploy skill runs through a checklist:

1. `git status` clean + everything pushed
2. New SQL migrations are in `musharaka/server/src/schema/` (NOT `migrations/`)
3. Each new SQL file uses `IF NOT EXISTS` / `OR REPLACE`
4. `npm run build` exits 0
5. No leaked secrets in the diff
6. If middleware queries a new column, the migration creating it must exist

If any check fails, don't deploy — fix first.

## Verifying a deploy

After running `bash ~/deploy.sh prod`:

```bash
# 1. Health check
curl -s https://urrwah.com/api/health
# {"status":"ok"}

# 2. Verify SHA matches what you intended to ship
curl -s https://urrwah.com/api/version
# {"sha":"abc1234...","deployed_at":"2026-05-06T...","node_env":"production"}

# 3. Hard-refresh the browser (Ctrl+F5) — bundle hashes should differ
```

## Common failure modes

| Symptom | Likely cause | Recovery |
|---|---|---|
| 503 on every authenticated request | Migration didn't run | `bash ~/deploy.sh prod` (re-run migrations); or apply specific SQL manually |
| 500 on a specific endpoint | Code bug | `bash ~/deploy.sh prod --rollback <prev_sha>` |
| `node: command not found` | nodevenv not activated | `source "$(find ~/nodevenv -name activate -type f \| head -1)"` |
| Apache 502 on `/api/*` | Node app down | cPanel → "Setup Node.js App" → Restart |
| Old bundle in browser | Cache | Ctrl+F5; check DevTools Network for new hash |

## Logs

- Deploy log: `~/logs/deploy-<env>-YYYY-MM-DD.log`
- Node app log: `~/urrwah-api.log` (prod) or `~/urrwah-dev-api.log` (dev)

## See also

- The skill itself: `~/.claude/skills/cpanel-deploy/SKILL.md`
- VPS setup: `~/.claude/skills/cpanel-deploy/vps-setup.md`
- Bring-up runbook: `~/.claude/skills/cpanel-deploy/migration-plan.md`
