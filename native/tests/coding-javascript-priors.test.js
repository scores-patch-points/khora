// coding-javascript-priors: the INSTRUMENT that builds priors/code-kw-javascript.json and priors/code-name-javascript.json is checked on TOY
// fixtures, and the shipped priors are checked for their own invariants. Nothing here measures khora on real code except the one integration
// test, which re-reads the manifest's javascript TRAIN files (never dev or test) and is skipped when the corpus is absent.
// The toy texts and toy gold are AUTHORED by the model (javascript-shaped text, hand-made token lists): tests of the instrument, never held-out data.
// Controls built to fail (II.23): a planted difference must be caught by the sum check; a planted keyword-named BINDING must be counted by the
// refusal witness while a keyword-named METHOD must not; an unlicensed control must never read as a pass; a repository-shifted gold must collapse
// the recipe-vs-grammar precision.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  declarationsOf, xidGap, tallyNames, attestationTotal, namesObject, partitionSum, compareNameTables, recipeVsGold, recallOf, shiftRepos, decideN3,
  witnessKeywords, decideR, verifyTrain, trainDigest, CONSTS, MANIFEST, RECIPES, RECIPE_EXTS, inRecipeFamily, TARGET_NODES,
} from "../eval/coding-competence/build-javascript-priors.mjs";
import { parseDeclarations, loadCodeKeywordPrior, loadCodeNamePriorSplit, keywordSetOf } from "../adapters/text/code-structure.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIORS = path.resolve(HERE, "../priors");
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const KW = readJson(path.join(PRIORS, "code-kw-javascript.json"));
const NM = readJson(path.join(PRIORS, "code-name-javascript.json"));
const OLD_KW = readJson(path.join(PRIORS, "code-kw-js.json"));

// ── the recipe ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("recipe: the split builder's js family recipe, verbatim (text-level check against the builder's own source)", () => {
  const src = fs.readFileSync(path.resolve(HERE, "../scripts/build-code-name-prior-split.mjs"), "utf8");
  for (const r of RECIPES) assert.ok(src.includes(`re: /${r.source}/${r.flags}`), `recipe ${r.kind} is verbatim in the split builder: ${r.source}`);
  assert.deepEqual([...RECIPE_EXTS], [".ts", ".tsx", ".js", ".mjs", ".jsx"]);
  assert.equal(inRecipeFamily("a/b.cjs"), false, ".cjs is not a recipe extension (a typed gap, N5)");
  assert.equal(inRecipeFamily("a/B.JSX"), true);
});

test("recipe: what it reads, and its known limits stated not hidden", () => {
  const text = [
    "export default async function boot() {}",
    "function* gen() {}",
    "  class Box extends Base {",
    "export const make = async (x) => x;",
    "const plain = () => 1;",
    "  delete() {}", // a method: invisible to the recipe
    "var f = function named() {};", // a var-bound function expression: invisible
  ].join("\n");
  assert.deepEqual(declarationsOf(text).map((d) => `${d.kind}:${d.name}`), ["function:boot", "function:gen", "class:Box", "function:make", "function:plain"]);
  // known false positive: an object literal that merely CONTAINS an arrow is read as a function binding (the lazy `[^=]*?` spans it)
  assert.deepEqual(declarationsOf("const opts = {\n  f: (x) => 1,\n};\n").map((d) => d.name), ["opts"]);
  // known limit: a line that STARTS with `function` inside a template literal is counted
  assert.deepEqual(declarationsOf("const s = `\nfunction inside_template() {}\n`;\n").map((d) => d.name), ["inside_template"]);
});

test("reader agreement: the reader's own recipe (code-structure.js, imported read-only) finds the same names", () => {
  const text = "export default async function boot() {}\nclass Box {}\nexport const make = async (x) => x;\nconst o = {\n a: (x) => 1,\n};\n";
  assert.deepEqual([...new Set(parseDeclarations(text, "x.js").map((d) => d.name))].sort(), [...new Set(declarationsOf(text).map((d) => d.name))].sort());
  assert.deepEqual(parseDeclarations(text, "x.cjs"), [], "the reader has no .cjs recipe either");
});

test("recipe gap: non-ASCII identifiers are measured, not mixed in", () => {
  const g = xidGap("function Διαβάζω() {}\nfunction plain() {}\nclass Ünï {}\n");
  assert.equal(g.total, 3); assert.equal(g.nonAscii, 2);
  assert.deepEqual(declarationsOf("function Διαβάζω() {}\n").map((d) => d.name), [], "the ASCII recipe cannot spell it, and captures no truncated prefix either");
});

// ── the tally and its sum check ────────────────────────────────────────────────────────────────────────────────────────────────────
const TOY = [
  { repo: "a/one", rel: "m.js", text: "function init() {}\nfunction main() {}\nclass Core {}\n" },
  { repo: "a/one", rel: "n.mjs", text: "function main() {}\nfunction only_one() {}\n" },
  { repo: "a/one", rel: "skipped.cjs", text: "function never_seen() {}\n" },
  { repo: "b/two", rel: "m.jsx", text: "function main() {}\nfunction init() {}\nfunction only_two() {}\n" },
  { repo: "c/three", rel: "m.js", text: "class Core {}\nfunction lone() {}\n" },
];

test("tally: names are counted per distinct REPOSITORY, files separately; .cjs is not read", () => {
  const t = tallyNames(TOY);
  assert.equal(t.names.get("main").repos.size, 2); assert.equal(t.names.get("main").files.size, 3);
  assert.equal(t.names.get("Core").repos.size, 2); assert.equal([...t.names.get("Core").kinds][0], "class");
  assert.equal(t.names.get("lone").repos.size, 1);
  assert.ok(!t.names.has("never_seen"), ".cjs is outside the recipe's extension family");
  assert.equal(t.files, 4); assert.equal(t.declarations, 10);
  assert.equal(attestationTotal(t.names), partitionSum(TOY), "the independent per-repository partition sums to the pooled count");
});

test("sum check: a planted difference IS caught (control built to fail)", () => {
  const mine = namesObject(tallyNames(TOY).names);
  assert.equal(compareNameTables(mine, JSON.parse(JSON.stringify(mine))).equal, true);
  const bumped = JSON.parse(JSON.stringify(mine)); bumped.main.repos += 1;
  const r = compareNameTables(mine, bumped);
  assert.equal(r.equal, false); assert.equal(r.nDiffering, 1);
  const dropped = JSON.parse(JSON.stringify(mine)); delete dropped.lone;
  assert.equal(compareNameTables(mine, dropped).nOnlyMine, 1);
});

// ── N3: recipe vs grammar, with the shifted-repository control ────────────────────────────────────────────────────────────────────────
test("N3: precision, targeted recall, and the control that must move", () => {
  const perRepo = new Map([["r1", new Set(["a", "b", "c"])], ["r2", new Set(["d", "e"])], ["r3", new Set(["f"])]]);
  const gold = new Set(["r1\ta", "r1\tb", "r1\tc", "r2\td", "r2\te", "r3\tf"]);
  const full = recipeVsGold(perRepo, gold);
  assert.equal(full.precision, 1); assert.equal(full.recall, 1);
  const shifted = shiftRepos(gold, perRepo.keys());
  assert.equal(shifted.size, gold.size);
  assert.equal(recipeVsGold(perRepo, shifted).precision, 0, "every pair names the wrong repository: nothing agrees");
  assert.equal(recallOf(perRepo, new Set(["r1\ta", "r1\tz"])).recall, 0.5);
  const real = { precision: 0.95 }, tgt = { recall: 0.97 };
  assert.deepEqual(decideN3(real, tgt, { precision: 0.05, targetedRecall: 0.04 }), { N3a: "pass", N3b: "pass" });
  assert.deepEqual(decideN3(real, tgt, { precision: 0.9, targetedRecall: 0.95 }), { N3a: "unlicensed", N3b: "unlicensed" }, "a control that does as well as the real arm licenses nothing");
  assert.deepEqual(decideN3({ precision: 0.8 }, { recall: 0.5 }, { precision: 0.1, targetedRecall: 0.1 }), { N3a: "fail", N3b: "fail" });
  assert.ok(TARGET_NODES.includes("class_declaration"));
});

// ── R1..R5 on a toy gold: BINDING vs MEMBER ───────────────────────────────────────────────────────────────────────────────────────────
function toyDoc(text, kinds, defs, types = {}) {
  // AUTHORED gold: tokenise on words; `kinds` maps a word to its class (default identifier), `types` maps a word to its node type (default = class)
  const tokens = [];
  const re = /[A-Za-z_$][\w$]*/g; let m;
  while ((m = re.exec(text))) { const c = kinds[m[0]] ?? "identifier"; tokens.push({ start: m.index, end: m.index + m[0].length, type: types[m[0]] ?? c, class: c }); }
  return { repo: "r", rel: "f.js", text, gold: { tokens, defs } };
}
const HARD = ["if", "function", "return", "this", "delete"], SOFT = ["get", "of"], BUILTINS = ["Map", "console"];
const KINDS = { if: "keyword", function: "keyword", return: "keyword", this: "keyword", delete: "identifier", get: "keyword" };
const TYPES = { delete: "property_identifier" };
const DEF = (name, node, kind = "function") => ({ name, node, kind });

test("R1/R4: a hard word as a METHOD or PROPERTY is not a violation; as a BINDING it is (control built to fail)", () => {
  const clean = [toyDoc("function a() { return this.delete(1); } class M { delete() {} }", KINDS, [DEF("a", "function_declaration"), DEF("delete", "method_definition", "method"), DEF("Map", "variable_declarator", "variable")], TYPES)];
  const w = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, incumbentHard: ["get", "a"], pythonHard: ["is", "a"], pythonSoft: [], docs: clean, draws: 20 });
  assert.equal(w.R1.hardViolations, 0, "`delete` as a method name is legal JavaScript");
  assert.equal(w.R1m.hardNamedMembers, 1); assert.equal(w.R1m.examples[0], "delete");
  assert.equal(w.R1.incumbentControlViolations, 1, "the incumbent-style control refuses the declared binding `a`");
  assert.ok(w.R1.randomControlMean >= 0);
  assert.ok(w.R4b.hardTextAsMember >= 1, "the property_identifier `delete` is counted as member use");
  assert.equal(w.R4a.collisions, 0);
  assert.equal(w.R5.builtinShadowingDefs, 0, "Map is a secondary (variable) def here, not a CORE def, so it is not a shadowing of a builtin by a being");
  // plant a violation: a BINDING named by a hard keyword, and a hard word typed as a binding identifier token
  const bad = [toyDoc("var x = 1;", { var: "keyword" }, [DEF("if", "variable_declarator", "variable")], {})];
  const wb = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, incumbentHard: ["get", "a"], pythonHard: ["if", "a"], pythonSoft: [], docs: [...clean, ...bad], draws: 20 });
  assert.equal(wb.R1.hardViolations, 1);
  assert.equal(decideR(wb).R1, "fail");
  const wi = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, incumbentHard: ["if"], pythonHard: [], pythonSoft: [], docs: [toyDoc("if x", { if: "identifier" }, [], {})], draws: 5 });
  assert.equal(wi.R4a.collisions, 1); assert.equal(decideR(wi).R4a, "fail");
  assert.ok(wi.R3.unattested.includes("if"), "`if` typed as an identifier does not attest the keyword");
});

test("R1/R2/R4a: an unlicensed control (that cannot fire) never reads as a pass", () => {
  const docs = [toyDoc("function a() { return 1; }", KINDS, [DEF("a", "function_declaration")], {})];
  const w = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, incumbentHard: ["zzz"], pythonHard: ["zzz"], pythonSoft: [], docs, draws: 5 });
  assert.equal(w.R1.incumbentControlViolations, 0); assert.equal(w.R1.pythonControlViolations, 0);
  assert.equal(decideR(w).R1, "unlicensed"); assert.equal(decideR(w).R4a, "unlicensed");
  // R2: a control that covers as much as the prior cannot license the coverage claim
  const same = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, incumbentHard: HARD, pythonHard: HARD, pythonSoft: SOFT, docs, draws: 5 });
  assert.equal(same.R2.coverage, 1); assert.equal(decideR(same).R2, "unlicensed");
  const apart = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, incumbentHard: ["zzz"], pythonHard: ["zzz"], pythonSoft: [], docs, draws: 5 });
  assert.equal(decideR(apart).R2, "pass", "a control that covers nothing licenses full coverage");
});

// ── TRAIN purity on a toy manifest ─────────────────────────────────────────────────────────────────────────────────────────────────
test("N2: TRAIN purity is checked and a planted overlap is caught (control built to fail)", () => {
  const sha = "a".repeat(64);
  const raw = "/private/tmp/claude-501/code-corpus/raw/";
  const row = (repo, rel, extra = {}) => ({ repo, path: `${raw}toy/${rel}`, rel, sha256: sha, bytes: 6, restricted: false, ...extra });
  const m = { languages: { javascript: { train: [row("t/ok", "ok.js")], dev: [row("d/dev", "d.js")], test: [row("e/test", "e.js")], info: { repos: { train: ["t/ok"] } } } }, repos: { "t/ok": { global_split: "train", restricted: false, license_class: "permissive" } } };
  assert.deepEqual(verifyTrain(m, "javascript", { readBytes: false }).problems, []);
  const leaked = JSON.parse(JSON.stringify(m)); leaked.languages.javascript.dev[0].repo = "t/ok";
  assert.ok(verifyTrain(leaked, "javascript", { readBytes: false }).problems.some((p) => /dev\/test/.test(p)));
  assert.equal(trainDigest(m.languages.javascript.train), trainDigest([...m.languages.javascript.train].reverse()));
});

// ── the shipped priors ────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("priors/code-kw-javascript.json: schema, closed class and provenance", { skip: !KW }, () => {
  assert.equal(KW.schema, "CodeKeywordPrior@1"); assert.equal(KW.language, "javascript");
  assert.equal(new Set(KW.keywords).size, KW.keywords.length);
  assert.deepEqual(KW.keywords.filter((w) => KW.softKeywords.includes(w)), [], "no word is both hard and soft (the builder refuses it)");
  for (const w of ["this", "super", "null", "true", "false", "function", "class", "const", "var", "typeof", "instanceof", "debugger", "with"]) assert.ok(KW.keywords.includes(w), `${w} cannot name a binding`);
  for (const w of ["get", "set", "of", "from", "as", "async", "await", "let", "static", "yield", "target", "meta", "using", "undefined"]) {
    assert.ok(KW.softKeywords.includes(w) && !KW.keywords.includes(w), `${w} is legally declarable in a sloppy script: soft, never refused`);
  }
  assert.ok(!KW.keywords.includes("enum"), "enum is ES-reserved but is not a javascript grammar token: a typed disagreement, not a silent addition");
  assert.ok(KW.provenance.derivation.engineRefusedButNotGrammarToken.includes("enum"));
  assert.ok(KW.builtins.includes("Promise") && KW.builtins.includes("Map"));
  assert.deepEqual(KW.stdlibModules, []); assert.equal(KW.provenance.derivation.stdlibModules.status, "not_applicable");
  const g = KW.provenance.grammar;
  assert.match(g.name, /tree-sitter/); assert.equal(g.packageVersion, "1.21.0"); assert.match(g.upstream, /^https:\/\/github\.com\/tree-sitter\/tree-sitter-javascript/);
  assert.match(g.packageSource, /^https:\/\//); assert.equal(g.upstreamCommit, null, "unrecorded upstream commit is a typed gap, not a guess");
  assert.ok(g.upstreamCommitNote);
  assert.equal(KW.provenance.engine.implementation, "v8");
  assert.match(KW.provenance.noCorpusRead, /no corpus file/);
  for (const k of ["K1", "K2", "K3", "K4", "K5", "K6"]) assert.equal(KW.provenance.derivation.checks[k], "pass", k);
  assert.equal(KW.provenance.trainWitness.hardKeywordsDeclaredAsBindingNames, 0);
  assert.match(KW.provenance.polarity, /BINDING names only/);
});

test("priors/code-kw-javascript.json vs the incumbent priors/code-kw-js.json: every word the incumbent over-refuses is soft here", { skip: !KW || !OLD_KW }, () => {
  const onlyThere = OLD_KW.keywords.filter((w) => !KW.keywords.includes(w));
  assert.ok(onlyThere.length >= 1);
  for (const w of onlyThere) assert.ok(KW.softKeywords.includes(w), `${w}: refused by the incumbent, accepted by V8 as a binding name`);
  const onlyHere = KW.keywords.filter((w) => !OLD_KW.keywords.includes(w));
  assert.deepEqual(onlyHere.sort(), ["false", "null", "super", "this", "true"]);
});

test("priors/code-name-javascript.json: schema, TRAIN-only provenance, internal consistency", { skip: !NM }, () => {
  assert.equal(NM.schema, "CodeNamePrior@1"); assert.equal(NM.language, "javascript");
  const p = NM.provenance;
  assert.equal(p.split, "train");
  assert.ok(Array.isArray(p.trainRepos) && p.trainRepos.every((r) => typeof r === "string" && /^[^/]+\/[^/]+$/.test(r)), "trainRepos are owner/repo STRINGS (run.mjs priorProvenance reads them as strings)");
  assert.equal(p.trainRepos.length, NM.counts.repos);
  assert.equal(Object.values(p.trainRepoFiles).reduce((a, b) => a + b, 0), p.trainFiles);
  assert.equal(p.recipeFiles, NM.counts.files);
  assert.equal(p.recipeFiles + p.filesNotInRecipeFamily.files, p.trainFiles);
  const entries = Object.entries(NM.names);
  assert.equal(entries.length, NM.counts.distinctNames);
  assert.equal(entries.filter(([, v]) => v.repos >= CONSTS.GENERIC_FLOOR).length, NM.counts.namesAtOrAboveGenericFloor);
  for (const [name, v] of entries) {
    assert.ok(v.repos >= 1 && v.repos <= NM.counts.repos, name); assert.ok(v.files >= v.repos, `${name}: a name in n repos is in >= n files`);
    assert.ok(v.kinds.length >= 1 && v.kinds.every((k) => k === "function" || k === "class"), name);
  }
  assert.equal(entries.reduce((a, [, v]) => a + v.repos, 0), p.sumCheck.pooledAttestations);
  assert.equal(p.sumCheck.pooledAttestations, p.sumCheck.perRepoPartitionSum);
  assert.equal(p.sumCheck.entryForEntryEqual, true);
  assert.ok(Array.isArray(p.gaps) && p.gaps.some((g) => g.gap === "members-and-bound-expressions-not-tallied") && p.gaps.some((g) => g.gap === "cjs-not-tallied"), "gaps are typed, not silent");
  assert.ok(!entries.some(([n]) => (KW?.keywords ?? []).includes(n)), "no declared binding is named by a hard keyword");
});

test("priors/code-name-javascript.json: no TRAIN repository appears in a javascript dev/test row of the manifest", { skip: !NM || !fs.existsSync(MANIFEST) }, () => {
  const m = readJson(MANIFEST);
  const held = new Set([...m.languages.javascript.dev, ...m.languages.javascript.test].map((r) => r.repo.toLowerCase()));
  assert.deepEqual(NM.provenance.trainRepos.filter((r) => held.has(r.toLowerCase())), []);
  for (const r of NM.provenance.trainRepos) assert.equal(m.repos[r].global_split, "train");
  assert.ok([...NM.provenance.trainRepos, [...held][0]].some((r) => held.has(r.toLowerCase())), "the check would catch a planted dev repo");
});

// ── the loaders (what source edit is needed) ───────────────────────────────────────────────────────────────────────────────────────
test("loader: which file loadCodeKeywordPrior('javascript') serves (a diagnostic; the source edit is reported, never made here)", { skip: !KW }, (t) => {
  const served = loadCodeKeywordPrior("javascript");
  assert.ok(served, "a javascript keyword prior is served");
  const isNew = Boolean(served.provenance?.grammar);
  t.diagnostic(`loadCodeKeywordPrior("javascript") serves ${isNew ? "code-kw-javascript.json (grammar+V8)" : "code-kw-js.json (the incumbent)"}; hard ${served.keywords.length}`);
  assert.deepEqual([...keywordSetOf(served)].sort(), [...(isNew ? KW : OLD_KW).keywords].sort());
  t.diagnostic(`loadCodeNamePriorSplit("javascript") -> ${loadCodeNamePriorSplit("javascript") ? "served" : "null (no `javascript` row in CODE_NAME_SPLIT_FILE)"}`);
});

// ── integration: rebuild the tally from the manifest's TRAIN files and compare with the shipped prior (TRAIN only) ──────────────────────
test("integration: the shipped name prior is exactly what the TRAIN files give", { skip: !NM || !fs.existsSync(MANIFEST) }, () => {
  const m = readJson(MANIFEST);
  const tv = verifyTrain(m, "javascript");
  if (tv.problems.length) return; // corpus moved or absent: not this test's business (N2 reports it)
  const files = tv.rows.map((r) => ({ repo: r.repo, rel: r.rel, text: fs.readFileSync(r.path, "utf8") }));
  const t = tallyNames(files);
  assert.deepEqual(namesObject(t.names), NM.names);
  assert.equal(t.declarations, NM.counts.totalDeclarations);
  assert.equal(trainDigest(tv.rows), NM.provenance.trainFilesDigestSha256);
});
