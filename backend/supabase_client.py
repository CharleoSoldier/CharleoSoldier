import os
from dotenv import load_dotenv

load_dotenv()

_client = None


def get_supabase():
    global _client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        return None
    if _client is None:
        from supabase import create_client
        _client = create_client(url, key)
    return _client
