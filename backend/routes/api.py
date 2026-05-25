from flask import Blueprint, jsonify
from ..supabase_client import get_supabase
from ..data import APPS_DATA

api_bp = Blueprint("api", __name__)


def _fetch_apps():
    try:
        sb = get_supabase()
        if sb:
            res = sb.table("apps").select("*").execute()
            if res.data:
                return res.data
    except Exception:
        pass
    return APPS_DATA


@api_bp.route("/apps", methods=["GET"])
def list_apps():
    return jsonify(_fetch_apps())


@api_bp.route("/apps/<app_id>", methods=["GET"])
def get_app(app_id):
    apps = _fetch_apps()
    app = next((a for a in apps if a["id"] == app_id), None)
    if app is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(app)
