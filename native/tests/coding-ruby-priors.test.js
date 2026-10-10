// coding-ruby-priors: the INSTRUMENT that builds priors/code-kw-ruby-grammar.json and priors/code-name-ruby-grammar.json is checked on TOY
// fixtures, and the shipped priors are checked for their own invariants. Nothing here measures khora on real code except the one integration
// test, which re-reads the manifest's ruby TRAIN rows (never dev or test) and is skipped when the corpus is absent.
// The toy documents and toy gold are AUTHORED by the model (hand-made token lists in the shape gold.py emits): tests of the instrument, never
// held-out data. Controls built to fail (II.23): a planted difference must be caught by the sum check; a planted keyword-named BINDING token
// must be counted by the refusal witness while a keyword-named METHOD (`def end`, `x.class`) must not; the incumbent's numeric-suffix words must
// collide with a variable named `i`; an unlicensed control must never read as a pass.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  tallyDefs, tallyReference, partitionSumDefs, declaredName, IDENT_RB, witnessKeywords, decideR, verifyTrainRuby, CONSTS, KW_FILE, NAME_FILE,
} from "../eval/coding-competence/build-ruby-priors.mjs";
import { attestationTotal, namesObject, compareNameTables, MANIFEST, trainDigest } from "../eval/coding-competence/build-python-priors.mjs";
import { parseDeclarations, loadCodeKeywordPrior, keywordSetOf } from "../adapters/text/code-structure.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIORS = path.resolve(HERE, "../priors");
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const KW = readJson(path.join(PRIORS, KW_FILE));
const NM = readJson(path.join(PRIORS, NAME_FILE));
const OLD_KW = readJson(path.join(PRIORS, "code-kw-ruby.json"));
const PY_KW = readJson(path.join(PRIORS, "code-kw-python.json"));

/** toyDoc(parts, defs) -> { text, gold }: parts = [text, type, class]; tokens are separated by one space, offsets computed. defs: [{kind, name, at}] where `at` is the part index of the name */
function toyDoc(parts, defs = []) {
  let text = "";
  const tokens = [];
  for (const [t, type, cls] of parts) { if (text) text += " "; tokens.push({ start: text.length, end: text.length + t.length, type, class: cls }); text += t; }
  return { text, gold: { tokens, defs: defs.map((d) => ({ kind: d.kind, name: d.name, nameStart: tokens[d.at].start, nameEnd: tokens[d.at].end, node: d.kind })), parse: { error_bytes_frac: 0 } } };
}

// ── the recipe and the tally ──────────────────────────────────────────────────────────────────────────────�
test("recipe: the declared name drops the scope prefix; the identifier law admits ? and ! suffixes and refuses operators", () => {
  assert.equal(declaredName("Foo::Bar"), "Bar");
  assert.equal(declaredName("call"), "call");
  for (const ok of ["valid?", "save!", "_x", "Élan", "Foo"]) assert.ok(IDENT_RB.test(ok), ok);
  for (const no of ["==", "[]", "<=>", "name=", "1x", ""]) assert.ok(!IDENT_RB.test(no), `${no} is not an identifier`);
});

const D1 = toyDoc([["class", "class", "keyword"], ["Foo", "constant", "identifier"], ["def", "def", "keyword"], ["main", "identifier", "identifier"], ["def", "def", "keyword"], ["init", "identifier", "identifier"]], [{ kind: "class", name: "Foo", at: 1 }, { kind: "method", name: "main", at: 3 }, { kind: "method", name: "init", at: 5 }]);
const D2 = toyDoc([["def", "def", "keyword"], ["main", "identifier", "identifier"], ["def", "def", "keyword"], ["only_one", "identifier", "identifier"]], [{ kind: "method", name: "main", at: 1 }, { kind: "method", name: "only_one", at: 3 }]);
const D3 = toyDoc([["class", "class", "keyword"], ["A::Foo", "constant", "identifier"], ["def", "def", "keyword"], ["init", "identifier", "identifier"], ["def", "def", "keyword"], ["==", "==", "operator"]], [{ kind: "class", name: "A::Foo", at: 1 }, { kind: "method", name: "init", at: 3 }, { kind: "method", name: "==", at: 5 }]);
const TOY = [{ repo: "a/one", rel: "m.rb", ...D1 }, { repo: "a/one", rel: "n.rb", ...D2 }, { repo: "b/two", rel: "m.rb", ...D3 }];

test("tally: names are counted per distinct REPOSITORY; scoped names by last segment; non-identifiers are counted apart", () => {
  const t = tallyDefs(TOY);
  assert.equal(t.names.get("main").repos.size, 1); assert.equal(t.names.get("main").files.size, 2);
  assert.equal(t.names.get("Foo").repos.size, 2, "class Foo and class A::Foo are the same declared name");
  assert.equal(t.names.get("init").repos.size, 2);
  assert.equal(t.notIdentifier.length, 1); assert.equal(t.notIdentifier[0].name, "==");
  assert.equal(t.scoped.defs, 1);
  assert.equal(attestationTotal(t.names), partitionSumDefs(TOY), "the independent per-repository partition sums to the pooled count");
});

test("sum check: the reference aggregator reproduces a name table, and a PLANTED difference is caught (control built to fail)", () => {
  const ref = tallyReference(TOY.slice(0, 2));
  const mine = namesObject(tallyDefs(TOY.slice(0, 2)).names);
  assert.ok(compareNameTables(mine, ref.names).equal, "the same two files give the same table under both rules");
  const planted = { ...mine, main: { ...mine.main, repos: mine.main.repos + 1 } };
  const cmp = compareNameTables(planted, ref.names);
  assert.equal(cmp.equal, false); assert.equal(cmp.differing.length, 1);
});

// ── the witnesses ───────────────────────────────────────────────────────────────────────────────────────�
const HARD = ["def", "end", "class", "self", "then"];
const WITNESS_DOC = toyDoc([
  ["def", "def", "keyword"], ["end", "identifier", "identifier"],               // def end        (a METHOD named by a hard word)
  ["x", "identifier", "identifier"], [".", ".", "punctuation"], ["class", "identifier", "identifier"], // x.class  (member)
  ["i", "identifier", "identifier"], ["=", "=", "operator"], ["3", "integer", "literal"],           // i = 3          (binding `i`)
  ["r", "r", "keyword"], ["self", "self", "keyword"], ["end", "end", "keyword"],
  ["then", "identifier", "identifier"],                                         // a binding token spelled like a hard word (a planted violation)
], [{ kind: "method", name: "end", at: 1 }, { kind: "class", name: "Box", at: 3 }]);

function witness(hard, extra = {}) {
  return witnessKeywords({ hard, soft: ["i", "r", "ri"], builtins: ["puts"], incumbentHard: ["i", "r", "ri", "end"], pythonHard: ["if", "else", "class"], pythonSoft: [], docs: [{ repo: "a/one", rel: "w.rb", ...WITNESS_DOC }], draws: 20, ...extra });
}

test("witness: a hard-word BINDING token is a collision; a hard-word METHOD (`def end`) and a member token (`x.class`) are not", () => {
  const w = witness(HARD);
  assert.equal(w.R4a.collisions, 1, "only the planted `then` binding token collides");
  assert.deepEqual(Object.keys(w.R4a.words), ["then"]);
  assert.equal(w.R4b.hardTextAsMember, 2, "`end` after def and `class` after the dot are member positions");
  assert.deepEqual(w.R4b.byWord, { end: 1, class: 1 });
  assert.equal(w.R1m.hardNamedMethods, 1, "def end is a method def named by a hard word");
  assert.equal(w.R1.hardViolations, 0, "no class/module def is named by a hard word");
});

test("witness: the incumbent control fires on a variable named i (the licence), the real set does not", () => {
  const w = witness(HARD.filter((x) => x !== "then"));
  assert.equal(w.R4a.collisions, 0);
  assert.ok(w.R4a.incumbentControlCollisions >= 1, "i is a binding token and the incumbent refuses it");
  assert.equal(decideR(w).R4a, "pass");
});

test("witness: soft keywords cover the numeric-suffix keyword tokens; the python control covers less (R2 licence)", () => {
  const w = witness(HARD);
  assert.equal(w.R2.keywordTokens, 4);                   // def, r, self, end: the tokens whose gold class is `keyword`
  assert.equal(w.R2.coverage, 1, "r is covered as a soft keyword");
  assert.ok(w.R2.controlPythonCoverage < w.R2.coverage, "a python keyword set must cover ruby keyword tokens worse");
});

test("decideR: an unlicensed control never reads as a pass", () => {
  const w = witness(HARD.filter((x) => x !== "then"));
  const unlicensed = { ...w, R4a: { ...w.R4a, incumbentControlCollisions: 0 }, R2: { ...w.R2, controlPythonCoverage: w.R2.coverage } };
  assert.equal(decideR(unlicensed).R4a, "unlicensed");
  assert.equal(decideR(unlicensed).R2, "unlicensed");
  assert.equal(decideR(w).R1, "unlicensed", "no deranged control can fire on a constant-named class def: R1 is unlicensed, never a pass");
});

// ── the shipped priors ──────────────────────────────────────────────────────────────────────────────────�
test("keyword prior: schema, derived-not-typed provenance, polarity", { skip: !KW && "priors/code-kw-ruby-grammar.json absent: run eval/coding-competence/build-ruby-priors.mjs" }, () => {
  assert.equal(KW.schema, "CodeKeywordPrior@1"); assert.equal(KW.language, "ruby");
  assert.equal(KW.keywords.length, 38);
  assert.equal(new Set(KW.keywords).size, KW.keywords.length);
  for (const w of ["self", "super", "true", "false", "nil", "defined?", "BEGIN", "END", "do", "end", "def", "class", "module", "yield"]) assert.ok(KW.keywords.includes(w), `${w} is hard`);
  for (const w of ["i", "r", "ri"]) assert.ok(!KW.keywords.includes(w), `${w} is a numeric-literal suffix, never a hard keyword`);
  assert.deepEqual([...KW.softKeywords].sort(), ["i", "r", "ri"]);
  assert.equal(KW.softKeywords.filter((w) => KW.keywords.includes(w)).length, 0, "no word is both hard and soft");
  assert.equal(KW.builtins.filter((w) => KW.keywords.includes(w)).length, 0, "a builtin that is also hard is excluded (the keyword refuses)");
  for (const w of ["puts", "require", "raise", "lambda", "String", "Array"]) assert.ok(KW.builtins.includes(w), `${w} is a builtin`);
  for (const bad of ["JSON", "OpenStruct", "Ripper"]) assert.ok(!KW.builtins.includes(bad), `${bad} needs a require: not a builtin (snapshot taken before the probe's own requires)`);
  assert.ok(KW.stdlibModules.includes("json") && KW.stdlibModules.includes("optparse"), "stdlib libraries are engine-derived (rubylibdir)");
  const p = KW.provenance;
  assert.match(p.giver, /tree-sitter/); assert.match(p.giver, /MRI Ruby/);
  assert.equal(p.grammar.upstreamCommit, null, "the pack records no upstream commit: a typed gap, not a guess");
  assert.ok(p.grammar.compiledLibrarySha256 && p.grammar.nodeKindFingerprintSha256);
  assert.ok(p.noCorpusRead && /no corpus file/.test(p.noCorpusRead));
  assert.deepEqual(KW.engineReservedNotGrammarToken, ["__ENCODING__", "__FILE__", "__LINE__"], "the three words MRI reserves and the grammar does not tokenise are carried apart");
  assert.equal(p.derivation.checks.K3, "fail", "the giver's K3 failure is on the record");
  assert.ok(KW.memberPositions.methodNameDeclarable.length === 38, "every reserved word is legal as a method name (the binding-only limit)");
});

test("keyword prior: loadable by the reader's own contract (keywordSetOf), and the loader's current state is stated", { skip: !KW && "prior absent" }, () => {
  const set = keywordSetOf(KW);
  assert.ok(set instanceof Set && set.size === 38);
  const served = loadCodeKeywordPrior("ruby");
  // today CODE_KW_LANG has no ruby row (null); after the proposed edit it serves this file. Either is a consistent state; a DIFFERENT prior is not.
  assert.ok(served === null || (served.keywords.length === KW.keywords.length && served.keywords.every((w) => KW.keywords.includes(w))));
  assert.deepEqual(parseDeclarations("class A\n  def b; end\nend\n", "x.rb"), [], "the reader has no ruby declaration recipe (card N7)");
});

test("keyword prior vs the incumbent: the incumbent over-refuses i, r, ri and lacks seven reserved words", { skip: !KW || !OLD_KW }, () => {
  const inc = new Set(OLD_KW.keywords), now = new Set(KW.keywords);
  assert.deepEqual([...inc].filter((w) => !now.has(w)).sort(), ["i", "r", "ri"]);
  assert.deepEqual([...now].filter((w) => !inc.has(w)).sort(), ["BEGIN", "END", "defined?", "false", "self", "super", "true"]);
  // the python control: a different language's hard set must be far from ruby's (the word rule is not returning one list for every grammar)
  assert.ok(PY_KW && PY_KW.keywords.filter((w) => !now.has(w)).length + [...now].filter((w) => !PY_KW.keywords.includes(w)).length >= 10);
});

test("name prior: schema, counts consistent with the table, TRAIN repositories only, rails excluded", { skip: !NM && "priors/code-name-ruby-grammar.json absent" }, () => {
  assert.equal(NM.schema, "CodeNamePrior@1"); assert.equal(NM.language, "ruby");
  assert.equal(NM.counts.distinctNames, Object.keys(NM.names).length);
  assert.equal(NM.counts.repos, NM.provenance.trainRepos.length);
  assert.ok(NM.provenance.trainRepos.every((r) => typeof r === "string"), "trainRepos are owner/repo strings (the run.mjs convention)");
  assert.ok(!NM.provenance.trainRepos.includes("rails/rails"), "the ethos-local rails file is excluded");
  assert.ok(NM.provenance.gaps.some((g) => g.gap === "ethos-local-rails-excluded"));
  assert.ok(NM.provenance.gaps.some((g) => g.gap === "setters-and-operator-methods-not-tallied"), "gold emits no setter/operator defs: typed gap");
  assert.equal(NM.provenance.sumCheck.entryForEntryEqual, true);
  assert.equal(NM.provenance.sumCheck.perRepoPartitionSum, NM.provenance.sumCheck.pooledAttestations);
  let atFloor = 0;
  for (const [name, r] of Object.entries(NM.names)) {
    assert.ok(IDENT_RB.test(name), `${name} is an identifier`);
    assert.ok(r.repos >= 1 && r.repos <= NM.counts.repos, `${name} repos within 1..${NM.counts.repos}`);
    assert.ok(r.files >= r.repos, `${name}: files >= repos`);
    if (r.repos >= CONSTS.GENERIC_FLOOR) atFloor++;
  }
  assert.equal(atFloor, NM.counts.namesAtOrAboveGenericFloor);
  assert.ok(NM.names.initialize && NM.names.initialize.repos === NM.counts.repos, "initialize is declared in every TRAIN repository");
  const dev = NM.provenance.trainRepos.filter((r) => ["basecamp/kamal", "faker-ruby/faker", "heartcombo/devise", "NikolayS/PgQue", "jekyll/jekyll", "tigerbeetle/tigerbeetle"].includes(r));
  assert.deepEqual(dev, [], "no dev or test repository in the prior");
});

// ── integration over the real TRAIN rows (skipped when the corpus is absent) ─────────────────────────────────────────────────────────�
test("TRAIN purity over the manifest: fetched, hash-verified rows only; the ethos-local row is excluded and named", { skip: !fs.existsSync(MANIFEST) && "manifest absent" }, () => {
  const manifest = readJson(MANIFEST);
  const tv = verifyTrainRuby(manifest);
  assert.deepEqual(tv.problems, []);
  assert.equal(tv.rows.length, 240); assert.equal(tv.repos.length, 4);
  assert.deepEqual(tv.onlyExcluded, ["rails/rails"]);
  assert.ok(tv.excluded.every((r) => /not verified at fetch/.test(r.why)));
  if (NM) assert.equal(trainDigest(tv.rows), NM.provenance.trainFilesDigestSha256, "the shipped prior was built from exactly these rows");
  // no dev/test row is ever in the train set
  const devTest = new Set([...manifest.languages.ruby.dev, ...manifest.languages.ruby.test].map((r) => r.repo));
  assert.ok(tv.repos.every((r) => !devTest.has(r)));
});
