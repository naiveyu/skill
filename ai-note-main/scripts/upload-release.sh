#!/bin/bash
# Upload release files to Qiniu Cloud (七牛云)
# Prerequisites: qshell installed and configured
#   brew install qiniu/cli/qshell
#   qshell account $QINIU_ACCESS_KEY $QINIU_SECRET_KEY your-name
#
# Usage: ./scripts/upload-release.sh

set -e

DIST_DIR="apps/desktop/dist"
BUCKET="${QINIU_BUCKET:-spring-ai}"

echo "=== Uploading release files to Qiniu (bucket: $BUCKET) ==="

uploaded=0
for file in "$DIST_DIR"/*.yml "$DIST_DIR"/*.yaml "$DIST_DIR"/*.zip "$DIST_DIR"/*.dmg "$DIST_DIR"/*.exe "$DIST_DIR"/*.blockmap "$DIST_DIR"/*.AppImage "$DIST_DIR"/*.deb; do
  [ -f "$file" ] || continue
  filename=$(basename "$file")
  size=$(du -h "$file" | cut -f1)
  echo "Uploading: $filename ($size)"
  qshell fput "$BUCKET" "$filename" "$file" --overwrite
  uploaded=$((uploaded + 1))
done

if [ $uploaded -eq 0 ]; then
  echo "ERROR: No release files found in $DIST_DIR"
  echo "Run 'pnpm dist:mac' or 'pnpm dist:win' first."
  exit 1
fi

echo "=== Done! Uploaded $uploaded files ==="
echo "Update URL: http://releases.sspprriinngg.cn"
