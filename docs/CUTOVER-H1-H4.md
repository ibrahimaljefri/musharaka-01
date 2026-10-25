# H1 and H4: the two changes that block the apex swap (F3)

Nothing here has been run. Each change below needs its own OK from the owner, asked in the S3 session. All commands run from lab-server
over `ssh cpanel-partner` (account d17546). Never print `.env`, `~/.env.deploy` or any password; filters below redact them.

Backup folder used by every step (owner-only, created once, no secrets inside except what the originals already hold):

```bash
ssh cpanel-partner 'B=~/backups/musharakah-20261025; mkdir -p "$B" && chmod 700 "$B" && ls -ld "$B"'
```

## A0 — read `~/deploy.sh` (read-only, no change)

```bash
ssh cpanel-partner "sed -E 's/((PASS|SECRET|TOKEN|KEY)[A-Z_]*=).*/\1<redacted>/I' ~/deploy.sh | cat -n | sed -n '1,400p'"
```
Expected: the prod branch sets `DOCROOT="$HOME_DIR/public_html"` (S1 saw it at line 89) and the `rsync -av --delete --exclude='.htaccess'
--exclude='cgi-bin'` line (161). I re-confirm the exact lines from this output before H1 edits anything, and also record which branch it
pulls, whether it builds or copies `dist`, and what the dev branch uses as `DOCROOT`.

## H1 — prod `DOCROOT` must be `~/musharakah_site`

Why: `rsync --delete` into `~/public_html` deletes the docroots of dev, demo, alashyae and the oratech sites (and the apex after the swap).

1. **Backup** (before any edit):
   ```bash
   ssh cpanel-partner 'B=~/backups/musharakah-20261025; cp -p ~/deploy.sh "$B/deploy.sh.orig" && sha256sum ~/deploy.sh "$B/deploy.sh.orig"'
   ```
   Expected: two identical hashes.
2. **Change** (the sed below is illustrative: the exact command, built from the real lines after A0, is shown to the owner before it runs). Two edits to the prod branch only: point `DOCROOT` at the new
   docroot, and refuse to ever `rsync --delete` into a parent of other sites. `.well-known` is added to the excludes so AutoSSL files survive:
   ```bash
   ssh cpanel-partner "sed -i -E \
     -e '89s|^([[:space:]]*)DOCROOT=\"\\\$HOME_DIR/public_html\"|\1DOCROOT=\"\$HOME_DIR/musharakah_site\"|' \
     -e '161s|--exclude=.cgi-bin.|--exclude='\\''cgi-bin'\\'' --exclude='\\''.well-known'\\''|' ~/deploy.sh"
   ```
   and insert, directly above the rsync line, this guard (exact text finalised against the real file after A0, applied with `sed -i '160a …'`):
   ```bash
   case "$DOCROOT" in "$HOME_DIR"|"$HOME_DIR/"|"$HOME_DIR/public_html"|"$HOME_DIR/public_html/") echo "refusing rsync --delete into $DOCROOT" >&2; exit 1;; esac
   ```
3. **Verify** (paste this output to S1):
   ```bash
   ssh cpanel-partner 'B=~/backups/musharakah-20261025; bash -n ~/deploy.sh && echo SYNTAX_OK; grep -n "DOCROOT=" ~/deploy.sh; diff "$B/deploy.sh.orig" ~/deploy.sh'
   ```
   Expected: `SYNTAX_OK`; the prod `DOCROOT=` line shows `$HOME_DIR/musharakah_site`, no other `DOCROOT=` line changed (dev keeps its own);
   the diff shows only the `DOCROOT` line, the guard and the extra exclude. Nothing is executed; `deploy.sh` itself is not run.
4. **Rollback:** `ssh cpanel-partner 'B=~/backups/musharakah-20261025; cp -p "$B/deploy.sh.orig" ~/deploy.sh && sha256sum ~/deploy.sh "$B/deploy.sh.orig"'` (hashes equal).

## H4 — re-register the Selector app under `musharakah.urrwah.com`

Why: the app is registered for `urrwah.com`, and the Selector writes its Passenger block into that domain's docroot `.htaccess`
(`~/public_html/.htaccess`, which S1/S2 will own after the swap). `cloudlinux-selector set --new-domain` moves the registration (syntax read from
`cloudlinux-selector set --help` on the account); no new app is created and the files are untouched.

1. **Backup:**
   ```bash
   ssh cpanel-partner 'B=~/backups/musharakah-20261025; cloudlinux-selector get --json --interpreter nodejs --user d17546 > "$B/selector-before.json"; ls -la ~/public_html/.htaccess ~/musharakah_site/.htaccess 2>&1 > "$B/htaccess-before.txt"; cp -p ~/musharakah_site/.htaccess "$B/musharakah_site.htaccess.orig"; ls -l "$B"'
   ```
   Expected: `selector-before.json` non-empty and shows the app `repos/urrwah-prod/musharaka/server` with `"domain": "urrwah.com"`.
2. **Change:**
   ```bash
   ssh cpanel-partner 'cloudlinux-selector set --json --interpreter nodejs --user d17546 --app-root repos/urrwah-prod/musharaka/server --new-domain musharakah.urrwah.com --skip-web-check'
   ```
   (`--skip-web-check`: the app cannot boot yet, no dependencies and no `CLIENT_ORIGIN`, so the post-change web probe would fail. URI, Node 22, mode and
   startup file are left as registered.) The app is not restarted and no dependencies are installed in this step.
3. **Verify** (paste to S1):
   ```bash
   ssh cpanel-partner 'cloudlinux-selector get --json --interpreter nodejs --user d17546 | grep -o "\"domain\": \"[^\"]*\""'
   ssh cpanel-partner 'grep -c "CLOUDLINUX PASSENGER" ~/public_html/.htaccess 2>&1; grep -n "CLOUDLINUX PASSENGER\|PassengerAppRoot" ~/musharakah_site/.htaccess'
   curl -s -o /dev/null -w "apex /api/health %{http_code}\n" https://urrwah.com/api/health
   curl -s -o /dev/null -w "partner / %{http_code}\n" https://partner.urrwah.com/
   ```
   Expected: domains `musharakah.urrwah.com` (this app) and `partner.urrwah.com` (Partner API), **no** `urrwah.com`; `~/public_html/.htaccess` is absent or the
   count is `0`; `~/musharakah_site/.htaccess` now has the Selector BEGIN/END markers with `PassengerAppRoot …/urrwah-prod/musharaka/server`, and cPanel's
   php-handler block is still there; the apex `/api/health` is still `404` (the apex serves nothing from the app); partner is unchanged (`200`).
   If `~/public_html/.htaccess` or the old domain still shows up, stop and report; do not improvise.
4. **Rollback:** `cloudlinux-selector set --json --interpreter nodejs --user d17546 --app-root repos/urrwah-prod/musharaka/server --new-domain urrwah.com --skip-web-check`,
   then compare `selector-before.json`. Only do this if S1 confirms the apex block is wanted back (it re-creates the block in `~/public_html/.htaccess`).
   If the old registration lingers *in addition* to the new one, that is a separate OK: `cloudlinux-selector destroy --json --interpreter nodejs --user d17546 --domain urrwah.com --app-root <root>`
   removes the registration; confirm with the owner first that app files and `nodevenv` loss are acceptable (dependencies are reinstalled in step A5/A7 anyway).

## Order

A0 (read) → H1 (edit `deploy.sh`) → H4 (re-point) → continue with A1b, A2 … in [CUTOVER-FAST-PATH.md](CUTOVER-FAST-PATH.md). H1 and H4 are independent
of each other and of the apex swap's other pieces; H4 may run before H1 but `deploy.sh prod` must not run before H1.
