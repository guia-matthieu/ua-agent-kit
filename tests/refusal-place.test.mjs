// A refusal is read by its place, not by its wording. Bench run of 2026-10-06: the runner kept a text only when it
// held `invalid`, `error`, `erreur` or `incorrect`, and read "Enter a valid email address." as an acceptance
// (docs/qc/2026-10-06_refusal-wording/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkForm } from '../src/form-runner.mjs';
import { signalsOf, sameOwn } from '../src/verdict.mjs';

const fixture = name => new URL(`./fixtures/${name}`, import.meta.url).href;
const clean = { value: '', valid: true, typeMismatch: false, patternMismatch: false, ariaInvalid: null, classes: '', errorTexts: [], fieldTexts: [] };
const state = (extra = {}) => ({ ...clean, ...extra });

test('signalsOf: a text of the field that the baseline did not show is a refusal, whatever its words', () => {
  assert.deepEqual(signalsOf(state(), state({ fieldTexts: ['Email address', 'Enter a valid email address.'] })), ['field-text']);
  assert.deepEqual(signalsOf(state({ fieldTexts: ['Email address'] }), state({ fieldTexts: ['Email address'] })), []);
  assert.deepEqual(signalsOf(state({ fieldTexts: ['Looks good'] }), state({ fieldTexts: ['Looks good'] })), []);
  // a text that repeats the value typed is the same text for another value
  assert.deepEqual(signalsOf(state({ value: 'ana@example.com', fieldTexts: ['Sending to ana@example.com'] }), state({ value: 'marie@example.fr', fieldTexts: ['Sending to marie@example.fr'] })), []);
  // a fixed hint stays old when the value typed is the example it gives
  assert.deepEqual(signalsOf(state({ value: 'x.example', fieldTexts: ['e.g. https://example.com'] }), state({ value: 'https://example.com', fieldTexts: ['e.g. https://example.com'] })), []);
  // the value as the page may have written it: in capitals, cut short, in another Unicode form, a space taken out
  const echo = (v1, t1, v2, t2) => signalsOf(state({ value: v1, fieldTexts: [t1] }), state({ value: v2, fieldTexts: [t2] }));
  assert.deepEqual(echo('ana.garcia@example.com', 'Preview: ANA.GARCIA@EXAMPLE.COM', 'marie@example.fr', 'Preview: MARIE@EXAMPLE.FR'), []);
  assert.deepEqual(echo('ana.garcia@example.com', 'Sending to ana.garcia@e…', 'marie.dupont@example.fr', 'Sending to marie.dupont…'), []);
  assert.deepEqual(echo('ana.garcia@example.com', 'Sending to ana.garcia@e…', 'info@例え.jp', 'Sending to info@例え.jp'), []);
  assert.deepEqual(echo('ana.garcia@example.com', 'Sending to ana.garcia@example.com', 'jos\u00e9@soci\u00e9t\u00e9.fr', 'Sending to jose\u0301@socie\u0301te\u0301.fr'), []);
  assert.deepEqual(echo('example.com', 'Preview: example.com', 'exa mple.com', 'Preview: example.com'), []);
  // a refusal that quotes the value is still not what the page wrote for the baseline
  assert.deepEqual(echo('ana.garcia@example.com', 'Sending to ana.garcia@example.com', 'plainaddress', '"plainaddress" is not an address'), ['field-text']);
  // a count of characters moves with every value
  assert.deepEqual(echo('ana.garcia@example.com', '22/50', 'marie@example.fr', '16/50'), []);
  // two characters are not looked for: they would be found inside ordinary words
  assert.deepEqual(echo('ab', 'Enter ab', 'cd', 'Enter cd'), ['field-text']);
  // a state read by an older runner carries no fieldTexts
  const old = Object.fromEntries(Object.entries(clean).filter(([k]) => k !== 'fieldTexts'));
  assert.deepEqual(signalsOf(old, old), []);
});

test('a refusal worded "Enter a valid email address." inside the label of the field is read', async () => {
  const r = await checkForm(fixture('form-refusal-plain-wording.html'));
  const by = id => r.fields.email.results.find(x => x.id === id);
  assert.equal(by('email-control-01').verdict, 'accepted');
  assert.equal(by('email-guard-07').verdict, 'rejected-script');
  assert.deepEqual(by('email-guard-07').signals, ['field-text']);
  assert.equal(by('email-guard-07').outcome, 'pass');
});

test('label, field and message as siblings with no wrapper: the message that follows the field is its own', async () => {
  const r = await checkForm(fixture('form-refusal-flat-siblings.html'), { lang: 'fr' });
  const by = id => r.fields.email.results.find(x => x.id === id);
  assert.equal(by('email-control-01').verdict, 'accepted');
  assert.equal(by('email-guard-07').verdict, 'rejected-script');
});

test('a message of success below the button is not a refusal, even when the baseline value was refused', async () => {
  const r = await checkForm(fixture('form-success-after-refused-baseline.html'), { lang: 'es' });
  const site = id => r.fields.website.results.find(x => x.id === id);
  assert.equal(site('url-control-01').verdict, 'accepted');
  assert.equal(site('url-ascii-tld-long-01').verdict, 'accepted');
  const mail = id => r.fields.email.results.find(x => x.id === id);
  assert.equal(mail('email-control-01').verdict, 'accepted');
  assert.equal(mail('email-guard-07').verdict, 'rejected-script');
});

test('a message away from the field that the field names with aria-describedby is its own', async () => {
  const r = await checkForm(fixture('form-refusal-described-by.html'));
  const by = id => r.fields.email.results.find(x => x.id === id);
  assert.equal(by('email-control-01').verdict, 'accepted');
  assert.equal(by('email-guard-07').verdict, 'rejected-script');
});

test('a page that writes under the field for a valid value too: only what the refusal adds counts', async () => {
  const r = await checkForm(fixture('form-praise-on-valid.html'));
  const by = id => r.fields.email.results.find(x => x.id === id);
  assert.equal(by('email-control-01').verdict, 'accepted');
  assert.equal(by('email-ascii-tld-long-01').verdict, 'accepted');
  assert.equal(by('email-guard-07').verdict, 'rejected-script');
});

test('sameOwn: the same texts and the same marks, both ways', () => {
  const a = state({ fieldTexts: ['Email', 'Enter a valid email address.'] });
  assert.equal(sameOwn(a, state({ fieldTexts: ['Email', 'Enter a valid email address.'] })), true);
  assert.equal(sameOwn(a, state({ fieldTexts: ['Email'] })), false);            // a text only the first shows
  assert.equal(sameOwn(state({ fieldTexts: ['Email'] }), a), false);            // a text only the second shows
  assert.equal(sameOwn(a, state({ fieldTexts: a.fieldTexts, ariaInvalid: 'true' })), false);
  assert.equal(sameOwn(a, state({ fieldTexts: a.fieldTexts, classes: 'field error' })), false);
});
