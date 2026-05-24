#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/.deploy/dist}"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Build static release payload with only public site assets.
rsync -a --delete --prune-empty-dirs \
  --include='/index.html' \
  --include='/*.html' \
  --include='/assets/***' \
  --include='/pages/***' \
  --include='/favicon.ico' \
  --include='/robots.txt' \
  --include='/sitemap.xml' \
  --exclude='*' \
  "$ROOT_DIR/" "$OUTPUT_DIR/"

COMMIT_SHA="${GITHUB_SHA:-$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo unknown)}"
BRANCH_NAME="${GITHUB_REF_NAME:-$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)}"
BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > "$OUTPUT_DIR/RELEASE_MANIFEST.json" <<EOF
{
  "commitSha": "${COMMIT_SHA}",
  "branch": "${BRANCH_NAME}",
  "builtAt": "${BUILD_TIME}",
  "buildSource": "scripts/deploy/build_static.sh"
}
EOF

echo "[deploy] static payload ready at $OUTPUT_DIR"
