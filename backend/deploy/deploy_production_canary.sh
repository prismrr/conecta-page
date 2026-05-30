#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD_DIR="${1:-$ROOT_DIR/.deploy/dist}"

if [[ ! -d "$BUILD_DIR" ]]; then
  echo "[deploy] build directory not found: $BUILD_DIR"
  exit 1
fi

: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"
: "${DEPLOY_PATH:?DEPLOY_PATH is required}"
: "${DEPLOY_HEALTHCHECK_URL:?DEPLOY_HEALTHCHECK_URL is required for canary cutover}"

DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_TIMEOUT_SECONDS="${DEPLOY_TIMEOUT_SECONDS:-20}"
DEPLOY_CANARY_DURATION_SECONDS="${DEPLOY_CANARY_DURATION_SECONDS:-60}"
DEPLOY_CANARY_PROBE_INTERVAL_SECONDS="${DEPLOY_CANARY_PROBE_INTERVAL_SECONDS:-10}"
DEPLOY_CANARY_MAX_FAILURES="${DEPLOY_CANARY_MAX_FAILURES:-1}"
DEPLOY_CANARY_SMOKE_URL="${DEPLOY_CANARY_SMOKE_URL:-}"
DEPLOY_FAIL_ON_ROLLBACK="${DEPLOY_FAIL_ON_ROLLBACK:-true}"

COMMIT_SHA="${GITHUB_SHA:-$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo unknown)}"
SHORT_SHA="${COMMIT_SHA:0:8}"
TIMESTAMP="$(date -u +"%Y%m%d%H%M%S")"
RELEASE_ID="production-${TIMESTAMP}-${SHORT_SHA}"
REMOTE_RELEASE_DIR="${DEPLOY_PATH}/releases/${RELEASE_ID}"
REMOTE_CURRENT_LINK="${DEPLOY_PATH}/current"
REMOTE_PREVIOUS_LINK="${DEPLOY_PATH}/previous"
DEPLOY_HISTORY_FILE="${DEPLOY_PATH}/deploy-history.log"

SSH_KEY_FILE=""
if [[ -n "${DEPLOY_SSH_PRIVATE_KEY:-}" ]]; then
  SSH_KEY_FILE="$(mktemp)"
  chmod 600 "$SSH_KEY_FILE"
  printf '%s\n' "$DEPLOY_SSH_PRIVATE_KEY" > "$SSH_KEY_FILE"
elif [[ -n "${DEPLOY_SSH_KEY_PATH:-}" ]]; then
  SSH_KEY_FILE="$DEPLOY_SSH_KEY_PATH"
fi

SSH_OPTS=(
  -p "$DEPLOY_PORT"
  -o BatchMode=yes
  -o ConnectTimeout="$DEPLOY_TIMEOUT_SECONDS"
  -o StrictHostKeyChecking=accept-new
)

if [[ -n "$SSH_KEY_FILE" ]]; then
  SSH_OPTS+=( -i "$SSH_KEY_FILE" )
fi

cleanup() {
  if [[ -n "$SSH_KEY_FILE" && -f "$SSH_KEY_FILE" && -n "${DEPLOY_SSH_PRIVATE_KEY:-}" ]]; then
    rm -f "$SSH_KEY_FILE"
  fi
}
trap cleanup EXIT

run_remote() {
  ssh "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" "$1"
}

probe_urls() {
  local failures=0

  if ! curl -fsS --retry 1 --max-time "$DEPLOY_TIMEOUT_SECONDS" "$DEPLOY_HEALTHCHECK_URL" >/dev/null; then
    failures=$((failures + 1))
  fi

  if [[ -n "$DEPLOY_CANARY_SMOKE_URL" ]]; then
    if ! curl -fsS --retry 1 --max-time "$DEPLOY_TIMEOUT_SECONDS" "$DEPLOY_CANARY_SMOKE_URL" >/dev/null; then
      failures=$((failures + 1))
    fi
  fi

  return "$failures"
}

echo "[deploy] creating remote release root"
run_remote "mkdir -p '${DEPLOY_PATH}/releases'"

echo "[deploy] detecting previous active release"
PREVIOUS_RELEASE_DIR="$(run_remote "if [[ -L '${REMOTE_CURRENT_LINK}' ]]; then readlink -f '${REMOTE_CURRENT_LINK}'; fi" | tr -d '\r')"

echo "[deploy] uploading production release payload"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  "$BUILD_DIR/" "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_RELEASE_DIR/"

echo "[deploy] validating uploaded release payload"
run_remote "test -f '${REMOTE_RELEASE_DIR}/index.html' && test -f '${REMOTE_RELEASE_DIR}/RELEASE_MANIFEST.json'"

echo "[deploy] canary cutover: promoting release to current"
run_remote "ln -sfn '${REMOTE_RELEASE_DIR}' '${REMOTE_CURRENT_LINK}'"

if [[ -n "$PREVIOUS_RELEASE_DIR" ]]; then
  run_remote "ln -sfn '${PREVIOUS_RELEASE_DIR}' '${REMOTE_PREVIOUS_LINK}'"
fi

START_EPOCH="$(date +%s)"
FAILURE_COUNT=0
PROBE_COUNT=0
ROLLED_BACK=false

while true; do
  NOW_EPOCH="$(date +%s)"
  ELAPSED="$((NOW_EPOCH - START_EPOCH))"

  if [[ "$ELAPSED" -ge "$DEPLOY_CANARY_DURATION_SECONDS" ]]; then
    break
  fi

  PROBE_COUNT=$((PROBE_COUNT + 1))
  probe_urls
  PROBE_FAILURES=$?
  if [[ "$PROBE_FAILURES" -ne 0 ]]; then
    FAILURE_COUNT=$((FAILURE_COUNT + PROBE_FAILURES))
    echo "[deploy] canary probe failure count: $FAILURE_COUNT"
  fi

  if [[ "$FAILURE_COUNT" -gt "$DEPLOY_CANARY_MAX_FAILURES" ]]; then
    if [[ -n "$PREVIOUS_RELEASE_DIR" ]]; then
      echo "[deploy] canary failed, rolling back to previous release"
      run_remote "ln -sfn '${PREVIOUS_RELEASE_DIR}' '${REMOTE_CURRENT_LINK}'"
      ROLLED_BACK=true
    else
      echo "[deploy] canary failed but no previous release was found"
    fi
    break
  fi

  sleep "$DEPLOY_CANARY_PROBE_INTERVAL_SECONDS"
done

CANARY_STATUS="promoted"
if [[ "$ROLLED_BACK" == "true" ]]; then
  CANARY_STATUS="rolled_back"
fi

run_remote "printf '%s\\n' '${TIMESTAMP} env=production release=${RELEASE_ID} commit=${COMMIT_SHA} canary=${CANARY_STATUS} failures=${FAILURE_COUNT}' >> '${DEPLOY_HISTORY_FILE}'"

mkdir -p "$ROOT_DIR/.deploy"
cat > "$ROOT_DIR/.deploy/deploy-result-production.json" <<EOF
{
  "environment": "production",
  "releaseId": "${RELEASE_ID}",
  "commitSha": "${COMMIT_SHA}",
  "deployHost": "${DEPLOY_HOST}",
  "deployPath": "${DEPLOY_PATH}",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "canary": {
    "status": "${CANARY_STATUS}",
    "durationSeconds": ${DEPLOY_CANARY_DURATION_SECONDS},
    "probeIntervalSeconds": ${DEPLOY_CANARY_PROBE_INTERVAL_SECONDS},
    "maxFailures": ${DEPLOY_CANARY_MAX_FAILURES},
    "probeCount": ${PROBE_COUNT},
    "failureCount": ${FAILURE_COUNT},
    "healthcheckUrl": "${DEPLOY_HEALTHCHECK_URL}",
    "smokeUrl": "${DEPLOY_CANARY_SMOKE_URL}",
    "previousRelease": "${PREVIOUS_RELEASE_DIR}"
  }
}
EOF

cat > "$ROOT_DIR/.deploy/canary-report-production.json" <<EOF
{
  "releaseId": "${RELEASE_ID}",
  "status": "${CANARY_STATUS}",
  "failureCount": ${FAILURE_COUNT},
  "probeCount": ${PROBE_COUNT},
  "rolledBack": ${ROLLED_BACK}
}
EOF

echo "[deploy] production cutover finished with status: ${CANARY_STATUS}"

if [[ "$ROLLED_BACK" == "true" && "$DEPLOY_FAIL_ON_ROLLBACK" == "true" ]]; then
  echo "[deploy] rollback executed during canary window"
  exit 1
fi
