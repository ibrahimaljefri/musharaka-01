#!/usr/bin/env bash
# run-full-suite.sh — run everything against production and generate the Word report.
# Designed for the 192.168.100.79 GPU server.
#
# Usage:
#   bash scripts/run-full-suite.sh        # full suite
#   bash scripts/run-full-suite.sh api    # API regression only
#   bash scripts/run-full-suite.sh e2e    # browser E2E only

set -u

TARGET="${1:-all}"
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "[INFO] No .env present; copying from .env.example"
  cp .env.example .env
fi

echo "=== Musharaka full test suite ==="
echo "  Target:   $TARGET"
echo "  BASE_URL: ${BASE_URL:-<from .env>}"
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
  echo "[OK] Word report generated in playwright-report/"
else
  echo "[WARN] Report generation failed (check playwright-report/results.json exists)"
fi

echo ""
echo "[DONE] Exit code: $RC"
echo "  HTML:  playwright-report/index.html"
echo "  JSON:  playwright-report/results.json"
echo "  DOCX:  playwright-report/Test_Results_*.docx"

exit $RC
