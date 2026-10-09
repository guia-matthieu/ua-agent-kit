# Review of 09/10 — findings 1, 2 and 5: facts measured

Findings 1 and 2 are corrected on this branch. Finding 5 is not: its correction was withdrawn (below), and
`fillCompanions` fills every empty field as on `main`.

## Finding 5 — hidden fields filled by `fillCompanions`, counted on the two benches before any change

Each page loaded in Chromium (network cut, `file://` only), `findFields` run, then every field of the probed
field's form that `fillCompanions` (runner of `38d0abf`) would fill was checked for visibility.
Script: `scan-hidden.mjs`, kept outside the repo with the review harness (`guia/tasks/ua-kit-review-2026-10-09_harness/`).

| Pages | Count | With a hidden field filled |
|---|---|---|
| `bench/results/generations` (bench of 25/09) | 54 | 16 |
| `bench/runs/2026-10-06_state-catalogue/generations` | 126 | 0 |
| `bench/runs/2026-10-06_state-catalogue/generations-durci` | 122 | 0 |
| `generations-durci-ecartees`, `truncated-64000` (not scored) | 9 | 0 |

- No anti-spam trap on any page: no field off screen, no "leave empty" text, no `honeypot` word in the source.
- 13 of the 16 pages have `<input type="hidden">` fields named after the email or website (`email_ascii`,
  `websiteNormalized`, …), where the page writes the A-label form of the value on submit. The runner filled
  them because their name matches `mail` or `site|web|url`. The page clears and rewrites them itself before reading them.
- The 3 others (`open-weight/es/no-guide/2`, `open-weight/es/no-guide/3`, `open-weight/fr/no-guide/3`) are visible
  fields of a form that fades in at load (`opacity` 0 → 1): at fill time their opacity is 0. This is why the
  withdrawn correction did not look at opacity.
- These 16 pages scored with the runner of `38d0abf` and with the first version of the withdrawn correction: 0 result
  lines change (`cmp16.mjs`, same folder).

## Seen while testing finding 5, not corrected here

`src/field-finder.mjs` counts a field as visible when its box has a size and it is not `display:none` /
`visibility:hidden`. A trap placed off screen (`left: -9999px`) passes that test. On the honeypot fixture of the withdrawn correction (`form-honeypot.html`, in `e8c230b`)
the trap `name="website"` is picked as the website field; the trial click then times out after 5 s and the field is
reported `not-testable: not-interactable`. A page whose trap comes before its real website field in the document would
have its real field untested. No page of the two benches has such a trap (above).

## Finding 5: two corrections tried, both rejected, withdrawn

Two fresh-context reviews, then a second opinion (another model, fresh context). Fixtures of the reviews, outside the
repo with the review harness (`guia/tasks/ua-kit-review-2026-10-09_harness/reviews/`: `review-pr8/`, `review-pr8-2/`,
`opinion-pr8/`, `review-pr8-3/`); the fixtures of the withdrawn correction are in `fix5-withdrawn/` there.

- First rule (`e8c230b`): a text field not rendered, of no size once cut by every ancestor hiding overflow, or off
  screen, is left empty. Review 1: a visible required name below the fold of an app shell, or in a form sliding in
  at load, was left empty; on a page that stops at its first error every decoy read `accepted/fail` (`38d0abf`:
  `rejected-script/pass`).
- Second rule (`2173901`): finite animations finished first; an ancestor hides only if it hides overflow and has
  no size itself. Review 2, same failure on: a `position: fixed` or `absolute` form under a 0-height
  `overflow: hidden` box (not clipped), a `display: contents` wrapper, animations run by `requestAnimationFrame`,
  a timer or inside a shadow root, fields a person opens (closed `<details>`, wizard step, accordion); `finish()`
  runs the page's `animationend` handlers.
- Both rules changed 0 row of the two benches (full scorings of `e8c230b` and `2173901`, `2026-10-09_review/`).
  A rule on what a person sees swaps a false acceptance on trap pages (none measured) for false acceptances on
  layouts each review built in minutes.
- Second opinion: choosing one fill from what the page says of `NO_VALUE` is one more rule. `x` shows that some
  check runs, not the whole check: a page that checks for `@`, then the name, then a strict pattern, and its mirror
  (checks `@` before the trap) each defeat one choice. Proposed for a PR of its own: probe the field with `main`'s
  fill and with the doubtful fields (not `required`, not `type=hidden`) left empty, keep a verdict only when both
  give it, report the others `not-testable`. Every verdict then given is `main`'s; coverage can only be lost, and a
  full scoring counts how much.

Known limit until then: a page that drops without a word a submit whose trap field is filled reads every value as
accepted.

## Seen in the reviews, not changed: a page that posts every value

A page whose handler sends a POST for every value and validates only on its server was `runner-error` before this
branch; it is now scored, and every value reads `accepted` (a decoy is a `fail`). A GET form that leaves on every
submit already reads so. Reporting both `not-observed` when a navigation was answered during the case is a choice of
scoring, left for a change of its own. `postNavigationsAnswered` is in the debug output (`keepPage`) only.
