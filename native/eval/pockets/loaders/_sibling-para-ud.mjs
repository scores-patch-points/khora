// loaders/_sibling-para-ud.mjs — NEW treebank pockets for the SIBLING REPLICATION of para.prefixCopy (underscore: ignored by run-atlas.mjs).
// Material: the UD TRAIN splits /private/tmp/claude-501/tb/<stem>/train.conllu of the 19 stems that the atlas dropped as thin (loaders/ud.manifest.json skippedAtBuild: afr ces dan ell gle hun hye ita kat lit mar mlt nld rus tam tel tur uig wol).
// The atlas "ud" group reads only /private/tmp/claude-501/ud-eval/<stem>/{dev,test}.conllu, so a stem without an atlas pocket has no atlas document at all; train and dev/test of UD are disjoint by construction
// (a sentence-text overlap count against ud-eval dev/test is recorded in meta.leak for the stems that have one: the stems here have none, so the count is 0 or "no dev/test file").
// New pocket ids "sp-ud-<stem>" (sp = sibling of para.prefixCopy). Reader, tokenisation, 25-sentence document blocks and the whole-block 300k cap are the atlas ones (imported readConllu, interner, scriptOf, finish).
// Stems whose train file is still under the 20,000-token / 20-document floor come back as skipped(thin) from loadWithReport and are never scored.
import fs from "node:fs";
import { interner, scriptOf } from "./_ud_ml_common.mjs";
import { readConllu } from "./_conllu.mjs";
import { runLoader } from "./_ud_ml_run.mjs";
import { tokenCount } from "../lib/pocket.mjs";

const TB = "/private/tmp/claude-501/tb", EV = "/private/tmp/claude-501/ud-eval", BLOCK = 25;
export const STEMS = ["afr", "ces", "dan", "ell", "gle", "hun", "hye", "ita", "kat", "lit", "mar", "mlt", "nld", "rus", "tam", "tel", "tur", "uig", "wol"];
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
const spec = (stem) => ({ id: `sp-ud-${stem}`, async build() {
  const file = `${TB}/${stem}/train.conllu`;
  if (!fs.existsSync(file)) return { skip: "no train.conllu" };
  const intern = interner(), st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 };
  const sents = readConllu(file, intern, st, "words"), units = [], docOf = [];
  sents.forEach((s, k) => { units.push(s); docOf.push(Math.floor(k / BLOCK)); });
  return { id: `sp-ud-${stem}`, group: "sib", register: "treebank", language: stem, script: scriptOf(units), units, docOf, meta: {
    tokenisation: "ud-syntactic-words: CoNLL-U word lines (multiword-token ranges split into their words), UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _ (same as loaders/ud.mjs)",
    docDef: `consecutive blocks of ${BLOCK} sentences of the train file; cap 300000 tokens by whole blocks in sha256(id:block) order`, source: file,
    notes: `UD TRAIN split of stem ${stem} (the atlas read dev+test only and dropped ud-${stem} as thin); ${sents.length} sentences, ${tokenCount(units)} tokens before the cap; counters ${JSON.stringify(st)}`, stem, leak: leak(stem, sents) } };
} });
export const SPECS = STEMS.map(spec), IDS = SPECS.map((s) => s.id);
export const loadWithReport = (onlyIds = null) => runLoader(SPECS, onlyIds);
export async function load(onlyIds = null) { return (await loadWithReport(onlyIds)).pockets; }
