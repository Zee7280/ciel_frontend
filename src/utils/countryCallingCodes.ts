export type CountryDialEntry = { iso2: string; name: string; dial: string };

/**
 * Calling codes derived from mledoze/countries (idd root + suffixes).
 * Multiple rows per ISO when the dataset lists NANP-style area codes separately.
 */
export const COUNTRY_DIAL_ENTRIES: CountryDialEntry[] = [
  { iso2: "AF", name: "Afghanistan", dial: "+93" },
  { iso2: "AL", name: "Albania", dial: "+355" },
  { iso2: "DZ", name: "Algeria", dial: "+213" },
  { iso2: "AD", name: "Andorra", dial: "+376" },
  { iso2: "AO", name: "Angola", dial: "+244" },
  { iso2: "AR", name: "Argentina", dial: "+54" },
  { iso2: "AM", name: "Armenia", dial: "+374" },
  { iso2: "AU", name: "Australia", dial: "+61" },
  { iso2: "AT", name: "Austria", dial: "+43" },
  { iso2: "AZ", name: "Azerbaijan", dial: "+994" },
  { iso2: "BH", name: "Bahrain", dial: "+973" },
  { iso2: "BD", name: "Bangladesh", dial: "+880" },
  { iso2: "BY", name: "Belarus", dial: "+375" },
  { iso2: "BE", name: "Belgium", dial: "+32" },
  { iso2: "BR", name: "Brazil", dial: "+55" },
  { iso2: "BG", name: "Bulgaria", dial: "+359" },
  { iso2: "KH", name: "Cambodia", dial: "+855" },
  { iso2: "CM", name: "Cameroon", dial: "+237" },
  { iso2: "CA", name: "Canada", dial: "+1" },
  { iso2: "CN", name: "China", dial: "+86" },
  { iso2: "CO", name: "Colombia", dial: "+57" },
  { iso2: "CR", name: "Costa Rica", dial: "+506" },
  { iso2: "HR", name: "Croatia", dial: "+385" },
  { iso2: "CU", name: "Cuba", dial: "+53" },
  { iso2: "CY", name: "Cyprus", dial: "+357" },
  { iso2: "CZ", name: "Czechia", dial: "+420" },
  { iso2: "DK", name: "Denmark", dial: "+45" },
  { iso2: "EG", name: "Egypt", dial: "+20" },
  { iso2: "EE", name: "Estonia", dial: "+372" },
  { iso2: "FI", name: "Finland", dial: "+358" },
  { iso2: "FR", name: "France", dial: "+33" },
  { iso2: "GE", name: "Georgia", dial: "+995" },
  { iso2: "DE", name: "Germany", dial: "+49" },
  { iso2: "GH", name: "Ghana", dial: "+233" },
  { iso2: "GR", name: "Greece", dial: "+30" },
  { iso2: "HK", name: "Hong Kong", dial: "+852" },
  { iso2: "HU", name: "Hungary", dial: "+36" },
  { iso2: "IS", name: "Iceland", dial: "+354" },
  { iso2: "IN", name: "India", dial: "+91" },
  { iso2: "ID", name: "Indonesia", dial: "+62" },
  { iso2: "IR", name: "Iran", dial: "+98" },
  { iso2: "IQ", name: "Iraq", dial: "+964" },
  { iso2: "IE", name: "Ireland", dial: "+353" },
  { iso2: "IL", name: "Israel", dial: "+972" },
  { iso2: "IT", name: "Italy", dial: "+39" },
  { iso2: "JP", name: "Japan", dial: "+81" },
  { iso2: "JO", name: "Jordan", dial: "+962" },
  { iso2: "KZ", name: "Kazakhstan", dial: "+7" },
  { iso2: "KE", name: "Kenya", dial: "+254" },
  { iso2: "KW", name: "Kuwait", dial: "+965" },
  { iso2: "KG", name: "Kyrgyzstan", dial: "+996" },
  { iso2: "LB", name: "Lebanon", dial: "+961" },
  { iso2: "LY", name: "Libya", dial: "+218" },
  { iso2: "MY", name: "Malaysia", dial: "+60" },
  { iso2: "MV", name: "Maldives", dial: "+960" },
  { iso2: "MX", name: "Mexico", dial: "+52" },
  { iso2: "MA", name: "Morocco", dial: "+212" },
  { iso2: "NP", name: "Nepal", dial: "+977" },
  { iso2: "NL", name: "Netherlands", dial: "+31" },
  { iso2: "NZ", name: "New Zealand", dial: "+64" },
  { iso2: "NG", name: "Nigeria", dial: "+234" },
  { iso2: "NO", name: "Norway", dial: "+47" },
  { iso2: "OM", name: "Oman", dial: "+968" },
  { iso2: "PK", name: "Pakistan", dial: "+92" },
  { iso2: "PH", name: "Philippines", dial: "+63" },
  { iso2: "PL", name: "Poland", dial: "+48" },
  { iso2: "PT", name: "Portugal", dial: "+351" },
  { iso2: "QA", name: "Qatar", dial: "+974" },
  { iso2: "RO", name: "Romania", dial: "+40" },
  { iso2: "RU", name: "Russia", dial: "+7" },
  { iso2: "SA", name: "Saudi Arabia", dial: "+966" },
  { iso2: "SG", name: "Singapore", dial: "+65" },
  { iso2: "ZA", name: "South Africa", dial: "+27" },
  { iso2: "KR", name: "South Korea", dial: "+82" },
  { iso2: "ES", name: "Spain", dial: "+34" },
  { iso2: "LK", name: "Sri Lanka", dial: "+94" },
  { iso2: "SE", name: "Sweden", dial: "+46" },
  { iso2: "CH", name: "Switzerland", dial: "+41" },
  { iso2: "TH", name: "Thailand", dial: "+66" },
  { iso2: "TR", name: "Türkiye", dial: "+90" },
  { iso2: "AE", name: "United Arab Emirates", dial: "+971" },
  { iso2: "GB", name: "United Kingdom", dial: "+44" },
  { iso2: "US", name: "United States", dial: "+1" },
  { iso2: "VN", name: "Vietnam", dial: "+84" },
];

function longestCommonPrefixAll(strings: string[]): string {
  if (strings.length === 0) return "";
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    const s = strings[i];
    let j = 0;
    const max = Math.min(prefix.length, s.length);
    while (j < max && prefix[j] === s[j]) j++;
    prefix = prefix.slice(0, j);
  }
  return prefix;
}

/**
 * One option per ISO2 for phone UI: canonical calling code (e.g. US +1, not hundreds of NANP rows).
 * Full {@link COUNTRY_DIAL_ENTRIES} stays unchanged for E.164 prefix matching.
 */
export const COUNTRY_DIAL_PICKER_ENTRIES: CountryDialEntry[] = (() => {
  const byIso = new Map<string, { name: string; dials: Set<string> }>();
  for (const e of COUNTRY_DIAL_ENTRIES) {
    if (!byIso.has(e.iso2)) byIso.set(e.iso2, { name: e.name, dials: new Set() });
    const g = byIso.get(e.iso2)!;
    g.dials.add(e.dial);
    g.name = e.name;
  }
  const rows: CountryDialEntry[] = [];
  for (const [iso2, { name, dials }] of byIso) {
    const uniq = [...dials];
    let dial = longestCommonPrefixAll(uniq);
    if (dial.length <= 1) dial = uniq[0] ?? "+";
    if (!dial.startsWith("+")) dial = `+${dial.replace(/^\+?/, "")}`;
    rows.push({ iso2, name, dial });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
})();

const dialByIso = new Map<string, string>();
for (const e of COUNTRY_DIAL_ENTRIES) {
  if (!dialByIso.has(e.iso2)) dialByIso.set(e.iso2, e.dial);
}

/** Primary (first-listed) dial code for an ISO2 country. */
export function getDialCodeForIso(iso2: string): string {
  const up = iso2.trim().toUpperCase();
  return dialByIso.get(up) ?? "+92";
}

/** Default `value` for country+code selects (`ISO|E.164dial`). */
export const DEFAULT_PHONE_COUNTRY_KEY = "PK|+92";

/** Dial part from a select key `ISO|+digits` (or a bare `+digits` string). */
export function dialFromPhoneCountryKey(key: string): string {
  const k = (key || "").trim();
  const pipe = k.indexOf("|");
  if (pipe === -1) return k.startsWith("+") ? k : "+92";
  const dial = k.slice(pipe + 1).trim();
  return dial.startsWith("+") ? dial : `+${dial}`;
}

/** Longest-prefix match of E.164 dial against known codes (sorted by dial length desc). */
const SORTED_DIAL_PREFIXES: { dial: string; iso2: string }[] = (() => {
  const seenDial = new Set<string>();
  const list: { dial: string; iso2: string }[] = [];
  for (const e of COUNTRY_DIAL_ENTRIES) {
    if (seenDial.has(e.dial)) continue;
    seenDial.add(e.dial);
    list.push({ dial: e.dial, iso2: e.iso2 });
  }
  list.sort((a, b) => b.dial.length - a.dial.length);
  return list;
})();

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function formatPhoneCountryKey(e: CountryDialEntry): string {
  return `${e.iso2}|${e.dial}`;
}

/**
 * Collapse granular NANP / multi-row dials onto {@link COUNTRY_DIAL_PICKER_ENTRIES} and
 * move stripped digits into the national part so the full number is unchanged.
 */
export function normalizePhonePartsToPicker(
  phoneCountryKey: string,
  national: string
): { phoneCountryKey: string; national: string } {
  const pipe = phoneCountryKey.indexOf("|");
  if (pipe === -1) return { phoneCountryKey, national };
  const iso2 = phoneCountryKey.slice(0, pipe).trim();
  const picker = COUNTRY_DIAL_PICKER_ENTRIES.find((e) => e.iso2 === iso2);
  if (!picker) return { phoneCountryKey, national };
  const newKey = formatPhoneCountryKey(picker);
  if (newKey === phoneCountryKey) return { phoneCountryKey, national };
  const oldDial = dialFromPhoneCountryKey(phoneCountryKey);
  const newDial = picker.dial;
  const od = digitsOnly(oldDial);
  const nd = digitsOnly(newDial);
  if (!od.startsWith(nd)) return { phoneCountryKey, national };
  const transferred = od.slice(nd.length);
  return { phoneCountryKey: newKey, national: transferred + digitsOnly(national) };
}

/** Resolve a (possibly legacy granular) key to a picker row for labels and selects. */
export function resolvePhoneCountryDialEntry(phoneCountryKey: string): CountryDialEntry {
  const exact = COUNTRY_DIAL_PICKER_ENTRIES.find((e) => formatPhoneCountryKey(e) === phoneCountryKey);
  if (exact) return exact;
  const pipe = phoneCountryKey.indexOf("|");
  if (pipe !== -1) {
    const iso = phoneCountryKey.slice(0, pipe).trim();
    const byIso = COUNTRY_DIAL_PICKER_ENTRIES.find((e) => e.iso2 === iso);
    if (byIso) return byIso;
  }
  const fromFull = COUNTRY_DIAL_ENTRIES.find((e) => formatPhoneCountryKey(e) === phoneCountryKey);
  if (fromFull) {
    const byIso = COUNTRY_DIAL_PICKER_ENTRIES.find((e) => e.iso2 === fromFull.iso2);
    if (byIso) return byIso;
  }
  const def = COUNTRY_DIAL_PICKER_ENTRIES.find((e) => formatPhoneCountryKey(e) === DEFAULT_PHONE_COUNTRY_KEY);
  return def ?? COUNTRY_DIAL_PICKER_ENTRIES[0]!;
}

/**
 * Split a stored phone string into select key + national digits for UI.
 * Falls back to PK|+92 and full digit string as national if no dial matches.
 */
export function parsePhoneForDisplay(stored: string): { phoneCountryKey: string; national: string } {
  const raw = (stored || "").trim();
  if (!raw) return { phoneCountryKey: DEFAULT_PHONE_COUNTRY_KEY, national: "" };
  let rest = raw.startsWith("+") ? raw.slice(1) : raw;
  rest = digitsOnly(rest);
  if (!rest) return { phoneCountryKey: DEFAULT_PHONE_COUNTRY_KEY, national: "" };
  for (const { dial, iso2 } of SORTED_DIAL_PREFIXES) {
    const d = dial.slice(1);
    if (rest.startsWith(d)) {
      const national = rest.slice(d.length);
      return normalizePhonePartsToPicker(`${iso2}|${dial}`, national);
    }
  }
  return normalizePhonePartsToPicker(DEFAULT_PHONE_COUNTRY_KEY, rest);
}

/** E.164-style full number from select key + national digits. */
export function composeInternationalPhone(phoneCountryKey: string, nationalDigits: string): string {
  const dial = dialFromPhoneCountryKey(phoneCountryKey);
  const n = digitsOnly(nationalDigits);
  return n ? `${dial}${n}` : "";
}