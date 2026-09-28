# Task 8 notes — plan's Step 2 test and Step 3 render() contradict each other

Measured 2026-09-25, branch `task/08-guide-adapters`, Node v23.10.0.

## Fact

With `scripts/build-adapters.mjs` verbatim from the plan (Step 3) and
`tests/adapters.test.mjs` verbatim from the plan (Step 2), the test
`claude-code skill has the required frontmatter` fails:

```
$ npm test -- tests/adapters.test.mjs
✖ tests/adapters.test.mjs
  code: 'ERR_ASSERTION',
  actual: '---\nname: ua-ready-validation\ndescription: Universal Acceptance rules …(EAI).\nlicense: CC-BY-4.0\n---\n\n…',
  expected: /^---\nname: ua-ready-validation\ndescription: .+\n---\n/,
  operator: 'match'
```

Cause: the plan's `render()` emits a `license: CC-BY-4.0` frontmatter line in
`adapters/claude-code/SKILL.md`; the plan's test regex requires the closing
`---` immediately after the `description` line (`.` does not match `\n`, no `s`
flag). The two plan blocks cannot both hold.

## Decision (kept the test, changed the build script)

The spec is the authority: `docs/superpowers/specs/2026-09-24-ua-agent-kit-design.md`
§10 names the SKILL.md frontmatter as "`name: ua-ready-validation`, `description`
with triggers" — no `license` key. The test matches the spec; the template's extra
line does not. Removed `license: CC-BY-4.0\n` from the frontmatter in
`scripts/build-adapters.mjs`; `tests/adapters.test.mjs` is untouched, byte for byte
as the plan gives it. Licence coverage for the adapters is unchanged in effect:
`LICENSE-GUIDE.md` (CC BY 4.0 legalcode, Task 0) and the `Licence: CC BY 4.0`
header of `GUIDE.md` still state it; the other three adapters never carried a
licence marker under the plan's own template either.

If the reviewer prefers the licence key in the SKILL frontmatter, the change is
one line here plus one line in the test's regex — flagged for that decision.

## Commands

- RED (before the build script existed):
  `node --test tests/adapters.test.mjs` →
  `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/scripts/build-adapters.mjs'`
- Failing pair (both blocks verbatim from the plan): output above.
- After the one-line fix: `npm run build:adapters && npm test -- tests/adapters.test.mjs && npm run check:adapters` → 3/3 pass, `adapters up to date`.
