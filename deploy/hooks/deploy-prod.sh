#!/usr/bin/env bash
# deploy-prod.sh — called by services.webhook when main is pushed.
#
# Args: $1 = image ref (e.g. "ghcr.io/elikoga/pauline-neo:latest")
#
# Required env (via the NixOS webhook service's environmentFile):
#   GHCR_USER, GHCR_TOKEN  — GHCR read:packages PAT
#   COMPOSE_DIR            — path to the deploy/ directory on the server

set -euo pipefail

IMAGE="${1:-ghcr.io/elikoga/pauline-neo:latest}"

echo "==> Deploying production: $IMAGE"

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker pull "$IMAGE"

# Restart only the prod container; leaves traefik and previews untouched.
docker compose -f "${COMPOSE_DIR}/docker-compose.yml" up -d --no-deps pauline-prod

echo "==> Production deployment complete"
