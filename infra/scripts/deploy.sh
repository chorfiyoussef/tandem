#!/usr/bin/env bash
# Deploy from your machine to the Hetzner VM.
#   ./infra/scripts/deploy.sh root@1.2.3.4            # full deploy (build + migrate)
#   ./infra/scripts/deploy.sh root@1.2.3.4 --no-build # restart with existing images
#
# Prereqs on the server: bootstrap-server.sh ran, and infra/.env exists there
# (create it once with `node scripts/generate-env.mjs`, then scp it up; it is
# never synced from your machine).
set -euo pipefail

TARGET="${1:?usage: deploy.sh user@host [--no-build]}"
BUILD=1
[ "${2:-}" = "--no-build" ] && BUILD=0
REMOTE_DIR=/opt/tandem
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "→ Syncing source to $TARGET:$REMOTE_DIR"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude dist --exclude .git \
  --exclude 'infra/volumes/db/data' --exclude 'infra/volumes/storage' \
  --exclude 'infra/.env' --exclude '.env' --exclude '.env.local' --exclude 'supabase/.temp' \
  "$ROOT/" "$TARGET:$REMOTE_DIR/"

echo "→ Starting services"
ssh "$TARGET" bash -s <<REMOTE
set -euo pipefail
cd $REMOTE_DIR/infra
if [ ! -f .env ]; then
  echo "infra/.env is missing on the server. Run: node scripts/generate-env.mjs --app <domain> --supabase <domain> --email <email>" >&2
  exit 1
fi
if [ "$BUILD" = "1" ]; then
  docker compose up -d --build --remove-orphans
else
  docker compose up -d --remove-orphans
fi
./scripts/migrate.sh
docker compose ps
REMOTE

echo "✓ Deployed. Open https://\$(grep ^APP_DOMAIN= "$ROOT/infra/.env" 2>/dev/null | cut -d= -f2 || echo '<APP_DOMAIN>')"
