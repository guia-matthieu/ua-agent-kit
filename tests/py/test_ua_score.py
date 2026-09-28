import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "runners" / "py"))
import ua_score  # noqa: E402

B = ua_score.load_battery()
V = {"email": ua_score.is_valid_email, "domain": ua_score.is_valid_domain, "url": ua_score.is_valid_url}

class ReferenceAgreesWithBattery(unittest.TestCase):
    def test_every_case(self):
        for c in B["cases"]:
            with self.subTest(c["id"]):
                self.assertEqual(V[c["kind"]](c["value"]), c["expect"] == "accept")

class ScoreShape(unittest.TestCase):
    def test_reference_passes(self):
        r = ua_score.score(ua_score.is_valid_email, B, kind="email")
        self.assertEqual(r["verdict"], "ua-pass")
        self.assertEqual(r["failures"], [])
    def test_legacy_regex_fails_expected_classes(self):
        import re
        rx = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$")
        r = ua_score.score(lambda v: bool(rx.match(v)), B, kind="email")
        self.assertEqual(r["verdict"], "ua-fail")
        for cls in ("ascii-tld-long", "eai-local", "eai-full"):
            self.assertIn(cls, r["failingClasses"])
    def test_accept_all(self):
        r = ua_score.score(lambda v: True, B, kind="domain")
        self.assertEqual(r["verdict"], "accept-all")
    def test_unknown_kind_is_no_cases(self):
        r = ua_score.score(lambda v: True, B, kind="bogus")
        self.assertEqual(r["verdict"], "no-cases")
        self.assertEqual(r["total"], 0)
    def test_buckets_prefixed_without_kind(self):
        r = ua_score.score(ua_score.is_valid_email, B)
        self.assertIn("email:control", r["byClass"])
        self.assertNotIn("control", r["byClass"])

if __name__ == "__main__":
    unittest.main()
