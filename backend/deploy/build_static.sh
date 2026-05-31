#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.local.yml"
OUTPUT_DIR="${1:-$ROOT_DIR/.deploy/dist}"
BUILD_ENV="${2:-${DEPLOY_ENV:-unknown}}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[deploy] docker nao encontrado no PATH"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[deploy] docker compose plugin nao encontrado"
  exit 1
fi

exec docker compose \
  -f "$COMPOSE_FILE" \
  --profile build \
  run --rm \
  -e BUILD_STATIC_OUTPUT_DIR="$OUTPUT_DIR" \
  -e BUILD_STATIC_BUILD_ENV="$BUILD_ENV" \
  conecta-build
