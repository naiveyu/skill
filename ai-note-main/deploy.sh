#!/bin/bash
set -e

# INote Deploy Script
# Usage: ./deploy.sh [user@host]
# Example: ./deploy.sh root@sspprriinngg.cn

SERVER=${1:-root@sspprriinngg.cn}
REMOTE_DIR=/opt/inote

echo "==> Deploying to $SERVER"

# 1. Build website (static)
echo "==> Building website..."
pnpm build:website

# 2. Build server
echo "==> Building server..."
pnpm build:server

# 3. Upload website static files
echo "==> Uploading website..."
rsync -avz --delete apps/website/out/ "$SERVER:$REMOTE_DIR/website/"

# 4. Upload server (exclude data to preserve DB + releases)
echo "==> Uploading server..."
rsync -avz --delete apps/server/dist/ "$SERVER:$REMOTE_DIR/server/dist/"
rsync -avz apps/server/package.json "$SERVER:$REMOTE_DIR/server/"
rsync -avz apps/server/public/ "$SERVER:$REMOTE_DIR/server/public/"

# 5. Install deps + restart on remote
echo "==> Installing deps & restarting server..."
ssh "$SERVER" "cd $REMOTE_DIR/server && npm install --omit=dev && (pm2 restart inote-server 2>/dev/null || pm2 start dist/index.js --name inote-server)"

echo ""
echo "==> Deploy complete!"
echo "    Website: https://sspprriinngg.cn"
echo "    Admin:   https://sspprriinngg.cn/admin?key=YOUR_KEY"
echo "    Health:  https://sspprriinngg.cn/api/health"
