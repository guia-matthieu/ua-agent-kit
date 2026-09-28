#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { generate } from './openrouter.mjs';
import { checkForm } from '../src/form-runner.mjs';
import { loadBattery } from '../src/battery.mjs';

const ROOT = new URL('../', import.meta.url);
const DEFAULT_RESULTS = fileURLToPath(new URL('results/', import.meta.url));
export const sha256 = data => createHash('sha256').update(data).digest('hex');
// `typed`: the value actually typed — the battery value, or `https://` + value for a bare domain in a url field (D1).
export const COLUMNS = ['model', 'model_version', 'lang', 'condition', 'repeat', 'field', 'case_id', 'class', 'expect', 'typed', 'verdict', 'rewritten', 'outcome', 'reason'];
const HEADER = COLUMNS.join(',');

export function extractHtml(text) {
  const fence = text.match(/```(?:html)?[^\S\n]*\n([\s\S]*?)\n```/i);
  return (fence ? fence[1] : text).trim();
}

export function toRows(meta, report) {
  const rows = [];
  for (const field of ['email', 'website']) {
    const f = report.fields[field];
    if (f.status !== 'tested') { rows.push({ ...meta, field, case_id: '', class: '', expect: '', typed: '', verdict: 'not-testable', rewritten: '', outcome: 'not-testable', reason: f.reason ?? '' }); continue; }
    for (const r of f.results) rows.push({ ...meta, field, case_id: r.id, class: r.class, expect: r.expect, typed: r.typed ?? '', verdict: r.verdict, rewritten: String(r.rewritten), outcome: r.outcome, reason: r.reason ?? '' });
  }
  return rows;
}

/** RFC 4180: quote a value holding a comma, a quote or a line break, and double its quotes. */
const csvCell = v => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const csvLine = r => COLUMNS.map(c => csvCell(r[c])).join(',');

const notTestable = reason => ({ email: { status: 'not-testable', reason }, website: { status: 'not-testable', reason } });

/** Scores one saved page. A runner crash never costs a paid generation again: it is recorded as
 *  not-testable: runner-error, and `--rescore` scores every saved page again once the runner is fixed. */
async function score(file, html, lang, battery, finishReason = null) {
  // A reply cut at max_tokens with no form is a budget artefact, not a model that wrote no form.
  if (!/<form[\s>]/i.test(html)) return { fields: notTestable(finishReason === 'length' ? 'truncated' : 'no-form') };
  try { return await checkForm(file, { lang, battery }); }
  catch (e) { return { fields: notTestable('runner-error'), error: String(e.message).split('\n')[0] }; }
}

/** Rebuilds runs.csv from every saved page, with the current runner and battery. No API call.
 *  All or nothing. Rows are built in memory; a page whose metadata or HTML cannot be read goes to `skipped`
 *  and then nothing is written: the previous runs.csv and .json files stay byte for byte (review of #21,
 *  reproduced: a missing .html left runs.csv cut at 3 635 of 4 267 rows, no warning). On success the CSV
 *  goes to a temporary file renamed into place, then rescore.json and every .json receive the same pass id
 *  (`rescore_id`) and rescore.json records the CSV's sha256: a pass interrupted after the rename leaves
 *  files that aggregate.mjs refuses (ids differ) instead of a CSV that reads clean. */
export async function rescore({ resultsDir = DEFAULT_RESULTS, log = console } = {}) {
  const battery = loadBattery();
  const root = join(resultsDir, 'generations');
  const csvPath = join(resultsDir, 'runs.csv');
  const metas = readdirSync(root, { recursive: true }).filter(f => /(^|\/)\d+\.json$/.test(f)).sort();
  const rescoreId = new Date().toISOString();
  const lines = [HEADER];
  const updates = [];
  const skipped = [];
  const firstLine = e => String(e.message).split('\n')[0];
  for (const rel of metas) {
    const metaFile = join(root, rel);
    try {
      const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
      const file = metaFile.replace(/\.json$/, '.html');
      const html = readFileSync(file, 'utf8');
      const report = await score(file, html, meta.lang, battery, meta.finish_reason ?? null);
      const row = { model: meta.model, model_version: meta.model_version, lang: meta.lang, condition: meta.condition, repeat: meta.repeat };
      for (const r of toRows(row, report)) lines.push(csvLine(r));
      const json = { ...meta, battery: battery.version, runner_error: report.error ?? null, rescore_id: rescoreId, fields: report.fields };
      delete json.rescored;   // the per-page timestamp of earlier passes; the pass id replaces it
      updates.push({ metaFile, json });
      log.log(`rescored ${rel}${report.error ? ' (runner-error: ' + report.error + ')' : ''}`);
    } catch (e) {
      skipped.push({ page: rel, reason: firstLine(e) });
      log.error(`SKIPPED ${rel}: ${firstLine(e)}`);
    }
  }
  if (skipped.length) {
    log.error(`${skipped.length} page(s) could not be rescored; nothing was written. Fix them and run --rescore again:\n${skipped.map(s => `  ${s.page}: ${s.reason}`).join('\n')}`);
    return { rescoreId, rescored: updates.length, skipped, written: false };
  }
  const csv = lines.join('\n') + '\n';
  writeFileSync(csvPath + '.tmp', csv);
  renameSync(csvPath + '.tmp', csvPath);
  writeFileSync(join(resultsDir, 'rescore.json'), JSON.stringify({ rescore_id: rescoreId, battery: battery.version, pages: updates.length, csv_sha256: sha256(csv) }, null, 2) + '\n');
  for (const u of updates) writeFileSync(u.metaFile, JSON.stringify(u.json, null, 2));
  return { rescoreId, rescored: updates.length, skipped, written: true };
}

async function main() {
  if (process.argv.includes('--rescore')) {
    // RESULTS_DIR: another results tree (the tests rescore a copy of a few cells); default bench/results/.
    const r = await rescore({ resultsDir: process.env.RESULTS_DIR || DEFAULT_RESULTS });
    if (!r.written) process.exitCode = 1;
    return;
  }
  const cfg = JSON.parse(readFileSync(new URL('models.json', import.meta.url), 'utf8'));
  const guide = readFileSync(new URL('GUIDE.md', ROOT), 'utf8');
  const battery = loadBattery();
  const csvPath = fileURLToPath(new URL('results/runs.csv', import.meta.url));
  mkdirSync(fileURLToPath(new URL('results/generations/', import.meta.url)), { recursive: true });
  if (!existsSync(csvPath)) writeFileSync(csvPath, HEADER + '\n');

  let failed = 0;
  for (const m of cfg.models) if (!/^[a-z0-9][a-z0-9-]*$/.test(m.key)) throw new Error(`models.json: key "${m.key}" must match [a-z0-9-]`);
  for (const m of cfg.models) for (const lang of cfg.languages) for (const condition of cfg.conditions) for (let repeat = 1; repeat <= cfg.repeats; repeat++) {
    const dir = new URL(`results/generations/${m.key}/${lang}/${condition}/`, import.meta.url);
    mkdirSync(fileURLToPath(dir), { recursive: true });
    const file = fileURLToPath(new URL(`${repeat}.html`, dir));
    const metaFile = fileURLToPath(new URL(`${repeat}.json`, dir));
    if (existsSync(metaFile)) { console.log(`skip ${m.key}/${lang}/${condition}/${repeat}`); continue; }
    // One failed cell (API error, browser launch) is logged and retried on the next run; it never stops the batch.
    try {
      const user = readFileSync(new URL(`prompts/${lang}.txt`, import.meta.url), 'utf8').trim();
      const g = await generate({ slug: m.slug, provider: m.provider, system: condition === 'guide' ? guide : null, user, maxTokens: m.max_tokens ?? cfg.max_tokens, temperature: cfg.temperature });
      if (g.finishReason === 'length') console.error(`TRUNCATED ${m.key}/${lang}/${condition}/${repeat}: reply hit max_tokens`);
      const html = extractHtml(g.text);
      writeFileSync(file, html);
      const meta = { model: m.key, model_version: g.modelVersion, lang, condition, repeat };
      const report = await score(file, html, lang, battery, g.finishReason);
      // CSV rows first, in one write; the .json marker last, so a crash never leaves a cell marked done without its rows.
      appendFileSync(csvPath, toRows(meta, report).map(r => csvLine(r) + '\n').join(''));
      writeFileSync(metaFile, JSON.stringify({ ...meta, usage: g.usage, finish_reason: g.finishReason, date: new Date().toISOString(), battery: battery.version, runner_error: report.error ?? null, fields: report.fields }, null, 2));
      console.log(`done ${m.key}/${lang}/${condition}/${repeat}`);
    } catch (e) {
      failed += 1;
      console.error(`FAILED ${m.key}/${lang}/${condition}/${repeat}: ${e.message}`);
    }
  }
  if (failed) { console.error(`${failed} cell(s) failed; rerun to retry them.`); process.exitCode = 1; }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(e => { console.error(e); process.exit(1); });
