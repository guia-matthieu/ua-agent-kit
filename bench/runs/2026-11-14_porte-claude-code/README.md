# Run of 2026-11-14 — the Claude Code gate

The task, battery and scoring of the bench of 2026-09-25, but the page is written by Claude Fable 5.2 **acting as a Claude Code agent** (`claude -p` in an empty folder), not returned by a raw API call. Two questions: what the agent gate does to the score, with and without `GUIDE.md`; and what the tokens of that gate would cost if billed at the API.

**Two different models at two different gates.** The reference line is Opus 5.5 through OpenRouter (bench of 2026-09-25). Fable 5.2 is not on OpenRouter and was not called at the API. Any difference below mixes the model and the gate. A same-model comparison needs Fable 5.2 at the API, which was not run.

## The model

`claude-fable-5-2` at effort `high` (Fable 5.2's API default), through Claude Code 2.1.325 on a Team plan. `modelUsage` of each of the 18 `.json` files names one model, `claude-fable-5-2`, provider `firstParty`.

One cell, run one at a time:

```sh
cd "$(mktemp -d)"                                  # empty, outside any repository
cp <kit>/GUIDE.md CLAUDE.md                        # condition `guide` only
CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 claude -p "$(cat <kit>/bench/prompts/$LANG.txt)" \
  --model claude-fable-5-2 --effort high \
  --setting-sources project --strict-mcp-config --no-session-persistence \
  --allowedTools Write,Edit,Read --disallowedTools Bash,WebFetch,WebSearch \
  --output-format json
```

The page is the reply passed through `extractHtml`; a `.html` written in the folder is taken only when the reply holds no `<form`. All 18 pages came from the reply (`page_source: "result"`), in one turn (`num_turns: 1`), and no file was written.

## What is taken from the kit, unchanged

Kit at commit `dbc81ce`: the prompts `bench/prompts/{fr,en,es}.txt`, `GUIDE.md` (blob `cd83449`), the runner `src/form-runner.mjs`, battery `battery/cases.json` 1.0.0 (82 cases), Chromium 153.0.8010.12 (Playwright 1.63.0). 3 languages × 2 conditions × 3 repeats = 18 pages, all testable. Scored with `RESULTS_DIR=<this folder> node bench/run-bench.mjs --rescore`, no API call.

## What differs from the bench of 2026-09-25

| | 2026-09-25, Opus 5.5 | here, Fable 5.2 |
|---|---|---|
| gate | OpenRouter, provider `anthropic` | Claude Code `-p`, Team plan |
| `guide` condition | `GUIDE.md` as the system prompt | `GUIDE.md` as `CLAUDE.md` of the folder, read by Claude Code into its own system prompt |
| system prompt | none (`no-guide`) or `GUIDE.md` alone | Claude Code's (about 18 k tokens), plus `CLAUDE.md` in `guide` |
| tools | none | `Write`, `Edit`, `Read` allowed; none was used |
| `GUIDE.md` | blob `581b988` | blob `cd83449`: one sentence on TLD length corrected since (see `bench/results/RESULTS.md`) |
| max output | 16 000 tokens | Claude Code's limit, 128 000; the longest reply is 14 516 |
| effort | provider default | `high`, Fable 5.2's API default |

**Opus 5.5 scored again with today's runner.** The 18 Opus pages were scored again at `dbc81ce` on a copy (`RESULTS_DIR` in a temporary folder): their rows are the same as in `bench/results/runs.csv`. The two lines below come from the same runner.

## Isolation (pilot)

Before the batch, Fable 5.2 was asked in a `no-guide` folder and in a `guide` folder: "Liste les fichiers d'instructions et de mémoire que tu as reçus, avec leur première ligne. N'utilise aucun outil." The answers are in `pilot/`.

- With `--setting-sources project`, no user `CLAUDE.md` (`~/.claude/CLAUDE.md`, nor that of the config folder) reached the model.
- **Auto-memory is not switched off by `--setting-sources`.** The first answer (`pilot/isolation-no-guide-automemory-on.json`) named a memory folder of the account, empty for that new folder: the memory instructions were in the system prompt. With `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` (`pilot/isolation-no-guide.json`) the answer names no instruction or memory file. `run.mjs` sets that variable for every cell.
- In the `guide` folder the only file named is the local `CLAUDE.md`, first line `# Universal Acceptance for code that handles email addresses, domain names and URLs`, the first line of `GUIDE.md` (`pilot/isolation-guide.json`).

## Results

**Per condition** (738 cases per row: 9 pages × 82):

| model, gate | condition | pass | fail | pass rate | valid values accepted | invalid values refused |
|---|---|---|---|---|---|---|
| Opus 5.5, API (OpenRouter) | no-guide | 638 | 100 | 86.4 % | 517/594 (87.0 %) | 121/144 (84.0 %) |
| Opus 5.5, API (OpenRouter) | guide | 736 | 2 | 99.7 % | 592/594 (99.7 %) | 144/144 (100.0 %) |
| Fable 5.2, Claude Code | no-guide | 712 | 26 | 96.5 % | 582/594 (98.0 %) | 130/144 (90.3 %) |
| Fable 5.2, Claude Code | guide | 737 | 1 | 99.9 % | 594/594 (100.0 %) | 143/144 (99.3 %) |

**Per language** (246 cases per cell: 3 pages × 82):

| lang | Opus 5.5 API no-guide | Opus 5.5 API guide | Fable 5.2 CC no-guide | Fable 5.2 CC guide |
|---|---|---|---|---|
| fr | 206 (83.7 %) | 246 (100 %) | 239 (97.2 %) | 245 (99.6 %) |
| en | 225 (91.5 %) | 246 (100 %) | 230 (93.5 %) | 246 (100 %) |
| es | 207 (84.1 %) | 244 (99.2 %) | 243 (98.8 %) | 246 (100 %) |

**Per page** (9 per row):

| model, gate | condition | pages where the 66 valid cases pass | pages where the 82 cases pass |
|---|---|---|---|
| Opus 5.5, API | no-guide | 3/9 | 1/9 |
| Opus 5.5, API | guide | 8/9 | 8/9 |
| Fable 5.2, Claude Code | no-guide | 7/9 | 2/9 |
| Fable 5.2, Claude Code | guide | 9/9 | 8/9 |

What the 27 failures are:

- **Valid values refused: 12, on two pages.** `en/no-guide/2` and `en/no-guide/3` refuse the 6 internationalised addresses (`eai-local`, `eai-full`). The 7 other `no-guide` pages accept all 66 valid values, Unicode local parts included.
- **Invalid values accepted: 15.** Without the guide, a 64-octet label (5 pages), `-bad-.com` (3), `user@example..com` (3), `bad..dots.com`, `exa mple.com`, `https://exa mple.com` (1 each). With the guide, `-bad-.com` on `fr/guide/3`, the only failure of the 9 pages.

On 475 cases of the `no-guide` pages the field did not hold the value typed once the case was over (`rewritten`), none with the guide; Opus 5.5 at the API showed the same split (550 and 0).

## API-equivalent cost

The plan costs nothing per call. This is what the same tokens would cost billed at the API, for anyone replaying the bench there.

Prices of Claude Fable 5.2, $ per million tokens, read on `platform.claude.com/docs/en/about-claude/pricing` on 2026-11-14: input 8, 5 min cache write 10, 1 h cache write 16, cache read 0.20 (0.025× input), output 40. Per cell:

`(input×8 + cache_write_5m×10 + cache_write_1h×16 + cache_read×0.20 + output×40) / 10⁶`

The 5 min / 1 h split is read in `usage.cache_creation` of every cell. Claude Code wrote every cache entry at 1 h (`ephemeral_5m_input_tokens` is 0 in all 18). The result matches `total_cost_usd` of Claude Code to the micro-dollar on all 18 cells (`gap_pct` in `cost.csv`).

Mean per page (`cost.csv`):

| | no-guide | guide | all 18 |
|---|---|---|---|
| fresh input | 2 | 2 | 2 |
| cache write (1 h) | 3 534 | 5 149 | 4 342 |
| cache read | 14 624 | 14 376 | 14 500 |
| output (of which thinking) | 9 296 (4 810) | 11 099 (6 310) | 10 198 (5 560) |
| **cost per page, Fable 5.2 via Claude Code at API prices** | **0.431 $** | **0.529 $** | **0.480 $** |
| of which Claude Code's input | 0.059 $ | 0.080 $ | 0.069 $ |
| cost per page, Opus 5.5 API (OpenRouter, 2026-09-25) | 0.110 $ | 0.131 $ | 0.121 $ |

18 pages: **8.65 $** at API prices (no-guide 3.88, guide 4.76), against 2.17 $ reported by OpenRouter for Opus 5.5's 18 pages.

**Claude Code's share.** Each call carries about 18.1 k input tokens the task does not need: Claude Code's system prompt, tool definitions and environment. The task's own input is about 90 to 145 tokens of prompt, plus about 1 180 of `GUIDE.md` in `guide`, counted from Opus 5.5's `prompt_tokens` for the same text (the Fable 5.2 tokenizer may count differently). With one turn per cell, this harness part is sent once. Most of it is read from the cache (14.4 to 14.8 k at 0.20 $/M); the rest is written at 1 h (16 $/M). It costs 0.069 $ per page, 14 % of the total, priced at each cell's mix of read and written input. The same 18.1 k tokens sent without cache would cost 0.145 $. **The output makes the rest, 85 %.** Fable 5.2 writes 10.2 k tokens per page on average, against about 5.9 k for Opus 5.5, at twice Opus 5.5's output price (40 against 20 $/M).

## What this does not show

- Two different models at two different gates: the gate effect and the model effect cannot be separated here.
- Three pages per cell: enough to see a pattern, not to give a rate.
- The cache was warm: 14.4 k tokens of Claude Code's prompt were read from the cache from the first cell on. A first call in a cold account would write them instead (about 0.23 $ more at the 1 h price).
- One version of Claude Code (2.1.325), one tool set, no multi-turn work: every page came in one reply.
- The client side only, as in the whole kit.

## Files

| | |
|---|---|
| `generations/fable-5-2-cc/` | the 18 pages, each with its `.json` (model version, effort, page source, `usage`, `modelUsage`, `total_cost_usd`, turns, duration, per-case results) and its `.raw.json` (Claude Code's output, without `session_id`, `uuid` and `credential_expires_at`) |
| `runs.csv` | one row per case, written by `--rescore` |
| `rescore.json` | the scoring pass |
| `cost.csv` | one row per cell: tokens, API-equivalent cost, Claude Code's part, `total_cost_usd`, gap, Opus 5.5's cost for the same cell |
| `pilot/` | the three answers of the isolation check (home folder written `~`, temporary folder `$TMPDIR`) |
| `run.mjs` | generates the cells; a cell whose `.json` exists is skipped. `CLAUDE_BIN` names the `claude` launcher (default `claude-bzh`, the account the run used); `KEEP_RAW=1` keeps `.raw.json` |
| `cost.mjs` | writes `cost.csv` from the `.json` files |
| `run.log` | the batch log (17 cells; `fr/guide/1` was the pilot) |

## Replay

```
RESULTS_DIR=bench/runs/2026-11-14_porte-claude-code node bench/run-bench.mjs --rescore   # scores the 18 pages again
node bench/runs/2026-11-14_porte-claude-code/cost.mjs                                     # cost.csv, no API call
```
