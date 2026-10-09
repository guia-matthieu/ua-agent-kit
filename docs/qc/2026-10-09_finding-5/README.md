# Finding 5 of the review of 09/10 — the double probe, every page scored again

| What | File | Output |
|---|---|---|
| every page of the two benches scored again (copy of `../2026-10-09_review/rescore-all.mjs`) | `rescore-all.mjs` | `rescored/` (the log, `rescore-all.log`, is ignored by git: every page `done`, 0 runner error in each set) |
| rows of PR #7's last scoring (runner of `85d96fa`, unchanged by PR #8) against these | `compare.py` | printed |

## The rule

`fillCompanions` fills the other fields of the form as on `main`. A field it would fill that is neither `required`
nor of type hidden is doubtful: it may be a trap a person never sees. When the form offers at least one, the probed
field is probed a second time with the doubtful fields left empty. A case keeps its verdict when the two probes give
the same verdict and outcome; otherwise it is `not-testable`, reason `fill-dependent` (or the second probe's own
reason when that probe could not run the case). When the second probe does not test the field at all, or reads it
with another kind, the field is `not-testable`, reason `fill-dependent`. Every verdict given is the first probe's,
which is `main`'s: coverage can only be lost.

Fields of type hidden are filled in both probes: 13 pages of the bench of 25/09 keep there the A-label copy of the
value, which the page clears and writes again on submit (`../notes-review-2026-10-09.md`).

## Measured on the benches

`rescored/SCORED-WITH.txt`: commit `49a5228`, `src/` not modified, 2026-10-09 17:05 → 17:55 UTC (50 min 11 s, four
browsers; 32 min 44 s for the scoring of PR #8: the second probe runs on every form with a doubtful field).

Result of `python3 docs/qc/2026-10-09_finding-5/compare.py`:

```
bench-2026-09-25-runs.csv: 4428 rows before, 4428 after, 0 changed, 0 gone, 0 new
runs-standard.csv: 10012 rows before, 10012 after, 9 changed, 0 gone, 0 new
    deepseek-v4-flash/en/no-guide/3/email 6
    deepseek-v4-flash/en/no-guide/3/website 3
    fail -> not-testable: 9
runs-fr.csv: 7572 rows before, 7572 after, 3 changed, 0 gone, 0 new
    deepseek-v4-flash/en/no-guide/3/email 2
    deepseek-v4-flash/en/no-guide/3/website 1
    fail -> not-testable: 3
runs-durci-standard.csv: 9717 rows before, 9717 after, 37 changed, 0 gone, 0 new
    deepseek-v4-flash/en/no-guide/3/email 17
    deepseek-v4-flash/en/no-guide/3/website 20
    fail -> not-testable: 15
    pass -> not-testable: 22
runs-durci-fr.csv: 7346 rows before, 7346 after, 11 changed, 0 gone, 0 new
    deepseek-v4-flash/en/no-guide/3/email 6
    deepseek-v4-flash/en/no-guide/3/website 5
    fail -> not-testable: 8
    pass -> not-testable: 3
rows changed in all: 60
fields tested before / after: 589 / 589
pages that took more than one attempt: 0
```

- Coverage lost: 60 rows of 39 075, on one page of the first draft and one of the hardened run
  (`deepseek-v4-flash/en/no-guide/3`), both fields, both batteries. No field lost whole. Every move is to `not-testable`.
- The 16 pages of the bench of 25/09 that have a hidden field filled: 0 row changed.

## Why that page moves: it is not a trap

Four visible fields, none `required`; the page checks all four in its submit handler, then gives the focus to the
first invalid one, and each field's `focus` handler clears that field's error. With every field filled (first probe,
`main`), a refused email is the first invalid field: it gets the focus, its error is cleared, nothing is shown, and
the value reads `accepted` (`a@@b.com`, `plainaddress`: `fail`; `用户@例子.中国`, which the page's ASCII pattern
refuses: `pass`). With the name left empty (second probe), the name gets the focus and the email's error stays: the
same values read `rejected-script`. The success banner, which the page shows only when every field is valid, is not
read by the runner in either probe.

So the 60 rows were `main`'s readings of a page whose own focus handler hides its refusal; the double probe drops them
rather than replacing them.

## The fixtures of the reviews

`cmp.mjs` (kept outside the repo with the review harness, `guia/tasks/ua-kit-review-2026-10-09_harness/`) scores each
fixture with the runner of `main` (`d72aa0c`) and of this branch, and counts the verdicts this branch gives that
`main` does not: **0** on 29 fixtures. Email field, `pass/fail/not-testable`, valid values then decoys:

| Fixture | `main` | this branch |
|---|---|---|
| `form-honeypot.html` (traps off screen, not rendered, clipped, of no size; in `tests/fixtures/`) | 27/0/0 · 0/7/0 | 17/0/10 · 0/3/4 |
| the same with a trap of type hidden (`fix5-withdrawn/form-honeypot.html`) | 27/0/0 · 0/7/0 | 27/0/0 · 0/7/0 |
| `form-app-shell.html`, `form-slides-in.html` (in `tests/fixtures/`) | 17/10/0 · 4/3/0 | 17/0/10 · 0/3/4 |
| review 2 (`a-details` … `n2-timeout-reveal`, 12 pages), review 1 `e1`, `e2` | 17/10/0 · 4/3/0 | 17/0/10 · 0/3/4 |
| second opinion `f1-native-details` | 14/13/0 · 7/0/0 | 14/6/7 · 7/0/0 |
| second opinion `f2-shallow-x` | 17/10/0 · 4/3/0 | 17/0/10 · 1/3/3 |
| second opinion `f3-honeypot-after-at` | 27/0/0 · 1/6/0 | 17/0/10 · 1/3/3 |
| review 1 `v1` … `v9` (8 pages with an email field, no submit handler) | 27/0/0 · 0/7/0 | 27/0/0 · 0/7/0 |

The 3 decoy `fail` left on the trap pages are values the page's own pattern takes (`user@example..com`, `us er@…`,
`user@exa mple.com` against `/^[^@]+@[^@]+\.[a-z]{2,4}$/`): both probes read them accepted.

## Limits

- A trap of type hidden is filled in both probes: a page that drops a submit when one is filled still reads every value
  as accepted (second row of the table above).
- A trap marked `required` is filled in both probes.
- A visible field a person must fill and that the page checks in script only, without `required` (the review layouts
  above, and the page measured on the bench), costs every case on which the two probes differ.
