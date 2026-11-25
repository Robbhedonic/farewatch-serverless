import uuid
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key
from src.lib.db import table
from src.lib.http import respond, parse_body, get_user
from src.lib.fares import validate_watch

MAX_WATCHES = 20


def handler(event, context):
    user = get_user(event)
    w = parse_body(event)
    if isinstance(w, dict):
        w["origin"] = str(w.get("origin", "")).upper()
        w["destination"] = str(w.get("destination", "")).upper()
    errors = validate_watch(w)
    if errors:
        return respond(400, {"errors": errors})
    try:
        count = table.query(KeyConditionExpression=Key("PK").eq(f"USER#{user['id']}") & Key("SK").begins_with("WATCH#"), Select="COUNT")["Count"]
        if count >= MAX_WATCHES:
            return respond(429, {"error": f"Max {MAX_WATCHES} watches per user"})
        wid = str(uuid.uuid4())
        item = {
            "PK": f"USER#{user['id']}", "SK": f"WATCH#{wid}", "id": wid, "userId": user["id"], "email": user["email"],
            "origin": w["origin"], "destination": w["destination"], "departDate": w["departDate"],
            "targetPrice": w["targetPrice"], "active": "Y", "createdAt": datetime.now(timezone.utc).isoformat(),
        }
        table.put_item(Item=item)
        return respond(201, item)
    except Exception as err:  # noqa: BLE001
        print(f"ERROR {err!r}")
        return respond(500, {"error": "Could not create watch"})
