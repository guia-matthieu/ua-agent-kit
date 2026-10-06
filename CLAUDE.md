# ua-agent-kit — rules for the coding agent

You are implementing `docs/superpowers/plans/2026-09-24-ua-agent-kit.md`, one task at a time, in order. The design it follows is `docs/superpowers/specs/2026-09-24-ua-agent-kit-design.md`. Read the whole task you are on before touching a file.

## How work is accepted

- One task = one branch `task/NN-slug` = one PR. Do not start the next task before the current PR is merged.
- Before every commit, run `npm run lint` and `npm test` (and `npm run test:py` when Python changed). Paste the last lines of the **real** output in the PR description. A PR that says "tests pass" without pasted output is rejected.
- A reviewer re-runs everything. A task is done when the reviewer's run passes, not when the PR says it does.
- If a test given in the plan fails and you believe the test is wrong: stop, write `docs/qc/blocked-task-NN.md` with the failing output and your reasoning, open the PR as a draft. Do not change a test to make it pass.
- Stay inside the task's file list. No refactoring of neighbours, no new dependencies, no renaming of fields in the JSON report.

## Never

- Never dispatch a `submit` event, call `requestSubmit()`, or click a submit control in `src/form-runner.mjs` or anything the runner reaches. `tests/guards.test.mjs` enforces this and must stay green in every task.
- Never let a request whose method is not `GET` or `HEAD` through after page load.
- Never type a value that is not in `battery/cases.json`, or in the file the user named with `--battery` once `loadBatteryFile` has accepted it.
- Never edit files under `adapters/` by hand; run `npm run build:adapters`.
- Never change the wording of `GUIDE.md`, `bench/prompts/*.txt`, `patterns/catalogue.json`, `README.md` or `bench/results/RESULTS.md`. Those files are human-owned.
- Never use the network in tests: fixtures under `tests/fixtures/` and a local `http` server only.
- Never write "copied from", "comes from" or "trained on" about a pattern match. The wording is `matches the pattern published at <url>`.

## Style

- ESM, Node ≥ 22, no TypeScript, no build step. Small files, one responsibility each.
- Conventional commits: `feat|fix|test|docs|chore|ci(scope): subject`.
- Comments say why, not what. English everywhere in the repo.
- When the plan gives code, use it as written. When it gives an interface, keep the names exactly.

## If you learn something the plan did not foresee

Write it to `docs/qc/notes-task-NN.md` (facts and commands, no opinions) and mention the file in the PR.
