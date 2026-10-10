// coding-c1: the INSTRUMENT of C1 LEX (eval/coding-competence/c1-lex.mjs, adapters/code/lex.js) is regression-guarded here.
// Nothing in this file measures how well the lexer reads real code. The toy "language" below is AUTHORED by the model (a
// generator that writes the text and its gold in the same breath, so the gold is correct by construction): it is a fixture for
// the instrument, never held-out natural data. What is checked:
//   - a perfect system scores 1 on every metric, and a system that is wrong in a known way scores low (the instrument can fail);
//   - each control built to fail really moves the statistic (II.23): whitespace split, deranged keywords, no delimiters, empty prior;
//   - the prior derivation recovers the toy's delimiters, keywords and operators from TRAIN-like docs and the lexer, which never saw
//     the held-out toy text, reproduces its gold exactly;
//   - the bootstrap, the majority control, the sub-word coverage and the leak guard behave as declared; measure() never throws.
// The one test that touches real files (a 12-file python DEV smoke) is skipped when the gold extractor or the prior is absent.
// 2026-10-06 (A12..A15, appended at the foot of this file): the review's four findings are guarded too. A wrong-language prior must be pass:false
// (the review's six mutations, on real DEV files); the strongest cheap baseline is a gate and a ceiling is a failure, never a waiver; a DEV result is
// labelled dev-tuned and never credited; the typed standard keyword lists are cross-checked LIVE against CPython, clang, Ripper and acorn; the second
// class authority (c1-xauth-class.mjs) maps engine classes as declared. No test reads TEST.
import test from "node:test";
import assert from "node:assert/strict";
import {
  lexCode, whitespaceSplit, splitIdentifier, deriveLexPrior, derangeKeywords, withoutDelimiters, withoutKnowledge, loadCodeLexPrior, mulberry32,
} from "../adapters/code/lex.js";
import {
  scoreFile, zeroVec, addVec, f1Of, pointF1Of, accOf, condAccOf, majorityOf, bootstrap, subwordEval, shiftedPieces, prefixConsistency, makeAttested, foldClass, measure, CONSTANTS, CLASS_ORDER,
} from "../eval/coding-competence/c1-lex.mjs";
import { measure as measureLoro, loroPlan, LORO_CONSTANTS } from "../eval/coding-competence/c1-loro.mjs";
import { goldAvailable } from "../eval/coding-competence/gold.mjs";

// ------------------------------------------------------------------ the AUTHORED toy language and its by-construction gold
const IDS = ["alpha", "beta", "gamma", "delta", "omega", "count", "total", "value", "items", "index", "name", "node"];
function toyDoc(repo, seed, nLines, ids = IDS) {
  const rnd = mulberry32(seed);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  let text = "";
  const tokens = [];
  const put = (s, cls, sp = " ") => { if (sp && text.length && !text.endsWith("\n") && !text.endsWith(" ")) text += sp; const start = text.length; text += s; if (cls) tokens.push({ start, end: start + s.length, class: cls, type: cls }); };
  const raw = (s) => { text += s; };
  for (let i = 0; i < nLines; i++) {
    const t = i % 6;
    if (t === 0) { put("def", "keyword", ""); put(pick(ids), "identifier"); put("(", "punctuation", ""); put(pick(ids), "identifier", ""); put(")", "punctuation", ""); put(":", "punctuation", ""); }
    else if (t === 1) { raw("    "); put("return", "keyword", ""); put(pick(ids), "identifier"); put("+", "operator"); put(String(Math.floor(rnd() * 90) + 10), "literal"); }
    else if (t === 2) { raw("    "); put(pick(ids), "identifier", ""); put("=", "operator"); const q = rnd() < 0.3 ? `"say \\"${pick(ids)}\\" now"` : `"text ${pick(ids)} here"`; put(q, "string"); put(`# note about ${pick(ids)}`, "comment", "  "); }
    else if (t === 3) { raw("    "); put("if", "keyword", ""); put(pick(ids), "identifier"); put("==", "operator"); put(pick(ids), "identifier"); put(":", "punctuation", ""); }
    else if (t === 4) { raw("    "); put("else", "keyword", ""); put(":", "punctuation", ""); }
    else { put(`# comment line ${pick(ids)}`, "comment", ""); }
    raw("\n");
  }
  return { repo, text, tokens };
}
const TRAIN = [toyDoc("repoA", 1, 120), toyDoc("repoB", 2, 120)];
const HELD = toyDoc("repoC", 99, 60, ["zeta", "kappa", "sigma", "theta", "lambda", "alpha", "beta"]); // unseen identifiers on purpose
const PRIOR = deriveLexPrior(TRAIN, { language: "toy", grammar: "authored-toy", trainRepos: [{ repo: "repoA" }, { repo: "repoB" }], trainFiles: [] });

// ------------------------------------------------------------------ metrics: a perfect system scores 1, a wrong one scores low
test("a perfect system scores 1 on boundary F1, point F1, strict and conditional class accuracy", () => {
  const v = scoreFile(HELD.tokens, HELD.tokens);
  assert.equal(f1Of(v), 1); assert.equal(pointF1Of(v), 1); assert.equal(accOf(v), 1); assert.equal(condAccOf(v), 1);
});

test("known-wrong systems score low: shifted spans, rotated classes, empty output", () => {
  const shifted = HELD.tokens.map((t) => ({ ...t, start: t.start + 1 }));
  assert.ok(f1Of(scoreFile(HELD.tokens, shifted)) < 0.05, "spans off by one never match");
  const rot = HELD.tokens.map((t) => ({ ...t, class: CLASS_ORDER[(CLASS_ORDER.indexOf(t.class) + 1) % CLASS_ORDER.length] }));
  const v = scoreFile(HELD.tokens, rot);
  assert.equal(f1Of(v), 1, "boundaries are untouched by a class rotation");
  assert.equal(accOf(v), 0, "every class is wrong");
  assert.equal(f1Of(scoreFile(HELD.tokens, [])), 0);
});

test("class 'other' is boundary-scored but never class-scored; type folds into identifier", () => {
  const gold = [{ start: 0, end: 1, class: "other" }, { start: 2, end: 3, class: "type" }, { start: 4, end: 5, class: "keyword" }];
  const pred = [{ start: 0, end: 1, class: "operator" }, { start: 2, end: 3, class: "identifier" }, { start: 4, end: 5, class: "identifier" }];
  const v = scoreFile(gold, pred);
  assert.equal(f1Of(v), 1);
  assert.equal(v[4], 2, "nGc counts only the two non-other gold tokens");
  assert.equal(accOf(v), 0.5, "type=identifier is right, keyword=identifier is wrong, other is ignored");
  assert.equal(foldClass("type"), "identifier");
});

test("the majority control is the share of the largest folded gold class", () => {
  const v = scoreFile(HELD.tokens, HELD.tokens);
  const m = majorityOf(v);
  const counts = {};
  for (const t of HELD.tokens) counts[t.class] = (counts[t.class] ?? 0) + 1;
  const top = Math.max(...Object.values(counts));
  assert.ok(Math.abs(m.share - top / HELD.tokens.length) < 1e-12);
  assert.equal(counts[m.cls], top);
});

// ------------------------------------------------------------------ the derivation recovers what the toy language is
test("deriveLexPrior recovers the toy's delimiters, words and symbols from TRAIN-like docs", () => {
  assert.deepEqual(PRIOR.comments.map((c) => [c.open, c.close]), [["#", null]]);
  assert.equal(PRIOR.strings.length, 1);
  assert.equal(PRIOR.strings[0].open, '"');
  assert.equal(PRIOR.strings[0].escape, "\\", "the escaped quotes in TRAIN make the escape variant win");
  assert.deepEqual(PRIOR.words.keyword.sort(), ["def", "else", "if", "return"]);
  assert.ok("==" in PRIOR.symbols.table && "(" in PRIOR.symbols.table);
  assert.equal(PRIOR.symbols.table["("], "punctuation");
  assert.equal(PRIOR.symbols.table["+"], "operator");
  assert.equal(PRIOR.shape.number, "literal");
  assert.equal(PRIOR.schema, "CodeLexPrior@1");
  assert.ok(PRIOR.provenance.derive.MATCH_MIN > 0, "every threshold is declared in the prior's provenance");
});

test("the lexer, which never saw the held-out toy text, reproduces its gold exactly (identifiers it has never seen included)", () => {
  const pred = lexCode(HELD.text, PRIOR);
  const v = scoreFile(HELD.tokens, pred);
  assert.equal(f1Of(v), 1);
  assert.equal(accOf(v), 1);
  for (let i = 1; i < pred.length; i++) assert.ok(pred[i].start >= pred[i - 1].end, "tokens never overlap");
});

// ------------------------------------------------------------------ the controls built to fail do fail (the statistic moves)
test("whitespace split scores low on boundaries, deranged keywords score low on class, no delimiters costs boundaries, an empty prior costs both", () => {
  const real = scoreFile(HELD.tokens, lexCode(HELD.text, PRIOR));
  const ws = scoreFile(HELD.tokens, whitespaceSplit(HELD.text, PRIOR));
  const dk = scoreFile(HELD.tokens, lexCode(HELD.text, derangeKeywords(PRIOR, 1)));
  const nd = scoreFile(HELD.tokens, lexCode(HELD.text, withoutDelimiters(PRIOR)));
  const empty = scoreFile(HELD.tokens, lexCode(HELD.text, withoutKnowledge(PRIOR)));
  assert.ok(f1Of(real) - f1Of(ws) > 0.3, `whitespace F1 ${f1Of(ws)}`);
  assert.equal(f1Of(dk), 1, "deranging keywords does not change boundaries");
  assert.ok(accOf(real) - accOf(dk) > 0.1, `deranged class acc ${accOf(dk)}`);
  assert.ok(f1Of(real) - f1Of(nd) > 0.05, `no-delimiter F1 ${f1Of(nd)}`);
  assert.ok(accOf(real) - accOf(empty) > 0.1 && f1Of(real) - f1Of(empty) > 0.05, `empty prior F1 ${f1Of(empty)} acc ${accOf(empty)}`);
});

test("derangeKeywords keeps set sizes, moves every keyword and literal to a different class, and is seeded", () => {
  const d1 = derangeKeywords(PRIOR, 1), d1b = derangeKeywords(PRIOR, 1);
  assert.deepEqual(d1, d1b);
  assert.equal(d1.words.keyword.length, PRIOR.words.keyword.length);
  assert.equal(d1.words.literal.length, PRIOR.words.literal.length);
  for (const w of PRIOR.words.keyword) assert.ok(!d1.words.keyword.includes(w), `${w} kept its class`);
  assert.deepEqual(PRIOR.words.keyword.sort(), ["def", "else", "if", "return"], "the original prior is not mutated");
});

test("lexCode requires a prior: no prior is a typed gap, not a default language", () => {
  assert.throws(() => lexCode("x = 1", null), TypeError);
});

// ------------------------------------------------------------------ causality (A11): a reader that sees only the prefix
test("prefixConsistency: the lexer is causal on the toy; a lexer that uses a whole-text statistic is caught (control built to fail)", () => {
  const causal = (t) => lexCode(t, PRIOR);
  const ok = prefixConsistency(HELD.text, causal, causal(HELD.text), { cuts: 12 });
  assert.equal(ok.cuts, 12);
  assert.equal(ok.mismatches, 0, "lexing the prefix alone reproduces every lexeme already emitted");
  // NON-causal: a word is a keyword iff the WHOLE text holds it >= 3 times. The prefix holds fewer, so earlier lexemes change class.
  const nonCausal = (t) => {
    const toks = lexCode(t, PRIOR);
    const freq = new Map();
    for (const k of toks) if (k.class === "identifier") { const w = t.slice(k.start, k.end); freq.set(w, (freq.get(w) ?? 0) + 1); }
    return toks.map((k) => (k.class === "identifier" && (freq.get(t.slice(k.start, k.end)) ?? 0) >= 3 ? { ...k, class: "keyword" } : k));
  };
  const bad = prefixConsistency(HELD.text, nonCausal, nonCausal(HELD.text), { cuts: 12 });
  assert.ok(bad.mismatches >= 6, `the whole-text statistic must be detected as non-causal, got ${bad.mismatches} of ${bad.cuts}`);
  // too few lexemes: no interior to cut, a typed zero rather than a silent pass
  assert.deepEqual(prefixConsistency("x = 1", causal, causal("x = 1")), { cuts: 0, mismatches: 0 });
});

// ------------------------------------------------------------------ bootstrap
test("bootstrap: a perfect arm beats whitespace with an interval above 0; identical arms give an interval at 0", () => {
  const per = [];
  for (let k = 0; k < 8; k++) {
    const d = toyDoc("r", 200 + k, 12);
    per.push({ real: scoreFile(d.tokens, lexCode(d.text, PRIOR)), ws: scoreFile(d.tokens, whitespaceSplit(d.text, PRIOR)), same: scoreFile(d.tokens, lexCode(d.text, PRIOR)) });
  }
  const b = bootstrap(per, (s) => f1Of(s.real) - f1Of(s.ws), 200, 7);
  assert.ok(b.lo > 0.2 && b.hi >= b.lo);
  const z = bootstrap(per, (s) => f1Of(s.real) - f1Of(s.same), 200, 7);
  assert.equal(z.lo, 0); assert.equal(z.hi, 0);
  assert.deepEqual(bootstrap(per, (s) => f1Of(s.real) - f1Of(s.ws), 200, 7), b, "seeded: same resamples, same interval");
});

// ------------------------------------------------------------------ identifiers and sub-word coverage
test("splitIdentifier cuts at underscore, case, acronym and digit seams", () => {
  assert.deepEqual(splitIdentifier("getUserName"), ["get", "User", "Name"]);
  assert.deepEqual(splitIdentifier("get_user_name"), ["get", "user", "name"]);
  assert.deepEqual(splitIdentifier("HTTPServer"), ["HTTP", "Server"]);
  assert.deepEqual(splitIdentifier("parseXML2"), ["parse", "XML", "2"]);
  assert.deepEqual(splitIdentifier("kmalloc"), ["kmalloc"]);
  assert.deepEqual(splitIdentifier("__init__"), ["init"]);
});

test("subwordEval: the real split beats nosplit and random-cut when its pieces are words, and the control is stronger when they are not", () => {
  const forms = new Map([["get", 50], ["user", 30], ["name", 40], ["set", 20], ["value", 10]]);
  const att = makeAttested(forms, 2);
  const words = new Map([["getUserName", 3], ["setValue", 2], ["get_user", 1], ["user_name", 1], ["set_value", 1], ["getValue", 1]]);
  const r = subwordEval(words, att, { B: 200, draws: 10, seed: 3 });
  assert.equal(r.coverage.real, 1);
  assert.equal(r.coverage.nosplit, 0);
  assert.ok(r.coverage.random < 0.6, `random-cut coverage ${r.coverage.random}`);
  assert.ok(r.margin > 0.4);
  // identifiers whose pieces are not attested (abbreviations): the splitter gets no credit
  const abbr = new Map([["kmBufCtx", 1], ["fdPtrLen", 1], ["rcSkb", 1]]);
  const r2 = subwordEval(abbr, att, { B: 100, draws: 10, seed: 3 });
  assert.equal(r2.coverage.real, 0);
  assert.ok(r2.margin <= 0.1 && r2.pass !== true);
  // single letters never count as attested, digits are not scored
  assert.equal(att("x"), false); assert.equal(att("get"), true); assert.equal(att("Get"), true);
});

test("shiftedPieces moves every seam one character right (left at the end), keeps the letters, and the arm reports a topUnattested list (A9)", () => {
  assert.deepEqual(shiftedPieces(["get", "User", "Name"]), ["getU", "serN", "ame"]);
  assert.deepEqual(shiftedPieces(["foo", "bar"]), ["foob", "ar"]);
  assert.deepEqual(shiftedPieces(["a", "bc"]), ["ab", "c"]);
  assert.equal(shiftedPieces(["ab", "c"]).join(""), "abc", "letters are never lost");
  assert.deepEqual(shiftedPieces(["x"]), ["x"], "an unsplit identifier has no seam to move");
  const forms = new Map([["get", 50], ["user", 30], ["name", 40], ["set", 20], ["value", 10]]);
  const words = new Map([["getUserName", 3], ["setValue", 2], ["get_user", 1], ["user_name", 1], ["set_value", 1], ["getValue", 1], ["setCtxBuf", 5]]);
  const r = subwordEval(words, makeAttested(forms, 2), { B: 100, draws: 10, seed: 3 });
  assert.ok(r.coverage.real - r.coverage.shifted > 0.3, `moving the seams must cost attestation: real ${r.coverage.real} shifted ${r.coverage.shifted}`);
  assert.ok("marginWithShift" in r && "passWithShift" in r && Array.isArray(r.ci95WithShift));
  assert.ok(r.marginWithShift <= r.margin + 1e-12, "adding a control can only lower the margin");
  assert.deepEqual(r.topUnattested.map((x) => x.piece).slice(0, 2), ["buf", "ctx"], "listed by token weight (both 5), ties alphabetical; abbreviations first here");
  assert.equal(r.topUnattested[0].weight, 5);
  assert.equal(r.shortUnattestedOfTop20, r.topUnattested.filter((x) => x.piece.length <= 4).length);
});

// ------------------------------------------------------------------ measure(): shape, gaps, leak guard, determinism
const SHAPE = ["id", "rung", "language", "split", "n", "applicable", "score", "control", "margin", "pass", "controls", "gaps", "notes", "details"];

test("measure() never throws for a language with no prior and returns typed 'unmeasured' (pass:null)", async () => {
  const r = await measure({ language: "cobol", split: "dev" });
  for (const k of SHAPE) assert.ok(k in r, `result lacks ${k}`);
  assert.equal(r.pass, null);
  assert.ok(r.gaps.some((g) => /unmeasured/.test(g.reason)));
  const r2 = await measure({});
  assert.equal(r2.pass, null);
});

const AV = goldAvailable();
const HAVE_PY = AV.available && loadCodeLexPrior("python");
const HAVE_JS = AV.available && loadCodeLexPrior("javascript");

test("measure() python DEV smoke (12 files): result shape, controls present, never reads test, deterministic", { skip: HAVE_PY ? false : "gold extractor or priors/code-lex-python.json absent" }, async () => {
  const a = await measure({ language: "python", split: "dev", limit: 12 });
  for (const k of SHAPE) assert.ok(k in a, `result lacks ${k}`);
  assert.equal(a.split, "dev");
  assert.equal(a.rung, "R1");
  assert.ok(a.n >= 10 && a.n <= 12);
  assert.ok(a.controls.whitespaceF1 < a.score, "boundary F1 beats the whitespace control");
  assert.equal(a.control, a.controls.strongestCheapBaselineF1, "A13: the control for the boundary claim is the strongest cheap baseline, not whitespace");
  assert.ok(a.score >= a.control - 0.01, "on these 12 files the lexer is not worse than the cheap baseline by more than 0.01 (the baseline may equal it: that is a result, not an error)");
  for (const k of ["whitespaceF1", "majorityClassAcc", "derangedKeywordsClassAcc", "noDelimitersF1", "priorFreeF1"]) assert.ok(typeof a.controls[k] === "number", `control ${k} missing`);
  assert.ok(!("classAccReal" in a.controls) && !("engineUnionClassAcc" in a.controls), "controls{} lists only arms built to fail: the real arm's own class accuracy is in details.class (A10)");
  assert.equal(typeof a.details.licence.ok, "boolean", "the registered licence verdict is machine-readable for the card aggregator (A10)");
  assert.ok(a.controls.derangedKeywordsClassAcc < a.details.class.strictAcc, "the keyword derangement moves class accuracy");
  assert.ok(a.controls.noDelimitersF1 < a.score, "removing delimiters moves boundary F1");
  assert.equal(typeof a.pass, "boolean");
  assert.ok(a.details.causal.cuts >= 30 && a.details.causal.mismatches === 0 && a.details.causal.gating === false, "causality is measured on real files and reported, not gating (A11)");
  const b = await measure({ language: "python", split: "dev", limit: 12 });
  assert.deepEqual(a, b, "deterministic (seeded bootstrap, seeded controls)");
});

test("leak guard: a file from a repository the prior was built from is refused, never scored", { skip: HAVE_PY ? false : "gold extractor or priors/code-lex-python.json absent" }, async () => {
  const real = loadCodeLexPrior("python");
  const leaky = JSON.parse(JSON.stringify(real));
  leaky.provenance.trainRepos.push({ repo: "calcmogul/controls-engineering-in-frc" }); // a DEV repository
  const r = await measure({ language: "python", split: "dev", limit: 12, _prior: leaky });
  assert.ok(r.gaps.some((g) => /^leak:/.test(g.reason) && g.count > 0), "leak is a typed gap");
  assert.ok(r.n < 12, "leaked files are not counted");
});

test("a sample under MIN_FILES gets numbers but no verdict", { skip: HAVE_PY ? false : "gold extractor or priors/code-lex-python.json absent" }, async () => {
  const r = await measure({ language: "python", split: "dev", limit: 4 });
  assert.equal(r.pass, null);
  assert.ok(r.gaps.some((g) => /n<10/.test(g.reason)));
  assert.ok(CONSTANTS.MIN_FILES === 10);
});

// ------------------------------------------------------------------ the second authority (c1-xauth.mjs): typed gaps, never a silent pass
import { measure as measureX } from "../eval/coding-competence/c1-xauth.mjs";
test("c1-xauth: a language with no engine tokenizer here is a typed gap (pass:null), never a pass", async () => {
  for (const language of ["go", "java", "rust", ""]) {
    const r = await measureX({ language });
    for (const k of SHAPE) assert.ok(k in r, `result lacks ${k}`);
    assert.equal(r.pass, null);
    assert.ok(r.gaps.some((g) => /unmeasured/.test(g.reason)));
  }
});

test("c1-xauth: python smoke against CPython's own tokenizer (12 files); the real prior beats the controls", { skip: HAVE_PY ? false : "gold extractor or priors/code-lex-python.json absent" }, async () => {
  const r = await measureX({ language: "python", limit: 12 });
  assert.equal(r.details.engine, "CPython stdlib tokenize");
  assert.ok(r.n >= 10);
  assert.ok(r.score > r.controls.whitespaceF1 + 0.3 && r.score > r.controls.emptyPriorF1 + 0.05 && r.score > r.controls.foreignPriorF1);
});

test("c1-xauth: javascript smoke against acorn (16 files, A: X-A1); the real prior beats the controls", { skip: HAVE_JS ? false : "gold extractor or priors/code-lex-javascript.json absent" }, async () => {
  const r = await measureX({ language: "javascript", limit: 16 });
  assert.match(r.details.engine, /acorn/);
  assert.ok(r.n >= 10, `acorn tokenised ${r.n} files`);
  assert.ok(r.score > r.controls.whitespaceF1 + 0.3 && r.score > r.controls.emptyPriorF1 + 0.05);
  assert.ok(r.controls.goldVsEngineF1 >= 0.8, "the two authorities are comparable");
});

// ------------------------------------------------------------------ c1-loro: leave-one-repository-out inside TRAIN (the DEV-optimism check)
test("loroPlan: a held-out repository never appears in its own prior's documents and every repository is held out once", () => {
  const docs = [toyDoc("A", 1, 12), toyDoc("A", 2, 12), toyDoc("B", 3, 12), toyDoc("C", 4, 12), toyDoc("C", 5, 12), toyDoc("C", 6, 12)];
  const plan = loroPlan(docs);
  assert.deepEqual(plan.map((p) => p.repo), ["A", "B", "C"]);
  for (const p of plan) {
    assert.ok(p.heldDocs.length > 0 && p.heldDocs.every((d) => d.repo === p.repo));
    assert.ok(p.trainDocs.every((d) => d.repo !== p.repo), `repo ${p.repo} leaked into its own prior`);
    assert.equal(p.heldDocs.length + p.trainDocs.length, docs.length);
  }
  assert.equal(loroPlan(docs, 1).find((p) => p.repo === "C").heldDocs.length, 1, "limit caps held-out files per repository");
});

test("c1-loro: refuses dev and test, and is a typed gap with fewer than 3 repositories", async () => {
  for (const split of ["dev", "test"]) {
    const r = await measureLoro({ language: "python", split });
    for (const k of SHAPE) assert.ok(k in r, `result lacks ${k}`);
    assert.equal(r.pass, null); assert.equal(r.n, 0);
    assert.ok(r.gaps.some((g) => /^refused: c1-loro is TRAIN-only/.test(g.reason)), `${split} must be refused`);
  }
  const two = [toyDoc("A", 1, 30), toyDoc("A", 2, 30), toyDoc("B", 3, 30), toyDoc("B", 4, 30)];
  const r = await measureLoro({ language: "toy", _docs: two });
  assert.equal(r.pass, null);
  assert.ok(r.gaps.some((g) => /< 3\)/.test(g.reason)));
});

test("c1-loro on the authored toy: a perfect lexer scores 1, the controls built to fail do worse, and a missing DEV reference gives no verdict", async () => {
  const mk = (repo, base, ids) => [0, 1, 2, 3, 4, 5].map((k) => toyDoc(repo, base + k, 30, ids));
  const docs = [...mk("R1", 10, ["alpha", "beta", "gamma", "delta"]), ...mk("R2", 20, ["omega", "count", "total", "value"]), ...mk("R3", 30, ["items", "index", "name", "node"]), ...mk("R4", 40, ["zeta", "kappa", "sigma", "theta"])];
  const r = await measureLoro({ language: "toy-no-dev-reference", _docs: docs });
  assert.equal(r.split, "train");
  assert.equal(r.n, 24);
  assert.equal(r.score, 1, "the toy's lexical facts are recovered from the other repositories, identifiers never seen included");
  assert.ok(r.score - r.control > 0.3, `whitespace ${r.control}`);
  assert.ok(r.controls.derangedKeywordsClassAcc < r.details.loro.classAcc - 0.05, "deranged keywords move class accuracy");
  assert.ok(r.controls.noDelimitersF1 < r.score - 0.02, "removing delimiters moves boundary F1");
  assert.equal(r.pass, null, "no DEV reference for this language: optimism cannot be judged, so no verdict");
  assert.ok(r.gaps.some((g) => /DEV reference/.test(g.reason)));
  assert.equal(r.details.perRepo.length, 4);
  assert.ok(r.details.perRepo.every((x) => x.priorFromRepos === 3), "each prior was built from the three other repositories");
  assert.equal(LORO_CONSTANTS.OPTIMISM_TOL, 0.02);
});

test("c1-loro: python smoke on real TRAIN (limit 10 files per repository): never reads dev or test, numbers present, deterministic", { skip: HAVE_PY ? false : "gold extractor or priors/code-lex-python.json absent" }, async () => {
  const a = await measureLoro({ language: "python", limit: 10 });
  assert.equal(a.split, "train");
  assert.ok(a.n >= 30, `n=${a.n}`);
  assert.ok(a.score > a.control + 0.3 && a.controls.derangedKeywordsClassAcc < a.details.loro.classAcc);
  assert.ok(a.details.perRepo.every((x) => x.priorFromRepos >= 2));
  const b = await measureLoro({ language: "python", limit: 10 });
  assert.deepEqual(a.details.clauses, b.details.clauses);
  assert.equal(a.score, b.score);
});

// =====================================================================================================================================
// A12 to A15 (2026-10-06): the review's four findings, regression-guarded. As above, the toy language is AUTHORED (not natural data); the
// real-file tests run on DEV with a --limit and are skipped when the gold extractor or a prior is absent. Nothing here reads TEST.
// =====================================================================================================================================
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { baselinePriors, TYPED, GENERIC_OPS } from "../eval/coding-competence/c1-baselines.mjs";
import { STANDARDS, standardKeywordSet, compareKeywordSets, standardUnionPrior, relabelGoldByStandard, dropTypeFromClassScoring } from "../eval/coding-competence/c1-standards.mjs";
import { gateClauses, listLexPriorLanguages, otherLanguagePriors, evidenceOf, BASELINE_ARMS, CLASS_MEANING } from "../eval/coding-competence/c1-lex.mjs";

const toolOk = (cmd, args) => { try { const r = spawnSync(cmd, args, { encoding: "utf8", timeout: 20000 }); return !r.error && r.status === 0; } catch { return false; } };

// ---- finding 4 (A13): the strongest cheap baseline
test("A13 cheap baselines: no keyword list, typed delimiters and operators, typed arms for the six languages and a language-blind arm for any", () => {
  for (const lang of Object.keys(TYPED)) {
    const b = baselinePriors(lang);
    assert.ok(b.genericDelims && b.typedDelims && b.typedDelimsOps, `${lang} lacks an arm`);
    for (const p of Object.values(b)) { assert.deepEqual(p.words.keyword, []); assert.deepEqual(p.words.literal, []); assert.equal(p.schema, "CodeLexPrior@1"); assert.deepEqual(p.provenance.trainRepos, []); }
  }
  assert.deepEqual(Object.keys(TYPED).sort(), ["c", "go", "java", "javascript", "python", "ruby"]);
  assert.deepEqual(Object.keys(baselinePriors("cobol")), ["genericDelims"], "no typed table: the language-blind arm only (measure() reports the typed gap)");
  assert.ok(GENERIC_OPS.length > 20);
  const txt = 'x = f"a{b}" + """doc\nstring""" # note\ny //= 3 ** 2';
  const py = baselinePriors("python");
  const words = (p) => lexCode(txt, p).map((t) => txt.slice(t.start, t.end));
  assert.ok(words(py.typedDelimsOps).includes("//=") && words(py.typedDelimsOps).includes("**"), "the operator table munches //= and **");
  assert.ok(!words(py.typedDelims).includes("//="), "without the operator table // = are separate characters");
  assert.ok(words(py.genericDelims).some((t) => t.startsWith("//=")), "the language-blind table calls // a comment: wrong for python, by construction (a control, not a prior)");
  assert.ok(words(py.typedDelimsOps).includes('"""doc\nstring"""'), "typed python triple-quoted string is one lexeme");
  assert.ok(!("//" in baselinePriors("c").typedDelimsOps.symbols.table) && "//" in py.typedDelimsOps.symbols.table, "an operator that contains the arm's own comment opener is dropped (A7's guard)");
});

test("A13: on the authored toy, a cheap baseline can match the boundaries (so d1 exists) but not the keyword class the received prior adds", () => {
  const real = scoreFile(HELD.tokens, lexCode(HELD.text, PRIOR));
  const gen = scoreFile(HELD.tokens, lexCode(HELD.text, baselinePriors("toy").genericDelims));
  assert.ok(f1Of(gen) > 0.85, `a language-blind # and quote table already lexes the toy: F1 ${f1Of(gen)}`);
  assert.ok(accOf(real) - accOf(gen) > 0.1, `without a keyword list the baseline cannot name def/return/if/else: acc ${accOf(gen)} vs ${accOf(real)}`);
});

function perFileOf(docs, armPriors) {
  const perFile = [], perRepo = new Map();
  for (const d of docs) {
    const arms = {};
    for (const [name, p] of Object.entries(armPriors)) arms[name] = scoreFile(d.tokens, lexCode(d.text, p));
    perFile.push(arms);
    if (!perRepo.has(d.repo)) perRepo.set(d.repo, { files: 0, arms: Object.fromEntries(Object.keys(arms).map((a) => [a, zeroVec()])) });
    const pr = perRepo.get(d.repo); pr.files++;
    for (const a of Object.keys(arms)) addVec(pr.arms[a], arms[a]);
  }
  return { perFile, perRepo };
}
// an AUTHORED wrong-language prior for the toy: other comment and string delimiters, other (deranged) keywords
const WRONG = (() => {
  const w = derangeKeywords(PRIOR, 2);
  w.language = "toyB";
  w.comments = [{ open: "//", close: null }];
  w.strings = [{ open: "'", close: "'", escape: "\\", multiline: false, trailing: false, interp: [], interpQuotes: [], prefixes: [], class: "string" }];
  return w;
})();
const MANY = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => toyDoc(k < 5 ? "repoC" : "repoD", 300 + k, 24, ["zeta", "kappa", "sigma", "theta", "lambda", "alpha", "beta"]));

test("A12: language specificity passes for the right prior and FAILS for a wrong one (control built to fail); the claimed prior's own language is excluded from the others", () => {
  assert.equal(PRIOR.language, "toy");
  const good = perFileOf(MANY, { real: PRIOR, generic: withoutKnowledge(PRIOR), b_genericDelims: baselinePriors("toy").genericDelims, o_toyB: WRONG });
  const g = gateClauses(good.perFile, good.perRepo);
  assert.equal(g.specificity.f1.pass, true, JSON.stringify(g.specificity.f1));
  assert.equal(g.specificity.class.pass, true);
  assert.ok(g.specificity.f1.margin >= 0.02 && g.specificity.f1.lo > 0);
  // swap: the wrong prior is the CLAIMED one and the true prior is among the others: s1 and s2 must fail with a negative margin
  const bad = perFileOf(MANY, { real: WRONG, generic: withoutKnowledge(WRONG), b_genericDelims: baselinePriors("toy").genericDelims, o_toy: PRIOR });
  const b = gateClauses(bad.perFile, bad.perRepo);
  assert.equal(b.specificity.f1.pass, false);
  assert.equal(b.specificity.class.pass, false);
  assert.ok(b.specificity.f1.margin < 0 && b.specificity.class.margin < 0, "the true prior beats the wrong claimed prior");
  // an identical copy under another name does exactly as well as the real arm: margin 0, not credited (a control that equals the real arm = broken mechanism, II.23)
  const same = perFileOf(MANY, { real: PRIOR, generic: withoutKnowledge(PRIOR), b_genericDelims: baselinePriors("toy").genericDelims, o_clone: PRIOR });
  assert.equal(gateClauses(same.perFile, same.perRepo).specificity.f1.pass, false);
  // others: every vendored prior except the claimed one's language
  const langs = listLexPriorLanguages();
  assert.ok(["c", "go", "java", "javascript", "python", "ruby"].every((l) => langs.includes(l)));
  assert.deepEqual(otherLanguagePriors(loadCodeLexPrior("python")).map((o) => o.language), langs.filter((l) => l !== "python"));
  assert.equal(otherLanguagePriors(PRIOR).length, langs.length, "a prior of a language that is not vendored has every vendored prior as an 'other'");
});

test("A13 gate: the strongest cheap baseline is chosen on the pooled score; a ceiling is flagged and fails (d1) instead of being waived", () => {
  const { perFile, perRepo } = perFileOf(MANY, { real: PRIOR, generic: withoutKnowledge(PRIOR), b_genericDelims: baselinePriors("toy").genericDelims, b_typedDelims: baselinePriors("toy").genericDelims });
  const g = gateClauses(perFile, perRepo);
  assert.ok(g.baseline && g.specificity === null, "no other-language arm: specificity is null (a typed gap), never a pass");
  for (const c of [g.baseline.boundary, g.baseline.class]) {
    assert.equal(c.ceilingBound, c.headroom < c.required, "the ceiling flag is exactly headroom < required margin");
    assert.ok(c.baseline >= Math.max(...Object.values(g.baseline.arms).map((a) => (c === g.baseline.boundary ? a.f1 : a.acc))) - 1e-12, "the control is the strongest baseline arm");
    if (c.ceilingBound) assert.equal(c.pass, false, "a clause a perfect system cannot pass is reported as failed, never waived");
  }
  assert.ok(BASELINE_ARMS.includes("generic") && BASELINE_ARMS.includes("b_typedDelimsOps"));
  assert.deepEqual(Object.keys(g.baseline.arms).sort(), ["b_genericDelims", "b_typedDelims", "generic"]);
});

test("bootstrap(only): restricting the summed arms changes nothing in the interval", () => {
  const per = [];
  for (let k = 0; k < 8; k++) { const d = toyDoc("r", 400 + k, 12); per.push({ real: scoreFile(d.tokens, lexCode(d.text, PRIOR)), ws: scoreFile(d.tokens, whitespaceSplit(d.text, PRIOR)), junk: scoreFile(d.tokens, []) }); }
  const full = bootstrap(per, (s) => f1Of(s.real) - f1Of(s.ws), 200, 11);
  const only = bootstrap(per, (s) => f1Of(s.real) - f1Of(s.ws), 200, 11, ["real", "ws"]);
  assert.deepEqual(only, full);
});

const MUTATIONS = [["python", "c"], ["python", "go"], ["ruby", "python"], ["javascript", "c"], ["go", "c"], ["java", "c"]]; // the review's six (text language, prior's language)
const HAVE_ALL = AV.available && ["python", "javascript", "c", "go", "ruby", "java"].every((l) => loadCodeLexPrior(l));
test("A12 mutation test (the review's six): another language's prior given as the prior is pass:false, never credited; the REGISTERED four clauses alone still pass for it", { skip: HAVE_ALL ? false : "gold extractor or one of the six priors absent" }, async () => {
  let registeredAllPass = 0;
  for (const [text, claimed] of MUTATIONS) {
    const r = await measure({ language: text, split: "dev", limit: 60, _prior: loadCodeLexPrior(claimed) });
    const cl = r.details.clauses;
    assert.equal(r.pass, false, `${text}<-${claimed} must not pass`);
    assert.ok(cl.failed.some((f) => /^s1:/.test(f)) && cl.failed.some((f) => /^s2:/.test(f)), `${text}<-${claimed} failed ${JSON.stringify(cl.failed)}`);
    assert.equal(r.details.licence.ok, false);
    assert.equal(r.credited, false);
    assert.equal(cl.s1.language, text, "the true prior of the measured language is the strongest 'other' and beats the wrong one");
    assert.ok(cl.s1.margin < 0 && cl.s2.margin < 0);
    if (cl.a.pass && cl.b.pass && cl.c1.pass && cl.c2.pass) registeredAllPass++;
  }
  assert.equal(registeredAllPass, 6, "the review's finding, pinned: the registered clauses (a)(b)(c1)(c2) cannot tell a wrong-language prior from the right one");
});

test("A12/A13 on the real python prior (DEV, 30 files): the new clauses and controls are present, typed and deterministic", { skip: HAVE_PY ? false : "gold extractor or priors/code-lex-python.json absent" }, async () => {
  const a = await measure({ language: "python", split: "dev", limit: 30 });
  for (const k of ["strongestCheapBaselineF1", "strongestCheapBaselineClassAcc", "strongestOtherLanguagePriorF1", "strongestOtherLanguagePriorClassAcc", "cheapBaselines", "otherLanguagePriors"]) assert.ok(k in a.controls, `control ${k} missing`);
  assert.deepEqual(Object.keys(a.controls.otherLanguagePriors).sort(), ["c", "go", "java", "javascript", "ruby"], "FIVE other priors, not one cyclic partner");
  for (const k of ["d1", "d2", "s1", "s2"]) assert.ok(k in a.details.clauses, `clause ${k} missing`);
  assert.equal(typeof a.details.licence.registered, "boolean");
  assert.equal(a.details.licence.ok, a.details.licence.registered && a.details.clauses.s1.pass && a.details.clauses.s2.pass, "A12: licence.ok now includes language specificity");
  assert.equal(a.pass, a.details.clauses.failed.length === 0, "pass = every clause, registered and added");
  const b = await measure({ language: "python", split: "dev", limit: 30 });
  assert.deepEqual(a, b, "deterministic");
});

// ---- finding 2 (A14): evidence tier
test("A14: a DEV result is labelled dev-tuned and is never credited; only a first, full TEST run can be", async () => {
  assert.deepEqual(Object.keys(evidenceOf("dev")).sort(), ["creditable", "reason", "tier"]);
  assert.equal(evidenceOf("dev").tier, "dev-tuned"); assert.equal(evidenceOf("dev").creditable, false);
  assert.equal(evidenceOf("test").tier, "held-out-test");
  assert.equal(evidenceOf("train").creditable, false);
  // an unmeasured TEST request (no prior for the language: it returns before any file is read and spends no TEST) is never credited
  const t = await measure({ language: "cobol", split: "test" });
  assert.equal(t.evidence.tier, "held-out-test"); assert.equal(t.evidence.creditable, false); assert.equal(t.credited, false); assert.equal(t.pass, null);
  const d = await measure({ language: "cobol", split: "dev" });
  assert.equal(d.evidence.tier, "dev-tuned"); assert.equal(d.credited, false);
});

test("A14/A15: a measured DEV result says dev-tuned and says what class accuracy means (python, 12 files)", { skip: HAVE_PY ? false : "gold extractor or priors/code-lex-python.json absent" }, async () => {
  const a = await measure({ language: "python", split: "dev", limit: 12 });
  assert.equal(a.evidence.tier, "dev-tuned"); assert.equal(a.credited, false);
  assert.ok(a.notes.some((n) => /^dev-tuned \(A14\)/.test(n)));
  assert.ok(a.notes.includes(CLASS_MEANING), "the pass text states that class means agreement with gold.py's convention");
  assert.match(CLASS_MEANING, /gold\.py/); assert.match(CLASS_MEANING, /not agreement with a language standard/);
  assert.equal(a.details.classConvention.meaning, CLASS_MEANING);
  for (const k of ["strictAcc", "excludingTypeAcc", "standardRelabelAcc", "typeFoldedShare", "typeFoldedStandardKeywordShare"]) assert.ok(k in a.details.classConvention, `classConvention.${k} missing`);
  assert.ok("standardUnion" in a.details.classConvention && "keywordStandard" in a.details);
});

// ---- finding 3 (A15): the standards
test("A15 standards: sizes and non-members of the typed lists", () => {
  assert.equal(STANDARDS.python.keywords.length, 35); assert.equal(STANDARDS.c.keywords.length, 44); assert.equal(STANDARDS.go.keywords.length, 25);
  assert.equal(STANDARDS.ruby.keywords.length, 41); assert.equal(STANDARDS.java.keywords.length, 51); assert.equal(STANDARDS.javascript.keywords.length, 38);
  for (const l of Object.keys(STANDARDS)) assert.equal(new Set(STANDARDS[l].keywords).size, STANDARDS[l].keywords.length, `${l} has duplicates`);
  for (const w of ["int", "string", "true", "false", "nil", "iota"]) assert.ok(!STANDARDS.go.keywords.includes(w), `go: ${w} is predeclared, not a keyword`);
  for (const w of ["true", "false", "null"]) assert.ok(!STANDARDS.java.keywords.includes(w), `java: ${w} is a literal (JLS 3.10)`);
  for (const w of ["int", "char", "void", "unsigned", "restrict", "_Bool"]) assert.ok(STANDARDS.c.keywords.includes(w));
  assert.ok(standardKeywordSet("c").has("int") && standardKeywordSet("cobol") === null);
});

test("A15 standards, LIVE cross-checks against the executable authorities that exist on this machine (skipped per tool when absent)", async (t) => {
  if (toolOk("python3", ["--version"])) {
    const kw = JSON.parse(execFileSync("python3", ["-c", "import keyword,json;print(json.dumps(keyword.kwlist))"], { encoding: "utf8" }));
    assert.deepEqual([...kw].sort(), [...STANDARDS.python.keywords].sort(), "python: CPython's keyword.kwlist");
  } else t.diagnostic("python3 absent: python list not live-checked");
  if (toolOk("ruby", ["-rripper", "-e", "1"])) {
    const out = JSON.parse(execFileSync("ruby", ["-rripper", "-rjson", "-e", "puts JSON.generate(ARGV.map { |w| Ripper.lex(w).map { |e| e[1].to_s }.first })", ...STANDARDS.ruby.keywords, "puts", "foo", "lambda"], { encoding: "utf8" }));
    const n = STANDARDS.ruby.keywords.length;
    assert.ok(out.slice(0, n).every((e) => e === "on_kw"), "ruby: every listed word is Ripper on_kw");
    assert.ok(out.slice(n).every((e) => e === "on_ident"), "ruby: control words are identifiers");
  } else t.diagnostic("ruby absent: ruby list not live-checked");
  if (toolOk("clang", ["--version"])) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c1std-"));
    const f = path.join(dir, "kw.c");
    fs.writeFileSync(f, [...STANDARDS.c.keywords, "foo", "size_t", "NULL"].join("\n") + "\n");
    const r = spawnSync("clang", ["-std=c11", "-fsyntax-only", "-Xclang", "-dump-tokens", f], { encoding: "utf8", maxBuffer: 1 << 24 });
    const kinds = new Map();
    for (const m of (r.stderr || "").matchAll(/^(\S+) '([^']*)'/gm)) kinds.set(m[2], m[1]);
    for (const w of STANDARDS.c.keywords) assert.equal(kinds.get(w), w, `c: clang lexes ${w} as a keyword token (kind == spelling)`);
    for (const w of ["foo", "size_t", "NULL"]) assert.equal(kinds.get(w), "identifier", `c: ${w} is an identifier`);
    fs.rmSync(dir, { recursive: true, force: true });
  } else t.diagnostic("clang absent: C list not live-checked");
  const node = spawnSync(process.execPath, ["--expose-internals", "-e", "const a=require('internal/deps/acorn/acorn/dist/acorn');console.log(JSON.stringify(Object.keys(a.keywordTypes)))"], { encoding: "utf8" });
  if (node.status === 0) {
    const ac = JSON.parse(node.stdout.trim().split("\n").pop());
    assert.ok(ac.length > 30 && ac.every((w) => STANDARDS.javascript.keywords.includes(w)), `javascript: every acorn keyword is a listed reserved word (${ac.filter((w) => !STANDARDS.javascript.keywords.includes(w))})`);
  } else t.diagnostic("acorn internals unavailable: javascript list not live-checked");
});

test("A15 compareKeywordSets / standardUnionPrior / relabelGoldByStandard / dropTypeFromClassScoring behave as declared", () => {
  const prior = { words: { keyword: ["if", "else", "return", "#include"], literal: ["NULL"] } };
  const r = compareKeywordSets(prior, "c");
  assert.equal(r.standardWords, 44);
  assert.equal(r.standardWordsInPrior, 3, "if else return");
  assert.ok(r.standardMissingFromPrior.includes("int") && r.standardMissingFromPrior.includes("void") && !r.standardMissingFromPrior.includes("if"));
  assert.equal(r.missingCount, 41);
  assert.deepEqual(r.priorKeywordsNotInStandard, ["#include"]);
  assert.equal(compareKeywordSets(prior, "cobol"), null, "no standard held: a typed gap, said by the caller");
  const u = standardUnionPrior({ words: { keyword: ["if"], literal: ["int"] }, provenance: {} }, "c");
  assert.ok(u.words.keyword.includes("while") && !u.words.keyword.includes("int"), "a word the prior holds as a literal keeps its class");
  const text = "int x; size_t y; int";
  const gold = [{ start: 0, end: 3, class: "type" }, { start: 4, end: 5, class: "identifier" }, { start: 7, end: 13, class: "type" }, { start: 14, end: 15, class: "identifier" }, { start: 17, end: 20, class: "identifier" }];
  const rl = relabelGoldByStandard(text, gold, "c");
  assert.equal(rl.relabelled, 1);
  assert.deepEqual(rl.tokens.map((t) => t.class), ["keyword", "identifier", "type", "identifier", "identifier"], "only a TYPE token spelled like a standard reserved word is relabelled");
  assert.deepEqual(dropTypeFromClassScoring(gold).map((t) => t.class), ["other", "identifier", "other", "identifier", "identifier"]);
  const v = scoreFile(gold, gold.map((g) => ({ start: g.start, end: g.end, class: foldClass(g.class) })));
  assert.equal(accOf(v), 1);
  const vStd = scoreFile(rl.tokens, gold.map((g) => ({ start: g.start, end: g.end, class: foldClass(g.class) })));
  assert.ok(accOf(vStd) < 1, "scored under the standard, the gold-convention reading of `int` is a class error");
});

// ---- finding 3(a) (A15d): the second authority that CLASSIFIES (c1-xauth-class.mjs)
import { measure as measureCls, coarseOfClass, jsCoarse, rubyCoarse, clangCoarse, clangKeywordSet, standardCoarse, scoreClassFile, authorityTokens, K as KCLS, STANDARD_LITERALS } from "../eval/coding-competence/c1-xauth-class.mjs";

test("c1-xauth-class coarse mappings: lexer / gold classes, acorn labels, Ripper events, clang kinds, the standard-text authority", () => {
  assert.equal(coarseOfClass("keyword", "if"), "reserved");
  assert.equal(coarseOfClass("literal", "True"), "reserved", "a word literal is a reserved word in the engines' tables");
  for (const n of ["1", "0x1F", "-1", ".5", "+3"]) assert.equal(coarseOfClass("literal", n), "number", n);
  assert.equal(coarseOfClass("type", "int"), "identifier", "the registered fold: gold type -> identifier");
  assert.equal(coarseOfClass("operator", "+"), "symbol"); assert.equal(coarseOfClass("punctuation", "("), "symbol");
  assert.equal(coarseOfClass("other", "?"), null, "gold `other` is never scored");
  assert.equal(jsCoarse("class", "class", ""), "reserved");
  assert.equal(jsCoarse("default", "default", "."), "identifier", "a keyword spelling after a dot is an IdentifierName (ES 12.3)");
  assert.equal(jsCoarse("default", "default", "?."), "identifier");
  assert.equal(jsCoarse("name", "let", ""), "identifier", "acorn's tokenizer types `let` as a name: a convention gap, reported by the instrument");
  assert.equal(jsCoarse("num", "1", ""), "number"); assert.equal(jsCoarse("TEMPLATE", "`x`", ""), "string"); assert.equal(jsCoarse("(", "(", ""), "symbol"); assert.equal(jsCoarse("COMMENT", "//x", ""), "comment");
  assert.equal(rubyCoarse("on_kw"), "reserved"); assert.equal(rubyCoarse("on_ident"), "identifier"); assert.equal(rubyCoarse("on_const"), "identifier");
  assert.equal(rubyCoarse("on_int"), "number"); assert.equal(rubyCoarse("STRING"), "string"); assert.equal(rubyCoarse("on_comment"), "comment"); assert.equal(rubyCoarse("on_op"), "symbol");
  assert.equal(rubyCoarse("on_heredoc_beg"), null);
  const kw = new Set(["int", "while"]);
  assert.equal(clangCoarse("raw_identifier", "int", kw), "reserved"); assert.equal(clangCoarse("raw_identifier", "foo", kw), "identifier");
  assert.equal(clangCoarse("numeric_constant", "1", kw), "number"); assert.equal(clangCoarse("string_literal", '"a"', kw), "string"); assert.equal(clangCoarse("comment", "/*x*/", kw), "comment"); assert.equal(clangCoarse("l_paren", "(", kw), "symbol");
  const go = new Set(STANDARDS.go.keywords), java = new Set(STANDARDS.java.keywords), jl = new Set(STANDARD_LITERALS.java);
  assert.equal(standardCoarse("func", go), "reserved"); assert.equal(standardCoarse("nil", go), "identifier", "go: nil is a predeclared identifier");
  assert.equal(standardCoarse("null", java, jl), "reserved", "java: null is a literal the JLS reserves"); assert.equal(standardCoarse("int", java, jl), "reserved");
  assert.equal(standardCoarse("+", go), null, "only word-shaped text is judged");
  assert.equal(KCLS.COMPARABLE, 0.90); assert.equal(KCLS.CONV_TOL, 0.01);
});

test("c1-xauth-class scoreClassFile on the authored toy: a perfect lexer agrees with an authority built from the gold, a rotated-class arm does not (control built to fail), only triple matches count", () => {
  const authority = HELD.tokens.map((t) => [t.start, t.end, coarseOfClass(t.class, HELD.text.slice(t.start, t.end))]);
  const lex = lexCode(HELD.text, PRIOR);
  const bad = lex.map((t) => ({ ...t, class: t.class === "keyword" ? "identifier" : t.class }));
  const sc = scoreClassFile(HELD.text, HELD.tokens, authority, { lexer: lex, wrong: bad });
  assert.equal(sc.vec.lexer[0], authority.length); assert.equal(sc.vec.lexer[1], authority.length, "perfect lexer: every authority class agreed");
  assert.equal(sc.vec.gold[1], sc.vec.gold[0]); assert.equal(sc.vec.lexerGold[1], sc.vec.lexerGold[0]);
  assert.ok(sc.vec.wrong[1] < sc.vec.wrong[0], "calling every keyword an identifier disagrees with the authority");
  assert.ok(sc.conf.has("reserved>identifier") === false, "the real arm has no confusion; the `wrong` arm is not tallied in conf");
  // an authority token with no lexer lexeme at its span is not scored (triple match)
  const shifted = authority.map(([s, e, c]) => [s + 1, e, c]);
  const sc2 = scoreClassFile(HELD.text, HELD.tokens, shifted, { lexer: lex });
  assert.ok(sc2.vec.lexer[0] < authority.length, "boundary disagreements are not class evidence");
  assert.equal(sc2.authorityTokens, authority.length);
});

test("c1-xauth-class engines, LIVE on authored files (skipped per tool when absent): the classifying authorities say what the standards say", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c1clsx-"));
  const mk = (name, text) => { const p = path.join(dir, name); fs.writeFileSync(p, text); return { row: { path: p }, text, tokens: [] }; };
  const show = (d, toks) => toks.map(([s, e, c]) => `${d.text.slice(s, e)}:${c}`);
  try {
    if (toolOk("python3", ["--version"])) {
      const d = mk("a.py", "def f(x):\n    return None if x else 1.5  # c\nmatch = 3\n");
      const t = show(d, authorityTokens("python", [d]).get(d.row.path).tokens);
      assert.ok(t.includes("def:reserved") && t.includes("None:reserved") && t.includes("f:identifier") && t.includes("1.5:number") && t.includes("# c:comment") && t.includes("match:identifier"), t.join(" "));
    }
    if (toolOk("ruby", ["-rripper", "-e", "1"])) {
      const d = mk("a.rb", "class A\n  def b(x)\n    x.class\n  end\nend # c\n");
      const t = show(d, authorityTokens("ruby", [d]).get(d.row.path).tokens);
      assert.ok(t.includes("class:reserved") && t.includes("A:identifier") && t.some((e) => /^# c\s*:comment$/.test(e)), t.join(" "));   // Ripper's comment token carries its newline
      assert.equal(t.filter((x) => x === "class:reserved").length, 1, "Ripper is context-aware: `x.class` is a method name, not a keyword");
    }
    const acorn = spawnSync(process.execPath, ["--expose-internals", "-e", "require('internal/deps/acorn/acorn/dist/acorn')"], { encoding: "utf8" });
    if (acorn.status === 0) {
      const d = mk("a.js", "let a = x.default; const b = `t${a}`; // c\nfunction f() { return typeof a; }\n");
      const t = show(d, authorityTokens("javascript", [d]).get(d.row.path).tokens);
      assert.ok(t.includes("let:identifier"), "acorn's tokenizer types let as a name");
      assert.ok(t.includes("const:reserved") && t.includes("function:reserved") && t.includes("typeof:reserved") && t.includes("default:identifier"), t.join(" "));
      assert.ok(t.includes("`t${a}`:string") && t.includes("// c:comment"), t.join(" "));
    }
    if (toolOk("clang", ["--version"])) {
      const d = mk("a.c", "int main(void) { size_t n = 1; return n; } /* c */\n");
      const t = show(d, authorityTokens("c", [d]).get(d.row.path).tokens);
      assert.ok(t.includes("int:reserved") && t.includes("void:reserved") && t.includes("return:reserved") && t.includes("size_t:identifier") && t.includes("main:identifier") && t.includes("1:number") && t.includes("/* c */:comment"), t.join(" "));
      assert.deepEqual([...clangKeywordSet(["int", "foo", "while", "size_t", "_Bool"])].sort(), ["_Bool", "int", "while"]);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("c1-xauth-class: no authority is a typed gap (pass:null), never a pass", async () => {
  for (const language of ["cobol", "rust", ""]) {
    const r = await measureCls({ language });
    for (const k of SHAPE) assert.ok(k in r, `result lacks ${k}`);
    assert.equal(r.pass, null); assert.equal(r.credited, false);
    assert.ok(r.gaps.some((g) => /unmeasured/.test(g.reason)));
  }
});

test("c1-xauth-class DEV smoke: python (30 files) agrees with CPython's keyword table; java (30 files, standard-text) shows the convention gap; controls move the statistic", { skip: HAVE_PY ? false : "gold extractor or priors/code-lex-python.json absent" }, async () => {
  const a = await measureCls({ language: "python", limit: 30 });
  for (const k of SHAPE) assert.ok(k in a, `result lacks ${k}`);
  assert.equal(a.evidence.tier, "dev-tuned"); assert.equal(a.credited, false);
  assert.equal(a.details.authority.kind, "engine");
  assert.ok(a.score > 0.99, `lexer vs CPython class agreement ${a.score}`);
  assert.ok(a.controls.derangedKeywordsAgreement < a.score - 0.02 && a.controls.emptyPriorAgreement < a.score - 0.05, "the received knowledge moves agreement with an authority it was not derived from");
  assert.equal(typeof a.pass, "boolean");
  assert.deepEqual(a, await measureCls({ language: "python", limit: 30 }), "deterministic");
  if (loadCodeLexPrior("java")) {
    const j = await measureCls({ language: "java", limit: 30 });
    assert.equal(j.details.authority.kind, "standard-text");
    assert.ok(j.gaps.some((g) => /standard's reserved-word list/.test(g.reason)), "no engine for java: said as a gap, not hidden");
    assert.ok(j.details.agreement.conventionGap > 0.01, `java: gold folds int / void / boolean into identifier, the JLS lists them: gap ${j.details.agreement.conventionGap}`);
    assert.equal(j.pass, false);
    assert.ok(j.details.clauses.failed.some((f) => /^y2:/.test(f)));
  }
});
