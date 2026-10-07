# The runner read a refusal by its wording (2026-10-06)

Facts and commands. Nothing here is a published result: the files of `bench/runs/2026-10-06_state-catalogue/` and of `bench/results/` are untouched on this branch.

## What was found

`readState()` in `src/verdict.mjs` kept a visible text of the form only when it matched `invalid|inv[aá]lid|no v[aá]lido|error|erreur|incorrect`. A page that refuses a value with "Enter a valid email address.", "Veuillez saisir une adresse e-mail valide" or "Introduce una URL válida" showed a refusal the runner read as `accepted`. First seen on `gpt-oss-120b/en/guide/1`.

## How it was measured

On the 122 testable first-draft pages of the run of 2026-10-06, standard battery 1.0.0 (10 004 rows):

| step | script | output |
|---|---|---|
| the runner with that one filter removed: any new text of the form counts | `probe.mjs` | `probe-rows.json` |
| comparison with the published `runs-standard.csv` | `analyse.py`, `accept-flips.py` | 793 outcomes differ, all explained by a text outside the word list |
| the corrected runner of this branch | `replay-fixed.mjs` | `fixed-rows.json` |
| published, probe and corrected side by side | `compare.py` | 780 outcomes differ from the published file; 0 differ from the probe except 13 rows of one page |
| every page of the run, first draft and hardened, both batteries | `rescore-all.mjs` | `rescored/*.csv`, `rescored/RESULTS-corrected-runner.md` (the run's `summary.py` read against them) |

The 13 rows: `deepseek-v4-flash/es/no-guide/2` writes "✅ Registro exitoso. Todos los campos son válidos." below the button when it accepts. The probe counts it as a refusal; the corrected runner does not.

## The correction

A text is the field's own when it is inside the field's block (the largest ancestor that holds no other control), inside what the field names with `aria-describedby` or `aria-errormessage`, or after the field and before the next control. Such a text, when the page did not show it after the baseline value, is a refusal whatever its words (signal `field-text`). Elsewhere in the form the word list still applies (signal `error-text`). Tests: `tests/refusal-place.test.mjs`, five fixtures.

## First-draft pages, standard battery, published and corrected

| | published | corrected |
|---|---|---|
| valid values accepted, with the guide | 3 805/3 960 | 3 548/3 960 |
| valid values accepted, without | 3 738/4 092 | 3 530/4 092 |
| guards refused, with the guide | 391/960 | 578/960 |
| guards refused, without | 482/992 | 610/992 |

## TLD packs and hardening, corrected (`rescored/RESULTS-corrected-runner.md`)

- geoTLD in ASCII, first draft: accepted on every page, as published.
- Pages with a regression at hardening: 37 of 60 without the guide (published: 17), 10 of 59 with it (published: 3).
- ASCII geoTLD values lost at hardening: 11 without the guide, 10 with it (published: 8, all without).

## Not measured, not corrected

- **A baseline value the page refuses.** On a text field the runner types the baseline as a bare domain (`example.com`). A page that asks for a scheme refuses it, that refusal becomes the reference state, and every later value refused with the same message reads as accepted. Seen by reading the code of `gpt-oss-120b/{en,fr,es}/guide/2`, whose website field refuses 0 guard of 9 in the corrected rows. Not measured.
- The bench of 2026-09-25 (`bench/results/`) was not scored again.
- A refusal shown away from the field, in words outside the list, is still not read.
- `index-candidates.py` and `pages.py` explore a composite index on the corrected rows. Exploration only.
