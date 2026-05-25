#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="/tmp/charleosoldier-gunicorn.pid"

echo "==> Starting Gunicorn..."
cd "$ROOT/backend"
source .venv/bin/activate
gunicorn \
  --workers 4 \
  --bind 127.0.0.1:5000 \
  --pid "$PID_FILE" \
  --daemon \
  --log-file /tmp/charleosoldier-gunicorn.log \
  wsgi:app

echo "==> Reloading Nginx..."
sudo nginx -s reload 2>/dev/null || sudo nginx

echo "==> Running. API: http://localhost:5000/api/apps"
echo "    Gunicorn PID: $(cat $PID_FILE)"
