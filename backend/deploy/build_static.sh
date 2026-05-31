#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/.deploy/dist}"
NUXT_OUTPUT_DIR="$ROOT_DIR/nuxt-app/.output/public"
BUILD_ENV="${2:-${DEPLOY_ENV:-unknown}}"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

echo "[deploy] building Nuxt SSG artifact"
npm --prefix "$ROOT_DIR" run nuxt:generate >/dev/null

if [[ ! -d "$NUXT_OUTPUT_DIR" ]]; then
  echo "[deploy] Nuxt output directory not found: $NUXT_OUTPUT_DIR"
  exit 1
fi

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$NUXT_OUTPUT_DIR/" "$OUTPUT_DIR/"
else
  cp -a "$NUXT_OUTPUT_DIR/." "$OUTPUT_DIR/"
fi

# Legacy frontend should not be present in release artifact after Nuxt cutover.
if [[ -e "$OUTPUT_DIR/pages" || -e "$OUTPUT_DIR/assets/js/site.js" ]]; then
  echo "[deploy] Legacy frontend artifacts detected in release payload"
  exit 1
fi

COMMIT_SHA="${GITHUB_SHA:-$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo unknown)}"
BRANCH_NAME="${GITHUB_REF_NAME:-$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)}"
BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > "$OUTPUT_DIR/RELEASE_MANIFEST.json" <<EOF
{
  "commitSha": "${COMMIT_SHA}",
  "branch": "${BRANCH_NAME}",
  "buildEnvironment": "${BUILD_ENV}",
  "builtAt": "${BUILD_TIME}",
  "buildSource": "backend/deploy/build_static.sh",
  "frontendTrack": "nuxt-ssg",
  "legacyFrontendIncluded": false
}
EOF

echo "[deploy] static payload ready at $OUTPUT_DIR"
