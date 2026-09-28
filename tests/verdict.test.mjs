// Review of #21 (Astra E): a case whose submit never fired and that showed no rejection read as pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/verdict.mjs';

const clean = { value: '', valid: true, typeMismatch: false, patternMismatch: false, ariaInvalid: null, classes: '', errorTexts: [] };
const state = (value, extra = {}) => ({ ...clean, value, ...extra });
const accept = { id: 'x', kind: 'email', class: 'control', expect: 'accept' };
const reject = { id: 'y', kind: 'email', class: 'guard', expect: 'reject' };

test('no rejection observed and no submit: not-observed, never pass, whatever the case expects', () => {
  const v = 'marie.dupont@example.com';
  assert.deepEqual(decide(accept, v, state(''), state(v), { submitted: false }), { verdict: 'no-rejection-observed', rewritten: false, outcome: 'not-observed' });
  assert.deepEqual(decide(reject, 'a@@b', state(''), state('a@@b'), { submitted: false }), { verdict: 'no-rejection-observed', rewritten: false, outcome: 'not-observed' });
});

test('the same states with the submit fired: accepted, pass or fail by what the case expects', () => {
  const v = 'marie.dupont@example.com';
  assert.equal(decide(accept, v, state(''), state(v), { submitted: true }).outcome, 'pass');
  assert.equal(decide(reject, 'a@@b', state(''), state('a@@b'), { submitted: true }).outcome, 'fail');
});

test('a rejection is a rejection with or without the submit', () => {
  const after = state('josé@example.fr', { valid: false, typeMismatch: true });
  assert.equal(decide(accept, 'josé@example.fr', state(''), after, { submitted: false }).outcome, 'fail');
  assert.equal(decide(reject, 'josé@example.fr', state(''), after, { submitted: false }).outcome, 'pass');
});

// Bench of 25/09, scored again on 27/09: the 54 generated forms carry `novalidate`, so the browser blocks nothing
// there. On 44 rows the page itself had set aria-invalid="false" and filed the form, and the verdict was still
// rejected-native, read from the validity of a type=email field that nothing enforced: 36 valid addresses counted
// as refused, 8 invalid values counted as correctly refused.
const mismatch = (value, extra = {}) => state(value, { valid: false, typeMismatch: true, ...extra });

test('on a novalidate form a native mismatch is not a rejection: what the page says decides', () => {
  const v = 'josé.dupont@example.fr';
  const after = mismatch(v, { noValidate: true, ariaInvalid: 'false' });
  assert.deepEqual(decide(accept, v, state(''), after, { submitted: true }), { verdict: 'accepted', rewritten: false, outcome: 'pass' });
  const guard = 'user@example..com';
  assert.deepEqual(decide(reject, guard, state(''), mismatch(guard, { noValidate: true, ariaInvalid: 'false' }), { submitted: true }), { verdict: 'accepted', rewritten: false, outcome: 'fail' });
});

test('on a novalidate form a refusal the page signals is rejected-script, mismatch or not', () => {
  const v = 'josé.dupont@example.fr';
  const after = mismatch(v, { noValidate: true, ariaInvalid: 'true' });
  assert.deepEqual(decide(accept, v, state(''), after, { submitted: true }), { verdict: 'rejected-script', rewritten: false, outcome: 'fail' });
});

test('on a novalidate form, a mismatch with no signal and no submit is not-observed', () => {
  const v = 'josé.dupont@example.fr';
  assert.deepEqual(decide(accept, v, state(''), mismatch(v, { noValidate: true }), { submitted: false }), { verdict: 'no-rejection-observed', rewritten: false, outcome: 'not-observed' });
});

test('without novalidate a native mismatch stays rejected-native: the browser blocks the submit', () => {
  const v = 'josé.dupont@example.fr';
  assert.equal(decide(accept, v, state(''), mismatch(v, { noValidate: false }), { submitted: false }).verdict, 'rejected-native');
  assert.equal(decide(accept, v, state(''), mismatch(v), { submitted: false }).verdict, 'rejected-native');
});

// ---- Review of #21, second pass (27/09) ----
test('a custom validity the page set for this value is a refusal of the page (setCustomValidity, nothing in the markup)', () => {
  const v = 'plainaddress';
  const after = state(v, { valid: false, customError: true, validationMessage: 'missing @', noValidate: true });
  assert.deepEqual(decide(reject, v, state(''), after, { submitted: true }), { verdict: 'rejected-script', rewritten: false, outcome: 'pass' });
  // the same message already there for the baseline value says nothing about this one
  const before = state('', { valid: false, customError: true, validationMessage: 'missing @' });
  assert.equal(decide(reject, v, before, after, { submitted: true }).verdict, 'accepted');
});

test('signalsOf names what the page showed, and only what changed against the baseline', async () => {
  const { signalsOf } = await import('../src/verdict.mjs');
  assert.deepEqual(signalsOf(state(''), state('x')), []);
  assert.deepEqual(signalsOf(state(''), state('x', { ariaInvalid: 'true' })), ['aria-invalid']);
  assert.deepEqual(signalsOf(state(''), state('x', { classes: 'field has-error' })), ['error-class']);
  assert.deepEqual(signalsOf(state('', { classes: 'field has-error' }), state('x', { classes: 'field has-error' })), []);
  assert.deepEqual(signalsOf(state(''), state('x', { errorTexts: ['Invalid email'] })), ['error-text']);
  assert.deepEqual(signalsOf(state('', { errorTexts: ['Invalid email'] }), state('x', { errorTexts: ['Invalid email'] })), []);
  assert.deepEqual(signalsOf(state(''), state('x', { ariaInvalid: 'true', errorTexts: ['Invalid email'], customError: true, validationMessage: 'no' })), ['aria-invalid', 'error-text', 'custom-validity']);
});

test('a reject case the field rewrote into a valid value stays rewritten-sanitized even without the submit', () => {
  const r = decide(reject, ' marie.dupont@example.com', state(''), state('marie.dupont@example.com'), { submitted: false });
  assert.equal(r.rewritten, true);
  assert.equal(r.outcome, 'rewritten-sanitized');
});
