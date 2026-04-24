#!/usr/bin/env bash
# run-full-suite.sh — run the full test suite against production.
# Auto-detects Node binary (works on cPanel nodevenv or standard PATH).
#
# Usage:
#   bash scripts/run-full-suite.sh        # full suite
#   bash scripts/run-full-suite.sh api    # API regression only
#   bash scripts/run-full-suite.sh e2e    # browser E2E only

set -u

TARGET="${1:-all}"
cd "$(dirname "$0")/.."

# ── Locate node/npm/npx ─────────────────────────────────────────────────────
find_node_bin() {
  # 1. System PATH
  if command -v node >/dev/null 2>&1; then
    echo "$(command -v node | xargs dirname)"
    return
  fi
  # 2. cPanel nodevenv (any version)
  for p in "$HOME"/nodevenv/*/22/bin "$HOME"/nodevenv/*/*/22/bin "$HOME"/nodevenv/*/*/*/22/bin "$HOME"/nodevenv/*/20/bin "$HOME"/nodevenv/*/*/20/bin; do
    if [ -x "$p/node" ]; then echo "$p"; return; fi
  done
  # 3. /usr/local/node
  for p in /usr/local/node/*/bin /opt/node*/bin; do
    if [ -x "$p/node" ]; then echo "$p"; return; fi
  done
  return 1
}

NODE_BIN=$(find_node_bin || true)
if [ -n "$NODE_BIN" ]; then
  export PATH="$NODE_BIN:$PATH"
  echo "[INFO] Using Node from: $NODE_BIN"
else
  echo "[FATAL] Could not find a node/npm/npx binary. Install Node 20+ or activate nodevenv."
  exit 127
fi

if [ ! -f .env ]; then
  echo "[INFO] No tests/.env — copying from .env.example"
  cp .env.example .env
fi

echo "=== Musharaka full test suite ==="
echo "  Target:    $TARGET"
echo "  Node:      $(node --version)"
echo "  BASE_URL:  ${BASE_URL:-<from .env>}"
echo ""

# Install deps if needed
if [ ! -d node_modules ]; then
  echo "[INFO] Installing dependencies..."
  npm ci
  npx playwright install --with-deps chromium
fi

set +e
case "$TARGET" in
  api)
    npx playwright test --project=api --reporter=html,json,list
    RC=$?
    ;;
  e2e)
    npx playwright test --project=chromium --project=admin --reporter=html,json,list
    RC=$?
    ;;
  *)
    npx playwright test --reporter=html,json,list
    RC=$?
    ;;
esac
set -e

echo ""
echo "[INFO] Generating Word report..."
if node scripts/generate-report.js; then
  echo "[OK] Word report generated"
else
  echo "[WARN] Report generation failed (check playwright-report/results.json exists)"
fi

echo ""
echo "[DONE] Exit code: $RC"
echo "  HTML: playwright-report/index.html"
echo "  JSON: playwright-report/results.json"
echo "  DOCX: playwright-report/Test_Results_*.docx"

exit $RC
