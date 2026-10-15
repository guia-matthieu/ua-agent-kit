# Bench of 2026-09-25 scored again at `4207a12` (2026-10-15)

Facts and commands. `bench/results/RESULTS.md` and `README.md` are human-owned and not touched here: their numbers are those of the scoring of 2026-09-28 until they are rewritten.

## What was done

```
node bench/run-bench.mjs --rescore       # 54 pages, 23 min 17 s on this machine (rescore.log)
node bench/build-index.mjs
```

Kit at `4207a12` (last change to `src/`: `da49011`), Node v23.10.0, Playwright 1.63.0, battery `1.0.0`. Pass `2026-10-15T09:07:44.716Z` in `rescore.json`.

The scoring of 2026-09-28, the one `RESULTS.md` describes, is kept in `bench/results/scoring-2026-09-28/`: its `runs.csv` and the `rescore.json` that gives its sha256. Its 54 `.json` are in git history (`git show 4207a12:bench/results/generations/<model>/<lang>/<condition>/<repeat>.json`).

## The new `runs.csv` is the reference scoring

```
shasum -a 256 bench/results/runs.csv docs/qc/2026-10-09_finding-5/rescored/bench-2026-09-25-runs.csv
5fc0a17112b491783d4cc9dc84b8b763fd18b81c522257e95f6af632b547a83e  (both)
```

So every number of `../2026-10-14_results-rescored/` (`bench-2026-09-25.md`, `sensitivity-reference.txt`, the rule 1 row) holds for the files now in `bench/results/`. Checked again here:

| output | file | against |
|---|---|---|
| `node bench/aggregate.mjs` | `aggregate.txt` | the per-cell table of `bench-2026-09-25.md`: same rows |
| `node bench/sensitivity.mjs` | `sensitivity.txt` | `sensitivity-reference.txt`: same table |
| `python3 docs/qc/2026-10-14_results-rescored/rules_2026_09_25.py bench/results/runs.csv` | — | `\| 1. ... \| 1240 \| 840 \| 81 \| 319 \|` |

## Rule 2, recomputed on the rescored `.json`

`../2026-10-14_results-rescored/` could not recompute it: the `.json` of the pages were those of 2026-09-28. Now they are rescored.

```
python3 docs/qc/2026-10-15_bench-rescored/rule2_2026_09_25.py          # the .json on disk
python3 docs/qc/2026-10-15_bench-rescored/rule2_2026_09_25.py 4207a12  # the .json of 2026-09-28
```

Both give the published figures: 437 cases with a mismatch nothing enforces, a refusal shown in 386, none in 51; row `437 | 36 | 8 | 393`.

## Other changes

- Each `.json` now carries the field's `baseline` (written by the runner since PR #7), and the new `rescore_id`.
- `bench/index.html`: one row changes (`openai/fr/guide/3`: 55/82 → 82/82, 39/66 → 66/66). The page said "read in Chromium on 2026-09-28" from a literal in `bench/build-index.mjs`; it now takes the day from `rescore.json`, and says 2026-10-15.

## Checks

`checks.log`: `npm run lint`, `npm test`, `npm run test:py`.
