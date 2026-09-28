// Builds bench/index.html, the page that lists the 54 generated forms with their scores, from
// bench/results/runs.csv. Every number on that page comes from runs.csv; nothing is typed by hand.
// The forms themselves are linked as they were generated, never modified.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODELS = { anthropic: 'Claude Opus 5.5', openai: 'GPT-6 Astra', 'open-weight': 'GLM 5.3' };
const LANGS = { en: 'English', fr: 'French', es: 'Spanish' };
const CONDITIONS = { 'no-guide': 'prompt alone', guide: 'prompt + GUIDE.md' };

function parseCsv(text) {
  const [head, ...lines] = text.trim().split('\n');
  const keys = head.split(',');
  return lines.map(line => {
    const cells = []; let cur = ''; let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch; }
      else if (ch === '"') quoted = true;
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(keys.map((k, i) => [k, cells[i]]));
  });
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function buildIndex(rows) {
  const pages = new Map();
  for (const r of rows) {
    const key = `${r.model}/${r.lang}/${r.condition}/${r.repeat}`;
    if (!pages.has(key)) pages.set(key, { model: r.model, lang: r.lang, condition: r.condition, repeat: r.repeat, pass: 0, total: 0, validOk: 0, valid: 0, invalidOk: 0, invalid: 0, failing: new Set() });
    const p = pages.get(key);
    const ok = r.outcome === 'pass';
    p.total += 1; if (ok) p.pass += 1; else p.failing.add(r.class);
    if (r.expect === 'accept') { p.valid += 1; if (ok) p.validOk += 1; } else { p.invalid += 1; if (ok) p.invalidOk += 1; }
  }
  const order = [...pages.values()].sort((a, b) =>
    Object.keys(MODELS).indexOf(a.model) - Object.keys(MODELS).indexOf(b.model)
    || Object.keys(LANGS).indexOf(a.lang) - Object.keys(LANGS).indexOf(b.lang)
    || Object.keys(CONDITIONS).indexOf(a.condition) - Object.keys(CONDITIONS).indexOf(b.condition)
    || a.repeat - b.repeat);
  const body = order.map(p => {
    const href = `results/generations/${p.model}/${p.lang}/${p.condition}/${p.repeat}.html`;
    const cls = p.pass === p.total ? 'all' : '';
    return `<tr><td>${esc(MODELS[p.model] ?? p.model)}</td><td>${esc(LANGS[p.lang] ?? p.lang)}</td><td>${esc(CONDITIONS[p.condition] ?? p.condition)}</td><td class="n">${esc(p.repeat)}</td>`
      + `<td class="n ${cls}">${p.pass}/${p.total}</td><td class="n">${p.validOk}/${p.valid}</td><td class="n">${p.invalidOk}/${p.invalid}</td>`
      + `<td class="f">${p.failing.size ? [...p.failing].map(c => `<code>${esc(c)}</code>`).join(' ') : '—'}</td>`
      + `<td><a href="${esc(href)}">open the form</a></td></tr>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ua-agent-kit — the 54 generated forms</title>
<style>
:root{--bg:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--rule:#e3e2dc;--ok:#1c5cab;--tape:#efeee8;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#1a1a19;--ink:#fff;--ink2:#c3c2b7;--rule:#2e2d2a;--ok:#8fbff2;--tape:#262522;color-scheme:dark}}
body{background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;padding:32px 16px 56px}
main{max-width:1040px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
h1{font-size:28px;line-height:1.2;margin:0}p{margin:0;max-width:72ch;color:var(--ink2)}
code{font:13px ui-monospace,Menlo,monospace}.tape{background:var(--tape);padding:2px 6px;border-radius:3px;font:14px ui-monospace,Menlo,monospace}
.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:760px;font-size:14px}
th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--rule);vertical-align:top}th{color:var(--ink2);font-weight:500}
td.n{font-variant-numeric:tabular-nums;white-space:nowrap}td.all{color:var(--ok);font-weight:600}td.f code{margin-right:4px}a{color:var(--ok)}
</style></head><body><main>
<h1>The 54 signup forms of the ua-agent-kit bench</h1>
<p>Three models were asked for the same self-contained HTML signup form, in three languages, three times, with the prompt alone and with <a href="https://github.com/guia-matthieu/ua-agent-kit/blob/main/GUIDE.md">GUIDE.md</a> as the system prompt. Each form below is served exactly as the model wrote it. None of them sends anything anywhere; a form that posts gets an error page from this host.</p>
<p>Try one: type <span class="tape">josé.dupont@example.fr</span>, <span class="tape">用户@例子.中国</span> or <span class="tape">contact@boutique.corsica</span> in the email field, then submit.</p>
<p>Scores are the runner's, out of 79 cases per form (63 valid values to accept, 16 invalid ones to refuse), read in Chromium on 2026-09-27. How a case is scored, and the limits of this bench: <a href="https://github.com/guia-matthieu/ua-agent-kit/blob/main/bench/results/RESULTS.md">RESULTS.md</a>. Built from <code>bench/results/runs.csv</code> by <code>bench/build-index.mjs</code>.</p>
<div class="scroll"><table>
<thead><tr><th>model</th><th>language</th><th>condition</th><th>repeat</th><th>cases passed</th><th>valid accepted</th><th>invalid refused</th><th>classes with a failure</th><th></th></tr></thead>
<tbody>
${body}
</tbody></table></div>
<p><a href="https://github.com/guia-matthieu/ua-agent-kit">github.com/guia-matthieu/ua-agent-kit</a> · results CC0 1.0</p>
</main></body></html>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = parseCsv(readFileSync(join(HERE, 'results', 'runs.csv'), 'utf8'));
  const html = buildIndex(rows);
  const check = process.argv.includes('--check');
  const target = join(HERE, 'index.html');
  if (check) {
    let current = '';
    try { current = readFileSync(target, 'utf8'); } catch { /* missing */ }
    if (current !== html) { console.error('bench/index.html is out of date: run node bench/build-index.mjs'); process.exit(1); }
    console.log('bench/index.html up to date');
  } else {
    writeFileSync(target, html);
    console.log(`wrote bench/index.html (${rows.length} cases)`);
  }
}
