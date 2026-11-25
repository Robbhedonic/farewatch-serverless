"""Pure business logic for FareWatch – testable without AWS."""
import re
from datetime import date, datetime, timezone

IATA = re.compile(r"^[A-Z]{3}$")


def validate_watch(w, today=None):
    today = today or date.today()
    if not isinstance(w, dict):
        return ["Invalid data"]
    e = []
    if not IATA.match(str(w.get("origin", ""))):
        e.append("origin: IATA code, e.g. ARN")
    if not IATA.match(str(w.get("destination", ""))):
        e.append("destination: IATA code, e.g. BCN")
    if w.get("origin") and w.get("origin") == w.get("destination"):
        e.append("origin and destination must differ")
    try:
        d = date.fromisoformat(str(w.get("departDate", "")))
        if d < today:
            e.append("departDate cannot be in the past")
    except ValueError:
        e.append("departDate: YYYY-MM-DD")
    tp = w.get("targetPrice")
    if not isinstance(tp, int) or isinstance(tp, bool) or not 100 <= tp <= 100000:
        e.append("targetPrice: integer 100-100000 SEK")
    return e


def evaluate_drop(prev, curr, watch):
    """Decide whether a price drop should alert. Does not repeat while already below target."""
    target = watch["targetPrice"]
    if prev is None:
        return {"alert": curr <= target, "reason": "UNDER_TARGET" if curr <= target else None}
    if curr <= target < prev:
        return {"alert": True, "reason": "UNDER_TARGET"}
    drop = (prev - curr) / prev
    lowest = watch.get("lowestPrice")
    if drop >= 0.15 and (lowest is None or curr < lowest):
        return {"alert": True, "reason": "BIG_DROP", "dropPct": round(drop * 100)}
    return {"alert": False, "reason": None}


def recommend(history, depart_date, now=None):
    """Buy recommendation: BUY_NOW | WAIT | HOLD."""
    now = now or datetime.now(timezone.utc)
    if len(history) < 3:
        return "HOLD"
    prices = [h["price"] for h in history]
    last, low = prices[-1], min(prices)
    depart = datetime.fromisoformat(str(depart_date)).replace(tzinfo=timezone.utc)
    days_left = (depart - now).total_seconds() / 86400
    if days_left < 14 or last <= low * 1.03:
        return "BUY_NOW"
    if prices[-1] < prices[-3]:
        return "WAIT"
    return "HOLD"
