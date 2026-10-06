# Run of 2026-10-06 — seven more models, and the TLD packs

The bench of this kit, replayed as it is on seven models it had not been run on, with two additions: every page is also scored on the TLD packs, and a second turn asks each model to tighten its own form.

This run is published next to the first one (`bench/results/`), not merged into it: other models, another date, and one condition the first run does not have.

## The models

The seven chat and code models listed on 2026-10-06 in the catalogue of Albert API, the service the French State's digital department (DINUM) offers to public administrations: `ia.numerique.gouv.fr/outils-ia/albert-api/modèles/`. They are in `models.json`, with the name the catalogue gives each of them.

**They were not called through Albert API**, which is reserved for the State, but through OpenRouter: same announced weights, another host, possibly another quantization, and none of the system prompts of the State's own tools. The results describe these models. They do not describe the service DINUM runs.

`ministral-8b`: OpenRouter serves `ministral-8b-2512`, the catalogue lists `Ministral-3-8B-Instruct-2512`. The match is assumed, not verified.

## What is taken from the kit, unchanged

Kit at commit `8a7e65e`: the prompts `bench/prompts/{fr,en,es}.txt`, `GUIDE.md` as the system prompt of the `guide` condition, the runner `src/form-runner.mjs`, battery `battery/cases.json` 1.0.0 (82 cases), three repeats per cell, temperature and effort left at the provider's default, `max_tokens` 16 000, Chromium 153.0.8010.12 (Playwright 1.63.0), and the two scoring rules of the first run.

7 models × 3 languages × 2 conditions × 3 repeats = 126 pages, 122 of them testable.

## What is added

**The TLD packs.** Each page is scored a second time, on its own sheet, on the 62 cases of `battery/packs/tld/`: `.bzh`, `.corsica`, `.alsace`, `.paris`, `.eus` in ASCII, six accented names as U-label and A-label, three email addresses with an accented local part, eight guards. The accented names on the five geoTLDs are syntax cases, not names in use (see `battery/packs/README.md`).

The pages were scored when these cases were one file with other ids. `pack-as-scored.json` is that file, rebuilt from the six packs: same values, classes and expectations, the ids and the order of the scoring. `ids-scored-to-packs.json` maps each id of the CSV files to its id in the packs (`email-fr-corsica-01` → `email-geotld-corsica-01`).

**A hardening turn** (`durcir.mjs`; *durci* is French for hardened). Each model is given its own first page back and asked to fix a validation that lets invalid values through. The request is the same for every page, in the language of the first prompt (`durcir-consignes.json`). It quotes two guards of the standard battery, `user@example..com` and `https://exa mple.com`: no geoTLD and no accent, so as not to prime the answer. The corrected page is scored like the others. This condition is not part of the kit's bench.

122 hardened pages, 119 testable and comparable with their first draft. Seven answers came back empty (0 bytes, `finish_reason: stop`), all from Qwen3-Coder; each was asked once more, four then returned a page and three stayed empty and are counted not testable. The empty answers are kept in `generations-durci-ecartees/`.

## Files

| | |
|---|---|
| `generations/` | the 126 first-draft pages, each with its `.json` (model version, usage, date, per-case results; the `fr` key holds the pack results) |
| `generations-durci/` | the 122 hardened pages |
| `runs-standard.csv`, `runs-fr.csv` | first draft, one row per case: standard battery, TLD packs |
| `runs-durci-standard.csv`, `runs-durci-fr.csv` | the same after hardening |
| `RESULTS.md` | the tables, written by `summary.py` |
| `run.mjs`, `durcir.mjs`, `rescore.mjs` | the scripts as they ran, comments in French |
| `iana-idn-tables/` | the IDN tables of the five geoTLDs as published at IANA, read on 2026-10-06 |

## What the tables show

- **The five geoTLDs in ASCII are accepted on every first-draft page**: seven models, three languages, with and without the guide.
- **Accented names are not accepted reliably.** For one code model the result changes with the language of the prompt; some chat models refuse them without the guide and accept them with it.
- **No first-draft page passes the 62 cases.** Of 122 testable pages, 120 accept at least one guard. A page that accepts every valid value may simply be validating nothing: valid values accepted and guards refused have to be read side by side.
- **The regression comes at the correction.** Asked to tighten the validation, 17 of 60 pages without the guide start refusing a valid value they accepted before, against 3 of 59 with the guide. This is the only place in the run where an ASCII geoTLD is refused: 8 values, all without the guide.

## What this does not show

- Nothing about a service in production: see *The models*.
- Three pages per cell: enough to see a pattern, not to give a rate or to rank models.
- One wording of the hardening request.
- The client side only, as in the whole kit: no server, no storage, no mail delivery.
- One cell without a form (`qwen3-coder-30b/fr/guide`, one page of three) is counted not testable and was not generated again.
- The first 16 pages were generated before the browser was installed; every first-draft page was scored again afterwards by `rescore.mjs`, with no runner error.

## Replay

```
python3 bench/runs/2026-10-06_state-catalogue/summary.py      # the tables, from the CSV files
node bench/runs/2026-10-06_state-catalogue/rescore.mjs        # scores the 126 first-draft pages again, no API call
```

`rescore.mjs` rewrites the two first-draft CSV files and the `.json` next to each page. Run from this repository on 2026-10-06, it gave back every row of the two published files (7 572 and 10 012 rows, no value changed); only the order of four cells that had been generated again differs. Generating again needs `OPENROUTER_API_KEY` (`run.mjs`, then `durcir.mjs`); cells that already have their pages are skipped.

To run the bench on another catalogue of models: copy `models.json`, change the slugs, run `run.mjs` in a folder of its own.
