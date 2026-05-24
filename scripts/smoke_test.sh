#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8080}"
BASE_URL="http://${HOST}:${PORT}"
STARTED_SERVER=0
SERVER_PID=""

SERVER_LOG="/tmp/conecta-dev-server.log"

cleanup() {
  if [[ "$STARTED_SERVER" -eq 1 && -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

health_check() {
  curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}/healthz"
}

ensure_server() {
  local code
  code="$(health_check || true)"
  if [[ "$code" == "200" ]]; then
    echo "[smoke] Using existing server at ${BASE_URL}"
    return
  fi

  echo "[smoke] Starting local dev server at ${BASE_URL}"
  python3 scripts/dev_server.py --host "$HOST" --port "$PORT" >"$SERVER_LOG" 2>&1 &
  SERVER_PID="$!"
  STARTED_SERVER=1

  for _ in $(seq 1 30); do
    code="$(health_check || true)"
    if [[ "$code" == "200" ]]; then
      echo "[smoke] Server is healthy"
      return
    fi
    sleep 0.2
  done

  echo "[smoke] ERROR: dev server did not become healthy"
  echo "[smoke] Check log: $SERVER_LOG"
  exit 1
}

assert_registration() {
  local id="$1"
  local expected_http="$2"
  local expected_field="$3"
  local expected_value="$4"

  local tmp_file
  tmp_file="$(mktemp)"

  local http_code
  http_code="$(curl -sS -o "$tmp_file" -w "%{http_code}" "${BASE_URL}/api/registrations/${id}")"

  if [[ "$http_code" != "$expected_http" ]]; then
    echo "[smoke] FAIL ${id}: expected HTTP ${expected_http}, got ${http_code}"
    cat "$tmp_file"
    rm -f "$tmp_file"
    exit 1
  fi

  python3 - "$tmp_file" "$expected_field" "$expected_value" <<'PY'
import json
import sys

path, field, expected = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, "r", encoding="utf-8") as f:
    payload = json.load(f)

actual = payload.get(field)
if str(actual) != expected:
    print(f"[smoke] FAIL payload field {field}: expected {expected}, got {actual}")
    print(json.dumps(payload, ensure_ascii=True))
    sys.exit(1)
PY

  echo "[smoke] PASS ${id} -> HTTP ${http_code}, ${expected_field}=${expected_value}"
  rm -f "$tmp_file"
}

assert_telemetry_post() {
  local tmp_file
  tmp_file="$(mktemp)"

  local payload
  payload='{"event":"smoke_test_event","timestamp":"2026-05-22T00:00:00Z","page":"smoke","path":"/","release_id":"smoke","environment":"test","source_channel":"cli","session_id":"smoke-session","data":{"ok":true}}'

  local http_code
  http_code="$(curl -sS -o "$tmp_file" -w "%{http_code}" -X POST "${BASE_URL}/telemetry/events" -H "Content-Type: application/json" -d "$payload")"

  if [[ "$http_code" != "202" ]]; then
    echo "[smoke] FAIL telemetry POST: expected HTTP 202, got ${http_code}"
    cat "$tmp_file"
    rm -f "$tmp_file"
    exit 1
  fi

  python3 - "$tmp_file" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    payload = json.load(f)

if payload.get("ok") is not True:
    print("[smoke] FAIL telemetry response: expected ok=true")
    print(json.dumps(payload, ensure_ascii=True))
    sys.exit(1)
PY

  echo "[smoke] PASS telemetry POST -> HTTP 202"
  rm -f "$tmp_file"
}

assert_compliance_endpoints() {
  local consent_payload
  consent_payload='{"version":"consent-v2-2026-05","updatedAt":"2026-05-23T00:00:00Z","source":"smoke","status":"granted","categories":{"essential":true,"analytics_optional":true,"communication_optional":false}}'

  local tmp_file
  tmp_file="$(mktemp)"

  local http_code
  http_code="$(curl -sS -o "$tmp_file" -w "%{http_code}" -X POST "${BASE_URL}/compliance/consent-records" -H "Content-Type: application/json" -d "$consent_payload")"
  if [[ "$http_code" != "201" ]]; then
    echo "[smoke] FAIL compliance consent POST: expected HTTP 201, got ${http_code}"
    cat "$tmp_file"
    rm -f "$tmp_file"
    exit 1
  fi

  http_code="$(curl -sS -o "$tmp_file" -w "%{http_code}" "${BASE_URL}/compliance/integration-summary")"
  if [[ "$http_code" != "200" ]]; then
    echo "[smoke] FAIL compliance summary GET: expected HTTP 200, got ${http_code}"
    cat "$tmp_file"
    rm -f "$tmp_file"
    exit 1
  fi

  python3 - "$tmp_file" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    payload = json.load(f)

if payload.get("ok") is not True:
    print("[smoke] FAIL compliance summary response: expected ok=true")
    print(json.dumps(payload, ensure_ascii=True))
    sys.exit(1)

if "summary" not in payload:
    print("[smoke] FAIL compliance summary response: missing summary")
    print(json.dumps(payload, ensure_ascii=True))
    sys.exit(1)
PY

  echo "[smoke] PASS compliance SQL endpoints"
  rm -f "$tmp_file"
}

main() {
  ensure_server

  assert_registration "PRISM-2026-001" "200" "status" "APPROVED"
  assert_registration "PRISM-2026-002" "200" "status" "UNDER_REVIEW"
  assert_registration "PRISM-2026-404" "404" "error" "not_found"
  assert_registration "PRISM-2026-401" "401" "error" "unauthorized"
  assert_registration "PRISM-2026-503" "503" "error" "provider_unavailable"
  assert_registration "PRISM-2026-999" "200" "status" "UNKNOWN"

  assert_telemetry_post
  assert_compliance_endpoints

  echo "[smoke] All checks passed"
}

main "$@"
