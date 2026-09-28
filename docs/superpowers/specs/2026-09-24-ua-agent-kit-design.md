# ua-agent-kit — design

**Date:** 2026-09-24 · **Status:** design, approved in conversation, awaiting written review · **Author:** Matthieu Crédou (with Claude)

## 1. Purpose

Ship, as a commons, the thing the ICANN "IDN Implementation and UA Adoption Report 2026" (§2.2.2.1) says works but does not publish: UA guidance for AI coding tools, together with a public, re-runnable test battery and a measured before/after effect. Then use the same battery to check real forms.

Intended outcome, in the author's words: *ship some files under commons, benefit the community, build and post about actual useful content*. Success for v1 is two things: the repository is public and usable without the author; a developer or ICANN's UA team can re-run every number in it.

Deadline that gives the work its shape: the Unicode Technology Workshop in Nancy, 20 October 2026.

## 2. What is said, what is assumed

Said by the author (24/09): commons licence; benefit the community; build and post; three working languages (EN, FR, ES); a checker for a page with a form, reporting what works, what does not, and the origin of the rule.

Assumed, to be corrected on review: English for everything public; repository under the `guia-matthieu` GitHub account; the author's name in the README; licences CC0 1.0 for the battery and catalogue, CC BY 4.0 for the guide, MIT for code; Node.js for the tooling (Playwright is the form engine) plus a single-file Python runner for Python users.

## 3. Facts the design rests on

- ICANN tested three AI coding tools on the five UA functions and found them "not inherently UA-ready", better with explicit requirements, test data and "dedicated UA compliance agents and skills". It names no tool, publishes no dataset, no prompt, no skill. Source: `ua-observatory/refs/icann-2026-09/idn-ua-report-2026.pdf`, §2.2.2.1, p. 16 (sha256 `a680981e…3735`).
- ICANN's public-comment summary of 12 May 2026 records the ISPCP asking to "engage AI code generation tool providers", "fix email validator libraries" and "develop a UA benchmark test suite for AI systems" (`ua-ewg-public-comment-summary-12may26.txt`, l. 776-786).
- ICANN publishes UA code on GitHub (`icann/ua-code-samples`, `icann/uniaccept-*`, `icann/eai-survey-tool`) but nothing addressed to AI coding agents. Bound: GitHub code search across `org:icann` for `skill`, `coding agent`, `cursorrules` returned 0; `prompt` and `LLM` returned only unrelated files. Five queries, 24/09/2026.
- UASG-004 (82 use cases, 2021) carries no licence statement (0 matches for licence/copyright terms in its 801 extracted lines). The kit therefore writes its own cases and cites UASG-004 as method.
- The observatory's earlier 14-cell run used about ten valid inputs and four guards, not the 82 UASG-004 cases. The battery is new work.
- Measured 12/06/2026 on the observatory: the same model gives different UA behaviour depending on the access path (Opus 4.8 UA-safe on email through the claude.ai app, rejects internationalized email through the raw API in EN, FR, AR, ZH). Surface is a controlled variable; the bench uses one surface only.
- Measured 21/09/2026 (engine spike, `ua-observatory/experiments/spike-engines-2026-09-21/`): in a `type="email"` field, Chromium 145 rewrites `marie.dupont@société.fr` to `marie.dupont@xn--socit-esab.fr` before the page sees it. A regex extracted from page code would never show this. Hence the form is run, not parsed.

## 4. Scope

### In v1

1. **Battery**: about 60 test cases for email addresses, domain names and URLs, with expected outcomes, self-checked in CI.
2. **Runners**: score any validator function or regex against the battery (JavaScript and Python); a reference validator that passes the whole battery.
3. **Form runner**: type every case into a real form in a headless browser, from a local HTML file or a URL, and record what happened. A local file is submitted after each case (default action cancelled, navigation blocked); a URL is never submitted.
4. **Pattern catalogue**: known faulty validation rules with their published source, matched against a page's scripts.
5. **Guide**: one page of UA rules for AI coding agents, canonical in `GUIDE.md`, with adapters generated for Claude Code, Cursor, `AGENTS.md` and GitHub Copilot.
6. **Bench**: the measured effect of the guide on generated forms: 3 models × 3 prompt languages × 2 conditions × 3 repeats, with every generation published.
7. **Release**: README, licences, CI, tag `v0.1.0`, npm package.

### Out of v1, stated in the README

- Framework forms (React, Vue, Svelte): the bench asks for plain HTML + JavaScript; the form runner tests whatever a page serves, but the bench does not measure framework output.
- Server-side validation always, and on a URL validation that runs only on submit: a URL is never submitted, so the absence of a rejection is reported as `no-rejection-observed`, never as `accepted`. *(Amended 25/09: the code reported "accepted", and a page validating only on submit — what "validate before submit" asks for — scored every international case as passing; measured, see Task 5 amendment in the plan.)*
- Storage, processing, display, email delivery (MX/EAI): the kit measures acceptance and validation only.
- App surfaces (claude.ai, ChatGPT, Cursor's own harness): the bench uses the raw API surface only.
- Any certification or compliance claim.
- A hosted checker: a later project, with its own design.

## 5. Repository layout

```
ua-agent-kit/
  README.md
  GUIDE.md                       canonical guide (CC BY 4.0)
  LICENSE-CODE.md                MIT
  LICENSE-DATA.md                CC0 1.0 (battery, catalogue, bench results)
  LICENSE-GUIDE.md               CC BY 4.0
  battery/
    cases.json                   the battery, with its own semver "version"
    schema.json                  JSON Schema for cases.json
    iana-tlds.txt                pinned copy of data.iana.org/TLD/tlds-alpha-by-domain.txt (its first line carries its version/date)
  patterns/
    catalogue.json               known faulty rules + published source
  runners/
    js/score.mjs                 score(validate, cases, opts)
    js/reference.mjs             reference validators (email, domain, url) that pass the battery
    py/ua_score.py               same API for Python, single file, no dependencies
  src/
    form-runner.mjs              Playwright: file or URL; submits files only, nothing leaves the page
    field-finder.mjs             locate email / website fields (heuristics, EN/FR/ES)
    catalogue-match.mjs          find catalogue patterns in page scripts
    report.mjs                   JSON + Markdown report
  bin/ua-kit.mjs                 CLI: `ua-kit score`, `ua-kit check`, `ua-kit build-adapters`
  adapters/                      GENERATED from GUIDE.md, never edited by hand
    claude-code/SKILL.md
    cursor/ua-ready-validation.mdc
    AGENTS.md
    copilot-instructions.md
  scripts/
    build-adapters.mjs
    check-battery.mjs            the self-checks (§6.3)
  bench/
    prompts/{en,fr,es}.txt       identical task, three languages
    models.json                  pinned OpenRouter slugs + provider + settings, filled at run time
    run-bench.mjs                generate → save → run form-runner → CSV
    results/
      generations/<model>/<lang>/<condition>/<n>.html
      runs.csv
      RESULTS.md
  tests/                         node:test
  .github/workflows/ci.yml
```

## 6. Battery

### 6.1 Case format

```json
{
  "id": "email-eai-local-latin-01",
  "kind": "email",
  "class": "eai-local",
  "value": "josé.dupont@example.fr",
  "expect": "accept",
  "note": "Unicode local part, ASCII domain",
  "ref": "RFC 6531 §3.3"
}
```

`kind` ∈ `email | domain | url`. `expect` ∈ `accept | reject`. `ref` names the standard the case rests on. `cases.json` carries `"version"` (semver) and `"generated"` (date); results always cite the battery version.

### 6.2 Classes

| class | what it holds | expect |
|---|---|---|
| `control` | plain ASCII `.com`/`.fr`/`.org`, mixed case | accept |
| `ascii-tld-short` | 3–4 letter new gTLDs: `.bzh`, `.eus`, `.cat`, `.wien` | accept |
| `ascii-tld-long` | `.corsica`, `.technology`, `.international`, `.photography`, `.barcelona` | accept |
| `idn-tld-alabel` | ASCII labels under an A-label TLD: `example.xn--p1ai` | accept |
| `idn-sld-alabel` | A-label second level under ASCII TLD: `xn--socit-esab.fr` | accept |
| `idn-ulabel` | U-labels in six scripts on real IDN TLDs: Latin with diacritics, Cyrillic, Arabic, CJK, Devanagari, Greek | accept |
| `eai-local` | Unicode local part, ASCII domain | accept |
| `email-idn-domain` | ASCII local part, U-label domain | accept |
| `eai-full` | Unicode local part and U-label domain | accept |
| `url` | `https://` forms of the above, with and without path/query | accept |
| `boundary` | 63-character label, 253-character domain (accept); 64-character label (reject) | both |
| `guard` | unambiguous syntax failures: `a@@b.com`, `user@`, `@example.com`, `user@example..com`, `user @example.com`, `-bad-.com`, `bad..dots.com`, `exa mple.com`, `https://`, `htp:/broken` | reject |

Target: about 60 cases; at least 3 per accept class, 10 guards. Every TLD used is delegated (checked against the pinned IANA list). Every second-level name is a placeholder (`example`, `mairie`, `boutique`, script-local equivalents); no real registrant's name appears.

The battery tests syntax, not existence: a validator that accepts `boutique.corsica` is right even though that exact name may not be registered. The README says this in one sentence.

### 6.3 Self-checks (CI fails on any)

- `cases.json` validates against `schema.json`; ids and values unique.
- For every case, the TLD in A-label form is present in `battery/iana-tlds.txt`.
- Every U-label round-trips to its A-label and back (`url.domainToASCII` / `domainToUnicode`).
- The reference validators accept every `accept` case and reject every `reject` case, so the battery is proven satisfiable and no guard is accidentally valid.

### 6.4 IANA list

Pinned copy committed with the battery; its own first line is the version. A `refresh-iana` script re-downloads it; a monthly scheduled workflow that opens a PR when it changes is a later addition, not v1.

## 7. Runners

### 7.1 Scoring API (JavaScript and Python, same semantics)

`score(validate, cases, { kind })` where `validate(value) → boolean`. Returns:

```json
{
  "kind": "email",
  "battery": "1.0.0",
  "total": 45, "accepted_ok": 35, "rejected_ok": 8, "failures": ["email-idn-ulabel-cyrillic-01", "email-eai-full-01"],
  "byClass": { "idn-ulabel": { "total": 6, "ok": 4 } },
  "verdict": "ua-fail"
}
```

`verdict` follows the observatory's vocabulary so the two bodies of results read the same way: `ua-pass` (all accept cases accepted and all guards rejected) · `accept-all` (any guard accepted; a useless validator, never counted as pass) · `ua-fail` with the failing classes listed.

CLI: `ua-kit score --kind email --regex '<javascript regex>'`. Python users import `ua_score.py` and pass a callable.

### 7.2 Reference validators

Small, readable, permissive by design (syntax only): split on the last `@`; local part non-empty, no spaces; domain = labels separated by dots, each 1–63 octets in A-label form, total ≤ 253, no leading/trailing hyphen after conversion; TLD ≥ 2 characters or an A-label. URLs via the WHATWG `URL` parser plus the domain check. They exist to prove the battery is satisfiable and to give the guide a worked example; they are not a library recommendation.

## 8. Form runner (`ua-kit check`)

### 8.1 Input

`ua-kit check <path.html | https://…> [--engine chromium|firefox|webkit] [--lang en|fr|es] [--json] [--out dir]`. Default engine Chromium. Local files are loaded via `file://`.

### 8.2 Guarantees

- **Nothing leaves the page.** A URL (somebody's live site) is never submitted. A local file is submitted with `requestSubmit()` after each case so that submit-time validators run; an init script cancels the default action, and after load every main-frame navigation is answered 204 by the route guard (a programmatic `form.submit()` or a redirect stays on the page and reaches no server). No click on buttons, no synthetic `submit` event. *(Amended 25/09, decision of Matthieu.)*
- **Never posts.** From the first request of the page (route armed on the browser context before navigation, service workers blocked), every request whose method is not `GET` or `HEAD` is aborted, so a page script cannot send the typed values anywhere.
- **Synthetic values only.** Every typed value comes from the battery.
- **Identifies itself.** User-Agent `ua-agent-kit/<version> (+<repo url>)`.
- **Cleans up.** Each field is cleared after each case.

### 8.3 Field finding

Candidates: `input[type=email]`, `input[type=url]`, `input[type=text]`, `textarea` is excluded. Email field = `type=email`, else name/id/placeholder/associated label matching `/e-?mail|courriel|correo/i`. Website field = `type=url`, else `/site ?web|website|url|sitio|page web/i`. If several match, the first visible one. If none: `not-testable: no-field`. If the field is not interactable (overlay, hidden): `not-testable: not-interactable`. Consent banners are not clicked in v1.

### 8.4 Per-case procedure

For each case of the field's kind: `fill(value)`; dispatch `input`, `change`, `blur`; wait 300 ms; then read:

- `el.value` — differs from the typed value → `rewritten` (with the new value recorded);
- `el.checkValidity()` and `el.validity` — false with `typeMismatch`/`patternMismatch` → `rejected-native`;
- script signals — `aria-invalid="true"`, a class on the input/label/parent matching `/invalid|error|erreur/i` that was not present before, or new visible text within the field's form matching `/invalid|inválid|no válido|error|erreur|incorrect/i` → `rejected-script`;
- otherwise `accepted`.

`rewritten` is reported on its own line and never counted as a failure: a U-label converted to its A-label is correct processing; a value changed to something else is worth a look. The report shows before/after.

### 8.5 Report

JSON and Markdown: URL requested, final URL, page title, engine + version, date, battery version; per field: table by class with counts (accepted / rejected-native / rejected-script / rewritten / not-testable); the list of failing case ids; catalogue matches (§9); and a fixed "what this did not test" block (submit-time validation, server side, delivery).

Three categories always appear in totals: passed, failed, not-testable. A run where the field was not found is reported as not-testable, never as zero failures.

## 9. Pattern catalogue

`patterns/catalogue.json` entries:

```json
{
  "id": "so-201323-top-answer",
  "name": "Stack Overflow 201323, top answer (RFC 5322-derived, ASCII only)",
  "pattern": "(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|…",
  "source_url": "https://stackoverflow.com/questions/201323/…",
  "rejects": ["eai-local", "idn-ulabel", "email-idn-domain", "eai-full"],
  "verified": "2026-09-01",
  "note": "3,555 votes on 2026-09-01 (Stack Exchange API)"
}
```

Seed: the rules already read byte-by-byte in `ua-observatory/library/MECANISME.md` (WHATWG reference regex, regular-expressions.info, Stack Overflow 201323 and 161738, OWASP Validation Regex Repository, plus the `\.[a-z]{2,4}$` family). Each entry's `pattern` is the published string; matching runs on inline scripts and every loaded script, whitespace-normalised, exact and anchored/unanchored variants.

Wording is fixed and tested: the report says **"matches the pattern published at <url>"**. It never says "copied from", "comes from" or "trained on". A textual match is evidence that the same rule is in circulation, not proof of origin.

## 10. Guide and adapters

`GUIDE.md`, one page, canonical, CC BY 4.0. Sections:

1. **What is valid**: TLDs of any length ≥ 2 letters and A-label TLDs (`xn--…`); U-labels at any level; Unicode local parts (RFC 6531); domains are case-insensitive.
2. **Do**: minimal syntax check; convert U-labels with IDNA2008 / UTS-46 before DNS or storage, and keep what the user typed; if existence matters, check against a refreshed IANA list, never a hard-coded one; know what `type="email"` does (rejects Unicode local parts, rewrites U-labels to A-labels) and choose `type="text"` plus your own check when EAI must be accepted; run the battery.
3. **Don't**: `[a-z]{2,4}`, ASCII-only character classes, the "official RFC 5322" regexes, hard-coded TLD allow-lists, rejecting `xn--`.
4. **Test**: the `ua-kit score` / `ua-kit check` commands.
5. **References**: RFC 5890/5891 (IDNA2008), UTS #46, RFC 6530/6531 (EAI), WHATWG HTML `valid e-mail address`, UASG-004 (method).

Claims in the guide about browser behaviour are those measured in the 21/09 engine spike or re-measured during implementation; nothing is asserted from memory.

**Adapters are generated** by `scripts/build-adapters.mjs` from `GUIDE.md`: `adapters/claude-code/SKILL.md` (frontmatter `name: ua-ready-validation`, `description` with triggers: writing or reviewing code that validates, stores, displays or links email addresses, domain names or URLs), `adapters/cursor/ua-ready-validation.mdc`, `adapters/AGENTS.md` (a section to paste), `adapters/copilot-instructions.md`. CI rebuilds them and fails if the committed files differ. The guide's body text is identical across adapters; only the wrapper changes.

## 11. Bench — the measured effect

### 11.1 Design

- **Surface**: raw API through OpenRouter only (key already held in `ua-observatory/.env`; the kit reads `OPENROUTER_API_KEY` from its own environment). No app surface in v1.
- **Models**: one Anthropic, one OpenAI, one open-weight budget model. Exact slugs, provider pinning and settings are written to `bench/models.json` when the run starts and copied into `RESULTS.md`; extended thinking off; temperature and other parameters left at provider defaults and recorded.
- **Task prompt**: identical in EN, FR, ES: a complete, self-contained HTML page with a signup form (name, email, website, password), fields validated in JavaScript before submit, no framework, no external library. The prompt never mentions UA, IDN, EAI, TLDs, Unicode or internationalisation. The author reviews the three prompts for equivalence.
- **Conditions**: A = no system prompt; B = `GUIDE.md` verbatim as the system prompt, which is how a skill or rules file reaches a model.
- **Cells**: 3 models × 3 languages × 2 conditions × 3 repeats = 54 generations. Every generation is saved and committed under `bench/results/generations/`.
- **Scoring**: `ua-kit check` in file mode on each generation, Chromium. Rows in `runs.csv`: model, lang, condition, repeat, field, case id, class, verdict.

### 11.2 Metrics

Per (model, lang, condition): share of accept cases accepted, per class; guards rejected; count rewritten; count not-testable (no form, no field, broken page). Pooled: pass rate without vs with guide, and per model. Totals always show passed / failed / not-testable separately.

### 11.3 Output

`bench/results/RESULTS.md`: date, engine version, battery version, model table with versions, the metrics tables, a paragraph on what the numbers do and do not show (raw-API surface, plain HTML, input-time validation, n = 3 repeats), a link to `runs.csv`. This is the source for the post; the post quotes it, never the other way round.

Estimated cost: under 10 USD of OpenRouter usage (54 generations of a few thousand tokens each; estimate, not a measure).

## 12–13. Later work

A hosted web front over `ua-kit check` is a later project with its own design. Nothing in the kit depends on it; the CLI JSON report is the only interface.

## 14. Publication discipline

- Every negative claim in the README or the post carries its bound (what was searched, where, when).
- No "first", "only" or "nobody" without a date and a bound.
- Results tables show n and the not-testable count.
- The kit names `.corsica` and `.bzh` only as public TLD examples; no holder names, no client material, no funding drafts.
- Before the post: review-lenses pass by a fresh context (L1 bounds, L2 primary sources, L4 attribution).

## 15. Effort and order

| # | Step | Days |
|---|---|---|
| 1 | Battery, schema, IANA pin, self-checks, reference validators | 2 |
| 2 | Scoring runners (JS, Python), `ua-kit score` | 1 |
| 3 | Form runner, file mode, verdicts, report | 1.5 |
| 4 | URL mode, not-testable handling, request blocking, catalogue + matching | 2 |
| 5 | Guide, adapters, build script, drift check | 1.5 |
| 6 | Bench run, `runs.csv`, `RESULTS.md` | 1.5 |
| 7 | README, licences, CI, npm publish, tag `v0.1.0`, post drafts (EN/FR/ES) | 1.5 |

About 11 working days; target completion before 20/10/2026. Steps 1–2 and 5 can proceed in parallel with 3–4; step 6 needs 1, 3 and 5.

## 16. Risks

- **OpenRouter model availability or provider drift** during the bench: pin provider and slug in `models.json`; if a model disappears, substitute and record.
- **Field finding on real pages** (sub-project 2 mostly, but URL mode is in v1): heuristics may miss fields on unusual pages; reported as not-testable, never as pass.
- **Playwright in CI**: browser download time; cache it. Tests that need a browser run on a local HTML fixture, never on the network.
- **Scope creep from a hosted checker**: nothing in the kit assumes one; the CLI JSON is the only interface.
- **Claims drifting from measurements** in the guide: each browser-behaviour statement points to a measured row; CI does not check this, the review-lenses pass does.
