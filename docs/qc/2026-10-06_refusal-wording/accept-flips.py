"""Accept cases the probe reads as refused: which pages, which texts, which values. Read-only.
Usage: python3 docs/qc/2026-10-06_refusal-wording/accept-flips.py"""
import collections, csv, json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
RUN = os.path.join(HERE, '..', '..', '..', 'bench', 'runs', '2026-10-06_state-catalogue')
ERR = re.compile(r'invalid|inv[aá]lid|no v[aá]lido|error|erreur|incorrect', re.I)
pub = {(r['model'], r['lang'], r['condition'], r['repeat'], r['field'], r['case_id']): r for r in csv.DictReader(open(os.path.join(RUN, 'runs-standard.csv'), encoding='utf-8'))}
rows = [r for r in json.load(open(os.path.join(HERE, 'probe-rows.json'), encoding='utf-8')) if r.get('field')]
pages = collections.defaultdict(lambda: {'n': 0, 'texts': collections.Counter(), 'classes': collections.Counter(), 'typed': []})
for r in rows:
    k = (r['model'], r['lang'], r['condition'], str(r['repeat']), r['field'], r['case_id'])
    p = pub[k]
    if r['expect'] != 'accept' or p['outcome'] == r['outcome']:
        continue
    pg = pages[(r['model'], r['lang'], r['condition'], r['repeat'], r['field'])]
    pg['n'] += 1
    pg['classes'][p['class']] += 1
    pg['typed'].append(r['typed'])
    for t in r['newTexts']:
        if not ERR.search(t):
            pg['texts'][t[:70]] += 1
# how many accept cases does that field have in all, and how many flipped
tot = collections.Counter((r['model'], r['lang'], r['condition'], r['repeat'], r['field']) for r in rows if r['expect'] == 'accept')
for k, pg in sorted(pages.items(), key=lambda kv: -kv[1]['n']):
    print(f"{'/'.join(map(str, k)):52} {pg['n']:3}/{tot[k]:<3} {dict(pg['classes'])}")
    print('      texts:', dict(pg['texts'].most_common(4)))
    print('      e.g.:', pg['typed'][:3])
