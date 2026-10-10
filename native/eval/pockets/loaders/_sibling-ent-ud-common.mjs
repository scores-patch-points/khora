// loaders/_sibling-ent-ud-common.mjs — sentence-filtered CoNLL-U reader for the UD siblings of the confirmation of order.entSlope (underscore: ignored by the atlas).
// SAME word-line semantics as loaders/_conllu.mjs readConllu (integer-ID word lines, multiword ranges split into their words, UPOS PUNCT dropped, tokens without a letter dropped,
// lowercase NFC, spaces inside a form joined by "_"), plus a sentence filter keep(ctx) so that documents whose TEXT is already an atlas pocket (Aeneid, Tacitus, Rigveda ...) can be left out.
// Equality with readConllu on an unfiltered file is checked by the test in results/confirm-order.entSlope/ (see confirm.mjs, selfcheck).
import fs from "node:fs";
import path from "node:path";
import { validate } from "../lib/pocket.mjs";
import { lc, apos, keepToken, interner, scriptOf } from "./_ud_ml_common.mjs";

/** keep({docId, comments}) -> bool, evaluated per sentence (comments = the "# ..." lines of that sentence block). Returns {sents, dropped}. */
export function readConlluFiltered(file, intern, st, keep = () => true) {
  const sents = []; let dropped = 0, docId = null, block = [];
  const flush = () => {
    if (!block.length) return;
    const comments = block.filter((l) => l[0] === "#");
    if (!keep({ docId, comments })) { dropped++; block = []; return; }
    let cur = [], mwtEnd = 0;
    const emit = (form, inMwt) => {
      const w = apos(lc(form).replace(/\s+/g, "_"));
      if (!keepToken(w)) { st.droppedNoLetter++; return; }
      if (/\s/.test(form)) st.spaceTokens++;
      if (inMwt) st.mwtTokens++;
      cur.push(intern(w));
    };
    for (const line of block) {
      if (line[0] === "#") continue;
      const f = line.split("\t");
      if (f.length < 10) continue;
      const rg = /^(\d+)-(\d+)$/.exec(f[0]);
      if (rg) { mwtEnd = +rg[2]; continue; }
      if (!/^\d+$/.test(f[0])) continue;
      const inMwt = +f[0] <= mwtEnd;
      if (f[3] === "PUNCT") { st.punctDropped++; continue; }
      emit(f[1], inMwt);
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

/** Treebank pocket from filtered files (documents = blocks of 25 sentences, blocked separately inside each file, as loaders/ud.mjs). */
export function udFilteredPocket({ id, language, files, keep, notes = "" }) {
  const intern = interner(), st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 }, units = [], docOf = [], used = [];
  let d = 0;
  for (const f of files) {
    const { sents, dropped } = readConlluFiltered(f, intern, st, keep); used.push(`${path.basename(f)}: kept ${sents.length} sentences, ${dropped} dropped by the text-overlap filter`);
    sents.forEach((s, k) => { units.push(s); docOf.push(d + Math.floor(k / 25)); });
    d += Math.ceil(sents.length / 25);
  }
  const p = { id, group: "sib", register: "treebank", language, script: scriptOf(units), units, docOf, meta: {
    tokenisation: "ud-syntactic-words: CoNLL-U word lines (multiword-token ranges split into their words), UPOS PUNCT dropped (tokenisation only), tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _ (as loaders/ud.mjs)",
    docDef: "consecutive blocks of 25 sentences, blocked separately inside each file", source: files.join(" + "), files: used, notes, sibling: true } };
  validate(p);
  return p;
}
