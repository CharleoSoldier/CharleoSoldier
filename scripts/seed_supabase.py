"""Idempotent seed script — upserts all 15 apps into Supabase."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.supabase_client import get_supabase
from backend.data import APPS_DATA

sb = get_supabase()
if sb is None:
    print("SUPABASE_URL / SUPABASE_SERVICE_KEY not set — skipping seed.")
    sys.exit(0)

sb.table("apps").upsert(APPS_DATA, on_conflict="id").execute()
print(f"Seeded {len(APPS_DATA)} apps into Supabase.")
