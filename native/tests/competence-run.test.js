// tests/competence-run.test.js — the competence AGGREGATOR must report holes, not hide them.
//
// PREDICTION (FOLD-CONSTITUTION II.5, written before the first run): a toy ladder
// whose six rungs are a passing, a failing, a throwing, a missing, a
// self-contradicting (pass with a control that beats the real arm) and a
// cross-language rung covering only one stem is reported as
//   r0 pass | r1 fail | r2 error | r3 unmeasured | r4 invalid | r5 pass (eng) / unmeasured (spa)
// in the card, the card file, the matrix and the CLI — and no cell is dropped
// from a denominator. A rung that says pass for the wrong split, with no
// control, on no data, or with a non-boolean verdict is INVALID, never a pass.
// The guards are tested the way every instrument must be (II.23): a CONTROL BUILT
// TO FAIL — a case-sensitive cast, a cast that leaks state from the future, a cast
// whose beings do not depend on how much was read — must make the guard say
// fail / fail / unlicensed, and the real listening cast must pass both with its
// licence intact.
// PASS RULE: every assertion below holds. The aggregator's own regression run is
// never invoked here (it would recurse: this file is part of that run).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  RUNGS, STEMS, runCard, runAll, renderCard, renderMatrix, verdictOf, holeFor, parseTap, resolveRungModules, resetCaches,
  regressionGuard, lowercaseInvariance, prefixInvariance, invarianceGuards, checkpointsFor, summarizeGuards,
} from "../eval/competence/run.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUN = path.join(HERE, "..", "eval", "competence", "run.mjs");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "competence-run-"));
const OUT = path.join(TMP, "out");
test.after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} });

const stub = (name, body) => { const f = path.join(TMP, name); fs.writeFileSync(f, body); return f; };
const result = (rung, o = {}) => `({ stem, rung: ${JSON.stringify(rung)}, split, n: 10, score: 0.9, control: 0.1, margin: 0.8, pass: true, controls: { deranged: 0.1 }, gaps: [{ reason: "language_unheard", count: 2 }], notes: [], details: {}, ...${JSON.stringify(o)} })`;
const rungSrc = (rung, bodyOverride) => `export const RUNG = { id: ${JSON.stringify(rung)}, name: "stub ${rung}", question: "toy" };\n// PREDICTION and PASS RULE: a stub\nexport async function measure({ stem, split }) { ${bodyOverride ?? `return ${result(rung)};`} }\n`;

const MODULES = {
  r0: stub("r0.mjs", rungSrc("r0")),
  r1: stub("r1.mjs", rungSrc("r1", `return ${result("r1", { score: 0.2, control: 0.1, margin: 0.1, pass: false })};`)),
  r2: stub("r2.mjs", rungSrc("r2", `throw new Error("boom: the rung fell over");`)),
  r3: path.join(TMP, "does-not-exist.mjs"),
  r4: stub("r4.mjs", rungSrc("r4", `return ${result("r4", { score: 0.6, control: 0.7, margin: -0.1, pass: true })};`)),
  r5: stub("r5.mjs", `export const RUNG = { id: "r5", name: "stub parallel", question: "toy" };
// PREDICTION and PASS RULE: a stub
export async function measureAll({ stems, split }) {
  globalThis.__r5Calls = (globalThis.__r5Calls ?? 0) + 1;
  const one = (stem) => ({ stem, rung: "r5", split, n: 5, score: 0.8, control: 0.2, margin: 0.6, pass: true, controls: {}, gaps: [], notes: [], details: {} });
  return { perStem: { eng: one("eng") }, pairs: [{ a: "eng", b: "spa", agree: 0.5 }, { a: "fra", b: "deu", agree: 0.4 }], notes: ["stub covers eng only"] };
}
`),
};

test("a toy ladder: pass, fail, error, unmeasured, invalid are all in the card — holes are said, not hidden", async () => {
  const card = await runCard({ stem: "eng", split: "dev", rungModules: MODULES, outDir: OUT, guards: "off" });
  const v = Object.fromEntries(Object.entries(card.rungs).map(([k, r]) => [k, r.verdict]));
  assert.deepEqual(v, { r0: "pass", r1: "fail", r2: "error", r3: "unmeasured", r4: "invalid", r5: "pass" });
  assert.equal(Object.keys(card.rungs).length, RUNGS.length, "no rung dropped from the denominator");
  assert.deepEqual(card.summary, { total: 6, pass: 2, fail: 1, unmeasured: 1, error: 1, invalid: 1 });
  // the typed gaps the contract names
  assert.equal(card.rungs.r3.pass, null);
  assert.equal(card.rungs.r3.gaps[0].reason, "unmeasured");
  assert.match(card.rungs.r2.gaps[0].reason, /^error: boom/);
  assert.equal(card.rungs.r2.pass, null);
  // the rung's own claim is kept, the aggregator's judgement is beside it
  assert.equal(card.rungs.r4.pass, true);
  assert.ok(card.rungs.r4.audit.includes("control_matches_or_beats_real_arm"));
  assert.ok(card.notes.some((n) => /HOLES: r2, r3/.test(n)), card.notes.join("|"));
  assert.ok(card.notes.some((n) => /INVALID/.test(n) && /r4/.test(n)));
  // the card file is written and equals what was returned
  const file = path.join(OUT, "card-eng-dev.json");
  assert.ok(fs.existsSync(file));
  assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).summary.unmeasured, 1);
  // the markdown card names every rung and every hole
  const md = renderCard(card);
  for (const id of ["r0", "r1", "r2", "r3", "r4", "r5"]) assert.match(md, new RegExp(`\\| ${id} `));
  assert.match(md, /UNMEASURED/);
  assert.match(md, /ERROR/);
  assert.match(md, /INVALID \(rung said pass\)/);
  assert.match(md, /\| rung \| score \| control \| margin \| pass \| n \| gaps \|/);
  assert.match(md, /HOLES/);
  assert.match(md, /guards \(off\): OFF/);
});

test("R5 is measured once across stems, and a stem its measureAll does not cover is a hole", async () => {
  resetCaches();
  globalThis.__r5Calls = 0;
  const out = path.join(TMP, "out-r5");
  const res = await runAll({ stems: ["eng", "spa"], split: "dev", rungModules: MODULES, outDir: out, guards: "off" });
  assert.equal(globalThis.__r5Calls, 1, "measureAll called once for two stems");
  const [eng, spa] = res.cards;
  assert.equal(eng.rungs.r5.verdict, "pass");
  assert.equal(spa.rungs.r5.verdict, "unmeasured");
  assert.equal(spa.rungs.r5.gaps[0].detail, "stem not in perStem");
  assert.equal(eng.cross_language.pairs.length, 1, "only pairs involving the stem");
  assert.equal(eng.cross_language.pairs_total, 2);
  // a second process-lifetime still reads the disk cache (same module bytes, split, stems) ...
  resetCaches();
  await runCard({ stem: "eng", split: "dev", rungModules: MODULES, outDir: out, guards: "off" });
  assert.equal(globalThis.__r5Calls, 1, "disk cache reused");
  // ... and --fresh recomputes
  resetCaches();
  await runCard({ stem: "eng", split: "dev", rungModules: MODULES, outDir: out, guards: "off", fresh: true });
  assert.equal(globalThis.__r5Calls, 2);
  // a different split is a different measurement
  resetCaches();
  await runCard({ stem: "eng", split: "test", rungModules: MODULES, outDir: out, guards: "off" });
  assert.equal(globalThis.__r5Calls, 3);
});

test("the matrix shows pass / fail / error / unmeasured / invalid glyphs and totals that add up", async () => {
  resetCaches();
  const res = await runAll({ stems: ["eng", "spa"], split: "dev", rungModules: MODULES, outDir: path.join(TMP, "out-matrix"), guards: "off" });
  const md = renderMatrix(res.cards, { split: "dev" });
  const rowOf = (lang) => md.split("\n").find((l) => l.startsWith(`| ${lang}`));
  const eng = rowOf("eng"), spa = rowOf("spa");
  assert.match(eng, /✓ 0\.90.*✗ 0\.20.*E .*· .*! 0\.60.*✓ 0\.80/);
  assert.match(spa, /✓ 0\.90.*✗ 0\.20.*E .*· .*! 0\.60.*· /, "spa's r5 is a hole, not a pass");
  assert.equal(res.totals.overall.cells, 12);
  assert.deepEqual({ ...res.totals.overall, cells: undefined }, { pass: 3, fail: 2, unmeasured: 3, error: 2, invalid: 2, cells: undefined });
  assert.match(md, /totals: 3 pass, 2 fail, 3 unmeasured, 2 error, 2 invalid of 12 cells/);
  assert.match(md, /5 cells are holes, not good/);
  assert.match(md, /legend:/);
});

test("the CLI: one JSON line per card, the matrix for --all, split defaults to dev, a bad split is refused", () => {
  const env = { ...process.env, KHORA_COMPETENCE_RUNGS: JSON.stringify(MODULES), KHORA_COMPETENCE_OUT: path.join(TMP, "out-cli"), KHORA_COMPETENCE_GUARDS: "off" };
  delete env.NODE_TEST_CONTEXT; // a nested node must not think it is a test file
  const run = (...args) => spawnSync(process.execPath, [RUN, ...args], { env, encoding: "utf8", timeout: 120000 });
  const one = run("--stem", "eng", "--json");
  assert.equal(one.status, 0, one.stderr);
  const lines = one.stdout.trim().split("\n");
  assert.equal(lines.length, 1);
  const card = JSON.parse(lines[0]);
  assert.equal(card.split, "dev", "dev is the default; test only on request");
  assert.equal(card.rungs.r3.verdict, "unmeasured");
  assert.ok(fs.existsSync(path.join(TMP, "out-cli", "card-eng-dev.json")));
  const md = run("--stem", "spa", "--quiet");
  assert.equal(md.status, 0, md.stderr);
  assert.match(md.stdout, /## Competence card: spa \(dev\)/);
  assert.match(md.stdout, /· UNMEASURED/);
  const all = run("--all", "--stems", "eng,spa", "--quiet");
  assert.equal(all.status, 0, all.stderr);
  assert.match(all.stdout, /## Competence matrix \(dev\): 2 languages x 6 rungs/);
  assert.match(all.stdout, /unmeasured/);
  assert.ok(fs.existsSync(path.join(TMP, "out-cli", "matrix-dev.json")));
  const bad = run("--stem", "eng", "--split", "validation");
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /--split must be dev or test/);
  const none = run();
  assert.equal(none.status, 2);
});

test("a TEST read is counted: 'computed once' is checkable, not trusted", async () => {
  const out = path.join(TMP, "out-testreads");
  const a = await runCard({ stem: "eng", split: "test", rungModules: MODULES, outDir: out, guards: "off", rungs: ["r0"] });
  const b = await runCard({ stem: "eng", split: "test", rungModules: MODULES, outDir: out, guards: "off", rungs: ["r0"] });
  assert.equal(a.split_discipline.test_reads_before_this, 0);
  assert.equal(b.split_discipline.test_reads_before_this, 1);
  assert.match(renderCard(b), /TEST reads of eng before this one: 1/);
  const d = await runCard({ stem: "eng", rungModules: MODULES, outDir: out, guards: "off", rungs: ["r0"] });
  assert.equal(d.split, "dev");
  assert.equal(d.split_discipline.test_reads_before_this, null);
  await assert.rejects(() => runCard({ stem: "eng", split: "holdout", rungModules: MODULES, outDir: out, guards: "off" }), /split must be/);
});

test("verdictOf: a pass that its own evidence contradicts is invalid, never a pass", () => {
  const ok = { stem: "eng", rung: "r1", split: "dev", n: 10, score: 0.9, control: 0.1, margin: 0.8, pass: true };
  const at = { rung: "r1", stem: "eng", split: "dev" };
  assert.equal(verdictOf(ok, at).verdict, "pass");
  assert.equal(verdictOf({ ...ok, pass: false }, at).verdict, "fail");
  assert.equal(verdictOf({ ...ok, pass: null, gaps: [{ reason: "unmeasured", count: 1 }] }, at).verdict, "unmeasured");
  assert.equal(verdictOf({ ...ok, control: null, margin: null }, at).verdict, "invalid"); // no control: no claim (II.23)
  assert.equal(verdictOf({ ...ok, control: 0.9, margin: 0 }, at).verdict, "invalid"); // control does as well as the real arm
  assert.equal(verdictOf({ ...ok, n: 0 }, at).verdict, "invalid"); // pass on no data
  assert.equal(verdictOf({ ...ok, split: "test" }, at).verdict, "invalid"); // asked dev, got test: held-out discipline
  assert.equal(verdictOf({ ...ok, split: "test", pass: false }, at).verdict, "invalid", "even a fail on the wrong split means nothing");
  assert.equal(verdictOf({ ...ok, pass: "yes" }, at).verdict, "invalid");
  assert.equal(verdictOf({ ...ok, pass: undefined }, at).verdict, "unmeasured");
  assert.ok(verdictOf({ ...ok, pass: undefined }, at).audit.includes("pass_missing"));
  assert.equal(verdictOf(null, at).verdict, "error");
  assert.equal(verdictOf("nope", at).verdict, "error");
  assert.ok(verdictOf({ ...ok, margin: 0.5 }, at).audit.includes("margin_inconsistent"));
  assert.ok(verdictOf({ ...ok, score: 1.4 }, at).audit.includes("score_out_of_range"));
  const above = verdictOf({ ...ok, controls: { deranged: 0.1, witness: 0.95 } }, at);
  assert.equal(above.verdict, "pass", "an informational flag, not a verdict change");
  assert.ok(above.audit.includes("arms_at_or_above_score:witness=0.950"));
  assert.ok(verdictOf({ ...ok, controls: { ablation: 0.9 } }, at).audit.includes("arms_at_or_above_score:ablation=0.900"), "an ablation that equals the real arm is flagged too");
  const h = holeFor({ rung: "r3", stem: "eng", split: "dev", reason: "x", kind: "error" });
  assert.equal(h.pass, null);
  assert.match(h.gaps[0].reason, /^error:/);
});

test("resolveRungModules: the standard files by default, overridable per rung or by directory", () => {
  const d = resolveRungModules(null);
  assert.deepEqual(Object.keys(d), ["r0", "r1", "r2", "r3", "r4", "r5"]);
  assert.match(d.r0, /eval\/competence\/r0-identify\.mjs$/);
  assert.match(d.r5, /eval\/competence\/r5-parallel\.mjs$/);
  assert.equal(resolveRungModules({ r2: "/x/y.mjs" }).r2, "/x/y.mjs");
  assert.match(resolveRungModules(JSON.stringify({ r1: "/z.mjs" })).r1, /\/z\.mjs$/);
  assert.equal(resolveRungModules("/some/dir").r4, "/some/dir/r4-claims.mjs");
  assert.ok(STEMS.includes("cmn-hans") && STEMS.includes("kor") && STEMS.length === 25);
});

test("parseTap reads the node:test summary and the top-level failures; a nested run skips the regression guard", async () => {
  const c = parseTap("ok 1 - a\nnot ok 2 - broken thing\n1..2\n# tests 2\n# suites 0\n# pass 1\n# fail 1\n# cancelled 0\n# skipped 0\n# todo 0\n");
  assert.deepEqual({ tests: c.tests, pass: c.pass, fail: c.fail, cancelled: c.cancelled }, { tests: 2, pass: 1, fail: 1, cancelled: 0 });
  assert.deepEqual(c.failing, ["broken thing"]);
  const prev = process.env.KHORA_COMPETENCE_RUNNING;
  process.env.KHORA_COMPETENCE_RUNNING = "1";
  try {
    const g = await regressionGuard();
    assert.equal(g.status, "skipped");
    assert.match(g.reason, /nested_run/);
  } finally { if (prev === undefined) delete process.env.KHORA_COMPETENCE_RUNNING; else process.env.KHORA_COMPETENCE_RUNNING = prev; }
  assert.equal(summarizeGuards([{ id: "a", status: "pass" }, { id: "b", status: "vacuous" }]).ok, null, "vacuous is not good");
  assert.equal(summarizeGuards([{ id: "a", status: "pass" }, { id: "b", status: "fail", scope: { stem: "x", mode: "m" } }]).ok, false);
  assert.equal(summarizeGuards([{ id: "a", status: "pass" }]).ok, true);
  assert.deepEqual(checkpointsFor(40, { offGrid: false }), [4, 8, 16, 32]);
});

// ── the guards, with controls built to fail ──────────────────────────────────────────────────
const TEXT = [
  "Maria met John in Boston.", "Maria liked Boston.", "John left Boston on Monday.", "Later Maria wrote to John.",
  "Boston was cold.", "John liked Boston again.", "Maria left Boston.", "Anna met Maria in Paris.", "Anna liked Paris.",
  "Paris was warm.", "Maria wrote to Anna.", "Anna left Paris.", "John wrote to Anna from Boston.", "Paris was lovely.",
  "Maria visited Paris.", "Anna and John met in Paris.",
];
const wordsOf = (t) => t.toLowerCase().match(/[a-z]+/g) ?? [];
/** a well-behaved stub cast: lowercases, counts, admits what recurs >= 2 times in the PREFIX, no state shared between instances */
const goodCast = () => { const c = new Map(); return { add({ text }) { for (const w of wordsOf(text)) c.set(w, (c.get(w) ?? 0) + 1); }, beings: () => [...c].filter(([, n]) => n >= 2 && n < 99).map(([surface, mentions]) => ({ surface, mentions, language: "x" })) }; };
/** CONTROL BUILT TO FAIL (heard rule): a cast that reads case */
const casedCast = () => { const c = new Map(); return { add({ text }) { for (const w of text.match(/[A-Za-z]+/g) ?? []) c.set(w, (c.get(w) ?? 0) + 1); }, beings: () => [...c].filter(([, n]) => n >= 2).map(([surface, mentions]) => ({ surface, mentions, language: "x" })) }; };
/** CONTROL BUILT TO FAIL (S3): state leaks between instances — a later read sees what an earlier, longer read saw */
const leaky = new Map();
const leakyCast = () => ({ add({ text }) { for (const w of wordsOf(text)) leaky.set(w, (leaky.get(w) ?? 0) + 1); }, beings: () => [...leaky].filter(([, n]) => n >= 2).map(([surface, mentions]) => ({ surface, mentions, language: "x" })) });
/** CONTROL BUILT TO FAIL (licence): beings that do not depend on how much was read */
const constantCast = () => ({ add() {}, beings: () => [{ surface: "always", mentions: 2, language: "x" }] });
/** CONTROL BUILT TO FAIL (observation neutrality): asking for the beings changes the answer */
const peekCast = () => { const c = new Map(); let asked = 0; return { add({ text }) { for (const w of wordsOf(text)) c.set(w, (c.get(w) ?? 0) + 1); }, beings() { asked += 1; return [...c].filter(([, n]) => n >= 2 + (asked > 1 ? 1 : 0)).map(([surface, mentions]) => ({ surface, mentions, language: "x" })); } }; };
const capitalCased = async (ss) => [...new Set(ss.flatMap((s) => s.match(/\b[A-Z][a-z]+/g) ?? []).map((w) => w.toLowerCase()))].sort();

test("lowercase invariance: a lowercase-blind cast passes WITH licence; a cast that reads case fails; a text with no case is vacuous", async () => {
  const good = await lowercaseInvariance({ sentences: TEXT, makeCast: goodCast, capitalOf: capitalCased });
  assert.equal(good.status, "pass");
  assert.equal(good.licence.ok, true);
  assert.ok(good.perturbed.changed > 0 && good.beings.cased > 0);
  const bad = await lowercaseInvariance({ sentences: TEXT, makeCast: casedCast, capitalOf: capitalCased });
  assert.equal(bad.status, "fail", "the guard must be able to fail");
  assert.ok(bad.diff.only_in_first.length + bad.diff.only_in_second.length > 0);
  // a control witness that does not move under lowercasing means the check could not have failed
  const blind = await lowercaseInvariance({ sentences: TEXT, makeCast: goodCast, capitalOf: async () => ["same"] });
  assert.equal(blind.status, "unlicensed");
  const caseless = await lowercaseInvariance({ sentences: TEXT.map((s) => s.toLowerCase()), makeCast: goodCast, capitalOf: capitalCased });
  assert.equal(caseless.status, "vacuous");
  const empty = await lowercaseInvariance({ sentences: TEXT, makeCast: () => ({ add() {}, beings: () => [] }), capitalOf: capitalCased });
  assert.equal(empty.status, "vacuous", "equal empty lists prove nothing");
});

test("prefix invariance: a causal cast passes WITH licence; leaked future state fails; a cast blind to extent is unlicensed; a snapshot that perturbs the read fails", async () => {
  const cps = [4, 6, 8, 11];
  const good = await prefixInvariance({ sentences: TEXT, makeCast: goodCast, checkpoints: cps });
  assert.equal(good.status, "pass");
  assert.equal(good.licence.ok, true);
  assert.ok(good.licence.checkpoints_where_lookahead_differs >= 1);
  assert.equal(good.neutral, true);
  leaky.clear();
  const bad = await prefixInvariance({ sentences: TEXT, makeCast: leakyCast, checkpoints: cps });
  assert.equal(bad.status, "fail", "lookahead through shared state must be caught");
  assert.ok(bad.mismatches.length > 0);
  const flat = await prefixInvariance({ sentences: TEXT, makeCast: constantCast, checkpoints: cps });
  assert.equal(flat.status, "unlicensed", "a lookahead control equal to every snapshot means the check could not fail");
  const peek = await prefixInvariance({ sentences: TEXT, makeCast: peekCast, checkpoints: cps });
  assert.equal(peek.status, "fail");
  const none = await prefixInvariance({ sentences: TEXT, makeCast: () => ({ add() {}, beings: () => [] }), checkpoints: cps });
  assert.equal(none.status, "vacuous");
});

test("the REAL listening cast (declared English) is lowercase- and prefix-invariant, with the licence intact", async () => {
  const text = [];
  for (let i = 0; i < 4; i++) text.push(...TEXT, "Maria Lopez met John Smith in Boston.", "Maria Lopez liked the city.", "John Smith left Boston.");
  const out = await invarianceGuards({ stem: "eng", mode: "declared", sentences: text });
  const [lc, pre] = out;
  assert.equal(lc.id, "lowercase_invariance");
  assert.equal(lc.status, "pass", JSON.stringify(lc).slice(0, 600));
  assert.ok(lc.licence.ok && lc.beings.cased > 0, "the capital tier moved and the cast found beings");
  assert.equal(pre.id, "prefix_invariance");
  assert.equal(pre.status, "pass", JSON.stringify(pre).slice(0, 600));
  assert.ok(pre.licence.checkpoints_where_lookahead_differs >= 1);
  assert.equal(pre.neutral, true);
  // no gold for a stem: a typed gap, never a pass
  const gap = await invarianceGuards({ stem: "tlh", mode: "declared" });
  assert.ok(gap.every((g) => g.status === "unmeasured"));
});
