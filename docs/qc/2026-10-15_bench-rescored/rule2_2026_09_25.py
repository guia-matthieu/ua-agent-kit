"""The rule 2 row of "What the two rules changed" in bench/results/RESULTS.md, and the counts of the paragraph above it,
from the .json of the 54 pages. A case is under rule 2 when its .json says the field reports a mismatch that nothing
enforces (`mismatch` true, `enforced` false). The row compares, on the cases runs-first-scoring.csv holds, its outcome
with the one in the .json. Usage: python3 .../rule2_2026_09_25.py [git-rev]   (no rev: the files on disk)"""
import csv
import json
import os
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
REV = sys.argv[1] if len(sys.argv) > 1 else None
GEN = os.path.join('bench', 'results', 'generations')


def load(rel):
    if REV is None:
        return json.load(open(os.path.join(ROOT, rel), encoding='utf-8'))
    return json.loads(subprocess.run(['git', '-C', ROOT, 'show', f'{REV}:{rel}'], capture_output=True, check=True).stdout)


key = lambda m, l, c, rep, f, i: (m, l, c, str(rep), f, i)
first = {key(r['model'], r['lang'], r['condition'], r['repeat'], r['field'], r['case_id']): r['outcome']
         for r in csv.DictReader(open(os.path.join(ROOT, 'bench', 'results', 'runs-first-scoring.csv'), encoding='utf-8'))}
under = shown = n = fp = pf = same = 0
for m in sorted(os.listdir(os.path.join(ROOT, GEN))):
    for l in ('en', 'fr', 'es'):
        for c in ('no-guide', 'guide'):
            for rep in (1, 2, 3):
                j = load(f'{GEN}/{m}/{l}/{c}/{rep}.json')
                for f, field in j['fields'].items():
                    for r in field.get('results', []):
                        if not (r.get('mismatch') and not r.get('enforced')):
                            continue
                        under += 1
                        shown += bool(r['signals'])
                        k = key(m, l, c, rep, f, r['id'])
                        if k not in first:
                            continue
                        n += 1
                        a, o = first[k], r['outcome']
                        fp += a == 'fail' and o == 'pass'
                        pf += a == 'pass' and o == 'fail'
                        same += a == o
print(f'mismatch not enforced: {under} cases; a refusal shown in {shown}, none in {under - shown}')
print(f'| 2. `novalidate` | {n} | {fp} | {pf} | {same} |')
