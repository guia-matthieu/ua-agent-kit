#!/usr/bin/env node
// For every generated page of the two benches: does the page refuse the runner's own baseline value?
// One case per field is enough, the baseline is typed once per field. Writes baseline-rows.json.
// Usage: node docs/qc/2026-10-07_baseline-refused/measure.mjs [output.json]     (no API call)
// baseline-rows.json was written before the correction (the baseline read against the page as it loaded,
// nothing else changed); after-fix-rows.json with the corrected runner.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const KIT = new URL('../../../', import.meta.url).pathname;
const here = new URL('./', import.meta.url).pathname;
const { checkForm } = await import(KIT + 'src/form-runner.mjs');
const { loadBattery } = await import(KIT + 'src/battery.mjs');
const std = loadBattery();
const one = { ...std, cases: [std.cases.find(c => c.kind === 'email'), std.cases.find(c => c.kind === 'domain')] };
const ROOTS = ['bench/results/generations', 'bench/runs/2026-10-06_state-catalogue/generations', 'bench/runs/2026-10-06_state-catalogue/generations-durci'];
const pages = [];
for (const root of ROOTS) for (const f of readdirSync(KIT + root, { recursive: true }).filter(f => /(^|\/)\d+\.html$/.test(f)).sort()) pages.push({ root, page: f.replace(/\.html$/, '') });
const out = []; let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < pages.length) {
    const p = pages[next++], file = `${KIT}${p.root}/${p.page}.html`;
    if (!/<form[\s>]/i.test(readFileSync(file, 'utf8'))) { out.push({ ...p, field: null, status: 'no-form' }); continue; }
    const lang = p.page.split('/').find(x => ['en', 'fr', 'es'].includes(x)) ?? 'en';
    try {
      const r = await checkForm(file, { lang, battery: one });
      for (const field of ['email', 'website']) { const f = r.fields[field]; out.push({ ...p, field, status: f.status, reason: f.reason ?? null, kind: f.kind ?? null, baseline: f.baseline ?? null }); }
    } catch (e) { out.push({ ...p, field: null, status: 'runner-error', error: String(e.message).split('\n')[0] }); }
  }
}));
out.sort((a, b) => (a.root + a.page + a.field).localeCompare(b.root + b.page + b.field));
writeFileSync(here + (process.argv[2] ?? 'baseline-rows.json'), JSON.stringify(out, null, 1));
console.error(`pages ${pages.length}, rows ${out.length}`);
