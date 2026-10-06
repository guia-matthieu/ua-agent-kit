#!/usr/bin/env node
// Banc ua-agent-kit rejoué sur les modèles du catalogue de l'État, protocole inchangé :
// mêmes consignes (bench/prompts), mêmes conditions, même GUIDE.md, même runner, batterie standard intacte.
// Seul ajout : chaque page est AUSSI notée sur le paquet France (cases-fr.json), dans un fichier à part.
// Usage : node --env-file=.env run.mjs [fr|en|es ...]     (reprise : les cellules déjà faites sont sautées)
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
// Published as it ran on 2026-10-06 (comments in French). Two things changed for the repository: the kit is found
// from this file's place, and the pack is read from pack-as-scored.json (see README.md).
const KIT = new URL('../../../', import.meta.url).pathname;
const { generate } = await import(KIT + 'bench/openrouter.mjs');
const { extractHtml, toRows, csvLine, COLUMNS } = await import(KIT + 'bench/run-bench.mjs');
const { checkForm } = await import(KIT + 'src/form-runner.mjs');
const { loadBattery } = await import(KIT + 'src/battery.mjs');
const here = new URL('./', import.meta.url);
const cfg = JSON.parse(readFileSync(new URL('models.json', here), 'utf8'));
const guide = readFileSync(KIT + 'GUIDE.md', 'utf8');
const std = loadBattery();
const fr = JSON.parse(readFileSync(new URL('pack-as-scored.json', here), 'utf8'));
const kitCommit = execSync('git rev-parse --short HEAD', { cwd: KIT }).toString().trim();
const langs = process.argv.slice(2).length ? process.argv.slice(2) : cfg.languages;
const csv = { std: new URL('runs-standard.csv', here), fr: new URL('runs-fr.csv', here) };
for (const u of Object.values(csv)) if (!existsSync(u)) writeFileSync(u, COLUMNS.join(',') + '\n');
const notTestable = reason => ({ email: { status: 'not-testable', reason }, website: { status: 'not-testable', reason } });
async function score(file, html, lang, battery, finish) {
  if (!/<form[\s>]/i.test(html)) return { fields: notTestable(finish === 'length' ? 'truncated' : 'no-form') };
  try { return await checkForm(file, { lang, battery }); }
  catch (e) { return { fields: notTestable('runner-error'), error: String(e.message).split('\n')[0] }; }
}
async function runModel(m) {
  for (const lang of langs) for (const condition of cfg.conditions) for (let repeat = 1; repeat <= cfg.repeats; repeat++) {
    const dir = new URL(`generations/${m.key}/${lang}/${condition}/`, here);
    mkdirSync(dir, { recursive: true });
    const file = new URL(`${repeat}.html`, dir).pathname, metaFile = new URL(`${repeat}.json`, dir).pathname;
    const cell = `${m.key}/${lang}/${condition}/${repeat}`;
    if (existsSync(metaFile)) { console.log(`skip ${cell}`); continue; }
    try {
      const user = readFileSync(KIT + `bench/prompts/${lang}.txt`, 'utf8').trim();
      const g = await generate({ slug: m.slug, provider: m.provider, system: condition === 'guide' ? guide : null, user, maxTokens: cfg.max_tokens, temperature: cfg.temperature });
      if (g.finishReason === 'length') console.error(`TRUNCATED ${cell}`);
      const html = extractHtml(g.text);
      writeFileSync(file, html);
      const meta = { model: m.key, model_version: g.modelVersion, lang, condition, repeat };
      const rStd = await score(file, html, lang, std, g.finishReason);
      const rFr = await score(file, html, lang, fr, g.finishReason);
      appendFileSync(csv.std, toRows(meta, rStd).map(r => csvLine(r) + '\n').join(''));
      appendFileSync(csv.fr, toRows(meta, rFr).map(r => csvLine(r) + '\n').join(''));
      writeFileSync(metaFile, JSON.stringify({ ...meta, slug: m.slug, usage: g.usage, finish_reason: g.finishReason, date: new Date().toISOString(), kit_commit: kitCommit, battery: std.version, pack_fr: fr.version, runner_error: rStd.error ?? rFr.error ?? null, standard: rStd.fields, fr: rFr.fields }, null, 2));
      console.log(`done ${cell}`);
    } catch (e) { console.error(`FAILED ${cell}: ${String(e.message).slice(0, 300)}`); }
  }
}
await Promise.all(cfg.models.map(runModel));
console.log('fin du lot', langs.join(','));
