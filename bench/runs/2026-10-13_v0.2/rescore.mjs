#!/usr/bin/env node
// Re-note toutes les pages sauvegardées (batterie standard + paquet France), sans appel d'API.
// Reconstruit runs-standard.csv et runs-fr.csv en entier, et met à jour chaque .json.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
// Published as it ran on 2026-10-06 (comments in French). Two things changed for the repository: the kit is found
// from this file's place, and the pack is read from pack-as-scored.json (see README.md).
const KIT = new URL('../../../', import.meta.url).pathname;
const { toRows, csvLine, COLUMNS } = await import(KIT + 'bench/run-bench.mjs');
const { checkForm } = await import(KIT + 'src/form-runner.mjs');
const { loadBattery } = await import(KIT + 'src/battery.mjs');
const here = new URL('./', import.meta.url).pathname;
const std = loadBattery(), fr = JSON.parse(readFileSync(here + 'pack-as-scored.json', 'utf8'));
const kitCommit = execSync('git rev-parse --short HEAD', { cwd: KIT }).toString().trim();
const notTestable = reason => ({ email: { status: 'not-testable', reason }, website: { status: 'not-testable', reason } });
async function score(file, html, lang, battery, finish) {
  if (!/<form[\s>]/i.test(html)) return { fields: notTestable(finish === 'length' ? 'truncated' : 'no-form') };
  try { return await checkForm(file, { lang, battery }); }
  catch (e) { return { fields: notTestable('runner-error'), error: String(e.message).split('\n')[0] }; }
}
const metas = readdirSync(here + 'generations', { recursive: true }).filter(f => /(^|\/)\d+\.json$/.test(f)).sort();
const L = { std: [COLUMNS.join(',')], fr: [COLUMNS.join(',')] }; const id = new Date().toISOString(); let errors = 0;
const todo = metas.map(rel => async () => {
  const mf = here + 'generations/' + rel, meta = JSON.parse(readFileSync(mf, 'utf8')), file = mf.replace(/\.json$/, '.html'), html = readFileSync(file, 'utf8');
  const rS = await score(file, html, meta.lang, std, meta.finish_reason), rF = await score(file, html, meta.lang, fr, meta.finish_reason);
  if (rS.error || rF.error) errors += 1;
  const row = { model: meta.model, model_version: meta.model_version, lang: meta.lang, condition: meta.condition, repeat: meta.repeat };
  return { mf, meta, rS, rF, row };
});
const res = []; let i = 0;                                   // 4 pages en parallèle
await Promise.all(Array.from({ length: 4 }, async () => { while (i < todo.length) { const k = i++; res[k] = await todo[k](); } }));
for (const r of res) { for (const x of toRows(r.row, r.rS)) L.std.push(csvLine(x)); for (const x of toRows(r.row, r.rF)) L.fr.push(csvLine(x));
  writeFileSync(r.mf, JSON.stringify({ ...r.meta, kit_commit: kitCommit, battery: std.version, pack_fr: fr.version, rescore_id: id, runner_error: r.rS.error ?? r.rF.error ?? null, standard: r.rS.fields, fr: r.rF.fields }, null, 2)); }
writeFileSync(here + 'runs-standard.csv', L.std.join('\n') + '\n'); writeFileSync(here + 'runs-fr.csv', L.fr.join('\n') + '\n');
console.log(`re-noté ${res.length} pages, ${errors} avec erreur de runner, passe ${id}`);
