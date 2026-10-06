#!/usr/bin/env node
// Question: does the runner miss refusals whose message holds none of the words it looks for
// (`invalid`, `error`, `erreur`, `incorrect`, `no válido`)? A page that says "Enter a valid email address."
// shows a refusal the published verdict reads as `accepted`.
// Method: the runner itself, unchanged except for ONE filter. A copy of src/ is made next to it, and in
// that copy readState() keeps every visible leaf text of the form instead of those matching the word list.
// A refusal by text then becomes "a visible text the page did not show after the baseline value".
// That is an upper bound, not a corrected verdict: any new text counts, a refusal or not. The new texts
// are kept with each case so that they can be read.
// Usage: node docs/qc/2026-10-06_refusal-wording/probe.mjs     (no API call; the first-draft pages of the run of 2026-10-06)
import { readFileSync, writeFileSync, cpSync, rmSync, existsSync, readdirSync } from 'node:fs';
const KIT = new URL('../../../', import.meta.url).pathname;
const here = new URL('./', import.meta.url).pathname;
const RUN = KIT + 'bench/runs/2026-10-06_state-catalogue/';
const COPY = KIT + 'src-probe-tmp/';
rmSync(COPY, { recursive: true, force: true });
cpSync(KIT + 'src/', COPY, { recursive: true });
const once = (text, from, to) => { const n = text.split(from).length - 1; if (n !== 1) throw new Error(`expected one occurrence, found ${n}: ${from}`); return text.replace(from, to); };
let v = readFileSync(COPY + 'verdict.mjs', 'utf8');
v = once(v, '.map(n => n.textContent.trim()).filter(t => t && errRe.test(t));', '.map(n => n.textContent.trim()).filter(t => t);');
v = once(v, "signals: signalsOf(before, after) };", "signals: signalsOf(before, after), newTexts: after.errorTexts.filter(t => !before.errorTexts.includes(t)) };");
writeFileSync(COPY + 'verdict.mjs', v);
const { checkForm } = await import(COPY + 'form-runner.mjs');
const { loadBattery } = await import(COPY + 'battery.mjs');
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
      for (const field of ['email', 'website']) for (const c of r.fields[field]?.results ?? []) out.push({ model: p.model, lang: p.lang, condition: p.condition, repeat: p.repeat, field, case_id: c.id, expect: c.expect, typed: c.typed, verdict: c.verdict, outcome: c.outcome, signals: c.signals ?? [], newTexts: c.newTexts ?? [] });
      console.error(`done ${p.model}/${p.lang}/${p.condition}/${p.repeat}`);
    } catch (e) { console.error(`FAILED ${p.model}/${p.lang}/${p.condition}/${p.repeat}: ${String(e.message).split('\n')[0]}`); out.push({ ...p, field: null, error: String(e.message).split('\n')[0] }); }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
writeFileSync(here + 'probe-rows.json', JSON.stringify(out));
rmSync(COPY, { recursive: true, force: true });
console.error(`pages ${pages.length}, rows ${out.length}`);
