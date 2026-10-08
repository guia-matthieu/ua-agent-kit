import { isValidEmail, isValidDomain, isValidUrl } from '../runners/js/reference.mjs';

const ERR_CLASS = /invalid|error|erreur/i;
const REF = { email: isValidEmail, domain: isValidDomain, url: isValidUrl };

/** The texts of the field that `after` shows and `before` did not. A text that repeats the value typed
 *  ("Sending to ana@example.com") or counts its characters says the same thing for every value and is not new
 *  (review of PR #6: every valid address read as refused on such a page). A text is old when `before` shows it
 *  as it is, or shows it once each side's own value is taken out of it; the first test keeps a fixed hint old
 *  when the value typed happens to be the example it gives ("e.g. https://example.com").
 *  The value is looked for as the page may have written it: in another case, in another Unicode form, cut
 *  short (second review of #6: a preview in capitals, the first twelve characters, an NFD copy). */
const ECHO_MIN = 3;   // a shorter value, or a shorter piece of one, would be found inside ordinary words
const ECHO_RUN = 6;   // characters in a row shared with the value for a text to be held a copy of it
const MARK = '\u2423';
const counted = t => t.replace(/\d+/g, '#');
const fold = t => t.normalize('NFC').toLowerCase();
/** The longest run of characters `a` and `b` share: { at: its place in `a`, length }. */
function sharedRun(a, b) {
  let best = { at: 0, length: 0 }, prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const row = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) if (a[i - 1] === b[j - 1]) { row[j] = prev[j - 1] + 1; if (row[j] > best.length) best = { at: i - row[j], length: row[j] }; }
    prev = row;
  }
  return best;
}
const withoutValue = s => t => {
  const v = fold(s.value ?? '');
  if (v.length < ECHO_MIN) return counted(t);
  // every copy of the value, not the first only ("Sending V to V", second review of #7)
  let x = fold(t), copies = 0;
  for (;;) {
    const run = sharedRun(x, v);
    if (run.length < Math.min(ECHO_RUN, v.length)) break;
    x = x.slice(0, run.at) + MARK + x.slice(run.at + run.length);
    copies += 1;
  }
  // no copy of the value: the text is compared as it is written, its case included
  if (!copies) return counted(t);
  // what is left of the value on either side of a copy (the page took a space out of the middle)
  for (;;) {
    const sides = x.split(MARK), i = sides.findIndex((side, k) => { const r = sharedRun(side, v); return r.length >= ECHO_MIN && (k > 0 && r.at === 0 || k < sides.length - 1 && r.at + r.length === side.length); });
    if (i < 0) break;
    const r = sharedRun(sides[i], v);
    sides[i] = sides[i].slice(0, r.at) + MARK + sides[i].slice(r.at + r.length);
    x = sides.join(MARK);
  }
  // one mark for the copy, with or without the sign that it was cut short
  return counted(x.replace(new RegExp(MARK + '+(\\u2026|\\.{3})?', 'g'), MARK));
};
export function newTexts(before, after) {
  const raw = (before.fieldTexts ?? []).map(counted), bare = (before.fieldTexts ?? []).map(withoutValue(before));
  return (after.fieldTexts ?? []).filter(t => !raw.includes(counted(t)) && !bare.includes(withoutValue(after)(t)));
}

/** What the page showed for this value that it did not show for the baseline value: the signals of a refusal
 *  by the page's own script. `custom-validity`: the script called setCustomValidity() and changed nothing in
 *  the markup (review of #21, 27/09: on a novalidate form that refusal read as accepted). */
export function signalsOf(before, after) {
  const signals = [];
  if (after.ariaInvalid === 'true') signals.push('aria-invalid');
  if (ERR_CLASS.test(after.classes) && !ERR_CLASS.test(before.classes)) signals.push('error-class');
  if (after.errorTexts.some(t => !before.errorTexts.includes(t))) signals.push('error-text');
  // A text of the field itself needs no word list: whatever the page writes there for this value and did not
  // write for the baseline value is its refusal (run of 2026-10-06: "Enter a valid email address." holds none
  // of the words above and read as accepted, docs/qc/2026-10-06_refusal-wording/).
  if (newTexts(before, after).length) signals.push('field-text');
  if (after.customError && after.validationMessage !== before.validationMessage) signals.push('custom-validity');
  return signals;
}

/** What was read, kept with every result so that a verdict can be checked against it:
 *  `mismatch` the field itself reports a type or pattern mismatch; `enforced` something acts on that (the field
 *  has a form, and the form does not carry novalidate); `signals` what the page showed. */
export function evidence(before, after) {
  return { mismatch: Boolean(!after.valid && (after.typeMismatch || after.patternMismatch)), enforced: !after.noValidate, signals: signalsOf(before, after) };
}

/** Two snapshots say the same thing of the field: neither shows a text the other does not, and the marks of
 *  refusal are the same. Texts elsewhere in the form are left out. */
export function sameOwn(a, b) {
  const marks = s => JSON.stringify([s.ariaInvalid === 'true', ERR_CLASS.test(s.classes), Boolean(s.customError) && s.validationMessage,
    Boolean(!s.valid && (s.typeMismatch || s.patternMismatch) && !s.noValidate)]);
  return marks(a) === marks(b) && !newTexts(a, b).length && !newTexts(b, a).length;
}

/** before/after are snapshots from readState(); returns { verdict, rewritten, outcome }.
 *  `submitted`: the form's submit event actually fired for this case. Without it, a page that validates
 *  only on submit was never exercised, so the absence of a rejection is not an acceptance. */
export function decide(c, typed, before, after, { submitted = true } = {}) {
  const rewritten = after.value !== typed;
  const { mismatch, enforced, signals } = evidence(before, after);
  let verdict;
  // A native mismatch is a rejection where the browser enforces it. On a form with `novalidate`, or on a field
  // that has no form, it blocks nothing: the page's script alone decides, so only what the page says counts
  // (bench of 25/09: the 54 generated forms are novalidate; on 44 rows the page had accepted the value and
  // the verdict read rejected-native from the validity of a type=email field).
  if (mismatch && enforced) verdict = 'rejected-native';
  else if (signals.length) verdict = 'rejected-script';
  else verdict = submitted ? 'accepted' : 'no-rejection-observed';
  const notRejected = verdict === 'accepted' || verdict === 'no-rejection-observed';

  let outcome;
  if (c.expect === 'reject' && rewritten && notRejected && REF[c.kind](after.value)) outcome = 'rewritten-sanitized';
  // No rejection on input or blur and the submit never fired: a validator that runs on submit, if the page
  // has one, was not exercised. Neither an acceptance nor a rejection — an outcome of its own, outside the
  // pass rate (review of #21, Astra E: it read as pass for an accept case).
  else if (verdict === 'no-rejection-observed') outcome = 'not-observed';
  else outcome = ((c.expect === 'accept') === notRejected) ? 'pass' : 'fail';
  return { verdict, rewritten, outcome };
}

/** Runs inside the page: Playwright serialises this function, so it must stay self-contained (no imports, no closures).
 *  Reads what the browser and the page's own scripts say about the field, and fires nothing: `validity.valid`
 *  is a plain read, where checkValidity() dispatches an `invalid` event the page may be listening to. */
export function readState(sel) {
  const el = document.querySelector(sel);
  const form = el.form || el.closest('form') || document.body;
  const errRe = /invalid|inv[aá]lid|no v[aá]lido|error|erreur|incorrect/i;
  const visible = n => n.offsetParent !== null || getComputedStyle(n).position === 'fixed';
  const texts = [...form.querySelectorAll('*')]
    .filter(n => n.children.length === 0 && visible(n) && !n.hidden)
    .map(n => n.textContent.trim()).filter(t => t && errRe.test(t));
  const label = el.labels && el.labels[0];
  // The texts of the field itself, by place: inside its block (the largest ancestor that holds no other control),
  // inside what it names with aria-describedby or aria-errormessage, or after it and before the next control
  // (label, field and message laid out as siblings). Text nodes, so that a message cut by a <b> is read whole
  // enough to differ. A text elsewhere in the form, a message of success below the button for one, is not the
  // field's: it stays under the word list above.
  const controls = [...form.querySelectorAll('input:not([type=hidden]), select, textarea, button')];
  let block = el;
  while (block.parentElement && block.parentElement !== form && form.contains(block.parentElement)
    && !controls.some(c => c !== el && block.parentElement.contains(c))) block = block.parentElement;
  const named = ['aria-describedby', 'aria-errormessage'].flatMap(a => (el.getAttribute(a) || '').split(/\s+/))
    .filter(Boolean).map(id => document.getElementById(id)).filter(Boolean);
  const before = n => { let last = null; for (const c of controls) if (c.compareDocumentPosition(n) & c.DOCUMENT_POSITION_FOLLOWING) last = c; return last; };
  const fieldTexts = [];
  for (const root of new Set([form, ...named])) {
    const walker = document.createTreeWalker(root, 4);   // 4: NodeFilter.SHOW_TEXT
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = n.textContent.trim(), host = n.parentElement;
      if (!t || !host || host.closest('script, style, option') || !visible(host) || host.hidden) continue;
      if ((block.contains(n) || named.some(d => d.contains(n)) || before(n) === el) && !fieldTexts.includes(t)) fieldTexts.push(t);
    }
  }
  return {
    value: el.value, valid: el.validity.valid,
    typeMismatch: el.validity.typeMismatch, patternMismatch: el.validity.patternMismatch,
    customError: el.validity.customError, validationMessage: el.validationMessage,
    // nothing acts on the field's validity: its form carries novalidate, or it has no form at all
    noValidate: Boolean(!el.form || el.form.noValidate),
    ariaInvalid: el.getAttribute('aria-invalid'),
    classes: [el.className, el.parentElement ? el.parentElement.className : '', label ? label.className : ''].join(' '),
    errorTexts: texts,
    fieldTexts
  };
}
