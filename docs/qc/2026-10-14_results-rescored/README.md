# Published results against the reference scoring (2026-10-14)

Facts and commands, for the rewriting of the published results. Nothing here changes a published file: `bench/results/RESULTS.md` is human-owned, and the files of `bench/runs/2026-10-06_state-catalogue/` are as they were published.

## The reference scoring

`docs/qc/2026-10-09_finding-5/rescored/`: every page of the bench of 2026-09-25 and of the run of 2026-10-06, scored at `49a5228`. The scorings at `07fdb08` (`../2026-10-11_runner-measurement/`) and at `7258c9e` (`../2026-10-12_worker-leak/`) gave the same six files, byte for byte:

```
cd docs/qc/2026-10-09_finding-5/rescored && shasum -a 256 -c ../../2026-10-12_worker-leak/rescored/SHA256SUMS   # 6 × OK
```

After `7258c9e`, `src/` changed for WebRTC (`9a6d635`, `b83419f`) and in comments (`da49011`); no bench page uses WebRTC (`../notes-worker-leak.md`). The run of 2026-10-13 was scored at `8175547` and is not concerned.

The six untracked files of `../2026-10-09_review/rescored/` are those of `../2026-10-07_baseline-refused/rescored/` byte for byte (`cmp`), not those of the reference: four of them differ from it.

## Bench of 2026-09-25 (`bench/results/`)

27 rows change, all on one page and one field: `openai/fr/guide/3`, website, `fail` → `pass`. Since PR #7 a text field that refuses the bare domain and takes it with `https://` is probed as a field of type `url` (`baseline.schemeRequired`, decision D1 extended): the 27 valid bare domains of that page are typed with `https://` and pass.

| output | command |
|---|---|
| `bench-2026-09-25.md`: per model, per page, per cell, per class, where the failures are; a cell that differs reads `published → reference` | `python3 docs/qc/2026-10-14_results-rescored/bench_2026_09_25.py` |
| `sensitivity-reference.txt`: the table of the two rules, on the reference | `bench/sensitivity.mjs` run on a copy of the tree whose `bench/results/runs.csv` is the reference CSV |
| the row of rule 1 in "What the two rules changed" | `python3 docs/qc/2026-10-14_results-rescored/rules_2026_09_25.py [runs.csv]` |

Each script given `bench/results/runs.csv` gives back the published numbers (checked for every row of the tables; rule 1: 1 209, 814, 81, 314).

What changes in `RESULTS.md`, in its order:

| place | published | reference |
|---|---|---|
| Setup, *Scoring* | `9fc1cc7`, pass of 2026-09-28 | `49a5228` (same files at `07fdb08` and `7258c9e`) |
| Rule 1, "This rule looks at the type of the field, not at what the page asks for. A page that asks for a full URL in a text field does not get the `https://`" | — | no longer true since PR #7: such a field gets it when it refuses the bare domain and takes it with `https://` |
| Rule 1 row: cases, fail→pass, pass→fail, same | 1 209, 814, 81, 314 | 1 240, 840, 81, 319 (31 of the cases are in a text field) |
| "850 valid values go from fail to pass and 89 invalid values from pass to fail. The other 3 327" | 850, 89, 3 327 | 876, 89, 3 301 |
| Sensitivity, `openai` and all models, rows *rule 1 only* and *both rules* | 94.7 %, 97.7 %, 18/27 | 98.3 %, 98.9 %, 19/27 |
| Sensitivity, last row (the page outside rule 1 counted as passing) | differs from *both rules* | same as *both rules*: the page is under rule 1 |
| "higher under every combination, by 10.6 to 12.6 points" | 10.6 to 12.6 | 10.6 to 13.8 (rule 1 only: 85.1 → 98.9) |
| Per model, `openai` guide | 699 / 39, 94.7 %, 567/594 | 726 / 12, 98.4 %, 594/594 |
| Per model, all models guide | 2163 / 51, 97.7 %, 1750/1782 | 2190 / 24, 98.9 %, 1777/1782 |
| Per page, `openai` guide | 8/9, 5/9 | 9/9, 6/9 |
| Per cell, `openai` fr guide; pooled guide | 215 / 31; 2163 / 51, 97.7 % | 242 / 4; 2190 / 24, 98.9 % |
| Per class, `openai` g | 7 classes below 100 % | all 7 at 100 % (`bench-2026-09-25.md`) |
| Where the failures are, `openai` g website, valid value refused; total | 27; 39 | 0; 12 |
| "86.4 % to 99.7 %, 85.9 % to 94.7 %, 88.5 % to 98.6 %. [...] 3 to 8, 0 to 8 and 5 to 6" | 85.9 → 94.7 %, 0 → 8 | 85.9 → 98.4 %, 0 → 9 |
| "Every `ascii-tld-long` case passes but 4, and those 4 are the bare domains typed into the page of the next item" | 4 fail | every case passes |
| "One page is outside rule 1." (whole item, and "six classes are lower with the guide than without it for that model") | the page's 27 failures | the page passes its 48 website cases (39 valid, 9 invalid); no class of `openai` is lower with the guide |

Unchanged: invalid values refused (413/432 and 325/432), the `rewritten` column and "Value held by the field after the test", "What the pages are made of", the rule 2 row (its cases are email fields; not recomputed, the `.json` of the pages are those of the published scoring).

## Run of 2026-10-06 (`bench/runs/2026-10-06_state-catalogue/`)

| output | command |
|---|---|
| `run-2026-10-06-RESULTS-reference.md`: the run's own `summary.py` on the reference CSV files | `python3 docs/qc/2026-10-14_results-rescored/run_2026_10_06.py` |

`python3 bench/runs/2026-10-06_state-catalogue/summary.py` gives back the published `RESULTS.md` byte for byte.

Rows whose outcome differs from the CSV files of the run's folder:

| file | rows | changed | pass → fail | fail → pass | other |
|---|---|---|---|---|---|
| `runs-standard.csv` | 10 012 | 844 | 465 | 370 | 9 fail → not-testable |
| `runs-fr.csv` | 7 572 | 494 | 322 | 169 | 3 fail → not-testable |
| `runs-durci-standard.csv` | 9 764 → 9 717 | 1 421 | 791 | 571 | 22 pass and 15 fail → not-testable, 22 not-observed → pass or fail |
| `runs-durci-fr.csv` | 7 384 → 7 346 | 868 | 525 | 318 | 3 pass and 8 fail → not-testable, 14 not-observed → pass or fail |

The hardening files lose rows because one field is now not testable as a whole: the website field of the hardened `mistral-medium-3-1/es/guide/1`, reason `baseline-ambiguous` (PR #7), one row instead of 48 and 39.

Claims of the run's `README.md`, *What the tables show*:

| claim | published | reference |
|---|---|---|
| the five geoTLDs in ASCII accepted on every first-draft page | true | true |
| no first-draft page passes the 62 cases; of 122 testable, those accepting at least one guard | 0; 120 | 0; 119 |
| pages starting to refuse a valid value at hardening, without / with the guide | 17 of 60 / 3 of 59 | 37 of 60 / 9 of 59 |
| values lost at hardening, without / with the guide | 103 / 52 | 305 / 113 |
| ASCII geoTLD values refused at hardening | 8, all without the guide | 16: 11 without the guide, 5 with it (`ministral-8b`) |
| "For one code model the result changes with the language of the prompt; some chat models refuse them without the guide and accept them with it" | — | not recomputed: to be read again in `run-2026-10-06-RESULTS-reference.md` |
