// The baseline value is the reference a refusal is read against. When the page refuses the baseline itself, that
// refusal became the reference and every later refusal in the same words read as accepted
// (docs/qc/2026-10-07_baseline-refused/: 38 text website fields of the two benches).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkForm } from '../src/form-runner.mjs';
import { renderMarkdown } from '../src/report.mjs';

const fixture = name => new URL(`./fixtures/${name}`, import.meta.url).href;

test('a text field that wants a scheme: the baseline is typed with it, and a refusal in the same words is read', async () => {
  const r = await checkForm(fixture('form-text-wants-scheme.html'));
  const f = r.fields.website, by = id => f.results.find(x => x.id === id);
  assert.deepEqual(f.baseline, { typed: 'https://example.com', refused: false, schemeRequired: true, showed: false });
  assert.equal(f.kind, 'url');
  // a bare domain is typed with https:// in front, as on a field of type url (D1)
  assert.equal(by('domain-control-01').typed, 'https://example.com');
  assert.equal(by('domain-control-01').verdict, 'accepted');
  assert.equal(by('url-control-01').verdict, 'accepted');
  // refused by the page with the message it gave the bare baseline
  const guards = f.results.filter(x => x.expect === 'reject' && x.verdict === 'rejected-script');
  assert.ok(guards.length > 0, 'no guard read as refused');
  const space = f.results.find(x => x.expect === 'reject' && /\s/.test(x.typed));
  assert.equal(space.verdict, 'rejected-script');
  assert.deepEqual(space.signals, ['field-text']);
  assert.match(renderMarkdown(r), /text field that refuses a bare domain and takes it with a scheme/);
  // the email field of the same page: its baseline is taken, nothing changes
  assert.deepEqual(r.fields.email.baseline, { typed: 'ana.garcia@example.com', refused: false, schemeRequired: false, showed: false });
});

test('a page that refuses every value and marks the field: read against the page as it loaded, every case is a refusal', async () => {
  const r = await checkForm(fixture('form-refuses-everything-marked.html'), { lang: 'es' });
  for (const name of ['email', 'website']) {
    const f = r.fields[name];
    assert.equal(f.baseline.refused, true);
    assert.equal(f.baseline.schemeRequired, false);
    assert.equal(f.results.filter(x => x.verdict !== 'rejected-script').length, 0);
    assert.equal(f.results.find(x => x.class === 'control').outcome, 'fail');
  }
  assert.equal(r.fields.website.kind, 'domain');
  assert.match(renderMarkdown(r), /The page refuses the plain value/);
});

test('the same text for a plain value and for a value with no @ or dot, and no mark: no verdict is given', async () => {
  const r = await checkForm(fixture('form-refuses-everything.html'), { lang: 'es' });
  for (const name of ['email', 'website']) assert.deepEqual({ status: r.fields[name].status, reason: r.fields[name].reason }, { status: 'not-testable', reason: 'baseline-ambiguous' });
});

test('a text that repeats the value typed is not a refusal of it', async () => {
  const r = await checkForm(fixture('form-echoes-value.html'));
  const f = r.fields.email, by = id => f.results.find(x => x.id === id);
  assert.equal(f.baseline.refused, false);
  assert.equal(f.results.filter(x => x.class === 'control' && x.verdict !== 'accepted').length, 0);
  assert.equal(by('email-guard-07').verdict, 'rejected-script');
});

test('a hint shown for any value, the refusal written below the button: the baseline is taken', async () => {
  const r = await checkForm(fixture('form-hint-for-any-value.html'));
  const f = r.fields.email, by = id => f.results.find(x => x.id === id);
  assert.deepEqual(f.baseline, { typed: 'ana.garcia@example.com', refused: false, schemeRequired: false, showed: true });
  assert.equal(f.results.filter(x => x.class === 'control' && x.verdict !== 'accepted').length, 0);
  assert.equal(by('email-guard-07').verdict, 'rejected-script');
  assert.deepEqual(by('email-guard-07').signals, ['error-text']);
});

test('a complaint about another field, there from the baseline on, is not a refusal of this one', async () => {
  const r = await checkForm(fixture('form-other-field-complains.html'));
  const f = r.fields.email, by = id => f.results.find(x => x.id === id);
  assert.deepEqual(f.baseline, { typed: 'ana.garcia@example.com', refused: false, schemeRequired: false, showed: false });
  assert.equal(by('email-control-01').verdict, 'accepted');
  assert.equal(by('email-guard-07').verdict, 'rejected-script');
});

test('a page that writes under a valid value: taken as an acceptance, and said', async () => {
  const r = await checkForm(fixture('form-praise-on-valid.html'));
  assert.deepEqual(r.fields.email.baseline, { typed: 'ana.garcia@example.com', refused: false, schemeRequired: false, showed: true });
  assert.match(renderMarkdown(r), /writes something of its own in this field/);
});

test('a URL is never submitted: no baseline is typed', async () => {
  const { createServer } = await import('node:http');
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('./fixtures/form-text-wants-scheme.html', import.meta.url));
  const server = createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end(html); }).listen(0);
  try {
    const r = await checkForm(`http://127.0.0.1:${server.address().port}/`);
    assert.equal(r.fields.website.baseline, null);
  } finally { server.close(); }
});
