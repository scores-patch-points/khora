// coding-rust-priors: the INSTRUMENT that builds priors/code-kw-rust.json and priors/code-name-rust.json is checked on TOY fixtures, and the shipped
// priors are checked for their own invariants. Nothing here measures khora on real code except the one integration test, which re-reads the
// manifest's rust TRAIN files (never dev or test) and is skipped when the corpus is absent.
// The toy texts, toy gold and the authored Rust snippets are AUTHORED by the model: tests of the instrument, never held-out data.
// Controls built to fail (II.23): a planted difference must be caught by the sum check; a planted keyword-named DEFINITION must be counted by the
// refusal witness; a hard word planted as an identifier in a grammar position must be counted while the same word in a macro token tree or a
// lifetime must not be; an unlicensed control must never read as a pass; a repository-shifted gold must collapse the recipe-vs-grammar precision;
// the patch to the reader must report a missing anchor instead of silently doing nothing.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  declarationsOf, tallyNames, partitionSum, nameGaps, attestationTotal, namesObject, compareNameTables, recipeVsGold, recallOf, shiftRepos, decideN3,
  witnessGold, witnessContext, decideR, verifyTrain, trainDigest, CONSTS, MANIFEST, RECIPES, RECIPE_EXTS, inRecipeFamily, TARGET_NODES, IDENT_FULL,
  stageReferenceBuilder, patchReader,
} from "../eval/coding-competence/build-rust-priors.mjs";
import { parseDeclarations, loadCodeKeywordPrior, loadCodeNamePriorSplit, keywordSetOf } from "../adapters/text/code-structure.js";
import { goldAvailable } from "../eval/coding-competence/gold.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, "..");
const PRIORS = path.join(NATIVE, "priors");
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const KW = readJson(path.join(PRIORS, "code-kw-rust.json"));
const NM = readJson(path.join(PRIORS, "code-name-rust.json"));
const PYTHON = process.env.GOLD_PYTHON || "/private/tmp/claude-501/venv/bin/python";
const GOLD_OK = (() => { try { return goldAvailable().available; } catch { return false; } })();

// ── the recipe ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("recipe: fn and struct/enum/union/trait items, qualifiers in the Reference's order, raw identifiers keep their prefix", () => {
  const text = [
    "pub fn open() {}",
    "    pub(crate) async fn go() {}",
    "pub const unsafe extern \"C\" fn raw_entry() {}",
    "fn r#match() {}",
    "pub(in crate::a::b) fn scoped() {}",
    "default fn special() {}",
    "pub struct Point { x: i32 }",
    "pub(super) enum Shape { A }",
    "union Bits { i: u32 }",
    "pub unsafe trait Marker {}",
    "struct Unit;",
    "fn Διαβάζω() {}",
  ].join("\n");
  assert.deepEqual(declarationsOf(text).map((d) => `${d.kind}:${d.name}`), [
    "function:open", "function:go", "function:raw_entry", "function:r#match", "function:scoped", "function:special", "function:Διαβάζω",
    "class:Point", "class:Shape", "class:Bits", "class:Marker", "class:Unit",
  ]);
  assert.deepEqual([...RECIPE_EXTS], [".rs"]);
  assert.equal(inRecipeFamily("a/b.RS"), true); assert.equal(inRecipeFamily("a/b.rst"), false);
});

test("recipe: its known limits are stated and real (not hidden)", () => {
  // a second item on the same line, an item after an attribute on the same line, type aliases, modules, macros, consts: not read
  const text = "impl X { fn second() {} }\n#[inline] fn attr_same_line() {}\ntype Alias = u8;\nmod inner;\nmacro_rules! mk { () => {}; }\npub const MAX: usize = 3;\n";
  assert.deepEqual(declarationsOf(text).map((d) => d.name), []);
  // a line inside a raw string that starts like an item is a false positive
  assert.deepEqual(declarationsOf("let s = r#\"\nfn inside_raw_string() {}\n\"#;\n").map((d) => d.name), ["inside_raw_string"]);
  // a doc comment is not a declaration
  assert.deepEqual(declarationsOf("/// fn documented() {}\n// struct Commented;\n").map((d) => d.name), []);
});

test("IDENT_FULL: the identifier the reader's patched row accepts (UAX #31 plus the raw prefix)", () => {
  for (const ok of ["a", "_x", "r#type", "Διαβάζω", "東京"]) assert.ok(IDENT_FULL.test(ok), ok);
  for (const bad of ["", "1a", "r#", "a-b", "$x"]) assert.ok(!IDENT_FULL.test(bad), bad);
});

// ── the tally and its sum check ────────────────────────────────────────────────────────────────────────────────────────────────────
const TOY = [
  { repo: "a/one", rel: "m.rs", text: "fn init() {}\nfn main() {}\nstruct Core;\n" },
  { repo: "a/one", rel: "n.rs", text: "fn main() {}\nfn only_one() {}\n" },
  { repo: "a/one", rel: "skipped.toml", text: "fn never_seen() {}\n" },
  { repo: "b/two", rel: "m.rs", text: "fn main() {}\nfn init() {}\nfn only_two() {}\nfn r#type() {}\n" },
  { repo: "c/three", rel: "m.rs", text: "struct Core;\nfn lone() {}\n" },
];

test("tally: names are counted per distinct REPOSITORY, files separately; only .rs is read", () => {
  const t = tallyNames(TOY);
  assert.equal(t.names.get("main").repos.size, 2); assert.equal(t.names.get("main").files.size, 3);
  assert.equal(t.names.get("Core").repos.size, 2); assert.equal([...t.names.get("Core").kinds][0], "class");
  assert.equal(t.names.get("lone").repos.size, 1);
  assert.ok(!t.names.has("never_seen"), "a non-.rs file is outside the recipe's extension family");
  assert.ok(t.names.has("r#type"), "the raw prefix is kept: `r#type` is a different string from the hard keyword `type`");
  assert.equal(t.files, 4); assert.equal(t.declarations, 11);
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

test("nameGaps: raw identifiers and non-ASCII names are measured, and a raw hard word is flagged", () => {
  const g = nameGaps(["plain", "r#type", "r#custom", "Διαβάζω"], new Set(["type", "fn"]));
  assert.equal(g.nonAscii, 1); assert.equal(g.rawIdentifiers, 2); assert.equal(g.rawSpelledAsHard, 1); assert.deepEqual(g.rawHardExamples, ["r#type"]);
});

// ── the staged reference builder (N1) and the patched reader (N7) ───────────────────────────────────────────────────────────────────
test("stageReferenceBuilder: the ONLY change is the two appended family rows; a drifted anchor is refused", { skip: !fs.existsSync(path.join(NATIVE, "scripts/build-code-name-prior-split.mjs")) }, () => {
  const orig = fs.readFileSync(path.join(NATIVE, "scripts/build-code-name-prior-split.mjs"), "utf8");
  const staged = stageReferenceBuilder(orig);
  const removed = orig.split("\n").filter((l) => !staged.includes(l));
  assert.deepEqual(removed, [], "no line of the original builder is changed or dropped");
  const added = staged.split("\n").filter((l) => !orig.includes(l));
  assert.equal(added.length, RECIPES.length); assert.ok(added.every((l) => l.includes('family: "rust"')));
  assert.throws(() => stageReferenceBuilder("const FAMILIES = [];\n"), /anchor/);
});

test("patchReader: the seven edits apply to the real reader, each exactly once, and a missing anchor is reported (control built to fail)", () => {
  const src = fs.readFileSync(path.join(NATIVE, "adapters/text/code-structure.js"), "utf8");
  const already = Boolean(loadCodeKeywordPrior("rust"));
  const p = patchReader(src);
  if (already) { assert.ok(p.missing.length > 0 || p.applied.length === 0, "the edit was already made: nothing left to apply"); return; }
  assert.deepEqual(p.missing, []); assert.equal(p.applied.length, 7);
  assert.ok(p.src.includes('rust: "code-kw-rust.json"') && p.src.includes('rust: "code-name-rust.json"') && p.src.includes("IDENT_RS") && p.src.includes('startsWith("rust")'));
  const broken = patchReader(src.replace('const CODE_KW_LANG = Object.freeze({ python: "py", py: "py", javascript: "js", js: "js" });', "const CODE_KW_LANG = {};"));
  assert.deepEqual(broken.missing, ["kw-lang"], "a drifted anchor is reported, not silently skipped");
});

test("patched reader (a COPY in a temp dir): serves both priors, reads the same names as the recipe, refuses nothing legal", { skip: !KW || !NM }, async () => {
  const src = fs.readFileSync(path.join(NATIVE, "adapters/text/code-structure.js"), "utf8");
  const p = patchReader(src);
  if (p.missing.length) return; // the real reader was edited since: nothing to simulate
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rust-patched-"));
  try {
    fs.mkdirSync(path.join(dir, "adapters/text"), { recursive: true }); fs.mkdirSync(path.join(dir, "priors"), { recursive: true });
    fs.writeFileSync(path.join(dir, "adapters/text/code-structure.js"), p.src);
    fs.copyFileSync(path.join(PRIORS, "code-kw-rust.json"), path.join(dir, "priors/code-kw-rust.json"));
    fs.copyFileSync(path.join(PRIORS, "code-name-rust.json"), path.join(dir, "priors/code-name-rust.json"));
    const m = await import(path.join(dir, "adapters/text/code-structure.js"));
    const kw = m.loadCodeKeywordPrior("rust");
    assert.deepEqual([...m.keywordSetOf(kw)].sort(), [...KW.keywords].sort());
    assert.equal(m.loadCodeKeywordPrior("rs"), kw);
    assert.equal(m.loadCodeNamePriorSplit("rust").counts.distinctNames, NM.counts.distinctNames);
    assert.equal(m.loadCodeNamePriorSplits().rust.language, "rust");
    const text = "pub fn a() {}\nfn r#match() {}\nstruct B;\nfn fn_like() {}\n";
    assert.deepEqual(m.parseDeclarations(text, "x.rs").map((d) => d.name).sort(), declarationsOf(text).map((d) => d.name).sort());
    assert.deepEqual(m.parseDeclarations(text, "x.rs", { keywords: m.keywordSetOf(kw) }).map((d) => d.name).sort(), ["B", "a", "fn_like", "r#match"], "the raw identifier r#match is NOT refused");
    // control built to fail: a bare keyword in a name slot would be refused (it never matches the recipe's NAME slot as `fn match`, but `struct type` shows the gate works)
    assert.deepEqual(m.parseDeclarations("struct type;\n", "x.rs", { keywords: m.keywordSetOf(kw) }), []);
    assert.equal(m.parseDeclarations("struct type;\n", "x.rs").length, 1, "without the prior the same text declares `type`");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── N3: recipe vs grammar, with the shifted-repository control ────────────────────────────────────────────────────────────────────────
test("N3: precision, targeted recall, and the control that must move", () => {
  const perRepo = new Map([["r1", new Set(["a", "b", "c"])], ["r2", new Set(["d", "e"])], ["r3", new Set(["f"])]]);
  const gold = new Set(["r1\ta", "r1\tb", "r1\tc", "r2\td", "r2\te", "r3\tf"]);
  const full = recipeVsGold(perRepo, gold);
  assert.equal(full.precision, 1); assert.equal(full.recall, 1);
  const shifted = shiftRepos(gold, perRepo.keys());
  assert.equal(recipeVsGold(perRepo, shifted).precision, 0, "every pair names the wrong repository: nothing agrees");
  assert.equal(recallOf(perRepo, new Set(["r1\ta", "r1\tz"])).recall, 0.5);
  assert.deepEqual(decideN3({ precision: 0.95 }, { recall: 0.97 }, { precision: 0.05, targetedRecall: 0.04 }, CONSTS), { N3a: "pass", N3b: "pass" });
  assert.deepEqual(decideN3({ precision: 0.95 }, { recall: 0.97 }, { precision: 0.9, targetedRecall: 0.95 }, CONSTS), { N3a: "unlicensed", N3b: "unlicensed" }, "a control that does as well as the real arm licenses nothing");
  assert.deepEqual(decideN3({ precision: 0.8 }, { recall: 0.5 }, { precision: 0.1, targetedRecall: 0.1 }, CONSTS), { N3a: "fail", N3b: "fail" });
  for (const n of ["function_item", "function_signature_item", "struct_item", "enum_item", "union_item", "trait_item"]) assert.ok(TARGET_NODES.includes(n), n);
});

// ── R1..R7 on a toy gold ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function toyDoc(text, kinds, defs) {
  // AUTHORED gold: tokenise on words; `kinds` maps a word to its class (default identifier)
  const tokens = [];
  const re = /[A-Za-z_][\w!]*/g; let m;
  while ((m = re.exec(text))) tokens.push({ start: m.index, end: m.index + m[0].length, type: kinds[m[0]] ?? "identifier", class: kinds[m[0]] ?? "identifier" });
  return { repo: "r", rel: "f.rs", text, gold: { tokens, defs } };
}
const HARD = ["fn", "let", "struct", "mut", "_"], SOFT = ["default", "expr", "macro_rules"], BUILTINS = ["Option", "u8", "drop"];
const KINDS = { fn: "keyword", let: "keyword", struct: "keyword", "macro_rules!": "keyword", expr: "keyword" };
const DEF = (name, node, kind = "function") => ({ name, node, kind });

test("R1/R2/R3/R5/R6: a hard word as a DEFINITION name is a violation (control built to fail); a raw identifier and a soft word are not", () => {
  const clean = [toyDoc("fn a() { let x = 1; } struct S; macro_rules! m { ($e:expr) => {} }", KINDS, [DEF("a", "function_item"), DEF("S", "struct_item", "class"), DEF("default", "function_item"), DEF("drop", "function_item"), DEF("r#struct", "struct_item", "class")])];
  const w = witnessGold({ hard: HARD, soft: SOFT, builtins: BUILTINS, reservedNotGrammar: ["Self", "final"], controls: { javascript: ["a", "new"] }, controlCover: ["fn", "zzz"], docs: clean, draws: 20 });
  assert.equal(w.R1.hardViolations, 0);
  assert.equal(w.R1.controlViolations.javascript, 1, "the foreign control refuses the declared `a`");
  assert.equal(w.R1r.rawIdentifierDefs, 1); assert.equal(w.R1r.spelledAsHard, 1, "r#struct is a raw identifier spelled as a hard word: counted apart, and NOT a violation (the exact string differs from `struct`)");
  assert.equal(w.R2.keywordTokens, 5, "fn, let, struct, macro_rules! (bang stripped) and expr are the keyword-class tokens");
  assert.equal(w.R2.coverage, 1); assert.deepEqual(w.R2.outsidePrior, []);
  assert.equal(w.R5.softShadowingDefs, 1); assert.equal(w.R5.builtinShadowingDefs, 1);
  assert.equal(w.R6defs.reservedNotGrammarDefs, 0);
  assert.ok(w.R3.unattested.includes("mut") && w.R3.attested === 3, "fn, let, struct are attested; mut and _ are not");
  const bad = [toyDoc("x", {}, [DEF("let", "function_item")])];
  const wb = witnessGold({ hard: HARD, soft: SOFT, builtins: BUILTINS, controls: { javascript: ["a"] }, docs: [...clean, ...bad], draws: 20 });
  assert.equal(wb.R1.hardViolations, 1);
  assert.equal(decideR(wb, null).R1, "fail", "licensed (the foreign control fires) and the planted violation is counted");
});

test("R1/R2: an unlicensed control (that cannot fire) never reads as a pass", () => {
  const docs = [toyDoc("fn a() {}", KINDS, [DEF("a", "function_item")])];
  const w = witnessGold({ hard: HARD, soft: SOFT, builtins: BUILTINS, controls: { javascript: ["zzz"] }, controlCover: ["zzz"], docs, draws: 5 });
  assert.equal(decideR(w, null).R1, "unlicensed");
  const same = witnessGold({ hard: HARD, soft: SOFT, builtins: BUILTINS, controls: {}, controlCover: [...HARD, ...SOFT], docs, draws: 5 });
  assert.equal(same.R2.coverage, 1); assert.equal(decideR(same, null).R2, "unlicensed", "a control that covers as much as the prior cannot license the claim");
  const apart = witnessGold({ hard: HARD, soft: SOFT, builtins: BUILTINS, controls: {}, controlCover: ["zzz"], docs, draws: 5 });
  assert.equal(decideR(apart, null).R2, "pass", "a control that covers nothing licenses full coverage");
});

test("R4a/R4b/R4c: the context split. A hard word in a macro token tree or a lifetime is not a grammar-position collision; `_` in a type argument IS counted (the first run's failure)", () => {
  const h = {
    files: 1, openIdentifierLeaves: 10, filesWithParseError: 0,
    hardAsIdentifier: { type: { token: 3 }, static: { lifetime: 5 }, _: { grammar: 2 }, ref: { token: 1, grammar: 0 } },
    softAsIdentifier: { path: { grammar: 4 } }, reservedNotGrammarAsIdentifier: { Self: { grammar: 9, token: 1 } },
    hardAsOwnToken: { fn: { grammar: 7 } }, controls: { javascript: { byContext: { grammar: 12, token: 0, lifetime: 0 } } },
    rawIdentifiers: { byContext: { grammar: 1 }, hardSpelled: { struct: 1 }, examples: [] }, examples: {},
  };
  const c = witnessContext(h);
  assert.equal(c.R4a.grammarCollisions, 2); assert.deepEqual(c.R4a.words, { _: 2 });
  assert.equal(c.R4b.tokenSpaceCollisions, 4); assert.equal(c.R4c.lifetimeCollisions, 5);
  assert.equal(c.R6leaves.grammarLeaves, 9); assert.equal(c.R7.grammarLeaves, 4);
  const w = witnessGold({ hard: HARD, soft: SOFT, builtins: BUILTINS, controls: { javascript: ["a"] }, controlCover: ["fn"], docs: [toyDoc("fn a() {}", KINDS, [DEF("a", "function_item")])], draws: 5 });
  assert.equal(decideR(w, c).R4a, "fail", "2 leaves in grammar positions: a failure as pre-registered, whatever the diagnosis");
  const zero = witnessContext({ ...h, hardAsIdentifier: { type: { token: 3 }, static: { lifetime: 5 } } });
  assert.equal(decideR(w, zero).R4a, "pass");
  const noCtl = witnessContext({ ...h, hardAsIdentifier: {}, controls: { javascript: { byContext: { grammar: 0 } } } });
  assert.equal(decideR(w, noCtl).R4a, "unlicensed", "a control that cannot fire licenses nothing");
  assert.equal(decideR(w, null).R4a, "gap");
});

// ── the context witness on AUTHORED Rust (needs the grammar pack) ───────────────────────────────────────────────────────────────────────
test("rust_witness.py on an authored snippet: grammar vs token space vs lifetime, with a planted violation caught", { skip: !GOLD_OK }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rust-witness-"));
  try {
    const f = path.join(dir, "a.rs");
    fs.writeFileSync(f, [
      "// AUTHORED (model-written) snippet",
      "static S: &'static str = \"x\";",
      "fn ok(v: Vec<_>) -> Vec<_> { v }",
      "fn go() { quote! { fn #name() { ref } }; }",
      "fn r#match() {}",
      "fn planted() { let if = 0; }",
    ].join("\n") + "\n");
    const spec = path.join(dir, "in.json"), out = path.join(dir, "out.json");
    fs.writeFileSync(spec, JSON.stringify({ files: [{ id: "t/a.rs", path: f }], hard: ["if", "static", "ref", "_", "fn", "match"], soft: [], reservedNotGrammar: ["Self"], controls: { javascript: ["new", "delete"] } }));
    const r = spawnSync(PYTHON, [path.join(NATIVE, "eval/coding-competence/rust_witness.py"), spec, out], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    const h = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.equal(h.hardAsIdentifier.if?.grammar, 1, "the planted `let if` is a grammar-position collision (control built to fail: the witness can fire)");
    assert.equal(h.hardAsIdentifier._?.grammar, 2, "`Vec<_>` x2: the type-argument placeholder is lexed as an identifier");
    assert.equal(h.hardAsIdentifier.static?.lifetime, 1, "'static is a lifetime, not the bare word");
    assert.equal(h.hardAsIdentifier.ref?.token, 1, "`ref` inside a macro token tree is token space");
    assert.ok(!h.hardAsIdentifier.match, "r#match is one identifier spelled with its prefix: never the bare word");
    assert.equal(h.rawIdentifiers.hardSpelled.match, 1);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── the giver (needs the grammar pack and the fetched authority texts) ──────────────────────────────────────────────────────────────────
const SOURCES = "/private/tmp/claude-501/coding-competence/rust-priors/giver-sources/SOURCES.json";
test("rust_kw_giver.py rerun reproduces the shipped keyword prior's lists (determinism, and the prior is in step with its giver)", { skip: !GOLD_OK || !KW || !fs.existsSync(SOURCES) }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rust-giver-"));
  try {
    const out = path.join(dir, "law.json");
    const r = spawnSync(PYTHON, [path.join(NATIVE, "eval/coding-competence/rust_kw_giver.py"), out], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    const law = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.deepEqual(law.lexical.keywords, KW.keywords);
    assert.deepEqual(law.lexical.softKeywords, KW.softKeywords);
    assert.deepEqual(law.builtins, KW.builtins);
    assert.deepEqual(law.lexicon.stdlibModules, KW.stdlibModules);
    for (const k of ["K1", "K2", "K3", "K4", "K5", "K6", "K7"]) assert.ok(law.derivation.checks[k].pass ?? law.derivation.checks[k].prediction_ge_20_held, k);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── the shipped priors ────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("priors/code-kw-rust.json: schema, closed class, edition and raw-identifier law, provenance", { skip: !KW }, () => {
  assert.equal(KW.schema, "CodeKeywordPrior@1"); assert.equal(KW.language, "rust");
  assert.equal(new Set(KW.keywords).size, KW.keywords.length);
  assert.deepEqual(KW.keywords.filter((w) => KW.softKeywords.includes(w)), [], "no word is both hard and soft (the builder refuses it)");
  for (const w of ["fn", "let", "struct", "enum", "trait", "impl", "pub", "use", "mod", "match", "mut", "ref", "self", "super", "crate", "true", "false", "return", "static", "const", "unsafe", "where", "_", "yield", "loop", "while", "for", "if", "else", "as", "in", "move", "type", "extern", "break", "continue"]) assert.ok(KW.keywords.includes(w), `${w} cannot name a being (bare)`);
  assert.equal(KW.keywords.length, 36);
  for (const w of ["async", "await", "dyn", "try", "gen"]) assert.ok(KW.softKeywords.includes(w) && !KW.keywords.includes(w), `${w} is reserved only from an edition on: a 2015 crate may declare it, so soft`);
  for (const w of ["default", "union", "raw", "macro_rules"]) assert.ok(KW.softKeywords.includes(w) && !KW.keywords.includes(w), `${w} is a weak keyword: soft`);
  for (const w of ["path", "block", "item", "meta", "expr"]) assert.ok(KW.softKeywords.includes(w), `${w} is a macro fragment specifier (a grammar token only after \`$x:\`): soft`);
  for (const w of ["Self", "abstract", "become", "box", "do", "final", "macro", "override", "priv", "typeof", "unsized", "virtual"]) {
    assert.ok(!KW.keywords.includes(w) && !KW.softKeywords.includes(w), `${w}: settled by both authorities but not a grammar token: kept out of the closed class, listed in refusalScope`);
    assert.ok(KW.refusalScope.reservedButNotGrammarToken.includes(w), w);
  }
  assert.equal(KW.refusalScope.rawIdentifierEscape, true);
  assert.deepEqual(KW.refusalScope.cannotBeRaw.sort(), ["_", "crate", "self", "super"]);
  assert.deepEqual(KW.refusalScope.editionConditional, { async: 2018, await: 2018, dyn: 2018, try: 2018, gen: 2024 });
  for (const w of ["u8", "i64", "usize", "f32", "bool", "str", "char", "Option", "Some", "None", "Result", "Ok", "Err", "Vec", "String", "Box", "drop", "r#try"]) assert.ok(KW.builtins.includes(w), `${w} is a builtin (declarable: recorded, never refused)`);
  assert.deepEqual(KW.builtins.filter((b) => KW.keywords.includes(b)), []);
  assert.deepEqual(KW.stdlibModules, ["alloc", "core", "proc_macro", "std"]);
  const g = KW.provenance.grammar;
  assert.match(g.name, /tree-sitter/); assert.equal(g.packageVersion, "1.21.0"); assert.match(g.upstream, /^https:\/\/github\.com\/tree-sitter\/tree-sitter-rust/);
  assert.match(g.packageSource, /^https:\/\//); assert.equal(g.upstreamCommit, null, "unrecorded upstream commit is a typed gap, not a guess");
  assert.ok(g.upstreamCommitNote); assert.equal(g.dedicatedTerminals.mutable_specifier, "mut");
  const a = KW.provenance.authorities;
  assert.match(a.reference.url, /^https:\/\/raw\.githubusercontent\.com\/rust-lang\/reference\/[0-9a-f]{40}\/src\/keywords\.md$/); assert.match(a.reference.sha256, /^[0-9a-f]{64}$/);
  assert.match(a.rustc.url, /rust-lang\/rust\/[0-9a-f]{40}\/compiler\/rustc_span\/src\/symbol\.rs$/); assert.match(a.rustc.licence, /MIT OR Apache-2\.0/);
  assert.match(KW.provenance.engine.mode, /no compile probe/, "the missing engine is a typed gap, not hidden");
  assert.match(KW.provenance.noCorpusRead, /no corpus file/);
  for (const k of ["K1", "K2", "K3", "K4", "K5", "K6", "K7", "K8"]) assert.equal(KW.provenance.derivation.checks[k], "pass", k);
  assert.match(KW.provenance.polarity, /BARE names only/);
  assert.equal(KW.provenance.trainWitness.hardKeywordsDeclaredAsDefinitionNames, 0);
  assert.equal(KW.provenance.trainWitness.verdicts.R4a, "fail", "the failure is carried, not hidden");
  assert.equal(KW.provenance.postHoc?.post_hoc, true);
  assert.equal(KW.provenance.postHoc.underscore.declaringPositions, 0);
});

test("priors/code-name-rust.json: schema, TRAIN-only provenance, internal consistency", { skip: !NM }, () => {
  assert.equal(NM.schema, "CodeNamePrior@1"); assert.equal(NM.language, "rust");
  const p = NM.provenance;
  assert.equal(p.split, "train");
  assert.ok(Array.isArray(p.trainRepos) && p.trainRepos.every((r) => typeof r === "string" && /^[^/]+\/[^/]+$/.test(r)), "trainRepos are owner/repo STRINGS");
  assert.equal(p.trainRepos.length, NM.counts.repos);
  assert.equal(Object.values(p.trainRepoFiles).reduce((a, b) => a + b, 0), p.trainFiles);
  assert.equal(p.recipeFiles, NM.counts.files);
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
  assert.match(p.sumCheck.referenceSumCheckLine, /blended attestations = \d+ split attestations/);
  assert.ok(p.gaps.some((g) => g.gap === "aliases-modules-macros-not-tallied") && p.gaps.some((g) => g.gap === "reader-has-no-rust-recipe"), "gaps are typed, not silent");
  assert.ok(p.filesExcluded.restricted_licence.length >= 1 && p.filesExcluded.restricted_licence.every((r) => /agpl/i.test(r.license)), "the AGPL libsignal file is excluded, and said so");
  assert.ok(!entries.some(([n]) => (KW?.keywords ?? []).includes(n)), "no declared name is a hard keyword");
  assert.ok("new" in NM.names && NM.names.new.repos >= 3, "`new` recurs across independent repositories");
  assert.equal(p.recipe.rows.length, 2);
});

test("priors/code-name-rust.json: no TRAIN repository appears in a rust dev/test row of the manifest", { skip: !NM || !fs.existsSync(MANIFEST) }, () => {
  const m = readJson(MANIFEST);
  const held = new Set([...m.languages.rust.dev, ...m.languages.rust.test].map((r) => r.repo.toLowerCase()));
  assert.deepEqual(NM.provenance.trainRepos.filter((r) => held.has(r.toLowerCase())), []);
  for (const r of NM.provenance.trainRepos) assert.equal(m.repos[r].global_split, "train");
  assert.ok([...NM.provenance.trainRepos, [...held][0]].some((r) => held.has(r.toLowerCase())), "the check would catch a planted dev repo");
});

// ── the loaders (what source edit is needed) ───────────────────────────────────────────────────────────────────────────────────────
test("loader: what the reader serves for rust today (a diagnostic; the source edit is reported in the card and the .patch, never made here)", { skip: !KW }, (t) => {
  const served = loadCodeKeywordPrior("rust");
  t.diagnostic(`loadCodeKeywordPrior("rust") -> ${served ? `served (${served.keywords.length} hard)` : "null (CODE_KW_LANG / CODE_KW_FILE have no rust row)"}`);
  t.diagnostic(`loadCodeNamePriorSplit("rust") -> ${loadCodeNamePriorSplit("rust") ? "served" : "null (no rust row in CODE_NAME_SPLIT_FILE)"}`);
  t.diagnostic(`parseDeclarations(text, "x.rs") -> ${parseDeclarations("fn a() {}\n", "x.rs").length} declarations (no .rs recipe in RECIPES)`);
  if (served) assert.deepEqual([...keywordSetOf(served)].sort(), [...KW.keywords].sort(), "once the edit is made, the reader serves THIS file");
});

// ── integration: rebuild the tally from the manifest's TRAIN files and compare with the shipped prior (TRAIN only) ──────────────────────
test("integration: the shipped name prior is exactly what the TRAIN files give", { skip: !NM || !fs.existsSync(MANIFEST) }, () => {
  const m = readJson(MANIFEST);
  const tv = verifyTrain(m, "rust");
  if (tv.problems.length) return; // corpus moved or absent: not this test's business (N2 reports it)
  const files = tv.rows.map((r) => ({ repo: r.repo, rel: r.rel, text: fs.readFileSync(r.path, "utf8") }));
  const t = tallyNames(files);
  assert.deepEqual(namesObject(t.names), NM.names);
  assert.equal(t.declarations, NM.counts.totalDeclarations);
  assert.equal(trainDigest(tv.rows), NM.provenance.trainFilesDigestSha256);
});
