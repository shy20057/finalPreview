#!/usr/bin/env bash
# Set HBUILDERX_HOME when HBuilderX is installed outside the default location.
set -eu
SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
exec node "$SCRIPT_DIR/build.mjs" "${1:-app}"
