import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchCatalogue, normalise } from '../src/catalogue-match.mjs';
import { checkForm } from '../src/form-runner.mjs';
import { renderMarkdown } from '../src/report.mjs';

const catalogue = JSON.parse(readFileSync(new URL('../patterns/catalogue.json', import.meta.url), 'utf8'));

test('finds a variant of the 2-4 TLD cap in an inline script', () => {
  const scripts = [{ url: 'inline#0', text: 'const EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,4}$/;' }];
  const hits = matchCatalogue(scripts, catalogue);
  assert.ok(hits.some(h => h.id === 'tld-2-4-cap'), JSON.stringify(hits));
  assert.ok(hits.some(h => h.id === 'rei-simple-email'));
});

test('whitespace differences do not hide a match', () => {
  assert.equal(normalise('a  b\n c'), 'a b c');
  const scripts = [{ url: 'inline#0', text: 'x = /\\.[a-z]{2,4}$/ ;' }];
  assert.ok(matchCatalogue(scripts, catalogue).some(h => h.id === 'tld-2-4-cap'));
});

test('an entry without source_url is reported as a family, never with a URL', () => {
  const scripts = [{ url: 'inline#0', text: 'x = /^[^@]+@[^@]+\\.[a-z]{2,4}$/;' }];
  const hits = matchCatalogue(scripts, catalogue);
  assert.ok(hits.some(h => h.id === 'tld-2-4-cap' && h.source_url === null));
});

test('no false hit on a UA-ready validator', () => {
  const scripts = [{ url: 'inline#0', text: "import { isValidEmail } from 'ua-agent-kit';" }];
  assert.deepEqual(matchCatalogue(scripts, catalogue), []);
});

test('the report wording is fixed', async () => {
  const r = await checkForm(new URL('./fixtures/form-legacy-regex.html', import.meta.url).href, { lang: 'fr' });
  assert.ok(r.catalogue.length > 0, 'legacy fixture must hit the catalogue');
  const md = renderMarkdown(r);
  assert.match(md, /matches the pattern published at https?:\/\//);
  assert.doesNotMatch(md, /copied from|comes from|trained on/i);
});

// ---- Review of PR #19 (25/09): external scripts were read after the post-load lock ----
import { createServer } from 'node:http';

async function serve() {
  const gets = [];
  const server = createServer(async (req, res) => {
    gets.push(req.url);
    // `slow-<name>` serves <name> after 700 ms: a script read that waits on the network leaves time for the page.
    const name = req.url.slice(1).split('?')[0];
    if (name.startsWith('slow-')) await new Promise(r => setTimeout(r, 700));
    if (name.startsWith('redirect-')) return res.writeHead(302, { location: `/${name.replace(/^redirect-/, '')}` }).end();
    let body;
    try { body = readFileSync(new URL(`./fixtures/${name.replace(/^slow-/, '')}`, import.meta.url)); }
    catch { return res.writeHead(404).end(); }
    res.writeHead(200).end(body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: name => `http://127.0.0.1:${server.address().port}/${name}`, gets, close: () => new Promise(r => server.close(r)) };
}

for (const submit of [true, false]) {
  test(`an external script is read and matched (submit ${submit})`, async () => {
    const srv = await serve();
    try {
      const r = await checkForm(srv.url('form-external-script.html'), { submit });
      assert.ok(r.catalogue.some(h => h.id === 'tld-2-4-cap' && h.script.endsWith('/legacy-validate.js')), JSON.stringify(r.catalogue));
      assert.deepEqual(r.catalogueUnread.map(u => [u.script.split('/').pop(), u.reason]), [['missing.js', 'http 404']]);
      assert.equal(r.fields.email.status, 'tested');
      assert.match(renderMarkdown(r), /not read: .*missing\.js \(http 404\)/);
    } finally { await srv.close(); }
  });
}

// Review of #20 (Sonnet, reproduced): reading scripts before the lock let a page navigate out with a value.
test('reading scripts never opens a window for the page to navigate out', async () => {
  const srv = await serve();
  try {
    const r = await checkForm(srv.url('form-navigates-after-load.html'), { submit: true });
    assert.deepEqual(srv.gets.filter(u => u.startsWith('/leaked')), [], 'the page navigated out');
    assert.ok(r.catalogue.some(h => h.id === 'tld-2-4-cap'), JSON.stringify(r.catalogue));
    assert.equal(srv.gets.filter(u => u.includes('legacy-validate')).length, 1, 'a script is fetched once, by the page');
  } finally { await srv.close(); }
});

// Review of d92d9b7 (Sonnet, reproduced): a script behind a redirect was reported unread (http 302).
test('a script behind a redirect is read from its final response', async () => {
  const srv = await serve();
  try {
    const r = await checkForm(srv.url('form-external-redirect.html'), { submit: true });
    assert.ok(r.catalogue.some(h => h.id === 'tld-2-4-cap' && h.script.endsWith('/redirect-legacy-validate.js')), JSON.stringify(r.catalogue));
    assert.deepEqual(r.catalogueUnread, []);
  } finally { await srv.close(); }
});
