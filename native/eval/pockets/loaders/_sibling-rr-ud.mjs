// loaders/_sibling-rr-ud.mjs — SIBLING pockets (Universal Dependencies treebanks, TRAIN split) for the replication of comp.rigidR (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// MATERIAL: /private/tmp/claude-501/tb/<stem>/train.conllu for stems that have NO pocket in the atlas "ud" group (loaders/ud.mjs reads only /private/tmp/claude-501/ud-eval/<stem>/{dev,test}.conllu; for these stems the
//   dev+test were under the 20,000-token floor, so no atlas pocket exists for these LANGUAGES). The stem list is fixed here from the directory listing and the atlas ud pocket ids BEFORE any statistic was computed.
// Reader, tokenisation (UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC), documents = blocks of 25 sentences and the 300,000-token whole-document cap are the atlas ones (readConllu, finish/capByHash).
// Stems below the 20,000-token / 20-document floor are reported on stderr and not returned (thin = never scored).
import fs from "node:fs";
import { interner, scriptOf } from "./_ud_ml_common.mjs";
import { readConllu } from "./_conllu.mjs";
import { finish } from "./_ud_ml_run.mjs";

const TB = "/private/tmp/claude-501/tb", BLOCK = 25;
export const STEMS = ["ita", "nld", "rus", "ces", "dan", "lit", "ell", "hun", "tur", "hye", "kat", "gle", "afr", "mlt", "mar", "tam", "tel", "uig", "wol"];
export const IDS = STEMS.map((s) => `rr-ud-${s}`);
function build(stem) {
  const file = `${TB}/${stem}/train.conllu`;
  if (!fs.existsSync(file)) return null;
  const st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 }, intern = interner();
  const sents = readConllu(file, intern, st, "words");
  return { id: `rr-ud-${stem}`, group: "sib", register: "treebank", language: stem, script: scriptOf(sents), units: sents, docOf: sents.map((_, k) => Math.floor(k / BLOCK)), meta: {
    tokenisation: "ud-syntactic-words: CoNLL-U word lines (multiword-token ranges split into their words), UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _ (as loaders/ud.mjs)",
    docDef: `consecutive blocks of ${BLOCK} sentences of the train split; whole blocks, 300000-token cap in sha256(id:block) order (as _ud_ml_run.mjs capByHash)`, source: file, sibling: true, stem, splits: ["train"],
    sentences: sents.length, droppedNoLetter: st.droppedNoLetter, punctDropped: st.punctDropped, mwtTokens: st.mwtTokens } };
}
export async function load(onlyIds = null) {
  const out = [];
  for (const stem of STEMS) {
    if (onlyIds && !onlyIds.includes(`rr-ud-${stem}`)) continue;
    const p = build(stem); if (!p) { console.error(`rr-ud-${stem}: no train.conllu`); continue; }
    const f = finish(p);
    if (f.thin) { console.error(`rr-ud-${stem}: thin ${JSON.stringify(f.thin)}`); continue; }
    out.push(f.pocket);
  }
  return out;
}
