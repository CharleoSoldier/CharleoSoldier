#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="/tmp/charleosoldier-gunicorn.pid"

echo "==> Pulling latest code..."
git -C "$ROOT" pull origin main

echo "==> Rebuilding..."
"$ROOT/scripts/setup.sh"

echo "==> Restarting Gunicorn..."
if [ -f "$PID_FILE" ]; then
  kill "$(cat $PID_FILE)" 2>/dev/null || true
  rm -f "$PID_FILE"
fi

"$ROOT/scripts/start.sh"
echo "==> Deploy complete."
