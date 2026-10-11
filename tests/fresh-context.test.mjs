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
