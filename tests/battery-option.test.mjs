import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { loadBattery, loadBatteryFile, batteryProblems, CLASSES } from '../src/battery.mjs';

const path = rel => fileURLToPath(new URL(rel, import.meta.url));
const BIN = path('../bin/ua-kit.mjs'), PACK = path('../battery/packs/tld/geotld/corsica.json'), FORM = path('fixtures/form-text-no-validation.html');
const schema = JSON.parse(readFileSync(path('../battery/schema.json'), 'utf8'));
const pack = JSON.parse(readFileSync(PACK, 'utf8'));
const kit = (...args) => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });
const dir = mkdtempSync(join(tmpdir(), 'ua-kit-battery-'));
const write = (name, content) => { const f = join(dir, name); writeFileSync(f, typeof content === 'string' ? content : JSON.stringify(content)); return f; };
const one = { id: 'email-x-01', kind: 'email', class: 'control', value: 'a@example.com', expect: 'accept', note: 'n', ref: 'r' };
const file = (cases, extra = {}) => ({ version: '0.0.1', generated: '2026-10-06', license: 'CC0-1.0', method: 'm', cases, ...extra });

test('the class list of the hand check is the one of the schema', () => {
  assert.deepEqual(CLASSES, schema.properties.cases.items.properties.class.enum);
});

test('the hand check and the schema agree, on good files and on bad ones', () => {
  const ajv = new Ajv({ allErrors: true });
  const samples = {
    standard: loadBattery(), pack, minimal: file([one]),
    'not an object': [], 'no cases': file([]), 'bad version': file([one], { version: '1.0' }), 'other licence': file([one], { license: 'MIT' }),
    'missing ref': file([{ ...one, ref: undefined }]), 'extra field': file([{ ...one, weight: 2 }]), 'bad id': file([{ ...one, id: 'Email_1' }]),
    'bad kind': file([{ ...one, kind: 'phone' }]), 'bad class': file([{ ...one, class: 'made-up' }]), 'empty value': file([{ ...one, value: '' }]),
    'bad expect': file([{ ...one, expect: 'maybe' }]), 'case is a string': file(['a@example.com']),
  };
  for (const [name, sample] of Object.entries(samples)) {
    const clean = JSON.parse(JSON.stringify(sample));
    assert.equal(batteryProblems(clean).length === 0, ajv.validate(schema, clean), name);
  }
});

test('an id used twice is refused, which the schema alone does not catch', () => {
  assert.match(batteryProblems(file([one, { ...one, value: 'b@example.com' }])).join('\n'), /appears twice/);
});

test('loadBatteryFile reads a pack and refuses what is not a battery', () => {
  assert.equal(loadBatteryFile(PACK).cases.length, pack.cases.length);
  assert.throws(() => loadBatteryFile(join(dir, 'absent.json')), /cannot read battery file/);
  assert.throws(() => loadBatteryFile(write('broken.json', '{')), /cannot read battery file/);
  assert.throws(() => loadBatteryFile(write('values.json', ['a@example.com'])), /does not follow battery\/schema\.json/);
});

test('ua-kit score --battery scores the pack and says so', () => {
  const r = kit('score', '--kind', 'email', '--regex', '^[^@\\s]+@[a-z0-9.-]+\\.[a-z]{2,4}$', '--battery', PACK, '--json');
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.battery, pack.version);
  assert.equal(out.batteryFile, PACK);
  assert.equal(out.total, pack.cases.filter(c => c.kind === 'email').length);
  assert.ok(out.failures.includes('email-geotld-corsica-01'));
  assert.match(kit('score', '--kind', 'email', '--regex', '@', '--battery', PACK).stdout, /not the standard battery/);
});

test('ua-kit score without --battery is unchanged', () => {
  const out = JSON.parse(kit('score', '--kind', 'email', '--regex', '@', '--json').stdout);
  assert.equal(out.battery, loadBattery().version);
  assert.ok(!('batteryFile' in out));
});

test('a file that is not a battery stops both commands before anything runs', () => {
  const bad = write('bad.json', file([{ ...one, kind: 'phone' }]));
  for (const args of [['check', FORM, '--battery', bad], ['score', '--kind', 'email', '--regex', '@', '--battery', bad]]) {
    const r = kit(...args);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /cases\[0\]\.kind/);
    assert.equal(r.stdout, '');
  }
});

test('ua-kit check --battery types the values of the pack, only those, and names the file', () => {
  const r = kit('check', FORM, '--battery', PACK, '--json');
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.equal(report.battery, pack.version);
  assert.equal(report.batteryFile, PACK);
  const allowed = new Set([...pack.cases.map(c => c.value), ...pack.cases.filter(c => c.kind === 'domain').map(c => 'https://' + c.value)]);
  const ids = new Set(pack.cases.map(c => c.id));
  let typed = 0;
  for (const field of Object.values(report.fields)) {
    for (const res of field.results ?? []) {
      assert.ok(ids.has(res.id), `${res.id} is not a case of the pack`);
      if (res.typed !== undefined && res.typed !== null) { assert.ok(allowed.has(res.typed), `${res.typed} is not in the pack`); typed += 1; }
    }
  }
  assert.ok(typed > 0, 'nothing was typed');
  assert.match(kit('check', FORM, '--battery', PACK).stdout, /- battery: 0\.2\.0 — .*corsica\.json, not the standard battery/);
});
