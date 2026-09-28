import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkForm } from '../src/form-runner.mjs';

const fixture = name => new URL(`./fixtures/${name}`, import.meta.url).href;

test('native type=email: EAI local parts are rejected-native, long TLDs accepted, U-label domains rewritten', async () => {
  const r = await checkForm(fixture('form-native-email.html'));
  const email = r.fields.email;
  assert.equal(email.status, 'tested');
  const by = id => email.results.find(x => x.id === id);
  assert.equal(by('email-ascii-tld-long-01').verdict, 'accepted');
  assert.equal(by('email-eai-local-01').verdict, 'rejected-native');
  assert.equal(by('email-idn-domain-01').rewritten, true);
  assert.match(by('email-idn-domain-01').observed, /@xn--socit-esab\.fr$/);
  assert.equal(by('email-guard-01').verdict, 'rejected-native');
});

test('legacy regex with French error text: long TLD is rejected-script', async () => {
  const r = await checkForm(fixture('form-legacy-regex.html'), { lang: 'fr' });
  const by = id => r.fields.email.results.find(x => x.id === id);
  assert.equal(by('email-control-01').verdict, 'accepted');
  assert.equal(by('email-ascii-tld-long-01').verdict, 'rejected-script');
  assert.equal(by('email-ascii-tld-long-01').outcome, 'fail');
  assert.equal(r.fields.website.status, 'tested');
  assert.equal(r.fields.website.results.find(x => x.id === 'domain-ascii-tld-long-01').verdict, 'rejected-script');
});

test('text fields with no validation accept everything, guards included', async () => {
  const r = await checkForm(fixture('form-text-no-validation.html'), { lang: 'es' });
  assert.equal(r.fields.email.status, 'tested');
  assert.ok(r.fields.email.results.every(x => x.verdict === 'accepted'));
  assert.ok(r.fields.email.counts.fail >= 7, 'guards accepted must count as failures');
});

test('aria-invalid is read as rejected-script', async () => {
  const r = await checkForm(fixture('form-aria-invalid.html'));
  const by = id => r.fields.email.results.find(x => x.id === id);
  assert.equal(by('email-eai-local-02').verdict, 'rejected-script');
  assert.equal(by('email-control-01').verdict, 'accepted');
});

test('page without a form is not-testable, not zero failures', async () => {
  const r = await checkForm(fixture('no-form.html'));
  assert.deepEqual(r.fields.email, { status: 'not-testable', reason: 'no-field' });
  assert.deepEqual(r.fields.website, { status: 'not-testable', reason: 'no-field' });
});

test('a page that validates only on submit is exercised in file mode', async () => {
  const r = await checkForm(fixture('form-validates-on-submit.html'));
  const by = id => r.fields.email.results.find(x => x.id === id);
  assert.equal(by('email-control-01').verdict, 'accepted');
  assert.equal(by('email-control-01').submitted, true);
  const eai = r.fields.email.results.filter(x => x.class === 'eai-local');
  assert.ok(eai.length > 0 && eai.every(x => x.verdict === 'rejected-script'), eai.map(x => x.verdict).join(','));
});

test('submit mode fills required radios and selects and keeps a confirm-email field in step', async () => {
  const r = await checkForm(fixture('form-confirm-radio-select.html'));
  assert.equal(r.fields.email.counts.notSubmitted, 0);
  const control = r.fields.email.results.find(x => x.id === 'email-control-01');
  assert.equal(control.submitted, true);
  assert.equal(control.verdict, 'accepted');
  // no case is rejected by the page's own mismatch check
  assert.ok(r.fields.email.results.every(x => x.verdict !== 'rejected-script'), r.fields.email.results.filter(x => x.verdict === 'rejected-script').map(x => x.id).join(','));
});

test('a page that hides its form after a valid submit is still probed case by case', async () => {
  const r = await checkForm(fixture('form-hides-on-success.html'));
  assert.equal(r.fields.email.status, 'tested');
  const by = id => r.fields.email.results.find(x => x.id === id);
  assert.equal(by('email-control-01').verdict, 'accepted');
  const eai = r.fields.email.results.filter(x => x.class === 'eai-local');
  assert.ok(eai.length > 0 && eai.every(x => x.verdict === 'rejected-script'), eai.map(x => x.verdict).join(','));
});

// ---- Review of #21 (Sonnet 3): a reload cut short by the page's own navigation cost the whole page ----
import { loadBattery } from '../src/battery.mjs';
const battery = loadBattery();
const emailCases = n => ({ ...battery, cases: battery.cases.filter(c => c.kind === 'email').slice(0, n) });

test('a page that reloads itself on input is still tested case by case, with no runner error', async () => {
  const r = await checkForm(fixture('form-self-reloads.html'), { battery: emailCases(4) });
  assert.equal(r.fields.email.status, 'tested');
  assert.equal(r.fields.email.results.length, 4);
  assert.ok(r.fields.email.results.every(x => x.outcome !== 'not-testable'), JSON.stringify(r.fields.email.results));
  assert.equal(r.error, undefined);
});

test('a page whose reloads stop bringing a new document: the cases left are reload-failed, the first ones stay', async () => {
  // documents: 1 first load, 2 before the trial click, 3 case 1, 4 case 2, then the page looks already probed
  const r = await checkForm(fixture('form-stale-on-reload.html'), { battery: emailCases(6) });
  const email = r.fields.email;
  assert.equal(email.status, 'tested');
  assert.equal(email.results.length, 6);
  const kept = email.results.slice(0, 2), lost = email.results.slice(2);
  assert.ok(kept.every(x => ['pass', 'fail'].includes(x.outcome)), JSON.stringify(kept));
  assert.ok(lost.every(x => x.outcome === 'not-testable' && x.reason === 'reload-failed'), JSON.stringify(lost));
  assert.equal(email.counts.notTestable, 4);
  assert.equal(email.counts.pass + email.counts.fail, 2);
  assert.equal(r.error, undefined);
});

// ---- Decision D1 (Matthieu, 25/09): a bare domain in a type=url field is typed with https:// in front ----
const siteCases = { ...battery, cases: battery.cases.filter(c => ['domain-control-01', 'domain-ascii-tld-long-01', 'domain-guard-03', 'url-control-01', 'url-guard-02'].includes(c.id)) };

test('D1: on a type=url field a bare domain is typed as https://… and accepted natively; url cases are typed as they are', async () => {
  const r = await checkForm(fixture('form-url-field-native.html'), { battery: siteCases });
  const w = r.fields.website;
  assert.equal(w.kind, 'url');
  const by = id => w.results.find(x => x.id === id);
  assert.equal(by('domain-control-01').typed, 'https://example.com');
  assert.equal(by('domain-control-01').verdict, 'accepted');
  assert.equal(by('domain-control-01').outcome, 'pass');
  assert.equal(by('domain-control-01').rewritten, false, 'rewritten is judged against what was typed');
  assert.equal(by('domain-ascii-tld-long-01').typed, 'https://boutique.corsica');
  assert.equal(by('domain-ascii-tld-long-01').verdict, 'accepted');
  // Measured 26/09, Chromium 153: <input type="url"> checks the scheme, not the host — `https://exa mple.com`,
  // `https://-bad-.com`, `https://bad..dots.com` and a 64-octet label are all valid to it. Typed bare, the same
  // guard was rejected for its missing scheme, which read as a hostname check the field never does.
  assert.equal(by('domain-guard-03').typed, 'https://exa mple.com');
  assert.equal(by('domain-guard-03').verdict, 'accepted');
  assert.equal(by('domain-guard-03').outcome, 'fail');
  assert.equal(by('url-control-01').typed, 'https://example.com');
  assert.equal(by('url-guard-02').typed, 'http//example.com');
});

test('D1: on a text field a bare domain is typed bare', async () => {
  const r = await checkForm(fixture('form-text-field.html'), { battery: siteCases });
  const w = r.fields.website;
  assert.equal(w.kind, 'domain');
  assert.equal(w.results.find(x => x.id === 'domain-control-01').typed, 'example.com');
  assert.equal(w.results.find(x => x.id === 'url-control-01').typed, 'https://example.com');
});

// ---- Bench of 25/09: every generated form is novalidate; a native mismatch there blocks nothing ----
test('novalidate, native field types, a check of its own: what the page accepts is accepted', async () => {
  const r = await checkForm(fixture('form-novalidate-own-check.html'));
  const by = id => r.fields.email.results.find(x => x.id === id);
  for (const id of ['email-eai-local-01', 'email-eai-local-02', 'email-eai-full-01']) {
    assert.equal(by(id).submitted, true, id);
    assert.equal(by(id).verdict, 'accepted', id);
    assert.equal(by(id).outcome, 'pass', id);
  }
  // an invalid value the page lets through is a failure of the page, whatever the field's validity says
  assert.equal(by('email-guard-04').verdict, 'accepted');
  assert.equal(by('email-guard-04').outcome, 'fail');
  // and one it refuses is refused by its script
  assert.equal(by('email-guard-05').verdict, 'rejected-script');
  assert.equal(by('email-guard-05').outcome, 'pass');
});

test('novalidate, a script that asks the field: the refusal is the page\'s, read as rejected-script', async () => {
  const r = await checkForm(fixture('form-novalidate-relays-validity.html'));
  const by = id => r.fields.email.results.find(x => x.id === id);
  assert.equal(by('email-control-01').verdict, 'accepted');
  assert.equal(by('email-eai-local-01').submitted, true);
  assert.equal(by('email-eai-local-01').verdict, 'rejected-script');
  assert.equal(by('email-eai-local-01').outcome, 'fail');
});

// ---- Review of #21, second pass (27/09): three more ways a verdict said what was not observed ----
test('a field outside any form: nothing enforces its validity and nothing submits it, so nothing is observed', async () => {
  const r = await checkForm(fixture('form-no-form.html'));
  const by = id => r.fields.email.results.find(x => x.id === id);
  for (const id of ['email-eai-local-01', 'email-guard-01']) {
    assert.equal(by(id).submitted, false, id);
    assert.equal(by(id).verdict, 'no-rejection-observed', id);
    assert.equal(by(id).outcome, 'not-observed', id);
  }
  assert.equal(r.fields.email.counts.pass + r.fields.email.counts.fail, 0);
});

test('a field outside any form whose page shows a refusal as the value is typed: the refusal is read', async () => {
  const r = await checkForm(fixture('form-no-form-signals.html'));
  const by = id => r.fields.email.results.find(x => x.id === id);
  assert.deepEqual([by('email-guard-07').typed, by('email-guard-07').signals, by('email-guard-07').verdict, by('email-guard-07').outcome], ['plainaddress', ['aria-invalid'], 'rejected-script', 'pass']);
  // a value the page does not refuse, never submitted: not observed, whatever the field's own validity says
  assert.deepEqual([by('email-eai-local-01').mismatch, by('email-eai-local-01').enforced, by('email-eai-local-01').verdict], [true, false, 'no-rejection-observed']);
});

test('novalidate and setCustomValidity as the only signal: the refusal is read', async () => {
  const r = await checkForm(fixture('form-novalidate-customvalidity.html'));
  const by = id => r.fields.email.results.find(x => x.id === id);
  assert.equal(by('email-guard-07').typed, 'plainaddress');
  assert.equal(by('email-guard-07').verdict, 'rejected-script');
  assert.equal(by('email-guard-07').outcome, 'pass');
  assert.deepEqual(by('email-guard-07').signals, ['custom-validity']);
  assert.equal(by('email-control-01').verdict, 'accepted');
  assert.equal(by('email-eai-local-01').verdict, 'accepted');
});

test('reading the field fires no event: a page listening to `invalid` is not made to refuse by the runner', async () => {
  const r = await checkForm(fixture('form-novalidate-invalid-listener.html'));
  const by = id => r.fields.email.results.find(x => x.id === id);
  assert.equal(by('email-eai-local-01').submitted, true);
  assert.deepEqual(by('email-eai-local-01').signals, []);
  assert.equal(by('email-eai-local-01').verdict, 'accepted');
});

test('every result says what was read: the field\'s own mismatch, whether anything enforces it, what the page showed', async () => {
  const r = await checkForm(fixture('form-novalidate-own-check.html'));
  const by = id => r.fields.email.results.find(x => x.id === id);
  assert.deepEqual([by('email-eai-local-01').mismatch, by('email-eai-local-01').enforced, by('email-eai-local-01').signals], [true, false, []]);
  assert.deepEqual([by('email-control-01').mismatch, by('email-control-01').signals], [false, []]);
  assert.deepEqual(by('email-guard-05').signals, ['aria-invalid']);
  const native = await checkForm(fixture('form-native-email.html'));
  const n = native.fields.email.results.find(x => x.id === 'email-eai-local-01');
  assert.deepEqual([n.mismatch, n.enforced, n.verdict], [true, true, 'rejected-native']);
});

test('the second field starts from a fresh page even if the first field left the form hidden', async () => {
  const r = await checkForm(fixture('form-hides-on-any-submit.html'));
  assert.equal(r.fields.email.status, 'tested');
  assert.equal(r.fields.website.status, 'tested', JSON.stringify(r.fields.website));
});
