// Review of PR #21 (Sonnet, reproduced): --rescore overwrote runs.csv with the header before scoring, and a
// missing .html crashed the loop after 47 of 54 pages, leaving 3 635 of 4 267 rows and no warning.
// These tests run the real CLI on a copy of three real cells (one per model) in a temporary directory.
// Scoring a real page takes ~14 s (79 cases, a reload per case): the file runs three passes, no more.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, readdirSync, unlinkSync, appendFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aggregate, checkRescore } from '../bench/aggregate.mjs';

const bench = new URL('../bench/', import.meta.url);
const CELLS = ['anthropic/en/guide/1', 'openai/fr/no-guide/2', 'open-weight/es/guide/3'];

function copyCell(dir, c, exts = ['html', 'json']) {
  for (const ext of exts) {
    const dst = join(dir, 'generations', `${c}.${ext}`);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(fileURLToPath(new URL(`results/generations/${c}.${ext}`, bench)), dst);
  }
}
const cli = (script, dir, args = []) => spawnSync(process.execPath, [fileURLToPath(new URL(script, bench)), ...args], { encoding: 'utf8', env: { ...process.env, RESULTS_DIR: dir } });
const metaFiles = dir => readdirSync(join(dir, 'generations'), { recursive: true }).filter(f => f.endsWith('.json')).sort().map(f => join(dir, 'generations', f));
const passId = dir => JSON.parse(readFileSync(join(dir, 'rescore.json'), 'utf8')).rescore_id;

test('--rescore: two passes give the same CSV; a missing .html leaves the previous pass byte for byte and exits 1; aggregate.mjs refuses what does not match', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ua-kit-rescore-'));
  try {
    for (const c of CELLS) copyCell(dir, c);
    const r1 = cli('run-bench.mjs', dir, ['--rescore']);
    assert.equal(r1.status, 0, r1.stderr);
    assert.equal((r1.stdout.match(/^rescored /gm) ?? []).length, CELLS.length, r1.stdout);
    const csv1 = readFileSync(join(dir, 'runs.csv'));
    assert.ok(csv1.length > 100, 'runs.csv was written');
    const id1 = passId(dir);
    for (const f of metaFiles(dir)) assert.equal(JSON.parse(readFileSync(f, 'utf8')).rescore_id, id1, `${f} carries the pass id`);
    assert.equal(checkRescore(dir).rescore_id, id1);
    assert.equal(aggregate(csv1.toString(), { expectPages: CELLS.length }).pages, CELLS.length);

    // (b) idempotence: same pages, same runner, same rows
    const r2 = cli('run-bench.mjs', dir, ['--rescore']);
    assert.equal(r2.status, 0, r2.stderr);
    const csv2 = readFileSync(join(dir, 'runs.csv'));
    assert.ok(csv2.equals(csv1), 'a second pass changed runs.csv');
    const id2 = passId(dir);
    assert.notEqual(id2, id1, 'a new pass has a new id');

    // (a) one page unreadable: exit 1, the page is named, nothing on disk changed
    unlinkSync(join(dir, 'generations', `${CELLS[1]}.html`));
    const r3 = cli('run-bench.mjs', dir, ['--rescore']);
    assert.notEqual(r3.status, 0, 'a skipped page must fail the pass');
    assert.match(r3.stderr, new RegExp(`SKIPPED ${CELLS[1]}\\.json`));
    assert.match(r3.stderr, /nothing was written/);
    assert.ok(readFileSync(join(dir, 'runs.csv')).equals(csv2), 'runs.csv changed although a page was skipped');
    assert.equal(passId(dir), id2, 'rescore.json changed although a page was skipped');
    for (const f of metaFiles(dir)) assert.equal(JSON.parse(readFileSync(f, 'utf8')).rescore_id, id2, `${f} was rewritten although a page was skipped`);

    // (c) the tree is consistent again once the .html is back (its .json still carries id2), but holds 3 pages: models.json expects more
    copyCell(dir, CELLS[1], ['html']);
    const r4 = cli('aggregate.mjs', dir);
    assert.equal(r4.status, 1);
    assert.match(r4.stderr, /bench incomplet: runs\.csv holds 3 page/);
    // a row appended after the pass: the CSV is no longer the one rescore.json describes
    appendFileSync(join(dir, 'runs.csv'), 'm,m1,en,guide,1,email,x,control,accept,accepted,false,pass,\n');
    assert.throws(() => checkRescore(dir), /bench incomplet: runs\.csv is not the file rescore\.json describes/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// Review of #21, second pass (27/09, reproduced): the runner-error warning went to stderr only and the exit
// code was 0, so `node bench/aggregate.mjs > tables.md` kept a table that looked complete and said nothing.
test('aggregate.mjs on a CSV holding runner errors: exit 1, and the warning is in what stdout keeps', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ua-kit-aggregate-'));
  try {
    const lines = readFileSync(new URL('results/runs.csv', bench), 'utf8').split('\n');
    const [head, first] = lines;
    const cell = first.split(',').slice(0, 5).join(',');   // the first page: its rows become two runner-error rows
    const crashed = ['email', 'website'].map(f => `${cell},${f},,,,,not-testable,,not-testable,runner-error`);
    writeFileSync(join(dir, 'runs.csv'), [head, ...crashed, ...lines.slice(1).filter(l => !l.startsWith(cell + ','))].join('\n'));
    const r = cli('aggregate.mjs', dir);
    assert.equal(r.status, 1, 'runner errors must fail the command');
    assert.match(r.stdout, /2 row\(s\) are runner errors/, 'the warning must be in stdout');
    assert.match(r.stdout, /\| model \| lang \| condition \|/, 'the tables are still printed, under the warning');
    assert.ok(r.stdout.indexOf('runner errors') < r.stdout.indexOf('| model |'), 'the warning comes first');
    // the published file holds none
    const ok = spawnSync(process.execPath, [fileURLToPath(new URL('aggregate.mjs', bench))], { encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stderr);
    assert.doesNotMatch(ok.stdout, /runner errors/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('aggregate refuses a CSV whose page count is not the one models.json describes', () => {
  const cfg = JSON.parse(readFileSync(new URL('models.json', bench), 'utf8'));
  const expectPages = cfg.models.length * cfg.languages.length * cfg.conditions.length * cfg.repeats;
  const csv = readFileSync(new URL('results/runs.csv', bench), 'utf8');
  assert.equal(aggregate(csv, { expectPages }).pages, expectPages, 'the published CSV is complete');
  const lines = csv.split('\n');
  const [head, first] = lines;
  const cell = first.split(',').slice(0, 5).join(',');   // model,model_version,lang,condition,repeat of the first page
  const without = [head, ...lines.slice(1).filter(l => !l.startsWith(cell + ','))].join('\n');
  assert.equal(aggregate(without).pages, expectPages - 1);
  assert.throws(() => aggregate(without, { expectPages }), /bench incomplet: runs\.csv holds \d+ page/);
});
