# Task 2 — notes (facts the plan did not foresee)

## Ajv 8 cannot validate the 2020-12 schema through its default import

Plan Step 6 wrote `import Ajv from 'ajv'` in `tests/battery.test.mjs`. With the
pinned `ajv@^8` (installed: 8.20.0), the default build is draft-07 and the
schema test fails before asserting anything:

```
✖ battery validates against its schema (2.41975ms)
  Error: no schema with key or ref "https://json-schema.org/draft/2020-12/schema"
```

Commands run:

```
$ npm test -- tests/battery.test.mjs
ℹ tests 7
ℹ pass 6
ℹ fail 1        # only the schema test, with the meta-schema error above

$ node --input-type=module -e "…(await import('ajv/dist/2020.js')).default…"
ajv version: 8.20.0 | Ajv2020 validates battery: true
```

Change made: the import line in `tests/battery.test.mjs` only —

```js
import Ajv from 'ajv/dist/2020.js';
```

(the bare `ajv/dist/2020` specifier is not resolvable from ESM; the `.js`
extension is required). No assertion changed. This is a plan defect of the
same class as Task 1's `node --test tests/`: the plan's code as written cannot
run in the pinned environment.

## Case count is 76, not 75

The plan's self-review and its Step 9 commit message say "75 cases". The
plan's own verbatim data contains 76 cases:

- email: 25 accept + 7 guards = 32
- domain: 25 accept + 1 boundary reject + 4 guards = 30
- url: 10 accept + 4 guards = 14

Command run:

```
$ node -e '…console.log("cases:", j.cases.length)'
cases: 76
```

The commit message says 76 cases.

## The plan's ASCII test regex trips the plan's own lint rule

Step 6's test contains `/^[\x00-\x7f]*$/`, and Task 1's `eslint.config.mjs`
uses `js.configs.recommended`, which enables `no-control-regex`:

```
$ npm run lint
/Users/matthieucredou/Projects/ua-agent-kit/tests/battery.test.mjs
  37:20  error  Unexpected control character(s) in regular expression: \x00  no-control-regex

✖ 1 problem (1 error, 0 warnings)
```

The lint config belongs to Task 1 (outside this task's file list), so the fix
is a one-line, explained disable on that line only; the regex itself is
unchanged:

```js
// eslint-disable-next-line no-control-regex
if (!domain || /^[\x00-\x7f]*$/.test(domain)) continue;
```

`npm run lint` exits 0 afterwards.
