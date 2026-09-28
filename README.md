# ua-agent-kit

Universal Acceptance for AI coding agents. A public test battery of 79 email addresses, domain names and URLs, a one-page guide an agent can load before it writes validation code, and a form checker that types every case into a real page and reports what the page did. It also ships a measured before/after: the same models, asked for the same signup form, with and without the guide.

Everything here can be re-run without the author: the battery, the scores, and the 54 generated pages of the bench with their scoring.

## Install

```sh
npm i -g ua-agent-kit
npx playwright install chromium   # only needed for `ua-kit check`
```

Node.js 22 or later.

## Score a validator: `ua-kit score`

Give it a regex and the kind of value it validates. It runs the battery cases of that kind and reports per class.

```sh
ua-kit score --kind email --regex '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$'
```

```text
verdict: ua-fail  (battery 1.0.0, 33 email cases)
  control            5/6
  ascii-tld-short    3/3
  ascii-tld-long     0/4
  idn-tld-alabel     0/1
  idn-sld-alabel     1/1
  email-idn-domain   0/4
  eai-local          0/3
  eai-full           0/3
  boundary           1/1
  guard              6/7
  failing: email-control-04, email-ascii-tld-long-01, …
```

Verdicts: `ua-pass` (every case as expected), `ua-fail`, and `accept-all` for a validator that accepts every invalid guard value too: it cannot fail a valid case, and it validates nothing. `--json` gives the full result. The regex compiles without the `u` flag unless you pass `--flags u`.

From code, in JavaScript:

```js
import { score, regexValidator } from 'ua-agent-kit/runners/js/score.mjs';
import { loadBattery } from 'ua-agent-kit/src/battery.mjs';
const result = score(value => myValidator(value), loadBattery(), { kind: 'domain' });
```

In Python, `runners/py/ua_score.py` is a single file with no dependency; run it from a clone, or copy it and pass the path of `battery/cases.json` to `load_battery(path)`:

```python
import ua_score
result = ua_score.score(my_validator, ua_score.load_battery(), kind="email")
```

## Check a page: `ua-kit check`

```sh
ua-kit check signup.html            # a local file
ua-kit check https://example.org/signup --lang fr --out report/
```

The checker opens the page in a headless browser, finds the email and website fields, types every battery case of the matching kind, and reads what the page shows. Options: `--engine chromium|firefox|webkit`, `--lang en|fr|es` (the browser locale), `--json`, `--out dir` (writes `report.json` and `report.md`).

**Nothing leaves the page.** On a local file the submit event is dispatched after each case with its default action cancelled, and every request after load that is not `GET` or `HEAD` is blocked. A URL is never submitted: a value it did not visibly refuse is reported as `no-rejection-observed`, never as `accepted`.

An excerpt of the report for a page that uses a common email regex:

```text
### Email field — ` [data-ua-kit-field="email"] ` (email cases)

passed 16 · failed 17 · rewritten 0 · not-observed 0 · not-testable 0

| failing case | typed | observed | verdict |
|---|---|---|---|
| email-ascii-tld-long-01 | ` contact@boutique.corsica ` | ` contact@boutique.corsica ` | rejected-script |
| email-idn-domain-02 | ` info@пример.рф ` | ` info@пример.рф ` | rejected-script |
| email-eai-local-01 | ` josé.dupont@example.fr ` | ` josé.dupont@example.fr ` | rejected-script |

### Known patterns found in page scripts

- inline#0: matches the pattern published at https://www.regular-expressions.info/email.html (regular-expressions.info 'simple' email regex (ASCII only, letters-only TLD))
- inline#0: matches the known pattern family "TLD capped at 2-4 letters"
```

The last section comes from the pattern catalogue (`patterns/catalogue.json`): known faulty rules, each with the address where it is published. The report says a script *matches the pattern published at* that address. It does not say where the page's author took it from.

## The battery

`battery/cases.json`, version 1.0.0: 79 cases, 33 for the email field and 46 for the website field; 63 valid values a form should accept and 16 invalid values it should refuse, so that a form cannot pass by accepting everything.

| class | what it holds | expected |
|---|---|---|
| `control` | plain ASCII `.com`/`.fr`/`.org`, mixed case | accept |
| `ascii-tld-short` | 3–4 letter new gTLDs: `.bzh`, `.eus`, `.cat`, `.wien` | accept |
| `ascii-tld-long` | `.corsica`, `.technology`, `.international`, `.photography`, `.barcelona` | accept |
| `idn-tld-alabel` | ASCII labels under an A-label TLD: `example.xn--p1ai` | accept |
| `idn-sld-alabel` | A-label second level under an ASCII TLD: `xn--socit-esab.fr` | accept |
| `idn-ulabel` | U-labels in six scripts on real IDN TLDs: Latin with diacritics, Cyrillic, Arabic, CJK, Devanagari, Greek | accept |
| `eai-local` | Unicode local part, ASCII domain | accept |
| `email-idn-domain` | ASCII local part, U-label domain | accept |
| `eai-full` | Unicode local part and U-label domain | accept |
| `boundary` | 63-octet label, 253-octet name, 64-octet email local part (accept); 64-octet label (reject) | both |
| `guard` | unambiguous syntax failures: `a@@b.com`, `user@`, `user@example..com`, `bad..dots.com`, `http//example.com` | reject |

The battery tests syntax, not existence: a validator that accepts `boutique.corsica` is right even if that exact name is not registered. Every TLD used is delegated (checked in CI against a pinned copy of the IANA list, `battery/iana-tlds.txt`); every second-level name is a placeholder. URL cases use the same classes, in `https://` form, with and without path and query. A domain with a trailing dot (`example.com.`) is valid DNS syntax but is left out of the battery on purpose, and the reference validators reject it.

CI checks that the file matches its schema, that every U-label round-trips to its A-label, and that the reference validators (`runners/js/reference.mjs`, `runners/py/ua_score.py`) accept every valid case and refuse every invalid one. Choices those reference validators make, stated plainly:

- Emoji and other pictographic labels are accepted by the JavaScript validator, because UTS #46 mapping does not enforce the IDNA2008 category rules. The Python validator with the `idna` package installed rejects them (IDNA2008). This was the only divergence between the two on 24 probes (24/09/2026). Without `idna`, Python falls back to the standard library's IDNA2003 codec.
- `isValidUrl` rejects IP-literal hosts, single-label hosts (`https://localhost`) and schemes other than `http` and `https`, by design.
- The WHATWG URL parser strips leading and trailing whitespace from a URL.

## The guide

`GUIDE.md` (version 1.0.0): one page of rules for code that handles email addresses, domain names and URLs: what is valid, what to do, what not to do. It is generated into four formats (`npm run build:adapters`; never edit `adapters/` by hand):

| tool | how to load it |
|---|---|
| Claude Code | copy `adapters/claude-code/` to `.claude/skills/ua-ready-validation/` |
| Cursor | copy `adapters/cursor/ua-ready-validation.mdc` to `.cursor/rules/` |
| `AGENTS.md` (Codex and others) | paste the section from `adapters/AGENTS.md` into your `AGENTS.md` |
| GitHub Copilot | copy `adapters/copilot-instructions.md` to `.github/copilot-instructions.md` |

## The bench

Three models (`anthropic/claude-opus-5.5`, `openai/gpt-6-astra`, `z-ai/glm-5.3`) were asked for a self-contained HTML signup form in English, French and Spanish, three times each, once with the prompt alone and once with `GUIDE.md` as the system prompt: 54 pages, 4 266 scored cases, generated on 25/09/2026 and scored in Chromium 153.

| model | pass rate without the guide | with the guide |
|---|---|---|
| anthropic | 85.9 % | 99.7 % |
| openai | 85.4 % | 94.7 % |
| open-weight | 88.0 % | 98.6 % |

Nine pages per row, three per language: this is enough to see where forms fail, not to rank models. What the numbers say and what they do not, the two scoring rules and why they were set, per-class tables, cost and every limitation are in [`bench/results/RESULTS.md`](bench/results/RESULTS.md). Every generated page is in `bench/results/generations/`; `node bench/run-bench.mjs --rescore` scores them again, byte for byte, with no API call.

No model judges any result: every verdict is read from the page by the runner.

## What this does not measure

- Framework forms (React, Vue, Svelte): the bench asks for plain HTML + JavaScript; the form runner tests whatever a page serves, but the bench does not measure framework output.
- Server-side validation always, and on a URL validation that runs only on submit: a URL is never submitted, so the absence of a rejection is reported as `no-rejection-observed`, never as `accepted`.
- Storage, processing, display, email delivery (MX/EAI): the kit measures acceptance and validation only.
- App surfaces (claude.ai, ChatGPT, Cursor's own harness): the bench uses the raw API surface only.
- Any certification or compliance claim.

One measured limit of the checker: it reads each field 60 ms after an event (`SETTLE_MS` in `src/form-runner.mjs`). A validator that is debounced or asynchronous beyond that delay is read before it answers, and the value is reported as not refused.

## Add a catalogue entry

An entry in `patterns/catalogue.json` is a faulty rule that someone has **published**. Copy the pattern byte for byte from the page that publishes it; give `source_url`, `source_title` and the date you read it (`verified`); list the battery classes it rejects. A rule known only as a family (for example a TLD capped at four letters) goes in without a `source_url` and is reported as a *known pattern family*. Run `npm test` before opening a pull request.

## Licences

- Code: MIT (`LICENSE-CODE.md`)
- Battery, catalogue and bench results: CC0 1.0 (`LICENSE-DATA.md`)
- Guide: CC BY 4.0 (`LICENSE-GUIDE.md`)

## Author

Matthieu Crédou. Issues and pull requests are welcome.
