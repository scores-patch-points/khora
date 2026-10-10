#!/usr/bin/env node
// build-python-priors.mjs: build the two RECEIVED priors for the programming language "python" from TRAIN ONLY, and measure them.
//
//   node eval/coding-competence/build-python-priors.mjs [--out DIR] [--priors DIR] [--no-write-priors]
//
// Writes (new files only):
//   native/priors/code-kw-python.json     CodeKeywordPrior@1  hard keywords (refuse), soft keywords + builtins (never refuse), stdlib modules
//   native/priors/code-name-python.json   CodeNamePrior@1     distinct-TRAIN-repo counts of declared def/class names (genericity)
//   <out>/card-python-priors-train.json   the measured card: every check below, with denominators, passes AND failures
//   <out>/python-law-prior.json           the giver's LanguageLawPrior@1 (python_kw_giver.py)
// <out> defaults to /private/tmp/claude-501/coding-competence/python-priors. It never opens a dev or test file.
//
// GIVERS (READING-POLICY rule 3: every prior names its giver):
//   code-kw-python: the tree-sitter grammar for python (tree-sitter-language-pack 1.21.0; upstream tree-sitter/tree-sitter-python, MIT)
//     for the word tokens, arbitrated by CPython (`python -I -S`) for which words are RESERVED. Derived by eval/coding-competence/
//     python_kw_giver.py (pre-registered in its own header, K1..K4), projected to the CodeKeywordPrior@1 schema by the EXISTING,
//     UNMODIFIED scripts/build-code-keyword-prior.mjs. No keyword is typed here and no corpus file is read to derive the keyword set;
//     TRAIN gold is read only to WITNESS it (R1..R5). Priors REFUSE (hard keywords) or NOMINATE (nothing), never admit.
//   code-name-python: a treebank-like corpus: the manifest's python TRAIN split (4 permissively licensed repositories, 240 files; the one
//     restricted file, python/cpython Lib_typing.py under PSF-2.0 which is not on the permitted list, is excluded and disclosed). The
//     declaration recipe is the family `py` recipe of scripts/build-code-name-prior-split.mjs, copied VERBATIM (it is also the ASCII
//     python recipe of adapters/text/code-structure.js, which is the recipe the reader applies, so prior and reader cannot drift).
//     Names are counted per distinct REPOSITORY, never per file, so near-duplicate files cannot inflate genericity.
//
// PRE-REGISTRATION (READING-POLICY II.5; this header was written BEFORE the first run of this file; thresholds are declared, never tuned,
// and every failure is reported as a failure).
//
// WHAT WAS SEEN BEFORE THIS HEADER (disclosed, nothing else was looked at):
//   (a) manifest.languages.python: TRAIN = 241 rows in 5 repositories (240 unrestricted in 4; 1 restricted cpython file); dev 3 repos; test 5.
//   (b) python_kw_giver.py was run once, unmodified (its header pre-registers K1..K4): hard = 35, soft = [_, case, exec, match, print, type],
//       K1 K2 K3 pass, K4 = 35 of 35 engine-reserved words parse cleanly as a def name in the grammar (so the grammar alone cannot arbitrate
//       reservedness; a spot check confirmed `def if(): pass` has no ERROR node while `def (: pass` does, so the probe is not blind).
//   (c) the new hard set equals priors/code-kw-py.json's hard set (the older CPython/pyodide-introspected prior); the soft sets differ
//       (the grammar adds exec, print).
//   (d) the header counts of the existing priors/code-name-train-py.json (a GOLD-recipe tally of the same TRAIN files by build-c2-priors.mjs):
//       2171 distinct names, 2722 declarations, 34 names attested in >= 2 repositories. N6 below is informed by that peek and is only a
//       sanity bound. No TRAIN token, definition or regex-recipe output had been looked at.
//
// PREDICTIONS AND PASS RULES (an unmeasured or unlicensed check is "unlicensed"/"gap", never "pass"):
//   K1..K4 (giver agreement, declarability, arbiter consistency, why-the-engine-arbitrates): rules in python_kw_giver.py; observed in (b).
//   K5 cross-giver agreement. The new hard set equals priors/code-kw-py.json's hard set. Pass: symmetric difference empty. Expected: pass.
//   K6 control for K1 (the statistic must move). The giver's word rule (c0_grammar_keywords.py, run UNMODIFIED) applied to the javascript, ruby,
//      go, c and java grammars gives candidate sets whose symmetric difference with python's hard set is >= 10 for EVERY one of them. Pass:
//      all five >= 10. Expected: pass (a rule that returned python's list for any grammar would be broken).
//   N1 reference equivalence (the sum check). My tally of (name -> repos, files, kinds) equals, entry for entry, the output of the
//      UNMODIFIED scripts/build-code-name-prior-split.mjs run on a staged TRAIN-only copy of the same files; and the independent per-repository
//      partition sums to the pooled attestation count. Pass: both exact. Expected: pass. FAILURE REFUSES THE WRITE (a drifted recipe).
//   N2 TRAIN purity. Every file read is a manifest python TRAIN row with restricted=false whose bytes match its manifest sha256 and whose path
//      is under the fetched raw corpus; every repository has manifest.repos[repo].global_split == "train", is permissive and unrestricted, and
//      appears in no python dev or test row; the repositories read equal info.repos.train minus the repositories that hold only restricted
//      rows. Pass: all exact. Expected: pass. FAILURE REFUSES THE WRITE.
//   N3 recipe validity against the grammar. Over (name, repo) attestations: precision = |regex AND gold| / |regex| >= 0.95 and recall =
//      |regex AND gold| / |gold| >= 0.90, where gold = the tree-sitter grammar's definition names of CORE kinds (gold.mjs CORE_DEF_KINDS; for
//      python: function, method, class, type). Expected: precision ~0.97, recall ~0.95. The misses are reported (names in strings/docstrings;
//      names the recipe cannot see), never patched.
//   N4 genericity is real, not an artefact of file counting (leave-one-REPOSITORY-out inside TRAIN, the only held-out available without
//      touching dev). For each TRAIN repo h, from the OTHER three: G = names declared in >= 2 of them, S = names declared in exactly 1. Hit =
//      the name is declared in h. lift = (hits_G / |G|) / (hits_S / |S|), pooled over the four folds. Pass: pooled lift >= 2.0 AND every
//      fold's lift > 1.0. CONTROL BUILT TO FAIL (II.23): in every fold each repository's declared-name set is replaced by an independent
//      uniform random subset of the pooled vocabulary of the same size (cross-repository identity destroyed; sizes kept), 200 seeded draws.
//      LICENCE: the control's median pooled lift is in [0.5, 1.5] and the real lift exceeds the control's MAXIMUM; otherwise the check is
//      "unlicensed" (the statistic did not move). Expected: pass, lift ~3 to 8, control median ~1.
//   N5 (informational, no pass rule). Recipe gap: declarations whose names contain non-ASCII identifier characters (PEP 3131) that the ASCII
//      recipe cannot spell or truncates. Reported with its denominator; the XID recipe lives in code-structure.js and is NOT mixed into this
//      tally (it would break the reference equivalence of N1).
//   N6 sanity bound (informed by peek (d)). distinct names in [1500, 3000] and names attested in >= 2 repositories in [25, 60].
//   R1 refusal polarity. Over every definition-name node the grammar gives in TRAIN (all kinds): ZERO names are in the hard keyword set (a
//      hard keyword can never name a being). LICENCE (control built to fail): the same count with the deranged-LANGUAGE hard set
//      (priors/code-kw-js.json) is >= 1, and with 35 words drawn at random from the declared-name vocabulary (200 seeded draws) its mean is
//      >= 1; otherwise the counter cannot fail and R1 is "unlicensed". Expected: real 0, JS control >= 1.
//   R2 token coverage. Of TRAIN gold tokens classed `keyword`, the fraction whose text is in (hard U soft) is >= 0.99. Control: the javascript
//      keyword set as the prior must cover at least 0.10 LESS (else unlicensed). Expected: pass; the texts outside the prior are listed.
//   R3 attestation. At least 33 of the 35 hard keywords occur in TRAIN as a structural token (gold class not comment, string or identifier).
//      Unattested words are listed (a typed gap: the keyword is received but unwitnessed). Expected: all or nearly all attested.
//   R4 no identifier collision. ZERO gold tokens of class identifier have a hard keyword as text. Offending files are listed if any.
//   R5 (informational, no pass rule) shadowing. TRAIN core definitions whose name is a builtin or a soft keyword, with counts and examples.
//      Prediction: > 0 builtin shadowings exist (supports the polarity: builtins and soft keywords are recorded and never refuse).
//
// LAWS APPLIED: causal (priors carry no whole-text statistic over a unit being judged; this file only counts); identity does not decay;
// priors refuse or nominate, never admit; capitalisation is not read anywhere (names are exact strings); every threshold above is declared;
// gaps are typed with denominators; held-out discipline (TRAIN only; the leave-one-repo-out is a TRAIN-internal split by repository); no model.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { goldBatch, goldAvailable, GOLD_VERSION, CORE_DEF_KINDS } from "./gold.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const NATIVE = path.resolve(HERE, "../..");
export const MANIFEST = process.env.PYPRIORS_MANIFEST || "/private/tmp/claude-501/code-corpus/manifest.json";
export const DEFAULT_OUT = process.env.PYPRIORS_OUT || "/private/tmp/claude-501/coding-competence/python-priors";
export const RAW_ROOT = "/private/tmp/claude-501/code-corpus/raw/";
const PYTHON = process.env.GOLD_PYTHON || "/private/tmp/claude-501/venv/bin/python";
const TS_CACHE = process.env.GOLD_TS_CACHE || "/private/tmp/claude-501/coding-competence/ts-cache";

// declared constants (header)
export const CONSTS = Object.freeze({
  GENERIC_FLOOR: 2, LIFT_MIN: 2.0, LIFT_FOLD_MIN: 1.0, CONTROL_MEDIAN_LO: 0.5, CONTROL_MEDIAN_HI: 1.5, CONTROL_DRAWS: 200,
  PRECISION_MIN: 0.95, RECALL_MIN: 0.90, K6_MIN_SYMDIFF: 10, R2_MIN: 0.99, R2_CONTROL_GAP: 0.10, R3_MIN_ATTESTED: 33,
  N6_NAMES: [1500, 3000], N6_GENERIC: [25, 60], SEED: "python-priors-v1",
});

// ── the recipe: family `py` of scripts/build-code-name-prior-split.mjs, VERBATIM ─────────────────────────────────────────────────────
export const RECIPE_SOURCE = "^[ \\t]*(?:async\\s+)?(def|class)\\s+([A-Za-z_]\\w*)";
export const RECIPE_FLAGS = "gm";
const RECIPE_XID = "^[ \\t]*(?:async\\s+)?(def|class)\\s+([\\p{ID_Start}_][\\p{ID_Continue}]*)";

/** declarationsOf(text) -> [{name, kind}] kind is "class" or "function" (the split builder's own mapping). */
export function declarationsOf(text) {
  const re = new RegExp(RECIPE_SOURCE, RECIPE_FLAGS);
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push({ name: m[2], kind: m[1] === "class" ? "class" : "function" });
  return out;
}

/** Declarations the ASCII recipe cannot spell or truncates: the XID recipe's name has a character outside [A-Za-z0-9_]. */
export function xidGap(text) {
  const re = new RegExp(RECIPE_XID, "gmu");
  let n = 0, total = 0;
  const examples = [];
  let m;
  while ((m = re.exec(text))) {
    total++;
    if (/[^A-Za-z0-9_]/.test(m[2])) { n++; if (examples.length < 5) examples.push(m[2]); }
  }
  return { nonAscii: n, total, examples };
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

export const attestationTotal = (names) => { let n = 0; for (const r of names.values()) n += r.repos.size; return n; };

/** names table as the prior stores it, alphabetical for a stable file */
export function namesObject(names) {
  const o = {};
  for (const k of [...names.keys()].sort()) { const r = names.get(k); o[k] = { repos: r.repos.size, files: r.files.size, kinds: [...r.kinds].sort() }; }
  return o;
}

/** Independent per-repository partition: tally each repository on its own; the sum of their distinct-name counts must equal the pooled attestation count. */
export function partitionSum(files) {
  const byRepo = new Map();
  for (const f of files) { if (!byRepo.has(f.repo)) byRepo.set(f.repo, []); byRepo.get(f.repo).push(f); }
  let sum = 0;
  for (const fs_ of byRepo.values()) sum += tallyNames(fs_).names.size;
  return sum;
}

/** Entry-for-entry comparison of my names table against a prior's `names` object. */
export function compareNameTables(mine, ref) {
  const a = new Set(Object.keys(mine)), b = new Set(Object.keys(ref));
  const onlyMine = [...a].filter((k) => !b.has(k)), onlyRef = [...b].filter((k) => !a.has(k));
  const differing = [];
  for (const k of a) {
    if (!b.has(k)) continue;
    const x = mine[k], y = ref[k];
    if (x.repos !== y.repos || x.files !== y.files || JSON.stringify([...x.kinds].sort()) !== JSON.stringify([...y.kinds].sort())) differing.push({ name: k, mine: x, ref: y });
  }
  return { equal: !onlyMine.length && !onlyRef.length && !differing.length, entries: a.size, refEntries: b.size, onlyMine: onlyMine.slice(0, 10), onlyRef: onlyRef.slice(0, 10), differing: differing.slice(0, 10), nOnlyMine: onlyMine.length, nOnlyRef: onlyRef.length, nDiffering: differing.length };
}

// ── deterministic randomness ──────────────────────────────────────────────────────────────────────────────────────────────────────
export function fnv1a(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** k distinct items drawn uniformly without replacement (partial Fisher-Yates over a copy) */
export function sampleWithoutReplacement(arr, k, rng) {
  const a = arr.slice();
  const n = Math.min(k, a.length);
  for (let i = 0; i < n; i++) { const j = i + Math.floor(rng() * (a.length - i)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

// ── N4: genericity predicts recurrence in an UNSEEN repository (leave-one-repository-out) ────────────────────────────────────────────
/** loroLift(perRepo: Map(repo -> Set(name)), floor) -> { folds:[...], pooled:{G,hitG,S,hitS,rateG,rateS,lift} } */
export function loroLift(perRepo, floor = CONSTS.GENERIC_FLOOR) {
  const repos = [...perRepo.keys()].sort();
  const folds = [];
  let G = 0, hitG = 0, S = 0, hitS = 0;
  for (const held of repos) {
    const others = repos.filter((r) => r !== held);
    const cnt = new Map();
    for (const o of others) for (const n of perRepo.get(o)) cnt.set(n, (cnt.get(n) || 0) + 1);
    const heldSet = perRepo.get(held);
    let g = 0, hg = 0, s = 0, hs = 0;
    for (const [n, c] of cnt) {
      if (c >= floor) { g++; if (heldSet.has(n)) hg++; } else { s++; if (heldSet.has(n)) hs++; }
    }
    G += g; hitG += hg; S += s; hitS += hs;
    folds.push({ heldOut: held, G: g, hitG: hg, S: s, hitS: hs, rateG: g ? hg / g : null, rateS: s ? hs / s : null, lift: g && s && hs ? (hg / g) / (hs / s) : null });
  }
  const rateG = G ? hitG / G : null, rateS = S ? hitS / S : null;
  return { folds, pooled: { G, hitG, S, hitS, rateG, rateS, lift: G && S && hitS ? rateG / rateS : null } };
}

/** The control: each repository's declared-name set replaced by an independent uniform random subset of the pooled vocabulary, same size. */
export function derangeRepoSets(perRepo, vocab, rng) {
  const out = new Map();
  for (const [repo, set] of perRepo) out.set(repo, new Set(sampleWithoutReplacement(vocab, set.size, rng)));
  return out;
}

export function controlLifts(perRepo, draws, seed, floor = CONSTS.GENERIC_FLOOR) {
  const vocab = [...new Set([...perRepo.values()].flatMap((s) => [...s]))].sort();
  const rng = mulberry32(fnv1a(`${seed}|loro-control`));
  const lifts = [];
  for (let d = 0; d < draws; d++) {
    const r = loroLift(derangeRepoSets(perRepo, vocab, rng), floor);
    if (r.pooled.lift != null) lifts.push(r.pooled.lift);
  }
  lifts.sort((a, b) => a - b);
  const q = (p) => (lifts.length ? lifts[Math.min(lifts.length - 1, Math.floor(p * lifts.length))] : null);
  return { draws, usable: lifts.length, min: lifts[0] ?? null, median: q(0.5), p95: q(0.95), max: lifts[lifts.length - 1] ?? null };
}

/** decideN4(real, control, consts) -> "pass" | "fail" | "unlicensed" */
export function decideN4(real, control, C = CONSTS) {
  const lic = control.median != null && control.median >= C.CONTROL_MEDIAN_LO && control.median <= C.CONTROL_MEDIAN_HI && real.pooled.lift != null && real.pooled.lift > control.max;
  if (!lic) return "unlicensed";
  const ok = real.pooled.lift >= C.LIFT_MIN && real.folds.every((f) => f.lift != null && f.lift > C.LIFT_FOLD_MIN);
  return ok ? "pass" : "fail";
}

// ── R1..R5: witnesses of the keyword prior against TRAIN gold ─────────────────────────────────────────────────────────────────────────
const NON_STRUCTURAL = new Set(["comment", "string", "identifier"]);

/**
 * witnessKeywords({ hard, soft, builtins, jsHard, jsSoft, docs, seed }) -> the R1..R5 measurements.
 *   docs: [{ repo, rel, text, gold }]  gold = a gold.mjs result (no `error`)
 */
export function witnessKeywords({ hard, soft, builtins, jsHard, jsSoft, docs, seed = CONSTS.SEED, draws = CONSTS.CONTROL_DRAWS }) {
  const hardSet = new Set(hard), softSet = new Set(soft), prior = new Set([...hard, ...soft]), jsSet = new Set([...(jsHard || []), ...(jsSoft || [])]);
  const builtinSet = new Set((builtins || []).filter((b) => !hardSet.has(b)));
  const kwTokens = new Map();               // text -> n   (class keyword)
  const attest = new Map(hard.map((w) => [w, 0]));
  const identCollisions = new Map();        // keyword text -> {n, files:Set}
  const declared = new Map();               // def name (any kind) -> n
  const coreShadow = { builtin: new Map(), soft: new Map() };
  let nTokens = 0, nDefs = 0, nCoreDefs = 0;
  for (const d of docs) {
    const g = d.gold;
    for (const t of g.tokens) {
      nTokens++;
      const cls = t.class;
      if (cls === "comment" || cls === "string") continue; // never a keyword, never an attestation, never a collision
      const txt = d.text.slice(t.start, t.end);
      if (cls === "keyword") kwTokens.set(txt, (kwTokens.get(txt) || 0) + 1);
      if (hardSet.has(txt)) {
        if (!NON_STRUCTURAL.has(cls)) attest.set(txt, attest.get(txt) + 1);
        if (cls === "identifier") { const r = identCollisions.get(txt) || { n: 0, files: new Set() }; r.n++; r.files.add(`${d.repo}/${d.rel}`); identCollisions.set(txt, r); }
      }
    }
    for (const df of g.defs) {
      nDefs++;
      declared.set(df.name, (declared.get(df.name) || 0) + 1);
      if (CORE_DEF_KINDS.includes(df.kind)) {
        nCoreDefs++;
        if (builtinSet.has(df.name)) coreShadow.builtin.set(df.name, (coreShadow.builtin.get(df.name) || 0) + 1);
        if (softSet.has(df.name)) coreShadow.soft.set(df.name, (coreShadow.soft.get(df.name) || 0) + 1);
      }
    }
  }
  const violations = (set) => { let n = 0; const ex = []; for (const [name, c] of declared) if (set.has(name)) { n += c; if (ex.length < 8) ex.push(name); } return { n, examples: ex }; };
  const real = violations(hardSet);
  const jsCtl = violations(new Set(jsHard || []));
  const vocab = [...declared.keys()].sort();
  const rng = mulberry32(fnv1a(`${seed}|r1-control`));
  let sum = 0;
  for (let d = 0; d < draws; d++) { const pick = new Set(sampleWithoutReplacement(vocab, hard.length, rng)); sum += violations(pick).n; }
  const randMean = draws ? sum / draws : null;

  let kwTotal = 0, kwIn = 0, kwInJs = 0;
  const outside = [];
  for (const [txt, n] of kwTokens) { kwTotal += n; if (prior.has(txt)) kwIn += n; else outside.push([txt, n]); if (jsSet.has(txt)) kwInJs += n; }
  outside.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const unattested = [...attest].filter(([, n]) => n === 0).map(([w]) => w);
  const mapToObj = (m) => Object.fromEntries([...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
  return {
    nTokens, nDefs, nCoreDefs, files: docs.length,
    R1: { hardViolations: real.n, violationExamples: real.examples, denominatorDefs: nDefs, jsControlViolations: jsCtl.n, jsControlExamples: jsCtl.examples, randomControlMean: randMean, randomControlDraws: draws },
    R2: { keywordTokens: kwTotal, inPrior: kwIn, coverage: kwTotal ? kwIn / kwTotal : null, controlJsCoverage: kwTotal ? kwInJs / kwTotal : null, outsidePrior: outside.slice(0, 25), distinctOutside: outside.length },
    R3: { hardWords: hard.length, attested: hard.length - unattested.length, unattested, counts: mapToObj(attest) },
    R4: { identifierCollisions: [...identCollisions].reduce((a, [, r]) => a + r.n, 0), words: Object.fromEntries([...identCollisions].map(([w, r]) => [w, { n: r.n, files: [...r.files].slice(0, 5) }])) },
    R5: { builtinShadowingDefs: [...coreShadow.builtin.values()].reduce((a, b) => a + b, 0), builtinShadowNames: mapToObj(coreShadow.builtin), softShadowingDefs: [...coreShadow.soft.values()].reduce((a, b) => a + b, 0), softShadowNames: mapToObj(coreShadow.soft), denominatorCoreDefs: nCoreDefs },
  };
}

export function decideR(w, C = CONSTS) {
  const r1Lic = w.R1.jsControlViolations >= 1 && w.R1.randomControlMean != null && w.R1.randomControlMean >= 1;
  const r2Lic = w.R2.coverage != null && w.R2.controlJsCoverage != null && w.R2.controlJsCoverage <= w.R2.coverage - C.R2_CONTROL_GAP;
  return {
    R1: !r1Lic ? "unlicensed" : w.R1.hardViolations === 0 ? "pass" : "fail",
    R2: !r2Lic ? "unlicensed" : w.R2.coverage >= C.R2_MIN ? "pass" : "fail",
    R3: w.R3.attested >= C.R3_MIN_ATTESTED ? "pass" : "fail",
    R4: w.R4.identifierCollisions === 0 ? "pass" : "fail",
    R5: w.R5.builtinShadowingDefs > 0 ? "informational:supports-polarity" : "informational:no-shadowing-seen",
  };
}

/** N3: regex recipe vs the grammar's CORE definition names, over (name, repo) attestations */
export function recipeVsGold(regexPerRepo, goldPairs) {
  const rx = new Set();
  for (const [repo, set] of regexPerRepo) for (const n of set) rx.add(`${repo}\t${n}`);
  let both = 0;
  const onlyRegex = [], onlyGold = [];
  for (const p of rx) { if (goldPairs.has(p)) both++; else onlyRegex.push(p); }
  for (const p of goldPairs) if (!rx.has(p)) onlyGold.push(p);
  const f = (a) => a.slice(0, 15).map((p) => p.replace("\t", " :: "));
  return { regexPairs: rx.size, goldPairs: goldPairs.size, both, precision: rx.size ? both / rx.size : null, recall: goldPairs.size ? both / goldPairs.size : null, onlyRegexExamples: f(onlyRegex), onlyGoldExamples: f(onlyGold), nOnlyRegex: onlyRegex.length, nOnlyGold: onlyGold.length };
}

// ── TRAIN purity (N2) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

/** verifyTrain(manifest, language) -> { rows, restricted, repos, problems:[...] }  Reads only TRAIN rows' bytes (sha256 integrity). */
export function verifyTrain(manifest, language = "python", { readBytes = true } = {}) {
  const L = manifest.languages[language];
  const problems = [];
  const rows = [], restricted = [];
  for (const r of L.train) (r.restricted ? restricted : rows).push(r);
  const devTest = new Set([...L.dev, ...L.test].map((r) => r.repo));
  const repos = [...new Set(rows.map((r) => r.repo))].sort();
  for (const repo of repos) {
    const m = manifest.repos[repo];
    if (!m) { problems.push(`repo ${repo} not in manifest.repos`); continue; }
    if (m.global_split !== "train") problems.push(`repo ${repo} global_split=${m.global_split}`);
    if (m.restricted) problems.push(`repo ${repo} is restricted`);
    if (m.license_class !== "permissive") problems.push(`repo ${repo} license_class=${m.license_class}`);
    if (devTest.has(repo)) problems.push(`repo ${repo} also appears in a ${language} dev/test row`);
  }
  const onlyRestricted = [...new Set(restricted.map((r) => r.repo))].filter((r) => !repos.includes(r)).sort();
  const infoTrain = [...(L.info?.repos?.train ?? [])].sort();
  const expect = infoTrain.filter((r) => !onlyRestricted.includes(r));
  if (JSON.stringify(expect) !== JSON.stringify(repos)) problems.push(`repos read ${JSON.stringify(repos)} != info.repos.train minus restricted-only ${JSON.stringify(expect)}`);
  for (const r of rows) {
    if (!r.path.startsWith(RAW_ROOT)) problems.push(`row ${r.repo}:${r.rel} is not under the fetched raw corpus (${r.path})`);
    if (readBytes) {
      let b = null;
      try { b = fs.readFileSync(r.path); } catch { problems.push(`row ${r.repo}:${r.rel} unreadable`); continue; }
      if (sha256(b) !== r.sha256) problems.push(`row ${r.repo}:${r.rel} sha256 mismatch`);
    }
  }
  return { rows, restricted, repos, onlyRestricted, problems };
}

export function trainDigest(rows) {
  return sha256(rows.map((r) => `${r.repo}\t${r.rel}\t${r.sha256}`).sort().join("\n"));
}

// ── main ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status}): ${(r.stderr || r.stdout || "").slice(-600)}`);
  return r;
}

async function main() {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const OUT = opt("--out", DEFAULT_OUT);
  const PRIORS = opt("--priors", path.join(NATIVE, "priors"));
  const writePriors = !argv.includes("--no-write-priors");
  fs.mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const card = { schema: "PythonPriorsCard@1", language: "python", split: "train", builtAt: new Date().toISOString(), goldVersion: GOLD_VERSION, consts: CONSTS, checks: {}, verdicts: {}, gaps: [] };
  const refuse = (why) => { card.refused = why; fs.writeFileSync(path.join(OUT, "card-python-priors-train.json"), JSON.stringify(card, null, 1)); console.error(`REFUSED: ${why}`); process.exit(1); };

  // ── N2 TRAIN purity ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const tv = verifyTrain(manifest, "python");
  card.checks.N2 = { rows: tv.rows.length, repos: tv.repos, excludedRestricted: tv.restricted.map((r) => ({ repo: r.repo, rel: r.rel, why: manifest.repos[r.repo]?.license })), problems: tv.problems };
  card.verdicts.N2 = tv.problems.length ? "fail" : "pass";
  if (tv.problems.length) refuse(`N2 TRAIN purity failed: ${tv.problems.slice(0, 3).join("; ")}`);
  const files = tv.rows.map((r) => ({ repo: r.repo, rel: r.rel, text: fs.readFileSync(r.path, "utf8"), bytes: r.bytes, row: r }));
  const digest = trainDigest(tv.rows);

  // ── the keyword giver and projection ────────────────────────────────────────────────────────────────────────────────────────────
  const lawPath = path.join(OUT, "python-law-prior.json");
  const giverOut = run(PYTHON, [path.join(HERE, "python_kw_giver.py"), lawPath]).stdout.trim().split("\n").pop();
  const law = JSON.parse(fs.readFileSync(lawPath, "utf8"));
  const kwTmp = path.join(OUT, "code-kw-python.builder-output.json");
  run(process.execPath, [path.join(NATIVE, "scripts/build-code-keyword-prior.mjs"), lawPath, kwTmp, "python"]);
  const kw = JSON.parse(fs.readFileSync(kwTmp, "utf8"));
  const hard = kw.keywords, soft = kw.softKeywords, builtins = kw.builtins;
  const dv = law.derivation;
  card.checks.K = { giverRun: JSON.parse(giverOut), K1: dv.checks.K1, K2: { pass: dv.checks.K2.pass, soft: dv.checks.K2.soft }, K3: dv.checks.K3, K4: dv.checks.K4 };
  card.verdicts.K1 = dv.checks.K1.pass ? "pass" : "fail"; card.verdicts.K2 = dv.checks.K2.pass ? "pass" : "fail"; card.verdicts.K3 = dv.checks.K3.pass ? "pass" : "fail";
  card.verdicts.K4 = dv.checks.K4.prediction_gt_0_held ? "pass" : "fail";

  // K5: agreement with the older CPython-introspected prior
  const oldKw = JSON.parse(fs.readFileSync(path.join(NATIVE, "priors/code-kw-py.json"), "utf8"));
  const sym = (a, b) => [...new Set([...a, ...b])].filter((x) => a.includes(x) !== b.includes(x)).sort();
  const k5 = sym(hard, oldKw.keywords);
  card.checks.K5 = { against: "priors/code-kw-py.json", symmetricDifference: k5, softOnlyHere: soft.filter((w) => !oldKw.softKeywords.includes(w)), softOnlyThere: oldKw.softKeywords.filter((w) => !soft.includes(w)) };
  card.verdicts.K5 = k5.length === 0 ? "pass" : "fail";

  // K6: the same word rule on other grammars must NOT return python's list (control for K1)
  const ctlOut = path.join(OUT, "grammar-keywords-controls.json");
  const ctlLangs = ["javascript", "ruby", "go", "c", "java"];
  run(PYTHON, [path.join(HERE, "c0_grammar_keywords.py"), ctlOut, ...ctlLangs]);
  const ctl = JSON.parse(fs.readFileSync(ctlOut, "utf8")).languages;
  card.checks.K6 = Object.fromEntries(ctlLangs.map((l) => [l, { candidates: ctl[l]?.keywords?.length ?? null, symmetricDifferenceWithPythonHard: ctl[l]?.keywords ? sym(hard, ctl[l].keywords).length : null, error: ctl[l]?.error ?? null }]));
  card.verdicts.K6 = ctlLangs.every((l) => (card.checks.K6[l].symmetricDifferenceWithPythonHard ?? -1) >= CONSTS.K6_MIN_SYMDIFF) ? "pass" : "fail";

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
  const ref = JSON.parse(fs.readFileSync(path.join(refOut, "code-name-py.json"), "utf8"));
  const cmp = compareNameTables(mine, ref.names);
  const partition = partitionSum(files);
  const attest = attestationTotal(tally.names);
  card.checks.N1 = { referenceBuilder: "scripts/build-code-name-prior-split.mjs (unmodified) on a TRAIN-only staged copy", referenceLog: refRun.stderr.trim().split("\n").slice(-3), compare: cmp, countsMatch: ref.counts.distinctNames === tally.names.size && ref.counts.totalDeclarations === tally.declarations && ref.counts.files === files.length && ref.counts.repos === tv.repos.length, partitionSum: partition, pooledAttestations: attest };
  card.verdicts.N1 = cmp.equal && card.checks.N1.countsMatch && partition === attest ? "pass" : "fail";
  if (card.verdicts.N1 !== "pass") refuse("N1 sum check failed: my tally differs from the reference split builder or the per-repo partition");

  // ── N5 recipe gap, N6 sanity ──────────────────────────────────────────────────────────────────────────────────────────────────────
  let xidN = 0, xidTotal = 0; const xidEx = [];
  for (const f of files) { const g = xidGap(f.text); xidN += g.nonAscii; xidTotal += g.total; for (const e of g.examples) if (xidEx.length < 8) xidEx.push(e); }
  card.checks.N5 = { nonAsciiDeclarations: xidN, ofDeclarationsSeenByXidRecipe: xidTotal, examples: xidEx };
  const generic = [...tally.names.values()].filter((r) => r.repos.size >= CONSTS.GENERIC_FLOOR).length;
  card.checks.N6 = { distinctNames: tally.names.size, namesAtOrAboveFloor: generic, boundsNames: CONSTS.N6_NAMES, boundsGeneric: CONSTS.N6_GENERIC };
  card.verdicts.N6 = tally.names.size >= CONSTS.N6_NAMES[0] && tally.names.size <= CONSTS.N6_NAMES[1] && generic >= CONSTS.N6_GENERIC[0] && generic <= CONSTS.N6_GENERIC[1] ? "pass" : "fail";

  // ── N4 leave-one-repository-out genericity, with the control built to fail ────────────────────────────────────────────────────────
  const real = loroLift(tally.perRepo);
  const control = controlLifts(tally.perRepo, CONSTS.CONTROL_DRAWS, CONSTS.SEED);
  const floor3 = loroLift(tally.perRepo, 3);
  card.checks.N4 = { real, control, informationalFloor3: floor3.pooled };
  card.verdicts.N4 = decideN4(real, control);

  // ── gold-dependent checks: N3 and R1..R5 ──────────────────────────────────────────────────────────────────────────────────────────
  const ga = goldAvailable();
  let docs = [];
  if (!ga.available) {
    card.gaps.push({ gap: "gold-unavailable", reason: ga.reason, affects: ["N3", "R1", "R2", "R3", "R4", "R5"] });
    for (const k of ["N3", "R1", "R2", "R3", "R4", "R5"]) card.verdicts[k] = "gap";
  } else {
    const golds = await goldBatch(files.map((f) => ({ language: "python", text: f.text, fileName: f.rel })));
    const bad = [];
    files.forEach((f, i) => { if (golds[i]?.error) bad.push({ file: `${f.repo}/${f.rel}`, error: String(golds[i].error).slice(0, 120) }); else docs.push({ repo: f.repo, rel: f.rel, text: f.text, gold: golds[i] }); });
    card.checks.goldFiles = { requested: files.length, parsed: docs.length, errors: bad, withParseError: docs.filter((d) => d.gold.parse?.has_error).length };
    // N3
    const goldPairs = new Set();
    for (const d of docs) for (const df of d.gold.defs) if (CORE_DEF_KINDS.includes(df.kind)) goldPairs.add(`${d.repo}\t${df.name}`);
    const docRepoSets = new Map([...tally.perRepo.keys()].map((r) => [r, new Set()]));
    // recipe pairs restricted to the files gold parsed (a file gold could not parse is out of both sides)
    const parsedKeys = new Set(docs.map((d) => `${d.repo}/${d.rel}`));
    for (const f of files) if (parsedKeys.has(`${f.repo}/${f.rel}`)) for (const dcl of declarationsOf(f.text)) docRepoSets.get(f.repo).add(dcl.name);
    const n3 = recipeVsGold(docRepoSets, goldPairs);
    card.checks.N3 = { ...n3, coreKinds: CORE_DEF_KINDS, thresholds: { precision: CONSTS.PRECISION_MIN, recall: CONSTS.RECALL_MIN } };
    card.verdicts.N3 = n3.precision != null && n3.recall != null && n3.precision >= CONSTS.PRECISION_MIN && n3.recall >= CONSTS.RECALL_MIN ? "pass" : "fail";
    // R1..R5
    const js = JSON.parse(fs.readFileSync(path.join(NATIVE, "priors/code-kw-js.json"), "utf8"));
    const w = witnessKeywords({ hard, soft, builtins, jsHard: js.keywords, jsSoft: js.softKeywords, docs });
    card.checks.R = w;
    Object.assign(card.verdicts, decideR(w));
  }
  card.verdicts.summary = Object.fromEntries(Object.entries(card.verdicts).filter(([k]) => k !== "summary"));

  // ── write the two priors ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  const trainRepos = tv.repos.map((r) => ({ repo: r, url: manifest.repos[r].url, commit: manifest.repos[r].commit, license: manifest.repos[r].license, fetched_at: manifest.repos[r].fetched_at, files: files.filter((f) => f.repo === r).length }));
  const libPath = path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/libs/libtree_sitter_python.dylib");
  const libSha = fs.existsSync(libPath) ? sha256(fs.readFileSync(libPath)) : null;
  const bundle = fs.existsSync(path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/bundles")) ? fs.readdirSync(path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/bundles")).find((x) => x.startsWith("macos-arm64-")) : null;
  const g = dv.grammar;
  const kwOut = {
    ...kw,
    provenance: {
      ...kw.provenance,
      giver: "tree-sitter grammar for python (tree-sitter-language-pack 1.21.0) for the word tokens, arbitrated by CPython 3.14.7 (`python -I -S`) for which words are reserved; hard = (grammar word tokens U grammar dedicated literal terminals) INTERSECT engine-refused",
      grammar: {
        name: "tree-sitter-python (the `python` grammar of the language pack)", language: "python", package: g.package, packageVersion: g.packageVersion, packageLicense: g.packageLicense, packageSource: g.packageSource,
        upstream: g.upstream, upstreamLicense: g.upstreamLicense, upstreamCommit: g.upstreamCommit, upstreamCommitNote: g.upstreamCommitNote,
        abi: g.abi, nodeKindCount: g.nodeKindCount, nodeKindFingerprintSha256: g.nodeKindFingerprintSha256, compiledLibrary: "libtree_sitter_python.dylib", compiledLibrarySha256: libSha,
        releaseBundle: bundle, releaseUrl: "https://github.com/xberg-io/tree-sitter-language-pack/releases/download/v1.21.0/parsers-macos-arm64.tar.zst",
        anonymousWordKinds: g.anonymousWordKinds, dedicatedLiteralTerminals: g.dedicatedLiteralTerminals, rule: g.rule,
      },
      engine: law.giver.engine,
      derivation: { script: "eval/coding-competence/python_kw_giver.py", projection: "scripts/build-code-keyword-prior.mjs (unmodified)", engineProbeForms: dv.engineProbeForms, softSources: dv.softSources, engineRefusedButNotGrammarToken: dv.engineRefusedButNotGrammarToken, grammarWordsEngineDoesNotRefuse: dv.grammarWordsEngineDoesNotRefuse, siteAddedBuiltinsExcluded: dv.siteAddedBuiltins, checks: { K1: card.verdicts.K1, K2: card.verdicts.K2, K3: card.verdicts.K3, K4: card.verdicts.K4, K5: card.verdicts.K5, K6: card.verdicts.K6 } },
      assembledBy: "eval/coding-competence/build-python-priors.mjs (adds the grammar, engine, derivation and TRAIN-witness provenance to the unmodified builder's output; the keyword lists are the builder's, untouched)",
      noCorpusRead: "the keyword set is derived from the grammar and the engine only; no corpus file is read to derive it",
      trainWitness: ga.available ? { split: "train", files: card.checks.R.files, repos: tv.repos.length, tokens: card.checks.R.nTokens, hardKeywordsAttested: card.checks.R.R3.attested, hardKeywordsUnattested: card.checks.R.R3.unattested, keywordTokenCoverage: card.checks.R.R2.coverage, hardKeywordsDeclaredAsNames: card.checks.R.R1.hardViolations, verdicts: { R1: card.verdicts.R1, R2: card.verdicts.R2, R3: card.verdicts.R3, R4: card.verdicts.R4 } } : { gap: "gold-unavailable" },
      polarity: "hard keywords refuse (cannot name a being); soft keywords (incl. the grammar's legacy tokens exec, print) and builtins are recorded and NEVER refuse; the older priors/code-kw-py.json (CPython/pyodide) carries the same hard set",
      builtAt: new Date().toISOString().slice(0, 10),
    },
  };
  const nameOut = {
    schema: "CodeNamePrior@1",
    language: "python",
    provenance: {
      giver: `per-language TRAIN-only measurement of the CodeNamePrior@1: the manifest's python TRAIN split (a treebank-like corpus of ${tv.repos.length} permissively licensed repositories); recipe identical to the family \`py\` recipe of scripts/build-code-name-prior-split.mjs and to the ASCII python recipes of adapters/text/code-structure.js; sum-checked entry for entry against the unmodified split builder run on the same files (${attest} (name, repo) attestations) and against an independent per-repository partition`,
      split: "train", family: "py", manifest: MANIFEST, manifestGeneratedAt: manifest.generated_at, splitRule: manifest.declared.split_rule,
      // trainRepos is an array of "owner/repo" STRINGS (the convention of priors/code-name-train-py.json, which eval/coding-competence/run.mjs
      // priorProvenance reads as strings; objects there are compared as "[object object]" and clear nothing); the details live beside it
      trainRepos: tv.repos, trainRepoFiles: Object.fromEntries(trainRepos.map((r) => [r.repo, r.files])), trainRepoDetails: trainRepos, trainFiles: files.length, trainFilesDigestSha256: digest,
      filesExcluded: { restricted_licence: tv.restricted.map((r) => ({ repo: r.repo, rel: r.rel, license: manifest.repos[r.repo]?.license })) },
      recipe: { source: RECIPE_SOURCE, flags: RECIPE_FLAGS, kinds: "def -> function, class -> class", note: "ASCII identifiers only (the split builder's recipe); the XID twin lives in code-structure.js and is not mixed in" },
      builder: "eval/coding-competence/build-python-priors.mjs", builtOn: new Date().toISOString().slice(0, 10),
      sumCheck: { reference: "scripts/build-code-name-prior-split.mjs (unmodified)", entryForEntryEqual: cmp.equal, entries: cmp.entries, perRepoPartitionSum: partition, pooledAttestations: attest },
      validity: ga.available ? { recipeVsGrammar: { precision: card.checks.N3.precision, recall: card.checks.N3.recall, regexPairs: card.checks.N3.regexPairs, goldPairs: card.checks.N3.goldPairs, verdict: card.verdicts.N3 } } : { gap: "gold-unavailable" },
      genericityVsHeldOutRepo: { design: "leave-one-repository-out inside TRAIN; names declared in >=2 of the other repos vs exactly 1, hit = declared in the held-out repo", pooledLift: real.pooled.lift, rateG: real.pooled.rateG, rateS: real.pooled.rateS, controlMedianLift: control.median, controlMaxLift: control.max, verdict: card.verdicts.N4 },
      gaps: [{ gap: "non-ascii-identifiers", nonAsciiDeclarations: xidN, of: xidTotal, note: "PEP 3131 names are not counted by the ASCII recipe" }, { gap: "four-train-repos", note: `genericity at floor ${CONSTS.GENERIC_FLOOR} rests on ${tv.repos.length} repositories; a name is generic here only if it recurs in 2 of 4` }],
      note: "genericity is a fact about this language's own codebases: repos counts only the TRAIN repositories attesting the name through this recipe. A name never attested is admitted (null from genericityOf), never refused. The older priors/code-name-py.json was built from the ethos tree, which holds repositories the manifest assigns to dev/test (e.g. pallets/flask, test): it is not held-out safe; this file is.",
    },
    counts: { files: files.length, repos: tv.repos.length, totalBytes: files.reduce((a, f) => a + f.bytes, 0), distinctNames: tally.names.size, totalDeclarations: tally.declarations, namesAtOrAboveGenericFloor: generic },
    names: mine,
    builtAt: new Date().toISOString(),
  };
  if (writePriors) {
    fs.mkdirSync(PRIORS, { recursive: true });
    fs.writeFileSync(path.join(PRIORS, "code-kw-python.json"), JSON.stringify(kwOut, null, 1) + "\n");
    fs.writeFileSync(path.join(PRIORS, "code-name-python.json"), JSON.stringify(nameOut, null, 1) + "\n");
  }
  card.files = { priors: writePriors ? [path.join(PRIORS, "code-kw-python.json"), path.join(PRIORS, "code-name-python.json")] : [], card: path.join(OUT, "card-python-priors-train.json"), lawPrior: lawPath };
  card.ms = Date.now() - t0;
  fs.writeFileSync(path.join(OUT, "card-python-priors-train.json"), JSON.stringify(card, null, 1));
  console.log(JSON.stringify({ verdicts: card.verdicts.summary, hard: hard.length, soft: soft.length, builtins: builtins.length, stdlib: kw.stdlibModules.length, trainFiles: files.length, trainRepos: tv.repos.length, distinctNames: tally.names.size, genericNames: generic, declarations: tally.declarations, ms: card.ms }, null, 1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}
