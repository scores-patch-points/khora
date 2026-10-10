// coding-c-priors: invariants of the C priors built from TRAIN and from the C grammar + engines.
//   priors/code-kw-c-grammar.json        (eval/coding-competence/build-c-kw-prior.py)
//   priors/code-name-train-recipe-c.json (eval/coding-competence/build-c-name-prior-train.mjs)
// These are CONSISTENCY tests of the shipped files (derivation rule, class disjointness, TRAIN-only provenance, internal sums).
// They do not measure khora on real code: the corpus-facing checks and their controls are in eval/coding-competence/verify-c-priors.mjs.
// The grammar test needs the gold python venv and is skipped without it; the manifest test is skipped when the manifest is absent.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadCodeKeywordPrior, keywordSetOf } from "../adapters/text/code-structure.js";
import { goldAvailable, PYTHON } from "../eval/coding-competence/gold.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIORS = path.resolve(HERE, "../priors");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const kw = readJson(path.join(PRIORS, "code-kw-c-grammar.json"));
const nm = readJson(path.join(PRIORS, "code-name-train-recipe-c.json"));
const MANIFEST = "/private/tmp/claude-501/code-corpus/manifest.json";

test("code-kw-c-grammar: schema, disjoint classes, sorted and unique", () => {
  assert.equal(kw.schema, "CodeKeywordPrior@1");
  assert.equal(kw.language, "c");
  for (const k of ["keywords", "softKeywords", "builtins", "directives"]) {
    assert.ok(Array.isArray(kw[k]) && kw[k].length > 0, `${k} non-empty`);
    assert.deepEqual([...kw[k]], [...new Set(kw[k])].sort(), `${k} sorted and unique`);
  }
  const hard = new Set(kw.keywords), soft = new Set(kw.softKeywords), bi = new Set(kw.builtins);
  for (const w of soft) assert.ok(!hard.has(w), `soft ${w} is also hard`);
  for (const w of bi) assert.ok(!hard.has(w) && !soft.has(w), `builtin ${w} overlaps`);
  assert.deepEqual(kw.stdlibModules, [], "C has no module list (typed not-applicable, never invented)");
  assert.ok(kw.provenance.stdlibModulesNotApplicable);
  assert.equal(kw.provenance.keywords_read, kw.keywords.length);
  assert.equal(kw.provenance.soft_keywords_read, kw.softKeywords.length);
  assert.equal(kw.provenance.builtins_read, kw.builtins.length);
});

test("code-kw-c-grammar: names its givers (grammar name, rev, source URL; engine versions)", () => {
  const g = kw.provenance.grammar;
  assert.equal(g.name, "tree-sitter-c");
  assert.match(g.source, /^https:\/\/github\.com\/tree-sitter\/tree-sitter-c$/);
  assert.match(g.rev, /^[0-9a-f]{40}$/);
  assert.ok(g.licence);
  assert.ok(kw.provenance.engines.clang && kw.provenance.engines.gcc);
  assert.equal(kw.provenance.trainVocabulary.split, "train");
});

test("code-kw-c-grammar: the class of each word follows the declared rule from the stored engine matrix", () => {
  const dialects = kw.engine.dialects, hardIx = dialects.indexOf("gnu17");
  assert.ok(hardIx >= 0);
  const reservedBoth = (w) => kw.engine.reserved[w].every((bits) => bits[hardIx] === "1");
  for (const w of kw.keywords) assert.ok(reservedBoth(w), `${w} is hard but not rejected by both engines under gnu17`);
  for (const w of [...kw.softKeywords, ...kw.builtins]) assert.ok(!reservedBoth(w), `${w} is rejected by both engines under gnu17 yet not hard`);
  // the split carries information: some words differ between dialects (C23-only words, vendor tokens)
  const differing = Object.values(kw.engine.reserved).filter((b) => new Set(b.join("")).size > 1);
  assert.ok(differing.length >= 1);
});

test("code-kw-c-grammar: no keyword names a being by construction; loader read of the new file works", () => {
  const set = keywordSetOf(kw);
  assert.ok(set instanceof Set && set.size === kw.keywords.length);
  // the shipped loader knows only py/js today: null is the documented gap (the needed edit is in verify-c-priors.mjs L1);
  // if the edit has since been made, the prior it returns must be a C CodeKeywordPrior@1
  const viaLoader = loadCodeKeywordPrior("c");
  assert.ok(viaLoader === null || (viaLoader.schema === "CodeKeywordPrior@1" && viaLoader.language === "c"));
});

test("code-kw-c-grammar: every anonymous word kind of the live grammar is classified (needs the gold venv)", { skip: !goldAvailable().available }, () => {
  const code = [
    "import sys, re",
    `sys.path.insert(0, ${JSON.stringify(path.resolve(HERE, "../eval/coding-competence"))})`,
    "import gold, json",
    "_, lang = gold.load('c')",
    "out = set()",
    "for i in range(lang.node_kind_count):",
    "    k = lang.node_kind_for_id(i)",
    "    if k and lang.node_kind_is_visible(i) and not lang.node_kind_is_named(i) and re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', k): out.add(k)",
    "print(json.dumps(sorted(out)))",
  ].join("\n");
  const r = spawnSync(PYTHON, ["-c", code], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const anon = JSON.parse(r.stdout.trim().split("\n").pop());
  assert.ok(anon.length > 50);
  const classified = new Set([...kw.keywords, ...kw.softKeywords]);
  for (const w of anon) assert.ok(classified.has(w), `grammar reserved word ${w} is unclassified`);
});

test("code-name-train-recipe-c: schema and internal sums", () => {
  assert.equal(nm.schema, "CodeNamePrior@1");
  assert.equal(nm.language, "c");
  const names = Object.keys(nm.names);
  assert.equal(names.length, nm.counts.distinctNames);
  assert.equal(names.filter((n) => nm.names[n].repos >= 2).length, nm.counts.namesAtOrAboveGenericFloor);
  for (const n of names) {
    const r = nm.names[n];
    assert.ok(r.repos >= 1 && r.repos <= nm.counts.repos && r.files >= r.repos, `${n}: repos/files out of range`);
    assert.deepEqual(r.kinds, ["function"], "the C recipe finds function definitions only");
  }
  assert.ok(nm.counts.totalDeclarations >= nm.counts.distinctNames);
});

test("code-name-train-recipe-c: provenance is TRAIN only and records its failures as failures", () => {
  const t = nm.provenance.train;
  assert.equal(t.split, "train");
  assert.equal(t.devTestRead, false);
  for (const restricted of ["git/git", "python/cpython"]) assert.ok(!t.repos.includes(restricted), `${restricted} is restricted (copyleft/not on the fetch list)`);
  assert.equal(nm.counts.repos, t.repos.length);
  const c = nm.provenance.checks;
  assert.equal(c.N1.pass, true, "independent recount equals the builder output");
  assert.equal(c.N2.preregistered.pass, false, "the pre-registered cross-family sum-check FAILED and is kept as a failure");
  assert.equal(c.N2.N2b.pass, true);
  assert.equal(c.N5.pass, false, "the pre-registered route-agreement check FAILED and is kept as a failure");
});

test("code-name-train-recipe-c: no TRAIN repository appears in dev/test of C (needs the manifest)", { skip: !fs.existsSync(MANIFEST) }, () => {
  const m = readJson(MANIFEST).languages.c;
  const held = new Set([...m.dev, ...m.test].map((f) => f.repo));
  for (const r of nm.provenance.train.repos) assert.ok(!held.has(r), `${r} is held out`);
  const trainRepos = new Set(m.train.filter((f) => !f.restricted).map((f) => f.repo));
  assert.deepEqual([...trainRepos].sort(), [...nm.provenance.train.repos].sort());
});
