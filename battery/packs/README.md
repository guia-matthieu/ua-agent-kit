# Packs

A pack is a set of cases in the format of `battery/schema.json`, written for one TLD. It is scored on its own sheet: the numbers of a pack are never added to those of `battery/cases.json`, and `ua-kit score` and `ua-kit check` do not load it unless asked.

Packs are filed by kind of TLD, not by country: `tld/<kind>/<tld>.json`. A TLD such as `.eus` is used on both sides of a border, and a country is not a property of a name.

To play a pack, name it:

```
ua-kit check signup.html --battery battery/packs/tld/geotld/corsica.json
ua-kit score --kind email --regex '^[^@\s]+@[^@\s]+$' --battery battery/packs/tld/geotld/eus.json
```

The file is checked against the schema before any value is typed, and the report names the file next to the version, so that a pack score is not read as a score on the standard battery. One file per run: to play several packs, run the command once for each.

## The packs, version 0.2.0

62 cases in six files, 54 to accept and 8 to refuse. Built by `scripts/build-packs.mjs`; `tests/packs.test.mjs` checks them.

| Pack | Cases | Accented name |
|---|---|---|
| `tld/geotld/bzh.json` | 11 | `kêr.bzh` |
| `tld/geotld/corsica.json` | 12 | `cità.corsica` |
| `tld/geotld/alsace.json` | 10 | `münster.alsace` |
| `tld/geotld/paris.json` | 10 | `théâtre.paris` |
| `tld/geotld/eus.json` | 10 | `iruña.eus` |
| `tld/cctld/fr.json` | 9 | `mairie-héry.fr` |

A geoTLD pack holds the TLD in ASCII (email address, domain name, URL), one accented name as a U-label and as an A-label in the same three forms, and at least one guard. `bzh`, `corsica` and `fr` also hold an email address with an accented local part. The `.fr` pack only adds accented names: plain ASCII `.fr` is in the standard battery.

Short and long follow the standard battery: a TLD of up to 4 letters is `ascii-tld-short`, 5 letters and more is `ascii-tld-long`.

A pack has few guards. Play it next to the standard battery, which holds 16: a page that accepts everything passes most of a pack.

### What the accented names stand for

- **Under `.fr` they follow a published rule.** Every character of `mairie-héry` is in the list of article 19 of the AFNIC naming charter (version of 2026-07-06), which admits `à á â ã ä å æ ç è é ê ë ì í î ï ñ ò ó ô õ ö œ ù ú û ü ý ÿ ß` next to `a`–`z`, `0`–`9` and the hyphen.
- **On the five geoTLDs they are syntax cases, and their notes say so.** Each accented character is in the IDN table the TLD publishes at IANA (tables read on 2026-10-06). A published table is not a service in use: these cases tell whether the rule that accepts `mairie-héry.fr` would also accept `kêr.bzh`. They do not show that a registrant is turned away today.
- None of the 62 values is claimed to be a registered name.

A-labels are computed by `url.domainToASCII`, never typed.

### Add a TLD

Add a row to `TLDS` in `scripts/build-packs.mjs`, run it, run `npm test`. A registry can send its own pack as a pull request.
