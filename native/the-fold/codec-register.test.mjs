// codec-register: the register of a text against measured genre sources. The read is MEASURED NEGATIVE (eval/codec-register/RESULT.md) and not wired; these tests pin its contract and its known failure, with synthetic sources.
import test from "node:test"; import assert from "node:assert/strict";
import { registerOf, termsOf, REGISTER_SCHEMA } from "./codec-register.mjs";
const src = (register, words) => ({ id: `t:${register}`, register, terms: new Set(words), standing: "measured" });
const LEGAL = src("legal", ["court", "statute", "pursuant", "defendant", "liable", "section", "agency", "shall"]), SCI = src("science", ["model", "parameters", "data", "results", "simulations", "estimated", "experimental", "numerical"]);
test("the unit is the source's own: letter runs of 4 or more, lower case", () => { assert.deepEqual(termsOf("The Court's ruling, pursuant to §3(b), is VOID."), ["court", "ruling", "pursuant", "void"]); });
test("a text is named a register only when a source shortens its description past the bar; the answer is a distribution with the derivation", () => {
  const r = registerOf("The defendant shall not be liable under this section unless the court finds that the agency violated the statute.", { sources: [LEGAL, SCI] });
  assert.equal(r.schema, REGISTER_SCHEMA); assert.equal(r.register, "legal"); assert.equal(r.distribution[0].register, "legal"); assert.ok(r.distribution[0].bits > r.bar); assert.deepEqual(r.derivation.sources.map((s) => s.id), ["t:legal"]);
});
test("typed gaps, never a default register: no source explains it; no sources; no terms", () => {
  const r = registerOf("I went to the store and bought some milk for the children this morning.", { sources: [LEGAL, SCI] }); assert.equal(r.register, null); assert.equal(r.gap.gap, "no_register_source_explains_it"); assert.deepEqual(r.derivation.sources, []);
  assert.equal(registerOf("anything", { sources: [] }).gap.gap, "no_register_sources"); assert.equal(registerOf("a an it", { sources: [LEGAL] }).gap.gap, "no_terms");
});
test("KNOWN FAILURE, kept (the reason it is not wired): a source with more marked terms than the nominal vocabulary can never be named, however many of the text's terms it holds", () => {
  const big = src("big", Array.from({ length: 20000 }, (_, i) => `word${i}`).concat(["laughed", "looked", "moment", "room", "sound", "little", "filled", "long"]));
  const r = registerOf("She looked at him for a long moment, and then she laughed, and the sound filled the little room.", { sources: [big, SCI] }); assert.equal(r.distribution.find((d) => d.register === "big").bits, 0); assert.equal(r.register, null);
});
