#!/usr/bin/env node
// Condition « durcissement » (ABSENTE du standard du kit, notée à part) : second tour sur chaque page déjà générée.
// On rend au modèle sa propre page et on lui demande de corriger une validation trop permissive, avec deux
// leurres neutres de la batterie standard (aucun geoTLD, aucun accent, pour ne pas amorcer). Même demande pour
// toutes les pages, qu'elles acceptent ou non ces deux leurres. La page corrigée est notée comme les autres.
// Usage : node --env-file=.env durcir.mjs [fr|en|es ...]
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
// Published as it ran on 2026-10-06 (comments in French). Three things changed for the repository: an unused import is gone, the kit is found
// from this file's place, and the pack is read from pack-as-scored.json (see README.md).
const KIT = new URL('../../../', import.meta.url).pathname;
const { extractHtml, toRows, csvLine, COLUMNS } = await import(KIT + 'bench/run-bench.mjs');
const { checkForm } = await import(KIT + 'src/form-runner.mjs');
const { loadBattery } = await import(KIT + 'src/battery.mjs');
const here = new URL('./', import.meta.url).pathname;
const cfg = JSON.parse(readFileSync(here + 'models.json', 'utf8'));
const guide = readFileSync(KIT + 'GUIDE.md', 'utf8');
const std = loadBattery(), fr = JSON.parse(readFileSync(here + 'pack-as-scored.json', 'utf8'));
const FIX = {
  fr: 'Ce formulaire accepte des valeurs invalides, par exemple `user@example..com` dans le champ e-mail et `https://exa mple.com` dans le champ site web. Corrige la validation pour refuser les valeurs invalides. Renvoie uniquement le fichier HTML complet.',
  en: 'This form accepts invalid values, for example `user@example..com` in the email field and `https://exa mple.com` in the website field. Fix the validation so that invalid values are refused. Return only the complete HTML file.',
  es: 'Este formulario acepta valores no válidos, por ejemplo `user@example..com` en el campo de correo electrónico y `https://exa mple.com` en el campo de sitio web. Corrige la validación para rechazar los valores no válidos. Devuelve únicamente el archivo HTML completo.',
};
writeFileSync(here + 'durcir-consignes.json', JSON.stringify(FIX, null, 2) + '\n');
const langs = process.argv.slice(2).length ? process.argv.slice(2) : cfg.languages;
const csv = { std: here + 'runs-durci-standard.csv', fr: here + 'runs-durci-fr.csv' };
for (const u of Object.values(csv)) if (!existsSync(u)) writeFileSync(u, COLUMNS.join(',') + '\n');
const notTestable = reason => ({ email: { status: 'not-testable', reason }, website: { status: 'not-testable', reason } });
async function score(file, html, lang, battery, finish) {
  if (!/<form[\s>]/i.test(html)) return { fields: notTestable(finish === 'length' ? 'truncated' : 'no-form') };
  try { return await checkForm(file, { lang, battery }); } catch (e) { return { fields: notTestable('runner-error'), error: String(e.message).split('\n')[0] }; }
}
async function call(m, messages) {
  const body = { model: m.slug, messages, max_tokens: cfg.max_tokens };
  if (m.provider) body.provider = { order: [m.provider], allow_fallbacks: false };
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'content-type': 'application/json', 'HTTP-Referer': 'https://github.com/guia-matthieu/ua-agent-kit', 'X-Title': 'ua-agent-kit bench' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return { text: j.choices?.[0]?.message?.content ?? '', modelVersion: j.model ?? m.slug, usage: j.usage ?? null, finishReason: j.choices?.[0]?.finish_reason ?? null };
}
async function runModel(m) {
  for (const lang of langs) for (const condition of cfg.conditions) for (let repeat = 1; repeat <= cfg.repeats; repeat++) {
    const src = `${here}generations/${m.key}/${lang}/${condition}/${repeat}`;
    const cell = `${m.key}/${lang}/${condition}/${repeat}`;
    if (!existsSync(src + '.json')) { console.log(`absent ${cell}`); continue; }
    const dir = `${here}generations-durci/${m.key}/${lang}/${condition}/`; mkdirSync(dir, { recursive: true });
    const file = dir + `${repeat}.html`, metaFile = dir + `${repeat}.json`;
    if (existsSync(metaFile)) { console.log(`skip ${cell}`); continue; }
    try {
      const first = readFileSync(src + '.html', 'utf8');
      if (!/<form[\s>]/i.test(first)) { console.log(`sans formulaire au 1er tour ${cell}`); continue; }
      const user = readFileSync(KIT + `bench/prompts/${lang}.txt`, 'utf8').trim();
      const messages = [...(condition === 'guide' ? [{ role: 'system', content: guide }] : []), { role: 'user', content: user }, { role: 'assistant', content: '```html\n' + first + '\n```' }, { role: 'user', content: FIX[lang] }];
      const g = await call(m, messages);
      const html = extractHtml(g.text); writeFileSync(file, html);
      const meta = { model: m.key, model_version: g.modelVersion, lang, condition, repeat };
      const rS = await score(file, html, lang, std, g.finishReason), rF = await score(file, html, lang, fr, g.finishReason);
      appendFileSync(csv.std, toRows(meta, rS).map(r => csvLine(r) + '\n').join(''));
      appendFileSync(csv.fr, toRows(meta, rF).map(r => csvLine(r) + '\n').join(''));
      writeFileSync(metaFile, JSON.stringify({ ...meta, turn: 2, usage: g.usage, finish_reason: g.finishReason, date: new Date().toISOString(), runner_error: rS.error ?? rF.error ?? null, standard: rS.fields, fr: rF.fields }, null, 2));
      console.log(`done ${cell}`);
    } catch (e) { console.error(`FAILED ${cell}: ${String(e.message).slice(0, 250)}`); }
  }
}
await Promise.all(cfg.models.map(runModel));
console.log('fin du durcissement', langs.join(','));
