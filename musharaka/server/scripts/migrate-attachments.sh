#!/usr/bin/env bash
# migrate-attachments.sh
# Downloads ticket attachments from Supabase Storage and uploads to cPanel disk.
#
# Requirements:
#   - supabase CLI installed and logged in
#   - SSH access to cPanel server
#   - jq installed
#
# Usage:
#   SUPABASE_PROJECT_REF=dadacgwzzgvlhfonvymk \
#   CPANEL_SSH="stepupyo@apps.stepup2you.com" \
#   CPANEL_UPLOAD_DIR="~/musharaka-uploads" \
#   bash scripts/migrate-attachments.sh

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-dadacgwzzgvlhfonvymk}"
BUCKET="ticket-attachments"
TMP_DIR="/tmp/musharaka-attachments"
CPANEL_SSH="${CPANEL_SSH:-stepupyo@apps.stepup2you.com}"
CPANEL_DIR="${CPANEL_UPLOAD_DIR:-~/musharaka-uploads}"

echo "=== Musharaka: Ticket Attachment Migration ==="
echo "  Bucket:     $BUCKET"
echo "  Tmp dir:    $TMP_DIR"
echo "  cPanel SSH: $CPANEL_SSH:$CPANEL_DIR"
echo ""

# Create tmp directory
mkdir -p "$TMP_DIR"

# List all files in the bucket
echo "[1/3] Listing files in Supabase Storage bucket..."
supabase storage ls "ss:///$BUCKET" --project-ref "$PROJECT_REF" --recursive \
  | grep -v '^$' > "$TMP_DIR/file_list.txt"

FILE_COUNT=$(wc -l < "$TMP_DIR/file_list.txt")
echo "  Found $FILE_COUNT files"

if [ "$FILE_COUNT" -eq 0 ]; then
  echo "  No files to migrate. Exiting."
  exit 0
fi

# Download each file
echo ""
echo "[2/3] Downloading files from Supabase Storage..."
DOWNLOADED=0
FAILED=0

while IFS= read -r filepath; do
  [ -z "$filepath" ] && continue
  dir=$(dirname "$TMP_DIR/$filepath")
  mkdir -p "$dir"
  if supabase storage cp "ss:///$BUCKET/$filepath" "$TMP_DIR/$filepath" \
      --project-ref "$PROJECT_REF" 2>/dev/null; then
    DOWNLOADED=$((DOWNLOADED + 1))
    echo "  [$DOWNLOADED/$FILE_COUNT] $filepath"
  else
    echo "  [WARN] Failed to download: $filepath"
    FAILED=$((FAILED + 1))
  fi
done < "$TMP_DIR/file_list.txt"

echo ""
echo "  Downloaded: $DOWNLOADED / $FILE_COUNT"
[ "$FAILED" -gt 0 ] && echo "  Failed: $FAILED"

# Upload to cPanel via SCP
echo ""
echo "[3/3] Uploading to cPanel server..."
ssh "$CPANEL_SSH" "mkdir -p $CPANEL_DIR"
rsync -avz --progress "$TMP_DIR/" "$CPANEL_SSH:$CPANEL_DIR/"

echo ""
echo "=== Attachment migration complete ==="
echo "Files available at $CPANEL_SSH:$CPANEL_DIR"
echo ""
echo "Next: run the SQL below to update attachment_url paths in support_tickets:"
echo ""
echo "  UPDATE support_tickets"
echo "  SET attachment_url = REPLACE(attachment_url,"
echo "    'https://$PROJECT_REF.supabase.co/storage/v1/object/public/$BUCKET/',"
echo "    '/api/tickets/' || id || '/attachment')"
echo "  WHERE attachment_url LIKE '%supabase.co%';"
