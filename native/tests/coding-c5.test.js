// coding-c5: the INSTRUMENT eval/coding-competence/c5-agree.mjs (rung C5, cross-language agreement) is regression-guarded
// here; nothing in this file measures khora's reading of real code. It checks, on a TOY fixture built from the frozen
// task spec (AUTHORED, labelled so; never held-out natural data), that the instrument CAN FAIL (READING-POLICY II.23):
//   * a perfect system (every language states the spec, in its own casing) scores exactly 1 and passes;
//   * a deranged system (program t carries the structure of another task) scores low, is not significant, and fails;
//   * a degenerate system (every task looks the same) cannot pass: same == cross, p == 1;
//   * a control that does as well as the real arm VOIDS a pass (the licence), and each control arm provably MOVES;
//   * thin data and an unvalidated fixture are typed gaps (pass:null), never a silent pass or a fail;
//   * TEST is refused without held-out tasks, refuses limit, and is consumed once per language.
// The final block pins the fixture itself: every authored dev program is vouched for by c5-tasks/MANIFEST.json.
// A5 (the fix pass on five review findings, c5-agree.mjs header) adds built-to-fail guards for each finding:
//   F1 survivorship: blanking k kept programs lowers the score and fails the rule (the old rule dropped them and scored the survivors);
//   F2 audit power: every character offset is a cut, and mutant readers built to fail (final:true; identifier plus "(") must be retracted;
//   F3 dev is a smoke test (labelled), and the adversarial arm reports typed gaps for the reader's weak cases;
//   F4 the A filter is causal (a forward reference is dropped and counted) and the boilerplate is frozen from DEV, never derived on TEST;
//   F5 a reader-free names-only baseline and the independent-gold fidelity gate; both can fail the rule without help from the licence.
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REAL_TASK_DIR = path.join(HERE, "..", "eval", "coding-competence", "c5-tasks");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "c5test-"));
process.env.C5_TASK_DIR = path.join(TMP, "tasks");
process.env.C5_OUT_DIR = path.join(TMP, "out");
process.env.C5_LEDGER = path.join(TMP, "ledger.json");
fs.mkdirSync(path.join(TMP, "tasks", "dev"), { recursive: true });
after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });
const C5 = await import("../eval/coding-competence/c5-agree.mjs");
const { CONST, TASKS, TASK_IDS, subwords, finalName, canonicalForm, graphOf, pairScore, analyse, passRule, permutationTest, derangement, mulberry32,
  parseBundle, vouch, sha256, perturbedFocus, algorithmic, deriveBoilerplate, causalAudit, readingEdges, readingDeclRegex, fidelityStats, scoreAdversarial,
  ADVERSARIAL, buildContext, algoSet, SMOKE_NOTE, frozenMissing } = C5;

// ── toy fixture: the frozen spec, spelled in different casing conventions (AUTHORED) ────────────────────────────────
const cap = (w) => w[0].toUpperCase() + w.slice(1);
const STYLES = {
  snake: (ws) => ws.join("_"),
  camel: (ws) => ws[0] + ws.slice(1).map(cap).join(""),
  pascal: (ws) => ws.map(cap).join(""),
  kebab: (ws) => ws.join("-"),
  question: (ws) => `${ws.join("_")}?`, // ruby-like predicate sigil, stripped by the normaliser
};
/** Map task -> algorithmic reading {names, edges} of the spec in a casing style. taskOf(t) lets a caller deal the wrong task to a program. */
function specLanguage(style, taskOf = (t) => t) {
  const out = new Map();
  for (const t of TASK_IDS) {
    const T = TASKS.find((x) => x.id === taskOf(t));
    const sp = (n) => STYLES[style](subwords(n));
    out.set(t, { names: T.entities.map(sp), edges: T.edges.flatMap(([c, e, n]) => Array(n).fill([sp(c), sp(e)])) });
  }
  return out;
}
const partners = (styles) => styles.map((s) => ({ language: `toy_${s}`, algo: specLanguage(s) }));
const PARTNERS = partners(["snake", "pascal", "kebab", "question"]);
const FAST = { perms: 2000, reps: 5 };
const perfect = () => analyse({ focus: specLanguage("camel"), partners: PARTNERS, tasks: TASK_IDS, ...FAST });
// the evidence a fully evidenced headline carries (A5): a valid audit with no retraction, a baseline far below, a gold fidelity far above its controls
const OK_CAUSAL = { retracted: 0, licence_ok: true };
const OK_EXTRAS = { causal: OK_CAUSAL, validated: true, baseline: { score: 0.47 }, fidelity: { n: 12, s: 1, mismatched: 0.12, baseline: 0.5 } };
const NO_GATES = { baseline: false, fidelity: false };
const REAL_FILES = ["MANIFEST.json", "boilerplate-dev.json"];
/** Replace the temp task dir by a copy of the REAL authored fixture (dev bundles, manifest, frozen boilerplate, adversarial arm). */
function installRealFixture({ frozen = true } = {}) {
  const dir = path.join(TMP, "tasks");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.cpSync(REAL_TASK_DIR, dir, { recursive: true, filter: (src) => !/validate(-adversarial)?\.mjs$/.test(src) && (frozen || !/boilerplate-dev\.json$/.test(src)) });
  return dir;
}

// ── normalisation and graph primitives ───────────────────────────────────────────────────────────────────────────
test("sub-words: casing conventions agree, sigils and qualifiers are stripped", () => {
  for (const n of ["is_empty", "isEmpty", "IsEmpty", "is-empty", "is_empty?", "Stack::is_empty", "stack.isEmpty", "IS_EMPTY"]) assert.deepEqual(subwords(n), ["is", "empty"], n);
  assert.deepEqual(subwords("parseHTTPRequest"), ["parse", "http", "request"]);
  assert.deepEqual(subwords("quicksort"), ["quicksort"]);
  assert.equal(finalName("a::b::c"), "c");
  assert.equal(finalName("pkg/mod.Type#method"), "method");
  assert.deepEqual(subwords(""), []);
});

test("canonical form: relabelling is forgotten, topology and multiplicity are not", () => {
  const cf = (edges) => { const cnt = new Map(), nodes = new Set(); for (const [a, b, n] of edges) { cnt.set(`${a}\u0001${b}`, n); nodes.add(a); nodes.add(b); } return canonicalForm(nodes, cnt); };
  assert.equal(cf([["a", "b", 1], ["a", "a", 2]]), cf([["x", "y", 1], ["x", "x", 2]]), "isomorphic graphs share a form");
  assert.notEqual(cf([["a", "b", 1], ["a", "a", 2]]), cf([["a", "b", 2], ["a", "a", 1]]), "multiplicity matters");
  assert.notEqual(cf([["a", "b", 1], ["b", "c", 1]]), cf([["a", "b", 1], ["a", "c", 1]]), "chain differs from fan-out");
  assert.notEqual(cf([["a", "a", 1]]), cf([["a", "b", 1]]), "self-loop differs from edge");
  assert.equal(canonicalForm(new Set(), new Map()), "");
});

test("pair score: identical graphs score exactly 1, an empty reading agrees about nothing", () => {
  const g = graphOf(specLanguage("snake").get("quicksort"));
  const same = pairScore(g, graphOf(specLanguage("pascal").get("quicksort")));
  assert.deepEqual([same.J, same.D, same.I, same.S, same.L, same.s], [1, 1, 1, 1, 1, 1]);
  const empty = graphOf({ names: [], edges: [] });
  assert.equal(pairScore(empty, g).J, 0);
  assert.equal(pairScore(empty, g).s, 0, "no names and no calls against a real program: nothing agrees");
  assert.equal(pairScore(empty, empty).J, 0, "both empty: J is 0, an empty reading earns no name credit");
  assert.deepEqual(Object.values(pairScore(empty, empty)), [0, 0, 0, 0, 0, 0], "A5 F1: two wholly empty readings agree about NOTHING (the old rule gave 0.5)");
  const nameOnly = graphOf({ names: ["quicksort"], edges: [] });
  assert.equal(pairScore(empty, nameOnly).s, 0, "A5 F1: an empty reading earns nothing against a call-less reading either (the old rule gave 0.5)");
  const ns = pairScore(nameOnly, nameOnly);
  assert.deepEqual([ns.J, ns.D, ns.I, ns.S, ns.L, ns.s], [1, 0, 0, 0, 0, 0.5], "A5 F5: no call site on either side states no shape: it is NOT shape agreement (was 1)");
  const other = pairScore(g, graphOf(specLanguage("snake").get("fibonacci")));
  assert.ok(other.s < 0.5, `different tasks must score well below 1 (${other.s})`);
});

test("derangement and permutation test behave as specified", () => {
  for (const n of [2, 3, 12]) { const d = derangement(n, mulberry32(7)); assert.ok(d.every((v, i) => v !== i)); assert.deepEqual([...d].sort((a, b) => a - b), [...Array(n).keys()]); }
  assert.deepEqual(derangement(5, mulberry32(3)), derangement(5, mulberry32(3)), "seeded: reproducible");
  const n = 10;
  const diag = Array.from({ length: n }, (_, u) => Array.from({ length: n }, (_, t) => (u === t ? 1 : 0.2)));
  const p1 = permutationTest(diag, { perms: 3000 });
  assert.ok(p1.p <= 2 / 3001, `a perfectly diagonal matrix is maximally significant (p=${p1.p})`);
  const flat = Array.from({ length: n }, () => new Array(n).fill(0.4));
  assert.equal(permutationTest(flat, { perms: 500 }).p, 1, "no information: p is 1, never small");
});

// ── the perfect system ───────────────────────────────────────────────────────────────────────────────────────────
test("PERFECT system: every language states the spec in its own casing -> score 1, controls low, pass", () => {
  const a = perfect();
  assert.equal(a.nTasks, 12);
  assert.equal(a.nPartners, 4);
  for (const c of ["s", "J", "D", "I", "S", "L"]) assert.equal(a.same[c], 1, `same ${c}`);
  assert.ok(a.cross.s < 0.55, `different-task pairs score low (${a.cross.s})`);
  assert.ok(a.perm.p <= 2 / (FAST.perms + 1), `permutation p ${a.perm.p}`);
  assert.equal(a.top1, 1, "every same-task program is retrieved first");
  assert.ok(a.chance < 0.12 && a.chance > 0.05, `chance level ${a.chance}`);
  // every control arm provably moves the statistic (licence check, II.23)
  assert.ok(a.arms.shuffledIdentifiers.J <= CONST.LIC_NAMES_RATIO * a.same.J, `shuffled identifiers J ${a.arms.shuffledIdentifiers.J}`);
  assert.ok(a.same.S - a.arms.shuffledGraphs.S >= CONST.LIC_SHAPE_DROP, `shuffled graphs S ${a.arms.shuffledGraphs.S}`);
  assert.ok(a.arms.noReading.s <= CONST.LIC_EMPTY_SCORE, `empty reading earns ${a.arms.noReading.s}`);
  assert.ok(a.arms.shuffledIdentifiers.s < a.same.s && a.arms.shuffledGraphs.s < a.same.s);
  const rule = passRule(a, OK_EXTRAS);
  assert.equal(rule.pass, true, rule.reasons.join("; "));
  assert.equal(rule.licence.ok, true);
  assert.deepEqual(a.nonEmpty.focus, { non_empty: 12, of: 12 });
});

test("declared blind spot: shuffling names WITHIN a program leaves s unchanged and drops the labelled channel L", () => {
  const a = perfect();
  assert.ok(Math.abs(a.arms.shuffledLabels.s - a.same.s) < 1e-9, `s moved to ${a.arms.shuffledLabels.s}`);
  assert.ok(a.arms.shuffledLabels.L < a.same.L - 0.05, `L must drop (${a.arms.shuffledLabels.L})`);
});

// ── the deranged system ──────────────────────────────────────────────────────────────────────────────────────────
test("DERANGED system: each program carries another task's structure -> low score, not significant, fails", () => {
  const pi = derangement(TASK_IDS.length, mulberry32(11));
  const deal = (t) => TASK_IDS[pi[TASK_IDS.indexOf(t)]];
  const a = analyse({ focus: specLanguage("camel", deal), partners: PARTNERS, tasks: TASK_IDS, ...FAST });
  assert.ok(a.same.s < 0.6, `deranged same-task score ${a.same.s}`);
  assert.ok(Math.abs(a.same.s - a.cross.s) < 0.12, `a deranged system gets no same-task advantage (${a.same.s} vs ${a.cross.s})`);
  assert.ok(a.perm.p > CONST.ALPHA, `p ${a.perm.p} must not be significant`);
  const rule = passRule(a, OK_EXTRAS);
  assert.equal(rule.pass, false);
  assert.ok(rule.reasons.some((r) => /permutation|score - taskPair/.test(r)), rule.reasons.join("; "));
});

test("DEGENERATE system: every task looks the same -> same == cross, p == 1, cannot pass", () => {
  const flat = new Map(TASK_IDS.map((t) => [t, { names: ["foo"], edges: [["foo", "foo"], ["foo", "foo"]] }]));
  const a = analyse({ focus: flat, partners: partners(["snake", "pascal", "kebab", "question"]).map((p) => ({ language: p.language, algo: flat })), tasks: TASK_IDS, ...FAST });
  assert.equal(a.same.s, 1);
  assert.equal(a.same.s, a.cross.s, "same-task and different-task agreement are equal: no information");
  assert.equal(a.perm.p, 1);
  assert.equal(passRule(a, OK_EXTRAS).pass, false);
});

test("EMPTY readings (a reader that sees nothing) score 0, count against the reader, and FAIL: they are not a gap and not a pass (A5 F1)", () => {
  const empty = new Map(TASK_IDS.map((t) => [t, { names: [], edges: [] }]));
  const a = analyse({ focus: empty, partners: PARTNERS, tasks: TASK_IDS, ...FAST });
  assert.ok(!a.empty, "a blind reader on kept programs is a reader failure, not 'no analysable readings'");
  assert.equal(a.nTasks, 12, "the denominator is every kept program");
  assert.deepEqual(a.nonEmpty.focus, { non_empty: 0, of: 12 });
  assert.equal(a.same.s, 0, "an empty reading earns nothing");
  const r = passRule(a, OK_EXTRAS);
  assert.equal(r.pass, false);
  assert.ok(r.reasons.some((x) => /non-empty coverage 0\/12/.test(x)), r.reasons.join("; "));
  // no kept program at all, or no partner: a FIXTURE gap, still typed null
  assert.equal(passRule(analyse({ focus: new Map(), partners: PARTNERS, tasks: TASK_IDS, ...FAST }), OK_EXTRAS).pass, null);
  assert.equal(passRule(analyse({ focus: specLanguage("camel"), partners: [], tasks: TASK_IDS, ...FAST }), OK_EXTRAS).pass, null);
});

// ── the pass rule: licence, typed gaps, causality ──────────────────────────────────────────────────────────────
test("a control that does as well as the real arm VOIDS the pass (licence), whatever the p-value says", () => {
  const base = perfect();
  const names = { ...base, arms: { ...base.arms, shuffledIdentifiers: { ...base.arms.shuffledIdentifiers, J: base.same.J } } };
  const r1 = passRule(names, OK_EXTRAS);
  assert.equal(r1.pass, false);
  assert.equal(r1.licence.names_move, false);
  const shape = { ...base, arms: { ...base.arms, shuffledGraphs: { ...base.arms.shuffledGraphs, S: base.same.S } } };
  assert.equal(passRule(shape, OK_EXTRAS).licence.shape_moves, false);
  const empty = { ...base, arms: { ...base.arms, noReading: { ...base.arms.noReading, s: 0.6 } } };
  const r3 = passRule(empty, OK_EXTRAS);
  assert.equal(r3.licence.empty_earns_nothing, false);
  assert.equal(r3.pass, false);
});

test("a causal retraction fails a causal arm; a non-causal arm is not gated by it; an audit without power is not a pass (A5 F2)", () => {
  const a = perfect();
  assert.equal(passRule(a, { ...OK_EXTRAS, causal: { retracted: 3, licence_ok: true } }).pass, false);
  assert.equal(passRule(a, { causal: null, validated: true, gate: NO_GATES }).pass, true, "a non-causal arm carries neither the audit nor (g) and (h)");
  const blind = passRule(a, { ...OK_EXTRAS, causal: { retracted: 0, licence_ok: false } });
  assert.equal(blind.pass, false, "zero retractions from an audit that no mutant can trigger proves nothing");
  assert.ok(blind.reasons.some((r) => /audit_without_power/.test(r)), blind.reasons.join("; "));
});

test("THREE-VALUED rule: an unevaluated baseline or gold fidelity can never give true (A5 F5)", () => {
  const a = perfect();
  const noBase = passRule(a, { ...OK_EXTRAS, baseline: undefined });
  assert.equal(noBase.pass, null);
  assert.deepEqual(noBase.unevaluated, ["baseline"]);
  const noGold = passRule(a, { ...OK_EXTRAS, fidelity: undefined });
  assert.equal(noGold.pass, null);
  assert.deepEqual(noGold.unevaluated, ["fidelity"]);
  assert.equal(passRule(a, { ...OK_EXTRAS, baseline: undefined, fidelity: undefined }).pass, null);
  // but a failed evaluated condition still makes it false, whatever is unevaluated
  assert.equal(passRule(a, { ...OK_EXTRAS, causal: { retracted: 1, licence_ok: true }, fidelity: undefined }).pass, false);
});

test("thin coverage and an unvalidated fixture are TYPED GAPS (pass:null), never a pass and never a fail", () => {
  const few = TASK_IDS.slice(0, CONST.MIN_TASKS - 1);
  const thin = analyse({ focus: specLanguage("camel"), partners: PARTNERS, tasks: few, ...FAST });
  const r = passRule(thin, OK_EXTRAS);
  assert.equal(r.pass, null);
  assert.ok(r.reasons.some((x) => /coverage/.test(x)));
  const two = analyse({ focus: specLanguage("camel"), partners: PARTNERS.slice(0, CONST.MIN_PARTNERS - 1), tasks: TASK_IDS, ...FAST });
  assert.equal(passRule(two, OK_EXTRAS).pass, null);
  assert.equal(passRule(perfect(), { ...OK_EXTRAS, validated: false }).pass, null, "an unvalidated fixture gives no verdict");
});

// ── perturbation arms, boilerplate, bundles, manifest ─────────────────────────────────────────────────────────────
test("perturbation arms: identifiers destroy names only, graphs destroy shape only, noReading destroys both", () => {
  const algo = specLanguage("snake");
  const rng = () => mulberry32(5);
  const real = new Map(TASK_IDS.map((t) => [t, graphOf(algo.get(t))]));
  const ids = perturbedFocus("shuffledIdentifiers", algo, TASK_IDS, rng());
  const gr = perturbedFocus("shuffledGraphs", algo, TASK_IDS, rng());
  for (const t of TASK_IDS) {
    assert.equal(ids.get(t).canon, real.get(t).canon, `${t}: identifiers keep the call topology`);
    assert.equal(ids.get(t).R + ids.get(t).N, real.get(t).R + real.get(t).N);
    assert.deepEqual([...gr.get(t).words].sort(), [...real.get(t).words].sort(), `${t}: graphs keep the names`);
  }
  assert.ok(TASK_IDS.some((t) => ids.get(t).words.size && [...ids.get(t).words].some((w) => !real.get(t).words.has(w))), "some identifier really changed");
  assert.ok(TASK_IDS.some((t) => gr.get(t).canon !== real.get(t).canon), "some topology really changed");
  const none = perturbedFocus("noReading", algo, TASK_IDS, rng());
  assert.ok([...none.values()].every((g) => g.words.size === 0 && g.nEdges === 0));
});

test("boilerplate is DERIVED (names declared in >= 75% of >= 8 readings), not listed", () => {
  const mk = (extra) => ({ names: ["main", ...extra] });
  const readings = new Map(TASK_IDS.map((t, i) => [t, mk([`f${i}`])]));
  assert.deepEqual([...deriveBoilerplate(readings)], ["main"]);
  const few = new Map(TASK_IDS.slice(0, 5).map((t) => [t, mk([])]));
  assert.equal(deriveBoilerplate(few).size, 0, "fewer than 8 readings: nothing is declared boilerplate");
  const r = { names: ["main", "quicksort"], calls: [{ caller: "main", callee: "quicksort" }, { caller: "quicksort", callee: "quicksort" }, { caller: "quicksort", callee: "printf" }, { caller: "<top>", callee: "quicksort" }] };
  const alg = algorithmic(r, new Set(["main"]));
  assert.deepEqual(alg.names, ["quicksort"]);
  assert.deepEqual(alg.edges.map(([c, e]) => [c, e]), [["quicksort", "quicksort"]], "driver calls, library calls and top-level calls are not algorithmic edges");
});

test("bundle parsing and manifest vouching refuse what changed", () => {
  const b = parseBundle("@@@@ task gcd\ndef gcd(a, b):\n    return a\n\n\n@@@@ task fibonacci\nx = 1   \n");
  assert.deepEqual([...b.keys()], ["gcd", "fibonacci"]);
  assert.equal(b.get("gcd"), "def gcd(a, b):\n    return a\n");
  const text = b.get("gcd");
  const manifest = { programs: { python: { gcd: { sha256: sha256(text), executed: true, output_ok: true, parse: { ok: true } } } } };
  assert.deepEqual(vouch(manifest, "python", "gcd", text), { kept: true, executed: true, why: null });
  assert.equal(vouch(null, "python", "gcd", text).why, "fixture_manifest_absent");
  assert.equal(vouch(manifest, "python", "gcd", text + "#").why, "program_changed_since_validation");
  assert.equal(vouch(manifest, "python", "fibonacci", text).why, "program_unvalidated");
  const bad = (patch) => ({ programs: { python: { gcd: { sha256: sha256(text), executed: true, output_ok: true, parse: { ok: true }, ...patch } } } });
  assert.equal(vouch(bad({ output_ok: false }), "python", "gcd", text).why, "output_mismatch");
  assert.equal(vouch(bad({ parse: { ok: false } }), "python", "gcd", text).why, "parse_error");
  assert.deepEqual(vouch(bad({ executed: false, output_ok: null }), "python", "gcd", text), { kept: true, executed: false, why: null }, "parse-only languages are kept and flagged executed:false");
});

// ── measure(): the module contract and the typed gaps ───────────────────────────────────────────────────────────
test("measure(): contract shape; TEST refused without held-out tasks and refuses --limit; not-applicable and unlisted languages are typed", async () => {
  const keys = ["id", "rung", "split", "n", "applicable", "score", "control", "margin", "pass", "controls", "gaps", "notes", "details"];
  const t = await C5.measure({ language: "python", split: "test" });
  for (const k of keys) assert.ok(k in t, `result has ${k}`);
  assert.equal(t.pass, null);
  assert.equal(t.gaps[0].reason, "no_held_out_tasks", "a DEV result is never relabelled as TEST");
  const lim = await C5.measure({ language: "python", split: "test", limit: 3 });
  assert.equal(lim.gaps[0].reason, "limit_refused_on_test");
  const html = await C5.measure({ language: "html" });
  assert.equal(html.applicable, false);
  assert.ok(html.reason && html.pass === null, "html: not applicable with a typed reason, never a silent pass");
  const klingon = await C5.measure({ language: "klingon" });
  assert.equal(klingon.pass, null);
  assert.equal(klingon.gaps[0].reason, "language_not_in_c5_list");
  const cobol = await C5.measure({ language: "cobol" });
  assert.equal(cobol.gaps[0].reason, "no_program_authored", "unmeasured is a gap, not good");
  assert.equal(C5.RUNG.id, "C5");
});

test("measure(): no MANIFEST means no verdict (an unvalidated fixture is not evidence); TEST needs the FROZEN boilerplate (A5 F4) and is consumed once", async () => {
  const real = fs.readFileSync(path.join(REAL_TASK_DIR, "dev", "python.c5"), "utf8");
  for (const split of ["dev", "test"]) { fs.mkdirSync(path.join(TMP, "tasks", split), { recursive: true }); fs.writeFileSync(path.join(TMP, "tasks", split, "python.c5"), real); }
  const dev = await C5.measure({ language: "python", authority: false });
  assert.equal(dev.pass, null);
  assert.ok(dev.notes.some((n) => /MANIFEST.json absent/.test(n)));
  assert.ok(dev.gaps.some((g) => g.reason === "unmeasured" || g.reason === "program_unvalidated" || g.reason === "fixture_manifest_absent"), JSON.stringify(dev.gaps));
  // F4: with no frozen boilerplate a TEST read would derive it from the programs under evaluation: refused, and the one-shot read is NOT spent
  const none = await C5.measure({ language: "python", split: "test", authority: false });
  assert.equal(none.gaps[0].reason, "no_frozen_boilerplate");
  assert.ok(none.notes.some((n) => /NOT consumed/.test(n)));
  assert.ok(!fs.existsSync(process.env.C5_LEDGER), "the ledger is untouched by a refused read");
  fs.copyFileSync(path.join(REAL_TASK_DIR, "boilerplate-dev.json"), path.join(TMP, "tasks", "boilerplate-dev.json"));
  const first = await C5.measure({ language: "python", split: "test", authority: false });
  assert.notEqual(first.gaps?.[0]?.reason, "no_held_out_tasks");
  assert.notEqual(first.gaps?.[0]?.reason, "no_frozen_boilerplate");
  const second = await C5.measure({ language: "python", split: "test", authority: false });
  assert.equal(second.gaps[0].reason, "test_already_read", "TEST is spent after one read per language (rule 9)");
  assert.ok(fs.existsSync(process.env.C5_LEDGER));
});

// ── end to end: the REAL readers on the REAL dev programs, with one language's task labels deranged ──────────────────────
// A control built to fail through the whole pipeline (not only the toy statistics): the focus language X keeps its own
// programs but each is filed under another task's label (a fixed derangement); its partners are untouched. A reader that
// really recovers the algorithm's structure must then score X like a different-task pair, and the rule must fail.
test("END-TO-END DERANGED: real edges reader, real dev programs, one language's labels deranged -> not significant, fails", { skip: !fs.existsSync(path.join(REAL_TASK_DIR, "MANIFEST.json")) }, async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(REAL_TASK_DIR, "MANIFEST.json"), "utf8"));
  const DEV6 = ["python", "javascript", "c", "go", "ruby", "java"];
  const pi = derangement(TASK_IDS.length, mulberry32(20261006));
  for (const focus of DEV6) {
    const dir = path.join(TMP, "tasks", "dev");
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const programs = {};
    for (const lang of DEV6) {
      const text = fs.readFileSync(path.join(REAL_TASK_DIR, "dev", `${lang}.c5`), "utf8");
      const b = parseBundle(text);
      programs[lang] = {};
      let out = "";
      TASK_IDS.forEach((t, i) => {
        const src = lang === focus ? TASK_IDS[pi[i]] : t; // deranged: label t holds the program of task pi(t)
        out += `@@@@ task ${t}\n${b.get(src)}`;
        programs[lang][t] = manifest.programs[lang][src];
      });
      fs.writeFileSync(path.join(dir, `${lang}.c5`), out);
    }
    fs.writeFileSync(path.join(TMP, "tasks", "MANIFEST.json"), JSON.stringify({ ...manifest, programs }));
    const r = await C5.measure({ language: focus, authority: false });
    assert.equal(r.applicable, true);
    assert.equal(r.details.fixture.kept, 12, `${focus}: every deranged program is still vouched for`);
    assert.equal(r.pass, false, `${focus}: a deranged language must FAIL (score ${r.score}, p ${r.details.permutation?.p})`);
    assert.ok(r.score < 0.5, `${focus}: deranged same-task score ${r.score} must collapse to the different-task level`);
    assert.ok(r.details.permutation.p > CONST.ALPHA, `${focus}: p ${r.details.permutation.p} must not be significant`);
    assert.ok(r.margin < CONST.MIN_MARGIN, `${focus}: margin ${r.margin}`);
  }
});

// ── the authored fixture itself ────────────────────────────────────────────────────────────────────────────────────
test("fixture: every authored dev program is vouched for by c5-tasks/MANIFEST.json (sha256, parse, output)", { skip: !fs.existsSync(path.join(REAL_TASK_DIR, "MANIFEST.json")) }, () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(REAL_TASK_DIR, "MANIFEST.json"), "utf8"));
  assert.equal(manifest.schema, "C5Manifest@1");
  assert.match(manifest.label, /authored/);
  const files = fs.readdirSync(path.join(REAL_TASK_DIR, "dev")).filter((f) => f.endsWith(".c5")).sort();
  assert.ok(files.length >= 6, "at least the six dev languages are authored");
  const NO_TOOLCHAIN = new Set(Object.keys(manifest.toolchains.no_toolchain));
  for (const f of files) {
    const language = f.slice(0, -3);
    const b = parseBundle(fs.readFileSync(path.join(REAL_TASK_DIR, "dev", f), "utf8"));
    assert.deepEqual([...b.keys()].sort(), [...TASK_IDS].sort(), `${language}: exactly the 12 tasks`);
    for (const t of TASK_IDS) {
      const v = vouch(manifest, language, t, b.get(t));
      assert.equal(v.kept, true, `${language}/${t}: ${v.why}`);
      assert.equal(v.executed, !NO_TOOLCHAIN.has(language), `${language}/${t}: executed flag must follow the toolchain`);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// A5: built-to-fail guards for the five review findings (c5-agree.mjs header, A5)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const goldOk = (await import("../eval/coding-competence/gold.mjs")).goldAvailable().available;
const DEV6 = ["python", "javascript", "c", "go", "ruby", "java"];

// ── F1 survivorship ──────────────────────────────────────────────────────────────────────────────────────────────────
test("F1 SURVIVORSHIP (built to fail): blanking k kept programs lowers the score by k/12 and fails the rule for k >= 2", () => {
  assert.equal(analyse({ focus: specLanguage("camel"), partners: PARTNERS, tasks: TASK_IDS, ...FAST }).same.s, 1);
  for (const k of [1, 2, 4, 6]) {
    const focus = specLanguage("camel");
    for (const t of TASK_IDS.slice(0, k)) focus.set(t, { names: [], edges: [] });
    const a = analyse({ focus, partners: PARTNERS, tasks: TASK_IDS, ...FAST });
    assert.equal(a.nTasks, 12, `k=${k}: every kept program is in the denominator, not only the programs the reader read`);
    assert.deepEqual(a.nonEmpty.focus, { non_empty: 12 - k, of: 12 });
    assert.ok(Math.abs(a.same.s - (12 - k) / 12) < 1e-9, `k=${k}: score ${a.same.s} must fall to ${(12 - k) / 12}`);
    if (k >= 2) {
      const rule = passRule(a, OK_EXTRAS);
      assert.equal(rule.pass, false, `k=${k}`);
      assert.ok(rule.reasons.some((r) => /non-empty coverage/.test(r)), rule.reasons.join("; "));
    }
  }
});

test("F1 a PARTNER's empty readings count against the score too (they are not dropped)", () => {
  const blind = specLanguage("pascal");
  for (const t of TASK_IDS.slice(0, 4)) blind.set(t, { names: [], edges: [] });
  const a = analyse({ focus: specLanguage("camel"), partners: [{ language: "toy_blind", algo: blind }, ...PARTNERS.slice(0, 3)], tasks: TASK_IDS, ...FAST });
  assert.equal(a.nPartners, 4);
  assert.deepEqual(a.nonEmpty.partners.find((p) => p.language === "toy_blind"), { language: "toy_blind", non_empty: 8, of: 12 });
  assert.ok(Math.abs(a.same.s - (8 * 1 + 4 * 0.75) / 12) < 1e-9, `partner blindness lowers the mean to ${(8 + 3) / 12}, got ${a.same.s}`);
});

test("F1 on REAL readings: the review's mutation (python blind on 4 of 12 programs) no longer raises the score or passes", async () => {
  installRealFixture();
  const ctx = await buildContext({ split: "dev", authority: false });
  const A = Object.fromEntries(DEV6.map((l) => [l, algoSet(ctx, "edges", l).algo]));
  const partnersOf = (l) => DEV6.filter((x) => x !== l).map((x) => ({ language: x, algo: A[x] }));
  const real = analyse({ focus: A.python, partners: partnersOf("python"), tasks: ctx.tasks, ...FAST });
  const f = new Map(A.python);
  for (const t of ["linked_list", "stack", "tree_traversal", "palindrome"]) f.set(t, { names: [], edges: [] });
  const a = analyse({ focus: f, partners: partnersOf("python"), tasks: ctx.tasks, ...FAST });
  assert.equal(a.nTasks, 12, "the old instrument reported nTasks 8 here");
  assert.ok(a.same.s < real.same.s - 0.25, `blind on 4 of 12: ${a.same.s} must fall well below ${real.same.s} (the old instrument scored 1.000)`);
  assert.equal(passRule(a, OK_EXTRAS).pass, false);
  assert.equal(passRule(real, OK_EXTRAS).pass, true, "the unmutated reading still passes (smoke)");
});

// ── F2 causality audit: power and licence ──────────────────────────────────────────────────────────────────────────────
test("F2 the audit cuts at EVERY offset, audits the algorithmic reading too, and its mutants ARE retracted (python c go)", async () => {
  installRealFixture();
  const ctx = await buildContext({ split: "dev", authority: false });
  for (const lang of ["python", "c", "go"]) {
    const total = [...ctx.programs.get(lang).values()].filter((p) => p.kept).reduce((n, p) => n + p.text.length - 1, 0);
    const au = causalAudit(ctx, lang, { boiler: algoSet(ctx, "edges", lang).boilerSet });
    assert.equal(au.cuts, total, `${lang}: one cut per character offset`);
    assert.equal(au.retracted, 0, `${lang}: ${JSON.stringify(au.examples)}`);
    assert.equal(au.algorithmic, 0);
    assert.equal(au.licence_ok, true, `${lang}: the audit must be able to fail: ${JSON.stringify(au.licence.mutants)}`);
    assert.ok(au.licence.mutants.ident_open_paren > 0, `${lang}: M2 (identifier plus open paren) is retracted`);
    if (lang === "c" || lang === "go") assert.equal(au.licence.mutants.final_true, 0, `${lang}: M1 alone has no power here, which is why M2 exists (header A5 F2)`);
  }
  const py = causalAudit(ctx, "python", { boiler: new Set() });
  assert.ok(py.licence.mutants.final_true > 0, "python: final:true is retracted at a mid-identifier cut (the review's first hit)");
});

test("F2 BUILT TO FAIL: a non-causal 'early guess' reader is retracted; a reader no mutant can move makes the audit INVALID, and the rule fails it", async () => {
  installRealFixture();
  const ctx = await buildContext({ split: "dev", authority: false });
  const eager = (text, lang, fn, opts = {}) => readingEdges(opts.final === false && /[A-Za-z0-9_$]$/.test(text) ? `${text}(` : text, lang, fn, { final: true });
  for (const lang of ["python", "c", "go"]) {
    const bad = causalAudit(ctx, lang, { reader: eager, mutants: false });
    assert.ok(bad.retracted > 0, `${lang}: the audit must retract a reader that guesses before the token is complete (${bad.retracted})`);
  }
  const inert = () => ({ names: [], decls: [], calls: [] });
  const au = causalAudit(ctx, "python", { reader: inert });
  assert.equal(au.retracted, 0);
  assert.equal(au.licence_ok, false, "no mutant of an inert reader can be retracted: the audit has no power");
  const rule = passRule(perfect(), { ...OK_EXTRAS, causal: au });
  assert.equal(rule.pass, false);
  assert.ok(rule.reasons.some((r) => /audit_without_power/.test(r)), rule.reasons.join("; "));
});

test("F2 the audit also covers the ALGORITHMIC reading (the causal A filter), not only the raw reader", async () => {
  installRealFixture();
  const ctx = await buildContext({ split: "dev", authority: false });
  const progs = ctx.adv.programs.get("python"); // the forward_reference program has callees declared after their call sites
  const cheat = (text, lang, fn, opts = {}) => { const r = readingEdges(text, lang, fn, opts); return opts.final === false ? { ...r, decls: r.decls.map((d) => ({ ...d, at: -1 })) } : r; };
  const au = causalAudit(ctx, "python", { reader: cheat, mutants: false, programs: progs });
  assert.equal(au.raw, 0, "the raw reading of the cheat is causal");
  assert.ok(au.algorithmic > 0, "but a prefix that claims earlier declaration offsets admits edges the full reading drops as forward references");
  const honest = causalAudit(ctx, "python", { programs: progs });
  assert.equal(honest.retracted, 0);
});

// ── F4 causal A filter, frozen boilerplate ──────────────────────────────────────────────────────────────────────────────
test("F4 the A filter is CAUSAL: a callee declared later is a forward reference, dropped and counted; the lookahead variant keeps it", () => {
  const r = { names: ["a", "b"], decls: [{ name: "a", at: 0 }, { name: "b", at: 50 }], calls: [{ caller: "a", callee: "b", at: 20 }, { caller: "a", callee: "a", at: 30 }, { caller: "b", callee: "a", at: 60 }] };
  const causal = algorithmic(r, new Set(), { causal: true });
  assert.deepEqual(causal.edges.map(([c, e]) => `${c}->${e}`), ["a->a", "b->a"], "a->b is called before b is declared");
  assert.equal(causal.forwardRefs, 1);
  const look = algorithmic(r, new Set(), { causal: false });
  assert.equal(look.edges.length, 3, "the labelled whole-file variant counts a callee declared later as known");
  assert.throws(() => algorithmic({ names: ["a"], calls: [] }, new Set(), { causal: true }), /declaration offsets/, "no silent fallback to lookahead");
});

test("F4 boilerplate is FROZEN from DEV: frozen sets are used, DEV derives only when nothing is frozen (labelled), TEST never derives", async () => {
  installRealFixture();
  const fz = { schema: "C5Boilerplate@1", systems: { edges: { python: ["fibonacci"] } } };
  const ctx = await buildContext({ split: "dev", authority: false, adversarial: false, frozenOverride: fz });
  const a = algoSet(ctx, "edges", "python");
  assert.deepEqual(a.boiler, ["fibonacci"]);
  assert.equal(a.boilerSource, "frozen_dev");
  assert.equal(a.algo.get("fibonacci").names.length, 0, "the frozen set, not a re-derivation, decides what is removed");
  const none = await buildContext({ split: "dev", authority: false, adversarial: false, frozenOverride: null });
  assert.equal(algoSet(none, "edges", "c").boilerSource, "derived_on_dev");
  assert.deepEqual(algoSet(none, "edges", "c").boiler, ["main"], "what DEV shows for c (entry point main)");
  assert.throws(() => C5.boilerFor({ split: "test", frozen: null }, "edges", "python", new Map()), /never derived from the programs under evaluation/);
  const real = JSON.parse(fs.readFileSync(path.join(REAL_TASK_DIR, "boilerplate-dev.json"), "utf8"));
  assert.equal(real.schema, "C5Boilerplate@1");
  assert.equal(real.derived_from, "dev");
  assert.deepEqual(real.systems.edges.c, ["main"]);
  assert.deepEqual(frozenMissing(real, ["python", "go", "java"]), []);
  assert.ok(frozenMissing(null, ["python"]).length >= 3, "no frozen file: every needed (system, language) entry is missing");
  assert.deepEqual(frozenMissing(real, ["html"]), [], "a not-applicable language needs nothing");
});

test("F4 the frozen boilerplate is what a fresh DEV derivation gives (no drift between the file and the programs it was derived from)", async () => {
  installRealFixture();
  const fz = JSON.parse(fs.readFileSync(path.join(REAL_TASK_DIR, "boilerplate-dev.json"), "utf8"));
  const ctx = await buildContext({ split: "dev", authority: false, adversarial: false, frozenOverride: null });
  for (const l of DEV6) assert.deepEqual([...deriveBoilerplate(C5.readingsOf(ctx, "edges", l))].sort(), fz.systems.edges[l], `${l}: frozen edges boilerplate drifted from the dev programs`);
  for (const [l, sha] of Object.entries(fz.bundles_sha256)) assert.equal(sha, ctx.bundleSha.get(l), `${l}: the dev bundle changed after the boilerplate was frozen`);
});

// ── F5 reader-free baseline and independent-gold fidelity ───────────────────────────────────────────────────────────────
test("F5 a reader-free NAMES-ONLY system fails the rule on the BASELINE condition itself, with p and effect both significant (the review's finding)", () => {
  const namesOnly = (style) => { const m = specLanguage(style); for (const [t, a] of m) m.set(t, { names: a.names, edges: [] }); return m; };
  const a = analyse({ focus: namesOnly("camel"), partners: ["snake", "pascal", "kebab", "question"].map((s) => ({ language: `toy_${s}`, algo: namesOnly(s) })), tasks: TASK_IDS, ...FAST });
  assert.ok(a.same.s <= 0.5 + 1e-9, `names alone cannot exceed J/2 once agreeing about no calls earns nothing (${a.same.s})`);
  const rule = passRule(a, { ...OK_EXTRAS, baseline: { score: a.same.s } });
  assert.equal(rule.cond.permutation, true, "the review: names-only is significant");
  assert.equal(rule.cond.effect, true, "the review: names-only beats the task-pair control");
  assert.equal(rule.cond.baseline, false, "but it does not beat the reader-free baseline, which IS names-only");
  assert.equal(rule.pass, false);
  assert.ok(rule.reasons.some((r) => /baseline: score - reader-free baseline/.test(r)), rule.reasons.join("; "));
  // and a system that states the call structure beats the same baseline by far
  assert.equal(passRule(perfect(), { ...OK_EXTRAS, baseline: { score: a.same.s } }).cond.baseline, true);
});

test("F5 fidelity to INDEPENDENT gold: a faithful reader beats both controls, a names-only reader and a mismatched reader do not", () => {
  const gold = specLanguage("snake");
  const reader = specLanguage("camel");
  const base = new Map(TASK_IDS.map((t) => [t, { names: gold.get(t).names, edges: [] }]));
  const f = fidelityStats(reader, gold, base, TASK_IDS);
  assert.equal(f.n, 12);
  assert.equal(f.s, 1);
  assert.ok(f.mismatched < 0.5 && f.baseline === 0.5, `controls: mismatched ${f.mismatched}, baseline ${f.baseline}`);
  assert.equal(passRule(perfect(), { ...OK_EXTRAS, fidelity: f }).cond.fidelity, true);
  // a reader that finds the names and no calls: fidelity = baseline, no margin, the condition fails
  const f2 = fidelityStats(base, gold, base, TASK_IDS);
  assert.equal(passRule(perfect(), { ...OK_EXTRAS, fidelity: f2 }).cond.fidelity, false);
  // a reader whose programs are dealt to the wrong tasks: fidelity collapses to the mismatched control
  const dealt = specLanguage("camel", (t) => TASK_IDS[(TASK_IDS.indexOf(t) + 1) % 12]);
  const f3 = fidelityStats(dealt, gold, base, TASK_IDS);
  assert.ok(f3.s < 0.5, `a mismatched reader scores ${f3.s}`);
  assert.equal(passRule(perfect(), { ...OK_EXTRAS, fidelity: f3 }).cond.fidelity, false);
  // F1 inside the statistic: an empty reading counts 0, a program gold could not read is excluded and listed, never silently dropped
  const blind = new Map(reader); blind.set("gcd", { names: [], edges: [] });
  assert.ok(Math.abs(fidelityStats(blind, gold, base, TASK_IDS).s - 11 / 12) < 1e-9);
  const noGold = new Map(gold); noGold.set("gcd", { names: [], edges: [] });
  const f4 = fidelityStats(reader, noGold, base, TASK_IDS);
  assert.equal(f4.n, 11);
  assert.deepEqual(f4.missing_gold, ["gcd"]);
  // too few programs: the condition cannot hold
  assert.equal(passRule(perfect(), { ...OK_EXTRAS, fidelity: { ...f, n: CONST.MIN_TASKS - 1 } }).cond.fidelity, false);
});

test("F5 the reader-free baseline reads declarations by regular expression only: names, no calls, no khora code", () => {
  const cases = {
    python: ["def f(x):\n    return g(x)\nclass Box:\n    def put(self):\n        pass\n", ["f", "Box", "put"]],
    javascript: ["function f(x) { return g(x); }\nclass Box {\n  put(v) {\n    if (v) {\n    }\n  }\n}\nconst h = (a) => a;\n", ["f", "Box", "put", "h"]],
    c: ["#include <stdio.h>\ntypedef struct Node {\n int v;\n} Node;\nint add(int a, int b);\nstatic int sub(int a, int b) {\n return a - b;\n}\nint main(void) {\n return sub(1, 2);\n}\n", ["Node", "sub", "main"]],
    go: ["package main\ntype S struct{}\nfunc (s *S) Put() {}\nfunc run() {}\n", ["S", "Put", "run"]],
    ruby: ["class Box\n  def put\n  end\n  def full?\n  end\nend\n", ["Box", "put", "full?"]],
    java: ["class Main {\n  public Main() {\n  }\n  static int add(int a, int b) {\n    if (a > 0) {\n    }\n    return a + b;\n  }\n}\n", ["Main", "add"]],
  };
  for (const [lang, [text, want]] of Object.entries(cases)) {
    const r = readingDeclRegex(text, lang);
    assert.deepEqual([...r.names].sort(), [...want].sort(), lang);
    assert.deepEqual(r.calls, [], `${lang}: a names-only baseline states no call`);
  }
  assert.equal(readingDeclRegex("x", "klingon"), null, "no recipe: a typed gap, not an empty reading");
});

// ── F3 smoke label and the adversarial arm ──────────────────────────────────────────────────────────────────────────────
test("F3 scoreAdversarial detects an extra edge, a missing edge and a missing entity (the arm can fail)", () => {
  const spec = ADVERSARIAL.find((t) => t.id === "delegate_same_name").spec.python;
  const good = { names: ["Stack", "push", "pop", "peek", "is_empty", "__init__"], edges: [["pop", "is_empty"], ["peek", "is_empty"]] };
  assert.equal(scoreAdversarial(spec, good).ok, true, "extra declared names (a constructor) are not a misread; labels, not casing, are compared");
  assert.equal(scoreAdversarial(spec, { ...good, names: ["Stack", "push", "pop", "peek", "isEmpty"], edges: [["pop", "isEmpty"], ["peek", "isEmpty"]] }).ok, true, "casing conventions agree");
  const extra = scoreAdversarial(spec, { ...good, edges: [...good.edges, ["pop", "pop"]] });
  assert.equal(extra.ok, false);
  assert.deepEqual(extra.extra_edges, ["pop->pop x1"]);
  const missing = scoreAdversarial(spec, { ...good, edges: [["pop", "is_empty"]] });
  assert.deepEqual(missing.missing_edges, ["peek->is empty x1"], "labels are normalised sub-words");
  assert.deepEqual(scoreAdversarial(spec, { ...good, names: ["Stack", "push"] }).missing_entities, ["pop", "peek", "is_empty"]);
  assert.equal(scoreAdversarial(spec, { names: [], edges: [] }).ok, false, "a blind reading misreads every adversarial program");
});

test("F3 adversarial fixture: spec, bundles and manifest agree; every program is vouched for (sha256, parse, output)", () => {
  assert.deepEqual(ADVERSARIAL.map((t) => t.id), ["delegate_same_name", "forward_reference", "nested_definitions", "method_chain", "call_through_variable"]);
  const manifest = JSON.parse(fs.readFileSync(path.join(REAL_TASK_DIR, "adversarial", "MANIFEST.json"), "utf8"));
  assert.equal(manifest.schema, "C5AdversarialManifest@1");
  assert.match(manifest.label, /authored/);
  let n = 0;
  for (const lang of C5.ADVERSARIAL_LANGUAGES) {
    const b = parseBundle(fs.readFileSync(path.join(REAL_TASK_DIR, "adversarial", `${lang}.c5`), "utf8"));
    for (const T of ADVERSARIAL) {
      const sp = T.spec[lang];
      if (sp.na) { assert.equal(b.has(T.id), false, `${lang}/${T.id}: typed not applicable (${sp.na}) and not authored`); continue; }
      const v = vouch(manifest, lang, T.id, b.get(T.id));
      assert.equal(v.kept, true, `${lang}/${T.id}: ${v.why}`);
      assert.equal(v.executed, lang !== "go", `${lang}/${T.id}: go has no toolchain here and is parse-only`);
      n += 1;
    }
  }
  assert.equal(n, 19);
});

test("F3 a dev result says it is a SMOKE TEST; the adversarial arm turns misreads into typed gaps and typed not-applicable; no bundle is a typed gap", async () => {
  installRealFixture();
  const ctx = await buildContext({ split: "dev", authority: goldOk });
  for (const lang of ["python", "c"]) {
    const r = await C5.measure({ language: lang, authority: goldOk, ctx });
    assert.equal(r.smoke_only, true);
    assert.equal(r.notes[0], SMOKE_NOTE);
    assert.deepEqual([r.details.evidence.class, r.details.evidence.blind], ["dev_smoke", false]);
    const adv = r.details.adversarial;
    assert.equal(adv.authored, true);
    assert.match(adv.label, /AUTHORED/);
    const misreads = adv.programs.filter((p) => p.applicable && p.kept && p.causal.ok === false).map((p) => p.task).sort();
    assert.deepEqual(r.gaps.filter((g) => g.reason === "adversarial_misread").map((g) => g.feature).sort(), misreads, "every misread is a typed gap with its feature");
    const fwd = adv.programs.find((p) => p.task === "forward_reference");
    assert.equal(fwd.causal.ok, false, `${lang}: the causal rule drops a call whose callee is declared later`);
    assert.equal(fwd.lookahead.ok, true, `${lang}: the labelled lookahead variant keeps it`);
    assert.equal(fwd.forward_refs_dropped, 2);
    assert.equal(adv.programs.length, 5);
  }
  const c = (await C5.measure({ language: "c", authority: false, ctx })).details.adversarial.programs.find((p) => p.task === "nested_definitions");
  assert.equal(c.applicable, false);
  assert.match(c.reason, /no nested function/);
  const ruby = await C5.measure({ language: "ruby", authority: false, ctx });
  assert.ok(ruby.gaps.some((g) => g.reason === "no_adversarial_program"), "an unauthored language is a typed gap, not a pass");
});

// ── the REAL pipeline, end to end on DEV (smoke) ─────────────────────────────────────────────────────────────────────────
test("A5 end to end (real readers, real dev programs, independent gold): python passes as a SMOKE test with every A5 condition evaluated", { skip: !goldOk }, async () => {
  installRealFixture();
  const r = await C5.measure({ language: "python" });
  assert.equal(r.pass, true, JSON.stringify(r.details.pass_rule));
  const cond = r.details.pass_rule.conditions;
  for (const k of ["coverage", "nonEmpty", "permutation", "effect", "licence", "causality", "baseline", "fidelity"]) assert.equal(cond[k], true, k);
  assert.ok(r.controls.declRegexNoCalls <= 0.5, `the reader-free baseline is in the controls and is names-only: ${r.controls.declRegexNoCalls}`);
  assert.ok(r.margin >= 0.3 && r.control >= r.controls.declRegexNoCalls);
  assert.equal(r.details.causality.licence_ok, true);
  assert.equal(r.details.causality.retracted, 0);
  assert.ok(r.details.causality.cuts > 4000);
  assert.equal(r.details.fidelity_gate.n, 12);
  assert.deepEqual(r.details.non_empty.focus, { non_empty: 12, of: 12 });
  assert.equal(r.details.boilerplate_source, "frozen_dev");
  assert.equal(r.details.forward_references.dropped, 0);
  assert.equal(r.details.systems.edges_lookahead.gating, false);
  assert.match(r.details.systems.edges_lookahead.label, /NOT CAUSAL/);
  // without the independent gold arm no verdict can be true (three-valued rule)
  const blind = await C5.measure({ language: "python", authority: false });
  assert.equal(blind.pass, null);
  assert.ok(blind.gaps.some((g) => g.reason === "fidelity_unevaluated"));
});

test("A5 end to end: an edges reader blind on 4 of 12 kept programs fails with an empty_reading gap and a denominator (real pipeline, through measure())", async () => {
  installRealFixture();
  const dir = path.join(TMP, "tasks");
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "MANIFEST.json"), "utf8"));
  // blank four of python's programs by replacing them with comment-only text and re-vouching them (the reader sees nothing; the fixture is intact)
  const b = parseBundle(fs.readFileSync(path.join(dir, "dev", "python.c5"), "utf8"));
  const blank = new Set(["linked_list", "stack", "tree_traversal", "palindrome"]);
  let out = "";
  for (const t of TASK_IDS) {
    const text = blank.has(t) ? "# nothing\n" : b.get(t);
    out += `@@@@ task ${t}\n${text}`;
    manifest.programs.python[t] = { ...manifest.programs.python[t], sha256: sha256(text), parse: { ok: true } };
  }
  fs.writeFileSync(path.join(dir, "dev", "python.c5"), out);
  fs.writeFileSync(path.join(dir, "MANIFEST.json"), JSON.stringify(manifest));
  const r = await C5.measure({ language: "python", authority: false, auditStride: 9 });
  assert.equal(r.details.fixture.kept, 12, "all 12 programs are kept; the reader just cannot read 4 of them");
  assert.deepEqual(r.details.non_empty.focus, { non_empty: 8, of: 12 });
  const gap = r.gaps.find((g) => g.reason === "empty_reading");
  assert.deepEqual([gap.count, gap.of], [4, 12], "survivors are not scored alone: the 4 are a typed gap with their denominator");
  assert.equal(r.pass, false);
  assert.ok(r.score < 0.7, `the old instrument scored this 0.97 (score ${r.score})`);
});
