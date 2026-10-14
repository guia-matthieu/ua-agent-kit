# Results — run of 2026-10-13 (v0.2)

Written by `summary.py` from the CSV files of this folder. Read `README.md` first: it says what was run and what the numbers do not show.

First draft: 36 pages generated, 35 testable. Hardening: 35 pages generated, 34 testable, 34 comparable before and after.

## First draft, standard battery 1.0.0 (82 cases per page), three languages

| group | model | guide | pages | valid values accepted | guards refused |
|---|---|---|---|---|---|
| Google | gemini-3-8-flash | without | 9 | 560/594 | 85/144 |
| Google | gemini-3-8-flash | with | 9 | 594/594 | 92/144 |
| Mistral | mistral-large-4-0 | without | 9 | 509/594 | 94/144 |
| Mistral | mistral-large-4-0 | with | 8 | 498/528 | 115/128 |

## First draft, TLD packs (62 cases per page), three languages

| group | model | guide | pages | geoTLD, ASCII | accented .fr, as typed | accented geoTLD, as typed (syntax only) | A-label | accented local part | guards refused |
|---|---|---|---|---|---|---|---|---|---|
| Google | gemini-3-8-flash | without | 9 | 134/135 | 23/27 | 115/135 | 160/162 | 27/27 | 31/72 |
| Google | gemini-3-8-flash | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 38/72 |
| Mistral | mistral-large-4-0 | without | 9 | 134/135 | 19/27 | 95/135 | 160/162 | 21/27 | 38/72 |
| Mistral | mistral-large-4-0 | with | 8 | 115/120 | 23/24 | 115/120 | 138/144 | 21/24 | 55/64 |

## First draft, TLD packs, pages comparable with their hardened version only

| group | model | guide | pages | geoTLD, ASCII | accented .fr, as typed | accented geoTLD, as typed (syntax only) | A-label | accented local part | guards refused |
|---|---|---|---|---|---|---|---|---|---|
| Google | gemini-3-8-flash | without | 9 | 134/135 | 23/27 | 115/135 | 160/162 | 27/27 | 31/72 |
| Google | gemini-3-8-flash | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 38/72 |
| Mistral | mistral-large-4-0 | without | 9 | 134/135 | 19/27 | 95/135 | 160/162 | 21/27 | 38/72 |
| Mistral | mistral-large-4-0 | with | 7 | 100/105 | 20/21 | 100/105 | 120/126 | 18/21 | 47/56 |

## After hardening, same pages

| group | model | guide | pages | geoTLD, ASCII | accented .fr, as typed | accented geoTLD, as typed (syntax only) | A-label | accented local part | guards refused |
|---|---|---|---|---|---|---|---|---|---|
| Google | gemini-3-8-flash | without | 9 | 135/135 | 21/27 | 105/135 | 138/162 | 0/27 | 72/72 |
| Google | gemini-3-8-flash | with | 9 | 135/135 | 27/27 | 135/135 | 162/162 | 27/27 | 72/72 |
| Mistral | mistral-large-4-0 | without | 9 | 135/135 | 19/27 | 95/135 | 162/162 | 0/27 | 71/72 |
| Mistral | mistral-large-4-0 | with | 7 | 105/105 | 21/21 | 105/105 | 126/126 | 21/21 | 46/56 |

## Regressions at hardening (a valid value accepted before, refused after)

**Language: all**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 18 | 16 | 108 | 30 | 0 → 0 |
| with | 16 | 0 | 0 | 20 | 4 → 13 |

**Language: fr**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 6 | 5 | 75 | 3 | 0 → 0 |
| with | 6 | 0 | 0 | 20 | 2 → 5 |

**Language: en**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 6 | 6 | 18 | 12 | 0 → 0 |
| with | 5 | 0 | 0 | 0 | 1 → 4 |

**Language: es**

| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |
|---|---|---|---|---|---|
| without | 6 | 5 | 15 | 15 | 0 → 0 |
| with | 5 | 0 | 0 | 0 | 1 → 4 |

**Values lost, by family**

| guide | family | values lost |
|---|---|---|
| without | accented local part | 48 |
| without | accented geoTLD, as typed (syntax only) | 30 |
| without | A-label | 24 |
| without | accented .fr, as typed | 6 |

**Values lost, by model**

| model | guide | values lost |
|---|---|---|
| gemini-3-8-flash | without | 87 |
| mistral-large-4-0 | without | 21 |

**ASCII geoTLD values lost**

| value | pages |
|---|---|

Cost reported by OpenRouter: first draft 0.888 USD, hardening 1.344 USD.
