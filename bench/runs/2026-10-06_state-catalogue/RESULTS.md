# Results — run of 2026-10-06

Written by `summary.py` from the CSV files of this folder. Read `README.md` first: it says what was run and what the numbers do not show.

First draft: 126 pages generated, 122 testable. Hardening: 122 pages generated, 119 testable, 119 comparable before and after.

## First draft, standard battery 1.0.0 (82 cases per page), three languages

| group | model | guide | pages | valid values accepted | guards refused |
|---|---|---|---|---|---|
| Code | qwen3-coder-30b | without | 8 | 456/528 | 82/128 |
| Code | qwen3-coder-30b | with | 7 | 416/462 | 54/112 |
| Code | deepseek-v4-flash | without | 9 | 564/594 | 74/144 |
| Code | deepseek-v4-flash | with | 8 | 528/528 | 52/128 |
| Chat | mistral-medium-3-1 | without | 9 | 492/594 | 96/144 |
| Chat | mistral-medium-3-1 | with | 9 | 586/594 | 40/144 |
| Chat | gpt-oss-120b | without | 9 | 594/594 | 18/144 |
| Chat | gpt-oss-120b | with | 9 | 589/594 | 11/144 |
| Chat | mistral-small-3-2 | without | 9 | 540/594 | 78/144 |
| Chat | mistral-small-3-2 | with | 9 | 552/594 | 70/144 |
| Chat | ministral-8b | without | 9 | 546/594 | 80/144 |
| Chat | ministral-8b | with | 9 | 540/594 | 90/144 |
| Chat | gemma-4-31b | without | 9 | 546/594 | 54/144 |
| Chat | gemma-4-31b | with | 9 | 594/594 | 74/144 |

## First draft, TLD packs (62 cases per page), three languages

| group | model | guide | pages | geoTLD, ASCII | accented .fr, as typed | accented geoTLD, as typed (syntax only) | A-label | accented local part | guards refused |
|---|---|---|---|---|---|---|---|---|---|
| Code | qwen3-coder-30b | without | 8 | 120/120 | 18/24 | 90/120 | 144/144 | 12/24 | 34/64 |
| Code | qwen3-coder-30b | with | 7 | 105/105 | 18/21 | 90/105 | 126/126 | 7/21 | 25/56 |
| Code | deepseek-v4-flash | without | 9 | 135/135 | 25/27 | 125/135 | 162/162 | 21/27 | 27/72 |
| Code | deepseek-v4-flash | with | 8 | 120/120 | 24/24 | 120/120 | 144/144 | 24/24 | 18/64 |
| Chat | mistral-medium-3-1 | without | 9 | 135/135 | 21/27 | 105/135 | 162/162 | 0/27 | 42/72 |
| Chat | mistral-medium-3-1 | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 13/72 |
| Chat | gpt-oss-120b | without | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 6/72 |
| Chat | gpt-oss-120b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 3/72 |
| Chat | mistral-small-3-2 | without | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 0/27 | 32/72 |
| Chat | mistral-small-3-2 | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 6/27 | 28/72 |
| Chat | ministral-8b | without | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 3/27 | 32/72 |
| Chat | ministral-8b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 0/27 | 36/72 |
| Chat | gemma-4-31b | without | 9 | 135/135 | 21/27 | 105/135 | 162/162 | 27/27 | 22/72 |
| Chat | gemma-4-31b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 20/72 |

## First draft, TLD packs, pages comparable with their hardened version only

| group | model | guide | pages | geoTLD, ASCII | accented .fr, as typed | accented geoTLD, as typed (syntax only) | A-label | accented local part | guards refused |
|---|---|---|---|---|---|---|---|---|---|
| Code | qwen3-coder-30b | without | 6 | 90/90 | 14/18 | 70/90 | 108/108 | 9/18 | 25/48 |
| Code | qwen3-coder-30b | with | 6 | 90/90 | 17/18 | 85/90 | 108/108 | 7/18 | 17/48 |
| Code | deepseek-v4-flash | without | 9 | 135/135 | 25/27 | 125/135 | 162/162 | 21/27 | 27/72 |
| Code | deepseek-v4-flash | with | 8 | 120/120 | 24/24 | 120/120 | 144/144 | 24/24 | 18/64 |
| Chat | mistral-medium-3-1 | without | 9 | 135/135 | 21/27 | 105/135 | 162/162 | 0/27 | 42/72 |
| Chat | mistral-medium-3-1 | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 13/72 |
| Chat | gpt-oss-120b | without | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 6/72 |
| Chat | gpt-oss-120b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 3/72 |
| Chat | mistral-small-3-2 | without | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 0/27 | 32/72 |
| Chat | mistral-small-3-2 | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 6/27 | 28/72 |
| Chat | ministral-8b | without | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 3/27 | 32/72 |
| Chat | ministral-8b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 0/27 | 36/72 |
| Chat | gemma-4-31b | without | 9 | 135/135 | 21/27 | 105/135 | 162/162 | 27/27 | 22/72 |
| Chat | gemma-4-31b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 20/72 |

## After hardening, same pages

| group | model | guide | pages | geoTLD, ASCII | accented .fr, as typed | accented geoTLD, as typed (syntax only) | A-label | accented local part | guards refused |
|---|---|---|---|---|---|---|---|---|---|
| Code | qwen3-coder-30b | without | 6 | 85/90 | 14/18 | 70/90 | 108/108 | 0/18 | 36/48 |
| Code | qwen3-coder-30b | with | 6 | 90/90 | 14/18 | 70/90 | 90/108 | 7/18 | 19/48 |
| Code | deepseek-v4-flash | without | 9 | 135/135 | 24/27 | 120/135 | 162/162 | 9/27 | 43/72 |
| Code | deepseek-v4-flash | with | 8 | 120/120 | 24/24 | 120/120 | 144/144 | 24/24 | 31/64 |
| Chat | mistral-medium-3-1 | without | 9 | 135/135 | 21/27 | 105/135 | 162/162 | 0/27 | 45/72 |
| Chat | mistral-medium-3-1 | with | 9 | 135/135 | 26/27 | 130/135 | 162/162 | 25/27 | 13/72 |
| Chat | gpt-oss-120b | without | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 19/27 | 6/72 |
| Chat | gpt-oss-120b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 18/72 |
| Chat | mistral-small-3-2 | without | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 0/27 | 32/72 |
| Chat | mistral-small-3-2 | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 6/27 | 28/72 |
| Chat | ministral-8b | without | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 3/27 | 32/72 |
| Chat | ministral-8b | with | 9 | 120/120 | 24/24 | 120/120 | 144/144 | 0/27 | 36/68 |
| Chat | gemma-4-31b | without | 9 | 132/135 | 21/27 | 105/135 | 156/162 | 9/27 | 34/72 |
| Chat | gemma-4-31b | with | 9 | 135/135 | 26/27 | 130/135 | 162/162 | 25/27 | 32/72 |

## Regressions at hardening (a valid value accepted before, refused after)

**Language: all**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 60 | 17 | 103 | 36 | 0 → 0 |
| with | 59 | 3 | 52 | 0 | 0 → 2 |

**Language: fr**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 20 | 7 | 45 | 24 | 0 → 0 |
| with | 20 | 1 | 8 | 0 | 0 → 2 |

**Language: en**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 21 | 4 | 11 | 12 | 0 → 0 |
| with | 20 | 0 | 0 | 0 | 0 → 0 |

**Language: es**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 19 | 6 | 47 | 0 | 0 → 0 |
| with | 19 | 2 | 44 | 0 | 0 → 0 |

**Values lost, by family**

| guide | family | values lost |
|---|---|---|
| without | accented local part | 47 |
| without | accented geoTLD, as typed (syntax only) | 35 |
| without | geoTLD, ASCII | 8 |
| without | accented .fr, as typed | 7 |
| without | A-label | 6 |
| with | accented geoTLD, as typed (syntax only) | 25 |
| with | A-label | 18 |
| with | accented .fr, as typed | 5 |
| with | accented local part | 4 |

**Values lost, by model**

| model | guide | values lost |
|---|---|---|
| gemma-4-31b | without | 51 |
| qwen3-coder-30b | with | 36 |
| deepseek-v4-flash | without | 18 |
| qwen3-coder-30b | without | 14 |
| mistral-medium-3-1 | without | 12 |
| gemma-4-31b | with | 8 |
| gpt-oss-120b | without | 8 |
| mistral-medium-3-1 | with | 8 |

**ASCII geoTLD values lost**

| value | pages |
|---|---|
| `https://mairie.corsica` | 3 |
| `https://www.mairie.alsace/contact` | 1 |
| `https://www.mairie.paris/contact` | 1 |
| `https://www.mairie.corsica/contact` | 1 |
| `https://www.kemper.bzh/contact` | 1 |
| `https://www.udala.eus/contact` | 1 |

Cost reported by OpenRouter: first draft 0.157 USD, hardening 0.151 USD.
