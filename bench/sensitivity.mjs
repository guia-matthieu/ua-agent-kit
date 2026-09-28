#!/usr/bin/env node
// The guide / no-guide gap under each combination of the two scoring rules of RESULTS.md.
// Reads the first scoring (runs-first-scoring.csv, kit at 55df22f) and the current one (runs.csv);
// every case whose outcome differs between them is under one of the two rules (RESULTS.md, "Two rules of
// this scoring"). A case is under rule 1 when the runner typed `https://` in front of the battery value.
// The first scoring predates the three plain `.fr` cases of the battery: the comparison runs on the 79 cases
// both scorings hold, so its last-but-one row is the current scoring restricted to those 79.
// No API call, no browser: node bench/sensitivity.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parse } from './aggregate.mjs';

const dir = join(fileURLToPath(new URL('.', import.meta.url)), 'results');
const root = join(dir, '..', '..');
const value = Object.fromEntries(JSON.parse(readFileSync(join(root, 'battery', 'cases.json'), 'utf8')).cases.map(c => [c.id, c.value]));
const key = r => [r.model, r.lang, r.condition, r.repeat, r.field, r.case_id].join('/');
const first = new Map(parse(readFileSync(join(dir, 'runs-first-scoring.csv'), 'utf8')).map(r => [key(r), r.outcome]));
const all = parse(readFileSync(join(dir, 'runs.csv'), 'utf8'));
const now = all.filter(r => first.has(key(r)));
if (now.length !== first.size) throw new Error(`runs.csv holds ${now.length} of the ${first.size} cases of the first scoring`);
const perPage = now.length / new Set(now.map(r => [r.model, r.lang, r.condition, r.repeat].join('/'))).size;

// The one page that asks for a full URL in a text field (RESULTS.md, "One page is outside rule 1").
const outsidePage = 'openai/fr/guide/3';
const bare = v => !/^https?:\/\//i.test(v);

const variants = {
  'first scoring, neither rule': (f) => f,
  'rule 1 only': (f, n, r1) => (r1 ? n : f),
  'rule 2 only': (f, n, r1) => (r1 ? f : n),
  'both rules (current scoring)': (f, n) => n,
  'both rules, and the 26 bare domains of the page outside rule 1 counted as passing': (f, n, r1, r) =>
    [r.model, r.lang, r.condition, r.repeat].join('/') === outsidePage && r.field === 'website' && r.expect === 'accept' && bare(value[r.case_id]) ? 'pass' : n,
};

const models = ['anthropic', 'openai', 'open-weight'];
const pct = (p, n) => (100 * p / n).toFixed(1);
const lines = ['| scoring | ' + models.map(m => `${m} no-guide → guide`).join(' | ') + ` | all models | pages where the ${perPage} cases pass |`, '|---|---|---|---|---|---|'];
let rule1 = 0;
for (const [name, pick] of Object.entries(variants)) {
  const count = {}; const failedPages = new Set(); const pages = new Set();
  for (const r of now) {
    const f = first.get(key(r));
    const r1 = r.typed === 'https://' + value[r.case_id];
    if (name === 'rule 1 only' && r1) rule1++;
    const o = pick(f, r.outcome, r1, r);
    const page = [r.model, r.lang, r.condition, r.repeat].join('/');
    pages.add(page); if (o !== 'pass') failedPages.add(page);
    for (const m of [r.model, 'all']) {
      const c = (count[`${m}/${r.condition}`] ??= { pass: 0, n: 0 });
      c.n++; if (o === 'pass') c.pass++;
    }
  }
  const cell = m => `${pct(count[`${m}/no-guide`].pass, count[`${m}/no-guide`].n)} → ${pct(count[`${m}/guide`].pass, count[`${m}/guide`].n)} %`;
  const passed = c => [...pages].filter(p => p.split('/')[2] === c && !failedPages.has(p)).length;
  lines.push(`| ${name} | ${models.map(cell).join(' | ')} | ${cell('all')} | ${passed('no-guide')}/27 → ${passed('guide')}/27 |`);
}
console.log(lines.join('\n'));
console.log(`\n${now.length} cases of ${all.length} in both scorings; ${rule1} under rule 1, ${now.length - rule1} under rule 2 or neither.`);
