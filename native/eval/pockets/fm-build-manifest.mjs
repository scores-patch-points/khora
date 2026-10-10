// eval/pockets/fm-build-manifest.mjs — builds every group "fm" pocket once, validates it, and writes loaders/formal.manifest.json.
//   node fm-build-manifest.mjs [--only id1,id2] [--out loaders/formal.manifest.json]
// Run in the background (nohup): the full build reads ~100 MB of text. Deterministic: no Math.random and no clock reads; the manifest has no timestamps.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, validate } from "./lib/pocket.mjs";
import { SKIPPED } from "./loaders/_fm_common.mjs";
import * as holy from "./loaders/formal.mjs";
import * as legal from "./loaders/formal-legal.mjs";
import * as ref from "./loaders/formal-reference.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const only = opt("--only", null)?.split(","), OUT = path.resolve(HERE, opt("--out", "loaders/formal.manifest.json"));

// everything in the assigned sources that is NOT a pocket, with measured reasons (word counts measured by regex on the raw files, 2026-10-07 session)
const STATIC_SKIPS = [
  { source: "14-holy-texts/tao-te-ching/tao-te-ching-zh.txt", why: "Classical Chinese, 81 chapters but only 5,441 Han characters: at most ~5.4k tokens at character grain (thin, minimum is 20,000); no sibling Chinese files in this group to merge." },
  { source: "14-holy-texts/sblgnt/*.txt and *.xml", why: "only the textual-apparatus notes (variant readings per verse), not the running text; the running SBLGNT text is in sblgnt-books." },
  { source: "14-holy-texts/nestle1904/berean-interlinear-glosses.xml, parsing.txt", why: "gloss and parsing annotation tables, not running text; parsing tags are treebank-style labels the project forbids as statistic inputs." },
  { source: "14-holy-texts/suttacentral/*.txt (22 English files)", why: "14 of the 22 (DN 1,2,9,11,16,22,31 and MN 1,10,28,39,63,118,131) duplicate the Sujato English already in fm-pali-en-dn / fm-pali-en-mn; the other 8 (AN, SN, Snp) have ~9.4k words together: thin." },
  { source: "14-holy-texts/quran-suras transliteration lines", why: "Latin-script transliteration of the same Arabic words as fm-quran-ar (same word boundaries): a duplicate of the Arabic, not a new world." },
  { source: "14-holy-texts/tanzil-quran/parallel/*, quran_quran-uthmani.txt, quran_en_sahih.txt", why: "same Arabic and Sahih English text as the quran-suras files; the whole-Qur'an files have no verse boundaries (one line per surah), the parallel files cover a similar sura subset. Kept quran-suras (verse grain) plus the two other English translations from tanzil." },
  { source: "14-holy-texts/sefaria/I_Kings_he.txt", why: "52 lines (15 KB) of a passage that duplicates 1 Kings in fm-wlc-former." },
  { source: "14-holy-texts/**/*.eot.json, *.eot.jsonl, *.structure.json", why: "sidecar annotation files of the corpus, not text." },
  { source: "05-academic-papers/handbook-citations/ioannidis-2005-why-most-published-research-findings-are-false.txt (+ MANIFEST.md)", why: "a single paper of 6,036 words: thin; MANIFEST.md is an inventory, not text." },
  { source: "05-academic-papers/ntrs-white-papers/*.cv.md and *.structure.json", why: "cv.md = mechanical OCR re-reads of the same pages as the .txt (duplicate text); structure.json = sidecar." },
  { source: "08-news-current/eu-commission/Wikinews_Shorts__November_13__2008.txt", why: "the only file in 08-news-current: 1,309 words including CSS residue: thin. THIS GROUP HAS NO NEWS POCKET." },
  { source: "06-government-legal/world-legislation/lu", why: "3 files, ~15k tokens: merged into fm-law-be (both French-language law), not dropped." },
  { source: "14-holy-texts/bhagavad-gita", why: "alone ~9k tokens (thin): merged into fm-sanskrit with the Upanishads, not dropped." },
  { source: "binary / pdf-only material", why: "none of the assigned directories contains PDFs or images that were skipped; the pdf-derived texts (Ashby, NTRS) are used as extracted text." },
];

const sources = [holy, legal, ref], pockets = [], errors = [];
for (const m of sources) for (const s of m.specs) {
  if (only && !only.includes(s.id)) continue;
  let p;
  try { p = (await m.load([s.id]))[0]; } catch (e) { errors.push({ id: s.id, error: String(e.message).slice(0, 300) }); console.error(`${s.id}: ERROR ${e.message}`); continue; }
  if (!p) { console.error(`${s.id}: dropped (thin)`); continue; }
  const v = validate(p), freq = new Map(); for (const u of p.units) for (const w of u) freq.set(w, (freq.get(w) ?? 0) + 1);
  const overlong = p.units.filter((u) => u.length > 300).length;
  const ucnt = new Map(); for (const u of p.units) { const k = u.join(" "); ucnt.set(k, (ucnt.get(k) ?? 0) + 1); }
  let repTok = 0; for (const u of p.units) if (ucnt.get(u.join(" ")) >= 5) repTok += u.length; // tokens inside units that occur >= 5 times verbatim (template / formula residue)
  pockets.push({ id: p.id, tokens: v.tokens, docs: v.docs, units: v.units, register: p.register, language: p.language, script: p.script, group: p.group,
    genre: p.meta.genre ?? null, siblingOf: p.meta.siblingOf ?? null, translationOf: p.meta.translationOf ?? null, multilingual: p.meta.multilingual ?? false,
    meanUnitTokens: Math.round((v.tokens / v.units) * 100) / 100, types: freq.size, hapaxTypes: [...freq.values()].filter((c) => c === 1).length, unitsOver300Tokens: overlong, repeatedUnitTokenShare: Math.round((repTok / v.tokens) * 1000) / 1000,
    capped: p.meta.counts.capped, tokensBeforeCapEst: p.meta.counts.tokensBeforeCapEst, naturalDocs: p.meta.counts.naturalDocs, pieceTokensTarget: p.meta.counts.pieceTokensTarget,
    thin: v.thin, overCap: v.overCap, ...(p.meta.docLabels ? { docLabels: p.meta.docLabels } : {}), contentSha256: sha256(JSON.stringify([p.units, p.docOf])), tokenisation: p.meta.tokenisation, docDef: p.meta.docDef, source: p.meta.source, notes: p.meta.notes });
  console.error(`${p.id}: ${v.tokens} tokens, ${v.docs} docs`);
}
const manifest = {
  group: "fm", description: "formal registers: scripture (14-holy-texts), legal (06-government-legal), academic (05-academic-papers), encyclopedic (02-encyclopedic); 08-news-current had no usable file",
  loaders: ["loaders/formal.mjs", "loaders/formal-legal.mjs", "loaders/formal-reference.mjs"], helpers: ["loaders/_fm_common.mjs", "loaders/_fm_holy_src.mjs", "loaders/_fm_legal_src.mjs", "loaders/_fm_ref_src.mjs"],
  conventions: { cap: "300000 tokens by whole pieces in sha256(id:pieceIndex) order, scan stops at the first piece that would exceed the cap; kept pieces return to source order",
    documents: "natural documents (chapter / sura / daf block / law file / paper) cut into equal consecutive pieces of <= 6000 tokens (down to 1200 for small pockets so they reach ~40 docs); one-long-text pockets use blocks of ~100 (EB1911: ~50) units",
    siblingConvention: "pockets built from translations of the same text are marked translationOf; near-duplicate editions are marked siblingOf (fm-nestle1904): exclude one family member from law-level counts or treat them as replication pairs" },
  pockets, skipped: STATIC_SKIPS, droppedThinAfterBuild: SKIPPED, errors,
  totals: { pockets: pockets.length, tokens: pockets.reduce((a, p) => a + p.tokens, 0) },
};
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 1));
console.error(`wrote ${OUT}: ${pockets.length} pockets, ${manifest.totals.tokens} tokens, ${SKIPPED.length} dropped thin, ${errors.length} errors`);
