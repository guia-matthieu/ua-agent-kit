#!/usr/bin/env python3
"""Published rows, rows of the first correction (2026-10-06, refusal read by its place) and rows of this branch
(2026-10-07, baseline the page refuses), side by side. Reads only; writes nothing.
Usage: python3 docs/qc/2026-10-07_baseline-refused/compare.py"""
import collections, csv, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.normpath(os.path.join(HERE, '../../..'))
RUN = os.path.join(KIT, 'bench/runs/2026-10-06_state-catalogue')
Y = os.path.join(KIT, 'docs/qc/2026-10-06_refusal-wording/rescored')
T = os.path.join(HERE, 'rescored')
SETS = [('bench of 2026-09-25, standard battery', os.path.join(KIT, 'bench/results/runs.csv'), None, os.path.join(T, 'bench-2026-09-25-runs.csv'))]
for n in ['runs-standard.csv', 'runs-fr.csv', 'runs-durci-standard.csv', 'runs-durci-fr.csv']:
    SETS.append(('run of 2026-10-06, ' + n, os.path.join(RUN, n), os.path.join(Y, n), os.path.join(T, n)))
key = lambda r: (r['model'], r['lang'], r['condition'], r['repeat'], r['field'], r['case_id'])
page = lambda k: k[:4]

def load(p):
    return {key(r): r for r in csv.DictReader(open(p, encoding='utf-8'))} if p else None

def tally(rows):
    t = collections.Counter()
    for r in rows.values():
        if r['outcome'] not in ('pass', 'fail', 'rewritten-sanitized'): t[('other', r['condition'], r['outcome'])] += 1; continue
        g = 'valid accepted' if r['expect'] == 'accept' else 'guards refused'
        t[(g, r['condition'], 'n')] += 1
        t[(g, r['condition'], 'ok')] += r['outcome'] != 'fail'
    return t

def clean_pages(rows):
    """pages on which every valid value of both fields is accepted, per condition"""
    by = collections.defaultdict(list)
    for k, r in rows.items():
        if r['expect'] == 'accept' or r['outcome'] == 'not-testable': by[page(k)].append(r['outcome'])
    out = collections.Counter()
    for p, o in by.items(): out[(p[2], 'n')] += 1; out[(p[2], 'ok')] += all(x == 'pass' for x in o)
    return out

fields = json.load(open(os.path.join(T, 'fields.json')))
moved = {(f['set'].split('/')[-1] if 'runs/' in f['set'] else 'bench', f['model'], f['lang'], f['condition'], str(f['repeat']), f['field']) for f in fields if f['baseline'] and (f['baseline']['schemeRequired'] or f['baseline']['refused'])}
for name, pub, yest, today in SETS:
    P, Yr, Tr = load(pub), load(yest), load(today)
    print('\n##', name)
    print('rows: published', len(P), '· 06/10', len(Yr) if Yr else '—', '· 07/10', len(Tr))
    for label, rows in [('published', P), ('06/10', Yr), ('07/10', Tr)]:
        if not rows: continue
        t, c = tally(rows), clean_pages(rows)
        print(f'  {label:9}', ' · '.join(f"{g} {WITH}: {t[(g, cond, 'ok')]}/{t[(g, cond, 'n')]}" for g in ('valid accepted', 'guards refused') for cond, WITH in (('no-guide', 'without'), ('guide', 'with'))),
              '· pages with every valid value accepted:', ' / '.join(f"{WITH} {c[(cond, 'ok')]}/{c[(cond, 'n')]}" for cond, WITH in (('no-guide', 'without'), ('guide', 'with'))),
              '· other:', dict((k[1:], v) for k, v in t.items() if k[0] == 'other') or 'none')
    ref = Yr or P
    diff = [k for k in Tr if k in ref and (Tr[k]['outcome'], Tr[k]['verdict']) != (ref[k]['outcome'], ref[k]['verdict'])]
    setname = 'bench' if 'bench of' in name else ('generations-durci' if 'durci' in name else 'generations')
    inside = [k for k in diff if (setname, k[0], k[1], k[2], k[3], k[4]) in moved]
    print(f"  rows whose verdict or outcome differs from {'06/10' if Yr else 'published'}: {len(diff)}, of which on a field whose baseline was refused: {len(inside)}")
    print('  ', dict(collections.Counter((ref[k]['expect'], ref[k]['outcome'], '->', Tr[k]['outcome']) for k in diff)))
    outside = collections.Counter(k[:5] for k in diff if k not in set(inside))
    if outside: print('   elsewhere:', dict(outside))
