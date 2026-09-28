// The report renders values that the page under test controls; they must not forge markup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { renderMarkdown } from '../src/report.mjs';

const hostile = 'Evil | pwned `x` <b>hi</b>\nline';
const report = {
  target: 't.html', finalUrl: 'file:///t.html', title: hostile, engine: 'chromium', engineVersion: '1', date: 'd', battery: '1.0.0',
  fields: {
    email: { status: 'tested', selector: '#e', kind: 'email', counts: { pass: 0, fail: 1, rewritten: 0, byClass: { control: { pass: 0, total: 1 } } },
      results: [{ id: 'email-control-01', typed: 'a@b.fr', observed: hostile, verdict: 'rejected-script', outcome: 'fail' }] },
    website: { status: 'not-testable', reason: 'no-field' },
  },
  catalogue: [{ script: '<script>x</script>', name: 'n', source_url: null }],
};

test('page-controlled values cannot inject markup or break table rows', () => {
  const md = renderMarkdown(report);
  // Outside code spans, no raw tag may survive (inside a code span GitHub shows it literally).
  const title = md.split('\n').find(l => l.startsWith('- title:'));
  assert.ok(!title.includes('<b>'), `raw HTML in the title line: ${title}`);
  assert.ok(!md.includes('<script>'), 'raw script tag reached the report');
  const row = md.split('\n').find(l => l.startsWith('| email-control-01'));
  assert.equal(row.split(/(?<!\\)\|/).length - 2, 4, `row has extra cells: ${row}`);
  assert.ok(!md.includes('hi</b>\nline'), 'newline from the page split a line');
});

test('CLI rejects an unknown --engine with usage and exit 1, no stack trace', async () => {
  const err = await promisify(execFile)('node', ['bin/ua-kit.mjs', 'check', 'x.html', '--engine', 'bogus']).catch(e => e);
  assert.equal(err.code, 1);
  assert.match(err.stderr, /unknown engine: bogus/);
  assert.doesNotMatch(err.stderr, /TypeError/);
});
