// coding-java-priors: the INSTRUMENT that builds the java CodeKeywordPrior@1 and CodeNamePrior@1 (eval/coding-competence/build-java-priors.mjs,
// java_kw_giver.py, JavaKwProbe.java) is checked on TOY fixtures, and the java priors are checked for their own invariants. Nothing here measures
// khora on real code except the integration tests, which re-read the manifest's java TRAIN files (never dev or test) and are skipped when the corpus
// or the gold extractor or the JDK is absent.
// The toy texts and toy gold are AUTHORED by the model (java-shaped text, hand-made token lists): tests of the instrument, never held-out data.
// Controls built to fail (II.23): a planted difference must be caught by the sum check; a structure-free toy must NOT pass the genericity check; a
// planted keyword-named definition and a planted contextual-keyword-as-hard list must be caught by the refusal witnesses; the engine probe must say
// "refused" for a keyword, "accepted" for a plain identifier, "refused" for everything under a broken template and "accepted" under a trivial one.
//
// WHICH PRIORS. The installed native/priors/code-kw-java.json and code-name-java.json are the main agent's (an earlier pass built them). The checks below
// apply to the CANDIDATES (build-java-priors.mjs writes them to JAVAPRIORS_PRIORS, default <out>/priors-candidate) and, once the owner installs them, to the
// installed files: a prior is picked up from native/priors when it carries `provenance.grammar` (the marker of the grammar-and-engine derivation), else
// from the candidate directory, else the test is skipped.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  tallyNames, attestationTotal, namesObject, partitionSum, compareNameTables, mulberry32, fnv1a, sampleWithoutReplacement,
  loroLift, derangeRepoSets, controlLifts, decideN4, pairsAgreement, witnessKeywords, decideR, verifyTrain, trainDigest, sha256, symDiff,
  compareKeywordPriors, CONSTS, MANIFEST, RAW_ROOT, DEFAULT_OUT,
} from "../eval/coding-competence/build-java-priors.mjs";
import { goldBatch, goldAvailable } from "../eval/coding-competence/gold.mjs";
import { loadCodeKeywordPrior, keywordSetOf } from "../adapters/text/code-structure.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, "..");
const PRIORS = path.join(NATIVE, "priors");
const CAND = process.env.JAVAPRIORS_PRIORS || path.join(DEFAULT_OUT, "priors-candidate");
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const pick = (name) => {
  const installed = readJson(path.join(PRIORS, name));
  if (installed?.provenance?.grammar || installed?.provenance?.builder === "eval/coding-competence/build-java-priors.mjs") return installed;
  return readJson(path.join(CAND, name));
};
const KW = pick("code-kw-java.json");
const NM = pick("code-name-java.json");
const OLD_KW = readJson(path.join(PRIORS, "code-kw-java.json")); // whichever is installed (the older one while not replaced)
const JDK = process.env.JAVA_PRIMARY_HOME || "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home";
const HAVE_JDK = fs.existsSync(path.join(JDK, "bin", "java"));

// ── the tally and its sum check, on authored toy gold ────────────────────────────────────────────────────────────────────────────────
function toyDoc(repo, rel, text, decls, tokenKinds = {}) {
  // AUTHORED gold: defs = [{name, kind}] located by first occurrence of `name(` or `name ` in text; tokens = words with an optional class
  const defs = [];
  let from = 0;
  for (const d of decls) {
    const at = text.indexOf(d.name, from);
    assert.ok(at >= 0, `toy decl ${d.name}`);
    defs.push({ kind: d.kind, name: d.name, start: at, end: at + d.name.length, nameStart: at, nameEnd: at + d.name.length });
    from = at + d.name.length;
  }
  const tokens = [];
  const re = /[A-Za-z_$]\w*/g; let m;
  while ((m = re.exec(text))) tokens.push({ start: m.index, end: m.index + m[0].length, type: tokenKinds[m[0]] ?? "identifier", class: tokenKinds[m[0]] ?? "identifier" });
  return { repo, rel, text, gold: { tokens, defs } };
}
const TOY = [
  toyDoc("a/one", "A.java", "class Core { void init() {} void main() {} int count; }", [{ name: "Core", kind: "class" }, { name: "init", kind: "method" }, { name: "main", kind: "method" }, { name: "count", kind: "field" }]),
  toyDoc("a/one", "B.java", "class Util { void main() {} void onlyOne() {} }", [{ name: "Util", kind: "class" }, { name: "main", kind: "method" }, { name: "onlyOne", kind: "method" }]),
  toyDoc("b/two", "C.java", "interface Core { void main(); void init(); void onlyTwo(); }", [{ name: "Core", kind: "interface" }, { name: "main", kind: "method" }, { name: "init", kind: "method" }, { name: "onlyTwo", kind: "method" }]),
  toyDoc("c/three", "D.java", "enum Color { RED } class Lone { }", [{ name: "Color", kind: "enum" }, { name: "Lone", kind: "class" }]),
];

test("tally: names are counted per distinct REPOSITORY (files separately); secondary kinds are not declarations", () => {
  const t = tallyNames(TOY);
  assert.equal(t.names.get("main").repos.size, 2); assert.equal(t.names.get("main").files.size, 3);
  assert.equal(t.names.get("Core").repos.size, 2); assert.deepEqual([...t.names.get("Core").kinds].sort(), ["class", "interface"]);
  assert.equal(t.names.get("onlyOne").repos.size, 1);
  assert.equal(t.names.has("count"), false, "a field is a secondary kind, never counted");
  assert.equal(t.declarations, 12, "3 + 3 + 4 + 2 core declarations (the field `count` is not one)");
  assert.equal(attestationTotal(t.names), partitionSum(TOY), "the independent per-repository partition sums to the pooled count");
});

test("tally: a name token declares once, and non-word names are dropped and counted", () => {
  const doc = toyDoc("a/one", "E.java", "class Dup { }", [{ name: "Dup", kind: "class" }]);
  doc.gold.defs.push({ ...doc.gold.defs[0], kind: "method" }); // a second core def on the same token (constructor of the same name)
  const t = tallyNames([doc]);
  assert.equal(t.names.get("Dup").repos.size, 1);
  assert.deepEqual([...t.names.get("Dup").kinds], ["class"], "the first core kind of the token wins (the c2 token-unit semantics)");
  const dig = { repo: "r", rel: "n.java", text: "7up", gold: { tokens: [], defs: [{ kind: "class", name: "7up", nameStart: 0, nameEnd: 3, start: 0, end: 3 }] } };
  const td = tallyNames([dig]);
  assert.equal(td.names.size, 0); assert.equal(td.defsDropped, 1);
});

test("sum check: a planted difference IS caught (control built to fail)", () => {
  const mine = namesObject(tallyNames(TOY).names);
  assert.equal(compareNameTables(mine, JSON.parse(JSON.stringify(mine))).equal, true);
  const bumped = JSON.parse(JSON.stringify(mine)); bumped.main.repos += 1;
  const r = compareNameTables(mine, bumped);
  assert.equal(r.equal, false); assert.equal(r.nDiffering, 1);
  const dropped = JSON.parse(JSON.stringify(mine)); delete dropped.Lone;
  assert.equal(compareNameTables(mine, dropped).nOnlyMine, 1);
  const rekinded = JSON.parse(JSON.stringify(mine)); rekinded.Core.kinds = ["class"];
  assert.equal(compareNameTables(mine, rekinded).equal, false, "a changed kind set is a difference");
});

test("N3: two readings of one grammar are compared over (name, repo) pairs", () => {
  const w = new Set(["r\ta", "r\tb", "r\tc"]);
  const full = pairsAgreement(w, new Set(w));
  assert.equal(full.precision, 1); assert.equal(full.recall, 1);
  const part = pairsAgreement(w, new Set(["r\ta", "r\tb", "r\td"]));
  assert.ok(Math.abs(part.precision - 2 / 3) < 1e-9); assert.ok(Math.abs(part.recall - 2 / 3) < 1e-9);
  assert.equal(part.nOnlyWalk, 1); assert.equal(part.nOnlyGold, 1);
});

// ── N4: genericity is real, with the control built to fail ───────────────────────────────────────────────────────────────────────────
function structuredRepos() {
  // AUTHORED: 4 repos. Boilerplate (equals/hashCode/toString/main) is declared by all four; each PAIR of repos shares 6 names; each repo has 100 unique names.
  const m = new Map(Array.from({ length: 4 }, (_, r) => [`r${r}`, new Set(["equals", "hashCode", "toString", "main"])]));
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
  const flat = new Map([["a", new Set(["x1", "x2"])], ["b", new Set(["y1", "y2"])], ["c", new Set(["z1", "z2"])], ["d", new Set(["w1", "w2"])]]);
  const rf = loroLift(flat);
  assert.equal(rf.pooled.lift, null);
  assert.notEqual(decideN4(rf, controlLifts(flat, 20, "toy")), "pass");
});

test("N4: the control destroys cross-repository identity and keeps set sizes; decideN4 needs a licensed control", () => {
  const perRepo = structuredRepos();
  const vocab = [...new Set([...perRepo.values()].flatMap((s) => [...s]))].sort();
  const d = derangeRepoSets(perRepo, vocab, mulberry32(fnv1a("t")));
  for (const [repo, set] of perRepo) assert.equal(d.get(repo).size, set.size);
  assert.equal(new Set(sampleWithoutReplacement([1, 2, 3, 4, 5], 3, mulberry32(7))).size, 3);
  const real = { pooled: { lift: 5 }, folds: [{ lift: 4 }, { lift: 6 }] };
  assert.equal(decideN4(real, { median: 1.0, max: 1.3 }), "pass");
  assert.equal(decideN4(real, { median: 1.0, max: 9 }), "unlicensed", "control max above the real lift: the statistic did not move");
  assert.equal(decideN4(real, { median: 3.0, max: 3.5 }), "unlicensed", "control median outside [0.5, 1.5]: instrument suspect");
  assert.equal(decideN4({ pooled: { lift: 5 }, folds: [{ lift: 6 }, { lift: 0.9 }] }, { median: 1.0, max: 1.2 }), "fail", "every fold must lift");
});

// ── R1..R4 on a toy gold: the refusal witnesses, and the contextual-keyword failure the old prior has ───────────────────────────────────
const HARD = ["if", "class", "this", "true"], SOFT = ["when", "record"], BUILTINS = ["Object", "String"];
const KINDS = { if: "keyword", class: "keyword", this: "keyword", true: "literal" };
test("R1..R4: the refusal witness counts what it should and the planted violation fires (control built to fail)", () => {
  const clean = [toyDoc("r", "f.java", "class Object { void a() { if (this) { when(true); } } }", [{ name: "Object", kind: "class" }, { name: "a", kind: "method" }], KINDS)];
  const w = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, jsHard: ["function", "a"], jsSoft: [], docs: clean, draws: 20 });
  assert.equal(w.R1.hardViolations, 0);
  assert.equal(w.R1.jsControlViolations, 1, "the deranged-language control refuses the declared name `a`");
  assert.ok(w.R1.randomControlMean >= 1);
  assert.deepEqual(w.R3.unattested, [], "class, if, this and true all occur as structural tokens");
  assert.equal(w.R4.identifierCollisions, 0);
  assert.equal(w.R5.builtinShadowingDefs, 1); assert.equal(w.R5.builtinShadowNames.Object, 1);
  assert.equal(w.R6.softWordsSeenAsIdentifier, 1, "`when` is used as an identifier token: the polarity (soft never refuses) is witnessed");
  // the EXISTING-prior shape: a contextual word listed as HARD collides with identifier tokens and refuses a declared name
  const oldShape = witnessKeywords({ hard: [...HARD, "when"], soft: [], builtins: [], jsHard: ["a"], jsSoft: [], docs: [...clean, toyDoc("r", "g.java", "class X { void when() { } }", [{ name: "X", kind: "class" }, { name: "when", kind: "method" }], KINDS)], draws: 20 });
  assert.ok(oldShape.R4.identifierCollisions >= 1, "the counter can fail: a contextual word as hard is an identifier in ordinary code");
  assert.equal(oldShape.R1.hardViolations, 1, "and it refuses a legal declared name");
  assert.equal(decideR(w, oldShape).R4, "pass", "licensed by the control that fails");
  assert.equal(decideR(w, w).R4, "unlicensed", "a control that cannot fail does not license the claim");
  assert.equal(decideR(w, null).R4, "unlicensed");
  assert.equal(decideR(oldShape, oldShape).R4, "fail");
  assert.equal(decideR(oldShape, oldShape).R1, "fail");
});

test("R1/R2: an unlicensed control (that cannot fire) never reads as a pass", () => {
  const docs = [toyDoc("r", "f.java", "class A { void a() { this.a(); } }", [{ name: "A", kind: "class" }, { name: "a", kind: "method" }], KINDS)];
  const w = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, jsHard: ["zzz"], jsSoft: [], docs, draws: 5 });
  assert.equal(w.R1.jsControlViolations, 0);
  assert.equal(decideR(w, w).R1, "unlicensed");
  const same = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, jsHard: HARD, jsSoft: SOFT, docs, draws: 5 });
  assert.equal(same.R2.coverage, 1); assert.equal(decideR(same, same).R2, "unlicensed");
  const apart = witnessKeywords({ hard: HARD, soft: SOFT, builtins: BUILTINS, jsHard: ["zzz"], jsSoft: [], docs, draws: 5 });
  assert.equal(decideR(apart, w).R2, "pass", "a control that covers nothing licenses full coverage");
});

test("R3: the attestation bound is a declared fraction of the hard set", () => {
  const w = { R1: { jsControlViolations: 1, randomControlMean: 2, hardViolations: 0 }, R2: { coverage: 1, controlJsCoverage: 0.5 }, R3: { attested: 46, hardWords: 51, unattested: [] }, R4: { identifierCollisions: 0 }, R5: { softShadowingDefs: 0 }, R6: { softWordsSeenAsIdentifier: 0 } };
  assert.equal(decideR(w, { R4: { identifierCollisions: 3 } }).R3, "pass", "ceil(0.9 * 51) = 46");
  w.R3.attested = 45;
  assert.equal(decideR(w, { R4: { identifierCollisions: 3 } }).R3, "fail");
});

// ── K7: the comparison with the existing keyword prior ────────────────────────────────────────────────────────────────────────────────
test("K7: exact expected sets pass; a missing or extra word fails; a contextual word that is not soft fails", () => {
  const oldHard = ["class", "when", "to"], newHard = ["class", "this"], newSoft = ["when", "to"];
  const exp = { newOnly: ["this"], oldOnly: ["to", "when"] };
  assert.equal(compareKeywordPriors(newHard, newSoft, oldHard, exp).pass, true);
  assert.equal(compareKeywordPriors([...newHard, "void"], newSoft, oldHard, exp).pass, false, "an extra new word");
  assert.equal(compareKeywordPriors(newHard, ["when"], oldHard, exp).pass, false, "an old-hard word dropped from soft too");
  assert.deepEqual(symDiff(["a", "b"], ["b", "c"]), ["a", "c"]);
});

// ── TRAIN purity on a toy manifest ────────────────────────────────────────────────────────────────────────────────────────────────────
function toyManifest() {
  const sha = "a".repeat(64);
  const row = (repo, rel, extra = {}) => ({ repo, path: `${RAW_ROOT}toy/${rel}`, rel, sha256: sha, bytes: 6, restricted: false, ...extra });
  return {
    languages: { java: { train: [row("t/ok", "Ok.java"), row("t/res", "Res.java", { restricted: true, path: "/elsewhere/Res.java" })], dev: [row("d/dev", "D.java")], test: [row("e/test", "E.java")], info: { repos: { train: ["t/ok", "t/res"] } } } },
    repos: { "t/ok": { global_split: "train", restricted: false, license_class: "permissive" }, "t/res": { global_split: "train", restricted: true, license_class: "permissive-not-on-fetch-list" } },
  };
}
test("N2: TRAIN purity is checked and a planted overlap is caught (control built to fail)", () => {
  const m = toyManifest();
  const ok = verifyTrain(m, "java", { readBytes: false });
  assert.deepEqual(ok.problems, []);
  assert.deepEqual(ok.repos, ["t/ok"]); assert.deepEqual(ok.onlyRestricted, ["t/res"]);
  const leaked = JSON.parse(JSON.stringify(m)); leaked.languages.java.dev[0].repo = "t/ok";
  assert.ok(verifyTrain(leaked, "java", { readBytes: false }).problems.some((p) => /dev\/test/.test(p)), "a TRAIN repo that also appears in dev is caught");
  const wrongSplit = JSON.parse(JSON.stringify(m)); wrongSplit.repos["t/ok"].global_split = "test";
  assert.ok(verifyTrain(wrongSplit, "java", { readBytes: false }).problems.some((p) => /global_split/.test(p)));
  const outside = JSON.parse(JSON.stringify(m)); outside.languages.java.train[0].path = "/Users/x/ethos/y.java";
  assert.ok(verifyTrain(outside, "java", { readBytes: false }).problems.some((p) => /raw corpus/.test(p)), "a file outside the fetched raw corpus is caught");
  assert.equal(trainDigest(ok.rows), trainDigest([...ok.rows].reverse()), "the digest does not depend on row order");
});
test("N2: a file whose bytes do not match the manifest sha256 is caught", () => {
  const tmp = path.join(os.tmpdir(), `jp_toy_${process.pid}.java`);
  fs.writeFileSync(tmp, "class A {}\n");
  try {
    const m = toyManifest();
    m.languages.java.train[0].path = tmp;
    assert.ok(verifyTrain(m, "java").problems.some((p) => /sha256 mismatch/.test(p)));
    m.languages.java.train[0].sha256 = sha256(fs.readFileSync(tmp));
    assert.ok(!verifyTrain(m, "java").problems.some((p) => /sha256 mismatch/.test(p)));
  } finally { try { fs.unlinkSync(tmp); } catch { /* ignore */ } }
});

// ── the engine probe (needs a JDK) ────────────────────────────────────────────────────────────────────────────────────────────────────
function probe(words, flags = []) {
  const r = spawnSync(path.join(JDK, "bin", "java"), [
    "--add-exports", "jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED", "--add-exports", "jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED",
    path.join(NATIVE, "eval/coding-competence/JavaKwProbe.java"), ...flags], { input: words.join("\n") + "\n", encoding: "utf8", timeout: 120000 });
  assert.equal(r.status, 0, r.stderr?.slice(-300));
  return JSON.parse(r.stdout);
}
test("engine probe: javac refuses a keyword, accepts a plain identifier, and the controls move (control built to fail)", { skip: !HAVE_JDK }, () => {
  const std = probe(["class", "foo", "record", "var", "this", "to", "toString", "_"]);
  const row = (w) => std.probe[w];
  assert.deepEqual(row("class"), [false, false, false, false, false, false, false]);
  assert.deepEqual(row("foo"), [true, true, true, true, true, true, true]);
  assert.deepEqual(row("this"), [false, false, false, false, false, false, false], "`this` is refused everywhere at the analysis level");
  assert.deepEqual(row("to"), [true, true, true, true, true, true, true], "a module-info word is an ordinary name in ordinary code");
  // contextual: refused as a TYPE name (class, interface, enum), accepted as a method/field/local/param name
  for (const w of ["record", "var"]) assert.deepEqual(row(w), [false, false, false, true, true, true, true], w);
  // amendment A1: a method named like an Object member is NOT refused by an override clash
  assert.equal(row("toString")[3], true, "the (boolean, boolean) signature cannot override Object.toString");
  // the parse-level column documents the receiver-parameter fact (why the analysis level is the basis)
  assert.equal(std.parseProbe.this[6], true, "`int this` parses as a receiver parameter; attribution refuses it");
  const broken = probe(["foo", "class"], ["--broken"]);
  for (const w of ["foo", "class"]) assert.deepEqual(broken.probe[w], Array(7).fill(false), `${w}: a probe that said accepted here would be blind`);
  const trivial = probe(["class"], ["--trivial"]);
  assert.deepEqual(trivial.probe.class, Array(7).fill(true), "a probe that said refused here would be refusing on something other than the word");
});

// ── the priors ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("java keyword prior: schema, closed class and provenance", { skip: !KW }, () => {
  assert.equal(KW.schema, "CodeKeywordPrior@1"); assert.equal(KW.language, "java");
  assert.equal(new Set(KW.keywords).size, KW.keywords.length);
  assert.deepEqual(KW.keywords.filter((w) => KW.softKeywords.includes(w)), [], "no word is both hard and soft (the builder refuses it)");
  for (const w of ["class", "int", "boolean", "void", "this", "super", "true", "false", "null", "static", "public"]) assert.ok(KW.keywords.includes(w), `${w} can never name a being`);
  for (const w of ["record", "var", "yield", "sealed", "permits", "when", "to", "with", "open", "module", "exports", "requires"]) {
    assert.ok(KW.softKeywords.includes(w), `${w} is a legal name of a being, never refused`);
    assert.ok(!KW.keywords.includes(w), `${w} is not hard`);
  }
  assert.equal(KW.provenance.keywords_read, KW.keywords.length);
  const g = KW.provenance.grammar;
  assert.match(g.name, /tree-sitter/); assert.equal(g.packageVersion, "1.21.0"); assert.match(g.upstream, /^https:\/\/github\.com\/tree-sitter\/tree-sitter-java/);
  assert.match(g.packageSource, /^https:\/\//); assert.equal(g.upstreamCommit, null, "unrecorded upstream commit is a typed gap, not a guess");
  assert.ok(g.upstreamCommitNote); assert.match(g.nodeKindFingerprintSha256, /^[0-9a-f]{64}$/);
  assert.match(KW.provenance.engine.implementation, /javac/); assert.match(KW.provenance.engine.version, /^\d+\./);
  assert.match(KW.provenance.noCorpusRead, /no corpus file/);
  const ck = KW.provenance.derivation.checks;
  for (const k of ["K1", "K2", "K3", "K4", "K5", "K6", "K7"]) assert.equal(ck[k], "pass", k);
  assert.equal(ck.K8, "fail", "the failed amendment prediction is carried, not hidden");
  assert.equal(KW.provenance.trainWitness.hardKeywordsDeclaredAsNames, 0);
  assert.equal(KW.provenance.trainWitness.hardKeywordsAsIdentifierTokens, 0);
  assert.ok(KW.builtins.includes("String") && KW.builtins.includes("Object") && KW.builtins.includes("Exception"));
  assert.deepEqual(KW.builtins.filter((b) => KW.keywords.includes(b)), []);
  assert.ok(KW.stdlibModules.includes("java.util") && KW.stdlibModules.includes("java.io"));
});

test("java keyword prior: engine-only reserved words are a typed disagreement, not silently hard", { skip: !KW }, () => {
  const d = KW.provenance.derivation;
  assert.deepEqual([...d.engineRefusedButNotGrammarToken].sort(), ["const", "goto"]);
  for (const w of d.engineRefusedButNotGrammarToken) assert.ok(!KW.keywords.includes(w) && !KW.softKeywords.includes(w), w);
  assert.ok(d.engineRefusedButNotGrammarTokenNote);
});

test("java keyword prior: the position matrix backs every soft word with an accepting position", { skip: !KW }, () => {
  const pm = KW.provenance.derivation.positionMatrix;
  for (const w of KW.softKeywords) assert.ok(Object.values(pm[w]).some((v) => v === true), `${w} is accepted by javac in at least one position`);
  for (const w of KW.keywords) assert.ok(!pm[w] || Object.values(pm[w]).every((v) => v === false), `${w} is refused in every position`);
});

test("java name prior: schema, TRAIN-only provenance, internal consistency", { skip: !NM }, () => {
  assert.equal(NM.schema, "CodeNamePrior@1"); assert.equal(NM.language, "java");
  const p = NM.provenance;
  assert.equal(p.split, "train");
  assert.ok(Array.isArray(p.trainRepos) && p.trainRepos.every((r) => typeof r === "string" && /^[^/]+\/[^/]+$/.test(r)), "trainRepos are owner/repo STRINGS");
  assert.equal(p.trainRepos.length, NM.counts.repos);
  assert.equal(Object.values(p.trainRepoFiles).reduce((a, b) => a + b, 0), NM.counts.files);
  const entries = Object.entries(NM.names);
  assert.equal(entries.length, NM.counts.distinctNames);
  assert.equal(entries.filter(([, v]) => v.repos >= CONSTS.GENERIC_FLOOR).length, NM.counts.namesAtOrAboveGenericFloor);
  for (const [name, v] of entries) {
    assert.ok(v.repos >= 1 && v.repos <= NM.counts.repos, name); assert.ok(v.files >= v.repos, `${name}: a name in n repos is in >= n files`);
    assert.ok(v.kinds.length >= 1 && v.kinds.every((k) => ["class", "interface", "enum", "method"].includes(k)), name);
  }
  assert.equal(p.sumCheck.perRepoPartitionSum, p.sumCheck.pooledAttestations);
  assert.equal(entries.reduce((a, [, v]) => a + v.repos, 0), p.sumCheck.pooledAttestations);
  assert.equal(p.sumCheck.entryForEntryEqual, true);
  assert.ok(NM.names.toString.repos >= 3 && NM.names.equals.repos >= 3 && NM.names.main.repos >= 2, "boilerplate recurs across TRAIN repositories");
  assert.equal(p.validity.directWalkVsGrammar.verdict, "pass");
  assert.equal(p.genericityVsHeldOutRepo.verdict, "pass");
  assert.ok(p.gaps.some((g) => g.gap === "no-reader-recipe"), "the missing reader recipe is a typed gap");
});

test("java name prior: no hard keyword is a declared name; no TRAIN repository appears in a java dev/test row", { skip: !NM || !KW || !fs.existsSync(MANIFEST) }, () => {
  assert.deepEqual(KW.keywords.filter((w) => w in NM.names), []);
  const m = readJson(MANIFEST);
  const held = new Set([...m.languages.java.dev, ...m.languages.java.test].map((r) => r.repo.toLowerCase()));
  assert.deepEqual(NM.provenance.trainRepos.filter((r) => held.has(r.toLowerCase())), []);
  for (const r of NM.provenance.trainRepos) assert.equal(m.repos[r].global_split, "train");
  assert.ok([...NM.provenance.trainRepos, [...held][0]].some((r) => held.has(r.toLowerCase())), "the check would catch a planted dev repository");
});

// ── integration: re-read TRAIN with gold and compare entry for entry (skipped without the corpus or the extractor) ─────────────────────────
test("integration: a fresh TRAIN tally equals the java name prior(s) entry for entry", { skip: !NM || !fs.existsSync(MANIFEST) || !goldAvailable().available, timeout: 600000 }, async () => {
  const m = readJson(MANIFEST);
  const tv = verifyTrain(m, "java");
  assert.deepEqual(tv.problems, []);
  const files = tv.rows.map((r) => ({ repo: r.repo, rel: r.rel, text: fs.readFileSync(r.path, "utf8") }));
  const golds = await goldBatch(files.map((f) => ({ language: "java", text: f.text, fileName: f.rel })));
  const docs = files.map((f, i) => ({ ...f, gold: golds[i] })).filter((d) => !d.gold.error);
  const fresh = namesObject(tallyNames(docs).names);
  assert.equal(compareNameTables(fresh, NM.names).equal, true, "the candidate/installed java name prior equals a fresh TRAIN tally");
  const old = readJson(path.join(PRIORS, "code-name-java.json"));
  if (old?.names) assert.equal(compareNameTables(fresh, old.names).equal, true, "and so does the installed (build-c2-priors.mjs) one: the two code paths agree");
});

// ── the loader (what source edit is needed) ───────────────────────────────────────────────────────────────────────────────────────────
test("loader: loadCodeKeywordPrior('java') is null until the table edit, and serves the same refusal set as the java prior once edited", { skip: !KW }, (t) => {
  const served = loadCodeKeywordPrior("java");
  if (served === null) { t.diagnostic('loadCodeKeywordPrior("java") === null: adapters/text/code-structure.js CODE_KW_FILE / CODE_KW_LANG hold py and js only (source edit needed)'); return; }
  assert.deepEqual([...keywordSetOf(served)].sort(), [...KW.keywords].sort());
});

test("loader: the older installed java keyword prior is the contextual-keyword-as-hard list (a measured defect, not a style choice)", { skip: !OLD_KW || !!OLD_KW.provenance?.grammar }, () => {
  for (const w of ["record", "to", "with", "when", "open", "yield"]) assert.ok(OLD_KW.keywords.includes(w), w);
  for (const w of ["this", "void", "true", "null"]) assert.ok(!OLD_KW.keywords.includes(w), `${w} is missing from the older hard set`);
});
