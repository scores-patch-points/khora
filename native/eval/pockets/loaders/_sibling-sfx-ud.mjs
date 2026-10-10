// loaders/_sibling-sfx-ud.mjs — NEW treebank pockets for the SIBLING REPLICATION of para.suffixCopy (underscore: ignored by run-atlas.mjs).
// Material: the UD TRAIN splits /private/tmp/claude-501/tb/<stem>/train.conllu of ten stems that the atlas has as pockets built from the DEV+TEST splits of /private/tmp/claude-501/ud-eval (loaders/ud.mjs reads
// only dev and test). Train and dev/test of a UD treebank are disjoint sentence sets by construction (a sentence-text overlap count against dev+test is recorded in meta.leak). Same treebank as the atlas
// pocket of the same stem, different documents: a "same-pocket-kind" sibling whose atlas status is known and used as the blind prediction (see the PREREG header of results/confirm-para.suffixCopy/confirm.mjs).
//   atlas PRESENT+ stems : eng hrv slv heb urd slk      atlas ABSENT stems : fas ind jpn kor   (kor: tb/kor holds KAIST, the atlas kor is GSD, so tb/kor-gsd/train.conllu is read)
// Reader, tokenisation, 25-sentence document blocks and the whole-block 300k cap are the atlas ones (imported readConllu, interner, scriptOf, finish).
import fs from "node:fs";
import { interner, scriptOf } from "./_ud_ml_common.mjs";
import { readConllu } from "./_conllu.mjs";
import { runLoader } from "./_ud_ml_run.mjs";
import { tokenCount } from "../lib/pocket.mjs";

const TB = "/private/tmp/claude-501/tb", EV = "/private/tmp/claude-501/ud-eval", BLOCK = 25;
export const PRESENT_STEMS = ["eng", "hrv", "slv", "heb", "urd", "slk"], ABSENT_STEMS = ["fas", "ind", "jpn", "kor"];
const TRAIN_DIR = { kor: "kor-gsd" };
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
const spec = (stem) => ({ id: `sfx-ud-${stem}`, async build() {
  const file = `${TB}/${TRAIN_DIR[stem] ?? stem}/train.conllu`;
  if (!fs.existsSync(file)) return { skip: "no train.conllu" };
  const intern = interner(), st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 };
  const sents = readConllu(file, intern, st, "words"), units = [], docOf = [];
  sents.forEach((s, k) => { units.push(s); docOf.push(Math.floor(k / BLOCK)); });
  return { id: `sfx-ud-${stem}`, group: "sib", register: "treebank", language: stem, script: scriptOf(units), units, docOf, meta: {
    tokenisation: "ud-syntactic-words: CoNLL-U word lines (multiword-token ranges split into their words), UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _ (same as loaders/ud.mjs)",
    docDef: `consecutive blocks of ${BLOCK} sentences of the train file; cap 300000 tokens by whole blocks in sha256(id:block) order`, source: file,
    notes: `UD TRAIN split of stem ${stem} (the atlas pocket ud-${stem} was built from dev+test); ${sents.length} sentences, ${tokenCount(units)} tokens before the cap; counters ${JSON.stringify(st)}`, stem, atlasClass: PRESENT_STEMS.includes(stem) ? "present" : "absent", leak: leak(stem, sents) } };
} });
export const IDS = [...PRESENT_STEMS, ...ABSENT_STEMS].map((s) => `sfx-ud-${s}`), SPECS = [...PRESENT_STEMS, ...ABSENT_STEMS].map(spec);
export const loadWithReport = (onlyIds = null) => runLoader(SPECS, onlyIds);
export async function load(onlyIds = null) { return (await loadWithReport(onlyIds)).pockets; }
