#!/usr/bin/env node
// For the fields after-fix-rows.json reports as `showed` and not refused: what differs, for the field, between
// the page as loaded and the page after the baseline value. Local files, every network request aborted.
// Usage: node docs/qc/2026-10-07_baseline-refused/showed.mjs
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
const KIT = new URL('../../../', import.meta.url).pathname;
const here = new URL('./', import.meta.url).pathname;
const { findFields } = await import(KIT + 'src/field-finder.mjs');
const { readState } = await import(KIT + 'src/verdict.mjs');
const rows = JSON.parse(readFileSync(here + 'after-fix-rows.json', 'utf8')).filter(r => r.status === 'tested' && r.baseline.showed && !r.baseline.refused && !r.baseline.schemeRequired);
const browser = await chromium.launch();
for (const r of rows) {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());
  await ctx.addInitScript(() => { window.open = () => null; window.addEventListener('submit', e => e.preventDefault()); });
  const page = await ctx.newPage();
  const read = async value => {
    await page.goto(pathToFileURL(`${KIT}${r.root}/${r.page}.html`).href, { waitUntil: 'load' });
    const sel = (await findFields(page))[r.field];
    const pristine = await page.evaluate(readState, sel);
    await page.evaluate(sel => { const el = document.querySelector(sel); for (const n of (el.form ?? document).querySelectorAll('input, textarea')) { if (n === el || n.value) continue; const t = n.type; if (t === 'checkbox') n.checked = true; else if (t === 'email' || /mail|courriel|correo/i.test(n.name + n.id)) n.value = 'ana.garcia@example.com'; else if (t === 'url' || /site|web|url/i.test(n.name + n.id)) n.value = 'https://example.com'; else if (t === 'password') n.value = 'Str0ng-Passw0rd!2026'; else if (t === 'tel') n.value = '+33123456789'; else n.value = 'Ana Garcia'; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); } }, sel);
    await page.locator(sel).first().fill(value); await page.locator(sel).first().blur();
    await page.evaluate(sel => { const f = document.querySelector(sel).form; if (f) f.requestSubmit(); }, sel).catch(() => {});
    await page.waitForTimeout(80);
    const after = await page.evaluate(readState, sel);
    return { gained: after.fieldTexts.filter(t => !pristine.fieldTexts.includes(t)), lost: pristine.fieldTexts.filter(t => !after.fieldTexts.includes(t)), aria: [pristine.ariaInvalid, after.ariaInvalid], classes: [pristine.classes.trim(), after.classes.trim()] };
  };
  console.log(JSON.stringify({ page: `${r.root.split('/').pop()}/${r.page}`, field: r.field, baseline: await read(r.baseline.typed), noValue: await read('x') }));
  await ctx.close();
}
await browser.close();
