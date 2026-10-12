import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadBattery } from '../src/battery.mjs';
import { checkForm } from '../src/form-runner.mjs';

const fixture = name => new URL(`./fixtures/${name}`, import.meta.url).href;
const battery = loadBattery();
// valid addresses only: on these pages a refusal can only come from what the previous documents left behind
const accepted = n => ({ ...battery, cases: battery.cases.filter(c => c.kind === 'email' && c.expect === 'accept').slice(0, n) });

// Each page refuses every value past two submits, counted in a place that outlives a reload in the same context.
// The runner submits the baseline and a second value, then one case per document: every case after the first
// two submits would read as refused if the count were carried over.
for (const [name, where] of [
  ['form-counts-submits-in-indexeddb.html', 'IndexedDB (review of PR #9)'],
  ['form-saves-tries-on-timer.html', 'localStorage written again by a timer of the old document (finding 6)'],
  ['form-reads-history-length.html', 'the length of the tab\'s history'],
]) {
  test(`every case starts from a document that inherits nothing: ${where}`, async () => {
    const r = await checkForm(fixture(name), { battery: accepted(5) });
    assert.equal(r.fields.email.status, 'tested', JSON.stringify(r.fields.email));
    assert.deepEqual(r.fields.email.results.map(x => x.outcome), Array(5).fill('pass'), JSON.stringify(r.fields.email.results.map(x => [x.id, x.verdict])));
  });
}

// The runner's own reload path, a new context per reload: the tests that count documents in storage run with
// `reloadInPlace`, so these pages change after a time instead (review of PR #10, T1). Where that time falls
// depends on the machine's load, so it is moved until it lands inside the loop, with cases measured before
// it and cases left after it. Every run must keep what it measured, wherever the change fell.
const emailCases = n => ({ ...battery, cases: battery.cases.filter(c => c.kind === 'email').slice(0, n) });
const DEADLINES_MS = [500, 900, 1500, 2500, 4000, 7000];
for (const [name, reason] of [
  ['form-changes-after-deadline.html', 'page-changed-on-reload'],
  ['form-readonly-after-deadline.html', 'not-interactable'],
]) {
  test(`a page that changes between two reloads in new contexts: the cases measured stay, the ones left are ${reason}`, async () => {
    let split = false;
    for (const ms of DEADLINES_MS) {
      const r = await checkForm(`${fixture(name)}?until=${Date.now() + ms}`, { battery: emailCases(8) });
      const email = r.fields.email;
      if (email.status !== 'tested') continue;   // changed before the baseline: nothing was measured to keep
      const outcomes = email.results.map(x => x.outcome === 'not-testable' ? `not-testable/${x.reason}` : x.outcome);
      const kept = outcomes.findIndex(o => o.startsWith('not-testable'));
      if (kept === -1) continue;   // changed after the last case
      assert.ok(kept > 0, `nothing kept at ${ms} ms: ${outcomes}`);
      assert.ok(outcomes.slice(0, kept).every(o => o === 'pass' || o === 'fail'), `at ${ms} ms: ${outcomes}`);
      assert.ok(outcomes.slice(kept).every(o => o === `not-testable/${reason}`), `at ${ms} ms: ${outcomes}`);
      split = true;
      break;
    }
    assert.ok(split, `no deadline in ${DEADLINES_MS} fell inside the loop`);
  });
}
