#!/usr/bin/env node
// build-go-priors.mjs: build the two RECEIVED priors for the programming language "go" from TRAIN ONLY, and measure them.
//
//   node eval/coding-competence/build-go-priors.mjs [--out DIR] [--priors DIR] [--no-write-priors]
//
// Writes (new files only; see NAMING below):
//   native/priors/code-kw-golang.json    CodeKeywordPrior@1  hard keywords (refuse), soft keywords + builtins (never refuse)
//   native/priors/code-name-golang.json  CodeNamePrior@1     distinct-TRAIN-repo counts of declared function/method names (genericity)
//   <out>/card-go-priors-train.json      the measured card: every check below, with denominators, passes AND failures
//   <out>/go-law-prior.json              the giver's LanguageLawPrior@1 (go_kw_giver.py)
// <out> defaults to /private/tmp/claude-501/coding-competence/go-priors. It never opens a dev or test file.
//
// NAMING (rule 10). priors/code-kw-go.json (a keyword prior projected from the ethos go law prior by an earlier step, no grammar version,
// no builtins) and priors/code-name-go.json (an OLDER ethos-built tally of 4 files in 3 repositories, one of which, kubernetes/kubernetes,
// is a manifest TEST repository) already exist and are not this script's to edit, so the Go priors are written under the new names
// code-kw-golang.json and code-name-golang.json (the convention of code-kw-python.json beside code-kw-py.json). Adopting them is a rename
// or a one-line loader edit in adapters/text/code-structure.js, reported to the main agent, never done here.
//
// GIVERS (READING-POLICY rule 3: every prior names its giver):
//   code-kw-golang: the tree-sitter grammar for go (tree-sitter-language-pack 1.21.0; upstream tree-sitter/tree-sitter-go, MIT) for the
//     word tokens, arbitrated by the Go language specification (https://go.dev/ref/spec) for which words are RESERVED and which
//     identifiers are predeclared (no Go toolchain exists on this machine; typed gap). Derived by eval/coding-competence/go_kw_giver.py
//     (pre-registered in its own header, K1..K8), projected to the CodeKeywordPrior@1 schema by the EXISTING, UNMODIFIED
//     scripts/build-code-keyword-prior.mjs. No keyword is typed here and no corpus file is read to derive the keyword set; TRAIN gold is
//     read only to WITNESS it (R1..R5). Priors REFUSE (hard keywords) or NOMINATE (nothing), never admit.
//   code-name-golang: a treebank-like corpus: the manifest's go TRAIN split (5 permissively licensed repositories, 185 files; wireguard-go
//     is an ethos-local copy of 2 files with no recorded commit). The declaration recipe is the family `go` recipe of
//     scripts/build-code-name-prior-split.mjs, copied VERBATIM (it is also the go recipe of adapters/text/code-structure.js, which is the
//     recipe the reader applies, so prior and reader cannot drift). Names are counted per distinct REPOSITORY, never per file.
//
// PRE-REGISTRATION (READING-POLICY II.5; this header was written BEFORE the first run of this file; thresholds are declared, never tuned,
// and every failure is reported as a failure).
//
// WHAT WAS SEEN BEFORE THIS HEADER (disclosed, nothing else was looked at):
//   (a) manifest.languages.go: TRAIN = 185 rows in 5 repositories (wireguard-go 2, thrift 60, flatbuffers 13, ollama 60, metalk8s 50), none
//       restricted; dev 3 repositories (caddy, frp, primo), test 4 (PgQue, kubernetes, pocket-id, sequin). Dev and test files were not opened.
//   (b) go_kw_giver.py was run (its header pre-registers K1..K8 and records the four predictions that failed and the three defects fixed
//       after the first run). Final giver outputs: hard = 25, soft = [_, false, iota, nil, true], builtins = 44.
//   (c) the header counts of the existing priors/code-name-train-go.json (a GOLD-recipe tally, function/method/type names, of the same TRAIN
//       files by build-c2-priors.mjs): 1645 distinct names, 1860 declarations, 22 names attested in >= 2 repositories; and of the older
//       priors/code-name-go.json: 335 names, 349 declarations, 2 names at floor. N6 below is informed by that peek and is only a sanity bound.
//   (d) the gold def schema on an AUTHORED toy snippet (not a TRAIN file): kinds type (type_spec), method (method_declaration), function
//       (function_declaration); consts, vars, struct fields and interface methods are not defs; token classes keyword / type / identifier.
//       No TRAIN token, definition or regex-recipe output had been looked at.
//
// PREDICTIONS AND PASS RULES (an unmeasured or unlicensed check is "unlicensed"/"gap", never "pass"):
//   K1..K8 (giver agreement, declarability, arbiter consistency, incumbent, wrong-grammar control, constants, counts): rules and observed
//      outcomes in go_kw_giver.py's header; this script copies the giver's verdicts into the card and does not re-decide them.
//   N1 reference equivalence (the sum check). My tally of (name -> repos, files, kinds) equals, entry for entry, the output of the
//      UNMODIFIED scripts/build-code-name-prior-split.mjs run on a staged TRAIN-only copy of the same files (that script also refuses to
//      write unless its own blended attestations equal its split attestations); and the independent per-repository partition sums to the
//      pooled attestation count. Pass: both exact. Expected: pass. FAILURE REFUSES THE WRITE (a drifted recipe).
//   N2 TRAIN purity. Every file read is a manifest go TRAIN row with restricted=false whose bytes match its manifest sha256 and whose path is
//      under the fetched raw corpus (or, for a row whose manifest origin is "ethos-local", under the ethos source tree); every repository has
//      manifest.repos[repo].global_split == "train", is permissive and unrestricted, and appears in no go dev or test row; the repositories
//      read equal info.repos.train. Pass: all exact. Expected: pass. FAILURE REFUSES THE WRITE.
//   N3 recipe validity against the grammar. Over (name, repo) attestations: precision = |regex AND gold| / |regex| >= 0.95 and recall =
//      |regex AND gold| / |gold| >= 0.90, where gold = the tree-sitter grammar's definition names of kind function or method (the go defs of
//      function_declaration and method_declaration nodes; type names are not tallied by this recipe and are excluded from gold). Expected:
//      precision ~0.99, recall ~0.95 (the recipe cannot see generic functions `func F[T any](`: reported in N5, never patched).
//   N4 genericity is real, not an artefact of file counting (leave-one-REPOSITORY-out inside TRAIN, the only held-out available without
//      touching dev). For each TRAIN repo h, from the OTHER four: G = names declared in >= 2 of them, S = names declared in exactly 1. Hit =
//      the name is declared in h. lift = (hits_G / |G|) / (hits_S / |S|), pooled over the five folds. Pass: pooled lift >= 2.0 AND every fold
//      whose lift is DEFINED (hits_S > 0 and |G|,|S| > 0) has lift > 1.0; folds with an undefined lift (wireguard-go holds 2 files and may have
//      hits_S = 0) are listed and excluded from the per-fold clause only, never from the pooled one. CONTROL BUILT TO FAIL (II.23): in every
//      fold each repository's declared-name set is replaced by an independent uniform random subset of the pooled vocabulary of the same
//      size (cross-repository identity destroyed; sizes kept), 200 seeded draws. LICENCE: the control's median pooled lift is in [0.5, 1.5]
//      and the real lift exceeds the control's MAXIMUM; otherwise the check is "unlicensed" (the statistic did not move). Expected: pass,
//      lift between 3 and 12, control median ~1. With 5 repositories this is a thin measurement and is reported as such.
//   N5 (informational, no pass rule). Recipe gaps, with denominators: (i) generic function declarations `func Name[T ...](` in TRAIN that the
//      recipe cannot match (it requires `(` right after the name); (ii) declared names with a non-ASCII letter (Go identifiers are Unicode);
//      (iii) declarations in `_test.go` files and names attested ONLY in test files (Test*, Benchmark*, helpers): kept, because the recipe is
//      the reader's and test functions are declared names of the language's codebases, but disclosed.
//   N6 sanity bound (informed by peek (c)). distinct names in [600, 1700] and names attested in >= 2 repositories in [8, 30].
//   R1 refusal polarity. Over every definition-name node the grammar gives in TRAIN (all kinds): ZERO names are in the hard keyword set (a
//      hard keyword can never name a being). LICENCE (control built to fail): the same count with a deranged-LANGUAGE hard set (the older
//      priors/code-kw-js.json or priors/code-kw-py.json, whichever refuses more) is >= 1, and with 25 words drawn at random from the
//      declared-name vocabulary (200 seeded draws) its mean is >= 1; otherwise the counter cannot fail and R1 is "unlicensed".
//      Expected: real 0, deranged-language control >= 1.
//   R2 token coverage. Of TRAIN gold tokens classed `keyword`, the fraction whose text is in (hard U soft) is >= 0.99. Control: the
//      javascript keyword set as the prior must cover at least 0.10 LESS (else unlicensed). Expected: pass (near 1.0); the texts outside the
//      prior are listed. NOTE the disclosed circularity: gold's `keyword` class is read from the same grammar's anonymous word kinds, so R2
//      witnesses that the prior's hard set covers the grammar's keyword tokens in real code, not that the grammar is right.
//   R3 attestation. At least 24 of the 25 hard keywords occur in TRAIN as a structural token (gold class not comment, string or
//      identifier). Unattested words are listed (a typed gap: the keyword is received but unwitnessed). Expected: all or all but one.
//   R4 no identifier collision. ZERO gold tokens of class identifier or type have a hard keyword as text. Offending files are listed.
//   R5 (informational, no pass rule) shadowing. TRAIN core definitions whose name is a builtin or a soft keyword, with counts and examples.
//      Prediction: > 0 (lowercase methods named close, copy, new, delete, print, len, min, max exist in Go code), which is the witness that
//      refusing builtins would refuse real declarations: the wrong-polarity control (hard U soft U builtins as the refusal set) would
//      violate exactly this many definitions while the real prior violates none.
//   V1/V2 loader verification (no source edit is made): V1 the unmodified loadCodeKeywordPrior("go") and loadCodeNamePriorSplit("go")
//      are called and reported as they are; V2 a patched COPY of adapters/text/code-structure.js in a scratch directory (the three loader
//      tables extended by the proposed edit) must load code-kw-golang.json as the Go keyword prior (25 hard keywords, keywordSetOf is a Set
//      of 25) and code-name-golang.json as the Go name prior (genericityOf(prior, <a name attested in >= 2 repos>) >= 2). Pass: both.
//
// OBSERVED OUTCOMES (appended AFTER the first run; the pre-registered text above is unchanged; the full numbers are in the card):
//   Pass as predicted: N1 (1408 names, 1438 (name, repo) attestations, entry-for-entry equal to the unmodified split builder, partition sum
//   equal), N2, N3 (precision 1.000, recall 0.996; the six misses are exactly the six generic functions of N5), N6 (1408 names, 20 at floor),
//   R1 (0 hard keywords declared as names of 1860 definitions), R2 (coverage 1.000 of 11673 keyword tokens; the javascript set covers 0.615),
//   R3 (25 of 25 attested; goto 3 and fallthrough 5 are the thinnest), R4 (0), V2.
//   NOT as predicted: N4 passed but its lift is 53.2 (pooled; predicted 3 to 12): a name declared in >= 2 other repos recurs in the held-out
//   repo 28.6% of the time against 0.54% for a name seen in one (the control's median is 0.81, max 1.30); wireguard-go's fold has an undefined
//   lift (hits_S = 0); 70 generic and 5582 single-repo name events over the five folds, so the statistic rests on few events. K3 FAILED and
//   K2b/K8 predictions were wrong (go_kw_giver.py header). R1's licence is THIN: the javascript hard set refuses 0 real definition names and
//   the python hard set refuses 1 (`assert`), so the counter is licensed by a single definition (the random-draw control, mean 28, fires
//   freely). R5 witnessed only 4 shadowing definitions (close x3, error x1) of 1860, fewer than the "close, copy, new, delete, print, len,
//   min, max" the header expected. N5: 643 of the 1616 declarations and 612 of the 1408 names are in `_test.go` files only; 0 non-ASCII names.
//   What this does NOT measure: nothing here is evaluated on DEV or TEST; whether the prior helps a reader is the job of the C2 instrument.
//
// LAWS APPLIED: causal (priors carry no whole-text statistic over a unit being judged; this file only counts); identity does not decay;
// priors refuse or nominate, never admit; capitalisation is not read anywhere (names are exact strings); every threshold above is declared;
// gaps are typed with denominators; held-out discipline (TRAIN only; the leave-one-repo-out is a TRAIN-internal split by repository); no model.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { goldBatch, goldAvailable, GOLD_VERSION, CORE_DEF_KINDS } from "./gold.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const NATIVE = path.resolve(HERE, "../..");
export const MANIFEST = process.env.GOPRIORS_MANIFEST || "/private/tmp/claude-501/code-corpus/manifest.json";
export const DEFAULT_OUT = process.env.GOPRIORS_OUT || "/private/tmp/claude-501/coding-competence/go-priors";
export const RAW_ROOT = "/private/tmp/claude-501/code-corpus/raw/";
export const ETHOS_ROOT = "/Users/mlacy/Documents/3.0/ethos/09-source-code/";
const PYTHON = process.env.GOLD_PYTHON || "/private/tmp/claude-501/venv/bin/python";
const TS_CACHE = process.env.GOLD_TS_CACHE || "/private/tmp/claude-501/coding-competence/ts-cache";
const SPEC_HTML = "/private/tmp/claude-501/coding-competence/go/spec/go-spec.html";
const SPEC_META = "/private/tmp/claude-501/coding-competence/go/spec/fetch-meta.json";
const BUILDER = "eval/coding-competence/build-go-priors.mjs";
const KW_FILE = "code-kw-golang.json";
const NAME_FILE = "code-name-golang.json";

// declared constants (header)
export const CONSTS = Object.freeze({
  GENERIC_FLOOR: 2, LIFT_MIN: 2.0, LIFT_FOLD_MIN: 1.0, CONTROL_MEDIAN_LO: 0.5, CONTROL_MEDIAN_HI: 1.5, CONTROL_DRAWS: 200,
  PRECISION_MIN: 0.95, RECALL_MIN: 0.90, R2_MIN: 0.99, R2_CONTROL_GAP: 0.10, R3_MIN_ATTESTED: 24,
  N6_NAMES: [600, 1700], N6_GENERIC: [8, 30], SEED: "go-priors-v1",
});

// ── the recipe: family `go` of scripts/build-code-name-prior-split.mjs, VERBATIM ──────────────────────────────────────────────────────
export const RECIPE_SOURCE = "^func\\s+(?:\\([^)]*\\)\\s+)?([A-Za-z_]\\w*)\\s*\\(";
export const RECIPE_FLAGS = "gm";
const GENERIC_GAP = "^func\\s+(?:\\([^)]*\\)\\s+)?([A-Za-z_]\\w*)\\s*\\[";      // N5(i): the declarations the recipe cannot match
const UNICODE_GAP = "^func\\s+(?:\\([^)]*\\)\\s+)?([\\p{L}_][\\p{L}\\p{N}_]*)\\s*[\\(\\[]"; // N5(ii)

/** declarationsOf(text) -> [{name, kind, index}] (kind is always "function": the split builder's own mapping for go; index = offset of the name) */
export function declarationsOf(text) {
  const re = new RegExp(RECIPE_SOURCE, RECIPE_FLAGS + "d");
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push({ name: m[1], kind: "function", index: m.indices[1][0] });
  return out;
}

/** tallyNames(files) -> { names: Map(name -> {repos:Set, files:Set, kinds:Set}), perRepo: Map(repo -> Set(name)), declarations, files }  files: [{repo, rel, text}] */
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

/** decideN4(real, control) -> "pass" | "fail" | "unlicensed"  (folds with an undefined lift are excluded from the per-fold clause only) */
export function decideN4(real, control, C = CONSTS) {
  const lic = control.median != null && control.median >= C.CONTROL_MEDIAN_LO && control.median <= C.CONTROL_MEDIAN_HI && real.pooled.lift != null && real.pooled.lift > control.max;
  if (!lic) return "unlicensed";
  const defined = real.folds.filter((f) => f.lift != null);
  const ok = real.pooled.lift >= C.LIFT_MIN && defined.length > 0 && defined.every((f) => f.lift > C.LIFT_FOLD_MIN);
  return ok ? "pass" : "fail";
}

// ── R1..R5: witnesses of the keyword prior against TRAIN gold ─────────────────────────────────────────────────────────────────────────
const NON_STRUCTURAL = new Set(["comment", "string", "identifier", "type"]);

/**
 * witnessKeywords({ hard, soft, builtins, derangedSets, jsHard, jsSoft, docs, seed }) -> the R1..R5 measurements.
 *   docs: [{ repo, rel, text, gold }]  gold = a gold.mjs result (no `error`)
 */
export function witnessKeywords({ hard, soft, builtins, derangedSets, jsHard, jsSoft, docs, seed = CONSTS.SEED, draws = CONSTS.CONTROL_DRAWS }) {
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
        if (cls === "identifier" || cls === "type") { const r = identCollisions.get(txt) || { n: 0, files: new Set() }; r.n++; r.files.add(`${d.repo}/${d.rel}`); identCollisions.set(txt, r); }
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
  const deranged = {};
  for (const [label, words] of Object.entries(derangedSets || {})) deranged[label] = violations(new Set(words));
  const bestDeranged = Math.max(0, ...Object.values(deranged).map((v) => v.n));
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
  const shB = [...coreShadow.builtin.values()].reduce((a, b) => a + b, 0), shS = [...coreShadow.soft.values()].reduce((a, b) => a + b, 0);
  return {
    nTokens, nDefs, nCoreDefs, files: docs.length,
    R1: { hardViolations: real.n, violationExamples: real.examples, denominatorDefs: nDefs, derangedLanguageControls: deranged, bestDerangedViolations: bestDeranged, randomControlMean: randMean, randomControlDraws: draws },
    R2: { keywordTokens: kwTotal, inPrior: kwIn, coverage: kwTotal ? kwIn / kwTotal : null, controlJsCoverage: kwTotal ? kwInJs / kwTotal : null, outsidePrior: outside.slice(0, 25), distinctOutside: outside.length },
    R3: { hardWords: hard.length, attested: hard.length - unattested.length, unattested, counts: mapToObj(attest) },
    R4: { identifierCollisions: [...identCollisions].reduce((a, [, r]) => a + r.n, 0), words: Object.fromEntries([...identCollisions].map(([w, r]) => [w, { n: r.n, files: [...r.files].slice(0, 5) }])) },
    R5: { builtinShadowingDefs: shB, builtinShadowNames: mapToObj(coreShadow.builtin), softShadowingDefs: shS, softShadowNames: mapToObj(coreShadow.soft), wrongPolarityViolations: shB + shS, denominatorCoreDefs: nCoreDefs },
  };
}

export function decideR(w, C = CONSTS) {
  const r1Lic = w.R1.bestDerangedViolations >= 1 && w.R1.randomControlMean != null && w.R1.randomControlMean >= 1;
  const r2Lic = w.R2.coverage != null && w.R2.controlJsCoverage != null && w.R2.controlJsCoverage <= w.R2.coverage - C.R2_CONTROL_GAP;
  return {
    R1: !r1Lic ? "unlicensed" : w.R1.hardViolations === 0 ? "pass" : "fail",
    R2: !r2Lic ? "unlicensed" : w.R2.coverage >= C.R2_MIN ? "pass" : "fail",
    R3: w.R3.attested >= C.R3_MIN_ATTESTED ? "pass" : "fail",
    R4: w.R4.identifierCollisions === 0 ? "pass" : "fail",
    R5: w.R5.wrongPolarityViolations > 0 ? "informational:supports-polarity" : "informational:no-shadowing-seen",
  };
}

/** N3: regex recipe vs the grammar's function/method definition names, over (name, repo) attestations */
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
export function verifyTrain(manifest, language = "go", { readBytes = true } = {}) {
  const L = manifest.languages[language];
  const problems = [];
  const rows = [], restricted = [];
  for (const r of L.train) (r.restricted ? restricted : rows).push(r);
  const devTest = new Set([...L.dev, ...L.test].map((r) => r.repo));
  const devTestPaths = new Set([...L.dev, ...L.test].map((r) => r.path));
  const repos = [...new Set(rows.map((r) => r.repo))].sort();
  for (const repo of repos) {
    const m = manifest.repos[repo];
    if (!m) { problems.push(`repo ${repo} not in manifest.repos`); continue; }
    if (m.global_split !== "train") problems.push(`repo ${repo} global_split=${m.global_split}`);
    if (m.restricted) problems.push(`repo ${repo} is restricted`);
    if (m.license_class !== "permissive") problems.push(`repo ${repo} license_class=${m.license_class}`);
    if (devTest.has(repo)) problems.push(`repo ${repo} also appears in a ${language} dev/test row`);
  }
  const infoTrain = [...(L.info?.repos?.train ?? [])].sort();
  if (JSON.stringify(infoTrain) !== JSON.stringify(repos)) problems.push(`repos read ${JSON.stringify(repos)} != info.repos.train ${JSON.stringify(infoTrain)}`);
  for (const r of rows) {
    const underRaw = r.path.startsWith(RAW_ROOT), underEthos = r.origin === "ethos-local" && r.path.startsWith(ETHOS_ROOT);
    if (!underRaw && !underEthos) problems.push(`row ${r.repo}:${r.rel} is neither under the fetched raw corpus nor an ethos-local row (${r.path})`);
    if (devTestPaths.has(r.path)) problems.push(`row ${r.repo}:${r.rel} path is also a dev/test row`);
    if (readBytes) {
      let b = null;
      try { b = fs.readFileSync(r.path); } catch { problems.push(`row ${r.repo}:${r.rel} unreadable`); continue; }
      if (sha256(b) !== r.sha256) problems.push(`row ${r.repo}:${r.rel} sha256 mismatch`);
    }
  }
  return { rows, restricted, repos, problems };
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

/** the proposed loader edit, as exact text replacements on a COPY of adapters/text/code-structure.js (never applied to the source) */
export const LOADER_EDITS = [
  { from: 'const CODE_KW_FILE = Object.freeze({ py: "code-kw-py.json", js: "code-kw-js.json" });', to: `const CODE_KW_FILE = Object.freeze({ py: "code-kw-py.json", js: "code-kw-js.json", go: "${KW_FILE}" });` },
  { from: 'const CODE_KW_LANG = Object.freeze({ python: "py", py: "py", javascript: "js", js: "js" });', to: 'const CODE_KW_LANG = Object.freeze({ python: "py", py: "py", javascript: "js", js: "js", go: "go", golang: "go" });' },
  { from: 'go: "code-name-go.json", js: "code-name-js.json" });', to: `go: "${NAME_FILE}", js: "code-name-js.json" });` },
];

async function main() {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const OUT = opt("--out", DEFAULT_OUT);
  const PRIORS = opt("--priors", path.join(NATIVE, "priors"));
  const writePriors = !argv.includes("--no-write-priors");
  fs.mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const cardPath = path.join(OUT, "card-go-priors-train.json");
  const card = { schema: "GoPriorsCard@1", language: "go", split: "train", builtAt: new Date().toISOString(), goldVersion: GOLD_VERSION, consts: CONSTS, checks: {}, verdicts: {}, gaps: [] };
  const refuse = (why) => { card.refused = why; fs.writeFileSync(cardPath, JSON.stringify(card, null, 1)); console.error(`REFUSED: ${why}`); process.exit(1); };

  // ── N2 TRAIN purity ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const tv = verifyTrain(manifest, "go");
  card.checks.N2 = { rows: tv.rows.length, repos: tv.repos, excludedRestricted: tv.restricted.map((r) => ({ repo: r.repo, rel: r.rel })), problems: tv.problems };
  card.verdicts.N2 = tv.problems.length ? "fail" : "pass";
  if (tv.problems.length) refuse(`N2 TRAIN purity failed: ${tv.problems.slice(0, 3).join("; ")}`);
  const files = tv.rows.map((r) => ({ repo: r.repo, rel: r.rel, text: fs.readFileSync(r.path, "utf8"), bytes: r.bytes, row: r }));
  const digest = trainDigest(tv.rows);

  // ── N1 reference equivalence (sum check) ──────────────────────────────────────────────────────────────────────────────────────────
  const tally = tallyNames(files);
  const mine = namesObject(tally.names);
  const attest = attestationTotal(tally.names);
  const partition = partitionSum(files);
  const stage = path.join(OUT, "stage-train");
  const stageOut = path.join(OUT, "stage-split-out");
  fs.rmSync(stage, { recursive: true, force: true }); fs.rmSync(stageOut, { recursive: true, force: true });
  for (const f of files) {
    const dest = path.join(stage, f.repo.replace("/", "_"), f.rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(f.row.path, dest);
  }
  const split = run(process.execPath, [path.join(NATIVE, "scripts/build-code-name-prior-split.mjs"), stage, stageOut]);
  const ref = JSON.parse(fs.readFileSync(path.join(stageOut, "code-name-go.json"), "utf8"));
  const cmp = compareNameTables(mine, ref.names);
  const countsAgree = ref.counts.files === files.length && ref.counts.repos === tv.repos.length && ref.counts.distinctNames === tally.names.size && ref.counts.totalDeclarations === tally.declarations;
  card.checks.N1 = { entryForEntryEqual: cmp.equal, entries: cmp.entries, refEntries: cmp.refEntries, mismatch: cmp.equal ? null : cmp, countsAgree, pooledAttestations: attest, perRepoPartitionSum: partition, splitBuilderStderr: split.stderr.trim().split("\n").slice(-3) };
  card.verdicts.N1 = cmp.equal && countsAgree && partition === attest ? "pass" : "fail";
  if (card.verdicts.N1 !== "pass") refuse(`N1 sum check failed: ${JSON.stringify(card.checks.N1).slice(0, 600)}`);

  // ── gold over TRAIN (needed by N3, N5 and R1..R5) ─────────────────────────────────────────────────────────────────────────────────
  const ga = goldAvailable();
  let docs = [];
  if (ga.available) {
    const golds = await goldBatch(files.map((f) => ({ language: "go", text: f.text, fileName: path.basename(f.row.path) })));
    const excluded = { gold_error: 0 };
    golds.forEach((g, k) => { if (g.error) { excluded.gold_error++; return; } docs.push({ repo: files[k].repo, rel: files[k].rel, text: files[k].text, gold: g }); });
    card.checks.gold = { files: files.length, used: docs.length, excluded, parseErrorFiles: docs.filter((d) => (d.gold.parse?.error_bytes_frac ?? 0) > 0).length };
  } else card.gaps.push({ gap: "gold-unavailable", reason: ga.reason });

  // ── N3 recipe validity ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  if (ga.available) {
    const goldPairs = new Set();
    for (const d of docs) for (const df of d.gold.defs) if (df.kind === "function" || df.kind === "method") goldPairs.add(`${d.repo}\t${df.name}`);
    const rv = recipeVsGold(tally.perRepo, goldPairs);
    card.checks.N3 = rv;
    card.verdicts.N3 = rv.precision >= CONSTS.PRECISION_MIN && rv.recall >= CONSTS.RECALL_MIN ? "pass" : "fail";
  } else card.verdicts.N3 = "gap";

  // ── N4 genericity vs held-out repository (+ control) ──────────────────────────────────────────────────────────────────────────────
  const real = loroLift(tally.perRepo);
  const control = controlLifts(tally.perRepo, CONSTS.CONTROL_DRAWS, CONSTS.SEED);
  card.checks.N4 = { real, control, undefinedLiftFolds: real.folds.filter((f) => f.lift == null).map((f) => f.heldOut) };
  card.verdicts.N4 = decideN4(real, control);

  // ── N5 recipe gaps (informational) ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    let generic = 0, unicode = 0, testDecls = 0, allDecls = 0;
    const testOnly = new Map(); // name -> {inTest, inNonTest}
    const genericExamples = [], unicodeExamples = [];
    for (const f of files) {
      const isTest = /_test\.go$/.test(f.rel);
      for (const m of f.text.matchAll(new RegExp(GENERIC_GAP, "gm"))) { generic++; if (genericExamples.length < 8) genericExamples.push(m[1]); }
      for (const m of f.text.matchAll(new RegExp(UNICODE_GAP, "gmu"))) if (/[^\x00-\x7f]/.test(m[1])) { unicode++; if (unicodeExamples.length < 8) unicodeExamples.push(m[1]); }
      for (const d of declarationsOf(f.text)) {
        allDecls++; if (isTest) testDecls++;
        const r = testOnly.get(d.name) || { t: false, n: false }; if (isTest) r.t = true; else r.n = true; testOnly.set(d.name, r);
      }
    }
    const onlyTest = [...testOnly.values()].filter((r) => r.t && !r.n).length;
    card.checks.N5 = { genericFunctionsUnmatched: generic, genericExamples, nonAsciiNameDeclarations: unicode, unicodeExamples, recipeDeclarations: allDecls, declarationsInTestFiles: testDecls, namesOnlyInTestFiles: onlyTest, distinctNames: testOnly.size };
    card.verdicts.N5 = "informational";
  }

  // ── N6 sanity ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const generic = Object.values(mine).filter((r) => r.repos >= CONSTS.GENERIC_FLOOR).length;
  card.checks.N6 = { distinctNames: tally.names.size, namesAtOrAboveFloor: generic, floor: CONSTS.GENERIC_FLOOR, boundsNames: CONSTS.N6_NAMES, boundsGeneric: CONSTS.N6_GENERIC, declarations: tally.declarations };
  card.verdicts.N6 = tally.names.size >= CONSTS.N6_NAMES[0] && tally.names.size <= CONSTS.N6_NAMES[1] && generic >= CONSTS.N6_GENERIC[0] && generic <= CONSTS.N6_GENERIC[1] ? "pass" : "fail";

  // ── the keyword giver and projection ────────────────────────────────────────────────────────────────────────────────────────────
  const lawPath = path.join(OUT, "go-law-prior.json");
  const giverOut = run(PYTHON, [path.join(HERE, "go_kw_giver.py"), lawPath, SPEC_HTML, SPEC_META]).stdout.trim().split("\n").pop();
  const law = JSON.parse(fs.readFileSync(lawPath, "utf8"));
  const kwTmp = path.join(OUT, "code-kw-go.builder-output.json");
  run(process.execPath, [path.join(NATIVE, "scripts/build-code-keyword-prior.mjs"), lawPath, kwTmp, "go"]);
  const kw = JSON.parse(fs.readFileSync(kwTmp, "utf8"));
  const hard = kw.keywords, soft = kw.softKeywords, builtins = kw.builtins;
  const dv = law.derivation, ck = dv.checks;
  card.checks.K = { giverRun: JSON.parse(giverOut), checks: ck };
  card.verdicts.K1 = ck.K1.pass ? "pass" : "fail";
  card.verdicts.K2a = ck.K2a.pass ? "pass" : "fail";
  card.verdicts.K2b = ck.K2b.allRefusedInAtLeastOneForm ? "prediction-held" : "prediction-failed (informational)";
  card.verdicts.K3 = ck.K3.pass ? "pass" : "fail";
  card.verdicts.K4 = ck.K4.pass ? "pass" : "fail";
  card.verdicts.K5 = ck.K5.pass == null ? "gap" : ck.K5.pass ? "pass" : "fail";
  card.verdicts.K6 = ck.K6.pass ? "pass" : "fail";
  card.verdicts.K7 = ck.K7.pass ? "pass" : "fail";
  card.verdicts.K8 = ck.K8.asPredicted ? "prediction-held" : "prediction-wrong (informational)";

  // ── R1..R5 TRAIN witness ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  const readKw = (f) => { try { return JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", f), "utf8")); } catch { return null; } };
  const jsKw = readKw("code-kw-js.json"), pyKw = readKw("code-kw-py.json");
  let witness = null;
  if (ga.available) {
    witness = witnessKeywords({ hard, soft, builtins, derangedSets: { javascript: jsKw?.keywords ?? [], python: pyKw?.keywords ?? [] }, jsHard: jsKw?.keywords, jsSoft: jsKw?.softKeywords, docs });
    card.checks.R = witness;
    Object.assign(card.verdicts, decideR(witness));
  } else card.gaps.push({ gap: "R1-R5 unmeasured", reason: "gold unavailable" });

  // ── write the two priors ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  const trainRepos = tv.repos.map((r) => ({ repo: r, url: manifest.repos[r].url, commit: manifest.repos[r].commit, license: manifest.repos[r].license, origin: manifest.repos[r].origin, fetched_at: manifest.repos[r].fetched_at ?? null, files: files.filter((f) => f.repo === r).length }));
  const libPath = path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/libs/libtree_sitter_go.dylib");
  const libSha = fs.existsSync(libPath) ? sha256(fs.readFileSync(libPath)) : null;
  const bundleDir = path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/bundles");
  const bundle = fs.existsSync(bundleDir) ? fs.readdirSync(bundleDir).find((x) => x.startsWith("macos-arm64-")) : null;
  const g = dv.grammar;
  const kwOut = {
    ...kw,
    provenance: {
      ...kw.provenance,
      giver: law.giver.resource,
      grammar: {
        name: "tree-sitter-go (the `go` grammar of the language pack)", language: "go", package: g.package, packageVersion: g.packageVersion, packageLicense: g.packageLicense, packageSource: g.packageSource,
        upstream: g.upstream, upstreamLicense: g.upstreamLicense, upstreamCommit: g.upstreamCommit, upstreamCommitNote: g.upstreamCommitNote,
        abi: g.abi, nodeKindCount: g.nodeKindCount, nodeKindFingerprintSha256: g.nodeKindFingerprintSha256, compiledLibrary: "libtree_sitter_go.dylib", compiledLibrarySha256: libSha,
        releaseBundle: bundle, releaseUrl: "https://github.com/xberg-io/tree-sitter-language-pack/releases/download/v1.21.0/parsers-macos-arm64.tar.zst",
        anonymousWordKinds: g.anonymousWordKinds, dedicatedLiteralTerminals: g.dedicatedLiteralTerminals, blankIdentifierKind: g.blankIdentifierKind, highlightsDeclared: g.highlightsDeclared, rule: g.rule,
      },
      standard: dv.spec,
      engine: law.giver.engine,
      engineGap: "no Go toolchain on this machine (none downloaded): reservedness is arbitrated by the language specification, not by a compile probe; the stdlib is not recorded (typed gap)",
      derivation: { script: "eval/coding-competence/go_kw_giver.py", projection: "scripts/build-code-keyword-prior.mjs (unmodified)", bindingForms: dv.bindingForms, softSources: dv.softSources, builtinSources: dv.builtinSources, contextualReservation: dv.contextualReservation, stdlibModules: dv.stdlibModules,
        checks: { K1: card.verdicts.K1, K2a: card.verdicts.K2a, K2b: card.verdicts.K2b, K3: card.verdicts.K3, K4: card.verdicts.K4, K5: card.verdicts.K5, K6: card.verdicts.K6, K7: card.verdicts.K7, K8: card.verdicts.K8 },
        grammarLeniency: "K3: the grammar parses every hard keyword as a binding name in at least one form (tree-sitter's keyword extraction lets the identifier rule swallow it), so reservedness is read from the spec, never from grammar refusal" },
      assembledBy: `${BUILDER} (adds the grammar, standard, engine gap, derivation and TRAIN-witness provenance to the unmodified builder's output; the keyword lists are the builder's, untouched)`,
      noCorpusRead: "the keyword set is derived from the grammar and the specification only; no corpus file is read to derive it",
      trainWitness: witness ? { split: "train", files: witness.files, repos: tv.repos.length, tokens: witness.nTokens, hardKeywordsAttested: witness.R3.attested, hardKeywordsUnattested: witness.R3.unattested, keywordTokenCoverage: witness.R2.coverage, hardKeywordsDeclaredAsNames: witness.R1.hardViolations, builtinOrSoftShadowingDefs: witness.R5.wrongPolarityViolations, verdicts: { R1: card.verdicts.R1, R2: card.verdicts.R2, R3: card.verdicts.R3, R4: card.verdicts.R4, R5: card.verdicts.R5 } } : { gap: "gold-unavailable" },
      polarity: "hard keywords refuse (cannot name a being); soft keywords (true false nil iota and the blank identifier) and builtins (predeclared types, constants, nil and functions) are recorded and NEVER refuse: Go lets a program shadow them, and TRAIN declares such names (R5)",
      incumbent: "priors/code-kw-go.json carries the same 25 hard keywords (K5) and no soft keywords, builtins or grammar version; this file is not a replacement of its refusal set, only a better-provenanced superset",
      builtAt: new Date().toISOString().slice(0, 10),
    },
  };
  const nameOut = {
    schema: "CodeNamePrior@1",
    language: "go",
    provenance: {
      giver: `per-language TRAIN-only measurement of the CodeNamePrior@1: the manifest's go TRAIN split (a treebank-like corpus of ${tv.repos.length} permissively licensed repositories); recipe identical to the family \`go\` recipe of scripts/build-code-name-prior-split.mjs and to the go recipe of adapters/text/code-structure.js; sum-checked entry for entry against the unmodified split builder run on the same files (${attest} (name, repo) attestations) and against an independent per-repository partition`,
      split: "train", family: "go", manifest: MANIFEST, manifestGeneratedAt: manifest.generated_at, splitRule: manifest.declared.split_rule,
      // trainRepos is an array of "owner/repo" STRINGS (the convention of priors/code-name-train-*.json); the details live beside it
      trainRepos: tv.repos, trainRepoFiles: Object.fromEntries(trainRepos.map((r) => [r.repo, r.files])), trainRepoDetails: trainRepos, trainFiles: files.length, trainFilesDigestSha256: digest,
      filesExcluded: { restricted_licence: tv.restricted.map((r) => ({ repo: r.repo, rel: r.rel })) },
      recipe: { source: RECIPE_SOURCE, flags: RECIPE_FLAGS, kinds: "func -> function (functions and methods; types, consts and vars are not tallied)", note: "the split builder's recipe, verbatim; names containing non-ASCII letters and generic functions `func F[T any](` are not matched (N5)" },
      builder: BUILDER, builtOn: new Date().toISOString().slice(0, 10),
      sumCheck: { reference: "scripts/build-code-name-prior-split.mjs (unmodified)", entryForEntryEqual: cmp.equal, entries: cmp.entries, perRepoPartitionSum: partition, pooledAttestations: attest },
      validity: card.checks.N3 ? { recipeVsGrammar: { precision: card.checks.N3.precision, recall: card.checks.N3.recall, regexPairs: card.checks.N3.regexPairs, goldPairs: card.checks.N3.goldPairs, verdict: card.verdicts.N3 } } : { gap: "gold-unavailable" },
      genericityVsHeldOutRepo: { design: "leave-one-repository-out inside TRAIN; names declared in >=2 of the other four repos vs exactly 1, hit = declared in the held-out repo", pooledLift: real.pooled.lift, rateG: real.pooled.rateG, rateS: real.pooled.rateS, controlMedianLift: control.median, controlMaxLift: control.max, undefinedLiftFolds: card.checks.N4.undefinedLiftFolds, verdict: card.verdicts.N4 },
      gaps: [
        { gap: "five-train-repos", note: `genericity at floor ${CONSTS.GENERIC_FLOOR} rests on ${tv.repos.length} repositories (one of them wireguard-go with ${trainRepos.find((r) => r.repo === "WireGuard/wireguard-go")?.files ?? 0} files); a name is generic here only if it recurs in 2 of 5` },
        { gap: "wireguard-go-commit", note: "WireGuard/wireguard-go is an ethos-local copy; the manifest records no commit for it" },
        { gap: "recipe-blind-spots", generic_functions_unmatched: card.checks.N5.genericFunctionsUnmatched, non_ascii_names: card.checks.N5.nonAsciiNameDeclarations, test_file_declarations: card.checks.N5.declarationsInTestFiles, of: card.checks.N5.recipeDeclarations },
      ],
      note: "genericity is a fact about this language's own codebases: repos counts only the TRAIN repositories attesting the name through this recipe. A name never attested is admitted (null from genericityOf), never refused. The older priors/code-name-go.json was built from 4 files in the ethos tree (2 of wireguard-go, 1 of golang/go whose manifest global split is dev, and 1 of kubernetes/kubernetes, a go TEST repository): it is not held-out safe; this file is. The C2 reader's own TRAIN prior priors/code-name-train-go.json uses a different recipe (grammar definitions incl. type names).",
    },
    counts: { files: files.length, repos: tv.repos.length, totalBytes: files.reduce((a, f) => a + f.bytes, 0), distinctNames: tally.names.size, totalDeclarations: tally.declarations, namesAtOrAboveGenericFloor: generic },
    names: mine,
    builtAt: new Date().toISOString(),
  };
  const written = [];
  if (writePriors) {
    fs.mkdirSync(PRIORS, { recursive: true });
    const ownedWrite = (name, obj) => {
      const p = path.join(PRIORS, name);
      if (fs.existsSync(p)) {
        let prev = null;
        try { prev = JSON.parse(fs.readFileSync(p, "utf8")); } catch { prev = null; }
        const owner = prev?.provenance?.builder === BUILDER || prev?.provenance?.assembledBy?.startsWith?.(BUILDER);
        if (!owner) throw new Error(`refusing to overwrite ${name}: not built by this script`);
      }
      fs.writeFileSync(p, JSON.stringify(obj, null, 1) + "\n");
      written.push({ path: p, bytes: fs.statSync(p).size });
    };
    ownedWrite(KW_FILE, kwOut);
    ownedWrite(NAME_FILE, nameOut);
  }

  // ── V1/V2 loader verification (no source edit) ────────────────────────────────────────────────────────────────────────────────────
  {
    const v = { V1: {}, V2: {} };
    const csPath = path.join(NATIVE, "adapters/text/code-structure.js");
    const cs = await import(pathToFileURL(csPath).href);
    const kw0 = cs.loadCodeKeywordPrior("go");
    const nm0 = cs.loadCodeNamePriorSplit("go");
    v.V1 = { loadCodeKeywordPrior_go: kw0 ? { keywords: kw0.keywords.length, file: "served" } : null, loadCodeKeywordPrior_golang: cs.loadCodeKeywordPrior("golang") ? "served" : null,
      loadCodeNamePriorSplit_go: nm0 ? { files: nm0.counts?.files, repos: nm0.counts?.repos, distinctNames: nm0.counts?.distinctNames, source: nm0.provenance?.source, heldOutSafe: false, why: "built from 4 files of the ethos tree: wireguard-go (go TRAIN), golang/go (manifest global split dev; it has no go rows) and kubernetes/kubernetes (go TEST)" } : null,
      note: "the unmodified loader has no go entry in CODE_KW_FILE/CODE_KW_LANG, so loadCodeKeywordPrior('go') is null whatever file exists; loadCodeNamePriorSplit('go') serves the ethos-built, non-held-out prior" };
    const scratch = path.join(OUT, "loadercheck");
    fs.rmSync(scratch, { recursive: true, force: true });
    fs.mkdirSync(path.join(scratch, "adapters/text"), { recursive: true });
    fs.mkdirSync(path.join(scratch, "priors"), { recursive: true });
    let src = fs.readFileSync(csPath, "utf8");
    const applied = [];
    for (const e of LOADER_EDITS) { applied.push(src.includes(e.from)); src = src.replace(e.from, e.to); }
    fs.writeFileSync(path.join(scratch, "adapters/text/code-structure.js"), src);
    if (writePriors) {
      fs.copyFileSync(path.join(PRIORS, KW_FILE), path.join(scratch, "priors", KW_FILE));
      fs.copyFileSync(path.join(PRIORS, NAME_FILE), path.join(scratch, "priors", NAME_FILE));
    } else {
      fs.writeFileSync(path.join(scratch, "priors", KW_FILE), JSON.stringify(kwOut)); fs.writeFileSync(path.join(scratch, "priors", NAME_FILE), JSON.stringify(nameOut));
    }
    const patched = await import(pathToFileURL(path.join(scratch, "adapters/text/code-structure.js")).href);
    const kwP = patched.loadCodeKeywordPrior("go"), nmP = patched.loadCodeNamePriorSplit("go");
    const ks = patched.keywordSetOf(kwP);
    const probe = Object.keys(mine).find((k) => mine[k].repos >= 2);
    v.V2 = { editsApplied: applied, keywordPriorLoaded: !!kwP, hardKeywords: kwP?.keywords?.length ?? null, keywordSetSize: ks?.size ?? null, hasFunc: !!ks?.has("func"), namePriorLoaded: !!nmP, nameCountsFiles: nmP?.counts?.files ?? null,
      genericityOfProbe: probe ? { name: probe, repos: patched.genericityOf(nmP, probe) } : null,
      edits: LOADER_EDITS.map((e) => ({ replace: e.from, with: e.to })) };
    v.verdict = applied.every(Boolean) && kwP && ks?.size === 25 && ks.has("func") && nmP && probe && patched.genericityOf(nmP, probe) >= 2 ? "pass" : "fail"; // V1 is reported, not decided: the main agent may edit the loader meanwhile
    card.checks.V = v;
    card.verdicts.V = v.verdict;
    fs.rmSync(scratch, { recursive: true, force: true });
  }

  card.files = { priors: written.map((w) => w.path), written, card: cardPath, lawPrior: lawPath };
  card.ms = Date.now() - t0;
  fs.writeFileSync(cardPath, JSON.stringify(card, null, 1));
  console.log(JSON.stringify({ verdicts: card.verdicts, hard: hard.length, soft: soft.length, builtins: builtins.length, trainFiles: files.length, trainRepos: tv.repos.length, distinctNames: tally.names.size, genericNames: generic, declarations: tally.declarations, written, ms: card.ms }, null, 1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}
