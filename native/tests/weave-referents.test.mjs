// weave-referents.test.mjs — the cast of an ordered read is written to pharos whole: names, returning descriptions and identity edges,
// every field defined (pharos refuses an undefined value). Writes to the test pharos (pharos-gate.mjs dirs(): a temp dir under node --test).
import test from "node:test"; import assert from "node:assert/strict";
import { referentsInOrder } from "../adapters/text/referents-in-order.mjs";
import { weaveReferents } from "../the-fold/pharos-gate.mjs";
const R = (id, form, upos, head, deprel, feats = "_") => ({ id, form, lemma: form.toLowerCase(), upos, head, deprel, feats });
test("a cast with names, a returning description and an apposition weaves without an undefined value", () => {
  const s = (order, ...rows) => ({ order, rows });
  const cast = referentsInOrder([
    s(0, R(1, "Prince", "PROPN", 2, "compound"), R(2, "Andrew", "PROPN", 6, "nsubj"), R(3, ",", "PUNCT", 5, "punct"), R(4, "the", "DET", 5, "det", "Definite=Def|PronType=Art"), R(5, "husband", "NOUN", 2, "appos", "Number=Sing"), R(6, "came", "VERB", 0, "root")),
    s(1, R(1, "The", "DET", 2, "det", "Definite=Def|PronType=Art"), R(2, "husband", "NOUN", 3, "nsubj", "Number=Sing"), R(3, "sat", "VERB", 0, "root")),
  ]);
  assert.ok(cast.referents.some((r) => r.kind === "nominal" && r.mentions === 2));
  const n = process.env.KHORA_NO_PHAROS_GATE === "1" ? null : weaveReferents({ text: "fixture", referents: cast.referents, edges: cast.edges });
  if (n !== null) assert.ok(n >= 3, `woven ${n}`);
});
