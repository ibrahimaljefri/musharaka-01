# Fast path: Musharakah live at https://musharakah.urrwah.com

Shortest safe order. Nothing here has been run. Every numbered approval (A1, A2, …) is a separate OK from the owner.
Details and rollback: [DEPLOYMENT.md](DEPLOYMENT.md). Redirect block: [legacy-redirects.htaccess](legacy-redirects.htaccess).

## Findings that shape the order

1. **The committed prod bundle calls a dead API.** `musharaka/client/dist` on `master` embeds `https://apps.stepup2you.com`
   (the old hard-coded `VITE_API_URL`). So the SPA on the apex today cannot reach any API. The client **must be rebuilt after PR #3**
   (same-origin build, `VITE_API_URL` unset); an older `dist` is useless on the new host.
2. **Merging PR #3 into `dev` triggers `deploy-dev.yml`**, which SSHes into the cPanel account: seeds `admin@admin.com` on the dev DB,
   `sed`-patches the shared `~/deploy.sh`, kills/restarts processes. That is a production-account change. Merge with `[skip ci]` in the
   squash message, or get an explicit OK first.
3. **`master` and `dev` have diverged**: `dev` is 58 commits ahead (terms, dashboard, etc.), `master` has 7 bot/`dist` commits and one
   real fix (`1e1fc455`, terms print button) with no patch-equivalent on `dev`. Prod deploys from `master`, so prod only gets PR #3 after
   `dev → master`. Expect conflicts in `musharaka/client/dist/**` (take either side; `build.yml` regenerates it).
4. **`build.yml` (push to `master`) builds `dist` and commits it back.** It reads no VPS secret and is safe to let run; it is what produces
   the same-origin bundle. Do not put `[skip ci]` on the `dev → master` merge.
5. **Apex today** resolves only `/`, `/assets/*` and a few root files; deep links and `/api/*` are 404 already. The legacy block is therefore
   low-risk to install, and its main value is e-mailed `/reset-password?token=…` links and the bot's `/user-guide.html` link.
6. **Redis does not exist on this account**: leave `REDIS_URL` unset (`config/queue.js` then uses a no-op queue).
7. `deploy-dev.yml` contains a hard-coded password for the seeded `admin@admin.com` (dev DB). Rotate it and move the seed out of the
   workflow before dev is exposed again.

## Unknowns (cannot be answered from the repo)

- `~/deploy.sh` and `~/.env.deploy` on the VPS: not in git, **not read**. Needed: which `.deploy-config.json` keys it reads
  (`domain`, `docroot.*`: the relative-path convention of `docroot` is unconfirmed), whether it builds the client or copies the committed
  `dist`, whether it `rsync --delete`s the docroot (wipes the Passenger `.htaccess`: the likely reason the apex lost its block), and which
  branch it pulls. → **A0**.
- Whether the DB `d17546_urrwah_prod` / user `d17546_urrwah_prod_app` exists and holds data (docs say prod started with 2 users, no data).

## Order of work

| # | Step | Who runs it | Approval |
|---|---|---|---|
| 1 | Read `~/deploy.sh` (read-only) and the **key names** (not values) of `~/.env.deploy` and the app `.env` | S3 via `ssh cpanel-partner` | **A0** |
| 2 | DNS A record `musharakah.urrwah.com → 69.72.244.176` (TTL 300) and cPanel subdomain, docroot `~/musharakah_site` (outside `public_html`, so the apex `.htaccess` is never inherited) | owner in cPanel, or S1 via `uapi` | **A1** |
| 3 | DB: confirm it exists; if not, create `d17546_urrwah_prod` + user `d17546_urrwah_prod_app` (password generated on the VPS, never printed or committed) and grant privileges | owner in cPanel → PostgreSQL Databases, or S3 via `uapi Postgresql` | **A2** |
| 4 | Merge PR #3 → `dev` with `[skip ci]` (no cPanel contact) | owner (merge button) or S3 `gh pr merge` | **A3** |
| 5 | PR `dev → master`, resolve `dist` conflicts, merge normally; `build.yml` pushes the same-origin `dist`. Owner decides whether prod should really take all 58 dev commits | owner decides; S3 prepares the PR | **A4** |
| 6 | Re-point the Node.js Selector app (domain `urrwah.com → musharakah.urrwah.com`, URI empty, Node 22, production, root `repos/urrwah-prod/musharaka/server`, startup `src/index.js`) | owner in cPanel *Setup Node.js App* (recommended) or S3 via `cloudlinux-selector` | **A5** |
| 7 | Put env **names** in the app `.env` (below) | S3 on the VPS, values supplied by the owner; never printed | **A6** |
| 8 | `bash ~/deploy.sh prod` (pull `master`, apply `src/schema/*.sql` through `schema-apply.js`, install deps → fixes `dotenv`, restart) | S3 via `ssh cpanel-partner` | **A7** |
| 9 | First user: `bash musharaka/server/scripts/seed-fresh-prod.sh prod` (refuses if users exist) or owner restores data | S3 / owner | **A8** |
| 10 | Verify: `https://musharakah.urrwah.com/api/health` → `{"status":"ok"}`, `/api/version` sha, `/login` 200, login in a browser, `Set-Cookie: refresh_token` has no `Domain`, CORS preflight from the new origin | S3 (read-only curls) | none |
| 11 | Re-register the Telegram (and Twilio) webhook to `https://musharakah.urrwah.com/api/bot/telegram` (`/api/bot/whatsapp`) **before** the apex redirects | S3 | **A9** |
| 12 | Apex swap: S1 merges `docs/legacy-redirects.htaccess` into the apex `.htaccess` (Host guard is already per rule) in the same change as S2's Partner build, **without** `includeSubDomains` HSTS | S1 | **A10** |
| 13 | Final curl check of legacy paths: `/dashboard` → 301, `/api/health` → 308, `/login` → 301, no loops | S3 / S1 | none |

Steps 1 to 11 do not touch the apex: the old SPA keeps being served until step 12. Rollback per step: restore the backed-up docroot and
`.htaccess`, point the selector app back at `urrwah.com`; DNS and the subdomain can stay.

## Environment variables (names only; values live only on the VPS)

Server `.env` in `~/repos/urrwah-prod/musharaka/server/`:

- **Required:** `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `CLIENT_ORIGIN` (`https://musharakah.urrwah.com`; prod refuses to boot without
  it, must be https).
- **Set by the selector/deploy:** `NODE_ENV=production` (needed for `Secure` cookies; the selector's *production* mode sets it, verify),
  `PORT`, `GIT_SHA`, `DEPLOYED_AT`.
- **Optional:** `APP_URL` (defaults to the first `CLIENT_ORIGIN`), `UPLOAD_DIR`, `HSTS_INCLUDE_SUBDOMAINS` (leave unset).
- **Mail:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (without `SMTP_USER` mails are only logged).
- **Bot / integrations:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TWILIO_AUTH_TOKEN`, `ENABLE_WHATSAPP_BOT`, `CONTRACTS_API_KEY`,
  `SEINOMY_BASE_URL`, `SEINOMY_MOCK`, `SEINOMY_TIMEOUT`, `INTERNAL_KILL_KEY`.
- **Leave unset:** `REDIS_URL` (no Redis on the account), `DATABASE_SSL`, and all `SUPABASE_*`.

Client build: `VITE_API_URL` **unset** (same origin). No other client variable.

## What the owner must do in cPanel (each its own OK)

1. Create the subdomain `musharakah.urrwah.com` with document root `~/musharakah_site` (A1), unless S1 does it via `uapi`.
2. Check/create the PostgreSQL database and user (A2).
3. In *Setup Node.js App*: change the Musharakah app's domain from `urrwah.com` to `musharakah.urrwah.com`, then *Run NPM Install* (A5).
4. Hand the secret values for the `.env` to S3 out of band (A6), or enter them on the VPS himself.

## What S3 can run (each after its OK)

Read `~/deploy.sh` (A0); create DB via `uapi` (A2); `gh pr merge` with `[skip ci]` (A3); the `dev → master` PR (A4); `cloudlinux-selector` re-point
(A5, UI preferred); write `.env` (A6); `bash ~/deploy.sh prod` (A7); seed first user (A8); webhook registration (A9); read-only verification curls.
