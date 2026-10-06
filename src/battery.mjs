import { readFileSync } from 'node:fs';
import { domainToASCII } from 'node:url';

const BATTERY_URL = new URL('../battery/cases.json', import.meta.url);

export function loadBattery() {
  return JSON.parse(readFileSync(BATTERY_URL, 'utf8'));
}

// Mirrors battery/schema.json. Ajv is a dev dependency, and the command line must not need it to refuse a file.
const KINDS = ['email', 'domain', 'url'];
export const CLASSES = ['control', 'ascii-tld-short', 'ascii-tld-long', 'idn-tld-alabel', 'idn-sld-alabel', 'idn-ulabel', 'eai-local', 'email-idn-domain', 'eai-full', 'boundary', 'guard'];
const CASE_FIELDS = ['id', 'kind', 'class', 'value', 'expect', 'note', 'ref'];
const ID = /^(email|domain|url)-[a-z0-9-]+-\d{2}$/;

/** What keeps a battery file from being used, one sentence per problem. Empty when it follows battery/schema.json. */
export function batteryProblems(b) {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) return ['the file is not a JSON object'];
  const out = [];
  if (typeof b.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(b.version)) out.push('version: expected x.y.z');
  if (typeof b.generated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.generated)) out.push('generated: expected YYYY-MM-DD');
  if (b.license !== 'CC0-1.0') out.push('license: expected CC0-1.0');
  if (typeof b.method !== 'string') out.push('method: expected a string');
  if (!Array.isArray(b.cases) || b.cases.length === 0) return [...out, 'cases: expected a non-empty array'];
  const seen = new Set();
  b.cases.forEach((c, i) => {
    const at = `cases[${i}]`;
    if (c === null || typeof c !== 'object' || Array.isArray(c)) { out.push(`${at}: not an object`); return; }
    for (const f of CASE_FIELDS) if (typeof c[f] !== 'string') out.push(`${at}.${f}: expected a string`);
    for (const f of Object.keys(c)) if (!CASE_FIELDS.includes(f)) out.push(`${at}.${f}: unknown field`);
    if (typeof c.id === 'string' && !ID.test(c.id)) out.push(`${at}.id: ${c.id} does not match ${ID.source}`);
    if (!KINDS.includes(c.kind)) out.push(`${at}.kind: expected one of ${KINDS.join(', ')}`);
    if (!CLASSES.includes(c.class)) out.push(`${at}.class: unknown class`);
    if (typeof c.value === 'string' && c.value.length === 0) out.push(`${at}.value: empty`);
    if (c.expect !== 'accept' && c.expect !== 'reject') out.push(`${at}.expect: expected accept or reject`);
    // Two cases under one id cannot be told apart in a report.
    if (typeof c.id === 'string') { if (seen.has(c.id)) out.push(`${at}.id: ${c.id} appears twice`); seen.add(c.id); }
  });
  return out;
}

/** Reads a battery or a pack named by the user. Throws rather than hand over values from a file that does not follow the schema. */
export function loadBatteryFile(path) {
  let parsed;
  try { parsed = JSON.parse(readFileSync(path, 'utf8')); }
  catch (err) { throw new Error(`cannot read battery file ${path}: ${err.message}`, { cause: err }); }
  const problems = batteryProblems(parsed);
  if (problems.length) throw new Error(`battery file ${path} does not follow battery/schema.json:\n  ${problems.slice(0, 10).join('\n  ')}${problems.length > 10 ? `\n  … and ${problems.length - 10} more` : ''}`);
  return parsed;
}

/** Domain part of a value, as typed (not converted). null when there is none. */
export function domainOf(value, kind) {
  if (kind === 'domain') return value;
  if (kind === 'email') {
    const at = value.lastIndexOf('@');
    return at > 0 && at < value.length - 1 ? value.slice(at + 1) : null;
  }
  if (kind === 'url') {
    try { return new URL(value).hostname || null; } catch { return null; }
  }
  return null;
}

/** TLD in lowercase A-label form, or null when the domain does not convert. */
export function tldOf(value, kind) {
  const domain = domainOf(value, kind);
  if (!domain) return null;
  const ascii = domainToASCII(domain);
  if (!ascii) return null;
  const labels = ascii.split('.');
  return labels.length >= 2 ? labels.at(-1).toLowerCase() : null;
}
