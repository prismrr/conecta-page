#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.local.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "[docker-dev] docker nao encontrado no PATH"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[docker-dev] docker compose plugin nao encontrado"
  exit 1
fi

action="${1:-up}"

run_compose_build() {
  echo "[docker-dev] executando build via docker compose"
  docker compose -f "$COMPOSE_FILE" --profile build run --rm conecta-build
}

case "$action" in
  build)
    run_compose_build
    ;;
  up)
    run_compose_build
    docker compose -f "$COMPOSE_FILE" up -d --build
    echo "[docker-dev] aplicacao disponivel em http://localhost:8080"
    ;;
  down)
    docker compose -f "$COMPOSE_FILE" down
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f conecta-local
    ;;
  restart)
    run_compose_build
    docker compose -f "$COMPOSE_FILE" down
    docker compose -f "$COMPOSE_FILE" up -d --build
    echo "[docker-dev] aplicacao reiniciada em http://localhost:8080"
    ;;
  *)
    echo "Uso: bash scripts/dev_docker.sh [build|up|down|logs|restart]"
    exit 1
    ;;
esac
