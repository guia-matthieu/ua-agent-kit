import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { domainToASCII, domainToUnicode } from 'node:url';
import Ajv from 'ajv/dist/2020.js';
import { loadBattery, domainOf, tldOf } from '../src/battery.mjs';

const read = rel => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'));
const ROOT = new URL('../battery/packs/tld/', import.meta.url);
// One file per TLD, filed by kind of TLD: tld/<group>/<tld>.json.
const files = readdirSync(ROOT, { recursive: true }).filter(f => f.endsWith('.json')).map(f => f.split('\\').join('/')).sort();
const packs = files.map(f => { const pack = read('../battery/packs/tld/' + f); return { file: f, group: f.split('/')[0], tld: f.split('/')[1].replace(/\.json$/, ''), pack, cases: pack.cases }; });
const all = packs.flatMap(p => p.cases);
const schema = read('../battery/schema.json');
const battery = loadBattery();
const iana = new Set(readFileSync(new URL('../battery/iana-tlds.txt', import.meta.url), 'utf8')
  .split('\n').map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith('#')));
const accepts = all.filter(c => c.expect === 'accept');
// eslint-disable-next-line no-control-regex
const isAscii = s => /^[\x00-\x7f]*$/.test(s);

test('every pack validates against the battery schema', () => {
  const ajv = new Ajv({ allErrors: true });
  assert.ok(packs.length >= 6, `packs: ${packs.length}`);
  for (const { file, pack } of packs) assert.ok(ajv.validate(schema, pack), `${file}: ${JSON.stringify(ajv.errors, null, 2)}`);
});

test('a pack only holds cases on its own TLD, and its ids say where it is filed', () => {
  for (const p of packs) {
    for (const c of p.cases) {
      assert.match(c.id, new RegExp(`^${c.kind}-${p.group}-${p.tld}-`), `${p.file}: ${c.id}`);
      // Guards are malformed on purpose, so the TLD is read from the text rather than parsed.
      assert.ok(c.value.endsWith('.' + p.tld) || c.value.includes(`.${p.tld}/`), `${p.file}: ${c.value}`);
    }
  }
});

test('packs are filed by kind of TLD: two-letter TLDs under cctld, the others under geotld', () => {
  for (const p of packs) assert.equal(p.group, p.tld.length === 2 ? 'cctld' : 'geotld', p.file);
});

test('ids and values are unique across packs, and none repeats the standard battery', () => {
  const ids = all.map(c => c.id), values = all.map(c => c.value);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(values).size, values.length);
  const stdIds = new Set(battery.cases.map(c => c.id)), stdValues = new Set(battery.cases.map(c => c.value));
  // A shared id would make two rows indistinguishable once both score sheets sit side by side.
  for (const c of all) {
    assert.ok(!stdIds.has(c.id), `${c.id}: id already in battery/cases.json`);
    assert.ok(!stdValues.has(c.value), `${c.id}: value already in battery/cases.json`);
  }
});

test('every accept case uses a TLD delegated in the pinned IANA list', () => {
  for (const c of accepts) {
    const tld = tldOf(c.value, c.kind);
    assert.ok(tld && iana.has(tld), `${c.id}: ${tld} not in IANA list`);
  }
});

test('every non-ASCII domain round-trips U-label ↔ A-label', () => {
  for (const c of accepts) {
    const domain = domainOf(c.value, c.kind);
    if (!domain || isAscii(domain)) continue;
    const ascii = domainToASCII(domain);
    assert.ok(ascii.startsWith('xn--') || ascii.includes('.xn--'), `${c.id}: ${domain} → ${ascii}`);
    assert.equal(domainToUnicode(ascii), domain.normalize('NFC').toLowerCase(), `${c.id}: round trip`);
  }
});

test('short and long follow the standard battery: up to 4 letters is short, 5 and more is long', () => {
  for (const c of [...battery.cases, ...all]) {
    if (c.class !== 'ascii-tld-short' && c.class !== 'ascii-tld-long') continue;
    const tld = tldOf(c.value, c.kind);
    assert.equal(c.class, tld.length <= 4 ? 'ascii-tld-short' : 'ascii-tld-long', `${c.id}: .${tld}`);
  }
});

test('names under .fr only use characters the AFNIC naming charter admits', () => {
  // Art. 19 of the charter, version of 2026-07-06, copied in the order it prints them.
  const admitted = new Set('aàáâãäåæbcçdeèéêëfghiìíîïjklmnñoòóôõöœpqrstuùúûüvwxyýÿzß0123456789-');
  let checked = 0;
  for (const c of accepts) {
    const domain = domainOf(c.value, c.kind);
    if (!domain || !domain.endsWith('.fr')) continue;
    for (const label of domainToUnicode(domainToASCII(domain)).split('.').slice(0, -1)) {
      for (const ch of label) assert.ok(admitted.has(ch), `${c.id}: « ${ch} » not admitted under .fr`);
      // Art. 20: no leading or trailing hyphen, at most 63 characters.
      assert.ok(!label.startsWith('-') && !label.endsWith('-') && label.length <= 63, `${c.id}: ${label}`);
      checked += 1;
    }
  }
  assert.ok(checked > 0, 'no .fr name was checked');
});

test('accented names on the geoTLDs say they are syntax cases', () => {
  for (const c of accepts) {
    const domain = domainOf(c.value, c.kind);
    const idn = !isAscii(domain) || domain.includes('xn--');
    if (!idn || domain.endsWith('.fr')) continue;
    assert.match(c.note, /syntax only/, c.id);
  }
});

test('every pack keeps at least one guard, and together they cover each kind of field', () => {
  for (const p of packs) assert.ok(p.cases.some(c => c.expect === 'reject'), `${p.file}: no guard`);
  const guards = all.filter(c => c.expect === 'reject');
  for (const kind of ['email', 'domain', 'url']) assert.ok(guards.some(c => c.kind === kind), `no ${kind} guard`);
});
