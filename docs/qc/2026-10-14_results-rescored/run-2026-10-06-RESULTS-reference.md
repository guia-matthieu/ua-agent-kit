# Results — run of 2026-10-06

Written by `summary.py` of the run from the reference scoring, `docs/qc/2026-10-09_finding-5/rescored/`, not from the CSV files in the folder of the run. Read `README.md` first: it says what was run and what the numbers do not show.

First draft: 126 pages generated, 122 testable. Hardening: 122 pages generated, 119 testable, 119 comparable before and after.

## First draft, standard battery 1.0.0 (82 cases per page), three languages

| group | model | guide | pages | valid values accepted | guards refused |
|---|---|---|---|---|---|
| Code | qwen3-coder-30b | without | 8 | 440/528 | 84/128 |
| Code | qwen3-coder-30b | with | 7 | 409/462 | 80/112 |
| Code | deepseek-v4-flash | without | 9 | 564/594 | 77/135 |
| Code | deepseek-v4-flash | with | 8 | 528/528 | 69/128 |
| Chat | mistral-medium-3-1 | without | 9 | 444/594 | 102/144 |
| Chat | mistral-medium-3-1 | with | 9 | 577/594 | 99/144 |
| Chat | gpt-oss-120b | without | 9 | 594/594 | 84/144 |
| Chat | gpt-oss-120b | with | 9 | 588/594 | 91/144 |
| Chat | mistral-small-3-2 | without | 9 | 508/594 | 91/144 |
| Chat | mistral-small-3-2 | with | 9 | 428/594 | 99/144 |
| Chat | ministral-8b | without | 9 | 466/594 | 99/144 |
| Chat | ministral-8b | with | 9 | 424/594 | 106/144 |
| Chat | gemma-4-31b | without | 9 | 514/594 | 82/144 |
| Chat | gemma-4-31b | with | 9 | 594/594 | 80/144 |

## First draft, TLD packs (62 cases per page), three languages

| group | model | guide | pages | geoTLD, ASCII | accented .fr, as typed | accented geoTLD, as typed (syntax only) | A-label | accented local part | guards refused |
|---|---|---|---|---|---|---|---|---|---|
| Code | qwen3-coder-30b | without | 8 | 120/120 | 16/24 | 80/120 | 144/144 | 12/24 | 36/64 |
| Code | qwen3-coder-30b | with | 7 | 105/105 | 17/21 | 85/105 | 126/126 | 5/21 | 34/56 |
| Code | deepseek-v4-flash | without | 9 | 135/135 | 25/27 | 125/135 | 162/162 | 21/27 | 28/69 |
| Code | deepseek-v4-flash | with | 8 | 120/120 | 24/24 | 120/120 | 144/144 | 24/24 | 24/64 |
| Chat | mistral-medium-3-1 | without | 9 | 135/135 | 15/27 | 75/135 | 162/162 | 0/27 | 48/72 |
| Chat | mistral-medium-3-1 | with | 9 | 135/135 | 26/27 | 130/135 | 162/162 | 25/27 | 39/72 |
| Chat | gpt-oss-120b | without | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 29/72 |
| Chat | gpt-oss-120b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 30/72 |
| Chat | mistral-small-3-2 | without | 9 | 135/135 | 23/27 | 115/135 | 162/162 | 0/27 | 40/72 |
| Chat | mistral-small-3-2 | with | 9 | 135/135 | 15/27 | 75/135 | 162/162 | 0/27 | 46/72 |
| Chat | ministral-8b | without | 9 | 135/135 | 17/27 | 85/135 | 162/162 | 3/27 | 45/72 |
| Chat | ministral-8b | with | 9 | 135/135 | 15/27 | 75/135 | 162/162 | 0/27 | 52/72 |
| Chat | gemma-4-31b | without | 9 | 135/135 | 17/27 | 85/135 | 162/162 | 27/27 | 34/72 |
| Chat | gemma-4-31b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 22/72 |

## First draft, TLD packs, pages comparable with their hardened version only

| group | model | guide | pages | geoTLD, ASCII | accented .fr, as typed | accented geoTLD, as typed (syntax only) | A-label | accented local part | guards refused |
|---|---|---|---|---|---|---|---|---|---|
| Code | qwen3-coder-30b | without | 6 | 90/90 | 12/18 | 60/90 | 108/108 | 9/18 | 27/48 |
| Code | qwen3-coder-30b | with | 6 | 90/90 | 16/18 | 80/90 | 108/108 | 5/18 | 26/48 |
| Code | deepseek-v4-flash | without | 9 | 135/135 | 25/27 | 125/135 | 162/162 | 21/27 | 28/69 |
| Code | deepseek-v4-flash | with | 8 | 120/120 | 24/24 | 120/120 | 144/144 | 24/24 | 24/64 |
| Chat | mistral-medium-3-1 | without | 9 | 135/135 | 15/27 | 75/135 | 162/162 | 0/27 | 48/72 |
| Chat | mistral-medium-3-1 | with | 9 | 135/135 | 26/27 | 130/135 | 162/162 | 25/27 | 39/72 |
| Chat | gpt-oss-120b | without | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 29/72 |
| Chat | gpt-oss-120b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 30/72 |
| Chat | mistral-small-3-2 | without | 9 | 135/135 | 23/27 | 115/135 | 162/162 | 0/27 | 40/72 |
| Chat | mistral-small-3-2 | with | 9 | 135/135 | 15/27 | 75/135 | 162/162 | 0/27 | 46/72 |
| Chat | ministral-8b | without | 9 | 135/135 | 17/27 | 85/135 | 162/162 | 3/27 | 45/72 |
| Chat | ministral-8b | with | 9 | 135/135 | 15/27 | 75/135 | 162/162 | 0/27 | 52/72 |
| Chat | gemma-4-31b | without | 9 | 135/135 | 17/27 | 85/135 | 162/162 | 27/27 | 34/72 |
| Chat | gemma-4-31b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 22/72 |

## After hardening, same pages

| group | model | guide | pages | geoTLD, ASCII | accented .fr, as typed | accented geoTLD, as typed (syntax only) | A-label | accented local part | guards refused |
|---|---|---|---|---|---|---|---|---|---|
| Code | qwen3-coder-30b | without | 6 | 85/90 | 14/18 | 70/90 | 108/108 | 0/18 | 38/48 |
| Code | qwen3-coder-30b | with | 6 | 90/90 | 13/18 | 65/90 | 90/108 | 5/18 | 39/48 |
| Code | deepseek-v4-flash | without | 9 | 135/135 | 22/27 | 110/135 | 162/162 | 6/24 | 51/64 |
| Code | deepseek-v4-flash | with | 8 | 120/120 | 24/24 | 120/120 | 144/144 | 24/24 | 49/64 |
| Chat | mistral-medium-3-1 | without | 9 | 134/135 | 13/27 | 65/135 | 160/162 | 0/27 | 56/72 |
| Chat | mistral-medium-3-1 | with | 9 | 125/125 | 22/25 | 110/125 | 150/150 | 21/27 | 50/67 |
| Chat | gpt-oss-120b | without | 9 | 135/135 | 23/27 | 115/135 | 162/162 | 4/27 | 59/72 |
| Chat | gpt-oss-120b | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 69/72 |
| Chat | mistral-small-3-2 | without | 9 | 135/135 | 13/27 | 65/135 | 162/162 | 0/27 | 51/72 |
| Chat | mistral-small-3-2 | with | 9 | 135/135 | 13/27 | 65/135 | 162/162 | 0/27 | 53/72 |
| Chat | ministral-8b | without | 9 | 135/135 | 9/27 | 45/135 | 162/162 | 0/27 | 55/72 |
| Chat | ministral-8b | with | 9 | 115/120 | 12/26 | 60/130 | 144/144 | 0/27 | 56/70 |
| Chat | gemma-4-31b | without | 9 | 130/135 | 17/27 | 85/135 | 152/162 | 2/27 | 50/72 |
| Chat | gemma-4-31b | with | 9 | 135/135 | 26/27 | 130/135 | 162/162 | 25/27 | 49/72 |

## Regressions at hardening (a valid value accepted before, refused after)

**Language: all**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 60 | 37 | 305 | 60 | 0 → 1 |
| with | 59 | 9 | 113 | 24 | 0 → 10 |

**Language: fr**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 20 | 15 | 119 | 12 | 0 → 0 |
| with | 20 | 4 | 44 | 0 | 0 → 3 |

**Language: en**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 21 | 10 | 70 | 48 | 0 → 1 |
| with | 20 | 2 | 20 | 24 | 0 → 3 |

**Language: es**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 19 | 12 | 116 | 0 | 0 → 0 |
| with | 19 | 3 | 49 | 0 | 0 → 4 |

**Values lost, by family**

| guide | family | values lost |
|---|---|---|
| without | accented geoTLD, as typed (syntax only) | 175 |
| without | accented local part | 72 |
| without | accented .fr, as typed | 35 |
| without | A-label | 12 |
| without | geoTLD, ASCII | 11 |
| with | accented geoTLD, as typed (syntax only) | 70 |
| with | A-label | 18 |
| with | accented .fr, as typed | 14 |
| with | accented local part | 6 |
| with | geoTLD, ASCII | 5 |

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
| deepseek-v4-flash | without | 30 |
| mistral-medium-3-1 | with | 16 |
| qwen3-coder-30b | without | 14 |
| mistral-small-3-2 | with | 12 |
| gemma-4-31b | with | 8 |

**ASCII geoTLD values lost**

| value | pages |
|---|---|
| `https://mairie.corsica` | 6 |
| `https://www.mairie.alsace/contact` | 2 |
| `https://www.mairie.paris/contact` | 2 |
| `https://www.mairie.corsica/contact` | 2 |
| `https://www.kemper.bzh/contact` | 2 |
| `https://www.udala.eus/contact` | 2 |

Cost reported by OpenRouter: first draft 0.157 USD, hardening 0.151 USD.
