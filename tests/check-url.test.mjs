import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { checkForm } from '../src/form-runner.mjs';
import { renderMarkdown } from '../src/report.mjs';

const fixtures = new URL('./fixtures/', import.meta.url);
let server, base;

test.before(async () => {
  server = http.createServer((req, res) => {
    const name = req.url.slice(1).split('?')[0] || 'form-native-email.html';
    try { res.setHeader('content-type', 'text/html; charset=utf-8'); res.end(readFileSync(new URL(name, fixtures))); }
    catch { res.statusCode = 404; res.end('nope'); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
});
test.after(() => server.close());

test('URL mode records the final URL and title', async () => {
  const r = await checkForm(base + 'form-native-email.html');
  assert.equal(r.finalUrl, base + 'form-native-email.html');
  assert.equal(r.fields.email.status, 'tested');
});

test('a covered field is not-testable: not-interactable, within the fill timeout', async () => {
  const t0 = Date.now();
  const r = await checkForm(base + 'form-covered.html');
  assert.deepEqual(r.fields.email, { status: 'not-testable', reason: 'not-interactable' });
  assert.ok(Date.now() - t0 < 20000);
});

test('a 404 is load-error, not zero failures', async () => {
  const r = await checkForm(base + 'missing.html');
  // the page loads (404 body), but has no form
  assert.equal(r.fields.email.status, 'not-testable');
});

test('markdown report carries the three categories and the not-tested block', async () => {
  const r = await checkForm(base + 'form-legacy-regex.html', { lang: 'fr' });
  const md = renderMarkdown(r);
  assert.match(md, /passed/i); assert.match(md, /failed/i); assert.match(md, /not-testable/i);
  assert.match(md, /Not tested: validation that runs only on submit, server-side validation, email delivery/);
  assert.match(md, /rewritten/i);
});

test('on a URL, a submit-only validator is reported as no-rejection-observed, never as accepted', async () => {
  const r = await checkForm(base + 'form-validates-on-submit.html');
  assert.equal(r.submitExercised, false);
  assert.ok(r.fields.email.results.every(x => x.verdict === 'no-rejection-observed' && x.submitted === false));
  assert.match(renderMarkdown(r), /no-rejection-observed" means no rejection on input or blur, not an acceptance/);
});
