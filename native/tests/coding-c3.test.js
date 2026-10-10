// coding-c3: the INSTRUMENT eval/coding-competence/c3-declared.mjs (rung C3, declared beings) is regression-guarded
// here; nothing in this file measures khora's reading of real code. It checks, on TOY corpora, that the instrument
// can fail: a perfect system scores 1, a deranged system scores low, the pass rule needs significance, a control that
// does as well as the real arm VOIDS the pass (II.23), thin data is a typed gap (never a silent pass), TEST is refused.
//
// A10 (third session): the suite also guards the PASS STATISTICS themselves (bootstrap percentiles, repository majority, the FT metric,
// the gold parse-error exclusion), the denominators of the pooled pass, control availability and the giver split of the gold. Each of those
// tests was written against a mutant of c3-declared.mjs that the earlier suite let through (see scratch-c3/mut/ and the header's A10).
//
// The toy corpora are AUTHORED by the model (labelled so): a C-like "toyc" and a python-like "toypy", generated from
// seeded syllables with disjoint name pools for train and dev, split by repository, with exact gold offsets. They test
// the instrument and the grammar-agnostic reader's mechanics; they are never held-out natural data. The real-corpus
// smoke at the bottom is skipped when the python gold toolchain or the corpus manifest is absent.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  RUNG, STAT, CONTROL_NAMES, ARM_ORDER, REPORTED_B_ARMS, PROBE_ARMS, DERANGE_ORDER, itemsOf, goldItems, countFile, prf, pool, f1of,
  makeResamples, bootstrapDiff, keywordRegexArm, casingOnlyArm, derangePrior, foreignLanguage, selectFiles, measure, measureAll,
  inScopeDef, SCOPE_KINDS, buildTrainPrior, loadManifest, localisationCount, causalityProbe, worstFilesOf, languageLicence,
  shuffledGoldRows, macroF1, SHUFFLE_ARMS, defsCapability,
  METRICS, SHIPPED_METRICS, compare, comparePair, evaluate, existingArm, definitionOwners, authoredDefNodesFromSource, giverOfFor, authoredOnly,
  evidenceOf, DEV_HISTORY, POST_DEV_READ_AMENDMENTS, languageOutcome,
} from "../eval/coding-competence/c3-declared.mjs";
import { pooledOutcome } from "../eval/coding-competence/c3-declared.mjs";
import {
  readDeclared, scoreOccurrences, casingOf, finalSegment, coarseKind, tokenize, compilePrior, recurrenceBucket,
  DECLARED_PRIOR_SCHEMA, PARAMS, ARM_OPTS, CHAINS, LEVELS,
} from "../adapters/code/declared.js";

// ── toy corpora (AUTHORED) ───────────────────────────────────────────────────────────────────────────────────────
function rngOf(seed) { let a = seed >>> 0; return () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; }; }
const SYL = ["ka", "lo", "mi", "ne", "ru", "sa", "to", "vi", "xe", "zu", "ba", "de", "fi", "go", "hu", "ja"];
const word = (rng, n) => { let s = ""; for (let i = 0; i < n; i += 1) s += SYL[Math.floor(rng() * SYL.length)]; return s; };
const cap = (s) => s[0].toUpperCase() + s.slice(1);

/** toy gold: lex `text` the way a grammar would (classes), attach the declared defs recorded by the generator */
function toyGold(text, defsRec, kw, lineC, blockC) {
  const tokens = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (/\s/.test(c)) { i += 1; continue; }
    let e, cls;
    if (lineC && text.startsWith(lineC, i)) { e = text.indexOf("\n", i); if (e < 0) e = n; cls = "comment"; }
    else if (blockC && text.startsWith(blockC[0], i)) { const j = text.indexOf(blockC[1], i + 2); e = j < 0 ? n : j + 2; cls = "comment"; }
    else if (c === '"') { let j = i + 1; while (j < n && text[j] !== '"') j += 1; e = j + 1; cls = "string"; }
    else if (text.startsWith("#define", i) && kw.has("#define")) { e = i + 7; cls = "keyword"; }
    else if (/[A-Za-z_]/.test(c)) { let j = i + 1; while (j < n && /\w/.test(text[j])) j += 1; e = j; cls = kw.has(text.slice(i, j)) ? "keyword" : "identifier"; }
    else if (/[0-9]/.test(c)) { let j = i + 1; while (j < n && /\w/.test(text[j])) j += 1; e = j; cls = "literal"; }
    else { e = i + 1; cls = "punctuation"; }
    tokens.push({ start: i, end: e, type: cls, class: cls });
    i = e;
  }
  return { gold_version: "toy", tokens, defs: defsRec, parse: { has_error: false, error_nodes: 0, missing_nodes: 0, error_bytes_frac: 0, uncovered_tokens: 0, n_bytes: n, n_chars: n } };
}

const KW_C = new Set(["int", "void", "struct", "return", "if", "else", "while", "#define"]);
function toycFile(rng, P) {
  let text = "";
  const defs = [];
  const add = (s) => { text += s; };
  const nItems = 6 + Math.floor(rng() * 6);
  const fnames = [];
  for (let k = 0; k < nItems; k += 1) {
    const r = rng();
    if (r < 0.2) {
      const nm = `${P.toUpperCase()}${word(rng, 2).toUpperCase()}_${k}`;
      add("#define "); defs.push({ kind: "macro", name: nm, start: text.length - 8, end: text.length, nameStart: text.length, nameEnd: text.length + nm.length, node: "preproc_def" }); add(`${nm} ${Math.floor(rng() * 90)}\n`);
    } else if (r < 0.35) {
      const nm = `${P.toUpperCase()}${cap(word(rng, 2))}`;
      add("struct "); defs.push({ kind: "class", name: nm, start: text.length, end: text.length + nm.length, nameStart: text.length, nameEnd: text.length + nm.length, node: "struct_specifier" });
      add(`${nm} {\n  int ${P}${word(rng, 1)};\n  int ${P}${word(rng, 1)}_z;\n};\n`);
    } else if (r < 0.9) {
      const nm = `${P}${word(rng, 2)}_${word(rng, 1)}`;
      const ty = rng() < 0.5 ? "int" : "void";
      add(`${ty} `); defs.push({ kind: "function", name: nm, start: text.length, end: text.length + nm.length, nameStart: text.length, nameEnd: text.length + nm.length, node: "function_declarator" });
      const callee = fnames.length && rng() < 0.7 ? fnames[Math.floor(rng() * fnames.length)] : `${P}ext_${word(rng, 1)}`;
      add(`${nm}(int a, int b) {\n  int local = ${callee}(a);\n  return local + b;\n}\n`);
      fnames.push(nm);
    } else {
      add(`// void ${P}${word(rng, 2)}_decoy(int x) {\n`);
    }
    if (rng() < 0.3) add(`/* int ${P}${word(rng, 2)}_note(void) {${rng() < 0.6 ? "\n   still inside the comment" : ""} */\n`);
    if (rng() < 0.3) add(`char *s${k} = "int ${P}${word(rng, 2)}_str(int x) {";\n`);
  }
  return { text, gold: toyGold(text, defs, KW_C, "//", ["/*", "*/"]) };
}

const KW_P = new Set(["def", "class", "return", "if", "else", "pass"]);
function toypyFile(rng, P) {
  let text = "";
  const defs = [];
  const add = (s) => { text += s; };
  const nItems = 6 + Math.floor(rng() * 6);
  for (let k = 0; k < nItems; k += 1) {
    const r = rng();
    if (r < 0.4) {
      const nm = `${P.toUpperCase()}${word(rng, 2).toUpperCase()}_${k}`;
      defs.push({ kind: "constant", name: nm, start: text.length, end: text.length + nm.length, nameStart: text.length, nameEnd: text.length + nm.length, node: "assignment" });
      add(`${nm} = ${Math.floor(rng() * 90)}\n`);
    } else if (r < 0.6) {
      const nm = `${P.toUpperCase()}${cap(word(rng, 2))}`;
      add("class "); defs.push({ kind: "class", name: nm, start: text.length, end: text.length + nm.length, nameStart: text.length, nameEnd: text.length + nm.length, node: "class_definition" });
      add(`${nm}:\n`);
      const m = 1 + Math.floor(rng() * 2);
      for (let q = 0; q < m; q += 1) {
        const mn = `${P}${word(rng, 2)}_${word(rng, 1)}`;
        add("    def "); defs.push({ kind: "function", name: mn, start: text.length, end: text.length + mn.length, nameStart: text.length, nameEnd: text.length + mn.length, node: "function_definition" });
        add(`${mn}(self, x):\n        return x + ${Math.floor(rng() * 9)}\n`);
      }
    } else if (r < 0.9) {
      const nm = `${P}${word(rng, 2)}_${word(rng, 1)}`;
      add("def "); defs.push({ kind: "function", name: nm, start: text.length, end: text.length + nm.length, nameStart: text.length, nameEnd: text.length + nm.length, node: "function_definition" });
      add(`${nm}(a, b):\n    local = ${P}ext_${word(rng, 1)}(a)\n    return local + b\n`);
    } else {
      add(`# def ${P}${word(rng, 2)}_decoy(x):\n`);
    }
    if (rng() < 0.3) add(`s${k} = "def ${P}${word(rng, 2)}_str(x):"\n`);
  }
  return { text, gold: toyGold(text, defs, KW_P, "#", null) };
}

function makeToyCorpus(dir, language, gen, opts = {}) {
  const { trainRepos = 2, trainFiles = 24, devRepos = 3, devFiles = 14, seed = 7 } = opts;
  fs.mkdirSync(dir, { recursive: true });
  const golds = new Map();
  const rows = { train: [], dev: [], test: [] };
  const exts = opts.exts ?? [gen === toycFile ? ".toyc" : ".toypy"];
  const mk = (split, repo, k, P, rng) => {
    const { text, gold } = gen(rng, P);
    const ext = exts[k % exts.length];
    const rel = `${repo}/f${k}${ext}`;
    const p = path.join(dir, `${language}-${split}-${repo}-f${k}${ext}`);
    fs.writeFileSync(p, text);
    golds.set(text, gold);
    rows[split].push({ path: p, rel, repo: `toy/${repo}`, bytes: text.length, lines: text.split("\n").length, sha256: crypto.createHash("sha256").update(text).digest("hex"), ext, restricted: false });
  };
  const rng = rngOf(seed);
  for (let r = 0; r < trainRepos; r += 1) for (let k = 0; k < trainFiles; k += 1) mk("train", `tr${r}`, k, "q", rng);
  for (let r = 0; r < devRepos; r += 1) for (let k = 0; k < devFiles; k += 1) mk("dev", `dv${r}`, k, "z", rng); // disjoint name pool: q.. vs z..
  const goldBatch = async (items) => items.map((it) => golds.get(it.text) ?? { error: "toy: unknown text" });
  return { rows, goldBatch, golds };
}

/** toy languages by name: { name: { gen, opts } } -> deps with the manifest, ONE gold batch for all, and the authored node types of each generator (A10-2) */
function toyDepsOf(dir, langs) {
  const manifest = { languages: {} };
  const batches = {};
  const authoredNodes = {};
  for (const [name, { gen, opts }] of Object.entries(langs)) {
    const c = makeToyCorpus(path.join(dir, name), name, gen, opts);
    manifest.languages[name] = c.rows;
    batches[name] = c.goldBatch;
    authoredNodes[name] = gen === toycFile ? ["preproc_def"] : ["assignment"];
  }
  const goldBatch = async (items) => {
    const out = [];
    for (const it of items) out.push((await batches[it.language]([it]))[0]);
    return out;
  };
  return { manifest, goldBatch, authoredNodes };
}
function toyDeps(dir, spec = {}) {
  return { ...toyDepsOf(dir, { toyc: { gen: toycFile, opts: spec.c }, toypy: { gen: toypyFile, opts: spec.p } }), foreignLanguage: { toyc: "toypy", toypy: "toyc" } };
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "c3-toy-"));
process.on("exit", () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });
const DEPS = toyDeps(TMP);
// two PASSING toy languages (toyc, toyc2: C-like, different seeds) and a python-like provider of their foreign prior. NOTE: toypy itself does
// not pass the A10 rule: like python against the keyword regex, its win on N and KN is the authored `constant` kind and it ties on FT.
const DEPS2 = { ...toyDepsOf(path.join(TMP, "two"), { toyc: { gen: toycFile }, toyc2: { gen: toycFile, opts: { seed: 9 } }, toypy: { gen: toypyFile } }), foreignLanguage: { toyc: "toypy", toyc2: "toypy", toypy: "toyc" } };

// ── 1. scoring: a perfect system scores 1, empty 0, deranged low ────────────────────────────────────────────────
test("RUNG metadata and contract constants", () => {
  assert.equal(RUNG.id, "c3");
  assert.ok(RUNG.question.length > 20);
  assert.equal(STAT.B, 2000);
  assert.deepEqual([...CONTROL_NAMES].sort(), ["casing_only", "deranged_foreign", "deranged_permuted", "keyword_regex"]);
  assert.ok(ARM_ORDER.includes("a") && ARM_ORDER.includes("b"));
  for (const a of ["b-casing", "b-recurrence", "b-scope", "b-h4", "b-prefix", "b-coarse"]) assert.ok(ARM_ORDER.includes(a) && REPORTED_B_ARMS.includes(a) && a in ARM_OPTS, a);
  // the arm of record is the FROZEN chain: A7 added levels, it did not change b
  assert.deepEqual([...CHAINS.full], ["h4", "h3", "h2", "h1"]);
  assert.deepEqual({ ...ARM_OPTS.b }, {});
  assert.deepEqual([...CHAINS.prefix], ["c1", "q2", "q3"], "the prefix chain is made of left-context levels only");
  assert.deepEqual(LEVELS.slice(0, 6), ["h4", "h3", "h2", "h1", "g2", "g1"], "the frozen levels keep their order; the new ones come after");
  assert.ok(SCOPE_KINDS.includes("constant") && SCOPE_KINDS.includes("function") && !SCOPE_KINDS.includes("variable"));
});

test("name normalisation, coarse kinds and casing are the declared ones", () => {
  assert.equal(finalSegment("Kamal::Configuration::Sshkit"), "Sshkit");
  assert.equal(finalSegment("exports.h"), "h");
  assert.equal(finalSegment("plain"), "plain");
  assert.equal(coarseKind("method"), "callable");
  assert.equal(coarseKind("interface"), "type");
  assert.equal(coarseKind("macro"), "macro");
  assert.equal(coarseKind("table"), "other");
  assert.equal(casingOf("PascalName"), "pascal");
  assert.equal(casingOf("SCREAMING_CASE"), "screaming");
  assert.equal(casingOf("snake_case"), "snake");
  assert.equal(casingOf("camelCase"), "camel");
  assert.equal(casingOf("_private"), "lower");
  assert.equal(recurrenceBucket(0), "0");
  assert.equal(recurrenceBucket(5), "4-7");
  assert.equal(inScopeDef({ kind: "constant" }), true);
  assert.equal(inScopeDef({ kind: "variable" }), false);
});

test("a perfect system scores 1; an empty one 0; a deranged one scores low", () => {
  const gold = { defs: [
    { kind: "function", name: "alpha" }, { kind: "method", name: "beta" }, { kind: "class", name: "Gamma" },
    { kind: "constant", name: "DELTA" }, { kind: "macro", name: "EPS" }, { kind: "variable", name: "ignored_variable" },
  ] };
  const gi = goldItems(gold);
  assert.equal(gi.N.size, 5, "variable is out of scope");
  const perfect = itemsOf(gold.defs.filter(inScopeDef).map((d) => ({ name: d.name, kind: coarseKind(d.kind) })));
  const r = countFile(perfect, gi);
  assert.deepEqual(prf(r.N), { tp: 5, fp: 0, fn: 0, precision: 1, recall: 1, f1: 1 });
  assert.equal(prf(r.KN).f1, 1);
  assert.equal(prf(r.FT).f1, 1);
  const empty = countFile(itemsOf([]), gi);
  assert.equal(prf(empty.N).f1, 0, "an empty prediction is F1 0, never undefined = good");
  assert.equal(prf(empty.N).precision, null);
  // deranged: every predicted name is another name of the file (shift by one): no name keeps its own
  const names = [...gi.N];
  const shifted = itemsOf(names.map((nm, i) => ({ name: names[(i + 1) % names.length] + "_x", kind: "callable" })));
  assert.ok(prf(countFile(shifted, gi).N).f1 < 0.2);
  // right name, wrong kind: N is 1, KN is not
  const wrongKind = itemsOf(gold.defs.filter(inScopeDef).map((d) => ({ name: d.name, kind: "type" })));
  const wk = countFile(wrongKind, gi);
  assert.equal(prf(wk.N).f1, 1);
  assert.ok(prf(wk.KN).f1 < 0.5);
  assert.equal(f1of(0, 0, 0), 0);
});

test("pooling sums counts (micro) and a duplicated gold name is one item", () => {
  const g1 = goldItems({ defs: [{ kind: "function", name: "a" }, { kind: "method", name: "a" }, { kind: "class", name: "B" }] });
  assert.equal(g1.N.size, 2, "same name declared twice in one file is one item");
  const r1 = countFile(itemsOf([{ name: "a", kind: "callable" }]), g1);
  const r2 = countFile(itemsOf([{ name: "z", kind: "callable" }]), goldItems({ defs: [{ kind: "function", name: "z" }, { kind: "function", name: "y" }] }));
  assert.deepEqual(pool([r1, r2], "N"), [2, 0, 2]);
});

// ── 2. the bootstrap can fail and is deterministic ─────────────────────────────────────────────────────────────────
test("paired bootstrap: identical arms straddle 0; a clearly better arm has lower bound > 0; deterministic", () => {
  const rng = rngOf(3);
  const good = [], same = [], bad = [];
  for (let i = 0; i < 60; i += 1) {
    const g = 8 + Math.floor(rng() * 5);
    good.push({ N: [g, 0, 0] }); same.push({ N: [g, 0, 0] }); bad.push({ N: [Math.floor(g / 2), g, g - Math.floor(g / 2)] });
  }
  const rs = makeResamples(60);
  const rs2 = makeResamples(60);
  assert.deepEqual([...rs.idx.slice(0, 50)], [...rs2.idx.slice(0, 50)], "fixed seed");
  const t = bootstrapDiff(good, same, "N", rs);
  assert.equal(t.diff, 0);
  assert.ok(t.lo <= 0 && t.hi >= 0);
  const b = bootstrapDiff(good, bad, "N", rs);
  assert.ok(b.diff > 0.5 && b.lo > 0, "the real arm beats a bad arm significantly");
  const rev = bootstrapDiff(bad, good, "N", rs);
  assert.ok(rev.hi < 0, "and the reverse does not");
});

// ── 3. baselines and the reader's mechanics on the toy corpus ────────────────────────────────────────────────────
test("selectFiles is deterministic, repository-stratified, and skips restricted rows", () => {
  const rows = [];
  for (const repo of ["a", "b", "c"]) for (let k = 0; k < 5; k += 1) rows.push({ repo, rel: `${k}`, sha256: `${repo}${k}`, restricted: false });
  rows.push({ repo: "d", rel: "x", sha256: "x", restricted: true });
  const s1 = selectFiles(rows, 6);
  const s2 = selectFiles([...rows].reverse(), 6);
  assert.deepEqual(s1.map((r) => r.repo + r.rel), s2.map((r) => r.repo + r.rel));
  assert.equal(new Set(s1.map((r) => r.repo)).size, 3, "round-robin over repositories");
  assert.ok(!selectFiles(rows, null).some((r) => r.restricted));
});

test("derangements: no key keeps its value; nobody keeps its own foreign prior", () => {
  const prior = { schema: DECLARED_PRIOR_SCHEMA, frames: { h4: { a: [1, 1], b: [2, 0], c: [3, 3], d: [4, 1] }, h3: {}, h2: {}, h1: {}, g2: {}, g1: {} },
    casing: { pascal: [5, 2], snake: [9, 1], lower: [3, 0] }, recurrence: { 0: [4, 2], 1: [6, 1] }, provenance: {} };
  const d = derangePrior(prior);
  for (const k of Object.keys(prior.frames.h4)) assert.notDeepEqual(d.frames.h4[k], prior.frames.h4[k]);
  for (const k of Object.keys(prior.casing)) assert.notDeepEqual(d.casing[k], prior.casing[k]);
  assert.deepEqual(Object.keys(d.frames.h4).sort(), Object.keys(prior.frames.h4).sort(), "same keys, moved values");
  for (const l of DERANGE_ORDER) assert.notEqual(foreignLanguage(l), l);
  assert.notEqual(foreignLanguage("rust"), "rust");
});

test("the baselines read the masked text only: keyword regex and casing-only on a toy file", async () => {
  const prior = await (async () => {
    const { getPrior } = await import("../eval/coding-competence/c3-declared.mjs");
    return getPrior("toyc", DEPS);
  })();
  const text = `#define MAXV 9\n// def fake_comment(x):\nstruct PointKa {\n  int x;\n};\nint real_fn(int a) {\n  char *s = "def in_string(q):";\n  return a;\n}\n`;
  const P = compilePrior(prior);
  const { spans } = tokenize(text, P.lex);
  assert.ok(spans.some((sp) => sp.k === "comment") && spans.some((sp) => sp.k === "string"), "derived lexical prior masks both");
  assert.deepEqual(prior.lexical.lineComments, ["//"], "a // comment never spans lines and does not end alike: a LINE comment");
  assert.deepEqual(prior.lexical.blockComments, [["/*", "*/"]], "tokens that span lines and end alike: a BLOCK comment");
  // arm d on masked text: sees #define and struct, never the comment or the string; the C function has no keyword
  const masked = text.split("");
  for (const sp of spans) for (let i = sp.s; i < sp.e; i += 1) if (masked[i] !== "\n") masked[i] = " ";
  const d = keywordRegexArm(masked.join("")).map((x) => `${x.kind}:${x.name}`).sort();
  assert.deepEqual(d, ["macro:MAXV", "type:PointKa"], "#define and struct are keyword-introduced; the keyword-less C function is invisible to it");
});

test("arm c finds casing shapes only", async () => {
  const { getPrior } = await import("../eval/coding-competence/c3-declared.mjs");
  const prior = await getPrior("toyc", DEPS);
  const out = casingOnlyArm("int real_fn(int a) { return PointKa + MAXV + a; }", prior);
  assert.deepEqual(out.map((x) => `${x.kind}:${x.name}`).sort(), ["constant:MAXV", "type:PointKa"]);
});

// ── 4. the whole instrument on the toy corpus, through measure() and measureAll() ─────────────────────────────────
test("the reader's prior is built from TRAIN only and holds no name of any DEV file", async () => {
  const { getPrior } = await import("../eval/coding-competence/c3-declared.mjs");
  const prior = await getPrior("toyc", DEPS);
  assert.equal(prior.schema, DECLARED_PRIOR_SCHEMA);
  assert.equal(prior.provenance.split, "train");
  assert.ok(prior.provenance.repos.every((r) => r.startsWith("toy/tr")), "train repositories only");
  const blob = JSON.stringify(prior);
  const devNames = new Set();
  for (const r of DEPS.manifest.languages.toyc.dev) for (const m of fs.readFileSync(r.path, "utf8").matchAll(/\bz[A-Za-z_0-9]+/g)) devNames.add(m[0]);
  assert.ok(devNames.size > 50);
  for (const nm of devNames) assert.ok(!blob.includes(nm), `the prior leaks the dev name ${nm}`);
  // the prior nominates and refuses; it never invents a name that is not in the text
  const text = fs.readFileSync(DEPS.manifest.languages.toyc.dev[0].path, "utf8");
  for (const it of readDeclared(text, prior)) assert.ok(text.includes(it.name));
  assert.ok(prior.keywords.includes("return") && prior.keywords.includes("struct"), "closed class derived from the grammar tokens");
});

test("measure(): the real arm beats every control on the toy corpus, a perfect-gold check holds, shape is the contract", async () => {
  const card = await measure({ language: "toyc", split: "dev", deps: DEPS });
  for (const k of ["id", "rung", "split", "n", "applicable", "score", "control", "margin", "pass", "controls", "gaps", "notes", "details"]) assert.ok(k in card, `card.${k}`);
  assert.equal(card.id, "c3");
  assert.equal(card.n, DEPS.manifest.languages.toyc.dev.length);
  assert.ok(card.score >= 0.95, `real arm ${card.score}`);
  assert.deepEqual(Object.keys(card.controls).sort(), [...CONTROL_NAMES].sort());
  assert.ok(card.controls.casing_only < 0.7 && card.controls.keyword_regex < 0.7, JSON.stringify(card.controls));
  assert.ok(card.score - card.controls.deranged_foreign > 0.3 && card.score - card.controls.deranged_permuted > 0.3, JSON.stringify(card.controls));
  assert.ok(card.margin > 0.25 && Math.abs(card.margin - (card.score - card.control)) < 1e-12);
  assert.equal(card.pass, true);
  assert.ok(card.details.arms.b.N.f1 === card.score);
  // the ablations and arm a are reported; arm a is a TYPED GAP on an extension with no recipe, never a silent pass
  assert.ok(card.details.arms["b-casing"] && card.details.arms["b-scope"] && card.details.arms["b-recurrence"]);
  assert.equal(card.details.arms.a.typedGap, true, "A10-3: arm a with no recipe on any file is a TYPED GAP, not an F1 of 0");
  assert.equal(card.details.arms.a.N, undefined, "no F1 is reported for a typed gap");
  assert.deepEqual(card.details.armACoverage, { files: 0, of: card.n });
  assert.ok(card.gaps.some((g) => /no declaration recipe/.test(g.reason) && g.count === card.n));
  // a perfect system on the same files scores 1 through the same counting path
  const files = DEPS.manifest.languages.toyc.dev;
  let tot = [0, 0, 0];
  for (const r of files) {
    const text = fs.readFileSync(r.path, "utf8");
    const g = (await DEPS.goldBatch([{ language: "toyc", text, fileName: path.basename(r.path) }]))[0];
    const c = countFile(itemsOf(g.defs.filter(inScopeDef).map((d) => ({ name: d.name, kind: coarseKind(d.kind) }))), goldItems(g));
    tot = tot.map((v, i) => v + c.N[i]);
  }
  assert.equal(f1of(...tot), 1);
});

test("the pass needs significance: a control as good as the real arm voids the pooled pass (II.23)", async () => {
  const ok = await measureAll({ languages: ["toyc"], split: "dev", deps: DEPS });
  assert.equal(ok.pooled.details.licence.holds, true, JSON.stringify(ok.pooled.details.licence));
  assert.equal(ok.pooled.details.licence.ok, true, "the aggregator reads licence.ok");
  assert.equal(ok.pooled.pass, true, JSON.stringify(ok.pooled.details.namedFailures));
  assert.equal(ok.pooled.details.verdict, "PASS (DEV: development evidence, NOT held-out)", "A10-6: a DEV verdict says it is not held-out");
  assert.equal(ok.cards[0].details.licence.ok, true, "a single-language card carries its own licence (A7), not a deferred one");
  // break the control on purpose: the foreign prior IS the real prior, so the deranged arm equals the real arm
  const same = { ...DEPS, foreignLanguage: { toyc: "toyc", toypy: "toypy" } };
  const bad = await measureAll({ languages: ["toyc", "toypy"], split: "dev", deps: same });
  assert.equal(bad.cards[0].controls.deranged_foreign, bad.cards[0].score);
  assert.equal(bad.pooled.details.licence.holds, false);
  assert.equal(bad.pooled.pass, false, "a control that does as well as the real arm means the instrument or mechanism is broken");
  assert.match(bad.pooled.details.verdict, /^VOID/);
  assert.equal(bad.cards[0].pass, false, "and no significant margin over that control: the language does not pass either");
  for (const c of bad.cards) assert.equal(c.details.licence.ok, false, "the per-language licence fails too");
});

test("A7 per-language licence: ok is exactly the two drops against the declared threshold, and a failed licence voids that language's pass", async () => {
  const lic = (b, f, d) => languageLicence({ b: { N: { f1: b } }, deranged_foreign: { N: { f1: f } }, deranged_permuted: { N: { f1: d } } });
  assert.equal(lic(0.9, 0.3, 0.1).ok, true);
  assert.equal(lic(0.9, 0.81, 0.1).ok, false, "foreign control within 0.10 of the real arm");
  assert.equal(lic(0.9, 0.3, 0.85).ok, false, "permuted control within 0.10 of the real arm");
  assert.equal(languageLicence({ b: { N: { f1: 0.9 } }, deranged_foreign: { N: { f1: 0 } }, deranged_permuted: { N: { f1: 0 } } }, { foreignAvailable: false }).ok, null,
    "a foreign control that was never built could not have failed: deferred, never true");
  // consistency on the authored toys: pass is never true while the licence is false
  for (const language of ["toyc", "toypy"]) {
    const card = await measure({ language, split: "dev", deps: DEPS });
    const l = card.details.licence;
    assert.equal(l.ok, l.dropForeign >= STAT.LICENCE_DROP && l.dropPermuted >= STAT.LICENCE_DROP);
    if (l.ok === false) assert.equal(card.pass, false);
  }
});

test("thin data is a typed gap with denominators, never a silent pass; unmeasured languages say so", async () => {
  const thin = { ...DEPS, manifest: { languages: { toyc: { ...DEPS.manifest.languages.toyc, dev: DEPS.manifest.languages.toyc.dev.slice(0, 5) }, toypy: DEPS.manifest.languages.toypy } }, _priors: DEPS._priors };
  const card = await measure({ language: "toyc", split: "dev", deps: thin });
  assert.equal(card.pass, null);
  assert.ok(card.gaps.some((g) => g.reason === "below declared floor"));
  assert.equal(card.n, 5);
  const none = await measure({ language: "nolang", split: "dev", deps: DEPS });
  assert.equal(none.pass, null);
  assert.equal(none.score, null);
  assert.ok(none.gaps.some((g) => g.reason === "unmeasured"));
  assert.doesNotThrow(() => JSON.stringify(none));
});

test("restricted rows are neither trained on nor scored", async () => {
  const man = JSON.parse(JSON.stringify(DEPS.manifest));
  man.languages.toyc.dev[0].restricted = true;
  man.languages.toyc.train[0].restricted = true;
  const deps = { ...DEPS, manifest: man, _priors: undefined };
  const card = await measure({ language: "toyc", split: "dev", deps });
  assert.equal(card.n, DEPS.manifest.languages.toyc.dev.length - 1);
  const prior = await buildTrainPrior("toyc", { deps });
  assert.equal(prior.provenance.trainRows, DEPS.manifest.languages.toyc.train.length - 1);
});

test("TEST is refused unless C3_FINAL_TEST=1 (the one final card is the main agent's)", async () => {
  const saved = process.env.C3_FINAL_TEST;
  delete process.env.C3_FINAL_TEST;
  try {
    const card = await measure({ language: "toyc", split: "test", deps: DEPS });
    assert.equal(card.pass, null);
    assert.equal(card.score, null);
    assert.ok(card.gaps.some((g) => g.reason === "refused"));
  } finally { if (saved !== undefined) process.env.C3_FINAL_TEST = saved; }
});

// ── 4b. A7: the added arms, the localisation check and the prefix-invariance probe ─────────────────────────────────
test("A7 arms: all are reported on the toy corpus with the contract shape; b is unchanged by their existence", async () => {
  const card = await measure({ language: "toyc", split: "dev", deps: DEPS });
  for (const a of ["b-h4", "b-prefix", "b-coarse"]) {
    assert.ok(card.details.arms[a], a);
    assert.ok(card.details.ablationPass[a], `${a} is judged by the same pass rule and the verdict is stored, never part of pass`);
  }
  // b with the frozen options equals readDeclared's default (the regression the amendment promises)
  const text = fs.readFileSync(DEPS.manifest.languages.toyc.dev[0].path, "utf8");
  const { getPrior } = await import("../eval/coding-competence/c3-declared.mjs");
  const prior = await getPrior("toyc", DEPS);
  assert.deepEqual(readDeclared(text, prior, ARM_OPTS.b).map((d) => [d.name, d.kind, d.start]), readDeclared(text, prior).map((d) => [d.name, d.kind, d.start]));
  assert.throws(() => readDeclared(text, prior, { chain: "nope" }), RangeError);
});

test("A7 localisation: a hit at a call site is a TP name but not a localised one", () => {
  const gold = { defs: [{ kind: "function", name: "alpha", nameStart: 10, nameEnd: 15 }, { kind: "variable", name: "ignored", nameStart: 40, nameEnd: 47 }] };
  const [tp1, at1] = localisationCount([{ name: "alpha", start: 10, end: 15 }], gold);
  assert.deepEqual([tp1, at1], [1, 1]);
  const [tp2, at2] = localisationCount([{ name: "alpha", start: 90, end: 95 }], gold);
  assert.deepEqual([tp2, at2], [1, 0], "right name, wrong place: counted by the name metric, exposed here");
  assert.deepEqual(localisationCount([{ name: "ignored", start: 40, end: 47 }, { name: "ghost", start: 1, end: 6 }], gold), [0, 0], "out-of-scope and non-gold names are not TP");
});

test("A7 worst files: ranked by errors, ties by name, error-free files dropped", () => {
  const files = [0, 1, 2, 3].map((i) => ({ row: { rel: `f${i}` }, repo: "r" }));
  const rows = [{ N: [5, 0, 0] }, { N: [1, 3, 2] }, { N: [1, 1, 1] }, { N: [1, 2, 3] }];
  assert.deepEqual(worstFilesOf(files, rows, 2).map((x) => x.file), ["f1", "f3"], "f1 and f3 tie on 5 errors: by name");
  assert.deepEqual(worstFilesOf(files, [rows[0], rows[1], rows[2], { N: [0, 9, 9] }], 1).map((x) => x.file), ["f3"], "most errors first");
  assert.equal(worstFilesOf(files, rows, 9).length, 3);
});

test("A7 prefix-invariance probe: the strict-prefix arm agrees exactly, a reader that peeks ahead does not (the probe can fail)", async () => {
  const { getPrior } = await import("../eval/coding-competence/c3-declared.mjs");
  for (const language of ["toyc", "toypy"]) {
    const prior = await getPrior(language, DEPS);
    const files = DEPS.manifest.languages[language].dev.map((r) => ({ text: fs.readFileSync(r.path, "utf8") }));
    const probe = causalityProbe(files, prior, ["b-prefix", "b", "b-recurrence"]);
    assert.ok(probe["b-prefix"].admitted > 20, "the probe must have decisions to compare");
    assert.equal(probe["b-prefix"].flipped, 0, `${language}: a prefix reader's decision cannot depend on text after the token`);
    assert.equal(probe["b-prefix"].agreement, 1);
    assert.equal(probe["b-prefix"].unmatched, 0, "the prefix tokenises to the same tokens as the whole text before the cut");
  }
  // power: a scorer whose decision uses the FUTURE (does the name occur again later?) must be caught
  const prior = await getPrior("toyc", DEPS);
  const files = DEPS.manifest.languages.toyc.dev.map((r) => ({ text: fs.readFileSync(r.path, "utf8") }));
  const peek = (text, pr) => {
    const P = compilePrior(pr);
    const { rows } = scoreOccurrences(text, pr, ARM_OPTS["b-prefix"]);
    return { P, rows: rows.map((r) => ({ ...r, logit: text.indexOf(r.name, r.end) >= 0 ? 1 : -1 })) };
  };
  const honest = (text, pr) => {
    const P = compilePrior(pr);
    const { rows } = scoreOccurrences(text, pr, ARM_OPTS["b-prefix"]);
    return { P, rows: rows.map((r) => ({ ...r, logit: text.slice(0, r.start).includes(r.name) ? -1 : 1 })) };
  };
  const cheat = causalityProbe(files, prior, ["b-prefix"], { score: peek });
  assert.ok(cheat["b-prefix"].flipped > 0 && cheat["b-prefix"].agreement < 1, "a lookahead scorer is caught");
  const fair = causalityProbe(files, prior, ["b-prefix"], { score: honest });
  assert.equal(fair["b-prefix"].agreement, 1, "a scorer that reads only the earlier text is not");
});

test("A7 strict prefix: the prefix chain reads no right context (flipping everything to the right of a candidate changes nothing)", async () => {
  const { getPrior } = await import("../eval/coding-competence/c3-declared.mjs");
  const prior = await getPrior("toyc", DEPS);
  const text = fs.readFileSync(DEPS.manifest.languages.toyc.dev[1].path, "utf8");
  const a = scoreOccurrences(text, prior, ARM_OPTS["b-prefix"]).rows;
  // append a different tail: every decision of a token that ends before the old end is identical
  const b = scoreOccurrences(`${text}\nint zzz_tail(int q) { return q; }\n`, prior, ARM_OPTS["b-prefix"]).rows;
  for (const r of a) { const q = b.find((x) => x.start === r.start); assert.ok(q && q.logit === r.logit, `${r.name}@${r.start}`); }
  // while the frozen arm's recurrence witness DOES move when the future repeats a name (it is a lookahead statistic)
  const name = readDeclared(text, prior).find((d) => d.kind === "callable")?.name;
  assert.ok(name);
  const w0 = scoreOccurrences(text, prior, ARM_OPTS.b).rows.find((r) => r.name === name);
  const w1 = scoreOccurrences(`${text}\n${Array(9).fill(`${name}(1);`).join("\n")}\n`, prior, ARM_OPTS.b).rows.find((r) => r.name === name);
  assert.notEqual(w0.logit, w1.logit, "whole-file recurrence changes an earlier token's logit");
});

test("A8 shuffled gold: a perfect system collapses against another file's gold; the same system on its own gold scores 1; macro-F1 is per file", () => {
  const mk = (names) => goldItems({ defs: names.map((n) => ({ kind: "function", name: n })) });
  const golds = [mk(["a1", "a2", "common"]), mk(["b1", "b2", "common"]), mk(["c1", "c2", "c3"]), mk(["d1"])];
  const perfect = golds.map((g) => itemsOf([...g.N].map((name) => ({ name, kind: "callable" }))));
  const real = perfect.map((pred, i) => countFile(pred, golds[i]));
  assert.equal(prf(pool(real, "N")).f1, 1);
  const sh = shuffledGoldRows({ b: perfect, keyword_regex: perfect, casing_only: perfect }, golds);
  assert.deepEqual(Object.keys(sh).sort(), [...SHUFFLE_ARMS].sort());
  const f = prf(pool(sh.b, "N")).f1;
  assert.ok(f > 0 && f < 0.3, `only the shared name survives the shift: ${f}`);
  assert.deepEqual(shuffledGoldRows({ b: [perfect[0]], keyword_regex: [perfect[0]], casing_only: [perfect[0]] }, [golds[0]]).b, [], "one file cannot be shifted: empty, not a fake control");
  // macro: files weigh equally; empty-vs-empty files are skipped; a miss is 0
  const rows = [countFile(itemsOf([{ name: "x", kind: "callable" }]), mk(["x"])), countFile(itemsOf([]), mk(["y", "z"])), countFile(itemsOf([]), mk([]))];
  assert.equal(macroF1(rows, "N"), 0.5);
  assert.equal(macroF1([], "N"), null);
});

test("a language the gold says declares nothing is a TYPED not-applicable, a gold gap is unmeasured; neither is a pass", async () => {
  const mkGold = (defs) => async (items) => items.map(() => ({ capabilities: { defs }, tokens: [], defs: [], parse: { error_bytes_frac: 0 } }));
  const na = await measure({ language: "toyc", split: "dev", deps: { manifest: DEPS.manifest, goldBatch: mkGold({ status: "not_applicable", reason: "toy: data keys are not declarations" }) } });
  assert.equal(na.applicable, false);
  assert.equal(na.reason, "toy: data keys are not declarations");
  assert.equal(na.details.reason, na.reason, "the aggregator reads reason or details.reason");
  assert.equal(na.pass, null);
  assert.equal(na.score, null);
  assert.ok(!na.gaps.some((g) => g.reason === "unmeasured"), "not-applicable is not a hole");
  const gap = await measure({ language: "toyc", split: "dev", deps: { manifest: DEPS.manifest, goldBatch: mkGold({ status: "gap", reason: "toy: no tags query" }) } });
  assert.equal(gap.applicable, true);
  assert.equal(gap.pass, null);
  assert.ok(gap.gaps.some((g) => g.reason === "unmeasured" && /toy: no tags query/.test(g.detail)));
  assert.equal((await defsCapability("toyc", DEPS.manifest.languages.toyc.dev, DEPS)).status, "ok", "a gold without a capability record makes no claim");
});

// ── 6. A10: the PASS STATISTICS are guarded (each test below kills a mutant the earlier suite let through) ────────────
// an INDEPENDENT copy of the declared resampling procedure (header: STATISTICS): fixed seed, files resampled with replacement
function mulberry32Oracle(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f1Oracle = (tp, fp, fn) => (2 * tp + fp + fn === 0 ? 0 : (2 * tp) / (2 * tp + fp + fn));

test("A10 the declared constants of the pass statistics are pinned", () => {
  assert.deepEqual({ ...STAT }, { B: 2000, SEED: 20261005, MIN_FILES: 20, MIN_GOLD: 100, REPO_MIN_GOLD: 5, LICENCE_DROP: 0.1, MAJORITY: 2 / 3, MAX_GOLD_ERROR_FRAC: 0.02 });
  assert.deepEqual([...METRICS], ["N", "KN", "FT"], "A10-1: FT is the third pre-registered pass metric");
  assert.deepEqual([...SHIPPED_METRICS], ["SH"]);
});

test("A10 bootstrap: the interval is [2.5th, 97.5th] percentile (closed-form case)", () => {
  // two files: every resample is (0,0) p=1/4, (0,1) or (1,0) p=1/2 (the same pooled counts), (1,1) p=1/4. Each extreme group holds ~500 of 2000
  // draws, far above the 50 under the 2.5% cut, so the interval endpoints are the smallest and the largest diff; a median is the middle one.
  const A = [{ N: [4, 0, 0] }, { N: [0, 3, 3] }];
  const B = [{ N: [2, 2, 2] }, { N: [3, 0, 0] }];
  const d = (ia, ib) => f1Oracle(A[ia[0]].N[0] + A[ia[1]].N[0], A[ia[0]].N[1] + A[ia[1]].N[1], A[ia[0]].N[2] + A[ia[1]].N[2]) - f1Oracle(B[ib[0]].N[0] + B[ib[1]].N[0], B[ib[0]].N[1] + B[ib[1]].N[1], B[ib[0]].N[2] + B[ib[1]].N[2]);
  const v00 = d([0, 0], [0, 0]), v01 = d([0, 1], [0, 1]), v11 = d([1, 1], [1, 1]);
  assert.deepEqual([v11, v01, v00].map((x) => +x.toFixed(6)), [-1, -0.142857, 0.5], "hand values: the three possible differences");
  const bs = bootstrapDiff(A, B, "N", makeResamples(2));
  assert.ok(Math.abs(bs.lo - v11) < 1e-12, `lo ${bs.lo} is the smallest possible difference`);
  assert.ok(Math.abs(bs.hi - v00) < 1e-12, `hi ${bs.hi} is the largest possible difference`);
  assert.ok(bs.lo < v01 && v01 < bs.hi, "the 50th percentile (a median) is strictly inside the interval, so it is not an endpoint");
  assert.ok(Math.abs(bs.diff - d([0, 1], [0, 1])) < 1e-12, "the point estimate is the pooled difference");
});

test("A10 bootstrap: lo/hi equal the 2.5/97.5 percentiles of an independent fixed-seed resample (noisy pair)", () => {
  const rng = rngOf(11);
  const n = 40;
  const A = [], B = [];
  for (let i = 0; i < n; i += 1) {
    const g = 6 + Math.floor(rng() * 8);
    const ta = Math.floor(rng() * (g + 1)), tb = Math.floor(rng() * (g + 1));
    A.push({ N: [ta, Math.floor(rng() * 4), g - ta] });
    B.push({ N: [tb, Math.floor(rng() * 4), g - tb] });
  }
  const r = mulberry32Oracle(STAT.SEED);
  const diffs = [];
  for (let b = 0; b < STAT.B; b += 1) {
    let ta = 0, fa = 0, na = 0, tb = 0, fb = 0, nb = 0;
    for (let i = 0; i < n; i += 1) { const k = Math.floor(r() * n); ta += A[k].N[0]; fa += A[k].N[1]; na += A[k].N[2]; tb += B[k].N[0]; fb += B[k].N[1]; nb += B[k].N[2]; }
    diffs.push(f1Oracle(ta, fa, na) - f1Oracle(tb, fb, nb));
  }
  diffs.sort((x, y) => x - y);
  const bs = bootstrapDiff(A, B, "N", makeResamples(n));
  assert.equal(bs.lo, diffs[Math.floor(0.025 * STAT.B)]);
  assert.equal(bs.hi, diffs[Math.floor(0.975 * STAT.B)]);
  assert.ok(bs.lo < bs.diff && bs.diff < bs.hi, "a noisy pair: the point estimate is inside, and above the lower bound");
  assert.ok(bs.hi - bs.lo > 0.05, "a 95% interval of a noisy pair has width");
});

// compare(): the PASS RULE's two conditions on one comparison
function repoCase(spec) {
  const files = [], b = [], c = [];
  for (const [repo, n, brow, crow] of spec) for (let i = 0; i < n; i += 1) { files.push({ repo }); b.push({ N: brow }); c.push({ N: crow }); }
  return { files, rowsByArm: { b, c } };
}
const WIN = [[9, 0, 1], [5, 3, 5]], LOSE = [[4, 2, 2], [5, 1, 1]], WINSMALL = [[5, 1, 1], [4, 2, 2]];
const cmp = (spec) => { const { files, rowsByArm } = repoCase(spec); return compare(rowsByArm, files, makeResamples(files.length), "b", "c", "N"); };

test("A10 repository majority: a control that loses the pooled interval but wins a minority of repositories is NOT ok", () => {
  const one = cmp([["r1", 40, ...WIN], ["r2", 8, ...LOSE], ["r3", 8, ...LOSE]]);
  assert.ok(one.diff > 0.2 && one.lo > 0, `the pooled interval is clearly positive: ${one.lo}`);
  assert.deepEqual([one.repoWins, one.repoEligible], [1, 3]);
  assert.equal(one.ok, false, "(ii) fails: 1 of 3 repositories is not a majority");
  const two = cmp([["r1", 40, ...WIN], ["r2", 8, ...WINSMALL], ["r3", 8, ...LOSE]]);
  assert.deepEqual([two.repoWins, two.repoEligible], [2, 3]);
  assert.equal(two.ok, true, "2 of 3 with a positive lower bound passes");
  const tie = cmp([["r1", 40, ...WIN], ["r2", 8, ...LOSE]]);
  assert.deepEqual([tie.repoWins, tie.repoEligible], [1, 2]);
  assert.ok(tie.lo > 0);
  assert.equal(tie.ok, false, "a tie (1 of 2) is not a STRICT majority");
});

test("A10 the lower bound must be STRICTLY positive: a win carried by one file per repository has lo === 0 and is not ok", () => {
  // 3 repositories x 40 files; b equals the control on every file but one per repository, where it is better. A resample that draws none of the three
  // improved files (p ~ 0.37, far above 2.5%) has a difference of exactly 0, so the lower bound is exactly 0 although b wins every repository.
  const files = [], b = [], c = [];
  for (const repo of ["r1", "r2", "r3"]) for (let i = 0; i < 40; i += 1) { files.push({ repo }); b.push({ N: i === 0 ? [9, 0, 1] : [5, 2, 3] }); c.push({ N: i === 0 ? [5, 3, 5] : [5, 2, 3] }); }
  const r = compare({ b, c }, files, makeResamples(files.length), "b", "c", "N");
  assert.deepEqual([r.repoWins, r.repoEligible], [3, 3]);
  assert.ok(r.diff > 0);
  assert.equal(r.lo, 0, "the 2.5th percentile is exactly 0");
  assert.equal(r.ok, false, "lo > 0 is strict: a lower bound of 0 is no evidence");
});

test("A10 the lower bound is half of the rule (clean case): identical arms are never ok", () => {
  const r = cmp([["r1", 20, [5, 2, 3], [5, 2, 3]], ["r2", 20, [5, 2, 3], [5, 2, 3]], ["r3", 20, [5, 2, 3], [5, 2, 3]]]);
  assert.equal(r.diff, 0);
  assert.equal(r.ok, false);
});

test("A10 repository majority: repositories under REPO_MIN_GOLD are not eligible (neither win nor loss)", () => {
  const spec = [["r1", 40, ...WIN], ["r2", 8, ...WINSMALL], ["r3", 8, ...LOSE], ["tiny", 1, [2, 3, 2], [3, 1, 1]]];
  const r = cmp(spec);
  assert.deepEqual([r.repoWins, r.repoEligible], [2, 3], "the tiny repository (4 gold items < 5) is left out; counting it would make 2 of 4, no majority");
  assert.equal(r.ok, true);
});

test("A10 the lower bound is half of the rule: every repository won but the interval straddles 0 is NOT ok", () => {
  // per repository: 3 files where b is much better and 3 where it is much worse, b ahead by a hair in total
  const X = [[8, 0, 2], [3, 5, 7]], Y = [[4, 5, 6], [8, 0, 2]];
  const files = [], b = [], c = [];
  for (const repo of ["r1", "r2", "r3"]) for (let i = 0; i < 6; i += 1) { const [br, cr] = i % 2 ? Y : X; files.push({ repo }); b.push({ N: br }); c.push({ N: cr }); }
  const r = compare({ b, c }, files, makeResamples(files.length), "b", "c", "N");
  assert.deepEqual([r.repoWins, r.repoEligible], [3, 3], "b wins every repository");
  assert.ok(r.diff > 0 && r.lo <= 0, `but the paired interval includes 0 (diff ${r.diff.toFixed(3)}, lo ${r.lo.toFixed(3)})`);
  assert.equal(r.ok, false);
});

// evaluate(): FT is a pass metric, SH is the pass without authored kinds
const synthRow = (N, FT = N, SH = null) => ({ N, KN: N, FT, ...(SH ? { SH, AU: [0, 0] } : {}), kinds: {} });
function synth({ bN, cN, bFT = bN, cFT = cN, bSH = null, cSH = null, nullControl = null, n = 30 }) {
  const files = Array.from({ length: n }, (_, i) => ({ repo: `r${i % 3}` }));
  const rows = {};
  for (const a of ARM_ORDER) {
    const isControl = CONTROL_NAMES.includes(a);
    rows[a] = files.map((_, i) => (a === nullControl && (nullControl === "deranged_foreign") && (nullControl && i % 2 === 0 && synth.partial) ? null : a === nullControl && !synth.partial ? null : isControl || a === "a" ? synthRow(cN, cFT, cSH) : synthRow(bN, bFT, bSH)));
  }
  return { files, rows, rs: makeResamples(n) };
}
const GOOD = [9, 0, 1], BAD = [5, 4, 5];

test("A10-1 FT is a pass metric: b ahead on N and KN but not on FT does not pass; ahead on all three does", () => {
  const all = synth({ bN: GOOD, cN: BAD });
  const e1 = evaluate(all.files, all.rows, all.rs);
  assert.equal(e1.pass, true);
  for (const c of CONTROL_NAMES) for (const m of ["N", "KN", "FT"]) assert.equal(e1.comparisons[`b_vs_${c}_${m}`].ok, true, `${c} ${m}`);
  const noFT = synth({ bN: GOOD, cN: BAD, bFT: BAD, cFT: BAD });
  const e2 = evaluate(noFT.files, noFT.rows, noFT.rs);
  assert.equal(e2.comparisons.b_vs_keyword_regex_N.ok, true);
  assert.equal(e2.comparisons.b_vs_keyword_regex_KN.ok, true);
  assert.equal(e2.comparisons.b_vs_keyword_regex_FT.ok, false, "FT ties");
  assert.equal(e2.pass, false, "a tie on FT voids the pass although N and KN pass (python's case against the keyword regex)");
});

test("A10-2 the pass without authored kinds (SH) is a second verdict beside the pass of record", () => {
  const withSH = synth({ bN: GOOD, cN: BAD, bSH: GOOD, cSH: BAD });
  const e1 = evaluate(withSH.files, withSH.rows, withSH.rs);
  assert.equal(e1.pass, true);
  assert.equal(e1.passShippedOnly, true);
  assert.ok(e1.arms.b.SH && e1.arms.b.authoredRecall);
  // every authored-kind win and no shipped-scope win: the pass of record holds, the shipped-only pass does not
  const authoredWin = synth({ bN: GOOD, cN: BAD, bSH: BAD, cSH: BAD });
  const e2 = evaluate(authoredWin.files, authoredWin.rows, authoredWin.rs);
  assert.equal(e2.pass, true, "N, KN, FT are won");
  assert.equal(e2.passShippedOnly, false, "SH is a tie: authored-gold conformance, not reading skill");
  assert.equal(e2.shippedComparisons.b_vs_keyword_regex_SH.ok, false);
  // no giver recorded: SH is not computed, never a pass
  const none = synth({ bN: GOOD, cN: BAD });
  const e3 = evaluate(none.files, none.rows, none.rs);
  assert.equal(e3.passShippedOnly, null);
  assert.deepEqual(e3.shippedComparisons, {});
});

test("A10-5 evaluate: a control that was never built is unavailable (null, not 0), partial controls compare on the files that have them", () => {
  const miss = synth({ bN: GOOD, cN: BAD, bSH: GOOD, cSH: BAD, nullControl: "deranged_foreign" });
  const e = evaluate(miss.files, miss.rows, miss.rs);
  assert.deepEqual(e.missingControls, ["deranged_foreign"]);
  assert.equal(e.arms.deranged_foreign.unavailable, true);
  assert.equal(e.arms.deranged_foreign.N, undefined, "no F1 at all (never 0)");
  assert.equal(e.comparisons.b_vs_deranged_foreign_N.unavailable, true);
  assert.equal(e.comparisons.b_vs_deranged_foreign_N.ok, false, "a missing control is never a win");
  assert.equal(e.passAvailable, true, "the controls that exist are all beaten");
  assert.equal(e.pass, false, "but the pass of record needs every control");
  assert.equal(e.passShippedOnly, null, "undetermined, not true");
  synth.partial = true;
  try {
    const half = synth({ bN: GOOD, cN: BAD, nullControl: "deranged_foreign" });
    const h = evaluate(half.files, half.rows, half.rs);
    assert.deepEqual(h.partialControls, ["deranged_foreign"]);
    assert.deepEqual(h.missingControls, []);
    assert.equal(h.comparisons.b_vs_deranged_foreign_N.files, 15);
    assert.equal(h.comparisons.b_vs_deranged_foreign_N.partial, true);
  } finally { synth.partial = false; }
});

test("A10 gold parse-error exclusion: error_bytes_frac > 0.02 is a typed gap and is not scored; exactly 0.02 is scored", async () => {
  const dev = DEPS.manifest.languages.toyc.dev;
  const bad = new Set(dev.slice(0, 3).map((r) => path.basename(r.path)));
  const edge = path.basename(dev[3].path);
  const wrap = (frac) => async (items) => (await DEPS.goldBatch(items)).map((g, i) => {
    const name = items[i].fileName;
    if (bad.has(name)) return { ...g, parse: { ...g.parse, error_bytes_frac: frac } };
    if (name === edge) return { ...g, parse: { ...g.parse, error_bytes_frac: 0.02 } };
    return g;
  });
  const deps = { ...DEPS, goldBatch: wrap(0.05), _priors: undefined };
  const card = await measure({ language: "toyc", split: "dev", deps });
  assert.equal(card.n, dev.length - 3, "the three unreliable files are not scored; the one at exactly the tolerance is");
  const gap = card.gaps.find((g) => /gold parse unreliable/.test(g.reason));
  assert.ok(gap && gap.count === 3, JSON.stringify(card.gaps));
  assert.ok(gap.reason.includes(String(STAT.MAX_GOLD_ERROR_FRAC)));
  // none of their gold items are in the totals
  let expected = 0;
  for (const r of dev) {
    if (bad.has(path.basename(r.path))) continue;
    const text = fs.readFileSync(r.path, "utf8");
    const g = (await DEPS.goldBatch([{ language: "toyc", text, fileName: path.basename(r.path) }]))[0];
    expected += goldItems(g).N.size;
  }
  assert.equal(card.details.goldItems.N, expected);
  // and the exclusion is applied to TRAIN files too: an unreliable train file is not trained on
  const trainBad = DEPS.manifest.languages.toyc.train.slice(0, 2).map((r) => path.basename(r.path));
  const tdeps = { ...DEPS, goldBatch: async (items) => (await DEPS.goldBatch(items)).map((g, i) => (trainBad.includes(items[i].fileName) ? { ...g, parse: { ...g.parse, error_bytes_frac: 0.5 } } : g)), _priors: undefined };
  const prior = await buildTrainPrior("toyc", { deps: tdeps });
  assert.equal(prior.provenance.trainGaps.parseUnreliable, 2);
  assert.equal(prior.provenance.files, DEPS.manifest.languages.toyc.train.length - 2);
});

// ── 7. A10: denominators, control availability, arm-a coverage, giver, evidence ──────────────────────────────────────
test("A10-4 pooledOutcome: unmeasured / undetermined languages are non-passes that stay in the denominator; a gap is never a PASS", () => {
  const o = (langPass, nullLangs, nDecl, extra = {}) => pooledOutcome({ licenceHolds: true, statsOk: true, langPass, nullLangs, nDecl, split: "test", ...extra });
  assert.deepEqual([o(4, 0, 6).pass, o(4, 0, 6).verdict], [true, "PASS"]);
  assert.equal(o(3, 0, 6).pass, false, "3 of 6 is below ceil(12/3) = 4");
  assert.equal(o(3, 0, 6).verdict, "FAIL");
  assert.equal(o(2, 4, 6).pass, null, "2 pass, 4 unmeasured: could still reach 4, but it is not a pass");
  assert.match(o(2, 4, 6).verdict, /^PARTIAL \(2 of 6 measured\)/);
  assert.equal(o(1, 1, 6).pass, false, "1 pass + 1 null = 2 < 4: need cannot be reached whatever the null language does");
  assert.match(o(1, 1, 6).verdict, /^FAIL; PARTIAL \(5 of 6 measured\)/);
  assert.equal(o(4, 1, 6).pass, null, "enough passes, one language unmeasured: PARTIAL, never PASS");
  for (let nDecl = 1; nDecl <= 8; nDecl += 1) for (let nullLangs = 1; nullLangs <= nDecl; nullLangs += 1) for (let p = 0; p <= nDecl - nullLangs; p += 1) assert.notEqual(o(p, nullLangs, nDecl).pass, true, `${p} pass, ${nullLangs} null of ${nDecl}`);
  assert.equal(o(4, 0, 6, { licenceHolds: null }).pass, null, "an undetermined licence (a control never ran) is not a PASS");
  assert.match(o(4, 0, 6, { licenceHolds: null }).verdict, /^PARTIAL .*licence is undetermined/);
  assert.equal(o(4, 0, 6, { licenceHolds: false }).pass, false);
  assert.match(o(4, 0, 6, { licenceHolds: false }).verdict, /^VOID/);
  assert.match(o(4, 2, 6, { licenceHolds: false }).verdict, /^VOID.*PARTIAL \(4 of 6 measured\)/);
  assert.equal(o(4, 0, 6, { statsOk: false }).pass, false);
  assert.equal(o(4, 0, 6, { split: "dev" }).verdict, "PASS (DEV: development evidence, NOT held-out)");
  assert.equal(o(4, 0, 6, { split: "test" }).verdict, "PASS");
  assert.equal(o(0, 0, 0).needPass, 0);
  // need is CEIL(2n/3): at n = 4 two passes are not enough, and at n = 3 two are
  assert.equal(o(2, 0, 4).pass, false);
  assert.equal(o(3, 0, 4).pass, true);
  assert.equal(o(2, 0, 3).pass, true);
  assert.equal(o(1, 0, 3).pass, false);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((n) => o(n, 0, n).needPass), [1, 2, 2, 3, 4, 4, 5]);
});

test("A10-5 languageOutcome: the three-valued PASS_LANG (a bar that never ran is not a pass; a failed bar beats an undetermined one)", () => {
  const f = (floorOk, statPass, licenceOk) => languageOutcome({ floorOk, statPass, licenceOk });
  for (const st of [true, false, null]) for (const lic of [true, false, null]) assert.equal(f(false, st, lic), null, "below the floor: always a typed gap");
  assert.equal(f(true, true, true), true);
  assert.equal(f(true, true, false), false, "a failed licence voids a pass");
  assert.equal(f(true, true, null), null, "an undetermined licence (missing foreign control) is not a pass");
  assert.equal(f(true, false, true), false);
  assert.equal(f(true, false, false), false);
  assert.equal(f(true, false, null), false, "an available control already failed: false whatever the missing one does");
  assert.equal(f(true, null, true), null, "a missing control: undetermined");
  assert.equal(f(true, null, false), false);
  assert.equal(f(true, null, null), null);
});

test("A10-4 measureAll: unmeasured languages stay in the denominator (the reviewer's case: 2 measured of 6 is never a PASS)", async () => {
  const langs = ["toyc", "toyc2", "nolang1", "nolang2", "nolang3", "nolang4"];
  const r = await measureAll({ languages: langs, split: "dev", deps: DEPS2 });
  assert.equal(r.cards.filter((c) => c.score !== null).length, 2);
  assert.equal(r.cards[0].pass, true);
  assert.equal(r.cards[1].pass, true);
  assert.notEqual(r.pooled.pass, true, "the old code returned pass:true here (need = ceil(4/3) = 2 of the 2 measured)");
  assert.equal(r.pooled.pass, null);
  assert.match(r.pooled.details.verdict, /^PARTIAL \(2 of 6 measured\)/);
  assert.equal(r.pooled.details.languagesNeeded, 4);
  assert.equal(r.pooled.details.denominator.applicable, 6);
  assert.deepEqual(r.pooled.details.denominator.unmeasured.map((x) => x.language), ["nolang1", "nolang2", "nolang3", "nolang4"]);
  const holes = r.pooled.gaps.filter((g) => g.reason === "unmeasured");
  assert.deepEqual(holes.map((g) => g.language), ["nolang1", "nolang2", "nolang3", "nolang4"]);
  assert.ok(holes.every((g) => g.count === 1 && g.of === 6), "typed, with the denominator");
});

test("A10-4 a language below the floor is undetermined: PARTIAL, not a pass of the pool", async () => {
  const m2 = DEPS2.manifest.languages;
  const thin = { ...DEPS2, manifest: { languages: { ...m2, toyc: { ...m2.toyc, dev: m2.toyc.dev.slice(0, 5) } } }, _priors: DEPS2._priors };
  const r = await measureAll({ languages: ["toyc", "toyc2"], split: "dev", deps: thin });
  assert.equal(r.cards[0].pass, null);
  assert.equal(r.cards[1].pass, true);
  assert.equal(r.pooled.pass, null);
  assert.match(r.pooled.details.verdict, /^PARTIAL \(1 of 2 measured\)/);
  assert.deepEqual(r.pooled.details.denominator.undetermined.map((x) => x.language), ["toyc"]);
  assert.ok(r.pooled.gaps.some((g) => g.reason === "language pass undetermined" && g.language === "toyc"));
});

test("A10-4 typed not-applicable languages leave the denominator (and are listed), they are not unmeasured", async () => {
  const base = toyDepsOf(path.join(TMP, "na"), { toyc: { gen: toycFile }, toyc2: { gen: toycFile, opts: { seed: 9 } }, toypy: { gen: toypyFile }, toyna1: { gen: toycFile }, toyna2: { gen: toypyFile } });
  const deps = {
    ...base, foreignLanguage: { toyc: "toypy", toyc2: "toypy", toypy: "toyc" },
    goldBatch: async (items) => {
      const out = [];
      for (const it of items) out.push(it.language.startsWith("toyna") ? { capabilities: { defs: { status: "not_applicable", reason: "toy: data keys are not declarations" } }, tokens: [], defs: [], parse: { error_bytes_frac: 0 } } : (await base.goldBatch([it]))[0]);
      return out;
    },
  };
  const r = await measureAll({ languages: ["toyc", "toyc2", "toyna1", "toyna2"], split: "dev", deps });
  assert.deepEqual(r.cards.map((c) => c.applicable), [true, true, false, false]);
  assert.equal(r.pooled.details.denominator.applicable, 2);
  assert.equal(r.pooled.details.languagesNeeded, 2, "ceil(4/3) of the 2 applicable languages; counting the not-applicable ones would need 3 of 2");
  assert.equal(r.pooled.details.denominator.notApplicable.length, 2);
  assert.equal(r.pooled.details.denominator.notApplicable[0].reason, "toy: data keys are not declarations");
  assert.equal(r.pooled.pass, true, JSON.stringify(r.pooled.details.namedFailures));
  assert.ok(!r.pooled.gaps.some((g) => g.reason === "unmeasured"), "not-applicable is not a hole");
});

test("A10-5 languageLicence: a foreign control that was not built has a null drop and an undetermined licence; it is never a pass", () => {
  const arms = (f) => ({ b: { N: { f1: 0.9 } }, deranged_foreign: f, deranged_permuted: { N: { f1: 0.1 } } });
  const u = languageLicence(arms({ unavailable: true }), { foreignAvailable: true });
  assert.equal(u.ok, null);
  assert.equal(u.dropForeign, null, "never 0.9 - 0");
  assert.equal(languageLicence(arms({ N: { f1: 0.2 } }), { foreignAvailable: false }).ok, null);
  assert.equal(languageLicence(arms({ N: { f1: 0.2 } })).ok, true);
  const bothBad = languageLicence({ b: { N: { f1: 0.9 } }, deranged_foreign: { unavailable: true }, deranged_permuted: { N: { f1: 0.85 } } });
  assert.equal(bothBad.ok, false, "the permuted control already did as well as the real arm: false whatever the missing one does");
});

test("A10-5 foreign prior missing: the next language of the ring is used and recorded (the reviewer's case: java without python)", async () => {
  const deps = toyDepsOf(path.join(TMP, "fb"), { java: { gen: toycFile }, javascript: { gen: toypyFile }, c: { gen: toycFile } });
  const card = await measure({ language: "java", split: "dev", deps });
  assert.equal(card.details.foreignLanguage, "javascript", "ring after python is javascript");
  assert.equal(card.details.foreignFallback.wanted, "python");
  assert.equal(card.details.foreignFallback.used, "javascript");
  assert.notEqual(card.controls.deranged_foreign, null);
  assert.ok(card.controls.deranged_foreign < card.score);
  assert.ok(card.notes.some((n) => /fell back to javascript/.test(n)));
  assert.equal(typeof card.pass, "boolean", "a real control was run: the pass is decided");
  assert.equal(card.details.licence.ok, true);
});

test("A10-5 no foreign prior at all (or a pinned one that is missing): deranged_foreign is null, the pass is undetermined, the licence is not a pass", async () => {
  const solo = toyDepsOf(path.join(TMP, "solo"), { toyc: { gen: toycFile } });
  const pinnedMissing = { ...DEPS, foreignLanguage: { toyc: "ghost", toypy: "toyc" } };
  for (const [name, deps] of [["no other language", solo], ["pinned and missing", pinnedMissing]]) {
    const card = await measure({ language: "toyc", split: "dev", deps });
    assert.equal(card.controls.deranged_foreign, null, `${name}: never reported as 0`);
    assert.equal(card.details.arms.deranged_foreign.unavailable, true);
    assert.equal(card.details.foreignLanguage, null);
    assert.equal(card.details.licence.ok, null);
    assert.equal(card.details.licence.dropForeign, null);
    assert.equal(card.pass, null, `${name}: the three available controls are beaten, the fourth never ran: undetermined, not a pass`);
    assert.ok(card.gaps.some((g) => /control unavailable: deranged_foreign/.test(g.reason)));
    assert.equal(card.details.comparisons.b_vs_deranged_foreign_N.unavailable, true);
    assert.ok(card.score > 0.9, "the other three controls and the real arm are unaffected");
    assert.equal(card.control, Math.max(card.controls.casing_only, card.controls.keyword_regex, card.controls.deranged_permuted), "the strongest control ignores the one that did not run");
  }
  // an available control that fails makes the pass false even though another control is missing
  const weak = await measure({ language: "toyc", split: "dev", deps: { ...solo, manifest: solo.manifest, _priors: undefined } });
  assert.equal(weak.pass, null);
});

test("A10-5 a foreign ring that only leads back to the language itself yields NO control, never the real prior as its own control", async () => {
  const solo = toyDepsOf(path.join(TMP, "self"), { java: { gen: toycFile } });
  const card = await measure({ language: "java", split: "dev", deps: solo });
  assert.equal(card.details.foreignLanguage, null, "ring: javascript, c, go, ruby are missing and java is itself");
  assert.equal(card.controls.deranged_foreign, null);
  assert.equal(card.pass, null);
  const all = await measureAll({ languages: ["java"], split: "dev", deps: solo });
  assert.equal(all.pooled.pass, null, "the only language is undetermined: PARTIAL, not FAIL and not PASS");
  assert.match(all.pooled.details.verdict, /^PARTIAL \(0 of 1 measured\)/);
  assert.equal(all.pooled.details.pooledMissingControls[0], "deranged_foreign");
  assert.equal(all.pooled.details.licence.holds, null, "the foreign control never ran anywhere: the pooled licence is undetermined, not true");
  assert.equal(all.pooled.details.licence.ok, null, "the aggregator reads ok: null is deferred, never ok");
  assert.equal(all.pooled.details.licence.pooledDropForeign, null);
});

test("A10-4 the pooled statistics are a bar of their own: every language may pass or fail and the pool still fail on FT (repository majority of the pool)", async () => {
  // toyc and toyc2 pass on one repository each; toypy has four repositories where it ties the keyword regex on FT. Languages: 2 of 3 pass (need 2),
  // the licence holds, but the pooled FT comparison wins 2 of 6 repositories: no majority.
  const deps = { ...toyDepsOf(path.join(TMP, "three"), { toyc: { gen: toycFile, opts: { devRepos: 1, devFiles: 24 } }, toyc2: { gen: toycFile, opts: { seed: 9, devRepos: 1, devFiles: 24 } }, toypy: { gen: toypyFile, opts: { devRepos: 4 } } }), foreignLanguage: { toyc: "toypy", toyc2: "toypy", toypy: "toyc" } };
  const r = await measureAll({ languages: ["toyc", "toyc2", "toypy"], split: "dev", deps });
  assert.deepEqual(r.cards.map((c) => c.pass), [true, true, false]);
  assert.equal(r.pooled.details.languagesPassing, 2);
  assert.equal(r.pooled.details.languagesNeeded, 2);
  assert.equal(r.pooled.details.licence.holds, true, "the controls moved");
  assert.equal(r.pooled.details.pooledPass, false);
  assert.ok(r.pooled.details.namedFailures.some((f) => f.comparison === "b_vs_keyword_regex_FT"), JSON.stringify(r.pooled.details.namedFailures));
  assert.equal(r.pooled.pass, false, "enough languages pass, but the pooled statistics do not");
  assert.equal(r.pooled.details.verdict, "FAIL (DEV: development evidence, NOT held-out)");
});

test("A10-5 pooled licence: drops are taken over the files where the control exists; a missing control is not a zero", async () => {
  const deps = { ...DEPS2, foreignLanguage: { toyc: "ghost", toyc2: "toypy", toypy: "toyc" } };
  const r = await measureAll({ languages: ["toyc", "toyc2"], split: "dev", deps });
  const toyc2 = r.cards[1];
  assert.equal(r.cards[0].pass, null);
  assert.equal(r.cards[0].controls.deranged_foreign, null);
  assert.equal(r.pooled.details.licence.foreignFiles, toyc2.n, "only toyc2 files carry a foreign control");
  assert.ok(Math.abs(r.pooled.details.licence.pooledDropForeign - toyc2.details.licence.dropForeign) < 1e-12, "the pooled drop IS toyc2's drop; with toyc's files scored as F1 0 it would be inflated");
  assert.equal(r.pooled.details.licence.languagesBelowForeign, 1);
  assert.equal(r.pooled.details.licence.foreignLanguages, 1);
  assert.equal(r.pooled.details.licence.needForeign, 1);
  assert.equal(r.pooled.pass, null);
  assert.match(r.pooled.details.verdict, /^PARTIAL \(1 of 2 measured\)/);
  assert.notEqual(r.pooled.controls.deranged_foreign, null);
});

test("A10-5 pooled licence: b is taken over the SAME files as the control (a control-less language with a weaker b must not move the drop)", async () => {
  // toyc3's DEV gold is missing every third def, so the real arm over-predicts there and its F1 is well below 1; toyc3 has no foreign control
  const base = toyDepsOf(path.join(TMP, "weak"), { toyc2: { gen: toycFile, opts: { seed: 9 } }, toypy: { gen: toypyFile }, toyc3: { gen: toycFile, opts: { seed: 5 } } });
  const deps = {
    ...base, foreignLanguage: { toyc2: "toypy", toypy: "toyc2", toyc3: "ghost" },
    goldBatch: async (items) => {
      const out = await base.goldBatch(items);
      return out.map((g, i) => (items[i].language === "toyc3" && /-dev-/.test(items[i].fileName) ? { ...g, defs: g.defs.filter((_, k) => k % 3 !== 0) } : g));
    },
  };
  const r = await measureAll({ languages: ["toyc3", "toyc2"], split: "dev", deps });
  const [weak, good] = r.cards;
  assert.ok(weak.score < 0.95 && good.score > 0.99, `${weak.score} ${good.score}`);
  assert.equal(weak.controls.deranged_foreign, null);
  assert.ok(Math.abs(r.pooled.details.licence.pooledDropForeign - good.details.licence.dropForeign) < 1e-12, "the pooled foreign drop is F1_b - F1_foreign over toyc2's files only");
  assert.equal(r.pooled.details.licence.foreignFiles, good.n);
});

test("A10-3 arm a is scored over the files that have a recipe, never as zeros for the files that do not", async () => {
  const deps = { ...toyDepsOf(path.join(TMP, "cov"), { toyc: { gen: toycFile, opts: { exts: [".toyc", ".c"] } }, toypy: { gen: toypyFile } }), foreignLanguage: { toyc: "toypy", toypy: "toyc" } };
  const dev = deps.manifest.languages.toyc.dev;
  const covered = dev.filter((r) => r.ext === ".c");
  assert.ok(covered.length > 10 && covered.length < dev.length);
  const card = await measure({ language: "toyc", split: "dev", deps });
  assert.deepEqual(card.details.armACoverage, { files: covered.length, of: dev.length });
  assert.equal(card.details.arms.a.files, covered.length);
  // independent recount on the covered files only
  const giverOf = giverOfFor("toyc", deps);
  let tp = 0, fp = 0, fn = 0, allGold = 0, coveredGold = 0;
  for (const r of dev) {
    const text = fs.readFileSync(r.path, "utf8");
    const g = (await deps.goldBatch([{ language: "toyc", text, fileName: path.basename(r.path) }]))[0];
    const gi = goldItems(g, { giverOf });
    allGold += gi.N.size;
    if (r.ext !== ".c") continue;
    coveredGold += gi.N.size;
    const c = countFile(itemsOf(existingArm(text, path.basename(r.path), "toyc").items), gi);
    tp += c.N[0]; fp += c.N[1]; fn += c.N[2];
  }
  assert.deepEqual([card.details.arms.a.N.tp, card.details.arms.a.N.fp, card.details.arms.a.N.fn], [tp, fp, fn]);
  assert.ok(card.details.arms.a.N.fn < allGold - card.details.arms.a.N.tp, "uncovered files do not add their gold to a's misses");
  assert.ok(card.gaps.some((g) => /arm a: no declaration recipe/.test(g.reason) && g.count === dev.length - covered.length));
  // pooled: coverage, gaps with denominators, and a vs b on the SAME files
  const all = await measureAll({ languages: ["toyc", "toypy"], split: "dev", deps });
  const p = all.pooled.details;
  assert.deepEqual(p.armACoverage.toyc, { files: covered.length, of: dev.length });
  assert.deepEqual(p.armACoverage.toypy, { files: 0, of: deps.manifest.languages.toypy.dev.length });
  assert.equal(p.armAvsB.files, covered.length);
  assert.equal(p.armAvsB.of, dev.length + deps.manifest.languages.toypy.dev.length);
  assert.deepEqual(p.armAvsB.languages, ["toyc"]);
  assert.equal(p.arms.a.files, covered.length);
  assert.deepEqual([p.arms.a.N.tp, p.arms.a.N.fp, p.arms.a.N.fn], [tp, fp, fn], "pooled arm a = arm a over its covered files only");
  assert.equal(p.armAvsB.a.f1, card.details.arms.a.N.f1);
  assert.equal(p.armAvsB.b.tp + p.armAvsB.b.fn, coveredGold, "b is scored over the SAME covered files as a, not over every file");
  assert.equal(p.armAvsB.a.tp + p.armAvsB.a.fn, coveredGold);
  assert.equal(typeof p.armAvsB.aLessThanB, "boolean");
  const gapRows = all.pooled.gaps.filter((g) => /^arm a:/.test(g.reason));
  assert.deepEqual(gapRows.map((g) => [g.language, g.count, g.of]).sort(), [["toyc", dev.length - covered.length, dev.length], ["toypy", deps.manifest.languages.toypy.dev.length, deps.manifest.languages.toypy.dev.length]].sort());
});

test("A10-3 arm a with no covered file anywhere is a typed gap in the pooled card too", async () => {
  const r = await measureAll({ languages: ["toyc", "toypy"], split: "dev", deps: DEPS });
  assert.equal(r.pooled.details.armAvsB.typedGap, true);
  assert.equal(r.pooled.details.arms.a.unavailable, true);
  assert.equal(r.pooled.details.arms.a.N, undefined);
  assert.equal(r.pooled.gaps.filter((g) => /^arm a:/.test(g.reason)).length, 2);
});

test("A10-2 definitionOwners / authoredDefNodesFromSource read the giver of each def kind from gold.py itself", () => {
  assert.deepEqual([...definitionOwners("(module (assignment left: (identifier) @name) @definition.constant)")], ["assignment"]);
  assert.deepEqual([...definitionOwners("(preproc_def name: (identifier) @name) @definition.macro\n(preproc_function_def name: (identifier) @name) @definition.macro")].sort(), ["preproc_def", "preproc_function_def"]);
  assert.deepEqual([...definitionOwners("[(a name: (identifier) @name) (b name: (identifier) @name)] @definition.x")].sort(), ["a", "b"]);
  assert.deepEqual([...definitionOwners("(call_expression function: (identifier) @name) @reference.call")], [], "references are not definitions");
  const fake = '    # @@MAPS-BEGIN@@\n    "zz": L("zz", tags=True,\n        defs=\'\'\'\n(thing name: (identifier) @name) @definition.class\n\'\'\'),\n    "yy": L("yy", tags=True),\n    # @@MAPS-END@@\n';
  assert.deepEqual([...authoredDefNodesFromSource("zz", fake)], ["thing"]);
  assert.deepEqual([...authoredDefNodesFromSource("yy", fake)], [], "a language with no authored defs query: every def is shipped");
  assert.equal(authoredDefNodesFromSource("qq", fake), null, "not in the table: giver unrecorded");
  // the real table, as of gold-1
  assert.deepEqual([...authoredDefNodesFromSource("python")], ["assignment"], "python's module-level constants are the authored kind");
  assert.deepEqual([...authoredDefNodesFromSource("c")].sort(), ["preproc_def", "preproc_function_def"]);
  assert.deepEqual([...authoredDefNodesFromSource("java")].sort(), ["annotation_type_declaration", "enum_declaration", "record_declaration"]);
  for (const l of ["javascript", "go", "ruby"]) assert.deepEqual([...authoredDefNodesFromSource(l)], [], l);
  const g = giverOfFor("python");
  assert.equal(g({ node: "assignment", kind: "constant" }), "authored");
  assert.equal(g({ node: "function_definition", kind: "function" }), "shipped");
  assert.equal(giverOfFor("nolang"), null);
});

test("A10-2 countFile: SH masks authored-only names out of the prediction; AU is recall of the authored-only names", () => {
  const giverOf = (d) => (d.node === "assignment" ? "authored" : "shipped");
  const gold = goldItems({ defs: [
    { kind: "function", name: "fn_a", node: "function_definition" }, { kind: "class", name: "ClassB", node: "class_definition" },
    { kind: "constant", name: "KONST", node: "assignment" }, { kind: "constant", name: "BOTH", node: "assignment" }, { kind: "function", name: "BOTH", node: "function_definition" },
  ] }, { giverOf });
  assert.equal(gold.giverRecorded, true);
  assert.deepEqual([...gold.SH].sort(), ["BOTH", "ClassB", "fn_a"]);
  assert.deepEqual([...authoredOnly(gold)], ["KONST"], "a name a shipped def also declares is shipped");
  const r1 = countFile(itemsOf([{ name: "fn_a", kind: "callable" }, { name: "KONST", kind: "constant" }, { name: "ghost", kind: "callable" }]), gold);
  assert.deepEqual(r1.N, [2, 1, 2], "N: fn_a and KONST are hits, ghost is a false positive");
  assert.deepEqual(r1.SH, [1, 1, 2], "SH: KONST is removed from the prediction (neither TP nor FP); ghost is FP; ClassB and BOTH are misses");
  assert.deepEqual(r1.AU, [1, 1]);
  const r2 = countFile(itemsOf([{ name: "BOTH", kind: "callable" }]), gold);
  assert.deepEqual(r2.SH, [1, 0, 2], "BOTH is a shipped name too: it is a TP of SH");
  assert.deepEqual(r2.AU, [0, 1]);
  const none = countFile(itemsOf([]), goldItems({ defs: [{ kind: "function", name: "x" }] }));
  assert.equal(none.SH, undefined, "no giver recorded: no SH row (never a fake 0)");
});

test("A10-2 the toy cards carry the giver split: authored kinds, shares, per-arm authored recall, both passes", async () => {
  const card = await measure({ language: "toypy", split: "dev", deps: DEPS });
  assert.equal(card.details.giver.status, "recorded");
  assert.deepEqual(card.details.giver.authoredNodes, ["assignment"]);
  assert.ok(card.details.giver.goldNames.authoredOnly > 0 && card.details.giver.goldNames.shipped > 0);
  const share = card.details.giver.goldNames.authoredShare;
  assert.ok(share > 0.2 && share < 0.6, `constants are ~40% of toypy's items: ${share}`);
  assert.equal(card.details.arms.keyword_regex.authoredRecall.recall, 0, "a keyword regex cannot see module-level constants");
  assert.ok(card.details.arms.b.authoredRecall.recall > 0.9);
  assert.ok(card.details.arms.b.SH.f1 > 0.9);
  assert.ok("withAuthoredKinds" in card.details.passByScope && "shippedOnly" in card.details.passByScope);
  assert.equal(card.details.passByScope.withAuthoredKinds.pass, card.pass);
  // the reviewer's python story on the toy: the win over the keyword regex on N and KN is the AUTHORED kind; on FT it ties, so the pass is false
  assert.equal(card.details.comparisons.b_vs_keyword_regex_N.ok, true);
  assert.equal(card.details.comparisons.b_vs_keyword_regex_KN.ok, true);
  assert.equal(card.details.comparisons.b_vs_keyword_regex_FT.ok, false);
  assert.equal(card.pass, false, "N and KN alone (the pre-A10 rule) would have passed this language");
  assert.equal(card.details.passByScope.shippedOnly.pass, false, "and without authored kinds there is no win at all");
  assert.ok(card.details.shippedComparisons.b_vs_keyword_regex_SH);
  // a language the table does not know is a typed gap for SH, never a silent all-shipped
  const unk = await measure({ language: "toyc", split: "dev", deps: { ...DEPS, authoredNodes: undefined, _priors: DEPS._priors } });
  assert.equal(unk.details.giver.status, "unrecorded");
  assert.ok(unk.gaps.some((g) => g.reason === "giver of the gold unrecorded"));
  assert.equal(unk.details.passByScope.shippedOnly.pass, null);
  assert.equal(unk.details.arms.b.SH, undefined);
});

test("A10-6 a DEV card is development evidence and says so; only a TEST card is held-out", async () => {
  const dev = evidenceOf("dev");
  assert.equal(dev.heldOut, false);
  assert.equal(dev.class, "development");
  assert.ok(dev.amendmentsAfterDevRead.length >= 3 && dev.amendmentsAfterDevRead.some((a) => /A3/.test(a)));
  assert.equal(evidenceOf("test").heldOut, true);
  assert.equal(evidenceOf("train").heldOut, false);
  assert.equal(DEV_HISTORY.run1_frozenDesignBeforeDevWasRead.c[0], 0.907, "the run-1 number from before the DEV-driven lexical fix");
  assert.equal(DEV_HISTORY.run2_afterA3A5.c[0], 0.98);
  assert.ok(POST_DEV_READ_AMENDMENTS.length >= 4);
  const card = await measure({ language: "toyc", split: "dev", deps: DEPS });
  assert.equal(card.evidence.heldOut, false);
  assert.equal(card.details.evidence.class, "development");
  assert.match(card.notes[0], /^EVIDENCE: development, NOT held-out/);
  const all = await measureAll({ languages: ["toyc"], split: "dev", deps: DEPS });
  assert.equal(all.pooled.evidence.heldOut, false);
  assert.match(all.pooled.details.verdict, /\(DEV: development evidence, NOT held-out\)$/);
  assert.match(all.pooled.notes[0], /NOT held-out/);
});

// ── 5. real corpus smoke (skipped without the toolchain or the manifest) ───────────────────────────────────────────
const REAL_OK = (() => {
  try {
    if (!fs.existsSync("/private/tmp/claude-501/code-corpus/manifest.json")) return "corpus manifest absent";
    if (!fs.existsSync("/private/tmp/claude-501/venv/bin/python")) return "python gold venv absent";
    return false;
  } catch { return "unavailable"; }
})();
test("real DEV smoke (python, --limit 12): shape holds and below-floor is typed, not passed", { skip: REAL_OK }, async () => {
  assert.ok(loadManifest());
  const card = await measure({ language: "python", split: "dev", limit: 12 });
  assert.equal(card.id, "c3");
  assert.equal(card.split, "dev");
  assert.ok(card.n > 0 && card.n <= 12);
  assert.ok(card.score !== null && card.score > 0.5, `python real arm ${card.score}`);
  assert.equal(card.pass, null, "12 files is below the declared floor of 20: a typed gap, not a pass");
  assert.ok(card.gaps.some((g) => g.reason === "below declared floor"));
  assert.ok(card.controls.deranged_permuted < card.score);
  assert.ok(card.details.licence && typeof card.details.licence === "object" && "ok" in card.details.licence, "the licence is the card's own (A7)");
  assert.ok(card.details.localisation.rate >= 0.9, JSON.stringify(card.details.localisation));
  assert.ok(card.details.shuffledGold.b.shuffledF1 < card.details.shuffledGold.b.realF1, "the instrument-level control moves");
  assert.ok(card.details.macro.b.N > 0.5);
  assert.equal(card.details.causality.arms["b-prefix"].flipped, 0, "strict prefix reading is prefix-invariant on real python");
  assert.ok(card.details.causality.arms.b.agreement <= 1 && card.details.causality.arms.b.admitted > 0, "the frozen arm is probed too (whether it looks ahead is a measured number, not asserted here)");
});
