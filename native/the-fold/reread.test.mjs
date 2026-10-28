// Re-entry (reread.js): a gap sends the reading back down a tier; the delta is recorded; the loop stops when a pass changes nothing. Constructed first: a grammar whose second parse states what the first missed.
import test from "node:test";
import assert from "node:assert/strict";
import { rereadAtoms, recurse, sideOf, remedyOf } from "./reread.js";
import { rowsOf, rowsOfK, claimsOf } from "../adapters/text/grammar-en.js";
import { readAtoms as _ra } from "../organs/read-atoms.js"; globalThis.__readAtoms = _ra;
const grammar = { rowsOf, rowsOfK, claimsOf };
test("a grammar with no k-best reader reads once and says so", () => {
  const r = rereadAtoms({ text: "Mercury orbits the Sun.", grammar: { rowsOf, claimsOf } });
  assert.equal(r.readings, 1); assert.equal(r.rec.gap, "no_k_best_reader"); assert.deepEqual(r.rec.added, []);
});
test("k-best: the union of the readings, each atom saying which readings state it; the first parse is the reading as it was", () => {
  const r = rereadAtoms({ text: "Turbines near Niagara Falls spun by the Niagara River provide power to Canada.", grammar, k: 3 });
  assert.ok(r.readings >= 1); assert.ok(r.atoms.every((a) => Array.isArray(a.readings) && a.readings.length >= 1));
  assert.ok(r.atoms.some((a) => a.readings.includes(0)), "the first reading's atoms are kept");
  assert.equal(r.rec.tier, "k-best");
});
test("the loop: a gap names a side, the side is re-read, the delta is appended, and it stops when a pass changes nothing", () => {
  let reads = 0;
  const judge = (A, B) => ({ verdict: B.atoms.length >= 2 ? "E" : "N", gaps: B.atoms.length >= 2 ? [] : [{ kind: "ambiguous_binding", atom: "x" }] });
  const reread = (side, R, tier) => { reads++; return side === "source" ? { ...R, atoms: [...R.atoms, { text: "more" }], rec: { tier, added: ["more"], removed: [] } } : R; };
  const r = recurse({ A: { atoms: [{ text: "one" }], unread: [] }, B: { atoms: [{ text: "s" }], unread: [] }, judge, reread, tiers: ["k-best", "page"], maxPasses: 3 });
  assert.equal(r.passes.length, 1); assert.equal(r.passes[0].tier, "page", "a binding gap asks for the referent tier"); assert.equal(r.passes[0].verdictBefore, "N"); assert.equal(r.passes[0].verdictAfter, "E"); assert.deepEqual(r.passes[0].delta.atomsAdded, ["source:more"]);
  assert.equal(r.stopped, "no_gap"); assert.equal(reads, 1, "a binding gap re-reads the source only"); assert.equal(r.passes[0].changed, true);
});
test("no gap, no re-read; a gap that names no side stops the loop with its reason", () => {
  const r0 = recurse({ A: { atoms: [], unread: [] }, B: { atoms: [], unread: [] }, judge: () => ({ verdict: "E", gaps: [] }), reread: () => { throw new Error("must not read"); } });
  assert.equal(r0.passes.length, 0); assert.equal(r0.stopped, "no_gap");
  const r1 = recurse({ A: { atoms: [], unread: [] }, B: { atoms: [], unread: [] }, judge: () => ({ verdict: "N", gaps: [{ kind: "license_not_given" }] }), reread: () => { throw new Error("must not read"); } });
  assert.equal(r1.stopped, "gaps_name_no_side"); assert.deepEqual(sideOf({ kind: "license_not_given" }), []);
  // a gap whose remedy this caller cannot read (no lexicon tier) stops with that reason, never a silent re-read of something else
  const r2 = recurse({ A: { atoms: [], unread: ["zzz"] }, B: { atoms: [], unread: [] }, judge: () => ({ verdict: "N", gaps: [] }), reread: () => { throw new Error("must not read"); }, tiers: ["k-best"] });
  assert.equal(r2.stopped, "remedies_spent_or_unavailable"); assert.deepEqual(remedyOf({ kind: "unread" }), { side: "claim", tier: "lexicon" });
});

test("the first reading is the production parse, kept whole: a re-read never loses an atom the one-way reading had", () => {
  const text = "Mercury is the hottest planet in our solar system.";
  const { readAtoms } = await_(); const one = readAtoms({ text, lang: "en", grammar: { rowsOf, claimsOf } }), re = rereadAtoms({ text, lang: "en", grammar, k: 3 });
  const had = new Set(one.atoms.map((a) => a.text)); assert.ok([...had].every((x) => re.atoms.some((a) => a.text === x)), "every one-way atom is in the re-read");
  assert.ok(re.atoms.filter((a) => had.has(a.text)).every((a) => a.readings.includes(0)), "and each is stated by reading 0, the production parse");
});
function await_() { return { readAtoms: globalThis.__readAtoms }; }
