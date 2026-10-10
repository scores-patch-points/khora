// coding-c2: the INSTRUMENT of the C2 NAMES rung is checked on a TOY fixture. Nothing here measures khora on real code.
// A perfect system must score 1, a deranged control must score low, the majority baseline must score zero admission and a
// refusal precision equal to the base rate, the causal gate must be invariant to the future, and the pass rule must fail
// when a control is built to do as well as the real arm (II.23 / II.4). The toy language is AUTHORED by the model (python-
// shaped text, a hand tokenizer standing in for the gold): it is a test of the instrument, never held-out natural data.
// The one integration test reads a few DEV files (never test) and is skipped when gold or the corpus is absent.
// Amendments A6-A9 (2026-10-06): the V2 pass rule, the hand baselines (recipes, declKw), the frequency-matched T2 control, the
// khora-lexer arm and its causality licence, the gold pin and the TEST ledger are all checked here on AUTHORED toy fixtures;
// no TEST file is ever read by this suite (the one TEST-shaped call returns before any ledger or gold access).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  prepareFile, tallyFile, baseCounts, sumCounts, metricsOf, stratifiedBootstrap, flattenFile, f1Of, refMarginOf, derangeTables,
  shuffleUnitTexts, shuffleAllTexts, shuffleInPlace, mulberry32, fnv1a, selectFiles, testLedgerCheck, testLedgerComplete, testLedgerKey, testLedgerRead,
  derangedLanguageOf, LANGUAGES, CONSTS, MANIFEST, LEDGER_PATHS, DECL_KEYWORDS, declKwJudge, frequentSetOf, lexStreamOf, lexArmFile, checkLexCausality, sha256File,
} from "../eval/coding-competence/c2-lib.mjs";
import { deriveFromPrepared } from "../eval/coding-competence/build-c2-priors.mjs";
import { decidePass, decidePassV1, measure, RUNG, CONTROL_ARMS, predictionChecks, GOLD_PY_PIN, acquireTestRead } from "../eval/coding-competence/c2-names.mjs";
import { GOLD_PY } from "../eval/coding-competence/gold.mjs";
import { compareDefs } from "../eval/coding-competence/c2-gold-revalidate.mjs";
import { createNameGate, checkCausality, contextKeys, lexClass, isWordLike, PARAMS, LEVELS, loadNameGatePriors } from "../adapters/code/name-gate.js";
import { goldAvailable } from "../eval/coding-competence/gold.mjs";
import { auditRefusedWords } from "../eval/coding-competence/c2-engine-audit.mjs";

// ── the toy language (AUTHORED) ───────────────────────────────────────────────────────────────────────────────────
const KW = new Set(["def", "class", "return"]);
function toyGold(text) {
  const tokens = [];
  const re = /#[^\n]*|"[^"\n]*"|[A-Za-z_]\w*|\d+|[^\sA-Za-z_\d]/g;
  let m;
  while ((m = re.exec(text))) {
    const s = m[0];
    let cls;
    if (s.startsWith("#")) cls = "comment";
    else if (s.startsWith('"')) cls = "string";
    else if (/^\d/.test(s)) cls = "literal";
    else if (/^[A-Za-z_]/.test(s)) cls = KW.has(s) ? "keyword" : "identifier";
    else cls = "punctuation";
    tokens.push({ start: m.index, end: m.index + s.length, type: cls, class: cls });
  }
  const defs = [];
  for (let k = 0; k + 1 < tokens.length; k++) {
    const t = tokens[k], u = tokens[k + 1];
    const w = text.slice(t.start, t.end);
    if (t.class === "keyword" && (w === "def" || w === "class") && u.class === "identifier") defs.push({ kind: w === "def" ? "function" : "class", name: text.slice(u.start, u.end), start: u.start, end: u.end, nameStart: u.start, nameEnd: u.end, node: "toy" });
    if (t.class === "identifier" && /^[A-Z_]+$/.test(w) && text.slice(t.end).startsWith(" =")) defs.push({ kind: "constant", name: w, start: t.start, end: t.end, nameStart: t.start, nameEnd: t.end, node: "toy" });
  }
  return { tokens, defs };
}
const SAMPLE = `# a comment
def alpha(x):
    return beta(x)
class Gamma:
    def delta(self):
        return "def epsilon"
MAXV = 3
`;
function toyFile(repo, text) { return { repo, text, prepared: prepareFile(text, toyGold(text)) }; }
// a seeded random python-shaped program: every definition and every call target is a FRESH name (open class), the argument
// names (a, b, c, x, i) recur everywhere (they become settled non-names), the templates vary the neighbouring lexemes so the
// context tables have many keys
function toyProgram(prefix, n, seed = 1) {
  const rng = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const ARGS = ["a", "a, b", "", "a, b, c", "1", '"s"', "x"];
  let id = 0;
  const fresh = (tag) => `${prefix}${tag}${id++}`;
  const T = [
    () => `def ${fresh("f")}(${pick(ARGS)}):\n`,
    () => `class ${fresh("K")}:\n`,
    () => `    return ${fresh("g")}(${pick(ARGS)})\n`,
    () => `x = ${fresh("h")}(${pick(ARGS)})\n`,
    () => `if ${fresh("p")}(${pick(ARGS)}):\n`,
    () => `for i in ${fresh("r")}(${pick(ARGS)}):\n`,
    () => `while ${fresh("w")}:\n`,
    () => `${fresh("c")}(${pick(ARGS)})\n`,
    () => `else:\n`,
  ];
  let t = "";
  for (let i = 0; i < n; i++) t += pick(T)();
  return t;
}

// ── prepareFile: gold -> units ────────────────────────────────────────────────────────────────────────────────────
test("prepareFile: comments are dropped from the stream, strings are not units, labels follow the gold defs", () => {
  const p = prepareFile(SAMPLE, toyGold(SAMPLE));
  assert.ok(!p.stream.some((s) => s.startsWith("#")), "comments are not part of the reader's stream");
  const lab = Object.fromEntries(p.units.map((u) => [p.stream[u.i], u.label]));
  assert.equal(lab.alpha, "core");
  assert.equal(lab.Gamma, "core");
  assert.equal(lab.delta, "core");
  assert.equal(lab.def, "none", "a keyword is a unit and a non-name");
  assert.equal(lab.beta, "none", "a call target is a non-name");
  assert.equal(lab.MAXV, "secondary", "a value-level definition is neutral, not a being");
  assert.ok(!p.units.some((u) => p.stream[u.i].startsWith('"')), "string lexemes are never units (the 'def epsilon' inside the string is not scored)");
  assert.equal(p.defsOutsideUnits, 0);
});

test("prepareFile: a def whose name token is not word-like is a counted gap, never silently dropped", () => {
  const text = "x == y\n";
  const g = { tokens: [{ start: 0, end: 1, class: "identifier" }, { start: 2, end: 4, class: "operator" }, { start: 5, end: 6, class: "identifier" }], defs: [{ kind: "method", name: "==", nameStart: 2, nameEnd: 4, start: 2, end: 4 }] };
  const p = prepareFile(text, g);
  assert.equal(p.defsOutsideUnits, 1);
  assert.equal(p.units.filter((u) => u.label === "core").length, 0);
});

// ── the metrics: perfect scores 1, deranged scores low, majority scores nothing ───────────────────────────────────────
function armTotals(files, verdictOfFile) {
  const per = files.map((f) => tallyFile(f.prepared, verdictOfFile(f)));
  const base = sumCounts(files.map((f) => baseCounts(f.prepared)));
  return { counts: sumCounts(per), base, metrics: metricsOf(sumCounts(per), base) };
}
const TOY_DEV = [toyFile("dev/a", toyProgram("p", 500, 11)), toyFile("dev/b", toyProgram("q", 500, 12))];

test("a perfect system scores 1 on admission and 1 on refusal", () => {
  const r = armTotals(TOY_DEV, () => (u) => (u.label === "core" ? "admit" : u.label === "none" ? "refuse" : null));
  assert.equal(r.metrics.admit.f1, 1);
  assert.equal(r.metrics.admit.precision, 1);
  assert.equal(r.metrics.admit.recall, 1);
  assert.equal(r.metrics.refuse.precision, 1);
  assert.equal(r.metrics.refuse.coverage, 1);
});

test("the majority baseline: F1 0, refusal precision equals the base rate of non-names (so 'above base rate' is a real bar)", () => {
  const r = armTotals(TOY_DEV, () => () => "refuse");
  assert.equal(r.metrics.admit.f1, 0);
  const baseRate = r.base.none / r.base.U;
  assert.ok(Math.abs(r.metrics.refuse.precision - baseRate) < 1e-12 + (r.base.secondary / r.base.U), "all-refuse precision is the base rate (secondary defs are errors too, none here)");
  assert.ok(baseRate > 0.5 && baseRate < 1);
});

test("a deranged oracle (the labels permuted at random within each file) scores low", () => {
  const r = armTotals(TOY_DEV, (f) => {
    const labels = f.prepared.units.map((u) => u.label);
    shuffleInPlace(labels, mulberry32(fnv1a(f.repo)));
    return (_u, k) => (labels[k] === "core" ? "admit" : labels[k] === "none" ? "refuse" : null);
  });
  assert.ok(r.metrics.admit.f1 < 0.2, `deranged F1 ${r.metrics.admit.f1}`);
  assert.ok(r.metrics.refuse.margin < 0.01, "a deranged refuser is no better than the base rate");
});

test("noPrior (admit the unseen) scores 2b/(1+b) with b the core rate: low, and the real reader must beat it", () => {
  const r = armTotals(TOY_DEV, () => () => "admit");
  const b = r.base.core / (r.base.core + r.base.none);
  assert.ok(Math.abs(r.metrics.admit.f1 - (2 * b) / (1 + b)) < 0.02);
  assert.equal(r.metrics.refuse.n, 0);
});

// ── the gate on the toy language: learn from toy TRAIN, read toy DEV ─────────────────────────────────────────────────
const TOY_TRAIN = [toyFile("train/x", toyProgram("t", 1500, 21)), toyFile("train/y", toyProgram("u", 1500, 22))];
const derived = deriveFromPrepared(TOY_TRAIN, KW);
const toyPriors = {
  kw: { set: KW },
  settled: derived.settledSet,
  closed: derived.closed,
  tables: Object.fromEntries(Object.entries(derived.tables).map(([k, rows]) => [k, new Map(Object.entries(rows))])),
  nameDecl: null,
};

test("deriveFromPrepared: words that recur and are never declared become settled non-names; tables keep only rows with enough support", () => {
  assert.ok(derived.settledSet.has("a") && derived.settledSet.has("b") && derived.settledSet.has("x"));
  assert.ok(!derived.settledSet.has("tf0"), "a name seen once is open class");
  assert.ok(!derived.settledSet.has("def"), "keywords are the received class, not re-derived as settled");
  for (const rows of Object.values(derived.tables)) for (const [, [d, n]] of Object.entries(rows)) { assert.ok(n >= PARAMS.N_MIN_CTX); assert.ok(d <= n); }
  assert.ok(Object.keys(derived.tables.p2p1n1).length > 0);
});

function gateF1(gate, files, streamOf = (f) => f.prepared.stream) {
  const per = files.map((f) => { const s = streamOf(f); return tallyFile(f.prepared, (u) => gate.judge(s, u.i).verdict); });
  const base = sumCounts(files.map((f) => baseCounts(f.prepared)));
  return metricsOf(sumCounts(per), base);
}

test("the S1 gate reads held-out toy files well, and so does S0 here because the toy introducer (`def`/`class`) precedes the name", () => {
  const m1 = gateF1(createNameGate(toyPriors, { H: 1 }), TOY_DEV);
  assert.ok(m1.admit.f1 >= 0.95, `S1 F1 ${m1.admit.f1}`);
  assert.ok(m1.refuse.precision >= 0.999);
  const m0 = gateF1(createNameGate(toyPriors, { H: 0 }), TOY_DEV);
  assert.ok(m0.admit.f1 >= 0.9, `S0 F1 ${m0.admit.f1}`);
});

test("controls built to fail: a deranged table and shuffled unit texts move the statistic (licence), the closed-class ablation collapses admission", () => {
  const real = gateF1(createNameGate(toyPriors, { H: 1 }), TOY_DEV);
  const dTables = derangeTables(toyPriors.tables, 7);
  const dt = gateF1(createNameGate({ ...toyPriors, tables: dTables }, { H: 1 }), TOY_DEV);
  assert.ok(dt.admit.f1 <= 0.5 * real.admit.f1, `derangedTable F1 ${dt.admit.f1} vs real ${real.admit.f1}`);
  const rng = mulberry32(3);
  const sh = TOY_DEV.map((f) => shuffleUnitTexts(f.prepared, rng));
  const shuffled = (() => {
    const per = TOY_DEV.map((f, k) => tallyFile(f.prepared, (u) => createNameGate(toyPriors, { H: 1 }).judge(sh[k], u.i).verdict));
    return metricsOf(sumCounts(per), sumCounts(TOY_DEV.map((f) => baseCounts(f.prepared))));
  })();
  assert.ok(shuffled.admit.f1 <= 0.5 * real.admit.f1, `shuffled F1 ${shuffled.admit.f1}`);
  assert.ok(shuffled.refuse.margin <= 0.5 * real.refuse.margin, "shuffling moves the refusal margin too: keyword refusal is tied to real positions");
  const ablated = gateF1(createNameGate({ kw: { set: null }, settled: new Set(), closed: new Set(), tables: toyPriors.tables, nameDecl: null }, { H: 1 }), TOY_DEV);
  assert.ok(ablated.admit.f1 <= 0.5 * real.admit.f1, `ablated F1 ${ablated.admit.f1}`);
});

test("the gate is causal: the verdict at i is unchanged by truncating or garbling everything beyond i+H", () => {
  const f = TOY_DEV[0];
  const idx = f.prepared.units.map((u) => u.i);
  for (const H of [0, 1]) {
    const gate = createNameGate(toyPriors, { H });
    const r = checkCausality(gate, f.prepared.stream, idx);
    assert.equal(r.checked, idx.length);
    assert.deepEqual(r.mismatches, []);
  }
});

test("H matters: S1 sees exactly one lexeme to the right of the unit, S0 sees none", () => {
  const s = ["x", "=", "foo", "(", "1", ")"];
  const withParen = ["def", "foo", "(", "a", ")"];
  const withoutParen = ["def", "foo", ":", "a"];
  const g1 = createNameGate(toyPriors, { H: 1 });
  const g0 = createNameGate(toyPriors, { H: 0 });
  // S0 answer identical whatever follows the unit
  assert.equal(g0.judge(withParen, 1).verdict, g0.judge(withoutParen, 1).verdict);
  // keys: S1 includes the right neighbour, S0 does not
  const k1 = contextKeys(withParen, 1, toyPriors.closed, 1), k0 = contextKeys(withParen, 1, toyPriors.closed, 0);
  assert.ok("p1n1" in k1 && !("p1n1" in k0));
  assert.notEqual(contextKeys(withParen, 1, toyPriors.closed, 1).p2p1n1, contextKeys(withoutParen, 1, toyPriors.closed, 1).p2p1n1);
  void s;
});

test("priors REFUSE or NOMINATE, never admit: a keyword is refused whatever the context says; no prior => nothing is refused (the unseen is admitted by the noPrior arm, not by the gate)", () => {
  const gate = createNameGate(toyPriors, { H: 1 });
  assert.equal(gate.judge(["x", "def", "y"], 1).verdict, "refuse");
  assert.equal(gate.judge(["x", "def", "y"], 1).basis, "keyword");
  const bare = createNameGate({ kw: { set: null }, settled: new Set(), closed: new Set(), tables: {}, nameDecl: null }, { H: 1 });
  assert.equal(bare.judge(["def", "foo", "("], 1).verdict, "unsettled", "with no prior the gate leaves everything unsettled; it neither refuses nor admits");
});

test("name nomination (S1N) only fires for words attested in >= NAME_FLOOR TRAIN repositories", () => {
  const nameDecl = new Map([["foo", 3], ["bar", 1]]);
  const gate = createNameGate({ ...toyPriors, tables: {}, nameDecl }, { H: 1, nominateNames: true });
  assert.equal(gate.judge(["x", "foo"], 1).verdict, "admit");
  assert.equal(gate.judge(["x", "bar"], 1).verdict, "unsettled");
});

test("lexClass / isWordLike: closed-class words keep their text, other words are ID, strings STR, numbers NUM, punctuation itself", () => {
  const closed = new Set(["def"]);
  assert.equal(lexClass("def", closed), "def");
  assert.equal(lexClass("foo", closed), "ID");
  assert.equal(lexClass('"x"', closed), "STR");
  assert.equal(lexClass("f'x'", closed), "STR");
  assert.equal(lexClass("42", closed), "NUM");
  assert.equal(lexClass("(", closed), "(");
  assert.equal(lexClass("valid?", closed), "ID");
  assert.ok(isWordLike("_x") && isWordLike("$el") && isWordLike("δ") && !isWordLike("9a") && !isWordLike("(") && !isWordLike("@x"));
});


test("diagnostic shuffledAll destroys the punctuation skeleton too: it collapses a skeleton-driven reader that the unit-text shuffle leaves standing", () => {
  // a skeleton-only reader: admits a unit iff its context is `ID ( ... ` after an ID, whatever the words are
  const skeleton = { judge: (stream, i) => (/^[(]$/.test(stream[i + 1] ?? "") && /^[A-Za-z_]/.test(stream[i - 1] ?? "") ? { verdict: "admit", basis: "skeleton" } : { verdict: "unsettled", basis: "x" }) };
  const per = (streamOf) => { const c = TOY_DEV.map((f, k) => tallyFile(f.prepared, (u) => skeleton.judge(streamOf(f, k), u.i).verdict)); return metricsOf(sumCounts(c), sumCounts(TOY_DEV.map((f) => baseCounts(f.prepared)))); };
  const real = per((f) => f.prepared.stream);
  const rng1 = mulberry32(5), rng2 = mulberry32(5);
  const unitShuf = TOY_DEV.map((f) => shuffleUnitTexts(f.prepared, rng1));
  const allShuf = TOY_DEV.map((f) => shuffleAllTexts(f.prepared, rng2));
  const a = per((f, k) => unitShuf[k]), b = per((f, k) => allShuf[k]);
  assert.ok(real.admit.f1 > 0.3, `skeleton reader F1 ${real.admit.f1}`);
  assert.ok(Math.abs(a.admit.f1 - real.admit.f1) < 0.05, "shuffling unit texts leaves a skeleton reader exactly where it was");
  assert.ok(b.admit.f1 < 0.5 * real.admit.f1, `shuffling everything moves it: ${b.admit.f1} vs ${real.admit.f1}`);
});

test("engine audit: languages without an engine here are a typed gap, never a pass; python (when present) rejects its hard keywords as declaration names", async () => {
  for (const lang of ["java", "go"]) {
    const a = await auditRefusedWords(lang, ["class", "int"]);
    assert.equal(a.available, false);
    assert.match(a.reason, /no engine/);
  }
  const py = fs.existsSync(process.env.GOLD_PYTHON || "/private/tmp/claude-501/venv/bin/python");
  if (py) {
    const a = await auditRefusedWords("python", ["def", "class", "if", "None", "match", "type"], { settledWords: ["self", "int"] });
    assert.equal(a.available, true);
    assert.ok(a.acceptedAsFunctionName.includes("match") && a.acceptedAsFunctionName.includes("type"), "soft keywords are declarable");
    assert.ok(!a.acceptedAsFunctionName.includes("def") && !a.acceptedAsFunctionName.includes("None"), "hard keywords are not");
    assert.ok(a.missedByPrior.tested >= 1);
  }
});

test("engine audit: node rejects hard keywords as function names but accepts them as member names (the T1 claim is form-dependent)", async () => {
  const a = await auditRefusedWords("javascript", ["if", "function", "get", "of", "delete"]);
  assert.equal(a.available, true);
  assert.ok(!a.acceptedAsFunctionName.includes("if") && !a.acceptedAsFunctionName.includes("function"));
  assert.ok(a.acceptedAsFunctionName.includes("get") && a.acceptedAsFunctionName.includes("of"), "contextual words can name a function");
  assert.ok(a.acceptedAsMemberName.includes("if") && a.acceptedAsMemberName.includes("delete"), "any word can name a method");
});

// ── the pass rule ───────────────────────────────────────────────────────────────────────────────────────────────────
const GOOD_V1 = {
  base: { U: 10000, core: 400, none: 9400 },
  refused: 5000,
  boot: { refMarginS1: { p5: 0.01 }, f1DeltaNoPrior: { p5: 0.5 } },
  perRepo: [{ repo: "a", core: 100, f1S1: 0.8, f1NoPrior: 0.1 }, { repo: "b", core: 300, f1S1: 0.9, f1NoPrior: 0.1 }, { repo: "c", core: 3, f1S1: 0, f1NoPrior: 0.5 }],
  f1: { S1: 0.85, deranged: 0.05, derangedTable: 0.1, shuffled: 0.1 },
  refMargin: { S1: 0.02, shuffled: 0.0 },
};
test("decidePassV1 (the ORIGINAL rule, still reported as passV1): passes when refusal beats the base rate, F1 beats noPrior in every sizeable repo, and the controls fail", () => {
  const r = decidePassV1(GOOD_V1);
  assert.equal(r.pass, true);
  assert.deepEqual(r.reasons, []);
});
test("decidePassV1 (the ORIGINAL rule, still reported as passV1): a control that does as well as the real arm voids the pass (instrument or mechanism broken, never 'good')", () => {
  const r = decidePassV1({ ...GOOD_V1, f1: { ...GOOD_V1.f1, shuffled: 0.8 } });
  assert.equal(r.pass, false);
  assert.equal(r.C.ok, false);
  assert.match(r.reasons.join(" "), /licence/);
});
test("decidePassV1 (the ORIGINAL rule, still reported as passV1): failing one repo, or a refusal margin whose 5th percentile is not above zero, fails", () => {
  assert.equal(decidePassV1({ ...GOOD_V1, perRepo: [{ repo: "a", core: 100, f1S1: 0.05, f1NoPrior: 0.1 }, GOOD_V1.perRepo[1]] }).pass, false);
  assert.equal(decidePassV1({ ...GOOD_V1, boot: { ...GOOD_V1.boot, refMarginS1: { p5: -0.001 } } }).pass, false);
  assert.equal(decidePassV1({ ...GOOD_V1, boot: { ...GOOD_V1.boot, f1DeltaNoPrior: { p5: 0 } } }).pass, false);
});
test("decidePassV1 (the ORIGINAL rule, still reported as passV1): too few refusals or too few core units is a typed null, never a pass", () => {
  assert.equal(decidePassV1({ ...GOOD_V1, refused: 10 }).pass, null);
  assert.equal(decidePassV1({ ...GOOD_V1, base: { ...GOOD_V1.base, core: 50 } }).pass, null);
});

// ── PASS RULE V2 (amendment A6) ─────────────────────────────────────────────────────────────────────────────────────────────
const GOOD_V2 = {
  base: { U: 10000, core: 400, none: 9400 },
  t2Refused: 5000,
  freqAvailable: true,
  boot: {
    refMarginT2: { p5: 0.01 }, refPrecDeltaFreq: { p5: 0.002 }, f1DeltaAblated: { p5: 0.2 }, f1DeltaNoPrior: { p5: 0.5 }, f1DeltaKwAdmitRest: { p5: 0.5 },
    f1DeltaRecipes: { p5: 0.05 }, f1DeltaDeclKw: { p5: 0.04 },
  },
  perRepo: [{ repo: "a", core: 100, f1S1: 0.9, f1Ablated: 0.5 }, { repo: "b", core: 300, f1S1: 0.88, f1Ablated: 0.6 }, { repo: "c", core: 3, f1S1: 0, f1Ablated: 0.5 }],
  f1: { S1: 0.9, deranged: 0.05, derangedTable: 0.1, shuffled: 0.1, ablated: 0.6 },
  refMargin: { S1: 0.02, shuffled: 0.0 },
  hand: { recipes: true, declKw: true },
};
test("decidePass V2: passes when T2 beats the base rate AND the frequency-matched control, S1 beats ablated and every hand baseline, and the controls fail", () => {
  const r = decidePass(GOOD_V2);
  assert.equal(r.pass, true);
  assert.deepEqual(r.reasons, []);
  assert.match(r.claims.learnedPriorsHelp, /^supported/);
});
test("decidePass V2: a hand baseline that does as well as the reader fails D and says plainly that 'learned priors help' is NOT SUPPORTED (python)", () => {
  const r = decidePass({ ...GOOD_V2, boot: { ...GOOD_V2.boot, f1DeltaRecipes: { p5: -0.0074 }, f1DeltaDeclKw: { p5: -0.0074 } } });
  assert.equal(r.pass, false);
  assert.equal(r.D.ok, false);
  assert.match(r.claims.learnedPriorsHelp, /NOT SUPPORTED/);
  assert.match(r.reasons.join(" "), /hand baseline/);
});
test("decidePass V2: a language with no recipe is judged against declKw alone (the hand baseline stands in); declKw failing fails D", () => {
  const ok = decidePass({ ...GOOD_V2, hand: { recipes: false, declKw: true }, boot: { ...GOOD_V2.boot, f1DeltaRecipes: null } });
  assert.equal(ok.pass, true);
  assert.equal(ok.D.baselines.recipes.available, false);
  const bad = decidePass({ ...GOOD_V2, hand: { recipes: false, declKw: true }, boot: { ...GOOD_V2.boot, f1DeltaRecipes: null, f1DeltaDeclKw: { p5: 0 } } });
  assert.equal(bad.pass, false);
});
test("decidePass V2: A2 needs the T2 tier to beat the FREQUENCY-MATCHED control, not just the base rate (the old rule A is carried by T1 and the base rate)", () => {
  const r = decidePass({ ...GOOD_V2, boot: { ...GOOD_V2.boot, refPrecDeltaFreq: { p5: -0.0001 } } });
  assert.equal(r.pass, false);
  assert.equal(r.A2.ok, false);
  assert.match(r.reasons.join(" "), /frequency-matched control/);
  // base rate alone is not enough either
  assert.equal(decidePass({ ...GOOD_V2, boot: { ...GOOD_V2.boot, refMarginT2: { p5: -0.001 } } }).pass, false);
});
test("decidePass V2: A2 is unmeasurable (pass null, never true) with too few T2-only refusals or with no frequency-matched control", () => {
  assert.equal(decidePass({ ...GOOD_V2, t2Refused: 10 }).pass, null);
  assert.equal(decidePass({ ...GOOD_V2, freqAvailable: false }).pass, null);
});
test("decidePass V2: B2 compares against `ablated`: p5 > 0, ratio <= 0.9, and every sizeable repo; noPrior/kwAdmitRest are floors only", () => {
  assert.equal(decidePass({ ...GOOD_V2, boot: { ...GOOD_V2.boot, f1DeltaAblated: { p5: -0.01 } } }).B2.ok, false);
  const high = decidePass({ ...GOOD_V2, f1: { ...GOOD_V2.f1, ablated: 0.85 } });
  assert.equal(high.B2.ratioOk, false, "ablated 0.85 > 0.9 * 0.9 = 0.81");
  assert.equal(high.pass, false);
  assert.equal(decidePass({ ...GOOD_V2, perRepo: [{ repo: "a", core: 100, f1S1: 0.4, f1Ablated: 0.5 }, GOOD_V2.perRepo[1]] }).pass, false, "one sizeable repo where S1 does not beat ablated");
  assert.equal(decidePass({ ...GOOD_V2, boot: { ...GOOD_V2.boot, f1DeltaNoPrior: { p5: 0 } } }).B2.floorsOk, false, "a floor not beaten");
  assert.equal(decidePass({ ...GOOD_V2, base: { ...GOOD_V2.base, core: 50 } }).pass, null);
});
test("decidePass V2: licence C2 includes ablated <= ABLATED_RATIO * F1(S1); a control that does as well as the reader voids the pass (never 'good')", () => {
  const r = decidePass({ ...GOOD_V2, f1: { ...GOOD_V2.f1, shuffled: 0.8 } });
  assert.equal(r.pass, false);
  assert.equal(r.C2.f1Ok, false);
  const a = decidePass({ ...GOOD_V2, f1: { ...GOOD_V2.f1, ablated: 0.89 } });
  assert.equal(a.C2.ablatedOk, false);
  assert.equal(a.pass, false);
  assert.equal(CONSTS.ABLATED_RATIO, 0.9);
});

// ── the hand baseline declKw and the frequency-matched control (A6) ───────────────────────────────────────────────────────────
test("declKw: admits a word iff the previous lexeme is a declarator keyword and the word is not a hard keyword; refuses nothing; causal (H = 0)", () => {
  const decl = new Set(DECL_KEYWORDS.python), kw = new Set(["def", "class", "return"]);
  const s = ["def", "alpha", "(", ")", "class", "Gamma", ":", "x", "=", "beta"];
  assert.equal(declKwJudge(s, 1, decl, kw).verdict, "admit");
  assert.equal(declKwJudge(s, 5, decl, kw).verdict, "admit");
  assert.equal(declKwJudge(s, 9, decl, kw).verdict, "unsettled");
  assert.equal(declKwJudge(["class", "def"], 1, decl, kw).verdict, "unsettled", "a hard keyword is never a name");
  assert.equal(declKwJudge(s, 0, decl, kw).verdict, "unsettled");
  // causal: nothing after the unit is read
  assert.deepEqual(declKwJudge(s, 1, decl, kw), declKwJudge(s.slice(0, 2), 1, decl, kw));
  // the declared sets (c2-names.mjs A6(a)) are exactly these
  assert.deepEqual({ ...DECL_KEYWORDS }, { python: ["def", "class"], javascript: ["function", "class"], c: ["struct", "union", "enum"], go: ["func", "type"], ruby: ["def", "class", "module"], java: ["class", "interface", "enum"] });
});
test("declKw on the toy corpus: reads every name that follows def/class and nothing else (a hand baseline a learned reader must beat on languages where the introducer precedes the name)", () => {
  const per = TOY_DEV.map((f) => tallyFile(f.prepared, (u) => declKwJudge(f.prepared.stream, u.i, new Set(["def", "class"]), KW).verdict));
  const m = metricsOf(sumCounts(per), sumCounts(TOY_DEV.map((f) => baseCounts(f.prepared))));
  assert.ok(m.admit.f1 >= 0.99, `declKw F1 ${m.admit.f1}`);
  assert.equal(m.refuse.n, 0);
});
test("frequentSetOf: the top-K most frequent non-keyword words, IGNORING whether they are ever definitions; repository and occurrence floors still apply", () => {
  const stat = new Map([
    ["get", { occ: 900, repos: new Set(["r1", "r2", "r3"]) }],      // frequent AND a definition elsewhere: the settled tier would drop it, the control keeps it
    ["self", { occ: 800, repos: new Set(["r1", "r2"]) }],
    ["def", { occ: 5000, repos: new Set(["r1", "r2"]) }],           // a keyword: never part of the control
    ["onlyOneRepo", { occ: 700, repos: new Set(["r1"]) }],          // fails the repository floor
    ["rare", { occ: 50, repos: new Set(["r1", "r2"]) }],            // fails the occurrence floor
    ["len", { occ: 400, repos: new Set(["r1", "r2"]) }],
  ]);
  const top2 = frequentSetOf(stat, new Set(["def"]), 2, { minOcc: 100, minRepos: 2 });
  assert.deepEqual([...top2].sort(), ["get", "self"]);
  assert.equal(frequentSetOf(stat, new Set(["def"]), 10, { minOcc: 100, minRepos: 2 }).size, 3, "only get, self, len qualify");
  // against the toy TRAIN derivation: K = settled count; the control and the settled set have the same size, and the control is frequency-only
  const K = derived.settled.length;
  const fs2 = frequentSetOf(derived.stat, KW, K, { minOcc: PARAMS.SETTLED_MIN_OCC, minRepos: PARAMS.SETTLED_MIN_REPOS });
  assert.ok(fs2.size <= K);
  for (const w of fs2) assert.ok(derived.stat.get(w).occ >= PARAMS.SETTLED_MIN_OCC && !KW.has(w));
});

// ── khora's own lexer as the segmentation (A7) ─────────────────────────────────────────────────────────────────────────────
function toyLex(text, { merge = false, peek = false } = {}) {
  const re = /#[^\n]*|"[^"\n]*"|[A-Za-z_]\w*|\d+|[^\sA-Za-z_\d]/g;
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    const sstr = m[0];
    let cls = sstr.startsWith("#") ? "comment" : sstr.startsWith('"') ? "string" : /^\d/.test(sstr) ? "literal" : /^[A-Za-z_]/.test(sstr) ? "identifier" : "punctuation";
    let end = m.index + sstr.length;
    if (merge && cls === "identifier" && sstr === "def") { re.lastIndex = end; const nx = /^[ ]+[A-Za-z_]\w*/.exec(text.slice(end)); if (nx) { end += nx[0].length; re.lastIndex = end; cls = "identifier"; } }
    if (peek && cls === "identifier") cls = text.includes("ZZZ") ? "late" : "early"; // a MUTANT: the class of an early lexeme depends on text at the very end of the file
    out.push({ start: m.index, end, class: cls });
  }
  return out;
}
test("lexArmFile: with identical segmentation the lexer arm scores exactly as the gold-segmented arm; nothing is lost or invented", () => {
  const gate = createNameGate(toyPriors, { H: 1 });
  for (const f of TOY_DEV) {
    const text = f.text;
    const lex = lexStreamOf(text, toyLex(text));
    assert.deepEqual(lex.stream, f.prepared.stream, "comments dropped, same lexeme texts");
    const r = lexArmFile(f.prepared, lex, (st, i) => gate.judge(st, i));
    const ref = tallyFile(f.prepared, (u) => gate.judge(f.prepared.stream, u.i).verdict);
    assert.deepEqual(r.counts, ref);
    assert.equal(r.seg.unmatchedGold, 0);
    assert.equal(r.seg.extras, 0);
  }
});
test("lexArmFile: a segmentation error is a COUNTED miss (the gold unit is unsettled) and the mis-segmented lexeme is an EXTRA, never silently absorbed", () => {
  const gate = createNameGate(toyPriors, { H: 1 });
  const f = toyFile("dev/seg", "def alpha(x):\n    return beta(x)\nclass Gamma:\n    def delta(self):\n        return 1\n");
  const bad = lexStreamOf(f.text, toyLex(f.text, { merge: true })); // `def alpha` lexed as ONE lexeme
  const r = lexArmFile(f.prepared, bad, (st, i) => gate.judge(st, i));
  assert.ok(r.seg.unmatchedGold >= 2, `unmatched gold ${r.seg.unmatchedGold}`);
  assert.ok(r.seg.unmatchedGoldCore >= 2, "the merged-away names are core units that are now missed");
  assert.ok(r.seg.extras >= 2, "the merged lexemes are extras");
  const good = lexArmFile(f.prepared, lexStreamOf(f.text, toyLex(f.text)), (st, i) => gate.judge(st, i));
  const m = (c) => metricsOf(c, baseCounts(f.prepared));
  assert.ok(m(r.counts).admit.recall < m(good.counts).admit.recall, "a worse segmentation costs recall: the segmentation leak is measurable");
});
test("lexArmFile control built to fail (A10): a FOREIGN lexer (whitespace-delimited runs, the wrong segmentation) collapses the arm that the right lexer leaves standing", () => {
  const gate = createNameGate(toyPriors, { H: 1 });
  const wsLex = (text) => { const out = []; const re = /\S+/g; let m; while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length, class: m[0].startsWith("#") ? "comment" : "identifier" }); return out; };
  const per = (lexer) => { const c = TOY_DEV.map((f) => lexArmFile(f.prepared, lexStreamOf(f.text, lexer(f.text)), (st, i) => gate.judge(st, i)).counts); return metricsOf(sumCounts(c), sumCounts(TOY_DEV.map((f) => baseCounts(f.prepared)))); };
  const real = per((t) => toyLex(t)), foreign = per(wsLex);
  assert.ok(real.admit.f1 >= 0.95, `real lexer F1 ${real.admit.f1}`);
  assert.ok(foreign.admit.f1 <= 0.5 * real.admit.f1, `foreign lexer F1 ${foreign.admit.f1} vs ${real.admit.f1}`);
});
test("checkLexCausality: a causal lexer passes; a lexer whose early lexemes depend on text at the END of the file is caught (clean 0 mismatches, mutant > 0)", () => {
  const text = "def alpha(x):\n    return beta(x)\nclass Gamma:\n    pass\nZZZ\n";
  const idx = [2, 5, 8, 12, 15];
  const clean = checkLexCausality(text, toyLex(text), (t) => toyLex(t), idx);
  assert.equal(clean.mismatches.length, 0);
  assert.equal(clean.checked, idx.length);
  const mutant = checkLexCausality(text, toyLex(text, { peek: true }), (t) => toyLex(t, { peek: true }), idx);
  assert.ok(mutant.mismatches.length > 0, "the licence moves under a built-to-fail lexer");
  assert.equal(mutant.mismatches[0].which, "truncated");
});

// ── bootstrap, ledger, selection ─────────────────────────────────────────────────────────────────────────────────────
test("stratifiedBootstrap is deterministic, paired and sees an all-positive paired difference as positive", () => {
  const files = [];
  for (const repo of ["r1", "r2"]) for (let i = 0; i < 12; i++) {
    const base = { U: 100, core: 10, secondary: 0, none: 90 };
    const real = { adm: 10, tp: 9, fp: 1, sec: 0, ref: 50, refNone: 50, refCore: 0, refSec: 0 };
    const nop = { adm: 100, tp: 10, fp: 90, sec: 0, ref: 0, refNone: 0, refCore: 0, refSec: 0 };
    files.push({ repo, v: flattenFile(base, { S1: real, noPrior: nop }) });
  }
  const stat = (s) => ({ d: f1Of(s, "S1") - f1Of(s, "noPrior"), rm: refMarginOf(s, "S1") });
  const a = stratifiedBootstrap(files, stat, { B: 200, seed: 5 });
  const b = stratifiedBootstrap(files, stat, { B: 200, seed: 5 });
  assert.deepEqual(a, b);
  assert.ok(a.d.p5 > 0.5);
  assert.ok(a.rm.p5 > 0);
});

// ── the TEST-once ledger (amendment A9) ─────────────────────────────────────────────────────────────────────────────────
function tmpDir(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `c2-${tag}-`)); }

test("A9 ledger: one TEST read per reader; an entry in ANY of the fixed places blocks, a repeat needs a stated reason and is flagged", () => {
  const d = tmpDir("ledger");
  const paths = [path.join(d, "a", "ledger.json"), path.join(d, "b", "ledger.json")];
  const first = testLedgerCheck(paths, "k1", { language: "python", meta: { language: "python" } });
  assert.equal(first.allowed, true);
  assert.equal(first.repeat, false);
  assert.ok(paths.every((p) => JSON.parse(fs.readFileSync(p, "utf8")).k1?.state === "started"), "the entry is written to EVERY ledger place, state `started`, before anything is measured");
  const second = testLedgerCheck(paths, "k1", { language: "python" });
  assert.equal(second.allowed, false);
  assert.ok(second.previous?.at);
  // deleting one of the two places does not re-open TEST: the other still holds
  fs.rmSync(paths[0]);
  assert.equal(testLedgerCheck(paths, "k1", { language: "python" }).allowed, false, "an entry in either place blocks");
  // a repeat needs a reason of >= REPEAT_REASON_MIN characters
  assert.equal(testLedgerCheck(paths, "k1", { repeatReason: "short" }).allowed, false);
  assert.equal(testLedgerCheck(paths, "k1", { repeatReason: true }).allowed, false, "C2_TEST_REPEAT=1 style bypass is gone: a boolean is not a reason");
  const rep = testLedgerCheck(paths, "k1", { repeatReason: "rerun after the lexer prior was rebuilt (authored test reason)", language: "python" });
  assert.equal(rep.allowed, true);
  assert.equal(rep.repeat, true);
  assert.equal(JSON.parse(fs.readFileSync(paths[1], "utf8")).k1.repeats.length, 1, "the repeat and its reason are appended to the entry");
  // another key (another reader) for the same language is allowed and is reported as an earlier read of this language
  const other = testLedgerCheck(paths, "k2", { language: "python", meta: { language: "python" } });
  assert.equal(other.allowed, true);
  assert.deepEqual(other.previousKeysForLanguage, ["k1"], "a second TEST read of the same language under other priors is visible (firstLook false)");
  assert.equal(testLedgerCheck(paths, "k3", { language: "c" }).previousKeysForLanguage.length, 0);
  // completion
  const done = testLedgerComplete(paths, "k2", { resultDigest: "abc" });
  assert.equal(done.ok, true);
  assert.equal(testLedgerRead(paths).k2.state, "completed");
});

test("A9 ledger: a write failure is FATAL (nothing may be measured without a durable record), never swallowed", () => {
  const d = tmpDir("ledger-fail");
  const blocker = path.join(d, "file");
  fs.writeFileSync(blocker, "x");
  const r = testLedgerCheck([path.join(blocker, "sub", "ledger.json")], "k", { language: "python" });
  assert.equal(r.allowed, false);
  assert.match(r.error, /^ledger-unwritable:/);
  // record:false is a read-only probe and never fails on an unwritable place
  assert.equal(testLedgerCheck([path.join(blocker, "sub", "ledger.json")], "k", { record: false }).allowed, true);
});

test("A9 ledger key: a function of the shipped TRAIN priors and the language's manifest rows, NOT of the instrument source or its comments", () => {
  const d = tmpDir("key");
  const f1p = path.join(d, "code-ctx-py.json"), f2p = path.join(d, "code-kw-py.json");
  fs.writeFileSync(f1p, '{"a":1}'); fs.writeFileSync(f2p, '{"b":2}');
  const k = (over = {}) => testLedgerKey({ language: "python", priorFiles: [f1p, f2p], manifestSha: "m1", ...over }).key;
  const base = k();
  assert.equal(k(), base, "deterministic");
  assert.equal(testLedgerKey({ language: "python", priorFiles: [f2p, f1p], manifestSha: "m1" }).key, base, "file order is irrelevant");
  assert.notEqual(k({ manifestSha: "m2" }), base, "another held-out set is another key");
  assert.notEqual(k({ language: "c" }), base);
  fs.writeFileSync(f1p, '{"a":2}');
  assert.notEqual(k(), base, "a rebuilt prior (a new reader) is another key");
  // the key has no instrument term: editing c2-names.mjs's header cannot move it (its only inputs are the language, the prior bytes, the manifest rows)
  assert.deepEqual(Object.keys(testLedgerKey({ language: "python", priorFiles: [f1p], manifestSha: "m1" }).parts).sort(), ["language", "manifestSha", "priors"]);
});

test("A9 ledger places are FIXED: no environment variable (C2_OUT_DIR) moves them", () => {
  assert.equal(LEDGER_PATHS.length, 2);
  assert.equal(LEDGER_PATHS[0], "/private/tmp/claude-501/coding-competence/c2-test-ledger.json");
  assert.match(LEDGER_PATHS[1], /eval\/coding-competence\/c2-test-ledger\.json$/);
});

test("A9 acquireTestRead (the TEST gate, on temporary ledger paths): first read allowed and recorded, a second refused, a gold change refused even with a repeat reason, a rebuilt prior is a visible second read, an unwritable ledger refuses", () => {
  const d = tmpDir("acquire");
  const prior = path.join(d, "code-ctx-py.json");
  fs.writeFileSync(prior, '{"v":1}');
  const paths = [path.join(d, "x", "l.json"), path.join(d, "y", "l.json")];
  const args = { lang: "python", priorFiles: [prior], manifestSha: "m1", goldSha: "g1", instrument: "i1", paths };
  const a = acquireTestRead(args);
  assert.equal(a.ok, true);
  assert.equal(a.firstLook, true);
  assert.equal(a.repeat, false);
  // editing the instrument (its sha) does not re-open TEST
  const again = acquireTestRead({ ...args, instrument: "i2-after-a-header-edit" });
  assert.equal(again.ok, false);
  assert.match(again.gap.reason, /^test-already-used/);
  // a repeat with a reason is allowed but flagged; with a CHANGED gold.py it is refused
  const rep = acquireTestRead({ ...args, reason: "re-read to debug a crash in the card writer (authored test reason)" });
  assert.equal(rep.ok, true);
  assert.equal(rep.repeat, true);
  assert.equal(rep.firstLook, false);
  const goldChanged = acquireTestRead({ ...args, goldSha: "g2", reason: "gold.py was edited after the first TEST read (authored test reason)" });
  assert.equal(goldChanged.ok, false);
  assert.match(goldChanged.gap.reason, /gold-changed/);
  // a rebuilt prior is a new reader: allowed, but the card is told TEST was read before for this language
  fs.writeFileSync(prior, '{"v":2}');
  const rebuilt = acquireTestRead(args);
  assert.equal(rebuilt.ok, true);
  assert.equal(rebuilt.firstLook, false);
  assert.equal(rebuilt.previousKeysForLanguage.length, 1);
  // an unwritable ledger place refuses to measure anything
  const blocker = path.join(d, "blocker"); fs.writeFileSync(blocker, "x");
  const bad = acquireTestRead({ ...args, manifestSha: "m9", paths: [path.join(blocker, "sub", "l.json")] });
  assert.equal(bad.ok, false);
  assert.equal(bad.gap.reason, "test-ledger-unwritable");
});

test("A9: a limited TEST run is refused before the ledger or any gold is touched (a smoke sample must not spend the TEST read)", async () => {
  const before = LEDGER_PATHS.map((p) => (fs.existsSync(p) ? fs.statSync(p).mtimeMs : null));
  const r = await measure({ language: "python", split: "test", limit: 5 });
  assert.equal(r.pass, null);
  assert.ok(r.gaps.some((g) => /test-requires-full-split/.test(g.reason)));
  const after = LEDGER_PATHS.map((p) => (fs.existsSync(p) ? fs.statSync(p).mtimeMs : null));
  assert.deepEqual(after, before, "no ledger file was created or modified");
});

// ── A8: the gold is frozen ──────────────────────────────────────────────────────────────────────────────────────────────
test("A8: gold.py is frozen: its sha256 equals the pin recorded in c2-names.mjs (a change needs a new dated amendment)", () => {
  assert.equal(sha256File(GOLD_PY), GOLD_PY_PIN);
});

test("selectFiles: deterministic, round-robin across repositories, limit honoured", () => {
  const rows = [];
  for (const repo of ["a", "b", "c"]) for (let i = 0; i < 5; i++) rows.push({ repo, path: `${repo}${i}`, sha256: String(fnv1a(repo + i)) });
  const s1 = selectFiles(rows, 4), s2 = selectFiles(rows.slice().reverse(), 4);
  assert.deepEqual(s1.map((r) => r.path), s2.map((r) => r.path));
  assert.equal(s1.length, 4);
  assert.deepEqual(new Set(s1.slice(0, 3).map((r) => r.repo)), new Set(["a", "b", "c"]));
  assert.equal(selectFiles(rows, null).length, 15);
});

// ── module contract ───────────────────────────────────────────────────────────────────────────────────────────────
test("module contract: RUNG, controls, language cycle, and measure never throws for missing data", async () => {
  assert.equal(RUNG.id, "R2");
  assert.ok(RUNG.name && RUNG.question);
  assert.ok(CONTROL_ARMS.includes("majority") && CONTROL_ARMS.includes("noPrior") && CONTROL_ARMS.includes("deranged") && CONTROL_ARMS.includes("shuffled") && CONTROL_ARMS.includes("derangedTable"));
  // amendment A6: the hand baselines, the skeleton baseline and the frequency-matched T2 control are CONTROLS, not diagnostics
  for (const a of ["ablated", "recipes", "declKw", "freqT2"]) assert.ok(CONTROL_ARMS.includes(a), `${a} is in CONTROL_ARMS`);
  assert.equal(derangedLanguageOf("python"), "javascript");
  assert.equal(derangedLanguageOf("java"), "python");
  assert.equal(derangedLanguageOf("klingon"), null);
  const r = await measure({ language: "klingon" });
  assert.equal(r.pass, null);
  assert.ok(r.gaps.some((g) => /unmeasured/.test(g.reason)));
  for (const k of ["id", "rung", "split", "n", "applicable", "score", "control", "margin", "pass", "controls", "gaps", "notes", "details"]) assert.ok(k in r, `result has ${k}`);
  const bad = await measure({ language: "python", split: "bogus" });
  assert.equal(bad.pass, null);
  assert.ok(bad.gaps.some((g) => /bad-split/.test(g.reason)));
});

test("predictionChecks: reads the per-language details without throwing on a minimal result", () => {
  const res = { pass: true, details: { arms: { S1: { admit: { f1: 0.9 } }, S0: { admit: { f1: 0.9 } }, nameOnly: { admit: { f1: 0.2 } }, S1N: { admit: { f1: 0.9 } }, randomMatched: { refuse: { precision: 0.96 } } }, refusalTiers: { keyword: { precision: 0.999, topErrors: [] } }, passRule: { licence: true }, units: { baseRateNonNames: 0.96 }, recipes: null } };
  const p = predictionChecks("python", res);
  assert.equal(p.P1.held, true);
  assert.equal(p.P4.held, true);
  assert.equal(p.P7.held, true);
});

// ── shipped priors, when present: held-out discipline is checkable from the files themselves ────────────────────────
test("shipped TRAIN priors (if built): split train, no overlap with the dev/test repositories, params equal the declared constants", { skip: !fs.existsSync(MANIFEST) }, () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  for (const lang of LANGUAGES) {
    const pri = loadNameGatePriors(lang);
    if (!pri.ctxPrior) continue;
    assert.equal(pri.ctxPrior.provenance.split, "train");
    const L = manifest.languages[lang];
    const heldOut = new Set([...L.dev, ...L.test].map((f) => f.repo));
    for (const r of pri.ctxPrior.provenance.trainRepos) assert.ok(!heldOut.has(r), `${lang}: train repo ${r} is also in dev/test`);
    for (const k of ["N_MIN_CTX", "SETTLED_MIN_OCC", "SETTLED_MIN_REPOS"]) assert.equal(pri.ctxPrior.params[k], PARAMS[k]);
    assert.ok(pri.ctxPrior.provenance.giver && pri.ctxPrior.provenance.builder);
    assert.deepEqual(pri.disclosure.filter((d) => d.gap === "param-mismatch" || d.gap === "closed-class-keywords-differ-from-keyword-prior"), []);
    for (const lvl of LEVELS.S1) assert.ok(pri.tables[lvl]?.size > 0);
  }
});

// ── integration on real DEV files (never test) ────────────────────────────────────────────────────────────────────────
const AV = goldAvailable();
test("integration on DEV: python, 6 files: result is shape-valid, causality licence holds, S1 beats the controls", { skip: !AV.available || !fs.existsSync(MANIFEST) || !loadNameGatePriors("python").ctxPrior }, async () => {
  const r = await measure({ language: "python", split: "dev", limit: 6 });
  assert.equal(r.split, "dev");
  assert.ok(r.n > 0);
  assert.ok(r.score >= 0 && r.score <= 1);
  assert.equal(r.details.causality.ok, true);
  assert.ok(r.details.arms.S1.admit.f1 > r.details.arms.noPrior.admit.f1);
  assert.ok(r.details.arms.S1.admit.f1 > r.details.arms.shuffled.admit.f1);
  assert.equal(r.details.arms.majority.admit.f1, 0);
  assert.ok(CONSTS.BOOT_B > 0);
  // amendment A5 diagnostics: the two refusal tiers partition S1's refusals; the keyword-only reader admits everything it does not refuse
  const A = r.details.arms;
  assert.equal(A.T1only.refuse.n + A.T2only.refuse.n, A.S1.refuse.n, "T1-only and T2-only refusals partition S1's refusals");
  assert.ok(A.kwAdmitRest.admit.f1 < A.S1.admit.f1, "the keyword list alone does not name beings");
  assert.ok(!CONTROL_ARMS.includes("kwAdmitRest") && !CONTROL_ARMS.includes("T2only"), "post hoc diagnostics never enter `control`");
  assert.ok(r.details.diagnosticsA5?.T2only && r.details.diagnosticsA5.kwAdmitRest);
  assert.ok(r.details.s1.recallByKind && Object.keys(r.details.s1.recallByKind).length > 0);
  // amendments A6-A9: the card never calls the primary score causal without its qualifier; every new arm and guard is present
  assert.equal(r.details.segmentationLookahead, "gold tokens, whole-file");
  assert.match(r.details.primaryArmLabel, /GOLD segmentation/);
  assert.match(r.details.claims.primaryScoreIs, /GOLD segmentation/);
  for (const a of ["S1_lex", "declKw", "freqT2", "freqT2only", "recipes", "ablated"]) assert.ok(A[a], `arm ${a} is reported`);
  assert.equal(r.details.segmentation.primary.endToEndCausal, false);
  assert.ok(r.details.segmentation.khoraLexer.causalityLicence.checked > 0, "the lexer causality licence ran");
  assert.ok(typeof r.details.claims.causalEndToEnd === "string" && typeof r.details.claims.learnedPriorsHelp === "string");
  assert.equal(r.details.passRule.rule, "V2 (amendment A6)");
  assert.ok("passV1" in r.details && r.details.passRuleV1.A_refusal, "the original rule is still computed and reported beside the new one");
  assert.equal(r.details.gold.goldPySha, GOLD_PY_PIN);
  assert.equal(r.details.gold.frozen, true);
  assert.match(r.details.gold.caveat, /TEST-split repositories/);
  assert.ok(!r.details.testLedger, "a DEV run never touches the TEST ledger");
  assert.ok(A.S1_lex.admit.f1 <= 1 && A.freqT2only.refuse.n >= 0);
});

test("predictionChecks D1/D2 (amendment A5): read the diagnostics, a language with too few T2 refusals is null, never held", () => {
  const mk = (n, p5, f1, dp5) => ({ pass: true, details: { arms: { S1: { admit: { f1: 0.9 } }, randomMatched: { refuse: { precision: 0.96 } } }, refusalTiers: { keyword: { precision: 1, topErrors: [] } }, passRule: { licence: true }, units: { baseRateNonNames: 0.96 }, recipes: null, diagnosticsA5: { T2only: { n, precision: 0.99, baseRate: 0.96, marginP5: p5, measurable: n >= CONSTS.MIN_REFUSED }, kwAdmitRest: { admit: { f1 }, f1DeltaS1P5: dp5 } } } });
  const ok = predictionChecks("python", mk(500, 0.01, 0.05, 0.8));
  assert.equal(ok.D1.held, true);
  assert.equal(ok.D2.held, true);
  assert.equal(predictionChecks("python", mk(50, 0.01, 0.05, 0.8)).D1.held, null, "fewer than MIN_REFUSED T2 refusals: unmeasurable, not a pass");
  assert.equal(predictionChecks("python", mk(500, -0.001, 0.05, 0.8)).D1.held, false);
  assert.equal(predictionChecks("python", mk(500, 0.01, 0.4, 0.8)).D2.held, false, "a keyword-only reader above 0.30 falsifies D2");
});

test("predictionChecks E1..E6 (amendments A6-A9): read the new arms; python is held to fail D, a missing arm yields no E-check, never a pass", () => {
  const mk = (lang, over = {}) => ({
    pass: false,
    details: {
      arms: { S1: { admit: { f1: 0.9963 } }, S0: { admit: { f1: 0.99 } }, nameOnly: { admit: { f1: 0.3 } }, S1N: { admit: { f1: 0.99 } }, randomMatched: { refuse: { precision: 0.96 } }, recipes: { admit: { f1: 1 } }, declKw: { admit: { f1: 1 } }, ablated: { admit: { f1: 0 } } },
      refusalTiers: { keyword: { precision: 1, topErrors: [] } }, passRule: { licence: true }, passRuleV1: { licence: true }, passV1: true, units: { baseRateNonNames: 0.96 }, recipes: null,
      bootstrap: { f1DeltaRecipes: { p5: -0.0074 }, f1DeltaDeclKw: { p5: -0.0074 }, f1DeltaAblated: { p5: 0.9 } },
      handBaselines: {}, freqControl: { T2only: { n: 5878, precision: 0.9981 }, freqT2only: { precision: 0.9877 }, precisionDeltaBootstrap: { p5: 0.0086 } },
      segmentation: { khoraLexer: { f1: 0.9954, ratio: 0.9991, causalityLicence: { ok: true }, foreignLexerControl: { f1: 0.1, ratioToS1Lex: 0.1, licenceMoves: true }, wsBaselineDiagnostic: { f1: 0.0, ratioToS1Lex: 0, moves: true } } }, ...over,
    },
  });
  const p = predictionChecks("python", mk("python"));
  assert.equal(p.E1.held, true, "python: recipes >= S1");
  assert.equal(p.E2.held, true, "python: declKw >= 0.95 and p5 <= 0");
  assert.equal(p.E3.held, true);
  assert.equal(p.E4.held, true);
  assert.equal(p.E5.held, true);
  assert.equal(p.E6.held, true, "python pass V2 is false, as predicted");
  assert.equal(p.E7.held, true, "A10: the lexer arm collapses under a foreign lexer");
  assert.equal(p.E8.held, true, "A11: and under whitespace-delimited runs");
  assert.equal(predictionChecks("python", mk("python", { segmentation: { khoraLexer: { f1: 0.9954, ratio: 0.9991, causalityLicence: { ok: true }, foreignLexerControl: { f1: 0.9, ratioToS1Lex: 0.9, licenceMoves: false } } } })).E7.held, false, "a foreign lexer that does as well breaks the arm");
  assert.equal(p.P8.observed, true, "P8 is read on the ORIGINAL rule V1");
  // a freq-matched control that is NOT beaten is a failed prediction
  const f = predictionChecks("python", mk("python", { freqControl: { T2only: { n: 5878, precision: 0.99 }, freqT2only: { precision: 0.99 }, precisionDeltaBootstrap: { p5: -0.0005 } } }));
  assert.equal(f.E3.held, false);
  // too few T2 refusals: null, not held
  assert.equal(predictionChecks("python", mk("python", { freqControl: { T2only: { n: 50, precision: 1 }, freqT2only: { precision: 0.9 }, precisionDeltaBootstrap: { p5: 0.1 } } })).E3.held, null);
  // a lexer ratio under SEG_RATIO breaks E5
  assert.equal(predictionChecks("python", mk("python", { segmentation: { khoraLexer: { f1: 0.7, ratio: 0.7, causalityLicence: { ok: true } } } })).E5.held, false);
  // javascript: S1 beating recipes (p5 > 0) is E1; a result with no new arms has no E-checks
  const js = predictionChecks("javascript", mk("javascript", { bootstrap: { f1DeltaRecipes: { p5: 0.06 }, f1DeltaDeclKw: { p5: -0.007 }, f1DeltaAblated: { p5: 0.7 } } }));
  assert.equal(js.E1.held, true);
  assert.equal(js.E2.held, false, "javascript declKw is predicted < 0.60 with p5 > 0: a failed prediction when declKw is 1.0");
  const old = predictionChecks("python", { pass: true, details: { arms: { S1: { admit: { f1: 0.9 } }, S0: { admit: { f1: 0.9 } }, nameOnly: { admit: { f1: 0.2 } }, S1N: { admit: { f1: 0.9 } }, randomMatched: { refuse: { precision: 0.96 } } }, refusalTiers: { keyword: { precision: 0.999, topErrors: [] } }, passRule: { licence: true }, units: { baseRateNonNames: 0.96 }, recipes: null } });
  assert.ok(!("E1" in old) && !("E3" in old) && !("E5" in old));
});

// ── the gold re-validation (A8): the comparison is checked on authored toy lists, never on a TEST file ─────────────────────
test("c2-gold-revalidate compareDefs: identical lists agree fully; a missing def costs recall; the lines-shifted control collapses (the comparison measures agreement)", () => {
  const defs = [{ line: 1, name: "alpha" }, { line: 4, name: "Gamma" }, { line: 5, name: "delta" }, { line: 5, name: "delta" }];
  const same = compareDefs(defs, defs.slice());
  assert.equal(same.f1, 1);
  assert.equal(same.matched, 4, "a repeated (line, name) is matched as a multiset, not collapsed");
  const missing = compareDefs(defs, defs.slice(0, 3));
  assert.equal(missing.precision, 0.75);
  assert.equal(missing.recall, 1);
  assert.equal(missing.goldOnly.length, 1);
  const extra = compareDefs(defs.slice(0, 3), defs);
  assert.equal(extra.engineOnly.length, 1);
  const shifted = compareDefs(defs, defs, { shiftEngine: 1 });
  assert.ok(shifted.f1 <= 0.5 * same.f1, "the control built to fail moves the statistic");
  assert.equal(compareDefs([], []).f1, null, "nothing to compare is null, never a pass");
});
