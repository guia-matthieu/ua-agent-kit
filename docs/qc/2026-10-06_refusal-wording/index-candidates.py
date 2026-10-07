"""Candidate composite indexes on the corrected first-draft rows (standard battery). Exploration, not a result:
the reading of website guards still has a known blind spot. Usage: python3 docs/qc/2026-10-06_refusal-wording/index-candidates.py"""
import collections, csv, json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
RUN = os.path.join(HERE, '..', '..', '..', 'bench', 'runs', '2026-10-06_state-catalogue')
cls = {(r['field'], r['case_id']): r['class'] for r in csv.DictReader(open(os.path.join(RUN, 'runs-standard.csv'), encoding='utf-8')) if r['case_id']}
rows = [r for r in json.load(open(os.path.join(HERE, 'fixed-rows.json'), encoding='utf-8')) if r.get('field') and r['outcome'] in ('pass', 'fail')]
P = collections.defaultdict(list)
for r in rows: P[(r['model'], r['condition'], r['lang'], r['repeat'])].append(r)
UA = {'ascii-tld-long', 'idn-tld-alabel', 'idn-sld-alabel', 'idn-ulabel', 'eai-local', 'email-idn-domain', 'eai-full'}
def page(rs):
    acc = [r for r in rs if r['expect'] == 'accept']; rej = [r for r in rs if r['expect'] == 'reject']
    A = sum(r['outcome'] == 'pass' for r in acc) / len(acc)
    byc = collections.defaultdict(list)
    for r in acc: byc[cls[(r['field'], r['case_id'])]].append(r['outcome'] == 'pass')
    Aua = sum(sum(v) / len(v) for c, v in byc.items() if c in UA) / sum(1 for c in byc if c in UA)
    R = sum(r['outcome'] == 'pass' for r in rej) / len(rej)
    return A, Aua, R
ORDER = ['gpt-oss-120b', 'deepseek-v4-flash', 'gemma-4-31b', 'qwen3-coder-30b', 'mistral-medium-3-1', 'mistral-small-3-2', 'ministral-8b']
print(f'{"model":20} {"guide":8} pages | valid accepted | UA classes accepted | guards refused | mean | A+R-1 | sqrt(A*R) | UA x R | pages all-valid')
for m in ORDER:
    for c in ('no-guide', 'guide'):
        S = [page(rs) for k, rs in P.items() if k[0] == m and k[1] == c]
        n = len(S); mean = lambda f: 100 * sum(f(s) for s in S) / n
        print(f'{m:20} {c:8} {n:5} | {mean(lambda s: s[0]):14.0f} | {mean(lambda s: s[1]):19.0f} | {mean(lambda s: s[2]):14.0f} | {mean(lambda s: (s[1] + s[2]) / 2):4.0f} | {mean(lambda s: s[1] + s[2] - 1):5.0f} | {mean(lambda s: math.sqrt(s[1] * s[2])):9.0f} | {mean(lambda s: s[1] * s[2]):6.0f} | {sum(s[0] == 1 for s in S)}/{n}')
for name, s in (('sieve: accepts everything', (1, 1, 0)), ('wall: refuses everything', (0, 0, 1)), ('reference validator', (1, 1, 1))):
    print(f'{name:29} mean {50 * (s[1] + s[2]):3.0f} | A+R-1 {100 * (s[1] + s[2] - 1):3.0f} | sqrt {100 * math.sqrt(s[1] * s[2]):3.0f} | product {100 * s[1] * s[2]:3.0f}')
