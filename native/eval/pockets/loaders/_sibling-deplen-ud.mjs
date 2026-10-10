// loaders/_sibling-deplen-ud.mjs — SIBLING pockets for the replication of order.depLen: Universal Dependencies TRAIN splits of treebanks that the atlas could not use.
// Underscore prefix: run-atlas.mjs ignores this file. Contract: export async function load(onlyIds = null) -> Pocket[].
// WHY NEW MATERIAL: the atlas "ud" group reads ONLY /private/tmp/claude-501/ud-eval/<stem>/{dev,test}.conllu (loaders/ud.mjs). Every stem listed below had dev+test under the 20,000-token floor
//   (loaders/ud.manifest.json skippedAtBuild: thin) and so has NO atlas pocket at all: a different language, different sentences, never read by any atlas statistic. Here the TRAIN split
//   /private/tmp/claude-501/tb/<stem>/train.conllu (UD splits are disjoint by construction; a sentence-text overlap check against ud-eval/<stem>/{dev,test} is recorded in meta.leak) is used.
// Reader, tokenisation, document blocks (25 sentences) and the 300,000-token whole-document cap are the atlas ones (imported: readConllu, finish/capByHash): same pipeline, same kind of pocket.
import fs from "node:fs";
import { interner, scriptOf } from "./_ud_ml_common.mjs";
import { readConllu } from "./_conllu.mjs";
import { finish } from "./_ud_ml_run.mjs";

const TB = "/private/tmp/claude-501/tb", EV = "/private/tmp/claude-501/ud-eval", BLOCK = 25;
export const STEMS = ["ita", "nld", "rus", "ces", "dan", "lit", "ell", "hun", "tur", "hye", "kat", "gle", "afr", "mlt", "tam", "tel", "uig", "wol"];
export const ids = () => STEMS.map((s) => `sib-ud-${s}`);

function leak(stem, sents) {
  const seen = new Set();
  for (const sp of ["dev", "test"]) {
    const f = `${EV}/${stem}/${sp}.conllu`; if (!fs.existsSync(f)) continue;
    const st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 };
    for (const s of readConllu(f, (w) => w, st, "words")) seen.add(s.join(" "));
  }
  let dup = 0; for (const s of sents) if (seen.has(s.join(" "))) dup++;
  return { devTestSentences: seen.size, trainSentencesAlsoInDevTest: dup };
}

function build(stem) {
  const file = `${TB}/${stem}/train.conllu`;
  if (!fs.existsSync(file)) return null;
  const st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 }, intern = interner();
  const sents = readConllu(file, intern, st, "words");
  const units = sents, docOf = sents.map((_, k) => Math.floor(k / BLOCK));
  const p = { id: `sib-ud-${stem}`, group: "ud", register: "treebank", language: stem, script: scriptOf(units), units, docOf, meta: {
    tokenisation: "ud-syntactic-words: CoNLL-U word lines (multiword-token ranges split into their words), UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _ (as loaders/ud.mjs)",
    docDef: `consecutive blocks of ${BLOCK} sentences of the train split; whole blocks, 300000-token cap in sha256(id:block) order (as loaders/_ud_ml_run.mjs capByHash)`,
    source: file, notes: `SIBLING of order.depLen: TRAIN split of stem ${stem}, whose dev+test was under the atlas thin floor (no atlas pocket for this language)`,
    siblingOf: "order.depLen", stem, splits: ["train"], sentences: sents.length, leak: leak(stem, sents), droppedNoLetter: st.droppedNoLetter, punctDropped: st.punctDropped, mwtTokens: st.mwtTokens } };
  return p;
}
export async function load(onlyIds = null) {
  const out = [];
  for (const stem of STEMS) {
    if (onlyIds && !onlyIds.includes(`sib-ud-${stem}`)) continue;
    const p = build(stem); if (!p) continue;
    const f = finish(p);
    if (f.thin) { console.error(`sib-ud-${stem}: thin ${JSON.stringify(f.thin)}`); continue; }
    out.push(f.pocket);
  }
  return out;
}
