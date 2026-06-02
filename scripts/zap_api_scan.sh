#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OPENAPI_FILE="${OPENAPI_FILE:-$ROOT_DIR/contracts/openapi/inscricoes.v1.0.0.openapi.json}"
TARGET_URL="${TARGET_URL:-http://127.0.0.1:8080}"
REPORT_DIR="${REPORT_DIR:-$ROOT_DIR/logs/zap}"
FAIL_ON_WARN="${FAIL_ON_WARN:-false}"

warn_flag=""
if [[ "$FAIL_ON_WARN" != "true" ]]; then
  warn_flag="-I"
fi

mkdir -p "$REPORT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "[zap] docker nao encontrado no PATH" >&2
  exit 1
fi

echo "[zap] running api scan"
echo "[zap] target=$TARGET_URL"
echo "[zap] openapi=$OPENAPI_FILE"

docker run --rm \
  -v "$ROOT_DIR:/zap/wrk" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-api-scan.py \
  -t "/zap/wrk/${OPENAPI_FILE#$ROOT_DIR/}" \
  -f openapi \
  -r "/zap/wrk/${REPORT_DIR#$ROOT_DIR/}/zap-api-report.html" \
  -J "/zap/wrk/${REPORT_DIR#$ROOT_DIR/}/zap-api-report.json" \
  -x "/zap/wrk/${REPORT_DIR#$ROOT_DIR/}/zap-api-report.xml" \
  -z "-config api.disablekey=true" \
  $warn_flag

echo "[zap] report generated at $REPORT_DIR"
