# pauline-neo

## Prerequisites

- Nix with flakes enabled
- Docker with the Compose plugin (`docker compose`)

## First-time setup

```sh
# Enter dev shell (provides uv, python, node, psql)
nix develop

# Install Python deps
cd backend && uv sync && cd ..

# Get the DB dump from Eli, then place it at:
#   data/pauline-dump.sql
#
# Then load it into a local postgres container:
setup-db
```

`setup-db` starts a postgres container via `docker-compose.dev.yml`, loads the dump, and writes `backend/.env` from `backend/.env.sample` if it doesn't exist yet.

To reset the DB from scratch:

```sh
docker compose -f docker-compose.dev.yml down -v
setup-db
```

## Run

```sh
nix develop
run-dev
```

Opens at <http://localhost:8000>. The backend spawns the Vite dev server internally and proxies all frontend requests through it.
