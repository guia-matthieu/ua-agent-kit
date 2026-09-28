import { isValidEmail, isValidDomain, isValidUrl } from '../runners/js/reference.mjs';

const ERR_CLASS = /invalid|error|erreur/i;
const REF = { email: isValidEmail, domain: isValidDomain, url: isValidUrl };

/** What the page showed for this value that it did not show for the baseline value: the signals of a refusal
 *  by the page's own script. `custom-validity`: the script called setCustomValidity() and changed nothing in
 *  the markup (review of #21, 27/09: on a novalidate form that refusal read as accepted). */
export function signalsOf(before, after) {
  const signals = [];
  if (after.ariaInvalid === 'true') signals.push('aria-invalid');
  if (ERR_CLASS.test(after.classes) && !ERR_CLASS.test(before.classes)) signals.push('error-class');
  if (after.errorTexts.some(t => !before.errorTexts.includes(t))) signals.push('error-text');
  if (after.customError && after.validationMessage !== before.validationMessage) signals.push('custom-validity');
  return signals;
}

/** What was read, kept with every result so that a verdict can be checked against it:
 *  `mismatch` the field itself reports a type or pattern mismatch; `enforced` something acts on that (the field
 *  has a form, and the form does not carry novalidate); `signals` what the page showed. */
export function evidence(before, after) {
  return { mismatch: Boolean(!after.valid && (after.typeMismatch || after.patternMismatch)), enforced: !after.noValidate, signals: signalsOf(before, after) };
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
  return {
    value: el.value, valid: el.validity.valid,
    typeMismatch: el.validity.typeMismatch, patternMismatch: el.validity.patternMismatch,
    customError: el.validity.customError, validationMessage: el.validationMessage,
    // nothing acts on the field's validity: its form carries novalidate, or it has no form at all
    noValidate: Boolean(!el.form || el.form.noValidate),
    ariaInvalid: el.getAttribute('aria-invalid'),
    classes: [el.className, el.parentElement ? el.parentElement.className : '', label ? label.className : ''].join(' '),
    errorTexts: texts
  };
}
