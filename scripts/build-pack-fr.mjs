#!/usr/bin/env node
// Builds battery/packs/fr.json, in the format of battery/schema.json.
// A-labels are computed here, never typed by hand: a hand-typed xn-- label is the easiest way to ship a wrong case.
import { domainToASCII } from 'node:url';
import { writeFileSync } from 'node:fs';

const VERSION = '0.1.2';
const GENERATED = '2026-10-06';
const AFNIC = 'AFNIC naming charter, version of 2026-07-06, art. 19';
const SYNTAX_ONLY = ' — syntax only';

const ASCII = ['mairie.alsace', 'mairie.paris', 'mairie.corsica', 'kemper.bzh', 'udala.eus'];
const IDN = [ // [U-label name, what the name is]
  ['mairie-héry.fr', 'example given in the ANCT RPNT reference, criterion 1.2'],
  ['kêr.bzh', 'Breton'],
  ['cità.corsica', 'Corsican'],
  ['münster.alsace', 'Alsatian'],
  ['théâtre.paris', 'French'],
  ['iruña.eus', 'Basque'],
];

const cases = [];
const seq = {};
function add(kind, slug, cls, value, expect, note, ref) {
  const stem = `${kind}-fr-${slug}`;
  seq[stem] = (seq[stem] ?? 0) + 1;
  cases.push({ id: `${stem}-${String(seq[stem]).padStart(2, '0')}`, kind, class: cls, value, expect, note, ref });
}

for (const name of ASCII) {
  const tld = name.split('.').pop();
  // Same split as battery/cases.json: up to 4 letters is short, 5 and more is long.
  const cls = tld.length <= 4 ? 'ascii-tld-short' : 'ascii-tld-long';
  const note = `${tld.length}-letter geoTLD`;
  add('email', tld, cls, `contact@${name}`, 'accept', note, 'IANA root zone');
  add('domain', tld, cls, name, 'accept', note, 'IANA root zone');
  add('url', tld, cls, `https://www.${name}/contact`, 'accept', `${note}, www and path`, 'WHATWG URL');
}

for (const [name, what] of IDN) {
  const tld = name.split('.').pop();
  const alabel = domainToASCII(name);
  // Outside .fr these names are syntax cases: the registries publish an IDN table, the zones hold no such name.
  const tag = tld === 'fr' ? '' : SYNTAX_ONLY;
  const ref = tld === 'fr' ? `RFC 5891; ${AFNIC}` : `RFC 5891; .${tld} IDN table published at IANA`;
  add('email', `idn-${tld}`, 'email-idn-domain', `contact@${name}`, 'accept', `U-label domain, ${what}${tag}`, 'RFC 6531 §3.3');
  add('email', `idn-${tld}`, 'idn-sld-alabel', `contact@${alabel}`, 'accept', `same domain as an A-label${tag}`, ref);
  add('domain', `idn-${tld}`, 'idn-ulabel', name, 'accept', `U-label, ${what}${tag}`, ref);
  add('domain', `idn-${tld}`, 'idn-sld-alabel', alabel, 'accept', `A-label of ${name}${tag}`, ref);
  add('url', `idn-${tld}`, 'idn-ulabel', `https://${name}/`, 'accept', `U-label host, ${what}${tag}`, ref);
  add('url', `idn-${tld}`, 'idn-sld-alabel', `https://${alabel}/`, 'accept', `A-label host of ${name}${tag}`, ref);
}

add('email', 'eai', 'eai-local', 'françois@mairie.bzh', 'accept', 'accented local part, geoTLD', 'RFC 6531');
add('email', 'eai', 'eai-full', 'hélène@mairie-héry.fr', 'accept', 'accented local part and domain', 'RFC 6531');
add('email', 'eai', 'eai-full', `andría@cità.corsica`, 'accept', `accented local part and domain, geoTLD${SYNTAX_ONLY}`, 'RFC 6531');

// Guards, so that a page accepting everything does not pass the pack.
add('email', 'guard', 'guard', 'contact@mairie..corsica', 'reject', 'empty label', 'RFC 1035 §2.3.4');
add('email', 'guard', 'guard', 'contact@.bzh', 'reject', 'empty first label', 'RFC 1035 §2.3.4');
add('email', 'guard', 'guard', 'contact@mairie héry.fr', 'reject', 'space in the domain', 'RFC 5321 §4.1.2');
add('domain', 'guard', 'guard', '-mairie.paris', 'reject', 'label starts with a hyphen', 'RFC 5891 §4.2.3.1');
add('domain', 'guard', 'guard', 'mairie..alsace', 'reject', 'empty label', 'RFC 1035 §2.3.4');
add('domain', 'guard', 'guard', 'mairie héry.fr', 'reject', 'space', 'RFC 1035 §2.3.1');
add('url', 'guard', 'guard', 'https://mairie .corsica', 'reject', 'space in the host', 'RFC 3986 §3.2.2');
add('url', 'guard', 'guard', 'https//udala.eus', 'reject', 'missing colon after the scheme', 'RFC 3986 §3.1');

const pack = {
  version: VERSION,
  generated: GENERATED,
  license: 'CC0-1.0',
  method: 'France pack: .bzh, .corsica, .alsace, .paris and .eus in ASCII, and accented names under .fr and under those five TLDs. Same format as battery/cases.json, scored apart from it and never merged into its totals. Accented names outside .fr are syntax cases, not names in use. Built by scripts/build-pack-fr.mjs.',
  cases,
};
writeFileSync(new URL('../battery/packs/fr.json', import.meta.url), JSON.stringify(pack, null, 2) + '\n');
console.log(`${cases.length} cases, ${cases.filter(c => c.expect === 'reject').length} guards`);
