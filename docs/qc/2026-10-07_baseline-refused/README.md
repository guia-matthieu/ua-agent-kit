# The runner's baseline value was refused by the page (2026-10-07)

Facts and commands. Nothing here is a published result: the files of `bench/results/` and of `bench/runs/2026-10-06_state-catalogue/` are untouched on this branch.

## What was found

In submit mode the runner first submits a plain value (`example.com` in a text website field) and reads every case against what the page then shows. A page that refuses that plain value shows its refusal already; a case refused in the same words changed nothing and read as `accepted`. Left open on 2026-10-06 (`../2026-10-06_refusal-wording/`, "Not measured, not corrected").

## How it was measured

On the 302 generated pages of the two benches (54 of 2026-09-25; 126 first draft and 122 hardened of 2026-10-06), 295 with a form, 590 fields:

| step | script | output |
|---|---|---|
| the baseline read against the page as it loaded, nothing else changed | `measure.mjs` | `baseline-rows.json` |
| count by bench, field, condition | `read.py` | 39 fields show a refusal for the baseline: 38 website, 1 email |
| what those pages write for `example.com`, `https://example.com`, `www.example.com` | `texts.mjs` | `texts.json`: 37 website fields take the domain with a scheme, 1 page refuses every value |
| the corrected runner | `measure.mjs after-fix-rows.json` | 37 `schemeRequired`, 1 `refused`, 1 `showed` and taken |
| every page scored again | `rescore-all.mjs` | `rescored/*.csv`, `rescored/fields.json` |
| published, first correction and this one side by side | `compare.py` | below |

Text website fields whose baseline was refused: bench of 2026-09-25, 1 of 15 (`openai/fr/guide/3`); first draft of 2026-10-06, 13 of 26 with the guide and 4 of 5 without; hardened, 19 of 32 with the guide and 1 of 5 without. No field of type `url`, no email field but one.

## The correction

- The baseline is read against the page as it loaded. What the field gained (a text of its own, `aria-invalid`, an error class, a custom validity, an enforced mismatch) is a refusal when it carries a mark of one, or when it is exactly what the page shows for `x` (no @, no dot, no scheme). A page that writes "Looks good" under a valid value is not refusing it.
- A text field that refuses the bare domain and takes it with `https://` is probed as a field of type `url`: bare domains are typed with `https://` in front (decision D1 of 2026-09-25, extended). The field reports `baseline.schemeRequired`.
- A page that refuses every form of the baseline is read against the page as it loaded: `baseline.refused`.
- Every tested field carries `baseline: { typed, refused, schemeRequired, showed }`. Tests: `tests/baseline-refused.test.mjs`, two fixtures; with the detection switched off the first two tests fail.

## Published, first correction, this correction (`compare.py`)

Every row that differs from the previous scoring is on a field whose baseline was refused (27, 55, 22, 168, 125 rows; 0 elsewhere).

| | published | 2026-10-06 | 2026-10-07 |
|---|---|---|---|
| **bench of 2026-09-25** valid values accepted, with the guide | 1 750/1 782 | not scored | 1 777/1 782 |
| valid values accepted, without | 1 600/1 782 | not scored | 1 600/1 782 |
| guards refused, with / without | 413/432 · 325/432 | not scored | 413/432 · 325/432 |
| pages with every valid value accepted, without → with | 8/27 → 22/27 | not scored | 8/27 → 23/27 |
| **first draft of 2026-10-06** valid values accepted, with / without | 3 805/3 960 · 3 738/4 092 | 3 548/3 960 · 3 530/4 092 | unchanged |
| guards refused, with the guide | 391/960 | 578/960 | 624/960 |
| guards refused, without | 482/992 | 610/992 | 619/992 |
| **hardened** guards refused, with the guide | 403/938 | 662/940 | 765/940 |
| guards refused, without | 517/960 | 728/960 | 737/960 |

The bench of 2026-09-25 scored with both corrections differs from the published `runs.csv` by 27 rows, all on `openai/fr/guide/3`: the bare domains that page refused are now typed with a scheme. The first correction changes no row of that bench.

## Not measured, not corrected

- **A baseline refused in words the page uses for nothing else.** `generations-durci/mistral-medium-3-1/es/guide/1`, email field: the page refuses `ana.garcia@example.com` with one message and `x` with another. That cannot be told from a page praising a valid value; the baseline is taken as accepted, the field reports `showed: true`, the report says so. 1 field of 590.
- On a URL the runner never submits, so no baseline is typed: a text field that wants a scheme refuses every bare domain there, `example.com` included.
- A refusal shown away from the field, in words outside the list, is still not read (as on 2026-10-06).
- `summary.py` of the run and the per-page tables were not produced again from `rescored/`.
