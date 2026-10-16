import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  admitWhom, coverageOf, binomialUpper, selectGrainTwoNulls, standingsOf, assertAxesApart, foldWithWhom, readingEntry,
  verifyFold, stanceConflicts, STANDINGS, STANDING_NAMES,
} from "./whom-standing.js";
import { foldGrain, splitRegion, selectGrain, CELLS } from "./grain.js";
import { mergeTestimony } from "./capacity-runner.js";

let n = 0;
/** A span. `doc` is the page the address names (px_<doc>), so `chains` can tell independent sources apart. */
const sp = (side, doc, [subj, pred, obj, polarity = "+", activation = 0], prov = true) => {
  const i = n++;
  const address = `px_${doc}/text@h#b${i * 100}-${i * 100 + 40}`;
  return {
    id: `${side}${i}`, address, text: `${subj} ${polarity === "-" ? "did not " : ""}${pred} ${obj}.`, side,
    claim: { subj, pred, obj, polarity }, activation,
    ...(side === "W" && prov ? { provenance: { kind: "turn", ref: `chat#${i}` } } : {}),
  };
};
const U = (doc, ...rows) => rows.map((r) => sp("U", doc, r));
const W = (...rows) => rows.map((r) => sp("W", "w", r));
const FILLER = [["Priya Nair", "visited", "the harbor"], ["Tom Weld", "wrote", "a letter"], ["Iris Vale", "painted", "the fence"], ["Omar Reed", "repaired", "the pump"], ["Lena Cho", "sold", "the orchard"], ["Ben Ash", "carried", "the ladder"], ["Ruth Doyle", "sang", "a ballad"], ["Kofi Mensah", "measured", "the field"]];
const sha = async (bytes) => createHash("sha256").update(bytes).digest("hex");

// ---- N3 -------------------------------------------------------------------------------------------------------------------------

test("N3: a W span with no provenance, wrong side, no address, or a U address never enters H", () => {
  const u = U("a", ["Maria Lopez", "approved", "the freeze", "+", 3]);
  const good = W(["Maria Lopez", "approved", "the freeze"])[0];
  const noProv = { ...W(["Daniel Reyes", "opposed", "the fare"])[0], provenance: undefined };
  const badKind = { ...W(["Anna Cole", "chairs", "the committee"])[0], provenance: { kind: "rumor", ref: "x" } };
  const emptyRef = { ...W(["Ben Ash", "carried", "the ladder"])[0], provenance: { kind: "turn", ref: "  " } };
  const wrongSide = { ...W(["Ruth Doyle", "sang", "a ballad"])[0], side: "U" };
  const noAddr = { ...W(["Omar Reed", "repaired", "the pump"])[0], address: "" };
  const collide = { ...W(["Iris Vale", "painted", "the fence"])[0], address: u[0].address };
  const dupId = { ...good };
  const r = admitWhom([good, noProv, badKind, emptyRef, wrongSide, noAddr, collide, dupId], { universe: u });
  assert.deepEqual(r.admitted.map((w) => w.id), [good.id]);
  assert.deepEqual(r.refused.map((x) => x.why), ["no-provenance", "no-provenance", "no-provenance", "not-w-side", "no-address", "address-collision", "duplicate-id"]);
});

test("N3 (Amendment 6): `seen` and `spoken` spans name universe addresses on purpose and are admitted; other kinds still may not", () => {
  const u = U("a", ["Maria Lopez", "approved", "the freeze", "+", 3]);
  const seen = { ...W(["Maria Lopez", "approved", "the freeze"])[0], address: u[0].address, provenance: { kind: "seen", ref: "ask-1" } };
  const spoken = { ...W(["Maria Lopez", "chairs", "the committee"])[0], address: u[0].address, provenance: { kind: "spoken", ref: "turn-2" }, id: "sp" };
  const turn = { ...W(["Daniel Reyes", "opposed", "the fare"])[0], address: u[0].address, provenance: { kind: "turn", ref: "chat#1" }, id: "tn" };
  const r = admitWhom([seen, spoken, turn], { universe: u });
  assert.deepEqual(r.admitted.map((w) => w.provenance.kind), ["seen", "spoken"]);
  assert.deepEqual(r.refused.map((x) => x.why), ["address-collision"]);
});

test("N3 (Amendment 2): several claims read from one sentence share its address and are all admitted; uniqueness is on id", () => {
  const [a, b] = W(["Maria Lopez", "approved", "the freeze"], ["Maria Lopez", "chairs", "the committee"]);
  const sameSentence = { ...b, address: a.address };
  const r = admitWhom([a, sameSentence]);
  assert.equal(r.admitted.length, 2);
  assert.equal(r.refused.length, 0);
  // and the layer reads the same W as grain.js does
  const region = U("a", ["Maria Lopez", "approved", "the freeze", "+", 3], ["Maria Lopez", "chairs", "the committee", "+", 2], ...FILLER.map((f) => [...f, "+", 1]));
  const g = foldGrain({ region, whom: [a, sameSentence] });
  const m = foldWithWhom({ region, whom: [a, sameSentence] });
  assert.equal(m.whom.admitted, 2);
  assert.equal(m.distance.held, g.distance.held);
});

// ---- the absent cut (N1′, as repaired) ---------------------------------------------------------------------------------------------

test("the literal mirror of N1 collapses: absent-above-chance is the lower tail of held, so it can never hold with held-above-chance", () => {
  // Under the predicate shuffle A_d = |R| - h_d, hence A_obs > A_d  <=>  H_obs < h_d. Check it on the algebra, over a grid.
  for (const R of [8, 12, 20]) for (let H = 0; H <= R; H++) for (let h = 0; h <= R; h++) {
    assert.equal((R - H) > (R - h), H < h);
  }
});

const region12 = (heldCount) => {
  // 12 region spans; the first `heldCount` are in W by arrangement, the rest are not
  const rows = Array.from({ length: 12 }, (_, i) => [`Person ${i}`, `did${i}`, `thing ${i}`, "+", 12 - i]);
  const u = U("a", ...rows);
  const w = W(...rows.slice(0, heldCount).map((r) => [r[0], r[1], r[2]]), ...FILLER);
  return { region: u, whom: w };
};

test("grain.js reads a bare majority as Pattern; the two-nulls selector does not, unless the absent set is within a full-coverage reader's", () => {
  const { region, whom } = region12(7);                          // 7 held of 12, absent 5
  const split = splitRegion(region, whom);
  assert.ok(split.null.real, "the held share beats the shuffle");
  assert.equal(selectGrain(split).grain, "Pattern", "grain.js: H > A is a bare majority");

  const noCov = selectGrainTwoNulls(split, null, {});
  assert.equal(noCov.grain, "Figure");
  assert.equal(noCov.margin.measured, false, "Pattern is not claimed on a bare majority without the instrument measured");

  // a perfect instrument: when shown all 12 it holds all 12. 5 absent is then beyond chance of 'covers it'.
  const perfect = selectGrainTwoNulls(split, null, { coverage: { n: 12, held: 12, recall: 1 } });
  assert.equal(perfect.grain, "Figure");
  assert.ok(perfect.margin.p <= 1 / 200);

  // a leaky instrument (recall 0.5): 5 absent of 12 is exactly what it leaves of a fully-held region: covers it => Pattern
  const leaky = selectGrainTwoNulls(split, null, { coverage: { n: 12, held: 6, recall: 0.5 } });
  assert.equal(leaky.grain, "Pattern");
  assert.equal(leaky.margin.expectedAbsent, 6);
  assert.ok(leaky.margin.p > 1 / 200);
});

test("a silent instrument or an underpowered cut never yields Pattern; each says which it was", () => {
  const { region, whom } = region12(7);
  const split = splitRegion(region, whom);
  const silent = selectGrainTwoNulls(split, null, { coverage: { n: 12, held: 0, recall: 0 } });
  assert.equal(silent.grain, "Figure");
  assert.equal(silent.instrumentSilent, true);
  // n = 12, recall 0.5: min attainable p = 0.5^12 ~ 0.00024 < 0.005, fine. n small and recall low: cannot fail.
  const tiny = { ...split, H: split.H.slice(0, 2), A: split.A.slice(0, 1) };
  const under = selectGrainTwoNulls(tiny, null, { coverage: { n: 3, held: 1, recall: 1 / 3 } });
  assert.equal(under.grain, "Figure");
  assert.equal(under.underpowered, true);
  assert.ok(under.margin.minP > under.margin.alpha);
});

test("Ground is untouched: what is held not beating the null, or all-UNDETERMINED contact, stays Ground", () => {
  const region = U("a", ["Maria Lopez", "approved", "the freeze", "+", 5], ["Daniel Reyes", "opposed", "the fare", "+", 4]);
  const vocab = W(["Maria Lopez", "opposed", "the lease"], ["Daniel Reyes", "approved", "the route"], ...FILLER);
  const s = splitRegion(region, vocab);
  assert.equal(selectGrainTwoNulls(s, null, { coverage: { n: 2, held: 2, recall: 1 } }).grain, "Ground");
});

test("binomialUpper matches the closed form", () => {
  assert.equal(binomialUpper(5, 0.5, 0), 1);
  assert.ok(Math.abs(binomialUpper(5, 0.5, 5) - 1 / 32) < 1e-12);
  assert.ok(Math.abs(binomialUpper(4, 0.5, 2) - 11 / 16) < 1e-12);
  assert.equal(binomialUpper(5, 0, 1), 0);
});

test("coverageOf is the region re-read as W: how much of it the same reader holds back", () => {
  const u = U("a", ["A One", "did", "x"], ["B Two", "did", "y"], ["C Three", "did", "z"], ["D Four", "did", "q"]);
  const wFull = [{ ...u[0], side: "W" }, { ...u[1], side: "W" }];
  assert.deepEqual(coverageOf(u, wFull), { n: 4, held: 2, recall: 0.5 });
  assert.equal(coverageOf([], wFull).recall, null);
});

// ---- the nine standings ----------------------------------------------------------------------------------------------------------

test("all nine standings are reachable, from two independent readings", () => {
  const P = (k) => [`Subject ${k}`, `acted${k}`, `on ${k}`];
  const neg = (r) => [r[0], r[1], r[2], "-"];
  const region = [
    ...U("a", P(1)), ...U("a", P(2)), ...U("a", P(3)),
    ...U("a", neg(P(4))), ...U("a", neg(P(5))), ...U("a", neg(P(6))),
    ...U("a", P(7)), ...U("b", neg(P(7))), ...U("a", P(8)), ...U("b", neg(P(8))), ...U("a", P(9)), ...U("b", neg(P(9))),
  ];
  const whom = W(P(1), neg(P(2)), P(4), neg(P(5)), P(7), neg(P(8)));
  const s = standingsOf({ region, whom });
  const at = (k) => s.items.find((i) => i.proposition.includes(`subject ${k}|`) || i.proposition.startsWith(`subject ${k}|`));
  const want = ["held-corroborated", "held-refuted", "new", "held-contradicted", "held-corroborated-negative", "new-negative", "held-resolved-open", "held-resolved-open-negative", "open"];
  want.forEach((name, i) => assert.equal(at(i + 1).standing, name, `proposition ${i + 1}`));
  assert.deepEqual(Object.keys(s.counts).sort(), [...STANDING_NAMES].sort());
  assert.ok(Object.values(s.counts).every((c) => c === 1), "one of each");
  assert.deepEqual(STANDING_NAMES.length, 9);
});

test("the reader is never a witness to the record: one page + the reader's own claim is SINGLE with one chain, never AGREE", () => {
  const region = U("a", ["Maria Lopez", "approved", "the freeze", "+", 3]);
  const whom = W(["Maria Lopez", "approved", "the freeze"]);
  const s = standingsOf({ region, whom });
  assert.equal(s.items[0].standing, "held-corroborated");
  assert.equal(s.items[0].chains, 1, "the reader does not add a chain");
  // what a merged axis would have said: two countable holds => AGREE (the P30 shape, reader in the echo's place)
  const merged = mergeTestimony([
    { verdict: "holds", read: [region[0].address], who: "U" },
    { verdict: "holds", read: [whom[0].address], who: "W" },
  ]);
  assert.equal(merged.case, "AGREE");
  // two independent pages DO make two chains
  const two = standingsOf({ region: [...region, ...U("b", ["Maria Lopez", "approved", "the freeze", "+", 2])], whom: [] });
  assert.equal(two.items[0].chains, 2);
});

test("axis-merge is a build assertion: a W reading in the record axis (or a U reading in the reader axis) throws", () => {
  const u = U("a", ["Maria Lopez", "approved", "the freeze"])[0];
  const w = W(["Maria Lopez", "approved", "the freeze"])[0];
  const r = (side, span) => ({ verdict: "holds", read: [span.address], side, span });
  assert.doesNotThrow(() => assertAxesApart([r("U", u)], [r("W", w)]));
  assert.throws(() => assertAxesApart([r("U", u), r("W", w)], []), (e) => e.code === "axis-merge");
  assert.throws(() => assertAxesApart([], [r("U", u)]), (e) => e.code === "axis-merge");
});

test("a record silent on a proposition leaves it: the void is not a standing", () => {
  const region = U("a", ["Maria Lopez", "approved", "the freeze"]);
  const whom = W(["Daniel Reyes", "opposed", "the fare"]);
  const s = standingsOf({ region, whom });
  assert.equal(s.items.length, 1);
  assert.equal(s.left.length, 1);
});

test("a reader who contradicts themself reads as `nothing`, flagged", () => {
  const region = U("a", ["Maria Lopez", "approved", "the freeze"]);
  const whom = W(["Maria Lopez", "approved", "the freeze"], ["Maria Lopez", "approved", "the freeze", "-"]);
  const [it] = standingsOf({ region, whom }).items;
  assert.equal(it.reader, "nothing");
  assert.equal(it.readerSplit, true);
  assert.equal(it.standing, STANDINGS.yes.nothing);
});

// ---- the fold: refusals, stance, the reading ---------------------------------------------------------------------------------------

test("whom-empty: every W span stripped by N3 runs the void reader's fold, forced to Ground, and says so", () => {
  const { region } = region12(7);
  const forged = W(["Person 0", "did0", "thing 0"]).map((w) => ({ ...w, provenance: undefined }));
  const f = foldWithWhom({ region, whom: forged });
  assert.equal(f.grain, "Ground");
  assert.equal(f.whom.admitted, 0);
  assert.equal(f.whom.refused[0].why, "no-provenance");
  assert.ok(f.refusals.some((r) => r.code === "whom-empty"));
  assert.equal(f.refused, false, "whom-empty forces Ground; it does not refuse to render");
  assert.equal(f.grain, foldGrain({ region, whom: [] }).grain, "same grain as the void reader through grain.js");
});

test("the forged-thread guard: a salted W without provenance cannot move the grain", () => {
  const { region, whom } = region12(7);
  const salted = whom.map((w) => ({ ...w, provenance: undefined }));
  assert.equal(foldWithWhom({ region, whom: salted }).grain, "Ground");
});

test("foldWithWhom: grain chosen by the two nulls, stance computed from the table, nothing refused, reading carries no text", async () => {
  const { region, whom } = region12(7);
  // the region re-read as W by a reader that holds 8 of 12 of it back
  const wFull = region.slice(0, 8).map((u) => ({ ...u, side: "W" }));
  const f = foldWithWhom({ region, whom, wFull });
  assert.ok(["Figure", "Pattern"].includes(f.grain));
  assert.equal(f.selection.selector, "two-nulls");
  assert.ok(f.selection.margin, "the margin is always reported");
  assert.equal(f.stance, CELLS[f.grain][f.standings.leadingMode]);
  assert.deepEqual(f.refusals.filter((r) => r.renders === false), [], "a fold grain.js built closed and addressed is not refused");
  assert.equal(f.refused, false);
  assert.equal(f.closure.closed, true);

  const e = await readingEntry({ question: "Did Person 0 do it?", region, whom, fold: f, digest: sha });
  assert.equal(e.kind, "whom-reading");
  assert.match(e.q, /^[0-9a-f]{64}$/);
  assert.match(e.whom, /^[0-9a-f]{64}$/);
  const text = JSON.stringify(e);
  for (const w of whom) assert.ok(!text.includes(w.text), "W's text never enters the ledger");
  for (const u of region) assert.ok(!text.includes(u.text), "U's text never enters the ledger");
  assert.ok(Object.isFrozen(e));
  assert.ok(!text.includes("crease"), "no collision with creaseOf / creaseEntry");
});

test("unaddressed-item and stance-conflict are typed and refuse rendering", () => {
  const { region, whom } = region12(7);
  const f = foldWithWhom({ region, whom, wFull: region.slice(0, 8).map((u) => ({ ...u, side: "W" })) });
  const cell = f.modes.find((m) => m.items.length);
  const bad = structuredClone(f);
  const m = bad.modes.find((x) => x.mode === cell.mode);
  m.items[0].spans = [...(m.items[0].spans ?? []), "px_nowhere/text@h#b0-1"];
  assert.ok(verifyFold(bad, { region, whom }).some((p) => p.code === "unaddressed-item"));
  const wrong = structuredClone(f);
  wrong.modes.find((x) => x.mode === cell.mode).items[0].stance = { grain: "Pattern", mode: "Generate", cell: "Cultivating" };
  assert.ok(stanceConflicts(wrong).some((p) => p.code === "stance-conflict"));
  assert.deepEqual(stanceConflicts(f), []);
});

// ---- the topic-level differentiation (Amendment 8) ----------------------------------------------------------------------------------

test("topic: every cleared span is in exactly one class; the void names nothing; no cell moves", () => {
  const rows = [["EOT", "is", "a pivot"], ["the fold", "reads", "claims"], ["Bateson", "wrote", "a rule"], ["the reader", "holds", "spans"]];
  const region = U("a", ...rows.map((r, i) => [...r, "+", 10 - i]));
  const entities = [{ id: "r1", surfaces: ["EOT"] }, { id: "r2", surfaces: ["Bateson"] }];
  const void_ = foldWithWhom({ region, whom: [], referents: { entities, mentioned: new Set() } });
  assert.equal(void_.topic.counts.newAboutHeld, 0);
  assert.equal(void_.topic.counts.newThings, 4);
  const f = foldWithWhom({ region, whom: [], referents: { entities, mentioned: new Set(["r1"]) } });
  assert.deepEqual(f.topic.newAboutHeld, [region[0].address]);
  assert.equal(f.topic.newAboutHeld.length + f.topic.newThings.length, f.topic.counts.cleared);
  assert.equal(new Set([...f.topic.newAboutHeld, ...f.topic.newThings]).size, 4, "disjoint and total");
  assert.deepEqual(f.topic.referentsOf[region[0].address], ["r1"]);
  // an annotation only: the same fold without `referents` is identical in grain and in every cell's item list
  const plain = foldWithWhom({ region, whom: [] });
  assert.equal(plain.grain, f.grain);
  assert.equal(JSON.stringify(plain.modes.map((m) => m.items.map((i) => i.spans))), JSON.stringify(f.modes.map((m) => m.items.map((i) => i.spans))));
  assert.equal(plain.topic, undefined, "absent unless asked for");
});

test("topic: the reading entry carries counts only, never addresses", async () => {
  const region = U("a", ["EOT", "is", "a pivot", "+", 3], ["the fold", "reads", "claims", "+", 2]);
  const entities = [{ id: "r1", surfaces: ["EOT"] }];
  const f = foldWithWhom({ region, whom: [], referents: { entities, mentioned: new Set(["r1"]) } });
  const e = await readingEntry({ question: "q", region, whom: [], fold: f, digest: sha });
  assert.deepEqual({ ...e.topic }, { newAboutHeld: 1, newThings: 1, mentioned: 1 });
  assert.ok(!JSON.stringify(e).includes(region[0].address));
});
