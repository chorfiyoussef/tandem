#!/usr/bin/env bash
# Restore a database dump made by backup.sh. Stops the app while restoring.
#   ./scripts/restore.sh /opt/tandem-backups/db-20260912-033000.dump
set -euo pipefail

DUMP="${1:?usage: restore.sh <db-dump-file>}"
cd "$(dirname "$0")/.."

docker compose stop web api
docker compose exec -T db pg_restore -U postgres -d postgres --clean --if-exists --no-owner < "$DUMP"
docker compose start web api
echo "✓ Restored $DUMP"
