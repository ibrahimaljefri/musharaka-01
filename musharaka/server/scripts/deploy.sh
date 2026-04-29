#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# Urwa / Musharaka — One-shot deployment script for cPanel
#
# What it does (in order):
#   1. Pulls latest master from GitHub into ~/repositories/musharaka-01
#   2. Rsyncs server code with --delete (no stale files)
#   3. Copies frontend dist
#   4. Installs any new node deps
#   5. Applies any new SQL schema migrations idempotently
#   6. Kills the old node process cleanly
#   7. Starts a fresh node process on PORT=3001 (the port .htaccess expects)
#   8. Verifies the wake response
#
# Usage:
#   bash ~/deploy.sh          # full deploy
#   bash ~/deploy.sh --skip-migrate   # skip schema migrations (faster redeploy)
#
# Save this file to ~/deploy.sh on cPanel (chmod +x ~/deploy.sh).
# ──────────────────────────────────────────────────────────────────────────────

set -e   # exit on first error
set -u   # error on undefined vars

# ────────── Config ───────────────────────────────────────────────────────────
REPO=~/repositories/musharaka-01
SRV_SRC=$REPO/musharaka/server
SRV_DST=~/public_html/musharaka/server/server
CLI_SRC=$REPO/musharaka/client/dist
CLI_DST=~/public_html/musharaka/server/client/dist
NODE_VERSION=22
NODE_ENV_PATH=~/nodevenv/public_html/musharaka/server/server/$NODE_VERSION
APP_PORT=3001
HEALTH_URL=https://apps.stepup2you.com/
LOG_FILE=~/musharaka.log
PID_FILE=~/musharaka.pid

SKIP_MIGRATE=false
[ "${1:-}" = "--skip-migrate" ] && SKIP_MIGRATE=true

# ────────── Helpers ──────────────────────────────────────────────────────────
log()   { echo -e "\033[1;36m[deploy]\033[0m $*"; }
ok()    { echo -e "\033[1;32m[ok]\033[0m $*"; }
warn()  { echo -e "\033[1;33m[warn]\033[0m $*"; }
fatal() { echo -e "\033[1;31m[fatal]\033[0m $*" >&2; exit 1; }

# ────────── 1. Pull latest code ──────────────────────────────────────────────
log "Pulling latest master into $REPO"
cd "$REPO"
git fetch origin master
git reset --hard origin/master
COMMIT=$(git log -1 --format='%h %s')
ok "Now at: $COMMIT"

# ────────── 2. Sync server code (with --delete to remove stale files) ────────
log "Syncing server code → $SRV_DST  (preserves node_modules, .env, tmp/, .htaccess)"
mkdir -p "$SRV_DST"
# CRITICAL: must exclude .htaccess — it contains the Apache → port 3001 proxy
# rule that's NOT in the repo and gets re-installed manually if missing.
# Also keep node_modules / .env / tmp / logs / pid files intact.
rsync -a --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='tmp/' \
  --exclude='*.log' \
  --exclude='*.pid' \
  --exclude='.htaccess' \
  "$SRV_SRC/" "$SRV_DST/"

# Safety net: if .htaccess is somehow missing (first deploy / accidental delete),
# recreate it so Apache can route to node.
if [ ! -f "$SRV_DST/.htaccess" ]; then
  warn ".htaccess missing — restoring Apache → node proxy rule"
  cat > "$SRV_DST/.htaccess" << 'EOF'
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3001/$1 [P,L]
EOF
  ok ".htaccess created"
fi
ok "Server code synced"

# ────────── 3. Build + sync frontend dist ────────────────────────────────────
# dist/ is gitignored, so we must rebuild it on the server after every pull.
# Otherwise the rsync below would either copy a stale dist or skip entirely.
CLI_DIR=$REPO/musharaka/client
log "Building frontend in $CLI_DIR"
cd "$CLI_DIR"
set +u
source "$NODE_ENV_PATH/bin/activate"
set -u
npm install --no-audit --no-fund --legacy-peer-deps 2>&1 | tail -5
npm run build 2>&1 | tail -5
ok "Frontend built"

if [ -d "$CLI_SRC" ]; then
  log "Syncing frontend dist → $CLI_DST"
  mkdir -p "$CLI_DST"
  rsync -a --delete "$CLI_SRC/" "$CLI_DST/"
  ok "Frontend dist synced"
else
  fatal "Build did not produce $CLI_SRC — aborting"
fi

# ────────── 4. Install any new deps ──────────────────────────────────────────
log "Activating node $NODE_VERSION + installing deps"
cd "$SRV_DST"
# cPanel's activate script references CL_VIRTUAL_ENV which is unset, so
# `set -u` (strict-mode) trips on it and aborts the deploy before we ever
# get to kill/restart node. Disable nounset around the source, then turn
# it back on. The empty-string default for CL_VIRTUAL_ENV is also fine
# but disabling -u is more robust to future activate-script changes.
set +u
# shellcheck source=/dev/null
source "$NODE_ENV_PATH/bin/activate"
set -u
npm install --no-audit --no-fund --legacy-peer-deps 2>&1 | tail -5
ok "Deps installed"

# ────────── 5. Apply schema migrations (idempotent) ──────────────────────────
if [ "$SKIP_MIGRATE" = false ]; then
  log "Extracting DATABASE_URL from .env"
  if [ ! -f .env ]; then
    fatal ".env not found at $SRV_DST — cannot run migrations"
  fi
  export DATABASE_URL=$(grep -E "^DATABASE_URL=" .env | head -1 | cut -d= -f2- | sed 's/^["'\'']//' | sed 's/["'\'']$//')
  if [ -z "$DATABASE_URL" ]; then
    fatal "DATABASE_URL is empty in .env"
  fi

  log "Applying any schema/*.sql migrations (idempotent — uses CREATE TABLE IF NOT EXISTS)"
  if [ -d src/schema ]; then
    for f in src/schema/*.sql; do
      [ -e "$f" ] || continue
      log "  → $(basename $f)"
      # Filter out expected re-run noise (already-exists is fine — schema is idempotent)
      psql "$DATABASE_URL" -q -f "$f" 2>&1 \
        | grep -vE "NOTICE|^$|already exists|trigger .* for relation .* already exists" \
        | head -10 || true
    done
    ok "Schema migrations applied"
  fi

  log "Running scripts/backfill-*.sql (idempotent — uses ON CONFLICT DO NOTHING)"
  if [ -d scripts ]; then
    for f in scripts/backfill-*.sql; do
      [ -e "$f" ] || continue
      log "  → $(basename $f)"
      psql "$DATABASE_URL" -q -f "$f" 2>&1 | grep -vE "NOTICE|^$" | head -10 || true
    done
    ok "Backfills applied"
  fi
else
  warn "Skipping migrations (--skip-migrate flag)"
fi

# ────────── 6. Kill old node process ─────────────────────────────────────────
log "Stopping old node process"
pkill -9 -u "$USER" -f "node.*src/index.js" 2>/dev/null || true
sleep 2
if ps -u "$USER" -o pid,cmd | grep -E "node.*src/index" | grep -v grep > /dev/null; then
  warn "Some node process still running — killing more aggressively"
  pkill -9 -u "$USER" -f "node" 2>/dev/null || true
  sleep 2
fi
ok "Old process stopped"

# ────────── 7. Start fresh node on PORT=3001 ─────────────────────────────────
log "Starting fresh node process on port $APP_PORT"
> "$LOG_FILE"
cd "$SRV_DST"
# Use setsid to fully detach so script exit doesn't kill the child
PORT=$APP_PORT setsid nohup node src/index.js > "$LOG_FILE" 2>&1 < /dev/null &
NEW_PID=$!
disown 2>/dev/null || true
echo $NEW_PID > "$PID_FILE"
log "  PID: $NEW_PID"

# Wait up to 15 seconds for startup confirmation in the log
log "Waiting for startup..."
STARTED=false
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  sleep 1
  if grep -qiE "running on port|listening on" "$LOG_FILE" 2>/dev/null; then
    STARTED=true
    break
  fi
  # Also bail early if we see a fatal error
  if grep -qiE "Error:|throw new" "$LOG_FILE" 2>/dev/null; then
    warn "Startup error detected after ${i}s — log:"
    tail -30 "$LOG_FILE"
    fatal "Node failed to start"
  fi
done

if [ "$STARTED" = true ]; then
  ok "Node started successfully (PID $NEW_PID)"
else
  warn "No 'running on port' message after 15s — process may still be starting"
  tail -10 "$LOG_FILE"
fi

# ────────── 8. Verify wake ───────────────────────────────────────────────────
log "Verifying public health endpoint"
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
# Anything 1xx-4xx means node is responding. Only 5xx (especially 503) = dead.
if [ "$HTTP_CODE" -lt 500 ] 2>/dev/null; then
  ok "wake: HTTP $HTTP_CODE — node is responding 🎉"
  ok "Site live at: https://apps.stepup2you.com"
elif [ "$HTTP_CODE" = "503" ]; then
  warn "wake: HTTP 503 — Apache can't reach node. Recent log:"
  tail -20 "$LOG_FILE"
  warn "If the log shows 'running on port', the process started but Apache may"
  warn "still be holding old connections. Wait 10s and retry."
else
  warn "wake: HTTP $HTTP_CODE — unexpected. Recent log:"
  tail -20 "$LOG_FILE"
fi

echo ""
log "Done. To tail the log:   tail -f $LOG_FILE"
log "To redeploy without migrations:   bash ~/deploy.sh --skip-migrate"
