// loaders/formal.mjs — group "fm", part 1: HOLY TEXTS (ethos/14-holy-texts). Other fm parts: formal-legal.mjs, formal-reference.mjs. See loaders/formal.manifest.json.
import { makeLoad } from "./_fm_common.mjs";
import * as S from "./_fm_holy_src.mjs";

const SRC = "ethos/14-holy-texts";
const HEB_TOK = "lowercase NFC word tokens (maximal runs of letters+combining marks); Hebrew vowel points kept, cantillation marks (U+0591-U+05AF), meteg, rafe and extraordinary points deleted, maqaf and punctuation separate words; no numbers";
const WLC = {
  torah: ["Gen", "Exod", "Lev", "Num", "Deut"],
  former: ["Josh", "Judg", "1Sam", "2Sam", "1Kgs", "2Kgs"],
  latter: ["Isa", "Jer", "Ezek", "Hos", "Joel", "Amos", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal"],
  poetry: ["Ps", "Job", "Prov", "Song", "Eccl", "Lam"],
  late: ["Ruth", "Esth", "Dan", "Ezra", "Neh", "1Chr", "2Chr"],
};
const wlc = (key, genre, notes) => ({
  id: `fm-wlc-${key}`, register: "scripture", language: "hbo", script: "hebr", tok: S.tokHeb, tokenisation: HEB_TOK,
  docDef: "document = chapter (book.chapter); unit = verse", source: `${SRC}/wlc-tanakh (Westminster Leningrad Codex, OSHB): ${WLC[key].join(", ")}`,
  notes: `Hebrew Bible, canonical division chosen from the tradition's own order, not from content statistics. ${notes} Obadiah is absent from the source directory.`,
  extra: { genre, books: WLC[key] }, build: () => S.wlcDocs(WLC[key]),
});
const SEDER_NOTE = "Babylonian Talmud (Sefaria Vilna / William Davidson edition, vocalised Hebrew+Aramaic, mixed Mishnah and Gemara; the file does not mark which is which)";
const talmud = (seder, label) => ({
  id: `fm-talmud-${seder}`, register: "scripture", language: "arc", script: "hebr", tok: S.tokHeb, tokenisation: HEB_TOK,
  docDef: "document = 4 consecutive daf sides (2 dapim, 2a-3b ...) of one tractate; unit = sentence (split at . ! ? : and newline)", source: `${SRC}/talmud-bavli: ${S.SEDER[seder].join(", ")}`,
  notes: `${SEDER_NOTE}. Seder ${label}. Tractate-to-seder assignment is the tradition's own (Berakhot filed with Moed and Niddah with Nashim for size/convention). Rabbinic law-and-argument prose; language mixes Hebrew and Aramaic, tagged arc.`,
  extra: { genre: "rabbinic-legal", seder, tractates: S.SEDER[seder] }, build: () => S.talmudDocs(S.SEDER[seder]),
});
const nt = (id, filt, notes) => ({
  id, register: "scripture", language: "grc", script: "grek", tok: S.tokGreek,
  tokenisation: "lowercase NFC word tokens (runs of letters+combining marks, polytonic accents kept); elision apostrophe at word end dropped; apparatus siglum brackets are punctuation",
  docDef: "document = chapter; unit = verse", source: `${SRC}/sblgnt-books (SBLGNT via MorphGNT)`, notes, extra: { genre: "koine-greek" }, build: () => S.sblgntDocs(filt),
});

export const { load, specs } = makeLoad([
  wlc("torah", "law-narrative", "Torah: narrative and legal prose."),
  wlc("former", "narrative", "Former Prophets: historical narrative."),
  wlc("latter", "prophecy", "Latter Prophets: oracle and poetry."),
  wlc("poetry", "poetry-wisdom", "Psalms, Job, Proverbs, Song of Songs, Ecclesiastes, Lamentations: poetry and wisdom, strong parallelism."),
  wlc("late", "late-prose", "Late prose (Ruth, Esther, Daniel incl. its Aramaic chapters, Ezra, Nehemiah, Chronicles)."),
  nt("fm-sblgnt-narr", (f) => /^6[1-5]-/.test(f), "SBLGNT gospels + Acts (Mt, Mk, Lk, Jn, Ac): narrative. Source has 23 NT books; Philemon, 2-3 John and Jude are absent."),
  nt("fm-sblgnt-epis", (f) => !/^6[1-5]-/.test(f), "SBLGNT epistles + Revelation (Ro..Jas, 1Pe..1Jn, Re): letters and apocalypse. Philemon, 2-3 John and Jude are absent from the source."),
  { id: "fm-nestle1904", register: "scripture", language: "grc", script: "grek", tok: S.tokGreek,
    tokenisation: "lowercase NFC word tokens from <w> elements (polytonic accents kept); elision apostrophe at word end dropped; <pc> punctuation ignored",
    docDef: "document = chapter; unit = verse", source: `${SRC}/nestle1904 (OSIS xml, 23 books)`,
    notes: "NEAR-DUPLICATE TEXT of fm-sblgnt-narr + fm-sblgnt-epis (same 23 books, a different critical edition). Use as a sibling-replication / leakage check, not as an independent pocket.",
    extra: { genre: "koine-greek", siblingOf: ["fm-sblgnt-narr", "fm-sblgnt-epis"] }, build: S.nestleDocs },
  { id: "fm-quran-ar", register: "scripture", language: "ar", script: "arab", tok: S.tokArab,
    tokenisation: "lowercase NFC word tokens; Quranic recitation signs and tatweel deleted, vowel diacritics kept, U+06E1 mapped to U+0652",
    docDef: "document = sura (81 of 114 suras are in the source); unit = ayah", source: `${SRC}/quran-suras (Tanzil text via risan/quran-json)`,
    notes: "Classical/Quranic Arabic, vocalised. Suras 1, 81-82, 84-88 and 90-114 are not in the source.", extra: { genre: "revelation" }, build: () => S.suraDocs("ar") },
  { id: "fm-quran-en-sahih", register: "scripture", language: "en", script: "latn", tok: S.tokLatin,
    tokenisation: "lowercase NFC word tokens (letters, marks, inner apostrophes); bracketed insertions kept as words",
    docDef: "document = sura (81 of 114); unit = ayah", source: `${SRC}/quran-suras (Sahih International translation)`,
    notes: "Modern English translation of the same ayat as fm-quran-ar (translation sibling).", extra: { genre: "revelation-translation", translationOf: "fm-quran-ar" }, build: () => S.suraDocs("en") },
  ...[["pickthall", "quran_en_pickthall.txt", "Pickthall (1930) English: archaic Thee/Thou register"], ["yusufali", "quran_en_yusufali.txt", "Yusuf Ali English: archaic, parenthetical"]].map(([k, f, d]) => ({
    id: `fm-quran-en-${k}`, register: "scripture", language: "en", script: "latn", tok: S.tokLatin, tokenisation: "lowercase NFC word tokens (letters, marks, inner apostrophes)",
    docDef: "document = surah (114); unit = sentence (split at . ! ? and newline; the source has verse numbers removed and one line per surah)", source: `${SRC}/tanzil-quran/${f}`,
    notes: `${d}. Same content as fm-quran-en-sahih/fm-quran-ar, all 114 suras. Translation sibling: not independent of the other Quran pockets.`, extra: { genre: "revelation-translation", translationOf: "fm-quran-ar" }, build: () => S.tanzilEnDocs(f) })),
  ...[["dn", "Digha Nikaya (long discourses)"], ["mn", "Majjhima Nikaya (middle-length discourses)"]].flatMap(([p, d]) => [
    { id: `fm-pali-${p}`, register: "scripture", language: "pi", script: "latn", tok: S.tokLatin, tokenisation: "lowercase NFC word tokens, IAST diacritics kept; em-dash separates words",
      docDef: "document = sutta (long suttas cut into equal pieces of <= ~6000 tokens (smaller for small pockets: meta.counts.pieceTokensTarget)); unit = Pali line (clause/sentence as segmented by the source)", source: `${SRC}/pali-suttas (SuttaCentral bilara, Mahasangiti root text)`,
      notes: `Pali root text, ${d}. Includes heading lines.`, extra: { genre: "discourse", collection: p }, build: () => S.paliDocs("pi", p) },
    { id: `fm-pali-en-${p}`, register: "scripture", language: "en", script: "latn", tok: S.tokLatin, tokenisation: "lowercase NFC word tokens (letters, marks, inner apostrophes)",
      docDef: "document = sutta (cut into equal pieces of <= ~6000 tokens (smaller for small pockets: meta.counts.pieceTokensTarget)); unit = English line aligned to one Pali line", source: `${SRC}/pali-suttas (Bhikkhu Sujato translation, CC0)`,
      notes: `English translation of ${d}; translation sibling of fm-pali-${p}.`, extra: { genre: "discourse-translation", collection: p, translationOf: `fm-pali-${p}` }, build: () => S.paliDocs("en", p) }]),
  { id: "fm-sanskrit", register: "scripture", language: "sa", script: "latn", tok: S.tokSanskrit,
    tokenisation: "lowercase NFC word tokens of IAST Sanskrit as the source writes it (sandhi-fused: one token = one written word); GRETIL reference ids and danda marks removed",
    docDef: "document = adhyaya (Gita) or Upanishad (cut into equal pieces of <= ~6000 tokens (smaller for small pockets: meta.counts.pieceTokensTarget)); unit = half-verse line (Gita) or clause between / // | || marks", source: `${SRC}/bhagavad-gita + ${SRC}/upanishads (GRETIL)`,
    notes: "Bhagavadgita (alone only ~9k tokens, merged here as a sibling file) + ten Upanishads: bare mantras plus Shankara-style prose commentary. Mixed verse and philosophical prose.", extra: { genre: "verse-and-commentary" }, build: () => [...S.gitaDocs(), ...S.upanishadDocs()] },
  talmud("moed", "Moed (festivals and Sabbath) + Berakhot"), talmud("nashim", "Nashim (marriage and divorce) + Niddah"),
  talmud("nezikin", "Nezikin (civil and criminal law, courts)"), talmud("kodashim", "Kodashim (sacrifices and temple)"),
  { id: "fm-midrash-he", register: "scripture", language: "arc", script: "hebr", tok: S.tokHeb, tokenisation: HEB_TOK + "; <small> citation tags removed",
    docDef: "documents = consecutive blocks of ~100 units; unit = sentence", source: `${SRC}/sefaria (Eichah Rabbah + Ruth Rabbah)`,
    notes: "Hebrew/Aramaic midrash on Lamentations and Ruth (two sibling files merged: each is alone too small).", extra: { genre: "midrash" }, blockUnits: 100, build: S.midrashDocs },
]);
