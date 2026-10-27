// native/the-fold/weft-identity.test.mjs — the weft's identity says which rung it reached (weftReferents, `identity: true`).
//
// The weft keys a referent by `ref`, a slug of a spelling, so "the same referent in two passes" is "the same name in two passes": rung 1 of the
// ladder of specificity (the bytes exist in both places), handed forward as a verdict. With `identity: true` a record also carries a WeftIdentity@1:
// the rung it reached, a standing, and the typed gap above it. Each case below is a constructed violation first (the two Mercuries), and the
// default (option off) is held byte-identical to what the weft returned before.
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyWeft, appendPass, weftReferents, WEFT_IDENTITY_SCHEMA } from "./weft.js";

const cast = (...refs) => refs.map((ref) => ({ ref, surface: ref.replace(/^ref:auto:/, ""), mentionsAt: [1] }));
const rel = (a, b) => ({ relation: "near", participants: [{ ref: a, surface: a, standing: "referent" }, { ref: b, surface: b, standing: "referent" }], scope: { byteOffset: 1 } });
const pass = (address, refs, pairs = []) => ({ address, cast: cast(...refs), relations: pairs.map(([a, b]) => rel(a, b)) });
const weftOf = (...passes) => passes.reduce((w, p) => appendPass(w, p), emptyWeft());
const ref = (w, name, opts) => [...weftReferents(w, opts)].find((r) => r.ref === `ref:auto:${name}`);
const R = (n) => `ref:auto:${n}`;

// the planet and the singer both arrive as ref:auto:mercury
const planet = pass("planet.txt", [R("mercury"), R("venus"), R("sun")], [[R("mercury"), R("venus")], [R("mercury"), R("sun")]]);
const singer = pass("singer.txt", [R("mercury"), R("queen"), R("freddie")], [[R("mercury"), R("queen")], [R("mercury"), R("freddie")]]);

test("off by default: the records are exactly what the weft returned before, and carry no identity", () => {
  const w = weftOf(planet, singer);
  const off = [...weftReferents(w)], explicit = [...weftReferents(w, { identity: false })], on = [...weftReferents(w, { identity: true })];
  assert.deepEqual(off, explicit);
  assert.equal(off.some((r) => "identity" in r), false);
  assert.deepEqual(on.map(({ identity, ...rest }) => rest), off, "turning it on adds the identity field and changes nothing else");
});

test("the two Mercuries: one merged record, and the identity says the merge stopped at rung 1 with a raised difference", () => {
  const m = ref(weftOf(planet, singer), "mercury", { identity: true });
  assert.equal(m.passes, 2);
  assert.deepEqual(Object.keys(m.company).sort(), [R("freddie"), R("queen"), R("sun"), R("venus")], "the merged record still hands forward the union of company, as before");
  assert.equal(m.identity.schema, WEFT_IDENTITY_SCHEMA);
  assert.equal(m.identity.rung, 1);
  assert.equal(m.identity.standing, "raised_difference");
  assert.equal(m.identity.against, false, "a difference of company convicts nothing");
  assert.equal(m.identity.groups.length, 2);
  assert.deepEqual(m.identity.groups.map((g) => g.neighbours), [[R("sun"), R("venus")], [R("freddie"), R("queen")]].map((x) => x.sort()));
  assert.deepEqual(m.identity.above, { rung: 2, gap: "company_disjoint" });
  assert.match(m.identity.why, /share no neighbour/);
});

test("the control built to fail: the same two passes with overlapping company reach rung 2 and say same", () => {
  const second = pass("planet2.txt", [R("mercury"), R("sun"), R("earth")], [[R("mercury"), R("sun")], [R("mercury"), R("earth")]]);
  const m = ref(weftOf(planet, second), "mercury", { identity: true });
  assert.equal(m.identity.rung, 2);
  assert.equal(m.identity.standing, "same");
  assert.equal(m.identity.groups.length, 1);
  assert.deepEqual(m.identity.sharedNeighbours.map((s) => s.ref), [R("sun")]);
  assert.deepEqual(m.identity.above, { rung: 3, gap: "the weft runs no definition or evaluation" }, "the weft names what it did not run");
});

test("a deranged company breaks the rung: swapping the second pass's company for unrelated beings turns same into raised_difference", () => {
  const overlap = weftOf(planet, pass("p2.txt", [R("mercury"), R("sun")], [[R("mercury"), R("sun")]]));
  const deranged = weftOf(planet, pass("p2.txt", [R("mercury"), R("tokyo")], [[R("mercury"), R("tokyo")]]));
  assert.equal(ref(overlap, "mercury", { identity: true }).identity.standing, "same");
  assert.equal(ref(deranged, "mercury", { identity: true }).identity.standing, "raised_difference");
});

test("a hub is not mistaken for evidence: the shared neighbour reports how many referents carry it, rarest first", () => {
  const a = pass("a.txt", [R("mercury"), R("venus"), R("sun"), R("hub")], [[R("mercury"), R("hub")], [R("venus"), R("hub")], [R("sun"), R("hub")], [R("mercury"), R("venus")]]);
  const b = pass("b.txt", [R("mercury"), R("hub")], [[R("mercury"), R("hub")]]);
  const s = ref(weftOf(a, b), "mercury", { identity: true }).identity.sharedNeighbours;
  assert.deepEqual(s.map((x) => [x.ref, x.passes]), [[R("hub"), 2]]);
  assert.equal(s[0].carriedBy, 3, "mercury, venus and sun all carry the hub: it separates nothing");
});

test("one pass: nothing was merged and the identity says so (standing null)", () => {
  const m = ref(weftOf(planet), "mercury", { identity: true });
  assert.equal(m.identity.merged, false);
  assert.equal(m.identity.standing, null);
  assert.deepEqual(m.identity.above, { rung: 2, gap: "one_pass" });
});

test("the name in several passes but company in only one: needs deeper reading, never same and never different", () => {
  const bare = pass("bare.txt", [R("mercury")]);
  const m = ref(weftOf(planet, bare), "mercury", { identity: true });
  assert.equal(m.passes, 2);
  assert.equal(m.identity.standing, "needs_deeper_reading");
  assert.equal(m.identity.rung, 1);
  assert.equal(m.identity.passesWithCompany, 1);
  assert.equal(m.identity.passesWithoutCompany, 1);
  assert.deepEqual(m.identity.above, { rung: 2, gap: "no_company_to_compare" });
});

test("a pass without company does not break a link between two passes that have it", () => {
  const bare = pass("bare.txt", [R("mercury")]);
  const second = pass("p2.txt", [R("mercury"), R("sun")], [[R("mercury"), R("sun")]]);
  const m = ref(weftOf(planet, bare, second), "mercury", { identity: true });
  assert.equal(m.identity.standing, "same");
  assert.equal(m.identity.passesWithoutCompany, 1, "the pass with no company stays attached at rung 1 and is counted, not hidden");
});

test("the cursor: the difference exists only once the second pass has been read (history matters)", () => {
  const w = weftOf(planet, singer);
  assert.equal(ref(w, "mercury", { identity: true, asOf: 0 }).identity.merged, false);
  assert.equal(ref(w, "mercury", { identity: true }).identity.standing, "raised_difference");
});

test("deterministic and frozen: the same weft gives the same identity, and the identity cannot be edited", () => {
  const w = weftOf(planet, singer);
  const a = JSON.stringify([...weftReferents(w, { identity: true })]), b = JSON.stringify([...weftReferents(w, { identity: true })]);
  assert.equal(a, b);
  const m = ref(w, "mercury", { identity: true });
  assert.equal(Object.isFrozen(m.identity) && Object.isFrozen(m.identity.groups) && Object.isFrozen(m.identity.above), true);
});

test("a legacy pass with no cast (edges only) still records where the name appeared, so identity can be computed", () => {
  const edgesOnly = (address, a, b) => ({ address, edges: [{ end1: a, end2: b }] });
  const w = weftOf(edgesOnly("x.txt", "Mercury", "Venus"), edgesOnly("y.txt", "Mercury", "Queen"));
  const m = [...weftReferents(w, { identity: true })].find((r) => r.ref === "Mercury");   // with no cast the ends themselves are the refs
  assert.equal(m.passes, 2);
  assert.equal(m.identity.standing, "raised_difference");
});
