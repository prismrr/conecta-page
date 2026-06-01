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

run_ingestion_stack_up() {
  echo "[docker-dev] subindo stack de ingestao (redis + csv source + worker + beat)"
  docker compose -f "$COMPOSE_FILE" --profile ingestion up -d conecta-redis conecta-csv-source conecta-worker conecta-beat
}

run_ingestion_trigger() {
  echo "[docker-dev] disparando task manual de ingestao CSV"
  docker compose -f "$COMPOSE_FILE" --profile ingestion run --rm --entrypoint /bin/bash conecta-worker -lc \
    "python3 -m pip install --no-cache-dir -r backend/requirements-fastapi.txt >/dev/null \
      && python3 -c 'from backend.ingestion.tasks import sync_inscricoes_from_csv; r = sync_inscricoes_from_csv.delay(); print({\"taskId\": r.id})'"
}

case "$action" in
  build)
    run_compose_build
    ;;
  up)
    run_compose_build
    docker compose -f "$COMPOSE_FILE" up -d --build
    echo "[docker-dev] API FastAPI disponivel em http://localhost:8080"
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
    echo "[docker-dev] API FastAPI reiniciada em http://localhost:8080"
    ;;
  ingestion-up)
    run_ingestion_stack_up
    ;;
  ingestion-trigger)
    run_ingestion_trigger
    ;;
  ingestion-logs)
    docker compose -f "$COMPOSE_FILE" --profile ingestion logs -f conecta-worker conecta-beat conecta-redis conecta-csv-source
    ;;
  ingestion-down)
    docker compose -f "$COMPOSE_FILE" --profile ingestion down
    ;;
  *)
    echo "Uso: bash scripts/dev_docker.sh [build|up|down|logs|restart|ingestion-up|ingestion-trigger|ingestion-logs|ingestion-down]"
    exit 1
    ;;
esac
