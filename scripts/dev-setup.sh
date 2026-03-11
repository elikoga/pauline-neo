#!/usr/bin/env bash
# dev-setup.sh — spin up a local dev environment loaded with the production DB dump.
#
# Prerequisites:
#   - Docker with the Compose plugin (docker compose)
#   - psql client on PATH
#   - data/pauline-dump.sql present (copy from brickfire: scp brickfire.eu:~/pauline-dump.sql data/pauline-dump.sql)
#
# What it does:
#   1. Starts the postgres container (backend/docker-compose.dev.yml)
#   2. Waits until postgres accepts connections
#   3. Creates the `pauline` role (dump owner) if missing, so OWNER TO statements succeed
#   4. Loads data/pauline-dump.sql into the pauline database
#   5. Writes backend/.env from backend/.env.sample if no .env exists yet
#
# Re-running is safe: the dump load is idempotent when the DB is clean.
# To reset: docker compose -f backend/docker-compose.dev.yml down -v && ./scripts/dev-setup.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP="$REPO_ROOT/data/pauline-dump.sql"
COMPOSE_FILE="$REPO_ROOT/backend/docker-compose.dev.yml"
ENV_FILE="$REPO_ROOT/backend/.env"
ENV_SAMPLE="$REPO_ROOT/backend/.env.sample"

PG_USER=pauline
PG_PASSWORD=pauline
PG_DB=pauline
PG_PORT=5432
PG_HOST=localhost

# ── 0. preflight ──────────────────────────────────────────────────────────────
if [[ ! -f "$DUMP" ]]; then
    echo "ERROR: dump not found at $DUMP"
    echo "Copy it first: scp brickfire.eu:~/pauline-dump.sql '$DUMP'"
    exit 1
fi

if ! command -v psql &>/dev/null; then
    echo "ERROR: psql not found on PATH (install postgresql-client)"
    exit 1
fi

# ── 1. start postgres ─────────────────────────────────────────────────────────
echo "==> Starting postgres container..."
docker compose -f "$COMPOSE_FILE" up -d db

# ── 2. wait for readiness ─────────────────────────────────────────────────────
echo "==> Waiting for postgres to be ready..."
for i in $(seq 1 30); do
    if PGPASSWORD="$PG_PASSWORD" pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" &>/dev/null; then
        break
    fi
    if [[ $i -eq 30 ]]; then
        echo "ERROR: postgres did not become ready after 30s"
        exit 1
    fi
    sleep 1
done
echo "==> Postgres is ready."

# ── 3. create pauline role (dump owner) ────────────────────────────────────────
echo "==> Ensuring 'pauline' role exists..."
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" \
    -c "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pauline') THEN CREATE ROLE pauline; END IF; END \$\$;"

# ── 4. load dump ──────────────────────────────────────────────────────────────
echo "==> Loading dump (154 MB, this takes ~30s)..."
PGPASSWORD="$PG_PASSWORD" psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" \
    --set ON_ERROR_STOP=off \
    -f "$DUMP"
echo "==> Dump loaded."

# ── 5. backend .env ──────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
    echo "==> Writing backend/.env from .env.sample..."
    # Strip the old keys that were removed from config and write clean defaults
    cat > "$ENV_FILE" <<'EOF'
API_V1_STR=/api/v1
PROJECT_NAME=PAULINE
BASE_URL=http://localhost:8000

POSTGRES_SERVER=localhost
POSTGRES_USER=pauline
POSTGRES_PASSWORD=pauline
POSTGRES_DB=pauline

API_KEYS=[]
EOF
    echo "==> Written backend/.env (edit as needed)"
else
    echo "==> backend/.env already exists, skipping."
fi

echo ""
echo "Dev environment ready. To start:"
echo "  cd $REPO_ROOT/backend && uv run uvicorn app.api:app --reload"
