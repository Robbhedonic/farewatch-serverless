from boto3.dynamodb.conditions import Key
from src.lib.db import table
from src.lib.http import respond, get_user
from src.lib.fares import recommend


def handler(event, context):
    """Watch + price history + buy recommendation. Ownership enforced via PK."""
    user = get_user(event)
    wid = (event.get("pathParameters") or {}).get("id")
    try:
        item = table.get_item(Key={"PK": f"USER#{user['id']}", "SK": f"WATCH#{wid}"}).get("Item")
        if not item:
            return respond(404, {"error": "Not found"})
        h = table.query(KeyConditionExpression=Key("PK").eq(f"WATCH#{wid}") & Key("SK").begins_with("PRICE#"), ScanIndexForward=True, Limit=500)
        history = [{"ts": i["ts"], "price": int(i["price"]), "airline": i.get("airline")} for i in h.get("Items", [])]
        return respond(200, {**item, "history": history, "recommendation": recommend(history, item["departDate"])})
    except Exception as err:  # noqa: BLE001
        print(f"ERROR {err!r}")
        return respond(500, {"error": "Could not fetch watch"})
