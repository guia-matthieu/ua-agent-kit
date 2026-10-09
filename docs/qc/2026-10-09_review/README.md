# Review of 09/10 — every page scored again with findings 1 and 2 corrected

| What | File | Output |
|---|---|---|
| every page of the two benches scored again (copy of `../2026-10-07_baseline-refused/rescore-all.mjs`, outputs moved here so that the scoring of PR #7 stays as it is) | `rescore-all.mjs` | `rescored/` (the log, `rescore-all.log`, is ignored by git: every page `done`, 0 runner error in each set) |
| rows of PR #7's last scoring (runner of `85d96fa`) against these | `compare.py` | printed |
| hidden fields on the bench pages, the withdrawn correction of finding 5 | `../notes-review-2026-10-09.md` | — |

`rescored/SCORED-WITH.txt`: commit `8477b3b` (findings 1 and 2; finding 5 withdrawn), `src/` not modified,
2026-10-09 14:17 → 14:50 UTC (32 min 44 s, four browsers). Two earlier scorings on this branch, with the two
withdrawn rules of finding 5 (`e8c230b`, 12:02 → 12:35 UTC; `2173901`, 13:22 → 13:54 UTC), gave the same result.

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
benches sends a POST of its own on submit or sets a fragment at load: the published figures are those of PR #7.
