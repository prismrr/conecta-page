#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ENV="${1:-}"
BUILD_DIR="${2:-}"

if [[ -z "$DEPLOY_ENV" || -z "$BUILD_DIR" ]]; then
  echo "Usage: bash backend/deploy/deploy_static.sh <develop|production> <build_dir>"
  exit 1
fi

: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"
: "${DEPLOY_PATH:?DEPLOY_PATH is required}"

DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_TIMEOUT_SECONDS="${DEPLOY_TIMEOUT_SECONDS:-20}"
COMMIT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
SHORT_SHA="${COMMIT_SHA:0:8}"
TIMESTAMP="$(date -u +"%Y%m%d%H%M%S")"
RELEASE_ID="${DEPLOY_ENV}-${TIMESTAMP}-${SHORT_SHA}"
REMOTE_RELEASE_DIR="${DEPLOY_PATH}/releases/${RELEASE_ID}"
REMOTE_CURRENT_LINK="${DEPLOY_PATH}/current"
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
  if [[ -n "$SSH_KEY_FILE" && -f "$SSH_KEY_FILE" && "${DEPLOY_SSH_PRIVATE_KEY:-}" != "" ]]; then
    rm -f "$SSH_KEY_FILE"
  fi
}
trap cleanup EXIT

if [[ ! -d "$BUILD_DIR" ]]; then
  echo "[deploy] build directory not found: $BUILD_DIR"
  exit 1
fi

echo "[deploy] creating release directory on remote host"
ssh "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" \
  "mkdir -p '${DEPLOY_PATH}/releases'"

echo "[deploy] uploading static payload"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  "$BUILD_DIR/" "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_RELEASE_DIR/"

echo "[deploy] switching current symlink"
ssh "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" \
  "ln -sfn '$REMOTE_RELEASE_DIR' '$REMOTE_CURRENT_LINK'"

echo "[deploy] appending deploy history"
ssh "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" \
  "printf '%s\\n' '${TIMESTAMP} env=${DEPLOY_ENV} release=${RELEASE_ID} commit=${COMMIT_SHA}' >> '${DEPLOY_HISTORY_FILE}'"

if [[ -n "${DEPLOY_HEALTHCHECK_URL:-}" ]]; then
  echo "[deploy] running post-deploy healthcheck: ${DEPLOY_HEALTHCHECK_URL}"
  curl -fsS --retry 3 --retry-delay 2 "$DEPLOY_HEALTHCHECK_URL" >/dev/null
fi

mkdir -p .deploy
cat > ".deploy/deploy-result-${DEPLOY_ENV}.json" <<EOF
{
  "environment": "${DEPLOY_ENV}",
  "releaseId": "${RELEASE_ID}",
  "commitSha": "${COMMIT_SHA}",
  "deployHost": "${DEPLOY_HOST}",
  "deployPath": "${DEPLOY_PATH}",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo "[deploy] deploy completed: ${RELEASE_ID}"
