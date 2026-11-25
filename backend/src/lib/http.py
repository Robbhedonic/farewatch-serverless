import json
from decimal import Decimal


def _default(o):
    if isinstance(o, Decimal):
        return int(o) if o == o.to_integral_value() else float(o)
    raise TypeError


def respond(status, body=None):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": "" if body is None else json.dumps(body, default=_default, ensure_ascii=False),
    }


def parse_body(event):
    try:
        return json.loads(event.get("body") or "{}")
    except (ValueError, TypeError):
        return None


def get_user(event):
    """Claims from the Cognito JWT (verified by API Gateway before Lambda runs)."""
    claims = (((event.get("requestContext") or {}).get("authorizer") or {}).get("jwt") or {}).get("claims") or {}
    return {"id": claims.get("sub"), "email": claims.get("email")}
