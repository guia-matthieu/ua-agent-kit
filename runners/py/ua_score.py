"""ua-agent-kit scoring runner for Python. Stdlib only; `idna` used when installed (IDNA2008)."""
import json, re
from pathlib import Path
from urllib.parse import urlsplit

try:
    import idna  # type: ignore
    def _to_ascii(domain: str) -> str:
        return idna.encode(domain, uts46=True).decode("ascii")
except ImportError:  # IDNA2003 fallback from the stdlib
    def _to_ascii(domain: str) -> str:
        return domain.encode("idna").decode("ascii")

_LABEL = re.compile(r"^(?!-)[a-z0-9-]{1,63}(?<!-)$", re.I)
_BATTERY = Path(__file__).resolve().parents[2] / "battery" / "cases.json"

def load_battery(path=None) -> dict:
    with open(path or _BATTERY, encoding="utf-8") as f:
        return json.load(f)

def is_valid_domain(value) -> bool:
    if not isinstance(value, str) or not value or re.search(r"\s", value) or value.endswith("."):
        return False
    try:
        ascii_ = _to_ascii(value.lower())
    except Exception:
        return False
    if not ascii_ or len(ascii_) > 253:
        return False
    labels = ascii_.split(".")
    if len(labels) < 2 or not all(_LABEL.match(l) for l in labels):
        return False
    tld = labels[-1]
    return tld.lower().startswith("xn--") or re.match(r"^[a-z]{2,}$", tld, re.I) is not None

def is_valid_email(value) -> bool:
    if not isinstance(value, str):
        return False
    at = value.rfind("@")
    if at <= 0 or at == len(value) - 1:
        return False
    local, domain = value[:at], value[at + 1:]
    if re.search(r"[\s@]", local) or local.startswith(".") or local.endswith(".") or ".." in local:
        return False
    if len(local.encode("utf-8")) > 64:
        return False
    return is_valid_domain(domain)

def is_valid_url(value) -> bool:
    if not isinstance(value, str):
        return False
    try:
        parts = urlsplit(value)
    except ValueError:
        return False
    if parts.scheme not in ("http", "https") or not parts.hostname:
        return False
    if " " in (parts.netloc or ""):
        return False
    return is_valid_domain(parts.hostname)

def score(validate, battery: dict, kind=None) -> dict:
    selected = [c for c in battery["cases"] if kind is None or c["kind"] == kind]
    if not selected:
        return {"kind": kind or "all", "battery": battery["version"], "total": 0, "accepted_ok": 0, "rejected_ok": 0,
                "failures": [], "byClass": {}, "failingClasses": [], "verdict": "no-cases"}
    by_class, failures = {}, []
    accepted_ok = rejected_ok = guards = guards_accepted = 0
    for c in selected:
        try:
            accepted = bool(validate(c["value"]))
        except Exception:
            accepted = False
        ok = (c["expect"] == "accept") == accepted
        key = c["class"] if kind else f"{c['kind']}:{c['class']}"   # same keying rule as the JS runner
        b = by_class.setdefault(key, {"total": 0, "ok": 0})
        b["total"] += 1
        if ok:
            b["ok"] += 1
        else:
            failures.append(c["id"])
        if c["expect"] == "accept" and ok:
            accepted_ok += 1
        if c["expect"] == "reject":
            if ok:
                rejected_ok += 1
            if c["class"] == "guard":
                guards += 1
                if not ok:
                    guards_accepted += 1
    failing = [k for k, v in by_class.items() if v["ok"] < v["total"]]
    verdict = "accept-all" if guards and guards_accepted == guards else ("ua-pass" if not failures else "ua-fail")
    return {"kind": kind or "all", "battery": battery["version"], "total": len(selected),
            "accepted_ok": accepted_ok, "rejected_ok": rejected_ok, "failures": failures,
            "byClass": by_class, "failingClasses": failing, "verdict": verdict}
