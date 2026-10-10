// tests/coding-run.test.js — the CODING competence AGGREGATOR must report holes, not hide them.
//
// PREDICTION (FOLD-CONSTITUTION II.5, written before the first run): a toy ladder whose six rungs are
// a passing, a failing, a throwing, a missing, a self-contradicting (pass with a control that beats the
// real arm) and a not-applicable-with-a-reason rung is reported as
//   c0 pass | c1 fail | c2 error | c3 unmeasured | c4 invalid | c5 na
// in the card, the card file, the matrix and the CLI — and no cell is dropped from a denominator.
// A rung that says pass for the wrong split or language, with no control, on no data, with a non-boolean
// verdict or with a failed licence is INVALID, never a pass; a rung that says "not applicable" with no
// typed reason, or says not-applicable AND pass/fail, is INVALID, never a quiet n/a. A rung that never
// returns is an error hole after its declared timeout. A TEST read is logged, and a TEST card says when
// it is not the first read or when a rung module changed between two TEST reads; a TEST c5 is given only
// the languages asked for. The guards are tested the way every instrument must be (II.23): a CONTROL
// BUILT TO FAIL — a repo in two splits, the same file hash in two splits, a missing file, a project
// whose test fails, a project that runs no tests — must make them say fail / fail / fail / fail / error,
// and the real-shaped corpus must pass with its deranged-copy licence intact.
// PASS RULE: every assertion below holds. The aggregator's own full regression run is never invoked
// against this repo here (it would recurse: this file is part of that run); the regression guard is
// exercised on a tiny temporary project through its cwd seam.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  RUNGS, VERDICTS, runCard, runAll, renderCard, renderMatrix, verdictOf, holeFor, parseTap, resolveRungModules, rungCandidates, resetCaches,
  rungServers, servesRung, regressionGuard, corpusIntegrity, priorProvenance, priorsFor, perLanguageOf, licenceStatusOf, sourceFingerprint, summarizeGuards, totalsOf, languageList, dataPresence, parseArgs, SMALL_N,
} from "../eval/coding-competence/run.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RUN = path.join(HERE, "..", "eval", "coding-competence", "run.mjs");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "coding-run-"));
const OUT = path.join(TMP, "out");
test.after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} });

const stub = (name, body) => { const f = path.join(TMP, name); fs.writeFileSync(f, body); return f; };
const result = (rung, o = {}) => `({ language, rung: ${JSON.stringify(rung)}, split, n: 40, score: 0.9, control: 0.1, margin: 0.8, pass: true, controls: { deranged: 0.1 }, licence: { ok: true }, gaps: [{ reason: "token_unheard", count: 2 }], notes: [], details: {}, ...${JSON.stringify(o)} })`;
const rungSrc = (rung, body) => `export const RUNG = { id: ${JSON.stringify(rung)}, name: "stub ${rung}", question: "toy" };\n// PREDICTION and PASS RULE: a stub\nexport async function measure({ language, split }) { ${body ?? `return ${result(rung)};`} }\n`;

// ── a toy corpus: python is clean, the others are built to fail one check each ───────────────────
const CORP = path.join(TMP, "corpus");
const mk = (rel, exists = true) => { const p = path.join(CORP, "raw", rel); if (exists) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, "x = 1\n"); } return p; };
const F = (rel, repo, sha, exists = true) => ({ path: mk(rel, exists), rel, repo, sha256: sha, bytes: 6, lines: 1 });
const entry = (train, dev, testf, info = {}) => ({ train, dev, test: testf, info: { split_rule: "repo-hash(global)", leakage_risk: false, ...info } });
const MANIFEST = {
  schema: "CodeCorpusManifest@1",
  languages: {
    python: entry([F("a/1.py", "a/x", "h1"), F("a/2.py", "a/x", "h2")], [F("b/1.py", "b/y", "h3")], [F("c/1.py", "c/z", "h4")]),
    go: entry([F("a/1.go", "a/x", "g1")], [F("b/1.go", "b/y", "g2")], [F("a/2.go", "a/x", "g3")]), // CONTROL: repo a/x in train AND test
    ruby: entry([F("a/1.rb", "a/x", "same")], [F("b/1.rb", "b/y", "r2")], [F("c/1.rb", "c/z", "same")]), // CONTROL: one file hash in train AND test
    lua: entry([F("a/1.lua", "a/x", "l1")], [F("b/1.lua", "b/y", "l2")], [F("c/1.lua", "c/z", "l3", false)]), // CONTROL: a test file gone from disk
    zig: entry([F("a/1.zig", "a/x", "z1")], [F("a/2.zig", "a/x", "z2")], [F("a/3.zig", "a/x", "z3")], { split_rule: "top-dir-hash", leakage_risk: true }), // one repo, split by directory
    perl: entry([F("a/1.pl", "a/x", "p1")], [F("b/1.pl", "b/y", "p2")], []), // no test files
    bare: entry([{ path: mk("a/1.b"), sha256: null, repo: null }], [], [{ path: mk("b/1.b"), sha256: null, repo: null }]), // no repo, no hash: the deranged control cannot move
  },
  gaps: [],
};
fs.mkdirSync(CORP, { recursive: true });
fs.writeFileSync(path.join(CORP, "manifest.json"), JSON.stringify(MANIFEST));

const MODULES = {
  c0: stub("c0.mjs", rungSrc("c0")),
  c1: stub("c1.mjs", rungSrc("c1", `return ${result("c1", { score: 0.2, control: 0.1, margin: 0.1, pass: false })};`)),
  c2: stub("c2.mjs", rungSrc("c2", `throw new Error("boom: the rung fell over");`)),
  c3: path.join(TMP, "does-not-exist.mjs"),
  c4: stub("c4.mjs", rungSrc("c4", `return ${result("c4", { score: 0.6, control: 0.7, margin: -0.1, pass: true })};`)),
  c5: stub("c5.mjs", rungSrc("c5", `return { language, rung: "c5", split, applicable: false, reason: "toy: this system has one representation, nothing to agree with", pass: null, n: 0 };`)),
};
const common = { rungModules: MODULES, outDir: OUT, guards: "off", corpus: CORP };

test("a toy ladder: pass, fail, error, unmeasured, invalid, na are all in the card — holes are said, not hidden", async () => {
  resetCaches();
  const card = await runCard({ language: "python", split: "dev", ...common });
  const v = Object.fromEntries(Object.entries(card.rungs).map(([k, r]) => [k, r.verdict]));
  assert.deepEqual(v, { c0: "pass", c1: "fail", c2: "error", c3: "unmeasured", c4: "invalid", c5: "na" });
  assert.equal(Object.keys(card.rungs).length, RUNGS.length, "no rung dropped from the denominator");
  assert.deepEqual(card.summary, { total: 6, pass: 1, fail: 1, unmeasured: 1, error: 1, invalid: 1, na: 1, provisional: 0 });
  // the typed gaps the contract names
  assert.equal(card.rungs.c3.pass, null);
  assert.equal(card.rungs.c3.gaps[0].reason, "unmeasured");
  assert.match(card.rungs.c2.gaps[0].reason, /^error: boom/);
  assert.equal(card.rungs.c2.pass, null);
  assert.equal(card.rungs.c5.pass, null);
  assert.equal(card.rungs.c5.gaps[0].reason, "not_applicable");
  assert.match(card.rungs.c5.reason, /one representation/);
  // the rung's own claim is kept, the aggregator's judgement is beside it
  assert.equal(card.rungs.c4.pass, true);
  assert.ok(card.rungs.c4.audit.includes("control_matches_or_beats_real_arm"));
  assert.ok(card.notes.some((n) => /HOLES: c2, c3/.test(n)), card.notes.join("|"));
  assert.ok(card.notes.some((n) => /INVALID/.test(n) && /c4/.test(n)));
  assert.ok(card.notes.some((n) => /c5 declared NOT APPLICABLE/.test(n) && /not verified here/.test(n)));
  // the card file is written and equals what was returned
  const file = path.join(OUT, "card-python-dev.json");
  assert.ok(fs.existsSync(file));
  const onDisk = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(onDisk.summary.unmeasured, 1);
  assert.equal(onDisk.summary.na, 1);
  // the markdown card names every rung, every hole, and the not-applicable reason
  const md = renderCard(card);
  for (const id of ["c0", "c1", "c2", "c3", "c4", "c5"]) assert.match(md, new RegExp(`\\| ${id} `));
  assert.match(md, /· UNMEASURED/);
  assert.match(md, /E ERROR/);
  assert.match(md, /! INVALID \(rung said pass\)/);
  assert.match(md, /– N\/A/);
  assert.match(md, /not_applicable \(toy: this system has one representation/);
  assert.match(md, /\| rung \| score \| control \| margin \| pass \| n \| gaps \|/);
  assert.match(md, /HOLES/);
  assert.match(md, /guards \(off\): OFF/);
  assert.match(md, /## Coding competence card: python \(dev\)/);
  assert.match(md, /corpus train 2 files\/1 repos/);
  assert.deepEqual([...VERDICTS].sort(), ["error", "fail", "invalid", "na", "pass", "unmeasured"]);
});

test("a rung that never returns is an error hole after its declared timeout, not waited on forever", async () => {
  const hang = stub("hang.mjs", rungSrc("c0", `await new Promise(() => {});`));
  const card = await runCard({ language: "python", ...common, rungModules: { ...MODULES, c0: hang }, rungs: ["c0"], timeoutMs: 80 });
  assert.equal(card.rungs.c0.verdict, "error");
  assert.match(card.rungs.c0.gaps[0].reason, /^error: timeout: c0\.measure\(python\) did not return within 80 ms/);
});

test("verdictOf: a pass that its own evidence contradicts is invalid, never a pass", () => {
  const ok = { language: "python", rung: "c1", split: "dev", n: 100, score: 0.9, control: 0.1, margin: 0.8, pass: true, licence: { ok: true } };
  const at = { rung: "c1", language: "python", split: "dev" };
  assert.equal(verdictOf(ok, at).verdict, "pass");
  assert.equal(verdictOf({ ...ok, pass: false }, at).verdict, "fail");
  assert.equal(verdictOf({ ...ok, pass: null, gaps: [{ reason: "unmeasured", count: 1 }] }, at).verdict, "unmeasured");
  assert.equal(verdictOf({ ...ok, pass: null, gaps: [{ reason: "error: x", count: 1 }] }, at).verdict, "error");
  assert.equal(verdictOf({ ...ok, control: null, margin: null }, at).verdict, "invalid"); // no control: no claim (II.23)
  assert.equal(verdictOf({ ...ok, control: 0.9, margin: 0 }, at).verdict, "invalid"); // control does as well as the real arm
  assert.equal(verdictOf({ ...ok, n: 0 }, at).verdict, "invalid"); // pass on no data
  assert.equal(verdictOf({ ...ok, split: "test" }, at).verdict, "invalid"); // asked dev, got test: held-out discipline
  assert.equal(verdictOf({ ...ok, split: "test", pass: false }, at).verdict, "invalid", "even a fail on the wrong split means nothing");
  assert.equal(verdictOf({ ...ok, language: "go" }, at).verdict, "invalid", "a result for another language is not this language's");
  assert.ok(verdictOf({ ...ok, language: "go" }, at).audit.includes("language_mismatch:asked_python_got_go"));
  assert.equal(verdictOf({ ...ok, pass: "yes" }, at).verdict, "invalid");
  assert.equal(verdictOf({ ...ok, licence: { ok: false } }, at).verdict, "invalid", "a reported failed licence voids the pass");
  assert.ok(verdictOf({ ...ok, licence: { ok: false } }, at).audit.includes("licence_not_met"));
  assert.equal(verdictOf({ ...ok, pass: undefined }, at).verdict, "unmeasured");
  assert.ok(verdictOf({ ...ok, pass: undefined }, at).audit.includes("pass_missing"));
  assert.equal(verdictOf(null, at).verdict, "error");
  assert.equal(verdictOf("nope", at).verdict, "error");
  assert.ok(verdictOf({ ...ok, margin: 0.5 }, at).audit.includes("margin_inconsistent"));
  assert.ok(verdictOf({ ...ok, score: 1.4 }, at).audit.includes("score_out_of_range"));
  // informational flags never change the verdict
  const noLic = verdictOf({ ...ok, licence: undefined }, at);
  assert.equal(noLic.verdict, "pass");
  assert.ok(noLic.audit.includes("no_licence_ok_reported"));
  const small = verdictOf({ ...ok, n: SMALL_N - 1 }, at);
  assert.equal(small.verdict, "pass");
  assert.ok(small.audit.includes(`small_n:${SMALL_N - 1}`));
  const above = verdictOf({ ...ok, controls: { deranged: 0.1, witness: 0.95 } }, at);
  assert.equal(above.verdict, "pass", "an informational flag, not a verdict change");
  assert.ok(above.audit.includes("arms_at_or_above_score:witness=0.950"));
  assert.ok(verdictOf({ ...ok, controls: { ablation: 0.9 } }, at).audit.includes("arms_at_or_above_score:ablation=0.900"), "an ablation that equals the real arm is flagged too");
  const h = holeFor({ rung: "c3", language: "python", split: "dev", reason: "x", kind: "error" });
  assert.equal(h.pass, null);
  assert.match(h.gaps[0].reason, /^error:/);
});

test("a pass:null with no typed gap is never a silent null: the card says what the rung did not say, and finds its reason where rungs usually put it", () => {
  const at = { rung: "c2", language: "python", split: "dev" };
  const base = { language: "python", rung: "c2", split: "dev", n: 2288, score: 0.97, control: 0.04, margin: 0.93, pass: null };
  const bare = verdictOf({ ...base, gaps: [] }, at);
  assert.equal(bare.verdict, "unmeasured");
  assert.ok(bare.audit.includes("null_without_typed_gap"));
  assert.equal(bare.gaps.length, 1);
  assert.match(bare.gaps[0].detail, /no typed gap/);
  const viaRule = verdictOf({ ...base, details: { passRule: { reasons: ["B unmeasurable: core 50 < 200 or no bootstrap"] } } }, at);
  assert.equal(viaRule.gaps[0].detail, "B unmeasurable: core 50 < 200 or no bootstrap");
  assert.equal(verdictOf({ ...base, details: { reasons: ["a", "b"] } }, at).gaps[0].detail, "a; b");
  assert.match(verdictOf({ ...base, notes: ["nothing", "underpowered: 12 files"] }, at).gaps[0].detail, /underpowered: 12 files/);
  const typed = verdictOf({ ...base, gaps: [{ reason: "below declared floor", count: 1 }] }, at);
  assert.deepEqual(typed.gaps, [{ reason: "below declared floor", count: 1 }], "a rung's own typed gap is untouched");
  assert.ok(!typed.audit.includes("null_without_typed_gap"));
  // the table never shows an empty gaps cell for a null
  const card = { language: "python", split: "dev", data: { corpus: null, priors: { kw: false, name: false, files: [] }, authored_fixture: false }, rungs: { c2: { ...bare, module: {} } }, summary: { total: 1, pass: 0, fail: 0, unmeasured: 1, error: 0, invalid: 0, na: 0 }, modules: { c2: { rung_name: "classify tokens: can an identifier occurrence name a being" } }, guards: { mode: "off", summary: { ok: null, counts: {}, failed: [] }, regression: null, integrity: null, priors: null }, notes: [], cross_language: null, split_discipline: {} };
  const md = renderCard(card);
  assert.match(md, /unmeasured \(the rung returned pass:null and no typed gap\)/);
  assert.match(md, /\| c2 classify tokens: can an identifie…/, "a long rung name is cut, not allowed to wreck the table");
});

test("a licence the rung DEFERRED leaves a provisional PASS*, counted apart; a licence that failed voids the pass; one in details.licence is honoured", async () => {
  const at = { rung: "c3", language: "python", split: "dev" };
  const base = { language: "python", rung: "c3", split: "dev", n: 134, score: 0.99, control: 0.87, margin: 0.12, pass: true };
  const deferred = verdictOf({ ...base, details: { licence: "needs-pooled (the deranged controls must lose >= 0.10 pooled; evaluated by measureAll)" } }, at);
  assert.equal(deferred.verdict, "pass", "the rung's own rule stands");
  assert.equal(deferred.provisional, true);
  assert.ok(deferred.audit.some((a) => a.startsWith("licence_deferred:needs-pooled")));
  assert.ok(!deferred.audit.includes("no_licence_ok_reported"));
  assert.equal(verdictOf({ ...base, licence: { ok: null, reason: "pooled run owns it" } }, at).provisional, true);
  assert.equal(verdictOf({ ...base, licence: { ok: true } }, at).provisional, undefined, "a licence that held is a clean pass");
  assert.equal(verdictOf({ ...base, details: { licence: { ok: true } } }, at).verdict, "pass");
  assert.ok(!verdictOf({ ...base, details: { licence: { ok: true } } }, at).audit.some((a) => /licence/.test(a)));
  const failed = verdictOf({ ...base, details: { licence: { ok: false } } }, at);
  assert.equal(failed.verdict, "invalid", "a failed licence reported in details voids the pass too");
  assert.ok(failed.audit.includes("licence_not_met"));
  assert.equal(verdictOf({ ...base, details: { licence: false } }, at).verdict, "invalid");
  // an object the aggregator cannot read (c1 nests sub-licences) is not-reported, never assumed ok
  assert.equal(licenceStatusOf({ details: { licence: { keywords: { pass: true }, delimiters: { pass: true } } } }).status, "not_reported");
  assert.equal(licenceStatusOf({}).status, "not_reported");
  assert.equal(licenceStatusOf({ licence: true }).status, "ok");
  // a provisional pass only exists for a pass: a fail with a deferred licence is just a fail
  assert.equal(verdictOf({ ...base, pass: false, details: { licence: "needs-pooled" } }, at).provisional, undefined);

  // the card, the matrix and the totals say so
  const stubC3 = stub("c3-deferred.mjs", rungSrc("c3", `return ${result("c3", { licence: null, details: { licence: "needs-pooled (evaluated by measureAll)" } })};`));
  const stubC0 = stub("c0-clean.mjs", rungSrc("c0"));
  const res = await runAll({ languages: ["python", "go"], split: "dev", rungModules: { ...MODULES, c0: stubC0, c3: stubC3 }, outDir: path.join(TMP, "out-prov"), guards: "off", corpus: CORP, rungs: ["c0", "c3"] });
  const card = res.cards[0];
  assert.equal(card.rungs.c0.provisional, undefined);
  assert.equal(card.rungs.c3.verdict, "pass");
  assert.equal(card.rungs.c3.provisional, true);
  assert.deepEqual(card.summary, { total: 2, pass: 2, fail: 0, unmeasured: 0, error: 0, invalid: 0, na: 0, provisional: 1 });
  const md = renderCard(card);
  assert.match(md, /\| ✓ PASS \|/, "c0's pass is clean");
  assert.match(md, /\| ✓ PASS\* \|/, "c3's pass is provisional");
  assert.match(md, /rungs: 2 pass \(1 provisional\*\)/);
  assert.ok(card.notes.some((n) => /c3 PASS\* is PROVISIONAL/.test(n) && /needs-pooled/.test(n) && /II\.23/.test(n)), card.notes.join("|"));
  assert.equal(res.totals.overall.provisional, 2);
  assert.equal(res.matrix.python.c3.provisional, true);
  const mm = renderMatrix(res.cards, { split: "dev" });
  assert.match(mm, /✓ 0\.90 .*✓\* 0\.90/);
  assert.match(mm, /50\.0% counting clean passes only/, "a provisional pass is not counted as clean in the headline");
  assert.match(mm, /totals: 4 pass \(2 provisional\*: licence deferred by the rung\)/);
  assert.match(mm, /✓\* provisional pass/);
});

test("c3 and r3 are the same rung (the id is shared with the natural-language card); a result labelled for another rung is flagged", () => {
  const ok = { language: "python", split: "dev", n: 100, score: 0.9, control: 0.1, margin: 0.8, pass: true, licence: { ok: true } };
  const at = { rung: "c3", language: "python", split: "dev" };
  for (const label of ["c3", "C3", "r3", "R3", "R3 declared beings"]) {
    const v = verdictOf({ ...ok, rung: label }, at);
    assert.equal(v.verdict, "pass", label);
    assert.ok(!v.audit.some((a) => a.startsWith("rung_mismatch")), `${label}: ${v.audit}`);
  }
  const other = verdictOf({ ...ok, rung: "c4" }, at);
  assert.ok(other.audit.includes("rung_mismatch:c4"), "a c4 result handed back by the c3 module is flagged on the card");
});

test("not applicable is a typed verdict with a reason — never a silent pass, never a quiet n/a", () => {
  const at = { rung: "c4", language: "json", split: "dev" };
  const na = verdictOf({ language: "json", rung: "c4", split: "dev", applicable: false, reason: "JSON declares no calls, imports or inheritance", pass: null }, at);
  assert.equal(na.verdict, "na");
  assert.equal(na.pass, null);
  assert.equal(na.reason, "JSON declares no calls, imports or inheritance");
  assert.equal(na.gaps[0].reason, "not_applicable");
  assert.equal(verdictOf({ language: "json", rung: "c4", split: "dev", applicable: false, reason: { text: "typed reason as an object" } }, at).verdict, "na");
  // a typed reason is mandatory: a bare applicable:false is INVALID (a rung must not opt out in silence)
  for (const reason of [undefined, "", "   ", null, {}]) {
    const bad = verdictOf({ language: "json", rung: "c4", split: "dev", applicable: false, reason }, at);
    assert.equal(bad.verdict, "invalid", `reason=${JSON.stringify(reason)}`);
    assert.ok(bad.audit.includes("not_applicable_without_reason"));
  }
  // not applicable cannot also pass or fail
  assert.equal(verdictOf({ language: "json", rung: "c4", split: "dev", applicable: false, reason: "r", pass: true, n: 5, score: 1, control: 0, margin: 1 }, at).verdict, "invalid");
  assert.equal(verdictOf({ language: "json", rung: "c4", split: "dev", applicable: false, reason: "r", pass: false }, at).verdict, "invalid");
  // the reason may sit in details.reason; a measurement gap is NEVER a reason for not being applicable
  assert.equal(verdictOf({ language: "json", rung: "c4", split: "dev", applicable: false, details: { reason: "no relations in this notation" } }, at).verdict, "na");
  const gapOnly = verdictOf({ language: "json", rung: "c4", split: "dev", applicable: false, gaps: [{ reason: "below declared floor", count: 1 }] }, at);
  assert.equal(gapOnly.verdict, "invalid", "a lack of data is not non-applicability");
  assert.ok(gapOnly.audit.includes("not_applicable_without_reason"));
  // applicable:true (the usual flag in a result) changes nothing
  assert.equal(verdictOf({ language: "json", rung: "c4", split: "dev", applicable: true, n: 40, score: 0.9, control: 0.1, margin: 0.8, pass: true, licence: { ok: true } }, at).verdict, "pass");
  // not applicable but carrying a score is flagged, not hidden
  assert.ok(verdictOf({ language: "json", rung: "c4", split: "dev", applicable: false, reason: "r", score: 0.5, n: 3 }, at).audit.includes("not_applicable_but_scored"));
  // ... and a wrong-split n/a is still INVALID
  assert.equal(verdictOf({ language: "json", rung: "c4", split: "test", applicable: false, reason: "r" }, at).verdict, "invalid");
});

test("c5: measureAll runs once across languages; a language it does not cover is a hole; TEST is given only the languages asked for", async () => {
  resetCaches();
  globalThis.__c5Calls = 0; globalThis.__c5Langs = [];
  const c5 = stub("c5-all.mjs", `export const RUNG = { id: "c5", name: "stub agree", question: "toy" };
// PREDICTION and PASS RULE: a stub
export async function measureAll({ languages, split }) {
  globalThis.__c5Calls = (globalThis.__c5Calls ?? 0) + 1; globalThis.__c5Langs.push([...languages]);
  const one = (language) => ({ language, rung: "c5", split, n: 50, score: 0.8, control: 0.2, margin: 0.6, pass: true, controls: {}, licence: { ok: true }, gaps: [], notes: [], details: {} });
  return { perLanguage: { python: one("python") }, pairs: [{ a: "python", b: "ruby", agree: 0.5 }, { a: "go", b: "lua", agree: 0.4 }], notes: ["stub covers python only"] };
}
`);
  const mods = { ...MODULES, c5 };
  const out = path.join(TMP, "out-c5");
  const res = await runAll({ languages: ["python", "go"], split: "dev", rungModules: mods, outDir: out, guards: "off", corpus: CORP });
  assert.equal(globalThis.__c5Calls, 1, "measureAll called once for two languages");
  const [py, go] = res.cards;
  assert.equal(py.rungs.c5.verdict, "pass");
  assert.equal(go.rungs.c5.verdict, "unmeasured");
  assert.equal(go.rungs.c5.gaps[0].detail, "language not in perLanguage");
  assert.equal(py.cross_language.pairs.length, 1, "only pairs involving the language");
  assert.equal(py.cross_language.pairs_total, 2);
  assert.deepEqual(globalThis.__c5Langs[0].sort(), Object.keys(MANIFEST.languages).sort(), "dev: every corpus language is read, so cross-language pairs can exist");
  // a second process-lifetime still reads the disk cache (same module bytes, split, language set) ...
  resetCaches();
  await runCard({ language: "python", split: "dev", rungModules: mods, outDir: out, guards: "off", corpus: CORP });
  assert.equal(globalThis.__c5Calls, 1, "a single-language dev card reads the same language set as --all, so it reuses the disk cache");
  // ... and --fresh recomputes
  resetCaches();
  await runCard({ language: "python", split: "dev", rungModules: mods, outDir: out, guards: "off", corpus: CORP, fresh: true });
  assert.equal(globalThis.__c5Calls, 2);
  // a different split is a different measurement. TEST: a one-language card spends no other language's TEST
  resetCaches();
  await runCard({ language: "python", split: "test", rungModules: mods, outDir: out, guards: "off", corpus: CORP });
  assert.equal(globalThis.__c5Calls, 3);
  assert.deepEqual(globalThis.__c5Langs.at(-1), ["python"], "TEST c5 sees only the language asked for");
  // a different language set on the same split is a different measurement too
  resetCaches();
  await runCard({ language: "go", split: "test", rungModules: mods, outDir: out, guards: "off", corpus: CORP });
  assert.equal(globalThis.__c5Calls, 4);
  assert.deepEqual(globalThis.__c5Langs.at(-1), ["go"]);
  // an old-style perStem answer is accepted too
  const old = stub("c5-old.mjs", `export const RUNG = { id: "c5", name: "old", question: "toy" };\n// PREDICTION and PASS RULE: a stub\nexport async function measureAll({ languages, split }) { return { perStem: { python: { language: "python", rung: "c5", split, n: 9, score: 0.7, control: 0.2, margin: 0.5, pass: true, controls: {}, gaps: [], notes: [], details: {} } }, pairs: [], notes: [] }; }\n`);
  resetCaches();
  const o = await runCard({ language: "python", split: "dev", rungModules: { ...MODULES, c5: old }, outDir: path.join(TMP, "out-c5-old"), guards: "off", corpus: CORP, rungs: ["c5"] });
  assert.equal(o.rungs.c5.verdict, "pass");
  // whatever the measureAll answer calls its per-language results, they are found; a bare array works; nonsense is an error hole
  const r1 = { language: "python", rung: "c5", split: "dev", n: 9, score: 0.7, control: 0.2, margin: 0.5, pass: true };
  assert.deepEqual(Object.keys(perLanguageOf({ perLanguage: { python: r1 } })), ["python"]);
  assert.deepEqual(Object.keys(perLanguageOf({ results: { python: r1 } })), ["python"]);
  assert.deepEqual(Object.keys(perLanguageOf({ byLanguage: [r1, { ...r1, language: "go" }] })), ["python", "go"]);
  assert.deepEqual(Object.keys(perLanguageOf([r1])), ["python"]);
  assert.equal(perLanguageOf({ pairs: [] }), null);
  assert.equal(perLanguageOf("x"), null);
  const arr = stub("c5-arr.mjs", `export const RUNG = { id: "c5", name: "arr", question: "toy" };\n// PREDICTION and PASS RULE: a stub\nexport async function measureAll({ languages, split }) { return [{ language: "python", rung: "c5", split, n: 9, score: 0.7, control: 0.2, margin: 0.5, pass: true, controls: {}, licence: { ok: true }, gaps: [], notes: [], details: {} }]; }\n`);
  resetCaches();
  const a5 = await runCard({ language: "python", split: "dev", rungModules: { ...MODULES, c5: arr }, outDir: path.join(TMP, "out-c5-arr"), guards: "off", corpus: CORP, rungs: ["c5"] });
  assert.equal(a5.rungs.c5.verdict, "pass");
  const junk = stub("c5-junk.mjs", `export const RUNG = { id: "c5", name: "junk", question: "toy" };\n// PREDICTION and PASS RULE: a stub\nexport async function measureAll() { return 42; }\n`);
  resetCaches();
  const j5 = await runCard({ language: "python", split: "dev", rungModules: { ...MODULES, c5: junk }, outDir: path.join(TMP, "out-c5-junk"), guards: "off", corpus: CORP, rungs: ["c5"] });
  assert.equal(j5.rungs.c5.verdict, "error");
  assert.match(j5.rungs.c5.gaps[0].reason, /did not return/);
  // a c5 that exports only measure() is measured per language
  resetCaches();
  const per = await runCard({ language: "go", split: "dev", rungModules: MODULES, outDir: path.join(TMP, "out-c5-per"), guards: "off", corpus: CORP, rungs: ["c5"] });
  assert.equal(per.rungs.c5.verdict, "na");
  // a c5 whose measureAll throws is an error hole, for every language
  const boom = stub("c5-boom.mjs", `export const RUNG = { id: "c5", name: "boom", question: "toy" };\n// PREDICTION and PASS RULE: a stub\nexport async function measureAll() { throw new Error("all fell over"); }\n`);
  resetCaches();
  const b = await runCard({ language: "python", split: "dev", rungModules: { ...MODULES, c5: boom }, outDir: path.join(TMP, "out-c5-boom"), guards: "off", corpus: CORP, rungs: ["c5"] });
  assert.equal(b.rungs.c5.verdict, "error");
  assert.match(b.rungs.c5.gaps[0].reason, /^error: all fell over/);
});

test("the matrix shows pass / fail / error / unmeasured / invalid / n-a glyphs and totals that add up", async () => {
  resetCaches();
  const res = await runAll({ languages: ["python", "go"], split: "dev", ...common, outDir: path.join(TMP, "out-matrix") });
  const md = renderMatrix(res.cards, { split: "dev" });
  const rowOf = (lang) => md.split("\n").find((l) => l.startsWith(`| ${lang}`));
  const py = rowOf("python");
  assert.match(py, /✓ 0\.90.*✗ 0\.20.*E .*· .*! 0\.60.*– /);
  assert.equal(res.totals.overall.cells, 12);
  assert.deepEqual({ ...res.totals.overall, cells: undefined }, { pass: 2, fail: 2, unmeasured: 2, error: 2, invalid: 2, na: 2, cells: undefined, provisional: 0 });
  const { provisional, cells, ...verdicts } = res.totals.overall;
  assert.equal(Object.values(verdicts).reduce((a, b) => a + b, 0), cells, "every cell has exactly one verdict");
  assert.match(md, /totals: 2 pass, 2 fail, 2 unmeasured, 2 error, 2 invalid, 2 not applicable of 12 cells/);
  assert.match(md, /4 cells are holes, not good/);
  assert.match(md, /\(20\.0% of the 10 applicable cells\)/);
  assert.match(md, /legend:/);
  assert.match(md, /## Coding competence matrix \(dev\): 2 languages x 6 rungs/);
  assert.match(md, /\| n\/a +\|/);
  assert.equal(totalsOf(res.cards).perRung.c3.unmeasured, 2);
});

test("the CLI: one JSON line per card, the matrix for --all, split defaults to dev, a bad split is refused", () => {
  const env = { ...process.env, KHORA_CODING_RUNGS: JSON.stringify(MODULES), KHORA_CODING_OUT: path.join(TMP, "out-cli"), KHORA_CODING_GUARDS: "off", KHORA_CODING_CORPUS: CORP };
  delete env.NODE_TEST_CONTEXT; // a nested node must not think it is a test file
  const run = (...args) => spawnSync(process.execPath, [RUN, ...args], { env, encoding: "utf8", timeout: 120000 });
  const one = run("--language", "python", "--json");
  assert.equal(one.status, 0, one.stderr);
  const lines = one.stdout.trim().split("\n");
  assert.equal(lines.length, 1);
  const card = JSON.parse(lines[0]);
  assert.equal(card.split, "dev", "dev is the default; test only on request");
  assert.equal(card.rungs.c3.verdict, "unmeasured");
  assert.equal(card.rungs.c5.verdict, "na");
  assert.ok(fs.existsSync(path.join(TMP, "out-cli", "card-python-dev.json")));
  const md = run("--language", "go", "--quiet");
  assert.equal(md.status, 0, md.stderr);
  assert.match(md.stdout, /## Coding competence card: go \(dev\)/);
  assert.match(md.stdout, /· UNMEASURED/);
  const all = run("--all", "--languages", "python,go", "--quiet");
  assert.equal(all.status, 0, all.stderr);
  assert.match(all.stdout, /## Coding competence matrix \(dev\): 2 languages x 6 rungs/);
  assert.match(all.stdout, /unmeasured/);
  assert.ok(fs.existsSync(path.join(TMP, "out-cli", "matrix-dev.json")));
  assert.ok(fs.existsSync(path.join(TMP, "out-cli", "matrix-dev.md")));
  const every = run("--all", "--quiet");
  assert.equal(every.status, 0, every.stderr);
  assert.match(every.stdout, new RegExp(`${Object.keys(MANIFEST.languages).length} languages x 6 rungs`), "--all covers every corpus language");
  const j = JSON.parse(run("--all", "--languages", "python,go", "--json").stdout);
  assert.equal(j.totals.overall.cells, 12);
  assert.equal(j.matrix.python.c5.verdict, "na");
  // --json is one JSON document per line even when a rung prints progress with console.log
  const chatty = stub("chatty.mjs", rungSrc("c0", `console.log("progress: reading files"); console.info("more progress"); return ${result("c0")};`));
  const quiet = spawnSync(process.execPath, [RUN, "--language", "python", "--json", "--rungs", "c0"], { env: { ...env, KHORA_CODING_RUNGS: JSON.stringify({ ...MODULES, c0: chatty }) }, encoding: "utf8", timeout: 120000 });
  assert.equal(quiet.status, 0, quiet.stderr);
  assert.equal(quiet.stdout.trim().split("\n").length, 1, quiet.stdout);
  assert.equal(JSON.parse(quiet.stdout).rungs.c0.verdict, "pass");
  assert.match(quiet.stderr, /progress: reading files/);
  const lang = JSON.parse(run("--language", "all", "--languages", "python", "--json").stdout);
  assert.equal(lang.totals.overall.cells, 6, "--language all is --all (here narrowed by --languages)");
  const bad = run("--language", "python", "--split", "validation");
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /--split must be dev or test/);
  const none = run();
  assert.equal(none.status, 2);
  const badRung = run("--language", "python", "--rungs", "r0");
  assert.equal(badRung.status, 2);
  // a guard that FAILS makes the process exit 1 (go has a repo in train and test); a rung that fails does not
  const g = run("--language", "go", "--guards", "integrity", "--quiet");
  assert.equal(g.status, 1, g.stdout);
  assert.match(g.stdout, /corpus integrity \[go, dev\]: FAIL/);
});

test("the CLI on TEST: explicit only, logged per language, and c5 is handed exactly the languages asked for", () => {
  const out = path.join(TMP, "out-cli-test");
  const c5log = path.join(TMP, "c5-cli-calls.jsonl");
  const c5 = stub("c5-cli.mjs", `import fs from "node:fs";
export const RUNG = { id: "c5", name: "cli stub", question: "toy" };
// PREDICTION and PASS RULE: a stub
export async function measureAll({ languages, split }) {
  fs.appendFileSync(process.env.C5_LOG, JSON.stringify({ split, languages }) + "\\n");
  return { perLanguage: Object.fromEntries(languages.map((language) => [language, { language, rung: "c5", split, n: 40, score: 0.8, control: 0.2, margin: 0.6, pass: true, controls: {}, licence: { ok: true }, gaps: [], notes: [], details: {} }])), pairs: [], notes: [] };
}
`);
  const env = { ...process.env, KHORA_CODING_RUNGS: JSON.stringify({ ...MODULES, c5 }), KHORA_CODING_OUT: out, KHORA_CODING_GUARDS: "off", KHORA_CODING_CORPUS: CORP, C5_LOG: c5log };
  delete env.NODE_TEST_CONTEXT;
  const run = (...args) => spawnSync(process.execPath, [RUN, ...args], { env, encoding: "utf8", timeout: 120000 });
  const calls = () => (fs.existsSync(c5log) ? fs.readFileSync(c5log, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []);
  const reads = () => (fs.existsSync(path.join(out, "test-reads.jsonl")) ? fs.readFileSync(path.join(out, "test-reads.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []);
  // dev (the default) writes no TEST log and reads every corpus language in c5
  assert.equal(run("--language", "python", "--json", "--rungs", "c5").status, 0);
  assert.equal(reads().length, 0, "no TEST read without --split test");
  assert.equal(calls().at(-1).split, "dev");
  assert.equal(calls().at(-1).languages.length, Object.keys(MANIFEST.languages).length);
  // one language on TEST: only that language is read, one log line
  const one = JSON.parse(run("--language", "python", "--split", "test", "--json", "--rungs", "c5").stdout);
  assert.equal(one.split, "test");
  assert.equal(one.rungs.c5.verdict, "pass");
  assert.deepEqual(calls().at(-1), { split: "test", languages: ["python"] }, "TEST is never spent on a language that was not asked for");
  assert.deepEqual(reads().map((r) => r.language), ["python"]);
  // several languages on TEST: exactly those, one log line each; the repeat is visible
  const two = run("--all", "--languages", "python,go", "--split", "test", "--json", "--rungs", "c5");
  assert.equal(two.status, 0, two.stderr);
  assert.deepEqual(calls().at(-1), { split: "test", languages: ["python", "go"] });
  assert.deepEqual(reads().map((r) => r.language), ["python", "python", "go"]);
  const again = JSON.parse(run("--language", "python", "--split", "test", "--json", "--rungs", "c0").stdout);
  assert.equal(again.split_discipline.test_reads_before_this, 2);
  assert.ok(again.notes.some((n) => /NOT the one-shot final read/.test(n)));
});

test("a TEST read is counted, and a changed rung module between two TEST reads is said out loud", async () => {
  const out = path.join(TMP, "out-testreads");
  const mod = stub("c0-evolving.mjs", rungSrc("c0"));
  const mods = { ...MODULES, c0: mod };
  const a = await runCard({ language: "python", split: "test", rungModules: mods, outDir: out, guards: "off", rungs: ["c0"], corpus: CORP });
  assert.equal(a.split_discipline.test_reads_before_this, 0);
  assert.ok(!a.notes.some((n) => /already read/.test(n)));
  const b = await runCard({ language: "python", split: "test", rungModules: mods, outDir: out, guards: "off", rungs: ["c0"], corpus: CORP });
  assert.equal(b.split_discipline.test_reads_before_this, 1);
  assert.match(renderCard(b), /TEST reads of python before this one: 1/);
  assert.ok(b.notes.some((n) => /TEST already read 1 time\(s\)/.test(n) && /NOT the one-shot final read/.test(n)));
  assert.ok(!b.notes.some((n) => /CHANGED/.test(n)), "same bytes, no change note");
  // the instrument is edited between two TEST reads: that is tuning on held-out
  fs.writeFileSync(mod, `${fs.readFileSync(mod, "utf8")}\n// edited after reading TEST\n`);
  resetCaches();
  const c = await runCard({ language: "python", split: "test", rungModules: mods, outDir: out, guards: "off", rungs: ["c0"], corpus: CORP });
  assert.equal(c.split_discipline.test_reads_before_this, 2);
  assert.ok(c.notes.some((n) => /rung modules CHANGED since the previous TEST read: c0/.test(n) && /tuning on held-out/.test(n)), c.notes.join("|"));
  const log = fs.readFileSync(path.join(out, "test-reads.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(log.length, 3);
  assert.notEqual(log[0].modules.c0, log[2].modules.c0, "the log records the sha1 of the module that read TEST");
  // another language's TEST count is its own
  const g = await runCard({ language: "go", split: "test", rungModules: mods, outDir: out, guards: "off", rungs: ["c0"], corpus: CORP });
  assert.equal(g.split_discipline.test_reads_before_this, 0);
  // dev never touches the log
  const d = await runCard({ language: "python", rungModules: mods, outDir: out, guards: "off", rungs: ["c0"], corpus: CORP });
  assert.equal(d.split, "dev");
  assert.equal(d.split_discipline.test_reads_before_this, null);
  assert.equal(fs.readFileSync(path.join(out, "test-reads.jsonl"), "utf8").trim().split("\n").length, 4, "3 python + 1 go TEST reads, no dev read");
  await assert.rejects(() => runCard({ language: "python", split: "holdout", ...common }), /split must be/);
  await assert.rejects(() => runCard({ language: "python", ...common, guards: "sometimes" }), /guards must be/);
  await assert.rejects(() => runCard({ language: "python", ...common, split: "test", limit: 10 }), /limit is a DEV smoke-test device/);
  assert.equal(fs.readFileSync(path.join(out, "test-reads.jsonl"), "utf8").trim().split("\n").length, 4, "a refused TEST read is not logged");
});

test("sources: the reader's fingerprint is on every card and in the TEST log; a changed reader between two TEST reads is named", async () => {
  // the real fingerprint: stable between two calls, covers the reader, the priors of the language, the gold extractor and the helpers
  const fp = sourceFingerprint("python");
  assert.deepEqual(sourceFingerprint("python"), fp);
  assert.ok(Object.keys(fp).some((k) => k.startsWith("adapters/code/")), "the code reader is fingerprinted");
  assert.ok(Object.keys(fp).includes("adapters/text/code-structure.js"));
  assert.ok(Object.keys(fp).includes("priors/code-kw-py.json"), "the language's priors");
  assert.ok(Object.keys(fp).includes("eval/coding-competence/gold.py"));
  assert.ok(Object.keys(fp).includes("eval/coding-competence/run.mjs"));
  assert.ok(Object.values(fp).every((h) => /^[0-9a-f]{12}$/.test(h)));
  assert.ok(!Object.keys(fp).some((k) => /code-kw-(go|c|java)\.json/.test(k)), "other languages' priors are not this language's dependencies");
  // a tiny fake tree: editing one reader file changes exactly that entry
  const root = path.join(TMP, "fp-tree");
  const w = (rel, src) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), src); };
  w("adapters/code/lex.js", "A"); w("adapters/text/code-structure.js", "S"); w("priors/code-kw-py.json", "{}"); w("eval/coding-competence/gold.py", "G"); w("eval/coding-competence/c2-lib.mjs", "L");
  const opts = { native: root, priorsDir: path.join(root, "priors"), here: path.join(root, "eval/coding-competence") };
  const before = sourceFingerprint("python", opts);
  assert.deepEqual(Object.keys(before).sort(), ["adapters/code/lex.js", "adapters/text/code-structure.js", "eval/coding-competence/c2-lib.mjs", "eval/coding-competence/gold.py", "priors/code-kw-py.json"]);
  w("adapters/code/lex.js", "A edited after reading TEST");
  const after = sourceFingerprint("python", opts);
  assert.deepEqual(Object.keys(before).filter((k) => before[k] !== after[k]), ["adapters/code/lex.js"]);

  // the cards: the log keeps the fingerprint, and the second TEST read names the file that moved
  const out = path.join(TMP, "out-sources");
  let state = { ...before };
  const base = { language: "python", split: "test", rungModules: MODULES, outDir: out, guards: "off", corpus: CORP, rungs: ["c0"], fingerprint: () => state };
  const a = await runCard(base);
  assert.deepEqual(a.sources, before, "card.sources is the fingerprint");
  assert.ok(!a.notes.some((n) => /READER/.test(n)));
  const b = await runCard(base);
  assert.ok(!b.notes.some((n) => /READER or its priors/.test(n)), "same sources, no change note");
  state = { ...after, "priors/code-lex-python.json": "abc123abc123" }; // the reader moved AND a prior appeared
  const c = await runCard(base);
  const note = c.notes.find((n) => /READER or its priors\/gold\/helpers CHANGED/.test(n));
  assert.ok(note, c.notes.join("|"));
  assert.match(note, /adapters\/code\/lex\.js/);
  assert.match(note, /priors\/code-lex-python\.json/);
  assert.match(note, /tuning on held-out/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(out, "test-reads.jsonl"), "utf8").trim().split("\n").at(-1)).sources["adapters/code/lex.js"], after["adapters/code/lex.js"], "the log records the fingerprint of the read");
  // dev reads do not compare (and write no log)
  const d = await runCard({ ...base, split: "dev" });
  assert.ok(!d.notes.some((n) => /READER/.test(n)));
});

test("resolveRungModules: the rung files are discovered by name, defaults preferred, overridable per rung or by directory", () => {
  const dir = path.join(TMP, "rungdir");
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ["c0-identify.mjs", "c1.mjs", "c2_class.js", "c3-beings.mjs", "c3-beings-old.mjs", "c4-a.mjs", "c4-b.mjs", "gold.mjs", "corpus.mjs", "c9-x.mjs"]) fs.writeFileSync(path.join(dir, f), rungSrc("c0"));
  const d = resolveRungModules(null, dir);
  assert.deepEqual(Object.keys(d), ["c0", "c1", "c2", "c3", "c4", "c5"]);
  assert.equal(path.basename(d.c0), "c0-identify.mjs");
  assert.equal(path.basename(d.c1), "c1.mjs", "a c1.mjs is found though the default name is c1-hear.mjs");
  assert.equal(path.basename(d.c2), "c2_class.js");
  assert.equal(path.basename(d.c3), "c3-beings.mjs", "the default name wins over another match");
  assert.equal(path.basename(d.c4), "c4-a.mjs", "the first by name when several match");
  assert.equal(path.basename(d.c5), "c5-agree.mjs", "none found: the default name, absent");
  assert.ok(!fs.existsSync(d.c5));
  assert.deepEqual(rungCandidates(dir, "c4"), ["c4-a.mjs", "c4-b.mjs"]);
  assert.deepEqual(rungCandidates(dir, "c3"), ["c3-beings-old.mjs", "c3-beings.mjs"]);
  for (const id of ["c0", "c1", "c2", "c3", "c4", "c5"]) assert.ok(!rungCandidates(dir, id).some((f) => /^(gold|corpus)/.test(f)), "gold.mjs and corpus files are never mistaken for a rung");
  assert.equal(resolveRungModules({ c2: "/x/y.mjs" }, dir).c2, "/x/y.mjs");
  assert.match(resolveRungModules(JSON.stringify({ c1: "/z.mjs" }), dir).c1, /\/z\.mjs$/);
  assert.equal(path.basename(resolveRungModules(dir).c4), "c4-a.mjs");
  const real = resolveRungModules(null);
  assert.deepEqual(Object.keys(real), ["c0", "c1", "c2", "c3", "c4", "c5"]);
  for (const id of Object.keys(real)) assert.match(real[id], new RegExp(`eval/coding-competence/${id}[^/]*\\.m?js$`));
  assert.deepEqual(RUNGS.map((r) => r.id), ["c0", "c1", "c2", "c3", "c4", "c5"]);
});

test("a helper file that shares the rung prefix (c2-lib.mjs) is not mistaken for the rung: a file that exports measure/measureAll is preferred", async () => {
  const dir = path.join(TMP, "helpers");
  fs.mkdirSync(dir, { recursive: true });
  const w = (f, src) => fs.writeFileSync(path.join(dir, f), src);
  w("c2-lib.mjs", "// helpers for the c2 rung\nexport function tokenize(s) { return s.split(/\\s+/); }\n");
  w("c2-names.mjs", rungSrc("c2"));
  w("c5-core.mjs", "export const x = 1;\n");
  w("c5-parallel.mjs", `export const RUNG = { id: "c5" };\n// PREDICTION and PASS RULE: a stub\nexport async function measureAll({ languages, split }) { return { perLanguage: {}, pairs: [], notes: [] }; }\n`);
  w("c0-a.mjs", "export { measure };\nfunction measure() {}\n");
  w("c1-header-only.mjs", "// a header and nothing else yet\n");
  const r = resolveRungModules(null, dir);
  assert.equal(path.basename(r.c2), "c2-names.mjs", "the helper sorts first but does not serve the rung");
  assert.equal(path.basename(r.c5), "c5-parallel.mjs", "a measureAll-only module serves a rung");
  assert.equal(path.basename(r.c0), "c0-a.mjs", "export { measure } is an export");
  assert.equal(path.basename(r.c1), "c1-header-only.mjs", "nothing serves c1: the first name match is used and will report 'exports no measure()'");
  assert.deepEqual(rungServers(dir, "c2"), ["c2-names.mjs"]);
  assert.equal(servesRung(path.join(dir, "c2-lib.mjs")), false);
  assert.equal(servesRung(path.join(dir, "c1-header-only.mjs")), false);
  assert.equal(servesRung(path.join(dir, "nope.mjs")), false);
  const card = await runCard({ language: "python", rungModules: r, outDir: path.join(TMP, "out-helpers"), guards: "off", corpus: CORP, rungs: ["c1", "c2"] });
  assert.equal(card.rungs.c2.verdict, "pass");
  assert.ok(!card.rungs.c2.audit.some((a) => a.startsWith("ambiguous_module")), "a helper is not a rival");
  assert.equal(card.rungs.c1.verdict, "unmeasured");
  assert.equal(card.rungs.c1.gaps[0].detail, "no measure() export");
});

test("an ambiguous rung file is used (first by name) and said out loud", async () => {
  const dir = path.join(TMP, "ambig");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "c0-a.mjs"), rungSrc("c0"));
  fs.writeFileSync(path.join(dir, "c0-b.mjs"), rungSrc("c0"));
  const mods = resolveRungModules(dir);
  const card = await runCard({ language: "python", rungModules: mods, outDir: path.join(TMP, "out-ambig"), guards: "off", corpus: CORP, rungs: ["c0"] });
  assert.equal(card.rungs.c0.verdict, "pass");
  assert.ok(card.rungs.c0.audit.some((a) => a.startsWith("ambiguous_module:c0-a.mjs|c0-b.mjs")));
  assert.ok(card.notes.some((n) => /more than one module matches/.test(n)));
});

test("a rung module with no pre-registration header, or declaring another rung's id, is flagged", async () => {
  const bare = stub("bare.mjs", `export const RUNG = { id: "c2", name: "wrong id" };\nexport async function measure({ language, split }) { return ${result("c0")}; }\n`);
  const card = await runCard({ language: "python", ...common, rungModules: { ...MODULES, c0: bare }, rungs: ["c0"] });
  assert.ok(card.rungs.c0.audit.includes("no_preregistration_header"));
  assert.ok(card.rungs.c0.audit.includes("module_declares_rung:c2"));
  assert.ok(card.notes.some((n) => /no pre-registration header found in: c0/.test(n)));
});

// ── the guards, with controls built to fail ──────────────────────────────────────────────────
test("corpus integrity: a clean corpus passes WITH its deranged-copy licence; a repo in two splits, a shared hash and a missing file each fail", () => {
  const at = (language, split = "dev") => corpusIntegrity({ language, split, entry: MANIFEST.languages[language] ?? null });
  const clean = at("python");
  assert.equal(clean.status, "pass", JSON.stringify(clean));
  assert.equal(clean.licence.ok, true);
  assert.ok(clean.licence.deranged.repo_clashes >= 1 && clean.licence.deranged.sha_clashes >= 1, "the statistic moves under the perturbation");
  assert.deepEqual(clean.counts, { train: 2, dev: 1, test: 1 });
  assert.equal(at("python", "test").status, "pass");
  const repo = at("go", "test");
  assert.equal(repo.status, "fail", "the guard must be able to fail");
  assert.deepEqual(repo.repo_clashes, ["a/x"]);
  const sha = at("ruby", "test");
  assert.equal(sha.status, "fail");
  assert.equal(sha.sha_clashes, 1);
  const gone = at("lua", "test");
  assert.equal(gone.status, "fail");
  assert.equal(gone.missing_on_disk, 1);
  assert.equal(at("lua", "dev").status, "pass", "only the asked split is checked for presence");
  // a language split by directory can never be better than partial
  const risk = at("zig", "dev");
  assert.equal(risk.status, "partial");
  assert.equal(risk.leakage_risk, true);
  // nothing to check, nothing to score
  assert.equal(at("perl", "test").status, "vacuous");
  assert.equal(at("nope").status, "unmeasured");
  // a check whose control cannot move is unlicensed, never a pass
  assert.equal(at("bare", "dev").status, "vacuous", "bare has no dev files");
  const bare = corpusIntegrity({ language: "bare", split: "test", entry: MANIFEST.languages.bare });
  assert.equal(bare.status, "unlicensed", "no repo and no hash: the deranged control did not fail, so the check could not have failed");
  assert.equal(bare.licence.ok, false);
  assert.equal(corpusIntegrity({ language: "x", split: "dev", entry: { train: [], dev: [{ path: "/p", repo: "r", sha256: "h" }], test: [] }, exists: () => true }).status, "vacuous", "no train files: the control cannot be built");
  // the injectable exists() is honoured
  assert.equal(corpusIntegrity({ language: "python", split: "dev", entry: MANIFEST.languages.python, exists: () => false }).status, "fail");
});

// ── prior provenance (rule 9: priors from TRAIN only) ────────────────────────────────────────
const mkPriors = (name, files) => {
  const d = path.join(TMP, name);
  fs.mkdirSync(d, { recursive: true });
  for (const [f, obj] of Object.entries(files)) fs.writeFileSync(path.join(d, f), JSON.stringify(obj));
  return d;
};
const KW = { schema: "CodeKeywordPrior@1", language: "python", provenance: { giver: "CPython (the engine)" } };
const TRAINED = (repos, extra = {}) => ({ schema: "CodeNamePrior@1", language: "python", provenance: { giver: "tree-sitter parses of the manifest TRAIN split", split: "train", trainRepos: repos, ...extra } });
const ETHOS = { schema: "CodeNamePrior@1", language: "python", provenance: { giver: "per-language split", source: "/x/ethos/09-source-code" } };
let priorDirN = 0;

test("prior provenance: TRAIN-only priors pass WITH their deranged licence; a prior trained on a dev/test repo fails; one that records no repositories is partial, never clean", () => {
  const entry = MANIFEST.languages.python; // train a/x, dev b/y, test c/z
  const at = (files, over = {}) => priorProvenance({ language: "python", split: "dev", entry, dir: mkPriors(`priors-${priorDirN++}`, files), ...over });
  const clean = at({ "code-kw-py.json": KW, "code-name-train-py.json": TRAINED(["a/x"]) });
  assert.equal(clean.status, "pass", JSON.stringify(clean));
  assert.equal(clean.licence.ok, true, "the planted held-out repo is caught");
  assert.deepEqual(clean.priors.map((p) => p.status).sort(), ["clean", "not_corpus_derived"]);
  // CONTROL BUILT TO FAIL: the prior saw a dev repository / a test repository / declares another split
  const leakDev = at({ "code-name-train-py.json": TRAINED(["a/x", "b/y"]) });
  assert.equal(leakDev.status, "fail", "the guard must be able to fail");
  assert.deepEqual(leakDev.priors[0].overlap, ["b/y (dev)"]);
  assert.equal(at({ "code-name-train-py.json": TRAINED(["C/Z"]) }).status, "fail", "repo names are compared case-insensitively");
  const lied = at({ "code-name-train-py.json": TRAINED(["a/x"], { split: "dev" }) });
  assert.equal(lied.status, "fail");
  assert.match(lied.priors[0].reason, /declares split "dev"/);
  // a corpus-derived prior that records no repositories cannot be cleared
  const eth = at({ "code-name-py.json": ETHOS, "code-name-train-py.json": TRAINED(["a/x"]) });
  assert.equal(eth.status, "partial");
  assert.equal(eth.priors.find((p) => p.file === "code-name-py.json").status, "unverifiable");
  assert.match(eth.reason, /code-name-py\.json/);
  // a proven overlap outranks an unverifiable prior
  assert.equal(at({ "code-name-py.json": ETHOS, "code-name-train-py.json": TRAINED(["b/y"]) }).status, "fail");
  // grammar/engine priors alone: nothing corpus-derived to leak, and the check could not have failed: vacuous, not good
  assert.equal(at({ "code-kw-py.json": KW }).status, "vacuous");
  assert.equal(at({}).status, "vacuous");
  assert.equal(at({ "code-name-train-py.json": TRAINED(["a/x"]) }, { entry: null }).status, "unmeasured");
  // a language split by directory cannot be cleared by repository
  const zig = priorProvenance({ language: "zig", split: "dev", entry: MANIFEST.languages.zig, dir: mkPriors("priors-zig", { "code-name-train-zig.json": { ...TRAINED(["a/x"]), language: "zig" } }) });
  assert.equal(zig.status, "partial");
  // an empty held-out set means the deranged control cannot be built: reported with licence null, not claimed as licensed
  const noHeld = priorProvenance({ language: "python", split: "dev", entry: { train: entry.train, dev: [], test: [], info: {} }, dir: mkPriors("priors-nohold", { "code-name-train-py.json": TRAINED(["a/x"]) }) });
  assert.equal(noHeld.licence.ok, null);
  assert.equal(noHeld.status, "pass", "nothing held out to leak into: reported with licence null");
  // an unreadable prior is unverifiable, not clean
  const dir = mkPriors("priors-bad", {});
  fs.writeFileSync(path.join(dir, "code-name-py.json"), "{not json");
  const bad = priorProvenance({ language: "python", split: "dev", entry, dir });
  assert.equal(bad.status, "partial");
  assert.equal(bad.priors[0].status, "unreadable");
});

test("priorsFor: priors are found by language id or its short alias, never by a substring of another language", () => {
  const dir = mkPriors("priors-find", { "code-kw-py.json": KW, "code-name-train-py.json": {}, "code-ctx-python.json": {}, "code-kw-c.json": {}, "code-name-objc.json": {}, "code-kw-cpp.json": {}, "notes.json": {}, "code-kw-py.txt": {} });
  assert.deepEqual(priorsFor("python", dir), ["code-ctx-python.json", "code-kw-py.json", "code-name-train-py.json"]);
  assert.deepEqual(priorsFor("c", dir), ["code-kw-c.json"], "objc and cpp are not c");
  assert.deepEqual(priorsFor("zig", dir), []);
  assert.deepEqual(priorsFor("python", path.join(TMP, "no-such-dir")), []);
});

test("a card carries the prior provenance guard beside the corpus integrity guard, rolls both up, and a leaking prior fails the card", async () => {
  const clean = mkPriors("priors-card-clean", { "code-kw-py.json": KW, "code-name-train-py.json": TRAINED(["a/x"]) });
  const good = await runCard({ language: "python", ...common, guards: "integrity", rungs: ["c0"], priorsDir: clean });
  assert.equal(good.guards.priors.status, "pass");
  assert.equal(good.guards.integrity.status, "pass");
  assert.equal(good.guards.summary.ok, true);
  assert.match(renderCard(good), /prior provenance \[python\]: PASS — kw-py \(grammar\/engine\); name-train-py \(TRAIN-only, 1 repos\); deranged control caught/);
  const leaky = mkPriors("priors-card-leaky", { "code-name-train-py.json": TRAINED(["a/x", "c/z"]) });
  const bad = await runCard({ language: "python", ...common, guards: "integrity", rungs: ["c0"], priorsDir: leaky, outDir: path.join(TMP, "out-leaky") });
  assert.equal(bad.guards.priors.status, "fail");
  assert.equal(bad.guards.summary.ok, false);
  assert.deepEqual(bad.guards.summary.failed, ["prior_provenance[python]"]);
  assert.match(renderCard(bad), /guards \(integrity\): FAILED: prior_provenance\[python\]/);
  assert.match(renderCard(bad), /OVERLAP: c\/z \(test\)/);
  const part = await runCard({ language: "python", ...common, guards: "integrity", rungs: ["c0"], priorsDir: mkPriors("priors-card-eth", { "code-name-py.json": ETHOS }), outDir: path.join(TMP, "out-eth") });
  assert.equal(part.guards.priors.status, "partial");
  assert.equal(part.guards.summary.ok, null, "partial is not good");
  const md = renderMatrix([bad, part, good], { split: "dev" });
  assert.match(md, /prior provenance fail: 1\/3 \(python\)/);
  assert.match(md, /prior provenance partial: 1\/3/);
  assert.match(md, /prior provenance pass: 1\/3/);
});

test("a card carries the corpus integrity guard, rolls it up, and a failed guard says FAILED on the card", async () => {
  resetCaches();
  const clean = mkPriors("priors-iso", { "code-kw-py.json": KW });
  const good = await runCard({ language: "python", ...common, guards: "integrity", rungs: ["c0"], priorsDir: clean });
  assert.equal(good.guards.integrity.status, "pass");
  assert.equal(good.guards.priors.status, "vacuous", "grammar-derived priors only: nothing corpus-derived to leak");
  assert.equal(good.guards.summary.ok, null, "a vacuous guard is not a good guard");
  assert.equal(good.guards.regression, null);
  assert.ok(good.notes.some((n) => /regression tests were NOT run/.test(n)));
  const bad = await runCard({ language: "go", split: "test", ...common, guards: "integrity", rungs: ["c0"], outDir: path.join(TMP, "out-guard") });
  assert.equal(bad.guards.integrity.status, "fail");
  assert.equal(bad.guards.summary.ok, false);
  assert.deepEqual(bad.guards.summary.failed, ["corpus_integrity[go]"]);
  const md = renderCard(bad);
  assert.match(md, /guards \(integrity\): FAILED: corpus_integrity\[go\]/);
  assert.match(md, /corpus integrity \[go, test\]: FAIL/);
  const zig = await runCard({ language: "zig", ...common, guards: "integrity", rungs: ["c0"] });
  assert.equal(zig.guards.summary.ok, null, "partial is not good");
  assert.ok(zig.notes.some((n) => /LEAKAGE RISK/.test(n)));
  assert.match(renderCard(zig), /LEAKAGE RISK/);
  const unk = await runCard({ language: "tlh", ...common, guards: "integrity", rungs: ["c0"] });
  assert.equal(unk.guards.integrity.status, "unmeasured");
  assert.ok(unk.notes.some((n) => /not in the corpus/.test(n)));
  const perl = await runCard({ language: "perl", split: "test", ...common, guards: "integrity", rungs: ["c0"], outDir: path.join(TMP, "out-perl") });
  assert.ok(perl.notes.some((n) => /NO TEST FILES for perl/.test(n)));
  // a missing corpus is said, not assumed
  const none = await runCard({ language: "python", ...common, guards: "integrity", rungs: ["c0"], corpus: path.join(TMP, "no-such-corpus") });
  assert.equal(none.guards.integrity.status, "unmeasured");
  assert.match(none.guards.integrity.reason, /no corpus manifest/);
});

test("languageList and dataPresence read the corpus summary (or the manifest) and the priors on disk", () => {
  resetCaches();
  const l = languageList(CORP);
  assert.deepEqual(l.languages, Object.keys(MANIFEST.languages));
  assert.match(l.source, /manifest\.json$/);
  const sumDir = path.join(TMP, "corp-summary");
  fs.mkdirSync(sumDir, { recursive: true });
  fs.writeFileSync(path.join(sumDir, "summary.json"), JSON.stringify({ languages: { c: { split_rule: "repo-hash(global)", leakage_risk: false, counts: { train: { files: 3, repos: 1 }, dev: { files: 2, repos: 1 }, test: { files: 1, repos: 1 } } } }, gaps: [] }));
  const s = languageList(sumDir);
  assert.deepEqual(s.languages, ["c"]);
  assert.match(s.source, /summary\.json$/);
  const d = dataPresence("c", sumDir);
  assert.equal(d.corpus.train.files, 3);
  // priors are other hands' files and appear over time: the claim is "agrees with the disk", never a snapshot of it
  const onDisk = (kind, n) => fs.existsSync(path.join(HERE, "..", "priors", `code-${kind}-${n}.json`));
  assert.equal(d.priors.kw, onDisk("kw", "c"));
  assert.equal(d.priors.name, onDisk("name", "c"));
  assert.equal(d.priors.name, true, "priors/code-name-c.json is a received prior");
  const py = dataPresence("python", sumDir);
  assert.equal(py.corpus, null, "a language outside this corpus has no corpus data");
  assert.equal(py.priors.kw, true, "python is served by the existing code-kw-py.json (alias py)");
  assert.equal(py.priors.name, true, "python is served by the existing code-name-py.json (alias py)");
  const none = dataPresence("zzz-not-a-language", sumDir);
  assert.deepEqual(none.priors, { kw: false, name: false, files: [] }, "no prior is claimed for a language that has none");
  assert.equal(none.authored_fixture, false);
  // no corpus at all: the authored fixtures are the fallback list, and the source says so
  const f = languageList(path.join(TMP, "nope"));
  assert.ok(f.languages.includes("python"));
  assert.match(f.source, /authored fixtures only/);
});

test("regression guard: counts pass/fail through quoted globs; a failing test is FAIL, a run of no tests is ERROR, never a pass; a nested run is skipped", async () => {
  const mkProject = (name, files) => {
    const d = path.join(TMP, name);
    for (const [rel, src] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.writeFileSync(path.join(d, rel), src); }
    fs.writeFileSync(path.join(d, "package.json"), JSON.stringify({ type: "module" }));
    return d;
  };
  const okSrc = (n) => `import test from "node:test";\nimport assert from "node:assert/strict";\ntest("${n} holds", () => { assert.equal(1, 1); });\n`;
  const badSrc = `import test from "node:test";\nimport assert from "node:assert/strict";\ntest("this one is built to fail", () => { assert.equal(1, 2); });\n`;
  const green = await regressionGuard({ cwd: mkProject("proj-green", { "conformance/a.test.mjs": okSrc("a"), "tests/b.test.js": okSrc("b") }), force: true });
  assert.equal(green.status, "pass", JSON.stringify(green));
  assert.equal(green.tests, 2);
  assert.equal(green.pass, 2);
  assert.equal(green.fail, 0);
  const red = await regressionGuard({ cwd: mkProject("proj-red", { "conformance/a.test.mjs": okSrc("a"), "tests/b.test.js": badSrc }), force: true });
  assert.equal(red.status, "fail", "the guard must be able to fail");
  assert.equal(red.fail, 1);
  assert.equal(red.pass, 1);
  assert.deepEqual(red.failing, ["this one is built to fail"]);
  const empty = await regressionGuard({ cwd: mkProject("proj-empty", { "README.md": "no tests here\n" }), force: true });
  assert.notEqual(empty.status, "pass", "a run that executes no tests proves nothing");
  assert.equal(empty.status, "error");
  // a nested run (started by a regression run) is skipped, never recursed into
  const saved = Object.fromEntries(["KHORA_CODING_RUNNING", "KHORA_COMPETENCE_RUNNING"].map((k) => [k, process.env[k]]));
  try {
    for (const k of Object.keys(saved)) delete process.env[k];
    process.env.KHORA_CODING_RUNNING = "1";
    const g = await regressionGuard();
    assert.equal(g.status, "skipped");
    assert.match(g.reason, /nested_run/);
    delete process.env.KHORA_CODING_RUNNING;
    process.env.KHORA_COMPETENCE_RUNNING = "1";
    assert.equal((await regressionGuard()).status, "skipped", "the competence aggregator's regression run is also a nesting");
  } finally { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } }
});

test("parseTap reads the node:test summary and the top-level failures; summarizeGuards never counts vacuous/partial as good", () => {
  const c = parseTap("ok 1 - a\nnot ok 2 - broken thing\n1..2\n# tests 2\n# suites 0\n# pass 1\n# fail 1\n# cancelled 0\n# skipped 0\n# todo 0\n");
  assert.deepEqual({ tests: c.tests, pass: c.pass, fail: c.fail, cancelled: c.cancelled }, { tests: 2, pass: 1, fail: 1, cancelled: 0 });
  assert.deepEqual(c.failing, ["broken thing"]);
  assert.equal(parseTap("garbage").tests, null);
  assert.equal(summarizeGuards([{ id: "a", status: "pass" }, { id: "b", status: "vacuous" }]).ok, null, "vacuous is not good");
  assert.equal(summarizeGuards([{ id: "a", status: "pass" }, { id: "b", status: "partial" }]).ok, null, "partial is not good");
  assert.equal(summarizeGuards([{ id: "a", status: "pass" }, { id: "b", status: "unlicensed" }]).ok, null);
  assert.equal(summarizeGuards([{ id: "a", status: "pass" }, { id: "b", status: "fail", scope: { language: "x" } }]).ok, false);
  assert.equal(summarizeGuards([{ id: "a", status: "error" }]).ok, false);
  assert.equal(summarizeGuards([{ id: "a", status: "pass" }]).ok, true);
  assert.equal(summarizeGuards([{ id: "a", status: "skipped" }, { id: "b", status: "pass" }]).ok, true);
  assert.equal(summarizeGuards([]).ok, null);
});

test("parseArgs: --language and --languages are comma lists, split defaults to dev, unknown flags and rungs are refused", () => {
  const a = parseArgs(["--language", "python,go", "--language", "c"]);
  assert.deepEqual(a.languages, ["python", "go", "c"]);
  assert.equal(a.split, "dev");
  assert.equal(a.all, false);
  const all = parseArgs(["--language", "all"]);
  assert.equal(all.all, true, "c3's own CLI says --language all");
  assert.deepEqual(all.languages, []);
  assert.equal(parseArgs(["--all", "--split", "test", "--json", "--rungs", "c0,c3", "--guards", "off"]).split, "test");
  assert.equal(parseArgs(["--all", "--split", "dev", "--limit", "10"]).limit, 10);
  assert.throws(() => parseArgs(["--split", "holdout"]), /--split must be/);
  assert.throws(() => parseArgs(["--rungs", "c9"]), /unknown rung/);
  assert.throws(() => parseArgs(["--bogus"]), /unknown argument/);
  assert.throws(() => parseArgs(["--language"]), /needs a value/);
  assert.throws(() => parseArgs(["--guards", "sometimes"]), /--guards must be/);
  assert.throws(() => parseArgs(["--limit", "0"]), /positive/);
  assert.throws(() => parseArgs(["--limit", "5", "--split", "test"]), /DEV smoke-test device/, "a limited TEST read would spend the held-out set on a sample");
  assert.equal(parseArgs(["--limit", "5"]).limit, 5, "limit on dev is fine");
});
