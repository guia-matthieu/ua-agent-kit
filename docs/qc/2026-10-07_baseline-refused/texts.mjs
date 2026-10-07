#!/usr/bin/env node
// For every field measure.mjs flags: what the page writes for the bare domain, and what it writes for the
// same domain with https:// in front. Local files only, every network request aborted. Writes texts.json.
// Usage: node docs/qc/2026-10-07_baseline-refused/texts.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
const KIT = new URL('../../../', import.meta.url).pathname;
const here = new URL('./', import.meta.url).pathname;
const { findFields } = await import(KIT + 'src/field-finder.mjs');
const { readState, signalsOf } = await import(KIT + 'src/verdict.mjs');
const rows = JSON.parse(readFileSync(here + 'baseline-rows.json', 'utf8')).filter(r => r.status === 'tested' && r.baseline && (r.baseline.signals.length || r.baseline.mismatch && r.baseline.enforced));
const VALUES = { website: ['example.com', 'https://example.com', 'www.example.com'], email: ['ana.garcia@example.com', 'ana@example.com'] };
const browser = await chromium.launch(), out = [];
for (const r of rows) {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());
  await ctx.addInitScript(() => { window.open = () => null; window.addEventListener('submit', e => e.preventDefault()); });
  const page = await ctx.newPage(), url = pathToFileURL(`${KIT}${r.root}/${r.page}.html`).href, rec = { root: r.root, page: r.page, field: r.field, values: {} };
  for (const v of VALUES[r.field]) {
    await page.goto(url, { waitUntil: 'load' });
    const sel = (await findFields(page))[r.field];
    const pristine = await page.evaluate(readState, sel);
    // the other fields: the runner's own companions are not exported; plain values by type are enough here
    await page.evaluate(sel => { const el = document.querySelector(sel); for (const n of (el.form ?? document).querySelectorAll('input, textarea')) { if (n === el || n.value) continue; const t = n.type; if (t === 'checkbox') n.checked = true; else if (t === 'email' || /mail|courriel|correo/i.test(n.name + n.id)) n.value = 'ana.garcia@example.com'; else if (t === 'url' || /site|web|url/i.test(n.name + n.id)) n.value = 'https://example.com'; else if (t === 'password') n.value = 'Str0ng-Passw0rd!2026'; else if (t === 'tel') n.value = '+33123456789'; else n.value = 'Ana Garcia'; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); } }, sel);
    await page.locator(sel).first().fill(v); await page.locator(sel).first().blur();
    await page.evaluate(sel => { const f = document.querySelector(sel).form; if (f) f.requestSubmit(); }, sel).catch(() => {});
    await page.waitForTimeout(80);
    const after = await page.evaluate(readState, sel);
    rec.values[v] = { signals: signalsOf(pristine, after), newFieldTexts: after.fieldTexts.filter(t => !pristine.fieldTexts.includes(t)), newErrorTexts: after.errorTexts.filter(t => !pristine.errorTexts.includes(t)), classes: after.classes.trim() };
  }
  out.push(rec); await ctx.close();
}
await browser.close();
writeFileSync(here + 'texts.json', JSON.stringify(out, null, 1));
