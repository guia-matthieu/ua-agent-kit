#!/usr/bin/env node
// Builds the packs under battery/packs/tld/, one file per TLD, in the format of battery/schema.json.
// Packs are filed by kind of TLD, never by country: a TLD such as .eus is used on both sides of a border.
// A-labels are computed here, never typed by hand: a hand-typed xn-- label is the easiest way to ship a wrong case.
import { domainToASCII } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';

const VERSION = '0.2.0';
const GENERATED = '2026-10-06';
const AFNIC = 'AFNIC naming charter, version of 2026-07-06, art. 19';
const SYNTAX_ONLY = ' — syntax only';

// [group, tld, ASCII name or null, accented name, what the accented name is, accented local parts, guards]
const TLDS = [
  ['geotld', 'bzh', 'kemper.bzh', 'kêr.bzh', 'Breton', [['françois@mairie.bzh', 'eai-local', 'accented local part']],
    [['email', 'contact@.bzh', 'empty first label', 'RFC 1035 §2.3.4']]],
  ['geotld', 'corsica', 'mairie.corsica', 'cità.corsica', 'Corsican', [['andría@cità.corsica', 'eai-full', 'accented local part and domain']],
    [['email', 'contact@mairie..corsica', 'empty label', 'RFC 1035 §2.3.4'], ['url', 'https://mairie .corsica', 'space in the host', 'RFC 3986 §3.2.2']]],
  ['geotld', 'alsace', 'mairie.alsace', 'münster.alsace', 'Alsatian', [],
    [['domain', 'mairie..alsace', 'empty label', 'RFC 1035 §2.3.4']]],
  ['geotld', 'paris', 'mairie.paris', 'théâtre.paris', 'French', [],
    [['domain', '-mairie.paris', 'label starts with a hyphen', 'RFC 5891 §4.2.3.1']]],
  ['geotld', 'eus', 'udala.eus', 'iruña.eus', 'Basque', [],
    [['url', 'https//udala.eus', 'missing colon after the scheme', 'RFC 3986 §3.1']]],
  // .fr has plain ASCII cases in the standard battery already (class control): only the accented names are added.
  ['cctld', 'fr', null, 'mairie-héry.fr', 'French', [['hélène@mairie-héry.fr', 'eai-full', 'accented local part and domain']],
    [['email', 'contact@mairie héry.fr', 'space in the domain', 'RFC 5321 §4.1.2'], ['domain', 'mairie héry.fr', 'space', 'RFC 1035 §2.3.1']]],
];

function build([group, tld, ascii, idn, what, eai, guards]) {
  const cases = [];
  const seq = {};
  const add = (kind, slug, cls, value, expect, note, ref) => {
    const stem = `${kind}-${group}-${tld}${slug ? '-' + slug : ''}`;
    seq[stem] = (seq[stem] ?? 0) + 1;
    cases.push({ id: `${stem}-${String(seq[stem]).padStart(2, '0')}`, kind, class: cls, value, expect, note, ref });
  };
  if (ascii) {
    // Same split as battery/cases.json: up to 4 letters is short, 5 and more is long.
    const cls = tld.length <= 4 ? 'ascii-tld-short' : 'ascii-tld-long';
    const note = `${tld.length}-letter geoTLD`;
    add('email', '', cls, `contact@${ascii}`, 'accept', note, 'IANA root zone');
    add('domain', '', cls, ascii, 'accept', note, 'IANA root zone');
    add('url', '', cls, `https://www.${ascii}/contact`, 'accept', `${note}, www and path`, 'WHATWG URL');
  }
  // On the geoTLDs the accented names are syntax cases: the registry publishes an IDN table, the zone holds no such name.
  const tag = group === 'geotld' ? SYNTAX_ONLY : '';
  const ref = tld === 'fr' ? `RFC 5891; ${AFNIC}` : `RFC 5891; .${tld} IDN table published at IANA`;
  const alabel = domainToASCII(idn);
  add('email', 'idn', 'email-idn-domain', `contact@${idn}`, 'accept', `U-label domain, ${what}${tag}`, 'RFC 6531 §3.3');
  add('email', 'idn', 'idn-sld-alabel', `contact@${alabel}`, 'accept', `same domain as an A-label${tag}`, ref);
  add('domain', 'idn', 'idn-ulabel', idn, 'accept', `U-label, ${what}${tag}`, ref);
  add('domain', 'idn', 'idn-sld-alabel', alabel, 'accept', `A-label of ${idn}${tag}`, ref);
  add('url', 'idn', 'idn-ulabel', `https://${idn}/`, 'accept', `U-label host, ${what}${tag}`, ref);
  add('url', 'idn', 'idn-sld-alabel', `https://${alabel}/`, 'accept', `A-label host of ${idn}${tag}`, ref);
  for (const [value, cls, note] of eai) add('email', 'eai', cls, value, 'accept', `${note}${cls === 'eai-full' ? tag : ''}`, 'RFC 6531');
  // At least one guard per pack, so that a page accepting everything does not pass it.
  for (const [kind, value, note, gref] of guards) add(kind, 'guard', 'guard', value, 'reject', note, gref);
  const scope = group === 'geotld'
    ? `.${tld} in ASCII and one accented name under .${tld}; the accented name is a syntax case, not a name in use.`
    : `accented names under .${tld}; its plain ASCII cases are in battery/cases.json.`;
  return { version: VERSION, generated: GENERATED, license: 'CC0-1.0', method: `Pack for .${tld}: ${scope} Same format as battery/cases.json, scored apart from it and never merged into its totals. Built by scripts/build-packs.mjs.`, cases };
}

let total = 0;
for (const row of TLDS) {
  const [group, tld] = row;
  const pack = build(row);
  const dir = new URL(`../battery/packs/tld/${group}/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL(`${tld}.json`, dir), JSON.stringify(pack, null, 2) + '\n');
  total += pack.cases.length;
  console.log(`tld/${group}/${tld}.json: ${pack.cases.length} cases, ${pack.cases.filter(c => c.expect === 'reject').length} guard(s)`);
}
console.log(`${total} cases in ${TLDS.length} packs`);
