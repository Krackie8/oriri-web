#!/usr/bin/env bash
# Builds a throwaway local Postgres twin of the hosted project, applies every migration in
# order, then runs the schema tests. Needs Docker. Never touches the hosted database.
set -euo pipefail
cd "$(dirname "$0")/../.."
NAME=oriri-twin
IMAGE=postgres:17
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=twin "$IMAGE" >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
until docker exec "$NAME" pg_isready -U postgres -q; do sleep 1; done
sleep 1
run() { MSYS_NO_PATHCONV=1 docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -X -1 -f - < "$1"; }
for f in supabase/twin/00_*.sql supabase/twin/01_*.sql; do echo "twin: $f"; run "$f"; done
for f in supabase/migrations/*.sql; do [ -e "$f" ] || continue; echo "migration: $f"; run "$f"; done
echo "tests: supabase/tests/bestie_schema.test.sql"
MSYS_NO_PATHCONV=1 docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -X -f - < supabase/tests/bestie_schema.test.sql
