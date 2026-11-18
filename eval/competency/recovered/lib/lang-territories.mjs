// scripts/lib/lang-territories.mjs — the ONE registry of language territories and
// the readers/walkers both evaluators use (the scoreboard and the EO evaluator).
// A territory is (language × geography × period × register); a prior is the
// janus/priors POSPrior@1 for its variety; a morph-cues prior carries Sullivan's
// Provenance@1 (giver, period, region, register, script, span). Givers are named;
// a missing prior is null, never a guess.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scriptOf } from "./script-words.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const LP_ROOT = path.join(HERE, "..", "..");
export const PRIORS_DIR = path.join(LP_ROOT, "..", "janus", "priors");
export const UDHR_DIR = path.join(LP_ROOT, "06-government-legal", "un-udhr");

export const HOLD_TARGET = 2_000_000; // bytes — a modest book. Declared, not derived.
export const SAMPLE_FILES = 4;
export const SAMPLE_CHARS = 4000;
export const WEIGHTS = { read: 0.4, detect: 0.35, hold: 0.25 };
export const REGISTER_ORDER = { vulgate: 0, patrician: 1, polyvox: 2 };

// prior  : POSPrior@1 code in janus/priors/pos-<code>.json (null = no reader)
// detect : the detector code that is CORRECT for this territory's period
// accept : codes acceptable for this territory (defaults to [detect, iso1, prior])
// abstain: a no-prior language; DETECT scores the abstention rate, not a name
// kind   : "lang" (default) | "collection" (many voices; single-language score undefined)
export const REG = [
  // — PATRICIAN · the ancient canons (period-strict) —
  { key: "grc-class", name: "Ancient Greek (classical)", prior: "grc", detect: "grc", accept: ["grc"], iso1: "el",
    script: "Greek", period: "8th–4th c. BCE", geography: "Aegean & Mediterranean (Greek world)",
    register: "patrician", era: "ancient", roots: ["11-multi-language/greek-originals"] },
  { key: "lat-class", name: "Latin (classical)", prior: "lat", detect: "lat", iso1: "la",
    script: "Latin", period: "1st c. BCE–2nd c. CE", geography: "Roman world (Italy & Mediterranean)",
    register: "patrician", era: "ancient", roots: ["11-multi-language/latin-originals"] },
  { key: "hbo", name: "Biblical Hebrew", prior: "heb", detect: "hbo", accept: ["hbo"], iso1: "he",
    script: "Hebrew", period: "10th–3rd c. BCE", geography: "Levant (Judah & Israel)",
    register: "patrician", era: "ancient", roots: ["14-holy-texts/wlc-tanakh"] },
  { key: "arc", name: "Talmudic Hebrew & Aramaic", prior: "heb", detect: "arc", accept: ["arc"], iso1: "he",
    script: "Hebrew", period: "3rd–7th c. CE", geography: "Babylonia & Palestine",
    register: "patrician", era: "ancient", roots: ["14-holy-texts/talmud-bavli", "14-holy-texts/sefaria"] },
  { key: "arb-quran", name: "Classical Arabic (Qur'anic)", prior: "arb", detect: "arb", accept: ["arb", "ar"],
    iso1: "ar", script: "Arabic", period: "7th c. CE", geography: "Arabian Peninsula → Islamic world",
    register: "patrician", era: "ancient", roots: ["14-holy-texts/quran-suras", "14-holy-texts/tanzil-quran"] },
  { key: "arb-lit", name: "Classical Arabic (literary)", prior: "arb", detect: "arb", accept: ["arb", "ar"],
    iso1: "ar", script: "Arabic", period: "8th–15th c. CE", geography: "Islamic world",
    register: "patrician", era: "ancient", roots: ["11-multi-language/arabic-originals"] },
  { key: "san", name: "Sanskrit", prior: "san", detect: "san", accept: ["san"], iso1: "sa",
    script: "Devanagari / IAST", period: "1500 BCE–1500 CE", geography: "Indian subcontinent",
    register: "patrician", era: "ancient",
    roots: ["11-multi-language/sanskrit-originals", "14-holy-texts/upanishads", "14-holy-texts/bhagavad-gita"] },
  { key: "pli", name: "Pali", prior: null, detect: null, iso1: "pi", abstain: true,
    script: "Brahmi-derived", period: "3rd c. BCE–1st millennium CE", geography: "Indian subcontinent & Sri Lanka",
    register: "patrician", era: "ancient", roots: ["14-holy-texts/pali-suttas", "14-holy-texts/suttacentral"] },
  { key: "lzh", name: "Literary Chinese (wenyan)", prior: "lzh", detect: "lzh", accept: ["lzh"], iso1: "zh",
    script: "Han", period: "5th c. BCE–20th c. CE", geography: "China & East Asian literati sphere",
    register: "patrician", era: "ancient",
    roots: ["11-multi-language/chinese-originals", "14-holy-texts/tao-te-ching"] },
  { key: "non", name: "Old Norse", prior: null, detect: null, iso1: null, abstain: true,
    script: "Latin", period: "9th–14th c. CE", geography: "Scandinavia (Iceland & Norway)",
    register: "patrician", era: "ancient", roots: ["11-multi-language/old-norse-originals"] },
  { key: "ave", name: "Avestan (Gathas)", prior: null, detect: null, iso1: null, abstain: true,
    script: "Avestan", period: "~1500–1000 BCE", geography: "Iranian plateau & Central Asia",
    register: "patrician", era: "ancient", roots: ["11-multi-language/avestan"] },
  { key: "sux", name: "Sumerian", prior: null, detect: null, iso1: null, abstain: true,
    script: "Cuneiform (transliteration)", period: "4th–2nd millennium BCE", geography: "Sumer (southern Mesopotamia)",
    register: "patrician", era: "ancient", roots: ["11-multi-language/mesopotamian"], ignore: ["amarna-letters"] },
  { key: "akk", name: "Akkadian (Amarna)", prior: null, detect: null, iso1: null, abstain: true,
    script: "Cuneiform (transliteration)", period: "14th c. BCE", geography: "Mesopotamia & the Near East",
    register: "polyvox", era: "ancient", roots: ["11-multi-language/mesopotamian/amarna-letters"] },
  { key: "egy", name: "Egyptian", prior: null, detect: null, iso1: null, abstain: true,
    script: "Hieroglyphic (held as translations)", period: "~2400–100 BCE", geography: "Nile Valley (Egypt)",
    register: "patrician", era: "ancient", roots: ["11-multi-language/egyptian"] },

  // — VULGATE · the common tongue of the old world (the period-split of the canons above) —
  { key: "grc-koine", name: "Koine Greek (the common tongue)", prior: "grc", detect: "grc", accept: ["grc"], iso1: "el",
    script: "Greek", period: "3rd c. BCE–4th c. CE", geography: "Hellenistic Mediterranean",
    register: "vulgate", era: "ancient",
    roots: ["14-holy-texts/sblgnt", "14-holy-texts/sblgnt-books", "14-holy-texts/nestle1904"] },

  // — PATRICIAN · the modern literary & legal canons —
  { key: "eng", name: "English (modern literary)", prior: "eng", detect: "en", iso1: "en",
    script: "Latin", period: "15th c.–present", geography: "British Isles → global",
    register: "patrician", era: "modern",
    roots: ["01-literature-books/gutenberg", "05-academic-papers", "15-western-canon", "02-encyclopedic"],
    // the gutenberg dir holds 5 non-English works that must not deflate English's number
    ignore: ["The_Iliad__Greek_", "Les_Mis_rables__French_", "The_Aeneid__Latin_", "Faust__German_", "Don_Quixote__Spanish_"] },
  { key: "ell", name: "Modern Greek", prior: "ell", detect: "el", iso1: "el",
    script: "Greek", period: "16th c.–present", geography: "Greece & Cyprus",
    register: "patrician", era: "modern",
    roots: ["11-multi-language/wikipedia-lang/el", "06-government-legal/world-legislation/gr"] },
  { key: "fas", name: "Persian (New Persian)", prior: "fas", detect: "fa", iso1: "fa",
    script: "Arabic", period: "10th c.–present", geography: "Iran & Greater Iran",
    register: "patrician", era: "modern",
    roots: ["11-multi-language/persian-originals", "24-global-literature/fa", "11-multi-language/wikipedia-lang/fa"] },
  { key: "jpn", name: "Japanese", prior: "jpn", detect: "ja", iso1: "ja",
    script: "Kana & Han", period: "8th c.–present", geography: "Japan",
    register: "patrician", era: "modern",
    roots: ["11-multi-language/japanese-originals", "11-multi-language/gutenberg-non-en/ja", "24-global-literature/ja"] },
  { key: "deu", name: "German", prior: "deu", detect: "de", iso1: "de",
    script: "Latin", period: "16th c.–present", geography: "Central Europe",
    register: "patrician", era: "modern",
    roots: ["11-multi-language/german-originals", "11-multi-language/gutenberg-non-en/de", "06-government-legal/world-legislation/de"] },
  { key: "fra", name: "French", prior: "fra", detect: "fr", iso1: "fr",
    script: "Latin", period: "9th c.–present", geography: "France & Francophonie",
    register: "patrician", era: "modern",
    roots: ["11-multi-language/french-originals", "11-multi-language/gutenberg-non-en/fr", "06-government-legal/world-legislation/fr"] },
  { key: "ita", name: "Italian", prior: "ita", detect: "it", iso1: "it",
    script: "Latin", period: "13th c.–present", geography: "Italy",
    register: "patrician", era: "modern",
    roots: ["11-multi-language/italian-originals", "06-government-legal/world-legislation/it"] },
  { key: "spa", name: "Spanish", prior: "spa", detect: "es", iso1: "es",
    script: "Latin", period: "13th c.–present", geography: "Iberia & Latin America",
    register: "patrician", era: "modern",
    roots: ["24-global-literature/es", "06-government-legal/world-legislation/es"] },
  { key: "por", name: "Portuguese", prior: "por", detect: "pt", iso1: "pt",
    script: "Latin", period: "13th c.–present", geography: "Iberia & the Lusophone world",
    register: "patrician", era: "modern", roots: ["24-global-literature/pt"] },
  { key: "cat", name: "Catalan", prior: "cat", detect: "ca", iso1: "ca",
    script: "Latin", period: "12th c.–present", geography: "Catalonia, Valencia & the Balearics",
    register: "patrician", era: "modern", roots: ["24-global-literature/ca"] },
  { key: "glg", name: "Galician", prior: "glg", detect: "gl", iso1: "gl",
    script: "Latin", period: "12th c.–present", geography: "Galicia (NW Iberia)",
    register: "patrician", era: "modern", roots: ["24-global-literature/gl"] },
  { key: "nld", name: "Dutch", prior: "nld", detect: "nl", iso1: "nl",
    script: "Latin", period: "13th c.–present", geography: "Low Countries",
    register: "patrician", era: "modern", roots: ["06-government-legal/world-legislation/nl"] },
  { key: "tur", name: "Turkish", prior: "tur", detect: "tr", iso1: "tr",
    script: "Latin", period: "13th c.–present", geography: "Anatolia & Thrace",
    register: "patrician", era: "modern", roots: ["11-multi-language/wikipedia-lang/tr"] },
  { key: "tel", name: "Telugu", prior: "tel", detect: "te", iso1: "te",
    script: "Telugu", period: "11th c.–present", geography: "Andhra & Telangana",
    register: "patrician", era: "modern", roots: ["24-global-literature/te"] },
  { key: "heb", name: "Modern Hebrew", prior: "heb", detect: "he", iso1: "he",
    script: "Hebrew", period: "19th c.–present", geography: "Israel & diaspora",
    register: "patrician", era: "modern",
    roots: ["24-global-literature/he", "11-multi-language/wikipedia-lang/he"] },
  { key: "cmn", name: "Mandarin Chinese (baihua)", prior: "cmn", detect: "zh", iso1: "zh",
    script: "Han", period: "14th c.–present", geography: "China",
    register: "patrician", era: "modern", roots: ["24-global-literature/zh"] },
  { key: "kor", name: "Korean", prior: "kor", detect: "ko", iso1: "ko",
    script: "Hangul & Han", period: "15th c.–present", geography: "Korea",
    register: "patrician", era: "modern", roots: ["11-multi-language/wikipedia-lang/ko"] },
  { key: "rus", name: "Russian", prior: "rus", detect: "ru", iso1: "ru",
    script: "Cyrillic", period: "10th c.–present", geography: "Russia & the East Slavic world",
    register: "patrician", era: "modern", roots: ["11-multi-language/war-and-peace/ru"] },
  { key: "ukr", name: "Ukrainian", prior: "ukr", detect: "uk", iso1: "uk", script: "Cyrillic",
    period: "18th c.–present", geography: "Ukraine", register: "patrician", era: "modern", roots: [] },
  { key: "pol", name: "Polish", prior: "pol", detect: "pl", iso1: "pl", script: "Latin",
    period: "13th c.–present", geography: "Poland", register: "patrician", era: "modern",
    roots: ["06-government-legal/world-legislation/pl"] },
  { key: "ces", name: "Czech", prior: "ces", detect: "cs", iso1: "cs", script: "Latin",
    period: "13th c.–present", geography: "Bohemia & Moravia", register: "patrician", era: "modern",
    roots: ["06-government-legal/world-legislation/cz"] },
  { key: "slk", name: "Slovak", prior: "slk", detect: "sk", iso1: "sk", script: "Latin",
    period: "18th c.–present", geography: "Slovakia", register: "patrician", era: "modern",
    roots: ["06-government-legal/world-legislation/sk"] },
  { key: "ron", name: "Romanian", prior: "ron", detect: "ro", iso1: "ro", script: "Latin",
    period: "16th c.–present", geography: "Romania & Moldova", register: "patrician", era: "modern",
    roots: ["06-government-legal/world-legislation/ro"] },
  { key: "swe", name: "Swedish", prior: "swe", detect: "sv", iso1: "sv", script: "Latin",
    period: "13th c.–present", geography: "Sweden", register: "patrician", era: "modern",
    roots: ["06-government-legal/world-legislation/se"] },
  { key: "nob", name: "Norwegian (Bokmål)", prior: "nob", detect: "no", iso1: "no", script: "Latin",
    period: "19th c.–present", geography: "Norway", register: "patrician", era: "modern",
    roots: ["06-government-legal/world-legislation/no"] },
  { key: "lav", name: "Latvian", prior: "lav", detect: "lv", iso1: "lv", script: "Latin",
    period: "16th c.–present", geography: "Latvia", register: "patrician", era: "modern",
    roots: ["06-government-legal/world-legislation/lv"] },

  // — PATRICIAN · prior-bearing languages held only by the UDHR (thin) —
  { key: "mar", name: "Marathi", prior: "mar", detect: "mr", iso1: "mr", script: "Devanagari",
    period: "13th c.–present", geography: "Maharashtra (India)", register: "patrician", era: "modern", roots: [] },
  { key: "tam", name: "Tamil", prior: "tam", detect: "ta", iso1: "ta", script: "Tamil",
    period: "3rd c. BCE–present", geography: "Tamil Nadu & Sri Lanka", register: "patrician", era: "modern", roots: [] },
  { key: "hin", name: "Hindi", prior: "hin", detect: "hi", iso1: "hi", script: "Devanagari",
    period: "10th c.–present", geography: "North India", register: "patrician", era: "modern", roots: [] },
  { key: "urd", name: "Urdu", prior: "urd", detect: "ur", iso1: "ur", script: "Arabic",
    period: "13th c.–present", geography: "South Asia", register: "patrician", era: "modern", roots: [] },
  { key: "hrv", name: "Croatian", prior: "hrv", detect: "hr", iso1: "hr", script: "Latin",
    period: "17th c.–present", geography: "Croatia & the Balkans", register: "patrician", era: "modern", roots: [] },
  { key: "srp", name: "Serbian", prior: "srp", detect: "sr", iso1: "sr", script: "Cyrillic",
    period: "12th c.–present", geography: "Serbia & the Balkans", register: "patrician", era: "modern", roots: [] },
  { key: "bul", name: "Bulgarian", prior: "bul", detect: "bg", iso1: "bg", script: "Cyrillic",
    period: "10th c.–present", geography: "Bulgaria", register: "patrician", era: "modern", roots: [] },
  { key: "slv", name: "Slovene", prior: "slv", detect: "sl", iso1: "sl", script: "Latin",
    period: "16th c.–present", geography: "Slovenia", register: "patrician", era: "modern", roots: [] },
  { key: "hun", name: "Hungarian", prior: "hun", detect: "hu", iso1: "hu", script: "Latin",
    period: "13th c.–present", geography: "Hungary & the Carpathian basin", register: "patrician", era: "modern", roots: [] },
  { key: "fin", name: "Finnish", prior: "fin", detect: "fi", iso1: "fi", script: "Latin",
    period: "16th c.–present", geography: "Finland", register: "patrician", era: "modern", roots: [] },
  { key: "est", name: "Estonian", prior: "est", detect: "et", iso1: "et", script: "Latin",
    period: "16th c.–present", geography: "Estonia", register: "patrician", era: "modern", roots: [] },
  { key: "lit", name: "Lithuanian", prior: "lit", detect: "lt", iso1: "lt", script: "Latin",
    period: "16th c.–present", geography: "Lithuania", register: "patrician", era: "modern", roots: [] },
  { key: "cym", name: "Welsh", prior: "cym", detect: "cy", iso1: "cy", script: "Latin",
    period: "6th c.–present", geography: "Wales", register: "patrician", era: "modern", roots: [] },
  { key: "gle", name: "Irish", prior: "gle", detect: "ga", iso1: "ga", script: "Latin",
    period: "4th c.–present", geography: "Ireland", register: "patrician", era: "modern", roots: [] },
  { key: "eus", name: "Basque", prior: "eus", detect: "eu", iso1: "eu", script: "Latin",
    period: "pre-Roman–present", geography: "Basque Country (Pyrenees)", register: "patrician", era: "modern", roots: [] },
  { key: "mlt", name: "Maltese", prior: "mlt", detect: "mt", iso1: "mt", script: "Latin",
    period: "9th c.–present", geography: "Malta", register: "patrician", era: "modern", roots: [] },
  { key: "hye", name: "Armenian", prior: "hye", detect: "hy", iso1: "hy", script: "Armenian",
    period: "5th c.–present", geography: "Armenian Highlands & diaspora", register: "patrician", era: "modern", roots: [] },
  { key: "kat", name: "Georgian", prior: "kat", detect: "ka", iso1: "ka", script: "Georgian",
    period: "5th c.–present", geography: "Caucasus (Georgia)", register: "patrician", era: "modern", roots: [] },
  { key: "vie", name: "Vietnamese", prior: "vie", detect: "vi", iso1: "vi", script: "Latin",
    period: "11th c.–present", geography: "Vietnam", register: "vulgate", era: "modern",
    roots: ["18-childrens-books/global-digital-library/vi"] },
  { key: "ind", name: "Indonesian", prior: "ind", detect: "id", iso1: "id", script: "Latin",
    period: "20th c.–present", geography: "Indonesia", register: "patrician", era: "modern", roots: [] },
  { key: "afr", name: "Afrikaans", prior: "afr", detect: "af", iso1: "af", script: "Latin",
    period: "18th c.–present", geography: "South Africa & Namibia", register: "vulgate", era: "modern",
    roots: ["24-global-literature/af"] },

  // — VULGATE · the common tongue as the corpus holds it (many voices; no single target) —
  { key: "eng-vul", name: "English (vernacular / testimony)", prior: "eng", detect: "en", iso1: "en",
    script: "Latin", period: "18th–21st c. CE", geography: "global (colonial & diasporic)",
    register: "vulgate", era: "modern", roots: ["20-first-person-voices", "22-commons", "23-healing"] },
  { key: "vul-community", name: "Organic community chat (en/zh/de/es/it)", kind: "collection", prior: null, detect: null,
    script: "mixed", period: "1998–2022 CE", geography: "Singapore, Europe, US, China (online)",
    register: "vulgate", era: "modern", roots: ["19-organic-community"] },
  { key: "vul-voices", name: "First-person voices & oral histories", kind: "collection", prior: null, detect: null,
    script: "mixed (mostly Latin)", period: "1771–1990 CE", geography: "global (diaspora, enslaved, colonized)",
    register: "vulgate", era: "modern", roots: ["20-first-person-voices"] },
  { key: "vul-children", name: "Children's books (17 languages)", kind: "collection", prior: null, detect: null,
    script: "mixed", period: "contemporary", geography: "global (Africa & Global South)",
    register: "vulgate", era: "modern", roots: ["18-childrens-books"] },
  { key: "vul-creole", name: "Dialects, pidgins & creoles", kind: "collection", prior: null, detect: null,
    script: "mixed", period: "documented 19th–21st c. CE", geography: "Atlantic, Pacific, Indian Ocean",
    register: "vulgate", era: "modern", roots: ["11-multi-language/dialects-pidgins-creoles"] },
  { key: "vul-healing", name: "Healing & self-care (popular)", kind: "collection", prior: null, detect: null,
    script: "mixed", period: "17th–20th c. CE", geography: "Europe & indigenous America",
    register: "vulgate", era: "modern", roots: ["23-healing"] },

  // — POLYVOX · the many-voiced tongue (many voices; no single target) —
  { key: "poly-udhr", name: "UDHR (one text, ~516 languages)", kind: "collection", prior: null, detect: null,
    script: "mixed", period: "1948 CE", geography: "global (UN)",
    register: "polyvox", era: "modern", roots: ["06-government-legal/un-udhr"] },
  { key: "poly-parallel", name: "Parallel classics (same work, many editions)", kind: "collection", prior: null, detect: null,
    script: "mixed", period: "18th–19th c. CE translations", geography: "global",
    register: "polyvox", era: "modern", roots: ["11-multi-language/parallel-classics"] },
  { key: "poly-concepticon", name: "Concepticon (cross-linguistic concept backbone)", kind: "collection", prior: null, detect: null,
    script: "Latin (fieldwork)", period: "contemporary", geography: "global (~160 concept lists)",
    register: "polyvox", era: "modern", roots: ["11-multi-language/concepticon"] },
  { key: "poly-global", name: "Global literature (the polyphony in original scripts)", kind: "collection", prior: null, detect: null,
    script: "mixed", period: "15th–20th c. CE", geography: "Global South",
    register: "polyvox", era: "modern", roots: ["24-global-literature"] },
  { key: "poly-wikipedia", name: "Wikipedia (16 encyclopedic languages)", kind: "collection", prior: null, detect: null,
    script: "mixed", period: "contemporary", geography: "global",
    register: "polyvox", era: "modern", roots: ["11-multi-language/wikipedia-lang"] },

  // — CONSTRUCTED / unwritten —
  { key: "epo", name: "Esperanto", prior: null, detect: "eo", accept: ["epo", "eo"], iso1: "eo", script: "Latin",
    period: "1887 CE–present", geography: "constructed (international)", register: "polyvox", era: "construct",
    roots: ["24-global-literature/eo"] },
  { key: "tgl", name: "Tagalog", prior: null, detect: "tl", iso1: "tl", script: "Latin",
    period: "16th c.–present", geography: "Philippines", register: "vulgate", era: "modern",
    roots: ["24-global-literature/tl"], abstain: true },
];

// ── ISO helpers (UDHR filenames are mostly ISO 639-3) ─────────────────────────
export const UDHR3 = { el: ["ell", "ell_monotonic", "ell_polytonic"], ar: ["arb"], he: ["heb"], zh: ["cmn_hans", "cmn"],
  fr: ["fra"], de: ["deu"], it: ["ita"], es: ["spa"], pt: ["por"], ca: ["cat"], gl: ["glg"], nl: ["nld"], sv: ["swe"],
  da: ["dan"], no: ["nob", "nno"], ro: ["ron"], pl: ["pol"], cs: ["ces"], sk: ["slk"], sl: ["slv"], hr: ["hrv"],
  bg: ["bul"], tr: ["tur"], id: ["ind"], fi: ["fin"], et: ["est"], hu: ["hun"], vi: ["vie"], lt: ["lit"],
  lv: ["lav"], cy: ["cym"], ga: ["gle"], mt: ["mlt"], eu: ["eus"], ru: ["rus"], uk: ["ukr"], la: ["lat", "lat_1"],
  sa: ["san", "san_gran"], mr: ["mar"], hi: ["hin"], ta: ["tam"], te: ["tel"], ur: ["urd"], ja: ["jpn"], ko: ["kor"],
  fa: ["fas"], sr: ["srp", "srp_cyrl", "srp_latn"], hy: ["hye"], ka: ["kat"] };

export function udhrFor(row) {
  if (!row.iso1) return null;
  for (const c of (UDHR3[row.iso1] ?? [])) {
    const f = path.join(UDHR_DIR, `udhr-${c}.txt`);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

export function walkTextFiles(dir, ignore = []) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const abs = path.join(d, e.name);
      if (ignore.some((ig) => abs.includes(ig))) continue;
      if (e.isDirectory()) { stack.push(abs); continue; }
      if (/\.(txt|md)$/i.test(e.name) && !/README|ATTRIBUTION/i.test(e.name)) out.push(abs);
    }
  }
  return out.sort();
}

export const clean = (t) => String(t).replace(/^---\n[\s\S]*?\n---\n/, "").replace(/\r\n?/g, "\n");

export function sampleOf(files, n = SAMPLE_FILES, chars = SAMPLE_CHARS) {
  const parts = [];
  for (const f of files.slice(0, n)) {
    try { parts.push(clean(fs.readFileSync(f, "utf8")).slice(0, chars)); } catch { /* skip */ }
  }
  return parts;
}

// a collection samples ACROSS its top-level subdirectories, so one dir never
// speaks for the whole polyphony (global-literature's first dir is Afrikaans)
export function samplesFor(row, files) {
  if (row.kind !== "collection") return sampleOf(files);
  const picks = [];
  for (const root of row.roots ?? []) {
    const abs = path.join(LP_ROOT, root);
    let subs = [];
    try { subs = fs.readdirSync(abs, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort(); } catch { /* skip */ }
    for (const s of subs) {
      const fs2 = walkTextFiles(path.join(abs, s), row.ignore ?? []);
      if (fs2.length) picks.push(fs2[0]);
    }
  }
  return picks.length ? sampleOf(picks) : sampleOf(files);
}

export const SCRIPTS = new Set(["Han", "Kana", "Hangul", "Arabic", "Hebrew", "Thai", "Khmer", "Lao", "Myanmar",
  "Devanagari", "Bengali", "Tamil", "Telugu", "Cyrillic", "Greek", "Latin"]);
export function acceptableScripts(s) {
  if (!s || /mixed/i.test(s)) return null;
  const set = new Set();
  for (const tok of s.split(/[^A-Za-z]+/)) {
    if (SCRIPTS.has(tok)) set.add(tok);
    if (tok === "IAST") set.add("Latin"); // romanised Sanskrit/Indic
  }
  return set.size ? set : null;
}
// a bilingual corpus (the Qur'an held with an English gloss) must be read in its
// OWN script; keep only lines the target script owns, so the gloss cannot answer
export function filterByScript(text, scripts) {
  const kept = text.split("\n").filter((ln) => {
    const t = ln.trim(); if (!t) return false;
    const s = scriptOf(t); return scripts.has(s) || s === "Unknown";
  });
  return kept.join("\n");
}

export function priorFor(code) {
  if (!code) return null;
  const f = path.join(PRIORS_DIR, `pos-${code}.json`);
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; }
}

// ── Sullivan's provenance, Chomsky's parameters, Talmy's lens ─────────────────
// The priors already STORE who they are: morph-cues-<lang>.json carries a
// Provenance@1 with giver, period, region, register, script and the treebank's
// own language.stage/span. Reading that back is the difference between guessing
// why a language scores low and MEASURING it: pos-san is Vedic, so classical
// Sanskrit is read by the wrong parameter; pos-grc is Ionic+Koine, so Homer and
// Attic tragedy are read by the wrong parameter. Chomsky: principles are
// universal, the lexicon is a parameter set per variety. Talmy: region/register.
export const MORPH_FOR = { eng: "en", lat: "la", grc: "grc", san: "sa-vedic", arb: "ar", heb: "he" };
export const SPAN = { "grc-class": [-750, -350], "grc-koine": [-100, 150], "lat-class": [-100, 200],
  hbo: [-1000, -300], arc: [200, 600], "arb-quran": [600, 700], "arb-lit": [700, 1500],
  san: [-500, 1500], lzh: [-500, 1900], non: [800, 1400], ave: [-1500, -1000],
  sux: [-3000, -2000], akk: [-1400, -1340], egy: [-2400, -100] };
const val = (x) => (x && typeof x === "object" ? (x.value ?? null) : (x ?? null));

export function loadMorphMeta(code) {
  const mc = MORPH_FOR[code];
  if (!mc) return null;
  const f = path.join(PRIORS_DIR, `morph-cues-${mc}.json`);
  if (!fs.existsSync(f)) return null;
  try {
    const p = JSON.parse(fs.readFileSync(f, "utf8"));
    return { file: `morph-cues-${mc}.json`, name: p.language?.name ?? null, stage: p.language?.stage ?? null,
      span: p.language?.span ? [p.language.span.from, p.language.span.to] : null,
      period: val(p.provenance?.period), region: val(p.provenance?.region),
      register: val(p.provenance?.register), script: val(p.provenance?.script),
      regionBasis: p.provenance?.region?.basis ?? null };
  } catch { return null; }
}

export function fitOf(key, morph, terrScript) {
  const ts = SPAN[key];
  if (!morph) return { verdict: "unstated", reason: "no morph-cues provenance on disk (Sullivan gap)" };
  if (!ts) return { verdict: "n/a", reason: "modern territory — not period-tested", priorStage: morph.stage, priorRegister: morph.register };
  if (!morph.span) return { verdict: "unstated", reason: "prior stores no span", priorStage: morph.stage, priorRegister: morph.register };
  const [a, b] = ts, [c, d] = morph.span;
  const ov = Math.max(0, Math.min(b, d) - Math.max(a, c));
  const frac = ov <= 0 ? 0 : ov / Math.min(b - a, d - c);
  const verdict = ov <= 0 ? "outside" : frac >= 0.8 ? "fit" : "partial";
  const ps = String(morph.script ?? "").split(/[ (]/)[0];
  const scriptMatch = terrScript && ps ? (terrScript.includes(ps) || (ps === "Latin" && /IAST|Latin/i.test(terrScript))) : null;
  return { verdict, reason: `territory ${a}..${b} vs prior ${c}..${d} (overlap ${Math.round(frac * 100)}%)`,
    scriptMatch, priorStage: morph.stage, priorRegister: morph.register };
}
