#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-4186}"
DB_FILE="${DB_FILE:-$ROOT_DIR/data/compliance-k6-local.db}"
TARGET_PATH="${TARGET_PATH:-/api/inscricoes/PRISM-2026-001}"
K6_PROFILE="${K6_PROFILE:-baseline}"
SUMMARY_DIR="${SUMMARY_DIR:-$ROOT_DIR/logs/k6}"
SUMMARY_JSON="${SUMMARY_JSON:-$SUMMARY_DIR/summary-local.json}"

if ! command -v k6 >/dev/null 2>&1; then
  echo "[k6-local] k6 nao encontrado no PATH" >&2
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

CONECTA_COMPLIANCE_DB_FILE="$DB_FILE" "$PYTHON_BIN" "$ROOT_DIR/backend/fastapi_server.py" --host 127.0.0.1 --port "$PORT" >/tmp/conecta-k6-api.log 2>&1 &
API_PID=$!

for _ in {1..60}; do
  if curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null; then
    break
  fi
  sleep 0.2
done

if ! curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null; then
  echo "[k6-local] API did not become healthy. Check /tmp/conecta-k6-api.log" >&2
  exit 1
fi

mkdir -p "$SUMMARY_DIR"

BASE_URL="http://127.0.0.1:${PORT}" \
TARGET_PATH="$TARGET_PATH" \
K6_PROFILE="$K6_PROFILE" \
k6 run \
  --summary-export "$SUMMARY_JSON" \
  "$ROOT_DIR/tests/performance/k6/api-load.js"

echo "[k6-local] completed successfully against http://127.0.0.1:${PORT}${TARGET_PATH} (profile=$K6_PROFILE)"
echo "[k6-local] summary available at $SUMMARY_JSON"
