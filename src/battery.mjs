import { readFileSync } from 'node:fs';
import { domainToASCII } from 'node:url';

const BATTERY_URL = new URL('../battery/cases.json', import.meta.url);

export function loadBattery() {
  return JSON.parse(readFileSync(BATTERY_URL, 'utf8'));
}

/** Domain part of a value, as typed (not converted). null when there is none. */
export function domainOf(value, kind) {
  if (kind === 'domain') return value;
  if (kind === 'email') {
    const at = value.lastIndexOf('@');
    return at > 0 && at < value.length - 1 ? value.slice(at + 1) : null;
  }
  if (kind === 'url') {
    try { return new URL(value).hostname || null; } catch { return null; }
  }
  return null;
}

/** TLD in lowercase A-label form, or null when the domain does not convert. */
export function tldOf(value, kind) {
  const domain = domainOf(value, kind);
  if (!domain) return null;
  const ascii = domainToASCII(domain);
  if (!ascii) return null;
  const labels = ascii.split('.');
  return labels.length >= 2 ? labels.at(-1).toLowerCase() : null;
}
