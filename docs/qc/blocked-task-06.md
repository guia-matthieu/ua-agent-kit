# Task 6 — BLOCKED: the covered-field test's premise is false on the installed Playwright

**Status:** PR opened as a draft. Everything else in Task 6 is green
(`src/report.mjs`, `src/check-command.mjs` written verbatim from the plan;
3/4 tests of `tests/check-url.test.mjs` pass; CLI smoke of Step 6 matches its
Expected; `npm run lint` clean; full suite 36 tests / 35 pass / 1 fail). One
plan-given test fails. Per the rules I did not change it, and the behaviour
change it needs lives in `src/form-runner.mjs`, which is not in Task 6's file
list. The conflict needs a human/hub decision.

## The failing assertion

`tests/check-url.test.mjs`, second test (plan Task 6, Step 2, verbatim):

```js
test('a covered field is not-testable: not-interactable, within the fill timeout', async () => {
  const t0 = Date.now();
  const r = await checkForm(base + 'form-covered.html');
  assert.deepEqual(r.fields.email, { status: 'not-testable', reason: 'not-interactable' });
  assert.ok(Date.now() - t0 < 20000);
});
```

against the plan's own fixture (Step 1, verbatim) — a full-viewport
`position:fixed` consent overlay above the input — and the plan's own
Task 5 runner (merged, PR #14, verbatim).

## Real output

```
$ npm test -- tests/check-url.test.mjs
✔ URL mode records the final URL and title (6425.022375ms)
✖ a covered field is not-testable: not-interactable, within the fill timeout (2707.104416ms)
✔ a 404 is load-error, not zero failures (148.277834ms)
✔ markdown report carries the three categories and the not-tested block (6164.816416ms)

    AssertionError [ERR_ASSERTION]: Values have same structure but are not reference-equal:
    actual:   { status: 'tested', selector: '[data-ua-kit-field="email"]', kind: 'email',
                results: [ 33 x [Object] ], counts: { pass: 27, fail: 6, rewritten: 4, ... } }
    expected: { status: 'not-testable', reason: 'not-interactable' }
    operator: 'deepStrictEqual'

$ npm test          # full suite, official record
ℹ tests 36
ℹ pass 35
ℹ fail 1
ℹ duration_ms 24647.166708

$ npm run lint
> ua-agent-kit@0.1.0-dev lint
> eslint .
(no output — 0 problems)
```

## Cause, measured

The plan's Review Focus #4 states: "Playwright's `fill` times out" when a
consent overlay covers the field. That is the test's whole premise, and it is
false on the installed stack. Direct probe against `tests/fixtures/form-covered.html`
(Playwright **1.63.0** from the lockfile, `^1.50.0` in package.json; Chromium
153.0.8010.12, headless, as launched by `checkForm`):

```
fill        -> SUCCEEDED   (no hit-target check: fill focuses the element and
                            sets the value through the DOM; the overlay never blocks it)
click       -> FAILED: locator.click: Timeout 5000ms exceeded.  (hit-target check)
trial click -> FAILED: locator.click: Timeout 5000ms exceeded.  (same checks, no events)
focus       -> SUCCEEDED
value now: test@example.com
```

So `probeField`'s `loc.fill()` never throws on a covered field, the runner
types all 33 email cases through the consent overlay, and the field is
reported `tested`. Nothing in Task 6's own files can change that: the
detection belongs in `src/form-runner.mjs` (Task 5's file).

The Task 5 guards are unaffected and stay green (never-submit, never-post over
http, battery-only values, sanitised-guard, source scan).

## Options

- **A (recommended): make the runner detect non-interactability before filling.**
  In `probeField` (`src/form-runner.mjs`), before the fill loop, run
  `await loc.click({ trial: true, timeout: FILL_TIMEOUT_MS })` in a
  try/catch returning `not-testable: not-interactable` on timeout. A trial
  click performs the full actionability and hit-target checks **without
  dispatching any event** (measured above: it times out on the covered
  field), so it cannot violate the never-submit rules, and it also covers
  the `disabled` half of Review Focus #4, which `fill` alone misses on this
  version. Cost: touches a Task 5 file in Task 6 (needs a reviewer's
  agreement per the file-list rule); worst case adds the actionability
  wait (~5 s) per non-interactable field.
- **B: change the fixture, not the runner** — replace the overlay with a
  `disabled` input; `fill` fails the Enabled check and the current runner
  already reports `not-interactable`. Cost: the consent-overlay case that
  Review Focus #4 explicitly names would no longer be tested; the runner
  would still type through real overlays.
- **C: drop the covered-field expectation** — accept `tested` through
  overlays. Cost: weakest against the design's stated intent (a page whose
  field is covered must be reported `not-testable`, not probed by typing
  through a banner the user never consented past).

Everything else in Task 6 (Step 6 CLI smoke) matches the plan's Expected —
`ua-kit check tests/fixtures/form-legacy-regex.html --lang fr` prints the
Markdown report with the French fixture's failures, including the intended
`email-control-04` apostrophe failure documented in the Task 3 resolution.

## Resolution (hub review, 25/09)

Option A applied by the reviewer in `src/form-runner.mjs` (`probeField`): a trial click before the fill loop, `not-testable: not-interactable` on timeout. Playwright's own type docs: `trial` "only performs the actionability checks and skips the action". The plan's Task 5 block and Review Focus #4 are updated to match. Full suite 36/36, lint clean. The blocked note stays as the record of why the runner does this.
