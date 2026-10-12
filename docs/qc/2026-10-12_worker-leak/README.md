# Worker leak — no shared worker, nothing on its way when a context closes, every page scored again

| What | File | Output |
|---|---|---|
| every page of the two benches scored again (copy of `../2026-10-11_runner-measurement/rescore-all.mjs`) | `rescore-all.mjs` | `rescored/` (the log, `rescore-all.log`, is ignored by git: every page `done`, 0 runner error in each set) |
| rows of PR #9's scoring (runner of `49a5228`) against these | `compare.py` | printed |

Facts met on the way: `../notes-worker-leak.md`.

## The changes (`src/form-runner.mjs`)

- **No shared worker**: Chromium is launched with `--disable-shared-workers` and the init script deletes
  `SharedWorker`. Its requests never reach the route guard: on `main` a page sent the typed values out by POST on every
  case, in submit mode and in URL mode.
- **Nothing on its way when a context closes** (`stopWorkers`, before every reload and before the browser closes):
  each worker is closed from inside while the guard holds it, the page goes to `about:blank`, and the guard must
  then have been handed no request for 100 ms. A request the guard was still handling when its context closed went
  out, and a page that keeps starting workers got past closing them one by one.

## Measured on the benches

`rescored/SCORED-WITH.txt`: commit `f217d4b`, `src/` not modified, 2026-10-12 11:46 → 12:58 UTC (72 min 42 s, four
browsers; 71 min 11 s for the scoring of 2026-10-11).

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

The six files are byte for byte those of the scoring of 2026-10-11 and of PR #9 (`rescored/SHA256SUMS`, the same
checksums): they are not committed a third time. No bench page starts a worker; the blank page and the quiet wait
before each close change no verdict.
