#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { loadBattery } from '../src/battery.mjs';
import { score, regexValidator, KINDS } from '../runners/js/score.mjs';

const [command, ...rest] = process.argv.slice(2);

function usage(code = 1) {
  console.error(`usage:
  ua-kit score --kind email|domain|url --regex '<javascript regex>' [--flags i] [--json]
  ua-kit check <file.html|https://...> [--engine chromium|firefox|webkit] [--lang en|fr|es] [--json] [--out dir]
  ua-kit build-adapters [--check]`);
  process.exit(code);
}

if (command === 'score') {
  const { values } = parseArgs({ args: rest, options: { kind: { type: 'string' }, regex: { type: 'string' }, flags: { type: 'string', default: '' }, json: { type: 'boolean', default: false } } });
  if (!values.kind || !values.regex || !KINDS.includes(values.kind)) usage();
  let validate;
  try { validate = regexValidator(values.regex, values.flags); }
  catch (err) { console.error(`invalid --regex: ${err.message}`); process.exit(1); }
  const r = score(validate, loadBattery(), { kind: values.kind });
  if (values.json) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`verdict: ${r.verdict}  (battery ${r.battery}, ${r.total} ${r.kind} cases)`);
    for (const [cls, v] of Object.entries(r.byClass)) console.log(`  ${cls.padEnd(18)} ${v.ok}/${v.total}`);
    if (r.failures.length) console.log(`  failing: ${r.failures.join(', ')}`);
  }
} else if (command === 'check') {
  const mod = await import('../src/check-command.mjs').catch(() => null);
  if (!mod) { console.error('check is not available yet (Task 6)'); process.exit(2); }
  await mod.run(rest);
} else if (command === 'build-adapters') {
  const mod = await import('../scripts/build-adapters.mjs').catch(() => null);
  if (!mod) { console.error('build-adapters is not available yet (Task 8)'); process.exit(2); }
  const check = rest.includes('--check');
  const { changed } = mod.buildAdapters({ check });
  if (check && changed.length) { console.error(`adapters out of date: ${changed.join(', ')}`); process.exit(1); }
  console.log(check ? 'adapters up to date' : `built adapters${changed.length ? ': ' + changed.join(', ') : ' (no change)'}`);
} else {
  usage();
}
