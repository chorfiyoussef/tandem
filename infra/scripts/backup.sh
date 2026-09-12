#!/usr/bin/env bash
# Nightly backup of the database and uploaded files. Keeps 14 days.
#   crontab: 30 3 * * * /opt/tandem/infra/scripts/backup.sh >> /var/log/tandem-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
DEST="${BACKUP_DIR:-/opt/tandem-backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"

docker compose exec -T db pg_dump -U postgres -d postgres -Fc > "$DEST/db-$STAMP.dump"
tar -czf "$DEST/storage-$STAMP.tar.gz" -C volumes storage

find "$DEST" -type f -mtime +14 -delete
echo "✓ Backup written to $DEST (db-$STAMP.dump, storage-$STAMP.tar.gz)"
