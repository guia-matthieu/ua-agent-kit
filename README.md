# ua-agent-kit

Universal Acceptance for AI coding agents. A public test battery of 82 email addresses, domain names and URLs, a one-page guide an agent can load before it writes validation code, and a form checker that types every case into a real page and reports what the page did. It also ships a measured before/after: the same models, asked for the same signup form, with and without the guide.

It measures whether a form *accepts or refuses* a value on the client side. It is not an end-to-end Universal Acceptance assessment: storage, display, server-side checks and email delivery are out of scope (see *What this does not measure*).

Source: https://github.com/guia-matthieu/ua-agent-kit · the battery: [`battery/cases.json`](battery/cases.json) · the guide: [`GUIDE.md`](GUIDE.md) · the bench: [`bench/results/RESULTS.md`](bench/results/RESULTS.md). The battery, the scores and the 54 generated pages of the bench can be re-scored without the author.

## Install

```sh
npm i -g ua-agent-kit
npx playwright install chromium   # only needed for `ua-kit check`
```

Node.js 22 or later. `--engine firefox` or `webkit` needs `npx playwright install firefox webkit` as well.

From a clone (to run the tests, rebuild the adapters, re-score the bench or contribute):

```sh
git clone https://github.com/guia-matthieu/ua-agent-kit && cd ua-agent-kit
npm ci && npx playwright install chromium
npm test
```

## Score a validator: `ua-kit score`

Give it a regex and the kind of value it validates: `email`, `domain` or `url`. It runs the battery cases of that kind and reports per class.

```sh
ua-kit score --kind email --regex '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$'
```

```text
verdict: ua-fail  (battery 1.0.0, 34 email cases)
  control            6/7
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

Verdicts: `ua-pass` (every case as expected), `ua-fail`, and `accept-all` when the validator accepts every `guard` case of the battery: it refused none of the malformed values, so its passes on valid cases say nothing. `--json` gives the full result. The regex compiles without the `u` flag unless you pass `--flags u`.

From code, in JavaScript (with `ua-agent-kit` installed in the project, `npm i ua-agent-kit`, in an ES module):

```js
import { score, regexValidator } from 'ua-agent-kit/runners/js/score.mjs';
import { loadBattery } from 'ua-agent-kit/src/battery.mjs';
const result = score(value => myValidator(value), loadBattery(), { kind: 'domain' });
```

In Python (3.10 or later), `runners/py/ua_score.py` is a single file with no required dependency (`idna` is optional, see below). From the root of a clone:

```python
import sys; sys.path.insert(0, "runners/py")
import ua_score
result = ua_score.score(my_validator, ua_score.load_battery(), kind="email")
```

If you copy the file elsewhere, copy `battery/cases.json` too and pass its path: `ua_score.load_battery("path/to/cases.json")`.

## Check a page: `ua-kit check`

```sh
ua-kit check signup.html            # a local file
ua-kit check https://example.org/signup --lang fr --out report/
```

The checker opens the page in a headless browser, finds the email and website fields, types every battery case of the matching kind, and reads what the page shows. The email field is an `<input type="email">`, or else a text input whose name, id, placeholder, label or `aria-label` matches *e-mail*, *courriel* or *correo*; the website field is `type="url"`, or else matches *website*, *url*, *site web*, *page web*, *sitio*. The first visible match is used; with no match the field is reported `not-testable: no-field`. Email cases go to the email field; domain and URL cases to the website field (a bare domain gets `https://` in front when the field is `type="url"`). Options: `--engine chromium|firefox|webkit`, `--lang en|fr|es` (the browser locale), `--json`, `--out dir` (writes `report.json` and `report.md`).

**What leaves the page depends on the target.**

- **A local file**: the submit event is dispatched after each case with its default action cancelled, and once the page has loaded no request of any kind leaves it (navigations, fetches, images, sockets and popups are blocked; the tests in `tests/guards.test.mjs` try each). Before load, only `GET` and `HEAD` pass.
- **A URL**: the form is never submitted and every request other than `GET` or `HEAD` is blocked. `GET` requests and WebSocket connections that the page's own scripts open while values are typed (analytics, autocomplete) are **not** blocked and may carry a typed value, so check only pages whose owner agrees. A value the page did not visibly refuse is reported as `no-rejection-observed`, never as `accepted`.

How to read a verdict: `accepted` (the submit went through and the page showed no refusal), `rejected-script` (the page showed a refusal it did not show for an ordinary value: `aria-invalid`, an error class, an error text, a custom validity), `rejected-native` (the browser refused the value and something enforced it), `no-rejection-observed` (nothing refused, and the submit never fired: always the case on a URL; on a local file it happens when the field has no `<form>` or when native validation blocks the submit, for example a required field the runner could not fill). A case *passes* when a valid value is accepted or an invalid one refused. `rewritten` counts cases where the field held something other than what was typed; `not-testable` means the field was missing or could not be typed into, or the runner's own reload between two cases failed or brought back a page with different fields.

An excerpt of the report for a page that uses a common email regex:

```text
### Email field — ` [data-ua-kit-field="email"] ` (email cases)

passed 17 · failed 17 · rewritten 0 · not-observed 0 · not-testable 0

(per-class table omitted)

| failing case | typed | observed | verdict |
|---|---|---|---|
| … | | | |
| email-ascii-tld-long-01 | ` contact@boutique.corsica ` | ` contact@boutique.corsica ` | rejected-script |
| … | | | |
| email-idn-domain-02 | ` info@пример.рф ` | ` info@пример.рф ` | rejected-script |
| … | | | |
| email-eai-local-01 | ` josé.dupont@example.fr ` | ` josé.dupont@example.fr ` | rejected-script |
| … | | | |

### Known patterns found in page scripts

- inline\#0: matches the pattern published at https://www.regular-expressions.info/email.html (regular-expressions.info 'simple' email regex (ASCII only, letters-only TLD))
- inline\#0: matches the known pattern family "TLD capped at 2-4 letters"

(… the website field section and the not-tested block follow)
```

The last section comes from the pattern catalogue (`patterns/catalogue.json`): known faulty rules, each with the address where it is published. The report says a script *matches the pattern published at* that address. It does not say where the page's author took it from.

## The battery

`battery/cases.json`, version 1.0.0: 82 cases, 34 for the email field and 48 for the website field; 66 valid values a form should accept and 16 invalid values it should refuse, so that a form cannot pass by accepting everything.

| class | what it holds | expected |
|---|---|---|
| `control` | plain ASCII `.com`, `.fr`, `.org`, `.ie`, `.co.uk`, mixed case | accept |
| `ascii-tld-short` | 3–4 letter TLDs: `.bzh`, `.eus`, `.cat`, `.wien` | accept |
| `ascii-tld-long` | `.corsica`, `.technology`, `.international`, `.photography`, `.barcelona` | accept |
| `idn-tld-alabel` | ASCII labels under an A-label TLD: `example.xn--p1ai` | accept |
| `idn-sld-alabel` | A-label second level under an ASCII TLD: `xn--socit-esab.fr` | accept |
| `idn-ulabel` | U-labels in eight scripts on real IDN TLDs: Latin with diacritics, Cyrillic, Arabic, CJK, Devanagari, Greek, Thai, Hangul | accept |
| `eai-local` | Unicode local part, ASCII domain | accept |
| `email-idn-domain` | ASCII local part, U-label domain | accept |
| `eai-full` | Unicode local part and U-label domain | accept |
| `boundary` | 63-octet label, 253-octet name, 64-octet email local part (accept); 64-octet label (reject) | both |
| `guard` | unambiguous syntax failures: `a@@b.com`, `user@`, `user@example..com`, `bad..dots.com`, `http//example.com` | reject |

The battery tests syntax, not existence: a validator that accepts `boutique.corsica` is right even if that exact name is not registered. Every TLD used by a valid case is in the IANA root zone list pinned in `battery/iana-tlds.txt` (version 2026092400), checked in CI; the pinned list is not refreshed automatically; every second-level name is a placeholder. URL cases use the same classes, in `https://` form, with and without path and query. A domain with a trailing dot (`example.com.`) is valid DNS syntax but is left out of the battery on purpose, and the reference validators reject it.

CI checks that the file matches its schema, that every U-label round-trips to its A-label, and that the reference validators (`runners/js/reference.mjs`, `runners/py/ua_score.py`) accept every valid case and refuse every invalid one. Choices those reference validators make, stated plainly:

- Emoji and other pictographic labels are accepted by the JavaScript validator, because UTS #46 mapping does not enforce the IDNA2008 category rules. The Python validator with the `idna` package installed rejects them (IDNA2008): `😀.com` is valid for the first and invalid for the second (checked with `idna` 3.4). The battery holds no such label. Without `idna`, Python falls back to the standard library's IDNA2003 codec, so its results on U-labels can differ.
- `isValidUrl` rejects IP-literal hosts, single-label hosts (`https://localhost`) and schemes other than `http` and `https`, by design.
- The WHATWG URL parser strips leading and trailing whitespace from a URL.

## The guide

`GUIDE.md` (version 1.0.0): one page of rules for code that handles email addresses, domain names and URLs: what is valid, what to do, what not to do. It is generated into four formats (`npm run build:adapters`; never edit `adapters/` by hand):

| tool | how to load it |
|---|---|
| Claude Code | copy `adapters/claude-code/` to `.claude/skills/ua-ready-validation/` |
| Cursor | copy `adapters/cursor/ua-ready-validation.mdc` to `.cursor/rules/` |
| `AGENTS.md` (Codex and others) | paste the section from `adapters/AGENTS.md` into your `AGENTS.md` |
| GitHub Copilot | add the content of `adapters/copilot-instructions.md` to `.github/copilot-instructions.md` |

## The bench

Three models (`anthropic/claude-opus-5.5`, `openai/gpt-6-astra`, `z-ai/glm-5.3`) were asked for a self-contained HTML signup form in English, French and Spanish, three times each, once with the prompt alone and once with `GUIDE.md` as the system prompt: 54 pages, 4 428 scored cases, generated on 25/09/2026 and scored in Chromium 153.

What this measures is one-shot generation through an API: no tools, no correction loop, no existing codebase. It shows what the guide changes in code a model writes from a prompt; what it changes for an agent at work in a real project is not measured here.

The 82 cases of a page go through the same two fields and the same script: they are not 82 independent trials, and the page is the unit to count first. Pages where all 82 cases pass, out of 27 per condition: **1 with the prompt alone, 18 with the guide.**

| model | pages where the 82 cases pass, prompt alone | with `GUIDE.md` |
|---|---|---|
| Claude Opus 5.5 | 1/9 | 8/9 |
| GPT-6 Astra | 0/9 | 5/9 |
| GLM 5.3 | 0/9 | 5/9 |

A case passes when a valid value is accepted or an invalid one refused (see *How to read a verdict* above). Share of the 738 cases per model and condition (9 pages × 82) that passed; the guide raises both sides, valid values accepted from 89.8 % to 98.2 % and invalid values refused from 75.2 % to 95.6 %:

| model | prompt alone | prompt + `GUIDE.md` |
|---|---|---|
| Claude Opus 5.5 | 86.4 % (638/738) | 99.7 % (736/738) |
| GPT-6 Astra | 85.9 % (634/738) | 94.7 % (699/738) |
| GLM 5.3 | 88.5 % (653/738) | 98.6 % (728/738) |

Two scoring rules were set after the pages had been looked at: a bare domain typed into a `type="url"` field gets `https://` in front, and on a form with `novalidate` a refusal is what the page shows, not the browser's internal validity flag. Their effect on every count is in `RESULTS.md`, with the gap between the two conditions under each combination of the rules: on the 79 cases the first scoring holds, with the guide the rate of all models is higher by 10.6 to 12.6 points whichever rules apply (`node bench/sensitivity.mjs`). Rule 1 looks at the type of the field: one GPT-6 Astra page with the guide asks for a full URL in a text field, does not get the `https://`, and holds 27 of that model's 39 failures.

Nine pages per model and condition, three per language: this is enough to see where forms fail, not to rank models. What the numbers say and what they do not, the two scoring rules and why they were set, per-class tables, cost and every limitation are in [`bench/results/RESULTS.md`](bench/results/RESULTS.md). Every generated page is in `bench/results/generations/`, and can be tried in a browser from the index at https://guia-matthieu.github.io/ua-agent-kit/bench/ (built from `runs.csv` by `node bench/build-index.mjs`); `node bench/run-bench.mjs --rescore` scores them again, byte for byte, with no API call.

No model judges any result: every verdict is read from the page by the runner.

### A first baseline

This bench is a first measurement, not a verdict on a model or a tool. Its limits are listed in `RESULTS.md` (*Limitations*) and under *What this does not measure* below: nine pages per model and condition, one prompt family, one browser engine, the client side only, one-shot generation through an API, and two scoring rules set after the pages had been looked at.

Next, with the same battery and runner, without dates:

- more models, Google and Mistral first, then more open-weight models from Chinese labs, run in waves so that the published numbers change once per wave;
- a second run with the scoring rules frozen before generation, new cases, and a third condition that gets a one-line reminder instead of the whole guide;
- a framework and library arm: the same form written with React or with a validation library (zod, yup, validator.js), loaded from a pinned CDN build so that each page stays one self-contained file. The current prompt rules these out, so the bench does not yet say whether a model that reaches for one of them does better or worse;
- agents at work in a project rather than one-shot generation.

The bench can already be run on another model: add it to `bench/models.json` under a key of its own, set `OPENROUTER_API_KEY` and run `node bench/run-bench.mjs`. Cells that already have their pages are skipped; the new pages and their rows are written next to the others, and `--rescore` scores every page again. Runs on other models are welcome as pull requests that include the generated pages. How runs made at different dates, with different model versions, are brought together into one comparable base is not settled yet.

## Where this comes from

ICANN's *IDN Implementation and UA Adoption Report 2026* (1 September 2026, §2.2.2.1, p. 16) reports that ICANN assessed three AI coding tools: "The tools were tested against the five core UA functions: accept, validate, process, store, and display." It concludes that "the AI coding tools evaluated are not inherently UA-ready, particularly for validation and processing, but can generate substantially more UA-ready applications when appropriate UA guidance and checks are incorporated into the development process." The report does not name the tools and does not publish their prompts, test data or guidance. Report: https://www.icann.org/en/system/files/files/idn-implementation-ua-adoption-report-2026-01sep26-en.pdf

ICANN's summary of the public comment on the draft UA adoption guidelines (12 May 2026) records the ISPCP proposing to "engage AI code generation tool providers" and to "develop a UA benchmark test suite for AI systems". Summary: https://itp.cdn.icann.org/en/files/ua-ewg/summary-report-draft-guidelines-advancing-ua-adoption-12-05-2026-en.pdf

This kit does not reproduce ICANN's assessment, whose protocol is not published. It follows its own protocol, which is in this repository: the design in `docs/superpowers/specs/2026-09-24-ua-agent-kit-design.md`, the prompts in `bench/prompts/`, the scoring in `src/verdict.mjs` and `bench/results/RESULTS.md`. Of the five UA functions it measures two, **accept** and **validate**, on the client side only; process, store and display are out of scope.

The test cases are written for this kit. Each one names the standard it rests on (field `ref` in `battery/cases.json`: RFC 1035, 1123, 3987, 5321, 5322, 5890, 6531, the WHATWG URL and HTML standards, the IANA root zone). Their method follows UASG-004, *Test Domain Names and Email Addresses for UA Readiness Evaluation* (Universal Acceptance Steering Group, 18 November 2021), whose cases are not reused because the document carries no licence statement: https://uasg.tech/download/uasg-004-use-cases-for-ua-readiness-evaluation-en/ (the UASG site has been archived since November 2025).

## What this does not measure

- Framework forms (React, Vue, Svelte): the bench asks for plain HTML + JavaScript; the form runner tests whatever a page serves, but the bench does not measure framework output.
- Server-side validation always, and on a URL validation that runs only on submit: a URL is never submitted, so the absence of a rejection is reported as `no-rejection-observed`, never as `accepted` (the same verdict a local file gets when its submit could not fire).
- Storage, processing, display, email delivery (MX/EAI): the kit measures acceptance and validation only.
- App surfaces (claude.ai, ChatGPT, Cursor's own harness): the bench uses the raw API surface only.
- Any certification or compliance claim.
- A hosted checker: a later project, with its own design.

One measured limit of the checker: it reads each field 60 ms after an event (`SETTLE_MS` in `src/form-runner.mjs`). A validator that is debounced or asynchronous beyond that delay is read before it answers, and the value is reported as not refused.

## Add a catalogue entry

An entry in `patterns/catalogue.json` is a faulty rule that someone has **published**. Copy the pattern byte for byte from the page that publishes it; give `source_url`, `source_title` and the date you read it (`verified`); list the battery classes it rejects. A rule known only as a family (for example a TLD capped at four letters) goes in without a `source_url` and is reported as a *known pattern family*. Run `npm test` before opening a pull request.

## Licences

- Code: MIT (`LICENSE-CODE.md`)
- Battery, catalogue and bench results: CC0 1.0 (`LICENSE-DATA.md`)
- Guide: CC BY 4.0 (`LICENSE-GUIDE.md`)

## Author

Matthieu Crédou. Issues and pull requests are welcome.
