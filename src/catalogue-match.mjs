export function normalise(text) {
  return text.replace(/\s+/g, ' ').trim();
}

import { recorded } from './replay.mjs';

/** Inline scripts from the page, external ones from the responses `recordResponses` (replay.mjs) captured at
 *  the network layer during load: no second request, no CORS, no in-page fetch after the lock. A script whose
 *  response was not recorded or could not be read is marked `unread`: an unread script is not a clean one. */
export async function collectScripts(page, cache) {
  const list = await page.evaluate(() => [...document.scripts].map(s => ({ src: s.src, text: s.src ? '' : s.textContent })));
  const out = [];
  let n = 0;
  for (const { src, text } of list) {
    if (!src) { out.push({ url: `inline#${n++}`, text }); continue; }
    const e = await recorded(cache, src);
    if (!e) { out.push({ url: src, text: '', unread: cache.has(src) ? 'body not read' : 'not-loaded' }); continue; }
    if (e.status < 200 || e.status >= 300) { out.push({ url: src, text: '', unread: `http ${e.status}` }); continue; }
    out.push({ url: src, text: e.body.toString('utf8') });
  }
  return out;
}

export function matchCatalogue(scripts, catalogue) {
  const hits = [];
  for (const { url, text } of scripts) {
    const hay = normalise(text);
    for (const e of catalogue.entries) {
      const needles = [e.pattern, ...(e.variants ?? [])].map(normalise);
      if (needles.some(nd => hay.includes(nd))) hits.push({ id: e.id, name: e.name, source_url: e.source_url ?? null, script: url });
    }
  }
  return hits;
}
