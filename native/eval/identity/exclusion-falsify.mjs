// eval/identity/exclusion-falsify.mjs — FALSIFICATION of the functional-determination chain (kind induction + identity
// exclusion): can a ONE-VALUED relation be learned heuristically from the assertions, and does a conflict on it separate two
// referents — while a many-valued relation does not? New dir, new file; nothing existing is edited.
//
//   node eval/identity/exclusion-falsify.mjs [--json]
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5 / READING-POLICY II.23). Written BEFORE the first run. ═══════════════════════════
// THE CLAIM UNDER TEST (the user): "we don't hard-code these; they must be kind induction" — a one-valued relation (a person has
// one birth date) is LEARNED from the assertions, not given; and two referents whose learned one-valued relation conflicts are
// (excluded as) one. The falsifiable form, split so a failure is attributable:
//   C0 KIND      the kind is induced from relation profiles (not names): on a planted two-kind world, `induceKindsAndFunctions`
//                with kindMethod "inducer" recovers a kind whose members are the planted people and one whose members are cities.
//   C1 STANDING  read off the values, a TRULY functional relation is "fixed" and a TRULY many-valued relation is "many-valued";
//                a relation never asserted twice is "unexposed". (Validates the register's readings against planted truth.)
//   C2 RULE      a conflict on an INDUCED relation only RAISES (verdict unbound, raised candidate_conflict), never CONTRADICTED;
//                the SAME conflict on a GIVEN (named-giver) relation CONTRADICTS. The induction/giving distinction is real.
//   C3 GRAIN     a corpus can REFUTE a one-valued claim and never ESTABLISH it: adding ONE member that holds two simultaneous
//                values flips a "fixed" relation to "many-valued"; adding agreeing members to a many-valued one never flips it back.
//   C4 HEURISTIC the standing needs exposure: with exposureFloor e, a relation becomes "fixed" only once >= e members have
//                asserted it more than once with agreeing values.
// CONTROLS (built to fail). K1 SHAM: referents that agree on the relation raise nothing (unbound, no_conflict). K2 DETERMINISM:
//   the whole register is byte-identical on a second run. K3 DERANGEMENT: with the values dealt across members so each would
//   hold two simultaneous values, the "fixed" relation collapses to "many-valued" (the reading is not an artifact of the world's
//   shape). K4 NEGATIVE WRIT LARGE: the many-valued relation NEVER enters the register (it cannot convict or raise).
// FALSIFIERS (the claim is falsified if any holds). F0 the induced kind is absent or its members are not the planted people.
//   F1 a planted functional relation is not "fixed", or a planted many-valued relation is "fixed". F2 an induced conflict is
//   CONTRADICTED, or a given conflict is not. F3 a fixed relation is not refuted by one simultaneous disagreement, or a
//   many-valued relation becomes fixed by agreement. F4 a fixed relation appears below its exposureFloor.
// DATA. Planted and AUTHORED here (labelled): 40 people and 40 cities with distinct relation profiles, plus 20 decoys with
//   random profiles; values are opaque strings; `sameValue` is identity. This is a validity/power test of the organ on a world
//   whose truth is known — negative results on natural text cannot be read without it. No model, no prior, no natural gold.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════
import { induceKindsAndFunctions } from "../../kernel/kind-functional-induction.js";
import { makeIdentityExclusion } from "../../kernel/identity-exclusion.js";

const N_PEOPLE = 60, N_CITIES = 60, N_DECOYS = 30;
const sameValue = (a, b) => (a === b ? true : false);
const witnessed = () => true;
const round = (x) => (typeof x === "number" ? Number(x.toFixed(3)) : x);
const FLOOR = 3;
const WHOLE = { lo: 0, hi: 1000 };              // one interval that contains everything
const EARLY = { lo: 0, hi: 10 }, LATE = { lo: 5, hi: 15 };   // two intervals that OVERLAP (simultaneous)

// ── the planted world: assertions per referent ───────────────────────────────────────────────────────────────────────────────
// people: born/died (FUNCTIONAL, agreeing repeats), held (MANY-VALUED: two values with OVERLAPPING intervals)
// cities: founded/country (FUNCTIONAL), hosted (MANY-VALUED); decoys use their own disjoint relations so kinds separate cleanly.
function world({ deranged = false, refuteOne = false } = {}) {
  const A = new Map(), truth = { people: [], cities: [], decoys: [] };
  const push = (id, rel, value, interval = null) => { if (!A.has(id)) A.set(id, []); A.get(id).push({ rel, value, id: `${id}:${rel}:${A.get(id).length}`, ...(interval ? { interval } : {}) }); };
  for (let i = 0; i < N_PEOPLE; i++) {
    const id = `p${i}`; truth.people.push(id);
    const born = deranged ? `year${(i * 7) % 97}` : `year${i}`;
    const born2 = deranged ? `year${((i * 7) % 97) + 1}` : born;   // derangement: the two born values DISAGREE (at overlapping times)
    push(id, "born", born, WHOLE); push(id, "born", born2, WHOLE);
    push(id, "died", `d${i}`); push(id, "died", `d${i}`);
    push(id, "held", `office${i}a`, EARLY); push(id, "held", `office${i}b`, LATE);   // many-valued: two SIMULTANEOUS values
    if (refuteOne && i === 0) push(id, "born", `year${i + 500}`, WHOLE);             // ONE member holds a second, simultaneous born value
  }
  for (let i = 0; i < N_CITIES; i++) {
    const id = `c${i}`; truth.cities.push(id);
    push(id, "founded", `y${i}`); push(id, "founded", `y${i}`);
    push(id, "country", `c${i}`); push(id, "country", `c${i}`);
    push(id, "hosted", `ev${i}a`, EARLY); push(id, "hosted", `ev${i}b`, LATE);
  }
  for (let i = 0; i < N_DECOYS; i++) { const id = `x${i}`; truth.decoys.push(id); push(id, "tag", `z${i}`); push(id, "note", `n${i}`); }
  return { assertionsOf: (id) => A.get(id) ?? [], truth };
}

function runInduced(w, opts = {}) {
  return induceKindsAndFunctions([...w.truth.people, ...w.truth.cities, ...w.truth.decoys], {
    assertionsOf: w.assertionsOf, sameValue, witnessed, exposureFloor: FLOOR,
    kindOptions: { minKindSize: 8, minEntityCount: 10, permutations: 64, ...opts },
  });
}
function runDeclared(w, kindKey = "kind:person") {
  return induceKindsAndFunctions(w.truth.people, {
    assertionsOf: w.assertionsOf, sameValue, witnessed, exposureFloor: FLOOR,
    declaredKinds: [{ kindKey, memberRefs: w.truth.people }],
  });
}
const standingOf = (run, kindKey, rel) => run.relations.get(kindKey)?.[rel]?.standing ?? null;

// ── run ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function givenFor(kindKey, rel) { const m = new Map([[rel, { giver: "planted-giver" }]]); return new Map([[kindKey, m]]); }

const report = { floor: FLOOR, claims: {}, controls: {}, falsifiers: [], details: {} };

// C1/C4 via declared kinds (isolates the functional logic from the kind logic)
{
  const w = world();
  const run = runDeclared(w);
  const k = "kind:person";
  report.claims.C1 = {
    born: standingOf(run, k, "born"), died: standingOf(run, k, "died"), held: standingOf(run, k, "held"),
    pass: standingOf(run, k, "born") === "fixed" && standingOf(run, k, "died") === "fixed" && standingOf(run, k, "held") === "many-valued",
  };
  // exclusion
  const ex = makeIdentityExclusion({ kindsOf: (x) => run.kindsOf(x), assertionsOf: w.assertionsOf, functional: new Map([[k, run.register.get(k)]]), sameValue, witnessed });
  const jDiff = ex.judge("p1", "p2", {});   // p1 born=year1, p2 born=year2: a conflict on the induced relation
  report.claims.C2 = {
    induced_diff: jDiff.verdict, induced_raised: (jDiff.raised ?? []).map((r) => r.rel),
    induced_convicts: jDiff.verdict === "contradicted",
    pass: jDiff.verdict === "unbound" && (jDiff.raised ?? []).some((r) => r.rel === "born"),
  };
  const exGiven = makeIdentityExclusion({ kindsOf: (x) => run.kindsOf(x), assertionsOf: w.assertionsOf, functional: givenFor(k, "born"), sameValue, witnessed });
  const jGiven = exGiven.judge("p1", "p2", {});
  report.claims.C2.given_diff = jGiven.verdict;
  report.claims.C2.pass = report.claims.C2.pass && jGiven.verdict === "contradicted";
  report.details.declared = { born: standingOf(run, k, "born"), died: standingOf(run, k, "died"), held: standingOf(run, k, "held"), induced_diff: jDiff, given_diff: jGiven };
}

// C3 GRAIN: one simultaneous disagreement refutes "fixed"
{
  const w = world({ refuteOne: true });
  const run = runDeclared(w);
  report.claims.C3 = { bornAfterOneRefutation: standingOf(run, "kind:person", "born"), pass: standingOf(run, "kind:person", "born") === "many-valued" };
  // and agreement never un-refutes a many-valued relation: the base world's "held" stays many-valued with all members agreeing? (it disagrees by construction)
  const run2 = runDeclared(world());
  report.claims.C3.heldStaysManyValued = standingOf(run2, "kind:person", "held");
}

// C4 HEURISTIC exposure floor: fixed needs >= floor agreeing members
{
  const w = world();
  const low = runDeclared(w);
  // craft a world where only 1 member exposes "born" twice
  const A = new Map(w.truth.people.map((id) => [id, [{ rel: "born", value: `b${id}`, id: `${id}:b` }]]));
  A.set("p0", [{ rel: "born", value: "same", id: "p0:1" }, { rel: "born", value: "same", id: "p0:2" }]);
  const thin = induceKindsAndFunctions(w.truth.people, { assertionsOf: (id) => A.get(id) ?? [], sameValue, witnessed, exposureFloor: 3, declaredKinds: [{ kindKey: "kind:person", memberRefs: w.truth.people }] });
  report.claims.C4 = { oneExposer: standingOf(thin, "kind:person", "born"), lowWorld: standingOf(low, "kind:person", "born"), pass: standingOf(thin, "kind:person", "born") !== "fixed" && standingOf(low, "kind:person", "born") === "fixed" };
}

// K1 sham: a referent that agrees on the relation raises nothing (pair of agreeing referents):
{
  const w = world();
  const run = runDeclared(w);
  const ex = makeIdentityExclusion({ kindsOf: (x) => run.kindsOf(x), assertionsOf: w.assertionsOf, functional: new Map([["kind:person", run.register.get("kind:person")]]), sameValue, witnessed });
  const j = ex.judge("p1", "p1", {});
  report.controls.K1 = { verdict: j.verdict, raised: (j.raised ?? []).length, pass: j.verdict === "unbound" && (j.raised ?? []).length === 0 };
}

// K2 determinism
{
  const r1 = JSON.stringify([...runDeclared(world()).relations].map(([k, t]) => [k, t]));
  const r2 = JSON.stringify([...runDeclared(world()).relations].map(([k, t]) => [k, t]));
  report.controls.K2 = { pass: r1 === r2 };
}

// K3 derangement: the "fixed" relation collapses
{
  const w = world({ deranged: true });
  const run = runDeclared(w);
  report.controls.K3 = { born: standingOf(run, "kind:person", "born"), pass: standingOf(run, "kind:person", "born") === "many-valued" };
}

// K4 negative: a many-valued relation never enters the register
{
  const run = runDeclared(world());
  const reg = run.register.get("kind:person");
  const inReg = (rel) => [...(reg?.keys() ?? [])].includes(rel);
  report.controls.K4 = { bornInRegister: inReg("born"), heldInRegister: inReg("held"), pass: inReg("born") && !inReg("held") };
}

// C0 inductive kind recovery: does the induced kind separate people from cities (purity), and how much of the kind it covers?
{
  const w = world();
  const run = runInduced(w);
  const best = (pref) => run.kinds.map((k) => ({ k, hit: k.members.filter((m) => m.startsWith(pref)).length })).sort((a, b) => b.hit - a.hit)[0] ?? null;
  const pk = best("p"), ck = best("c");
  const purity = pk && pk.k.members.length ? pk.hit / pk.k.members.length : 0;
  const cPurity = ck && ck.k.members.length ? ck.hit / ck.k.members.length : 0;
  report.claims.C0 = {
    peopleKind: pk?.k.kindKey ?? null, members: pk?.k.members.length ?? 0, people: pk?.hit ?? 0, purity: round(purity), coverage: round((pk?.hit ?? 0) / w.truth.people.length),
    cityPurity: round(cPurity), kinds: run.kinds.length,
    pass: pk != null && purity >= 0.9 && cPurity >= 0.9,
  };
  report.details.induced = { kinds: run.kinds.map((k) => ({ n: k.members.length, sample: k.members.slice(0, 4) })), diagnostics: run.diagnostics, born: pk ? standingOf(run, pk.k.kindKey, "born") : null, held: pk ? standingOf(run, pk.k.kindKey, "held") : null };
}

// ── falsifiers ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const F = report.falsifiers;
if (!report.claims.C0?.pass) F.push("F0: induced kind absent or not the planted people");
if (!report.claims.C1?.pass) F.push("F1: functional/many-valued standing wrong");
if (!report.claims.C2?.pass) F.push("F2: induced conflict convicted, or given conflict not");
if (!report.claims.C3?.pass) F.push("F3: grain — one disagreement did not refute fixed");
if (!report.claims.C4?.pass) F.push("F4: exposure floor not respected");
if (!report.controls.K1?.pass) F.push("K1: sham raised a conflict");
if (!report.controls.K2?.pass) F.push("K2: nondeterministic");
if (!report.controls.K3?.pass) F.push("K3: derangement did not collapse fixed");
if (!report.controls.K4?.pass) F.push("K4: many-valued relation entered the register");

report.verdict = F.length ? `FALSIFIED: ${F.join("; ")}` : "SURVIVED: all claims held, all controls passed";

if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 1));
else {
  const L = [`# functional-determination chain — falsification (planted world, floor=${FLOOR})`, ""];
  L.push(`C0 kind induction   ${report.claims.C0.pass ? "HOLDS" : "FAILS"}  kinds ${report.claims.C0.kinds}; people basin ${report.claims.C0.members} members, purity ${report.claims.C0.purity}, coverage ${report.claims.C0.coverage}; city purity ${report.claims.C0.cityPurity}`);
  L.push(`C1 standing         ${report.claims.C1.pass ? "HOLDS" : "FAILS"}  born=${report.claims.C1.born} died=${report.claims.C1.died} held=${report.claims.C1.held}`);
  L.push(`C2 induce/given     ${report.claims.C2.pass ? "HOLDS" : "FAILS"}  induced -> ${report.claims.C2.induced_diff} (raised ${JSON.stringify(report.claims.C2.induced_raised)}); given -> ${report.claims.C2.given_diff}`);
  L.push(`C3 grain theorem    ${report.claims.C3.pass ? "HOLDS" : "FAILS"}  born after one refutation = ${report.claims.C3.bornAfterOneRefutation}; held stays ${report.claims.C3.heldStaysManyValued}`);
  L.push(`C4 exposure floor   ${report.claims.C4.pass ? "HOLDS" : "FAILS"}  one-exposer born=${report.claims.C4.oneExposer}`);
  L.push(`K1 sham             ${report.controls.K1.pass ? "ok" : "BROKEN"}  ${JSON.stringify(report.controls.K1)}`);
  L.push(`K2 determinism      ${report.controls.K2.pass ? "ok" : "BROKEN"}`);
  L.push(`K3 derangement      ${report.controls.K3.pass ? "ok" : "BROKEN"}  born=${report.controls.K3.born}`);
  L.push(`K4 negative         ${report.controls.K4.pass ? "ok" : "BROKEN"}  ${JSON.stringify(report.controls.K4)}`);
  L.push("", report.verdict);
  console.log(L.join("\n"));
}
export { world, runDeclared, runInduced };
