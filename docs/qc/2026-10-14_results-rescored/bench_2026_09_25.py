"""The count tables of bench/results/RESULTS.md, from the published runs.csv and from the reference scoring, side by side.
Prints Markdown; a cell that differs reads `published → reference`. No browser, no API call.
Usage: python3 docs/qc/2026-10-14_results-rescored/bench_2026_09_25.py"""
import collections
import csv
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
PUBLISHED = os.path.join(ROOT, 'bench', 'results', 'runs.csv')
REFERENCE = os.path.join(ROOT, 'docs', 'qc', '2026-10-09_finding-5', 'rescored', 'bench-2026-09-25-runs.csv')
MODELS = ('anthropic', 'openai', 'open-weight')
CONDS = ('no-guide', 'guide')
CLASSES = [('eai-local', 'accept'), ('eai-full', 'accept'), ('email-idn-domain', 'accept'), ('idn-ulabel', 'accept'),
           ('idn-tld-alabel', 'accept'), ('idn-sld-alabel', 'accept'), ('ascii-tld-long', 'accept'),
           ('ascii-tld-short', 'accept'), ('control', 'accept'), ('boundary', 'accept'), ('boundary', 'reject'),
           ('guard', 'reject')]


def load(path):
    rows = {}
    for r in csv.DictReader(open(path, encoding='utf-8')):
        rows[(r['model'], r['lang'], r['condition'], r['repeat'], r['field'], r['case_id'])] = r
    return list(rows.values())


def pct(a, b):
    return f'{100 * a / b:.1f} %' if b else '—'


def tables(rows):
    t = {}
    for m in MODELS + ('all models',):
        for c in CONDS:
            rs = [r for r in rows if r['condition'] == c and (m == 'all models' or r['model'] == m)]
            p = sum(r['outcome'] == 'pass' for r in rs)
            f = sum(r['outcome'] == 'fail' for r in rs)
            va = [r for r in rs if r['expect'] == 'accept']
            ir = [r for r in rs if r['expect'] == 'reject']
            vp, ip = sum(r['outcome'] == 'pass' for r in va), sum(r['outcome'] == 'pass' for r in ir)
            t[('model', m, c)] = [p, f, pct(p, p + f), f'{vp}/{len(va)} ({pct(vp, len(va))})', f'{ip}/{len(ir)} ({pct(ip, len(ir))})']
    pages = collections.defaultdict(list)
    for r in rows:
        pages[(r['model'], r['condition'], r['lang'], r['repeat'])].append(r)
    for m in MODELS:
        for c in CONDS:
            ps = [v for k, v in pages.items() if k[0] == m and k[1] == c]
            valid = sum(all(r['outcome'] == 'pass' for r in v if r['expect'] == 'accept') for v in ps)
            every = sum(all(r['outcome'] == 'pass' for r in v) for v in ps)
            t[('page', m, c)] = [f'{valid}/{len(ps)}', f'{every}/{len(ps)}']
    for m in MODELS:
        for lang in ('en', 'es', 'fr'):
            for c in ('guide', 'no-guide'):
                rs = [r for r in rows if r['model'] == m and r['lang'] == lang and r['condition'] == c]
                n = collections.Counter(r['outcome'] for r in rs)
                tested = [r for r in rs if r['outcome'] in ('pass', 'fail', 'rewritten-sanitized')]
                t[('cell', m, lang, c)] = [n['pass'], n['fail'], n['rewritten-sanitized'], n['not-observed'], n['not-testable'], sum(r['rewritten'] == 'true' for r in tested)]
    for cl, ex in CLASSES:
        cells = []
        for m in MODELS:
            for c in CONDS:
                rs = [r for r in rows if r['model'] == m and r['condition'] == c and r['class'] == cl and r['expect'] == ex and r['outcome'] in ('pass', 'fail')]
                cells.append(f"{sum(r['outcome'] == 'pass' for r in rs)}/{len(rs)}")
        t[('class', cl, ex)] = cells
    for label, ex in (('valid value, refusal shown by the page', 'accept'), ('invalid value, no refusal read after the submit', 'reject')):
        for field in ('email', 'website'):
            t[('where', label, field)] = [sum(r['outcome'] == 'fail' and r['expect'] == ex and r['field'] == field for r in rows if r['model'] == m and r['condition'] == c) for m in MODELS for c in CONDS]
    t[('where', '**total**', '')] = [sum(r['outcome'] == 'fail' for r in rows if r['model'] == m and r['condition'] == c) for m in MODELS for c in CONDS]
    return t


def both(a, b):
    return [x if x == y else f'**{x} → {y}**' for x, y in zip(a, b)]


def show(title, head, kind, A, B):
    print(f'\n## {title}\n\n| {" | ".join(head)} |\n|{"---|" * len(head)}')
    for k in A:
        if k[0] == kind:
            print('| ' + ' | '.join(list(k[1:]) + [str(v) for v in both(A[k], B[k])]) + ' |')


A, B = tables(load(PUBLISHED)), tables(load(REFERENCE))
pub, ref = load(PUBLISHED), load(REFERENCE)
key = lambda r: (r['model'], r['lang'], r['condition'], r['repeat'], r['field'], r['case_id'])
moved = collections.Counter((r['model'], r['lang'], r['condition'], r['repeat'], r['field'], o['outcome'], r['outcome'])
                            for o, r in zip(sorted(pub, key=key), sorted(ref, key=key)) if o['outcome'] != r['outcome'])
print('# Bench of 2026-09-25: published tables against the reference scoring\n')
print(f'Published: `bench/results/runs.csv` ({len(pub)} rows). Reference: `docs/qc/2026-10-09_finding-5/rescored/bench-2026-09-25-runs.csv` ({len(ref)} rows).\n')
print('Rows whose outcome differs, by page and field:\n\n| model | lang | condition | repeat | field | published | reference | rows |\n|---|---|---|---|---|---|---|---|')
for k, n in sorted(moved.items()):
    print('| ' + ' | '.join(k) + f' | {n} |')
G = ['anthropic ng', 'anthropic g', 'openai ng', 'openai g', 'open-weight ng', 'open-weight g']
show('Per model', ['model', 'condition', 'pass', 'fail', 'pass rate', 'valid values accepted', 'invalid values refused'], 'model', A, B)
show('Per page', ['model', 'condition', 'pages where the 66 valid cases pass', 'pages where the 82 cases pass'], 'page', A, B)
show('Per cell', ['model', 'lang', 'condition', 'pass', 'fail', 'sanitized', 'not-observed', 'not-testable', 'rewritten'], 'cell', A, B)
show('Per class', ['class', 'expected'] + G, 'class', A, B)
show('Where the failures are', ['what was read', 'field'] + G, 'where', A, B)
