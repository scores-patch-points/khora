// loaders/formal-legal.mjs — group "fm", part 2: GOVERNMENT / LEGAL (ethos/06-government-legal): national legislation per jurisdiction, UN UDHR translations per script class, CIA World Factbook.
import { makeLoad } from "./_fm_common.mjs";
import * as S from "./_fm_legal_src.mjs";

const SRC = "ethos/06-government-legal";
const TOK_W = "lowercase NFC word tokens (maximal runs of letters, combining marks and digits; inner apostrophes kept so French/Italian/Catalan elisions such as l'auteur are ONE token); tokens without a letter dropped; urls and markdown removed";
const law = (code) => {
  const [lang, name] = S.JURIS[code], dirs = code === "be" ? ["be", "lu"] : [code];
  return {
    id: `fm-law-${code}`, register: "legal", language: lang, script: S.SCRIPT_OF[lang] ?? "latn", tokenisation: TOK_W,
    docDef: "document = a law file, cut into equal pieces of at most ~6000 tokens (smaller pieces, down to ~1200, for small pockets so that they reach ~40 documents); whole pieces are taken in sha256 order up to 300k tokens; unit = sentence (split at newline and . ! ? ; sentence punctuation)",
    source: `${SRC}/world-legislation/${dirs.join(" + ")} (legalize.dev mirror of the official feed)`,
    notes: `${name}: statutes, codes and regulations as published; markdown heading lines (article numbers, part and chapter titles) removed so body prose only; frontmatter, markdown, html and urls removed.${code === "be" ? " Belgian files (all frontmatter language fr) and the 3 Luxembourg files (alone ~15k tokens) merged." : ""}${code === "uk" ? " England, Wales, Scotland and Northern Ireland acts (all English)." : ""}${code === "no" ? " Only 3 files: Constitution, penal code, education act (the last in Nynorsk)." : ""}`,
    extra: { genre: "statute", jurisdiction: code }, build: () => S.lawDocs(dirs),
  };
};
const udhr = (cls, id, lang, script, tok, tokenisation, notes) => ({
  id, register: "legal", language: lang, script, tok, tokenisation,
  docDef: "document = one translation of the UDHR (one language or dialect variant per document; whole documents in sha256 order up to 300k tokens); unit = sentence (split at newline and sentence punctuation incl. Arabic and Indic marks)",
  source: `${SRC}/un-udhr (OHCHR translations, 516 files)`, notes: `${notes} MULTILINGUAL PARALLEL POCKET: every document says the same thing in a different language, so vocabularies of different documents barely overlap. Per-document language labels are in meta.docLabels.`,
  extra: { genre: "charter", multilingual: true, udhrClass: cls }, build: () => S.udhrDocs(cls),
});
export const { load, specs } = makeLoad([
  ...Object.keys(S.JURIS).map(law),
  udhr("latn", "fm-udhr-latn", "mul", "latn", undefined, TOK_W, "All Latin-script translations (411 of 516 files; the cap keeps whole translations only)."),
  udhr("cyrl", "fm-udhr-cyrl", "mul", "cyrl", undefined, TOK_W, "All Cyrillic-script translations (35)."),
  udhr("other", "fm-udhr-other", "mul", "multi", undefined, TOK_W + "; words as the source segments them (space-delimited)",
    "Space-delimited translations in every remaining script (Arabic, Devanagari, Greek, Hebrew, Armenian, Georgian, Ethiopic, Indic scripts, Canadian syllabics, Cherokee, Syriac ...). Script field is 'multi'."),
  udhr("bigram", "fm-udhr-bigram", "mul", "multi", S.tokBigram, "OVERLAPPING CHARACTER BIGRAMS of letter runs in scripts written without word spaces (Han, Hiragana/Katakana, Thai, Lao, Khmer, Myanmar): no word segmentation exists in the source; combining marks are dropped inside bigrams, a single-letter run stays a unigram. NOT word-grain: do not compare with word pockets.",
    "Han (Chinese varieties), Japanese, Thai and Burmese/Mon/Shan translations as character bigrams."),
  { id: "fm-factbook", register: "reference", language: "en", script: "latn", tokenisation: TOK_W + "; <br> -> line break, other html removed; numbers dropped",
    docDef: "document = one country/entity file (cut into equal pieces of <= ~6000 tokens (smaller for small pockets: meta.counts.pieceTokensTarget) when longer); unit = line/sentence (newline and . ! ? split)", source: `${SRC}/world-factbook (CIA World Factbook, public domain)`,
    notes: "Highly TEMPLATED reference text (field labels such as Area, Climate repeat in every document; many number-heavy lines whose numbers are dropped). Field labels kept as text, not removed.", extra: { genre: "templated-reference" }, build: S.factbookDocs },
]);
