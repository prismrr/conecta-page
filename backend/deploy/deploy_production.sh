#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD_DIR="${1:-$ROOT_DIR/.deploy/dist}"

bash "$ROOT_DIR/backend/deploy/build_static.sh" "$BUILD_DIR"
bash "$ROOT_DIR/backend/deploy/deploy_production_canary.sh" "$BUILD_DIR"
