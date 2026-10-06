"""Three readings of the same 122 first-draft pages, standard battery: the published CSV, the probe (word filter
removed, any new text of the form counts) and the corrected runner (fixed-rows.json).
Usage: python3 docs/qc/2026-10-06_refusal-wording/compare.py"""
import collections
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
RUN = os.path.join(HERE, '..', '..', '..', 'bench', 'runs', '2026-10-06_state-catalogue')


def key(r):
    return (r['model'], r['lang'], r['condition'], str(r['repeat']), r['field'], r['case_id'])


pub = {key(r): r for r in csv.DictReader(open(os.path.join(RUN, 'runs-standard.csv'), encoding='utf-8')) if r['field']}
probe = {key(r): r for r in json.load(open(os.path.join(HERE, 'probe-rows.json'), encoding='utf-8')) if r.get('field')}
fixed_all = json.load(open(os.path.join(HERE, 'fixed-rows.json'), encoding='utf-8'))
fixed = {key(r): r for r in fixed_all if r.get('field')}
print(f'published {len(pub)}, probe {len(probe)}, corrected {len(fixed)}, pages in error {sum(1 for r in fixed_all if not r.get("field"))}')
print('rows of the corrected run absent from the probe:', len(set(fixed) - set(probe)), '| absent from the published file:', len(set(fixed) - set(pub)))

common = [k for k in fixed if k in pub and k in probe]
shape = collections.Counter()
for k in common:
    shape[(fixed[k]['expect'], pub[k]['outcome'], probe[k]['outcome'], fixed[k]['outcome'])] += 1
print('\n(expect, published, probe, corrected): rows')
for k, n in sorted(shape.items()):
    print('  ', k, n)

# A. the probe read a refusal, the corrected runner does not: a text outside the field's own place
out_of_place = collections.defaultdict(lambda: [0, collections.Counter()])
# B. the corrected runner reads a refusal the probe did not: unexpected, the probe keeps every leaf text
unexpected = []
for k in common:
    p, f = probe[k]['outcome'], fixed[k]['outcome']
    if p == f:
        continue
    if pub[k]['outcome'] == f:
        page = out_of_place[k[:5] + (fixed[k]['expect'],)]
        page[0] += 1
        for t in probe[k]['newTexts']:
            page[1][t[:80]] += 1
    else:
        unexpected.append((k, pub[k]['outcome'], p, f, fixed[k]['signals']))
print(f'\nA. read as a refusal by the probe only ({sum(v[0] for v in out_of_place.values())} rows, {len(out_of_place)} fields):')
for k, (n, texts) in sorted(out_of_place.items(), key=lambda kv: -kv[1][0]):
    print(f"  {'/'.join(k[:5])} expect={k[5]} rows={n} texts={dict(texts.most_common(3))}")
print(f'\nB. read differently by the corrected runner only ({len(unexpected)} rows):')
for u in unexpected[:40]:
    print('  ', u)

tot = collections.defaultdict(lambda: [0, 0, 0, 0])
for k in common:
    if any(d[k]['outcome'] not in ('pass', 'fail') for d in (pub, probe, fixed)):
        continue
    t = tot[(fixed[k]['expect'], k[2])]
    t[0] += 1
    t[1] += pub[k]['outcome'] == 'pass'
    t[2] += probe[k]['outcome'] == 'pass'
    t[3] += fixed[k]['outcome'] == 'pass'
print('\n(expect, condition): cases, passing as published, in the probe, with the corrected runner')
for k, v in sorted(tot.items()):
    print('  ', k, v, f'{100 * v[1] / v[0]:.1f}% -> {100 * v[3] / v[0]:.1f}%')

sig = collections.Counter()
for k in common:
    if fixed[k]['outcome'] != pub[k]['outcome']:
        sig[tuple(fixed[k]['signals'])] += 1
print('\nsignals on the rows whose outcome changed:', dict(sig))
by_model = collections.defaultdict(lambda: [0, 0, 0])
for k in common:
    if fixed[k]['expect'] != 'accept' or fixed[k]['outcome'] not in ('pass', 'fail') or pub[k]['outcome'] not in ('pass', 'fail'):
        continue
    m = by_model[(k[0], k[2])]
    m[0] += 1
    m[1] += pub[k]['outcome'] == 'pass'
    m[2] += fixed[k]['outcome'] == 'pass'
print('\nvalid values accepted, (model, condition): cases, published, corrected')
for k, v in sorted(by_model.items()):
    print('  ', k, v)
