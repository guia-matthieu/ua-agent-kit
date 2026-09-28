# Task 4 — notes (facts the plan did not foresee)

## `.gitignore` has no `__pycache__/` entry

The plan's Step 5 `git add runners/py/ tests/py/` committed cpython-311
bytecode (`__pycache__/*.pyc`) alongside the sources — the Task 0 `.gitignore`
does not ignore Python artifacts. Removed in a follow-up `chore:` commit on
this branch (`git rm -r --cached`); the ignore line itself is a one-word change
to a Task 0 file, left to the reviewer:

```
__pycache__/
```

CI's Python job will regenerate bytecode locally on every run; once the entry
exists this cannot recur.

## `idna` is already installed on the dev machine

Step 4's `pip install idna` is a no-op here (`Requirement already satisfied …
(3.4)`, miniconda Python 3.11.5), so the plan's two `npm run test:py` runs both
exercise the IDNA2008 path. The stdlib IDNA2003 fallback was verified by
blocking the import instead of touching the environment:

```
$ python3 -c "…sys.modules['idna'] = None; unittest discover…"
Ran 6 tests in 0.004s
OK
```

No U-label case fails on the fallback path (Step 4's caveat case did not
arise): `пример.рф` converts to `xn--e1afmkfd.xn--p1ai` under the stdlib
codec, and the reference-agreement test passes on both paths.
