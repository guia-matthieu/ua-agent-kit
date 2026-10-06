import { parseArgs } from 'node:util';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkForm } from './form-runner.mjs';
import { loadBattery, loadBatteryFile } from './battery.mjs';
import { renderMarkdown } from './report.mjs';

export async function run(argv) {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: {
    engine: { type: 'string', default: 'chromium' }, lang: { type: 'string', default: 'en' },
    json: { type: 'boolean', default: false }, out: { type: 'string' }, battery: { type: 'string' } } });
  const target = positionals[0];
  const usage = 'usage: ua-kit check <file.html|https://...> [--engine chromium|firefox|webkit] [--lang en|fr|es] [--battery file.json] [--json] [--out dir]';
  if (!target) { console.error(usage); process.exit(1); }
  if (!['chromium', 'firefox', 'webkit'].includes(values.engine)) { console.error(`unknown engine: ${values.engine}\n${usage}`); process.exit(1); }
  if (!['en', 'fr', 'es'].includes(values.lang)) { console.error(`unknown lang: ${values.lang}\n${usage}`); process.exit(1); }
  let battery;
  try { battery = values.battery ? loadBatteryFile(values.battery) : loadBattery(); }
  catch (err) { console.error(err.message); process.exit(1); }
  const report = await checkForm(target, { engine: values.engine, lang: values.lang, battery });
  // A version alone does not say which file was played: a pack and the standard battery are scored apart.
  if (values.battery) report.batteryFile = values.battery;
  const md = renderMarkdown(report);
  if (values.out) {
    mkdirSync(values.out, { recursive: true });
    writeFileSync(join(values.out, 'report.json'), JSON.stringify(report, null, 2));
    writeFileSync(join(values.out, 'report.md'), md);
  }
  console.log(values.json ? JSON.stringify(report, null, 2) : md);
}
