from datetime import datetime, timezone
from src.lib.db import table
from src.lib.http import respond, get_user
from src.lib.check import check_watch


def handler(event, context):
    """POST /watches/{id}/check – manual price check, max 1 per minute."""
    user = get_user(event)
    wid = (event.get("pathParameters") or {}).get("id")
    try:
        item = table.get_item(Key={"PK": f"USER#{user['id']}", "SK": f"WATCH#{wid}"}).get("Item")
        if not item:
            return respond(404, {"error": "Not found"})
        last = item.get("lastCheckedAt")
        if last and (datetime.now(timezone.utc) - datetime.fromisoformat(last)).total_seconds() < 60:
            return respond(429, {"error": "Wait one minute between checks"})
        return respond(200, check_watch(item))
    except Exception as err:  # noqa: BLE001
        print(f"ERROR {err!r}")
        return respond(500, {"error": "Could not check price"})
