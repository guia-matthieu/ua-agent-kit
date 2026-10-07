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
| the corrected runner | `measure.mjs after-fix-rows.json` | 37 `schemeRequired`, 1 field not testable (`baseline-ambiguous`), 1 `showed` and taken |
| every page scored again | `rescore-all.mjs` | `rescored/*.csv`, `rescored/fields.json` |
| published, first correction and this one side by side | `compare.py` | below |

Text website fields whose baseline was refused: bench of 2026-09-25, 1 of 15 (`openai/fr/guide/3`); first draft of 2026-10-06, 13 of 26 with the guide and 4 of 5 without; hardened, 19 of 32 with the guide and 1 of 5 without. No field of type `url`, no email field but one.

## The correction

- The baseline is read against the page as it loaded. What the field gained with it is read three ways:
  - a mark of refusal (`aria-invalid`, an error class, a custom validity, an enforced mismatch): the baseline is refused;
  - a text and nothing else, and the whole form reads as it does for `x` (no @, no dot, no scheme): a page refusing both, or a hint shown for any value. The two cannot be told apart: the field is `not-testable`, reason `baseline-ambiguous`;
  - a text the page does not write for `x` (a praise, a hint next to an error written elsewhere): the baseline is taken, the field reports `showed`.
- A text field that does not take the bare domain and takes it with `https://` is probed as a field of type `url`: bare domains are typed with `https://` in front (decision D1 of 2026-09-25, extended). The field reports `baseline.schemeRequired`.
- A page that refuses every form of the baseline with a mark is read against the page as it loaded: `baseline.refused`.
- A text that repeats the value typed, or counts its characters, is not new from one value to the next.
- Every tested field carries `baseline: { typed, refused, schemeRequired, showed }`. Tests: `tests/baseline-refused.test.mjs`, six fixtures.

## Review of PR #6

A reviewer with no part in the work rejected the first version (`7a642fa`) on one finding it reproduced: on a page that repeats the value under the field ("Sending to ana@example.com"), and on a page that shows a hint for any value, every valid address read as refused. Both pages are now fixtures. Corrected, then scored again: a first correction took the typed value out of every text of the field, which made a fixed hint look new whenever the value typed was the example it gives; the scoring showed it (86 rows of the bench of 2026-09-25 instead of 27) and it was corrected before anything was pushed. The rows below are those of the last scoring; they differ from the scoring made before the review by one field, the website field of the page that refuses every value, now `baseline-ambiguous`.

In one of the three scorings, three hardened pages of `ministral-8b` gave a runner error or `not-interactable` with the TLD packs and not with the standard battery; the scoring before and the one after gave neither. Not explained.

## Published, first correction, this correction (`compare.py`)

Every row that differs from the previous scoring is on a field whose baseline was refused (27, 55, 22, 137, 89 rows; 0 elsewhere). On the hardened pages the valid values go down: with a scheme in front, values the page refuses on its own rule (a TLD of letters only refuses `https://example.xn--p1ai`) are no longer hidden behind the refusal of the bare domain.

| | published | 2026-10-06 | 2026-10-07 |
|---|---|---|---|
| **bench of 2026-09-25** valid values accepted, with the guide | 1 750/1 782 | not scored | 1 777/1 782 |
| valid values accepted, without | 1 600/1 782 | not scored | 1 600/1 782 |
| guards refused, with / without | 413/432 · 325/432 | not scored | 413/432 · 325/432 |
| pages with every valid value accepted, without → with | 8/27 → 22/27 | not scored | 8/27 → 23/27 |
| **first draft of 2026-10-06** valid values accepted, with / without | 3 805/3 960 · 3 738/4 092 | 3 548/3 960 · 3 530/4 092 | unchanged |
| guards refused, with the guide | 391/960 | 578/960 | 624/960 |
| guards refused, without | 482/992 | 610/992 | 619/992 |
| **hardened** valid values accepted, with the guide | 3 653/3 834 | 3 408/3 854 | 3 381/3 815 |
| valid values accepted, without | 3 467/3 960 | 2 924/3 960 | 2 909/3 960 |
| guards refused, with the guide | 403/938 | 662/940 | 756/931 |
| guards refused, without | 517/960 | 728/960 | 737/960 |

The bench of 2026-09-25 scored with both corrections differs from the published `runs.csv` by 27 rows, all on `openai/fr/guide/3`: the bare domains that page refused are now typed with a scheme. The first correction changes no row of that bench.

## Not measured, not corrected

- **A page that says the same thing of a plain value and of `x`, with no mark.** No verdict is given on that field (`generations-durci/mistral-medium-3-1/es/guide/1`, website field).

- **A baseline refused in words the page uses for nothing else.** `generations-durci/mistral-medium-3-1/es/guide/1`, email field: the page refuses `ana.garcia@example.com` with one message and `x` with another. That cannot be told from a page praising a valid value; the baseline is taken as accepted, the field reports `showed: true`, the report says so. 1 field of 590. A second plain value would not separate the two: that page refuses every address in the same words.
- On a URL the runner never submits, so no baseline is typed: a text field that wants a scheme refuses every bare domain there, `example.com` included.
- A refusal shown away from the field, in words outside the list, is still not read (as on 2026-10-06).
- `summary.py` of the run and the per-page tables were not produced again from `rescored/`.
