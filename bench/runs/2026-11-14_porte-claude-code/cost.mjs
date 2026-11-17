#!/usr/bin/env node
// cost.csv: the API price of the tokens each cell used, from the counters Claude Code returned. No API call.
// Prices: Claude Fable 5.2, $ per million tokens, read on platform.claude.com/docs/en/about-claude/pricing on 2026-11-14.
//
// Splitting the input between the task and Claude Code (the harness):
// - the task's prompt: `prompt_tokens` of Opus 5.5 at the v0.2 bench, no-guide, same language (Anthropic tokenizer;
//   Fable 5.2's may count a little differently);
// - GUIDE.md as CLAUDE.md, in `guide`: measured here, mean total input of the guide cells minus that of the no-guide
//   cells of the same language. It holds the few lines Claude Code wraps around a CLAUDE.md;
// - the rest is the harness: Claude Code's system prompt, tool definitions, environment.
// The harness comes first in the request and is what the cache returns; the task comes last and is what gets written.
// So the task is priced at the write price (at the read price for any part beyond what was written), the harness at
// the rest. A share at the cell's mean input price would charge GUIDE.md's 1 h writes to the harness (review of 2026-11-14).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PRICE = { input: 8, write5m: 10, write1h: 16, read: 0.20, output: 40 };
const here = new URL('./', import.meta.url).pathname;
const KIT = new URL('../../../', import.meta.url).pathname;
const gen = join(here, 'generations', 'fable-5-2-cc');
const opus = join(KIT, 'bench/results/generations/anthropic');

const metas = readdirSync(gen, { recursive: true }).filter(f => /\/\d+\.json$/.test(f)).sort()
  .map(rel => JSON.parse(readFileSync(join(gen, rel), 'utf8')));
const inputAll = u => u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens;
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const guideTokens = {};
for (const lang of new Set(metas.map(m => m.lang))) {
  const of = c => metas.filter(m => m.lang === lang && m.condition === c).map(m => inputAll(m.usage));
  guideTokens[lang] = Math.round(mean(of('guide')) - mean(of('no-guide')));
}

const cols = ['lang', 'condition', 'repeat', 'num_turns', 'input', 'cache_write_5m', 'cache_write_1h', 'cache_read', 'output', 'thinking',
  'task_input', 'harness_input', 'cost_usd', 'output_cost_usd', 'thinking_cost_usd', 'task_input_cost_usd', 'harness_cost_usd',
  'cc_total_cost_usd', 'gap_pct', 'opus_api_cost_usd'];
const lines = [cols.join(',')];
for (const m of metas) {
  const u = m.usage, cc = u.cache_creation;
  if (!cc) throw new Error(`${m.lang}/${m.condition}/${m.repeat}: no usage.cache_creation, the 5 min / 1 h split is unknown`);
  const t = { input: u.input_tokens, w5: cc.ephemeral_5m_input_tokens, w1: cc.ephemeral_1h_input_tokens, read: u.cache_read_input_tokens, out: u.output_tokens };
  const thinking = u.output_tokens_details?.thinking_tokens ?? 0;
  const inputCost = (t.input * PRICE.input + t.w5 * PRICE.write5m + t.w1 * PRICE.write1h + t.read * PRICE.read) / 1e6;
  const cost = inputCost + t.out * PRICE.output / 1e6;
  const o = JSON.parse(readFileSync(join(opus, m.lang, 'no-guide', `${m.repeat}.json`), 'utf8'));
  // One turn per cell here (num_turns 1 in all 18); with more, the task would be sent once per turn.
  const task = (o.usage.prompt_tokens + (m.condition === 'guide' ? guideTokens[m.lang] : 0)) * m.num_turns;
  const harness = inputAll(u) - task;
  // The task takes the newest input first: fresh, then 1 h writes, then 5 min writes, then reads.
  let left = task, taskCost = 0;
  for (const [n, p] of [[t.input, PRICE.input], [t.w1, PRICE.write1h], [t.w5, PRICE.write5m], [t.read, PRICE.read]]) {
    const k = Math.min(left, n); taskCost += k * p / 1e6; left -= k;
  }
  const gap = (cost - m.total_cost_usd) / m.total_cost_usd * 100;
  lines.push([m.lang, m.condition, m.repeat, m.num_turns, t.input, t.w5, t.w1, t.read, t.out, thinking, task, harness,
    cost.toFixed(6), (t.out * PRICE.output / 1e6).toFixed(6), (thinking * PRICE.output / 1e6).toFixed(6), taskCost.toFixed(6),
    (inputCost - taskCost).toFixed(6), m.total_cost_usd.toFixed(6), gap.toFixed(3), JSON.parse(readFileSync(join(opus, m.lang, m.condition, `${m.repeat}.json`), 'utf8')).usage.cost.toFixed(6)].join(','));
}
writeFileSync(join(here, 'cost.csv'), lines.join('\n') + '\n');
console.log(`${lines.length - 1} cells written to cost.csv; GUIDE.md as CLAUDE.md, tokens: ${JSON.stringify(guideTokens)}`);
