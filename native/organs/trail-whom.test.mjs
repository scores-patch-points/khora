import test from "node:test";
import assert from "node:assert/strict";
import { whomFromTrail, accumulate } from "./trail-whom.js";
import { admitWhom, foldWithWhom } from "./whom-standing.js";

const U = [
  { id: "u1", address: "px_a/text@h#b0-40", text: "Maria approved the freeze.", side: "U", claim: { subj: "Maria", pred: "approved", obj: "the freeze", polarity: "+" }, activation: 3 },
  { id: "u2", address: "px_a/text@h#b0-40", text: "Maria approved the freeze.", side: "U", claim: { subj: "Maria", pred: "chairs", obj: "the committee", polarity: "+" }, activation: 2 },
  { id: "u3", address: "px_a/text@h#b50-90", text: "Daniel opposed the fare increase.", side: "U", claim: { subj: "Daniel", pred: "opposed", obj: "the fare increase", polarity: "+" }, activation: 1 },
];

test("a trail resolves to W spans of the universe, every claim at a shared address, with provenance", () => {
  const r = whomFromTrail([{ address: U[0].address, turn: 1, via: "seen" }], { universe: U });
  assert.equal(r.spans.length, 2, "both claims read from that sentence were shown");
  assert.ok(r.spans.every((s) => s.side === "W" && s.provenance.kind === "seen" && s.provenance.ref === "turn:1"));
  assert.equal(new Set(r.spans.map((s) => s.id)).size, 2, "ids are unique");
  assert.equal(admitWhom(r.spans, { universe: U }).admitted.length, 2, "N3 admits seen spans that name universe addresses");
});

test("an address the universe does not hold, or an unknown via, is typed and never admitted", () => {
  const r = whomFromTrail([{ address: "px_zzz/text@h#b0-1", turn: 2, via: "seen" }, { address: U[0].address, via: "told" }, { via: "seen" }], { universe: U });
  assert.equal(r.spans.length, 0);
  assert.deepEqual(r.unresolved.map((x) => x.why), ["not-in-universe", "unknown-via", "no-address"]);
});

test("duplicates in a trail collapse; the same address seen and spoken are two typed readings", () => {
  const r = whomFromTrail([{ address: U[2].address, turn: 1, via: "seen" }, { address: U[2].address, turn: 3, via: "seen" }, { address: U[2].address, turn: 3, via: "spoken" }], { universe: U });
  assert.equal(r.spans.length, 2);
  assert.deepEqual(r.spans.map((s) => s.provenance.kind).sort(), ["seen", "spoken"]);
});

test("accumulate adds only new record-side addresses: re-showing the same spans does not grow the trail (L38)", () => {
  const t1 = accumulate([], U.map((u) => u.address), { turn: 1 });
  assert.equal(t1.length, 2, "two distinct addresses among three claims");
  const t2 = accumulate(t1, U.map((u) => u.address), { turn: 2 });
  assert.equal(t2.length, 2, "nothing doubles");
  const t3 = accumulate(t2, [U[2].address, "px_b/text@h#b0-9"], { turn: 3, via: "seen" });
  assert.equal(t3.length, 3);
  assert.throws(() => accumulate([], [], { via: "told" }));
});

test("end to end: the fold withholds what the trail shows and shows no held passage as new", () => {
  const region = [...U, ...["Priya visited the harbor.", "Tom wrote a letter.", "Iris painted the fence.", "Omar repaired the pump.", "Lena sold the orchard.", "Ben carried the ladder."].map((t, i) => ({ id: `f${i}`, address: `px_a/text@h#b${200 + i * 50}-${240 + i * 50}`, text: t, side: "U", claim: { subj: t.split(" ")[0], pred: t.split(" ")[1], obj: t.split(" ").slice(2).join(" ").replace(".", ""), polarity: "+" }, activation: 1 }))];
  const trail = accumulate([], [region[0].address, region[2].address], { turn: 1 });
  const { spans } = whomFromTrail(trail, { universe: region });
  const wFull = region.map((u) => ({ ...u, side: "W" }));
  const f = foldWithWhom({ region, whom: spans, wFull });
  assert.equal(f.whom.admitted, spans.length);
  assert.equal(f.whom.refused.length, 0);
});
