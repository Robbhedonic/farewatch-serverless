from datetime import datetime, timezone
from .db import table
from .provider import get_price


def check_watch(w, now=None):
    """Fetches a price, stores a history point (with TTL) and updates the watch."""
    now = now or datetime.now(timezone.utc)
    q = get_price(w, now)
    ts = now.isoformat()
    depart = datetime.fromisoformat(str(w["departDate"])).replace(tzinfo=timezone.utc)
    table.put_item(Item={
        "PK": f"WATCH#{w['id']}", "SK": f"PRICE#{ts}", "ts": ts,
        "price": q["price"], "airline": q["airline"], "ttl": int(depart.timestamp()) + 30 * 86400,
    })
    lowest = w.get("lowestPrice")
    new_lowest = q["price"] if lowest is None else min(int(lowest), q["price"])
    r = table.update_item(
        Key={"PK": w["PK"], "SK": w["SK"]},
        UpdateExpression="SET prevPrice = if_not_exists(lastPrice, :p), lastPrice = :p, lastAirline = :a, lastCheckedAt = :t, lowestPrice = :l",
        ConditionExpression="attribute_exists(PK)",
        ExpressionAttributeValues={":p": q["price"], ":a": q["airline"], ":t": ts, ":l": new_lowest},
        ReturnValues="ALL_NEW",
    )
    return r["Attributes"]
