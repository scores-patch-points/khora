// loaders/_sibling-fcov-ud.mjs — NEW treebank pockets for the SIBLING REPLICATION of para.formulaCov (underscore: ignored by run-atlas.mjs). New ids "sf-ud-<stem>" (sf = sibling of formulaCov).
// Material: the UD TRAIN splits /private/tmp/claude-501/tb/<stem>/train.conllu of eight stems that DO have an atlas pocket ud-<stem> (fixed list below, chosen before any statistic was computed: the widest-known
// languages with a large train split). The atlas "ud" group reads only /private/tmp/claude-501/ud-eval/<stem>/{dev,test}.conllu, so the train documents of these treebanks were never read by an atlas pocket;
// train and dev/test of UD are disjoint by construction (a sentence-text overlap count against ud-eval dev/test is recorded in meta.leak).
// Reader, tokenisation, 25-sentence document blocks and the whole-block 300k cap are the atlas ones (imported readConllu, interner, scriptOf, finish).
import fs from "node:fs";
import { interner, scriptOf } from "./_ud_ml_common.mjs";
import { readConllu } from "./_conllu.mjs";
import { runLoader } from "./_ud_ml_run.mjs";
import { tokenCount } from "../lib/pocket.mjs";

const TB = "/private/tmp/claude-501/tb", EV = "/private/tmp/claude-501/ud-eval", BLOCK = 25;
export const STEMS = ["eng", "deu", "fra", "spa", "por", "cat", "pol", "nob"];
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
const spec = (stem) => ({ id: `sf-ud-${stem}`, async build() {
  const file = `${TB}/${stem}/train.conllu`;
  if (!fs.existsSync(file)) return { skip: "no train.conllu" };
  const intern = interner(), st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 };
  const sents = readConllu(file, intern, st, "words"), units = [], docOf = [];
  sents.forEach((s, k) => { units.push(s); docOf.push(Math.floor(k / BLOCK)); });
  return { id: `sf-ud-${stem}`, group: "sib", register: "treebank", language: stem, script: scriptOf(units), units, docOf, meta: {
    tokenisation: "ud-syntactic-words: CoNLL-U word lines (multiword-token ranges split into their words), UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _ (same as loaders/ud.mjs)",
    docDef: `consecutive blocks of ${BLOCK} sentences of the train file; cap 300000 tokens by whole blocks in sha256(id:block) order`, source: file,
    notes: `UD TRAIN split of stem ${stem} (the atlas pocket ud-${stem} read dev+test only); ${sents.length} sentences, ${tokenCount(units)} tokens before the cap; counters ${JSON.stringify(st)}`, stem, leak: leak(stem, sents) } };
} });
export const SPECS = STEMS.map(spec), IDS = SPECS.map((s) => s.id);
export const loadWithReport = (onlyIds = null) => runLoader(SPECS, onlyIds);
export async function load(onlyIds = null) { return (await loadWithReport(onlyIds)).pockets; }
