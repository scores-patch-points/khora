#!/usr/bin/env node
// build-typescript-priors.mjs: build the two RECEIVED priors for the programming language "typescript" from TRAIN ONLY, and measure them.
//
//   node eval/coding-competence/build-typescript-priors.mjs [--out DIR] [--priors DIR] [--no-write-priors]
//
// Writes (new files only):
//   native/priors/code-kw-typescript.json     CodeKeywordPrior@1  hard keywords (refuse BINDING names), soft keywords + engine ES builtins (never refuse)
//   native/priors/code-name-typescript.json   CodeNamePrior@1     distinct-TRAIN-repo counts of declared function/class names (genericity)
//   <out>/card-typescript-priors-train.json   the measured card: every check below, with denominators, passes AND failures
//   <out>/typescript-law-prior.json           the giver's LanguageLawPrior@1 (typescript_kw_giver.py + typescript_engine_probe.mjs)
// <out> defaults to /private/tmp/claude-501/coding-competence/typescript-priors. It never opens a dev or test file.
// This file mirrors build-python-priors.mjs (same statistics, same discipline; its generic helpers are IMPORTED, not copied). Where TypeScript
// differs from Python, the difference is a stated, pre-registered design decision (see SCOPE OF REFUSAL below).
//
// GIVERS (READING-POLICY rule 3: every prior names its giver):
//   code-kw-typescript: the tree-sitter grammar for typescript (tree-sitter-language-pack 1.21.0; upstream tree-sitter/tree-sitter-typescript, MIT) for
//     the word tokens, arbitrated by the TypeScript compiler (the language engine, a copy already on this machine) for which words are RESERVED and
//     for the ES builtins. Derived by eval/coding-competence/typescript_kw_giver.py (pre-registered in its own header, K1..K9), projected to the
//     CodeKeywordPrior@1 schema by the EXISTING, UNMODIFIED scripts/build-code-keyword-prior.mjs. No keyword is typed here and no corpus file is read
//     to derive the keyword set; TRAIN gold is read only to WITNESS it. Priors REFUSE (hard keywords) or NOMINATE (nothing), never admit.
//   code-name-typescript: a treebank-like corpus: the manifest's typescript TRAIN split (4 permissively licensed repositories, 240 .ts files). The
//     declaration recipe is the family `js` recipe of scripts/build-code-name-prior-split.mjs (three regexes: function, class, const-arrow), copied
//     VERBATIM; it is also the recipe adapters/text/code-structure.js applies to .ts files, so prior and reader cannot drift. Names are counted per
//     distinct REPOSITORY, never per file, so near-duplicate files cannot inflate genericity.
//
// SCOPE OF REFUSAL (a TypeScript fact, decided BEFORE any run; python has no analogue). In TypeScript a reserved word may name a PROPERTY or METHOD
// (`map.delete(k)`, `{ default: 1 }`, `class C { new() {} }`): the grammar types those tokens property_identifier and the engine accepts them. So the
// hard set means "cannot be a BINDING name" (function, class, const/let/var, parameter, type, interface, enum, namespace). The prior records this as
// `refusalScope` and `propertyNameDeclarable`; a consumer must apply the hard set only at binding positions. Consequences for the witnesses below:
// R1 and R4 are about BINDING positions (R1: binding-kind definitions; R4: tokens the grammar types `identifier` / `type_identifier`), while property
// positions are measured separately (R1b, informational) and are PREDICTED to carry hard words (that is the evidence the scope matters).
//
// PRE-REGISTRATION (READING-POLICY II.5; this header was written BEFORE the first run of this file AND before the first run of the giver;
// thresholds are declared, never tuned, and every failure is reported as a failure).
//
// WHAT WAS SEEN BEFORE THIS HEADER (disclosed, nothing else was looked at):
//   (a) manifest.languages.typescript: TRAIN = 240 rows, all `.ts`, none restricted, 4 repositories (TanStack/query, gradio-app/gradio,
//       hoppscotch/hoppscotch, xyflow/xyflow; 60 files each, 1,294,708 bytes), each permissive (mit / apache-2.0); dev 3 repos, test 3 repos; the
//       same four TRAIN repositories also appear in the javascript/tsx TRAIN lists, no TRAIN repository appears in a typescript dev/test row.
//   (b) the grammar's 73 anonymous word node kinds (listing only) and the two local TypeScript package versions (5.6.3, 4.2.4) with their SyntaxKind
//       range boundaries. The giver has NOT been run. No TRAIN token, definition, regex-recipe output or tally has been looked at, and no existing
//       TypeScript/JavaScript name tally was read (the old code-name-js.json blends ts/tsx/js/mjs/jsx and was built from the ethos tree).
//   (c) the sibling python builder's code and header (the pattern this file follows).
//
// PREDICTIONS AND PASS RULES (an unmeasured or unlicensed check is "unlicensed"/"gap", never "pass"):
//   K1..K9 (giver agreement, declarability, probe validity, grammar leniency, property declarability, cross-engine agreement, word-rule control, arbiter
//      moves the statistic, legacy-JS over-refusal): rules in typescript_kw_giver.py. Expected hard set: the 36 ES reserved words + 9 strict-mode
//      future-reserved words = 45; K1 pass, K2 pass, K3 pass, K4 > 0, K5 pass, K6 pass, K7 pass, K8 pass, K9 >= 8.
//   K10 cross-giver note (informational, no pass rule). Symmetric difference of the new hard set with priors/code-kw-js.json's hard set, with the
//      direction of each word (new-only = strict-mode words and null/true/false/this/super the JS rule lacks; old-only = contextual words the javascript
//      rule refuses but the engine declares legal). Prediction: both directions non-empty.
//   N1 reference equivalence (the sum check). My tally of (name -> repos, files, kinds) equals, entry for entry, the output (family js) of the
//      UNMODIFIED scripts/build-code-name-prior-split.mjs run on a staged TRAIN-only copy of the same files, the counts match, the reference's own
//      "blended == split" attestation line equals my pooled attestation count, and the independent per-repository partition sums to the pooled
//      attestation count. Pass: all exact. FAILURE REFUSES THE WRITE (a drifted recipe).
//   N2 TRAIN purity. Every file read is a manifest typescript TRAIN row with restricted=false whose bytes match its manifest sha256 and whose path is
//      under the fetched raw corpus; every repository has manifest.repos[repo].global_split == "train", is permissive and unrestricted, and appears in
//      no typescript dev or test row; the repositories read equal info.repos.train. Pass: all exact. FAILURE REFUSES THE WRITE.
//   N3 recipe validity against the grammar. gold = the tree-sitter grammar's definition names. N3a, comparable kinds {function, class} (the kinds the
//      three regexes can see), over (name, repo) attestations: precision = |regex AND gold| / |regex| >= 0.90 and recall = |regex AND gold| / |gold|
//      >= 0.70 (looser than python's 0.95 / 0.90 because TypeScript declares functions by forms the three regexes cannot see: typed arrow consts
//      `const f: T = () =>`, `export const f = function`, overload signatures; the 0.70 is a declared floor for "most declared functions/classes
//      are seen", not a tuned value). CONTROL BUILT TO FAIL (II.23): the same comparison against the gold of the NEXT repository (cyclic shift of
//      the sorted repository list); LICENCE: control precision and control recall are each < 0.5 x the real arm's, else N3 is "unlicensed".
//      N3b (informational, typed gap): the share of ALL gold core-kind pairs (function, method, class, interface, type, enum, module, ...) the recipe
//      sees, by kind, with denominators. Prediction: well under 0.6: the recipe is blind to interface / type / enum / method beings, and the
//      genericity table says nothing about them (reported as a gap, never hidden).
//   N4 genericity is real, not an artefact of file counting (leave-one-REPOSITORY-out inside TRAIN, the only held-out available without touching
//      dev). For each TRAIN repo h, from the OTHER three: G = names declared in >= 2 of them, S = names declared in exactly 1. Hit = the name is
//      declared in h. lift = (hits_G / |G|) / (hits_S / |S|), pooled over the four folds. Pass: pooled lift >= 2.0 AND every fold's lift > 1.0.
//      CONTROL BUILT TO FAIL (II.23): in every fold each repository's declared-name set is replaced by an independent uniform random subset of the
//      pooled vocabulary of the same size (cross-repository identity destroyed; sizes kept), 200 seeded draws. LICENCE: the control's median pooled
//      lift is in [0.5, 1.5] and the real lift exceeds the control's MAXIMUM; otherwise "unlicensed". Expected lift 1.5 to 8: this is the least certain
//      prediction (four repositories from four different ecosystems); a fail is reported as a fail.
//   N4g (informational, no pass rule). The same leave-one-repository-out lift computed over the GRAMMAR's core definition names (gold: all core kinds,
//      so interfaces, types, enums and methods too), with its own control: does genericity hold for the beings the recipe cannot see?
//   N5 (informational). Recipe gap: gold definition names that are not ASCII identifiers (the recipe's IDENT is ASCII), with denominator.
//   N6 sanity bound (declared without a peek). distinct names in [300, 2000] and names attested in >= 2 repositories in [3, 60].
//   R1 refusal polarity at BINDING positions. Over every gold definition of a BINDING kind (function, class, interface, type, enum, module,
//      constant, variable) ZERO names are in the hard set. LICENCE (control built to fail): the same count with each deranged-LANGUAGE hard set
//      (priors/code-kw-python.json, code-kw-go.json, code-kw-ruby.json) must be >= 1 for at least TWO of the three, and the mean count with |hard|
//      words drawn at random from the binding-name vocabulary (200 seeded draws) must be >= 1; otherwise "unlicensed". Expected: real 0.
//   R1b (informational). Gold definitions of PROPERTY kinds (method, property, field, variant) named by a hard word. Prediction: > 0 (a class
//      method named `delete`, a field named `default`, ...): the evidence that the hard set must not refuse property positions.
//   R2 token coverage. Of TRAIN gold tokens classed `keyword`, the fraction whose text is in (hard U soft) is >= 0.99. Control: each deranged-language
//      set (python, go, ruby) must cover at least 0.10 LESS (else unlicensed). The javascript prior's coverage is reported (informational neighbour,
//      no licence role; prediction: strictly below the typescript prior's, because TypeScript has keyword tokens javascript lacks). The texts outside
//      the prior are listed. Honest note: gold and the prior both read the same grammar, so R2 is partly circular; the control is the informative part.
//   R3 attestation. At least 80% of the hard words occur in TRAIN as a structural token (gold class not comment, string or identifier). Unattested
//      words are listed (a typed gap: received but unwitnessed). Expected: >= 36 of 45.
//   R4 no identifier collision at binding positions. ZERO gold tokens of node type `identifier` or `type_identifier` have a hard word as text.
//      LICENCE: with each deranged-language hard set the same count is >= 1 for at least TWO of the three. Offending files are listed if any
//      (a parse-error recovery artefact is reported as such, not dropped). R4b (informational): identifier-class tokens of PROPERTY node types
//      (property_identifier, shorthand_property_identifier*, ...) carrying a hard word: prediction > 0 (`.delete(`, `.catch(`, `.default`).
//   R5 (informational, no pass rule) shadowing. TRAIN binding-kind definitions whose name is an engine ES builtin or a soft keyword, with counts and
//      examples. Prediction: > 0 for soft keywords (`type`, `get`, `set`, `of`, `from` as names) and for builtins (supports the polarity: builtins
//      and soft keywords are recorded and never refuse).
//   R6 (informational) the arbiter earns its place. TRAIN binding-kind definitions and `identifier`-typed tokens whose text is a hard word of
//      priors/code-kw-js.json but NOT of the new hard set: what a gate built from the javascript grammar's word rule would have wrongly refused.
//      Prediction: > 0.
//
// FIRST FULL RUN (2026-10-06; reported as run, not tuned afterwards). Verdicts: N1 pass, N2 pass, N6 pass; R1 pass, R2 pass, R3 pass (41 of 44 hard words attested);
//   FAILURES, all reported as failures:
//   K1 fail (hard = 44, `this` is accepted as a `this` PARAMETER, see typescript_kw_giver.py); N3 fail (precision 0.585 vs the 0.90 floor: the const-arrow
//   recipe `const x = <anything up to the first =>` also matches non-function consts that merely CONTAIN an arrow function; recall 0.814 passes; the control
//   was licensed); N4 fail (pooled lift 9.24 clears the control, but ONE fold, xyflow/xyflow, has lift 0: 0 of 13 recurring names recur there, so "every
//   fold > 1.0" fails); R4 fail (15 `default` tokens typed `identifier` in one gradio file: `export { default as X } from ...`, a module export name).
//   Informational: N4g unlicensed (the gold core names show lift 0, G = 20 hits 0); N3b held (the recipe sees 48.8% of gold core pairs); R1b weak (2 property
//   definitions named `do`); R4b strong (61 property-position tokens: delete 22, catch 10, class 10, default 6, ...); R5 builtin shadowing = 0 (the PREDICTION
//   that builtins are shadowed FAILED; soft shadowing 5 held); R6 held (65 identifier tokens, 3 definitions the javascript rule would wrongly refuse).
//   The priors were written with these verdicts recorded in their provenance (python precedent); only N1 and N2 refuse the write.
// AMENDMENT 1 (made AFTER that run; every addition is INFORMATIONAL, no verdict above reads it, and no threshold or rule above was touched). To explain the
//   failures rather than hide them: N3c (regex pairs against gold definitions of ANY kind, and the gold kinds of the regex-only names), N3d (a STRICTER
//   const-arrow regex scored against the same gold: a PROPOSAL for the recipe's owner, scored on TRAIN only, never shipped here; it must be confirmed on DEV
//   before anyone adopts it) with N4t (N4 on its names), N4d (the recurring names of every fold with their hit flags, regex and gold universes), N4s (N4 on the
//   regex names the grammar also calls function/class), R4's followed-by-`as` split (a cue for an import/export specifier), K5b (module export-name
//   declarability, from the engine, see the giver), and the `verdicts` / `failedChecks` / `status` fields in each prior's provenance.
//
// LAWS APPLIED: causal (priors carry no whole-text statistic over a unit being judged; this file only counts); identity does not decay;
// priors refuse or nominate, never admit; capitalisation is not read anywhere (names are exact strings); every threshold above is declared;
// gaps are typed with denominators; held-out discipline (TRAIN only; the leave-one-repository-out is a TRAIN-internal split by repository); no model.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { goldBatch, goldAvailable, GOLD_VERSION, CORE_DEF_KINDS } from "./gold.mjs";
import {
  fnv1a, mulberry32, sampleWithoutReplacement, loroLift, controlLifts, decideN4, compareNameTables, attestationTotal, namesObject,
  verifyTrain, trainDigest, sha256, recipeVsGold, RAW_ROOT, MANIFEST,
} from "./build-python-priors.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const NATIVE = path.resolve(HERE, "../..");
export { MANIFEST, RAW_ROOT };
export const DEFAULT_OUT = process.env.TSPRIORS_OUT || "/private/tmp/claude-501/coding-competence/typescript-priors";
const PYTHON = process.env.GOLD_PYTHON || "/private/tmp/claude-501/venv/bin/python";
const TS_CACHE = process.env.GOLD_TS_CACHE || "/private/tmp/claude-501/coding-competence/ts-cache";
export const LANGUAGE = "typescript";

// declared constants (header)
export const CONSTS = Object.freeze({
  GENERIC_FLOOR: 2, LIFT_MIN: 2.0, LIFT_FOLD_MIN: 1.0, CONTROL_MEDIAN_LO: 0.5, CONTROL_MEDIAN_HI: 1.5, CONTROL_DRAWS: 200,
  N3_PRECISION_MIN: 0.90, N3_RECALL_MIN: 0.70, N3_CONTROL_FRACTION: 0.5, R2_MIN: 0.99, R2_CONTROL_GAP: 0.10, R3_MIN_FRACTION: 0.80,
  CONTROLS_MIN_FIRING: 2, N6_NAMES: [300, 2000], N6_GENERIC: [3, 60], SEED: "typescript-priors-v1",
});
export const BINDING_KINDS = Object.freeze(["function", "class", "interface", "type", "enum", "module", "constant", "variable"]);
export const PROPERTY_KINDS = Object.freeze(["method", "property", "field", "variant"]);
export const BINDING_TOKEN_TYPES = Object.freeze(["identifier", "type_identifier"]);
export const CONTROL_PRIORS = Object.freeze({ python: "code-kw-python.json", go: "code-kw-go.json", ruby: "code-kw-ruby.json" });

// ── the recipes: family `js` of scripts/build-code-name-prior-split.mjs, VERBATIM (source, flags, kind, in the reference order) ──────────────
export const RECIPES = Object.freeze([
  { source: String.raw`^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)`, flags: "gm", kind: "function" },
  { source: String.raw`^[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)`, flags: "gm", kind: "class" },
  { source: String.raw`^[ \t]*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=]*?\)?\s*=>`, flags: "gm", kind: "function" },
]);

// AMENDMENT 1 (informational arm, NOT the shipped recipe): the const-arrow regex tightened so the arrow must follow the parameter list, not merely occur
// somewhere later in the initialiser. Scored on TRAIN only; its owner must confirm it on DEV before any reader/prior adopts it.
export const STRICT_CONST_ARROW = String.raw`^[ \t]*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*(?:async\s+)?(?:<[^>]*>\s*)?(?:\((?:[^()]|\([^()]*\))*\)|[A-Za-z_$][\w$]*)\s*(?::\s*[^=\n]+?)?\s*=>`;
export function declarationsStrict(text) {
  const out = [];
  for (const r of [RECIPES[0], RECIPES[1], { source: STRICT_CONST_ARROW, flags: "gm", kind: "function" }]) {
    const re = new RegExp(r.source, r.flags);
    let m;
    while ((m = re.exec(text))) out.push({ name: m[1], kind: r.kind });
  }
  return out;
}

/** declarationsOf(text) -> [{name, kind}] in the reference builder's order (all matches of recipe 1, then 2, then 3). */
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
 * tallyNames(files) -> { names: Map(name -> {repos:Set, files:Set, kinds:Set}), perRepo: Map(repo -> Set(name)), declarations, files }
 *   files: [{ repo, rel, text }]
 */
export function tallyNames(files) {
  const names = new Map();
  const perRepo = new Map();
  let declarations = 0;
  for (const f of files) {
    if (!perRepo.has(f.repo)) perRepo.set(f.repo, new Set());
    for (const d of declarationsOf(f.text)) {
      declarations++;
      let rec = names.get(d.name);
      if (!rec) { rec = { repos: new Set(), files: new Set(), kinds: new Set() }; names.set(d.name, rec); }
      rec.repos.add(f.repo); rec.files.add(`${f.repo}/${f.rel}`); rec.kinds.add(d.kind);
      perRepo.get(f.repo).add(d.name);
    }
  }
  return { names, perRepo, declarations, files: files.length };
}

/** Independent per-repository partition: tally each repository on its own; the sum of their distinct-name counts must equal the pooled attestation count. */
export function partitionSum(files) {
  const byRepo = new Map();
  for (const f of files) { if (!byRepo.has(f.repo)) byRepo.set(f.repo, []); byRepo.get(f.repo).push(f); }
  let sum = 0;
  for (const fs_ of byRepo.values()) sum += tallyNames(fs_).names.size;
  return sum;
}

/** Non-ASCII definition names in a gold result (the recipe's identifier is ASCII-only). -> {nonAscii, total, examples} */
export function nonAsciiNames(golds) {
  let n = 0, total = 0;
  const examples = [];
  for (const g of golds) for (const d of g.defs) {
    if (!CORE_DEF_KINDS.includes(d.kind)) continue;
    total++;
    if (!/^[A-Za-z_$][\w$]*$/.test(d.name)) { n++; if (examples.length < 8) examples.push(d.name); }
  }
  return { nonAscii: n, total, examples };
}

/** loroDetail(perRepo, floor) -> [{heldOut, G:[{name, hit}]}]  the recurring names of every fold with their hit flags (AMENDMENT 1, diagnostic). */
export function loroDetail(perRepo, floor = CONSTS.GENERIC_FLOOR) {
  const repos = [...perRepo.keys()].sort();
  return repos.map((held) => {
    const cnt = new Map();
    for (const o of repos.filter((r) => r !== held)) for (const n of perRepo.get(o)) cnt.set(n, (cnt.get(n) || 0) + 1);
    const heldSet = perRepo.get(held);
    return { heldOut: held, G: [...cnt].filter(([, c]) => c >= floor).map(([name, c]) => ({ name, inOtherRepos: c, hit: heldSet.has(name) })).sort((a, b) => (a.name < b.name ? -1 : 1)) };
  });
}

/** N3 control: the recipe's per-repo name sets compared with the gold of the NEXT repository (cyclic shift of the sorted repo list). */
export function shiftedGoldPairs(goldByRepo) {
  const repos = [...goldByRepo.keys()].sort();
  const out = new Set();
  repos.forEach((r, i) => { const donor = repos[(i + 1) % repos.length]; for (const n of goldByRepo.get(donor)) out.add(`${r}\t${n}`); });
  return out;
}

export function decideN3(real, control, C = CONSTS) {
  const lic = real.precision != null && real.recall != null && control.precision != null && control.recall != null
    && control.precision < C.N3_CONTROL_FRACTION * real.precision && control.recall < C.N3_CONTROL_FRACTION * real.recall;
  if (!lic) return "unlicensed";
  return real.precision >= C.N3_PRECISION_MIN && real.recall >= C.N3_RECALL_MIN ? "pass" : "fail";
}

// ── R1..R6: witnesses of the keyword prior against TRAIN gold ─────────────────────────────────────────────────────────────────────────
const NON_STRUCTURAL = new Set(["comment", "string", "identifier"]);
const BINDING = new Set(BINDING_KINDS), PROPERTY = new Set(PROPERTY_KINDS), BTYPES = new Set(BINDING_TOKEN_TYPES);

/**
 * witnessTypescript({ hard, soft, builtins, controls:{name:[hard words]}, jsHard, jsSoft, docs, seed, draws }) -> the R1..R6 measurements.
 *   docs: [{ repo, rel, text, gold }]  gold = a gold.mjs result (no `error`)
 */
export function witnessTypescript({ hard, soft, builtins, controls = {}, jsHard = [], jsSoft = [], docs, seed = CONSTS.SEED, draws = CONSTS.CONTROL_DRAWS }) {
  const hardSet = new Set(hard), softSet = new Set(soft), prior = new Set([...hard, ...soft]), jsSet = new Set([...jsHard, ...jsSoft]);
  const builtinSet = new Set((builtins || []).filter((b) => !hardSet.has(b)));
  const ctlSets = Object.fromEntries(Object.entries(controls).map(([k, v]) => [k, new Set(v)]));
  const kwTokens = new Map();                           // text -> n   (class keyword)
  const attest = new Map(hard.map((w) => [w, 0]));
  const collisions = new Map();                         // hard text -> {n, files:Set, asFollowed}  (binding node types)
  const ctlCollisions = Object.fromEntries(Object.keys(ctlSets).map((k) => [k, 0]));
  const propHard = new Map();                           // hard text -> n  (identifier-class tokens in non-binding node types)
  const bindingDefs = new Map();                        // name -> n
  const propertyDefs = new Map();
  const otherKinds = new Map();
  const shadow = { builtin: new Map(), soft: new Map() };
  const jsOnlyHard = new Set(jsHard.filter((w) => !hardSet.has(w)));
  const legacy = { defs: new Map(), tokens: new Map() };
  let nTokens = 0, nDefs = 0, nBindingDefs = 0, nPropertyDefs = 0;
  for (const d of docs) {
    const g = d.gold;
    for (const t of g.tokens) {
      nTokens++;
      const cls = t.class;
      if (cls === "comment" || cls === "string") continue;
      const txt = d.text.slice(t.start, t.end);
      if (cls === "keyword") kwTokens.set(txt, (kwTokens.get(txt) || 0) + 1);
      if (hardSet.has(txt)) {
        if (!NON_STRUCTURAL.has(cls)) attest.set(txt, attest.get(txt) + 1);
        if (cls === "identifier") {
          if (BTYPES.has(t.type)) {
            const r = collisions.get(txt) || { n: 0, files: new Set(), asFollowed: 0 };
            r.n++; r.files.add(`${d.repo}/${d.rel}`);
            if (/^\s+as\s/.test(d.text.slice(t.end, t.end + 8))) r.asFollowed++; // cue for `{ default as X }` (informational split, AMENDMENT 1)
            collisions.set(txt, r);
          }
          else propHard.set(txt, (propHard.get(txt) || 0) + 1);
        }
      }
      if (cls === "identifier" && BTYPES.has(t.type)) {
        for (const [k, s] of Object.entries(ctlSets)) if (s.has(txt)) ctlCollisions[k]++;
        if (jsOnlyHard.has(txt)) legacy.tokens.set(txt, (legacy.tokens.get(txt) || 0) + 1);
      }
    }
    for (const df of g.defs) {
      nDefs++;
      if (BINDING.has(df.kind)) {
        nBindingDefs++;
        bindingDefs.set(df.name, (bindingDefs.get(df.name) || 0) + 1);
        if (builtinSet.has(df.name)) shadow.builtin.set(df.name, (shadow.builtin.get(df.name) || 0) + 1);
        if (softSet.has(df.name)) shadow.soft.set(df.name, (shadow.soft.get(df.name) || 0) + 1);
        if (jsOnlyHard.has(df.name)) legacy.defs.set(df.name, (legacy.defs.get(df.name) || 0) + 1);
      } else if (PROPERTY.has(df.kind)) {
        nPropertyDefs++;
        propertyDefs.set(df.name, (propertyDefs.get(df.name) || 0) + 1);
      } else otherKinds.set(df.kind, (otherKinds.get(df.kind) || 0) + 1);
    }
  }
  const count = (m, set) => { let n = 0; const ex = []; for (const [name, c] of m) if (set.has(name)) { n += c; if (ex.length < 8) ex.push(name); } return { n, examples: ex }; };
  const real = count(bindingDefs, hardSet);
  const ctlDefs = Object.fromEntries(Object.entries(ctlSets).map(([k, s]) => [k, count(bindingDefs, s)]));
  const vocab = [...bindingDefs.keys()].sort();
  const rng = mulberry32(fnv1a(`${seed}|r1-control`));
  let sum = 0;
  for (let d = 0; d < draws; d++) sum += count(bindingDefs, new Set(sampleWithoutReplacement(vocab, hard.length, rng))).n;
  const randMean = draws ? sum / draws : null;
  const propReal = count(propertyDefs, hardSet);

  let kwTotal = 0, kwIn = 0, kwInJs = 0;
  const kwInCtl = Object.fromEntries(Object.keys(ctlSets).map((k) => [k, 0]));
  const outside = [];
  for (const [txt, n] of kwTokens) {
    kwTotal += n;
    if (prior.has(txt)) kwIn += n; else outside.push([txt, n]);
    if (jsSet.has(txt)) kwInJs += n;
    for (const [k, s] of Object.entries(ctlSets)) if (s.has(txt)) kwInCtl[k] += n;
  }
  outside.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const unattested = [...attest].filter(([, n]) => n === 0).map(([w]) => w);
  const mapToObj = (m) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
  const sumVals = (m) => [...m.values()].reduce((a, b) => a + b, 0);
  return {
    nTokens, nDefs, nBindingDefs, nPropertyDefs, files: docs.length, otherKinds: mapToObj(otherKinds),
    R1: { hardViolations: real.n, violationExamples: real.examples, denominatorBindingDefs: nBindingDefs, controlViolations: Object.fromEntries(Object.entries(ctlDefs).map(([k, v]) => [k, v.n])),
      controlExamples: Object.fromEntries(Object.entries(ctlDefs).map(([k, v]) => [k, v.examples])), randomControlMean: randMean, randomControlDraws: draws, bindingKinds: BINDING_KINDS },
    R1b: { propertyDefsNamedByHardWord: propReal.n, examples: propReal.examples, denominatorPropertyDefs: nPropertyDefs, propertyKinds: PROPERTY_KINDS },
    R2: { keywordTokens: kwTotal, inPrior: kwIn, coverage: kwTotal ? kwIn / kwTotal : null, controlCoverage: Object.fromEntries(Object.entries(kwInCtl).map(([k, v]) => [k, kwTotal ? v / kwTotal : null])),
      jsNeighbourCoverage: kwTotal ? kwInJs / kwTotal : null, outsidePrior: outside.slice(0, 25), distinctOutside: outside.length },
    R3: { hardWords: hard.length, attested: hard.length - unattested.length, unattested, counts: mapToObj(attest) },
    R4: { identifierCollisions: [...collisions.values()].reduce((a, r) => a + r.n, 0), followedByAs: [...collisions.values()].reduce((a, r) => a + r.asFollowed, 0), words: Object.fromEntries([...collisions].map(([w, r]) => [w, { n: r.n, asFollowed: r.asFollowed, files: [...r.files].slice(0, 5) }])),
      bindingTokenTypes: BINDING_TOKEN_TYPES, controlCollisions: ctlCollisions },
    R4b: { propertyPositionTokensWithHardText: sumVals(propHard), distinctWords: propHard.size, counts: mapToObj(propHard) },
    R5: { builtinShadowingDefs: sumVals(shadow.builtin), builtinShadowNames: mapToObj(shadow.builtin), softShadowingDefs: sumVals(shadow.soft), softShadowNames: mapToObj(shadow.soft), denominatorBindingDefs: nBindingDefs },
    R6: { jsOnlyHardWords: [...jsOnlyHard].sort(), bindingDefsWronglyRefusedByJs: sumVals(legacy.defs), defNames: mapToObj(legacy.defs), identifierTokensWronglyRefusedByJs: sumVals(legacy.tokens), tokenNames: mapToObj(legacy.tokens) },
  };
}

export function decideR(w, C = CONSTS) {
  const firing = (obj) => Object.values(obj).filter((v) => v >= 1).length;
  const r1Lic = firing(w.R1.controlViolations) >= C.CONTROLS_MIN_FIRING && w.R1.randomControlMean != null && w.R1.randomControlMean >= 1;
  const r2Lic = w.R2.coverage != null && Object.values(w.R2.controlCoverage).length > 0 && Object.values(w.R2.controlCoverage).every((c) => c != null && c <= w.R2.coverage - C.R2_CONTROL_GAP);
  const r4Lic = firing(w.R4.controlCollisions) >= C.CONTROLS_MIN_FIRING;
  return {
    R1: !r1Lic ? "unlicensed" : w.R1.hardViolations === 0 ? "pass" : "fail",
    R1b: w.R1b.propertyDefsNamedByHardWord > 0 ? "informational:supports-binding-scope" : "informational:no-property-position-hard-word-seen",
    R2: !r2Lic ? "unlicensed" : w.R2.coverage >= C.R2_MIN ? "pass" : "fail",
    R3: w.R3.hardWords && w.R3.attested / w.R3.hardWords >= C.R3_MIN_FRACTION ? "pass" : "fail",
    R4: !r4Lic ? "unlicensed" : w.R4.identifierCollisions === 0 ? "pass" : "fail",
    R4b: w.R4b.propertyPositionTokensWithHardText > 0 ? "informational:supports-binding-scope" : "informational:no-property-position-hard-word-seen",
    R5: w.R5.builtinShadowingDefs + w.R5.softShadowingDefs > 0 ? "informational:supports-polarity" : "informational:no-shadowing-seen",
    R6: w.R6.bindingDefsWronglyRefusedByJs + w.R6.identifierTokensWronglyRefusedByJs > 0 ? "informational:arbiter-changes-the-answer" : "informational:no-difference-seen-on-train",
  };
}

// ── main ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status}): ${(r.stderr || r.stdout || "").slice(-600)}`);
  return r;
}
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sym = (a, b) => [...new Set([...a, ...b])].filter((x) => a.includes(x) !== b.includes(x)).sort();

async function main() {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const OUT = opt("--out", DEFAULT_OUT);
  const PRIORS = opt("--priors", path.join(NATIVE, "priors"));
  const writePriors = !argv.includes("--no-write-priors");
  fs.mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const cardPath = path.join(OUT, "card-typescript-priors-train.json");
  const card = { schema: "TypescriptPriorsCard@1", language: LANGUAGE, split: "train", builtAt: new Date().toISOString(), goldVersion: GOLD_VERSION, consts: CONSTS, checks: {}, verdicts: {}, gaps: [] };
  const refuse = (why) => { card.refused = why; fs.writeFileSync(cardPath, JSON.stringify(card, null, 1)); console.error(`REFUSED: ${why}`); process.exit(1); };

  // ── N2 TRAIN purity ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const manifest = readJson(MANIFEST);
  const tv = verifyTrain(manifest, LANGUAGE);
  card.checks.N2 = { rows: tv.rows.length, repos: tv.repos, excludedRestricted: tv.restricted.map((r) => ({ repo: r.repo, rel: r.rel, why: manifest.repos[r.repo]?.license })), problems: tv.problems };
  card.verdicts.N2 = tv.problems.length ? "fail" : "pass";
  if (tv.problems.length) refuse(`N2 TRAIN purity failed: ${tv.problems.slice(0, 3).join("; ")}`);
  const files = tv.rows.map((r) => ({ repo: r.repo, rel: r.rel, text: fs.readFileSync(r.path, "utf8"), bytes: r.bytes, row: r }));
  const digest = trainDigest(tv.rows);

  // ── the keyword giver and projection ────────────────────────────────────────────────────────────────────────────────────────────
  const lawPath = path.join(OUT, "typescript-law-prior.json");
  const giverOut = run(PYTHON, [path.join(HERE, "typescript_kw_giver.py"), lawPath]).stdout.trim().split("\n").pop();
  const law = readJson(lawPath);
  const kwTmp = path.join(OUT, "code-kw-typescript.builder-output.json");
  run(process.execPath, [path.join(NATIVE, "scripts/build-code-keyword-prior.mjs"), lawPath, kwTmp, LANGUAGE]);
  const kw = readJson(kwTmp);
  const hard = kw.keywords, soft = kw.softKeywords, builtins = kw.builtins;
  const dv = law.derivation;
  const ck = dv.checks;
  card.checks.K = { giverRun: JSON.parse(giverOut), K1: ck.K1, K2: ck.K2, K3: ck.K3, K4: ck.K4, K5: { pass: ck.K5.pass, declarable: ck.K5.declarable, hard: ck.K5.hard, refusedInPropertyPosition: ck.K5.refusedInPropertyPosition }, K5b: ck.K5b, K6: ck.K6, K7: ck.K7, K8: ck.K8, K9: ck.K9 };
  for (const k of ["K1", "K2", "K3", "K5", "K7", "K8"]) card.verdicts[k] = ck[k].pass ? "pass" : "fail";
  card.verdicts.K4 = ck.K4.prediction_gt_0_held ? "pass" : "fail";
  card.verdicts.K5b = ck.K5b.declarable === ck.K5b.hard ? "informational:all-hard-words-declarable-as-export-names" : "informational:some-refused";
  card.verdicts.K6 = ck.K6.pass === null ? "gap" : ck.K6.pass ? "pass" : "fail";
  card.verdicts.K9 = ck.K9.prediction_ge_8_held ? "informational:prediction-held" : "informational:prediction-failed";

  // K10: cross-giver note against the older javascript prior (informational)
  const oldJs = readJson(path.join(NATIVE, "priors/code-kw-js.json"));
  card.checks.K10 = { against: "priors/code-kw-js.json", newOnlyHard: hard.filter((w) => !oldJs.keywords.includes(w)), oldOnlyHard: oldJs.keywords.filter((w) => !hard.includes(w)), symmetricDifference: sym(hard, oldJs.keywords).length };
  card.verdicts.K10 = card.checks.K10.newOnlyHard.length && card.checks.K10.oldOnlyHard.length ? "informational:prediction-held" : "informational:prediction-failed";

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
  const refFiles = fs.readdirSync(refOut).filter((x) => x.startsWith("code-name-"));
  const ref = readJson(path.join(refOut, "code-name-js.json"));
  const refLine = (refRun.stderr.match(/sum check: (\d+) blended attestations = (\d+) split attestations/) || []);
  const cmp = compareNameTables(mine, ref.names);
  const partition = partitionSum(files);
  const attest = attestationTotal(tally.names);
  card.checks.N1 = {
    referenceBuilder: "scripts/build-code-name-prior-split.mjs (unmodified) on a TRAIN-only staged copy", referenceFilesWritten: refFiles, referenceLog: refRun.stderr.trim().split("\n").slice(-3), compare: cmp,
    countsMatch: ref.counts.distinctNames === tally.names.size && ref.counts.totalDeclarations === tally.declarations && ref.counts.files === files.length && ref.counts.repos === tv.repos.length,
    referenceBlendedAttestations: Number(refLine[1]) || null, referenceSplitAttestations: Number(refLine[2]) || null, partitionSum: partition, pooledAttestations: attest,
  };
  card.verdicts.N1 = cmp.equal && card.checks.N1.countsMatch && partition === attest && card.checks.N1.referenceBlendedAttestations === attest && card.checks.N1.referenceSplitAttestations === attest && refFiles.length === 1 ? "pass" : "fail";
  if (card.verdicts.N1 !== "pass") refuse("N1 sum check failed: my tally differs from the reference split builder, its blended tally, or the per-repo partition");

  // ── N6 sanity ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const generic = [...tally.names.values()].filter((r) => r.repos.size >= CONSTS.GENERIC_FLOOR).length;
  card.checks.N6 = { distinctNames: tally.names.size, namesAtOrAboveFloor: generic, boundsNames: CONSTS.N6_NAMES, boundsGeneric: CONSTS.N6_GENERIC };
  card.verdicts.N6 = tally.names.size >= CONSTS.N6_NAMES[0] && tally.names.size <= CONSTS.N6_NAMES[1] && generic >= CONSTS.N6_GENERIC[0] && generic <= CONSTS.N6_GENERIC[1] ? "pass" : "fail";

  // ── N4 leave-one-repository-out genericity, with the control built to fail ────────────────────────────────────────────────────────
  const real = loroLift(tally.perRepo);
  const control = controlLifts(tally.perRepo, CONSTS.CONTROL_DRAWS, CONSTS.SEED);
  card.checks.N4 = { real, control, informationalFloor3: loroLift(tally.perRepo, 3).pooled };
  card.verdicts.N4 = decideN4(real, control, CONSTS);

  // ── gold-dependent checks: N3, N3b, N4g, N5 and R1..R6 ────────────────────────────────────────────────────────────────────────────
  const ga = goldAvailable();
  let docs = [];
  let w = null;
  if (!ga.available) {
    card.gaps.push({ gap: "gold-unavailable", reason: ga.reason, affects: ["N3", "N3b", "N4g", "N5", "R1", "R2", "R3", "R4", "R5", "R6"] });
    for (const k of ["N3", "N3b", "N4g", "N5", "R1", "R2", "R3", "R4", "R5", "R6"]) card.verdicts[k] = "gap";
  } else {
    const golds = await goldBatch(files.map((f) => ({ language: LANGUAGE, text: f.text, fileName: f.rel })));
    const bad = [];
    files.forEach((f, i) => { if (golds[i]?.error) bad.push({ file: `${f.repo}/${f.rel}`, error: String(golds[i].error).slice(0, 120) }); else docs.push({ repo: f.repo, rel: f.rel, text: f.text, gold: golds[i] }); });
    const parseBad = docs.filter((d) => (d.gold.parse?.error_bytes_frac ?? 0) > 0.02).map((d) => ({ file: `${d.repo}/${d.rel}`, frac: d.gold.parse.error_bytes_frac }));
    card.checks.goldFiles = { requested: files.length, parsed: docs.length, errors: bad, withParseError: docs.filter((d) => d.gold.parse?.has_error).length, parseFailuresOver2pct: parseBad };
    const parsedKeys = new Set(docs.map((d) => `${d.repo}/${d.rel}`));
    // recipe pairs restricted to the files gold parsed (a file gold could not parse is out of both sides)
    const rxByRepo = new Map([...tally.perRepo.keys()].map((r) => [r, new Set()]));
    for (const f of files) if (parsedKeys.has(`${f.repo}/${f.rel}`)) for (const dcl of declarationsOf(f.text)) rxByRepo.get(f.repo).add(dcl.name);
    const goldCmp = new Map(), goldAll = new Map(), goldByKind = new Map();
    for (const r of rxByRepo.keys()) { goldCmp.set(r, new Set()); goldAll.set(r, new Set()); }
    for (const d of docs) for (const df of d.gold.defs) {
      if (!CORE_DEF_KINDS.includes(df.kind)) continue;
      goldAll.get(d.repo).add(df.name);
      const k = goldByKind.get(df.kind) || new Map(); if (!k.has(d.repo)) k.set(d.repo, new Set()); k.get(d.repo).add(df.name); goldByKind.set(df.kind, k);
      if (df.kind === "function" || df.kind === "class") goldCmp.get(d.repo).add(df.name);
    }
    const pairsOf = (m) => { const s = new Set(); for (const [r, set] of m) for (const n of set) s.add(`${r}\t${n}`); return s; };
    // N3a + control
    const n3 = recipeVsGold(rxByRepo, pairsOf(goldCmp));
    const n3ctl = recipeVsGold(rxByRepo, shiftedGoldPairs(goldCmp));
    card.checks.N3 = { comparableKinds: ["function", "class"], ...n3, control: { design: "gold of the next repository (cyclic shift)", precision: n3ctl.precision, recall: n3ctl.recall, both: n3ctl.both }, thresholds: { precision: CONSTS.N3_PRECISION_MIN, recall: CONSTS.N3_RECALL_MIN, controlFraction: CONSTS.N3_CONTROL_FRACTION } };
    card.verdicts.N3 = decideN3(n3, n3ctl);
    // N3b: coverage of ALL core kinds, by kind
    const rxPairs = pairsOf(rxByRepo);
    const byKind = {};
    let allSeen = 0, allTotal = 0;
    for (const [kind, m] of goldByKind) { const p = pairsOf(m); let seen = 0; for (const x of p) if (rxPairs.has(x)) seen++; byKind[kind] = { goldPairs: p.size, seenByRecipe: seen, share: p.size ? seen / p.size : null }; }
    const allPairs = pairsOf(goldAll);
    for (const x of allPairs) { allTotal++; if (rxPairs.has(x)) allSeen++; }
    card.checks.N3b = { goldCorePairs: allTotal, seenByRecipe: allSeen, share: allTotal ? allSeen / allTotal : null, byKind, note: "typed gap: the genericity table says nothing about the kinds the recipe cannot see (interface, type, enum, method, ...)" };
    card.verdicts.N3b = card.checks.N3b.share != null && card.checks.N3b.share < 0.6 ? "informational:prediction-held" : "informational:prediction-failed";
    // N3c (AMENDMENT 1, informational): are the recipe's names real declarations of ANY kind, and what does the grammar call the regex-only ones?
    const goldAnyByPair = new Map();
    for (const d of docs) for (const df of d.gold.defs) { const k = `${d.repo}\t${df.name}`; if (!goldAnyByPair.has(k)) goldAnyByPair.set(k, new Set()); goldAnyByPair.get(k).add(df.kind); }
    const cmpPairs = pairsOf(goldCmp);
    let anyBoth = 0; const onlyRegexKinds = {}; let onlyRegexN = 0;
    for (const x of rxPairs) {
      const kinds = goldAnyByPair.get(x);
      if (kinds) anyBoth++;
      if (!cmpPairs.has(x)) { onlyRegexN++; const label = kinds ? [...kinds].sort().join("+") : "(no grammar definition)"; onlyRegexKinds[label] = (onlyRegexKinds[label] || 0) + 1; }
    }
    card.checks.N3c = { regexPairs: rxPairs.size, regexPairsThatAreGoldDefinitionsOfAnyKind: anyBoth, share: rxPairs.size ? anyBoth / rxPairs.size : null, regexOnlyPairs: onlyRegexN, regexOnlyByGoldKind: Object.fromEntries(Object.entries(onlyRegexKinds).sort((a, b) => b[1] - a[1]).slice(0, 12)), note: "informational: every regex-only pair has NO grammar definition of any kind (the typescript def queries carry no constant/variable kind), i.e. the names are non-function consts whose initialiser merely CONTAINS an arrow, e.g. `const data = Array(n).fill(0).map((_, i) => ...)`" };
    card.verdicts.N3c = "informational";
    // N3d (AMENDMENT 1, informational): the stricter const-arrow arm against the same gold
    const strictByRepo = new Map([...tally.perRepo.keys()].map((r) => [r, new Set()]));
    for (const f of files) if (parsedKeys.has(`${f.repo}/${f.rel}`)) for (const dcl of declarationsStrict(f.text)) strictByRepo.get(f.repo).add(dcl.name);
    const n3d = recipeVsGold(strictByRepo, cmpPairs);
    card.checks.N3d = { recipe: "function + class (verbatim) + STRICT_CONST_ARROW", regexPairs: n3d.regexPairs, goldPairs: n3d.goldPairs, precision: n3d.precision, recall: n3d.recall, onlyRegexExamples: n3d.onlyRegexExamples.slice(0, 10), onlyGoldExamples: n3d.onlyGoldExamples.slice(0, 10), shipped: false, note: "informational proposal arm; scored on TRAIN, to be confirmed on DEV by the recipe's owner" };
    card.verdicts.N3d = "informational";
    const strictCmp = loroLift(strictByRepo);
    card.checks.N4t = { real: strictCmp, control: controlLifts(strictByRepo, CONSTS.CONTROL_DRAWS, `${CONSTS.SEED}|strict`), detail: loroDetail(strictByRepo), note: "informational: N4 on the names the strict recipe declares" };
    card.verdicts.N4t = `informational:${decideN4(strictCmp, card.checks.N4t.control, CONSTS)}`;
    // N4s (AMENDMENT 1, informational): N4 on the regex names the grammar ALSO calls function/class (the "true beings" subset)
    const trueBeings = new Map([...rxByRepo].map(([r, set]) => [r, new Set([...set].filter((n) => cmpPairs.has(`${r}\t${n}`)))]));
    const realS = loroLift(trueBeings);
    const controlS = controlLifts(trueBeings, CONSTS.CONTROL_DRAWS, `${CONSTS.SEED}|true-beings`);
    card.checks.N4s = { real: realS, control: controlS, note: "informational: regex names confirmed as function/class by the grammar" };
    card.verdicts.N4s = `informational:${decideN4(realS, controlS, CONSTS)}`;
    card.checks.N4d = { regex: loroDetail(rxByRepo), gold: loroDetail(goldAll), trueBeings: loroDetail(trueBeings), note: "AMENDMENT 1 diagnostic: the recurring names (G) of each fold with their hit flags" };
    // N4g: genericity over the grammar's core definition names (informational)
    const realG = loroLift(goldAll);
    const controlG = controlLifts(goldAll, CONSTS.CONTROL_DRAWS, `${CONSTS.SEED}|gold`);
    card.checks.N4g = { real: realG, control: controlG, note: "informational: all core kinds incl. methods, interfaces, types, enums" };
    card.verdicts.N4g = `informational:${decideN4(realG, controlG, CONSTS)}`;
    // N5
    card.checks.N5 = nonAsciiNames(docs.map((d) => d.gold));
    card.verdicts.N5 = "informational";
    // R1..R6
    const controls = {};
    for (const [lang, file] of Object.entries(CONTROL_PRIORS)) { try { controls[lang] = readJson(path.join(NATIVE, "priors", file)).keywords; } catch { card.gaps.push({ gap: "control-prior-missing", language: lang, file }); } }
    w = witnessTypescript({ hard, soft, builtins, controls, jsHard: oldJs.keywords, jsSoft: oldJs.softKeywords, docs });
    card.checks.R = w;
    Object.assign(card.verdicts, decideR(w));
  }
  card.verdicts.summary = Object.fromEntries(Object.entries(card.verdicts).filter(([k]) => k !== "summary"));

  // ── write the two priors ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  const trainRepos = tv.repos.map((r) => ({ repo: r, url: manifest.repos[r].url, commit: manifest.repos[r].commit, license: manifest.repos[r].license, fetched_at: manifest.repos[r].fetched_at, files: files.filter((f) => f.repo === r).length }));
  const libPath = path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/libs/libtree_sitter_typescript.dylib");
  const libSha = fs.existsSync(libPath) ? sha256(fs.readFileSync(libPath)) : null;
  const bundleDir = path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/bundles");
  const bundle = fs.existsSync(bundleDir) ? fs.readdirSync(bundleDir).find((x) => x.startsWith("macos-arm64-")) : null;
  const g = dv.grammar;
  const kwOut = {
    ...kw,
    refusalScope: {
      positions: "binding",
      meaning: "a hard word cannot be a BINDING name (function, class, const/let/var, parameter, type, interface, enum, namespace). It may be a PROPERTY or METHOD name (IdentifierName): apply the hard set only where the grammar types the token `identifier` / `type_identifier` at a declaration, never to `property_identifier` tokens.",
      propertyNameDeclarable: dv.propertyNameDeclarable,
      moduleSpecifierNameDeclarable: dv.moduleSpecifierNameDeclarable,
      alsoNotABinding: "the grammar types a module export name `identifier` (`export { default as X } from ...`, `import { default as X }`); that token is not a binding either (measured: R4, K5b)",
      derivedBy: "typescript_engine_probe.mjs forms P1 `class C { W() {} }`, P2 `({ W: 0 })`, P3 `x.W` (K5), P4 `import { W as y } from \"m\"`, P5 `export { x as W }` (K5b)",
    },
    provenance: {
      ...kw.provenance,
      giver: `tree-sitter grammar for typescript (tree-sitter-language-pack ${g.packageVersion}) for the word tokens, arbitrated by the TypeScript compiler ${law.giver.engine.version} for which words are reserved and for the ES builtins; hard = pool words the engine refuses on all four binding forms (pool = grammar word tokens U grammar dedicated literal terminals U the engine's scanner keyword table)`,
      grammar: {
        name: "tree-sitter-typescript (the `typescript` grammar of the language pack)", language: LANGUAGE, package: g.package, packageVersion: g.packageVersion, packageLicense: g.packageLicense, packageSource: g.packageSource,
        upstream: g.upstream, upstreamLicense: g.upstreamLicense, upstreamCommit: g.upstreamCommit, upstreamCommitNote: g.upstreamCommitNote,
        abi: g.abi, nodeKindCount: g.nodeKindCount, nodeKindFingerprintSha256: g.nodeKindFingerprintSha256, compiledLibrary: "libtree_sitter_typescript.dylib", compiledLibrarySha256: libSha,
        releaseBundle: bundle, releaseUrl: "https://github.com/xberg-io/tree-sitter-language-pack/releases/download/v1.21.0/parsers-macos-arm64.tar.zst",
        anonymousWordKinds: g.anonymousWordKinds, dedicatedLiteralTerminals: g.dedicatedLiteralTerminals, rule: g.rule,
      },
      engine: law.giver.engine,
      derivation: {
        script: "eval/coding-competence/typescript_kw_giver.py (+ typescript_engine_probe.mjs)", projection: "scripts/build-code-keyword-prior.mjs (unmodified)", engineProbeForms: dv.engineProbeForms, engineControls: dv.engineControls,
        engineTokenTable: dv.engineTokenTable, engineBuiltins: dv.engineBuiltins, stdlibModules: dv.stdlibModules, softSources: dv.softSources, partiallyRefused: dv.partiallyRefused, hardFromEngineOnly: dv.hardFromEngineOnly,
        engineRefusedButNotGrammarToken: dv.engineRefusedButNotGrammarToken, grammarWordsEngineDoesNotRefuse: dv.grammarWordsEngineDoesNotRefuse, engineProbeMessages: dv.engineProbeMessages,
        checks: Object.fromEntries(["K1", "K2", "K3", "K4", "K5", "K6", "K7", "K8", "K9", "K10"].map((k) => [k, card.verdicts[k]])),
      },
      verdicts: Object.fromEntries(["K1", "K2", "K3", "K4", "K5", "K6", "K7", "K8", "R1", "R2", "R3", "R4"].map((k) => [k, card.verdicts[k]])),
      failedChecks: ["K1", "K2", "K3", "K4", "K5", "K6", "K7", "K8", "R1", "R2", "R3", "R4"].filter((k) => card.verdicts[k] === "fail" || card.verdicts[k] === "unlicensed"),
      assembledBy: "eval/coding-competence/build-typescript-priors.mjs (adds the grammar, engine, derivation, refusal-scope and TRAIN-witness provenance to the unmodified builder's output; the keyword lists are the builder's, untouched)",
      noCorpusRead: "the keyword set is derived from the grammar and the engine only; no corpus file is read to derive it",
      trainWitness: ga.available ? {
        split: "train", files: w.files, repos: tv.repos.length, tokens: w.nTokens, hardKeywordsAttested: w.R3.attested, hardKeywordsUnattested: w.R3.unattested, keywordTokenCoverage: w.R2.coverage,
        hardKeywordsDeclaredAsBindingNames: w.R1.hardViolations, hardWordsAsPropertyNames: { propertyDefs: w.R1b.propertyDefsNamedByHardWord, propertyPositionTokens: w.R4b.propertyPositionTokensWithHardText },
        verdicts: { R1: card.verdicts.R1, R2: card.verdicts.R2, R3: card.verdicts.R3, R4: card.verdicts.R4 },
      } : { gap: "gold-unavailable" },
      polarity: "hard keywords refuse BINDING names (cannot name a being); soft keywords (the grammar's contextual tokens, predefined type names, `undefined`, ...) and engine ES builtins are recorded and NEVER refuse; hard words may still name properties and methods",
      gaps: [{ gap: "stdlibModules", status: "not_applicable", reason: "TypeScript has no engine-declared module list; module resolution is host-defined (node builtins are @types/node, a separate giver)" },
        { gap: "upstream-grammar-commit", status: "unrecorded", reason: "the installed pack records no upstream commit" }],
      builtAt: new Date().toISOString().slice(0, 10),
    },
  };
  const nameOut = {
    schema: "CodeNamePrior@1",
    language: LANGUAGE,
    provenance: {
      giver: `per-language TRAIN-only measurement of the CodeNamePrior@1: the manifest's typescript TRAIN split (a treebank-like corpus of ${tv.repos.length} permissively licensed repositories); recipe identical to the family \`js\` recipe of scripts/build-code-name-prior-split.mjs and to the js recipes adapters/text/code-structure.js applies to .ts files; sum-checked entry for entry against the unmodified split builder run on the same files (${attest} (name, repo) attestations, equal to its blended tally) and against an independent per-repository partition`,
      split: "train", family: "js", manifest: MANIFEST, manifestGeneratedAt: manifest.generated_at, splitRule: manifest.declared.split_rule,
      // trainRepos is an array of "owner/repo" STRINGS (the convention of priors/code-name-train-py.json); the details live beside it
      trainRepos: tv.repos, trainRepoFiles: Object.fromEntries(trainRepos.map((r) => [r.repo, r.files])), trainRepoDetails: trainRepos, trainFiles: files.length, trainFilesDigestSha256: digest,
      filesExcluded: { restricted_licence: tv.restricted.map((r) => ({ repo: r.repo, rel: r.rel, license: manifest.repos[r.repo]?.license })) },
      recipe: { sources: RECIPES.map((r) => ({ source: r.source, flags: r.flags, kind: r.kind })), note: "the three js-family recipes of the split builder, verbatim; ASCII identifiers only; sees function declarations, classes and const-arrow functions, NOT interfaces, type aliases, enums, namespaces or methods" },
      builder: "eval/coding-competence/build-typescript-priors.mjs", builtOn: new Date().toISOString().slice(0, 10),
      verdicts: Object.fromEntries(["N1", "N2", "N3", "N4", "N6"].map((k) => [k, card.verdicts[k]])),
      failedChecks: ["N1", "N2", "N3", "N4", "N6"].filter((k) => card.verdicts[k] === "fail" || card.verdicts[k] === "unlicensed"),
      status: "built and shipped WITH its failed checks recorded; read validity and genericityVsHeldOutRepo before relying on a genericity count",
      sumCheck: { reference: "scripts/build-code-name-prior-split.mjs (unmodified)", entryForEntryEqual: cmp.equal, entries: cmp.entries, perRepoPartitionSum: partition, pooledAttestations: attest, referenceBlendedAttestations: card.checks.N1.referenceBlendedAttestations },
      validity: ga.available ? {
        recipeVsGrammar: { comparableKinds: ["function", "class"], precision: card.checks.N3.precision, recall: card.checks.N3.recall, regexPairs: card.checks.N3.regexPairs, goldPairs: card.checks.N3.goldPairs, controlPrecision: card.checks.N3.control.precision, controlRecall: card.checks.N3.control.recall, verdict: card.verdicts.N3 },
        recipeBlindKinds: { goldCorePairs: card.checks.N3b.goldCorePairs, shareSeenByRecipe: card.checks.N3b.share, byKind: card.checks.N3b.byKind },
      } : { gap: "gold-unavailable" },
      genericityVsHeldOutRepo: { design: "leave-one-repository-out inside TRAIN; names declared in >=2 of the other repos vs exactly 1, hit = declared in the held-out repo", pooledLift: real.pooled.lift, rateG: real.pooled.rateG, rateS: real.pooled.rateS, controlMedianLift: control.median, controlMaxLift: control.max, verdict: card.verdicts.N4 },
      gaps: [
        { gap: "recipe-blind-kinds", note: "interface, type alias, enum, namespace and method declarations are not counted: a name is generic here only as a function/class/const-arrow name", measured: ga.available ? { shareOfGoldCorePairsSeen: card.checks.N3b.share } : null },
        { gap: "non-ascii-identifiers", nonAsciiDeclarations: ga.available ? card.checks.N5.nonAscii : null, of: ga.available ? card.checks.N5.total : null },
        { gap: "four-train-repos", note: `genericity at floor ${CONSTS.GENERIC_FLOOR} rests on ${tv.repos.length} repositories; a name is generic here only if it recurs in 2 of 4` },
        { gap: "ts-only", note: "built from .ts files only; .tsx and .js repositories are separate manifest languages; the old blended code-name-js.json mixes ts/tsx/js/mjs/jsx and was built from the ethos tree (not held-out safe)" },
      ],
      note: "genericity is a fact about this language's own codebases: repos counts only the TRAIN repositories attesting the name through this recipe. A name never attested is admitted (null from genericityOf), never refused.",
    },
    counts: { files: files.length, repos: tv.repos.length, totalBytes: files.reduce((a, f) => a + f.bytes, 0), distinctNames: tally.names.size, totalDeclarations: tally.declarations, namesAtOrAboveGenericFloor: generic },
    names: mine,
    builtAt: new Date().toISOString(),
  };
  if (writePriors) {
    fs.mkdirSync(PRIORS, { recursive: true });
    fs.writeFileSync(path.join(PRIORS, "code-kw-typescript.json"), JSON.stringify(kwOut, null, 1) + "\n");
    fs.writeFileSync(path.join(PRIORS, "code-name-typescript.json"), JSON.stringify(nameOut, null, 1) + "\n");
  }
  card.files = { priors: writePriors ? [path.join(PRIORS, "code-kw-typescript.json"), path.join(PRIORS, "code-name-typescript.json")] : [], card: cardPath, lawPrior: lawPath };
  card.ms = Date.now() - t0;
  fs.writeFileSync(cardPath, JSON.stringify(card, null, 1));
  console.log(JSON.stringify({ verdicts: card.verdicts.summary, hard: hard.length, soft: soft.length, builtins: builtins.length, trainFiles: files.length, trainRepos: tv.repos.length, distinctNames: tally.names.size, genericNames: generic, declarations: tally.declarations, ms: card.ms }, null, 1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}
