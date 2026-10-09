# Review of 09/10 — findings 1, 2 and 5: facts measured

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
  correction does not look at opacity.
- These 16 pages scored with the runner of `38d0abf` and with this branch: 0 result lines change (`cmp16.mjs`, same folder).

## Seen while testing finding 5, not corrected here

`src/field-finder.mjs` counts a field as visible when its box has a size and it is not `display:none` /
`visibility:hidden`. A trap placed off screen (`left: -9999px`) passes that test. On `tests/fixtures/form-honeypot.html`
the trap `name="website"` is picked as the website field; the trial click then times out after 5 s and the field is
reported `not-testable: not-interactable`. A page whose trap comes before its real website field in the document would
have its real field untested. No page of the two benches has such a trap (above).

## Review of PR #8 (fresh context, REJECTED) and what changed

- The first rule cut each field by every ancestor that hides overflow, and judged it off screen at fill time. It
  skipped visible fields in two layouts the reviewer wrote: a form below the fold of an app shell (outer box of the
  viewport's height, `overflow: hidden`, a `<main>` inside that scrolls) and a form sliding in at load
  (`translateX(-120%)`). On a page that stops at its first error the empty name read as a refusal: `email-guard-01`
  `accepted/fail` where `38d0abf` gave `rejected-script/pass`. Both pages are now tests (`form-app-shell.html`,
  `form-slides-in.html`), failing on the first rule.
- Now: animations with an end are taken to it before the other fields are filled (one that never ends is left
  running); an ancestor hides the field only when it hides overflow and has no size itself (≤ 1 px) on that axis.
  The next step of an `overflow: hidden` carousel is filled again.
- Traps still filled (reviewer's fixture, run on the new rule): `clip-path: inset(100%)`; `position: absolute;
  clip: rect(0 0 0 0)` at full size; `opacity: 0`; far right (`left: 200vw`) or far below; `z-index: -1`.
  Skipped: `transform: scale(0)`, `display: none`, `visibility: hidden`, no size, off screen left or above,
  inside a wrapper of 1 px that hides overflow.

## Seen in the review, not changed: a page that posts every value

A page whose handler sends a POST for every value and validates only on its server was `runner-error` before this
branch; it is now scored, and every value reads `accepted` (a decoy is a `fail`). A GET form that leaves on every
submit already reads so. Telling such cases apart (a navigation answered during the case → `not-observed`) is a
choice of scoring left open.
