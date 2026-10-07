#!/usr/bin/env node
// Scores again, with the runner of this branch, every page of the two benches: the bench of 2026-09-25
// (standard battery) and the run of 2026-10-06 (first draft and hardened, standard battery and TLD packs).
// Nothing published is rewritten: the CSV files go to rescored/ next to this script. fields.json keeps, per
// page and field, the kind the field was probed with and what the baseline got.
// Usage: node docs/qc/2026-10-07_baseline-refused/rescore-all.mjs     (no API call)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
const KIT = new URL('../../../', import.meta.url).pathname;
const here = new URL('./', import.meta.url).pathname;
const RUN = 'bench/runs/2026-10-06_state-catalogue/';
const { toRows, csvLine, COLUMNS } = await import(KIT + 'bench/run-bench.mjs');
const { checkForm } = await import(KIT + 'src/form-runner.mjs');
const { loadBattery } = await import(KIT + 'src/battery.mjs');
const std = loadBattery(), pack = JSON.parse(readFileSync(KIT + RUN + 'pack-as-scored.json', 'utf8'));
const notTestable = reason => ({ email: { status: 'not-testable', reason }, website: { status: 'not-testable', reason } });
async function score(file, html, lang, battery, finish) {
  if (!/<form[\s>]/i.test(html)) return { fields: notTestable(finish === 'length' ? 'truncated' : 'no-form') };
  try { return await checkForm(file, { lang, battery }); }
  catch (e) { return { fields: notTestable('runner-error'), error: String(e.message).split('\n')[0] }; }
}
mkdirSync(here + 'rescored', { recursive: true });
const SETS = [
  { folder: 'bench/results/generations', out: [['bench-2026-09-25-runs.csv', std]] },
  { folder: RUN + 'generations', out: [['runs-standard.csv', std], ['runs-fr.csv', pack]] },
  { folder: RUN + 'generations-durci', out: [['runs-durci-standard.csv', std], ['runs-durci-fr.csv', pack]] }
];
const fields = [];
for (const set of SETS) {
  const metas = readdirSync(KIT + set.folder, { recursive: true }).filter(f => /(^|\/)\d+\.json$/.test(f)).sort();
  const res = []; let i = 0, errors = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (i < metas.length) {
      const k = i++, mf = KIT + set.folder + '/' + metas[k], meta = JSON.parse(readFileSync(mf, 'utf8')), file = mf.replace(/\.json$/, '.html'), html = readFileSync(file, 'utf8');
      const reports = [];
      for (const [, battery] of set.out) reports.push(await score(file, html, meta.lang, battery, meta.finish_reason));
      if (reports.some(r => r.error)) { errors += 1; console.error(`runner error ${set.folder}/${metas[k]}: ${reports.find(r => r.error).error}`); }
      res[k] = { row: { model: meta.model, model_version: meta.model_version, lang: meta.lang, condition: meta.condition, repeat: meta.repeat }, reports };
      console.error(`done ${set.folder}/${metas[k]}`);
    }
  }));
  set.out.forEach(([name], n) => {
    const lines = [COLUMNS.join(',')];
    for (const r of res) for (const x of toRows(r.row, r.reports[n])) lines.push(csvLine(x));
    writeFileSync(here + 'rescored/' + name, lines.join('\n') + '\n');
  });
  for (const r of res) for (const f of ['email', 'website']) { const x = r.reports[0].fields[f]; fields.push({ set: set.folder, ...r.row, field: f, status: x.status, reason: x.reason ?? null, kind: x.kind ?? null, baseline: x.baseline ?? null }); }
  console.error(`${set.folder}: ${res.length} pages, ${errors} with a runner error`);
}
writeFileSync(here + 'rescored/fields.json', JSON.stringify(fields, null, 1));
