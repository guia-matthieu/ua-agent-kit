/** Replays the page's own load. In submit mode nothing may leave the page during the runner's reloads, and
 *  the page must be tested with its own validator every time: the document and every sub-resource of a
 *  reload are answered from what the first load fetched (review of #21: the old policy let only the
 *  document through, so a page loading its validator from a file was scored without it from the second
 *  case on). Arm `recordResponses` before `page.goto`; stop it once the page is loaded, so the cache holds
 *  nothing sent after a value was typed and no cached URL can carry one. */
export function recordResponses(page) {
  const cache = new Map();
  let active = true;
  page.on('response', r => {
    if (!active) return;
    if (r.status() >= 300 && r.status() < 400) return;   // a redirect hop: its final response follows
    // The entry is a promise stored at once: the load event can fire before the body read completes. A body
    // that cannot be read (aborted, closed) leaves a rejected entry, which replays as nothing.
    const entry = r.body().then(body => {
      const headers = { ...r.headers() };
      for (const h of ['content-encoding', 'content-length', 'transfer-encoding']) delete headers[h];   // the body is decoded already
      return { status: r.status(), headers, body };
    });
    entry.catch(() => {});
    // `s.src` in the page is the URL as written, i.e. the first request of a redirect chain; the browser
    // asks again for the URL it ended on. Both map to the final response.
    let first = r.request();
    while (first.redirectedFrom()) first = first.redirectedFrom();
    cache.set(first.url(), entry);
    cache.set(r.url(), entry);
  });
  return { cache, stop: () => { active = false; } };
}

/** The recorded response for `url` ({ status, headers, body }), or null when none was recorded or its
 *  body could not be read. */
export async function recorded(cache, url) {
  const entry = cache.get(url);
  if (!entry) return null;
  try { return await entry; } catch { return null; }
}
