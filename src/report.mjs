const NOT_TESTED_URL = 'Not tested: validation that runs only on submit, server-side validation, email delivery, storage and display. On a URL the runner never submits the form: "no-rejection-observed" means no rejection on input or blur, not an acceptance; such a case is counted not-observed, neither passed nor failed.';
const NOT_TESTED_FILE = 'Not tested: server-side validation, email delivery, storage and display. On a local file the runner dispatches the submit event after each case, with the default action cancelled and every request after load blocked: nothing leaves the page. Limits: a validator slower than 60 ms (debounced, asynchronous) is read too early; the submit is dispatched on the form, not through a button, so a `formnovalidate` on a button is not exercised; a refusal shown only by a style (`:invalid`) is not read.';

// What the reasons of the baseline, and of the double probe, mean for a reader who meets them in a report.
const WHY = {
  'fill-dependent': 'The field was probed twice: with every other field of the form filled, and with the fields that are neither required nor hidden left empty (a page may drop a submit whose anti-spam trap is filled). The two probes did not give the same verdicts, so none is given.',
  'baseline-ambiguous': 'The field shows the same text, and no mark of refusal, for a plain value and for a value with no @, dot or scheme: a page that refuses both, or a hint shown for any value. The two cannot be told apart, so no verdict is given.',
  'value-dependent-text': 'The field does not show for a second plain value what it showed for the first: the page writes of each value something the runner cannot follow from one value to the next, so no verdict is given.'
};

// Everything below that comes from the page under test (title, observed values, script names) is
// untrusted: it must not break the tables or render as markup on GitHub.
// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const clean = v => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ');
const text = v => clean(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '\\|').replace(/([\\`*_[\]#])/g, '\\$1');
function code(v) {
  const s = clean(v).replace(/\|/g, '\\|');
  const fence = '`'.repeat(Math.max(0, ...(s.match(/`+/g) ?? []).map(r => r.length)) + 1);
  return `${fence} ${s} ${fence}`;
}

function fieldSection(name, f) {
  if (f.status !== 'tested') return `### ${name}\n\nnot-testable (${text(f.reason)})\n${WHY[f.reason] ? '\n' + WHY[f.reason] + '\n' : ''}`;
  const lines = [`### ${name} — ${code(f.selector)} (${f.kind} cases)`, '',
    `passed ${f.counts.pass} · failed ${f.counts.fail} · rewritten ${f.counts.rewritten} · not-observed ${f.counts.notObserved ?? 0} · not-testable ${f.counts.notTestable ?? 0}`, '',
    ...(f.counts.notObserved ? [`no rejection observed — submit not exercised: ${f.counts.notObserved} of ${f.results.length} cases${f.submitExercised ? ' (native validation blocked the submit, e.g. a required field the runner could not fill)' : ''}. They are neither passed nor failed.`, ''] : []),
    ...(f.kind === 'url' && f.results.some(r => r.id.startsWith('domain-')) ? [`${f.results.filter(r => r.id.startsWith('domain-')).length} bare-domain cases typed with https:// in front (${f.baseline?.schemeRequired ? 'text field that refuses a bare domain and takes it with a scheme' : 'URL field: the browser rejects a bare domain itself'}).`, ''] : []),
    ...(f.baseline?.showed && !f.baseline.refused ? [`The page writes something of its own in this field for the plain value ${code(f.baseline.typed)}. It is not what it writes for a value with no @, dot or scheme, so it is taken as an acceptance; if it is a refusal, the cases refused in the same words read as accepted here.`, ''] : []),
    ...(f.baseline?.refused ? [`The page refuses the plain value ${code(f.baseline.typed)} in this field: every case is read against the page as it loaded.`, ''] : []),
    '| class | pass / total |', '|---|---|'];
  for (const [cls, v] of Object.entries(f.counts.byClass)) lines.push(`| ${text(cls)} | ${v.pass} / ${v.total} |`);
  const fails = f.results.filter(r => r.outcome === 'fail');
  if (fails.length) {
    lines.push('', '| failing case | typed | observed | verdict |', '|---|---|---|---|');
    for (const r of fails) lines.push(`| ${text(r.id)} | ${code(r.typed)} | ${code(r.observed)} | ${text(r.verdict)} |`);
  }
  const rew = f.results.filter(r => r.rewritten);
  if (rew.length) {
    lines.push('', '| rewritten case | typed | observed |', '|---|---|---|');
    for (const r of rew) lines.push(`| ${text(r.id)} | ${code(r.typed)} | ${code(r.observed)} |`);
  }
  // Cases the runner could not bring to the page (a reload that failed, a page that changed on reload):
  // named, so that the pass and fail counts above are read for what they cover.
  const untested = f.results.filter(r => r.outcome === 'not-testable');
  if (untested.length) {
    lines.push('', '| not-testable case | reason |', '|---|---|');
    for (const r of untested) lines.push(`| ${text(r.id)} | ${text(r.reason)} |`);
  }
  return lines.join('\n') + '\n';
}

export function renderMarkdown(report) {
  const head = [`# ua-kit check — ${text(report.target)}`, '',
    `- final URL: ${report.finalUrl ? text(report.finalUrl) : '—'}`, `- title: ${report.title ? text(report.title) : '—'}`,
    `- engine: ${report.engine} ${report.engineVersion}`, `- date: ${report.date}`, `- battery: ${report.battery}${report.batteryFile ? ` — ${text(report.batteryFile)}, not the standard battery` : ''}`, ''];
  const body = [fieldSection('Email field', report.fields.email), fieldSection('Website field', report.fields.website)];
  const cat = report.catalogue.length
    ? ['### Known patterns found in page scripts', '', ...report.catalogue.map(m => m.source_url
        ? `- ${text(m.script)}: matches the pattern published at ${m.source_url} (${text(m.name)})`
        : `- ${text(m.script)}: matches the known pattern family "${text(m.name)}"`), '']
    : ['### Known patterns found in page scripts', '', 'none', ''];
  // An unread script is not a clean one: say which scripts the "none" above does not cover.
  if (report.catalogueError) cat.splice(-1, 0, '', `Page scripts could not be read (${text(report.catalogueError)}): the list above covers nothing.`);
  for (const u of report.catalogueUnread ?? []) cat.splice(-1, 0, `- not read: ${text(u.script)} (${text(u.reason)})`);
  return [...head, ...body, ...cat, report.submitExercised ? NOT_TESTED_FILE : NOT_TESTED_URL, ''].join('\n');
}
