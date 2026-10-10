// loaders/_sibling-ud.mjs — NEW treebank pockets for the sibling replication of fig.introRight: the UD TRAIN splits (never read by the atlas, which read dev+test of /private/tmp/claude-501/ud-eval) of the 19 stems that the atlas dropped as thin
// (ud.manifest.json skippedAtBuild: afr ces dan ell gle hun hye ita kat lit mar mlt nld rus tam tel tur uig wol). Train files: /private/tmp/claude-501/tb/<stem>/train.conllu.
// Reader, blocks and cap are those of loaders/ud.mjs (readConllu: CoNLL-U syntactic words, UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC; document = 25 consecutive sentences; cap 300k tokens by whole documents in sha256 order).
// Stems whose train file is still under the 20,000-token / 20-document floor are returned as skipped (thin), never scored.
import fs from "node:fs";
import { interner, scriptOf } from "./_ud_ml_common.mjs";
import { readConllu } from "./_conllu.mjs";
import { runLoader } from "./_ud_ml_run.mjs";
import { tokenCount } from "../lib/pocket.mjs";

const ROOT = "/private/tmp/claude-501/tb", BLOCK = 25;
export const STEMS = ["afr", "ces", "dan", "ell", "gle", "hun", "hye", "ita", "kat", "lit", "mar", "mlt", "nld", "rus", "tam", "tel", "tur", "uig", "wol"];
const spec = (stem) => ({ id: `sib-ud-${stem}-train`, async build() {
  const file = `${ROOT}/${stem}/train.conllu`;
  if (!fs.existsSync(file)) return { skip: "no train.conllu" };
  const intern = interner(), st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 };
  const sents = readConllu(file, intern, st, "words"), units = [], docOf = [];
  sents.forEach((s, k) => { units.push(s); docOf.push(Math.floor(k / BLOCK)); });
  return { id: `sib-ud-${stem}-train`, group: "sib", register: "treebank", language: stem, script: scriptOf(units), units, docOf, meta: {
    tokenisation: "ud-syntactic-words: CoNLL-U word lines (multiword-token ranges split into their words), UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC, spaces inside a form joined by _ (same as loaders/ud.mjs)",
    docDef: `consecutive blocks of ${BLOCK} sentences of the train file; cap 300000 tokens by whole blocks in sha256(id:block) order`, source: file,
    notes: `UD TRAIN split of stem ${stem} (the atlas read dev+test only and dropped ud-${stem} as thin); ${sents.length} sentences, ${tokenCount(units)} tokens before the cap; counters ${JSON.stringify(st)}`, stem } };
} });
export const SPECS = STEMS.map(spec), IDS = SPECS.map((s) => s.id);
export const loadWithReport = (onlyIds = null) => runLoader(SPECS, onlyIds);
export async function load(onlyIds = null) { return (await loadWithReport(onlyIds)).pockets; }
