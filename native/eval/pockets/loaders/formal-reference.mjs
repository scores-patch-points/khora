// loaders/formal-reference.mjs — group "fm", part 3: ACADEMIC (05-academic-papers) and ENCYCLOPEDIC (02-encyclopedic). 08-news-current had only one 1.3k-word file: skipped (see manifest).
import { makeLoad } from "./_fm_common.mjs";
import * as S from "./_fm_ref_src.mjs";

const A = "ethos/05-academic-papers", E = "ethos/02-encyclopedic";
const TOK = "lowercase NFC word tokens (maximal runs of letters, combining marks and digits; inner apostrophes kept); tokens without a letter dropped; urls, markdown, html and tex math removed";
const ntrs = (id, lo, hi, era) => ({
  id, register: "academic", language: "en", script: "latn", tokenisation: TOK,
  docDef: "document = one NASA technical report (cut into equal pieces of <= ~6000 tokens (smaller for small pockets: meta.counts.pieceTokensTarget) when longer; whole pieces taken in sha256 order up to 300k tokens); unit = sentence of hard-wrapped text (blank line = paragraph break; split at . ! ? )",
  source: `${A}/ntrs-white-papers (NASA NTRS, public domain), accession year ${lo}-${hi}`,
  notes: `${era}. Text is pdf extraction / mechanical OCR: recognition noise (garbled words, stray symbols, broken tables) is retained, except lines made mostly of single characters. Era is a confound with OCR quality.`,
  extra: { genre: "technical-report", eraYears: [lo, hi] }, build: () => S.ntrsDocs(lo, hi),
});
export const { load, specs } = makeLoad([
  ntrs("fm-ntrs-1965-71", 1965, 1971, "NASA reports 1965-1971 (35 papers): heat transfer, gas radiation, aerodynamics"),
  ntrs("fm-ntrs-1972-99", 1972, 1999, "NASA reports 1972-1999 (44 papers): remote sensing, astronomy, propulsion, mixed"),
  ntrs("fm-ntrs-2004-26", 2000, 2030, "NASA reports 2004-2026 (18 papers); cleaner born-digital text"),
  { id: "fm-ashby", register: "academic", language: "en", script: "latn", tokenisation: TOK, docDef: "documents = consecutive blocks of ~100 sentences (one long book, chapters not marked in the text)",
    source: `${A}/open-access-books/ashby (W. R. Ashby, An Introduction to Cybernetics, 1956; pdftotext of the 1999 edition)`, notes: "Scientific monograph, 1950s English. pdf running heads and lines of spaced single letters removed; exercises and tables remain.",
    extra: { genre: "monograph" }, blockUnits: 100, build: S.ashbyDocs },
  { id: "fm-d2l", register: "academic", language: "en", script: "latn", tokenisation: TOK + "; code fences, inline code, :label: roles removed",
    docDef: "document = one book section file (69 files; cut into equal pieces of <= ~6000 tokens (smaller for small pockets: meta.counts.pieceTokensTarget) when longer); unit = sentence of hard-wrapped markdown", source: `${A}/open-access-books/d2l (Dive into Deep Learning, CC BY-SA 4.0)`,
    notes: "Machine-learning textbook prose with all code and TeX math deleted (what remains is the prose around formulas).", extra: { genre: "textbook" }, build: S.d2lDocs },
  { id: "fm-paip", register: "academic", language: "en", script: "latn", tokenisation: TOK + "; code fences and inline code removed",
    docDef: "document = chapter file (25 chapters; cut into equal pieces of <= ~6000 tokens (smaller for small pockets: meta.counts.pieceTokensTarget) when longer); unit = sentence of markdown prose (one sentence per source line)", source: `${A}/open-access-books/paip (P. Norvig, Paradigms of AI Programming, MIT licence)`,
    notes: "Programming textbook prose with Lisp code blocks and inline code deleted.", extra: { genre: "textbook" }, build: S.paipDocs },
  { id: "fm-wikipedia", register: "encyclopedia", language: "en", script: "latn", tokenisation: TOK,
    docDef: "document = one article (49; cut into equal pieces of <= ~6000 tokens (smaller for small pockets: meta.counts.pieceTokensTarget) when longer); unit = paragraph line / sentence (newline and . ! ? split)", source: `${E}/wikipedia (wikitext-derived plain text)`,
    notes: "WIKITEXT RESIDUE: link targets and display text are often glued ('philosophyancient'), infobox fragments remain at article starts. Closing bibliography/link sections cut at the first heading named references, external links, further reading, see also, notes, bibliography, sources, citations, footnotes or works cited (a fixed loader-level cleaning list; no statistic uses it).",
    extra: { genre: "encyclopedia" }, build: S.wikiDocs },
  { id: "fm-eb1911", register: "encyclopedia", language: "en", script: "latn", tokenisation: TOK + "; html entities decoded; Wikisource navigation header removed",
    docDef: "documents = consecutive blocks of ~50 sentences within each of the 5 articles (too few tokens for ~100-unit blocks to reach 20 documents)", source: `${E}/1911-britannica (Economics, Law, Mathematics, Philosophy, Sociology)`,
    notes: "Early-20th-century English encyclopaedia articles; Wikisource export with spaced punctuation, citations and a few Greek words.", extra: { genre: "encyclopedia-historic" }, blockUnits: 50, build: S.ebDocs },
]);
