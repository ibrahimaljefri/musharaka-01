# Deployment — Musharakah (https://musharakah.urrwah.com)

Musharakah is one product on the shared cPanel account `d17546` (CloudLinux, no root, no Docker).
Host convention: `{product}.urrwah.com`, one app per host, accounts and cookies separate per product
(domain contract `/srv/dev/projects/domain-contract.md`, F1/F2).

> Status: the repo is host-ready; **production is not switched yet**. Everything under
> "Production cutover" needs the owner's explicit OK, per change, and runs from lab-server only.

## TL;DR

| Want to… | Do this |
|---|---|
| Ship to dev (`dev.urrwah.com`) | `git push origin dev` (GitHub Actions `deploy-dev.yml`) — dev is currently down, see below |
| Ship to prod (`musharakah.urrwah.com`) | from lab-server: `ssh cpanel-partner 'bash ~/deploy.sh prod'` (after owner OK) |
| Code-only prod deploy | `bash ~/deploy.sh prod --skip-migrate` |
| Roll back prod | `bash ~/deploy.sh prod --rollback <sha>` |
| Verify | `curl -s https://musharakah.urrwah.com/api/health` and `/api/version` |

## Hosts and configuration

| Setting | Production | Dev |
|---|---|---|
| Public host | `https://musharakah.urrwah.com` | `https://dev.urrwah.com` |
| Docroot (cPanel subdomain) | `~/musharakah_site` (outside `public_html`; pending owner OK) | `~/public_html/dev.urrwah.com` |
| Node app (Node.js Selector) | root `repos/urrwah-prod/musharaka/server`, Node 22, startup `src/index.js`, URI empty | none registered (bare process on :3002, dead) |
| `CLIENT_ORIGIN` (CORS, comma list) | `https://musharakah.urrwah.com` | `https://dev.urrwah.com` |
| `APP_URL` (links in e-mail / bot) | optional, defaults to first `CLIENT_ORIGIN` | same |
| `VITE_API_URL` (client build) | unset (same origin: client calls `/api`) | unset |
| Database | `d17546_urrwah_prod` | `d17546_urrwah_dev` |
| Branch | `master` | `dev` |

HSTS is sent for this host only (`max-age` 1 year, never `preload`); `includeSubDomains` is opt-in via `HSTS_INCLUDE_SUBDOMAINS=true`
and must stay off until every `*.urrwah.com` host serves working HTTPS (contract D5).

`CLIENT_ORIGIN` is **required in production**: the server refuses to start without it
(`musharaka/server/src/config/hosts.js`). Entries must be bare origins (`https://host[:port]`).
Server env lives in `~/repos/urrwah-prod/musharaka/server/.env` (never in git). `.env.example` documents the keys.

The legacy apex `urrwah.com` only carries 301 redirects to the new host after the cutover:
[`docs/legacy-redirects.htaccess`](legacy-redirects.htaccess).

## Files involved

| File | Purpose |
|---|---|
| `.deploy-config.json` | domain, docroots, node app, health URL (read by `~/deploy.sh`) |
| `.github/workflows/deploy-dev.yml` | auto-deploy to dev on push to `dev`; only *reports* prod health |
| `.github/workflows/build.yml` | builds the client on push to `master` (same-origin build) |
| `.github/workflows/staging.yml` | builds `staging-dist` from `redesign`; no staging host exists |
| `musharaka/server/src/config/hosts.js` | `CLIENT_ORIGIN` / `APP_URL` parsing and validation |
| `musharaka/server/src/index.js` | `/api/health`, `/api/version` |
| `musharaka/server/src/schema/*.sql` | idempotent migrations |
| `docs/legacy-redirects.htaccess` | apex → new host 301 rules (S1 applies) |
| `~/deploy.sh`, `~/.env.deploy` | live on the VPS, not in git (cpanel-deploy skill) |

## Why urrwah.com/api was a 404 and dev was a 503 (found 2026-10-25, read-only)

- **Apex 404.** The apex docroot is `~/public_html` (not `public_html/urrwah.com`). It held the static SPA but no `.htaccess`
  (only a stale `.htaccess.bak` from May 6), so the Passenger block that binds the Node.js Selector app
  (`repos/urrwah-prod/musharaka/server`, domain `urrwah.com`, status "started") was gone and Apache only served static files:
  `/` = 200, `/api/*` and every SPA deep link = 404. The deploy rsync `--delete` wipes `.htaccess` from the docroot, which is the likely
  way it was lost. `deploy-dev.yml` tried to compensate but wrote a proxy rule into `~/public_html/urrwah.com`, a stray empty folder
  that is not the docroot (and a `[P]` rule to :3001 would bypass Passenger anyway). That step is removed.
- **App crash.** The last Passenger log (`~/logs/urrwah-api.log`, May 6) is `Cannot find module 'dotenv'`: dependencies were never
  installed in the selector's `nodevenv`, so the app would not boot even with the `.htaccess` restored.
- **Dev 503.** `public_html/dev.urrwah.com/.htaccess` proxies everything to `127.0.0.1:3002`; nothing listens there (and nothing on
  :3001), so mod_proxy answers 503. Dev is a bare `node` process started by `deploy.sh dev`, not a selector app, and nothing restarts
  it (last log write Sep 8).

## Production cutover (NOT DONE — every step needs the owner's OK)

Order follows contract section 6. `S1` = infra session, `S3` = this repo. Take a backup before each step, keep a rollback.

1. **DNS + subdomain (S1).** A record `musharakah.urrwah.com` → `69.72.244.176` (TTL 300). cPanel subdomain with docroot
   `~/musharakah_site`. Confirm AutoSSL covers it (the Let's Encrypt cert lists `*.urrwah.com`, expires 2026-12-01).
2. **Back up (S1/S3).** Copy `~/public_html/{index.html,assets,.htaccess.bak}` and the current selector app registration
   (`cloudlinux-selector get --json --interpreter nodejs --user d17546`) to `~/backups/musharakah-<date>/`.
3. **Re-point the Node.js Selector app.** In cPanel → *Setup Node.js App* (or `cloudlinux-selector`) change the existing
   `repos/urrwah-prod/musharaka/server` app's domain from `urrwah.com` to `musharakah.urrwah.com`, URI empty, Node 22,
   mode production, startup `src/index.js`. It must **not** stay bound to the apex: Passenger would intercept the Partner Portal's site there.
4. **Dependencies.** Run "Run NPM Install" in the selector UI (or `npm ci --omit=dev` inside the nodevenv) — fixes `Cannot find module 'dotenv'`.
5. **Environment.** Add/confirm in the app's `.env` (do not print values): `CLIENT_ORIGIN=https://musharakah.urrwah.com`,
   optional `APP_URL`, `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, SMTP_*, `TELEGRAM_*`.
6. **Schema + client.** **BLOCKER (S1):** the VPS `~/deploy.sh` prod branch has `DOCROOT=$HOME/public_html` and runs `rsync --delete` into it, which would delete the docroots of dev, demo, alashyae and the oratech sites. Set the prod `DOCROOT` to `~/musharakah_site` and verify before any run (see CUTOVER-FAST-PATH.md finding 8). `bash ~/deploy.sh prod` (pull `master`, apply `src/schema/*.sql`, build client with `VITE_API_URL` unset, restart).
   **Check `~/deploy.sh` first**: it must read the keys in `.deploy-config.json` (`domain`, `docroot.prod`), must not `rsync --delete`
   over the docroot's `.htaccess` (Passenger block), and may leave the docroot empty — Express serves `client/dist` itself.
7. **Verify (before touching the apex).**
   ```bash
   curl -si https://musharakah.urrwah.com/api/health          # 200 {"status":"ok"}
   curl -s  https://musharakah.urrwah.com/api/version         # sha = deployed commit
   curl -s -o /dev/null -w '%{http_code}\n' https://musharakah.urrwah.com/login      # 200
   curl -s -o /dev/null -w '%{http_code}\n' https://musharakah.urrwah.com/dashboard  # 200 (SPA fallback)
   curl -si -X OPTIONS https://musharakah.urrwah.com/api/auth/login \
     -H 'Origin: https://musharakah.urrwah.com' -H 'Access-Control-Request-Method: POST' | grep -i access-control-allow-origin
   # log in once in a browser; the refresh_token Set-Cookie must have no Domain= (also pinned by api.auth.cookies.test.js)
   ```
8. **Telegram webhook — before the apex swap.** Re-register the bot webhook to `https://musharakah.urrwah.com/api/bot/telegram` (and Twilio `/api/bot/whatsapp` if enabled) with the secret from `TELEGRAM_WEBHOOK_SECRET`. Telegram and Twilio do not follow redirects, so the bot is down from step 3 until this is done.
9. **Apex swap (S1, same change as S2's Partner public build).** Add the rules from `docs/legacy-redirects.htaccess` to
   `~/public_html/.htaccess` above the Partner rules. Verify `curl -sI https://urrwah.com/dashboard` → `301` →
   `https://musharakah.urrwah.com/dashboard`, and `/api/health` → `308` to the same path on the new host, with no loops.
   `/api` and `/assets` use 308 so POSTs survive; check with the Partner build that `/assets/*` on the apex is not its own bundle path (else drop that branch). Consider `R=302` for a first trial, then 301/308 after verification.
10. **Search Console / sitemaps**: add the new host; old password-reset e-mails keep working through the `/reset-password` 301.

**Rollback:** remove the redirect block from the apex `.htaccess`, restore the backed-up docroot files and, if needed, point the
selector app back at `urrwah.com`. The DNS record and subdomain can stay (harmless).

## Dev (`dev.urrwah.com`)

Owner decision (2026-10-25): `dev.urrwah.com` stays the Musharakah dev host; no `dev.musharakah.urrwah.com`. It already has a valid
`*.urrwah.com` certificate, so D5 (working HTTPS on every `*.urrwah.com` host) only needs the app repaired: dev answers 503 until something
listens on :3002. Repair is its own step with the owner's OK, independent of the apex swap: register `urrwah-dev-api` as a Node.js Selector app
on `dev.urrwah.com` (recommended: no pidfile/`pkill`, survives restarts). `CLIENT_ORIGIN=https://dev.urrwah.com` there.

## Pre-flight checks (before any deploy)

1. `git status` clean, pushed.
2. New SQL goes in `musharaka/server/src/schema/` and uses `IF NOT EXISTS` / `OR REPLACE`.
3. `cd musharaka/server && npm test` — see the known-failing baseline in the PR (39 failing legacy-Supabase-mock tests).
4. `cd musharaka/client && npm run build` exits 0.
5. No secrets in the diff.

## Common failure modes

| Symptom | Likely cause | Recovery |
|---|---|---|
| Apache 404 on `/api/*` and deep links | Passenger block missing from the docroot `.htaccess` | re-save the app in *Setup Node.js App*; make sure deploys do not wipe `.htaccess` |
| Apache 503 | proxy target not listening (dev) | start/register the app (see Dev) |
| 500 "Application failed to start" / `Cannot find module` | deps not installed | *Run NPM Install* in the selector |
| App exits at boot with `CLIENT_ORIGIN must be set` | env missing in production | set `CLIENT_ORIGIN` in the app `.env`, restart |
| CORS errors in the browser | Origin not in `CLIENT_ORIGIN` | add it (comma list, no trailing slash), restart |
| Old bundle in browser | cache | Ctrl+F5 (`index.html` is served `no-store`) |

## Logs

Passenger/app log: `~/logs/urrwah-api.log` (selector `passenger_log_file`). Deploy logs: `~/logs/deploy-<env>-YYYY-MM-DD.log`.
