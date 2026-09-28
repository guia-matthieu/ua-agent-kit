import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractHtml, toRows } from '../bench/run-bench.mjs';
import { aggregate } from '../bench/aggregate.mjs';

test('extractHtml strips a fenced block and keeps a bare document', () => {
  assert.equal(extractHtml('```html\n<!doctype html><html></html>\n```'), '<!doctype html><html></html>');
  assert.equal(extractHtml('<!doctype html><html></html>'), '<!doctype html><html></html>');
});

test('a reply without a form is not-testable: no-form and produces one row per field', () => {
  const rows = toRows({ model: 'x', model_version: 'x-1', lang: 'en', condition: 'no-guide', repeat: 1 },
    { fields: { email: { status: 'not-testable', reason: 'no-field' }, website: { status: 'not-testable', reason: 'no-field' } } });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].verdict, 'not-testable');
});

test('aggregate reports pass, fail and not-testable per cell and pooled', () => {
  const csv = ['model,model_version,lang,condition,repeat,field,case_id,class,expect,verdict,rewritten,outcome',
    'm,m1,en,no-guide,1,email,email-control-01,control,accept,accepted,false,pass',
    'm,m1,en,no-guide,1,email,email-eai-local-01,eai-local,accept,rejected-native,false,fail',
    'm,m1,en,guide,1,email,email-eai-local-01,eai-local,accept,accepted,false,pass',
    'm,m1,fr,guide,1,email,,,,not-testable,,not-testable'].join('\n');
  const a = aggregate(csv);
  const cell = a.cells.find(c => c.model === 'm' && c.lang === 'en' && c.condition === 'no-guide');
  assert.deepEqual({ pass: cell.pass, fail: cell.fail, notTestable: cell.notTestable }, { pass: 1, fail: 1, notTestable: 0 });
  assert.equal(a.pooled['guide'].notTestable, 1);
  assert.equal(a.pooled['no-guide'].passRate, 0.5);
});

// ---- Review of PR #17 (25/09): every row counted once, reasons kept, CSV round-trips ----
import { readFileSync } from 'node:fs';
import { csvLine, COLUMNS } from '../bench/run-bench.mjs';
import { parse } from '../bench/aggregate.mjs';

const HEAD = COLUMNS.join(',');
const row = (o) => csvLine({ model: 'm', model_version: 'm1', lang: 'en', condition: 'no-guide', repeat: 1, field: 'email', case_id: '', class: '', expect: '', verdict: '', rewritten: 'false', outcome: 'pass', reason: '', ...o });

test('a rewritten-sanitized row lands in its own bucket and every row is counted exactly once', () => {
  const csv = [HEAD,
    row({ case_id: 'a', outcome: 'pass' }),
    row({ case_id: 'b', outcome: 'fail' }),
    row({ case_id: 'c', class: 'control-reject', expect: 'reject', verdict: 'accepted', rewritten: 'true', outcome: 'rewritten-sanitized' }),
    row({ field: 'website', verdict: 'not-testable', outcome: 'not-testable', reason: 'no-field' })].join('\n');
  const a = aggregate(csv);
  const c = a.cells[0];
  assert.equal(c.pass + c.fail + c.sanitized + c.notTestable, a.rows);
  assert.equal(c.sanitized, 1);
  assert.equal(a.pooled['no-guide'].passRate, 0.5);
});

test('an unknown outcome is an error, never a silent drop', () => {
  assert.throws(() => aggregate([HEAD, row({ outcome: 'maybe' })].join('\n')), /unknown outcome/);
});

test('a row repeated by a rerun is counted once', () => {
  const a = aggregate([HEAD, row({ case_id: 'a' }), row({ case_id: 'a' })].join('\n'));
  assert.equal(a.rows, 1);
});

test('CSV round-trips a model_version holding a comma, a quote and a line break', () => {
  const v = 'vendor/model,"beta"\nrev';
  const [r] = parse([HEAD, row({ model_version: v })].join('\n'));
  assert.equal(r.model_version, v);
  assert.equal(r.outcome, 'pass');
});

test('toRows keeps the not-testable reason and maps tested results', () => {
  const rows = toRows({ model: 'x', model_version: 'x-1', lang: 'en', condition: 'guide', repeat: 2 },
    { fields: { email: { status: 'tested', results: [{ id: 'e1', class: 'eai-local', expect: 'accept', typed: 'josé@example.fr', verdict: 'accepted', rewritten: false, outcome: 'pass' }] },
      website: { status: 'not-testable', reason: 'not-interactable' } } });
  assert.deepEqual(rows.map(r => [r.field, r.case_id, r.typed, r.outcome, r.reason]), [['email', 'e1', 'josé@example.fr', 'pass', ''], ['website', '', '', 'not-testable', 'not-interactable']]);
  const [back] = parse([HEAD, csvLine(rows[1])].join('\n'));
  assert.equal(back.reason, 'not-interactable');
  assert.equal(parse([HEAD, csvLine(rows[0])].join('\n'))[0].typed, 'josé@example.fr');
});

test('extractHtml on the three sample replies: bare page, fenced page, prose with a script and no form', () => {
  const read = l => extractHtml(readFileSync(new URL(`./fixtures/generations/${l}.txt`, import.meta.url), 'utf8'));
  assert.match(read('en'), /^<!doctype html>/i);
  assert.match(read('fr'), /^<!doctype html>[\s\S]*<\/html>$/i);
  assert.doesNotMatch(read('fr'), /```/);
  assert.doesNotMatch(read('es'), /<form[\s>]/i);
});

test('a not-observed row is its own bucket, outside the pass rate', () => {
  const a = aggregate([HEAD,
    row({ case_id: 'a', outcome: 'pass' }),
    row({ case_id: 'b', class: 'control', verdict: 'no-rejection-observed', outcome: 'not-observed' })].join('\n'));
  assert.equal(a.cells[0].notObserved, 1);
  assert.equal(a.cells[0].pass, 1);
  assert.equal(a.pooled['no-guide'].notObserved, 1);
  assert.equal(a.pooled['no-guide'].passRate, 1);
  assert.equal(a.cells[0].byClass.control, undefined, 'a not-observed case is not in the class totals');
});

test('a runner error is its own bucket, never counted as the model producing an untestable page', () => {
  const a = aggregate([HEAD,
    row({ field: 'email', verdict: 'not-testable', outcome: 'not-testable', reason: 'runner-error' }),
    row({ field: 'website', verdict: 'not-testable', outcome: 'not-testable', reason: 'no-form' })].join('\n'));
  assert.equal(a.cells[0].runnerError, 1);
  assert.equal(a.cells[0].notTestable, 1);
  assert.equal(a.pooled['no-guide'].runnerError, 1);
});
