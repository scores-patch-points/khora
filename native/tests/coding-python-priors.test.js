// coding-python-priors: the INSTRUMENT that builds priors/code-kw-python.json and priors/code-name-python.json is checked on TOY fixtures,
// and the shipped priors are checked for their own invariants. Nothing here measures khora on real code except the one integration test,
// which re-reads the manifest's python TRAIN files (never dev or test) and is skipped when the corpus is absent.
// The toy texts and toy gold are AUTHORED by the model (python-shaped text, hand-made token lists): tests of the instrument, never held-out data.
// Controls built to fail (II.23): a planted difference must be caught by the sum check; a structure-free toy must NOT pass the genericity
// check; a planted keyword-named definition must be counted by the refusal witness; an object-valued trainRepos is not a string.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  declarationsOf, xidGap, tallyNames, attestationTotal, namesObject, partitionSum, compareNameTables, mulberry32, fnv1a, sampleWithoutReplacement,
  loroLift, derangeRepoSets, controlLifts, decideN4, recipeVsGold, witnessKeywords, decideR, verifyTrain, trainDigest, sha256, CONSTS, MANIFEST, RAW_ROOT, RECIPE_SOURCE,
} from "../eval/coding-competence/build-python-priors.mjs";
import { loadCodeKeywordPrior, keywordSetOf } from "../adapters/text/code-structure.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIORS = path.resolve(HERE, "../priors");
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const KW = readJson(path.join(PRIORS, "code-kw-python.json"));
const NM = readJson(path.join(PRIORS, "code-name-python.json"));
const OLD_KW = readJson(path.join(PRIORS, "code-kw-py.json"));

// ── the recipe ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("recipe: the split builder's py family recipe, verbatim", () => {
  assert.equal(RECIPE_SOURCE, String.raw`^[ \t]*(?:async\s+)?(def|class)\s+([A-Za-z_]\w*)`);
  const text = "class A:\n    def f(self): pass\n    async def g(self): pass\nasync def top(): pass\n  class _B: pass\nx = 'def not_a_decl'\n";
  assert.deepEqual(declarationsOf(text).map((d) => `${d.kind}:${d.name}`), ["class:A", "function:f", "function:g", "function:top", "class:_B"]);
  // a known limit of the recipe, stated not hidden: a line that STARTS with `def` inside a docstring is counted
  assert.deepEqual(declarationsOf('"""\ndef inside_docstring(x):\n"""\n').map((d) => d.name), ["inside_docstring"]);
});

test("recipe gap: non-ASCII identifiers are measured, not mixed in", () => {
  const g = xidGap("def Διαβάζω(): pass\ndef plain(): pass\nclass Ünï: pass\n");
  assert.equal(g.total, 3); assert.equal(g.nonAscii, 2);
  assert.deepEqual(declarationsOf("def Διαβάζω(): pass\n"), []); // the ASCII recipe cannot spell it
});

// ── the tally and its sum check ────────────────────────────────────────────────────────────────────────────────────────────────────
const TOY = [
  { repo: "a/one", rel: "m.py", text: "def init(): pass\ndef main(): pass\nclass Core: pass\n" },
  { repo: "a/one", rel: "n.py", text: "def main(): pass\ndef only_one(): pass\n" },
  { repo: "b/two", rel: "m.py", text: "def main(): pass\ndef init(): pass\ndef only_two(): pass\n" },
  { repo: "c/three", rel: "m.py", text: "class Core: pass\ndef lone(): pass\n" },
];

test("tally: names are counted per distinct REPOSITORY, files are counted separately", () => {
  const t = tallyNames(TOY);
  assert.equal(t.names.get("main").repos.size, 2); assert.equal(t.names.get("main").files.size, 3);
  assert.equal(t.names.get("Core").repos.size, 2); assert.equal([...t.names.get("Core").kinds][0], "class");
  assert.equal(t.names.get("lone").repos.size, 1);
  assert.equal(t.declarations, 10);
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

// ── N4: genericity is real, with the control built to fail ─────────────────────────────────────────────────────────────────────────
function structuredRepos() {
  // AUTHORED: 4 repos. Boilerplate (init/main/run/close) is declared by all four; each PAIR of repos shares 6 names; each repo has 100 unique names.
  const m = new Map(Array.from({ length: 4 }, (_, r) => [`r${r}`, new Set(["init", "main", "run", "close"])]));
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) for (let k = 0; k < 6; k++) { m.get(`r${a}`).add(`pair_${a}_${b}_${k}`); m.get(`r${b}`).add(`pair_${a}_${b}_${k}`); }
  for (let r = 0; r < 4; r++) for (let k = 0; k < 100; k++) m.get(`r${r}`).add(`uniq_${r}_${k}`);
  return m;
}
test("N4: recurring boilerplate lifts above the deranged control; a structure-free toy is not a pass", () => {
  const real = loroLift(structuredRepos());
  assert.ok(real.pooled.G > 0 && real.pooled.S > 0 && real.pooled.hitS > 0);
  assert.ok(real.pooled.lift > 2, `names declared in >=2 other repos recur more than names declared in 1 (lift ${real.pooled.lift})`);
  const ctl = controlLifts(structuredRepos(), 60, "toy");
  assert.ok(ctl.median >= 0.5 && ctl.median <= 1.5, `control median ${ctl.median}`);
  assert.ok(real.pooled.lift > ctl.max, `real ${real.pooled.lift} must exceed the control max ${ctl.max}`);
  assert.equal(decideN4(real, ctl), "pass");
  // structure-free: every repo has only unique names -> G is empty -> no lift, so the decision cannot be "pass"
  const flat = new Map([["a", new Set(["x1", "x2"])], ["b", new Set(["y1", "y2"])], ["c", new Set(["z1", "z2"])], ["d", new Set(["w1", "w2"])]]);
  const rf = loroLift(flat);
  assert.equal(rf.pooled.lift, null);
  assert.notEqual(decideN4(rf, controlLifts(flat, 20, "toy")), "pass");
});

test("N4: the control destroys cross-repository identity and keeps set sizes", () => {
  const perRepo = structuredRepos();
  const vocab = [...new Set([...perRepo.values()].flatMap((s) => [...s]))].sort();
  const d = derangeRepoSets(perRepo, vocab, mulberry32(fnv1a("t")));
  for (const [repo, set] of perRepo) assert.equal(d.get(repo).size, set.size);
  const real = loroLift(perRepo).pooled.lift;
  const lifts = Array.from({ length: 40 }, (_, i) => loroLift(derangeRepoSets(perRepo, vocab, mulberry32(i + 1))).pooled.lift).filter((x) => x != null).sort((a, b) => a - b);
  assert.ok(lifts.length > 20);
  assert.ok(real > lifts[Math.floor(lifts.length / 2)] * 3, `real lift ${real} must clear the control median ${lifts[Math.floor(lifts.length / 2)]}`);
  const s = sampleWithoutReplacement([1, 2, 3, 4, 5], 3, mulberry32(7));
  assert.equal(new Set(s).size, 3);
});

test("N4: decideN4 needs a licensed control and never passes a control that does as well as the real arm", () => {
  const real = { pooled: { lift: 5 }, folds: [{ lift: 4 }, { lift: 6 }] };
  assert.equal(decideN4(real, { median: 1.0, max: 1.3 }), "pass");
  assert.equal(decideN4(real, { median: 1.0, max: 9 }), "unlicensed", "control max above the real lift: the statistic did not move");
  assert.equal(decideN4(real, { median: 3.0, max: 3.5 }), "unlicensed", "control median outside [0.5, 1.5]: instrument suspect");
  assert.equal(decideN4({ pooled: { lift: 1.6 }, folds: [{ lift: 1.6 }] }, { median: 1.0, max: 1.2 }), "fail");
  assert.equal(decideN4({ pooled: { lift: 5 }, folds: [{ lift: 6 }, { lift: 0.9 }] }, { median: 1.0, max: 1.2 }), "fail", "every fold must lift");
});

// ── N3 and R1..R5 on a toy gold ────────────────────────────────────────────────────────────────────────────────────────────────────
test("N3: recipe vs grammar pairs", () => {
  const rx = new Map([["r", new Set(["a", "b", "c"])]]);
  const full = recipeVsGold(rx, new Set(["r\ta", "r\tb", "r\tc"]));
  assert.equal(full.precision, 1); assert.equal(full.recall, 1);
  const part = recipeVsGold(rx, new Set(["r\ta", "r\tb", "r\td"]));
  assert.ok(Math.abs(part.precision - 2 / 3) < 1e-9); assert.ok(Math.abs(part.recall - 2 / 3) < 1e-9);
  assert.equal(part.nOnlyRegex, 1); assert.equal(part.nOnlyGold, 1);
});

function toyDoc(text, kinds, defs) {
  // AUTHORED gold: tokenise on words; `kinds` maps a word to its class (default identifier); defs = [{name, kind}]
  const tokens = [];
  const re = /[A-Za-z_]\w*/g; let m;
  while ((m = re.exec(text))) tokens.push({ start: m.index, end: m.index + m[0].length, type: kinds[m[0]] ?? "identifier", class: kinds[m[0]] ?? "identifier" });
  return { repo: "r", rel: "f.py", text, gold: { tokens, defs } };
}
const HARD = ["if", "def", "return", "None"], SOFT = ["match", "print"], BUILTINS = ["next", "None", "len"];
const KINDS = { if: "keyword", def: "keyword", return: "keyword", None: "literal", print: "identifier" };

test("R1..R4: the refusal witness counts what it should and the planted violation fires (control built to fail)", () => {
  const clean = [toyDoc("def a(): return None\nif a: pass\ndef next(): pass", KINDS, [{ name: "a", kind: "function" }, { name: "next", kind: "function" }])];
  const w = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, jsHard: ["function", "a"], jsSoft: [], docs: clean, draws: 20 });
  assert.equal(w.R1.hardViolations, 0);
  assert.equal(w.R1.jsControlViolations, 1, "the deranged-language control refuses the declared name `a`");
  assert.ok(w.R1.randomControlMean >= 1);
  assert.equal(w.R3.unattested.join(), "", "def, return, None and if all occur as structural tokens");
  assert.equal(w.R4.identifierCollisions, 0);
  assert.equal(w.R5.builtinShadowingDefs, 1); assert.equal(w.R5.builtinShadowNames.next, 1);
  assert.equal(decideR(w).R1, "pass"); assert.equal(decideR(w).R4, "pass");
  // plant a violation: a definition NAMED by a hard keyword, and a hard word typed as an identifier
  const bad = [toyDoc("def a(): pass", { def: "keyword", if: "identifier" }, [{ name: "if", kind: "function" }])];
  const wb = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, jsHard: ["function", "a"], jsSoft: [], docs: [...clean, ...bad], draws: 20 });
  assert.equal(wb.R1.hardViolations, 1);
  assert.equal(decideR(wb).R1, "fail");
  const wi = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, jsHard: [], jsSoft: [], docs: [toyDoc("if x", { if: "identifier" }, [])], draws: 5 });
  assert.equal(wi.R4.identifierCollisions, 1); assert.equal(decideR(wi).R4, "fail");
  assert.deepEqual(wi.R3.unattested.sort(), ["None", "def", "if", "return"], "if typed as identifier does not attest the keyword");
});

test("R1/R2: an unlicensed control (that cannot fire) never reads as a pass", () => {
  const docs = [toyDoc("def a(): return None", KINDS, [{ name: "a", kind: "function" }])];
  const w = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, jsHard: ["zzz"], jsSoft: [], docs, draws: 5 });
  assert.equal(w.R1.jsControlViolations, 0);
  assert.equal(decideR(w).R1, "unlicensed");
  // R2: a control that covers as much as the prior (here the control IS the prior's own words) cannot license the coverage claim
  const same = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, jsHard: HARD, jsSoft: SOFT, docs, draws: 5 });
  assert.equal(same.R2.coverage, 1); assert.equal(decideR(same).R2, "unlicensed");
  const apart = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, jsHard: ["zzz"], jsSoft: [], docs, draws: 5 });
  assert.equal(decideR(apart).R2, "pass", "a control that covers nothing licenses full coverage");
});

// ── TRAIN purity on a toy manifest (virtual paths under the raw root; bytes are read only for the sha256 case, from os.tmpdir) ───────
function toyManifest() {
  const sha = "a".repeat(64);
  const row = (repo, rel, extra = {}) => ({ repo, path: `${RAW_ROOT}toy/${rel}`, rel, sha256: sha, bytes: 6, restricted: false, ...extra });
  return {
    languages: { python: { train: [row("t/ok", "ok.py"), row("t/res", "res.py", { restricted: true, path: "/elsewhere/res.py" })], dev: [row("d/dev", "d.py")], test: [row("e/test", "e.py")], info: { repos: { train: ["t/ok", "t/res"] } } } },
    repos: { "t/ok": { global_split: "train", restricted: false, license_class: "permissive" }, "t/res": { global_split: "train", restricted: true, license_class: "permissive-not-on-fetch-list" } },
  };
}
test("N2: TRAIN purity is checked and a planted overlap is caught (control built to fail)", () => {
  const m = toyManifest();
  const ok = verifyTrain(m, "python", { readBytes: false });
  assert.deepEqual(ok.problems, [], "a clean toy passes (the restricted-only repo is excluded, not an error)");
  assert.deepEqual(ok.repos, ["t/ok"]); assert.deepEqual(ok.onlyRestricted, ["t/res"]);
  const leaked = JSON.parse(JSON.stringify(m)); leaked.languages.python.dev[0].repo = "t/ok";
  assert.ok(verifyTrain(leaked, "python", { readBytes: false }).problems.some((p) => /dev\/test/.test(p)), "a TRAIN repo that also appears in dev is caught");
  const wrongSplit = JSON.parse(JSON.stringify(m)); wrongSplit.repos["t/ok"].global_split = "test";
  assert.ok(verifyTrain(wrongSplit, "python", { readBytes: false }).problems.some((p) => /global_split/.test(p)));
  const outside = JSON.parse(JSON.stringify(m)); outside.languages.python.train[0].path = "/Users/x/ethos/y.py";
  assert.ok(verifyTrain(outside, "python", { readBytes: false }).problems.some((p) => /raw corpus/.test(p)), "a file outside the fetched raw corpus is caught");
  assert.equal(trainDigest(ok.rows), trainDigest([...ok.rows].reverse()), "the digest does not depend on row order");
});
test("N2: a file whose bytes do not match the manifest sha256 is caught", () => {
  const tmp = path.join(os.tmpdir(), `pp_toy_${process.pid}.py`);
  fs.writeFileSync(tmp, "x = 1\n");
  try {
    const m = toyManifest();
    m.languages.python.train[0].path = tmp;
    const bad = verifyTrain(m, "python");
    assert.ok(bad.problems.some((p) => /sha256 mismatch/.test(p)));
    m.languages.python.train[0].sha256 = sha256(fs.readFileSync(tmp));
    assert.ok(!verifyTrain(m, "python").problems.some((p) => /sha256 mismatch/.test(p)));
  } finally { try { fs.unlinkSync(tmp); } catch { /* ignore */ } }
});

// ── the shipped priors ────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("priors/code-kw-python.json: schema, closed class and provenance", { skip: !KW }, () => {
  assert.equal(KW.schema, "CodeKeywordPrior@1"); assert.equal(KW.language, "python");
  assert.equal(new Set(KW.keywords).size, KW.keywords.length);
  assert.equal(KW.keywords.length, 35);
  assert.deepEqual(KW.keywords.filter((w) => KW.softKeywords.includes(w)), [], "no word is both hard and soft (the builder refuses it)");
  for (const w of ["match", "case", "type", "_"]) assert.ok(KW.softKeywords.includes(w), `${w} is declarable, never refused`);
  assert.ok(!KW.keywords.includes("print") && !KW.keywords.includes("exec"), "the grammar's legacy tokens are soft");
  const g = KW.provenance.grammar;
  assert.match(g.name, /tree-sitter/); assert.equal(g.packageVersion, "1.21.0"); assert.match(g.upstream, /^https:\/\/github\.com\/tree-sitter\/tree-sitter-python/);
  assert.match(g.packageSource, /^https:\/\//); assert.equal(g.upstreamCommit, null, "unrecorded upstream commit is a typed gap, not a guess");
  assert.ok(g.upstreamCommitNote);
  assert.equal(KW.provenance.engine.implementation, "cpython");
  assert.match(KW.provenance.noCorpusRead, /no corpus file/);
  for (const k of ["K1", "K2", "K3", "K4", "K5", "K6"]) assert.equal(KW.provenance.derivation.checks[k], "pass", k);
  assert.equal(KW.provenance.trainWitness.hardKeywordsDeclaredAsNames, 0);
});

test("priors/code-kw-python.json: agrees with the older CPython-introspected prior on the refusal set", { skip: !KW || !OLD_KW }, () => {
  assert.deepEqual([...KW.keywords].sort(), [...OLD_KW.keywords].sort());
});

test("priors/code-name-python.json: schema, TRAIN-only provenance, internal consistency", { skip: !NM }, () => {
  assert.equal(NM.schema, "CodeNamePrior@1"); assert.equal(NM.language, "python");
  const p = NM.provenance;
  assert.equal(p.split, "train");
  assert.ok(Array.isArray(p.trainRepos) && p.trainRepos.every((r) => typeof r === "string" && /^[^/]+\/[^/]+$/.test(r)), "trainRepos are owner/repo STRINGS (run.mjs priorProvenance reads them as strings)");
  assert.equal(p.trainRepos.length, NM.counts.repos);
  assert.equal(Object.values(p.trainRepoFiles).reduce((a, b) => a + b, 0), NM.counts.files);
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
  assert.ok(Array.isArray(p.filesExcluded.restricted_licence));
  assert.ok(NM.names.__init__.repos >= 3 && NM.names.main.repos >= 2, "boilerplate recurs across TRAIN repositories");
});

test("priors/code-name-python.json: no TRAIN repository appears in a python dev/test row of the manifest", { skip: !NM || !fs.existsSync(MANIFEST) }, () => {
  const m = readJson(MANIFEST);
  const held = new Set([...m.languages.python.dev, ...m.languages.python.test].map((r) => r.repo.toLowerCase()));
  assert.deepEqual(NM.provenance.trainRepos.filter((r) => held.has(r.toLowerCase())), []);
  for (const r of NM.provenance.trainRepos) assert.equal(m.repos[r].global_split, "train");
  // the control: the check would catch a planted dev repo
  assert.ok([...NM.provenance.trainRepos, [...held][0]].some((r) => held.has(r.toLowerCase())));
});

// ── the loaders (what source edit is needed) ───────────────────────────────────────────────────────────────────────────────────────
test("loader: whichever file loadCodeKeywordPrior('python') serves, its refusal set equals the new prior's (the proposed edit is refusal-neutral)", { skip: !KW }, (t) => {
  const served = loadCodeKeywordPrior("python");
  assert.ok(served, "a python keyword prior is served");
  const serves = served.provenance?.grammar ? "code-kw-python.json (grammar-derived)" : "code-kw-py.json (CPython/pyodide-derived)";
  t.diagnostic(`loadCodeKeywordPrior("python") serves ${serves}; soft: ${served.softKeywords.join(",")}`);
  assert.deepEqual([...keywordSetOf(served)].sort(), [...KW.keywords].sort());
});

// ── integration: rebuild the tally from the manifest's TRAIN files and compare with the shipped prior (TRAIN only) ──────────────────────
test("integration: the shipped name prior is exactly what the TRAIN files give", { skip: !NM || !fs.existsSync(MANIFEST) }, () => {
  const m = readJson(MANIFEST);
  const tv = verifyTrain(m, "python");
  if (tv.problems.length) return; // corpus moved or absent: not this test's business (N2 reports it)
  const files = tv.rows.map((r) => ({ repo: r.repo, rel: r.rel, text: fs.readFileSync(r.path, "utf8") }));
  const t = tallyNames(files);
  assert.deepEqual(namesObject(t.names), NM.names);
  assert.equal(t.declarations, NM.counts.totalDeclarations);
  assert.equal(trainDigest(tv.rows), NM.provenance.trainFilesDigestSha256);
});
