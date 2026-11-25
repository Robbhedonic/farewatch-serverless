"""Price provider. Default: deterministic simulator (no external key required).
Swap in e.g. the Amadeus Self-Service API by implementing get_price() with HTTP calls."""
from datetime import datetime, timezone

AIRLINES = ["SAS", "Norwegian", "Lufthansa", "KLM"]


def _hash(s):
    h = 2166136261
    for c in s:
        h = ((h ^ ord(c)) * 16777619) & 0xFFFFFFFF
    return h


def get_price(watch, now=None):
    now = now or datetime.now(timezone.utc)
    o, d = watch["origin"], watch["destination"]
    base = 600 + _hash(o + d) % 2400
    depart = datetime.fromisoformat(str(watch["departDate"])).replace(tzinfo=timezone.utc)
    days_left = max(1.0, (depart - now).total_seconds() / 86400)
    urgency = 1 + (21 - days_left) * 0.04 if days_left < 21 else 1
    hour = int(now.timestamp() // 3600)
    noise = ((_hash(f"{o}{d}{hour}") % 1000) / 1000 - 0.5) * 0.35
    return {"price": round(base * urgency * (1 + noise)), "currency": "SEK", "airline": AIRLINES[_hash(f"{d}{hour}") % 4]}
