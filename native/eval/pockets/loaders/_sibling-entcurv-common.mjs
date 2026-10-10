// loaders/_sibling-entcurv-common.mjs — shared builders of the SIBLING-REPLICATION pockets of the confirmation of order.entCurv (underscore: ignored by run-atlas.mjs).
// Written as a NEW file (prefix _sibling-entcurv-); no other agent's sibling file is imported or touched. Every builder REUSES the atlas helpers unchanged
// (_bkcore/_bkseg for books and plays, _conllu/_ud_ml_common for treebanks, _cd_util for code), so a sibling is tokenised, split into units and cut into documents
// exactly like its atlas kin. Pocket group is "sib" (never part of an atlas count). Pure Node ESM; no Math.random, no Date.
import fs from "node:fs";
import path from "node:path";
import { validate, rngOf, seedOf, sha256 } from "../lib/pocket.mjs";
import { stripFront, stripPG, scrub, cut, trimBack } from "./_bkcore.mjs";
import { stripDrama, splitSentences, toUnits, assemble } from "./_bkseg.mjs";
import { readConllu } from "./_conllu.mjs";
import { interner, scriptOf, lc, apos, keepToken } from "./_ud_ml_common.mjs";
import { newStats, sumStats, codeText, takeDocs, makePocket } from "./_cd_util.mjs";

export const GROUP = "sib";
export const ETHOS = "/Users/mlacy/Documents/3.0/ethos";
export const GBNE = `${ETHOS}/11-multi-language/gutenberg-non-en/`;   // misfiled English books (the atlas ml loader skipped them: _ml_skips.mjs ENGLISH_MISFILED)
export const GS = "/Users/mlacy/Documents/New Project/eochat-content-cv-demo/vendor/eoPriors/global_south_corpus/gutenberg/";  // Project Gutenberg files never read by the atlas
export const SHAKE = "/Users/mlacy/Documents/3.0/eochat/vendor/live_priors/01-literature-books/gutenberg/pg100_Complete_Works_of_Shakespeare.txt";

/** Absolute-path version of _bkcore.readText: strip BOM, CRLF/CR -> LF, NFC. */
export function readAbs(file) {
  let s = fs.readFileSync(file, "utf8");
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  return s.replace(/\r\n?/g, "\n").normalize("NFC");
}

/** One book file -> sentence units with the atlas "bk" pipeline: front matter, PG boilerplate, back matter, markup scrub, optional cuts, optional speaker-label removal. */
export function bookUnits(spec) {
  let text = readAbs(spec.file);
  if (!spec.noStrip) text = trimBack(stripPG(stripFront(text).text));
  text = cut(scrub(text), spec.cut || {});
  if (spec.pre) text = spec.pre(text);
  if (spec.drama) text = stripDrama(text, spec.drama, !!spec.stageParen);
  text = scrub(text, spec.extra || []);
  return toUnits(splitSentences(text, { paraBreak: spec.paraBreak !== false }));
}

/** Assemble a pocket from one or more unit lists with the atlas assemble() (documents = blocks of ~100 units, 300k cap by whole documents), group "sib". */
export function bookPocket(spec, unitLists, extra = {}) {
  const { pocket } = assemble(spec, unitLists, { sibling: true, ...extra });
  return { ...pocket, group: GROUP };
}

/** CoNLL-U reader with the SAME word-line semantics as loaders/_conllu.mjs readConllu (integer-ID word lines, multiword-token ranges split into their words, UPOS PUNCT dropped,
 *  tokens without a letter dropped, lowercase NFC, spaces inside a form joined by "_"), plus a document filter keepDoc(newdocId) evaluated per sentence block so that documents whose TEXT is already an
 *  atlas pocket can be left out. With keepDoc = () => true it returns exactly readConllu's sentences (checked by selfcheck in the confirmation script). */
export function readConlluDocs(file, intern, st, keepDoc = () => true) {
  const sents = []; let docId = null, block = [], dropped = 0;
  const flush = () => {
    if (!block.length) return;
    if (!keepDoc(docId)) { dropped++; block = []; return; }
    let cur = [], mwtEnd = 0;
    for (const line of block) {
      if (line[0] === "#") continue;
      const f = line.split("\t");
      if (f.length < 10) continue;
      const rg = /^(\d+)-(\d+)$/.exec(f[0]);
      if (rg) { mwtEnd = +rg[2]; continue; }
      if (!/^\d+$/.test(f[0])) continue;
      const inMwt = +f[0] <= mwtEnd;
      if (f[3] === "PUNCT") { st.punctDropped++; continue; }
      const w = apos(lc(f[1]).replace(/\s+/g, "_"));
      if (!keepToken(w)) { st.droppedNoLetter++; continue; }
      if (/\s/.test(f[1])) st.spaceTokens++;
      if (inMwt) st.mwtTokens++;
      cur.push(intern(w));
    }
    if (cur.length) sents.push(cur);
    block = [];
  };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line) { flush(); continue; }
    const m = /^# newdoc id = (.*)$/.exec(line); if (m) docId = m[1];
    block.push(line);
  }
  flush();
  return { sents, dropped };
}

/** UD treebank files [{path,label}] -> Pocket like loaders/ud.mjs: documents = blocks of 25 sentences, blocked separately inside each file. keepDoc(newdocId) leaves documents out. */
export function udPocket({ id, language, files, keepDoc = () => true, notes = "" }) {
  const intern = interner(), st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 }, units = [], docOf = [], used = [];
  let d = 0;
  for (const f of files) {
    const { sents, dropped } = readConlluDocs(f.path, intern, st, keepDoc); used.push(`${f.label ?? path.basename(f.path)}: kept ${sents.length} sentences, ${dropped} dropped by the text-overlap filter`);
    sents.forEach((s, k) => { units.push(s); docOf.push(d + Math.floor(k / 25)); });
    d += Math.ceil(sents.length / 25);
  }
  const p = { id, group: GROUP, register: "treebank", language, script: scriptOf(units), units, docOf, meta: {
    tokenisation: "ud-syntactic-words: CoNLL-U word lines (multiword-token ranges split into their words), UPOS PUNCT dropped (tokenisation only), tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _ (as loaders/ud.mjs)",
    docDef: "consecutive blocks of 25 sentences, blocked separately inside each file", source: files.map((f) => f.path).join(" + "), files: used, notes, sibling: true, droppedNoLetter: st.droppedNoLetter, punctDropped: st.punctDropped } };
  validate(p);
  return p;
}

/** Token-global-shuffled LAW-FREE control of a pocket, built exactly as loaders/ctrl.mjs builds the atlas ct-* controls (all tokens shuffled globally, unit lengths re-assigned by a global shuffle,
 *  same units per document). Seed = seedOf("ctrl-v1", sourceId) as in ctrl.mjs. */
export function controlOf(src, id) {
  const rnd = rngOf(seedOf("ctrl-v1", src.id)), sh = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const flat = sh(src.units.flat()), lens = sh(src.units.map((u) => u.length));
  let o = 0; const units = lens.map((n) => { const u = flat.slice(o, o + n); o += n; return u; });
  const p = { id, group: GROUP, register: "control", language: src.language, script: src.script ?? null, units, docOf: src.docOf.slice(),
    meta: { tokenisation: `control of ${src.id}: ${src.meta?.tokenisation ?? ""}`, docDef: "same units-per-document counts as the source", source: `shuffled-real control of ${src.id}`, controlOf: src.id, sibling: true,
      notes: "tokens shuffled globally, unit lengths re-assigned by a global shuffle; law-free by construction (instrument check, as the atlas ct-* group)" } };
  validate(p);
  return p;
}
