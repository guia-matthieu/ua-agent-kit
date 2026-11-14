#!/usr/bin/env node
// The page written by Fable 5.2 acting as a Claude Code agent (`claude -p`), instead of a raw API call.
// Same prompts, same GUIDE.md, same battery, same runner as the v0.2 bench. This script only generates:
// scoring is `RESULTS_DIR=<this folder> node bench/run-bench.mjs --rescore`.
// Usage: node run.mjs [lang/condition/repeat ...]   (no argument: the 18 cells; a cell whose .json exists is skipped)
// Env: CLAUDE_BIN (default claude-bzh, the account whose plan pays), KEEP_RAW=1 keeps raw.json next to the page.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const KIT = new URL('../../../', import.meta.url).pathname;
const { extractHtml } = await import(KIT + 'bench/run-bench.mjs');
const here = new URL('./', import.meta.url).pathname;
const MODEL = 'claude-fable-5-2', KEY = 'fable-5-2-cc', EFFORT = 'high';
const BIN = process.env.CLAUDE_BIN || 'claude-bzh';
const LANGS = ['fr', 'en', 'es'], CONDITIONS = ['no-guide', 'guide'], REPEATS = 3;
const kitCommit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: KIT }).toString().trim();

const all = LANGS.flatMap(lang => CONDITIONS.flatMap(condition => [1, 2, 3].slice(0, REPEATS).map(repeat => ({ lang, condition, repeat }))));
const wanted = process.argv.slice(2);
const cells = wanted.length ? all.filter(c => wanted.includes(`${c.lang}/${c.condition}/${c.repeat}`)) : all;

function runCell({ lang, condition, repeat }) {
  const name = `${lang}/${condition}/${repeat}`;
  const dir = join(here, 'generations', KEY, lang, condition);
  const metaFile = join(dir, `${repeat}.json`), htmlFile = join(dir, `${repeat}.html`);
  if (existsSync(metaFile)) { console.log(`skip ${name}`); return; }
  mkdirSync(dir, { recursive: true });
  // A fresh empty folder outside any repository: nothing but what the condition puts there.
  const cell = mkdtempSync(join(tmpdir(), 'ua-cc-'));
  // `guide`: GUIDE.md as the project CLAUDE.md, the way an agent meets the kit.
  if (condition === 'guide') copyFileSync(join(KIT, 'GUIDE.md'), join(cell, 'CLAUDE.md'));
  const prompt = readFileSync(join(KIT, `bench/prompts/${lang}.txt`), 'utf8').trim();
  const args = ['-p', prompt, '--model', MODEL, '--effort', EFFORT,
    '--setting-sources', 'project', '--strict-mcp-config', '--no-session-persistence',
    '--allowedTools', 'Write,Edit,Read', '--disallowedTools', 'Bash,WebFetch,WebSearch',
    '--output-format', 'json'];
  const started = new Date().toISOString();
  // Auto-memory off: without it the system prompt names a memory folder of the account (pilot, isolation check).
  const p = spawnSync(BIN, args, { cwd: cell, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 30 * 60e3,
    env: { ...process.env, CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' } });
  try {
    if (p.status !== 0) throw new Error(`exit ${p.status ?? p.signal}: ${(p.stderr || p.stdout || '').slice(0, 300)}`);
    const raw = JSON.parse(p.stdout);
    if (process.env.KEEP_RAW) writeFileSync(join(dir, `${repeat}.raw.json`), p.stdout);
    if (raw.is_error) throw new Error(`is_error (${raw.subtype}): ${String(raw.result).slice(0, 300)}`);
    // The page: the reply first; a .html the agent wrote in its folder when the reply holds no form.
    let html = extractHtml(raw.result ?? ''), source = 'result';
    const written = readdirSync(cell).filter(f => f.endsWith('.html'));
    if (!/<form[\s>]/i.test(html) && written.length) { html = readFileSync(join(cell, written[0]), 'utf8'); source = 'file'; }
    writeFileSync(htmlFile, html);
    const served = Object.keys(raw.modelUsage ?? {});
    writeFileSync(metaFile, JSON.stringify({
      model: KEY, model_version: served.join(',') || null, lang, condition, repeat,
      finish_reason: raw.stop_reason ?? raw.subtype ?? null, date: started,
      gate: 'claude-code', claude_code_version: execFileSync(BIN, ['--version']).toString().trim(),
      effort: EFFORT, page_source: source, files_written: written, kit_commit: kitCommit,
      num_turns: raw.num_turns, duration_ms: raw.duration_ms, duration_api_ms: raw.duration_api_ms,
      total_cost_usd: raw.total_cost_usd, usage: raw.usage, modelUsage: raw.modelUsage,
    }, null, 2) + '\n');
    console.log(`done ${name} (${source}, ${raw.num_turns} turns, ${served.join(',')})`);
  } catch (e) {
    console.error(`FAILED ${name}: ${String(e.message).split('\n')[0]}`);
  } finally {
    rmSync(cell, { recursive: true, force: true });
  }
}

for (const c of cells) runCell(c);
console.log('end of batch');
