"""Per page, with the corrected runner (fixed-rows.json: first draft, standard battery): does the page accept
every valid value, and does it refuse anything at all? Usage: python3 docs/qc/2026-10-06_refusal-wording/pages.py"""
import collections, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
rows = [r for r in json.load(open(os.path.join(HERE, 'fixed-rows.json'), encoding='utf-8')) if r.get('field') and r['outcome'] in ('pass', 'fail')]
pages = collections.defaultdict(lambda: collections.Counter())
for r in rows:
    pages[(r['model'], r['condition'], r['lang'], r['repeat'])][(r['expect'], r['outcome'])] += 1
ORDER = ['qwen3-coder-30b', 'deepseek-v4-flash', 'mistral-medium-3-1', 'gpt-oss-120b', 'mistral-small-3-2', 'ministral-8b', 'gemma-4-31b']
def line(sel):
    n = len(sel)
    allvalid = [p for p in sel if p[('accept', 'fail')] == 0]
    sieve = [p for p in allvalid if p[('reject', 'pass')] == 0]
    most = [p for p in allvalid if p[('reject', 'pass')] >= 0.75 * (p[('reject', 'pass')] + p[('reject', 'fail')])]
    full = [p for p in sel if p[('accept', 'fail')] == 0 and p[('reject', 'fail')] == 0]
    return f'{n:3} | {len(allvalid):3} | {len(sieve):3} | {len(most):3} | {len(full):3}'
print('model | guide | pages | accept every valid value | ...of which refuse no guard at all | ...of which refuse 3 guards in 4 or more | pass all cases')
for m in ORDER:
    for c in ('no-guide', 'guide'):
        print(f'{m:20} | {c:8} | ' + line([v for k, v in pages.items() if k[0] == m and k[1] == c]))
for c in ('no-guide', 'guide'):
    print(f'{"ALL":20} | {c:8} | ' + line([v for k, v in pages.items() if k[1] == c]))
# what the pages that do not accept every valid value refuse
lost = collections.Counter()
for r in rows:
    if r['expect'] == 'accept' and r['outcome'] == 'fail':
        cid = r['case_id']
        fam = 'accented local part' if '-eai-' in cid else 'accented domain, as typed' if 'ulabel' in cid or 'idn-domain' in cid else 'A-label (xn--)' if 'alabel' in cid else 'long ASCII TLD' if 'tld-long' in cid else 'short ASCII TLD' if 'tld-short' in cid else 'ordinary value (control, boundary)'
        lost[(r['condition'], fam)] += 1
tot = collections.Counter(r['condition'] for r in rows if r['expect'] == 'accept')
print('\nvalid values refused, by family:')
for (c, fam), n in sorted(lost.items()):
    print(f'  {c:8} {fam:36} {n}')
print('valid cases in all:', dict(tot))
