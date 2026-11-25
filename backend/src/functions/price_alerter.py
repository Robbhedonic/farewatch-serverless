import json
import os
import time
import boto3
from boto3.dynamodb.types import TypeDeserializer
from src.lib.fares import evaluate_drop

sns = boto3.client("sns")
_des = TypeDeserializer()


def _unmarshall(img):
    return {k: _des.deserialize(v) for k, v in (img or {}).items()}


def handler(event, context):
    """Event-driven: DynamoDB Stream -> CloudWatch metrics (EMF) + SNS price alerts. Partial batch failures."""
    failures = []
    for r in event.get("Records", []):
        try:
            if r.get("eventName") != "MODIFY":
                continue
            n, o = _unmarshall(r["dynamodb"].get("NewImage")), _unmarshall(r["dynamodb"].get("OldImage"))
            if not str(n.get("SK", "")).startswith("WATCH#") or n.get("lastPrice") is None:
                continue
            if n.get("lastCheckedAt") == o.get("lastCheckedAt"):
                continue
            prev = int(o["lastPrice"]) if o.get("lastPrice") is not None else None
            curr = int(n["lastPrice"])
            d = evaluate_drop(prev, curr, {"targetPrice": int(o.get("targetPrice", n["targetPrice"])),
                                           "lowestPrice": int(o["lowestPrice"]) if o.get("lowestPrice") is not None else None})
            print(json.dumps({
                "_aws": {"Timestamp": int(time.time() * 1000), "CloudWatchMetrics": [{"Namespace": "FareWatch", "Dimensions": [["Route"]],
                         "Metrics": [{"Name": "Price", "Unit": "None"}, {"Name": "Alerts", "Unit": "Count"}]}]},
                "Route": f"{n['origin']}-{n['destination']}", "Price": curr, "Alerts": 1 if d["alert"] else 0, "reason": d["reason"],
            }))
            if not d["alert"]:
                continue
            route = f"{n['origin']} → {n['destination']}"
            msg = (f"Price for {route} ({n['departDate']}) is now {curr} SEK – below your target {n['targetPrice']} SEK!"
                   if d["reason"] == "UNDER_TARGET" else f"Price for {route} dropped {d['dropPct']}% till {curr} SEK.")
            sns.publish(TopicArn=os.environ["TOPIC_ARN"], Subject=f"FareWatch: {n['origin']}-{n['destination']} {curr} SEK"[:100], Message=msg,
                        MessageAttributes={"userId": {"DataType": "String", "StringValue": str(n["userId"])}})
        except Exception as err:  # noqa: BLE001
            print(f"ERROR {err!r}")
            failures.append({"itemIdentifier": r["dynamodb"]["SequenceNumber"]})
    return {"batchItemFailures": failures}
