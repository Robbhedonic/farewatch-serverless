from botocore.exceptions import ClientError
from src.lib.db import table
from src.lib.http import respond, get_user


def handler(event, context):
    user = get_user(event)
    wid = (event.get("pathParameters") or {}).get("id")
    try:
        table.delete_item(Key={"PK": f"USER#{user['id']}", "SK": f"WATCH#{wid}"}, ConditionExpression="attribute_exists(PK)")
        return respond(204)  # price history is cleaned up automatically via TTL
    except ClientError as err:
        if err.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return respond(404, {"error": "Not found"})
        print(f"ERROR {err!r}")
        return respond(500, {"error": "Could not delete"})
