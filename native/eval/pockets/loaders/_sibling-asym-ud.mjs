// loaders/_sibling-asym-ud.mjs — SIBLING pockets (Universal Dependencies treebanks, TRAIN split) for the replication of comp.asym (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// MATERIAL: /private/tmp/claude-501/tb/<stem>/train.conllu for stems that have NO pocket in the atlas "ud" group (loaders/ud.mjs reads only /private/tmp/claude-501/ud-eval/<stem>/{dev,test}.conllu; these stems' dev+test
//   were under the 20,000-token floor, so no atlas pocket exists for these LANGUAGES). UD train/dev/test are disjoint by construction; a sentence-text overlap check against ud-eval dev/test is stored in meta.leak.
// Reader, tokenisation (UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC), documents = blocks of 25 sentences and the 300,000-token whole-document cap are the atlas ones (readConllu, finish/capByHash).
// Stems below the 20,000-token / 20-document floor are reported by load() on stderr and not returned (thin = never scored). The stem list is the atlas-absent set of /private/tmp/claude-501/tb, fixed from the directory listing
//   and the atlas ud group's pocket ids BEFORE any statistic was computed.
import fs from "node:fs";
import { interner, scriptOf } from "./_ud_ml_common.mjs";
import { readConllu } from "./_conllu.mjs";
import { finish } from "./_ud_ml_run.mjs";

const TB = "/private/tmp/claude-501/tb", EV = "/private/tmp/claude-501/ud-eval", BLOCK = 25;
export const STEMS = ["ita", "nld", "rus", "ces", "dan", "lit", "ell", "hun", "tur", "hye", "kat", "gle", "afr", "mlt", "tam", "tel", "uig", "wol"];
export const IDS = STEMS.map((s) => `asym-ud-${s}`);
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
  const p = { id: `asym-ud-${stem}`, group: "sib", register: "treebank", language: stem, script: scriptOf(sents), units: sents, docOf: sents.map((_, k) => Math.floor(k / BLOCK)), meta: {
    tokenisation: "ud-syntactic-words: CoNLL-U word lines (multiword-token ranges split into their words), UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _ (as loaders/ud.mjs)",
    docDef: `consecutive blocks of ${BLOCK} sentences of the train split; whole blocks, 300000-token cap in sha256(id:block) order (as _ud_ml_run.mjs capByHash)`, source: file, sibling: true, stem, splits: ["train"],
    sentences: sents.length, leak: leak(stem, sents), droppedNoLetter: st.droppedNoLetter, punctDropped: st.punctDropped, mwtTokens: st.mwtTokens } };
  return p;
}
export async function load(onlyIds = null) {
  const out = [];
  for (const stem of STEMS) {
    if (onlyIds && !onlyIds.includes(`asym-ud-${stem}`)) continue;
    const p = build(stem); if (!p) { console.error(`asym-ud-${stem}: no train.conllu`); continue; }
    const f = finish(p);
    if (f.thin) { console.error(`asym-ud-${stem}: thin ${JSON.stringify(f.thin)}`); continue; }
    out.push(f.pocket);
  }
  return out;
}
