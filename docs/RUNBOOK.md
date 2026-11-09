# Musharakah operations runbook

Production: https://musharakah.urrwah.com · cPanel account `d17546` (CloudLinux, no root, no Docker) ·
Node.js Selector app, Node 22 · PostgreSQL via `DATABASE_URL`.
Deploy and cutover steps: [DEPLOYMENT.md](DEPLOYMENT.md). The previous Render/Supabase runbook is archived in
[archive/RUNBOOK-legacy-render-supabase.md](archive/RUNBOOK-legacy-render-supabase.md) and does not apply.

All production access goes from lab-server with `ssh cpanel-partner`. Production changes need the owner's explicit OK.
Never print `.env` contents.

## Health

```bash
curl -s https://musharakah.urrwah.com/api/health    # {"status":"ok"}
curl -s https://musharakah.urrwah.com/api/version   # {"sha":"…","deployed_at":"…","node_env":"production"}
```

## Logs

| What | Where |
|---|---|
| App / Passenger | `~/logs/urrwah-api.log` |
| Deploys | `~/logs/deploy-<env>-YYYY-MM-DD.log` |
| Apache access/error | cPanel → Metrics → Raw Access / Errors for the subdomain |

## Restart

cPanel → *Setup Node.js App* → the Musharakah app → *Restart* (or `touch ~/repos/urrwah-prod/musharaka/server/tmp/restart.txt`).
Do not use `pkill`/`pgrep` (blocked by CageFS).

## Roll back

```bash
bash ~/deploy.sh prod --rollback <previous_sha>
```
Schema migrations are additive and idempotent; they are not rolled back.

## Troubleshooting

| Symptom | Check |
|---|---|
| 404 on `/api/*` and SPA deep links | docroot `.htaccess` lost its Passenger block (deploy `rsync --delete`); re-save the app in *Setup Node.js App* |
| 503 from Apache | nothing listening on the proxied port; start or register the app |
| 500 at start, `Cannot find module` | *Run NPM Install* in the selector |
| Boot error `CLIENT_ORIGIN must be set` | add it to the app `.env` and restart |
| Browser CORS error | Origin missing from `CLIENT_ORIGIN` (comma list, bare origins) |
| Login loops / 401 after refresh | `refresh_token` cookie is host-only and `SameSite=Lax`: the page and API must share the host `musharakah.urrwah.com` |
| Password-reset or bot links show the wrong host | `APP_URL` / first `CLIENT_ORIGIN` entry |
| Bot silent | re-register the Telegram webhook to `/api/bot/telegram`; check `TELEGRAM_WEBHOOK_SECRET` |

## Database

```bash
psql "$DATABASE_URL" -c 'select count(*) from app_users;'   # on the VPS, URL from the app env — do not echo it
```
New migrations: `musharaka/server/src/schema/NNN_name.sql`, idempotent (`IF NOT EXISTS` / `OR REPLACE`), applied by `deploy.sh`.
