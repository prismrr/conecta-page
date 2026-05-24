#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD_DIR="${1:-$ROOT_DIR/.deploy/dist}"

bash "$ROOT_DIR/scripts/deploy/build_static.sh" "$BUILD_DIR"
DEPLOY_ENV=develop bash "$ROOT_DIR/scripts/deploy/deploy_static.sh" develop "$BUILD_DIR"
