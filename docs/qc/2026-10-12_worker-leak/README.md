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
- **The contexts that hold typed values have no network**: in submit mode every context opened after load (one per
  reload, where the values are typed) gets a proxy nobody listens on, loopback included. Its reloads are answered from
  the first load by the route guard, so it needs none. What the guard misses or lets go fails there: a request still in
  the guard when its context closes, a worker's request while its document goes away, a keepalive or beacon, an
  audio worklet module. An earlier attempt (closing workers, a blank page and a quiet wait before each close) was
  dropped after the second review: the blank page let the document's keepalive and beacon POSTs out.

## Measured on the benches

`rescored/SCORED-WITH.txt`: commit `7258c9e`, `src/` not modified, 2026-10-12 14:28 → 15:33 UTC (65 min 27 s, four
browsers; 71 min 11 s for the scoring of 2026-10-11). A first run at `7258c9e` was cut off by the end of a session
at 111 pages of 309; it had retried 5 pages under load (`attempt 1 shaky`), each of which scored alone the same on the
branch and on `main` (3 runs, every field `tested`). The complete run took no second attempt.

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
checksums): they are not committed a third time. Every reload of every page ran in a context with no network; no verdict changed.
