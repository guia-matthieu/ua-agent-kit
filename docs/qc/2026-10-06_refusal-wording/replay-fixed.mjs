#!/usr/bin/env node
// The runner as corrected on this branch (src/, unchanged here), on the same first-draft pages as probe.mjs.
// Writes fixed-rows.json, to be compared with the published CSV and with the probe by compare.py.
// Usage: node docs/qc/2026-10-06_refusal-wording/replay-fixed.mjs     (no API call)
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
const KIT = new URL('../../../', import.meta.url).pathname;
const here = new URL('./', import.meta.url).pathname;
const RUN = KIT + 'bench/runs/2026-10-06_state-catalogue/';
const { checkForm } = await import(KIT + 'src/form-runner.mjs');
const { loadBattery } = await import(KIT + 'src/battery.mjs');
const std = loadBattery();
const pages = [];
for (const model of readdirSync(RUN + 'generations')) for (const lang of ['fr', 'en', 'es']) for (const condition of ['no-guide', 'guide']) for (const repeat of [1, 2, 3]) {
  const base = `${RUN}generations/${model}/${lang}/${condition}/${repeat}`;
  if (existsSync(base + '.html') && /<form[\s>]/i.test(readFileSync(base + '.html', 'utf8'))) pages.push({ model, lang, condition, repeat, file: base + '.html' });
}
const out = [];
let next = 0;
async function worker() {
  while (next < pages.length) {
    const p = pages[next++];
    try {
      const r = await checkForm(p.file, { lang: p.lang, battery: std });
      for (const field of ['email', 'website']) for (const c of r.fields[field]?.results ?? []) out.push({ model: p.model, lang: p.lang, condition: p.condition, repeat: p.repeat, field, case_id: c.id, expect: c.expect, typed: c.typed, verdict: c.verdict, outcome: c.outcome, signals: c.signals ?? [] });
      console.error(`done ${p.model}/${p.lang}/${p.condition}/${p.repeat}`);
    } catch (e) { console.error(`FAILED ${p.model}/${p.lang}/${p.condition}/${p.repeat}: ${String(e.message).split('\n')[0]}`); out.push({ ...p, field: null, error: String(e.message).split('\n')[0] }); }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
writeFileSync(here + 'fixed-rows.json', JSON.stringify(out));
console.error(`pages ${pages.length}, rows ${out.length}`);
