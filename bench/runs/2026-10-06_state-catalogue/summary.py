"""Tables of the run of 2026-10-06, from the four CSV files next to this script.
Usage: python3 summary.py > RESULTS.md"""
import collections
import csv
import glob
import json
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
ORDER = [('Code', 'qwen3-coder-30b'), ('Code', 'deepseek-v4-flash'), ('Chat', 'mistral-medium-3-1'), ('Chat', 'gpt-oss-120b'),
         ('Chat', 'mistral-small-3-2'), ('Chat', 'ministral-8b'), ('Chat', 'gemma-4-31b')]
G = ['geoTLD, ASCII', 'accented .fr, as typed', 'accented geoTLD, as typed (syntax only)', 'A-label', 'accented local part', 'guards refused']
GUARDS = G[-1]
WITH = {'guide': 'with', 'no-guide': 'without'}


def group(r):
    c = r['case_id']
    if r['expect'] == 'reject':
        return GUARDS
    if '-eai-' in c:
        return 'accented local part'
    if '-idn-' in c:
        if r['class'] == 'idn-sld-alabel':
            return 'A-label'
        return 'accented .fr, as typed' if '-idn-fr-' in c else 'accented geoTLD, as typed (syntax only)'
    return 'geoTLD, ASCII'


def load(path):
    out = {}
    for r in csv.DictReader(open(path, encoding='utf-8')):
        if r['outcome'] in ('pass', 'fail'):
            out[(r['model'], r['lang'], r['condition'], r['repeat'], r['field'], r['case_id'])] = (r['outcome'] == 'pass', group(r), r['typed'])
    return out


def cell(k):
    return k[:4]


def table(data, title, keys=None):
    t = collections.defaultdict(lambda: [0, 0])
    pages = collections.defaultdict(set)
    for k, (ok, g, _) in data.items():
        if keys is not None and cell(k) not in keys:
            continue
        t[(k[0], k[2], g)][1] += 1
        t[(k[0], k[2], g)][0] += ok
        pages[(k[0], k[2])].add(cell(k))
    print(f"\n## {title}\n\n| group | model | guide | pages | " + " | ".join(G) + " |\n|---|---|---|---|" + "---|" * len(G))
    for grp, m in ORDER:
        for c in ('no-guide', 'guide'):
            print(f"| {grp} | {m} | {WITH[c]} | {len(pages[(m, c)])} | " + " | ".join(f"{t[(m, c, g)][0]}/{t[(m, c, g)][1]}" for g in G) + " |")


def standard(path, title):
    t = collections.defaultdict(lambda: [0, 0])
    pages = collections.defaultdict(set)
    for r in csv.DictReader(open(path, encoding='utf-8')):
        if r['outcome'] not in ('pass', 'fail'):
            continue
        k = (r['model'], r['condition'], r['expect'])
        t[k][1] += 1
        t[k][0] += r['outcome'] == 'pass'
        pages[(r['model'], r['condition'])].add((r['lang'], r['repeat']))
    print(f"\n## {title}\n\n| group | model | guide | pages | valid values accepted | guards refused |\n|---|---|---|---|---|---|")
    for grp, m in ORDER:
        for c in ('no-guide', 'guide'):
            a, g = t[(m, c, 'accept')], t[(m, c, 'reject')]
            print(f"| {grp} | {m} | {WITH[c]} | {len(pages[(m, c)])} | {a[0]}/{a[1]} | {g[0]}/{g[1]} |")


A, B = load('runs-fr.csv'), load('runs-durci-fr.csv')
n1 = len(glob.glob('generations/*/*/*/*.json'))
n2 = len(glob.glob('generations-durci/*/*/*/*.json'))
ca, cb = {cell(k) for k in A}, {cell(k) for k in B}
both = ca & cb
print("# Results — run of 2026-10-06\n\nWritten by `summary.py` from the CSV files of this folder. Read `README.md` first: it says what was run and what the numbers do not show.\n")
print(f"First draft: {n1} pages generated, {len(ca)} testable. Hardening: {n2} pages generated, {len(cb)} testable, {len(both)} comparable before and after.")
standard('runs-standard.csv', 'First draft, standard battery 1.0.0 (82 cases per page), three languages')
table(A, 'First draft, TLD packs (62 cases per page), three languages')
table(A, 'First draft, TLD packs, pages comparable with their hardened version only', both)
table(B, 'After hardening, same pages')
print("\n## Regressions at hardening (a valid value accepted before, refused after)")
for scope in ('all', 'fr', 'en', 'es'):
    print(f"\n**Language: {scope}**\n\n| guide | pages compared | pages with a regression | values lost | values regained | pages passing the 62 cases, before → after |\n|---|---|---|---|---|---|")
    for c in ('no-guide', 'guide'):
        cs = {k for k in both if k[2] == c and (scope == 'all' or k[1] == scope)}
        lost = collections.Counter()
        gain = 0
        for k, (ok, g, _) in A.items():
            if cell(k) in cs and g != GUARDS and k in B:
                if ok and not B[k][0]:
                    lost[cell(k)] += 1
                if not ok and B[k][0]:
                    gain += 1

        def allpass(data):
            return sum(1 for p in cs if all(v[0] for k, v in data.items() if cell(k) == p))
        print(f"| {WITH[c]} | {len(cs)} | {len(lost)} | {sum(lost.values())} | {gain} | {allpass(A)} → {allpass(B)} |")
kinds = collections.Counter()
values = collections.Counter()
models = collections.Counter()
for k, (ok, g, typed) in A.items():
    if cell(k) in both and g != GUARDS and k in B and ok and not B[k][0]:
        kinds[(k[2], g)] += 1
        values[typed] += 1
        models[(k[0], k[2])] += 1
print("\n**Values lost, by family**\n\n| guide | family | values lost |\n|---|---|---|")
for (c, g), n in sorted(kinds.items(), key=lambda x: (x[0][0] != 'no-guide', -x[1])):
    print(f"| {WITH[c]} | {g} | {n} |")
print("\n**Values lost, by model**\n\n| model | guide | values lost |\n|---|---|---|")
for (m, c), n in sorted(models.items(), key=lambda x: -x[1]):
    print(f"| {m} | {WITH[c]} | {n} |")
print("\n**ASCII geoTLD values lost**\n\n| value | pages |\n|---|---|")
for typed, n in sorted(values.items(), key=lambda x: -x[1]):
    if 'xn--' not in typed and typed.isascii():
        print(f"| `{typed}` | {n} |")


def cost(folder):
    return round(sum((json.load(open(f)).get('usage') or {}).get('cost') or 0 for f in glob.glob(folder + '/*/*/*/*.json')), 3)


print(f"\nCost reported by OpenRouter: first draft {cost('generations')} USD, hardening {cost('generations-durci')} USD.")
