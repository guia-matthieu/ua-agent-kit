#!/usr/bin/env node
// Scores again, with the runner of this branch, every page of the run of 2026-10-06: first draft and hardened,
// standard battery and TLD packs. Nothing published is rewritten: the four CSV files go to rescored/ next to
// this script, under the names the run uses, so that the run's summary.py can be read against them.
// Usage: node docs/qc/2026-10-06_refusal-wording/rescore-all.mjs     (no API call)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
const KIT = new URL('../../../', import.meta.url).pathname;
const here = new URL('./', import.meta.url).pathname;
const RUN = KIT + 'bench/runs/2026-10-06_state-catalogue/';
const { toRows, csvLine, COLUMNS } = await import(KIT + 'bench/run-bench.mjs');
const { checkForm } = await import(KIT + 'src/form-runner.mjs');
const { loadBattery } = await import(KIT + 'src/battery.mjs');
const std = loadBattery(), pack = JSON.parse(readFileSync(RUN + 'pack-as-scored.json', 'utf8'));
const notTestable = reason => ({ email: { status: 'not-testable', reason }, website: { status: 'not-testable', reason } });
async function score(file, html, lang, battery, finish) {
  if (!/<form[\s>]/i.test(html)) return { fields: notTestable(finish === 'length' ? 'truncated' : 'no-form') };
  try { return await checkForm(file, { lang, battery }); }
  catch (e) { return { fields: notTestable('runner-error'), error: String(e.message).split('\n')[0] }; }
}
mkdirSync(here + 'rescored', { recursive: true });
for (const [folder, names] of [['generations', ['runs-standard.csv', 'runs-fr.csv']], ['generations-durci', ['runs-durci-standard.csv', 'runs-durci-fr.csv']]]) {
  const metas = readdirSync(RUN + folder, { recursive: true }).filter(f => /(^|\/)\d+\.json$/.test(f)).sort();
  const res = []; let i = 0, errors = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (i < metas.length) {
      const k = i++, mf = RUN + folder + '/' + metas[k], meta = JSON.parse(readFileSync(mf, 'utf8')), file = mf.replace(/\.json$/, '.html'), html = readFileSync(file, 'utf8');
      const rS = await score(file, html, meta.lang, std, meta.finish_reason), rF = await score(file, html, meta.lang, pack, meta.finish_reason);
      if (rS.error || rF.error) { errors += 1; console.error(`runner error ${folder}/${metas[k]}: ${rS.error ?? rF.error}`); }
      res[k] = { row: { model: meta.model, model_version: meta.model_version, lang: meta.lang, condition: meta.condition, repeat: meta.repeat }, rS, rF };
      console.error(`done ${folder}/${metas[k]}`);
    }
  }));
  const L = [[COLUMNS.join(',')], [COLUMNS.join(',')]];
  for (const r of res) { for (const x of toRows(r.row, r.rS)) L[0].push(csvLine(x)); for (const x of toRows(r.row, r.rF)) L[1].push(csvLine(x)); }
  writeFileSync(here + 'rescored/' + names[0], L[0].join('\n') + '\n'); writeFileSync(here + 'rescored/' + names[1], L[1].join('\n') + '\n');
  console.error(`${folder}: ${res.length} pages, ${errors} with a runner error`);
}
