# Notes — branch `fix/worker-leak` (workers and the route guard)

Facts measured on 2026-10-12, Chromium 153 (headless shell 1243), Playwright 1.63.0, macOS arm64.

- A shared worker's requests never reach `context.route`: a page that starts one from a blob and feeds it the field's
  value sends that value out after load, by GET and by POST, on every case. On `main` (`9eb93db`), one run of 6
  email cases: 228 POST requests reached a local server, each carrying a typed value (baseline, second value and
  every case). This breaks the rule "nothing but GET/HEAD after load", in every run, not as a race.
- `--disable-shared-workers` (Chromium launch switch) leaves `typeof SharedWorker === 'undefined'` in the top
  document, in an iframe present at load and in one created by script, over http. An init script that deletes the
  constructor gives the same result in Chromium; it is kept for the other engines, where the switch does not apply.
  Firefox and WebKit are not installed here: not measured.
- A dedicated worker's requests do reach the route guard while its document lives (0 leaks in 10 runs at rest). A
  request it sends while its document goes away (context closed, or browser closed after the last case) reached the
  server without passing through the guard: logged with a timestamp, no `route` call for it. On `main`, page
  `q2-worker-timer` of the review of PR #10: 5 runs in 32 leaked with 4 runs in parallel; a page sending 20 requests
  per timer tick, 4 runs in 6 at rest.
- Navigating the page to `about:blank` and closing the context at once does not close that window (4 leaks in 32;
  with a wait for the guard to go quiet it does, see below).
  Closing each worker from inside (`worker.evaluate(() => globalThis.close())`) while the guard still holds it, then
  waiting for its `close` event, does: 0 in 64 runs with 4 in parallel; the worker is gone 4 to 85 ms after.
- A worker started by another worker (nested) did not leak in 3 runs, with or without the change.
- A page sending 20 requests per 0 ms tick, each aborted through the route handler, slows the runner past its 30 s
  locator timeout on a loaded machine, on `main` as on the branch. The test page sends 5 every 2 ms.
- None of the 309 bench pages (`bench/runs`, 255; `bench/results/generations`, 54) starts a worker or a shared
  worker: the change cannot move a row of the rescore of 2026-10-11, which was not run again.
- The shared worker leak is the same in URL mode (`checkForm` on an http target with its defaults, submit off, the
  way a live site is checked): on `main`, 170 POST requests per run of 6 email cases carried the typed values; on
  the branch, 0 (`worker-leak/probe-urlmode.mjs` of the review harness, 2 runs each).

## After the review of PR #11 (`9b14ba9`)

- A page that starts a new worker every 20 ms (ten alive) got past "close each worker from inside": 24 to 41 POSTs
  per run at `9b14ba9`, 35 to 54 on `main`. With every request numbered, 19 of 26 leaked POSTs had reached the route
  guard, which aborts them, and all arrived within 15 ms after the context began to close: a request the guard is
  still handling when its context closes goes out. Freezing the page first (`Page.setWebLifecycleState`, frozen)
  or `context.setOffline(true)` changed nothing (49 to 67, 44 to 50); freezing does not stop the workers' requests.
- Going to `about:blank` and then waiting until the guard has been handed no request for 100 ms stops it: 0 in 3
  runs, the flow stopping ~100 ms after the blank page, no worker left. On its own it let 1 or 2 GETs through on
  lighter pages (3 workers made at load, a worker in a cross-origin iframe) that closing each worker from inside
  stops; the two together: 0 on every page of the review, 3 runs each.
- `workersStopped` counted a worker once per round of listeners (25 for 9 workers on a busy page); it now counts
  each worker once. With 6 cases and one worker per document it reads 9: one per reload and one at the final close.
- A busy worker never answers `close()`: the wait per worker is 300 ms instead of 1000 ms, in one round, since the
  blank page ends whatever is left.
- Not in this branch: an `audioWorklet` module added after load fetched its module URL, carrying the typed value,
  without going through `context.route` (8 GETs per run, on `main` and here). GET only; it needs its own change.
