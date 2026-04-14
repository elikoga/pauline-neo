# pauline-neo

## Prerequisites

- Nix with flakes enabled

## Setup

```sh
cp backend/.env.sample backend/.env
# edit backend/.env if needed (defaults match the DB setup below)
cd backend && uv sync
```

### Database

You need a PostgreSQL instance with the Pauline DB loaded. Ask Eli for the dump file, then:

```sh
# Copy dump into place (gitignored)
cp /path/to/pauline-dump.sql data/pauline-dump.sql

# Start a local postgres and load the dump
# (adjust PGUSER/PGPASSWORD/PGDATABASE to match backend/.env)
createdb pauline
psql pauline < data/pauline-dump.sql
```

## Run

```sh
nix develop
run-dev
```

Opens at <http://localhost:8000>. The backend spawns the Vite dev server internally and proxies it.