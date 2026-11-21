import test from "node:test"; import assert from "node:assert/strict";
import { loadModel, smell, nameable, MODELS, LANGS, SCHEMA, EmergentSmellGap } from "./emergent-smell.mjs";
test("all four pinned models load and carry the schema, vocab and cluster names", () => {
  for (const l of LANGS) { const m = loadModel(l); assert.equal(m.schema, SCHEMA); assert.ok(Object.keys(m.vocab).length > 0); assert.ok(Object.keys(m.clusterName).length > 0); }
});
test("a known form smells as its cluster's dominant tag with a margin in [0,1]; an unknown form is unnameable", () => {
  const m = loadModel("eng");
  const known = Object.keys(m.vocab)[0];
  const v = smell({ model: m, form: known });
  assert.ok(v && typeof v.cls === "string" && v.margin >= 0 && v.margin <= 1);
  assert.equal(smell({ model: m, form: "zzzzunseenzzzz" }), null);
});
test("the refusal is the signal: nameable is true only for a form the smell can name", () => {
  const m = loadModel("eng"); const known = Object.keys(m.vocab)[0];
  assert.equal(nameable(smell({ model: m, form: known })), true);
  assert.equal(nameable(smell({ model: m, form: "zzzz" })), false);
});
test("gaps are typed: a language with no model, a tampered model", () => {
  assert.throws(() => loadModel("la"), (e) => e instanceof EmergentSmellGap && e.code === "no_model_for_language");
  assert.throws(() => smell({ model: null, form: "x" }), (e) => e.code === "bad_model");
});
test("every pin is 16 hex characters", () => { for (const l of LANGS) assert.match(MODELS[l], /^[0-9a-f]{16}$/); });
