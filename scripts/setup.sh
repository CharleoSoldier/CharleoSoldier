#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Installing Python dependencies..."
cd "$ROOT/backend"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q

echo "==> Installing frontend dependencies..."
cd "$ROOT/frontend"
npm install

echo "==> Building frontend..."
npm run build

echo "==> Seeding Supabase (idempotent)..."
cd "$ROOT"
source backend/.venv/bin/activate
python scripts/seed_supabase.py || echo "  (skipped — SUPABASE_URL/SUPABASE_SERVICE_KEY not set)"

echo "==> Setup complete."
