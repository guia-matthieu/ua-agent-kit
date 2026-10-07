#!/usr/bin/env python3
# Reads baseline-rows.json: per bench and field, how many tested fields show a refusal for the baseline value.
import json, collections, os
rows = json.load(open(os.path.join(os.path.dirname(__file__), 'baseline-rows.json')))
st = collections.Counter((r['root'].split('/')[-1] if 'runs' in r['root'] else 'bench-2026-09-25', r['field'], r['status']) for r in rows)
for k in sorted(st, key=str): print('status', k, st[k])
print()
tot = collections.Counter(); ref = collections.Counter(); sig = collections.Counter(); lst = []
for r in rows:
    if r['status'] != 'tested': continue
    bench = r['root'].split('/')[-1] if 'runs' in r['root'] else 'bench-2026-09-25'
    cond = 'guide' if '/guide/' in '/' + r['page'] + '/' else 'no-guide'
    key = (bench, r['field'], r['kind'], cond)
    tot[key] += 1
    b = r['baseline']
    refused = bool(b['signals']) or (b['mismatch'] and b['enforced'])
    if refused:
        ref[key] += 1; sig[(r['field'], tuple(b['signals']), b['mismatch'] and b['enforced'])] += 1
        lst.append((bench, r['page'], r['field'], r['kind'], b['signals']))
for k in sorted(tot): print(k, f"{ref[k]}/{tot[k]}")
print()
for k, v in sig.most_common(): print(v, k)
print()
for x in lst: print(*x)
