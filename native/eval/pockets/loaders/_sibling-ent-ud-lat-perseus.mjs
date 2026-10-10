// loaders/_sibling-ent-ud-lat-perseus.mjs — SIBLING pocket (kind: treebank) for the confirmation of order.entSlope: Universal Dependencies Latin-Perseus, train + test files from the fixtures of the
// eoreader7 checkout (eval/fixtures/ud-latin-perseus). The atlas ud group reads only the 53 stems under /private/tmp/claude-501/ud-eval (no Latin), so this treebank is new.
// Documents whose text is already an atlas pocket are LEFT OUT: phi0690 (Vergil, Aeneid = bk-aeneid-la), phi1351 (Tacitus = ml-lat-tacitus), tlg0031 (New Testament).
import { udFilteredPocket } from "./_sibling-ent-ud-common.mjs";
export const ID = "ent-ud-lat-perseus";
const FX = "/Users/mlacy/Documents/3.0/eoreader7-latest/native/eval/fixtures/ud-latin-perseus/";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  return [udFilteredPocket({ id: ID, language: "lat", files: [FX + "la_perseus-ud-train.conllu", FX + "la_perseus-ud-test.conllu"], keep: ({ docId }) => !/^(phi0690|phi1351|tlg0031)\./.test(docId || ""),
    notes: "UD Latin-Perseus train+test; documents phi0690 (Aeneid), phi1351 (Tacitus) and tlg0031 (New Testament) dropped because the atlas holds those texts (bk-aeneid-la, ml-lat-tacitus)" })];
}
