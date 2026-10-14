import test from "node:test";
import assert from "node:assert/strict";
import { induceTerrain, atmosphereTerrain, testimonyOf, publicationOrder, ATMOSPHERE_REGIME } from "./telling-organs.js";
import { cornerOf, CORNER_SAYS } from "./answer-ladder.js";
import { BOUND, CONTRADICTED, CONTESTED, UNBOUND, flip } from "../interpretation/hl.js";

// A population of figures in claims: two planted cliques that co-arrive only among themselves, plus figures that each co-arrive with one
// random partner. The inducer must find the cliques (positive control); a population with no cliques must hold nothing (negative control).
const rng = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
function coArrivals(groups, loners, { claims = 400, seed = 7 } = {}) {
  const r = rng(seed);
  const rows = [];
  const all = [...groups.flat(), ...loners];
  for (let seq = 0; seq < claims; seq++) {
    const g = groups.length && r() < 0.7 ? groups[Math.floor(r() * groups.length)] : null;
    const pickFrom = g ?? all;
    const a = pickFrom[Math.floor(r() * pickFrom.length)];
    let b = pickFrom[Math.floor(r() * pickFrom.length)];
    if (b === a) b = pickFrom[(pickFrom.indexOf(a) + 1) % pickFrom.length];
    rows.push({ unit: a, feature: "with", value: b, seq }, { unit: b, feature: "with", value: a, seq });
  }
  return rows;
}

test("terrain induction over any population: planted co-arrival groups hold through BOTH nulls (positive control)", () => {
  // Groups of 8 in 30: the inducer's own prevalence floor (1/√n) keeps only features at least ~6 figures share, so a smaller clique's
  // features are never parameters. Seed 2: both groups recovered (seeds 1–8 recover ≥1 group on 6, measured in docs/CALLIMACHUS.md §10).
  const G1 = Array.from({ length: 8 }, (_, i) => `a${i}`), G2 = Array.from({ length: 8 }, (_, i) => `b${i}`);
  const loners = Array.from({ length: 14 }, (_, i) => `x${i}`);
  const t = induceTerrain(coArrivals([G1, G2], loners, { seed: 2 }), { population: "test:planted" });
  assert.ok(t.held.length >= 1, JSON.stringify(t.diagnostics));
  for (const k of t.held) {
    assert.equal(k.induced.stable, true);
    assert.equal(k.challenged.cleared, true, "kindnull (testKindMembers) clears what it is asked to challenge");
    const inG1 = k.members.filter((m) => G1.includes(m)).length, inG2 = k.members.filter((m) => G2.includes(m)).length;
    assert.ok(Math.max(inG1, inG2) >= 7, `a held kind is one planted group: ${k.members.join(",")}`);
  }
  assert.equal(t.held.length, 2, "both planted groups");
});

test("terrain induction: with no structure, nothing holds — a fallback nomination is never told as a kind (negative control)", () => {
  // Seed 3: without the population null, the inducer AND testKindMembers both pass a 28-of-30 basin of pure noise here.
  const loners = Array.from({ length: 30 }, (_, i) => `x${i}`);
  const t = induceTerrain(coArrivals([], loners, { seed: 3 }), { population: "test:noise" });
  assert.ok(t.kinds.some((k) => k.induced.stable && k.challenged.cleared && !k.population_null.exceeded), "the case the population null exists for is present");
  assert.equal(t.held.length, 0, JSON.stringify(t.kinds.map((k) => [k.members.length, k.induced, k.challenged])));
  for (const k of t.kinds) if (k.induced.fallback) assert.equal(k.holds, false);
});

test("atmosphere: no text is a typed gap, and too little material is the regime's own typed decline — never an invented boundary", () => {
  const record = { sources: [{ id: "p1", declared: { published: "2026-02-01" } }, { id: "p2", declared: { published: "2025-01-01" } }, { id: "p3", declared: {} }], atoms: [] };
  assert.match(atmosphereTerrain(record).gap, /^no_text/);
  assert.deepEqual(publicationOrder(record).map((s) => s.id), ["p2", "p1", "p3"], "publication order, undated last");
  const short = atmosphereTerrain(record, { textOf: (id) => `A short page ${id}.\n\nOne more paragraph.` });
  assert.equal(short.regime.declined, true);
  assert.equal(short.meter.placements.length, 3);
  assert.ok(short.meter.placements[0].gap, "the first page has no ground before it: unmeasured, not placed");
  assert.deepEqual(Object.keys(ATMOSPHERE_REGIME).sort(), ["draws", "hop", "tolerance", "window"]);
});

test("standing: mergeTestimony over chains — opposite polarity on another page is DISAGREE; two independent chains AGREE", () => {
  const atoms = [
    { id: "a1", pinax: "p1", chain: "c1", span: "p1/text@0#b0-5" },
    { id: "a2", pinax: "p2", chain: "c2", span: "p2/text@0#b0-5" },
    { id: "a3", pinax: "p3", chain: "c3", span: "p3/text@0#b0-5" },
    { id: "a4", pinax: "p1", chain: "c4", span: "p1/text@0#b9-12" },
    { id: "a5", pinax: "p2", chain: "c5", span: "p2/text@0#b9-12" },
  ];
  const claims = [
    { key: "r1|passed|+|r2", atoms: ["a1"], rivals: ["r1|passed|-|r2"] },
    { key: "r1|passed|-|r2", atoms: ["a2"], rivals: ["r1|passed|+|r2"] },
    { key: "r3|said|+|x", atoms: ["a4", "a5"], rivals: [] },
    { key: "r4|is|+|y", atoms: ["a3"], rivals: [] },
  ];
  const t = testimonyOf({ atoms, claims });
  assert.equal(t.get("r1|passed|+|r2").case, "DISAGREE");
  assert.equal(t.get("r3|said|+|x").case, "AGREE");
  assert.equal(t.get("r4|is|+|y").case, "SINGLE");
});

test("the void's outcome is one of Nagarjuna's four corners, hl.js's own strings, and every corner is reachable", () => {
  const seen = new Set([
    cornerOf({ evidence: 0, contest: null }),
    cornerOf({ evidence: 2, contest: { verdict: "bound" } }),
    cornerOf({ evidence: 2, contest: { verdict: "no_margin" } }),
    cornerOf({ evidence: 2, contest: { verdict: "bound" }, denies: true }),
  ].map((c) => `${c.verdict}:${c.says}`));
  assert.deepEqual([...seen].sort(), [`${BOUND}:is`, `${CONTESTED}:both`, `${CONTRADICTED}:is-not`, `${UNBOUND}:neither`].sort());
  assert.equal(CORNER_SAYS[flip(BOUND)], "is-not", "R3's involution carries through the naming");
  assert.equal(CORNER_SAYS[flip(CONTESTED)], "both");
});
