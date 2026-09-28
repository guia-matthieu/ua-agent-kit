// Reference validators: permissive by design, syntax only.
// They prove the battery is satisfiable. They are not a library recommendation.
import { domainToASCII } from 'node:url';

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/i;

export function isValidDomain(value) {
  if (typeof value !== 'string' || value.length === 0 || /\s/.test(value)) return false;
  if (value.endsWith('.')) return false;               // trailing-dot FQDN: excluded on purpose
  const ascii = domainToASCII(value);                   // '' when the host is not convertible
  if (!ascii || ascii.length > 253) return false;
  const labels = ascii.split('.');
  if (labels.length < 2 || !labels.every(l => LABEL.test(l))) return false;
  const tld = labels.at(-1);
  return /^xn--/i.test(tld) || /^[a-z]{2,}$/i.test(tld);
}

export function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const at = value.lastIndexOf('@');
  if (at <= 0 || at === value.length - 1) return false;
  const local = value.slice(0, at);
  if (/[\s@]/.test(local)) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (Buffer.byteLength(local, 'utf8') > 64) return false;
  return isValidDomain(value.slice(at + 1));
}

export function isValidUrl(value) {
  if (typeof value !== 'string') return false;
  let u;
  try { u = new URL(value); } catch { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  return isValidDomain(u.hostname);
}
