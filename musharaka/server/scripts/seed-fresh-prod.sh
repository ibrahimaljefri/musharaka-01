#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# seed-fresh-prod.sh — interactive fresh-DB seed for urrwah.com / dev.urrwah.com
#
# Inserts ONE super-admin + admin@admin.com with NEW bcrypt-hashed passwords
# (distinct from anything used on stepup2you). Both get super_admin role.
#
# Usage:
#   bash scripts/seed-fresh-prod.sh prod      # seeds urrwah_prod (cluster on 5432)
#   bash scripts/seed-fresh-prod.sh dev       # seeds urrwah_dev  (cluster on 5433)
#
# Reads:
#   ~/.env.deploy → DB_PROD_PASS, DB_DEV_PASS
#   .deploy-config.json (project root) → DB host/port/name/user
#
# Refuses to run if the target DB has any users (idempotency safeguard).
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV="${1:-}"
if [[ "$ENV" != "prod" && "$ENV" != "dev" ]]; then
  echo "Usage: bash scripts/seed-fresh-prod.sh {prod|dev}" >&2
  exit 64
fi

# Locate config + secrets
REPO_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
CONFIG="$REPO_DIR/.deploy-config.json"
[[ -f "$CONFIG" ]] || { echo "Missing $CONFIG"; exit 1; }

ENV_DEPLOY="$HOME/.env.deploy"
[[ -f "$ENV_DEPLOY" ]] || { echo "Missing $ENV_DEPLOY (DB passwords)"; exit 1; }
# shellcheck source=/dev/null
set -a; source "$ENV_DEPLOY"; set +a

# Pull DB params from .deploy-config.json
DB_HOST="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CONFIG','utf8')).db['$ENV'].host)")"
DB_PORT="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CONFIG','utf8')).db['$ENV'].port)")"
DB_NAME="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CONFIG','utf8')).db['$ENV'].name)")"
DB_USER="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CONFIG','utf8')).db['$ENV'].user)")"

case "$ENV" in
  prod) DB_PASS="${DB_PROD_PASS:-}" ;;
  dev)  DB_PASS="${DB_DEV_PASS:-}"  ;;
esac
[[ -n "$DB_PASS" ]] || { echo "DB password not set in ~/.env.deploy for $ENV"; exit 1; }

echo "Target: $ENV ($DB_NAME @ $DB_HOST:$DB_PORT, user=$DB_USER)"
export PGPASSWORD="$DB_PASS"

# Refuse if non-empty
USER_COUNT="$(psql -tAq -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT count(*) FROM app_users")"
if [[ "$USER_COUNT" -ne 0 ]]; then
  echo "REFUSING: $DB_NAME already has $USER_COUNT users. This script is for FRESH DBs only."
  exit 1
fi

# Prompt for two passwords (silent, double-entry)
read_pw() {
  local label="$1" var="$2"
  while true; do
    read -srp "Password for $label: "  pw1; echo
    read -srp "Confirm $label password: " pw2; echo
    if [[ "$pw1" != "$pw2" ]]; then
      echo "  passwords don't match, try again"; continue
    fi
    if [[ ${#pw1} -lt 12 ]]; then
      echo "  password must be at least 12 chars"; continue
    fi
    eval "$var='$pw1'"
    break
  done
}
read_pw "superadmin@urrwah.com"    SUPER_PW
read_pw "admin@admin.com"          ADMIN_PW

# Generate bcrypt hashes via Node + bcrypt (already a server dep)
SUPER_HASH="$(cd "$REPO_DIR/musharaka/server" && BCRYPT_PW="$SUPER_PW" node -e "const b=require('bcrypt');b.hash(process.env.BCRYPT_PW,12).then(h=>process.stdout.write(h))")"
ADMIN_HASH="$(cd "$REPO_DIR/musharaka/server" && BCRYPT_PW="$ADMIN_PW" node -e "const b=require('bcrypt');b.hash(process.env.BCRYPT_PW,12).then(h=>process.stdout.write(h))")"

# Apply seed SQL with variable substitution
psql -v ON_ERROR_STOP=1 \
     -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
     -v SUPERADMIN_EMAIL='superadmin@urrwah.com' \
     -v SUPERADMIN_HASH="$SUPER_HASH" \
     -v ADMIN_EMAIL='admin@admin.com' \
     -v ADMIN_HASH="$ADMIN_HASH" \
     -f "$REPO_DIR/musharaka/server/scripts/seed-fresh-prod.sql"

unset PGPASSWORD SUPER_PW ADMIN_PW SUPER_HASH ADMIN_HASH

echo ""
echo "✓ Seed complete on $ENV ($DB_NAME)."
echo "  Login at https://${ENV/prod/urrwah.com}${ENV/dev/dev.urrwah.com}/login"
echo "  Users: superadmin@urrwah.com, admin@admin.com"
echo ""
echo "Tables that should still be empty:"
psql -tAq -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 'tenants',     count(*) FROM tenants     UNION ALL
SELECT 'branches',    count(*) FROM branches    UNION ALL
SELECT 'sales',       count(*) FROM sales       UNION ALL
SELECT 'submissions', count(*) FROM submissions
"
