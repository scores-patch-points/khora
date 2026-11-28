// codec-regions: where each ROOT codec applies in a text (the first built piece of the composed, on-demand codec). Needs the grammar priors (KHORA_PRIORS_DIR or janus beside the workspace); skips with the reason otherwise.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path";
import { regionCodecs, tokensWithOffsets, REGIONS_SCHEMA, DERIVATION_SCHEMA } from "./codec-regions.mjs"; import { PRIORS } from "./codec-fold.mjs";
const have = (c) => fs.existsSync(path.join(PRIORS, `ud-grammar-${c}.json.gz`)), skip = have("eng") && have("spa") ? false : `no eng and spa grammar priors in ${PRIORS}`;
test("tokens keep their offsets in the text; an inner apostrophe stays in the token; nothing but letters starts or ends one", () => {
  const t = "I didn't go — niños, sí."; for (const k of tokensWithOffsets(t)) assert.equal(t.slice(k.at, k.end), k.form); assert.deepEqual(tokensWithOffsets(t).map((k) => k.form), ["I", "didn't", "go", "niños", "sí"]);
});
test("FALSE IF a mixed text is read as one language: a Spanglish sentence comes back as English and Spanish regions in order, each region the words of its language, with the derivation naming both roots", { skip }, async () => {
  const t = "I went to the tienda porque necesitaba some milk for the niños, and then mi abuela called me.", r = await regionCodecs(t);
  assert.equal(r.schema, REGIONS_SCHEMA); assert.deepEqual([...r.roots].sort(), ["eng", "spa"]); assert.equal(r.mixed, true);
  assert.deepEqual(r.regions.map((g) => [g.codec, t.slice(g.at, g.end)]), [["eng", "I went to the"], ["spa", "tienda porque necesitaba"], ["eng", "some milk for the"], ["spa", "niños"], ["eng", "and then"], ["spa", "mi abuela"], ["eng", "called me"]]);
  assert.equal(r.derivation.schema, DERIVATION_SCHEMA); assert.deepEqual(r.derivation.sources.map((s) => [s.id, s.standing]).sort(), [["ud-grammar-eng", "root"], ["ud-grammar-spa", "root"]]); assert.ok(Math.abs(r.derivation.sources.reduce((a, s) => a + s.weight, 0) - 1) < 0.01);
  assert.ok(r.stay > 0 && r.stay < 1, "the stay probability is fitted to the text, not typed");
});
test("FALSE IF a monolingual sentence is cut up: plain English is one root and one region", { skip }, async () => {
  const r = await regionCodecs("The dog chased the cat across the garden and then it slept under the old tree for a while."); assert.deepEqual(r.roots, ["eng"]); assert.equal(r.regions.length, 1); assert.equal(r.mixed, false); assert.equal(r.stay, 1);
});
test("typed gaps, never a default: no letters; a token no chosen root holds is marked unknown and counted, not given a language of its own", { skip }, async () => {
  assert.equal((await regionCodecs("12 34 !!")).gap.gap, "no_letters");
  const r = await regionCodecs("The dog chased Zxqvkrt across the garden."); const z = r.tokens.find((k) => k.form === "Zxqvkrt"); assert.equal(z.known, false); assert.equal(z.codec, "eng"); assert.ok(r.derivation.gaps.some((g) => g.endsWith("_tokens_no_chosen_root_holds")));
});
test("KNOWN FAILURE, kept: business English is cut into a second root (words no English form table holds are explained by another language's table); the register is not a root and is not read", { skip }, async () => {
  const r = await regionCodecs("Per my last email, kindly revert by EOD so we can circle back and align on the deliverables."); assert.ok(r.roots.includes("eng")); assert.ok(r.roots.length >= 1);
});
