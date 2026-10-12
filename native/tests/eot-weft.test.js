// tests/eot-weft.test.js — the single corpus EOT is the WEFT, and cross-source
// identity is resolved at the IDENTITY level (points + the for-whom meet),
// never by a spelling. Every claim here carries the control that would falsify
// it (the same name must NOT merge; a splitting frame must kill a join).

import test from "node:test";
import assert from "node:assert/strict";

import {
  pointOf, eotToPass, appendEot, serializeWeftJsonl, parseWeftJsonl, appendLine,
  holographFor, holographAll, candidateJoins, resolveCrossSource, applyJoins,
  weftAttestations, weftReferents,
} from "../the-fold/eot-weft.mjs";
import { emptyWeft } from "../the-fold/weft.js";
import { createForWhom } from "../kernel/for-whom.js";

const eot = (source, refs, edges) => ({
  schema: "@field/EOT-v1", medium: "text", language: "eng", source,
  counts: { referents: refs.length, clauses: edges.length },
  referents: refs.map(([hash, name]) => ({ hash, name })),
  edges,
});

const A = eot("/corpus/a.txt",
  [["r_a1", "Agni"], ["r_a2", "Vayu"]],
  [
    { at: 0, span: [0, 20], action: "invokes", subject: "r_a1", object: "r_a2" },
    { at: 5, span: [20, 40], action: "shines", subject: null, object: "r_a1" },
  ]);

// ── 1. The pass carries POINTS (births), never a spelling ────────────────
test("eotToPass: refs are source-local POINTS; forms are kept as surfaces", () => {
  const p = eotToPass(A);
  assert.equal(p.address, "/corpus/a.txt");
  assert.equal(p.cast[0].ref, pointOf("/corpus/a.txt", "r_a1"));
  assert.notEqual(p.cast[0].ref, "agni");
  assert.equal(p.cast[0].surface, "Agni");
  assert.equal(p.relations.length, 1, "the null-ended edge is a typed gap, not a relation");
  assert.deepEqual(p.relations[0].participants.map((x) => x.ref), [pointOf("/corpus/a.txt", "r_a1"), pointOf("/corpus/a.txt", "r_a2")]);
});

test("eotToPass refuses an EOT with no source (a pass must carry an address)", () => {
  assert.throws(() => eotToPass({ edges: [], referents: [] }), /address|source/);
});

// ── 2. Append-only roundtrip ─────────────────────────────────────────────
test("appendEot + JSONL roundtrip preserves every pass (P1)", () => {
  let weft = emptyWeft();
  weft = appendEot(weft, A);
  weft = appendEot(weft, eot("/corpus/b.txt", [["r_b1", "Soma"]], [{ at: 0, span: [0, 10], action: "drinks", subject: "r_b1", object: "r_b1" }]));
  const round = parseWeftJsonl(serializeWeftJsonl(weft));
  assert.deepEqual(round, weft);
  assert.equal(round[0].seq, 0);
  assert.equal(round[1].seq, 1);
  assert.equal(parseWeftJsonl(appendLine(serializeWeftJsonl(weft), eotToPass(A, { address: "/corpus/c.txt" }))).length, 3);
});

// ── 3. Per-source projection ─────────────────────────────────────────────
test("holographFor isolates one source; holographAll folds them all", () => {
  let weft = emptyWeft();
  weft = appendEot(weft, A);
  weft = appendEot(weft, eot("/corpus/b.txt", [["r_b1", "Soma"]], [{ at: 0, span: [0, 10], action: "drinks", subject: "r_b1", object: "r_b1" }]));
  assert.equal(holographFor(weft, "/corpus/a.txt").referents.length, 2);
  assert.equal(holographFor(weft, "/corpus/missing.txt").referents.length, 0);
  assert.equal(holographAll(weft).referents.length, 3);
});

// ── 4. THE CONTROL THE OLD CUT FAILED: a name is not an identity ─────────
test("FALSIFIER: the same spelling in two sources does NOT merge by default", () => {
  const one = eot("/x/one.txt", [["h1", "Agni"]], []);
  const two = eot("/x/two.txt", [["h9", "Agni"]], []); // same name, different birth
  let weft = emptyWeft();
  weft = appendEot(weft, one);
  weft = appendEot(weft, two);
  const cloth = holographAll(weft);
  assert.equal(cloth.referents.length, 2, "two births, two beings — never merged by spelling");
  assert.notEqual(cloth.referents[0].ref, cloth.referents[1].ref);
  // ...but the shared form NOMINATES a candidate (nomination, not decision)
  const cands = candidateJoins(weft);
  assert.equal(cands.length, 1);
  assert.equal(cands[0].standing, "candidate");
  assert.equal(cands[0].points.length, 2);
});

// ── 5. The identity level: a join is DECIDED by the for-whom meet ────────
// The same form-bearing record read by an admitted frame that HOLDS the pair
// joins it; the join survives only if no admitted frame SPLITS it.
const aliceWeft = () => {
  const e = eot("/corpus/alice.txt",
    [["hA", "Alice"], ["hB", "A."], ["hC", "letter"]],
    [
      { at: 0, span: [0, 10], action: "wrote", subject: "hA", object: "hB" },
      { at: 1, span: [10, 20], action: "wrote", subject: "hA", object: "hC" },
      { at: 2, span: [20, 30], action: "met", subject: "hA", object: "hB" },
    ]);
  let weft = emptyWeft();
  return appendEot(weft, e);
};
const pA = pointOf("/corpus/alice.txt", "hA");
const pB = pointOf("/corpus/alice.txt", "hB");
const holds = () => ({ forWhom: createForWhom({ id: "q-alice", question: "who is Alice" }), ctx: { supports: [{ left: "Alice", right: "A.", witness: "d#1" }], gateOpts: { minRelevance: 0.5 } } });
const splits = () => ({ forWhom: createForWhom({ id: "q-other", question: "who is Alice" }), ctx: { supports: [{ left: "Alice", right: "A.", witness: "d#1" }], attacks: [{ left: "Alice", right: "A.", witness: "d#9" }], gateOpts: { minRelevance: 0.5 } } });

test("resolveCrossSource: an admitted frame that holds the pair is a SURVIVOR", () => {
  const r = resolveCrossSource(aliceWeft(), { reads: [holds()] });
  const has = r.survivors.some(([a, b]) => (a === pA && b === pB) || (a === pB && b === pA));
  assert.ok(has, `expected the {Alice,A.} points among survivors, got ${JSON.stringify(r.survivors)}`);
});

test("FALSIFIER: a frame that SPLITS the pair does not survive (the meet)", () => {
  const r = resolveCrossSource(aliceWeft(), { reads: [holds(), splits()] });
  const stillSurvives = r.survivors.some(([a, b]) => (a === pA && b === pB) || (a === pB && b === pA));
  const split = r.splits.some(([a, b]) => (a === pA && b === pB) || (a === pB && b === pA));
  assert.equal(stillSurvives, false, "a pair one frame joins and another splits must NOT survive");
  assert.ok(split);
});

test("applyJoins folds ONLY the earned survivors into one holograph", () => {
  const weft = aliceWeft();
  const before = holographAll(weft);
  assert.equal(before.referents.length, 3, "no join ⇒ three births");
  const earned = resolveCrossSource(weft, { reads: [holds()] }).survivors;
  const joined = holographAll(weft, { joins: earned });
  assert.equal(joined.referents.length, 2, "the held pair folds to one being; the third stays");
  const merged = joined.referents.find((h) => [...h.surfaces].includes("Alice") && [...h.surfaces].includes("A."));
  assert.ok(merged, "the merged holon carries both forms");
});

// ── 6. The hyperlexicon seam ─────────────────────────────────────────────
test("weftAttestations are addressed; weftReferents keeps cross-pass company by point", () => {
  let weft = emptyWeft();
  weft = appendEot(weft, A);
  weft = appendEot(weft, eot("/corpus/b.txt", [["r_b1", "Agni"], ["r_b2", "Soma"]], [{ at: 3, span: [30, 50], action: "invokes", subject: "r_b1", object: "r_b2" }]));
  const att = [...weftAttestations(weft)];
  assert.equal(att.length, 2);
  for (const a of att) assert.match(a.witness ?? "", /#\d+$/);
  assert.equal(att[0].witness, holonAddr("/corpus/a.txt", 0));
});
function holonAddr(source, at) { return `${source}#${at}`; }
