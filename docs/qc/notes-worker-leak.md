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
- Navigating the page to `about:blank` before closing the context does not close that window (4 leaks in 32).
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
