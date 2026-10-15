# Run of 2026-10-13 — two recent models, for v0.2

The protocol of `bench/runs/2026-10-06_state-catalogue/`, replayed on two models chosen that day in the OpenRouter catalogue as the most recent Gemini Flash and Mistral's most recent large model. Same prompts, same additions (TLD packs, hardening turn), same tables, plus one: the hardening compared on the standard battery too. The runner is not the one of 2026-10-06 (see below). Read the README of the 2026-10-06 run for what each addition is.

## The models

In `models.json`: `google/gemini-3.8-flash` (provider `google-ai-studio`) and `mistralai/mistral-large-4-0` (provider `mistral`), through OpenRouter, original provider pinned, no fallback.

`max_tokens` is 16 000, as on 2026-10-06, except for Mistral Large 4: 64 000. Two of its first six replies (`en/guide/2` and `3`) spent 15 203 and 15 317 of 16 000 tokens reasoning and returned no page. They are kept in `truncated-16000/` with their CSV rows, and were generated again at 64 000.

## What is taken from the kit, unchanged

Kit at commit `8175547`: the prompts `bench/prompts/{fr,en,es}.txt`, `GUIDE.md` as the system prompt of the `guide` condition, the runner `src/form-runner.mjs`, battery `battery/cases.json` 1.0.0 (82 cases), TLD packs as scored on 2026-10-06 (`pack-as-scored.json`, 62 cases), three repeats per cell, temperature and effort left at the provider's default, Chromium 153.0.8010.12 (Playwright 1.63.0).

**Not the runner of the first scoring of 2026-10-06.** That run was first scored at `8a7e65e`; its folder now holds its reference scoring, made at `49a5228` (see its README), and keeps the first one in `first-scoring/`. Between `8a7e65e` and `8175547`, 22 commits changed `src/form-runner.mjs` and `src/verdict.mjs` (+341 / −64 lines): a baseline the page refuses is no longer the reference, a refusal is read by its place, every reload runs in a context of its own, the contexts that hold typed values have no network. The prompts, `GUIDE.md` and `battery/cases.json` are the same. Compare these tables with the reference scoring of that run, not with `first-scoring/`. After `7258c9e`, whose scoring gave the reference files byte for byte, `src/` changed for WebRTC (`9a6d635`, `b83419f`), for a value read by the tests only (`b243cc6`) and in comments (`da49011`); the pages of 2026-10-06 were not scored again at `8175547`.

2 models × 3 languages × 2 conditions × 3 repeats = 36 pages, 35 of them testable. `mistral-large-4-0/es/guide/2` came back empty (`finish_reason: stop`, 16 479 reasoning tokens of 17 342) and is counted not testable, as Qwen3-Coder's empty page on 2026-10-06.

## The hardening turn

35 hardened pages (the empty first draft has nothing to harden), 34 testable, 34 comparable with their first draft.

Four hardened pages of Mistral Large 4 were set aside and asked once more:

| cell | first answer | asked again |
|---|---|---|
| `en/guide/1` | `finish_reason: length`, 64 000 tokens, 55 672 of them reasoning, no page | page, `stop` |
| `en/guide/2` | `finish_reason: error` after 36 144 tokens, no page | `length`, 64 000 tokens, no page: counted not testable |
| `en/guide/3` | `finish_reason: error` after 47 tokens, no page | page, `stop` |
| `es/guide/1` | `finish_reason: error` after 22 129 tokens, a page cut short with no form | page, `stop` |

`durcir.mjs` wrote the `error` answers as done cells. Both `durcir.mjs` and `run.mjs` now keep only `stop` and `length` answers: any other `finish_reason` (`error`, `content_filter`, none) writes nothing and the cell stays to do. An empty `stop` answer is still written and counted not testable. The four first answers and their CSV rows are in `generations-durci-ecartees/`.

## Files

| | |
|---|---|
| `generations/` | the 36 first-draft pages, each with its `.json` (model version, usage, date, per-case results; the `fr` key holds the pack results) |
| `generations-durci/` | the 35 hardened pages |
| `generations-durci-ecartees/` | the four hardened answers set aside, and their rows of the two CSV files |
| `truncated-16000/` | the two first-draft answers cut at 16 000 tokens, and their rows |
| `runs-standard.csv`, `runs-fr.csv` | first draft, one row per case: standard battery, TLD packs |
| `runs-durci-standard.csv`, `runs-durci-fr.csv` | the same after hardening |
| `RESULTS.md` | the tables, written by `summary.py` |
| `run.mjs`, `durcir.mjs`, `rescore.mjs` | the scripts of 2026-10-06, comments in French; the `finish_reason` check added on 2026-10-14 |
| `models.json`, `durcir-consignes.json`, `pack-as-scored.json`, `ids-scored-to-packs.json` | configuration, hardening request, pack and id map, as on 2026-10-06 |

## What the tables show

- **The five geoTLDs in ASCII are accepted on 518 of 525 first-draft values**, both models, three languages, with and without the guide. No ASCII geoTLD is lost at hardening.
- **The regression comes at the correction, without the guide.** On the TLD packs, asked to tighten the validation, 16 of 18 pages without the guide start refusing a valid value they accepted before (108 values), against 0 of 16 with the guide. On the standard battery: 17 of 18 pages without the guide (304 values), 4 of 16 with it (4 values).
- **Accented local parts are what is lost.** On the TLD packs, without the guide, both models refuse every accented local part after hardening (0 of 27 each, from 27 and 21). That is 48 of the 108 values; accented geoTLDs and A-labels make most of the rest.
- **With the guide, hardening loses no valid value of the TLD packs**, and pages passing the 62 cases go from 4 to 13 of 16. Guards refused: Gemini goes from 38 to 72 of 72, Large 4 from 47 to 46 of 56. On the standard battery, four of Gemini's nine pages with the guide start refusing `उपयोगकर्ता@उदाहरण.भारत`, an address in Devanagari on the `.भारत` TLD; Large 4 loses nothing.

## What this does not show

- Two models, three pages per cell: enough to see a pattern, not to give a rate or to rank models.
- Through OpenRouter, provider pinned: not the provider's own API, nor its products.
- One wording of the hardening request.
- The client side only, as in the whole kit: no server, no storage, no mail delivery.
- Mistral Large 4 has two holes with the guide: `es/guide/2` (first draft empty, so no hardening) and the hardening of `en/guide/2` (an `error` answer, then 64 000 tokens with no page).
- That the two models were the most recent of their families: `models.json` says so, no copy of the catalogue was kept. The page `.json` files record the model version, not the provider that served it.

## Cost

Reported by OpenRouter for the pages kept: first draft 0.888 USD (Gemini 0.282, Large 4 0.606), hardening 1.344 USD (Gemini 0.461, Large 4 0.882). Not counted there: `truncated-16000/` 0.068 USD, `generations-durci-ecartees/` 0.137 USD reported. The three `error` answers are reported at 0 USD, with an upstream cost of 0.132 USD.

## Replay

```
python3 bench/runs/2026-10-13_v0.2/summary.py > bench/runs/2026-10-13_v0.2/RESULTS.md   # the tables, from the CSV files
node bench/runs/2026-10-13_v0.2/rescore.mjs                                             # scores the 36 first-draft pages again, no API call
```

`rescore.mjs` rewrites the two first-draft CSV files and the `.json` next to each page. Generating again needs `OPENROUTER_API_KEY` (`run.mjs`, then `durcir.mjs`); cells that already have their pages are skipped.
