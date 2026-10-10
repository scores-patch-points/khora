#!/usr/bin/env node
// build-rust-priors.mjs: build the two RECEIVED priors for the programming language "rust" from TRAIN ONLY, and measure them.
//
//   node eval/coding-competence/build-rust-priors.mjs [--out DIR] [--priors DIR] [--no-write-priors]
//
// Writes (new files only):
//   native/priors/code-kw-rust.json    CodeKeywordPrior@1  hard keywords (refuse BARE names), soft keywords + builtins (never refuse)
//   native/priors/code-name-rust.json  CodeNamePrior@1     distinct-TRAIN-repo counts of declared fn / struct / enum / union / trait names (genericity)
//   <out>/card-rust-priors-train.json  the measured card: every check below, with denominators, passes AND failures
//   <out>/rust-law-prior.json          the giver's LanguageLawPrior@1 (rust_kw_giver.py)
//   <out>/code-structure.rust.patch    the PROPOSED source edit that lets the reader serve these priors (NOT applied; see N7)
// <out> defaults to /private/tmp/claude-501/coding-competence/rust-priors. It never opens a dev or test file.
// It is the Rust twin of build-javascript-priors.mjs and imports the pure helpers of build-python-priors.mjs / build-javascript-priors.mjs
// unchanged (tally statistics, the leave-one-repository-out genericity test and its control, the recipe-vs-grammar comparison, TRAIN purity).
//
// GIVERS (READING-POLICY rule 3: every prior names its giver):
//   code-kw-rust: the tree-sitter grammar for rust (tree-sitter-language-pack 1.21.0; upstream tree-sitter/tree-sitter-rust, MIT) for the word
//     tokens, arbitrated by TWO declared authorities read as text (the Rust Reference keywords.md and rustc's own keyword table symbol.rs; no
//     rust toolchain exists here, so there is no engine probe: a typed gap). Derived by eval/coding-competence/rust_kw_giver.py (pre-registered
//     in its own header, K1..K7, K9), projected to the CodeKeywordPrior@1 schema by the EXISTING, UNMODIFIED scripts/build-code-keyword-prior.mjs.
//     No keyword is typed here and no corpus file is read to derive the keyword set; TRAIN gold is read only to WITNESS it (R1..R7).
//   code-name-rust: a treebank-like corpus: the manifest's rust TRAIN split. Names are counted per distinct REPOSITORY, never per file, so
//     near-duplicate files cannot inflate genericity. The reader (adapters/text/code-structure.js) has NO rust declaration recipe, so this
//     file DEFINES one (RECIPES below, two rows in the style of the existing ones) and proposes it as the reader's recipe, so that prior and
//     reader cannot drift once the edit is made; N1 checks it through the UNMODIFIED split builder, N7 through a PATCHED COPY of the reader.
//
// PRE-REGISTRATION (READING-POLICY II.5; this header was written BEFORE the first run of this file; thresholds are declared, never tuned, and
// every failure is reported as a failure).
//
// WHAT WAS SEEN BEFORE THIS HEADER (disclosed; nothing else was looked at):
//   (a) manifest.languages.rust: TRAIN = 240 rows in 5 repositories (all .rs): google/flatbuffers (Apache-2.0, 59 files), hoppscotch/hoppscotch
//       (MIT, 60), rtk-ai/rtk (Apache-2.0, 60), xai-org/x-algorithm (Apache-2.0, 60) and signalapp/libsignal (1 file, restricted = true: not on
//       the permitted licence list, excluded exactly as the python prior excludes cpython's Lib_typing.py). dev: 3 repos; test: 3 repos. No
//       dev or test file was opened, and no TRAIN file of any kind was opened or run through any reader before this header.
//   (b) rust_kw_giver.py was run once, unmodified (its header pre-registers K1..K9): hard = 36 words, soft = 24, builtins = 106 (17 primitive
//       types + 89 stable prelude names), stdlibModules = [alloc, core, proc_macro, std]; K1..K7 pass as predicted; K4 = 27 of 36 hard
//       words parse cleanly as a binding name in the grammar. The 12 reserved-but-not-grammar-token words are Self abstract become box do
//       final macro override priv typeof unsized virtual.
//   (c) gold.mjs on an AUTHORED snippet (model-written, in /private/tmp/claude-501/coding-competence/rust-priors/_authored_snippet.rs): defs
//       carry `node` (function_item, function_signature_item, struct_item, enum_item, union_item, trait_item, type_item, mod_item,
//       macro_definition, const_item, static_item); a raw-identifier function is named `r#match` (the `r#` is kept); `fn` in a trait is
//       a `method` def, a free fn a `function`, a struct/enum/union/type alias a `class`, a trait an `interface`; token texts keep the bang of
//       `macro_rules!`; `crate` is class `other`; fragment specifiers such as `expr` are class `keyword`.
//   (d) the code-structure.js / name-gate.js / edges.js loaders (read-only): all three are closed tables with no rust row.
//
// THE RECIPE (a proposal, two rows; ASCII-or-XID identifiers, with the raw-identifier prefix `r#` KEPT in the captured name so that a hard
// keyword spelled as a raw identifier is a different string and is never refused):
//   rust-fn    function  `fn NAME` with the item qualifiers in the Reference's order: pub(..)? default? const? async? (unsafe|safe)? extern "ABI"?
//   rust-type  class     `struct|enum|union|trait NAME` with pub(..)? and unsafe?
// Both are anchored at the line start (`^[ \t]*`), like every existing recipe. KNOWN LIMITS (stated, then measured as N3c/N5): type aliases,
// modules, macro_rules, consts and statics are not read; an item that does not start its line (`#[inline] fn f()`, a second item on one line)
// is not read; a line inside a raw string or block comment that starts like an item is a false positive.
//
// PREDICTIONS AND PASS RULES (an unmeasured or unlicensed check is "unlicensed"/"gap", never "pass"):
//   K1..K7, K9 (giver): rules in rust_kw_giver.py; observed in (b).
//   K8 control for the shared word rule (K1's analogue of javascript's K6). The giver's word rule (c0_grammar_keywords.py, run UNMODIFIED)
//      applied to the python, javascript, go, c, java and ruby grammars gives candidate sets whose symmetric difference with rust's hard set
//      is >= 10 for EVERY one of them. Pass: all six >= 10. Expected: pass (a rule that returned rust's list for any grammar would be broken).
//   N1 reference equivalence (the sum check). My tally of (name -> repos, files, kinds) equals, entry for entry, the output of the UNMODIFIED
//      scripts/build-code-name-prior-split.mjs run on a staged TRAIN-only tree, where the ONLY change is that a copy of the builder in the
//      output directory has the two recipe rows appended to its FAMILIES table (its own header: "adding a family is adding a row, never
//      touching the tally"; the original file is not edited); that builder's own blended-vs-split attestation check must also pass; and the
//      independent per-repository partition sums to the pooled attestation count. Pass: all exact. Expected: pass. FAILURE REFUSES THE WRITE.
//   N2 TRAIN purity. Every file read is a manifest rust TRAIN row with restricted=false whose bytes match its manifest sha256 and whose path is
//      under the fetched raw corpus; every repository has manifest.repos[repo].global_split == "train", is permissive and unrestricted, and
//      appears in no rust dev or test row; the repositories read equal info.repos.train minus restricted-only repositories. Pass: all exact.
//      Expected: pass (4 repositories, 239 files). FAILURE REFUSES THE WRITE.
//   N3 recipe validity against the grammar, over (name, repo) attestations. gold = the tree-sitter grammar's definition names of CORE kinds.
//      N3a precision = |regex AND gold| / |regex| >= 0.90. Expected 0.93 to 0.99 (the fn/struct/enum/union/trait shapes are regular; false
//          positives are lines inside raw strings or block comments).
//      N3b targeted recall = |regex AND gold_T| / |gold_T| >= 0.90, gold_T = gold CORE defs whose node is function_item,
//          function_signature_item, struct_item, enum_item, union_item or trait_item (the shapes the recipe claims). Expected 0.92 to 0.99.
//      N3c (informational, no pass rule) overall recall over every CORE def. PREDICTION: < 0.95, expected 0.75 to 0.92: type aliases
//          (a `class` in gold), modules and macro_rules are invisible to the recipe. Typed gap `aliases-modules-macros-not-tallied`.
//      CONTROL BUILT TO FAIL (II.23): the gold side is re-keyed with repository labels cyclically shifted by one. LICENCE: shifted precision
//          <= precision - 0.30 and shifted targeted recall <= recall - 0.30; otherwise N3a/N3b is "unlicensed".
//   N4 genericity is real, not an artefact of file counting (leave-one-REPOSITORY-out inside TRAIN, the only held-out available without
//      touching dev). For each TRAIN repo h, from the OTHER three: G = names declared in >= 2 of them, S = names declared in exactly 1. Hit =
//      the name is declared in h. lift = (hits_G / |G|) / (hits_S / |S|), pooled over the four folds. Pass: pooled lift >= 2.0 AND every
//      fold's lift > 1.0. CONTROL BUILT TO FAIL (II.23): each repository's declared-name set is replaced by an independent uniform random
//      subset of the pooled vocabulary of the same size, 200 seeded draws. LICENCE: the control's median pooled lift is in [0.5, 1.5] and the
//      real lift exceeds the control's MAXIMUM; otherwise "unlicensed". Expected: pass with a large lift (5 to 30): methods named new, fmt,
//      default, from, main, run recur across unrelated repositories. A "fail" is possible (about 15%: a very distinctive repository).
//   N5 (informational, no pass rule) recipe gaps. (i) declared names with a non-ASCII character; (ii) raw-identifier declarations (`r#..`)
//      and how many are spelled as a hard keyword; (iii) gold CORE definition pairs by node type that the recipe cannot read.
//   N6 sanity bound (NOT informed by any peek). distinct names in [500, 8000] and names attested in >= 2 repositories in [20, 600].
//   N7 prior/reader agreement. (i) The reader as it is (imported read-only) has no rust recipe: the number of TRAIN files for which
//      parseDeclarations returns a declaration is reported (expected 0) and loadCodeKeywordPrior("rust") / loadCodeNamePriorSplit("rust")
//      (expected null, null) are reported; verdict "gap", never "pass". (ii) A PATCHED COPY of the reader (the string edits of the proposed
//      patch, seven in the first run, applied to a copy in the output directory) serves both priors and, on every TRAIN file, returns the same set of names
//      as this file's recipe. Pass: equal on every file AND both priors served. Expected: pass. (iii) the patched reader with the hard set
//      refuses 0 declarations.
//   N8 (informational, no pass rule) the reader's declaration EXTENT. For every patched-reader declaration that has a gold definition at the
//      same name position, whether the reader's end equals the grammar's end. PREDICTION: a minority differ (bodyless trait signatures,
//      unit and tuple structs, braces in string or char literals: braceExtent has no `;` stop), expected 5% to 30%. It is the caveat of the
//      proposed patch, stated as a number.
//   R1 refusal polarity. Over every definition name the grammar gives in TRAIN (every kind): ZERO names are in the hard keyword set.
//      LICENCE (control built to fail): the random control (36 names drawn from the definition-name vocabulary, 200 seeded draws) has mean >= 1
//      AND at least one foreign-language control fires: the hard set of the javascript, python, java, go, c or ruby prior (whichever files
//      exist) >= 1 on the same defs (a `fn new` collides with javascript and java); otherwise R1 is "unlicensed". Expected: real 0.
//   R1r (informational) raw-identifier definitions (`r#type`): how many, and how many are spelled as a hard keyword. PREDICTION: small, and 0
//      is possible; if > 0 it supports the statement that the hard set refuses BARE names only.
//   R2 token coverage. Of TRAIN gold tokens classed `keyword` (a trailing `!` stripped from `macro_rules!`), the fraction whose text is in (hard
//      U soft) is >= 0.99. Control: the javascript keyword set (hard U soft of priors/code-kw-javascript.json) as the prior must cover at least
//      0.10 LESS (else unlicensed). Expected: pass; the texts outside the prior are listed.
//   R3 attestation. At least 30 of the 36 hard keywords occur in TRAIN as a structural token (gold class not comment, string or identifier).
//      Unattested words are listed (a typed gap: received but unwitnessed). Expected 31 to 35 attested; yield (reserved, unused) is the
//      near-certain gap, extern and `_` the candidates.
//   R4a no identifier collision, GRAMMAR positions. Using rust_witness.py (which splits open-class identifier leaves by context: grammar,
//      macro/attribute token space, lifetime): ZERO identifier leaves outside macro/attribute token space and lifetimes are spelled as a
//      hard keyword. LICENCE: the javascript hard set collides on the same leaves at least once (a `fn new`); otherwise unlicensed.
//      Expected: 0 (a few are possible where the grammar version lacks a syntax and the parse goes wrong; reported, never patched).
//   R4b (informational) token space: identifier leaves spelled as a hard keyword inside macro token trees, macro definitions and attributes.
//      PREDICTION: > 0 (tree-sitter lexes by parse state; token soup is not a binding position). R4c (informational) lifetimes: `'static`.
//   R5 (informational) shadowing. TRAIN CORE definitions whose name is a builtin (a primitive type or prelude name, e.g. Result, Option,
//      drop, test) or a soft keyword (e.g. default, union, path, block), with counts and examples. Prediction: > 0 (supports the polarity).
//   R6 (informational, with a prediction) the 12 reserved-but-not-grammar-token words: definitions spelled so, and identifier leaves in
//      grammar positions spelled so. PREDICTION: 0 and 0 (it would show that refusing them too is safe on TRAIN).
//   R7 (informational) the edition-conditional soft words (async await dyn try gen) and the weak words (default raw union macro_rules) as
//      identifier leaves in grammar positions, with counts: how often a soft word really names a being.
//   E1 (informational) consumer effect on this file's own declarations: names refused by the hard set (PREDICTION 0), by the javascript hard
//      set (PREDICTION >= 1: `new`), by the python hard set, and by the reserved-but-not-grammar-token words (PREDICTION 0).
//
// AMENDMENT (written AFTER the first run's results were seen; changes no verdict, no threshold, no prediction above). The first run gave
// R4a "fail" (187 identifier leaves in grammar positions spelled as a hard keyword, ALL the word `_`; the other 35 hard words 0), and
// predictions that turned out WRONG, which stand as wrong: N3a precision 0.995 and N3b targeted recall 1.000 (both above the predicted
// ranges; the rules were met); N3c overall recall 0.951 (predicted < 0.95, expected 0.75 to 0.92); N4 pooled lift 88.5 (predicted 5 to 30;
// the rule was met, control median 0.87, max 1.05); N8 reader/grammar extent disagreement 3.1% (predicted 5% to 30%: below the range); R6 not
// zero (predicted 0 and 0: the DEFINITIONS were 0 as predicted, but 642 identifier leaves are the word `Self`, which the grammar lexes as a
// type_identifier in every use, because it has no token for it). rust-priors-posthoc.py (labelled post_hoc) was then written to diagnose
// the `_` and `Self` leaves; if its card exists this file embeds a compact `postHoc` block in the keyword prior's provenance so the prior
// carries its own diagnosis, and nothing else changes. The re-run reproduces the first run's verdicts exactly (checked by comparing the two
// cards). The post hoc finding: all 187 `_` leaves are type-argument placeholders (`Vec<_>`, `f::<_>`: 186) or the `use x as _` alias (1), and
// 0 of the 187 (and 0 of the 642 `Self` leaves) is a declaring position; so R4a counted USES, not declarations. R4a stays a "fail" as
// pre-registered; the prior is not changed.
//
// LAWS APPLIED: causal (priors carry no whole-text statistic over a unit being judged; this file only counts); identity does not decay;
// priors refuse or nominate, never admit; capitalisation is not read anywhere (names are exact strings; a raw identifier keeps its `r#`);
// every threshold above is declared; gaps are typed with denominators; held-out discipline (TRAIN only; the leave-one-repo-out is a TRAIN-
// internal split by repository); no model is called anywhere.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { goldBatch, goldAvailable, GOLD_VERSION, CORE_DEF_KINDS } from "./gold.mjs";
import {
  verifyTrain, trainDigest, sha256, compareNameTables, namesObject, attestationTotal, loroLift, controlLifts, decideN4, recipeVsGold,
  fnv1a, mulberry32, sampleWithoutReplacement, NATIVE, MANIFEST,
} from "./build-python-priors.mjs";
import { shiftRepos, recallOf, decideN3 } from "./build-javascript-priors.mjs";
import { parseDeclarations, loadCodeKeywordPrior, loadCodeNamePriorSplit } from "../../adapters/text/code-structure.js";

export { sha256, trainDigest, verifyTrain, compareNameTables, namesObject, attestationTotal, loroLift, controlLifts, decideN4, recipeVsGold, shiftRepos, recallOf, decideN3, fnv1a, mulberry32, sampleWithoutReplacement, MANIFEST, NATIVE };

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_OUT = process.env.RUSTPRIORS_OUT || "/private/tmp/claude-501/coding-competence/rust-priors";
const PYTHON = process.env.GOLD_PYTHON || "/private/tmp/claude-501/venv/bin/python";
const TS_CACHE = process.env.GOLD_TS_CACHE || "/private/tmp/claude-501/coding-competence/ts-cache";
const LANGUAGE = "rust";

// declared constants (header)
export const CONSTS = Object.freeze({
  GENERIC_FLOOR: 2, LIFT_MIN: 2.0, LIFT_FOLD_MIN: 1.0, CONTROL_MEDIAN_LO: 0.5, CONTROL_MEDIAN_HI: 1.5, CONTROL_DRAWS: 200,
  PRECISION_MIN: 0.90, TARGET_RECALL_MIN: 0.90, N3_CONTROL_GAP: 0.30, K8_MIN_SYMDIFF: 10, R2_MIN: 0.99, R2_CONTROL_GAP: 0.10, R3_MIN_ATTESTED: 30,
  N6_NAMES: [500, 8000], N6_GENERIC: [20, 600], SEED: "rust-priors-v1",
});
export const TARGET_NODES = Object.freeze(["function_item", "function_signature_item", "struct_item", "enum_item", "union_item", "trait_item"]);
const FOREIGN = Object.freeze(["javascript", "python", "java", "go", "c", "ruby"]);

// ── the recipe: two rows (proposed; the reader has none) ──────────────────────────────────────────────────────────────────────────────
export const RECIPE_EXTS = Object.freeze([".rs"]);
const IDENT_SRC = String.raw`(?:r#)?[\p{XID_Start}_]\p{XID_Continue}*`;
export const RECIPES = Object.freeze([
  { lang: "rust-fn", source: String.raw`^[ \t]*(?:pub(?:\([^)\n]*\))?[ \t]+)?(?:default[ \t]+)?(?:const[ \t]+)?(?:async[ \t]+)?(?:(?:unsafe|safe)[ \t]+)?(?:extern[ \t]+(?:"[^"\n]*"[ \t]+)?)?fn[ \t]+(` + IDENT_SRC + String.raw`)`, flags: "gmu", kind: "function" },
  { lang: "rust-type", source: String.raw`^[ \t]*(?:pub(?:\([^)\n]*\))?[ \t]+)?(?:unsafe[ \t]+)?(?:struct|enum|union|trait)[ \t]+(` + IDENT_SRC + String.raw`)`, flags: "gmu", kind: "class" },
]);
export const IDENT_FULL = new RegExp(String.raw`^` + IDENT_SRC + String.raw`$`, "u");

export const extOf = (rel) => path.extname(rel).toLowerCase();
export const inRecipeFamily = (rel) => RECIPE_EXTS.includes(extOf(rel));

/** declarationsOf(text) -> [{name, kind}] (the recipe's own kind) */
export function declarationsOf(text) {
  const out = [];
  for (const r of RECIPES) {
    const re = new RegExp(r.source, r.flags);
    let m;
    while ((m = re.exec(text))) out.push({ name: m[1], kind: r.kind });
  }
  return out;
}

/**
 * tallyNames(files) -> { names: Map(name -> {repos:Set, files:Set, kinds:Set, n}), perRepo: Map(repo -> Set(name)), declarations, files }
 *   files: [{ repo, rel, text }]; only recipe-extension files are read (the split builder's own filter).
 */
export function tallyNames(files) {
  const names = new Map();
  const perRepo = new Map();
  let declarations = 0, nfiles = 0;
  for (const f of files) {
    if (!inRecipeFamily(f.rel)) continue;
    nfiles++;
    if (!perRepo.has(f.repo)) perRepo.set(f.repo, new Set());
    for (const d of declarationsOf(f.text)) {
      declarations++;
      let rec = names.get(d.name);
      if (!rec) { rec = { repos: new Set(), files: new Set(), kinds: new Set(), n: 0 }; names.set(d.name, rec); }
      rec.repos.add(f.repo); rec.files.add(`${f.repo}/${f.rel}`); rec.kinds.add(d.kind); rec.n++;
      perRepo.get(f.repo).add(d.name);
    }
  }
  return { names, perRepo, declarations, files: nfiles };
}

/** Independent per-repository partition: tally each repository on its own; the sum of their distinct-name counts must equal the pooled attestation count. */
export function partitionSum(files) {
  const byRepo = new Map();
  for (const f of files) { if (!byRepo.has(f.repo)) byRepo.set(f.repo, []); byRepo.get(f.repo).push(f); }
  let sum = 0;
  for (const fs_ of byRepo.values()) sum += tallyNames(fs_).names.size;
  return sum;
}

/** N5: names the recipe saw that carry a non-ASCII character, and raw-identifier names. */
export function nameGaps(names, hardSet) {
  const nonAscii = [], raw = [], rawHard = [];
  for (const n of names) {
    if (/[^\x00-\x7f]/.test(n)) nonAscii.push(n);
    if (n.startsWith("r#")) { raw.push(n); if (hardSet.has(n.slice(2))) rawHard.push(n); }
  }
  return { nonAscii: nonAscii.length, nonAsciiExamples: nonAscii.slice(0, 8), rawIdentifiers: raw.length, rawExamples: raw.slice(0, 8), rawSpelledAsHard: rawHard.length, rawHardExamples: rawHard.slice(0, 8) };
}

// ── N3 helpers (shiftRepos / recallOf / decideN3 are the javascript builder's, imported unchanged) ────────────────────────────────────
const mapToObj = (m) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
const sumOf = (m) => [...m.values()].reduce((a, r) => a + (typeof r === "number" ? r : r.n), 0);
const NON_STRUCTURAL = new Set(["comment", "string", "identifier"]);

/**
 * witnessGold({ hard, soft, builtins, reservedNotGrammar, controls, docs, seed, draws }) -> R1, R2, R3, R5, R6 (definitions) measurements.
 *   controls: { name: [words] } foreign hard sets; docs: [{ repo, rel, text, gold }]  gold = a gold.mjs result (no `error`)
 */
export function witnessGold({ hard, soft, builtins, reservedNotGrammar = [], controls = {}, controlCover = null, docs, seed = CONSTS.SEED, draws = CONSTS.CONTROL_DRAWS }) {
  const hardSet = new Set(hard), softSet = new Set(soft), prior = new Set([...hard, ...soft]);
  const builtinSet = new Set((builtins || []).filter((b) => !hardSet.has(b)));
  const rngSet = new Set(reservedNotGrammar);
  const kwTokens = new Map();
  const attest = new Map(hard.map((w) => [w, 0]));
  const declared = new Map();
  const nodeKinds = new Map();
  const coreShadow = { builtin: new Map(), soft: new Map() };
  let nTokens = 0, nDefs = 0, nCoreDefs = 0, rawDefs = 0;
  const rawHardDefs = new Map();
  for (const d of docs) {
    const g = d.gold;
    for (const t of g.tokens) {
      nTokens++;
      const cls = t.class;
      if (cls === "comment" || cls === "string") continue;
      const txt = d.text.slice(t.start, t.end);
      if (cls === "keyword") { const k = txt.endsWith("!") ? txt.slice(0, -1) : txt; kwTokens.set(k, (kwTokens.get(k) || 0) + 1); }
      if (hardSet.has(txt) && !NON_STRUCTURAL.has(cls)) attest.set(txt, attest.get(txt) + 1);
    }
    for (const df of g.defs) {
      nDefs++;
      declared.set(df.name, (declared.get(df.name) || 0) + 1);
      nodeKinds.set(df.node, (nodeKinds.get(df.node) || 0) + 1);
      if (df.name.startsWith("r#")) { rawDefs++; if (hardSet.has(df.name.slice(2))) rawHardDefs.set(df.name, (rawHardDefs.get(df.name) || 0) + 1); }
      if (CORE_DEF_KINDS.includes(df.kind)) {
        nCoreDefs++;
        if (builtinSet.has(df.name)) coreShadow.builtin.set(df.name, (coreShadow.builtin.get(df.name) || 0) + 1);
        if (softSet.has(df.name)) coreShadow.soft.set(df.name, (coreShadow.soft.get(df.name) || 0) + 1);
      }
    }
  }
  const violations = (set) => { let n = 0; const ex = []; for (const [name, c] of declared) if (set.has(name)) { n += c; if (ex.length < 8) ex.push(name); } return { n, examples: ex }; };
  const real = violations(hardSet);
  const ctl = Object.fromEntries(Object.entries(controls).map(([k, words]) => { const v = violations(new Set(words.filter((w) => !hardSet.has(w)))); return [k, v]; }));
  const vocab = [...declared.keys()].sort();
  const rng = mulberry32(fnv1a(`${seed}|r1-control`));
  let sum = 0;
  for (let d = 0; d < draws; d++) { const pick = new Set(sampleWithoutReplacement(vocab, hard.length, rng)); sum += violations(pick).n; }
  const randMean = draws ? sum / draws : null;

  let kwTotal = 0, kwIn = 0, kwInCtl = 0;
  const coverSet = new Set(controlCover || []);
  const outside = [];
  for (const [txt, n] of kwTokens) { kwTotal += n; if (prior.has(txt)) kwIn += n; else outside.push([txt, n]); if (coverSet.has(txt)) kwInCtl += n; }
  outside.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const unattested = [...attest].filter(([, n]) => n === 0).map(([w]) => w);
  const rngDefs = violations(rngSet);
  return {
    nTokens, nDefs, nCoreDefs, files: docs.length, defNodes: mapToObj(nodeKinds),
    R1: { hardViolations: real.n, violationExamples: real.examples, denominatorDefs: nDefs, controlViolations: Object.fromEntries(Object.entries(ctl).map(([k, v]) => [k, v.n])), controlExamples: Object.fromEntries(Object.entries(ctl).map(([k, v]) => [k, v.examples])), randomControlMean: randMean, randomControlDraws: draws },
    R1r: { rawIdentifierDefs: rawDefs, spelledAsHard: sumOf(rawHardDefs), byName: mapToObj(rawHardDefs) },
    R2: { keywordTokens: kwTotal, inPrior: kwIn, coverage: kwTotal ? kwIn / kwTotal : null, controlCoverage: controlCover ? (kwTotal ? kwInCtl / kwTotal : null) : null, outsidePrior: outside.slice(0, 25), distinctOutside: outside.length },
    R3: { hardWords: hard.length, attested: hard.length - unattested.length, unattested, counts: mapToObj(attest) },
    R5: { builtinShadowingDefs: sumOf(coreShadow.builtin), builtinShadowNames: mapToObj(coreShadow.builtin), softShadowingDefs: sumOf(coreShadow.soft), softShadowNames: mapToObj(coreShadow.soft), denominatorCoreDefs: nCoreDefs },
    R6defs: { reservedNotGrammarDefs: rngDefs.n, examples: rngDefs.examples },
  };
}

/** witnessContext(h, controls) -> R4a/R4b/R4c, R6 identifier leaves, R7 from rust_witness.py's output h */
export function witnessContext(h) {
  const tot = (obj, ctx) => Object.values(obj || {}).reduce((a, c) => a + (c[ctx] || 0), 0);
  const words = (obj, ctx) => Object.fromEntries(Object.entries(obj || {}).filter(([, c]) => c[ctx]).map(([w, c]) => [w, c[ctx]]).sort((a, b) => b[1] - a[1]));
  const ctlGrammar = Object.fromEntries(Object.entries(h.controls || {}).map(([k, v]) => [k, v.byContext?.grammar ?? 0]));
  return {
    files: h.files, openIdentifierLeaves: h.openIdentifierLeaves, filesWithParseError: h.filesWithParseError,
    R4a: { grammarCollisions: tot(h.hardAsIdentifier, "grammar"), words: words(h.hardAsIdentifier, "grammar"), controlCollisions: ctlGrammar, examples: Object.fromEntries(Object.entries(h.examples || {}).filter(([k]) => k.endsWith("|grammar") && h.hardAsIdentifier?.[k.split("|")[0]]).slice(0, 12)) },
    R4b: { tokenSpaceCollisions: tot(h.hardAsIdentifier, "token"), words: words(h.hardAsIdentifier, "token") },
    R4c: { lifetimeCollisions: tot(h.hardAsIdentifier, "lifetime"), words: words(h.hardAsIdentifier, "lifetime") },
    R6leaves: { grammarLeaves: tot(h.reservedNotGrammarAsIdentifier, "grammar"), words: words(h.reservedNotGrammarAsIdentifier, "grammar"), tokenSpaceLeaves: tot(h.reservedNotGrammarAsIdentifier, "token") },
    R7: { grammarLeaves: tot(h.softAsIdentifier, "grammar"), words: words(h.softAsIdentifier, "grammar"), tokenSpaceLeaves: tot(h.softAsIdentifier, "token") },
    rawIdentifiers: h.rawIdentifiers, hardAsOwnTokenGrammar: Object.fromEntries(Object.entries(h.hardAsOwnToken || {}).filter(([, c]) => c.grammar).map(([w, c]) => [w, c.grammar]).sort((a, b) => b[1] - a[1])),
  };
}

export function decideR(w, c, C = CONSTS) {
  const anyCtl = Object.values(w.R1.controlViolations).some((n) => n >= 1);
  const r1Lic = w.R1.randomControlMean != null && w.R1.randomControlMean >= 1 && anyCtl;
  const r2Lic = w.R2.coverage != null && w.R2.controlCoverage != null && w.R2.controlCoverage <= w.R2.coverage - C.R2_CONTROL_GAP;
  const r4Lic = c ? Object.values(c.R4a.controlCollisions).some((n) => n >= 1) : false;
  return {
    R1: !r1Lic ? "unlicensed" : w.R1.hardViolations === 0 ? "pass" : "fail",
    R1r: w.R1r.spelledAsHard > 0 ? "informational:bare-names-only-supported" : "informational:no-raw-hard-definition-seen",
    R2: !r2Lic ? "unlicensed" : w.R2.coverage >= C.R2_MIN ? "pass" : "fail",
    R3: w.R3.attested >= C.R3_MIN_ATTESTED ? "pass" : "fail",
    R4a: !c ? "gap" : !r4Lic ? "unlicensed" : c.R4a.grammarCollisions === 0 ? "pass" : "fail",
    R4b: !c ? "gap" : c.R4b.tokenSpaceCollisions > 0 ? "informational:token-space-limit-observed" : "informational:no-token-space-collision-seen",
    R4c: !c ? "gap" : c.R4c.lifetimeCollisions > 0 ? "informational:lifetimes-observed" : "informational:no-lifetime-seen",
    R5: w.R5.softShadowingDefs + w.R5.builtinShadowingDefs > 0 ? "informational:supports-polarity" : "informational:no-shadowing-seen",
    R6: w.R6defs.reservedNotGrammarDefs === 0 && (!c || c.R6leaves.grammarLeaves === 0) ? "informational:as-predicted-zero" : "informational:not-zero",
    R7: !c ? "gap" : c.R7.grammarLeaves > 0 ? "informational:soft-words-name-beings" : "informational:no-soft-word-naming-seen",
  };
}

// ── the staged reference builder (N1) and the patched reader (N7) ─────────────────────────────────────────────────────────────────────
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status}): ${(r.stderr || r.stdout || "").slice(-600)}`);
  return r;
}
const sym = (a, b) => [...new Set([...a, ...b])].filter((x) => a.includes(x) !== b.includes(x)).sort();

/** a copy of scripts/build-code-name-prior-split.mjs whose FAMILIES table has the two rust rows appended: the only change */
export function stageReferenceBuilder(src) {
  const rows = RECIPES.map((r) => `  { family: "rust", exts: [".rs"], re: new RegExp(${JSON.stringify(r.source)}, ${JSON.stringify(r.flags)}), kind: ${JSON.stringify(r.kind)} },`).join("\n");
  const anchor = "\n];\n\nconst sha256";
  if (!src.includes(anchor)) throw new Error("the split builder's FAMILIES table anchor is not where this builder expects it");
  return src.replace(anchor, `\n${rows}${anchor}`);
}

/** the five string edits of the proposed code-structure.js patch; returns { src, applied:[...], missing:[...] } */
export function patchReader(src) {
  const rows = RECIPES.map((r) => `  { lang: ${JSON.stringify(r.lang)}, exts: [".rs"], re: /${r.source}/${r.flags}, kind: ${JSON.stringify(r.kind)}, ident: IDENT_RS },`).join("\n");
  const edits = [
    { id: "kw-file", from: `const CODE_KW_FILE = Object.freeze({ py: "code-kw-py.json", js: "code-kw-js.json" });`, to: `const CODE_KW_FILE = Object.freeze({ py: "code-kw-py.json", js: "code-kw-js.json", rust: "code-kw-rust.json" });` },
    { id: "kw-lang", from: `const CODE_KW_LANG = Object.freeze({ python: "py", py: "py", javascript: "js", js: "js" });`, to: `const CODE_KW_LANG = Object.freeze({ python: "py", py: "py", javascript: "js", js: "js", rust: "rust", rs: "rust" });` },
    { id: "name-file", from: `js: "code-name-js.json" });`, to: `js: "code-name-js.json", rust: "code-name-rust.json" });` },
    { id: "name-splits", from: `js: loadCodeNamePriorSplit("js") };`, to: `js: loadCodeNamePriorSplit("js"), rust: loadCodeNamePriorSplit("rust") };` },
    { id: "ident", from: "const IDENT_XID_PY = /^[\\p{ID_Start}_][\\p{ID_Continue}]*$/u;", to: "const IDENT_XID_PY = /^[\\p{ID_Start}_][\\p{ID_Continue}]*$/u;\n// rust: XID identifiers (UAX #31 as the Reference states), the raw-identifier prefix `r#` kept in the name\nconst IDENT_RS = /^(?:r#)?[\\p{XID_Start}_]\\p{XID_Continue}*$/u;" },
    { id: "recipes", from: `  { lang: "js-const-arrow"`, to: `  // rust (priors/code-name-rust.json, eval/coding-competence/build-rust-priors.mjs RECIPES): fn items and struct/enum/union/trait items\n${rows}\n  { lang: "js-const-arrow"` },
    { id: "family", from: `    if (recipe.lang.startsWith("js")) return "js";`, to: `    if (recipe.lang.startsWith("js")) return "js";\n    if (recipe.lang.startsWith("rust")) return "rust";` },
  ];
  let out = src;
  const applied = [], missing = [];
  for (const e of edits) {
    if (!out.includes(e.from)) { missing.push(e.id); continue; }
    if (out.split(e.from).length !== 2) { missing.push(e.id + ":not-unique"); continue; }
    out = out.replace(e.from, () => e.to);
    applied.push(e.id);
  }
  return { src: out, applied, missing };
}

async function main() {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const OUT = opt("--out", DEFAULT_OUT);
  const PRIORS = opt("--priors", path.join(NATIVE, "priors"));
  const writePriors = !argv.includes("--no-write-priors");
  fs.mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const card = { schema: "RustPriorsCard@1", language: LANGUAGE, split: "train", builtAt: new Date().toISOString(), goldVersion: GOLD_VERSION, consts: CONSTS, checks: {}, verdicts: {}, gaps: [] };
  const cardPath = path.join(OUT, "card-rust-priors-train.json");
  const refuse = (why) => { card.refused = why; fs.writeFileSync(cardPath, JSON.stringify(card, null, 1)); console.error(`REFUSED: ${why}`); process.exit(1); };

  // ── N2 TRAIN purity ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const tv = verifyTrain(manifest, LANGUAGE);
  card.checks.N2 = { rows: tv.rows.length, repos: tv.repos, excludedRestricted: tv.restricted.map((r) => ({ repo: r.repo, rel: r.rel, license: manifest.repos[r.repo]?.license })), onlyRestrictedRepos: tv.onlyRestricted, problems: tv.problems };
  card.verdicts.N2 = tv.problems.length ? "fail" : "pass";
  if (tv.problems.length) refuse(`N2 TRAIN purity failed: ${tv.problems.slice(0, 3).join("; ")}`);
  const files = tv.rows.map((r) => ({ repo: r.repo, rel: r.rel, text: fs.readFileSync(r.path, "utf8"), bytes: r.bytes, row: r, abs: r.path }));
  const digest = trainDigest(tv.rows);

  // ── the keyword giver and projection ────────────────────────────────────────────────────────────────────────────────────────────
  const lawPath = path.join(OUT, "rust-law-prior.json");
  const giverOut = run(PYTHON, [path.join(HERE, "rust_kw_giver.py"), lawPath]).stdout.trim().split("\n").pop();
  const law = JSON.parse(fs.readFileSync(lawPath, "utf8"));
  const kwTmp = path.join(OUT, "code-kw-rust.builder-output.json");
  run(process.execPath, [path.join(NATIVE, "scripts/build-code-keyword-prior.mjs"), lawPath, kwTmp, LANGUAGE]);
  const kw = JSON.parse(fs.readFileSync(kwTmp, "utf8"));
  const hard = kw.keywords, soft = kw.softKeywords, builtins = kw.builtins;
  const dv = law.derivation;
  const rngWords = dv.reservedButNotGrammarToken;
  card.checks.K = { giverRun: JSON.parse(giverOut), K1: dv.checks.K1, K2: { pass: dv.checks.K2.pass, soft: dv.checks.K2.soft, softAsPredicted: dv.checks.K2.softAsPredicted }, K3: dv.checks.K3, K4: dv.checks.K4, K5: dv.checks.K5, K6: dv.checks.K6, K7: dv.checks.K7, K9: dv.checks.K9 };
  card.verdicts.K1 = dv.checks.K1.pass ? "pass" : "fail"; card.verdicts.K2 = dv.checks.K2.pass ? "pass" : "fail"; card.verdicts.K3 = dv.checks.K3.pass ? "pass" : "fail";
  card.verdicts.K4 = dv.checks.K4.prediction_ge_20_held ? "pass" : "fail"; card.verdicts.K5 = dv.checks.K5.pass ? "pass" : (dv.checks.K5.licensed ? "fail" : "unlicensed");
  card.verdicts.K6 = dv.checks.K6.pass ? "pass" : "fail"; card.verdicts.K7 = dv.checks.K7.pass ? "pass" : "fail";

  // K8: the same word rule on other grammars must NOT return rust's list (control for the shared rule)
  const ctlOut = path.join(OUT, "grammar-keywords-controls.json");
  const ctlLangs = ["python", "javascript", "go", "c", "java", "ruby"];
  run(PYTHON, [path.join(HERE, "c0_grammar_keywords.py"), ctlOut, ...ctlLangs]);
  const ctl = JSON.parse(fs.readFileSync(ctlOut, "utf8")).languages;
  card.checks.K8 = Object.fromEntries(ctlLangs.map((l) => [l, { candidates: ctl[l]?.keywords?.length ?? null, symmetricDifferenceWithRustHard: ctl[l]?.keywords ? sym(hard, ctl[l].keywords).length : null, error: ctl[l]?.error ?? null }]));
  card.verdicts.K8 = ctlLangs.every((l) => (card.checks.K8[l].symmetricDifferenceWithRustHard ?? -1) >= CONSTS.K8_MIN_SYMDIFF) ? "pass" : "fail";

  // foreign keyword priors as controls (whichever exist); their sha256 is recorded because other workflows may rebuild them
  const controlSets = {}, controlMeta = {};
  for (const l of FOREIGN) {
    const p = path.join(NATIVE, "priors", `code-kw-${l}.json`);
    if (!fs.existsSync(p)) { controlMeta[l] = { file: `priors/code-kw-${l}.json`, present: false }; continue; }
    const b = fs.readFileSync(p); const j = JSON.parse(b.toString("utf8"));
    controlSets[l] = { hard: j.keywords || [], soft: j.softKeywords || [] };
    controlMeta[l] = { file: `priors/code-kw-${l}.json`, present: true, sha256: sha256(b), hard: (j.keywords || []).length, soft: (j.softKeywords || []).length };
  }
  card.checks.controlSets = controlMeta;

  // ── N1 sum check (reference equivalence) ──────────────────────────────────────────────────────────────────────────────────────────
  const tally = tallyNames(files);
  const mine = namesObject(tally.names);
  const refDir = path.join(OUT, "ref-builder"), tree = path.join(OUT, "train-tree"), refOut = path.join(OUT, "ref-split");
  fs.rmSync(refDir, { recursive: true, force: true }); fs.rmSync(tree, { recursive: true, force: true }); fs.rmSync(refOut, { recursive: true, force: true });
  fs.mkdirSync(refDir, { recursive: true });
  const origBuilder = fs.readFileSync(path.join(NATIVE, "scripts/build-code-name-prior-split.mjs"), "utf8");
  fs.writeFileSync(path.join(refDir, "build-code-name-prior-split.rust-row.mjs"), stageReferenceBuilder(origBuilder));
  for (const f of files) {
    const dest = path.join(tree, f.repo.replace("/", "_"), f.rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, f.text);
  }
  const refRun = run(process.execPath, [path.join(refDir, "build-code-name-prior-split.rust-row.mjs"), tree, refOut]);
  const ref = JSON.parse(fs.readFileSync(path.join(refOut, "code-name-rust.json"), "utf8"));
  const cmp = compareNameTables(mine, ref.names);
  const partition = partitionSum(files);
  const attest = attestationTotal(tally.names);
  const sumLine = refRun.stderr.split("\n").find((l) => l.startsWith("sum check")) || null;
  card.checks.N1 = {
    referenceBuilder: "scripts/build-code-name-prior-split.mjs, a copy whose FAMILIES table has the two rust rows appended (the original is not edited), on a TRAIN-only staged copy of all files", referenceLog: refRun.stderr.trim().split("\n").slice(-3), referenceSumCheck: sumLine, compare: cmp,
    countsMatch: ref.counts.distinctNames === tally.names.size && ref.counts.totalDeclarations === tally.declarations && ref.counts.files === tally.files && ref.counts.repos === tally.perRepo.size,
    referenceCounts: ref.counts, recipeFiles: tally.files, trainFilesStaged: files.length, partitionSum: partition, pooledAttestations: attest,
  };
  card.verdicts.N1 = cmp.equal && card.checks.N1.countsMatch && partition === attest && Boolean(sumLine) ? "pass" : "fail";
  if (card.verdicts.N1 !== "pass") refuse("N1 sum check failed: my tally differs from the reference split builder or the per-repo partition");

  // ── N4 genericity (leave-one-repository-out, with the control built to fail) ──────────────────────────────────────────────────────
  const real = loroLift(tally.perRepo);
  const control = controlLifts(tally.perRepo, CONSTS.CONTROL_DRAWS, CONSTS.SEED);
  const floor3 = loroLift(tally.perRepo, 3);
  card.checks.N4 = { real, control, informationalFloor3: floor3.pooled };
  card.verdicts.N4 = decideN4(real, control, CONSTS);

  // ── N5/N6 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const generic = [...tally.names.values()].filter((r) => r.repos.size >= CONSTS.GENERIC_FLOOR).length;
  const gaps = nameGaps(tally.names.keys(), new Set(hard));
  card.checks.N5 = { ...gaps };
  card.checks.N6 = { distinctNames: tally.names.size, namesAtOrAboveFloor: generic, boundsNames: CONSTS.N6_NAMES, boundsGeneric: CONSTS.N6_GENERIC };
  card.verdicts.N6 = tally.names.size >= CONSTS.N6_NAMES[0] && tally.names.size <= CONSTS.N6_NAMES[1] && generic >= CONSTS.N6_GENERIC[0] && generic <= CONSTS.N6_GENERIC[1] ? "pass" : "fail";
  const topNames = [...tally.names.entries()].sort((a, b) => b[1].repos.size - a[1].repos.size || b[1].n - a[1].n).slice(0, 25).map(([n, r]) => `${n}(${r.repos.size}r,${r.n})`);
  card.checks.N6.topGeneric = topNames;

  // ── the two priors as objects (needed by the patched-reader check) ────────────────────────────────────────────────────────────────
  const trainRepos = tv.repos.map((r) => ({ repo: r, url: manifest.repos[r].url, commit: manifest.repos[r].commit, license: manifest.repos[r].license, fetched_at: manifest.repos[r].fetched_at, files: files.filter((f) => f.repo === r).length }));
  const libPath = path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/libs/libtree_sitter_rust.dylib");
  const libSha = fs.existsSync(libPath) ? sha256(fs.readFileSync(libPath)) : null;
  const bundleDir = path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/bundles");
  const bundle = fs.existsSync(bundleDir) ? fs.readdirSync(bundleDir).find((x) => x.startsWith("macos-arm64-")) : null;
  const g = dv.grammar;
  const ga = goldAvailable();

  // ── N7 prior/reader agreement: the reader as it is, then a patched COPY ───────────────────────────────────────────────────────────
  const unpatched = { keywordPrior: loadCodeKeywordPrior("rust"), nameSplit: loadCodeNamePriorSplit("rust"), filesWithDeclarations: 0, declarations: 0 };
  for (const f of files) { const n = parseDeclarations(f.text, f.rel).length; if (n) unpatched.filesWithDeclarations++; unpatched.declarations += n; }
  const origReader = fs.readFileSync(path.join(NATIVE, "adapters/text/code-structure.js"), "utf8");
  const pr = patchReader(origReader);
  const patchedRoot = path.join(OUT, "patched");
  fs.rmSync(patchedRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(patchedRoot, "adapters/text"), { recursive: true }); fs.mkdirSync(path.join(patchedRoot, "priors"), { recursive: true });
  const patchedPath = path.join(patchedRoot, "adapters/text/code-structure.js");
  fs.writeFileSync(patchedPath, pr.src);
  const diff = spawnSync("diff", ["-u", "--label", "a/native/adapters/text/code-structure.js", "--label", "b/native/adapters/text/code-structure.js", path.join(NATIVE, "adapters/text/code-structure.js"), patchedPath], { encoding: "utf8" });
  const patchFile = path.join(OUT, "code-structure.rust.patch");
  fs.writeFileSync(patchFile, diff.stdout);
  card.checks.N7 = { reader: { servesKeywordPrior: Boolean(unpatched.keywordPrior), servesNameSplit: Boolean(unpatched.nameSplit), trainFilesWithAnyDeclaration: unpatched.filesWithDeclarations, declarations: unpatched.declarations, of: files.length }, patch: { file: patchFile, applied: pr.applied, missingAnchors: pr.missing } };
  const nameOut = {
    schema: "CodeNamePrior@1",
    language: LANGUAGE,
    provenance: {
      giver: `per-language TRAIN-only measurement of the CodeNamePrior@1: the manifest's rust TRAIN split (a treebank-like corpus of ${tv.repos.length} permissively licensed repositories); the declaration recipe is the two-row rust family defined in eval/coding-competence/build-rust-priors.mjs (the reader had none), sum-checked entry for entry against the unmodified split builder with the two rows appended to its FAMILIES table (${attest} (name, repo) attestations) and against an independent per-repository partition`,
      split: "train", family: "rust", manifest: MANIFEST, manifestGeneratedAt: manifest.generated_at, splitRule: manifest.declared.split_rule,
      trainRepos: tv.repos, trainRepoFiles: Object.fromEntries(trainRepos.map((r) => [r.repo, r.files])), trainRepoDetails: trainRepos, trainFiles: files.length, trainFilesDigestSha256: digest,
      recipeFiles: tally.files,
      filesExcluded: { restricted_licence: tv.restricted.map((r) => ({ repo: r.repo, rel: r.rel, license: manifest.repos[r.repo]?.license })) },
      recipe: { rows: RECIPES.map((r) => ({ lang: r.lang, source: r.source, flags: r.flags, kind: r.kind })), exts: RECIPE_EXTS, note: "unicode XID identifiers; the raw-identifier prefix `r#` is kept in the name (a hard keyword spelled `r#match` is a different string); fn items (free, associated, trait signatures) and struct/enum/union/trait items; no type aliases, modules, macro_rules, consts or statics; items that do not start their line are not read" },
      builder: "eval/coding-competence/build-rust-priors.mjs", builtOn: new Date().toISOString().slice(0, 10),
      sumCheck: { reference: "scripts/build-code-name-prior-split.mjs, copy with the rust rows appended", entryForEntryEqual: cmp.equal, entries: cmp.entries, referenceSumCheckLine: sumLine, perRepoPartitionSum: partition, pooledAttestations: attest },
      validity: "see the card checks N3 and N7 (filled below when the grammar gold is available)",
      genericityVsHeldOutRepo: { design: "leave-one-repository-out inside TRAIN; names declared in >=2 of the other repos vs exactly 1, hit = declared in the held-out repo", pooledLift: real.pooled.lift, rateG: real.pooled.rateG, rateS: real.pooled.rateS, controlMedianLift: control.median, controlMaxLift: control.max, verdict: card.verdicts.N4 },
      gaps: [
        { gap: "aliases-modules-macros-not-tallied", note: "type aliases, modules, macro_rules, consts and statics are not read by the recipe (see validity.recipeVsGrammar.overallRecall)" },
        { gap: "reader-has-no-rust-recipe", note: "adapters/text/code-structure.js has no .rs recipe and no rust row in its loaders: this prior is served only after the proposed edit (eval output code-structure.rust.patch)" },
        { gap: "four-train-repos", note: `genericity at floor ${CONSTS.GENERIC_FLOOR} rests on ${tv.repos.length} repositories; a name is generic here only if it recurs in 2 of ${tv.repos.length}` },
      ],
      note: "genericity is a fact about this language's own codebases: repos counts only the TRAIN repositories attesting the name through this recipe. The prior counts what the recipe declares, false positives included; it is not a list of real functions (see validity). A name never attested is admitted (null from genericityOf), never refused. Methods count: `fn new` in an impl block is a declaration of `new`, as in the python prior's `def`.",
    },
    counts: { files: tally.files, repos: tv.repos.length, totalBytes: files.filter((f) => inRecipeFamily(f.rel)).reduce((a, f) => a + f.bytes, 0), distinctNames: tally.names.size, totalDeclarations: tally.declarations, namesAtOrAboveGenericFloor: generic },
    names: mine,
    builtAt: new Date().toISOString(),
  };
  // the post-hoc diagnosis (rust-priors-posthoc.py), embedded when its card exists; labelled post_hoc, never evidence for a pre-registered check
  const postHocBlock = () => {
    try {
      const ph = JSON.parse(fs.readFileSync(path.join(OUT, "card-rust-priors-posthoc.json"), "utf8"));
      const pick = (o) => ({ leaves: o.leaves, declaringPositions: o.declaring, byParent: o.byParent });
      return { post_hoc: true, writtenAfter: ph.writtenAfter, script: "eval/coding-competence/rust-priors-posthoc.py", files: ph.files, underscore: pick(ph._), Self: pick(ph.Self), note: "R4a counted identifier-typed leaves spelled `_` (type-argument placeholders and `use .. as _`): uses, never declarations; `Self` is lexed as a type_identifier by the grammar in every use and is declared by nothing. Nothing in the prior changed because of this." };
    } catch { return null; }
  };
  // the keyword prior object (the witness blocks are filled after the gold-dependent checks below)
  const kwOut = {
    ...kw,
    provenance: {
      ...kw.provenance,
      giver: law.giver.resource,
      grammar: {
        name: "tree-sitter-rust (the `rust` grammar of the language pack)", language: "rust", package: g.package, packageVersion: g.packageVersion, packageLicense: g.packageLicense, packageSource: g.packageSource,
        upstream: g.upstream, upstreamLicense: g.upstreamLicense, upstreamCommit: g.upstreamCommit, upstreamCommitNote: g.upstreamCommitNote,
        abi: g.abi, nodeKindCount: g.nodeKindCount, nodeKindFingerprintSha256: g.nodeKindFingerprintSha256, compiledLibrary: "libtree_sitter_rust.dylib", compiledLibrarySha256: libSha,
        releaseBundle: bundle, releaseUrl: "https://github.com/xberg-io/tree-sitter-language-pack/releases/download/v1.21.0/parsers-macos-arm64.tar.zst",
        anonymousWordKinds: g.anonymousWordKinds, bangTokens: g.bangTokens, underscoreToken: g.underscoreToken, dedicatedTerminals: g.dedicatedTerminals, rule: g.rule, highlightsScm: g.highlightsScm,
      },
      engine: law.giver.engine,
      authorities: {
        reference: { source: "The Rust Reference, src/keywords.md and src/identifiers.md", repo: "rust-lang/reference", commit: dv.authorities.reference.files["reference-keywords.md"].commit, commit_date: dv.authorities.reference.files["reference-keywords.md"].commit_date, url: dv.authorities.reference.files["reference-keywords.md"].url, sha256: dv.authorities.reference.files["reference-keywords.md"].sha256, licence: "MIT OR Apache-2.0" },
        rustc: { source: "compiler/rustc_span/src/symbol.rs (symbols! Keywords block, is_* predicates, can_be_raw, STDLIB_STABLE_CRATES, Symbols vocabulary)", repo: "rust-lang/rust", commit: dv.authorities.rustc.file.commit, commit_date: dv.authorities.rustc.file.commit_date, url: dv.authorities.rustc.file.url, sha256: dv.authorities.rustc.file.sha256, licence: "MIT OR Apache-2.0" },
        prelude: Object.fromEntries(Object.entries(dv.authorities.preludeFiles).map(([k, v]) => [k, { url: v.url, commit: v.commit, sha256: v.sha256 }])),
        fetchedAt: dv.authorities.fetchedAt, provenanceNote: dv.authorities.sourcesProvenance,
      },
      derivation: {
        script: "eval/coding-competence/rust_kw_giver.py", projection: "scripts/build-code-keyword-prior.mjs (unmodified)",
        reservedInEveryEdition: dv.reservedInEveryEdition, editionConditional: dv.editionConditional, hardSources: dv.hardSources, softSources: dv.softSources, macroFragmentSpecifiers: dv.macroFragmentSpecifiers,
        reservedButNotGrammarToken: dv.reservedButNotGrammarToken, reservedButNotGrammarTokenNote: dv.reservedButNotGrammarTokenNote,
        primitiveTypes: dv.primitiveTypes, preludeNames: dv.preludeNames, preludeUnstableSkipped: dv.preludeUnstableSkipped, builtinsNote: dv.builtinsNote, stdlibModules: dv.stdlibModules, bindingOnly: dv.bindingOnly,
        checks: Object.fromEntries(["K1", "K2", "K3", "K4", "K5", "K6", "K7", "K8"].map((k) => [k, card.verdicts[k]])),
      },
      assembledBy: "eval/coding-competence/build-rust-priors.mjs (adds the grammar, authority, derivation and TRAIN-witness provenance to the unmodified builder's output; the keyword lists are the builder's, untouched)",
      noCorpusRead: "the keyword set is derived from the grammar and the two authorities only; no corpus file is read to derive it",
      postHoc: postHocBlock(),
      polarity: "hard keywords refuse BARE names only: the raw identifier `r#match` (one identifier whose text keeps `r#`) legally names a being, for every hard word except `_`, `crate`, `self`, `super`; soft keywords (async await dyn try gen: reserved only from an edition on; default macro_rules raw union: weak; block expr ident item lifetime literal meta pat pat_param path stmt tt ty vis expr_2021: macro fragment specifiers) and builtins (primitive types and the stable prelude) are recorded and NEVER refuse",
      builtAt: new Date().toISOString().slice(0, 10),
    },
    refusalScope: {
      note: "hard refuses the bare word in a grammar position; token-space (macro token trees, attributes) and lifetimes are not binding positions; the raw identifier escape is legal",
      rawIdentifierEscape: true, cannotBeRaw: dv.refusalScope.cannotBeRaw, editionConditional: dv.refusalScope.editionConditional,
      reservedButNotGrammarToken: dv.reservedButNotGrammarToken,
      reservedButNotGrammarTokenNote: "settled by both authorities (the Reference and rustc) but not tokens of the grammar, so not in `keywords`; a consumer MAY refuse them as bare names too (measured on TRAIN: R6)",
    },
  };

  // patched reader (N7 ii, iii) and extents (N8): needs both priors on disk beside the patched copy
  fs.writeFileSync(path.join(patchedRoot, "priors/code-kw-rust.json"), JSON.stringify(kwOut));
  fs.writeFileSync(path.join(patchedRoot, "priors/code-name-rust.json"), JSON.stringify(nameOut));
  let patched = null;
  if (!pr.missing.length) {
    patched = await import(pathToFileURL(patchedPath).href);
    const pk = patched.loadCodeKeywordPrior("rust"), pn = patched.loadCodeNamePriorSplit("rust");
    let diffFiles = 0, decls = 0, refused = 0, mineDecls = 0; const ex = [];
    for (const f of files) {
      const a = patched.parseDeclarations(f.text, f.rel).map((d) => d.name), b = declarationsOf(f.text).map((d) => d.name);
      decls += a.length; mineDecls += b.length;
      if ([...new Set(a)].sort().join("\u0001") !== [...new Set(b)].sort().join("\u0001")) { diffFiles++; if (ex.length < 5) ex.push(`${f.repo}/${f.rel}`); }
      refused += a.length - patched.parseDeclarations(f.text, f.rel, { keywords: patched.keywordSetOf(pk) }).length;
    }
    card.checks.N7.patched = { servesKeywordPrior: Boolean(pk) && pk.keywords.length === hard.length, servesNameSplit: Boolean(pn) && pn.counts.distinctNames === tally.names.size, filesWithDifferentNameSet: diffFiles, readerDeclarations: decls, recipeDeclarations: mineDecls, refusedByHardSet: refused, examples: ex, genericityOfNew: patched.genericityOf(pn, "new"), genericityOfUnseen: patched.genericityOf(pn, "zzz_unseen_name") };
    card.verdicts.N7 = card.checks.N7.patched.servesKeywordPrior && card.checks.N7.patched.servesNameSplit && diffFiles === 0 && refused === 0 ? "pass" : "fail";
  } else {
    card.verdicts.N7 = "gap";
    card.gaps.push({ gap: "reader-patch-not-derivable", missingAnchors: pr.missing, note: "the reader's source no longer has the anchors the proposed patch edits" });
  }
  card.verdicts.N7reader = unpatched.keywordPrior || unpatched.nameSplit || unpatched.declarations ? "reader-already-partly-serves-rust" : "gap:reader-has-no-rust-support";

  // ── gold-dependent checks: N3, N5(iii), N8, R1..R7, E1 ────────────────────────────────────────────────────────────────────────────
  let docs = [];
  let ctxW = null;
  if (!ga.available) {
    card.gaps.push({ gap: "gold-unavailable", reason: ga.reason, affects: ["N3", "N8", "R1", "R2", "R3", "R4a", "R4b", "R5"] });
    for (const k of ["N3a", "N3b", "R1", "R2", "R3", "R4a"]) card.verdicts[k] = "gap";
  } else {
    const golds = await goldBatch(files.map((f) => ({ language: LANGUAGE, text: f.text, fileName: f.rel })));
    const bad = [];
    files.forEach((f, i) => { if (golds[i]?.error) bad.push({ file: `${f.repo}/${f.rel}`, error: String(golds[i].error).slice(0, 120) }); else docs.push({ repo: f.repo, rel: f.rel, text: f.text, gold: golds[i] }); });
    card.checks.goldFiles = { requested: files.length, parsed: docs.length, errors: bad, withParseError: docs.filter((d) => d.gold.parse?.has_error).length };
    // N3
    const rdocs = docs.filter((d) => inRecipeFamily(d.rel));
    const goldPairs = new Set(), targetPairs = new Set();
    const nodePairs = new Map();
    for (const d of rdocs) for (const df of d.gold.defs) {
      if (!CORE_DEF_KINDS.includes(df.kind)) continue;
      goldPairs.add(`${d.repo}\t${df.name}`);
      if (TARGET_NODES.includes(df.node)) targetPairs.add(`${d.repo}\t${df.name}`);
      if (!nodePairs.has(df.node)) nodePairs.set(df.node, new Set());
      nodePairs.get(df.node).add(`${d.repo}\t${df.name}`);
    }
    const docRepoSets = new Map([...tally.perRepo.keys()].map((r) => [r, new Set()]));
    for (const d of rdocs) for (const dcl of declarationsOf(d.text)) docRepoSets.get(d.repo).add(dcl.name);
    const n3 = recipeVsGold(docRepoSets, goldPairs);
    const tgt = recallOf(docRepoSets, targetPairs);
    const rx = new Set(); for (const [repo, set] of docRepoSets) for (const n of set) rx.add(`${repo}\t${n}`);
    const byNode = new Map();
    for (const [node, set] of nodePairs) { let h = 0; for (const p of set) if (rx.has(p)) h++; byNode.set(node, { pairs: set.size, seenByRecipe: h, recall: set.size ? h / set.size : null }); }
    const shifted = shiftRepos(goldPairs, tally.perRepo.keys());
    const shiftedT = shiftRepos(targetPairs, tally.perRepo.keys());
    const ctlN3 = { precision: recipeVsGold(docRepoSets, shifted).precision, targetedRecall: recallOf(docRepoSets, shiftedT).recall };
    card.checks.N3 = { ...n3, targeted: tgt, byNode: Object.fromEntries([...byNode].sort((a, b) => b[1].pairs - a[1].pairs)), control: ctlN3, coreKinds: CORE_DEF_KINDS, targetNodes: TARGET_NODES, files: rdocs.length, thresholds: { precision: CONSTS.PRECISION_MIN, targetedRecall: CONSTS.TARGET_RECALL_MIN, controlGap: CONSTS.N3_CONTROL_GAP } };
    Object.assign(card.verdicts, decideN3(n3, tgt, ctlN3, CONSTS));
    card.verdicts.N3c = n3.recall != null && n3.recall < 0.95 ? "informational:recipe-incomplete-as-predicted" : "informational:recipe-recall-high";
    if (n3.recall != null && n3.recall < 0.95) card.gaps.push({ gap: "aliases-modules-macros-not-tallied", recall: n3.recall, goldPairs: n3.goldPairs, note: "type aliases (a class in gold), modules and macro_rules are invisible to the recipe, so the name prior says nothing about them" });
    // N5(iii): gold pairs the recipe cannot read, by node
    card.checks.N5.unreadByNode = Object.fromEntries([...byNode].filter(([node]) => !TARGET_NODES.includes(node)).map(([node, v]) => [node, v.pairs]));
    // N8 extents, patched reader vs gold
    if (patched) {
      let matched = 0, equal = 0, unmatched = 0; const byNodeExt = {}; const exs = [];
      for (const d of rdocs) {
        const goldByName = new Map();
        for (const df of d.gold.defs) goldByName.set(df.nameStart, df);
        for (const r of patched.parseDeclarations(d.text, d.rel)) {
          const ns = d.text.indexOf(r.name, r.start);
          const gd = goldByName.get(ns);
          if (!gd) { unmatched++; continue; }
          matched++;
          const ok = gd.end === r.end;
          if (ok) equal++;
          const k = gd.node; byNodeExt[k] = byNodeExt[k] || { n: 0, equal: 0 }; byNodeExt[k].n++; if (ok) byNodeExt[k].equal++;
          if (!ok && exs.length < 6) exs.push(`${d.repo}/${d.rel} ${gd.node} ${r.name}: reader end ${r.end}, grammar end ${gd.end}`);
        }
      }
      card.checks.N8 = { readerDeclarations: matched + unmatched, matchedToGold: matched, unmatched, endEqual: equal, share: matched ? equal / matched : null, byNode: byNodeExt, examples: exs, prediction: "minority differ, 5% to 30%" };
      card.verdicts.N8 = matched ? (1 - equal / matched >= 0.05 && 1 - equal / matched <= 0.30 ? "informational:as-predicted" : "informational:not-as-predicted") : "gap";
    }
    // R1..R7: all TRAIN files
    const w = witnessGold({ hard, soft, builtins, reservedNotGrammar: rngWords, controls: Object.fromEntries(Object.entries(controlSets).map(([k, v]) => [k, v.hard])), controlCover: controlSets.javascript ? [...controlSets.javascript.hard, ...controlSets.javascript.soft] : null, docs });
    card.checks.R = w;
    // the context-aware witness (rust_witness.py)
    const specPath = path.join(OUT, "rust-witness-input.json"), hPath = path.join(OUT, "rust-witness-output.json");
    fs.writeFileSync(specPath, JSON.stringify({ files: files.map((f) => ({ id: `${f.repo}/${f.rel}`, path: f.abs })), hard, soft, reservedNotGrammar: rngWords, controls: Object.fromEntries(Object.entries(controlSets).map(([k, v]) => [k, v.hard])) }));
    run(PYTHON, [path.join(HERE, "rust_witness.py"), specPath, hPath]);
    const h = JSON.parse(fs.readFileSync(hPath, "utf8"));
    ctxW = witnessContext(h);
    card.checks.Rctx = ctxW;
    Object.assign(card.verdicts, decideR(w, ctxW));
    // E1 consumer effect on this file's own declarations
    const names = new Map();
    for (const f of files) for (const d of declarationsOf(f.text)) names.set(d.name, (names.get(d.name) || 0) + 1);
    const refusedBy = (set) => { let n = 0; const ex = []; for (const [k, c] of names) if (set.has(k)) { n += c; if (ex.length < 6) ex.push(k); } return { n, examples: ex }; };
    card.checks.E1 = { declarations: [...names.values()].reduce((a, b) => a + b, 0), refusedByHard: refusedBy(new Set(hard)), refusedByForeign: Object.fromEntries(Object.entries(controlSets).map(([k, v]) => [k, refusedBy(new Set(v.hard.filter((x) => !hard.includes(x))))])), refusedByReservedNotGrammar: refusedBy(new Set(rngWords)) };
    card.verdicts.E1 = card.checks.E1.refusedByHard.n === 0 && Object.values(card.checks.E1.refusedByForeign).some((v) => v.n >= 1) ? "informational:as-predicted" : "informational:not-as-predicted";
  }

  // ── loaders: which file does the reader serve? (typed: a source edit is needed, NOT made here) ─────────────────────────────────────
  card.checks.loader = {
    "loadCodeKeywordPrior('rust')": unpatched.keywordPrior ? "served" : "null (CODE_KW_LANG / CODE_KW_FILE have no rust row)",
    "loadCodeNamePriorSplit('rust')": unpatched.nameSplit ? "served" : "null (CODE_NAME_SPLIT_FILE has no rust row)",
    "parseDeclarations(text, 'x.rs')": unpatched.declarations ? "returns declarations" : "returns [] (no .rs recipe in RECIPES)",
    neededEdit: `adapters/text/code-structure.js: ${pr.applied.length} edits (${pr.applied.join(", ")}): see ${patchFile}; adapters/code/name-gate.js: LANG_CODE gets rust: "rust", rs: "rust" (it then reads priors/code-kw-rust.json directly); adapters/code/edges.js: CODE gets rust: ["rust"] and edgeLanguages()/LANG_ALIAS/resolveLanguage need a rust row and a rust lexer (lifetimes, r#idents, macro bangs): not proposed here`,
  };
  card.verdicts.summary = Object.fromEntries(Object.entries(card.verdicts).filter(([k]) => k !== "summary"));

  // ── write the two priors ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  if (ga.available && card.checks.R) {
    kwOut.provenance.trainWitness = {
      split: "train", files: card.checks.R.files, repos: tv.repos.length, tokens: card.checks.R.nTokens, hardKeywordsAttested: card.checks.R.R3.attested, hardKeywordsUnattested: card.checks.R.R3.unattested,
      keywordTokenCoverage: card.checks.R.R2.coverage, hardKeywordsDeclaredAsDefinitionNames: card.checks.R.R1.hardViolations,
      hardSpelledIdentifierLeavesInGrammarPositions: ctxW?.R4a.grammarCollisions ?? null, hardSpelledIdentifierLeavesInTokenSpace: ctxW?.R4b.tokenSpaceCollisions ?? null, hardSpelledIdentifierLeavesInLifetimes: ctxW?.R4c.lifetimeCollisions ?? null,
      reservedButNotGrammarTokenDefs: card.checks.R.R6defs.reservedNotGrammarDefs, verdicts: { R1: card.verdicts.R1, R2: card.verdicts.R2, R3: card.verdicts.R3, R4a: card.verdicts.R4a },
    };
    nameOut.provenance.validity = { recipeVsGrammar: { precision: card.checks.N3.precision, targetedRecall: card.checks.N3.targeted.recall, overallRecall: card.checks.N3.recall, regexPairs: card.checks.N3.regexPairs, goldPairs: card.checks.N3.goldPairs, verdicts: { N3a: card.verdicts.N3a, N3b: card.verdicts.N3b } }, readerAgreement: { patchedCopy: card.verdicts.N7, unpatchedReader: card.verdicts.N7reader }, extentAgreement: card.checks.N8 ? { share: card.checks.N8.share, matched: card.checks.N8.matchedToGold } : null };
  } else { kwOut.provenance.trainWitness = { gap: "gold-unavailable" }; }
  if (writePriors) {
    fs.mkdirSync(PRIORS, { recursive: true });
    fs.writeFileSync(path.join(PRIORS, "code-kw-rust.json"), JSON.stringify(kwOut, null, 1) + "\n");
    fs.writeFileSync(path.join(PRIORS, "code-name-rust.json"), JSON.stringify(nameOut, null, 1) + "\n");
  }
  card.files = { priors: writePriors ? [path.join(PRIORS, "code-kw-rust.json"), path.join(PRIORS, "code-name-rust.json")] : [], card: cardPath, lawPrior: lawPath, patch: patchFile };
  card.ms = Date.now() - t0;
  fs.writeFileSync(cardPath, JSON.stringify(card, null, 1));
  console.log(JSON.stringify({ verdicts: card.verdicts.summary, hard: hard.length, soft: soft.length, builtins: builtins.length, trainFiles: files.length, recipeFiles: tally.files, trainRepos: tv.repos.length, distinctNames: tally.names.size, genericNames: generic, declarations: tally.declarations, ms: card.ms }, null, 1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}
