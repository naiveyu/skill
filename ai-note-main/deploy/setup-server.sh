#!/bin/bash
set -e

# INote Server Setup Script (CentOS/RHEL)
# Run as root on your Tencent Cloud server
# Usage: bash setup-server.sh

echo "==> Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

echo "==> Installing PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root
pm2 save

echo "==> Installing Nginx..."
yum install -y nginx
systemctl enable nginx
systemctl start nginx

echo "==> Creating app directories..."
mkdir -p /opt/inote/website
mkdir -p /opt/inote/server/data
mkdir -p /opt/inote/server/logs

echo "==> Setting up Nginx config..."
# Remove default config if exists
rm -f /etc/nginx/conf.d/default.conf

# Copy INote nginx config
cp /opt/inote/deploy/nginx.conf /etc/nginx/conf.d/inote.conf

echo "==> Installing SSL certificate (Let's Encrypt)..."
yum install -y certbot python3-certbot-nginx

# Get certificate (will modify nginx config automatically)
certbot --nginx -d sspprriinngg.cn --non-interactive --agree-tos --email admin@sspprriinngg.cn || {
    echo "WARNING: certbot failed. You may need to run it manually:"
    echo "  certbot --nginx -d sspprriinngg.cn"
}

# Test and reload nginx
nginx -t && systemctl reload nginx

echo ""
echo "==> Server setup complete!"
echo "    Next steps:"
echo "    1. Upload deploy/nginx.conf to /opt/inote/deploy/"
echo "    2. Run ./deploy.sh from your local machine"
echo "    3. Visit https://sspprriinngg.cn"
