#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-4187}"
DB_FILE="${DB_FILE:-$ROOT_DIR/data/compliance-zap-local.db}"
OPENAPI_FILE="${OPENAPI_FILE:-$ROOT_DIR/contracts/openapi/inscricoes.v1.0.0.openapi.json}"
REPORT_DIR="${REPORT_DIR:-$ROOT_DIR/logs/zap-local}"
FAIL_ON_WARN="${FAIL_ON_WARN:-true}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[zap-local] docker nao encontrado no PATH" >&2
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

mkdir -p "$REPORT_DIR" "$ROOT_DIR/.tmp"

CONECTA_COMPLIANCE_DB_FILE="$DB_FILE" "$PYTHON_BIN" "$ROOT_DIR/backend/fastapi_server.py" --host 127.0.0.1 --port "$PORT" >/tmp/conecta-zap-api.log 2>&1 &
API_PID=$!

for _ in {1..60}; do
  if curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null; then
    break
  fi
  sleep 0.2
done

if ! curl -fsS "http://127.0.0.1:${PORT}/healthz" >/dev/null; then
  echo "[zap-local] API did not become healthy. Check /tmp/conecta-zap-api.log" >&2
  exit 1
fi

TARGET_URL="http://127.0.0.1:${PORT}"
EFFECTIVE_OPENAPI="$ROOT_DIR/.tmp/zap-openapi.local.effective.json"

python3 - <<PY
import json
from pathlib import Path

source = Path(r"$OPENAPI_FILE")
target = Path(r"$EFFECTIVE_OPENAPI")
data = json.loads(source.read_text(encoding="utf-8"))
data["servers"] = [{"url": "$TARGET_URL"}]
target.write_text(json.dumps(data, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
PY

OPENAPI_FILE="$EFFECTIVE_OPENAPI" TARGET_URL="$TARGET_URL" REPORT_DIR="$REPORT_DIR" FAIL_ON_WARN="$FAIL_ON_WARN" bash "$ROOT_DIR/scripts/zap_api_scan.sh"

echo "[zap-local] completed successfully against $TARGET_URL"
