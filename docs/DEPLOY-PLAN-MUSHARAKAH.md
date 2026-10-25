# Deploy plan: Musharakah app on https://musharakah.urrwah.com

State on 2026-10-25: DNS, subdomain (`~/musharakah_site`), certificate, H1 (`deploy.sh` prod `DOCROOT`) and H4 (Selector app registered under
`musharakah.urrwah.com`) are done. The apex now serves the Partner Portal and 301s old paths. `musharakah.urrwah.com` **times out**: the Passenger app
cannot start (no dependencies, no `CLIENT_ORIGIN`, no DB). Nothing else has been deployed.

Every step below is its own approval, asked in the S3 session. Backups live in `~/backups/musharakah-20261025/` (already holds `deploy.sh.orig`,
`selector-before.json`, `musharakah_site.htaccess.orig`). Secrets are never printed, committed or sent through chat: the owner types them on the server.

## What `~/deploy.sh prod` does today (read 2026-10-25)

`git fetch` then `git reset --hard origin/master` in `~/repos/urrwah-prod` → apply `src/schema/*.sql` with `psql` (each with `|| true`: **failures are
silent**) → stamp `GIT_SHA`/`DEPLOYED_AT` into the app `.env` → `npm install` + `npm run build` of the client **on the account** (`VITE_API_URL` unset, so
same-origin) → `rsync -av --delete --exclude=.htaccess --exclude=cgi-bin dist/ ~/musharakah_site/` (now guarded) → `npm install --omit=dev` in the server →
restart → health check. Options: `--skip-migrate`, `--rollback <sha>` (resets to that SHA and skips migrations; any pushed SHA works, including a branch commit).
Problems (patch: [deploy-sh-h5.patch.txt](deploy-sh-h5.patch.txt)): `$NODE_APP` is never defined (`set -u` aborts step 7 unless `~/.env.deploy` sets it);
step 7 starts a bare `nohup node` on :3001 next to the Passenger app and `pkill` is blocked on CageFS, so processes pile up and Passenger never restarts
(stale code); the health check hits `127.0.0.1:3001`, not the public URL. It reads only `client_dir`, `server_dir`, `schema_dir`, `build_output` from
`.deploy-config.json`; DB name/user/port come from `~/.env.deploy` or default to `urrwah_prod` / `urrwah_prod_app` / 5432.

## Decisions for the owner

1. **Which code.** (A, recommended) merge PR #3 into `dev` with `[skip ci]` (so `deploy-dev.yml` does not touch the account), then PR `dev → master`, then deploy `master`.
   Prod then gets all 58 `dev` commits; expect conflicts only in committed `dist`. (B, fastest) deploy the PR #3 branch commit directly with
   `bash ~/deploy.sh prod --rollback <sha>`; master stays untouched, merge later. B skips migrations (run D6 separately) and leaves `master` and prod out of sync.
2. **Where the client is built.** (default) on the account by `deploy.sh`, as it always did. `deploy.sh` cannot skip its build step, so shipping a
   lab-server build means copying `dist` into `~/musharakah_site` by hand (same exclusions, through the guarded path) and touching `tmp/restart.txt`; use it
   only if the account build fails.

## Ordered steps (each needs its own OK)

| Step | What | Who | Evidence / success |
|---|---|---|---|
| D0 | Names-only, read-only inspection: `ls ~/repos/urrwah-prod` + current git HEAD, key **names** (no values) of `~/.env.deploy` and the app `.env`, `uapi Postgresql list_databases/list_users` (names), `ls -A ~/musharakah_site` | S3 | pasted names list; tells which env/DB items already exist |
| D1 | *(optional)* Static placeholder `~/musharakah_site/index.html` (Arabic/English "launching", `noindex`, no scripts) so visitors of `/` stop timing out; paths other than `/` still hit the app. Removed automatically by the first deploy's `rsync --delete` | S3 | `curl -I https://musharakah.urrwah.com/` → 200 fast |
| D2 | Database: owner creates (or confirms) `d17546_urrwah_prod` and user `d17546_urrwah_prod_app` in cPanel → PostgreSQL Databases, grants all privileges, chooses the password | owner | `uapi Postgresql list_databases` shows it |
| D3 | Env files. `~/.env.deploy`: `DB_PROD_PASS`, `DB_PROD_NAME`, `DB_PROD_USER`, `DB_PROD_PORT`, `ENCRYPTION_KEY`, `SEINOMY_*`. App `~/repos/urrwah-prod/musharaka/server/.env`: see names below. S3 creates a names-only template (empty values) if a file is missing; **owner fills in secrets in his own editor on the server**, mode 600 | owner (+S3 template) | `grep -c '=$'` shows no empty required keys (names only) |
| D4 | Code path from decision 1: **A** merge PR #3 → `dev` (`[skip ci]`), PR `dev → master`, merge. **B** pick the branch SHA | owner merges / S3 prepares PRs | `git ls-remote origin master` equals the intended SHA |
| D5 | Patch `~/deploy.sh` per `deploy-sh-h5.patch.txt` (define `NODE_APP`; prod restarts Passenger by `touch tmp/restart.txt` instead of a bare node; health check on the public URL). Backup first, `bash -n`, diff | S3 | `diff` equals the patch; `bash -n` ok; not run |
| D6 | Schema, first install, loud failure: `cd ~/repos/urrwah-prod/musharaka/server && set -a && . ./.env && set +a && node schema-apply.js` (25 idempotent files, stops at the first error). Needs D2, D3 and the code of D4 on the account | S3 | "All schema files applied successfully."; `\dt` count (no data shown) |
| D7a | Remove the duplicate Passenger block in `~/musharakah_site/.htaccess` (backup first) | S3 | one `CLOUDLINUX PASSENGER` BEGIN/END pair |
| D7b | Add `docs/musharakah-docroot.htaccess` rules (www → apex, http → https, `/.well-known` excluded) above the php and Selector blocks | S3 | `curl -sI http://musharakah.urrwah.com/` → 301 https; `www.` → 301 |
| D8 | `bash ~/deploy.sh prod --skip-migrate` (A) or `--rollback <sha>` (B) | S3 | log ends `DONE`; `/api/health` → `{"status":"ok"}` within ~40 s; `/api/version` sha = deployed commit |
| D9 | Seed the two initial users (prod starts with `superadmin@urrwah.com` and `admin@admin.com`): `ssh -t cpanel-partner 'cd ~/repos/urrwah-prod && bash musharaka/server/scripts/seed-fresh-prod.sh prod'`; it prompts for the passwords, so the **owner runs it himself**; it refuses if users exist | owner | "seeded" message; login works |
| D10 | Verify: `/api/health`, `/api/version`, `/login` 200, `/dashboard` 200 (SPA fallback), CORS preflight from the new origin, `Set-Cookie: refresh_token` with no `Domain`, old apex paths still 301 here (`curl -sI https://urrwah.com/dashboard`), S1's `./verify-hosts.sh --profile fast --only musharakah` | S3 + S1 | all as listed |
| D11 | Telegram (and Twilio) webhook: `setWebhook` to `https://musharakah.urrwah.com/api/bot/telegram` with the secret; run with values read from the `.env` without echoing them | S3 | `getWebhookInfo` url matches |

Rollback: D8 → `bash ~/deploy.sh prod --rollback <previous sha>`; D5/D7 → copy the backups back (`deploy.sh.orig`, `musharakah_site.htaccess.orig`);
D1 → delete the placeholder. DB changes are additive (`IF NOT EXISTS`); the DB can be dropped by the owner in cPanel if the install must be redone.
H4 needs no rollback for a deploy failure; a failed app leaves the host timing out exactly as today.

## Variable names (values only on the server)

App `.env`: **required** `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CLIENT_ORIGIN` = `https://musharakah.urrwah.com` (comma list may add
`https://dev.musharakah.urrwah.com` on dev only). **Optional** `APP_URL`, `UPLOAD_DIR`. **Mail**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASS`, `SMTP_FROM`. **Bot/integrations**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TWILIO_AUTH_TOKEN`, `ENABLE_WHATSAPP_BOT`,
`CONTRACTS_API_KEY`, `SEINOMY_BASE_URL`, `SEINOMY_MOCK`, `SEINOMY_TIMEOUT`, `INTERNAL_KILL_KEY`. **Stamped by deploy**: `GIT_SHA`, `DEPLOYED_AT`.
**Leave unset**: `REDIS_URL`, `DATABASE_SSL`, `SUPABASE_*`, `HSTS_INCLUDE_SUBDOMAINS`, `PID_FILE`. Client build: `VITE_API_URL` unset (same origin), no other client variable.
Who creates what: DB name/user/password and SMTP/Telegram/Twilio values: owner. `JWT_SECRET`, `ENCRYPTION_KEY`, `INTERNAL_KILL_KEY`, `TELEGRAM_WEBHOOK_SECRET`:
owner, or generated on the server with `openssl rand` straight into the file without printing (S3, with approval; prod starts empty, so new keys are safe).
