#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-4185}"
DB_FILE="${DB_FILE:-$ROOT_DIR/data/compliance-karate.db}"

if ! command -v mvn >/dev/null 2>&1; then
  echo "[karate-local] maven (mvn) nao encontrado no PATH" >&2
  exit 1
fi

if [[ -x "$ROOT_DIR/.venv/bin/python" ]]; then
  PYTHON_BIN="$ROOT_DIR/.venv/bin/python"
else
  PYTHON_BIN="python3"
fi

cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

CONECTA_COMPLIANCE_DB_FILE="$DB_FILE" "$PYTHON_BIN" "$ROOT_DIR/backend/fastapi_server.py" --host 127.0.0.1 --port "$PORT" >/tmp/conecta-karate-api.log 2>&1 &
API_PID=$!

for _ in {1..60}; do
  if curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null; then
    break
  fi
  sleep 0.2
done

if ! curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null; then
  echo "[karate-local] API did not become healthy. Check /tmp/conecta-karate-api.log" >&2
  exit 1
fi

(
  cd "$ROOT_DIR/tests/api/karate"
  mvn -q test -DbaseUrl="http://127.0.0.1:${PORT}"
)

echo "[karate-local] completed successfully against http://127.0.0.1:${PORT}"
