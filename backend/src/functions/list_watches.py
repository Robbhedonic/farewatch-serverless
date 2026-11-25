from boto3.dynamodb.conditions import Key
from src.lib.db import table
from src.lib.http import respond, get_user


def handler(event, context):
    user = get_user(event)
    try:
        r = table.query(KeyConditionExpression=Key("PK").eq(f"USER#{user['id']}") & Key("SK").begins_with("WATCH#"))
        return respond(200, r.get("Items", []))
    except Exception as err:  # noqa: BLE001
        print(f"ERROR {err!r}")
        return respond(500, {"error": "Could not fetch watches"})
