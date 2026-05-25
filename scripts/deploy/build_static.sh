#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
exec bash "$ROOT_DIR/backend/deploy/build_static.sh" "$@"
