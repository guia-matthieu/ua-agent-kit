# Runner measurement — a context per reload, findings 3, 4, 6, 7 of the review of 09/10, every page scored again

| What | File | Output |
|---|---|---|
| every page of the two benches scored again (copy of `../2026-10-09_finding-5/rescore-all.mjs`) | `rescore-all.mjs` | `rescored/` (the log, `rescore-all.log`, is ignored by git: every page `done`, 0 runner error in each set) |
| rows of PR #9's scoring (runner of `49a5228`) against these | `compare.py` | printed |

Facts met on the way: `../notes-runner-measurement.md`.

## The changes

- **A context per reload** (`src/form-runner.mjs`, `fresh`): each reload of the runner closes the browser context and
  opens a new one, armed with the same guards before its first request. IndexedDB, Cache Storage, history, cookies,
  localStorage and sessionStorage start empty in every engine, on `file://` as on http (review of PR #9, see
  `../2026-10-09_finding-5/README.md` § Limits). Closing the old context first ends its document and its timers,
  which could write storage again between the clear and the reload (finding 6). The `about:blank` detour for a URL
  with a fragment is gone: a new page loads it.
- **Finding 4** (`src/verdict.mjs`, `decide`): a domain case typed with `https://` in front (decision D1) is judged as
  a URL once the page rewrote it; it was judged as a domain, which no value with a scheme is, so a cleaned value read
  `fail` instead of `rewritten-sanitized`.
- **Finding 3** (`src/form-runner.mjs`, `probeField`): a fill that fails after the first case keeps the cases measured;
  the ones left are `not-testable`, reason `not-interactable`, as for a failed reload.
- **Finding 7** (`package.json`): `playwright` `~1.63.0`, the version the network guards were measured on.

## Measured on the benches

`rescored/SCORED-WITH.txt`: commit `07fdb08`, `src/` not modified, 2026-10-11 22:06 → 23:17 UTC (71 min 11 s, four
browsers; 50 min 11 s for the scoring of PR #9: a new context costs about 38 ms more than a reload in place,
`../notes-runner-measurement.md`).

The reference is PR #9's scoring, `49a5228`. Between it and `main` (`8276f6b`), `src/` changes only comments of
`form-runner.mjs` and the Markdown report (`git diff 49a5228 8276f6b -- src`).

Result of `python3 docs/qc/2026-10-11_runner-measurement/compare.py`:

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

The six files of `rescored/` are byte for byte those of `../2026-10-09_finding-5/rescored/` (`cmp`), so they are not
committed a second time: `rescored/SHA256SUMS` holds their checksums, the same as the files there.

- **Context per reload**: 0 row. No page of the two benches calls `indexedDB`, `caches.open` or reads
  `history.length` (`grep` on `bench/`), and none lost a verdict to a timer writing storage.
- **Finding 4**: 0 row. 402 rows have its shape (a domain reject case typed with `https://`, rewritten, `fail`), but
  the page did not clean the value into a valid URL. On the page checked, `deepseek-v4-flash/fr/guide/3` of the run
  of 2026-10-06, the field is empty after the accepted submit (`observed: ""` for `domain-guard-01`, `-03` and
  `domain-boundary-label64-01`): a reset, not a cleaning, and `fail` stands. Had any row held a cleaned valid URL, it
  would have moved to `rewritten-sanitized` here.
- **Finding 3**: 0 row. No field and no row of the reference is `not-interactable`.

## Limits

- Four tests whose fixtures count their documents in IndexedDB to change after some reloads run with the test-only
  option `reloadInPlace`, the reload of `main`: what they check (a page that changes, or stops bringing a new
  document) can no longer be built from a page alone, since nothing a page stores outlives a reload.
- The guards that nothing leaves the page during a reload are tested with the old document still running under the
  reload lock (`reloadDelayMs`), before its context is closed.
