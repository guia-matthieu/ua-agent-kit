# Packs

A pack is a set of cases in the format of `battery/schema.json`, built for one territory or one registry. It is scored on its own sheet: the numbers of a pack are never added to those of `battery/cases.json`, and `ua-kit score` and `ua-kit check` do not load it.

To score a page against a pack, pass it to the runner:

```js
import { readFileSync } from 'node:fs';
import { checkForm } from './src/form-runner.mjs'; // from the repository root

const pack = JSON.parse(readFileSync('battery/packs/fr.json', 'utf8'));
const report = await checkForm('form.html', { battery: pack });
```

## `fr.json` — France pack 0.1.2

62 cases, 54 to accept and 8 to refuse. Built by `scripts/build-pack-fr.mjs`; `tests/packs.test.mjs` checks it.

| Cases | What | Expect |
|---|---|---|
| 15 | `.bzh`, `.eus` (`ascii-tld-short`), `.paris`, `.alsace`, `.corsica` (`ascii-tld-long`), each as an email address, a domain name and a URL | accept |
| 36 | six accented names, each as a U-label and as an A-label, in an email address, a domain name and a URL: `mairie-héry.fr`, `kêr.bzh`, `cità.corsica`, `münster.alsace`, `théâtre.paris`, `iruña.eus` | accept |
| 3 | email addresses with an accented local part | accept |
| 8 | guards: empty label, leading hyphen, space, malformed scheme | reject |

Short and long follow the standard battery: a TLD of up to 4 letters is `ascii-tld-short`, 5 letters and more is `ascii-tld-long`.

### What the accented names stand for

- **`mairie-héry.fr` is the one accented name tied to a published rule.** Every character of it is in the list of article 19 of the AFNIC naming charter (version of 2026-07-06), which admits `à á â ã ä å æ ç è é ê ë ì í î ï ñ ò ó ô õ ö œ ù ú û ü ý ÿ ß` next to `a`–`z`, `0`–`9` and the hyphen. The name is the example the ANCT RPNT reference uses in its criterion 1.2.
- **The five others are syntax cases, and their notes say so.** Each accented character is in the IDN table the TLD publishes at IANA (tables read on 2026-10-06). A published table is not a service in use: these cases tell whether the rule that accepts `mairie-héry.fr` would also accept `kêr.bzh`. They do not show that a registrant is turned away today.
- None of the 62 values is claimed to be a registered name.

A-labels are computed by `url.domainToASCII`, never typed.
