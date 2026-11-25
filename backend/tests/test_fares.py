import unittest
from datetime import date, datetime, timezone
from src.lib.fares import validate_watch, evaluate_drop, recommend
from src.lib.provider import get_price

TODAY = date(2026, 1, 1)
NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)
OK = {"origin": "ARN", "destination": "BCN", "departDate": "2026-03-01", "targetPrice": 1200}
W = {"targetPrice": 1000, "lowestPrice": 1300}


class FaresTest(unittest.TestCase):
    def test_valid_watch(self): self.assertEqual(validate_watch(OK, TODAY), [])
    def test_same_airports_rejected(self): self.assertTrue(validate_watch({**OK, "destination": "ARN"}, TODAY))
    def test_past_date_rejected(self): self.assertTrue(validate_watch({**OK, "departDate": "2025-12-01"}, TODAY))
    def test_alert_under_target(self): self.assertEqual(evaluate_drop(1100, 950, W)["reason"], "UNDER_TARGET")
    def test_no_repeat_alert(self): self.assertFalse(evaluate_drop(950, 940, W)["alert"])
    def test_big_drop_15pct(self): self.assertEqual(evaluate_drop(1600, 1250, W)["reason"], "BIG_DROP")
    def test_10pct_no_alert(self): self.assertFalse(evaluate_drop(1500, 1350, W)["alert"])
    def test_buy_now_close_departure(self):
        self.assertEqual(recommend([{"price": 900}, {"price": 1000}, {"price": 1100}], "2026-01-10", NOW), "BUY_NOW")
    def test_simulator_deterministic(self): self.assertEqual(get_price(OK, NOW)["price"], get_price(OK, NOW)["price"])


if __name__ == "__main__":
    unittest.main()
