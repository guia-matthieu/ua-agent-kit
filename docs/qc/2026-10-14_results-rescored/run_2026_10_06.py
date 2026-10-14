"""RESULTS.md of the run of 2026-10-06, written by that run's own summary.py from the reference scoring instead of the
CSV files published in the run's folder. Page counts and costs still come from the run's folder (they do not depend
on the scoring). Prints Markdown. Usage: python3 docs/qc/2026-10-14_results-rescored/run_2026_10_06.py"""
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
RUN = os.path.join(ROOT, 'bench', 'runs', '2026-10-06_state-catalogue')
REF = os.path.join(ROOT, 'docs', 'qc', '2026-10-09_finding-5', 'rescored')
src = open(os.path.join(RUN, 'summary.py'), encoding='utf-8').read()
for name in ('runs-standard.csv', 'runs-fr.csv', 'runs-durci-fr.csv'):
    assert src.count(f"'{name}'") == 1, name
    src = src.replace(f"'{name}'", repr(os.path.join(REF, name)))
src = src.replace('os.chdir(os.path.dirname(os.path.abspath(__file__)))', f'os.chdir({RUN!r})')
HEAD = 'Written by `summary.py` from the CSV files of this folder.'
assert src.count(HEAD) == 1
src = src.replace(HEAD, 'Written by `summary.py` of the run from the reference scoring, `docs/qc/2026-10-09_finding-5/rescored/`, not from the CSV files in the folder of the run.')
exec(compile(src, 'summary.py', 'exec'), {'__name__': '__main__'})
