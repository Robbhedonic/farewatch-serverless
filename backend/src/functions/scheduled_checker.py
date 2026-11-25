import json
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from boto3.dynamodb.conditions import Key
from src.lib.db import table
from src.lib.check import check_watch


def handler(event, context):
    """Runs on a schedule: checks all active watches via GSI (no Scan), in parallel."""
    checked = failed = 0
    kwargs = {"IndexName": "activeWatches", "Limit": 25,
              "KeyConditionExpression": Key("active").eq("Y") & Key("departDate").gte(date.today().isoformat())}
    with ThreadPoolExecutor(max_workers=10) as pool:
        while True:
            r = table.query(**kwargs)
            for f in [pool.submit(check_watch, w) for w in r.get("Items", [])]:
                try:
                    f.result(); checked += 1
                except Exception as err:  # noqa: BLE001
                    print(f"ERROR {err!r}"); failed += 1
            if "LastEvaluatedKey" not in r:
                break
            kwargs["ExclusiveStartKey"] = r["LastEvaluatedKey"]
    print(json.dumps({"type": "CHECK_RUN", "checked": checked, "failed": failed}))
    return {"checked": checked, "failed": failed}
