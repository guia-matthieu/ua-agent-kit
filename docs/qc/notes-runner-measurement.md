# Notes — branch `fix/runner-measurement` (findings 3, 4, 6, 7 and IndexedDB)

Facts the handoff of 09/10 did not foresee.

- Clearing IndexedDB between cases breaks every fixture that counts its documents in IndexedDB to change after a
  number of reloads, whatever the way of clearing: `form-changes-on-reload`, `form-stale-on-reload`,
  `form-stale-before-second`, `form-readonly-for-baseline` (4 tests failed, `npm test` of `df50f5c` without the option).
  Those tests check what the runner does once `fresh` fails, not how storage is reset. They get the test-only option
  `reloadInPlace` (agreed with Matthieu on 2026-10-11), which reloads in the same context as `main` did. Fixtures and
  assertions are unchanged.
- `context.storageState({ indexedDB: true })` returns `{"cookies":[],"origins":[]}` for a `file://` page
  (Playwright 1.63.0): carrying storage from one context to the next was not an option for those tests.
- `form-counts-unmarked-submits` (`tests/baseline-refused.test.mjs`) also counts across documents in IndexedDB. It
  stays green without the option: with a context per reload no submit can land in a document the runner has not
  marked, so the test now holds by construction.
- `history.length` grows on `main` only for a page with a fragment (the `about:blank` detour): measured 2 after five
  loads of the same URL, 6 after two detours. `form-reads-history-length.html` sets a fragment for that reason.
- Cost of a new context per reload, Chromium, `file://`, 50 runs: 3.6 ms for a `goto` in place, 41.7 ms for close +
  new context + guards + `goto`.
- Mutation check: each new test was run against `main` (`8276f6b`, worktree with the test and fixture copied in) and
  fails there: the three `tests/fresh-context.test.mjs` tests (3 runs of 3), the finding 4 test of
  `tests/verdict.test.mjs`, the finding 3 test of `tests/form-runner.test.mjs`.
- Review of PR #10 (R1): the first fix of finding 4 judged a domain case typed as a URL only as a URL, so a page that
  cleaned `https://exa mple.com` down to `example.com` read as fail where `main` read rewritten-sanitized. The cleaned
  value now passes if it is valid as the case's kind, or as a URL when a URL was typed. The added assertion fails on
  `ebab855`.
- Review of PR #10 (T1): in submit mode a reload is answered from the first load's recording, so neither storage (a
  new context) nor a counting server can make a page change after a number of reloads. The two tests on the default
  path use a page that changes once a time in its query string has passed; one run of 8 email cases takes about 6 s,
  and that time is moved (500 to 7000 ms) until it falls inside the loop. Against `main` the read-only test fails
  (no deadline keeps a measured case), the page-changed one passes (that handling was already right there).
