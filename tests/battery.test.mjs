import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { domainToASCII, domainToUnicode } from 'node:url';
// Ajv's default build is draft-07 and refuses a 2020-12 $schema; the 2020 build is a separate import.
import Ajv from 'ajv/dist/2020.js';
import { loadBattery, domainOf, tldOf } from '../src/battery.mjs';

const battery = loadBattery();
const schema = JSON.parse(readFileSync(new URL('../battery/schema.json', import.meta.url), 'utf8'));
const iana = new Set(readFileSync(new URL('../battery/iana-tlds.txt', import.meta.url), 'utf8')
  .split('\n').map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith('#')));

test('battery validates against its schema', () => {
  const ajv = new Ajv({ allErrors: true });
  const ok = ajv.validate(schema, battery);
  assert.ok(ok, JSON.stringify(ajv.errors, null, 2));
});

test('ids and values are unique', () => {
  const ids = battery.cases.map(c => c.id), values = battery.cases.map(c => c.value);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(values).size, values.length);
});

test('every accept case uses a TLD delegated in the pinned IANA list', () => {
  for (const c of battery.cases.filter(c => c.expect === 'accept')) {
    const tld = tldOf(c.value, c.kind);
    assert.ok(tld, `${c.id}: no TLD`);
    assert.ok(iana.has(tld), `${c.id}: ${tld} not in IANA list`);
  }
});

test('every non-ASCII domain round-trips U-label ↔ A-label', () => {
  for (const c of battery.cases.filter(c => c.expect === 'accept')) {
    const domain = domainOf(c.value, c.kind);
    // The ASCII range deliberately includes the control characters, so the check starts at \x00.
    // eslint-disable-next-line no-control-regex
    if (!domain || /^[\x00-\x7f]*$/.test(domain)) continue;
    const ascii = domainToASCII(domain);
    assert.ok(ascii.startsWith('xn--') || ascii.includes('.xn--'), `${c.id}: ${domain} → ${ascii}`);
    assert.equal(domainToUnicode(ascii), domain.normalize('NFC').toLowerCase(), `${c.id}: round trip`);
  }
});

test('boundary cases have the exact lengths their ids claim', () => {
  const byId = Object.fromEntries(battery.cases.map(c => [c.id, c.value]));
  assert.equal(byId['email-boundary-local64-01'].split('@')[0].length, 64);
  assert.equal(byId['domain-boundary-label63-01'].split('.')[0].length, 63);
  assert.equal(byId['domain-boundary-label64-01'].split('.')[0].length, 64);
  assert.equal(byId['domain-boundary-total253-01'].length, 253);
});

test('each accept class has at least three cases and there are at least ten guards', () => {
  const count = {};
  for (const c of battery.cases) count[c.class] = (count[c.class] ?? 0) + 1;
  for (const cls of ['control', 'ascii-tld-short', 'ascii-tld-long', 'idn-ulabel', 'eai-local', 'eai-full']) {
    assert.ok(count[cls] >= 3, `${cls}: ${count[cls]}`);
  }
  assert.ok(count.guard >= 10, `guards: ${count.guard}`);
});
