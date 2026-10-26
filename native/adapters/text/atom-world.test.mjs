import test from "node:test";
import assert from "node:assert/strict";
import { worldFromReadings, atomIdentity, nodeOf } from "./atom-world.js";

// A planted-truth world, the way corpus-identity.test.mjs plants one, but as ATOMS: eight people, each with its own verbs and company; one person is
// met in two readings (the SAME being, half of its occurrences in each), another is a decoy that shares its surname with it but has its own world.
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const atomsOf = (person, entity, n, r) => Array.from({ length: n }, () => ({ pred: `${person}v${Math.floor(r() * 6)}`, args: [{ entity, name: `Dr ${person}` }, { value: `${person}co${Math.floor(r() * 5)}` }, { value: "said" }], neg: false }));
const plant = () => {
  const r = rng(11), people = Array.from({ length: 8 }, (_, p) => ({ name: `p${p}`, entity: p, atoms: atomsOf(`p${p}`, p, 60, r) }));
  const whole = people[0].atoms, readings = people.slice(1).map((q) => ({ doc: `d${q.entity}`, atoms: q.atoms }));
  readings.push({ doc: "src_a", atoms: whole.filter((_, i) => i % 2 === 0) }, { doc: "src_b", atoms: whole.filter((_, i) => i % 2 === 1) });
  return readings;
};

test("a node is a referent of one reading, an occurrence is an atom naming it; a figure or a kind is no node", () => {
  const W = worldFromReadings([{ doc: "s", atoms: [
    { pred: "has_radius", args: [{ entity: 1, name: "Mercury" }, { value: "2,440 km", measure: "length", base: 2440000 }] },
    { pred: "is_a", args: [{ entity: 1, name: "Mercury" }, { value: "planet" }] }] }]);
  assert.deepEqual([...W.keys()], ["s:1"]);
  assert.equal(W.get("s:1").length, 2, "one occurrence per atom that names it");
  assert.deepEqual(W.get("s:1")[1].map((o) => o.f).sort(), ["v:is_a", "w:planet"]);
  assert.equal(nodeOf("s", { value: "planet" }), null);
});

test("holographic identity joins one being met in two readings and does not join the decoy", () => {
  const W = atomIdentity(plant()), a = { entity: 0, name: "Dr p0" };
  const same = W.standing("src_a", a, "src_b", a), other = W.standing("src_a", a, "d3", { entity: 3, name: "Dr p3" });
  assert.equal(same.kind, "same", JSON.stringify(same));
  assert.notEqual(other.kind, "same");
  assert.notEqual(other.kind, "against", "a measured difference of use convicts nothing; only a declared exclusion is against");
});

test("too little reading is needs_deeper_reading with how much is missing, never same and never against", () => {
  const W = atomIdentity([{ doc: "c", atoms: [{ pred: "has_radius", args: [{ entity: 1, name: "Mercury" }, { value: "6,000 km" }] }] },
    { doc: "s", atoms: [{ pred: "has_radius", args: [{ entity: 1, name: "Mercury" }, { value: "2,440 km" }] }, { pred: "is_a", args: [{ entity: 1, name: "Mercury" }, { value: "planet" }] }] }]);
  const st = W.standing("c", { entity: 1, name: "Mercury" }, "s", { entity: 1, name: "Mercury" });
  assert.equal(st.kind, "needs_deeper_reading");
  assert.equal(st.reason, "not_enough_reading");
  assert.deepEqual(st.have, [1, 2]);
  assert.equal(st.need, 3);
  assert.equal(st.same, false); assert.equal(st.against, false);
});

test("an end that is no referent has no being to ask about", () => {
  const W = atomIdentity([{ doc: "c", atoms: [] }, { doc: "s", atoms: [] }]);
  assert.equal(W.standing("c", { value: "6,000 km" }, "s", { value: "2,440 km" }), null);
  assert.equal(W.standing("c", { entity: 9 }, "s", { value: "planet" }), null);
});
