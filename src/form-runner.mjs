import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import * as pw from 'playwright';
import { loadBattery } from './battery.mjs';
import { findFields } from './field-finder.mjs';
import { decide, evidence, sameOwn, readState } from './verdict.mjs';
import { matchCatalogue, collectScripts } from './catalogue-match.mjs';
import { recordResponses, recorded } from './replay.mjs';

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const CATALOGUE = JSON.parse(readFileSync(new URL('../patterns/catalogue.json', import.meta.url), 'utf8'));
const LOCALE = { en: 'en-GB', fr: 'fr-FR', es: 'es-ES' };
const SETTLE_MS = 60;        // script validators run synchronously on input/blur; 300 ms made the suite exceed 5 min (measured 24/09)
const FILL_TIMEOUT_MS = 5000;
const BASELINE = { email: 'ana.garcia@example.com', domain: 'example.com', url: 'https://example.com' };
// A second plain value: what the field shows for it must be what it showed for the baseline, or the page writes of
// each value something the runner cannot follow from one value to the next. No `www.`: pages have a word to say
// about it ("no need for www"), and the field would be lost for that (fourth review of the correction).
const SECOND = { email: 'marie.dupont@example.com', domain: 'example.org', url: 'https://example.org' };
const NO_VALUE = 'x';        // no @, no dot, no scheme: what a page says of it is what it says of a value it refuses

export function toUrl(target) {
  if (/^https?:\/\//i.test(target) || target.startsWith('file://')) return target;
  return pathToFileURL(target).href;
}

// Plausible values for the other fields of the form, so that a validator run on submit judges only the
// probed field (an empty required name would otherwise show an error and read as a rejection).
// A field neither `required` nor of type hidden is doubtful: it may be a trap a person never sees, and a page that
// drops a submit with a trap filled reads every value as accepted (review of 09/10, finding 5). With
// `leaveDoubtful` those fields stay empty. Returns how many doubtful fields the form offers to fill.
function fillCompanions({ sel, leaveDoubtful = false }) {
  const el = document.querySelector(sel);
  if (!el.form) return 0;
  let doubtful = 0;
  const left = n => { if (n.required || n.type === 'hidden') return false; doubtful += 1; return leaveDoubtful; };
  const set = (n, v) => { if (left(n)) return; n.value = v; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); };
  for (const n of el.form.querySelectorAll('input, textarea, select')) {
    if (n === el || n.disabled || n.readOnly || n.value !== '' && !['checkbox', 'radio'].includes(n.type) && n.tagName !== 'SELECT') continue;
    const t = (n.type || 'text').toLowerCase();
    if (t === 'checkbox') { if (n.required && !n.checked) { n.checked = true; n.dispatchEvent(new Event('change', { bubbles: true })); } }
    else if (t === 'radio') { if (n.required && !el.form.querySelector(`input[type=radio][name="${CSS.escape(n.name)}"]:checked`)) { n.checked = true; n.dispatchEvent(new Event('change', { bubbles: true })); } }
    else if (n.tagName === 'SELECT') { const o = [...n.options].find(x => x.value !== ''); if (o && n.value === '' && !left(n)) { n.value = o.value; n.dispatchEvent(new Event('change', { bubbles: true })); } }
    else if (t === 'password') set(n, 'Str0ng-Passw0rd!2026');
    else if (t === 'email' || /mail|courriel|correo/i.test(n.name + n.id)) set(n, 'ana.garcia@example.com');
    else if (t === 'url' || /site|web|url/i.test(n.name + n.id)) set(n, 'https://example.com');
    else if (t === 'tel') set(n, '+33123456789');
    else if (['text', 'search', ''].includes(t) || n.tagName === 'TEXTAREA') set(n, 'Ana Garcia');
  }
  return doubtful;
}

// A "confirm your email" field must follow the probed value, or every case reads as a mismatch.
function syncConfirm(sel) {
  const el = document.querySelector(sel);
  if (!el.form) return;
  const CONFIRM = /confirm|repeat|again|verif|retype|re-?enter|confirmation|répét|repet|confirmar|repetir/i;
  for (const n of el.form.querySelectorAll('input')) {
    if (n === el || n.type !== el.type && !(el.type === 'text' && n.type === 'email')) continue;
    const label = n.labels && n.labels[0] ? n.labels[0].textContent : '';
    if (!CONFIRM.test(n.name + ' ' + n.id + ' ' + label + ' ' + (n.placeholder || ''))) continue;
    n.value = el.value;
    n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// A case the runner could not bring to the page: it keeps its place in the results, with the reason, and
// is never counted as a pass or a fail.
const untested = (c, reason) => ({ id: c.id, class: c.class, expect: c.expect, typed: null, observed: null, submitted: false, verdict: 'not-testable', rewritten: false, outcome: 'not-testable', reason });

async function probeField(tab, selector, kind, cases, { submit = false, fresh = async () => ({ ok: true }), leaveDoubtful = false, seen = {} } = {}) {
  // every reload brings a new page (see `fresh` in checkForm): the field is looked up on the current one
  const loc = () => tab.page.locator(selector).first();
  // `seen.doubtful`: the form offered a doubtful field to fill at least once (see fillCompanions)
  const fill = async () => { if (await tab.page.evaluate(fillCompanions, { sel: selector, leaveDoubtful }) > 0) seen.doubtful = true; };
  const results = [];
  // fill() does not hit-test (Playwright 1.63): it types through a consent overlay. A trial click runs
  // the actionability and hit-target checks and dispatches no event, so a covered or disabled field
  // is reported not-testable instead of being probed behind a banner (measured 25/09).
  // A fresh page before the actionability check: the previous field's last submit may have hidden the form.
  if (submit) { const f = await fresh(); if (!f.ok) return { status: 'not-testable', reason: f.reason }; }
  try {
    await loc().click({ trial: true, timeout: FILL_TIMEOUT_MS });
  } catch {
    return { status: 'not-testable', reason: 'not-interactable' };
  }
  // What the page shows before any value is typed. The baseline is read against it: a baseline value the page
  // itself refuses would otherwise become the reference state, and every later refusal in the same words would
  // read as accepted (measured 07/10 on the two benches: 38 text website fields refuse `example.com`, 37 of them
  // because they ask for a scheme, docs/qc/2026-10-07_baseline-refused/).
  const pristine = await tab.page.evaluate(readState, selector);
  let before = pristine, baseline = null;
  if (submit) {
    // Baseline: one submit with a plain ASCII value in the probed field. Whatever the page then says about
    // the other fields (a confirm-email mismatch, a website format it wants differently) is already in
    // `before`, so only what changes with the probed value counts as a rejection.
    const submitBaseline = async value => {
      await fill();
      // the document receives a value: the next reload must bring another one (see `fresh`)
      await tab.page.evaluate(() => { window.__uaProbed = true; }).catch(() => {});
      // a baseline that could not be typed is not a baseline: read as one, it made every case a refusal or
      // none (third review of #6: a fill timing out on a loaded machine was swallowed here)
      try { await loc().fill(value, { timeout: FILL_TIMEOUT_MS }); }
      catch { throw Object.assign(new Error('not-interactable'), { notTestable: true }); }
      await tab.page.evaluate(syncConfirm, selector);
      await tab.page.evaluate(sel => { const f = document.querySelector(sel).form; if (f) f.requestSubmit(); }, selector).catch(() => {});
      await tab.page.waitForTimeout(SETTLE_MS);
      return tab.page.evaluate(readState, selector);
    };
    // What the field gained with a value (a text, a mark of refusal); a form hidden after an accepted submit
    // only loses texts, and that is not a refusal. Texts elsewhere in the form may speak of another field
    // (`error-text`), which the baseline is there to absorb.
    const gained = state => { const e = evidence(pristine, state); return [...(e.mismatch && e.enforced ? ['native'] : []), ...e.signals.filter(x => x !== 'error-text')]; };
    // What the page makes of a plain value:
    //  `taken`    the field gained nothing, or a text the page does not write for NO_VALUE (a praise, a hint
    //             shown next to an error written elsewhere);
    //  `refused`  the field gained a mark of refusal (aria-invalid, an error class, a custom validity, an
    //             enforced mismatch);
    //  `as-no-value`  a text and nothing else, and the whole form reads exactly as it does for NO_VALUE: a
    //             page refusing both, or a hint shown for any value. The two cannot be told apart.
    let noValue;
    const reading = async state => {
      const g = gained(state);
      if (!g.length) return 'taken';
      if (g.some(x => x !== 'field-text')) return 'refused';
      if (noValue === undefined) {
        const f = await fresh();
        if (!f.ok) throw Object.assign(new Error(f.reason), { notTestable: true });
        noValue = await submitBaseline(NO_VALUE);
      }
      const elsewhere = x => JSON.stringify([...x.errorTexts].sort());
      return sameOwn(state, noValue) && elsewhere(state) === elsewhere(noValue) ? 'as-no-value' : 'taken';
    };
    let read;
    try {
      before = await submitBaseline(BASELINE[kind]);
      read = await reading(before);
      // `showed`: the field gained something with the baseline. When that is not held a refusal it is still
      // said: a page that words each refusal differently and refuses the baseline cannot be told from one
      // that praises it.
      baseline = { typed: BASELINE[kind], refused: read === 'refused', schemeRequired: false, showed: gained(before).length > 0 };
      // A text field that does not take the bare domain and takes the same domain with a scheme asks for a URL,
      // as a field of type url does: decision D1 below applies to it, and the field is reported with the url kind.
      if (read !== 'taken' && kind === 'domain') {
        const f = await fresh();
        if (!f.ok) return { status: 'not-testable', reason: f.reason };
        const withScheme = await submitBaseline(BASELINE.url);
        if (await reading(withScheme) === 'taken') { kind = 'url'; before = withScheme; read = 'taken'; baseline = { typed: BASELINE.url, refused: false, schemeRequired: true, showed: gained(before).length > 0 }; }
      }
      // The baseline is taken. A second plain value must leave the field as the baseline left it. When it does
      // not, the page writes of each value something the runner cannot follow (a copy of it masked, reversed,
      // in A-labels): every valid value would read as refused, so no verdict is given (three reviews of #6 and
      // #7 each found one more such copy).
      if (read === 'taken') {
        const f = await fresh();
        if (!f.ok) return { status: 'not-testable', reason: f.reason };
        const second = await submitBaseline(kind === 'url' ? SECOND.url : SECOND[kind]);
        if (!sameOwn(before, second)) return { status: 'not-testable', reason: 'value-dependent-text' };
      }
    } catch (e) {
      if (e.notTestable) return { status: 'not-testable', reason: e.message };
      throw e;
    }
    // Nothing separates what the page says of a plain value from what it says of NO_VALUE: no verdict can be
    // read on this field, and none is given.
    if (read === 'as-no-value') return { status: 'not-testable', reason: 'baseline-ambiguous' };
    // The page refuses every form of the baseline: what it says of the field for a plain value cannot serve as
    // the reference, so the field is read against the page as it loaded and its refusals count as refusals.
    // What the baseline showed elsewhere in the form is kept.
    if (baseline.refused) before = { ...pristine, errorTexts: before.errorTexts };
  }
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    // In submit mode every case starts from a freshly loaded page: after a "valid" submit many pages hide
    // the form behind a receipt, reset it, or keep a "tried" flag that changes later verdicts (measured
    // 25/09 on a GLM 5.3 page: form.hidden = true, the next fill timed out).
    if (submit) {
      // A reload that fails, or that lands on a page whose fields are not the ones probed so far, ends this
      // field here: the cases left are reported not-testable with the reason, the results already collected
      // are kept, and the other field is still probed (review of #21: one failed reload cost a whole page).
      const f = await fresh();
      if (!f.ok) { for (const rest of cases.slice(i)) results.push(untested(rest, f.reason)); break; }
      await fill();
    }
    // Decision D1 (Matthieu, 25/09): a field that asks for an absolute URL (type url, or a text field that
    // refused the bare baseline and took it with a scheme, see above) gets a bare domain typed
    // with `https://` in front. <input type="url"> rejects `example.com` itself, whatever the page's script
    // does; on the bench every website-field failure of the classes ascii-tld-long, idn-ulabel and control
    // was a bare domain rejected-native — a property of the field type, not of the page's UA. The `url`
    // cases are typed as they are; `rewritten` is judged against what was actually typed.
    const typed = kind === 'url' && c.kind === 'domain' ? 'https://' + c.value : c.value;
    // Marks the document about to receive a value: a reload that leaves this marker in place did not bring a new document.
    await tab.page.evaluate(() => { window.__uaProbed = true; }).catch(() => {});
    try {
      await loc().fill(typed, { timeout: FILL_TIMEOUT_MS });
    } catch {
      // As for a failed reload: the cases measured so far stay, the ones left are not-testable with the reason
      // (review of 09/10, finding 3: one fill failing late in the loop threw every verdict of the field away).
      if (!results.length) return { status: 'not-testable', reason: 'not-interactable' };
      for (const rest of cases.slice(i)) results.push(untested(rest, 'not-interactable'));
      break;
    }
    if (submit) await tab.page.evaluate(syncConfirm, selector);
    await loc().dispatchEvent('change');
    await loc().blur();
    await tab.page.waitForTimeout(SETTLE_MS);
    let submitted = false;
    if (submit) {
      // requestSubmit() runs native constraint validation, then the page's own submit handlers. The
      // default action is cancelled by the init script and any navigation is aborted by the route guard,
      // so nothing leaves the page. A native block (invalid field) means the event never fires.
      const n0 = await tab.page.evaluate(() => window.__uaSubmits ?? 0);
      await tab.page.evaluate(sel => { const f = document.querySelector(sel).form; if (f) f.requestSubmit(); }, selector).catch(() => {});
      await tab.page.waitForTimeout(SETTLE_MS);
      submitted = (await tab.page.evaluate(() => window.__uaSubmits ?? 0)) > n0;
    }
    const after = await tab.page.evaluate(readState, selector);
    const d = decide(c, typed, before, after, { submitted });
    // what was read goes with the verdict (mismatch, enforced, signals): a result can be checked against it
    results.push({ id: c.id, class: c.class, expect: c.expect, typed, observed: after.value, submitted, ...evidence(before, after), ...d });
    if (!submit) {
      await loc().fill('', { timeout: FILL_TIMEOUT_MS }).catch(() => {});
      await loc().blur().catch(() => {});
    }
  }
  return { status: 'tested', selector, kind, submitExercised: submit, baseline, results, counts: tally(results, submit) };
}

function tally(results, submit) {
  // Submit mode, the event never fired and nothing else rejected the value (a required field the runner
  // could not fill blocked native validation): those cases were not exercised and must be said so. A value
  // the field itself rejects natively also blocks the submit; that one is a rejection, not a gap.
  const counts = { pass: 0, fail: 0, rewritten: 0, notObserved: 0, notTestable: 0, notSubmitted: submit ? results.filter(r => !r.submitted && r.verdict === 'no-rejection-observed').length : 0, byClass: {} };
  for (const r of results) {
    if (r.outcome === 'not-testable') { counts.notTestable += 1; continue; }
    if (r.outcome === 'not-observed') { counts.notObserved += 1; continue; }   // neither pass nor fail: out of the class rates too
    const b = (counts.byClass[r.class] ??= { total: 0, pass: 0 });
    b.total += 1;
    if (r.outcome === 'pass') { counts.pass += 1; b.pass += 1; }
    else if (r.outcome === 'fail') counts.fail += 1;
    if (r.rewritten) counts.rewritten += 1;
  }
  return counts;
}

// Finding 5 (review of 09/10): no rule on what a person sees told a trap from a visible field a person fills
// (two corrections rejected, each by a layout built in minutes). So the field is probed twice: with every
// companion filled as before, and with the doubtful ones left empty. A verdict is kept only when both probes give
// it; the others are reported not-testable. Every reload is a new context (see `fresh`): the second probe, and the
// email field's submits before the website field, leave nothing a later document can read (review of PR #9, a page
// counting its submits in IndexedDB read the website field otherwise than with a single probe).
async function probeTwice(tab, selector, kind, cases, opts) {
  const seen = {};
  const a = await probeField(tab, selector, kind, cases, { ...opts, seen });
  if (!seen.doubtful || a.status !== 'tested') return a;
  const b = await probeField(tab, selector, kind, cases, { ...opts, leaveDoubtful: true });
  if (b.status !== 'tested' || b.kind !== a.kind) return { status: 'not-testable', reason: 'fill-dependent' };
  const results = a.results.map((r, i) => {
    const o = b.results[i];
    if (r.outcome === 'not-testable' || o.outcome === r.outcome && o.verdict === r.verdict) return r;
    return untested(cases[i], o.outcome === 'not-testable' ? o.reason : 'fill-dependent');
  });
  return { ...a, results, counts: tally(results, opts.submit) };
}

const NOT_TESTABLE = reason => ({ email: { status: 'not-testable', reason }, website: { status: 'not-testable', reason } });
const FIELD_KEYS = ['email', 'website', 'websiteType', 'emailKey', 'websiteKey'];
// What Playwright says when a navigation is cut short by another one, or the document is torn down under it.
const NAV_RACE = /net::ERR_ABORTED|interrupted by another navigation|Execution context was destroyed|frame was detached|Navigating frame was detached/;
const RELOAD_ATTEMPTS = 3;   // the first try and two more
const sameFields = (a, b) => FIELD_KEYS.every(k => a[k] === b[k]);
const noHash = u => u.split('#')[0];   // a fragment never reaches a server; a page setting one at load is still the same page

/** `submit`: dispatch the form's submit event after each case (default: only for a local file, never for a
 *  URL, which is somebody's live site).
 *  `reloadDelayMs` (tests only): holds the runner's reload for that long after the reload lock is armed and
 *  before the navigation is issued, i.e. widens the window in which the old document still runs.
 *  `reloadInPlace` (tests only): reloads in the same context, as before every reload had a context of its own, so
 *  that a fixture can count its documents in IndexedDB and change after a number of them; the runner's handling of
 *  a page that changes, or stops bringing a new document, is tested that way. */
export async function checkForm(target, { engine = 'chromium', lang = 'en', battery = loadBattery(), keepPage = false, submit = !/^https?:\/\//i.test(target), reloadDelayMs = 0, reloadInPlace = false } = {}) {
  // No shared worker, ever: its requests never come through the route guard, so one that a page fed the typed
  // value sent it out after load, POST included, on every case (measured 12/10 on main, Chromium 153: 228 requests
  // in one run). The switch removes the constructor in every frame; the init script below does it in every engine.
  const browser = await pw[engine].launch(engine === 'chromium' ? { args: ['--disable-shared-workers'] } : {});
  let stopWorkers = async () => {};
  const report = { target, finalUrl: null, title: null, engine, engineVersion: browser.version(), date: new Date().toISOString(), battery: battery.version, submitExercised: submit, fields: {}, catalogue: [] };
  try {
    // Guarantee: nothing but GET/HEAD leaves the page, armed before the first request so that a
    // script running during load cannot slip a POST in before the guard exists.
    // After load, in submit mode, nothing goes out at all — any frame, any request type: a submit handler
    // can leak the typed value through an iframe-targeted GET form, fetch, an image, a popup. Navigations
    // are answered 204 (Chromium commits an error page for an aborted navigation; a 204 leaves the
    // document in place), everything else is aborted. Before load, and on a URL, GET/HEAD pass as before.
    let loaded = false;
    let reloading = false; // the runner's own reloads, never the page's
    let finalUrl = null;   // the URL the first load ended on; every reload must end there too
    let recording = null;  // the responses of the first load, replayed on every reload
    const guard = { reloadNavigationsBlocked: 0, reloadRequestsAborted: 0, reloadFulfilledFromCache: 0, postNavigationsAnswered: 0, workersStopped: 0 };
    const guardRoute = async route => {
      const r = route.request();
      const m = r.method();
      if (m !== 'GET' && m !== 'HEAD') {
        // A POST the page sends as a navigation of its own on submit (the form's submit method called from its
        // handler, or a handler that stops the event before the init script's preventDefault): aborted, Chromium
        // commits an error page and the field is lost (review of 09/10: the whole page became runner-error).
        // Answered 204 here like a GET navigation, it never leaves either.
        if (loaded && submit && r.isNavigationRequest()) {
          guard.postNavigationsAnswered += 1;
          if (reloading) guard.reloadNavigationsBlocked += 1;
          return route.fulfill({ status: 204 });
        }
        return route.abort('blockedbyclient');
      }
      if (loaded && submit) {
        if (reloading) {
          // The runner's own reload is answered from the first load: the document and every sub-resource
          // come from the cache, so the page is tested with its own validator each time and no request
          // leaves. The cache was closed at load, before any value was typed, so no cached URL carries one.
          // Everything else is blocked as after load — a navigation the old document fires with the typed
          // value in its query string reached the server in 1 run out of 3 through this window when only
          // the URL was checked (review of #21, reproduced with a timer-driven navigation).
          const entry = await recorded(recording.cache, r.url());
          if (entry) { guard.reloadFulfilledFromCache += 1; return route.fulfill(entry); }
          if (r.isNavigationRequest()) { guard.reloadNavigationsBlocked += 1; return route.fulfill({ status: 204 }); }
          guard.reloadRequestsAborted += 1;
          return route.abort('blockedbyclient');
        }
        return r.isNavigationRequest() ? route.fulfill({ status: 204 }) : route.abort('blockedbyclient');
      }
      return route.continue();
    };
    // The page's own WebSockets: in submit mode none may open, at any time — one opened before load would
    // still be connected after it and carry the typed value (review of #21, Astra C). A form under test needs
    // no WebSocket; on a URL they pass as before.
    // A worker's socket does not come through here: measured 27/09, neither this callback nor the route guard
    // above is ever called for it. What is observed, not enforced by this code:
    //  - in the first document a worker's socket does connect (GET passes until load), but no value is typed
    //    into that document: in submit mode the page is reloaded before every case;
    //  - in a reloaded document, which the route guard answers from the first load, a worker's socket fails
    //    at once (error, close 1006, no byte sent). With that guard off the reloads go to the network and the
    //    worker's socket reaches the server.
    // The second point is how Chromium 153 behaves under Playwright 1.63, not a rule written here. The test
    // "a socket a worker opened during load…" reads the frames a server receives: it fails if that changes.
    // To check again on every Playwright or Chromium upgrade.
    const guardSocket = ws => { if (submit) ws.close(); else ws.connectToServer(); };
    // Counts submit events (capture, before the page's handlers) and cancels the default action (bubble,
    // after them). Registered before any page script.
    const initScript = () => {
      // window.name survives a navigation: a value stashed there by the previous document would reach this one.
      window.name = '';
      // No popup, ever: a same-origin popup opened during load could read the opener's field after it (Astra C).
      window.open = () => null;
      try { delete window.SharedWorker; } catch { /* not configurable */ }
      window.SharedWorker = undefined;
      window.addEventListener('submit', () => { window.__uaSubmits = (window.__uaSubmits ?? 0) + 1; }, true);
      window.addEventListener('submit', e => e.preventDefault());
      // Requests sent while a document unloads are not reliably intercepted by the route guard (measured
      // 25/09: images fired from pagehide/unload reached the server with the typed value). So the page's own
      // teardown handlers never run: these listeners are registered first and stop the event for the rest.
      for (const type of ['pagehide', 'unload', 'beforeunload']) window.addEventListener(type, e => e.stopImmediatePropagation(), true);
      document.addEventListener('visibilitychange', e => e.stopImmediatePropagation(), true);
    };
    // A context of its own for the first load and for every reload of the runner, each armed with the guards
    // above before its first request. Storage of every kind (localStorage, sessionStorage, cookies, IndexedDB,
    // Cache Storage) and history belong to the context: a new one starts with none, in every engine and on
    // file:// as on http (review of PR #9: a page counting its submits in IndexedDB read the website field
    // otherwise than on main). Closing the old one first ends its document and its timers, which could write
    // storage again between a clear and the reload (review of 09/10, finding 6).
    let context = null, page = null;
    const open = async () => {
      // Service workers are blocked: their requests can escape route interception.
      context = await browser.newContext({ locale: LOCALE[lang] ?? 'en-GB', serviceWorkers: 'block', userAgent: `ua-agent-kit/${VERSION} (+https://github.com/guia-matthieu/ua-agent-kit)` });
      await context.route('**/*', guardRoute);
      await context.routeWebSocket(/.*/, guardSocket);
      await context.addInitScript(initScript);
      page = await context.newPage();
      // Any other page of this context is a popup the page opened without window.open (a target=_blank link,
      // a form target): closed as soon as it exists, whatever the moment. Registered after our own page.
      context.on('page', p => p.close().catch(() => {}));
    };
    // A dedicated worker is cut off from the route guard while its document goes away, before it stops: a timer of
    // its own sent the typed value out in that window (review of PR #10, 5 runs in 32 under load). So every worker
    // is closed from inside, while the guard still holds it, before its document is replaced or its context closed.
    // A worker that does not answer in time is left to the close as before.
    stopWorkers = async () => {
      for (let round = 0; round < 3 && page.workers().length; round++) {
        await Promise.all(page.workers().map(w => Promise.race([
          new Promise(resolve => w.once('close', () => { guard.workersStopped += 1; resolve(); })),
          w.evaluate(() => globalThis.close()).then(() => new Promise(() => {}), () => {}),
          new Promise(resolve => setTimeout(resolve, 1000)),
        ])));
      }
    };
    await open();
    // what probeField types into: the page of the current context, which every reload replaces
    const tab = { get page() { return page; } };
    recording = recordResponses(page);
    try {
      await page.goto(toUrl(target), { waitUntil: 'load', timeout: 30000 });
    } catch (err) {
      return { ...report, fields: NOT_TESTABLE('load-error'), error: String(err.message) };
    }
    loaded = true;   // the lock goes on first: nothing below may open a window for the page
    recording.stop();
    // Script bodies come from the responses recorded during load, never from a request made after it: in
    // submit mode the lock aborts those, which emptied every external script (measured 25/09: 2 hits → 0),
    // and reading them before the lock let a page navigate out (review of #20). A catalogue failure is
    // reported apart and never costs the field verdicts.
    try {
      const scripts = await collectScripts(page, recording.cache);
      report.catalogue = matchCatalogue(scripts, CATALOGUE);
      report.catalogueUnread = scripts.filter(s => s.unread).map(s => ({ script: s.url, reason: s.unread }));
    } catch (e) { report.catalogueError = String(e.message).split('\n')[0]; }
    finalUrl = page.url();
    report.finalUrl = finalUrl;
    report.title = await page.title();
    const found = await findFields(page);

    const fresh = async () => {
      // A reload cut short by a navigation of the page's own (its timer fired, it reloaded itself) is tried
      // again, up to RELOAD_ATTEMPTS times, with the network guard unchanged; any other error propagates.
      // Review of #21: one such race turned a whole page into runner-error and lost the results collected.
      for (let attempt = 1; ; attempt++) {
        reloading = true;
        try {
          // the old document still runs during this delay, under the reload lock
          if (reloadDelayMs) await new Promise(resolve => setTimeout(resolve, reloadDelayMs));
          // The reload is a load in a new context: no storage, no history, and no same-document navigation to
          // a URL with a fragment (review of 09/10: a page setting location.hash at load had its field reload-failed).
          await stopWorkers();
          if (reloadInPlace) {
            await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* opaque origin */ } }).catch(() => {});
            await context.clearCookies();
            if (finalUrl.includes('#')) await page.goto('about:blank');
          } else {
            await context.close();
            await open();
          }
          // In submit mode the reload is answered from the cache and takes milliseconds. A navigation the page
          // fires while it is under way can cancel it without any error: the competing navigation gets
          // a 204 and commits nothing, and goto waits for a load that never comes (measured 28/09 on Linux,
          // Playwright 1.63 image: 1 run in 6 of the timer fixture). There a timeout is that race, and is retried.
          await page.goto(finalUrl, { waitUntil: 'load', timeout: submit ? 10000 : 30000 });
        } catch (e) {
          const cancelled = submit && e.name === 'TimeoutError';
          if (!cancelled && !NAV_RACE.test(String(e.message))) throw e;
          if (attempt >= RELOAD_ATTEMPTS) return { ok: false, reason: 'reload-failed' };
          continue;
        } finally { reloading = false; }
        // A goto that did not throw is not yet a new document: it must be at the URL the first load ended on,
        // and the marker the runner sets on a document before typing into it must be gone.
        const probed = await page.evaluate(() => window.__uaProbed).catch(() => true);
        if (noHash(page.url()) !== noHash(finalUrl) || probed !== undefined) {
          if (attempt >= RELOAD_ATTEMPTS) return { ok: false, reason: 'reload-failed' };
          continue;
        }
        // The document the cases run on must offer the fields that were discovered; otherwise the cases would
        // be typed into another form (review of #21: "same page, same choice" was assumed, not checked).
        const again = await findFields(page);   // the data-ua-kit-field markers are gone with the old document
        if (!sameFields(found, again)) return { ok: false, reason: 'page-changed-on-reload' };
        report.title = await page.title();      // what the page under test says of itself, read on the document actually probed
        return { ok: true };
      }
    };
    const emailCases = battery.cases.filter(c => c.kind === 'email');
    const siteKind = found.websiteType === 'url' ? 'url' : 'domain';
    const siteCases = battery.cases.filter(c => c.kind === 'domain' || c.kind === 'url');

    report.fields.email = found.email ? await probeTwice(tab, found.email, 'email', emailCases, { submit, fresh }) : { status: 'not-testable', reason: 'no-field' };
    report.fields.website = found.website ? await probeTwice(tab, found.website, siteKind, siteCases, { submit, fresh }) : { status: 'not-testable', reason: 'no-field' };

    if (keepPage) {
      report.__page = await page.evaluate(() => ({ submitted: window.__submitted, submits: window.__uaSubmits ?? 0, posts: window.__posts ?? [], nameAtLoad: window.__nameAtLoad, popupOpened: window.__popupOpened }));
      report.__finalUrlAfter = page.url();
      report.__guard = guard;
      report.__pages = context.pages().length;
      report.__workers = page.workers().length;
    }
    return report;
  } finally {
    await stopWorkers().catch(() => {});   // the last document's workers hold the last case's value
    await browser.close();   // also on exceptions, so a failing run never leaves a browser open
  }
}
