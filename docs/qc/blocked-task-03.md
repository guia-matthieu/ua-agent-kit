# Task 3 — BLOCKED: one plan test contradicts the merged battery

**Status:** PR opened as a draft. Everything else in Task 3 is green (11/11
reference tests, 4/5 score tests, lint clean, CLI works). One plan-given test
fails. Per the rules I did not change it, and `battery/cases.json` is not in
Task 3's file list. The conflict needs a human/hub decision.

## The failing assertion

`tests/score.test.mjs`, second test, last line:

```js
assert.ok(!r.failingClasses.includes('control'), 'control must pass');
```

with the validator under test defined in the same plan-given test:

```js
const legacy = regexValidator('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$');
```

## Real output

```
$ npm test -- tests/score.test.mjs
  AssertionError [ERR_ASSERTION]: control must pass
      at TestContext.<anonymous> (file:///.../tests/score.test.mjs:23:10)

✔ reference email validator scores ua-pass
✖ ASCII-only regex with a 2-4 letter TLD cap scores ua-fail with the expected classes
✔ a validator that accepts everything scores accept-all
✔ a validator that throws is counted as rejecting
✔ byClass totals add up to total
```

## Cause, measured

The legacy regex's local-part class `[a-zA-Z0-9._%+-]` does not include the
apostrophe. The battery classifies `o'neill@example.ie` (atext includes `'`,
RFC 5322 §3.2.3) as **control**:

```
$ node --input-type=module -e '…legacy regex over email controls…'
email-control-01       regex-accept marie.dupont@example.com
email-control-02       regex-accept Marie.Dupont@Example.COM
email-control-03       regex-accept marie+newsletter@example.org
email-control-04       regex-REJECT o'neill@example.ie
email-control-05       regex-accept prenom.nom@sub.example.co.uk
email-control-06       regex-accept contact@2cv.example.com
```

So the scorer is correct: the legacy regex genuinely fails a control case,
`control` appears in `failingClasses`, and the test's expectation is false
against the battery as merged.

## Why this is a conflict, not a bug in my implementation

- `score()` and `regexValidator()` are verbatim from the plan (Step 6) and the
  other four score tests pass.
- The failing expectation and the regex are both inside the plan-given test
  (Step 5) — no implementation freedom can change the outcome.
- The battery is Task 2's merged, human-reviewed data; the 24/09 fresh-context
  review (commit ddd2380) adjusted two contestable guards and left
  `email-control-04` in `control`.

## The two resolutions (my recommendation first)

**A. Keep the battery; change the test's expectation (test change, not mine to
make).** The battery's classification is defensible and arguably the kit's
point: an ordinary Irish surname address is exactly what legacy validators
wrongly reject, so "control must pass a legacy regex" is false by design. The
assertion could become `assert.ok(r.failingClasses.includes('control'))` with a
comment, or move `email-control-04`'s id into the expected-failure list. This
preserves the reviewed data; Task 4 (Python) would need the same one-line
adjustment when it transcribes this test.

**B. Reclassify `email-control-04` out of `control` (data + schema change,
Task 2 territory).** Requires a new class in the schema enum and a check that
Task 2's class-count test still holds (control would still have 5 cases ≥ 3).
This weakens the demo: the legacy regex would then pass every control, hiding
the apostrophe rejection from the headline classes.

Either way, `tests/score.test.mjs` line 23 or `battery/cases.json` must change
— both outside what I may touch to make a plan test pass.
