# Changelog

## 0.1.0 — 2026-09-29

First public release.

- **Battery 1.0.0** (`battery/cases.json`): 79 cases for email addresses, domain names and URLs, 63 to accept and 16 to refuse, with a pinned copy of the IANA TLD list and self-checks in CI.
- **Runners**: `ua-kit score` and a JavaScript scoring API (`runners/js/`), a single-file Python runner (`runners/py/ua_score.py`), reference validators in both languages that pass the whole battery.
- **`ua-kit check`**: types every case into a local HTML file or a URL in a headless browser (Chromium, Firefox or WebKit) and reports per class; nothing but `GET`/`HEAD` leaves the page, and a URL is never submitted.
- **Pattern catalogue 1.0.0** (`patterns/catalogue.json`): published faulty validation rules, matched against the page's scripts.
- **Guide 1.0.0** (`GUIDE.md`) and generated adapters for Claude Code, Cursor, `AGENTS.md` and GitHub Copilot.
- **Bench results** (`bench/results/RESULTS.md`): 3 models × 3 languages × 2 conditions × 3 repeats, generated on 2026-09-25, every page published and re-scorable without an API call.
