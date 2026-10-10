#!/usr/bin/env node
// build-javascript-priors.mjs: build the two RECEIVED priors for the programming language "javascript" from TRAIN ONLY, and measure them.
//
//   node eval/coding-competence/build-javascript-priors.mjs [--out DIR] [--priors DIR] [--no-write-priors]
//
// Writes (new files only):
//   native/priors/code-kw-javascript.json   CodeKeywordPrior@1  hard keywords (refuse BINDING names), soft keywords + builtins (never refuse)
//   native/priors/code-name-javascript.json CodeNamePrior@1     distinct-TRAIN-repo counts of declared function/class names (genericity)
//   <out>/card-javascript-priors-train.json the measured card: every check below, with denominators, passes AND failures
//   <out>/javascript-law-prior.json         the giver's LanguageLawPrior@1 (javascript_kw_giver.py)
// <out> defaults to /private/tmp/claude-501/coding-competence/javascript-priors. It never opens a dev or test file.
// It is the JavaScript twin of build-python-priors.mjs (whose pure helpers it imports unchanged: tally statistics, the leave-one-repository-
// out genericity test and its control, the recipe-vs-grammar comparison, TRAIN purity) and keeps that file's pre-registration discipline.
//
// GIVERS (READING-POLICY rule 3: every prior names its giver):
//   code-kw-javascript: the tree-sitter grammar for javascript (tree-sitter-language-pack 1.21.0; upstream tree-sitter/tree-sitter-javascript,
//     MIT) for the word tokens, arbitrated by V8 (node 24.10.0 compile probes that execute nothing) for which words are RESERVED. Derived by
//     eval/coding-competence/javascript_kw_giver.py (pre-registered in its own header, K1..K4), projected to the CodeKeywordPrior@1 schema by
//     the EXISTING, UNMODIFIED scripts/build-code-keyword-prior.mjs. No keyword is typed here and no corpus file is read to derive the
//     keyword set; TRAIN gold is read only to WITNESS it (R1..R5). Priors REFUSE (hard keywords) or NOMINATE (nothing), never admit.
//   code-name-javascript: a treebank-like corpus: the manifest's javascript TRAIN split (4 permissively licensed repositories, 240 files:
//     ElemeFE/element MIT, TanStack/query MIT, conductor-oss/conductor Apache-2.0, sveltejs/svelte MIT). The declaration recipe is the family
//     `js` recipe of scripts/build-code-name-prior-split.mjs, copied VERBATIM (it is also the js recipe of adapters/text/code-structure.js,
//     which is the recipe the reader applies, so prior and reader cannot drift: N7 checks it on the files). Names are counted per distinct
//     REPOSITORY, never per file, so near-duplicate files cannot inflate genericity.
//
// PRE-REGISTRATION (READING-POLICY II.5; this header was written BEFORE the first run of this file; thresholds are declared, never tuned,
// and every failure is reported as a failure).
//
// WHAT WAS SEEN BEFORE THIS HEADER (disclosed; nothing else was looked at):
//   (a) manifest.languages.javascript: TRAIN = 240 rows in 4 repositories, all unrestricted (.js 171, .jsx 47, .cjs 17, .mjs 5); dev 3 repos
//       (alibaba/canal, louislam/uptime-kuma, lynx-family/lynx); test 3 repos. No dev or test file was opened.
//   (b) javascript_kw_giver.py was run once, unmodified (its header pre-registers K1..K4): hard = 35 words (30 anonymous grammar tokens +
//       this, super, null, true, false), soft = [as, async, await, from, get, let, meta, of, set, static, target, undefined, using, yield];
//       K1 K2 K3 pass; K4 = all 35 hard words parse cleanly as a binding name in the grammar (`var if;` has no ERROR node). K1's explained
//       difference with esprima was exactly {enum, let, yield}, as predicted. Strict-only reserved: let, static, yield (+ implements, interface,
//       private, protected, public, which are not javascript grammar tokens); module-only: await.
//   (c) the older priors/code-kw-js.json (43 words from an earlier tree-sitter builder): lists get, set, of, from, meta, target, static, using, as,
//       async, await, let, yield as hard, and none of this, super, null, true, false.
//   (d) the header counts of the existing priors/code-name-train-js.json (a GOLD-recipe tally of the same TRAIN files by build-c2-priors.mjs, which
//       counts methods too): 479 distinct names, 803 declarations, 10 names attested in >= 2 repositories. N6 below is informed by that peek and
//       is only a sanity bound. No TRAIN token, definition or regex-recipe output of THIS file had been looked at.
//   (e) a gold extraction of an AUTHORED snippet (model-written, in /private/tmp/claude-501/coding-competence/javascript-priors/): defs carry
//       `node` (class_declaration, method_definition, variable_declarator, generator_function_declaration); `.catch`, `.default`, `.delete` are
//       property_identifier tokens classed `identifier`, and `delete() {}` / `default() {}` / `catch() {}` methods are defs. Hence the
//       binding-vs-member split below.
//
// WHY A BINDING-VS-MEMBER SPLIT (a JavaScript fact the python card did not need): a reserved word cannot name a BINDING (variable, function,
// class, parameter, label) but may be a property or method name. The refusal polarity "a hard keyword can never name a being" is therefore
// tested on binding positions only; member positions are measured apart (R1m, R4b) so the limit of the prior is a number, not a footnote.
//   member-like def  = a gold def whose `node` matches /method|field|pair|property|member|signature/
//   binding def      = every other gold def (functions, classes, variables, constants, labels...)
//   binding token    = a gold token whose type is identifier, statement_identifier, shorthand_property_identifier or
//                      shorthand_property_identifier_pattern;  member token = type property_identifier.
//
// PREDICTIONS AND PASS RULES (an unmeasured or unlicensed check is "unlicensed"/"gap", never "pass"):
//   K1..K4 (giver: cross-giver agreement with esprima, declarability, arbiter consistency, why the engine arbitrates): rules in
//      javascript_kw_giver.py; observed in (b).
//   K5 incumbent comparison. Every word in the older priors/code-kw-js.json hard set that is NOT in the new hard set is accepted by V8 as a
//      binding name (it is in the new soft set), so the incumbent over-refuses; and every word of the new hard set that the incumbent lacks is
//      refused by V8. Pass: both. Expected: pass; incumbent-only = {as, async, await, from, get, let, meta, of, set, static, target, using,
//      yield}, new-only = {false, null, super, this, true}. The lists are the finding.
//   K6 control for K1 (the statistic must move). The giver's word rule (c0_grammar_keywords.py, run UNMODIFIED) applied to the python, ruby, go,
//      c and java grammars gives candidate sets whose symmetric difference with javascript's hard set is >= 10 for EVERY one of them. Pass: all
//      five >= 10. Expected: pass (a rule that returned javascript's list for any grammar would be broken).
//   N1 reference equivalence (the sum check). My tally of (name -> repos, files, kinds) equals, entry for entry, the output of the UNMODIFIED
//      scripts/build-code-name-prior-split.mjs run on a staged TRAIN-only copy of the same 240 files (its family `js` reads .ts .tsx .js .mjs
//      .jsx: so 223 of 240 files, the 17 .cjs files are not a recipe extension); and the independent per-repository partition sums to the
//      pooled attestation count. Pass: both exact. Expected: pass. FAILURE REFUSES THE WRITE (a drifted recipe).
//   N2 TRAIN purity. Every file read is a manifest javascript TRAIN row with restricted=false whose bytes match its manifest sha256 and whose
//      path is under the fetched raw corpus; every repository has manifest.repos[repo].global_split == "train", is permissive and unrestricted,
//      and appears in no javascript dev or test row; the repositories read equal info.repos.train. Pass: all exact. Expected: pass.
//      FAILURE REFUSES THE WRITE.
//   N3 recipe validity against the grammar, over (name, repo) attestations on the 223 recipe-extension files gold parsed. gold = the tree-sitter
//      grammar's definition names of CORE kinds (gold.mjs CORE_DEF_KINDS).
//      N3a precision = |regex AND gold| / |regex| >= 0.90. (Declared lower than python's 0.95 because the const-arrow pattern spans lazily over
//          any non-`=` text, so `const o = { f: (x) => 1 }` is a known false positive; the false positives are reported, never patched.)
//          Expected ~0.90 to 0.97: a close call, honestly uncertain.
//      N3b targeted recall = |regex AND gold_T| / |gold_T| >= 0.90, gold_T = gold CORE defs whose node is function_declaration,
//          generator_function_declaration or class_declaration (the shapes the recipe claims to read). Expected >= 0.95.
//      N3c (informational, no pass rule) overall recall over every CORE def, with a by-node breakdown. PREDICTION: < 0.90, expected 0.3 to 0.7:
//          methods and variable-bound function expressions are invisible to the recipe. Typed gap `members-and-bound-expressions-not-tallied`.
//      CONTROL BUILT TO FAIL (II.23): the gold side is re-keyed with repository labels cyclically shifted by one (every pair now names the wrong
//      repository). LICENCE: shifted precision <= precision - 0.30 and shifted targeted recall <= recall - 0.30; otherwise N3a/N3b is
//      "unlicensed" (the statistic did not move).
//   N4 genericity is real, not an artefact of file counting (leave-one-REPOSITORY-out inside TRAIN, the only held-out available without touching
//      dev). For each TRAIN repo h, from the OTHER three: G = names declared in >= 2 of them, S = names declared in exactly 1. Hit = the name is
//      declared in h. lift = (hits_G / |G|) / (hits_S / |S|), pooled over the four folds. Pass: pooled lift >= 2.0 AND every fold's lift > 1.0.
//      CONTROL BUILT TO FAIL (II.23): in every fold each repository's declared-name set is replaced by an independent uniform random subset of
//      the pooled vocabulary of the same size (cross-repository identity destroyed; sizes kept), 200 seeded draws. LICENCE: the control's
//      median pooled lift is in [0.5, 1.5] and the real lift exceeds the control's MAXIMUM; otherwise "unlicensed". Expected: pass, but UNDER-
//      POWERED (about 10 generic names, four disparate repositories: a Vue UI kit, a data-fetching library, a Java-backend UI, a compiler); a
//      "fail" or "unlicensed" is a plausible outcome (~35%) and will be reported as such.
//   N5 (informational, no pass rule) recipe gaps. (i) declarations whose names contain non-ASCII identifier characters that the ASCII recipe
//      cannot spell (reported against the XID twin of the recipe); (ii) the 17 .cjs files, which the recipe's extension list omits: how many
//      declarations and distinct names the same recipe would find there. Neither is mixed into the tally (that would break N1).
//   N6 sanity bound (informed by peek (d)). distinct names in [150, 1200] and names attested in >= 2 repositories in [2, 40].
//   N7 prior/reader agreement. For every recipe-extension TRAIN file the set of names adapters/text/code-structure.js::parseDeclarations (the
//      reader, imported read-only) returns equals the set this file's recipe returns. Pass: equal on every file. Expected: pass (same recipe).
//   R1 refusal polarity, BINDING positions. Over every binding def-name node the grammar gives in TRAIN: ZERO names are in the hard keyword set.
//      LICENCE (control built to fail): over the same defs the random control (35 names drawn from the binding-name vocabulary, 200 seeded
//      draws) has mean >= 1 AND at least one language-deranged control fires: the older priors/code-kw-js.json hard set (the incumbent) >= 1, or
//      the python hard set (priors/code-kw-python.json) >= 1; otherwise R1 is "unlicensed". Expected: real 0; incumbent >= 1 (e.g. a variable
//      named `target`, `from`, `get`, `set`, `of`, `meta`); python control >= 1.
//   R1m (informational, no pass rule) member positions. Definition names of member-like nodes that are in the hard set, with counts and examples.
//      PREDICTION: > 0 (class methods named delete, default, catch...). It supports the statement that the hard set refuses BINDING names only.
//   R2 token coverage. Of TRAIN gold tokens classed `keyword`, the fraction whose text is in (hard U soft) is >= 0.99. Control: the python
//      keyword set (hard U soft of priors/code-kw-python.json) as the prior must cover at least 0.10 LESS (else unlicensed). Expected: pass; the
//      texts outside the prior are listed.
//   R3 attestation. At least 32 of the 35 hard keywords occur in TRAIN as a structural token (gold class not comment, string or identifier).
//      Unattested words are listed (a typed gap: the keyword is received but unwitnessed). Expected: 32 to 35 attested; the rare ones (debugger,
//      with, void) are the candidates for the gap.
//   R4a no identifier collision, BINDING tokens. ZERO gold tokens of a binding type have a hard keyword as text. LICENCE: the incumbent hard set
//      collides on the same tokens at least once (a variable named `target`, `from`, `get`...); otherwise unlicensed. Expected: 0; incumbent >= 1.
//   R4b (informational, no pass rule) member tokens: gold property_identifier tokens whose text is a hard keyword (`.catch`, `.default`,
//      `.delete`, `.finally`...). PREDICTION: > 0 and large (hundreds): the clearest measure of the binding-only limit.
//   R5 (informational, no pass rule) shadowing. TRAIN CORE definitions whose name is a V8 builtin (e.g. Map, Set, escape) or a soft keyword
//      (e.g. get, set, of, from, static), with counts and examples. Prediction: > 0 soft-keyword shadowings exist (supports the polarity: soft
//      keywords and builtins are recorded and never refuse).
//   E1 (informational, no pass rule) consumer effect, through the READER itself (code-structure.js::parseDeclarations over the recipe-extension
//      files, imported read-only): declarations refused with keywords = the new hard set, and with the incumbent's. PREDICTION: the new set
//      refuses 0 TRAIN declarations and the incumbent refuses >= 1 (a legally declared `get`/`set`/`target`/... dropped).
//
// AMENDMENT (written AFTER the first run's results were seen; changes no verdict and no threshold above). The first run gave N3a "fail"
// (precision 0.619 < 0.90), R3 "fail" (31 of 35 hard words attested, 4 unattested: debugger, do, void, with) and N4 "unlicensed" (4 generic
// names pooled over the four folds, none recurring). They stand as failures. javascript-priors-posthoc.mjs (labelled post_hoc) was then written
// to diagnose them; if its card exists this file embeds a compact `postHoc` block in the name prior's provenance so the prior carries its own
// diagnosis, and nothing else changes. The re-run reproduces the first run's verdicts exactly (checked by comparing the two cards).
//
// LAWS APPLIED: causal (priors carry no whole-text statistic over a unit being judged; this file only counts); identity does not decay;
// priors refuse or nominate, never admit; capitalisation is not read anywhere (names are exact strings); every threshold above is declared;
// gaps are typed with denominators; held-out discipline (TRAIN only; the leave-one-repo-out is a TRAIN-internal split by repository); no model.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { goldBatch, goldAvailable, GOLD_VERSION, CORE_DEF_KINDS } from "./gold.mjs";
import {
  verifyTrain, trainDigest, sha256, compareNameTables, namesObject, attestationTotal, loroLift, controlLifts, decideN4, recipeVsGold,
  fnv1a, mulberry32, sampleWithoutReplacement, NATIVE, MANIFEST,
} from "./build-python-priors.mjs";
import { parseDeclarations, loadCodeKeywordPrior, loadCodeNamePriorSplit } from "../../adapters/text/code-structure.js";

export { sha256, trainDigest, verifyTrain, compareNameTables, namesObject, attestationTotal, loroLift, controlLifts, decideN4, recipeVsGold, fnv1a, mulberry32, sampleWithoutReplacement, MANIFEST, NATIVE };

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_OUT = process.env.JSPRIORS_OUT || "/private/tmp/claude-501/coding-competence/javascript-priors";
const PYTHON = process.env.GOLD_PYTHON || "/private/tmp/claude-501/venv/bin/python";
const TS_CACHE = process.env.GOLD_TS_CACHE || "/private/tmp/claude-501/coding-competence/ts-cache";
const LANGUAGE = "javascript";

// declared constants (header)
export const CONSTS = Object.freeze({
  GENERIC_FLOOR: 2, LIFT_MIN: 2.0, LIFT_FOLD_MIN: 1.0, CONTROL_MEDIAN_LO: 0.5, CONTROL_MEDIAN_HI: 1.5, CONTROL_DRAWS: 200,
  PRECISION_MIN: 0.90, TARGET_RECALL_MIN: 0.90, N3_CONTROL_GAP: 0.30, K6_MIN_SYMDIFF: 10, R2_MIN: 0.99, R2_CONTROL_GAP: 0.10, R3_MIN_ATTESTED: 32,
  N6_NAMES: [150, 1200], N6_GENERIC: [2, 40], SEED: "javascript-priors-v1",
});
export const TARGET_NODES = Object.freeze(["function_declaration", "generator_function_declaration", "class_declaration"]);
export const MEMBER_NODE = /method|field|pair|property|member|signature/;
export const BINDING_TOKEN_TYPES = Object.freeze(["identifier", "statement_identifier", "shorthand_property_identifier", "shorthand_property_identifier_pattern"]);
export const MEMBER_TOKEN_TYPES = Object.freeze(["property_identifier"]);

// ── the recipe: family `js` of scripts/build-code-name-prior-split.mjs, VERBATIM (three patterns) ────────────────────────────────────
export const RECIPE_EXTS = Object.freeze([".ts", ".tsx", ".js", ".mjs", ".jsx"]);
export const RECIPES = Object.freeze([
  { source: String.raw`^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)`, flags: "gm", kind: "function" },
  { source: String.raw`^[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)`, flags: "gm", kind: "class" },
  { source: String.raw`^[ \t]*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=]*?\)?\s*=>`, flags: "gm", kind: "function" },
]);
const ASCII_IDENT = String.raw`[A-Za-z_$][\w$]*`;
const XID_IDENT = String.raw`[\p{ID_Start}_$][\p{ID_Continue}$‌‍]*`;

export const extOf = (rel) => path.extname(rel).toLowerCase();
export const inRecipeFamily = (rel) => RECIPE_EXTS.includes(extOf(rel));

/** declarationsOf(text) -> [{name, kind}] (the split builder's own mapping: kind is the recipe's kind) */
export function declarationsOf(text, { xid = false } = {}) {
  const out = [];
  for (const r of RECIPES) {
    const src = xid ? r.source.replace(ASCII_IDENT, XID_IDENT) : r.source;
    const re = new RegExp(src, xid ? r.flags + "u" : r.flags);
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

/** Declarations the ASCII recipe cannot spell or truncates: the XID twin's name has a character outside [A-Za-z0-9_$]. */
export function xidGap(text) {
  let nonAscii = 0, total = 0;
  const examples = [];
  for (const d of declarationsOf(text, { xid: true })) {
    total++;
    if (/[^A-Za-z0-9_$]/.test(d.name)) { nonAscii++; if (examples.length < 5) examples.push(d.name); }
  }
  return { nonAscii, total, examples };
}

// ── N3 helpers ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** shiftRepos(pairs) -> the same pairs with each repository label replaced by the next repository (cyclic): the control that names the wrong repo. */
export function shiftRepos(pairs, repos) {
  const rs = [...repos].sort();
  const next = new Map(rs.map((r, i) => [r, rs[(i + 1) % rs.length]]));
  const out = new Set();
  for (const p of pairs) { const [r, n] = p.split("\t"); out.add(`${next.get(r) ?? r}\t${n}`); }
  return out;
}
export function recallOf(regexPerRepo, goldPairs) {
  const rx = new Set();
  for (const [repo, set] of regexPerRepo) for (const n of set) rx.add(`${repo}\t${n}`);
  let hit = 0;
  for (const p of goldPairs) if (rx.has(p)) hit++;
  return { goldPairs: goldPairs.size, hit, recall: goldPairs.size ? hit / goldPairs.size : null };
}
export function decideN3(real, targeted, ctl, C = CONSTS) {
  const licA = ctl.precision != null && real.precision != null && ctl.precision <= real.precision - C.N3_CONTROL_GAP;
  const licB = ctl.targetedRecall != null && targeted.recall != null && ctl.targetedRecall <= targeted.recall - C.N3_CONTROL_GAP;
  return {
    N3a: !licA ? "unlicensed" : real.precision >= C.PRECISION_MIN ? "pass" : "fail",
    N3b: !licB ? "unlicensed" : targeted.recall >= C.TARGET_RECALL_MIN ? "pass" : "fail",
  };
}

// ── R1..R5: witnesses of the keyword prior against TRAIN gold ─────────────────────────────────────────────────────────────────────────
const NON_STRUCTURAL = new Set(["comment", "string", "identifier"]);
const mapToObj = (m) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));

/**
 * witnessKeywords({ hard, soft, builtins, incumbentHard, pythonHard, pythonSoft, docs, seed, draws }) -> the R1..R5 measurements.
 *   docs: [{ repo, rel, text, gold }]  gold = a gold.mjs result (no `error`)
 */
export function witnessKeywords({ hard, soft, builtins, incumbentHard, pythonHard, pythonSoft, docs, seed = CONSTS.SEED, draws = CONSTS.CONTROL_DRAWS }) {
  const hardSet = new Set(hard), softSet = new Set(soft), prior = new Set([...hard, ...soft]);
  const incSet = new Set(incumbentHard || []), pyHard = new Set(pythonHard || []), pyAll = new Set([...(pythonHard || []), ...(pythonSoft || [])]);
  const builtinSet = new Set((builtins || []).filter((b) => !hardSet.has(b)));
  const bindingTypes = new Set(BINDING_TOKEN_TYPES), memberTypes = new Set(MEMBER_TOKEN_TYPES);
  const kwTokens = new Map();
  const attest = new Map(hard.map((w) => [w, 0]));
  const collisions = new Map();        // binding token: hard text -> {n, files}
  const incCollisions = new Map();
  const memberTok = new Map();         // member token: hard text -> n
  const declBinding = new Map(), declMember = new Map();
  const nodeKinds = new Map();         // def node -> n (disclosure of what was classed member/binding)
  const coreShadow = { builtin: new Map(), soft: new Map() };
  let nTokens = 0, nDefs = 0, nCoreDefs = 0, nBindingTok = 0, nMemberTok = 0;
  for (const d of docs) {
    const g = d.gold;
    for (const t of g.tokens) {
      nTokens++;
      const cls = t.class;
      if (cls === "comment" || cls === "string") continue;
      const txt = d.text.slice(t.start, t.end);
      if (cls === "keyword") kwTokens.set(txt, (kwTokens.get(txt) || 0) + 1);
      if (hardSet.has(txt) && !NON_STRUCTURAL.has(cls)) attest.set(txt, attest.get(txt) + 1);
      if (bindingTypes.has(t.type)) {
        nBindingTok++;
        if (hardSet.has(txt)) { const r = collisions.get(txt) || { n: 0, files: new Set() }; r.n++; r.files.add(`${d.repo}/${d.rel}`); collisions.set(txt, r); }
        if (incSet.has(txt)) { const r = incCollisions.get(txt) || { n: 0, files: new Set() }; r.n++; r.files.add(`${d.repo}/${d.rel}`); incCollisions.set(txt, r); }
      } else if (memberTypes.has(t.type)) {
        nMemberTok++;
        if (hardSet.has(txt)) memberTok.set(txt, (memberTok.get(txt) || 0) + 1);
      }
    }
    for (const df of g.defs) {
      nDefs++;
      nodeKinds.set(df.node, (nodeKinds.get(df.node) || 0) + 1);
      const table = MEMBER_NODE.test(df.node || "") ? declMember : declBinding;
      table.set(df.name, (table.get(df.name) || 0) + 1);
      if (CORE_DEF_KINDS.includes(df.kind)) {
        nCoreDefs++;
        if (builtinSet.has(df.name)) coreShadow.builtin.set(df.name, (coreShadow.builtin.get(df.name) || 0) + 1);
        if (softSet.has(df.name)) coreShadow.soft.set(df.name, (coreShadow.soft.get(df.name) || 0) + 1);
      }
    }
  }
  const violations = (set, table) => { let n = 0; const ex = []; for (const [name, c] of table) if (set.has(name)) { n += c; if (ex.length < 8) ex.push(name); } return { n, examples: ex }; };
  const real = violations(hardSet, declBinding), incV = violations(incSet, declBinding), pyV = violations(pyHard, declBinding);
  const member = violations(hardSet, declMember);
  const vocab = [...declBinding.keys()].sort();
  const rng = mulberry32(fnv1a(`${seed}|r1-control`));
  let sum = 0;
  for (let d = 0; d < draws; d++) { const pick = new Set(sampleWithoutReplacement(vocab, hard.length, rng)); sum += violations(pick, declBinding).n; }
  const randMean = draws ? sum / draws : null;

  let kwTotal = 0, kwIn = 0, kwInPy = 0;
  const outside = [];
  for (const [txt, n] of kwTokens) { kwTotal += n; if (prior.has(txt)) kwIn += n; else outside.push([txt, n]); if (pyAll.has(txt)) kwInPy += n; }
  outside.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const unattested = [...attest].filter(([, n]) => n === 0).map(([w]) => w);
  const sumOf = (m) => [...m.values()].reduce((a, r) => a + (typeof r === "number" ? r : r.n), 0);
  const collObj = (m) => Object.fromEntries([...m].map(([w, r]) => [w, { n: r.n, files: [...r.files].slice(0, 5) }]));
  return {
    nTokens, nDefs, nCoreDefs, nBindingTokens: nBindingTok, nMemberTokens: nMemberTok, files: docs.length, defNodes: mapToObj(nodeKinds),
    R1: { hardViolations: real.n, violationExamples: real.examples, denominatorBindingDefs: sumOf(declBinding), incumbentControlViolations: incV.n, incumbentControlExamples: incV.examples, pythonControlViolations: pyV.n, pythonControlExamples: pyV.examples, randomControlMean: randMean, randomControlDraws: draws },
    R1m: { hardNamedMembers: member.n, examples: member.examples, denominatorMemberDefs: sumOf(declMember), byName: mapToObj(new Map([...declMember].filter(([k]) => hardSet.has(k)))) },
    R2: { keywordTokens: kwTotal, inPrior: kwIn, coverage: kwTotal ? kwIn / kwTotal : null, controlPythonCoverage: kwTotal ? kwInPy / kwTotal : null, outsidePrior: outside.slice(0, 25), distinctOutside: outside.length },
    R3: { hardWords: hard.length, attested: hard.length - unattested.length, unattested, counts: mapToObj(attest) },
    R4a: { bindingTokens: nBindingTok, collisions: sumOf(collisions), words: collObj(collisions), incumbentControlCollisions: sumOf(incCollisions), incumbentControlWords: collObj(incCollisions) },
    R4b: { memberTokens: nMemberTok, hardTextAsMember: sumOf(memberTok), byWord: mapToObj(memberTok) },
    R5: { builtinShadowingDefs: sumOf(coreShadow.builtin), builtinShadowNames: mapToObj(coreShadow.builtin), softShadowingDefs: sumOf(coreShadow.soft), softShadowNames: mapToObj(coreShadow.soft), denominatorCoreDefs: nCoreDefs },
  };
}

export function decideR(w, C = CONSTS) {
  const r1Lic = w.R1.randomControlMean != null && w.R1.randomControlMean >= 1 && (w.R1.incumbentControlViolations >= 1 || w.R1.pythonControlViolations >= 1);
  const r2Lic = w.R2.coverage != null && w.R2.controlPythonCoverage != null && w.R2.controlPythonCoverage <= w.R2.coverage - C.R2_CONTROL_GAP;
  const r4Lic = w.R4a.incumbentControlCollisions >= 1;
  return {
    R1: !r1Lic ? "unlicensed" : w.R1.hardViolations === 0 ? "pass" : "fail",
    R1m: w.R1m.hardNamedMembers > 0 ? "informational:binding-only-limit-observed" : "informational:no-member-collision-seen",
    R2: !r2Lic ? "unlicensed" : w.R2.coverage >= C.R2_MIN ? "pass" : "fail",
    R3: w.R3.attested >= C.R3_MIN_ATTESTED ? "pass" : "fail",
    R4a: !r4Lic ? "unlicensed" : w.R4a.collisions === 0 ? "pass" : "fail",
    R4b: w.R4b.hardTextAsMember > 0 ? "informational:binding-only-limit-observed" : "informational:no-member-use-seen",
    R5: w.R5.softShadowingDefs + w.R5.builtinShadowingDefs > 0 ? "informational:supports-polarity" : "informational:no-shadowing-seen",
  };
}

// ── main ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status}): ${(r.stderr || r.stdout || "").slice(-600)}`);
  return r;
}
const sym = (a, b) => [...new Set([...a, ...b])].filter((x) => a.includes(x) !== b.includes(x)).sort();

async function main() {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const OUT = opt("--out", DEFAULT_OUT);
  const PRIORS = opt("--priors", path.join(NATIVE, "priors"));
  const writePriors = !argv.includes("--no-write-priors");
  fs.mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const card = { schema: "JavascriptPriorsCard@1", language: LANGUAGE, split: "train", builtAt: new Date().toISOString(), goldVersion: GOLD_VERSION, consts: CONSTS, checks: {}, verdicts: {}, gaps: [] };
  const cardPath = path.join(OUT, "card-javascript-priors-train.json");
  const refuse = (why) => { card.refused = why; fs.writeFileSync(cardPath, JSON.stringify(card, null, 1)); console.error(`REFUSED: ${why}`); process.exit(1); };

  // ── N2 TRAIN purity ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const tv = verifyTrain(manifest, LANGUAGE);
  card.checks.N2 = { rows: tv.rows.length, repos: tv.repos, excludedRestricted: tv.restricted.map((r) => ({ repo: r.repo, rel: r.rel })), problems: tv.problems };
  card.verdicts.N2 = tv.problems.length ? "fail" : "pass";
  if (tv.problems.length) refuse(`N2 TRAIN purity failed: ${tv.problems.slice(0, 3).join("; ")}`);
  const files = tv.rows.map((r) => ({ repo: r.repo, rel: r.rel, text: fs.readFileSync(r.path, "utf8"), bytes: r.bytes, row: r }));
  const digest = trainDigest(tv.rows);

  // ── the keyword giver and projection ────────────────────────────────────────────────────────────────────────────────────────────
  const lawPath = path.join(OUT, "javascript-law-prior.json");
  const giverOut = run(PYTHON, [path.join(HERE, "javascript_kw_giver.py"), lawPath]).stdout.trim().split("\n").pop();
  const law = JSON.parse(fs.readFileSync(lawPath, "utf8"));
  const kwTmp = path.join(OUT, "code-kw-javascript.builder-output.json");
  run(process.execPath, [path.join(NATIVE, "scripts/build-code-keyword-prior.mjs"), lawPath, kwTmp, LANGUAGE]);
  const kw = JSON.parse(fs.readFileSync(kwTmp, "utf8"));
  const hard = kw.keywords, soft = kw.softKeywords, builtins = kw.builtins;
  const dv = law.derivation;
  card.checks.K = { giverRun: JSON.parse(giverOut), K1: dv.checks.K1, K2: { pass: dv.checks.K2.pass, soft: dv.checks.K2.soft, mixed: dv.checks.K2.mixed }, K3: dv.checks.K3, K4: dv.checks.K4 };
  card.verdicts.K1 = dv.checks.K1.pass ? "pass" : "fail"; card.verdicts.K2 = dv.checks.K2.pass ? "pass" : "fail"; card.verdicts.K3 = dv.checks.K3.pass ? "pass" : "fail";
  card.verdicts.K4 = dv.checks.K4.prediction_ge_20_held ? "pass" : "fail";

  // K5: the incumbent (older priors/code-kw-js.json)
  const oldKw = JSON.parse(fs.readFileSync(path.join(NATIVE, "priors/code-kw-js.json"), "utf8"));
  const incumbentOnly = oldKw.keywords.filter((w) => !hard.includes(w)).sort();
  const newOnly = hard.filter((w) => !oldKw.keywords.includes(w)).sort();
  const refusedSloppy = new Set(dv.engineRefusedSloppy);
  card.checks.K5 = {
    against: "priors/code-kw-js.json", incumbentHardCount: oldKw.keywords.length, newHardCount: hard.length, shared: hard.length - newOnly.length,
    incumbentOnly, incumbentOnlyAcceptedByEngine: incumbentOnly.filter((w) => !refusedSloppy.has(w)), newOnly, newOnlyRefusedByEngine: newOnly.filter((w) => refusedSloppy.has(w)),
    softOnlyHere: soft.filter((w) => !oldKw.softKeywords.includes(w)),
  };
  card.verdicts.K5 = card.checks.K5.incumbentOnlyAcceptedByEngine.length === incumbentOnly.length && card.checks.K5.newOnlyRefusedByEngine.length === newOnly.length ? "pass" : "fail";

  // K6: the same word rule on other grammars must NOT return javascript's list (control for K1)
  const ctlOut = path.join(OUT, "grammar-keywords-controls.json");
  const ctlLangs = ["python", "ruby", "go", "c", "java"];
  run(PYTHON, [path.join(HERE, "c0_grammar_keywords.py"), ctlOut, ...ctlLangs]);
  const ctl = JSON.parse(fs.readFileSync(ctlOut, "utf8")).languages;
  card.checks.K6 = Object.fromEntries(ctlLangs.map((l) => [l, { candidates: ctl[l]?.keywords?.length ?? null, symmetricDifferenceWithJavascriptHard: ctl[l]?.keywords ? sym(hard, ctl[l].keywords).length : null, error: ctl[l]?.error ?? null }]));
  card.verdicts.K6 = ctlLangs.every((l) => (card.checks.K6[l].symmetricDifferenceWithJavascriptHard ?? -1) >= CONSTS.K6_MIN_SYMDIFF) ? "pass" : "fail";

  // ── N1 sum check (reference equivalence) ──────────────────────────────────────────────────────────────────────────────────────────
  const tally = tallyNames(files);
  const mine = namesObject(tally.names);
  const tree = path.join(OUT, "train-tree"), refOut = path.join(OUT, "ref-split");
  fs.rmSync(tree, { recursive: true, force: true }); fs.rmSync(refOut, { recursive: true, force: true });
  for (const f of files) {
    const dest = path.join(tree, f.repo.replace("/", "_"), f.rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, f.text);
  }
  const refRun = run(process.execPath, [path.join(NATIVE, "scripts/build-code-name-prior-split.mjs"), tree, refOut]);
  const ref = JSON.parse(fs.readFileSync(path.join(refOut, "code-name-js.json"), "utf8"));
  const cmp = compareNameTables(mine, ref.names);
  const partition = partitionSum(files);
  const attest = attestationTotal(tally.names);
  card.checks.N1 = {
    referenceBuilder: "scripts/build-code-name-prior-split.mjs (unmodified) on a TRAIN-only staged copy of all 240 files", referenceLog: refRun.stderr.trim().split("\n").slice(-3), compare: cmp,
    countsMatch: ref.counts.distinctNames === tally.names.size && ref.counts.totalDeclarations === tally.declarations && ref.counts.files === tally.files && ref.counts.repos === tally.perRepo.size,
    referenceCounts: ref.counts, recipeFiles: tally.files, trainFilesStaged: files.length, partitionSum: partition, pooledAttestations: attest,
  };
  card.verdicts.N1 = cmp.equal && card.checks.N1.countsMatch && partition === attest ? "pass" : "fail";
  if (card.verdicts.N1 !== "pass") refuse("N1 sum check failed: my tally differs from the reference split builder or the per-repo partition");

  // ── N5 recipe gaps, N6 sanity ─────────────────────────────────────────────────────────────────────────────────────────────────────
  let xidN = 0, xidTotal = 0; const xidEx = [];
  for (const f of files) if (inRecipeFamily(f.rel)) { const g = xidGap(f.text); xidN += g.nonAscii; xidTotal += g.total; for (const e of g.examples) if (xidEx.length < 8) xidEx.push(e); }
  const cjsFiles = files.filter((f) => extOf(f.rel) === ".cjs");
  const cjsTally = tallyNames(cjsFiles.map((f) => ({ ...f, rel: f.rel.replace(/\.cjs$/i, ".js") })));
  card.checks.N5 = {
    nonAsciiDeclarations: xidN, ofDeclarationsSeenByXidRecipe: xidTotal, examples: xidEx,
    cjs: { files: cjsFiles.length, declarationsTheRecipeWouldFind: cjsTally.declarations, distinctNames: cjsTally.names.size, namesNotInTally: [...cjsTally.names.keys()].filter((n) => !tally.names.has(n)).length },
  };
  const generic = [...tally.names.values()].filter((r) => r.repos.size >= CONSTS.GENERIC_FLOOR).length;
  card.checks.N6 = { distinctNames: tally.names.size, namesAtOrAboveFloor: generic, boundsNames: CONSTS.N6_NAMES, boundsGeneric: CONSTS.N6_GENERIC };
  card.verdicts.N6 = tally.names.size >= CONSTS.N6_NAMES[0] && tally.names.size <= CONSTS.N6_NAMES[1] && generic >= CONSTS.N6_GENERIC[0] && generic <= CONSTS.N6_GENERIC[1] ? "pass" : "fail";

  // ── N4 leave-one-repository-out genericity, with the control built to fail ────────────────────────────────────────────────────────
  const real = loroLift(tally.perRepo);
  const control = controlLifts(tally.perRepo, CONSTS.CONTROL_DRAWS, CONSTS.SEED);
  const floor3 = loroLift(tally.perRepo, 3);
  card.checks.N4 = { real, control, informationalFloor3: floor3.pooled };
  card.verdicts.N4 = decideN4(real, control, CONSTS);

  // ── N7 prior/reader agreement (the reader is imported read-only) ──────────────────────────────────────────────────────────────────
  let readerDiff = 0, readerDecls = 0, mineDecls = 0, readerFiles = 0;
  const readerEx = [];
  for (const f of files) {
    if (!inRecipeFamily(f.rel)) continue;
    readerFiles++;
    const a = parseDeclarations(f.text, f.rel).map((d) => d.name), b = declarationsOf(f.text).map((d) => d.name);
    readerDecls += a.length; mineDecls += b.length;
    const A = [...new Set(a)].sort().join("\u0001"), B = [...new Set(b)].sort().join("\u0001");
    if (A !== B) { readerDiff++; if (readerEx.length < 5) readerEx.push(`${f.repo}/${f.rel}`); }
  }
  card.checks.N7 = { files: readerFiles, filesWithDifferentNameSet: readerDiff, readerDeclarations: readerDecls, recipeDeclarations: mineDecls, examples: readerEx };
  card.verdicts.N7 = readerDiff === 0 ? "pass" : "fail";

  // ── gold-dependent checks: N3, R1..R5, E1 ─────────────────────────────────────────────────────────────────────────────────────────
  const ga = goldAvailable();
  let docs = [];
  let consumer = null;
  if (!ga.available) {
    card.gaps.push({ gap: "gold-unavailable", reason: ga.reason, affects: ["N3", "R1", "R2", "R3", "R4a", "R4b", "R5"] });
    for (const k of ["N3a", "N3b", "R1", "R2", "R3", "R4a"]) card.verdicts[k] = "gap";
  } else {
    const golds = await goldBatch(files.map((f) => ({ language: LANGUAGE, text: f.text, fileName: f.rel })));
    const bad = [];
    files.forEach((f, i) => { if (golds[i]?.error) bad.push({ file: `${f.repo}/${f.rel}`, error: String(golds[i].error).slice(0, 120) }); else docs.push({ repo: f.repo, rel: f.rel, text: f.text, gold: golds[i] }); });
    card.checks.goldFiles = { requested: files.length, parsed: docs.length, errors: bad, withParseError: docs.filter((d) => d.gold.parse?.has_error).length };
    // N3 (recipe-extension files gold parsed, both sides)
    const rdocs = docs.filter((d) => inRecipeFamily(d.rel));
    const goldPairs = new Set(), targetPairs = new Set();
    const byNode = new Map();
    for (const d of rdocs) for (const df of d.gold.defs) {
      if (!CORE_DEF_KINDS.includes(df.kind)) continue;
      goldPairs.add(`${d.repo}\t${df.name}`);
      if (TARGET_NODES.includes(df.node)) targetPairs.add(`${d.repo}\t${df.name}`);
    }
    const docRepoSets = new Map([...tally.perRepo.keys()].map((r) => [r, new Set()]));
    for (const d of rdocs) for (const dcl of declarationsOf(d.text)) docRepoSets.get(d.repo).add(dcl.name);
    const n3 = recipeVsGold(docRepoSets, goldPairs);
    const tgt = recallOf(docRepoSets, targetPairs);
    // by-node recall (informational): per gold node type, the (name, repo) pairs it contributes and how many the recipe sees
    const rx = new Set(); for (const [repo, set] of docRepoSets) for (const n of set) rx.add(`${repo}\t${n}`);
    const nodePairs = new Map();
    for (const d of rdocs) for (const df of d.gold.defs) if (CORE_DEF_KINDS.includes(df.kind)) { if (!nodePairs.has(df.node)) nodePairs.set(df.node, new Set()); nodePairs.get(df.node).add(`${d.repo}\t${df.name}`); }
    for (const [node, set] of nodePairs) { let h = 0; for (const p of set) if (rx.has(p)) h++; byNode.set(node, { pairs: set.size, seenByRecipe: h, recall: set.size ? h / set.size : null }); }
    const shifted = shiftRepos(goldPairs, tally.perRepo.keys());
    const shiftedT = shiftRepos(targetPairs, tally.perRepo.keys());
    const ctlN3 = { precision: recipeVsGold(docRepoSets, shifted).precision, targetedRecall: recallOf(docRepoSets, shiftedT).recall };
    card.checks.N3 = { ...n3, targeted: tgt, byNode: Object.fromEntries([...byNode].sort((a, b) => b[1].pairs - a[1].pairs)), control: ctlN3, coreKinds: CORE_DEF_KINDS, targetNodes: TARGET_NODES, files: rdocs.length, thresholds: { precision: CONSTS.PRECISION_MIN, targetedRecall: CONSTS.TARGET_RECALL_MIN, controlGap: CONSTS.N3_CONTROL_GAP } };
    Object.assign(card.verdicts, decideN3(n3, tgt, ctlN3, CONSTS));
    card.verdicts.N3c = n3.recall != null && n3.recall < 0.9 ? "informational:recipe-incomplete-as-predicted" : "informational:recipe-recall-high";
    if (n3.recall != null && n3.recall < 0.9) card.gaps.push({ gap: "members-and-bound-expressions-not-tallied", recall: n3.recall, goldPairs: n3.goldPairs, note: "the family js recipe sees function and class declarations and const-arrow bindings; methods, object-literal members and var/let-bound function expressions are invisible to it, so the name prior says nothing about them" });
    // R1..R5 (all 240 TRAIN files, including .cjs: the keyword witness is not recipe-bound)
    const py = JSON.parse(fs.readFileSync(path.join(NATIVE, "priors/code-kw-python.json"), "utf8"));
    const w = witnessKeywords({ hard, soft, builtins, incumbentHard: oldKw.keywords, pythonHard: py.keywords, pythonSoft: py.softKeywords, docs });
    card.checks.R = w;
    Object.assign(card.verdicts, decideR(w));
    // E1 consumer effect through the reader
    let total = 0, refusedNew = 0, refusedInc = 0; const wrongInc = new Map();
    for (const f of files) {
      if (!inRecipeFamily(f.rel)) continue;
      const n0 = parseDeclarations(f.text, f.rel).length;
      const n1 = parseDeclarations(f.text, f.rel, { keywords: hard }).length;
      const dInc = parseDeclarations(f.text, f.rel, { keywords: oldKw.keywords }), n2 = dInc.length;
      total += n0; refusedNew += n0 - n1; refusedInc += n0 - n2;
      if (n0 !== n2) { const kept = new Set(dInc.map((d) => `${d.name}@${d.start}`)); for (const d of parseDeclarations(f.text, f.rel)) if (!kept.has(`${d.name}@${d.start}`)) wrongInc.set(d.name, (wrongInc.get(d.name) || 0) + 1); }
    }
    consumer = { readerDeclarations: total, refusedByNewHard: refusedNew, refusedByIncumbent: refusedInc, incumbentWronglyRefusedNames: mapToObj(wrongInc) };
    card.checks.E1 = consumer;
    card.verdicts.E1 = refusedNew === 0 && refusedInc >= 1 ? "informational:as-predicted" : "informational:not-as-predicted";
  }
  // ── the loaders: which file does the reader serve? (typed: a source edit is needed, NOT made here) ───────────────────────────────────
  const served = loadCodeKeywordPrior("javascript");
  const nameSplit = loadCodeNamePriorSplit("javascript");
  card.checks.loader = {
    "loadCodeKeywordPrior('javascript')": served ? { serves: served.provenance?.grammar ? "code-kw-javascript.json" : "code-kw-js.json (the incumbent)", hard: served.keywords.length, softKeywords: served.softKeywords.length } : null,
    "loadCodeNamePriorSplit('javascript')": nameSplit ? "served" : "null (the family table has no `javascript` row)",
    neededEdit: "adapters/text/code-structure.js: CODE_KW_FILE.js \"code-kw-js.json\" -> \"code-kw-javascript.json\" and CODE_NAME_SPLIT_FILE gets javascript: \"code-name-javascript.json\" (plus rebuilding code-ctx-js.json, whose closedClass.keywords is the incumbent's set)",
  };
  card.verdicts.summary = Object.fromEntries(Object.entries(card.verdicts).filter(([k]) => k !== "summary"));

  // ── write the two priors ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  const trainRepos = tv.repos.map((r) => ({ repo: r, url: manifest.repos[r].url, commit: manifest.repos[r].commit, license: manifest.repos[r].license, fetched_at: manifest.repos[r].fetched_at, files: files.filter((f) => f.repo === r).length }));
  const libPath = path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/libs/libtree_sitter_javascript.dylib");
  const libSha = fs.existsSync(libPath) ? sha256(fs.readFileSync(libPath)) : null;
  const bundleDir = path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/bundles");
  const bundle = fs.existsSync(bundleDir) ? fs.readdirSync(bundleDir).find((x) => x.startsWith("macos-arm64-")) : null;
  const g = dv.grammar;
  const kwOut = {
    ...kw,
    provenance: {
      ...kw.provenance,
      giver: `tree-sitter grammar for javascript (tree-sitter-language-pack 1.21.0) for the word tokens, arbitrated by V8 ${law.giver.engine.v8} (node ${law.giver.engine.node}, compile probes that execute nothing) for which words are reserved; hard = (grammar word tokens U grammar dedicated literal terminals) INTERSECT engine-refused in the sloppy goal`,
      grammar: {
        name: "tree-sitter-javascript (the `javascript` grammar of the language pack)", language: "javascript", package: g.package, packageVersion: g.packageVersion, packageLicense: g.packageLicense, packageSource: g.packageSource,
        upstream: g.upstream, upstreamLicense: g.upstreamLicense, upstreamCommit: g.upstreamCommit, upstreamCommitNote: g.upstreamCommitNote,
        abi: g.abi, nodeKindCount: g.nodeKindCount, nodeKindFingerprintSha256: g.nodeKindFingerprintSha256, compiledLibrary: "libtree_sitter_javascript.dylib", compiledLibrarySha256: libSha,
        releaseBundle: bundle, releaseUrl: "https://github.com/xberg-io/tree-sitter-language-pack/releases/download/v1.21.0/parsers-macos-arm64.tar.zst",
        anonymousWordKinds: g.anonymousWordKinds, dedicatedLiteralTerminals: g.dedicatedLiteralTerminals, rule: g.rule,
      },
      engine: law.giver.engine,
      derivation: {
        script: "eval/coding-competence/javascript_kw_giver.py", projection: "scripts/build-code-keyword-prior.mjs (unmodified)", engineProbeForms: dv.engineProbeForms, engineGoals: dv.engineGoals, engineModuleGoalProbed: dv.engineModuleGoalProbed,
        contextualReservation: dv.contextualReservation, softSources: dv.softSources, engineRefusedButNotGrammarToken: dv.engineRefusedButNotGrammarToken, strictReservedButNotGrammarToken: dv.strictReservedButNotGrammarToken,
        grammarWordsEngineDoesNotRefuse: dv.grammarWordsEngineDoesNotRefuse, probeVocabulary: dv.probeVocabulary, hostGlobalsExcluded: dv.hostGlobalsExcluded, builtinsNote: dv.builtinsNote, stdlibModules: dv.stdlibModules,
        bindingOnly: dv.bindingOnly, esprima: { version: dv.esprima.version, role: "independent cross-giver for K1" },
        checks: Object.fromEntries(["K1", "K2", "K3", "K4", "K5", "K6"].map((k) => [k, card.verdicts[k]])),
      },
      assembledBy: "eval/coding-competence/build-javascript-priors.mjs (adds the grammar, engine, derivation and TRAIN-witness provenance to the unmodified builder's output; the keyword lists are the builder's, untouched)",
      noCorpusRead: "the keyword set is derived from the grammar and the engine only; no corpus file is read to derive it",
      trainWitness: ga.available ? { split: "train", files: card.checks.R.files, repos: tv.repos.length, tokens: card.checks.R.nTokens, hardKeywordsAttested: card.checks.R.R3.attested, hardKeywordsUnattested: card.checks.R.R3.unattested, keywordTokenCoverage: card.checks.R.R2.coverage, hardKeywordsDeclaredAsBindingNames: card.checks.R.R1.hardViolations, hardKeywordsUsedAsMemberNames: card.checks.R.R1m.hardNamedMembers, hardTextAsPropertyTokens: card.checks.R.R4b.hardTextAsMember, verdicts: { R1: card.verdicts.R1, R2: card.verdicts.R2, R3: card.verdicts.R3, R4a: card.verdicts.R4a } } : { gap: "gold-unavailable" },
      polarity: "hard keywords refuse BINDING names only (a variable, function, class, parameter or label cannot be named by a reserved word; a property or method can: `p.catch(f)`, `class A { delete() {} }`); soft keywords (as, async, await, from, get, let, meta, of, set, static, target, undefined, using, yield: legally declarable in a sloppy script; let/static/yield are reserved only in strict code and await only in modules) and builtins are recorded and NEVER refuse",
      incumbent: { file: "priors/code-kw-js.json", hardOnlyThere: incumbentOnly, hardOnlyHere: newOnly, note: "the incumbent refuses 13 words V8 accepts as binding names and lacks this, super, null, true, false; it is not held-out-relevant (a keyword set) but its refusals are measured in E1/R1 of the card" },
      builtAt: new Date().toISOString().slice(0, 10),
    },
  };
  // the post-hoc diagnosis (javascript-priors-posthoc.mjs), embedded when its card exists; labelled post_hoc, never evidence for a pre-registered check
  const postHocBlock = () => {
    try {
      const ph = JSON.parse(fs.readFileSync(path.join(OUT, "card-javascript-priors-posthoc.json"), "utf8"));
      const pick = (s) => ({ pairs: s.pairs, precision: s.precision, recall: s.recall, targetedRecall: s.targetedRecall });
      return {
        post_hoc: true, writtenAfter: "the first run's N3a fail, R3 fail and N4 unlicensed were seen", script: "eval/coding-competence/javascript-priors-posthoc.mjs",
        perPatternPrecision: ph.P1.map((p) => ({ pattern: p.pattern, kind: p.kind, source: p.source, ...pick(p) })),
        proposedTightening: { pattern: ph.P2.tightPattern, applied: false, note: "PROPOSED, not applied: replace the third (const-arrow) pattern in adapters/text/code-structure.js and scripts/build-code-name-prior-split.mjs, then rebuild", current: pick(ph.P2.current), tightened: pick(ph.P2.tightened) },
        genericityOverGrammarCoreNames: { names: ph.P3.names, atOrAboveFloor2: ph.P3.namesAtOrAboveFloor.length, pooledLift: ph.P3.real.pooled.lift, pooledG: ph.P3.real.pooled.G, pooledHitG: ph.P3.real.pooled.hitG, controlMedian: ph.P3.control.median, controlMax: ph.P3.control.max, verdictByN4Rule: ph.P3.verdictByN4Rule },
      };
    } catch { return null; }
  };
  const nameOut = {
    schema: "CodeNamePrior@1",
    language: LANGUAGE,
    provenance: {
      giver: `per-language TRAIN-only measurement of the CodeNamePrior@1: the manifest's javascript TRAIN split (a treebank-like corpus of ${tv.repos.length} permissively licensed repositories); recipe identical to the family \`js\` recipe of scripts/build-code-name-prior-split.mjs and to the js recipes of adapters/text/code-structure.js; sum-checked entry for entry against the unmodified split builder run on the same files (${attest} (name, repo) attestations) and against an independent per-repository partition`,
      split: "train", family: "js", manifest: MANIFEST, manifestGeneratedAt: manifest.generated_at, splitRule: manifest.declared.split_rule,
      // trainRepos is an array of "owner/repo" STRINGS (the convention of priors/code-name-train-js.json, which eval/coding-competence/run.mjs priorProvenance reads as strings)
      trainRepos: tv.repos, trainRepoFiles: Object.fromEntries(trainRepos.map((r) => [r.repo, r.files])), trainRepoDetails: trainRepos, trainFiles: files.length, trainFilesDigestSha256: digest,
      recipeFiles: tally.files, filesNotInRecipeFamily: { ext: ".cjs", files: cjsFiles.length, note: "the family recipe's extension list (.ts .tsx .js .mjs .jsx) has no .cjs; these TRAIN files are not tallied" },
      filesExcluded: { restricted_licence: tv.restricted.map((r) => ({ repo: r.repo, rel: r.rel })) },
      recipe: { patterns: RECIPES.map((r) => ({ source: r.source, flags: r.flags, kind: r.kind })), exts: RECIPE_EXTS, note: "ASCII identifiers only (the split builder's recipe); function and class declarations and const-arrow bindings; no methods, no var/let-bound function expressions, no object-literal members" },
      builder: "eval/coding-competence/build-javascript-priors.mjs", builtOn: new Date().toISOString().slice(0, 10),
      sumCheck: { reference: "scripts/build-code-name-prior-split.mjs (unmodified)", entryForEntryEqual: cmp.equal, entries: cmp.entries, perRepoPartitionSum: partition, pooledAttestations: attest },
      validity: ga.available ? { recipeVsGrammar: { precision: card.checks.N3.precision, targetedRecall: card.checks.N3.targeted.recall, overallRecall: card.checks.N3.recall, regexPairs: card.checks.N3.regexPairs, goldPairs: card.checks.N3.goldPairs, verdicts: { N3a: card.verdicts.N3a, N3b: card.verdicts.N3b } }, readerAgreement: card.verdicts.N7 } : { gap: "gold-unavailable" },
      genericityVsHeldOutRepo: { design: "leave-one-repository-out inside TRAIN; names declared in >=2 of the other repos vs exactly 1, hit = declared in the held-out repo", pooledLift: real.pooled.lift, rateG: real.pooled.rateG, rateS: real.pooled.rateS, controlMedianLift: control.median, controlMaxLift: control.max, verdict: card.verdicts.N4 },
      gaps: [
        { gap: "members-and-bound-expressions-not-tallied", note: "methods, object-literal members and var/let-bound function expressions are not read by the recipe (see validity.recipeVsGrammar.overallRecall)" },
        { gap: "cjs-not-tallied", files: cjsFiles.length, declarationsTheRecipeWouldFind: cjsTally.declarations },
        { gap: "non-ascii-identifiers", nonAsciiDeclarations: xidN, of: xidTotal, note: "Unicode identifier names are not counted by the ASCII recipe" },
        { gap: "four-train-repos", note: `genericity at floor ${CONSTS.GENERIC_FLOOR} rests on ${tv.repos.length} repositories; a name is generic here only if it recurs in 2 of 4` },
        { gap: "no-typescript", note: "the js family also covers .ts/.tsx; this language's TRAIN split holds none, so this prior is javascript-only" },
      ],
      postHoc: postHocBlock(),
      note: "genericity is a fact about this language's own codebases: repos counts only the TRAIN repositories attesting the name through this recipe. The prior counts what the READER declares (the reader applies the same recipe, N7), false positives included; it is therefore not a list of real functions (see validity.recipeVsGrammar). A name never attested is admitted (null from genericityOf), never refused. The older priors/code-name-js.json mixes ts/tsx/js from the ethos tree (2 repositories, some of which the manifest assigns to dev/test): it is not held-out safe; this file is.",
    },
    counts: { files: tally.files, repos: tv.repos.length, totalBytes: files.filter((f) => inRecipeFamily(f.rel)).reduce((a, f) => a + f.bytes, 0), distinctNames: tally.names.size, totalDeclarations: tally.declarations, namesAtOrAboveGenericFloor: generic },
    names: mine,
    builtAt: new Date().toISOString(),
  };
  if (writePriors) {
    fs.mkdirSync(PRIORS, { recursive: true });
    fs.writeFileSync(path.join(PRIORS, "code-kw-javascript.json"), JSON.stringify(kwOut, null, 1) + "\n");
    fs.writeFileSync(path.join(PRIORS, "code-name-javascript.json"), JSON.stringify(nameOut, null, 1) + "\n");
  }
  card.files = { priors: writePriors ? [path.join(PRIORS, "code-kw-javascript.json"), path.join(PRIORS, "code-name-javascript.json")] : [], card: cardPath, lawPrior: lawPath };
  card.ms = Date.now() - t0;
  fs.writeFileSync(cardPath, JSON.stringify(card, null, 1));
  console.log(JSON.stringify({ verdicts: card.verdicts.summary, hard: hard.length, soft: soft.length, builtins: builtins.length, trainFiles: files.length, recipeFiles: tally.files, trainRepos: tv.repos.length, distinctNames: tally.names.size, genericNames: generic, declarations: tally.declarations, ms: card.ms }, null, 1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}
