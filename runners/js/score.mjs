export const KINDS = ['email', 'domain', 'url'];

/** Compiles a JavaScript regex into a validator. Throws SyntaxError on a bad pattern; callers report it.
 *  No `u` flag by default: web-copied patterns often contain escapes (`\-`, `\/`) that `u` rejects. */
export function regexValidator(source, flags = '') {
  const re = new RegExp(source, flags);
  return value => re.test(value);
}

const EMPTY = (kind, battery) => ({ kind: kind ?? 'all', battery: battery.version, total: 0, accepted_ok: 0, rejected_ok: 0, failures: [], byClass: {}, failingClasses: [], verdict: 'no-cases' });

export function score(validate, battery, { kind } = {}) {
  const selected = kind ? battery.cases.filter(c => c.kind === kind) : battery.cases;
  if (selected.length === 0) return EMPTY(kind, battery);
  // With a single kind, buckets are the class names; across kinds they are prefixed so nothing is mixed.
  const keyOf = c => (kind ? c.class : `${c.kind}:${c.class}`);
  const byClass = {};
  const failures = [];
  let accepted_ok = 0, rejected_ok = 0, guards = 0, guardsAccepted = 0;

  for (const c of selected) {
    let accepted;
    try { accepted = Boolean(validate(c.value)); } catch { accepted = false; }
    const pass = (c.expect === 'accept') === accepted;
    const bucket = (byClass[keyOf(c)] ??= { total: 0, ok: 0 });
    bucket.total += 1;
    if (pass) bucket.ok += 1; else failures.push(c.id);
    if (c.expect === 'accept' && pass) accepted_ok += 1;
    if (c.expect === 'reject') {
      if (pass) rejected_ok += 1;
      if (c.class === 'guard') { guards += 1; if (!pass) guardsAccepted += 1; }
    }
  }

  const failingClasses = Object.entries(byClass).filter(([, v]) => v.ok < v.total).map(([k]) => k);
  const verdict = guards > 0 && guardsAccepted === guards ? 'accept-all'
    : failures.length === 0 ? 'ua-pass' : 'ua-fail';

  return { kind: kind ?? 'all', battery: battery.version, total: selected.length, accepted_ok, rejected_ok, failures, byClass, failingClasses, verdict };
}
