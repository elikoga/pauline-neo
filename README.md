# pauline-neo

## Prerequisites

- Nix with flakes enabled
- A running PostgreSQL instance with the Pauline DB (see `backend/.env.sample`)

## Setup

```sh
cp backend/.env.sample backend/.env
# edit backend/.env — set POSTGRES_* to match your local DB
cd backend && uv sync
```

## Run

```sh
nix develop
run-dev
```

Opens at <http://localhost:8000>. The backend spawns the Vite dev server internally and proxies it.
