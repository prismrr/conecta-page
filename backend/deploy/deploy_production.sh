#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD_DIR="${1:-$ROOT_DIR/.deploy/dist}"

bash "$ROOT_DIR/backend/deploy/build_static.sh" "$BUILD_DIR"
DEPLOY_ENV=production bash "$ROOT_DIR/backend/deploy/deploy_static.sh" production "$BUILD_DIR"
