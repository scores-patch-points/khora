// loaders/_sibling-rc-ud.mjs — SIBLING pockets (UD treebank TRAIN splits) for the replication of the atlas law order.rareCurve (underscore: ignored by run-atlas.mjs).
// The atlas ud group reads dev+test of /private/tmp/claude-501/ud-eval only; the TRAIN files /private/tmp/claude-501/tb/<stem>/train.conllu are other documents of the same treebanks (never read by the atlas).
// Reader, blocks and cap are those of loaders/ud.mjs / _sibling-ud.mjs (readConllu "words": CoNLL-U syntactic words, UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC; document = 25 consecutive
// sentences; cap 300k tokens by whole documents in sha256(id:block) order). Group "sib".
//  PLUS-side siblings (stems the atlas dropped as thin, i.e. languages with NO atlas pocket):  ces ita nld rus dan gle hye
//  ABSENT-side siblings (stems whose dev+test pockets are ABSENT in the atlas, here the much larger TRAIN split): cmn jpn urd
import fs from "node:fs";
import { interner, scriptOf } from "./_ud_ml_common.mjs";
import { readConllu } from "./_conllu.mjs";
import { runLoader } from "./_ud_ml_run.mjs";
import { tokenCount } from "../lib/pocket.mjs";

const ROOT = "/private/tmp/claude-501/tb", BLOCK = 25;
export const PLUS_STEMS = ["ces", "ita", "nld", "rus", "dan", "gle", "hye"], ABSENT_STEMS = ["cmn", "jpn", "urd"];
const spec = (stem) => ({ id: `sib-rc-ud-${stem}-train`, async build() {
  const file = `${ROOT}/${stem}/train.conllu`;
  if (!fs.existsSync(file)) return { skip: "no train.conllu" };
  const intern = interner(), st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 };
  const sents = readConllu(file, intern, st, "words"), units = [], docOf = [];
  sents.forEach((s, k) => { units.push(s); docOf.push(Math.floor(k / BLOCK)); });
  return { id: `sib-rc-ud-${stem}-train`, group: "sib", register: "treebank", language: stem, script: scriptOf(units), units, docOf, meta: {
    tokenisation: "ud-syntactic-words: CoNLL-U word lines (multiword-token ranges split into their words), UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _ (same as loaders/ud.mjs)",
    docDef: `consecutive blocks of ${BLOCK} sentences of the train file; cap 300000 tokens by whole blocks in sha256(id:block) order`, source: file,
    notes: `UD TRAIN split of stem ${stem} (the atlas read dev+test only); ${sents.length} sentences, ${tokenCount(units)} tokens before the cap; counters ${JSON.stringify(st)}`, stem } };
} });
export const SPECS = [...PLUS_STEMS, ...ABSENT_STEMS].map(spec), IDS = SPECS.map((s) => s.id);
export const loadWithReport = (onlyIds = null) => runLoader(SPECS, onlyIds);
export async function load(onlyIds = null) { return (await loadWithReport(onlyIds)).pockets; }
