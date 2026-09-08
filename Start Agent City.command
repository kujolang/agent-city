#!/bin/sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Install Node 24 or newer, then open Agent City again."
  exit 1
fi
if [ ! -d node_modules/tsx ]; then
  npm ci
fi
exec node --import tsx scripts/start.ts
