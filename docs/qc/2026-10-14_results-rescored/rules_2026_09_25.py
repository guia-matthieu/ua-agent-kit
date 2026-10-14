"""The table "What the two rules changed" of bench/results/RESULTS.md, from a scoring of the bench of 2026-09-25.
A case is under rule 1 when the runner typed `https://` in front of the battery value (as in bench/sensitivity.mjs);
under rule 2 when its .json says the field reports a mismatch that nothing enforces (not recomputed here: the .json
of the pages are those of the published scoring). Usage: python3 .../rules_2026_09_25.py [runs.csv]"""
import csv
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
FIRST = os.path.join(ROOT, 'bench', 'results', 'runs-first-scoring.csv')
NOW = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs', 'qc', '2026-10-09_finding-5', 'rescored', 'bench-2026-09-25-runs.csv')
value = {c['id']: c['value'] for c in json.load(open(os.path.join(ROOT, 'battery', 'cases.json'), encoding='utf-8'))['cases']}
key = lambda r: (r['model'], r['lang'], r['condition'], r['repeat'], r['field'], r['case_id'])
first = {key(r): r['outcome'] for r in csv.DictReader(open(FIRST, encoding='utf-8'))}
n = fp = pf = same = 0
for r in csv.DictReader(open(NOW, encoding='utf-8')):
    if key(r) not in first or r['typed'] != 'https://' + value[r['case_id']]:
        continue
    n += 1
    f, o = first[key(r)], r['outcome']
    fp += f == 'fail' and o == 'pass'
    pf += f == 'pass' and o == 'fail'
    same += f == o
print(f'| 1. `https://` in a `type="url"` field | {n} | {fp} | {pf} | {same} |')
