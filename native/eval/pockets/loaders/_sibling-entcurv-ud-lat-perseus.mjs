// loaders/_sibling-entcurv-ud-lat-perseus.mjs — SIBLING pocket (kind: treebank) for the confirmation of order.entCurv: Universal Dependencies Latin-Perseus, train + test files from the fixtures of the
// eoreader7-latest checkout (native/eval/fixtures/ud-latin-perseus). The atlas ud group reads only the 53 stems under /private/tmp/claude-501/ud-eval (dev + test; no Latin, and no train split of any stem
// exists there), so this treebank is new. Documents whose text is already an atlas pocket are LEFT OUT: phi0690 (Vergil, Aeneid = bk-aeneid-la), phi1351 (Tacitus = ml-lat-tacitus), tlg0031 (New Testament).
import { udPocket } from "./_sibling-entcurv-common.mjs";
export const ID = "ec-ud-lat-perseus";
const FX = "/Users/mlacy/Documents/3.0/eoreader7-latest/native/eval/fixtures/ud-latin-perseus/";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  return [udPocket({ id: ID, language: "lat", files: [{ path: FX + "la_perseus-ud-train.conllu" }, { path: FX + "la_perseus-ud-test.conllu" }],
    keepDoc: (d) => !/^(phi0690|phi1351|tlg0031)\./.test(d || ""),
    notes: "UD Latin-Perseus train+test; documents phi0690 (Aeneid), phi1351 (Tacitus) and tlg0031 (New Testament) dropped because the atlas holds those texts (bk-aeneid-la, ml-lat-tacitus)" })];
}
