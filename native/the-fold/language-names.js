// language-names.js — a language is identified by its OWN name in its OWN script (the autonym: Ἑλληνική, संस्कृतम्, 普通话, русский), with English names and the ISO codes as aliases.
//
//   languageIdentity(name) -> { stem, autonym, script, english[], iso1, iso3, aliases[], source, gap } | null     any of the names below finds the language
//   stemFromName(name)     -> the prior stem, or null; an ambiguous name (Chinese: Traditional or Simplified) answers with the first stem and `ambiguousWith`
//   autonymOf(stem), describeLanguage(stem)  -> "Ἑλληνική (Ancient Greek, grc)"
//
// The names are DATA (./language-names.data.js, built by scripts/build-language-names.mjs from CLDR through Intl.DisplayNames, plus a declared table with its source for what CLDR lacks). A language with no autonym source
// is reported with a `gap`, never a made-up name. `stemOf` (language-grammar.js) falls back on this index, so a caller may now say "Ἑλληνική", "Ancient Greek", "grc" or "el"-style codes alike.
import { LANGUAGE_NAMES } from "./language-names.data.js";

const norm = (s) => String(s ?? "").normalize("NFC").trim().toLocaleLowerCase("und").replace(/_/g, "-");
let index = null;
function build() {
  const m = new Map(); const add = (name, stem) => { const k = norm(name); if (!k) return; const l = m.get(k) ?? []; if (!l.includes(stem)) l.push(stem); m.set(k, l); };
  for (const [stem, r] of Object.entries(LANGUAGE_NAMES.languages)) { add(stem, stem); if (r.autonym) add(r.autonym, stem); for (const e of r.english) add(e, stem); for (const a of r.aliases) add(a, stem); if (r.iso1) add(r.iso1, stem); if (r.iso3) add(r.iso3, stem); }
  return m;
}
const idx = () => (index ??= build());
export const LANGUAGES = LANGUAGE_NAMES.languages;
export const stemsForName = (name) => idx().get(norm(name)) ?? [];
export function stemFromName(name) { const l = stemsForName(name); return l.length ? l[0] : null; }
export function languageIdentity(name) { const l = stemsForName(name); if (!l.length) return null; const r = LANGUAGES[l[0]]; return l.length > 1 ? { ...r, ambiguousWith: l.slice(1) } : { ...r }; }
export const autonymOf = (stem) => LANGUAGES[stem]?.autonym ?? null;
export function describeLanguage(stem) { const r = LANGUAGES[stem]; if (!r) return String(stem); const en = r.english[0]; return r.autonym ? `${r.autonym} (${[en, stem].filter(Boolean).join(", ")})` : `${en ?? stem} (${stem}; no autonym on record)`; }
