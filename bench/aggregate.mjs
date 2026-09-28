#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

/** RFC 4180 reader: honours quoted cells (commas, doubled quotes, line breaks). */
export function parse(csv) {
  const records = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (quoted) {
      if (ch === '"' && csv[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && csv[i + 1] === '\n') i++;
      row.push(cell); records.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); records.push(row); }
  const [cols, ...lines] = records.filter(r => r.some(v => v !== ''));
  return lines.map(l => {
    if (l.length !== cols.length) throw new Error(`runs.csv: a row has ${l.length} cells, the header has ${cols.length}`);
    return Object.fromEntries(l.map((v, i) => [cols[i], v]));
  });
}

/** Every row lands in exactly one bucket: pass, fail, sanitized (a reject case the field rewrote into a valid value),
 *  notObserved (no rejection seen and the submit never fired: neither pass nor fail), notTestable, runnerError.
 *  A row repeated by a rerun after a crash is counted once (last copy wins). An unknown outcome throws.
 *  `expectPages`: the number of pages models.json describes (models × languages × conditions × repeats); a CSV
 *  with another number of pages is an incomplete bench and throws — a skipped page must never shrink a denominator. */
export function aggregate(csv, { expectPages = null } = {}) {
  const unique = new Map();
  for (const r of parse(csv)) unique.set([r.model, r.lang, r.condition, r.repeat, r.field, r.case_id].join('\u0000'), r);
  const rows = [...unique.values()];
  const pages = new Set(rows.map(r => [r.model, r.lang, r.condition, r.repeat].join('\u0000'))).size;
  if (expectPages !== null && pages !== expectPages) throw new Error(`bench incomplet: runs.csv holds ${pages} page(s), models.json expects ${expectPages} (models × languages × conditions × repeats)`);
  const key = r => `${r.model}|${r.lang}|${r.condition}`;
  const cells = {};
  const pooled = {};
  const BUCKET = { pass: 'pass', fail: 'fail', 'rewritten-sanitized': 'sanitized', 'not-observed': 'notObserved', 'not-testable': 'notTestable' };
  for (const r of rows) {
    // A runner crash is our failure, never the model's: its own bucket, kept out of notTestable.
    const b = r.outcome === 'not-testable' && r.reason === 'runner-error' ? 'runnerError' : BUCKET[r.outcome];
    if (!b) throw new Error(`runs.csv: unknown outcome "${r.outcome}"`);
    const c = (cells[key(r)] ??= { model: r.model, lang: r.lang, condition: r.condition, pass: 0, fail: 0, sanitized: 0, notObserved: 0, notTestable: 0, runnerError: 0, rewritten: 0, byClass: {} });
    const p = (pooled[r.condition] ??= { pass: 0, fail: 0, sanitized: 0, notObserved: 0, notTestable: 0, runnerError: 0 });
    c[b] += 1; p[b] += 1;
    if (b === 'notTestable' || b === 'runnerError' || b === 'notObserved') continue;
    if (r.rewritten === 'true') c.rewritten += 1;
    if (r.class) { const k = (c.byClass[r.class] ??= { total: 0, pass: 0 }); k.total += 1; if (b === 'pass') k.pass += 1; }
  }
  for (const p of Object.values(pooled)) p.passRate = p.pass + p.fail ? p.pass / (p.pass + p.fail) : null;
  return { rows: rows.length, pages, cells: Object.values(cells), pooled };
}

/** A `--rescore` pass writes rescore.json (its id, the CSV's sha256) and stamps every .json with the id.
 *  Both must agree before the CSV is read as a whole: a CSV appended to by a later run, or a pass interrupted
 *  while stamping, describes two passes at once. No rescore.json (a run never rescored): nothing to check. */
export function checkRescore(resultsDir) {
  const file = join(resultsDir, 'rescore.json');
  if (!existsSync(file)) return null;
  const pass = JSON.parse(readFileSync(file, 'utf8'));
  const problems = [];
  const csvSha = createHash('sha256').update(readFileSync(join(resultsDir, 'runs.csv'))).digest('hex');
  if (csvSha !== pass.csv_sha256) problems.push('runs.csv is not the file rescore.json describes (changed or appended to since the last --rescore)');
  const root = join(resultsDir, 'generations');
  for (const rel of readdirSync(root, { recursive: true }).filter(f => /(^|\/)\d+\.json$/.test(f)).sort()) {
    const id = JSON.parse(readFileSync(join(root, rel), 'utf8')).rescore_id ?? null;
    if (id !== pass.rescore_id) problems.push(`${rel}: rescore_id ${id ?? 'none'} is not the pass ${pass.rescore_id}`);
  }
  if (problems.length) throw new Error(`bench incomplet: ${problems.join('; ')} — run node bench/run-bench.mjs --rescore`);
  return pass;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const resultsDir = process.env.RESULTS_DIR || fileURLToPath(new URL('results/', import.meta.url));
  let a;
  try {
    const cfg = JSON.parse(readFileSync(new URL('models.json', import.meta.url), 'utf8'));
    const expectPages = cfg.models.length * cfg.languages.length * cfg.conditions.length * cfg.repeats;
    checkRescore(resultsDir);
    a = aggregate(readFileSync(join(resultsDir, 'runs.csv'), 'utf8'), { expectPages });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const crashed = Object.values(a.pooled).reduce((n, p) => n + p.runnerError, 0);
  // A runner error is ours to fix before anything is published: the command fails, and the warning is also
  // the first thing in stdout, so that `node bench/aggregate.mjs > tables.md` cannot keep tables that say nothing.
  if (crashed) {
    const warning = `WARNING: ${crashed} row(s) are runner errors — fix the runner and rerun with --rescore before publishing.`;
    console.error(warning);
    console.log(`> ${warning}\n`);
    process.exitCode = 1;
  }
  console.log('| model | lang | condition | pass | fail | sanitized | not-observed | not-testable | rewritten |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const c of a.cells) console.log(`| ${c.model} | ${c.lang} | ${c.condition} | ${c.pass} | ${c.fail} | ${c.sanitized} | ${c.notObserved} | ${c.notTestable} | ${c.rewritten} |`);
  console.log('\n| condition | pass | fail | sanitized | not-observed | not-testable | pass rate |\n|---|---|---|---|---|---|---|');
  for (const [k, p] of Object.entries(a.pooled)) console.log(`| ${k} | ${p.pass} | ${p.fail} | ${p.sanitized} | ${p.notObserved} | ${p.notTestable} | ${p.passRate === null ? '—' : (100 * p.passRate).toFixed(1) + ' %'} |`);
}
