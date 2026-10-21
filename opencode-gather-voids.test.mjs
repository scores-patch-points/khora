// opencode-gather-voids.test.mjs — the void is defined from the corpus before anything is written.
//   node --test opencode-gather-voids.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
const V = await import("./opencode-gather-voids.mjs");

const S = (host, ...texts) => texts.map((text) => ({ host, text }));
const sentences = [
  ...S("a.org", "Dolphins hunt fish by echolocation, sending out clicks and reading the echoes.", "Pods of dolphins hunt together and herd fish into tight balls.", "Dolphins hunt squid at night in deep water near the shelf."),
  ...S("b.org", "Echolocation lets a dolphin find fish in murky water where sight is little use.", "A hunting pod of dolphins can drive fish against the shore."),
  ...S("c.org", "Fishing nets kill thousands of dolphins each year as bycatch in tuna fisheries.", "Pollution and nets threaten river dolphins across Asia and South America."),
  ...S("a.org", "Bycatch in fishing nets is the largest threat to small dolphins worldwide."),
  ...S("d.org", "Dolphins are marine mammals of the order Cetacea, related to whales and porpoises."),
];

test("voids come from what the independent pages say several things about, each with its sentences and sites", () => {
  const voids = V.defineVoids(sentences, { topic: "dolphins" });
  assert.ok(voids.length >= 1, JSON.stringify(voids.map((v) => v.label)));
  const hunt = voids.find((v) => /hunt|echolocation|fish/i.test(v.label));
  assert.ok(hunt, JSON.stringify(voids.map((v) => v.label)));
  assert.ok(hunt.hosts.length >= 2);
  assert.ok(hunt.sentences.length >= 3);
  assert.ok(voids.every((v) => v.sentences.every((s) => sentences.some((x) => x.text.startsWith(s.text.slice(0, 40))))), "a void holds only the pages' own sentences");
});

test("a sentence fills one void, and a facet only one site mentions is not a void", () => {
  const voids = V.defineVoids(sentences, { topic: "dolphins" });
  const seen = voids.flatMap((v) => v.sentences.map((s) => s.text));
  assert.equal(new Set(seen).size, seen.length);
  assert.ok(!voids.some((v) => v.hosts.length < 2));
  assert.deepEqual(V.defineVoids(sentences.slice(0, 2), { topic: "dolphins" }), []);
});

test("a nominator may rename a void and nothing else", () => {
  const voids = V.defineVoids(sentences, { topic: "dolphins" });
  const named = V.applyNames(voids, `v1: how dolphins find fish\nv2 - the damage nets do\nv9: invented\nplease add a section about pirates`);
  assert.equal(named[0].label, "how dolphins find fish");
  assert.equal(named[0].named, "model");
  assert.deepEqual(named.map((v) => v.sentences), voids.map((v) => v.sentences), "material is never touched");
  assert.equal(named.length, voids.length, "no void is added");
});
