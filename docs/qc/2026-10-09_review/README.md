# Review of 09/10 — every page scored again with findings 1, 2 and 5 corrected

| What | File | Output |
|---|---|---|
| every page of the two benches scored again (copy of `../2026-10-07_baseline-refused/rescore-all.mjs`, outputs moved here so that the scoring of PR #7 stays as it is) | `rescore-all.mjs` | `rescored/` (the log, `rescore-all.log`, is ignored by git: every page `done`, 0 runner error in each set) |
| rows of PR #7's last scoring (runner of `85d96fa`) against these | `compare.py` | printed |
| hidden fields on the bench pages, measured before the change | `../notes-review-2026-10-09.md` | — |

`rescored/SCORED-WITH.txt`: commit `e8c230b`, `src/` not modified, 2026-10-09 12:02 → 12:35 UTC (32 min 41 s, four browsers).

Result of `python3 docs/qc/2026-10-09_review/compare.py`:

```
bench-2026-09-25-runs.csv: 4428 rows before, 4428 after, 0 changed, 0 gone, 0 new
runs-standard.csv: 10012 rows before, 10012 after, 0 changed, 0 gone, 0 new
runs-fr.csv: 7572 rows before, 7572 after, 0 changed, 0 gone, 0 new
runs-durci-standard.csv: 9717 rows before, 9717 after, 0 changed, 0 gone, 0 new
runs-durci-fr.csv: 7346 rows before, 7346 after, 0 changed, 0 gone, 0 new
rows changed in all: 0
fields tested before / after: 589 / 589
pages that took more than one attempt: 0
```

The five CSV files and `fields.json` are byte for byte those of `../2026-10-07_baseline-refused/rescored/`, so they are
not committed again; `rescore-all.mjs` writes them back in about 32 minutes, with no API call. No page of the two
benches sends a POST of its own on submit, sets a fragment at load, or has a field a person cannot see that changes
what the page says: the published figures are those of PR #7.
