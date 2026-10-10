// loaders/_sibling-ent-ud-eng-pud.mjs — SIBLING pocket (kind: treebank) for the confirmation of order.entSlope: Universal Dependencies English-PUD (parallel news/Wikipedia sentences), test file from the
// fixtures of the eoreader7 checkout (eval/fixtures/ud-english-pud). The atlas ud-eng is the EWT (web text) dev+test; PUD is another corpus. May fall under the 20,000-token floor (then thin, not scored).
import { udFilteredPocket } from "./_sibling-ent-ud-common.mjs";
export const ID = "ent-ud-eng-pud";
const FX = "/Users/mlacy/Documents/3.0/eoreader7-latest/native/eval/fixtures/ud-english-pud/";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  return [udFilteredPocket({ id: ID, language: "eng", files: [FX + "en_pud-ud-test.conllu"], keep: () => true, notes: "UD English-PUD test (1,000 sentences); not the EWT of the atlas ud-eng" })];
}
