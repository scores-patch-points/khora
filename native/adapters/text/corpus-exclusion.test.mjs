import test from "node:test";
import assert from "node:assert/strict";
import { atomIdentity, factsFromReadings, nominations } from "./atom-world.js";
import { makeSameBeing, BEING } from "./corpus-identity.js";
import { stageFromAtoms, judgeClaim, functionalRegister, defaultHyperlexicon, LICENSES } from "../../kernel/stage.js";
import { createHyperlexicon, admitHyperlexiconCandidates } from "../../kernel/hyperlexicon.js";

// The EXCLUSION wiring of corpus-identity.js: `against` is earned ONLY from a declared one-valued relation (Stage@1's license rows, read from the
// Hyperlexicon with their givers) conflicting on witnessed assertions of the two referents, and it carries the proof that cites it. Everything else stays
// where it was: a thin reading is a typed gap, a measured difference of use is raised and convicts nothing, a missing license degrades to unbound.
const fig = (value, km) => ({ value, measure: "length", base: km * 1000, alts: [] });
const radius = (entity, km, extra = {}) => ({ pred: "has_radius", args: [{ entity, name: "Mercury" }, fig(`${km} km`, km)], neg: false, hedged: false, start: 10, end: 40, text: `has_radius(Mercury, ${km} km)`, ...extra });
const mass = (entity, kg, extra = {}) => ({ pred: "has_mass", args: [{ entity, name: "Mercury" }, { value: `${kg} kg`, measure: "mass", base: kg, alts: [] }], neg: false, hedged: false, start: 50, end: 70, text: `has_mass(Mercury, ${kg} kg)`, ...extra });
const Mercury = { entity: 1, name: "Mercury" };
const world = (a, b, o) => atomIdentity([{ doc: "A", atoms: a }, { doc: "B", atoms: b }], o);
const ask = (W, except) => W.standing("A", Mercury, "B", Mercury, { except });

test("the register is read from the license rows: a measure is one-valued per being, a holder per kind, an unkeyed figure has no key", () => {
  const R = functionalRegister(["has_radius", "most:small", "has_count", "named", "is_a"]);
  assert.deepEqual([...R.licensed.keys()].sort(), ["has_radius", "most:small"]);
  assert.equal(R.licensed.get("has_radius").key, BEING);
  assert.equal(R.licensed.get("most:small").key, "kind");
  assert.match(R.licensed.get("has_radius").giver, /one value of a measure per being/);
  assert.deepEqual(R.unlicensed.map((u) => [u.rel, u.standing]), [["has_count", "unkeyed"]]);
  assert.equal(R.licensed.has("named"), false, "a relation no row speaks for is simply not declared");
  assert.deepEqual(LICENSES.map((l) => l.id), ["measure", "holder"]);
});

test("a license that is only nominated, or absent, licenses nothing: it degrades to unbound, never bound", () => {
  const cand = admitHyperlexiconCandidates(createHyperlexicon(), LICENSES.map((l) => ({ left: "functional", right: l.on, giver: l.giver })));
  for (const hx of [cand, createHyperlexicon()]) {
    const R = functionalRegister(["has_radius", "most:small"], { hyperlexicon: hx });
    assert.equal(R.licensed.size, 0);
    assert.equal(R.unlicensed.length, 2);
    const W = world([radius(1, 6000)], [radius(1, 2440)], { sameBeing: makeSameBeing({ hyperlexicon: hx }) });
    const st = ask(W);
    assert.equal(st.kind, "needs_deeper_reading");
    assert.equal(st.against, false);
  }
  assert.equal(ask(world([radius(1, 6000)], [radius(1, 2440)])).kind, "against", "with the given rows the same pair IS convicted");
});

test("against: two referents of one name give different values of a one-valued measure; the standing cites the relation, its giver and both assertions", () => {
  const st = ask(world([radius(1, 6000)], [radius(1, 2440)]));
  assert.equal(st.kind, "against");
  assert.equal(st.against, true); assert.equal(st.same, false);
  assert.equal(st.reason, "exclusion:has_radius");
  assert.equal(st.proof.length, 1);
  const [c] = st.proof;
  assert.equal(c.rel, "has_radius");
  assert.equal(c.standing, "given");
  assert.match(c.giver, /one value of a measure per being/);
  assert.deepEqual([c.a.doc, c.b.doc], ["A", "B"]);
  assert.deepEqual([c.a.span, c.b.span], [[10, 40], [10, 40]], "each assertion is cited by its span in its own reading");
  assert.deepEqual([c.a.text, c.b.text], ["has_radius(Mercury, 6000 km)", "has_radius(Mercury, 2440 km)"]);
});

test("equal values, other measures, and a thin reading alone never convict", () => {
  assert.notEqual(ask(world([radius(1, 2440)], [radius(1, 2440)])).kind, "against", "the same value agrees");
  assert.notEqual(ask(world([radius(1, 2440)], [mass(1, 3.3e23)])).kind, "against", "two different measures are not the same relation");
  assert.notEqual(ask(world([radius(1, 6000)], [{ pred: "is_a", args: [Mercury, { value: "planet" }], neg: false, hedged: false }])).kind, "against", "one side asserts no value");
  const thin = ask(world([radius(1, 2440)], [{ pred: "orbit", args: [Mercury, { entity: 2, name: "Sun" }], neg: false, hedged: false }]));
  assert.equal(thin.kind, "needs_deeper_reading");
  assert.equal(thin.reason, "not_enough_reading");
});

test("a conviction needs WITNESSED assertions: a hedged one, a negated one and one with no span raise or say nothing", () => {
  const hedged = ask(world([radius(1, 6000, { hedged: true })], [radius(1, 2440)]));
  assert.notEqual(hedged.kind, "against");
  assert.equal(hedged.raised?.[0]?.raisedAs, "unwitnessed_conflict", "the conflict rides on the standing, typed, and convicts nothing");
  assert.notEqual(ask(world([radius(1, 6000, { start: null, end: null })], [radius(1, 2440)])).kind, "against");
  assert.notEqual(ask(world([radius(1, 6000, { neg: true })], [radius(1, 2440)])).kind, "against", "a negated figure asserts no value");
});

test("the text gives a time: the license is time-keyed, so two values with a time among them are incomparable, never a conflict", () => {
  const st = ask(world([radius(1, 6000, { sentence: "In 2019 Mercury had a radius of 6000 km." })], [radius(1, 2440)]));
  assert.notEqual(st.kind, "against");
});

test("a being whose own reading holds two values of the measure has refuted the license for itself: nothing is convicted on it", () => {
  const st = ask(world([radius(1, 6000), radius(1, 7000)], [radius(1, 2440)]));
  assert.notEqual(st.kind, "against");
  assert.equal(factsFromReadings([{ doc: "A", atoms: [radius(1, 6000), radius(1, 7000)] }]).assertionsOf("A:1").length, 0);
});

test("the relations a question rests on are not evidence: `except` removes them from what exclusion reads, the others still count", () => {
  const W = world([radius(1, 6000), mass(1, 1e20)], [radius(1, 2440), mass(1, 3.3e23)]);
  assert.equal(ask(W).kind, "against");
  assert.deepEqual(ask(W).proof.map((c) => c.rel).sort(), ["has_mass", "has_radius"]);
  assert.deepEqual(ask(W, new Set(["has_radius"])).proof.map((c) => c.rel), ["has_mass"]);
  assert.notEqual(ask(W, new Set(["has_radius", "has_mass"])).kind, "against");
});

test("a holder is keyed on a kind, so it is routed but convicts no referent", () => {
  const most = (entity) => ({ pred: "most:small", args: [{ entity, name: "Mercury" }], neg: false, hedged: false, start: 0, end: 9, text: "most:small(Mercury)" });
  const F = factsFromReadings([{ doc: "A", atoms: [most(1)] }]);
  assert.ok(F.rels.includes("most:small"));
  assert.equal(F.assertionsOf("A:1").length, 0);
  assert.notEqual(ask(world([most(1)], [most(1)])).kind, "against");
});

test("a claim's own relation is the question: it never argues the claim speaks of another being (C stays C), and another relation can (C becomes N)", () => {
  const src = [radius(1, 2440), mass(1, 3.3e23), { pred: "is_a", args: [Mercury, { value: "planet" }], neg: false, hedged: false }];
  const stage = stageFromAtoms(src, { doc: "B" });
  const identityFor = (claim) => { const W = atomIdentity([{ doc: "A", atoms: claim }, { doc: "B", atoms: src }]); return { standing: (c, s, o) => W.standing("A", c, "B", s, o) }; };
  const one = [radius(1, 6000)];
  const j = judgeClaim(stage, one, { identity: identityFor(one) });
  assert.equal(j.verdict, "C", "the radius the claim states cannot also be the proof that its Mercury is another Mercury");
  assert.ok(!j.standings.some((s) => s.kind === "against"));
  const two = [radius(1, 6000), mass(1, 1e20)];
  const k = judgeClaim(stage, two, { identity: identityFor(two) });
  assert.equal(k.verdict, "C", "both relations are the claim's own, so neither is evidence of which being it is");
  // a relation the claim does not state, held by the claim's own reading, does speak
  const ctx = [radius(1, 6000), mass(1, 1e20)], W = atomIdentity([{ doc: "A", atoms: ctx }, { doc: "B", atoms: src }]);
  const m = judgeClaim(stage, [radius(1, 6000)], { identity: { standing: (c, s, o) => W.standing("A", c, "B", s, o) } });
  assert.equal(m.verdict, "N", "the reading holding this claim also gives a mass that no Mercury of the source has: not that being, so no contradiction is read");
  assert.ok(m.standings.some((s) => s.kind === "against" && s.proof[0].rel === "has_mass"));
  const gap = m.gaps.find((g) => g.kind === "against");
  assert.deepEqual([gap.end, gap.reason, gap.proof[0].rel], ["Mercury", "exclusion:has_mass", "has_mass"], "the N says why: which relation convicted");
});

test("both the fold and a declared exclusion speak: against stands, and says the fold alone would have joined them", () => {
  // eight people in thick readings; one being is met in two readings, and the two readings give it different radii
  let seed = 11; const r = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const atomsOf = (p, entity, n) => Array.from({ length: n }, () => ({ pred: `${p}v${Math.floor(r() * 6)}`, args: [{ entity, name: `Dr ${p}` }, { value: `${p}co${Math.floor(r() * 5)}` }, { value: "said" }], neg: false }));
  const people = Array.from({ length: 8 }, (_, p) => ({ entity: p, atoms: atomsOf(`p${p}`, p, 60) }));
  const rs = people.slice(1).map((q) => ({ doc: `d${q.entity}`, atoms: q.atoms }));
  const p0 = { entity: 0, name: "Dr p0" }, cited = (km) => ({ pred: "has_radius", args: [p0, fig(`${km} km`, km)], neg: false, hedged: false, start: 1, end: 5, text: `has_radius(Dr p0, ${km} km)` });
  const whole = people[0].atoms;
  const plain = atomIdentity([...rs, { doc: "a", atoms: whole.filter((_, i) => i % 2 === 0) }, { doc: "b", atoms: whole.filter((_, i) => i % 2 === 1) }]).standing("a", p0, "b", p0);
  assert.equal(plain.kind, "same", "without the figures the fold joins them");
  const conflicted = atomIdentity([...rs, { doc: "a", atoms: [...whole.filter((_, i) => i % 2 === 0), cited(100)] }, { doc: "b", atoms: [...whole.filter((_, i) => i % 2 === 1), cited(900)] }]).standing("a", p0, "b", p0);
  assert.equal(conflicted.kind, "against");
  assert.equal(conflicted.contested, true);
  assert.match(conflicted.basis, /no amount of co-presence outvotes a counterexample/);
});

test("a shared name nominates, across readings; a description nominates nothing", () => {
  const e = (id, name, names) => ({ id, name, names });
  const use = (...ids) => ids.map((id) => ({ pred: "x", args: [{ entity: id, name: id }] }));
  const R = [
    { doc: "res", atoms: use("E1", "E2", "E3"), entities: [e("E1", "Motorola Solutions, Inc.", ["motorola", "solutions", "inc"]), e("E2", "the master agreement", []), e("E3", "Rosenberg", ["rosenberg"])] },
    { doc: "agr", atoms: use("E1", "E2", "E4"), entities: [e("E1", "Motorola", ["motorola"]), e("E2", "the master agreement", []), e("E4", "Dave Rosenberg", ["dave", "rosenberg"])] }];
  const N = nominations(R);
  assert.deepEqual(N.map((n) => [n.a.doc + ":" + n.a.entity, n.b.doc + ":" + n.b.entity, n.words.join("+")]), [["agr:E1", "res:E1", "motorola"], ["agr:E4", "res:E3", "rosenberg"]]);
  assert.equal(nominations([{ ...R[0], atoms: use("E1") }, R[1]]).length, 1, "an entity no atom names is not a node and nominates nothing");
  assert.equal(nominations([R[0]], { within: true }).length, 0);
});
