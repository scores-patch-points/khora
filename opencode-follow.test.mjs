// An encyclopedia is an index (opencode-primary.mjs fromIndex, followIndexes): which evidence is an index, and what a support resting on one
// becomes when its citation cannot be followed. No network: the deadline is already past.
import test from "node:test";
import assert from "node:assert/strict";
const { fromIndex, followIndexes } = await import("./opencode-primary.mjs");

test("Wikipedia and other encyclopedias are indexes; a page of another kind is a source", () => {
  assert.equal(fromIndex({ source: "https://en.wikipedia.org/wiki/Lima_bean", text: "x" }), true);
  assert.equal(fromIndex({ source: "wikipedia: Marie Curie", text: "x" }), true);
  assert.equal(fromIndex({ source: "britannica.com", url: "https://www.britannica.com/plant/bean", text: "x" }), true);
  assert.equal(fromIndex({ source: "https://harvesttotable.com/legumes/", text: "x" }), false);
  assert.equal(fromIndex({ source: "curie.md", text: "x" }), false);
});

test("a support resting on an index it could not follow says so, and keeps the index as `via`", async () => {
  const claims = [
    { text: "Lima beans were domesticated in the Andes.", standing: "supported", evidence: { source: "https://en.wikipedia.org/wiki/Lima_bean", text: "Lima beans were domesticated in the Andes." }, searched: ["material"] },
    { text: "Beans grow in pods.", standing: "supported", evidence: { source: "https://harvesttotable.com/legumes/", text: "Beans grow in pods." } },
    { text: "It glows.", standing: "unsupported" },
  ];
  const r = await followIndexes(claims, { deadline: Date.now() - 1 });
  assert.equal(r.claims[0].tier, "index");
  assert.equal(r.claims[0].via.source, "https://en.wikipedia.org/wiki/Lima_bean");
  assert.match(r.claims[0].searched.at(-1), /^cited source: /);
  assert.equal(r.claims[1].tier, undefined, "a source that is not an index is left as it is");
  assert.equal(r.claims[2].tier, undefined);
  assert.deepEqual(r.pages, []);
});
