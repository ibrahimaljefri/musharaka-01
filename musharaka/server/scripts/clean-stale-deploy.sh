#!/bin/bash
# Run this ONCE on cPanel after a major server-code refactor.
#
# Why: the existing deploy script uses `cp -r` which only OVERWRITES files,
# never DELETES them. So when we remove a file from the repo (e.g. drop a
# legacy route during a migration), the old file lingers on the server and
# can crash the app on startup.
#
# This script wipes the deployed server folder and re-copies from the repo
# to guarantee a clean state matching what's in the latest commit.

set -e

REPO=~/repositories/musharaka-01/musharaka/server
DEST=~/public_html/musharaka/server/server

echo "==> Pulling latest master into $REPO"
cd ~/repositories/musharaka-01
git fetch origin master
git reset --hard origin/master

echo "==> Backing up current deployment to $DEST.bak"
rm -rf "$DEST.bak"
cp -r "$DEST" "$DEST.bak"

echo "==> Wiping deployed src/ (keeps node_modules, .env, tmp/)"
rm -rf "$DEST/src"

echo "==> Copying fresh src/ from repo"
cp -r "$REPO/src" "$DEST/src"

echo "==> Copying schema, scripts, package.json"
cp -r "$REPO/scripts" "$DEST/scripts" 2>/dev/null || true
cp "$REPO/package.json" "$DEST/package.json"
[ -f "$REPO/package-lock.json" ] && cp "$REPO/package-lock.json" "$DEST/package-lock.json"

echo "==> Installing any new deps"
cd "$DEST"
npm install --legacy-peer-deps --no-audit --no-fund

echo "==> Triggering Passenger restart"
mkdir -p tmp && touch tmp/restart.txt

echo ""
echo "✓ Clean deploy complete."
echo "  Old deployment backed up at: $DEST.bak"
echo "  Now click STOP → START in cPanel Node.js App, OR run:"
echo "  curl -s -o /dev/null -w 'HTTP %{http_code}\\n' https://apps.stepup2you.com/api/health"
