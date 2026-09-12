#!/usr/bin/env bash
# Apply supabase/migrations/*.sql to the running Postgres container, once each.
# Tracks applied versions in supabase_migrations.schema_migrations, the same
# table the Supabase CLI uses, so `supabase db push` stays compatible.
set -euo pipefail

cd "$(dirname "$0")/.."
MIGRATIONS_DIR="../supabase/migrations"
PSQL="docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d postgres -q -A -t"

echo "→ Waiting for the database"
for _ in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U postgres -h localhost >/dev/null 2>&1; then break; fi
  sleep 2
done

$PSQL <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

applied=0
for file in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
  base="$(basename "$file" .sql)"
  version="${base%%_*}"
  name="${base#*_}"
  exists="$($PSQL -c "select 1 from supabase_migrations.schema_migrations where version = '$version'")"
  if [ "$exists" = "1" ]; then
    continue
  fi
  echo "→ Applying $base"
  docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d postgres -q --single-transaction < "$file"
  $PSQL -c "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '$name')"
  applied=$((applied + 1))
done

# PostgREST caches the schema; tell it to reload after DDL changes.
if [ "$applied" -gt 0 ]; then
  $PSQL -c "notify pgrst, 'reload schema'"
fi
echo "✓ Migrations up to date ($applied applied)"
