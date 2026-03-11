#!/usr/bin/env bash
# teardown-preview.sh — called when a branch is deleted.
# Args: $1 = branch slug

set -euo pipefail

CONTAINER="pauline-preview-$1"
docker rm -f "$CONTAINER" 2>/dev/null \
  && echo "==> Removed $CONTAINER" \
  || echo "==> $CONTAINER not found, nothing to do"
