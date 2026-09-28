export const EMAIL_HINT = 'e-?mail|courriel|correo';
export const SITE_HINT = 'site ?web|website|\\burl\\b|sitio|page web';

/** Marks the chosen inputs with data-ua-kit-field and returns selectors (or null). */
export async function findFields(page) {
  return page.evaluate(([emailSrc, siteSrc]) => {
    const emailRe = new RegExp(emailSrc, 'i'), siteRe = new RegExp(siteSrc, 'i');
    const isText = i => ['email', 'url', 'text', ''].includes(i.type) || !i.hasAttribute('type');
    const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const text = el => {
      const parts = [el.name, el.id, el.placeholder, el.getAttribute('aria-label')];
      if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) parts.push(l.textContent); }
      const wrap = el.closest('label'); if (wrap) parts.push(wrap.textContent);
      return parts.filter(Boolean).join(' ');
    };
    const inputs = [...document.querySelectorAll('input')].filter(i => isText(i) && visible(i) && !i.disabled);
    const pick = (typeName, re) => inputs.find(i => i.type === typeName) || inputs.find(i => re.test(text(i))) || null;
    const email = pick('email', emailRe);
    const site = inputs.filter(i => i !== email).length ? (inputs.filter(i => i !== email).find(i => i.type === 'url') || inputs.filter(i => i !== email).find(i => siteRe.test(text(i))) || null) : null;
    const mark = (el, name) => { if (!el) return null; el.setAttribute('data-ua-kit-field', name); return `[data-ua-kit-field="${name}"]`; };
    // A description of the element chosen, so that a page reloaded by the runner can be checked to offer
    // the same fields (a different type, name or id means another form, not the one already probed).
    const describe = el => el ? [el.tagName.toLowerCase(), el.type, el.name, el.id].join('|') : null;
    return { email: mark(email, 'email'), website: mark(site, 'website'), websiteType: site ? site.type : null, emailKey: describe(email), websiteKey: describe(site) };
  }, [EMAIL_HINT, SITE_HINT]);
}
