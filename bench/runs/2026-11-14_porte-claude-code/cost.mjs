#!/usr/bin/env node
// cost.csv: the API price of the tokens each cell used, from the counters Claude Code returned. No API call.
// Prices: Claude Fable 5.2, $ per million tokens, read on platform.claude.com/docs/en/about-claude/pricing on 2026-11-14.
// The task's own input is taken from the v0.2 bench: `prompt_tokens` of Opus 5.5 for the same language and condition
// (same prompt, same GUIDE.md, Anthropic tokenizer). Fable 5.2's tokenizer may count it differently; the rest of the
// input is what Claude Code adds (its system prompt, tool definitions, environment), replayed on every turn.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PRICE = { input: 8, write5m: 10, write1h: 16, read: 0.20, output: 40 };
const here = new URL('./', import.meta.url).pathname;
const KIT = new URL('../../../', import.meta.url).pathname;
const gen = join(here, 'generations', 'fable-5-2-cc');
const opus = join(KIT, 'bench/results/generations/anthropic');

const cols = ['lang', 'condition', 'repeat', 'num_turns', 'input', 'cache_write_5m', 'cache_write_1h', 'cache_read', 'output', 'thinking',
  'task_input', 'harness_input', 'cost_usd', 'harness_cost_usd', 'cc_total_cost_usd', 'gap_pct', 'opus_api_cost_usd'];
const lines = [cols.join(',')];
for (const rel of readdirSync(gen, { recursive: true }).filter(f => /\/\d+\.json$/.test(f)).sort()) {
  const m = JSON.parse(readFileSync(join(gen, rel), 'utf8'));
  const u = m.usage, cc = u.cache_creation;
  if (!cc) throw new Error(`${rel}: no usage.cache_creation, the 5 min / 1 h split is unknown`);
  const t = { input: u.input_tokens, w5: cc.ephemeral_5m_input_tokens, w1: cc.ephemeral_1h_input_tokens, read: u.cache_read_input_tokens, out: u.output_tokens };
  const cost = (t.input * PRICE.input + t.w5 * PRICE.write5m + t.w1 * PRICE.write1h + t.read * PRICE.read + t.out * PRICE.output) / 1e6;
  const o = JSON.parse(readFileSync(join(opus, m.lang, m.condition, `${m.repeat}.json`), 'utf8'));
  const inputAll = t.input + t.w5 + t.w1 + t.read;
  // The task's prompt is sent once per turn too; what remains of the input is the harness.
  const task = o.usage.prompt_tokens * m.num_turns;
  const harness = inputAll - task;
  const inputCost = (t.input * PRICE.input + t.w5 * PRICE.write5m + t.w1 * PRICE.write1h + t.read * PRICE.read) / 1e6;
  const harnessCost = inputCost * harness / inputAll;   // at the cell's own mix of fresh, written and read input
  const gap = (cost - m.total_cost_usd) / m.total_cost_usd * 100;
  lines.push([m.lang, m.condition, m.repeat, m.num_turns, t.input, t.w5, t.w1, t.read, t.out, u.output_tokens_details?.thinking_tokens ?? '',
    task, harness, cost.toFixed(6), harnessCost.toFixed(6), m.total_cost_usd.toFixed(6), gap.toFixed(3), o.usage.cost.toFixed(6)].join(','));
}
writeFileSync(join(here, 'cost.csv'), lines.join('\n') + '\n');
console.log(`${lines.length - 1} cells written to cost.csv`);
