import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { loadBattery } from '../src/battery.mjs';
import { isValidEmail } from '../runners/js/reference.mjs';
import { score, regexValidator } from '../runners/js/score.mjs';

const battery = loadBattery();
const cli = args => spawnSync(process.execPath, [new URL('../bin/ua-kit.mjs', import.meta.url).pathname, ...args], { encoding: 'utf8' });

test('reference email validator scores ua-pass', () => {
  const r = score(isValidEmail, battery, { kind: 'email' });
  assert.equal(r.verdict, 'ua-pass');
  assert.deepEqual(r.failures, []);
  assert.equal(r.total, battery.cases.filter(c => c.kind === 'email').length);
});

test('ASCII-only regex with a 2-4 letter TLD cap scores ua-fail with the expected classes', () => {
  const legacy = regexValidator('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$');
  const r = score(legacy, battery, { kind: 'email' });
  assert.equal(r.verdict, 'ua-fail');
  for (const cls of ['ascii-tld-long', 'idn-tld-alabel', 'email-idn-domain', 'eai-local', 'eai-full']) {
    assert.ok(r.failingClasses.includes(cls), `expected ${cls} to fail`);
  }
  // The legacy class [a-zA-Z0-9._%+-] rejects the apostrophe of o'neill@example.ie (RFC 5322 atext):
  // a control case failing under a legacy regex is the finding, not a test error.
  assert.ok(!r.failures.includes('email-control-01'), 'plain ASCII control must pass');
  assert.ok(r.failures.includes('email-control-04'), 'apostrophe control must fail under the legacy regex');
});

test('a validator that accepts everything scores accept-all', () => {
  const r = score(() => true, battery, { kind: 'domain' });
  assert.equal(r.verdict, 'accept-all');
});

test('a validator that throws is counted as rejecting', () => {
  const r = score(() => { throw new Error('boom'); }, battery, { kind: 'url' });
  assert.equal(r.accepted_ok, 0);
  assert.equal(r.verdict, 'ua-fail');
});

test('byClass totals add up to total', () => {
  const r = score(isValidEmail, battery, { kind: 'email' });
  const sum = Object.values(r.byClass).reduce((a, b) => a + b.total, 0);
  assert.equal(sum, r.total);
});

test('an unknown kind selects no cases and never reads as ua-pass', () => {
  const r = score(() => true, battery, { kind: 'bogus' });
  assert.equal(r.total, 0);
  assert.equal(r.verdict, 'no-cases');
});

test('without a kind, buckets are prefixed by kind so classes are not mixed', () => {
  const r = score(isValidEmail, battery, {});
  assert.ok('email:control' in r.byClass);
  assert.ok('domain:control' in r.byClass);
  assert.ok(!('control' in r.byClass));
});

test('regexValidator compiles web-copied escapes by default (no u flag)', () => {
  assert.equal(regexValidator('^[a-z]+\\-[a-z]+$')('ab-cd'), true);
  assert.throws(() => regexValidator('['), SyntaxError);
});

test('CLI rejects an unknown --kind with usage and exit 1', () => {
  const r = cli(['score', '--kind', 'bogus', '--regex', 'x']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /usage:/);
});

test('CLI reports an uncompilable regex without a stack trace', () => {
  const r = cli(['score', '--kind', 'email', '--regex', '[']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^invalid --regex: /);
  assert.doesNotMatch(r.stderr, /at .*node:internal/);
});
