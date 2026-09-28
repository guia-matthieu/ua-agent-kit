import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadBattery } from '../src/battery.mjs';
import { isValidEmail, isValidDomain, isValidUrl } from '../runners/js/reference.mjs';

const battery = loadBattery();
const validators = { email: isValidEmail, domain: isValidDomain, url: isValidUrl };

test('reference validators agree with every case in the battery', () => {
  for (const c of battery.cases) {
    const got = validators[c.kind](c.value);
    assert.equal(got, c.expect === 'accept', `${c.id} (${c.value}) expected ${c.expect}`);
  }
});

test('uppercase A-label is accepted', () => {
  assert.equal(isValidDomain('example.XN--P1AI'), true);
});

test('trailing-dot FQDN is rejected on purpose (documented exclusion)', () => {
  assert.equal(isValidDomain('example.com.'), false);
});

test('non-string input is rejected, never thrown', () => {
  assert.equal(isValidEmail(undefined), false);
  assert.equal(isValidDomain(null), false);
  assert.equal(isValidUrl(42), false);
});
