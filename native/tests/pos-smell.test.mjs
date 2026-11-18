import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { buildCentroids, sniff, emergent, modelFromJson } from "../adapters/text/pos-smell.js";
const HERE = path.dirname(fileURLToPath(import.meta.url)); const u = (a) => { const n = Math.hypot(...a); return Float32Array.from(a, (x) => x / n); };
const jitter = (base, i) => u(base.map((x, k) => x + 0.05 * Math.sin(i * 7 + k)));
const entries = []; for (let i = 0; i < 60; i++) { entries.push({ word: "n" + i, cls: "NOUN", vec: jitter([1, 0, 0, 0], i) }); entries.push({ word: "v" + i, cls: "VERB", vec: jitter([0, 1, 0, 0], i) }); entries.push({ word: "a" + i, cls: "ADJ", vec: jitter([0, 0, 1, 0], i) }); }
const model = buildCentroids(entries);
test("canonical centroids sniff the class of a form near them, with its own null bound", () => {
  assert.equal(model.classes.NOUN.n, 60); assert.ok(model.classes.NOUN.nullP95 < 0.5, "a noun centroid is far from random verbs and adjectives");
  const r = sniff(u([0.9, 0.1, 0, 0]), model); assert.equal(r.cls, "NOUN"); assert.ok(r.claimed); assert.ok(r.margin > 0.5);
});
test("a word no class claims is unclaimed and falls to an emergent cluster, never a canonical tag", () => {
  const items = [...Array(5)].map((_, i) => ({ word: "x" + i, vec: u([0, 0, 0, 1 + 0.01 * i]) })).concat([{ word: "noun-ish", vec: u([1, 0, 0, 0]) }]);
  const e = emergent(items, model); assert.equal(e.claimed, 1); assert.equal(e.clusters.length, 1); assert.ok(e.clusters[0].name.startsWith("emergent:")); assert.equal(e.clusters[0].size, 5);
});
test("the shipped English model is a Thrax-handled measured reading with 17 UD classes and a null bound per class", () => {
  const j = JSON.parse(fs.readFileSync(path.join(HERE, "..", "adapters", "text", "pos-smell", "eng.json"), "utf8")); assert.equal(j.handle, "Thrax"); assert.equal(Object.keys(j.classes).length, 17);
  const m = modelFromJson(j); for (const c of Object.values(m.classes)) assert.ok(c.centroid.length === 768 && c.nullP95 != null);
});
