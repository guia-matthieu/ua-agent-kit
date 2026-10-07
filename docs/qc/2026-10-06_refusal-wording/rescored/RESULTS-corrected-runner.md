# Results — run of 2026-10-06

Written by `summary.py` from the CSV files of this folder. Read `README.md` first: it says what was run and what the numbers do not show.

First draft: 126 pages generated, 122 testable. Hardening: 122 pages generated, 119 testable, 119 comparable before and after.

## First draft, standard battery 1.0.0 (82 cases per page), three languages

| group | model | guide | pages | valid values accepted | guards refused |
|---|---|---|---|---|---|
| Code | qwen3-coder-30b | without | 8 | 440/528 | 84/128 |
| Code | qwen3-coder-30b | with | 7 | 409/462 | 75/112 |
| Code | deepseek-v4-flash | without | 9 | 564/594 | 74/144 |
| Code | deepseek-v4-flash | with | 8 | 528/528 | 60/128 |
| Chat | mistral-medium-3-1 | without | 9 | 444/594 | 102/144 |
| Chat | mistral-medium-3-1 | with | 9 | 577/594 | 99/144 |
| Chat | gpt-oss-120b | without | 9 | 594/594 | 84/144 |
| Chat | gpt-oss-120b | with | 9 | 588/594 | 67/144 |
| Chat | mistral-small-3-2 | without | 9 | 508/594 | 85/144 |
| Chat | mistral-small-3-2 | with | 9 | 428/594 | 97/144 |
| Chat | ministral-8b | without | 9 | 466/594 | 99/144 |
| Chat | ministral-8b | with | 9 | 424/594 | 106/144 |
| Chat | gemma-4-31b | without | 9 | 514/594 | 82/144 |
| Chat | gemma-4-31b | with | 9 | 594/594 | 74/144 |

## First draft, TLD packs (62 cases per page), three languages

| group | model | guide | pages | geoTLD, ASCII | accented .fr, as typed | accented geoTLD, as typed (syntax only) | A-label | accented local part | guards refused |
|---|---|---|---|---|---|---|---|---|---|
| Code | qwen3-coder-30b | without | 8 | 120/120 | 16/24 | 80/120 | 144/144 | 12/24 | 36/64 |
| Code | qwen3-coder-30b | with | 7 | 105/105 | 17/21 | 85/105 | 126/126 | 5/21 | 32/56 |
| Code | deepseek-v4-flash | without | 9 | 135/135 | 25/27 | 125/135 | 162/162 | 21/27 | 27/72 |
| Code | deepseek-v4-flash | with | 8 | 120/120 | 24/24 | 120/120 | 144/144 | 24/24 | 20/64 |
| Chat | mistral-medium-3-1 | without | 9 | 135/135 | 15/27 | 75/135 | 162/162 | 0/27 | 48/72 |
| Chat | mistral-medium-3-1 | with | 9 | 135/135 | 26/27 | 130/135 | 162/162 | 25/27 | 39/72 |
| Chat | gpt-oss-120b | without | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 29/72 |
| Chat | gpt-oss-120b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 21/72 |
| Chat | mistral-small-3-2 | without | 9 | 135/135 | 23/27 | 115/135 | 162/162 | 0/27 | 37/72 |
| Chat | mistral-small-3-2 | with | 9 | 135/135 | 15/27 | 75/135 | 162/162 | 0/27 | 45/72 |
| Chat | ministral-8b | without | 9 | 135/135 | 17/27 | 85/135 | 162/162 | 3/27 | 45/72 |
| Chat | ministral-8b | with | 9 | 135/135 | 15/27 | 75/135 | 162/162 | 0/27 | 52/72 |
| Chat | gemma-4-31b | without | 9 | 135/135 | 17/27 | 85/135 | 162/162 | 27/27 | 34/72 |
| Chat | gemma-4-31b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 20/72 |

## First draft, TLD packs, pages comparable with their hardened version only

| group | model | guide | pages | geoTLD, ASCII | accented .fr, as typed | accented geoTLD, as typed (syntax only) | A-label | accented local part | guards refused |
|---|---|---|---|---|---|---|---|---|---|
| Code | qwen3-coder-30b | without | 6 | 90/90 | 12/18 | 60/90 | 108/108 | 9/18 | 27/48 |
| Code | qwen3-coder-30b | with | 6 | 90/90 | 16/18 | 80/90 | 108/108 | 5/18 | 24/48 |
| Code | deepseek-v4-flash | without | 9 | 135/135 | 25/27 | 125/135 | 162/162 | 21/27 | 27/72 |
| Code | deepseek-v4-flash | with | 8 | 120/120 | 24/24 | 120/120 | 144/144 | 24/24 | 20/64 |
| Chat | mistral-medium-3-1 | without | 9 | 135/135 | 15/27 | 75/135 | 162/162 | 0/27 | 48/72 |
| Chat | mistral-medium-3-1 | with | 9 | 135/135 | 26/27 | 130/135 | 162/162 | 25/27 | 39/72 |
| Chat | gpt-oss-120b | without | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 29/72 |
| Chat | gpt-oss-120b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 21/72 |
| Chat | mistral-small-3-2 | without | 9 | 135/135 | 23/27 | 115/135 | 162/162 | 0/27 | 37/72 |
| Chat | mistral-small-3-2 | with | 9 | 135/135 | 15/27 | 75/135 | 162/162 | 0/27 | 45/72 |
| Chat | ministral-8b | without | 9 | 135/135 | 17/27 | 85/135 | 162/162 | 3/27 | 45/72 |
| Chat | ministral-8b | with | 9 | 135/135 | 15/27 | 75/135 | 162/162 | 0/27 | 52/72 |
| Chat | gemma-4-31b | without | 9 | 135/135 | 17/27 | 85/135 | 162/162 | 27/27 | 34/72 |
| Chat | gemma-4-31b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 20/72 |

## After hardening, same pages

| group | model | guide | pages | geoTLD, ASCII | accented .fr, as typed | accented geoTLD, as typed (syntax only) | A-label | accented local part | guards refused |
|---|---|---|---|---|---|---|---|---|---|
| Code | qwen3-coder-30b | without | 6 | 85/90 | 14/18 | 70/90 | 108/108 | 0/18 | 38/48 |
| Code | qwen3-coder-30b | with | 6 | 90/90 | 13/18 | 65/90 | 90/108 | 5/18 | 34/48 |
| Code | deepseek-v4-flash | without | 9 | 135/135 | 24/27 | 120/135 | 162/162 | 9/27 | 46/72 |
| Code | deepseek-v4-flash | with | 8 | 120/120 | 24/24 | 120/120 | 144/144 | 24/24 | 38/64 |
| Chat | mistral-medium-3-1 | without | 9 | 134/135 | 13/27 | 65/135 | 160/162 | 0/27 | 56/72 |
| Chat | mistral-medium-3-1 | with | 9 | 135/135 | 24/27 | 120/135 | 162/162 | 21/27 | 53/72 |
| Chat | gpt-oss-120b | without | 9 | 135/135 | 23/27 | 115/135 | 162/162 | 4/27 | 59/72 |
| Chat | gpt-oss-120b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 47/72 |
| Chat | mistral-small-3-2 | without | 9 | 135/135 | 13/27 | 65/135 | 162/162 | 0/27 | 51/72 |
| Chat | mistral-small-3-2 | with | 9 | 135/135 | 13/27 | 65/135 | 162/162 | 0/27 | 53/72 |
| Chat | ministral-8b | without | 9 | 135/135 | 9/27 | 45/135 | 162/162 | 0/27 | 55/72 |
| Chat | ministral-8b | with | 9 | 115/120 | 12/26 | 60/130 | 144/144 | 0/27 | 56/70 |
| Chat | gemma-4-31b | without | 9 | 130/135 | 17/27 | 85/135 | 152/162 | 2/27 | 50/72 |
| Chat | gemma-4-31b | with | 9 | 130/135 | 25/27 | 125/135 | 156/162 | 25/27 | 32/72 |

## Regressions at hardening (a valid value accepted before, refused after)

**Language: all**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 60 | 37 | 293 | 60 | 0 → 0 |
| with | 59 | 10 | 130 | 24 | 0 → 5 |

**Language: fr**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 20 | 15 | 119 | 12 | 0 → 0 |
| with | 20 | 4 | 44 | 0 | 0 → 2 |

**Language: en**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 21 | 10 | 70 | 48 | 0 → 0 |
| with | 20 | 2 | 20 | 24 | 0 → 1 |

**Language: es**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 19 | 12 | 104 | 0 | 0 → 0 |
| with | 19 | 4 | 66 | 0 | 0 → 2 |

**Values lost, by family**

| guide | family | values lost |
|---|---|---|
| without | accented geoTLD, as typed (syntax only) | 165 |
| without | accented local part | 72 |
| without | accented .fr, as typed | 33 |
| without | A-label | 12 |
| without | geoTLD, ASCII | 11 |
| with | accented geoTLD, as typed (syntax only) | 75 |
| with | A-label | 24 |
| with | accented .fr, as typed | 15 |
| with | geoTLD, ASCII | 10 |
| with | accented local part | 6 |

**Values lost, by model**

| model | guide | values lost |
|---|---|---|
| gemma-4-31b | without | 64 |
| mistral-small-3-2 | without | 60 |
| ministral-8b | without | 51 |
| gpt-oss-120b | without | 47 |
| ministral-8b | with | 41 |
| mistral-medium-3-1 | without | 39 |
| qwen3-coder-30b | with | 36 |
| gemma-4-31b | with | 25 |
| deepseek-v4-flash | without | 18 |
| mistral-medium-3-1 | with | 16 |
| qwen3-coder-30b | without | 14 |
| mistral-small-3-2 | with | 12 |

**ASCII geoTLD values lost**

| value | pages |
|---|---|
| `https://mairie.corsica` | 6 |
| `https://www.mairie.alsace/contact` | 3 |
| `https://www.mairie.paris/contact` | 3 |
| `https://www.mairie.corsica/contact` | 3 |
| `https://www.kemper.bzh/contact` | 3 |
| `https://www.udala.eus/contact` | 3 |

Cost reported by OpenRouter: first draft 0.157 USD, hardening 0.151 USD.
