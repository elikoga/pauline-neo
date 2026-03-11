#!/usr/bin/env bash
# deploy-preview.sh — called by services.webhook when a branch is pushed.
#
# Args (passed by webhook from JSON payload):
#   $1  branch slug  e.g. "feature-my-branch"
#   $2  image ref    e.g. "ghcr.io/elikoga/pauline-neo:feature-my-branch"
#
# Required env (set via the NixOS webhook service's environmentFile):
#   GHCR_USER, GHCR_TOKEN      — GHCR read:packages PAT
#   PREVIEW_DOMAIN             — e.g. "preview.pauline.example.com"
#   DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
#   COMPOSE_DIR                — path to the deploy/ directory on the server

set -euo pipefail

BRANCH="$1"
IMAGE="$2"
CONTAINER="pauline-preview-${BRANCH}"

echo "==> Deploying preview: $CONTAINER"

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker pull "$IMAGE"

# Remove any existing container for this branch before replacing it.
docker rm -f "$CONTAINER" 2>/dev/null || true

docker run -d \
  --name "$CONTAINER" \
  --network pauline \
  --label "traefik.enable=true" \
  --label "traefik.http.routers.${CONTAINER}.rule=Host(\`${BRANCH}.${PREVIEW_DOMAIN}\`)" \
  --label "traefik.http.routers.${CONTAINER}.entrypoints=web" \
  --label "traefik.http.services.${CONTAINER}.loadbalancer.server.port=8000" \
  --env "POSTGRES_SERVER=${DB_HOST}" \
  --env "POSTGRES_USER=${DB_USER}" \
  --env "POSTGRES_PASSWORD=${DB_PASSWORD}" \
  --env "POSTGRES_DB=${DB_NAME}" \
  --env "BASE_URL=https://${BRANCH}.${PREVIEW_DOMAIN}" \
  --env "API_V1_STR=/api/v1" \
  --env "PROJECT_NAME=PAULINE" \
  --env "API_KEYS=[]" \
  --restart unless-stopped \
  "$IMAGE"

echo "==> Preview live at https://${BRANCH}.${PREVIEW_DOMAIN}"
