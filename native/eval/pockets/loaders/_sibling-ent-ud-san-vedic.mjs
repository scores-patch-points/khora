// loaders/_sibling-ent-ud-san-vedic.mjs — SIBLING pocket (kind: treebank) for the confirmation of order.entSlope: Universal Dependencies Vedic Sanskrit, test file from the fixtures of the eoreader7
// checkout (eval/fixtures/ud-sanskrit-vedic). Sentences cited from the Rigveda (citation_text=ṚV) are LEFT OUT because the atlas holds that text (ml-san-rigveda).
import { udFilteredPocket } from "./_sibling-ent-ud-common.mjs";
export const ID = "ent-ud-san-vedic";
const FX = "/Users/mlacy/Documents/3.0/eoreader7-latest/native/eval/fixtures/ud-sanskrit-vedic/";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  return [udFilteredPocket({ id: ID, language: "san", files: [FX + "sa_vedic-ud-test.conllu"], keep: ({ comments }) => !comments.some((c) => /^# citation_text=ṚV(\b|,|$)/u.test(c)),
    notes: "UD Vedic Sanskrit test file (Brahmanas, Atharvaveda, Upanishads, sutras ...); sentences with citation_text=ṚV (Rigveda) dropped" })];
}
