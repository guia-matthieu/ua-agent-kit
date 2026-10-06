"""Compares probe-rows.json (runner with the word filter removed) with the published runs-standard.csv.
Usage: python3 docs/qc/2026-10-06_refusal-wording/analyse.py"""
import collections
import csv
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
RUN = os.path.join(HERE, '..', '..', '..', 'bench', 'runs', '2026-10-06_state-catalogue')
ERR = re.compile(r'invalid|inv[aá]lid|no v[aá]lido|error|erreur|incorrect', re.I)   # the runner's word list

pub = {}
for r in csv.DictReader(open(os.path.join(RUN, 'runs-standard.csv'), encoding='utf-8')):
    pub[(r['model'], r['lang'], r['condition'], r['repeat'], r['field'], r['case_id'])] = r
rows = [r for r in json.load(open(os.path.join(HERE, 'probe-rows.json'), encoding='utf-8')) if r.get('field')]
errors = [r for r in json.load(open(os.path.join(HERE, 'probe-rows.json'), encoding='utf-8')) if not r.get('field')]
print(f'probe rows {len(rows)}, pages in error {len(errors)}, published rows {len(pub)}')

missing = same = 0
flips = collections.Counter()
by_cond = collections.Counter()
by_model = collections.Counter()
texts = {'reject': collections.Counter(), 'accept': collections.Counter()}
unmoved_diff = collections.Counter()
pages_flipped = collections.defaultdict(set)
for r in rows:
    k = (r['model'], r['lang'], r['condition'], str(r['repeat']), r['field'], r['case_id'])
    p = pub.get(k)
    if p is None:
        missing += 1
        continue
    if p['outcome'] == r['outcome']:
        same += 1
        continue
    unseen = [t for t in r['newTexts'] if not ERR.search(t)]
    if not unseen:
        # the outcome changed and no text outside the word list explains it: not this defect
        unmoved_diff[(p['outcome'], r['outcome'])] += 1
        continue
    flips[(r['expect'], p['outcome'], r['outcome'])] += 1
    by_cond[(r['expect'], r['condition'])] += 1
    by_model[(r['expect'], r['model'], r['condition'])] += 1
    pages_flipped[(r['expect'], r['condition'])].add(k[:4])
    for t in unseen:
        texts[r['expect']][t[:110]] += 1

print(f'compared {same + sum(flips.values()) + sum(unmoved_diff.values())}, same outcome {same}, not in the published file {missing}')
print('outcome differs, explained by a text outside the word list (expect, published, probe):')
for k, n in sorted(flips.items()):
    print('  ', k, n)
print('outcome differs, NOT explained by such a text (published, probe):', dict(unmoved_diff))
print('by condition:', dict(by_cond))
print('pages concerned:', {k: len(v) for k, v in pages_flipped.items()})
print('by model:')
for k, n in sorted(by_model.items()):
    print('  ', k, n)
for e in ('reject', 'accept'):
    print(f'\ntexts outside the word list, on cases expected to {e} ({len(texts[e])} distinct):')
    for t, n in texts[e].most_common(45):
        print(f'  {n:5}  {t}')

# guards refused, published and probe, per condition (first-draft pages, standard battery)
tot = collections.defaultdict(lambda: [0, 0, 0])
for r in rows:
    k = (r['model'], r['lang'], r['condition'], str(r['repeat']), r['field'], r['case_id'])
    p = pub.get(k)
    if p is None or r['outcome'] not in ('pass', 'fail') or p['outcome'] not in ('pass', 'fail'):
        continue
    t = tot[(r['expect'], r['condition'])]
    t[0] += 1
    t[1] += p['outcome'] == 'pass'
    t[2] += r['outcome'] == 'pass'
print('\n(expect, condition): cases, passing as published, passing in the probe')
for k, v in sorted(tot.items()):
    print('  ', k, v)
