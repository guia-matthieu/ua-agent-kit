#!/usr/bin/env python3
"""Rows of the last scoring of PR #7 (runner of 85d96fa, docs/qc/2026-10-07_baseline-refused/rescored) and rows of
the double probe of finding 5 (rescored/ next to this script), line by line. Reads only; writes nothing.
Usage: python3 docs/qc/2026-10-09_finding-5/compare.py"""
import collections, csv, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.normpath(os.path.join(HERE, '../../..'))
OLD = os.path.join(KIT, 'docs/qc/2026-10-07_baseline-refused/rescored')
NEW = os.path.join(HERE, 'rescored')
FILES = ['bench-2026-09-25-runs.csv', 'runs-standard.csv', 'runs-fr.csv', 'runs-durci-standard.csv', 'runs-durci-fr.csv']
key = lambda r: (r['model'], r['lang'], r['condition'], r['repeat'], r['field'], r['case_id'])
SEEN = ('typed', 'verdict', 'rewritten', 'outcome', 'reason')

def load(p):
    return {key(r): r for r in csv.DictReader(open(p, encoding='utf-8'))}

total = 0
for name in FILES:
    old, new = load(os.path.join(OLD, name)), load(os.path.join(NEW, name))
    changed = [k for k in old.keys() & new.keys() if any(old[k][c] != new[k][c] for c in SEEN)]
    only_old, only_new = old.keys() - new.keys(), new.keys() - old.keys()
    total += len(changed) + len(only_old) + len(only_new)
    print(f'{name}: {len(old)} rows before, {len(new)} after, {len(changed)} changed, {len(only_old)} gone, {len(only_new)} new')
    pages = collections.Counter(k[:5] for k in [*changed, *only_old, *only_new])
    for p, n in sorted(pages.items()):
        print('   ', '/'.join(p), n)
    moves = collections.Counter((old[k]['outcome'], new[k]['outcome']) for k in changed)
    for (a, b), n in sorted(moves.items()):
        print(f'    {a} -> {b}: {n}')
print('rows changed in all:', total)

fo = {(f['set'], f['model'], f['lang'], f['condition'], str(f['repeat']), f['field']): f for f in json.load(open(os.path.join(OLD, 'fields.json')))}
fn = {(f['set'], f['model'], f['lang'], f['condition'], str(f['repeat']), f['field']): f for f in json.load(open(os.path.join(NEW, 'fields.json')))}
print('fields tested before / after:', sum(f['status'] == 'tested' for f in fo.values()), '/', sum(f['status'] == 'tested' for f in fn.values()))
for k in sorted(fo.keys() & fn.keys()):
    a, b = fo[k], fn[k]
    if (a['status'], a['reason'], a['kind']) != (b['status'], b['reason'], b['kind']):
        print('   field', '/'.join(k), f"{a['status']}:{a['reason']}:{a['kind']} -> {b['status']}:{b['reason']}:{b['kind']}")
print('pages that took more than one attempt:', len({k[:5] for k, f in fn.items() if f['attempts'] > 1}))
