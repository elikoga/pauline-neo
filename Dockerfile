# ── Stage 1: build SvelteKit (adapter-node) ──────────────────────────────────
FROM node:22-slim AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Baked in at build time; always a relative path so both the browser and
# SSR resolve it against the current origin without knowing the host.
ENV VITE_PAULINE_API=/api/v1
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM python:3.13-slim

# Both node:22-slim and python:3.13-slim are Debian bookworm — the node
# binary is glibc-linked and compatible.  Copying it avoids a NodeSource
# apt install and keeps the image lean.
COPY --from=frontend-builder /usr/local/bin/node /usr/local/bin/node

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Mirror the monorepo layout so the relative _FRONTEND_DIR calculation in
# backend/app/routes/frontend.py resolves correctly:
#   __file__ = /app/backend/app/routes/frontend.py
#   .parent × 4 = /app  →  /app/frontend  ✓
WORKDIR /app/backend

# Install Python deps in a cacheable layer before copying source.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/ ./
RUN uv sync --frozen --no-dev

COPY --from=frontend-builder /build/frontend/build /app/frontend/build

# Thin wrapper so the backend can exec the frontend as a subprocess.
# Uses an absolute node path — binary mode passes no PATH in the env.
RUN printf '#!/bin/sh\nexec /usr/local/bin/node /app/frontend/build/index.js "$@"\n' \
      > /usr/local/bin/pauline-frontend \
    && chmod +x /usr/local/bin/pauline-frontend

ENV FRONTEND_BINARY_PATH=/usr/local/bin/pauline-frontend
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Single worker: the frontend subprocess manager is a module-level singleton
# and cannot be shared across forked worker processes.
# --proxy-headers: trust X-Forwarded-Proto/Host from nginx upstream.
CMD ["/app/backend/.venv/bin/uvicorn", "app.api:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "1", "--proxy-headers", "--forwarded-allow-ips=*"]
