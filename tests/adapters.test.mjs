import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, copyFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildAdapters, render } from '../scripts/build-adapters.mjs';

const guideUrl = new URL('../GUIDE.md', import.meta.url);
const guide = readFileSync(guideUrl, 'utf8');

// Builds happen in a scratch copy: a test that writes into adapters/ would repair the very
// drift that `npm run check:adapters` runs after it in CI to detect.
function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'ua-adapters-'));
  copyFileSync(guideUrl, join(dir, 'GUIDE.md'));
  return { dir, root: pathToFileURL(dir + '/') };
}

test('every adapter embeds the guide body verbatim', () => {
  const out = render(guide);
  const body = guide.slice(guide.indexOf('## What is valid'));
  for (const [path, text] of Object.entries(out)) assert.ok(text.includes(body), `${path} must embed the guide body`);
});

test('claude-code skill has the required frontmatter', () => {
  const out = render(guide);
  assert.match(out['adapters/claude-code/SKILL.md'], /^---\nname: ua-ready-validation\ndescription: .+\n---\n/);
});

test('every adapter states the licence', () => {
  for (const [path, text] of Object.entries(render(guide))) assert.ok(text.includes('CC BY 4.0'), `${path} must state the licence`);
});

test('a guide without the embedded heading is refused, not silently truncated', () => {
  assert.throws(() => render('# A guide\n\nNo such section.\n'), /What is valid/);
});

test('check mode reports no drift after a build', () => {
  const { root } = scratch();
  assert.equal(buildAdapters({ check: false, root }).changed.length, 4);
  assert.deepEqual(buildAdapters({ check: true, root }).changed, []);
});

test('check mode reports a hand-edited adapter and does not repair it', () => {
  const { dir, root } = scratch();
  buildAdapters({ check: false, root });
  appendFileSync(join(dir, 'adapters/AGENTS.md'), 'hand edit\n');
  assert.deepEqual(buildAdapters({ check: true, root }).changed, ['adapters/AGENTS.md']);
  assert.ok(readFileSync(join(dir, 'adapters/AGENTS.md'), 'utf8').endsWith('hand edit\n'));
});

test('the committed adapters match GUIDE.md (read-only)', () => {
  assert.deepEqual(buildAdapters({ check: true }).changed, []);
});
