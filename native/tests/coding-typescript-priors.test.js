// coding-typescript-priors: the INSTRUMENT that builds priors/code-kw-typescript.json and priors/code-name-typescript.json is checked on TOY fixtures, and
// the shipped priors are checked for their own invariants. Nothing here measures khora on real code except the integration test, which re-reads the
// manifest's typescript TRAIN files (never dev or test) and is skipped when the corpus is absent. The toy texts and the toy gold are AUTHORED by the model
// (typescript-shaped text, hand-made token lists): tests of the instrument, never held-out data.
// Controls built to fail (II.23): a planted keyword-named binding must be counted by the refusal witness while a method named by a keyword must NOT be; a
// control that cannot fire makes a witness "unlicensed", never "pass"; a planted difference must be caught by the sum check; the engine probe must refuse
// `class` and accept a plain identifier (a probe that refused nothing would also "agree" with an empty set).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  RECIPES, declarationsOf, declarationsStrict, tallyNames, partitionSum, shiftedGoldPairs, decideN3, loroDetail, witnessTypescript, decideR, nonAsciiNames,
  CONSTS, BINDING_KINDS, PROPERTY_KINDS, MANIFEST,
} from "../eval/coding-competence/build-typescript-priors.mjs";
import { compareNameTables, namesObject, loroLift, verifyTrain, trainDigest } from "../eval/coding-competence/build-python-priors.mjs";
import { loadCodeKeywordPrior, keywordSetOf } from "../adapters/text/code-structure.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, "..");
const PRIORS = path.join(NATIVE, "priors");
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const KW = readJson(path.join(PRIORS, "code-kw-typescript.json"));
const NM = readJson(path.join(PRIORS, "code-name-typescript.json"));

// ── the recipes ──────────────────────────────────────────────────────────────────────────────────────
test("recipes: the split builder's js family, verbatim (the three sources appear in scripts/build-code-name-prior-split.mjs)", () => {
  const ref = fs.readFileSync(path.join(NATIVE, "scripts/build-code-name-prior-split.mjs"), "utf8");
  for (const r of RECIPES) assert.ok(ref.includes(`re: /${r.source}/${r.flags},`), `recipe not found verbatim in the reference builder: ${r.source}`);
  assert.deepEqual(RECIPES.map((r) => r.kind), ["function", "class", "function"]);
});

test("recipes: declarationsOf sees function / class / const-arrow; its known over-reach is stated, and the strict arm does not share it", () => {
  const text = [
    "export function alpha() {}", "export default async function beta() {}", "export abstract class Gamma {}", "const delta = (x: number) => x;",
    "export const epsilon = async (a, b) => {};", "interface NotSeen {}", "type AlsoNotSeen = string;", "enum Nor { A }",
    "const data = Array(3).fill(0).map((_, i) => i);", // a non-function const whose initialiser CONTAINS an arrow: the verbatim recipe matches it
  ].join("\n");
  assert.deepEqual(declarationsOf(text).map((d) => `${d.kind}:${d.name}`), ["function:alpha", "function:beta", "class:Gamma", "function:delta", "function:epsilon", "function:data"]);
  const strict = declarationsStrict(text).map((d) => d.name);
  assert.ok(!strict.includes("data"), "the strict arm does not match a const whose arrow is not its value");
  assert.ok(["alpha", "beta", "Gamma", "delta", "epsilon"].every((n) => strict.includes(n)), "the strict arm keeps the real declarations");
  assert.ok(declarationsStrict("export const typed = async (a: number): Promise<void> => {};").some((d) => d.name === "typed"), "a typed arrow const is still a function");
});

// ── the tally and its sum check ──────────────────────────────────────────────────────────────────────────
const TOY = [
  { repo: "a/one", rel: "m.ts", text: "export function init() {}\nexport function main() {}\nexport class Core {}\n" },
  { repo: "a/one", rel: "n.ts", text: "function main() {}\nfunction only_one() {}\n" },
  { repo: "b/two", rel: "m.ts", text: "function main() {}\nfunction init() {}\nfunction only_two() {}\n" },
  { repo: "c/three", rel: "m.ts", text: "class Core {}\nfunction lone() {}\n" },
];
test("tally: names are counted per distinct REPOSITORY, files separately; the per-repository partition sums to the pooled attestations", () => {
  const t = tallyNames(TOY);
  assert.equal(t.names.get("main").repos.size, 2); assert.equal(t.names.get("main").files.size, 3);
  assert.equal(t.names.get("Core").repos.size, 2); assert.equal([...t.names.get("Core").kinds][0], "class");
  assert.equal(t.names.get("lone").repos.size, 1);
  assert.equal(t.declarations, 10);
  assert.equal([...t.names.values()].reduce((a, r) => a + r.repos.size, 0), partitionSum(TOY));
});
test("sum check: a planted difference IS caught (control built to fail)", () => {
  const mine = namesObject(tallyNames(TOY).names);
  assert.equal(compareNameTables(mine, JSON.parse(JSON.stringify(mine))).equal, true);
  const bumped = JSON.parse(JSON.stringify(mine)); bumped.main.repos += 1;
  assert.equal(compareNameTables(mine, bumped).equal, false);
});

// ── N3 decision and its control; N4 detail ───────────────────────────────────────────────────────────────────────
test("N3: pass needs a licensed control; a control that does as well as the real arm is unlicensed; low precision fails", () => {
  const real = { precision: 0.95, recall: 0.8 };
  assert.equal(decideN3(real, { precision: 0.01, recall: 0.02 }), "pass");
  assert.equal(decideN3(real, { precision: 0.9, recall: 0.8 }), "unlicensed", "the statistic did not move under the perturbation");
  assert.equal(decideN3({ precision: 0.585, recall: 0.81 }, { precision: 0.0066, recall: 0.009 }), "fail", "the first real run: precision under the 0.90 floor");
  assert.equal(decideN3({ precision: 0.95, recall: 0.5 }, { precision: 0.01, recall: 0.01 }), "fail");
  assert.equal(decideN3({ precision: null, recall: null }, { precision: 0, recall: 0 }), "unlicensed");
});
test("N3 control: the shifted gold is another repository's, so a repository's own names do not match it", () => {
  const gold = new Map([["r1", new Set(["a", "b"])], ["r2", new Set(["c"])], ["r3", new Set(["d"])]]);
  const sh = shiftedGoldPairs(gold);
  assert.ok(!sh.has("r1\ta") && sh.has("r1\tc") && sh.has("r2\td") && sh.has("r3\ta") && sh.has("r3\tb"));
  assert.equal(sh.size, 4);
});
test("N4 detail lists the recurring names of each fold with hit flags", () => {
  const perRepo = new Map([["a", new Set(["x", "y", "z"])], ["b", new Set(["x", "y"])], ["c", new Set(["x", "w"])], ["d", new Set(["x"])]]);
  const d = loroDetail(perRepo);
  const fa = d.find((f) => f.heldOut === "a");
  assert.deepEqual(fa.G.map((g) => g.name), ["x"], "only x is declared in >= 2 of the other three");
  assert.equal(fa.G[0].hit, true);
  assert.equal(loroLift(perRepo).folds.length, 4);
});

// ── R1..R6 on a toy gold ────────────────────────────────────────────────────────────────────────────
const HARD = ["if", "function", "delete", "default"], SOFT = ["type", "get"], BUILTINS = ["Map", "Promise"];
function toyDoc(text, tokOf, defs) {
  // AUTHORED gold: tokenise on words; tokOf maps word -> {class, type} (default identifier/identifier)
  const tokens = [];
  const re = /[A-Za-z_]\w*/g; let m;
  while ((m = re.exec(text))) { const o = tokOf[m[0]] ?? { class: "identifier", type: "identifier" }; tokens.push({ start: m.index, end: m.index + m[0].length, class: o.class, type: o.type }); }
  return { repo: "r", rel: "f.ts", text, gold: { tokens, defs } };
}
const KW_TOK = { if: { class: "keyword", type: "if" }, function: { class: "keyword", type: "function" } };
const CONTROLS = { python: ["def", "pass", "foo"], go: ["func", "type"], ruby: ["end", "foo"] };

test("R1/R1b/R4/R4b: a keyword-named BINDING is a violation; a keyword-named METHOD or property token is not (the scope of refusal)", () => {
  const ok = [toyDoc("function foo() { if (x) {} }\nclass C { delete() {} }\nx.delete(); const o = { default: 1 };", { ...KW_TOK, delete: { class: "identifier", type: "property_identifier" }, default: { class: "identifier", type: "property_identifier" } },
    [{ name: "foo", kind: "function" }, { name: "C", kind: "class" }, { name: "delete", kind: "method" }])];
  const w = witnessTypescript({ hard: HARD, soft: SOFT, builtins: BUILTINS, controls: CONTROLS, jsHard: ["of", "if"], jsSoft: [], docs: ok, draws: 20 });
  assert.equal(w.R1.hardViolations, 0, "a method named delete is not a binding");
  assert.equal(w.R1b.propertyDefsNamedByHardWord, 1);
  assert.equal(w.R4.identifierCollisions, 0, "property_identifier tokens are not binding positions");
  assert.ok(w.R4b.propertyPositionTokensWithHardText >= 3, "delete (twice) and default are counted in property position");
  assert.equal(decideR(w).R1b, "informational:supports-binding-scope");
  // plant: a function named by a hard word, and a hard word typed as a binding identifier
  const bad = [toyDoc("function default() {}", { function: { class: "keyword", type: "function" } }, [{ name: "default", kind: "function" }])];
  const wb = witnessTypescript({ hard: HARD, soft: SOFT, builtins: BUILTINS, controls: CONTROLS, docs: [...ok, ...bad], draws: 20 });
  assert.equal(wb.R1.hardViolations, 1);
  assert.equal(wb.R4.identifierCollisions, 1);
  assert.equal(decideR(wb).R4, "fail");
});

test("R4: an import/export specifier name typed `identifier` is counted AND split out by its `as` cue (the first real run's `default as X`)", () => {
  const docs = [toyDoc("export { default as Block } from './Block'", { default: { class: "identifier", type: "identifier" } }, [])];
  const w = witnessTypescript({ hard: HARD, soft: SOFT, builtins: BUILTINS, controls: CONTROLS, docs, draws: 5 });
  assert.equal(w.R4.identifierCollisions, 1); assert.equal(w.R4.followedByAs, 1);
});

test("R1/R2/R4: a control that cannot fire never reads as a pass (unlicensed)", () => {
  const docs = [toyDoc("function foo() {}", KW_TOK, [{ name: "foo", kind: "function" }])];
  const dead = witnessTypescript({ hard: HARD, soft: SOFT, builtins: BUILTINS, controls: { python: ["zzz"], go: ["yyy"], ruby: ["xxx"] }, docs, draws: 5 });
  assert.equal(decideR(dead).R1, "unlicensed");
  assert.equal(decideR(dead).R4, "unlicensed");
  // R2: a control that covers as much as the prior cannot license the coverage claim
  const same = witnessTypescript({ hard: HARD, soft: SOFT, builtins: BUILTINS, controls: { python: [...HARD, ...SOFT], go: [...HARD, ...SOFT], ruby: [...HARD, ...SOFT] }, docs, draws: 5 });
  assert.equal(same.R2.coverage, 1); assert.equal(decideR(same).R2, "unlicensed");
  const apart = witnessTypescript({ hard: HARD, soft: SOFT, builtins: BUILTINS, controls: { python: ["zzz"], go: ["yyy"], ruby: ["xxx"] }, docs, draws: 5 });
  assert.equal(decideR(apart).R2, "pass");
});

test("R3/R5/R6: attestation by structural token, shadowing, and the javascript-rule over-refusal are counted", () => {
  const docs = [toyDoc("function a() { if (b) {} }\nfunction get() {}\nclass Map {}\nconst target = 1;", { ...KW_TOK }, [{ name: "a", kind: "function" }, { name: "get", kind: "function" }, { name: "Map", kind: "class" }])];
  const w = witnessTypescript({ hard: HARD, soft: SOFT, builtins: BUILTINS, controls: CONTROLS, jsHard: ["get", "target", "if"], jsSoft: [], docs, draws: 5 });
  assert.deepEqual(w.R3.unattested.sort(), ["default", "delete"]);
  assert.equal(w.R5.softShadowingDefs, 1); assert.equal(w.R5.builtinShadowingDefs, 1);
  assert.equal(w.R6.bindingDefsWronglyRefusedByJs, 1, "`get` is a js-hard word and a legal ts binding name");
  assert.ok(w.R6.identifierTokensWronglyRefusedByJs >= 1, "`target` is typed identifier");
  assert.deepEqual(BINDING_KINDS.filter((k) => PROPERTY_KINDS.includes(k)), [], "binding and property kinds do not overlap");
});

test("nonAsciiNames counts core definitions whose name the ASCII recipe cannot spell", () => {
  const r = nonAsciiNames([{ defs: [{ name: "ok", kind: "function" }, { name: "Ünï", kind: "class" }, { name: "x", kind: "variable" }] }]);
  assert.equal(r.total, 2); assert.equal(r.nonAscii, 1);
});

// ── the engine probe is not blind ───────────────────────────────────────────────────────────────────────────
const ENGINE = ["/opt/homebrew/lib/node_modules/n8n/node_modules/typescript", "/Users/mlacy/Documents/jupyter/node_modules/typescript"].find((d) => fs.existsSync(path.join(d, "lib/typescript.js")));
test("engine probe: `class` is refused as a binding but accepted as a property; a plain identifier is accepted everywhere (control built to fail)", { skip: !ENGINE && "no local typescript package" }, () => {
  const r = spawnSync(process.execPath, [path.join(NATIVE, "eval/coding-competence/typescript_engine_probe.mjs")], { input: JSON.stringify({ tsDir: ENGINE, words: ["class", "foo", "delete", "get"], controls: ["zq9wv", "foo2"] }), encoding: "utf8", maxBuffer: 1 << 26 });
  assert.equal(r.status, 0, r.stderr.slice(-300));
  const o = JSON.parse(r.stdout);
  const refused = (w, forms) => forms.filter((f) => o.probe[w][f].codes.length);
  assert.deepEqual(refused("class", ["V1", "V2", "V3", "V4"]), ["V1", "V2", "V3", "V4"]);
  assert.deepEqual(refused("class", ["P1", "P2", "P3"]), [], "a reserved word may name a property or method");
  assert.deepEqual(refused("foo", ["V1", "V2", "V3", "V4", "P1", "P2", "P3"]), []);
  assert.deepEqual(refused("delete", ["V1", "V2", "V3", "V4"]), ["V1", "V2", "V3", "V4"]);
  assert.deepEqual(refused("get", ["V1", "V2", "V3", "V4"]), [], "a contextual keyword is a legal binding name");
  assert.ok(Object.values(o.controlOk).filter(Boolean).length >= 6, "the controls are accepted on the original forms");
  assert.ok(o.tokenTable.some((t) => t.text === "class" && t.range === "reserved") && o.tokenTable.some((t) => t.text === "get" && t.range === "contextual"));
  assert.ok(o.builtins.values.includes("Math") && o.builtins.types.includes("Promise"));
});

// ── the shipped priors ───────────────────────────────────────────────────────────────────────────────
test("priors/code-kw-typescript.json: schema, polarity, derivation and provenance invariants", { skip: !KW }, () => {
  assert.equal(KW.schema, "CodeKeywordPrior@1"); assert.equal(KW.language, "typescript");
  assert.ok(Array.isArray(KW.keywords) && KW.keywords.length > 0);
  assert.equal(new Set(KW.keywords).size, KW.keywords.length);
  assert.deepEqual(KW.keywords.filter((w) => KW.softKeywords.includes(w)), [], "a word is hard or soft, never both");
  assert.deepEqual(KW.keywords.filter((w) => KW.builtins.includes(w)), [], "no hard word is a builtin");
  const p = KW.provenance;
  assert.equal(p.keywords_read, KW.keywords.length); assert.equal(p.soft_keywords_read, KW.softKeywords.length); assert.equal(p.builtins_read, KW.builtins.length);
  assert.match(p.grammar.name, /tree-sitter-typescript/); assert.equal(p.grammar.packageVersion, "1.21.0"); assert.ok(p.grammar.compiledLibrarySha256, "grammar library hash recorded");
  assert.equal(p.grammar.upstreamCommit, null, "an unrecorded upstream commit is a typed null, not a guess");
  assert.equal(p.engine.implementation, "typescript"); assert.ok(p.engine.version && p.engine.typescriptJsSha256);
  // derived, never hand-typed: every hard word has an engine refusal message; every soft word has a recorded source; the soft set is the rest of the pool
  assert.deepEqual(Object.keys(p.derivation.engineProbeMessages).sort(), [...KW.keywords].sort(), "each hard word carries the engine's own diagnostic");
  assert.deepEqual(Object.keys(p.derivation.softSources).sort(), [...KW.softKeywords].sort());
  for (const [w, forms] of Object.entries(p.derivation.partiallyRefused)) { assert.ok(KW.softKeywords.includes(w), `${w} is partially refused, so soft`); assert.ok(forms.length >= 1 && forms.length < 4); }
  assert.ok(p.derivation.hardFromEngineOnly.every((w) => KW.keywords.includes(w)));
  assert.equal(p.noCorpusRead.includes("no corpus file"), true);
  // refusal scope: binding positions only, derived from the engine (K5, K5b), and the hard set is declarable there
  assert.equal(KW.refusalScope.positions, "binding");
  assert.deepEqual([...KW.refusalScope.propertyNameDeclarable].sort(), [...KW.keywords].sort());
  assert.ok(KW.refusalScope.moduleSpecifierNameDeclarable.length > 0);
  // the verdicts record is honest: failedChecks is exactly the non-pass verdicts
  const notPass = Object.entries(p.verdicts).filter(([, v]) => v === "fail" || v === "unlicensed").map(([k]) => k).sort();
  assert.deepEqual([...p.failedChecks].sort(), notPass);
  // typed gaps, never silent
  assert.deepEqual(KW.stdlibModules, []); assert.ok(p.gaps.some((g) => g.gap === "stdlibModules" && g.status === "not_applicable"));
  // the K1 failure, pinned as a finding: a word the engine refuses as a name but accepts as a PARAMETER (`this`) is soft
  if (p.verdicts.K1 === "fail") assert.ok(KW.softKeywords.includes("this") && p.derivation.partiallyRefused.this, "K1 failed because `this` is a legal (type-annotation) parameter name");
  // the closed class is not the javascript one: the engine says the contextual words are declarable
  for (const w of ["get", "set", "of", "from", "as", "type", "async"]) assert.ok(KW.softKeywords.includes(w) && !KW.keywords.includes(w), `${w} is soft in typescript`);
  for (const w of ["class", "function", "const", "interface", "enum", "implements", "let", "static", "null", "true"]) assert.ok(KW.keywords.includes(w), `${w} is hard`);
});

test("priors/code-name-typescript.json: schema, sum-check and provenance invariants", { skip: !NM }, () => {
  assert.equal(NM.schema, "CodeNamePrior@1"); assert.equal(NM.language, "typescript");
  const p = NM.provenance;
  assert.equal(p.split, "train");
  assert.ok(Array.isArray(p.trainRepos) && p.trainRepos.every((r) => typeof r === "string" && /^[^/]+\/[^/]+$/.test(r)), "trainRepos are owner/repo STRINGS (run.mjs priorProvenance reads them as strings)");
  assert.equal(p.trainRepos.length, NM.counts.repos);
  assert.equal(Object.values(p.trainRepoFiles).reduce((a, b) => a + b, 0), p.trainFiles); assert.equal(p.trainFiles, NM.counts.files);
  const entries = Object.entries(NM.names);
  assert.equal(entries.length, NM.counts.distinctNames);
  assert.equal(entries.filter(([, v]) => v.repos >= CONSTS.GENERIC_FLOOR).length, NM.counts.namesAtOrAboveGenericFloor);
  for (const [name, v] of entries) {
    assert.ok(v.repos >= 1 && v.repos <= NM.counts.repos, name); assert.ok(v.files >= v.repos, `${name}: a name in n repos is in >= n files`);
    assert.ok(v.kinds.length >= 1 && v.kinds.every((k) => k === "function" || k === "class"), name);
  }
  assert.equal(entries.reduce((a, [, v]) => a + v.repos, 0), p.sumCheck.pooledAttestations);
  assert.equal(p.sumCheck.pooledAttestations, p.sumCheck.perRepoPartitionSum); assert.equal(p.sumCheck.pooledAttestations, p.sumCheck.referenceBlendedAttestations);
  assert.equal(p.sumCheck.entryForEntryEqual, true);
  assert.ok(Array.isArray(p.gaps) && p.gaps.some((g) => g.gap === "recipe-blind-kinds") && p.gaps.some((g) => g.gap === "four-train-repos"), "gaps are typed, not silent");
  const notPass = Object.entries(p.verdicts).filter(([, v]) => v === "fail" || v === "unlicensed").map(([k]) => k).sort();
  assert.deepEqual([...p.failedChecks].sort(), notPass, "the prior says which of its own checks failed");
  assert.ok(p.recipe.sources.length === RECIPES.length);
  if (KW) assert.deepEqual(entries.map(([n]) => n).filter((n) => KW.keywords.includes(n)), [], "no declared binding is named by a hard keyword");
});

test("priors/code-name-typescript.json: no TRAIN repository appears in a typescript dev/test row of the manifest", { skip: !NM || !fs.existsSync(MANIFEST) }, () => {
  const m = readJson(MANIFEST);
  const held = new Set([...m.languages.typescript.dev, ...m.languages.typescript.test].map((r) => r.repo.toLowerCase()));
  assert.deepEqual(NM.provenance.trainRepos.filter((r) => held.has(r.toLowerCase())), []);
  for (const r of NM.provenance.trainRepos) { assert.equal(m.repos[r].global_split, "train"); assert.equal(m.repos[r].license_class, "permissive"); }
  assert.ok([...NM.provenance.trainRepos, [...held][0]].some((r) => held.has(r.toLowerCase())), "the check would catch a planted dev repo");
});

// ── the loaders (what source edit is needed) ───────────────────────────────────────────────────────────────
test("loader: what loadCodeKeywordPrior('typescript') serves (a diagnostic; the source edit is reported, never made here)", { skip: !KW }, (t) => {
  const served = loadCodeKeywordPrior("typescript");
  t.diagnostic(`loadCodeKeywordPrior("typescript") -> ${served ? `served, hard ${served.keywords.length}` : "null (CODE_KW_LANG has no typescript row: see eval/coding-competence/typescript-priors-loader-check.mjs for the exact edit)"}`);
  if (served) assert.deepEqual([...keywordSetOf(served)].sort(), [...KW.keywords].sort(), "once the edit is made, the loader serves exactly this prior");
});

// ── integration: rebuild the tally from the manifest's TRAIN files and compare with the shipped prior (TRAIN only) ──────────────────────
test("integration: the shipped name prior is exactly what the TRAIN files give", { skip: !NM || !fs.existsSync(MANIFEST) }, () => {
  const m = readJson(MANIFEST);
  const tv = verifyTrain(m, "typescript");
  if (tv.problems.length) return; // corpus moved or absent: not this test's business (N2 reports it)
  const files = tv.rows.map((r) => ({ repo: r.repo, rel: r.rel, text: fs.readFileSync(r.path, "utf8") }));
  const t = tallyNames(files);
  assert.deepEqual(namesObject(t.names), NM.names);
  assert.equal(t.declarations, NM.counts.totalDeclarations);
  assert.equal(trainDigest(tv.rows), NM.provenance.trainFilesDigestSha256);
});
