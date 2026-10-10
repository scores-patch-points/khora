#!/usr/bin/env node
// build-ruby-priors.mjs: build the two RECEIVED priors for the programming language "ruby" from TRAIN ONLY, and measure them.
//
//   node eval/coding-competence/build-ruby-priors.mjs [--out DIR] [--priors DIR] [--no-write-priors]
//
// Writes (new files only; it refuses to overwrite a file it did not build):
//   native/priors/code-kw-ruby-grammar.json   CodeKeywordPrior@1  hard keywords (refuse BINDING names), soft keywords + builtins (never refuse)
//   native/priors/code-name-ruby-grammar.json CodeNamePrior@1     distinct-TRAIN-repo counts of declared method/class/module names (genericity)
//   <out>/card-ruby-priors-train.json         the measured card: every check below, with denominators, passes AND failures
//   <out>/ruby-law-prior.json                 the giver's LanguageLawPrior@1 (ruby_kw_giver.py)
// <out> defaults to /private/tmp/claude-501/coding-competence/ruby-priors. It never opens a dev or test file.
//
// WHY THE FILES ARE NOT NAMED code-kw-ruby.json / code-name-ruby.json: both of those already exist (built 2026-10-05 by earlier work: a lowercase
// heuristic over grammar.js, and eval/coding-competence/build-c2-priors.mjs). Rule 10 forbids editing existing priors, so the new priors live beside
// them under a `-grammar` name (the convention of priors/code-kw-c-grammar.json) and the main agent promotes them (cp) when it chooses to. The card
// measures the incumbent against the new prior (K5, N1) so the choice is made on numbers.
//
// GIVERS (READING-POLICY rule 3: every prior names its giver):
//   code-kw-ruby-grammar: the tree-sitter grammar for ruby (tree-sitter-language-pack 1.21.0; upstream tree-sitter/tree-sitter-ruby, MIT) for the
//     word tokens, arbitrated by MRI Ruby 2.6.10 (Ripper's lexer and RubyVM::InstructionSequence compile probes, which execute nothing) for which
//     words are RESERVED. Derived by eval/coding-competence/ruby_kw_giver.py (pre-registered in its own header, K1..K4, K7; amended there after the
//     first run, in the open), projected to the CodeKeywordPrior@1 schema by the EXISTING, UNMODIFIED scripts/build-code-keyword-prior.mjs. No
//     keyword is typed here and no corpus file is read to derive the keyword set; TRAIN gold is read only to WITNESS it (R1..R5).
//   code-name-ruby-grammar: a treebank-like corpus: the manifest's ruby TRAIN split, restricted to the FETCHED permissively licensed repositories
//     (4 repositories, 240 files: Homebrew/brew BSD-2-Clause, apache/thrift Apache-2.0, fastlane/fastlane MIT, postalserver/postal MIT). The labels
//     are the tree-sitter grammar's definition-name nodes (gold.py, tags.scm of the language pack; CORE kinds method, class, module). Ruby has no
//     regex recipe in adapters/text/code-structure.js or scripts/build-code-name-prior-split.mjs (neither knows ruby), so the grammar IS the
//     recipe. Names are counted per distinct REPOSITORY, never per file, so near-duplicate files cannot inflate genericity.
//
// PRE-REGISTRATION (READING-POLICY II.5; this header was written BEFORE the first run of this file; thresholds are declared, never tuned,
// and every failure is reported as a failure).
//
// WHAT WAS SEEN BEFORE THIS HEADER (disclosed; nothing else was looked at):
//   (a) manifest.languages.ruby: TRAIN = 241 rows in 5 repositories (Homebrew/brew 60, apache/thrift 60, fastlane/fastlane 60, postalserver/postal 60,
//       rails/rails 1); dev 3 repos, test 3 repos. The four 60-file repositories were fetched (origin "fetched", commit and licence text verified);
//       rails/rails is origin "ethos-local" (a local copy, commit null, licence "known-upstream-unverified-locally"). No dev or test file was opened.
//   (b) ruby_kw_giver.py was run three times (the pre-registration, then two amendments disclosed in its header). Final: hard = 38 words, soft = [i, r,
//       ri]; K1, K1c, K2, K7 pass; K3 FAILS (the grammar lexes __FILE__, __LINE__, __ENCODING__ as plain identifiers although MRI reserves them);
//       K4 = 16 of 37 plain engine-reserved words parse cleanly as a binding name in the grammar (and, do, else, elsif, end, ensure, false, in, nil, or,
//       rescue, self, super, then, true, when).
//   (c) the incumbent priors/code-kw-ruby.json (34 words; contains i, r, ri; lacks BEGIN, END, defined?, false, self, super, true) and the header counts
//       and the 30 most widely attested names of the existing priors/code-name-ruby.json (998 names, 1552 declarations, 22 names in >= 2 of its 5
//       repositories; initialize in 5, run and create in 4, listen in 3). N6 below is informed by that peek and is only a sanity bound.
//   (d) a gold extraction of one AUTHORED snippet (model-written, /private/tmp/claude-501/coding-competence/ruby-priors/authored-shapes.rb) and of one TRAIN
//       file (Homebrew cmd/tap.rb). They showed: gold emits NO def for setters (`def name=(v)`) or operator methods (`def ==`, `def []`); a scoped
//       `class Foo::Bar` is one def named "Foo::Bar"; `def end` is a method def named "end"; in member positions (`x.class`, `r.end`, `s&.begin`) and as
//       `def` names a reserved word is a token of type `identifier`, as a hash label it is `hash_key_symbol`, `:then` is `simple_symbol`; the numeric
//       suffix tokens `r` and `i` of `3r + 2i` carry gold class `keyword`; `self` carries class keyword, `true` class literal.
//   (e) the reference path of build-c2-priors.mjs (read, not run here): it keys a name by the TEXT OF THE GOLD TOKEN containing the def's nameStart, so a
//       scoped `class Foo::Bar` is tallied under its FIRST token `Foo` (the def is "partial" in c2-lib's own counter).
//
// WHICH TRAIN FILES (rule 11, declared): only rows with origin "fetched" and a verified licence text; the one ethos-local rails/rails row is EXCLUDED from
// the shipped prior and from every witness, and used ONLY in the N1 reference arm (to reproduce the incumbent's file set). Reason: its licence is not
// verified locally and a single file is not a repository sample (it would count as an independent repository for genericity on the strength of one file).
// The effect of including it is measured and reported (informational I1).
//
// RECIPE (declared). A tallied declaration is a gold def of a CORE kind (gold.mjs CORE_DEF_KINDS: here method, class, module). Its NAME is the def's name
// with any scope prefix removed (`Foo::Bar` -> `Bar`: the name the declaration actually introduces; the same module reopened as `module Foo; class Bar`
// is the same being). It must match the Ruby identifier law /^[\p{L}_][\p{L}\p{N}_]*[?!]?$/u; a def whose name does not is counted in N5 and not tallied.
// A file whose parse has error_bytes_frac > 0.02 is excluded and reported (gold P2's declared tolerance, the same as c2-lib PARSE_FAIL).
//
// PREDICTIONS AND PASS RULES (an unmeasured or unlicensed check is "unlicensed"/"gap", never "pass"):
//   K1..K4, K7 (giver): rules in ruby_kw_giver.py; observed in (b). K3 failed there; it stands as a failure.
//   K5 incumbent comparison. Every word in the incumbent hard set that is NOT in the new hard set is accepted by MRI as a binding name (so the incumbent
//      over-refuses); every word of the new hard set that the incumbent lacks is reserved by MRI. Pass: both. Expected: pass; incumbent-only = {i, r, ri},
//      new-only = {BEGIN, END, defined?, false, self, super, true} (31 shared).
//   K6 control for K1 (the statistic must move). The giver's word rule (c0_grammar_keywords.py, run UNMODIFIED) applied to the python, javascript, go,
//      c and java grammars gives candidate sets whose symmetric difference with ruby's hard set is >= 10 for EVERY one of them. Pass: all five >= 10.
//   N1 sum check (reference equivalence). My aggregator, fed the prepareFile units of c2-lib (imported unchanged) for ALL 241 TRAIN rows (the incumbent's
//      file set, rails included), reproduces priors/code-name-ruby.json entry for entry (names, repos, files, kinds) and its header counts; and the
//      independent per-repository partition of the SHIPPED tally sums to its pooled attestation count. Pass: both exact. Expected: pass. FAILURE REFUSES
//      THE NAME-PRIOR WRITE (a drifted aggregator). The scoped-name difference between the reference's token rule and the shipped recipe is reported as
//      N1b (informational): expected to be confined to names that begin a scoped class/module (the reference says `Foo`, the shipped recipe `Bar`).
//   N2 TRAIN purity. Every file read is a manifest ruby TRAIN row, restricted=false, origin fetched, whose bytes match its manifest sha256 and whose path
//      is under the fetched raw corpus; every repository has manifest.repos[repo].global_split == "train", permissive licence class, a verified licence
//      text family, a recorded commit, and appears in no ruby dev or test row; the repositories read equal info.repos.train minus the excluded ethos-local
//      one. Pass: all exact. Expected: pass. FAILURE REFUSES THE WRITE.
//   N3 recipe validity: {applicable:false, reason}: the labels ARE the grammar's definition nodes, so there is no second recipe to validate against it.
//   N4 genericity is real, not an artefact of file counting (leave-one-REPOSITORY-out inside TRAIN, the only held-out available without touching dev).
//      For each TRAIN repo h, from the OTHER three: G = names declared in >= 2 of them, S = names declared in exactly 1. Hit = declared in h.
//      lift = (hits_G / |G|) / (hits_S / |S|), pooled over the four folds. Pass: pooled lift >= 2.0 AND every fold's lift > 1.0.
//      CONTROL BUILT TO FAIL (II.23): each repository's declared-name set is replaced by an independent uniform random subset of the pooled vocabulary of
//      the same size (cross-repository identity destroyed; sizes kept), 200 seeded draws. LICENCE: the control's median pooled lift is in [0.5, 1.5] and
//      the real lift exceeds the control's MAXIMUM; otherwise "unlicensed". Expected: pass with a large lift (initialize, run, create, to_s recur), but
//      UNDERPOWERED (four disparate repositories: a package manager, an RPC compiler, a CI tool, a mail server); a "fail" on one fold or "unlicensed" is
//      a plausible outcome (~30%) and will be reported as such.
//   N5 (informational, no pass rule) recipe gaps: gold defs not tallied because the name is not an identifier; setters and operator methods that gold
//      does not emit at all (counted from the grammar: `setter` method nodes and operator method names, via a second parse is NOT done; the gap is
//      typed with the authored-snippet evidence of (d) and the count of TRAIN `def name=` and `def <op>` lines found by a literal line scan, labelled
//      as a scan, not as gold).
//   N6 sanity bound (informed by peek (c)). distinct names in [700, 1300] and names attested in >= 2 repositories in [8, 40].
//   N7 reader agreement (informational typed gap). adapters/text/code-structure.js::parseDeclarations (imported read-only) returns NO declarations for
//      .rb files (it has no ruby recipe): the number of TRAIN files and of gold CORE defs it misses is reported. Prediction: 0 declarations on every file.
//   R1 refusal polarity, BINDING DEFS (class and module names, which must be constants). Over every class/module def-name in TRAIN: ZERO names are in the
//      hard keyword set. LICENCE (control built to fail): the random control (38 names drawn from the binding-name vocabulary, 200 draws) has mean >= 1
//      AND at least one language-deranged control fires: the incumbent hard set >= 1, or the python hard set >= 1; otherwise R1 is "unlicensed".
//      Expected: real 0; and "unlicensed" (~65%), because a constant-named class cannot collide with a lowercase keyword for ANY set, so no deranged
//      control can fire. R4a below is the licensed test of the same polarity.
//   R1m (informational, no pass rule) METHOD defs (member position): method names that are in the hard set, with counts and examples. PREDICTION: > 0
//      (`def end`, `def class`, `def then`, `def in`...): it supports the statement that the hard set refuses BINDING names only. Uncertain (~55%).
//   R2 token coverage. Of TRAIN gold tokens classed `keyword`, the fraction whose text is in (hard U soft) is >= 0.99. Control: the python keyword set
//      (hard U soft of priors/code-kw-python.json) as the prior must cover at least 0.10 LESS (else unlicensed). Expected: pass; the texts outside the
//      prior are listed.
//   R3 attestation. At least 28 of the 38 hard keywords occur in TRAIN as a structural token (gold class not comment, string or identifier). Unattested
//      words are listed (a typed gap: received but unwitnessed). Expected: 31 to 35 attested; BEGIN, END, redo, undef are the candidates for the gap.
//      Note: self/nil/true/false/super may be classed literal, which counts as structural here.
//   R4a no identifier collision, BINDING TOKENS. A binding token is a gold token of type `identifier` that is not preceded by `.`, `&.` or `::` and is not a
//      method def-name. ZERO binding tokens have a hard keyword as text. LICENCE: the incumbent hard set collides on the same tokens at least once (a
//      variable named i, r, ri); otherwise unlicensed. Expected: 0; incumbent >= 1 (`i` is the commonest loop variable).
//   R4b (informational, no pass rule) member tokens: gold identifier tokens preceded by `.`, `&.` or `::` (or a def name) whose text is a hard keyword
//      (`x.class`, `r.end`, `.then`, `.begin`). PREDICTION: > 0 and large (hundreds): the clearest measure of the binding-only limit.
//   R5 (informational, no pass rule) shadowing. TRAIN CORE definitions whose name is a Kernel function or a core constant of the engine (builtins) or a
//      soft keyword, with counts and examples. Prediction: > 0 builtin shadowings exist (a method named select, format, open, test, p, print, system...).
//   I1 (informational) effect of the excluded rails/rails file on the shipped tally: names it adds, names whose repo count it changes, change in the number
//      of names at the generic floor.
//
// FIRST-RUN RESULTS (appended AFTER the first run was seen; changes no verdict, no threshold and no prediction above; the card is the record).
//   Held as predicted: K1 K2 K4 K5 K6 K7 pass; N1 pass (all 998 incumbent entries and its 1552 declarations reproduced exactly); N2 pass; N4 pass (pooled lift
//   28.4, every fold > 22, control median 0.95, control max 1.37: licensed); N6 pass (943 names, 19 at the floor); N7 0 declarations; R1 UNLICENSED (as
//   expected: no deranged control can collide with a constant-named class); R2 pass (coverage 1.0, python control 0.23); R3 pass (34 of 38; BEGIN, END, redo,
//   undef unattested); R4a pass (0 collisions on 26567 binding tokens; the incumbent collides 64 times: i 43, r 21: licensed); R5 10 builtin-shadowing defs.
//   Departures: K3 FAILS in the giver (3 dunder words); R1m = 0 (the prediction "> 0" FAILED: none of the 1129 TRAIN method defs is named by a hard word, so
//   the binding-only limit is established by the engine (K7) and by R4b but NOT observed on defs); R4b = 146 member tokens (and 85, class 52, not 4, for 2,
//   retry 2, then 1): > 0 as predicted, but "hundreds" is only loosely true; N1b's scoped-name prediction is vacuous (0 scoped defs in TRAIN).
//
// LAWS APPLIED: causal (priors carry no whole-text statistic over a unit being judged; this file only counts); identity does not decay; priors refuse or
// nominate, never admit; capitalisation is not read anywhere (names are exact strings; PascalCase is not a witness here); every threshold above is declared;
// gaps are typed with denominators; held-out discipline (TRAIN only; the leave-one-repo-out is a TRAIN-internal split by repository); no model.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { goldBatch, goldAvailable, GOLD_VERSION, CORE_DEF_KINDS } from "./gold.mjs";
import {
  sha256, trainDigest, compareNameTables, namesObject, attestationTotal, loroLift, controlLifts, decideN4,
  fnv1a, mulberry32, sampleWithoutReplacement, NATIVE, MANIFEST, RAW_ROOT,
} from "./build-python-priors.mjs";
import { prepareFile } from "./c2-lib.mjs";
import { parseDeclarations, loadCodeKeywordPrior, loadCodeNamePriorSplit } from "../../adapters/text/code-structure.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_OUT = process.env.RUBYPRIORS_OUT || "/private/tmp/claude-501/coding-competence/ruby-priors";
const PYTHON = process.env.GOLD_PYTHON || "/private/tmp/claude-501/venv/bin/python";
const TS_CACHE = process.env.GOLD_TS_CACHE || "/private/tmp/claude-501/coding-competence/ts-cache";
export const LANGUAGE = "ruby";
export const KW_FILE = "code-kw-ruby-grammar.json";
export const NAME_FILE = "code-name-ruby-grammar.json";

// declared constants (header)
export const CONSTS = Object.freeze({
  GENERIC_FLOOR: 2, LIFT_MIN: 2.0, LIFT_FOLD_MIN: 1.0, CONTROL_MEDIAN_LO: 0.5, CONTROL_MEDIAN_HI: 1.5, CONTROL_DRAWS: 200,
  K6_MIN_SYMDIFF: 10, R2_MIN: 0.99, R2_CONTROL_GAP: 0.10, R3_MIN_ATTESTED: 28, PARSE_FAIL: 0.02,
  N6_NAMES: [700, 1300], N6_GENERIC: [8, 40], SEED: "ruby-priors-v1",
});
export const IDENT_RB = /^[\p{L}_][\p{L}\p{N}_]*[?!]?$/u;
const WORDLIKE = /^[\p{L}_$]/u; // name-gate.js isWordLike, restated so this file does not depend on a second copy drifting silently (N1 checks it)
export const MEMBER_OPS = Object.freeze([".", "&.", "::"]);
export const MEMBER_DEF_KINDS = Object.freeze(["method"]);
export const BINDING_DEF_KINDS = Object.freeze(["class", "module"]);

/** declared name of a def: the scope prefix removed (`Foo::Bar` -> `Bar`) */
export const declaredName = (name) => String(name).split("::").pop();

// ── TRAIN purity (N2): fetched, verified-licence rows only ─────────────────────────────────────────────────────────────────────────────
export function verifyTrainRuby(manifest) {
  const L = manifest.languages[LANGUAGE];
  const problems = [];
  const rows = [], excluded = [];
  for (const r of L.train) {
    if (r.restricted) excluded.push({ repo: r.repo, rel: r.rel, why: "restricted" });
    else if (r.origin !== "fetched") excluded.push({ repo: r.repo, rel: r.rel, why: `origin ${r.origin}: licence "${manifest.repos[r.repo]?.license_source ?? manifest.repos[r.repo]?.license}", commit ${manifest.repos[r.repo]?.commit ?? "null"}: not verified at fetch (rule 11)`, row: r });
    else rows.push(r);
  }
  const devTest = new Set([...L.dev, ...L.test].map((r) => r.repo));
  const repos = [...new Set(rows.map((r) => r.repo))].sort();
  for (const repo of repos) {
    const m = manifest.repos[repo];
    if (!m) { problems.push(`repo ${repo} not in manifest.repos`); continue; }
    if (m.global_split !== "train") problems.push(`repo ${repo} global_split=${m.global_split}`);
    if (m.restricted) problems.push(`repo ${repo} is restricted`);
    if (m.license_class !== "permissive") problems.push(`repo ${repo} license_class=${m.license_class}`);
    if (!m.license_text_family) problems.push(`repo ${repo} has no verified licence text family`);
    if (!m.commit || !m.url) problems.push(`repo ${repo} has no recorded commit/url`);
    if (devTest.has(repo)) problems.push(`repo ${repo} also appears in a ruby dev/test row`);
  }
  const onlyExcluded = [...new Set(excluded.map((r) => r.repo))].filter((r) => !repos.includes(r)).sort();
  const infoTrain = [...(L.info?.repos?.train ?? [])].sort();
  const expect = infoTrain.filter((r) => !onlyExcluded.includes(r));
  if (JSON.stringify(expect) !== JSON.stringify(repos)) problems.push(`repos read ${JSON.stringify(repos)} != info.repos.train minus excluded-only ${JSON.stringify(expect)}`);
  for (const r of rows) {
    if (!r.path.startsWith(RAW_ROOT)) problems.push(`row ${r.repo}:${r.rel} is not under the fetched raw corpus (${r.path})`);
    let b = null;
    try { b = fs.readFileSync(r.path); } catch { problems.push(`row ${r.repo}:${r.rel} unreadable`); continue; }
    if (sha256(b) !== r.sha256) problems.push(`row ${r.repo}:${r.rel} sha256 mismatch`);
  }
  return { rows, excluded, repos, onlyExcluded, problems };
}

// ── the tally ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * tallyDefs(docs) -> { names: Map(name -> {repos:Set, files:Set, kinds:Set, n}), perRepo: Map(repo -> Set(name)), declarations, files, notIdentifier:[...], bySource }
 *   docs: [{ repo, rel, text, gold }]; every gold def of a CORE kind is one declaration (deduplicated on nameStart within a file).
 */
export function tallyDefs(docs) {
  const names = new Map();
  const perRepo = new Map();
  let declarations = 0;
  const notIdentifier = [];
  const scoped = { defs: 0, examples: [] };
  for (const d of docs) {
    if (!perRepo.has(d.repo)) perRepo.set(d.repo, new Set());
    const seen = new Set();
    for (const df of d.gold.defs) {
      if (!CORE_DEF_KINDS.includes(df.kind)) continue;
      if (seen.has(df.nameStart)) continue;
      seen.add(df.nameStart);
      const name = declaredName(df.name);
      if (String(df.name).includes("::")) { scoped.defs++; if (scoped.examples.length < 6) scoped.examples.push(df.name); }
      if (!IDENT_RB.test(name)) { notIdentifier.push({ name: df.name, kind: df.kind, file: `${d.repo}/${d.rel}` }); continue; }
      declarations++;
      let rec = names.get(name);
      if (!rec) { rec = { repos: new Set(), files: new Set(), kinds: new Set(), n: 0 }; names.set(name, rec); }
      rec.repos.add(d.repo); rec.files.add(`${d.repo}/${d.rel}`); rec.kinds.add(df.kind); rec.n++;
      perRepo.get(d.repo).add(name);
    }
  }
  return { names, perRepo, declarations, files: docs.length, notIdentifier, scoped };
}

/** the reference path (build-c2-priors.mjs deriveFromPrepared, restated as an aggregator over c2-lib's prepareFile units): name = text of the gold token holding nameStart */
export function tallyReference(docs) {
  const stat = new Map();
  docs.forEach((d, fi) => {
    const prepared = prepareFile(d.text, d.gold);
    for (const u of prepared.units) {
      if (u.label !== "core") continue;
      const w = prepared.stream[u.i];
      let s = stat.get(w);
      if (!s) { s = { core: 0, repos: new Set(), files: new Set(), kinds: new Set() }; stat.set(w, s); }
      s.core++; s.repos.add(d.repo); s.files.add(fi); if (u.kind) s.kinds.add(u.kind);
    }
  });
  const names = {};
  let declarations = 0;
  for (const w of [...stat.keys()].sort()) { const s = stat.get(w); names[w] = { repos: s.repos.size, files: s.files.size, kinds: [...s.kinds].sort() }; declarations += s.core; }
  return { names, declarations };
}

/** Independent per-repository partition: tally each repository on its own; the sum of their distinct-name counts must equal the pooled attestation count. */
export function partitionSumDefs(docs) {
  const byRepo = new Map();
  for (const d of docs) { if (!byRepo.has(d.repo)) byRepo.set(d.repo, []); byRepo.get(d.repo).push(d); }
  let sum = 0;
  for (const ds of byRepo.values()) sum += tallyDefs(ds).names.size;
  return sum;
}

// ── R1..R5: witnesses of the keyword prior against TRAIN gold ──────────────────────────────────────────────────────────────────────
const NON_STRUCTURAL = new Set(["comment", "string", "identifier"]);
const mapToObj = (m) => Object.fromEntries([...m].sort((a, b) => (typeof b[1] === "number" ? b[1] : b[1].n) - (typeof a[1] === "number" ? a[1] : a[1].n) || (a[0] < b[0] ? -1 : 1)));

/**
 * witnessKeywords({ hard, soft, builtins, incumbentHard, pythonHard, pythonSoft, docs, seed, draws }) -> the R1..R5 measurements.
 *   docs: [{ repo, rel, text, gold }]  gold = a gold.mjs result (no `error`)
 */
export function witnessKeywords({ hard, soft, builtins, incumbentHard, pythonHard, pythonSoft, docs, seed = CONSTS.SEED, draws = CONSTS.CONTROL_DRAWS }) {
  const hardSet = new Set(hard), softSet = new Set(soft), prior = new Set([...hard, ...soft]);
  const incSet = new Set(incumbentHard || []), pyHard = new Set(pythonHard || []), pyAll = new Set([...(pythonHard || []), ...(pythonSoft || [])]);
  const builtinSet = new Set((builtins || []).filter((b) => !hardSet.has(b)));
  const kwTokens = new Map();
  const attest = new Map(hard.map((w) => [w, 0]));
  const collisions = new Map(), incCollisions = new Map();   // binding token: hard text -> {n, files}
  const memberTok = new Map();                               // member token: hard text -> n
  const declBinding = new Map(), declMember = new Map();     // def name -> count
  const nodeKinds = new Map();
  const coreShadow = { builtin: new Map(), soft: new Map() };
  let nTokens = 0, nDefs = 0, nCoreDefs = 0, nBindingTok = 0, nMemberTok = 0;
  for (const d of docs) {
    const g = d.gold;
    const defNameStarts = new Set(g.defs.filter((df) => MEMBER_DEF_KINDS.includes(df.kind) || BINDING_DEF_KINDS.includes(df.kind)).map((df) => df.nameStart));
    const sig = g.tokens.filter((t) => t.class !== "comment");
    for (let i = 0; i < sig.length; i++) {
      const t = sig[i];
      nTokens++;
      const cls = t.class;
      if (cls === "string") continue;
      const txt = d.text.slice(t.start, t.end);
      if (cls === "keyword") kwTokens.set(txt, (kwTokens.get(txt) || 0) + 1);
      if (hardSet.has(txt) && !NON_STRUCTURAL.has(cls)) attest.set(txt, attest.get(txt) + 1);
      if (t.type === "identifier") {
        const prev = i > 0 ? d.text.slice(sig[i - 1].start, sig[i - 1].end) : "";
        const member = MEMBER_OPS.includes(prev) || prev === "def" || defNameStarts.has(t.start);
        if (member) {
          nMemberTok++;
          if (hardSet.has(txt)) memberTok.set(txt, (memberTok.get(txt) || 0) + 1);
        } else {
          nBindingTok++;
          if (hardSet.has(txt)) { const r = collisions.get(txt) || { n: 0, files: new Set() }; r.n++; r.files.add(`${d.repo}/${d.rel}`); collisions.set(txt, r); }
          if (incSet.has(txt)) { const r = incCollisions.get(txt) || { n: 0, files: new Set() }; r.n++; r.files.add(`${d.repo}/${d.rel}`); incCollisions.set(txt, r); }
        }
      }
    }
    for (const df of g.defs) {
      nDefs++;
      nodeKinds.set(df.node, (nodeKinds.get(df.node) || 0) + 1);
      const name = declaredName(df.name);
      const table = BINDING_DEF_KINDS.includes(df.kind) ? declBinding : declMember;
      table.set(name, (table.get(name) || 0) + 1);
      if (CORE_DEF_KINDS.includes(df.kind)) {
        nCoreDefs++;
        if (builtinSet.has(name)) coreShadow.builtin.set(name, (coreShadow.builtin.get(name) || 0) + 1);
        if (softSet.has(name)) coreShadow.soft.set(name, (coreShadow.soft.get(name) || 0) + 1);
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
    R1m: { hardNamedMethods: member.n, examples: member.examples, denominatorMethodDefs: sumOf(declMember), byName: mapToObj(new Map([...declMember].filter(([k]) => hardSet.has(k)))) },
    R2: { keywordTokens: kwTotal, inPrior: kwIn, coverage: kwTotal ? kwIn / kwTotal : null, controlPythonCoverage: kwTotal ? kwInPy / kwTotal : null, outsidePrior: outside.slice(0, 25), distinctOutside: outside.length, keywordTokenTexts: mapToObj(kwTokens) },
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
    R1m: w.R1m.hardNamedMethods > 0 ? "informational:binding-only-limit-observed" : "informational:no-method-collision-seen",
    R2: !r2Lic ? "unlicensed" : w.R2.coverage >= C.R2_MIN ? "pass" : "fail",
    R3: w.R3.attested >= C.R3_MIN_ATTESTED ? "pass" : "fail",
    R4a: !r4Lic ? "unlicensed" : w.R4a.collisions === 0 ? "pass" : "fail",
    R4b: w.R4b.hardTextAsMember > 0 ? "informational:binding-only-limit-observed" : "informational:no-member-use-seen",
    R5: w.R5.softShadowingDefs + w.R5.builtinShadowingDefs > 0 ? "informational:supports-polarity" : "informational:no-shadowing-seen",
  };
}

// ── main ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status}): ${(r.stderr || r.stdout || "").slice(-600)}`);
  return r;
}
const sym = (a, b) => [...new Set([...a, ...b])].filter((x) => a.includes(x) !== b.includes(x)).sort();
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

async function main() {
  const argv = process.argv.slice(2);
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
  const OUT = opt("--out", DEFAULT_OUT);
  const PRIORS = opt("--priors", path.join(NATIVE, "priors"));
  const writePriors = !argv.includes("--no-write-priors");
  fs.mkdirSync(OUT, { recursive: true });
  const t0 = Date.now();
  const card = { schema: "RubyPriorsCard@1", language: LANGUAGE, split: "train", builtAt: new Date().toISOString(), goldVersion: GOLD_VERSION, consts: CONSTS, checks: {}, verdicts: {}, gaps: [] };
  const cardPath = path.join(OUT, "card-ruby-priors-train.json");
  const refuse = (why) => { card.refused = why; fs.writeFileSync(cardPath, JSON.stringify(card, null, 1)); console.error(`REFUSED: ${why}`); process.exit(1); };

  // ── N2 TRAIN purity ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  const manifest = readJson(MANIFEST);
  const tv = verifyTrainRuby(manifest);
  card.checks.N2 = { rows: tv.rows.length, repos: tv.repos, excluded: tv.excluded.map((r) => ({ repo: r.repo, rel: r.rel, why: r.why })), onlyExcludedRepos: tv.onlyExcluded, problems: tv.problems };
  card.verdicts.N2 = tv.problems.length ? "fail" : "pass";
  if (tv.problems.length) refuse(`N2 TRAIN purity failed: ${tv.problems.slice(0, 3).join("; ")}`);
  const files = tv.rows.map((r) => ({ repo: r.repo, rel: r.rel, text: fs.readFileSync(r.path, "utf8"), bytes: r.bytes, row: r }));
  const digest = trainDigest(tv.rows);
  const excludedRows = tv.excluded.filter((r) => r.row).map((r) => ({ repo: r.repo, rel: r.rel, text: fs.readFileSync(r.row.path, "utf8"), bytes: r.row.bytes, row: r.row }));
  if (excludedRows.some((r) => sha256(Buffer.from(r.text)) !== r.row.sha256)) refuse("N2: an excluded ethos-local row does not match its manifest sha256");

  // ── the keyword giver and projection ────────────────────────────────────────────────────────────────────────────────────────
  const lawPath = path.join(OUT, "ruby-law-prior.json");
  const giverOut = run(PYTHON, [path.join(HERE, "ruby_kw_giver.py"), lawPath]).stdout.trim().split("\n").pop();
  const law = readJson(lawPath);
  const kwTmp = path.join(OUT, "code-kw-ruby-grammar.builder-output.json");
  run(process.execPath, [path.join(NATIVE, "scripts/build-code-keyword-prior.mjs"), lawPath, kwTmp, LANGUAGE]);
  const kw = readJson(kwTmp);
  const hard = kw.keywords, soft = kw.softKeywords, builtins = kw.builtins;
  const dv = law.derivation;
  const verdictOf = (c) => (c.pass ? "pass" : "fail");
  card.checks.K = { giverRun: JSON.parse(giverOut), K1: dv.checks.K1, K1c: dv.checks.K1c, K2: { pass: dv.checks.K2.pass, soft: dv.checks.K2.soft, mixed: dv.checks.K2.mixed }, K3: dv.checks.K3, K4: dv.checks.K4, K7: dv.checks.K7 };
  card.verdicts.K1 = dv.checks.K1c.licensed ? verdictOf(dv.checks.K1) : "unlicensed";
  card.verdicts.K2 = verdictOf(dv.checks.K2); card.verdicts.K3 = verdictOf(dv.checks.K3); card.verdicts.K7 = verdictOf(dv.checks.K7);
  card.verdicts.K4 = dv.checks.K4.prediction_gt_0_held ? "pass" : "fail";

  // K5: the incumbent (priors/code-kw-ruby.json, read-only)
  const oldKw = readJson(path.join(NATIVE, "priors/code-kw-ruby.json"));
  const incumbentOnly = oldKw.keywords.filter((w) => !hard.includes(w)).sort();
  const newOnly = hard.filter((w) => !oldKw.keywords.includes(w)).sort();
  const reserved = new Set(dv.engineReserved);
  card.checks.K5 = {
    against: "priors/code-kw-ruby.json", incumbentHardCount: oldKw.keywords.length, newHardCount: hard.length, shared: hard.length - newOnly.length,
    incumbentOnly, incumbentOnlyAcceptedByEngine: incumbentOnly.filter((w) => !reserved.has(w)), newOnly, newOnlyReservedByEngine: newOnly.filter((w) => reserved.has(w)),
    engineReservedWordsInNeitherPrior: dv.engineReserved.filter((w) => !hard.includes(w) && !oldKw.keywords.includes(w)),
    softOnlyHere: soft.filter((w) => !(oldKw.softKeywords || []).includes(w)),
  };
  card.verdicts.K5 = card.checks.K5.incumbentOnlyAcceptedByEngine.length === incumbentOnly.length && card.checks.K5.newOnlyReservedByEngine.length === newOnly.length ? "pass" : "fail";

  // K6: the same word rule on other grammars must NOT return ruby's list (control for K1)
  const ctlOut = path.join(OUT, "grammar-keywords-controls.json");
  const ctlLangs = ["python", "javascript", "go", "c", "java"];
  run(PYTHON, [path.join(HERE, "c0_grammar_keywords.py"), ctlOut, ...ctlLangs]);
  const ctl = readJson(ctlOut).languages;
  card.checks.K6 = Object.fromEntries(ctlLangs.map((l) => [l, { candidates: ctl[l]?.keywords?.length ?? null, symmetricDifferenceWithRubyHard: ctl[l]?.keywords ? sym(hard, ctl[l].keywords).length : null, error: ctl[l]?.error ?? null }]));
  card.verdicts.K6 = ctlLangs.every((l) => (card.checks.K6[l].symmetricDifferenceWithRubyHard ?? -1) >= CONSTS.K6_MIN_SYMDIFF) ? "pass" : "fail";

  // ── gold ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const ga = goldAvailable();
  if (!ga.available) refuse(`gold unavailable: ${ga.reason} (the name prior and the witnesses are read off gold)`);
  const goldRows = [...files, ...excludedRows];
  const golds = await goldBatch(goldRows.map((f) => ({ language: LANGUAGE, text: f.text, fileName: f.rel })));
  const bad = [], tooBroken = [];
  const docsAll = [];
  goldRows.forEach((f, i) => {
    const g = golds[i];
    if (g?.error) { bad.push({ file: `${f.repo}/${f.rel}`, error: String(g.error).slice(0, 120) }); return; }
    if ((g.parse?.error_bytes_frac ?? 0) > CONSTS.PARSE_FAIL) { tooBroken.push({ file: `${f.repo}/${f.rel}`, error_bytes_frac: g.parse.error_bytes_frac }); return; }
    docsAll.push({ repo: f.repo, rel: f.rel, text: f.text, gold: g, excluded: excludedRows.includes(f) });
  });
  const docs = docsAll.filter((d) => !d.excluded);
  card.checks.goldFiles = { requested: goldRows.length, shippedArmRequested: files.length, parsed: docsAll.length, shippedArmParsed: docs.length, errors: bad, excludedForParseFailure: tooBroken, withParseError: docsAll.filter((d) => d.gold.parse?.has_error).length };

  // ── N1 sum check (reference equivalence) ──────────────────────────────────────────────────────────────────────────────────────
  const refPrior = readJson(path.join(NATIVE, "priors/code-name-ruby.json"));
  const refMine = tallyReference(docsAll);
  const cmp = compareNameTables(refMine.names, refPrior.names);
  const shipped = tallyDefs(docs);
  const mine = namesObject(shipped.names);
  const partition = partitionSumDefs(docs);
  const attest = attestationTotal(shipped.names);
  const countsMatch = refPrior.counts.distinctNames === Object.keys(refMine.names).length && refPrior.counts.totalDeclarations === refMine.declarations && refPrior.counts.files === docsAll.length;
  card.checks.N1 = {
    referencePrior: "priors/code-name-ruby.json (built by eval/coding-competence/build-c2-priors.mjs; read, not modified)", filesInReferenceArm: docsAll.length, compare: cmp, countsMatch,
    referenceCounts: refPrior.counts, myReferenceArmCounts: { distinctNames: Object.keys(refMine.names).length, totalDeclarations: refMine.declarations, files: docsAll.length },
    shippedPartitionSum: partition, shippedPooledAttestations: attest,
  };
  card.verdicts.N1 = cmp.equal && countsMatch && partition === attest ? "pass" : "fail";
  // N1b: shipped recipe vs the reference's token rule, on the same files minus the excluded row (informational)
  const refShippedArm = tallyReference(docs);
  const cmpB = compareNameTables(mine, refShippedArm.names);
  card.checks.N1b = {
    note: "shipped recipe (declared name = scope prefix removed, 4 fetched repositories) vs the reference token rule on the same 240 files; informational",
    entries: cmpB.entries, referenceRuleEntries: cmpB.refEntries, onlyShipped: cmpB.onlyMine, onlyReferenceRule: cmpB.onlyRef, nOnlyShipped: cmpB.nOnlyMine, nOnlyReferenceRule: cmpB.nOnlyRef, nDiffering: cmpB.differing.length,
    scopedDefs: shipped.scoped, declarations: { shipped: shipped.declarations, referenceRule: refShippedArm.declarations },
  };
  card.verdicts.N1b = "informational";
  if (card.verdicts.N1 !== "pass") refuse("N1 sum check failed: my aggregator differs from the reference name prior or the per-repo partition does not sum to the pooled attestations");

  // I1: effect of the excluded rails file
  const withRails = tallyDefs(docsAll);
  const added = [...withRails.names.keys()].filter((n) => !shipped.names.has(n));
  const changedRepos = [...shipped.names].filter(([n, r]) => withRails.names.get(n).repos.size !== r.repos.size).map(([n]) => n);
  const floorOf = (t) => [...t.names.values()].filter((r) => r.repos.size >= CONSTS.GENERIC_FLOOR).length;
  card.checks.I1 = { excludedRows: excludedRows.map((r) => `${r.repo}/${r.rel}`), namesItAdds: added.length, namesWhoseRepoCountItChanges: changedRepos.length, examplesChanged: changedRepos.slice(0, 12), namesAtFloorWithout: floorOf(shipped), namesAtFloorWith: floorOf(withRails) };

  // ── N5 recipe gaps, N6 sanity ─────────────────────────────────────────────────────────────────────────────────────────────────
  const setterLines = { setters: 0, operators: 0 };
  for (const f of files) {
    for (const ln of f.text.split("\n")) {
      if (/^\s*def\s+(?:self\.)?[A-Za-z_]\w*=\s*[(\s]/.test(ln)) setterLines.setters++;
      else if (/^\s*def\s+(?:self\.)?(?:\[\]=?|<=>|===?|=~|!~?|<<|>>|<=?|>=?|\+@?|-@?|\*\*?|\/|%|&|\||\^|~)\s*[(\s]/.test(ln)) setterLines.operators++;
    }
  }
  const generic = [...shipped.names.values()].filter((r) => r.repos.size >= CONSTS.GENERIC_FLOOR).length;
  card.checks.N5 = {
    defsNotIdentifier: shipped.notIdentifier.length, examples: shipped.notIdentifier.slice(0, 8), scopedDefs: shipped.scoped.defs,
    setterAndOperatorDefsInTheSource: { ...setterLines, note: "a literal line scan of the 240 TRAIN files, NOT gold: gold.py emits no def for setters or operator methods (authored-snippet evidence (d)), so these declarations are absent from the prior", denominatorGoldCoreDefs: shipped.declarations },
  };
  card.checks.N6 = { distinctNames: shipped.names.size, namesAtOrAboveFloor: generic, boundsNames: CONSTS.N6_NAMES, boundsGeneric: CONSTS.N6_GENERIC };
  card.verdicts.N6 = shipped.names.size >= CONSTS.N6_NAMES[0] && shipped.names.size <= CONSTS.N6_NAMES[1] && generic >= CONSTS.N6_GENERIC[0] && generic <= CONSTS.N6_GENERIC[1] ? "pass" : "fail";
  card.verdicts.N3 = { applicable: false, reason: "the labels ARE the grammar's definition nodes: there is no second recipe (ruby has none in adapters/text/code-structure.js or scripts/build-code-name-prior-split.mjs) to validate against it" };
  card.gaps.push({ gap: "setters-and-operator-methods-not-tallied", ...setterLines, note: "gold.py does not emit them; typed" });

  // ── N4 leave-one-repository-out genericity, with the control built to fail ───────────────────────────────────────────────────────
  const real = loroLift(shipped.perRepo);
  const control = controlLifts(shipped.perRepo, CONSTS.CONTROL_DRAWS, CONSTS.SEED);
  const floor3 = loroLift(shipped.perRepo, 3);
  card.checks.N4 = { real, control, informationalFloor3: floor3.pooled };
  card.verdicts.N4 = decideN4(real, control, CONSTS);

  // ── N7 reader agreement (the reader is imported read-only): it has no ruby recipe ────────────────────────────────────────────────
  let readerDecls = 0, readerFiles = 0;
  for (const d of docs) { readerFiles++; readerDecls += parseDeclarations(d.text, d.rel).length; }
  card.checks.N7 = { files: readerFiles, readerDeclarations: readerDecls, goldCoreDefsMissed: shipped.declarations, note: "parseDeclarations returns [] for every .rb file: the reader has no ruby recipe (RECIPES in adapters/text/code-structure.js); typed gap, proposal in the loader-check output" };
  card.verdicts.N7 = readerDecls === 0 ? "informational:reader-has-no-ruby-recipe" : "informational:reader-reads-some-ruby";
  card.gaps.push({ gap: "reader-has-no-ruby-declaration-recipe", files: readerFiles, goldCoreDefsMissed: shipped.declarations });

  // ── R1..R5 over TRAIN gold (the 240 fetched files) ───────────────────────────────────────────────────────────────────────────────
  const py = readJson(path.join(NATIVE, "priors/code-kw-python.json"));
  const w = witnessKeywords({ hard, soft, builtins, incumbentHard: oldKw.keywords, pythonHard: py.keywords, pythonSoft: py.softKeywords, docs });
  card.checks.R = w;
  Object.assign(card.verdicts, decideR(w));

  // ── the loaders: which file does the reader serve? (typed: a source edit is needed, NOT made here) ──────────────────────────────────
  const served = loadCodeKeywordPrior("ruby");
  const nameSplit = loadCodeNamePriorSplit("ruby");
  card.checks.loader = {
    "loadCodeKeywordPrior('ruby')": served ? { hard: served.keywords.length } : null,
    "loadCodeNamePriorSplit('ruby')": nameSplit ? "served" : null,
    neededEdit: "see eval/coding-competence/ruby-priors-loader-check.mjs (prints the exact edits); nothing is edited here",
  };
  card.verdicts.summary = Object.fromEntries(Object.entries(card.verdicts).filter(([k]) => k !== "summary"));

  // ── write the two priors ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  const trainRepos = tv.repos.map((r) => ({ repo: r, url: manifest.repos[r].url, commit: manifest.repos[r].commit, license: manifest.repos[r].license, fetched_at: manifest.repos[r].fetched_at, files: docs.filter((f) => f.repo === r).length }));
  const libPath = path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/libs/libtree_sitter_ruby.dylib");
  const libSha = fs.existsSync(libPath) ? sha256(fs.readFileSync(libPath)) : null;
  const bundleDir = path.join(TS_CACHE, "tree-sitter-language-pack/v1.21.0/bundles");
  const bundle = fs.existsSync(bundleDir) ? fs.readdirSync(bundleDir).find((x) => x.startsWith("macos-arm64-")) : null;
  const g = dv.grammar;
  const kwOut = {
    ...kw,
    provenance: {
      ...kw.provenance,
      giver: `tree-sitter grammar for ruby (tree-sitter-language-pack 1.21.0) for the word tokens, arbitrated by MRI Ruby ${law.giver.engine.version} (Ripper's lexer and RubyVM::InstructionSequence compile probes, which execute nothing) for which words are reserved; hard = (grammar word tokens U grammar dedicated literal terminals) INTERSECT engine-reserved; soft = grammar anonymous word tokens the engine does not reserve; builtins = Kernel functions and core constants of the engine`,
      giverNote: law.giver.note,
      grammar: {
        name: "tree-sitter-ruby (the `ruby` grammar of the language pack)", language: "ruby", package: g.package, packageVersion: g.packageVersion, packageLicense: g.packageLicense, packageSource: g.packageSource,
        upstream: g.upstream, upstreamLicense: g.upstreamLicense, upstreamCommit: g.upstreamCommit, upstreamCommitNote: g.upstreamCommitNote,
        abi: g.abi, nodeKindCount: g.nodeKindCount, nodeKindFingerprintSha256: g.nodeKindFingerprintSha256, compiledLibrary: "libtree_sitter_ruby.dylib", compiledLibrarySha256: libSha,
        releaseBundle: bundle, releaseUrl: "https://github.com/xberg-io/tree-sitter-language-pack/releases/download/v1.21.0/parsers-macos-arm64.tar.zst",
        anonymousWordKinds: g.anonymousWordKinds, dedicatedLiteralTerminals: g.dedicatedLiteralTerminals, rule: g.rule,
      },
      engine: law.giver.engine,
      derivation: {
        script: "eval/coding-competence/ruby_kw_giver.py", projection: "scripts/build-code-keyword-prior.mjs (unmodified)", engineProbeForms: dv.engineProbeForms,
        softSources: dv.softSources, hardSources: dv.hardSources, numericSuffixProbe: dv.numericSuffixProbe, engineReserved: dv.engineReserved, engineReservedButNotGrammar: dv.engineReservedButNotGrammar, grammarDunderProbe: dv.grammarDunderProbe,
        probeVocabulary: dv.probeVocabulary, suffixWords: dv.suffixWords, builtinSources: dv.builtinSources, builtinsExcludedAsHard: dv.builtinsExcludedAsHard, inheritedObjectMethods: dv.inheritedObjectMethods,
        builtinsNote: dv.builtinsNote, stdlibModules: dv.stdlibModules, engineVersionGaps: dv.engineVersionGaps, bindingOnly: dv.bindingOnly,
        checks: Object.fromEntries(["K1", "K2", "K3", "K4", "K5", "K6", "K7"].map((k) => [k, card.verdicts[k]])),
        checkDetail: { K3: { allHardPlainWordsRefusedOnAllBindingForms: dv.checks.K3.allHardPlainWordsRefusedOnAllBindingForms, engineReservedButNotGrammar: dv.checks.K3.engineReservedButNotGrammar, why: "the grammar gives __FILE__, __LINE__, __ENCODING__ no token (plain identifier in every context probed); MRI reserves them. Kept OUT of keywords by the declared rule; listed in engineReservedNotGrammarToken" },
                       K4: { grammarAcceptsAsBindingName: dv.checks.K4.engineReservedWordsGrammarAcceptsAsBindingName, of: dv.checks.K4.of } },
      },
      assembledBy: "eval/coding-competence/build-ruby-priors.mjs (adds the grammar, engine, derivation and TRAIN-witness provenance to the unmodified builder's output; the keyword lists are the builder's, untouched)",
      noCorpusRead: "the keyword set is derived from the grammar and the engine only; no corpus file is read to derive it",
      trainWitness: { split: "train", files: w.files, repos: tv.repos.length, tokens: w.nTokens, hardKeywordsAttested: w.R3.attested, hardKeywordsUnattested: w.R3.unattested, keywordTokenCoverage: w.R2.coverage, hardKeywordsAsBindingTokens: w.R4a.collisions, bindingTokens: w.R4a.bindingTokens, hardKeywordsAsMemberTokens: w.R4b.hardTextAsMember, memberTokens: w.R4b.memberTokens, methodDefsNamedByHardWords: w.R1m.hardNamedMethods, of: w.R1m.denominatorMethodDefs, verdicts: { R1: card.verdicts.R1, R2: card.verdicts.R2, R3: card.verdicts.R3, R4a: card.verdicts.R4a } },
      polarity: "hard keywords refuse BINDING names only (a local variable, parameter, block parameter, for variable, rescue variable, constant, class or module name cannot be a reserved word; a METHOD can: `def end`, `x.class`, `r.then`; a hash label `{if: 1}` and a symbol `:end` can too); soft keywords (i, r, ri: numeric-literal suffixes, legally declarable) and builtins (Kernel functions, core constants) are recorded and NEVER refuse (S83 polarity)",
      incumbent: { file: "priors/code-kw-ruby.json", hardOnlyThere: incumbentOnly, hardOnlyHere: newOnly, note: "the incumbent refuses i, r, ri (numeric-literal suffix tokens of the grammar that MRI accepts as variable names: `i` is the commonest loop variable) and lacks BEGIN, END, defined?, false, self, super, true" },
      builtAt: new Date().toISOString().slice(0, 10),
    },
    // additive fields, ignored by every loader: the words MRI reserves that this grammar does not tokenise, and the member positions where a hard word is legal
    engineReservedNotGrammarToken: dv.engineReservedButNotGrammar,
    memberPositions: { methodNameDeclarable: hard.filter((x) => dv.checks.K7.failures.M2.indexOf(x) < 0), labelDeclarable: hard.filter((x) => dv.checks.K7.failures.M3.indexOf(x) < 0), symbolDeclarable: hard.filter((x) => dv.checks.K7.failures.M4.indexOf(x) < 0),
                       source: "engine compile probes M1..M4 (ruby_kw_giver.py K7): every reserved word compiles as a method name, a call-after-dot, a hash label and a symbol", note: "the hard set refuses BINDING names only" },
  };
  const nameOut = {
    schema: "CodeNamePrior@1",
    language: LANGUAGE,
    provenance: {
      giver: `tree-sitter grammar parses (tree-sitter-language-pack 1.21.0 via eval/coding-competence/gold.py, ${GOLD_VERSION}) of the manifest ruby TRAIN split, fetched repositories only (${tv.repos.length} permissively licensed repositories): a treebank-like corpus; labels are definition-name nodes of the grammar's own tags.scm (core kinds method, class, module)`,
      split: "train", manifest: path.basename(MANIFEST), manifestGeneratedAt: manifest.generated_at, splitRule: manifest.declared.split_rule,
      // trainRepos is an array of "owner/repo" STRINGS (the convention of priors/code-name-train-js.json, which eval/coding-competence/run.mjs priorProvenance reads as strings)
      trainRepos: tv.repos, trainRepoFiles: Object.fromEntries(trainRepos.map((r) => [r.repo, r.files])), trainRepoDetails: trainRepos, trainFiles: docs.length, trainFilesDigestSha256: digest,
      filesExcluded: { gold_error: bad.length, parse_fail: tooBroken.length, not_fetched_or_unverified_licence: tv.excluded.map((r) => ({ repo: r.repo, rel: r.rel, why: r.why })) },
      recipe: { kind: "grammar definition names (gold defs of CORE kinds)", coreKinds: CORE_DEF_KINDS, nameRule: "scope prefix removed (Foo::Bar -> Bar); must match the Ruby identifier law /^[\\p{L}_][\\p{L}\\p{N}_]*[?!]?$/u", parseFailThreshold: CONSTS.PARSE_FAIL, note: "no regex recipe exists for ruby in code-structure.js; the grammar is the recipe" },
      builder: "eval/coding-competence/build-ruby-priors.mjs", builtOn: new Date().toISOString().slice(0, 10),
      sumCheck: { reference: "priors/code-name-ruby.json (eval/coding-competence/build-c2-priors.mjs, unmodified): reproduced entry for entry by this builder's aggregator on the reference's 241-file set", entryForEntryEqual: cmp.equal, entries: cmp.entries, perRepoPartitionSum: partition, pooledAttestations: attest },
      validity: {
        genericityVsHeldOutRepo: { design: "leave-one-repository-out inside TRAIN; names declared in >=2 of the other repos vs exactly 1, hit = declared in the held-out repo", pooledLift: real.pooled.lift, rateG: real.pooled.rateG, rateS: real.pooled.rateS, controlMedianLift: control.median, controlMaxLift: control.max, verdict: card.verdicts.N4 },
        readerAgreement: { reader: "adapters/text/code-structure.js parseDeclarations", declarationsOnTrain: readerDecls, note: "the reader has no ruby recipe: it declares nothing in these files" },
      },
      gaps: [
        { gap: "setters-and-operator-methods-not-tallied", ...setterLines, note: "gold.py emits no def for `def name=(v)` or operator methods (`==`, `[]`, `<=>`...); a literal line scan of the TRAIN files counts the omissions" },
        { gap: "four-train-repos", note: `genericity at floor ${CONSTS.GENERIC_FLOOR} rests on ${tv.repos.length} repositories; a name is generic here only if it recurs in 2 of 4` },
        { gap: "ethos-local-rails-excluded", note: `rails/rails (1 file, origin ethos-local, licence not verified locally) is excluded; including it changes ${changedRepos.length} names' repo counts and adds ${added.length} names (card I1)` },
        { gap: "scoped-names-by-last-segment", note: "a scoped declaration `class Foo::Bar` is tallied as Bar; the incumbent code-name-ruby.json tallies it as Foo (card N1b)" },
      ],
      note: "genericity is a fact about this language's own codebases: repos counts only the TRAIN repositories attesting the name as a declared method/class/module. Names are exact strings; capitalisation is not a witness.",
    },
    counts: { files: docs.length, repos: tv.repos.length, totalBytes: files.reduce((a, f) => a + f.bytes, 0), distinctNames: shipped.names.size, totalDeclarations: shipped.declarations, namesAtOrAboveGenericFloor: generic },
    names: mine,
    builtAt: new Date().toISOString(),
  };
  if (writePriors) {
    fs.mkdirSync(PRIORS, { recursive: true });
    const ownedWrite = (name, obj) => {
      const p = path.join(PRIORS, name);
      if (fs.existsSync(p)) {
        let prev = null;
        try { prev = readJson(p); } catch { prev = null; }
        const prevBuilder = prev?.provenance?.assembledBy?.startsWith("eval/coding-competence/build-ruby-priors.mjs") || prev?.provenance?.builder === "eval/coding-competence/build-ruby-priors.mjs";
        if (!prevBuilder) throw new Error(`refusing to overwrite ${name}: not built by this script`);
      }
      fs.writeFileSync(p, JSON.stringify(obj, null, 1) + "\n");
    };
    ownedWrite(KW_FILE, kwOut);
    ownedWrite(NAME_FILE, nameOut);
  }
  card.files = { priors: writePriors ? [path.join(PRIORS, KW_FILE), path.join(PRIORS, NAME_FILE)] : [], card: cardPath, lawPrior: lawPath };
  card.ms = Date.now() - t0;
  fs.writeFileSync(cardPath, JSON.stringify(card, null, 1));
  console.log(JSON.stringify({ verdicts: card.verdicts.summary, hard: hard.length, soft: soft.length, builtins: builtins.length, trainFiles: docs.length, trainRepos: tv.repos.length, distinctNames: shipped.names.size, genericNames: generic, declarations: shipped.declarations, ms: card.ms }, null, 1));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}
