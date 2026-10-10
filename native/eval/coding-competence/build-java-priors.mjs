#!/usr/bin/env node
// build-java-priors.mjs: build the two RECEIVED priors for the programming language "java" from TRAIN ONLY, and measure them.
//
//   node eval/coding-competence/build-java-priors.mjs [--out DIR] [--priors DIR] [--replace-existing]
//
// Writes (new files only; see WRITE POLICY):
//   <priors>/code-kw-java.json    CodeKeywordPrior@1  hard keywords (refuse), soft keywords + java.lang builtins (never refuse), platform packages
//   <priors>/code-name-java.json  CodeNamePrior@1     distinct-TRAIN-repo counts of declared type/method/constructor names (genericity)
//   <out>/card-java-priors-train.json   the measured card: every check below, with denominators, passes AND failures
//   <out>/java-law-prior.json           the giver's LanguageLawPrior@1 (java_kw_giver.py)
// <out> defaults to /private/tmp/claude-501/coding-competence/java-priors; <priors> defaults to <out>/priors-candidate. It never opens a dev or test file.
//
// WRITE POLICY. native/priors/code-kw-java.json and code-name-java.json ALREADY EXIST (built by an earlier pass: scripts/build-code-keyword-prior.mjs
// from ethos/derived-priors/code-priors/java-language-law-prior-v1.json, and eval/coding-competence/build-c2-priors.mjs). The main agent owns existing
// priors (rule 10), so this script writes its candidates to <priors>, which defaults OUTSIDE the repository, and refuses to replace an existing file in
// any directory unless --replace-existing is passed. The card measures the EXISTING priors and the CANDIDATES side by side so the owner can decide.
//
// GIVERS (READING-POLICY rule 3: every prior names its giver):
//   code-kw-java: the tree-sitter grammar for java (tree-sitter-language-pack 1.21.0; upstream tree-sitter/tree-sitter-java, MIT) for the word tokens and
//     dedicated terminals, arbitrated by javac (OpenJDK 25.0.2; a second JDK, 17.0.x, as cross-version witness) for which words are RESERVED. Derived by
//     eval/coding-competence/java_kw_giver.py + JavaKwProbe.java (pre-registered in the header of the former: K1..K5, amendment A1, K8), projected to the
//     CodeKeywordPrior@1 schema by the EXISTING, UNMODIFIED scripts/build-code-keyword-prior.mjs. No keyword is typed here and no corpus file is read to
//     derive the keyword set; TRAIN gold is read only to WITNESS it (R1..R7). Priors REFUSE (hard keywords) or NOMINATE (nothing), never admit.
//   code-name-java: a treebank-like corpus: the manifest's java TRAIN split (4 permissively licensed repositories, 204 files). Labels are the definition names
//     of the grammar's own tags.scm (gold.mjs, tree-sitter-language-pack 1.21.0): class/interface/enum/record/annotation type names (kinds class, interface,
//     enum), method and constructor names (kind method). The reader (adapters/text/code-structure.js) has NO java declaration recipe, so there is no regex
//     recipe to keep in step with and no java family in scripts/build-code-name-prior-split.mjs; the tally is therefore the grammar's. Names are counted per
//     distinct REPOSITORY, never per file, so near-duplicate files cannot inflate genericity.
//
// PRE-REGISTRATION (READING-POLICY II.5; this header was written BEFORE the first run of this file; thresholds are declared, never tuned; every failure is
// reported as a failure; "unlicensed"/"gap" are never "pass").
//
// WHAT WAS SEEN BEFORE THIS HEADER (disclosed; nothing else was looked at):
//   (a) manifest.languages.java: TRAIN = 204 rows in 4 repositories (conductor-oss/conductor 60, eugenp/tutorials 60, google/flatbuffers 24,
//       xai-org/x-algorithm 60), all unrestricted; dev 3 repositories, test 3. No dev or test file was opened by anything.
//   (b) the existing priors/code-kw-java.json (59 hard words = the grammar's anonymous word kinds minus `@interface`, so it includes the contextual words
//       exports module open opens permits provides record requires sealed to transitive uses when with yield, and lacks boolean false null super this true
//       void), priors/code-ctx-java.json (its `settled` list of 41 words contains void this null boolean true false: words learned from TRAIN as never
//       declared, exactly the ones (b) lacks), and the header counts of priors/code-name-java.json (distinctNames 1245, totalDeclarations 1963,
//       namesAtOrAboveGenericFloor 20; the top names by repository count are build equals get getName getType hashCode read toString, all 3 of 4).
//   (c) gold's java definition kinds on one authored toy fixture (class, interface, enum, record -> class, annotation type -> interface, method,
//       constructor -> method; no fields, locals or parameters) and, on ONE TRAIN file, that `class` is gold class keyword and `String` is class type.
//   (d) java_kw_giver.py was run twice (its header: run 1, amendment A1, run 2): hard = 51, soft = 17 (_ exports module open opens permits provides record
//       requires sealed to transitive uses var when with yield), K1..K5 pass, K8 FALSE (`this` is accepted by the parser in the receiver-parameter slot and
//       refused only in attribution); K4 = 51 of 51 hard words parse cleanly as a field name in the grammar.
//   N6 and K7 below are informed by (b) and (d) and are sanity bounds, not discoveries.
//
// PREDICTIONS AND PASS RULES:
//   K1..K5, K8 (giver agreement, declarability, probe licence, why-the-engine-arbitrates, cross-version, amendment A1): rules and observations in
//      java_kw_giver.py's header; carried into the card as the giver observed them. K8 is reported as FALSE, not repaired.
//   K6 control for K1 (the statistic must move). The giver's word rule (c0_grammar_keywords.py, run UNMODIFIED) applied to the python, javascript, ruby,
//      go and c grammars gives candidate sets whose symmetric difference with java's hard set is >= 10 for EVERY one of them. Pass: all five >= 10.
//   K7 cross-giver comparison with the EXISTING priors/code-kw-java.json. Prediction (from (b)): new-hard minus old-hard = {boolean, false, null, super,
//      this, true, void} and old-hard minus new-hard = {exports, module, open, opens, permits, provides, record, requires, sealed, to, transitive, uses,
//      when, with, yield}; and every one of those 15 is in the NEW soft set. Pass: both sets exact and the 15 are soft.
//   N1 reference equivalence (the sum check). There is no java family in the unmodified split builder (it covers py, c, go, js), so the check is: my tally
//      of (name -> repos, files, kinds), built from gold defs by my own code, equals ENTRY FOR ENTRY priors/code-name-java.json (built by build-c2-priors.mjs
//      through a different code path: token units), including distinctNames and totalDeclarations; AND the independent per-repository partition sums to the
//      pooled attestation count. Pass: all exact. Expected: pass. A mismatch is reported; the candidate is still written, flagged `entryForEntryEqual:false`.
//   N2 TRAIN purity. Every file read is a manifest java TRAIN row with restricted=false whose bytes match its manifest sha256 and whose path is under the
//      fetched raw corpus; every repository has manifest.repos[repo].global_split == "train", is permissive and unrestricted, and appears in no java dev or
//      test row; the repositories read equal info.repos.train. Pass: all exact. Expected: pass. FAILURE REFUSES THE WRITE.
//   N3 label validity. Over (name, repo) pairs: a DIRECT tree-sitter node-type walk (java_decl_walk.py, independent of gold.py's tags.scm queries) versus the
//      gold CORE definition names. Precision = |walk AND gold| / |walk| >= 0.98 and recall = |walk AND gold| / |gold| >= 0.98 (two readings of one grammar
//      must agree almost exactly; a larger gap means one of them mislabels). Expected: ~1.0 both; misses are reported, never patched.
//   N4 genericity is real, not an artefact of file counting (leave-one-REPOSITORY-out inside TRAIN, the only held-out available without touching dev). For
//      each TRAIN repo h, from the OTHER three: G = names declared in >= 2 of them, S = names declared in exactly 1. Hit = the name is declared in h. lift =
//      (hits_G / |G|) / (hits_S / |S|), pooled over the four folds. Pass: pooled lift >= 2.0 AND every fold's lift > 1.0. CONTROL BUILT TO FAIL (II.23): in
//      every fold each repository's declared-name set is replaced by an independent uniform random subset of the pooled vocabulary of the same size
//      (cross-repository identity destroyed; sizes kept), 200 seeded draws. LICENCE: the control's median pooled lift is in [0.5, 1.5] and the real lift
//      exceeds the control's MAXIMUM; otherwise the check is "unlicensed" (the statistic did not move). Expected: pass, lift well above 2 (boilerplate such
//      as equals/hashCode/toString/get/build recurs across repositories); G is small (tens of names), so a single fold may be noisy: reported per fold.
//   N5 (informational, no pass rule). Declared names that are not plain ASCII identifiers (unicode or `$`), with their denominator.
//   N6 sanity bound (informed by (b)). distinct names in [800, 2000] and names attested in >= 2 repositories in [10, 40].
//   R1 refusal polarity. Over every definition-name node the grammar gives in TRAIN (all kinds): ZERO names are in the hard keyword set (a hard keyword can
//      never name a being). LICENCE (control built to fail): the same count with the deranged-LANGUAGE hard set (priors/code-kw-js.json) is >= 1, and with 51
//      words drawn at random from the declared-name vocabulary (200 seeded draws) its mean is >= 1; otherwise the counter cannot fail and R1 is "unlicensed".
//      The EXISTING java prior is run through the same counter as a second control; prediction: it FAILS R1 (>= 1 violation: methods named like a contextual
//      keyword, e.g. open / record / with / to / when are legal names of beings).
//   R2 token coverage. Of TRAIN gold tokens classed `keyword`, the fraction whose text is in (hard U soft) is >= 0.99. Control: the javascript keyword set
//      as the prior must cover at least 0.10 LESS (else unlicensed). The texts outside the prior are listed.
//   R3 attestation. At least ceil(0.9 * |hard|) of the hard keywords occur in TRAIN as a structural token (gold class not comment, string or identifier).
//      Unattested words are listed (a typed gap: the keyword is received but unwitnessed).
//   R4 no identifier collision. ZERO gold tokens of class identifier have a hard keyword as text. LICENCE: the EXISTING java prior, run through the same
//      counter, has >= 1 collision (its contextual words are lexed by the grammar as plain identifiers in ordinary code); otherwise the counter cannot
//      fail and R4 is "unlicensed". Offending words are listed.
//   R5 (informational, no pass rule) shadowing. TRAIN core definitions whose name is a java.lang builtin or a soft keyword, with counts and examples.
//      Prediction: > 0 soft-keyword shadowings exist (supports the polarity: soft words are recorded and never refuse).
//   R6 (informational) soft words as identifiers. For each soft word, gold identifier tokens with that text in TRAIN. Prediction: > 0 for at least 5 of the 17.
//   R7 (informational) the closed-class gap the old giver left. The name gate's settled non-name list (priors/code-ctx-java.json) intersected with the
//      NEW hard minus the OLD hard. Prediction: contains void this null boolean true false (6); `super` and others may or may not be there.
//
// LAWS APPLIED: causal (priors carry no whole-text statistic over a unit being judged; this file only counts); identity does not decay; priors refuse or
// nominate, never admit; capitalisation is not read anywhere (names are exact strings); every threshold above is declared; gaps are typed with denominators;
// held-out discipline (TRAIN only; the leave-one-repo-out is a TRAIN-internal split by repository); no model.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { goldBatch, goldAvailable, GOLD_VERSION, CORE_DEF_KINDS } from "./gold.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const NATIVE = path.resolve(HERE, "../..");
export const MANIFEST = process.env.JAVAPRIORS_MANIFEST || "/private/tmp/claude-501/code-corpus/manifest.json";
export const DEFAULT_OUT = process.env.JAVAPRIORS_OUT || "/private/tmp/claude-501/coding-competence/java-priors";
export const RAW_ROOT = "/private/tmp/claude-501/code-corpus/raw/";
const PYTHON = process.env.GOLD_PYTHON || "/private/tmp/claude-501/venv/bin/python";
const TS_CACHE = process.env.GOLD_TS_CACHE || "/private/tmp/claude-501/coding-competence/ts-cache";

// declared constants (header)
export const CONSTS = Object.freeze({
  GENERIC_FLOOR: 2, LIFT_MIN: 2.0, LIFT_FOLD_MIN: 1.0, CONTROL_MEDIAN_LO: 0.5, CONTROL_MEDIAN_HI: 1.5, CONTROL_DRAWS: 200,
  N3_MIN: 0.98, K6_MIN_SYMDIFF: 10, R2_MIN: 0.99, R2_CONTROL_GAP: 0.10, R3_FRACTION: 0.9,
  N6_NAMES: [800, 2000], N6_GENERIC: [10, 40], SEED: "java-priors-v1",
});

// ── the tally: names declared in TRAIN, from the grammar's own definition nodes (gold CORE kinds) ───────────────────────────────────────
export const isWordLike = (t) => /^[\p{L}_$]/u.test(t);

/**
 * tallyNames(docs) -> { names: Map(name -> {repos:Set, files:Set, kinds:Set}), perRepo: Map(repo -> Set(name)), declarations, files, defsDropped }
 *   docs: [{ repo, rel, text, gold }]  gold = a gold.mjs result (no `error`). A name token declares once (unique nameStart per file); its kind is the
 *   first core kind gold gives that token. Non-word-like names are dropped and counted.
 */
export function tallyNames(docs) {
  const names = new Map();
  const perRepo = new Map();
  let declarations = 0, defsDropped = 0, nameMismatch = 0;
  for (const d of docs) {
    if (!perRepo.has(d.repo)) perRepo.set(d.repo, new Set());
    const seen = new Set();
    for (const df of d.gold.defs ?? []) {
      if (!CORE_DEF_KINDS.includes(df.kind)) continue;
      if (seen.has(df.nameStart)) continue;
      const name = d.text.slice(df.nameStart, df.nameEnd);
      if (!isWordLike(name)) { defsDropped++; continue; }
      seen.add(df.nameStart);
      if (name !== df.name) nameMismatch++;
      declarations++;
      let rec = names.get(name);
      if (!rec) { rec = { repos: new Set(), files: new Set(), kinds: new Set() }; names.set(name, rec); }
      rec.repos.add(d.repo); rec.files.add(`${d.repo}/${d.rel}`); rec.kinds.add(df.kind);
      perRepo.get(d.repo).add(name);
    }
  }
  return { names, perRepo, declarations, files: docs.length, defsDropped, nameMismatch };
}

export const attestationTotal = (names) => { let n = 0; for (const r of names.values()) n += r.repos.size; return n; };

/** names table as the prior stores it, alphabetical for a stable file */
export function namesObject(names) {
  const o = {};
  for (const k of [...names.keys()].sort()) { const r = names.get(k); o[k] = { repos: r.repos.size, files: r.files.size, kinds: [...r.kinds].sort() }; }
  return o;
}

/** Independent per-repository partition: tally each repository on its own; the sum of their distinct-name counts must equal the pooled attestation count. */
export function partitionSum(docs) {
  const byRepo = new Map();
  for (const d of docs) { if (!byRepo.has(d.repo)) byRepo.set(d.repo, []); byRepo.get(d.repo).push(d); }
  let sum = 0;
  for (const ds of byRepo.values()) sum += tallyNames(ds).names.size;
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

// ── N4: genericity predicts recurrence in an UNSEEN repository (leave-one-repository-out) ────────────────────────────────────────
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

/** N3: a second reading (node-type walk) vs the gold CORE definition names, over (name, repo) pairs */
export function pairsAgreement(walkPairs, goldPairs) {
  let both = 0;
  const onlyWalk = [], onlyGold = [];
  for (const p of walkPairs) { if (goldPairs.has(p)) both++; else onlyWalk.push(p); }
  for (const p of goldPairs) if (!walkPairs.has(p)) onlyGold.push(p);
  const f = (a) => a.slice(0, 15).map((p) => p.replace("\t", " :: "));
  return { walkPairs: walkPairs.size, goldPairs: goldPairs.size, both, precision: walkPairs.size ? both / walkPairs.size : null, recall: goldPairs.size ? both / goldPairs.size : null, onlyWalkExamples: f(onlyWalk), onlyGoldExamples: f(onlyGold), nOnlyWalk: onlyWalk.length, nOnlyGold: onlyGold.length };
}

// ── R1..R7: witnesses of a keyword prior against TRAIN gold ──────────────────────────────────────────────────────────────────────────
const NON_STRUCTURAL = new Set(["comment", "string", "identifier"]);

/**
 * witnessKeywords({ hard, soft, builtins, jsHard, jsSoft, docs, seed, draws }) -> the R1..R6 measurements.
 *   docs: [{ repo, rel, text, gold }]  gold = a gold.mjs result (no `error`)
 */
export function witnessKeywords({ hard, soft, builtins, jsHard, jsSoft, docs, seed = CONSTS.SEED, draws = CONSTS.CONTROL_DRAWS }) {
  const hardSet = new Set(hard), softSet = new Set(soft), prior = new Set([...hard, ...soft]), jsSet = new Set([...(jsHard || []), ...(jsSoft || [])]);
  const builtinSet = new Set((builtins || []).filter((b) => !hardSet.has(b)));
  const kwTokens = new Map();               // text -> n   (class keyword)
  const attest = new Map(hard.map((w) => [w, 0]));
  const identCollisions = new Map();        // keyword text -> {n, files:Set}
  const softIdent = new Map(soft.map((w) => [w, 0]));
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
      if (softSet.has(txt) && cls === "identifier") softIdent.set(txt, softIdent.get(txt) + 1);
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
    R6: { softWordsAsIdentifier: mapToObj(softIdent), softWordsSeenAsIdentifier: [...softIdent.values()].filter((n) => n > 0).length, softWords: soft.length },
  };
}

/** decideR(w, existing, C) -> verdicts. `existing` = the same witness run for the EXISTING prior (the control built to fail), or null. */
export function decideR(w, existing, C = CONSTS) {
  const r1Lic = w.R1.jsControlViolations >= 1 && w.R1.randomControlMean != null && w.R1.randomControlMean >= 1;
  const r2Lic = w.R2.coverage != null && w.R2.controlJsCoverage != null && w.R2.controlJsCoverage <= w.R2.coverage - C.R2_CONTROL_GAP;
  const r4Lic = existing != null && existing.R4.identifierCollisions >= 1;
  return {
    R1: !r1Lic ? "unlicensed" : w.R1.hardViolations === 0 ? "pass" : "fail",
    R2: !r2Lic ? "unlicensed" : w.R2.coverage >= C.R2_MIN ? "pass" : "fail",
    R3: w.R3.attested >= Math.ceil(C.R3_FRACTION * w.R3.hardWords) ? "pass" : "fail",
    R4: !r4Lic ? "unlicensed" : w.R4.identifierCollisions === 0 ? "pass" : "fail",
    R5: w.R5.softShadowingDefs > 0 ? "informational:supports-polarity" : "informational:no-soft-shadowing-seen",
    R6: w.R6.softWordsSeenAsIdentifier >= 5 ? "informational:prediction-held" : "informational:prediction-not-held",
  };
}

// ── TRAIN purity (N2) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

/** verifyTrain(manifest, language) -> { rows, restricted, repos, problems:[...] }  Reads only TRAIN rows' bytes (sha256 integrity). */
export function verifyTrain(manifest, language = "java", { readBytes = true } = {}) {
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

export const symDiff = (a, b) => { const A = new Set(a), B = new Set(b); return [...new Set([...A, ...B])].filter((x) => A.has(x) !== B.has(x)).sort(); };

/** K7: the new hard set against the existing prior's, with the pre-registered expected sets */
export function compareKeywordPriors(newHard, newSoft, oldHard, expected) {
  const nh = new Set(newHard), oh = new Set(oldHard), ns = new Set(newSoft);
  const newOnly = [...nh].filter((w) => !oh.has(w)).sort();
  const oldOnly = [...oh].filter((w) => !nh.has(w)).sort();
  const exact = JSON.stringify(newOnly) === JSON.stringify([...expected.newOnly].sort()) && JSON.stringify(oldOnly) === JSON.stringify([...expected.oldOnly].sort());
  const oldOnlyNowSoft = oldOnly.filter((w) => ns.has(w));
  return { newOnly, oldOnly, expectedNewOnly: expected.newOnly, expectedOldOnly: expected.oldOnly, exact, oldOnlyNowSoft, allOldOnlyAreSoft: oldOnlyNowSoft.length === oldOnly.length, pass: exact && oldOnlyNowSoft.length === oldOnly.length };
}

// ── main ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status}): ${(r.stderr || r.stdout || "").slice(-600)}`);
  return r;
}
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

async function main() {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const OUT = opt("--out", DEFAULT_OUT);
  const PRIORS = opt("--priors", path.join(OUT, "priors-candidate"));
  const replaceExisting = argv.includes("--replace-existing");
  fs.mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const card = { schema: "JavaPriorsCard@1", language: "java", split: "train", builtAt: new Date().toISOString(), goldVersion: GOLD_VERSION, consts: CONSTS, checks: {}, verdicts: {}, gaps: [] };
  const refuse = (why) => { card.refused = why; fs.writeFileSync(path.join(OUT, "card-java-priors-train.json"), JSON.stringify(card, null, 1)); console.error(`REFUSED: ${why}`); process.exit(1); };

  // ── N2 TRAIN purity ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const manifest = readJson(MANIFEST);
  const tv = verifyTrain(manifest, "java");
  card.checks.N2 = { rows: tv.rows.length, repos: tv.repos, excludedRestricted: tv.restricted.map((r) => ({ repo: r.repo, rel: r.rel, why: manifest.repos[r.repo]?.license })), problems: tv.problems };
  card.verdicts.N2 = tv.problems.length ? "fail" : "pass";
  if (tv.problems.length) refuse(`N2 TRAIN purity failed: ${tv.problems.slice(0, 3).join("; ")}`);
  const files = tv.rows.map((r) => ({ repo: r.repo, rel: r.rel, path: r.path, text: fs.readFileSync(r.path, "utf8"), bytes: r.bytes, row: r }));
  const digest = trainDigest(tv.rows);

  // ── the keyword giver and projection ────────────────────────────────────────────────────────────────────────────────────────────
  const lawPath = path.join(OUT, "java-law-prior.json");
  const giverOut = run(PYTHON, [path.join(HERE, "java_kw_giver.py"), lawPath]).stdout.trim().split("\n").pop();
  const law = readJson(lawPath);
  const kwTmp = path.join(OUT, "code-kw-java.builder-output.json");
  run(process.execPath, [path.join(NATIVE, "scripts/build-code-keyword-prior.mjs"), lawPath, kwTmp, "java"]);
  const kw = readJson(kwTmp);
  const hard = kw.keywords, soft = kw.softKeywords, builtins = kw.builtins;
  const dv = law.derivation;
  card.checks.K = { giverRun: JSON.parse(giverOut), K1: dv.checks.K1, K2: { pass: dv.checks.K2.pass, soft: dv.checks.K2.soft, acceptedPositions: dv.checks.K2.acceptedPositions }, K3: dv.checks.K3, K4: dv.checks.K4, K5: dv.checks.K5, K8: dv.checks.K8 };
  card.verdicts.K1 = dv.checks.K1.pass ? "pass" : "fail"; card.verdicts.K2 = dv.checks.K2.pass ? "pass" : "fail"; card.verdicts.K3 = dv.checks.K3.pass ? "pass" : "fail";
  card.verdicts.K4 = dv.checks.K4.prediction_gt_0_held ? "pass" : "fail"; card.verdicts.K5 = dv.checks.K5.pass ? "pass" : "fail"; card.verdicts.K8 = dv.checks.K8.pass ? "pass" : "fail";

  // K6: the same word rule on other grammars must NOT return java's list (control for K1)
  const ctlOut = path.join(OUT, "grammar-keywords-controls.json");
  const ctlLangs = ["python", "javascript", "ruby", "go", "c"];
  run(PYTHON, [path.join(HERE, "c0_grammar_keywords.py"), ctlOut, ...ctlLangs]);
  const ctl = readJson(ctlOut).languages;
  card.checks.K6 = Object.fromEntries(ctlLangs.map((l) => [l, { candidates: ctl[l]?.keywords?.length ?? null, symmetricDifferenceWithJavaHard: ctl[l]?.keywords ? symDiff(hard, ctl[l].keywords).length : null, error: ctl[l]?.error ?? null }]));
  card.verdicts.K6 = ctlLangs.every((l) => (card.checks.K6[l].symmetricDifferenceWithJavaHard ?? -1) >= CONSTS.K6_MIN_SYMDIFF) ? "pass" : "fail";

  // K7: the EXISTING java keyword prior
  const oldKwPath = path.join(NATIVE, "priors/code-kw-java.json");
  const oldKw = fs.existsSync(oldKwPath) ? readJson(oldKwPath) : null;
  if (oldKw) {
    const k7 = compareKeywordPriors(hard, soft, oldKw.keywords, {
      newOnly: ["boolean", "false", "null", "super", "this", "true", "void"],
      oldOnly: ["exports", "module", "open", "opens", "permits", "provides", "record", "requires", "sealed", "to", "transitive", "uses", "when", "with", "yield"],
    });
    card.checks.K7 = { against: "priors/code-kw-java.json", oldHard: oldKw.keywords.length, newHard: hard.length, ...k7 };
    card.verdicts.K7 = k7.pass ? "pass" : "fail";
  } else { card.gaps.push({ gap: "no-existing-java-keyword-prior" }); card.verdicts.K7 = "gap"; }

  // ── gold ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const ga = goldAvailable();
  let docs = [];
  if (!ga.available) {
    card.gaps.push({ gap: "gold-unavailable", reason: ga.reason, affects: ["N1", "N3", "N4", "N5", "N6", "R1", "R2", "R3", "R4", "R5", "R6", "R7"] });
    refuse("gold unavailable: the name prior is the grammar's tally and cannot be built without it");
  }
  const golds = await goldBatch(files.map((f) => ({ language: "java", text: f.text, fileName: f.rel })));
  const bad = [];
  files.forEach((f, i) => { if (golds[i]?.error) bad.push({ file: `${f.repo}/${f.rel}`, error: String(golds[i].error).slice(0, 120) }); else docs.push({ repo: f.repo, rel: f.rel, path: f.path, text: f.text, gold: golds[i] }); });
  card.checks.goldFiles = { requested: files.length, parsed: docs.length, errors: bad, withParseError: docs.filter((d) => d.gold.parse?.has_error).length };

  // ── N1 sum check, N5, N6 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  const tally = tallyNames(docs);
  const mine = namesObject(tally.names);
  const oldNamePath = path.join(NATIVE, "priors/code-name-java.json");
  const oldName = fs.existsSync(oldNamePath) ? readJson(oldNamePath) : null;
  const partition = partitionSum(docs);
  const attest = attestationTotal(tally.names);
  if (oldName) {
    const cmp = compareNameTables(mine, oldName.names);
    card.checks.N1 = { reference: "priors/code-name-java.json (build-c2-priors.mjs, token-unit path); there is no java family in the unmodified split builder", compare: cmp, countsMatch: oldName.counts.distinctNames === tally.names.size && oldName.counts.totalDeclarations === tally.declarations && oldName.counts.files === docs.length && oldName.counts.repos === tv.repos.length, refCounts: oldName.counts, mineCounts: { distinctNames: tally.names.size, totalDeclarations: tally.declarations, files: docs.length, repos: tv.repos.length }, partitionSum: partition, pooledAttestations: attest, defsDropped: tally.defsDropped, nameMismatch: tally.nameMismatch };
    card.verdicts.N1 = cmp.equal && card.checks.N1.countsMatch && partition === attest ? "pass" : "fail";
  } else { card.gaps.push({ gap: "no-existing-java-name-prior" }); card.verdicts.N1 = partition === attest ? "pass-partition-only" : "fail"; card.checks.N1 = { partitionSum: partition, pooledAttestations: attest }; }
  let nonPlain = 0; const nonPlainEx = [];
  for (const n of tally.names.keys()) if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) { nonPlain++; if (nonPlainEx.length < 8) nonPlainEx.push(n); }
  card.checks.N5 = { nonPlainAsciiNames: nonPlain, ofDistinctNames: tally.names.size, examples: nonPlainEx };
  const generic = [...tally.names.values()].filter((r) => r.repos.size >= CONSTS.GENERIC_FLOOR).length;
  card.checks.N6 = { distinctNames: tally.names.size, namesAtOrAboveFloor: generic, boundsNames: CONSTS.N6_NAMES, boundsGeneric: CONSTS.N6_GENERIC };
  card.verdicts.N6 = tally.names.size >= CONSTS.N6_NAMES[0] && tally.names.size <= CONSTS.N6_NAMES[1] && generic >= CONSTS.N6_GENERIC[0] && generic <= CONSTS.N6_GENERIC[1] ? "pass" : "fail";

  // ── N3 label validity: a direct node-type walk vs gold ───────────────────────────────────────────────────────────────────────────
  const walkIn = JSON.stringify(docs.map((d, i) => ({ id: i, path: d.path })));
  const walkRun = run(PYTHON, [path.join(HERE, "java_decl_walk.py")], { input: walkIn });
  const walkOut = JSON.parse(walkRun.stdout);
  const walkPairs = new Set(), goldPairs = new Set();
  for (const w of walkOut) for (const [name] of w.decls) walkPairs.add(`${docs[w.id].repo}\t${name}`);
  for (const d of docs) for (const df of d.gold.defs) if (CORE_DEF_KINDS.includes(df.kind)) goldPairs.add(`${d.repo}\t${d.text.slice(df.nameStart, df.nameEnd)}`);
  const n3 = pairsAgreement(walkPairs, goldPairs);
  card.checks.N3 = { ...n3, coreKinds: CORE_DEF_KINDS, threshold: CONSTS.N3_MIN, walkDeclarationNodes: walkOut.reduce((a, w) => a + w.decls.length, 0) };
  card.verdicts.N3 = n3.precision != null && n3.recall != null && n3.precision >= CONSTS.N3_MIN && n3.recall >= CONSTS.N3_MIN ? "pass" : "fail";

  // ── N4 leave-one-repository-out genericity, with the control built to fail ────────────────────────────────────────────────────────
  const real = loroLift(tally.perRepo);
  const control = controlLifts(tally.perRepo, CONSTS.CONTROL_DRAWS, CONSTS.SEED);
  card.checks.N4 = { real, control, informationalFloor3: loroLift(tally.perRepo, 3).pooled };
  card.verdicts.N4 = decideN4(real, control);

  // ── R1..R7 ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const js = readJson(path.join(NATIVE, "priors/code-kw-js.json"));
  const w = witnessKeywords({ hard, soft, builtins, jsHard: js.keywords, jsSoft: js.softKeywords, docs });
  card.checks.R = w;
  let wOld = null;
  if (oldKw) {
    wOld = witnessKeywords({ hard: oldKw.keywords, soft: oldKw.softKeywords ?? [], builtins: oldKw.builtins ?? [], jsHard: js.keywords, jsSoft: js.softKeywords, docs });
    card.checks.RExisting = { note: "the EXISTING priors/code-kw-java.json through the same counters (the control built to fail for R1/R4)", R1: wOld.R1, R2: wOld.R2, R3: { hardWords: wOld.R3.hardWords, attested: wOld.R3.attested, unattested: wOld.R3.unattested }, R4: wOld.R4 };
    card.verdicts.RExistingR1 = wOld.R1.hardViolations === 0 ? "pass" : "fail";
    card.verdicts.RExistingR4 = wOld.R4.identifierCollisions === 0 ? "pass" : "fail";
  }
  Object.assign(card.verdicts, decideR(w, wOld));
  // R7: the closed-class gap the old giver left, as the name gate learned it from TRAIN
  const oldCtxPath = path.join(NATIVE, "priors/code-ctx-java.json");
  if (oldKw && fs.existsSync(oldCtxPath)) {
    const ctx = readJson(oldCtxPath);
    const settled = new Set(ctx.closedClass?.settled ?? []);
    const gap = hard.filter((x) => !oldKw.keywords.includes(x));
    const hit = gap.filter((x) => settled.has(x));
    card.checks.R7 = { newHardNotInOldHard: gap, alsoInNameGateSettledList: hit, settledListSize: settled.size, predictedSubset: ["void", "this", "null", "boolean", "true", "false"], predictionHeld: ["void", "this", "null", "boolean", "true", "false"].every((x) => hit.includes(x)) };
    card.verdicts.R7 = card.checks.R7.predictionHeld ? "informational:prediction-held" : "informational:prediction-not-held";
  }
  card.verdicts.summary = Object.fromEntries(Object.entries(card.verdicts).filter(([k]) => k !== "summary"));

  // ── write the two candidate priors ─────────────────────────────────────────────────────────────────────────────────────────────────
  const trainRepos = tv.repos.map((r) => ({ repo: r, url: manifest.repos[r].url, commit: manifest.repos[r].commit, license: manifest.repos[r].license, fetched_at: manifest.repos[r].fetched_at, files: files.filter((f) => f.repo === r).length }));
  const libPath = path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/libs/libtree_sitter_java.dylib");
  const libSha = fs.existsSync(libPath) ? sha256(fs.readFileSync(libPath)) : null;
  const bundleDir = path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/bundles");
  const bundle = fs.existsSync(bundleDir) ? fs.readdirSync(bundleDir).find((x) => x.startsWith("macos-arm64-")) : null;
  const g = dv.grammar;
  const eng = law.giver.engine;
  const kwOut = {
    ...kw,
    provenance: {
      ...kw.provenance,
      giver: `tree-sitter grammar for java (tree-sitter-language-pack 1.21.0) for the word tokens, arbitrated by javac (OpenJDK ${eng.version}, the language engine) for which words are reserved; hard = (grammar word tokens U grammar dedicated terminals) INTERSECT javac-refused-in-all-seven-name-positions; soft = grammar word tokens javac accepts U words javac accepts only in some positions`,
      grammar: {
        name: "tree-sitter-java (the `java` grammar of the language pack)", language: "java", package: g.package, packageVersion: g.packageVersion, packageLicense: g.packageLicense, packageSource: g.packageSource,
        upstream: g.upstream, upstreamLicense: g.upstreamLicense, upstreamCommit: g.upstreamCommit, upstreamCommitNote: g.upstreamCommitNote,
        abi: g.abi, nodeKindCount: g.nodeKindCount, nodeKindFingerprintSha256: g.nodeKindFingerprintSha256, compiledLibrary: "libtree_sitter_java.dylib", compiledLibrarySha256: libSha,
        releaseBundle: bundle, releaseUrl: "https://github.com/xberg-io/tree-sitter-language-pack/releases/download/v1.21.0/parsers-macos-arm64.tar.zst",
        anonymousWordKinds: g.anonymousWordKinds, anonymousKindsDroppedByWordRule: g.anonymousKindsDroppedByWordRule, dedicatedLiteralTerminals: g.dedicatedLiteralTerminals, rule: g.rule,
      },
      engine: { ...eng, secondJdk: dv.secondJdk?.java ?? null },
      derivation: {
        script: "eval/coding-competence/java_kw_giver.py + eval/coding-competence/JavaKwProbe.java", projection: "scripts/build-code-keyword-prior.mjs (unmodified)",
        engineProbePositions: dv.engineProbePositions, engineProbeTemplates: dv.engineProbeTemplates, softSources: dv.softSources, positionMatrix: dv.positionMatrix,
        engineRefusedButNotGrammarToken: dv.engineRefusedButNotGrammarToken,
        engineRefusedButNotGrammarTokenNote: "reserved by javac, never a grammar token or dedicated terminal, and never a name of a being in valid java: not in the hard set under the declared rule (hard = grammar AND engine); the owner may add them without effect on any measured name",
        amendmentA1: "the method probe signature was changed after run 1 so java.lang.Object members cannot refuse a word by override clash; run 1 preserved as java-law-prior.run1-analyze-level.json beside the card",
        checks: { K1: card.verdicts.K1, K2: card.verdicts.K2, K3: card.verdicts.K3, K4: card.verdicts.K4, K5: card.verdicts.K5, K6: card.verdicts.K6, K7: card.verdicts.K7, K8: card.verdicts.K8 },
        checkNote: "K8 is FALSE: `this` is accepted by the parser in the receiver-parameter slot and refused only in attribution; the analysis-level basis is therefore the right one (a parse-level basis would have made `this` soft)",
      },
      contextualKeywords: "exports module open opens permits provides record requires sealed to transitive uses var when with yield and `_` are SOFT: javac accepts each as the name of a being in at least one position (the module-info words everywhere), so they are legally declarable and never refused; the earlier priors/code-kw-java.json listed 15 of them as hard",
      builtinsNote: `java.lang public top-level types (${builtins.length}) read from the JDK ${eng.version} module image (JLS 7.3: imported by every compilation unit); shadowing a java.lang name is legal and never refused`,
      stdlibNote: `stdlibModules holds the ${kw.stdlibModules.length} packages exported unqualified by the JDK system modules (the unit \`import\` names). The only reader of this field today, adapters/code/py-engine.js suggestImportFix, is python-only; the field is unread for java until a java import remedy exists.`,
      noCorpusRead: "the keyword set is derived from the grammar and the engine only; no corpus file is read to derive it",
      trainWitness: { split: "train", files: w.files, repos: tv.repos.length, tokens: w.nTokens, hardKeywordsAttested: w.R3.attested, hardKeywordsUnattested: w.R3.unattested, keywordTokenCoverage: w.R2.coverage, hardKeywordsDeclaredAsNames: w.R1.hardViolations, hardKeywordsAsIdentifierTokens: w.R4.identifierCollisions, verdicts: { R1: card.verdicts.R1, R2: card.verdicts.R2, R3: card.verdicts.R3, R4: card.verdicts.R4 } },
      polarity: "hard keywords refuse (cannot name a being); soft keywords and java.lang builtins are recorded and NEVER refuse",
      assembledBy: "eval/coding-competence/build-java-priors.mjs (adds the grammar, engine, derivation and TRAIN-witness provenance to the unmodified builder's output; the keyword lists are the builder's, untouched)",
      builtAt: new Date().toISOString().slice(0, 10),
    },
  };
  const nameOut = {
    schema: "CodeNamePrior@1",
    language: "java",
    provenance: {
      giver: `per-language TRAIN-only measurement of the CodeNamePrior@1: the manifest's java TRAIN split (a treebank-like corpus of ${tv.repos.length} permissively licensed repositories); labels are the definition-name nodes of the java grammar's own tags.scm (tree-sitter-language-pack 1.21.0 via eval/coding-competence/gold.py, ${GOLD_VERSION}), CORE kinds only; there is no java regex recipe in adapters/text/code-structure.js or in scripts/build-code-name-prior-split.mjs, so the tally is the grammar's; checked entry for entry against the build-c2-priors.mjs token-unit tally of the same files and against an independent per-repository partition and a direct node-type walk`,
      split: "train", family: "java", manifest: MANIFEST, manifestGeneratedAt: manifest.generated_at, splitRule: manifest.declared.split_rule,
      // trainRepos is an array of "owner/repo" STRINGS (the convention of the other priors; eval/coding-competence/run.mjs priorProvenance reads strings)
      trainRepos: tv.repos, trainRepoFiles: Object.fromEntries(trainRepos.map((r) => [r.repo, r.files])), trainRepoDetails: trainRepos, trainFiles: files.length, trainFilesDigestSha256: digest,
      filesExcluded: { restricted_licence: tv.restricted.map((r) => ({ repo: r.repo, rel: r.rel, license: manifest.repos[r.repo]?.license })), gold_error: bad.length },
      recipe: { source: "gold defs (tags.scm + authored query over java node kinds) of CORE kinds", kinds: "class_declaration/record_declaration -> class, interface_declaration/annotation_type_declaration -> interface, enum_declaration -> enum, method_declaration/constructor_declaration -> method", note: "types, methods and constructors; fields, locals, parameters and enum constants are not declared names in this tally" },
      builder: "eval/coding-competence/build-java-priors.mjs", builtOn: new Date().toISOString().slice(0, 10),
      sumCheck: { reference: oldName ? "priors/code-name-java.json (build-c2-priors.mjs)" : null, entryForEntryEqual: card.checks.N1.compare?.equal ?? null, entries: card.checks.N1.compare?.entries ?? tally.names.size, perRepoPartitionSum: partition, pooledAttestations: attest, note: "the unmodified split builder has no java family, so the blended-tally sum check does not exist for java" },
      validity: { directWalkVsGrammar: { precision: n3.precision, recall: n3.recall, walkPairs: n3.walkPairs, goldPairs: n3.goldPairs, verdict: card.verdicts.N3 } },
      genericityVsHeldOutRepo: { design: "leave-one-repository-out inside TRAIN; names declared in >=2 of the other repos vs exactly 1, hit = declared in the held-out repo", pooledLift: real.pooled.lift, rateG: real.pooled.rateG, rateS: real.pooled.rateS, controlMedianLift: control.median, controlMaxLift: control.max, verdict: card.verdicts.N4 },
      gaps: [{ gap: "four-train-repos", note: `genericity at floor ${CONSTS.GENERIC_FLOOR} rests on ${tv.repos.length} repositories; a name is generic here only if it recurs in 2 of 4` }, { gap: "no-reader-recipe", note: "adapters/text/code-structure.js has no java declaration recipe, so parseDeclarations returns nothing for .java files and genericityOf is not reachable for java until a recipe (a source edit) exists" }],
      note: "genericity is a fact about this language's own codebases: repos counts only the TRAIN repositories attesting the name as a declared type, method or constructor. A name never attested is admitted (null from genericityOf), never refused.",
    },
    counts: { files: files.length, repos: tv.repos.length, totalBytes: files.reduce((a, f) => a + f.bytes, 0), distinctNames: tally.names.size, totalDeclarations: tally.declarations, namesAtOrAboveGenericFloor: generic },
    names: mine,
    builtAt: new Date().toISOString(),
  };
  const written = [], skipped = [];
  fs.mkdirSync(PRIORS, { recursive: true });
  for (const [name, obj] of [["code-kw-java.json", kwOut], ["code-name-java.json", nameOut]]) {
    const p = path.join(PRIORS, name);
    if (fs.existsSync(p) && !replaceExisting) { skipped.push(p); continue; }
    fs.writeFileSync(p, JSON.stringify(obj, null, 1) + "\n");
    written.push(p);
  }
  card.files = { priors: written, skippedExisting: skipped, card: path.join(OUT, "card-java-priors-train.json"), lawPrior: lawPath };
  card.ms = Date.now() - t0;
  fs.writeFileSync(path.join(OUT, "card-java-priors-train.json"), JSON.stringify(card, null, 1));
  console.log(JSON.stringify({ verdicts: card.verdicts.summary, hard: hard.length, soft: soft.length, builtins: builtins.length, stdlib: kw.stdlibModules.length, trainFiles: files.length, trainRepos: tv.repos.length, distinctNames: tally.names.size, genericNames: generic, declarations: tally.declarations, written, skipped, ms: card.ms }, null, 1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}
