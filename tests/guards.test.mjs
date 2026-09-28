// Safety guards for the form runner. These tests must stay green for the life of the project.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { loadBattery } from '../src/battery.mjs';
import { checkForm } from '../src/form-runner.mjs';

const fixture = name => new URL(`./fixtures/${name}`, import.meta.url).href;
const battery = loadBattery();
const allValues = new Set(battery.cases.map(c => c.value));

// Decision of 25/09 (Matthieu): a page that validates only on submit was scored "all accepted" because the
// runner never submitted. Now: a local file is submitted after each case, a URL (somebody's live site) never.

// Served over http: under file:// Chromium rejects a POST fetch on its own, which would let this
// test pass with no guard at all (measured 24/09). The server counts what actually arrives.
async function serveFixtures() {
  const received = [];
  const gets = [];
  const server = createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') received.push(req.method);
    else gets.push(req.url);
    const name = req.url.slice(1).split('?')[0];
    // `redirect-<name>` answers 302 to <name>: a target whose final URL is not the one asked for.
    if (name.startsWith('redirect-')) return res.writeHead(302, { location: `/${name.replace(/^redirect-/, '')}` }).end();
    const file = new URL(`./fixtures/${name}`, import.meta.url);
    let body = null;
    try { body = readFileSync(file); } catch { /* 404 below */ }
    if (body) res.writeHead(200, { 'content-type': name.endsWith('.js') ? 'text/javascript' : 'text/html' }).end(body); else res.writeHead(404).end();
  });
  server.on('upgrade', (req, socket) => { gets.push('WS ' + req.url); socket.destroy(); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: name => `http://127.0.0.1:${server.address().port}/${name}`, received, gets, close: () => new Promise(r => server.close(r)) };
}

for (const name of ['form-posts-on-input.html', 'form-posts-on-load.html']) {
  test(`never posts: no non-GET request reaches the server (${name})`, async () => {
    const srv = await serveFixtures();
    try {
      const report = await checkForm(srv.url(name), { keepPage: true });
      assert.ok(report.__page.posts.length > 0, 'the fixture should have tried to POST');
      assert.ok(report.__page.posts.every(p => p === 'blocked'), report.__page.posts.join(','));
      assert.deepEqual(srv.received, [], 'the server received a non-GET request');
    } finally { await srv.close(); }
  });
}

test('types only battery values (a bare domain in a url field: the battery value behind https://)', async () => {
  const domainAsUrl = new Set(battery.cases.filter(c => c.kind === 'domain').map(c => 'https://' + c.value));
  for (const name of ['form-legacy-regex.html', 'form-url-field-native.html']) {
    const report = await checkForm(fixture(name));
    for (const field of Object.values(report.fields)) {
      if (field.status !== 'tested') continue;
      for (const r of field.results) assert.ok(allValues.has(r.typed) || (field.kind === 'url' && domainAsUrl.has(r.typed)), `${r.typed} is not in the battery (${name})`);
    }
  }
});

test('a sanitised guard is reported rewritten and not counted as a failure', async () => {
  // Chromium strips leading/trailing whitespace in type=email; " marie.dupont@example.com" becomes valid.
  const custom = { ...battery, cases: [...battery.cases, { id: 'email-guard-99', kind: 'email', class: 'guard', value: ' marie.dupont@example.com', expect: 'reject', note: 'leading space', ref: 'test' }] };
  const report = await checkForm(fixture('form-native-email.html'), { battery: custom });
  const r = report.fields.email.results.find(x => x.id === 'email-guard-99');
  assert.equal(r.rewritten, true);
  assert.equal(r.outcome, 'rewritten-sanitized');
  assert.equal(report.fields.email.counts.fail, report.fields.email.results.filter(x => x.outcome === 'fail').length);
});

test('a URL is never submitted: the page submit handler is never reached', async () => {
  const srv = await serveFixtures();
  try {
    const report = await checkForm(srv.url('form-native-email.html'), { keepPage: true });
    assert.equal(report.submitExercised, false);
    assert.equal(report.__page.submits, 0);
    assert.equal(report.__page.submitted, undefined);
  } finally { await srv.close(); }
});

test('a submitted page never leaves: no navigation, no request after load', async () => {
  const srv = await serveFixtures();
  try {
    const report = await checkForm(srv.url('form-submits-away.html'), { keepPage: true, submit: true });
    // the page is reloaded before each case, so the counters describe the last case only: read the results
    assert.ok(report.fields.email.results.some(r => r.submitted), 'the fixture should have been submitted');
    assert.equal(report.__finalUrlAfter, srv.url('form-submits-away.html'));
    // the runner reloads the page before each case; any other request (another path, a query string) is a leak
    assert.ok(srv.gets.length > 0 && srv.gets.every(g => g === '/form-submits-away.html'), `requests: ${[...new Set(srv.gets)].join(' ')}`);
    assert.deepEqual(srv.received, []);
  } finally { await srv.close(); }
});

test('a submitted page leaks nothing: iframe target, fetch, image, WebSocket, popup', async () => {
  const srv = await serveFixtures();
  try {
    const report = await checkForm(srv.url('form-leaks-on-submit.html'), { submit: true });
    assert.equal(report.fields.email.status, 'tested');
    // the runner reloads the page before each case; any other request (another path, a query string) is a leak
    assert.ok(srv.gets.length > 0 && srv.gets.every(g => g === '/form-leaks-on-submit.html'), `requests: ${[...new Set(srv.gets)].join(' ')}`);
    assert.deepEqual(srv.received, []);
  } finally { await srv.close(); }
});

test('nothing leaks while the runner reloads the page (pagehide, beforeunload, unload)', async () => {
  const srv = await serveFixtures();
  try {
    const report = await checkForm(srv.url('form-leaks-on-unload.html'), { submit: true, keepPage: true });
    // reloads are replayed from the first load: the proof that they happened is the guard counter, not a second fetch
    assert.ok(report.__guard.reloadFulfilledFromCache > 1, 'the runner should have reloaded the page');
    assert.deepEqual(srv.gets, ['/form-leaks-on-unload.html'], `requests: ${srv.gets.join(' ')}`);
  } finally { await srv.close(); }
});

// ---- Review of #21 (Sonnet 2, Astra A/B/D): a reload is replayed from the first load; nothing leaves ----
const emailCases = n => ({ ...battery, cases: battery.cases.filter(c => c.kind === 'email').slice(0, n) });

test('a page with an external validator is scored with it after every reload; document and script are fetched once', async () => {
  const srv = await serveFixtures();
  try {
    const report = await checkForm(srv.url('form-external-validator.html'), { submit: true, keepPage: true });
    assert.equal(report.fields.email.status, 'tested');
    const eai = report.fields.email.results.filter(r => r.class === 'eai-local' || r.class === 'eai-full');
    assert.ok(eai.length >= 6, 'the battery has EAI cases');
    assert.ok(eai.every(r => r.verdict === 'rejected-script'), eai.map(r => `${r.id}:${r.verdict}`).join(','));
    assert.ok(report.fields.email.results.find(r => r.id === 'email-control-01').verdict === 'accepted');
    assert.deepEqual(srv.gets, ['/form-external-validator.html', '/validator-legacy.js'], `requests: ${srv.gets.join(' ')}`);
    assert.ok(report.__guard.reloadFulfilledFromCache > 2, JSON.stringify(report.__guard));
  } finally { await srv.close(); }
});

test('a navigation the old document fires during a reload is blocked — and the window is proven exercised', async () => {
  const srv = await serveFixtures();
  try {
    const report = await checkForm(srv.url('form-leaks-via-timer.html'), { submit: true, keepPage: true, reloadDelayMs: 50, battery: emailCases(3) });
    assert.ok(report.__guard.reloadNavigationsBlocked > 0, `window not exercised: no navigation reached the guard during a reload (${JSON.stringify(report.__guard)})`);
    const leaks = srv.gets.filter(g => g.startsWith('/leak'));
    assert.deepEqual(leaks, [], `the typed value left the page: ${leaks.join(' ')}`);
    assert.equal(report.fields.email.status, 'tested');
    assert.ok(report.fields.email.results.every(r => r.outcome !== 'not-testable'), JSON.stringify(report.fields.email.results));
  } finally { await srv.close(); }
});

test('window.name does not carry a typed value into the next document', async () => {
  const srv = await serveFixtures();
  try {
    const report = await checkForm(srv.url('form-stashes-in-window-name.html'), { submit: true, keepPage: true, battery: emailCases(3) });
    assert.equal(report.__page.nameAtLoad, '', 'the reloaded document read the previous value from window.name');
    assert.deepEqual(srv.gets.filter(g => g.startsWith('/leak')), []);
  } finally { await srv.close(); }
});

test('a target behind a redirect: the redirect is followed once, reloads replay the final URL', async () => {
  const srv = await serveFixtures();
  try {
    const report = await checkForm(srv.url('redirect-form-native-email.html'), { submit: true, keepPage: true, battery: emailCases(3) });
    assert.equal(report.finalUrl, srv.url('form-native-email.html'));
    assert.deepEqual(srv.gets, ['/redirect-form-native-email.html', '/form-native-email.html'], `requests: ${srv.gets.join(' ')}`);
    assert.equal(report.fields.email.status, 'tested');
    assert.ok(report.fields.email.results.every(r => r.outcome !== 'not-testable'), JSON.stringify(report.fields.email.results));
  } finally { await srv.close(); }
});

test('a page whose fields change on reload: the cases left are not-testable, the results collected stay', async () => {
  const srv = await serveFixtures();
  try {
    const report = await checkForm(srv.url('form-changes-on-reload.html'), { submit: true, battery: emailCases(4) });
    const email = report.fields.email;
    assert.equal(email.status, 'tested');
    assert.ok(['pass', 'fail'].includes(email.results[0].outcome), JSON.stringify(email.results[0]));
    const rest = email.results.slice(1);
    assert.ok(rest.length > 0 && rest.every(r => r.outcome === 'not-testable' && r.reason === 'page-changed-on-reload'), JSON.stringify(email.results));
    assert.equal(email.counts.notTestable, rest.length);
    assert.equal(email.counts.pass + email.counts.fail, 1);
  } finally { await srv.close(); }
});

// ---- Review of #21 (Astra C): a popup or a WebSocket opened before load could carry the value out after it ----
test('a popup opened during load (window.open or a target=_blank link) and a WebSocket from the page never carry the value out', async () => {
  const srv = await serveFixtures();
  try {
    const report = await checkForm(srv.url('form-popup-ws.html'), { submit: true, keepPage: true, battery: emailCases(3) });
    assert.equal(report.fields.email.status, 'tested');
    assert.equal(report.__page.popupOpened, false, 'window.open returned a window');
    assert.equal(report.__pages, 1, 'a popup survived load');
    assert.deepEqual(srv.gets.filter(g => g.startsWith('WS ')), [], `WebSocket upgrades reached the server: ${srv.gets.join(' ')}`);
    assert.deepEqual(srv.received, []);
  } finally { await srv.close(); }
});

test('a dedicated worker alive at load cannot fetch nor open a WebSocket with the typed value after it', async () => {
  const srv = await serveFixtures();
  try {
    const report = await checkForm(srv.url('form-worker-leak.html'), { submit: true, keepPage: true, battery: emailCases(3) });
    assert.equal(report.fields.email.status, 'tested');
    assert.equal(report.__workers, 1, 'the worker should be alive');
    const out = srv.gets.filter(g => g.startsWith('/leak') || g.startsWith('WS '));
    assert.deepEqual(out, [], `the worker got out: ${out.join(' ')}`);
  } finally { await srv.close(); }
});

// ---- Review of #21, second pass (27/09): a worker's socket is not stopped by routeWebSocket ----
// Measured: neither routeWebSocket nor the route guard is ever called for a socket opened in a worker. A socket
// the worker opens DURING the first load does connect (GET requests pass until load), but no value is typed
// into that document: in submit mode the runner reloads the page before every case. In a reloaded document,
// answered from the first load, the worker's socket fails at once (close 1006, no byte sent) — observed on
// Chromium 153 under Playwright 1.63, enforced by nothing in the runner. With the after-load branch of the
// route guard off, reloads go to the network and the worker's fetch and socket both reach the server.
// So this test judges by what arrives: the server completes the handshake and keeps every text frame.
// Its frame reader handles masked frames up to 65 535 octets, unfragmented: enough for a typed value.
async function serveWithSockets(name) {
  const { createHash } = await import('node:crypto');
  const gets = [], frames = [], sockets = new Set();
  const server = createServer((req, res) => {
    gets.push(req.url);
    res.writeHead(200, { 'content-type': 'text/html' }).end(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
  });
  server.on('connection', s => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  server.on('upgrade', (req, socket) => {
    gets.push('WS ' + req.url);
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    socket.on('error', () => {});
    socket.on('data', buf => {
      for (let i = 0; i + 2 <= buf.length;) {
        const op = buf[i] & 0x0f, masked = buf[i + 1] & 0x80;
        let len = buf[i + 1] & 0x7f; i += 2;
        if (len === 126) { len = buf.readUInt16BE(i); i += 2; }
        const mask = masked ? buf.subarray(i, i + 4) : null;
        if (masked) i += 4;
        const payload = Buffer.from(buf.subarray(i, i + len)); i += len;
        if (mask) for (let k = 0; k < payload.length; k++) payload[k] ^= mask[k % 4];
        if (op === 1) frames.push(payload.toString('utf8'));
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}/${name}`, gets, frames, close: () => new Promise(r => { for (const s of sockets) s.destroy(); server.close(() => r()); }) };
}

test('a socket a worker opened during load never carries a typed value: no value is typed into the first document', async () => {
  const srv = await serveWithSockets('form-worker-early-socket.html');
  try {
    const report = await checkForm(srv.url, { submit: true, keepPage: true, battery: emailCases(3) });
    assert.equal(report.fields.email.status, 'tested');
    assert.ok(report.__guard.reloadFulfilledFromCache > 2, 'the runner should have reloaded the page');
    // the window is proven open: the worker's socket did connect, once, during the first load
    assert.deepEqual(srv.gets.filter(g => g.startsWith('WS ')), ['WS /ws-early'], `sockets: ${srv.gets.join(' ')}`);
    assert.deepEqual(srv.frames, [], `values reached the server over the worker's socket: ${srv.frames.join(' ')}`);
  } finally { await srv.close(); }
});

test('the runner source never clicks a button nor dispatches a synthetic submit', () => {
  const src = readFileSync(new URL('../src/form-runner.mjs', import.meta.url), 'utf8');
  for (const forbidden of ["dispatchEvent('submit'", 'dispatchEvent("submit"', "click('button", 'click("button', '.submit()']) {
    assert.ok(!src.includes(forbidden), `form-runner.mjs must not contain ${forbidden}`);
  }
});
