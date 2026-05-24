#!/bin/bash
set -e

# Usage: ./deploy.sh <your-domain.com>
DOMAIN=$1

echo "→ Installing Docker..."
apt-get update && apt-get install -y docker.io docker-compose-v2

echo "→ Cloning repo..."
git clone https://github.com/nama31/Invitation.git /opt/eventinvite
cd /opt/eventinvite

echo "→ Setting up environment..."
cp .env.example .env
sed -i "s/DOMAIN=.*/DOMAIN=$DOMAIN/" .env
echo "⚠️  Edit /opt/eventinvite/.env now and fill in secrets, then press ENTER to continue"
read

echo "→ Building and starting containers..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "→ Running migrations..."
docker compose exec backend alembic upgrade head

echo "✅ Done! Your site is live at https://$DOMAIN"
