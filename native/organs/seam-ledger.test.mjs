import test from "node:test";
import assert from "node:assert/strict";
import { seamReport, creaseEntry, untouchedBy } from "./seam-ledger.js";
import { declareHoldings, distanceOf, partitionByHoldings } from "./holdings.js";
import { seg, sentence } from "./prose-laws.js";

const S = (...segs) => sentence(segs, ["g1"]);

test("seamReport: addressed spans and seams are the only two kinds, counted by UTF-8 byte", () => {
  const s = S(seg.frame("According to "), seg.source("Maria Lopez", "px_a/text@abc#b0-11"), seg.frame(", "), seg.source("the “vote” was delayed", "px_a/text@abc#b20-40"), seg.frame("."));
  const r = seamReport([s]);
  assert.equal(r.contract.ok, true);
  assert.equal(r.bytes.source, 11 + new TextEncoder().encode("the “vote” was delayed").length);
  assert.equal(r.bytes.total, new TextEncoder().encode(s.text).length);
  assert.equal(r.seamCount, 3); // leading frame, the comma between spans, the full stop
  assert.deepEqual(r.seams.map((x) => x.joins), [
    { left: null, right: "px_a/text@abc#b0-11" },
    { left: "px_a/text@abc#b0-11", right: "px_a/text@abc#b20-40" },
    { left: "px_a/text@abc#b20-40", right: null },
  ]);
  assert.equal(r.mouthShare, 0);
  assert.ok(Math.abs(r.addressedShare + r.seamDensity - 1) < 1e-12);
});

test("seamReport: the mouth is a number — only `model` bytes, and only inside a seam", () => {
  const s = S(seg.source("the council", "px_a/text@abc#b0-11"), { kind: "model", t: " have", by: "self:gemma2:2b" }, seg.frame(" "), seg.source("approved the lease", "px_a/text@abc#b30-48"));
  const r = seamReport([s]);
  assert.equal(r.bytes.model, 5);
  assert.equal(r.mouthSeams, 1);
  assert.equal(r.seams[0].mouth, true);
  assert.deepEqual(r.seams[0].kinds.sort(), ["frame", "model"]);
  assert.equal(r.mouthShare, 5 / r.bytes.total);
});

test("seamReport: the contract refuses a third kind and an unaddressed source", () => {
  const bad = sentence([{ kind: "source", t: "unaddressed" }, { kind: "vibes", t: "?" }], ["g1"]);
  const r = seamReport([bad]);
  assert.equal(r.contract.ok, false);
  assert.equal(r.contract.violations.length, 2);
  assert.equal(r.bytes.source, 0, "an unaddressed source is not counted as addressed");
});

test("seamReport: values are seams (computed, grounded by the sentence), never addressed bytes", () => {
  const r = seamReport([S(seg.frame("Across "), seg.value("three"), seg.frame(" pages."))]);
  assert.equal(r.bytes.value, 5);
  assert.equal(r.addressedShare, 0);
  assert.equal(r.seamCount, 1);
});

test("seamReport: nothing in, null shares out (not 0, not NaN)", () => {
  const r = seamReport([]);
  assert.equal(r.addressedShare, null);
  assert.equal(r.mouthShare, null);
  assert.equal(r.contract.ok, true);
});

test("declareHoldings: a placeholder is not a whom, and an omitted holding is not an empty one", () => {
  assert.throws(() => declareHoldings({ giver: "the asker", told: [], seen: [] }), /placeholder/);
  assert.throws(() => declareHoldings({ giver: "reader-7" }), /must be passed/);
  assert.throws(() => declareHoldings({ giver: "reader-7", told: [] }), /must be passed/);
  assert.throws(() => declareHoldings({ kind: "person", told: [], seen: [] }), /giver is required/);
  const first = declareHoldings({ giver: "reader-7", told: [], seen: [] });
  assert.equal(first.empty, true, "a first contact is declared, not unset");
  assert.equal(Object.isFrozen(first), true);
});

test("declareHoldings: any corpus with a boundary can be the whom; a statute without one cannot", () => {
  assert.throws(() => declareHoldings({ giver: "Metro Code 13.08.080", kind: "statute", told: [], seen: [] }), /boundary/);
  const statute = declareHoldings({ giver: "Metro Code 13.08.080", kind: "statute", told: ["13.08.080(A)"], seen: ["px_code"], boundary: "px_code/text@h#b0-9000" });
  assert.equal(statute.kind, "statute");
  assert.equal(statute.holdings.told, 1);
  assert.throws(() => declareHoldings({ kind: "void", told: ["x"], seen: [] }), /holds nothing/);
  assert.equal(declareHoldings({ kind: "void", told: [], seen: [] }).giver, null);
});

test("distanceOf: the catalog pole is the empty whom; held-everything is the other pole; between is a number", () => {
  const touched = [{ key: "c1", page: "pA" }, { key: "c2", page: "pA" }, { key: "c3", page: "pB" }, { key: "c4", page: "pB" }];
  const none = declareHoldings({ kind: "void", told: [], seen: [] });
  const d0 = distanceOf(touched, none);
  assert.equal(d0.told, 1);
  assert.equal(d0.pole, "catalog");

  const all = declareHoldings({ giver: "reader-7", told: touched.map((t) => t.key), seen: ["pA", "pB"] });
  assert.equal(distanceOf(touched, all).told, 0);
  assert.equal(distanceOf(touched, all).pole, "held");

  const near = declareHoldings({ giver: "reader-9", told: ["c1", "c2", "c3"], seen: ["pA"] });
  const d = distanceOf(touched, near);
  assert.equal(d.told, 0.25);
  assert.equal(d.seen, 0.5, "told and seen are different holdings");
  assert.equal(d.pole, null);

  assert.equal(distanceOf([], near).told, null, "touching nothing has no distance");
});

test("two-whom property at the partition: one universe, shapes differ exactly where holdings differ", () => {
  const universe = ["c1", "c2", "c3", "c4", "c5"].map((id) => ({ id, pinax: id < "c3" ? "pA" : "pB" }));
  const A = declareHoldings({ giver: "reader-A", told: new Map([["c1", "out/1#s0"], ["c2", "out/1#s1"], ["c3", "out/2#s0"]]), seen: ["pA", "pB"] });
  const B = declareHoldings({ giver: "reader-B", told: [], seen: [] });
  const A2 = declareHoldings({ giver: "reader-A-twin", told: new Map([["c1", "out/9#s0"], ["c2", "out/9#s1"], ["c3", "out/9#s2"]]), seen: ["pA", "pB"] });

  const pa = partitionByHoldings(universe, A), pb = partitionByHoldings(universe, B), pa2 = partitionByHoldings(universe, A2);
  const ids = (xs) => xs.map((x) => x.item.id);

  // same universe: every item lands in exactly one side, for every whom
  for (const p of [pa, pb, pa2]) assert.deepEqual([...ids(p.fresh), ...ids(p.held)].sort(), universe.map((u) => u.id));
  // different whoms, different shapes — and B (far) is shown everything, A (near) only what is new to them
  assert.deepEqual(ids(pa.fresh), ["c4", "c5"]);
  assert.deepEqual(ids(pb.fresh), ["c1", "c2", "c3", "c4", "c5"]);
  assert.deepEqual(ids(pb.held), []);
  // identical holdings, identical partition (the lens is a function of the whom)
  assert.deepEqual(ids(pa.fresh), ids(pa2.fresh));
  // the drop carries a typed reason that names where it was told — distinct from "below the floor"
  assert.equal(pa.held[0].reason.kind, "held");
  assert.match(pa.held[0].reason.text, /already told to this whom at out\/1#s0/);
  // a fresh item on a page the whom was shown is available to them, and says so
  assert.equal(pa.fresh.every((f) => f.seenPage), true);
});

test("creaseEntry: records what the whom held and how the fold stood, never the whom's corpus", () => {
  const whom = declareHoldings({ giver: "reader-A", told: ["c1"], seen: ["pA"], thread: ["t1", "t2"] });
  const report = seamReport([S(seg.frame("From "), seg.source("a page", "px_a/text@abc#b0-6"), seg.frame("."))]);
  const e = creaseEntry({ holdings: whom, question: "q:who-approved", nulls: { draws: 199, seed: 20261014 }, report, distance: distanceOf([{ key: "c1", page: "pA" }], whom), output: "out/3" });
  assert.equal(Object.isFrozen(e), true);
  assert.deepEqual(e.whom.holdings, { told: 1, seen: 1, thread: 2 });
  assert.equal(e.whom.told, undefined);
  assert.equal(e.contract, true);
  assert.equal(e.seams.count, 2);
  assert.throws(() => creaseEntry({ holdings: whom, report: {} }), /seamReport/);
});

test("untouchedBy: W spans no fold ever touched are named, not judged", () => {
  const whom = declareHoldings({ giver: "reader-A", told: ["c1", "c2", "c3"], seen: [] });
  assert.deepEqual(untouchedBy(whom, new Set(["c2"])), ["c1", "c3"]);
  assert.deepEqual(untouchedBy(whom, ["c1", "c2", "c3"]), []);
});
