# Bench results — run of 2026-09-25, scored on 2026-09-28

Do models write signup forms that accept every valid address and domain (long TLDs, IDNs, internationalised email) and does giving them `GUIDE.md` change that?

## Setup

| | |
|---|---|
| Generation | 2026-09-25, 11:10 to 17:12 UTC. No page was generated again after that date |
| Scoring | `node bench/run-bench.mjs --rescore` on 2026-09-28 (pass `2026-09-28T21:18:39.719Z` in `rescore.json`), kit at `9fc1cc7`, battery `1.0.0` |
| Cases | 82 per page: 34 typed in the email field, 48 in the website field. 66 are valid values the form should accept, 16 are invalid values it should refuse |
| Engine | Chromium 153.0.8010.12 (Playwright 1.63.0) |
| Prompt | `bench/prompts/{en,fr,es}.txt`: a self-contained HTML signup form (name, email, website, password), JavaScript validation before submit, no framework |
| Conditions | `no-guide`: the prompt alone · `guide`: `GUIDE.md` as system prompt, same prompt |
| Guide version | blob `581b988`, the file as it was on 2026-09-25. One sentence on TLD length was corrected afterwards (a label is at most 63 octets); the pages were not generated again with the corrected text |
| Design | 3 models × 3 languages × 2 conditions × 3 repeats = 54 pages, 4 428 scored cases |
| Access | OpenRouter, first-party provider only, no fallback; temperature and reasoning effort at provider default |

| key | `model_version` (from every `.json`) | max_tokens |
|---|---|---|
| anthropic | `anthropic/claude-opus-5.5` | 16 000 |
| openai | `openai/gpt-6-astra` | 16 000 |
| open-weight | `z-ai/glm-5.3` | 64 000, then 131 072 for the last 7 cells: the 5 `es` cells a credit error had left undone and the 2 cells drawn again (see *Discarded generations*; `run-log-2026-09-25.txt`) |

Models pinned from the OpenRouter code-generation ranking by spend on 25/09 (`models.json`, field `pinned`).

### How to read a verdict

Each value is typed into the field, the field loses focus, and the form's submit event is dispatched with its default action cancelled. The runner then reads the field and the form.

- **Refused** (`rejected-script`): the page shows a refusal it did not show for an ordinary value: `aria-invalid="true"`, an error class, an error text, or a custom validity set by its script.
- **Accepted** (`accepted`): the submit event fired and the runner read none of these. It is what the runner observed, not a proof that the form went on to do its work.
- **Refused by the browser** (`rejected-native`): the field reports a type or pattern mismatch *and* something enforces it. No case of this bench is in that situation (rule 2 below).

In the `.json` of each page every case carries what was read: `mismatch` (the field itself reports a mismatch), `enforced` (its form acts on it), `signals` (what the page showed).

### Two rules of this scoring

Both were set after the first scoring of these pages (commit `55df22f`), once the pages had been looked at, and both change what is counted. Neither needed a page to be generated again.

**1. In a `type="url"` field, a bare domain is typed with `https://` in front.** The battery holds bare domains (`boutique.corsica`) and full URLs (`https://boutique.corsica`). A field of type url holds a URL: for it a value without a scheme is a type mismatch, `example.com` included. The first scoring typed the bare domains as they are into the 39 pages that have such a field. Of 1 209 values, 1 049 were read as refused, `example.com` with the others. Those refusals could not tell how a page treats a long TLD or an IDN: they mixed a missing scheme with a refusal of the name. In any other field a bare domain is typed as it is. The column `typed` of `runs.csv` holds what was typed.

This rule looks at the type of the field, not at what the page asks for. A page that asks for a full URL in a text field does not get the `https://` (one page does that, see below).

**2. On a form with `novalidate`, a refusal is what the page says.** The 54 forms have native validation switched off (`novalidate`): the browser does not hold the submit back on the form's constraints, and the submit event fired on each of the 4 428 cases. A Unicode local part in a `type="email"` field is a type mismatch for the browser, but on such a form nothing acts on it unless the page's script does. In 437 cases the field reports a mismatch that nothing enforces (`mismatch` true and `enforced` false in the `.json`). In 386 of them the page shows a refusal too; in 51 it shows none.

Until `c8a6ac8` the runner read a refusal in the validity of the field, and counted 44 of these 51 as refused. It counted the other 7 as accepted, by accident: `open-weight/es/no-guide/2` disables its fields after a submit it accepts, and a disabled field was read as valid. For each of the 44, the page showed after the submit exactly what it shows after an ordinary ASCII address, and something else when it refuses. That comparison was made on the 8 pages concerned, by recording the visible text of the page after each case; it is not part of this repository.

What the two rules changed, against the first scoring. It predates the three plain `.fr` cases of the `control` class, so this table and the next one are on the 79 cases both scorings hold:

| rule | cases it applies to | were fail, are pass | were pass, are fail | same outcome |
|---|---|---|---|---|
| 1. `https://` in a `type="url"` field | 1 209 | 814 | 81 | 314 |
| 2. `novalidate` | 437 | 36 | 8 | 393 |

With the two rules, 850 valid values go from fail to pass and 89 invalid values from pass to fail. The other 3 327 cases have the outcome they had.

**The gap under each rule.** The two rules move many outcomes, so the gap between the two conditions is given here under each combination of them, from the first scoring (`runs-first-scoring.csv`, kit at `55df22f`) and the current one restricted to the same 79 cases (`node bench/sensitivity.mjs`):

| scoring | anthropic no-guide → guide | openai no-guide → guide | open-weight no-guide → guide | all models | pages where the 79 cases pass |
|---|---|---|---|---|---|
| first scoring, neither rule | 72.4 → 96.2 % | 58.5 → 67.1 % | 73.7 → 77.4 % | 68.2 → 80.2 % | 1/27 → 11/27 |
| rule 1 only | 85.9 → 99.7 % | 85.4 → 94.7 % | 84.0 → 98.7 % | 85.1 → 97.7 % | 1/27 → 18/27 |
| rule 2 only | 72.4 → 96.2 % | 58.5 → 67.1 % | 77.8 → 77.2 % | 69.6 → 80.2 % | 1/27 → 11/27 |
| both rules (current scoring) | 85.9 → 99.7 % | 85.4 → 94.7 % | 88.0 → 98.6 % | 86.5 → 97.7 % | 1/27 → 18/27 |
| both rules, and the 26 bare domains of the page outside rule 1 counted as passing | 85.9 → 99.7 % | 85.4 → 98.3 % | 88.0 → 98.6 % | 86.5 → 98.9 % | 1/27 → 19/27 |

With the guide the rate of all models is higher under every combination, by 10.6 to 12.6 points, and so is the number of pages where the 79 cases pass. Per model it is higher in every row but one: `open-weight` under rule 2 alone, 77.8 % without the guide and 77.2 % with it. The last row is not a scoring: it shows what the page outside rule 1 (see *What the numbers say*) weighs, if its bare domains had passed: 26 among these 79 cases, 27 with `example.fr`.

## Results

**Per model** (738 cases per row: 9 pages × 82):

| model | condition | pass | fail | pass rate | valid values accepted | invalid values refused |
|---|---|---|---|---|---|---|
| anthropic | no-guide | 638 | 100 | 86.4 % | 517/594 (87.0 %) | 121/144 (84.0 %) |
| anthropic | guide | 736 | 2 | 99.7 % | 592/594 (99.7 %) | 144/144 (100.0 %) |
| openai | no-guide | 634 | 104 | 85.9 % | 540/594 (90.9 %) | 94/144 (65.3 %) |
| openai | guide | 699 | 39 | 94.7 % | 567/594 (95.5 %) | 132/144 (91.7 %) |
| open-weight | no-guide | 653 | 85 | 88.5 % | 543/594 (91.4 %) | 110/144 (76.4 %) |
| open-weight | guide | 728 | 10 | 98.6 % | 591/594 (99.5 %) | 137/144 (95.1 %) |
| all models | no-guide | 1925 | 289 | 86.9 % | 1600/1782 (89.8 %) | 325/432 (75.2 %) |
| all models | guide | 2163 | 51 | 97.7 % | 1750/1782 (98.2 %) | 413/432 (95.6 %) |

The pass rate mixes two things: accepting what is valid and refusing what is not. The two columns on the right keep them apart.

**Per page.** The 82 cases of a page go through the same two fields and the same script, so they are not 82 independent trials. Counted in pages, 9 per row:

| model | condition | pages where the 66 valid cases pass | pages where the 82 cases pass |
|---|---|---|---|
| anthropic | no-guide | 3/9 | 1/9 |
| anthropic | guide | 8/9 | 8/9 |
| openai | no-guide | 0/9 | 0/9 |
| openai | guide | 8/9 | 5/9 |
| open-weight | no-guide | 5/9 | 0/9 |
| open-weight | guide | 6/9 | 5/9 |

**Per cell** (`node bench/aggregate.mjs`, 3 pages × 82 cases = 246 per row). The last column is not an outcome: it counts, among the cases of the row, those where the field did not hold what was typed once the case was over (see *Value held by the field after the test*).

| model | lang | condition | pass | fail | sanitized | not-observed | not-testable | rewritten |
|---|---|---|---|---|---|---|---|---|
| anthropic | en | guide | 246 | 0 | 0 | 0 | 0 | 0 |
| anthropic | en | no-guide | 225 | 21 | 0 | 0 | 0 | 195 |
| anthropic | es | guide | 244 | 2 | 0 | 0 | 0 | 0 |
| anthropic | es | no-guide | 207 | 39 | 0 | 0 | 0 | 177 |
| anthropic | fr | guide | 246 | 0 | 0 | 0 | 0 | 0 |
| anthropic | fr | no-guide | 206 | 40 | 0 | 0 | 0 | 178 |
| open-weight | en | guide | 241 | 5 | 0 | 0 | 0 | 0 |
| open-weight | en | no-guide | 205 | 41 | 0 | 0 | 0 | 12 |
| open-weight | es | guide | 242 | 4 | 0 | 0 | 0 | 0 |
| open-weight | es | no-guide | 221 | 25 | 0 | 0 | 0 | 46 |
| open-weight | fr | guide | 245 | 1 | 0 | 0 | 0 | 0 |
| open-weight | fr | no-guide | 227 | 19 | 0 | 0 | 0 | 77 |
| openai | en | guide | 246 | 0 | 0 | 0 | 0 | 0 |
| openai | en | no-guide | 210 | 36 | 0 | 0 | 0 | 12 |
| openai | es | guide | 238 | 8 | 0 | 0 | 0 | 0 |
| openai | es | no-guide | 212 | 34 | 0 | 0 | 0 | 12 |
| openai | fr | guide | 215 | 31 | 0 | 0 | 0 | 0 |
| openai | fr | no-guide | 212 | 34 | 0 | 0 | 0 | 12 |

| condition | pass | fail | sanitized | not-observed | not-testable | pass rate |
|---|---|---|---|---|---|---|
| guide | 2163 | 51 | 0 | 0 | 0 | 97.7 % |
| no-guide | 1925 | 289 | 0 | 0 | 0 | 86.9 % |

### Per class

Pass / cases, all languages, 9 pages per column. `ng` is `no-guide`, `g` is `guide`. For a class to accept, a pass is a value accepted; for a class to refuse, a pass is a value refused.

| class | expected | cases per page | example | anthropic ng | anthropic g | openai ng | openai g | open-weight ng | open-weight g |
|---|---|---|---|---|---|---|---|---|---|
| `eai-local` | accept | 3 | `用户@example.com` | 18/27 | 27/27 | 0/27 | 27/27 | 21/27 | 27/27 |
| `eai-full` | accept | 3 | `用户@例子.中国` | 12/27 | 26/27 | 0/27 | 27/27 | 21/27 | 24/27 |
| `email-idn-domain` | accept | 4 | `contact@société.fr` | 26/36 | 36/36 | 36/36 | 36/36 | 36/36 | 36/36 |
| `idn-ulabel` | accept | 11 | `пример.рф` | 72/99 | 98/99 | 99/99 | 91/99 | 70/99 | 99/99 |
| `idn-tld-alabel` | accept | 4 | TLD in `xn--` form | 20/36 | 36/36 | 36/36 | 33/36 | 27/36 | 36/36 |
| `idn-sld-alabel` | accept | 4 | second level in `xn--` form | 36/36 | 36/36 | 36/36 | 34/36 | 36/36 | 36/36 |
| `ascii-tld-long` | accept | 11 | `contact@boutique.corsica` | 99/99 | 99/99 | 99/99 | 95/99 | 99/99 | 99/99 |
| `ascii-tld-short` | accept | 7 | two- to four-letter TLD | 63/63 | 63/63 | 63/63 | 60/63 | 63/63 | 63/63 |
| `control` | accept | 16 | `example.com`, `example.fr` | 144/144 | 144/144 | 144/144 | 139/144 | 143/144 | 144/144 |
| `boundary` | accept | 3 | a label of 63 octets | 27/27 | 27/27 | 27/27 | 25/27 | 27/27 | 27/27 |
| `boundary` | refuse | 1 | a label of 64 octets | 2/9 | 9/9 | 0/9 | 6/9 | 0/9 | 9/9 |
| `guard` | refuse | 15 | `a@@b.com`, `bad..dots.com` | 119/135 | 135/135 | 94/135 | 126/135 | 110/135 | 128/135 |

### Where the failures are

| what was read | field | anthropic ng | anthropic g | openai ng | openai g | open-weight ng | open-weight g |
|---|---|---|---|---|---|---|---|
| valid value, refusal shown by the page | email | 39 | 1 | 54 | 0 | 13 | 3 |
| valid value, refusal shown by the page | website | 38 | 1 | 0 | 27 | 38 | 0 |
| invalid value, no refusal read after the submit | email | 1 | 0 | 0 | 0 | 8 | 0 |
| invalid value, no refusal read after the submit | website | 22 | 0 | 50 | 12 | 26 | 7 |
| **total** | | 100 | 2 | 104 | 39 | 85 | 10 |

### What the pages are made of

Read in the HTML of the 54 pages, 27 per condition:

| | no-guide | guide |
|---|---|---|
| native validation switched off (`novalidate`) | 27/27: an attribute on 26, set by the script on 1 (`openai/en/no-guide/2`) | 27/27, an attribute on each |
| the email field is `type="email"` | 27/27 | 0/27 |
| the email field is `type="text"` | 0/27 | 27/27 |
| an `<input>` carries a `pattern` attribute | 0/27 | 0/27 |
| the script reads the validity of its fields (`validity`, `checkValidity`) | 9/27, the 9 `openai` pages | 0/27 |
| the script calls `setCustomValidity` or `reportValidity`, listens to `invalid`, or the style sheet uses `:invalid` | 0/27 | 0/27 |

Pages whose website field is `type="url"`, out of 3 per language:

| model | condition | en | fr | es | all languages |
|---|---|---|---|---|---|
| anthropic | no-guide | 3/3 | 3/3 | 3/3 | 9/9 |
| anthropic | guide | 0/3 | 0/3 | 1/3 | 1/9 |
| openai | no-guide | 3/3 | 3/3 | 3/3 | 9/9 |
| openai | guide | 3/3 | 2/3 | 3/3 | 8/9 |
| open-weight | no-guide | 3/3 | 1/3 | 2/3 | 6/9 |
| open-weight | guide | 2/3 | 2/3 | 2/3 | 6/9 |

### What the numbers say, and no more

- **With the guide the pass rate is higher for the three models**: 86.4 % to 99.7 %, 85.9 % to 94.7 %, 88.5 % to 98.6 %. In pages where the 66 valid cases pass: 3 to 8, 0 to 8 and 5 to 6, out of 9.
- **Internationalised email.** Without the guide the 27 pages use `type="email"`, for which a Unicode local part is a type mismatch (`GUIDE.md`, item 4 of *Do*). The 9 `openai` pages are the only ones whose script reads the validity of its fields, and they refuse all 54 addresses of `eai-local` and `eai-full`. The other 18 pages check the address with a script of their own, which refuses 36 of 108. With the guide the 27 pages use `type="text"` and 158 of 162 such addresses pass.
- **Long ASCII TLDs.** Every `ascii-tld-long` case passes but 4, and those 4 are the bare domains typed into the page of the next item, which refuses `example.com` in the same way.
- **One page is outside rule 1.** `openai/fr/guide/3` asks for the website in a `type="text"` field, tells the user to start with `https://`, and its script refuses any value without a scheme. Its 27 failures are the 27 valid bare domains of the battery, `example.com` and `example.fr` included; its 12 full URLs pass. They are 27 of the 39 failures of `openai` with the guide, and the reason six classes are lower with the guide than without it for that model (`control`, `ascii-tld-short`, `ascii-tld-long`, `idn-sld-alabel`, `idn-tld-alabel`, `idn-ulabel`). The page asks for the same thing as a `type="url"` field and does not get the `https://` that rule 1 gives to such a field: these 27 failures come from the way values are typed, not from the way the page treats a name.
- **IDNs in the website field.** Without the guide, the scripts of `anthropic` and `open-weight` pages refuse 38 valid internationalised domains each; `openai` pages refuse none. With the guide, one refusal is left outside the page above (`anthropic/es/guide/1`).
- **Invalid values.** The 16 invalid values of the battery are there so that a form cannot pass by accepting everything. With the guide 413 of 432 are refused, without it 325 of 432. Of the 126 that are not, 117 are in the website field and 110 of those in a `type="url"` field, which takes `https://-bad-.com` or a 64-octet label unless the page checks the host itself.
- **Languages.** Three pages per cell: this protocol does not allow a conclusion on the effect of the prompt language.

### Value held by the field after the test

The column `rewritten` counts the cases where the field does not hold what was typed once the case is over (`after.value !== typed` in `src/verdict.mjs`). It is not by itself a pass or a fail, and it is not always a rewrite. 721 cases, all without the guide:

| what the field held | cases | where |
|---|---|---|
| nothing: the page empties the form after a submit it accepts (`form.reset()`) | 540 | the 9 `anthropic` pages |
| the address with its domain in `xn--` form: Chromium converts an IDN domain typed in `type="email"` | 82 | `anthropic` 10 cases on 5 pages, `openai` 36 on 9, `open-weight` 36 on 9 |
| the value with `https://` in front, put there by the page's script | 99 | 3 `open-weight` pages with a text field; in one case the field also cut the value at its `maxlength` of 200 |

The `sanitized` outcome (an invalid value the page rewrote into a valid one, and did not refuse) was given to no case.

## Usage

Token counts and cost as reported by OpenRouter in each response (`usage.cost`), summed over the kept `.json` files. Scoring the pages again made no API call.

| model | prompt tokens | completion tokens | of which reasoning | cost (USD, OpenRouter-reported) |
|---|---|---|---|---|
| anthropic | 12 912 | 106 163 | 17 739 | 2.17 |
| openai | 8 652 | 44 433 | 5 492 | 2.31 |
| open-weight | 8 847 | 856 773 | 736 043 | 3.78 |
| **total** | 30 411 | 1 007 369 | 759 274 | **8.26** |

Plus 0.64 USD for the 3 discarded generations below: 8.90 USD for the run. The OpenRouter dashboard figure was not copied; these are the per-response figures.

## Discarded generations

All three are GLM 5.3 replies cut at `max_tokens`. Two were still reasoning and returned nothing (0 octets). The third, `fr/guide/3`, had started its page and was cut in the middle of it (10 440 octets, no closing tag). They were set aside, not deleted, and their cells were drawn again with a higher ceiling. Whether the ceiling changes a reply that ends below it was not tested.

| cell | ceiling | reasoning tokens | kept at |
|---|---|---|---|
| open-weight/en/no-guide/1 | 16 000 | 15 968 | `generations/open-weight/en/no-guide/1.*.truncated-16000` |
| open-weight/en/guide/2 | 64 000 | 63 869 | `truncated-64000/open-weight/en/guide/2.*` |
| open-weight/fr/guide/3 | 64 000 | 60 753 | `truncated-64000/open-weight/fr/guide/3.*` |

With 131 072, the longest GLM reply used 71 084 completion tokens (`es/guide/2`), i.e. it would have been cut at 64 000.

## Limitations

- Raw-API surface only: no IDE, no agent loop, no retrieval. Plain HTML forms from one prompt family.
- Nine pages per model and condition, three per language. The cases of a page share its fields and its script.
- The battery is finite: 82 values. Passing it is not accepting every valid address and domain.
- One engine. `GUIDE.md` reports that browsers disagree on `type="email"`; these pages were scored in Chromium only.
- The two rules of this scoring were set after the pages had been looked at, not before the run.
- What a value is typed as depends on the type of the field (rule 1). It favours a page that asks for a URL with `type="url"` over a page that asks for it in a text field.
- A refusal is read from the field and the form: `aria-invalid`, an error class, an error text in English, French or Spanish, a custom validity. An error text is looked for in the whole form, so a message about another field that appears with the tested value is read as a refusal of that value. A refusal shown only by a style is not read; no page of this bench has one.
- Validation is observed on `input`, `blur` and `submit` of a local file. The submit is dispatched on the form, not through a button, and is cancelled: nothing leaves the page. The state is read 60 ms after each event (`SETTLE_MS` in `src/form-runner.mjs`): a validator that answers later than that is read too early. A server-side check is out of scope.
- One model in the bench also reviewed the runner and this document (`openai/gpt-6-astra`).
- Models, providers and dates as pinned above; a model version served later under the same slug may behave differently.

## Reproduce

```sh
node bench/run-bench.mjs --rescore   # scores every saved page again, no API call
node bench/aggregate.mjs
node bench/sensitivity.mjs         # the gap under each combination of the two scoring rules
```

Scoring the 54 pages again gives the same `runs.csv`, byte for byte; `rescore.json` holds its sha256. A fresh run needs `OPENROUTER_API_KEY` and costs about the figure above.
