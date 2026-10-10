// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══  eval/barker/profiles.mjs  (Barker, the profile)
// Written BEFORE the first run of this file and of eval/barker/profile-stats.mjs. Consistent with docs/BARKER.md
// section 3 (the SystemProfile@1 contract) and section 3.8 (typed numbers). Nothing below is a result.
//
// WHAT THIS MODULE IS. An INSTRUMENT: one zero-model, EO-free feature vector per measured symbolic system, every
// cell carrying its giver, channel, denominator and uncertainty, or else a typed gap. It makes NO claim about EO,
// about arches, about kinds or about any unification metatheory. Whether profiles carry cluster structure is the
// question of induce.mjs, NOT of this file (the sibling pilot's concatenated vector failed a planted word-order
// cluster check; this file therefore keeps the feature GROUPS separate and makes only feature-level claims).
// No LLM call, no network, no model-derived label appears in any cell. Genealogy labels are ANSWER KEYS typed by
// the profile author from the standard (Glottolog-level) classification; an instrument must never read them.
//
// ── CLAIMS (each has a control built to fail and a power check, below) ─────────────────────────────────────────
//  C1 integrity   : the JS reader reproduces the counts of the received priors built from the same train file.
//  C2 sensitivity : word-order cells move when, and only when, word order moves (shuffle control; planted
//                   re-linearisation power check; a planted toy treebank with closed-form expectations).
//  C3 resolution  : a system's own profile is closer to its own other half than to any other system's (noise floor).
//  C4 hygiene     : EO-free (ban list, section 3.4 of BARKER.md), zero-model, deterministic, split-disciplined
//                   (reads only the TRAIN split and the DEV split of any corpus; the TEST split is never opened),
//                   gap-typed (a cell that cannot state giver, channel and n is a gap).
//
// ── DEFINITIONS (v1 adopts the sibling pilot PREREG-profile-v0 by reference; restated here in one line each) ───
// Unit/word: a UD syntactic word (integer-id row). Base deprel = text before ':'. Arc = (dependent i, head h>0)
// whose base deprel is not "punct" and whose UPOS is not PUNCT. Lexical stats use lowercase forms of words with
// UPOS not in {PUNCT, SYM}. CLOSED = {ADP AUX CCONJ DET PART PRON SCONJ}; OPEN = {NOUN VERB ADJ ADV PROPN INTJ}.
// FLOORS (PROVISIONAL, BARKER 3.8): MIN_ARCS = 30 arcs (or clauses, finite verbs) for a share; a cell below floor
// is a typed GAP (v0 imputed 0.5; v1 does not). Budget N = 16,000 words (halves of 8,000; unit clarified in ADDENDUM A); a system with
// fewer reachable words in any seed is excluded from fixed-budget cells with a typed gap and NEVER given a smaller N.
// Sampling: seeds s=1..5: sentences shuffled by kernel/rng.js createSeededRng({seed:s,system,purpose:"sample"});
// half A filled to >= N/2 words, then half B to >= N/2; union U = A+B. Cell value = mean over seeds of the feature
// on U; resamples[] = the ten values (5 seeds x halves A, B) (half-budget noise estimate; section 3.5). Sequence cells
// (d07,d08) use CONTIGUOUS windows of the file order (offset spread evenly over the file for seeds 1..5; halves = the
// two N/2 sub-windows) because order is the quantity measured. ci95 = sentence-cluster bootstrap (B=1000,
// seeded) on seed-1 U for share/rate/mean cells that are ratios of sums over sentences; every other cell carries
// ci95 = null with policy "resample-spread" (its noise is its ten resamples). The set of bootstrapped ids is
// BOOT_IDS below; nothing else claims a bootstrap interval.
//
//  A typological (tier D unless noted; channel ud:deprel):
//   a01 P(dep before head | nsubj)  a02 same for obj+iobj  a03 case  a04 amod  a05 nmod  a06 aux  a07 acl
//   a08 mark  a09 det  a10 advmod  a11 cop (each defined iff >= MIN_ARCS arcs)  a12 share of all arcs with
//   dependent before head  a13..a17 arcs per 100 words of case, det, aux, mark, cop  a18 share of sentences with a
//   non-projective arc  a19 share of arcs that are non-projective (arc h->d non-projective iff some non-PUNCT word
//   strictly between h and d is not dominated by h)  a20 UPOS entropy in bits (channel ud:upos)  a21 whitespace
//   characters per UD word in the "# text" lines (channel raw:udtext; gap if < 95% of sentences carry text)
//   a22 mean dependency length |i-h| over arcs.
//  B hierarchical (D; ud:deprel), tree = non-PUNCT words, root depth 1:
//   b01 mean sentence height  b02 mean node depth  b03..b08 depth shares 1,2,3,4,5,>=6  b09 mean number of
//   children over non-leaf nodes  b10 leaf share  b11 mean over sentences of the max count of arcs with base
//   deprel in {ccomp xcomp advcl acl csubj} on a root path (clause nesting depth)  b12 OLS slope of
//   log10 S(s) on log10 s, s=2..16, S(s)= share of nodes with subtree size >= s  b13..b16 shares of nodes of Strahler
//   order 1,2,3,>=4 (leaf = order 1; a node takes the max child order m, and m+1 if two or more children attain m)
//   b17 bifurcation ratio Rb = exp(-slope of log N_k on k) over orders k with N_k >= 10 (needs >= 3 such orders)
//   b18 R-squared of that fit.
//  C boundary (R; channels raw:udtext, ud:tok): character stream = whitespace-stripped concatenation of the UD
//   surface units (an MWT range uses its range surface); unit-initial position b = index of the first character of
//   a unit. Held-out surprisal (bits) of a character given the previous two, order-2 Witten-Bell interpolation to a
//   uniform floor over (alphabet+1) (parameter-free), 2-fold by sentence, positions index<2 excluded.
//   c01 mean surprisal at unit-initial positions minus at all other positions  c01s same with boundaries =
//   whitespace-delimited chunks of the "# text" line (defined only where a21 >= 0.5, a data-derived rule)
//   c02 overall held-out bits per character  c03 unigram character entropy in bits  c04 zlib level-9 bits per
//   character (UTF-8 stream, sentences joined by newline)  c05 gap(0) minus max over offsets o in {-2,-1,1,2} of
//   gap(o), where gap(o) is the c01 statistic with initial positions replaced by {b+o} (positive iff the true
//   boundary is the peak: the claim that the boundary carries information).
//  D recurrence (T/R; ud:tok), first exactly N lowercase non-PUNCT/SYM words of the sample order:
//   d01 Zipf exponent s = 1/(alpha-1), alpha = discrete power-law maximum likelihood exponent of the type-frequency
//   distribution with x_min chosen by KS minimisation over x_min with >= 50 types in the tail (Clauset, Shalizi,
//   Newman 2009)  d02 Heaps beta: OLS slope of log10 V(n) on log10 n, n in {1000,2000,4000,8000,16000} <= N
//   d03 hapax types / V  d04 hapax types / N  d05 V/N  d06 token share of the 10 most frequent types
//   d07 burstiness B = (sigma-mu)/(sigma+mu) of inter-arrival times, mean over the 50 most frequent types that
//   occur >= 5 times in the window  d07x = d07 minus its mean over 10 within-window word-order shuffles
//   d08 Hurst exponent by DFA (detrended fluctuation analysis, linear detrend, scales 16..N/8, log-spaced) of the
//   indicator series of those types, mean over types  d08x = d08 minus its shuffle mean. (shuffle values are kept
//   in the cell detail.)
//  E inventory (T; ud:upos): e01 closed words / words  e02 distinct lowercase closed forms per 1000 words  e03 share
//   of DEV closed words whose (lowercase form, UPOS) was seen in the sample  e04 same for OPEN  e05 e03-e04  e06 hapax
//   share of OPEN (form,UPOS) types minus that of CLOSED types in the sample  e07 share of lowercase forms with
//   more than one UPOS in the sample  e07h mean tag entropy (bits) over those forms  e08 closed-class knee: types are
//   sorted by frequency; y=1 if the type's majority UPOS is CLOSED, 0 if OPEN (others dropped); Delta(r) = mean y
//   over ranks <= r minus mean y over ranks > r; knee = log10 of argmax r over r in [5, V'-5]  e08s = Delta at the
//   knee. e01p, e07p = the same two shares computed from the received pos prior (channel prior:pos-<stem>, full
//   train, no resampling; second reading of the same ancestor, see the independence audit).
//  F morphology (M; ud:feats): f01 FEATS per non-PUNCT word  f02 share of nominals (NOUN PROPN ADJ PRON NUM DET)
//   bearing Case  f03 distinct lowercase forms per distinct lowercase lemma  f04 multiword-token lines per 100 words
//   f05 share of finite verbs (VERB/AUX with VerbForm=Fin or a Mood value; floor MIN_ARCS) bearing Person or Number
//   f06 share of NOUN tokens with a Definite value or a det dependent  f07 share of VERB/AUX tokens with Tense.
//  G role-marking (D+M; ud:deprel + ud:feats), roles over arcs: core roles nsubj/obj/iobj, oblique obl:
//   g01 entropy (bits) of the linear order pattern of {nsubj, head, obj} over heads with exactly one nsubj and one
//   obj dependent (6 patterns; floor MIN_ARCS clauses)  g02 share of core-role dependents bearing Case
//   g03 share of core+oblique arcs whose dependent has a case-deprel child  g04 share of nsubj arcs whose head bears
//   Person or Number  g05 role identifiability I(role ; cue)/H(role) with Miller-Madow bias correction on every
//   entropy term, role in {nsubj, obj/iobj}, cue = (order before/after head, Case value or none, has case-deprel
//   child, head bears Person/Number), its ci95 a cluster bootstrap over sentences with B=200 (g02..g04 are ratio cells
//   in BOOT_IDS with B=1000; g01 carries resample-spread).
//  H code inventory (G; channel grammar:tree-sitter, giver = the tree-sitter grammar's own symbol table through
//   the pinned language pack): h01 anonymous visible symbols spelled as identifiers (keywords)  h03 anonymous visible
//   symbols made only of operator characters  h04 visible named symbols (node types)  h07 ASCII-Latin share of
//   letters in keyword spellings  h06b/h06e/h06i indicators that the grammar declares a brace pair / an end-keyword
//   / an indent-or-dedent symbol  h08 field names. h02 (soft keywords) and h05 (precedence levels) are read from the
//   received per-language law prior (giver: the language's own engine) where it exists, else a typed gap.
//  I code distributional (D/R; channels ast:tree-sitter, raw:src), from TRAIN files only, tree = NAMED nodes:
//   b01..b10, b12..b18 as in B (b11 is a typed gap: no clause relation in an AST)  c01..c05 as in C with leaf
//   token starts as unit boundaries  d01..d08 on the identifier-leaf stream (first N_ID = 4,000 identifiers; Heaps
//   n in {500,1000,2000,4000}); i01..i06 shares of leaf tokens that are keyword / identifier / literal (string,
//   number, boolean) / comment / delimiter / operator; i07 distinct named kinds seen over h04; i08 share of leaf
//   tokens under a parse-error node. Code budget N_CODE = 20,000 leaf tokens (halves of 10,000), file-level
//   sampling with the same seeds (the file is the cluster); a system with too few leaf tokens is a typed gap.
//  T targets (NEVER predictors for the claim they define; kept in `targets`, not `features`): t01_* from
//   priors/role-config-<stem>; t03_r<k>_margin / _pass from competence cards r1..r4 (pass null is MISSING, never 0;
//   cards are outputs of the system under test, objects of study, never gold); t04e entropy and t04n noun share of
//   the frame prior's hapax marginal.
//
// ── NULLS AND CONTROLS BUILT TO FAIL (II.23) ───────────────────────────────────────────────────────────────────
//  N1 word-order shuffle: permute the words of every sentence of the seed-1 union (heads and labels carried). Cells
//     a01..a12 must lie in 0.5 +/- 1.96 SE with a CLUSTER-ROBUST SE (sentences are the clusters;
//     SE0 = sqrt(sum_s (b_s - 0.5 a_s)^2) / sum_s a_s) for a fraction of (language, cell) pairs not significantly
//     below 0.95 (one-sided exact binomial p > 0.01); a22 must rise in >= 90% of systems.
//  N2 contaminated cell: a cell named with an EO ban-list token must be rejected by assertEoFree.
//  N3 sequence shuffle: d07x and d08x on the within-window shuffle are 0 and 0.5-0.5 by construction; a PLANTED
//     exchangeable series must read |d07x| <= 0.05 and |d08 - 0.5| <= 0.06.
//  N4 split guard: asking for the TEST split of any corpus must throw.
// ── POWER CHECKS (a planted structure of the claimed kind must be detected by the same instrument) ─────────────
//  P1 planted word order: re-linearising the seed-1 union head-final / head-initial gives a12 >= 0.99 / <= 0.01
//     (every language tested), and a02 >= 0.99 / <= 0.01 where defined.
//  P2 planted toy treebank (tests/barker-profiles.test.js): every A, B, E, F, G cell equals its closed-form value.
//  P3 planted Zipf corpus with exponent 1.0, N = 16,000 words: |d01 - 1.0| <= 0.15.
//  P4 planted persistent series (a doubly stochastic process with slowly varying rate): d07x >= 0.10 and
//     d08 >= 0.55 at N = 16,000. If P3 or P4 FAILS the cell family (d01 / d07-d08) is labelled UNDERPOWERED in the
//     manifest and is not offered to induction.
// ── PASS RULES (all fixed now; thresholds never tuned after a run) ─────────────────────────────────────────────
//  G0 integrity: for every stem whose pos prior has sentences_read and tokens_read EQUAL to this reader's counts
//     (the same-file test; a differing stem is typed source_differs and leaves the denominator): tokens_read,
//     sentences_read, distinct_forms and ambiguous_forms must equal exactly, and the role-config
//     object/subject before and total counts must equal exactly. PASS iff zero mismatches among comparable stems.
//     UNDERPOWERED if fewer than 20 stems are comparable. eng is excluded (priors built from train+dev).
//  G4 noise floor: z-score all complete cells (groups A, B, D(d01..d06), E, F, G; script-free) over the 2n half
//     profiles of seed 1; group-balanced squared z distance; for each system, half B's nearest half A is its own.
//     PASS iff identification >= 0.90 of n AND exact binomial p <= 0.01 against chance 1/n. FAIL means G1-type
//     claims by downstream modules are UNDERPOWERED, not "not falsified".
//  G5 as N1.  G6 as P1.  G7 determinism: the contentHash of two builds of the same system is equal for >= 3 systems.
//  G8 hygiene: assertEoFree over every produced profile is ok; the static source scan (no model, no network, no
//     EO import) has zero hits; no source line names the TEST split.
//  K-facts (DESCRIPTIVE, not gated; inherited from the sibling pilot, written by it after seeing its role-config
//     numbers: that disclosure is inherited): K1 case-before higher for every measured Romance/Slavic member than
//     for every measured Turkic/Japonic/Koreanic member; K2 obj-before > 0.5 for jpn kor tur and < 0.5 for
//     Romance/Slavic; K3 subj-before > 0.5 for all; K5 min head_final over {jpn,kor,tur} > max over Romance;
//     K8 ws_per_word jpn < 0.3 and spaced languages > 0.5; K9 c01 > 0 everywhere; K11 e03 > e04 everywhere.
//     Reading: holds / fails / unmeasured (gap) with denominators; "x of y measured".
//  R1-xcheck (INFORMATIONAL, not a gate): shared cells vs the pilot's per-seed profiles on its ten languages, within
//     2 x max(SE); samples differ (different shuffle generators) so equality is not expected.
// ── RECORDED PREDICTIONS (before any run; the architect's guesses) ─────────────────────────────────────────────
//  G0 PASS 0.75 (risk: stems whose prior source differs from tb/<stem>); G4 PASS 0.90; G5 (a) PASS 0.85, (b) 0.95;
//  G6 PASS 0.95; N3 PASS 0.70; P3 PASS 0.75; P4 PASS 0.55 (DFA on sparse indicator series is biased toward 0.5);
//  K-facts at least 10 of 12 measured hold 0.60; code groups: AST extraction parses >= 45 of 51 corpus languages
//  with error share < 0.05 on train 0.70.
// ── SPLITS (the user's rule: develop and smoke on DEV only) ────────────────────────────────────────────────────
//  Natural languages: features from train.conllu; dev.conllu only for e03/e04. Code: features from the manifest's
//  train files; the manifest's test list is never opened. No profile is computed from, or compared with, any TEST.
// ── TYPED NUMBERS (BARKER 3.8; every bare integer here is PROVISIONAL unless marked derived) ───────────────────
//  N=16,000; MIN_ARCS=30; B=1000 (g05: 200); window shuffles 10; top-50 types; DFA scales 16..N/8; x_min tail >= 50
//  types; Strahler orders with N_k >= 10; N_CODE=20,000; N_ID=4,000; seeds 1..5; alpha 0.05; SEED 20261005.
//  Each is listed in PROVISIONAL below and printed in the manifest.
// ── ADDENDUM A (2026-10-05, written after the FIRST smoke build of eng and before any gate was evaluated) ──────
//  What had been SEEN: one build of eng (cell values printed; no gate statistic computed). d01..d06 were undefined
//  because the sample was filled to N words counted as non-PUNCT words (SYM included) while d-cells need N words that
//  are neither PUNCT nor SYM, and eng's sample held 15,938 of those. Clarification (no pass rule, claim or other
//  definition changes): the budget unit is the LEXICAL word (UPOS not PUNCT and not SYM); sentences are dealt into
//  halves until each holds >= N/2 lexical words. Rates "per 100 words" (a13..a17, f01, f04) keep the non-PUNCT word
//  count as their denominator as stated. Also clarified: the e-cells are computed over the whole sample, the
//  d-cells over its first N lexical words; the pilot's imputation of 0.5 is not used (cells below floor are gaps).
// ── ADDENDUM B (2026-10-05, written after power check P3 was FIRST RUN, on planted corpora only; no real-data statistic seen) ─
//  What had been SEEN: P3 (planted Zipf corpus, exponent 1.0, N = 16,000 iid words over 30,000 ranks) read d01 = 0.77 and
//  0.76 on planted seeds 3 and 4 (and 0.65 at planted 0.8, 1.15 at planted 1.2): |d01 - 1.0| = 0.23 > 0.15, so P3 FAILS under
//  the rule as written. By the rule written above, d01 is labelled UNDERPOWERED in the manifest (each d01 cell carries
//  power: {check:"P3", pass:false}) and is not offered to induction; the estimator is kept and reported, because it is the
//  Clauset-Shalizi-Newman form the design asked for and its failure is a finding about the estimator at this N (the KS
//  minimiser selects x_min = 1 and fits the Poisson-smeared low-count spectrum, whose effective exponent exceeds the asymptotic
//  one). NOT done: no change to d01, to P3, or to the 0.15 band.
//  ADDED (a second estimator, not a replacement): d01o = minus the OLS slope of log10 frequency on log10 rank over ranks
//  5..min(500, V) (the sibling pilot's v0 definition; defined iff >= 20 ranks). Its power check P3o: planted exponent 1.0,
//  N = 16,000, |d01o - 1.0| <= 0.15; and the ORDER check P3r: planted exponents 0.8 < 1.0 < 1.2 are read in that order by each
//  estimator. DISCLOSURE: d01o read 0.931 and 0.940 on planted seeds 3 and 4, 0.957 at V=5000, before P3o was written, so a
//  P3o pass is NOT an independent confirmation; P3r was written after seeing the three planted readings of d01, which were
//  monotone. d01 and d01o both stay in every profile that can compute them, with their power status beside them.
// ── ADDENDUM C (2026-10-05, written after two code profiles (python, html) were built once for debugging and before any gate ran) ─
//  What had been SEEN: the printed cell values of code:python and code:html. i06 (symbolic leaf share) read 0.42 for html because
//  angle brackets and "=" are symbolic anonymous tokens: the class rule is a heuristic over grammar token spellings, as the header
//  said, and is kept. h06b ("grammar declares a brace pair") read 1 for python (its dict braces): a declared-symbol indicator is
//  not a use indicator, so four USAGE cells are ADDED to group I, with no change to any pass rule: i09 share of leaf tokens that
//  are "{" or "}", i10 share that are end-like keywords (end, endif, fi, done, esac, endfunction, endmodule, endcase, endclass,
//  endtry), i11 share that are "(" or ")", i12 mean absolute change in leading-whitespace width (tab = 4) between consecutive
//  non-blank lines. Clarified: ci95 of a bootstrapped cell is the interval of the seed-1 union sample (cell value is the 5-seed
//  mean, so it can sit slightly outside its own interval); code `script` is not a derived label (null); the typed S-code family
//  also fills `lineage` for code (there is no genealogy), and labels.declaredBlockSymbols carries the derived h06 indicators.
// ── ADDENDUM D (2026-10-05, written in a header audit BEFORE the final full build; no real-data statistic of any gate seen) ─────
//  Corrections of wording against the implementation, no rule changed: (i) the parenthesis after g05 above said it was the only
//  g-cell with a ci95; g02..g04 also carry the B=1000 sentence bootstrap (they are in BOOT_IDS) and the text now says so;
//  (ii) h03 is "made ONLY of operator characters" as the definition says; the first draft of ast_extract.py counted tokens that
//  CONTAIN an operator character (the looser rule used for the leaf class "o" and kept there); the extractor was corrected before
//  any code profile used in a gate was built; (iii) the cache key of a built profile is the header digest, the digest of
//  profile-stats.mjs, the extractor's own digest and CODE_REV, so API-only edits do not force a rebuild; (iv) loadProfiles looks in
//  the given directory, then <dir>/profiles, then the profile cache.
// ── ADDENDUM E (2026-10-05, written after the first full build and the G0, G4, G5(partial), G6, G7, plants, K-facts runs; BEFORE the final build) ─
//  What had been SEEN: the first full build's profiles and the gate outcomes (G0 PASS 52 stems, G4 PASS 46 of 49, G6 PASS, G7 PASS,
//  plants P3 FAIL, P3o/P3r/N3/P4 PASS, K-facts 5 of 7 hold). No rule is changed. Implementation of rules already written:
//  (i) "not offered to induction" (P3, P4 text above) is implemented at the data level: a cell whose planted check failed
//  (power.pass === false) is moved from `cells` and `features` to `withheld` and a typed gap `withheld:<check>_failed_UNDERPOWERED`
//  is recorded (today: d01, the CSN estimator); (ii) each cell's `builder` now names its real function (the first full build
//  stamped a placeholder for the group letters); (iii) FEATURE_REGISTRY rows carry `giver`; (iv) assertEoFree scans identifiers
//  and labels only, so a giver's own prose in a provenance source (for example the word "operator" in a received precedence
//  table's citation) is not a contamination; the first full build was rejected on load by this over-strict scan, which was a defect
//  of the scan and not of any cell.
// ═══ END PRE-REGISTRATION ═══


import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createSeededRng } from "../../kernel/rng.js";
import * as ST from "./profile-stats.mjs";

export const PROFILES_VERSION = "1";
export const SEED = 20261005;
export const ALPHA = 0.05;

// ── where things live (all read-only except CACHE_DIR and OUT_DIR) ─────────────────────────────────────────────
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DIRS = Object.freeze({
  root: "/private/tmp/claude-501",
  tb: "/private/tmp/claude-501/tb",                       // TRAIN treebanks
  evalDir: "/private/tmp/claude-501/ud-eval",             // <stem>/dev.conllu (and a held-out split this file never opens)
  priors: path.resolve(HERE, "../../priors"),
  cards: "/private/tmp/claude-501/competence",
  cache: "/private/tmp/claude-501/barker/profiles",
  out: "/private/tmp/claude-501/barker/out",
  codeCorpus: "/private/tmp/claude-501/code-corpus",
  codePriors: "/Users/mlacy/Documents/3.0/ethos/derived-priors/code-priors",
  venvPython: "/private/tmp/claude-501/venv/bin/python",
  tsCache: "/private/tmp/claude-501/coding-competence/ts-cache",
  notation: "/private/tmp/claude-501/notation",
});

// ── typed numbers (BARKER 3.8: PROVISIONAL unless marked derived) ──────────────────────────────────────────────
export const PROVISIONAL = Object.freeze({
  N: 16000, MIN_ARCS: 30, SEEDS: [1, 2, 3, 4, 5], BOOT_B: 1000, G05_BOOT_B: 200, WINDOW_SHUFFLES: 10, TOP_TYPES: 50,
  DFA_MIN_SCALE: 16, DFA_MAX_DIV: 8, XMIN_TAIL: 50, STRAHLER_MIN: 10, N_CODE: 20000, N_ID: 4000, TOP_TYPES_MIN_OCC: 5,
  HEAPS_NL: [1000, 2000, 4000, 8000, 16000], HEAPS_ID: [500, 1000, 2000, 4000], KNEE_EDGE: 5, TEXT_COVERAGE: 0.95,
  SPACED_WS: 0.5,
});
const { N: N_NL, MIN_ARCS, SEEDS } = PROVISIONAL;

// ── the split guard: this file reads TRAIN and DEV only ────────────────────────────────────────────────────────
export const SPLITS_READ = Object.freeze(["train", "dev"]);
export function assertSplit(split) {
  if (!SPLITS_READ.includes(split)) throw new Error(`profiles.mjs reads only ${SPLITS_READ.join("/")} splits; refused "${split}"`);
  return split;
}
// digests and light counts are cached on disk by (path, size, mtime) so repeated discovery does not re-read 100+ MB
let digestStore = null; let digestDirty = false;
const digestFile = () => path.join(DIRS.cache, "digests.json");
function loadDigests() { if (digestStore) return digestStore; try { digestStore = JSON.parse(fs.readFileSync(digestFile(), "utf8")); } catch { digestStore = {}; } return digestStore; }
function saveDigests() { if (!digestDirty) return; try { fs.mkdirSync(DIRS.cache, { recursive: true }); fs.writeFileSync(digestFile(), JSON.stringify(digestStore)); digestDirty = false; } catch { /* cache only */ } }
function memo(kind, p, compute) {
  const st = fs.statSync(p); const k = `${kind}|${p}|${st.size}|${st.mtimeMs}`; const store = loadDigests();
  if (store[k] === undefined) { store[k] = compute(); digestDirty = true; }
  return store[k];
}
const sha256File = (p) => memo("sha256", p, () => createHash("sha256").update(fs.readFileSync(p)).digest("hex"));
const sha256Str = (s) => createHash("sha256").update(s).digest("hex");
const exists = (p) => { try { return fs.existsSync(p); } catch { return false; } };
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((q) => [q, x[q]])) : (typeof x === "number" && !Number.isFinite(x) ? null : x)));

/** sha256 of the leading `//` comment block of this file (the convention eval/competence/lib.mjs::headerDigest uses). */
export function headerDigest(file = fileURLToPath(import.meta.url)) {
  const lines = [];
  for (const l of fs.readFileSync(file, "utf8").split("\n")) { if (l.startsWith("//") || !l.trim()) lines.push(l); else break; }
  return createHash("sha256").update(lines.join("\n").trim()).digest("hex");
}
export const PREREG_SHA = headerDigest();
const BUILDER = (fn) => `profiles.mjs@${PREREG_SHA.slice(0, 12)}#${fn}`;

// ── the EO ban list (BARKER 3.4). Scanned on identifiers and labels only, token-bounded, case-insensitive. ──────
export const EO_BAN = Object.freeze([
  "nul", "sig", "ins", "seg", "con", "syn", "def", "eva", "rec",
  "ground", "figure", "pattern", "existence", "structure", "interpretation",
  "differentiate", "relate", "generate", "void", "beings", "fold",
  "phasepost", "byface", "cell", "operator", "stance", "terrain", "grain",
]);
const EO_BAN_SET = new Set(EO_BAN);
const EO_COMPOUND = ["phasepost", "byface"]; // squashed spellings are caught inside any identifier
const EO_PAIR_RE = /^(case|person|number|tense|mood|voice|aspect|verbform)=/i; // a received-table key shape
function tokensOf(s) {
  return String(s).replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}
/**
 * { ok, offenders:[{path, token}] }. Accepts a profile (checks cell ids, groups, channels, definitionIds, builders,
 * and any bin labels) or a bare array/object of such strings. Free-text descriptions are NOT scanned.
 */
export function assertEoFree(x) {
  const offenders = [];
  const check = (p, s) => {
    if (s == null) return;
    const str = String(s);
    if (str.includes("kind:basin")) offenders.push({ path: p, token: "kind:basin" });
    if (EO_PAIR_RE.test(str)) offenders.push({ path: p, token: str });
    for (const t of tokensOf(str)) if (EO_BAN_SET.has(t)) offenders.push({ path: p, token: t });
    for (const w of EO_COMPOUND) if (str.toLowerCase().includes(w)) offenders.push({ path: p, token: w });
  };
  const cells = x?.cells ?? x?.features ?? x;
  if (Array.isArray(cells)) { cells.forEach((s, i) => check(`[${i}]`, s)); return { ok: offenders.length === 0, offenders }; }
  for (const [id, c] of Object.entries(cells ?? {})) {
    check(`cells.${id}.id`, id);
    if (c && typeof c === "object") {
      for (const f of ["id", "group", "channel", "definitionId", "builder"]) check(`cells.${id}.${f}`, c[f]);
      for (const b of c.bins ?? []) check(`cells.${id}.bins`, b);
    }
  }
  for (const id of Object.keys(x?.provenance ?? {})) check(`provenance.${id}`, id); // keys only: the source text is free prose (a giver's own words), not an identifier
  return { ok: offenders.length === 0, offenders };
}

// ── answer keys: genealogy and script (TYPED by the profile author from the standard classification; never a feature) ──
// lineage = independence unit (Glottolog top-level family or isolate); branch = blocking stratum (the "family" of
// leave-family-out splits); macro = Indo-European vs the rest. Unknown stems get family "unlabelled" (typed gap).
export const GENEALOGY_GIVER = "Glottolog top-level families and branches as commonly classified; typed by the profile author; ANSWER KEY ONLY";
const G = (lineage, branch) => ({ lineage, branch });
export const GENEALOGY = Object.freeze({
  rus: G("Indo-European", "Slavic"), ukr: G("Indo-European", "Slavic"), pol: G("Indo-European", "Slavic"), bul: G("Indo-European", "Slavic"),
  ces: G("Indo-European", "Slavic"), slk: G("Indo-European", "Slavic"), slv: G("Indo-European", "Slavic"), hrv: G("Indo-European", "Slavic"),
  srp: G("Indo-European", "Slavic"), bel: G("Indo-European", "Slavic"), mkd: G("Indo-European", "Slavic"),
  spa: G("Indo-European", "Romance"), ita: G("Indo-European", "Romance"), por: G("Indo-European", "Romance"), fra: G("Indo-European", "Romance"),
  ron: G("Indo-European", "Romance"), cat: G("Indo-European", "Romance"), glg: G("Indo-European", "Romance"),
  lat: G("Indo-European", "Italic"),
  eng: G("Indo-European", "Germanic"), deu: G("Indo-European", "Germanic"), nld: G("Indo-European", "Germanic"), swe: G("Indo-European", "Germanic"),
  dan: G("Indo-European", "Germanic"), nob: G("Indo-European", "Germanic"), nno: G("Indo-European", "Germanic"), afr: G("Indo-European", "Germanic"),
  isl: G("Indo-European", "Germanic"), fao: G("Indo-European", "Germanic"),
  hin: G("Indo-European", "Indo-Iranian"), urd: G("Indo-European", "Indo-Iranian"), fas: G("Indo-European", "Indo-Iranian"),
  mar: G("Indo-European", "Indo-Iranian"), san: G("Indo-European", "Indo-Iranian"), ben: G("Indo-European", "Indo-Iranian"),
  ell: G("Indo-European", "Hellenic"), grc: G("Indo-European", "Hellenic"),
  hye: G("Indo-European", "Armenian"),
  lav: G("Indo-European", "Baltic"), lit: G("Indo-European", "Baltic"),
  cym: G("Indo-European", "Celtic"), gle: G("Indo-European", "Celtic"), bre: G("Indo-European", "Celtic"), gla: G("Indo-European", "Celtic"),
  sqi: G("Indo-European", "Albanian"), alb: G("Indo-European", "Albanian"),
  arb: G("Afro-Asiatic", "Semitic"), heb: G("Afro-Asiatic", "Semitic"), amh: G("Afro-Asiatic", "Semitic"), mlt: G("Afro-Asiatic", "Semitic"),
  cmn: G("Sino-Tibetan", "Sinitic"), "cmn-hans": G("Sino-Tibetan", "Sinitic"), lzh: G("Sino-Tibetan", "Sinitic"),
  jpn: G("Japonic", "Japonic"), kor: G("Koreanic", "Koreanic"), "kor-kaist": G("Koreanic", "Koreanic"),
  tur: G("Turkic", "Turkic"), kaz: G("Turkic", "Turkic"), uig: G("Turkic", "Turkic"),
  fin: G("Uralic", "Finnic"), est: G("Uralic", "Finnic"), hun: G("Uralic", "Ugric"),
  ind: G("Austronesian", "Malayo-Polynesian"), tgl: G("Austronesian", "Malayo-Polynesian"),
  vie: G("Austroasiatic", "Vietic"),
  kat: G("Kartvelian", "Kartvelian"),
  tam: G("Dravidian", "Dravidian"), tel: G("Dravidian", "Dravidian"),
  eus: G("Basque", "Basque"),
});
export function genealogyOf(stem) {
  const g = GENEALOGY[stem];
  return g ? { branch: g.branch, lineage: g.lineage, macro: g.lineage === "Indo-European" ? "Indo-European" : "non-Indo-European", typed: true }
    : { branch: "unlabelled", lineage: "unlabelled", macro: "unlabelled", typed: false };
}
// Code: the S-code families of BARKER 3.6, extended to the corpus's languages by the same criterion (how the language's own
// reference delimits blocks); typed by the profile author; answer key only. A DERIVED companion (declared symbols) is
// carried beside it as labels.declaredBlockSymbols.
const CODE_FAMILY = (() => {
  const t = (fam, names) => Object.fromEntries(names.split(/\s+/).map((n) => [n, fam]));
  return Object.freeze({
    ...t("brace", "c cpp c_sharp java go rust javascript typescript tsx php kotlin swift scala dart groovy objc zig solidity perl r powershell css"),
    ...t("indentation", "python nim yaml haskell elm lean"),
    ...t("keyword-end", "ruby bash lua julia matlab fortran cobol verilog elixir erlang ocaml sql"),
    ...t("paren-sexpr", "commonlisp scheme racket clojure"),
    ...t("markup-data", "html json toml markdown latex svelte vue"),
  });
})();

// Unicode scripts, DERIVED from the letters of the text (never typed per language).
const SCRIPTS = [
  ["Latin", /\p{Script=Latin}/u], ["Cyrillic", /\p{Script=Cyrillic}/u], ["Greek", /\p{Script=Greek}/u], ["Arabic", /\p{Script=Arabic}/u],
  ["Hebrew", /\p{Script=Hebrew}/u], ["Devanagari", /\p{Script=Devanagari}/u], ["Hangul", /\p{Script=Hangul}/u],
  ["Hiragana", /\p{Script=Hiragana}/u], ["Katakana", /\p{Script=Katakana}/u], ["Han", /\p{Script=Han}/u],
  ["Armenian", /\p{Script=Armenian}/u], ["Georgian", /\p{Script=Georgian}/u], ["Tamil", /\p{Script=Tamil}/u],
  ["Telugu", /\p{Script=Telugu}/u], ["Thai", /\p{Script=Thai}/u], ["Bengali", /\p{Script=Bengali}/u],
];
export function scriptShares(text, maxChars = 400000) {
  const counts = new Map(); let n = 0;
  for (const ch of text.length > maxChars ? text.slice(0, maxChars) : text) {
    if (!/\p{L}/u.test(ch)) continue;
    n += 1; let hit = "Other";
    for (const [name, re] of SCRIPTS) if (re.test(ch)) { hit = name; break; }
    counts.set(hit, (counts.get(hit) ?? 0) + 1);
  }
  const shares = Object.fromEntries([...counts].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Number((v / n).toFixed(4))]));
  return { dominant: n ? Object.keys(shares)[0] : null, shares, letters: n };
}

// ── CoNLL-U reader (own parser; same row rules as the received builders: integer-id rows are words) ─────────────
const UPOS_LIST = ["ADJ", "ADP", "ADV", "AUX", "CCONJ", "DET", "INTJ", "NOUN", "NUM", "PART", "PRON", "PROPN", "PUNCT", "SCONJ", "SYM", "VERB", "X"];
const UPOS_ID = Object.fromEntries(UPOS_LIST.map((u, i) => [u, i]));
const U = Object.freeze({ PUNCT: UPOS_ID.PUNCT, SYM: UPOS_ID.SYM, VERB: UPOS_ID.VERB, AUX: UPOS_ID.AUX, NOUN: UPOS_ID.NOUN });
const CLOSED_ID = new Set(["ADP", "AUX", "CCONJ", "DET", "PART", "PRON", "SCONJ"].map((u) => UPOS_ID[u]));
const OPEN_ID = new Set(["NOUN", "VERB", "ADJ", "ADV", "PROPN", "INTJ"].map((u) => UPOS_ID[u]));
const NOMINAL_ID = new Set(["NOUN", "PROPN", "ADJ", "PRON", "NUM", "DET"].map((u) => UPOS_ID[u]));
const CLAUSAL = new Set(["ccomp", "xcomp", "advcl", "acl", "csubj"]);
const F_CASE = 1, F_PN = 2, F_TENSE = 4, F_DEF = 8, F_FIN = 16;

/**
 * parseConllu(text) -> { sentences, nTokens (all integer rows), nBlocks, caseTable, formsAll }.
 * sentence = { n, form[], lower[], lemma[], upos(Uint8Array), head(Int32Array), depb[], flags(Uint8Array), caseId(Uint16Array),
 *              nfeat(Uint8Array), text|null, nmwt, units[] }
 */
export function parseConllu(text) {
  const sentences = []; const caseTable = new Map(); let nTokens = 0; let nBlocks = 0;
  let cur = null; let curText = null; let skipUntil = 0; let inBlock = false;
  const flush = () => {
    if (cur && cur.form.length) {
      const n = cur.form.length;
      sentences.push({
        n, form: cur.form, lower: cur.lower, lemma: cur.lemma, upos: Uint8Array.from(cur.upos), head: Int32Array.from(cur.head), depb: cur.depb,
        flags: Uint8Array.from(cur.flags), caseId: Uint16Array.from(cur.caseId), nfeat: Uint8Array.from(cur.nfeat), text: curText, nmwt: cur.nmwt, units: cur.units,
      });
    }
    cur = null; curText = null; skipUntil = 0;
  };
  for (const line of text.split("\n")) {
    if (line.charCodeAt(0) === 35) { // '#'
      if (line.startsWith("# text =")) curText = line.slice(8).trim();
      continue;
    }
    if (!line.trim()) { if (inBlock) { flush(); } inBlock = false; continue; }
    if (!inBlock) { nBlocks += 1; inBlock = true; }
    const c = line.split("\t");
    if (c.length < 8) continue;
    const id = c[0];
    if (!cur) cur = { form: [], lower: [], lemma: [], upos: [], head: [], depb: [], flags: [], caseId: [], nfeat: [], nmwt: 0, units: [] };
    if (id.indexOf("-") > 0) { const b = Number(id.split("-")[1]); skipUntil = b; cur.units.push(c[1]); cur.nmwt += 1; continue; }
    if (!/^[0-9]+$/.test(id)) continue; // empty node
    const idn = Number(id);
    nTokens += 1;
    cur.form.push(c[1]); cur.lower.push(c[1].toLowerCase()); cur.lemma.push(c[2].toLowerCase());
    cur.upos.push(UPOS_ID[c[3]] ?? UPOS_ID.X);
    const h = Number(c[6]); cur.head.push(Number.isFinite(h) ? h : -1);
    cur.depb.push(c[7].split(":")[0]);
    let fl = 0; let nf = 0; let cid = 0;
    if (c[5] !== "_" && c[5] !== undefined) {
      for (const kv of c[5].split("|")) {
        const eq = kv.indexOf("="); if (eq < 1) continue;
        nf += 1; const k = kv.slice(0, eq); const v = kv.slice(eq + 1);
        if (k === "Case") { fl |= F_CASE; if (!caseTable.has(v)) caseTable.set(v, caseTable.size + 1); cid = caseTable.get(v); }
        else if (k === "Person" || k === "Number") fl |= F_PN;
        else if (k === "Tense") fl |= F_TENSE;
        else if (k === "Definite") fl |= F_DEF;
        else if (k === "Mood" || (k === "VerbForm" && v === "Fin")) fl |= F_FIN;
      }
    }
    cur.flags.push(fl); cur.caseId.push(cid); cur.nfeat.push(Math.min(255, nf));
    if (idn > skipUntil) cur.units.push(c[1]);
  }
  if (inBlock || cur) flush();
  return { sentences, nTokens, nBlocks, caseTable };
}

/** Absolute path of a treebank split, TRAIN or DEV only. */
export function conlluPath(dirName, split) {
  assertSplit(split);
  return split === "train" ? path.join(DIRS.tb, dirName, "train.conllu") : path.join(DIRS.evalDir, dirName, "dev.conllu");
}

// ── per-sentence additive statistics ───────────────────────────────────────────────────────────────────────────
const ORDER_RELS = [["a01", "nsubj"], ["a02", "obj"], ["a03", "case"], ["a04", "amod"], ["a05", "nmod"], ["a06", "aux"], ["a07", "acl"], ["a08", "mark"], ["a09", "det"], ["a10", "advmod"], ["a11", "cop"]];
const REL_OF = { nsubj: "nsubj", obj: "obj", iobj: "obj", case: "case", amod: "amod", nmod: "nmod", aux: "aux", acl: "acl", mark: "mark", det: "det", advmod: "advmod", cop: "cop" };
const RATE_RELS = [["a13", "case"], ["a14", "det"], ["a15", "aux"], ["a16", "mark"], ["a17", "cop"]];
const NAMES = [];
for (const [, r] of ORDER_RELS) NAMES.push(`n_${r}`, `b_${r}`);
NAMES.push("sent", "n_all", "b_all", "dl_sum", "nw", "nwl", "words_all", "ws_chars", "has_text",
  "np_sent_used", "np_sent_bad", "np_arcs", "np_arcs_bad",
  "h_sum", "h_n", "d_sum", "nodes", "kids_sum", "nonleaf", "leaf", "clause_sum");
for (let k = 0; k < UPOS_LIST.length; k++) NAMES.push(`u_${k}`);
for (let k = 1; k <= 6; k++) NAMES.push(`dh_${k}`);
for (let s = 2; s <= 16; s++) NAMES.push(`surv_${s}`);
for (let k = 1; k <= 8; k++) NAMES.push(`ord_${k}`);
NAMES.push("feat_sum", "nominal_n", "nominal_case", "mwt_n", "fin_n", "fin_pn", "noun_n", "noun_defdet", "va_n", "va_tense");
for (let k = 0; k < 6; k++) NAMES.push(`g1_${k}`);
NAMES.push("g1_n", "core_n", "core_case", "co_n", "co_adp", "subj_n", "subj_headpn");
const K = NAMES.length;
const IDX = Object.freeze(Object.fromEntries(NAMES.map((n, i) => [n, i])));
const ORDER_CLASS = { "012": 0, "021": 1, "102": 2, "120": 3, "201": 4, "210": 5 }; // ranks of (subject, head, object) positions

function sentenceStats(s, caseCount) {
  const st = new Float64Array(K);
  const { n, upos, head, depb, flags, caseId, nfeat } = s;
  const isP = (i) => upos[i] === U.PUNCT;
  const kidsOf = Array.from({ length: n }, () => null);
  for (let i = 0; i < n; i++) {
    const h = head[i];
    if (h > 0 && h <= n) (kidsOf[h - 1] ??= []).push(i);
  }
  const hasChildDep = (i, base) => { const ks = kidsOf[i]; if (!ks) return false; for (const k of ks) if (depb[k] === base) return true; return false; };
  st[IDX.sent] = 1; st[IDX.words_all] = n;
  if (s.text != null) { st[IDX.has_text] = 1; let w = 0; for (const ch of s.text) if (/\s/u.test(ch)) w += 1; st[IDX.ws_chars] = w; }
  st[IDX.nmwt_unused] = 0;
  const g05 = [];
  for (let i = 0; i < n; i++) {
    if (!isP(i)) { st[IDX.nw] += 1; st[IDX[`u_${upos[i]}`]] += 1; if (upos[i] !== U.SYM) st[IDX.nwl] += 1; }
    const hd = head[i];
    if (hd > 0 && hd <= n && depb[i] !== "punct" && !isP(i)) {
      const before = (i + 1) < hd; const rel = REL_OF[depb[i]];
      st[IDX.n_all] += 1; if (before) st[IDX.b_all] += 1; st[IDX.dl_sum] += Math.abs(i + 1 - hd);
      if (rel) { st[IDX[`n_${rel}`]] += 1; if (before) st[IDX[`b_${rel}`]] += 1; }
      const base = depb[i];
      if (base === "nsubj" || base === "obj" || base === "iobj") {
        st[IDX.core_n] += 1; if (flags[i] & F_CASE) st[IDX.core_case] += 1;
        const adp = hasChildDep(i, "case") ? 1 : 0; const agree = (flags[hd - 1] & F_PN) ? 1 : 0;
        const role = base === "nsubj" ? 0 : 1;
        g05.push(role + 2 * ((before ? 1 : 0) + 2 * (adp + 2 * (agree + 2 * caseId[i]))));
      }
      if (base === "nsubj" || base === "obj" || base === "iobj" || base === "obl") { st[IDX.co_n] += 1; if (hasChildDep(i, "case")) st[IDX.co_adp] += 1; }
      if (base === "nsubj") { st[IDX.subj_n] += 1; if (flags[hd - 1] & F_PN) st[IDX.subj_headpn] += 1; }
    }
    if (!isP(i)) {
      st[IDX.feat_sum] += nfeat[i];
      if (NOMINAL_ID.has(upos[i])) { st[IDX.nominal_n] += 1; if (flags[i] & F_CASE) st[IDX.nominal_case] += 1; }
      if (upos[i] === U.NOUN) { st[IDX.noun_n] += 1; if ((flags[i] & F_DEF) || hasChildDep(i, "det")) st[IDX.noun_defdet] += 1; }
      if (upos[i] === U.VERB || upos[i] === U.AUX) {
        st[IDX.va_n] += 1; if (flags[i] & F_TENSE) st[IDX.va_tense] += 1;
        if (flags[i] & F_FIN) { st[IDX.fin_n] += 1; if (flags[i] & F_PN) st[IDX.fin_pn] += 1; }
      }
    }
  }
  st[IDX.mwt_n] = s.nmwt;
  // g01: heads with exactly one nsubj and one obj dependent
  for (let h = 0; h < n; h++) {
    const ks = kidsOf[h]; if (!ks) continue;
    let sPos = -1; let oPos = -1; let ns = 0; let no = 0;
    for (const k of ks) { if (depb[k] === "nsubj") { ns++; sPos = k; } else if (depb[k] === "obj") { no++; oPos = k; } }
    if (ns === 1 && no === 1) {
      const pos = [sPos, h, oPos]; const order = [0, 1, 2].sort((a, b) => pos[a] - pos[b]);
      const rank = [0, 0, 0]; order.forEach((who, r) => { rank[who] = r; });
      st[IDX[`g1_${ORDER_CLASS[rank.join("")]}`]] += 1; st[IDX.g1_n] += 1;
    }
  }
  // trees
  const treeOk = head.every((h) => h >= 0 && h <= n) && head.some((h) => h === 0);
  if (treeOk) {
    st[IDX.np_sent_used] += 1;
    let bad = false;
    for (let i = 0; i < n; i++) {
      const hd = head[i];
      if (hd <= 0 || depb[i] === "punct" || isP(i)) continue;
      st[IDX.np_arcs] += 1;
      const lo = Math.min(i + 1, hd); const hi = Math.max(i + 1, hd);
      let arcBad = false;
      for (let k = lo + 1; k < hi && !arcBad; k++) {
        if (isP(k - 1)) continue;
        let x = k; let steps = 0;
        while (x !== 0 && x !== hd && steps <= n) { x = head[x - 1]; steps += 1; }
        if (x !== hd) arcBad = true;
      }
      if (arcBad) { st[IDX.np_arcs_bad] += 1; bad = true; }
    }
    if (bad) st[IDX.np_sent_bad] += 1;
    const d = ST.depthsOf(head);
    if (d) {
      const nonp = Uint8Array.from({ length: n }, (_, i) => (isP(i) ? 0 : 1));
      const kids = new Int32Array(n); const size = new Int32Array(n);
      let hmax = 0;
      for (let i = 0; i < n; i++) {
        if (!nonp[i]) continue;
        size[i] = 1; hmax = Math.max(hmax, d[i]); st[IDX.d_sum] += d[i]; st[IDX.nodes] += 1; st[IDX[`dh_${Math.min(d[i], 6)}`]] += 1;
        if (head[i] > 0 && nonp[head[i] - 1]) kids[head[i] - 1] += 1;
      }
      const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => d[b] - d[a]);
      for (const i of order) if (head[i] > 0 && nonp[i]) size[head[i] - 1] += size[i];
      for (let i = 0; i < n; i++) {
        if (!nonp[i]) continue;
        if (kids[i] === 0) st[IDX.leaf] += 1; else { st[IDX.nonleaf] += 1; st[IDX.kids_sum] += kids[i]; }
        for (let sz = 2; sz <= 16; sz++) if (size[i] >= sz) st[IDX[`surv_${sz}`]] += 1;
      }
      st[IDX.h_sum] += hmax; st[IDX.h_n] += 1;
      const cl = new Int32Array(n); let clMax = 0;
      for (const i of [...order].reverse()) { cl[i] = (head[i] > 0 ? cl[head[i] - 1] : 0) + (CLAUSAL.has(depb[i]) ? 1 : 0); if (nonp[i]) clMax = Math.max(clMax, cl[i]); }
      st[IDX.clause_sum] += clMax;
      const parent = Int32Array.from(head, (h) => (h > 0 ? h - 1 : -1));
      const ord = ST.strahlerOrders(parent, d, nonp);
      for (let i = 0; i < n; i++) if (nonp[i]) st[IDX[`ord_${Math.min(ord[i], 8)}`]] += 1;
    }
  }
  return { st, g05: Int32Array.from(g05) };
}

// ── additive cells: functions of a summed statistic vector ─────────────────────────────────────────────────────
const V_ = (V, name) => V[IDX[name]];
const share = (num, den, floor = MIN_ARCS) => (den >= floor && den > 0 ? { v: num / den, n: den } : { v: null, n: den });
/** { id: { v: number|null, n } } for every additive cell (A, B, F, G minus g05). */
export function additiveCells(V) {
  const c = {};
  for (const [id, r] of ORDER_RELS) c[id] = share(V_(V, `b_${r}`), V_(V, `n_${r}`));
  c.a12 = share(V_(V, "b_all"), V_(V, "n_all"), 1);
  const nw = V_(V, "nw");
  for (const [id, r] of RATE_RELS) c[id] = nw > 0 ? { v: (100 * V_(V, `n_${r}`)) / nw, n: nw } : { v: null, n: nw };
  c.a18 = share(V_(V, "np_sent_bad"), V_(V, "np_sent_used"), 1);
  c.a19 = share(V_(V, "np_arcs_bad"), V_(V, "np_arcs"), 1);
  { const counts = []; for (let k = 0; k < UPOS_LIST.length; k++) if (k !== U.PUNCT) counts.push(V_(V, `u_${k}`)); c.a20 = nw > 0 ? { v: ST.entropyBits(counts), n: nw } : { v: null, n: 0 }; }
  { const cov = V_(V, "sent") > 0 ? V_(V, "has_text") / V_(V, "sent") : 0; c.a21 = cov >= PROVISIONAL.TEXT_COVERAGE ? { v: V_(V, "ws_chars") / V_(V, "words_all"), n: V_(V, "words_all") } : { v: null, n: V_(V, "has_text") }; }
  c.a22 = share(V_(V, "dl_sum"), V_(V, "n_all"), 1);
  c.b01 = share(V_(V, "h_sum"), V_(V, "h_n"), 1); c.b02 = share(V_(V, "d_sum"), V_(V, "nodes"), 1);
  for (let k = 1; k <= 6; k++) c[`b0${2 + k}`] = share(V_(V, `dh_${k}`), V_(V, "nodes"), 1);
  c.b09 = share(V_(V, "kids_sum"), V_(V, "nonleaf"), 1); c.b10 = share(V_(V, "leaf"), V_(V, "nodes"), 1);
  c.b11 = share(V_(V, "clause_sum"), V_(V, "h_n"), 1);
  { const xs = []; const ys = []; const nodes = V_(V, "nodes");
    for (let s = 2; s <= 16; s++) { const v = V_(V, `surv_${s}`); if (v > 0) { xs.push(Math.log10(s)); ys.push(Math.log10(v / nodes)); } }
    c.b12 = xs.length >= 4 ? { v: ST.olsFit(xs, ys).slope, n: nodes } : { v: null, n: nodes }; }
  { const nodes = V_(V, "nodes"); const o = (k) => V_(V, `ord_${k}`);
    c.b13 = share(o(1), nodes, 1); c.b14 = share(o(2), nodes, 1); c.b15 = share(o(3), nodes, 1);
    c.b16 = share(o(4) + o(5) + o(6) + o(7) + o(8), nodes, 1);
    const counts = [0]; for (let k = 1; k <= 8; k++) counts.push(o(k));
    const fit = ST.strahlerFit(counts, { minCount: PROVISIONAL.STRAHLER_MIN });
    c.b17 = fit ? { v: fit.rb, n: nodes } : { v: null, n: nodes }; c.b18 = fit ? { v: fit.r2, n: nodes } : { v: null, n: nodes }; }
  c.f01 = share(V_(V, "feat_sum"), nw, 1);
  c.f02 = share(V_(V, "nominal_case"), V_(V, "nominal_n"));
  c.f04 = nw > 0 ? { v: (100 * V_(V, "mwt_n")) / nw, n: nw } : { v: null, n: 0 };
  c.f05 = share(V_(V, "fin_pn"), V_(V, "fin_n")); c.f06 = share(V_(V, "noun_defdet"), V_(V, "noun_n")); c.f07 = share(V_(V, "va_tense"), V_(V, "va_n"));
  { const n = V_(V, "g1_n"); const counts = []; for (let k = 0; k < 6; k++) counts.push(V_(V, `g1_${k}`)); c.g01 = n >= MIN_ARCS ? { v: ST.entropyBits(counts), n } : { v: null, n }; }
  c.g02 = share(V_(V, "core_case"), V_(V, "core_n")); c.g03 = share(V_(V, "co_adp"), V_(V, "co_n")); c.g04 = share(V_(V, "subj_headpn"), V_(V, "subj_n"));
  return c;
}
/** Additive ids that are ratios of sums over sentences and therefore carry a sentence-cluster bootstrap interval. */
export const BOOT_IDS = Object.freeze(["a01", "a02", "a03", "a04", "a05", "a06", "a07", "a08", "a09", "a10", "a11", "a12", "a13", "a14", "a15", "a16", "a17",
  "a18", "a19", "a22", "b01", "b02", "b03", "b04", "b05", "b06", "b07", "b08", "b09", "b10", "b11", "b13", "b14", "b15", "b16",
  "f01", "f02", "f04", "f05", "f06", "f07", "g02", "g03", "g04"]);

/** g05 role identifiability from a bag of cue codes (role in bit 0). I(role;cue)/H(role) with Miller-Madow terms. */
export function roleIdentifiability(codes) {
  const rc = new Map(); const cc = new Map(); const jc = new Map(); let n = 0; const rr = [0, 0];
  for (const code of codes) {
    const role = code & 1; const cue = code >> 1; n += 1; rr[role] += 1;
    cc.set(cue, (cc.get(cue) ?? 0) + 1); jc.set(code, (jc.get(code) ?? 0) + 1);
  }
  if (n < MIN_ARCS || rr[0] === 0 || rr[1] === 0) return { v: null, n };
  const hR = ST.millerMadowBits(rr); const hC = ST.millerMadowBits([...cc.values()]); const hJ = ST.millerMadowBits([...jc.values()]);
  const mi = hR + hC - hJ;
  return { v: Math.max(0, Math.min(1, mi / hR)), n };
}

// ── sampling ────────────────────────────────────────────────────────────────────────────────────────────────────
export function drawSample(corpus, seed, systemKey, N = N_NL) {
  const S = corpus.sentences.length; const idx = Array.from({ length: S }, (_, i) => i);
  ST.shuffleInPlace(idx, createSeededRng({ seed, system: systemKey, purpose: "sample" }));
  const A = []; const B = []; let ca = 0; let cb = 0; const half = N / 2;
  for (const j of idx) {
    const nw = corpus.stats[j].st[IDX.nwl];
    if (ca < half) { A.push(j); ca += nw; } else if (cb < half) { B.push(j); cb += nw; } else break;
  }
  return { A, B, U: [...A, ...B], wordsA: ca, wordsB: cb, ok: ca >= half && cb >= half };
}
function sumStats(corpus, idxs) {
  const V = new Float64Array(K);
  for (const j of idxs) { const st = corpus.stats[j].st; for (let k = 0; k < K; k++) V[k] += st[k]; }
  return V;
}

// ── lexical / type cells (d01..d06, e01..e08s, f03) ─────────────────────────────────────────────────────────────
/** d01..d06 from the first Nlim words of a stream (words: strings). Used for UD words and for code identifiers. */
export function recurrenceCells(words, Nlim, heapsPts) {
  const c = {}; const N = words.length;
  if (N < Nlim) { for (const id of ["d01", "d01o", "d02", "d03", "d04", "d05", "d06"]) c[id] = { v: null, n: N }; return c; }
  const cnt = new Map(); for (const w of words) cnt.set(w, (cnt.get(w) ?? 0) + 1);
  const fr = [...cnt.values()].sort((a, b) => b - a); const V = cnt.size;
  const fit = ST.discretePowerLawMLE(fr, { minTail: PROVISIONAL.XMIN_TAIL });
  c.d01 = fit ? { v: fit.s, n: fit.nTail, detail: { alpha: fit.alpha, xmin: fit.xmin, ks: fit.ks } } : { v: null, n: V };
  const pts = heapsPts.filter((p) => p <= N); const seen = new Set(); const vn = []; let k = 0;
  words.forEach((w, i) => { seen.add(w); if (k < pts.length && i + 1 === pts[k]) { vn.push(seen.size); k += 1; } });
  c.d02 = pts.length >= 3 ? { v: ST.olsFit(pts.map(Math.log10), vn.map(Math.log10)).slope, n: N } : { v: null, n: N };
  { const hi = Math.min(500, fr.length); // d01o (ADDENDUM B): OLS rank-frequency exponent, ranks 5..hi
    if (hi - 4 >= 20) { const xs = []; const ys = []; for (let r = 5; r <= hi; r++) { xs.push(Math.log10(r)); ys.push(Math.log10(fr[r - 1])); } c.d01o = { v: -ST.olsFit(xs, ys).slope, n: hi - 4 }; } else c.d01o = { v: null, n: hi - 4 }; }
  const hap = fr.filter((v) => v === 1).length;
  c.d03 = { v: hap / V, n: V }; c.d04 = { v: hap / N, n: N }; c.d05 = { v: V / N, n: N };
  c.d06 = { v: ST.sum(fr.slice(0, 10)) / N, n: N };
  return c;
}
function lexicalCells(corpus, idxs, Nlim, heapsPts, devKeys) {
  const words = []; const types = new Map(); const lemmas = new Set(); const forms = new Set(); let lemmaBlank = 0; let nTok = 0;
  let closedW = 0; let closedForms = new Set(); const byForm = new Map();
  for (const j of idxs) {
    const s = corpus.sentences[j];
    for (let i = 0; i < s.n; i++) {
      const u = s.upos[i]; if (u === U.PUNCT || u === U.SYM) continue;
      const w = s.lower[i]; nTok += 1;
      if (words.length < Nlim) words.push(w);
      const key = `${w}\u0001${u}`; types.set(key, (types.get(key) ?? 0) + 1);
      let bf = byForm.get(w); if (!bf) { bf = new Map(); byForm.set(w, bf); } bf.set(u, (bf.get(u) ?? 0) + 1);
      if (CLOSED_ID.has(u)) { closedW += 1; closedForms.add(w); }
      forms.add(w); lemmas.add(s.lemma[i]); if (s.lemma[i] === "_") lemmaBlank += 1;
    }
  }
  const c = recurrenceCells(words, Nlim, heapsPts);
  // e-group over the whole sample
  c.e01 = nTok >= MIN_ARCS ? { v: closedW / nTok, n: nTok } : { v: null, n: nTok };
  c.e02 = nTok >= MIN_ARCS ? { v: (1000 * closedForms.size) / nTok, n: nTok } : { v: null, n: nTok };
  let hapOpen = 0; let nOpen = 0; let hapClosed = 0; let nClosed = 0;
  for (const [key, v] of types) {
    const u = Number(key.split("\u0001")[1]);
    if (OPEN_ID.has(u)) { nOpen += 1; if (v === 1) hapOpen += 1; } else if (CLOSED_ID.has(u)) { nClosed += 1; if (v === 1) hapClosed += 1; }
  }
  c.e06 = nOpen >= MIN_ARCS && nClosed >= 10 ? { v: hapOpen / nOpen - hapClosed / nClosed, n: nOpen + nClosed } : { v: null, n: nOpen + nClosed };
  if (devKeys) {
    let cc = 0; let cs = 0; let oc = 0; let os = 0;
    for (const s of devKeys.sentences) for (let i = 0; i < s.n; i++) {
      const u = s.upos[i];
      if (CLOSED_ID.has(u)) { cc += 1; if (types.has(`${s.lower[i]}\u0001${u}`)) cs += 1; } else if (OPEN_ID.has(u)) { oc += 1; if (types.has(`${s.lower[i]}\u0001${u}`)) os += 1; }
    }
    c.e03 = cc >= MIN_ARCS ? { v: cs / cc, n: cc } : { v: null, n: cc }; c.e04 = oc >= MIN_ARCS ? { v: os / oc, n: oc } : { v: null, n: oc };
    c.e05 = c.e03.v != null && c.e04.v != null ? { v: c.e03.v - c.e04.v, n: Math.min(cc, oc) } : { v: null, n: Math.min(cc, oc) };
  } else { c.e03 = { v: null, n: 0 }; c.e04 = { v: null, n: 0 }; c.e05 = { v: null, n: 0 }; }
  // e07 / e07h: ambiguity over lowercase forms
  { let amb = 0; let hs = 0; const V = byForm.size;
    for (const m of byForm.values()) if (m.size > 1) { amb += 1; hs += ST.entropyBits([...m.values()]); }
    c.e07 = V >= MIN_ARCS ? { v: amb / V, n: V } : { v: null, n: V };
    c.e07h = amb >= 10 ? { v: hs / amb, n: amb } : { v: null, n: amb }; }
  // e08: closed-class knee
  { const rows = [];
    for (const [w, m] of byForm) {
      let tot = 0; let best = -1; let bu = -1; for (const [u, v] of m) { tot += v; if (v > best || (v === best && u < bu)) { best = v; bu = u; } }
      const y = CLOSED_ID.has(bu) ? 1 : (OPEN_ID.has(bu) ? 0 : -1);
      if (y >= 0) rows.push([tot, w, y]);
    }
    rows.sort((a, b) => b[0] - a[0] || (a[1] < b[1] ? -1 : 1));
    const L = rows.length; const edge = PROVISIONAL.KNEE_EDGE;
    if (L >= 2 * edge + 10) {
      const pre = new Float64Array(L + 1); for (let i = 0; i < L; i++) pre[i + 1] = pre[i] + rows[i][2];
      let bestR = -1; let bestD = -Infinity;
      for (let r = edge; r <= L - edge; r++) { const d = pre[r] / r - (pre[L] - pre[r]) / (L - r); if (d > bestD) { bestD = d; bestR = r; } }
      c.e08 = { v: Math.log10(bestR), n: L }; c.e08s = { v: bestD, n: L };
    } else { c.e08 = { v: null, n: L }; c.e08s = { v: null, n: L }; } }
  c.f03 = lemmaBlank / Math.max(1, nTok) > 0.5 || lemmas.size === 0 ? { v: null, n: nTok } : { v: forms.size / lemmas.size, n: lemmas.size };
  return c;
}

// ── character cells (c01..c05, c01s) ────────────────────────────────────────────────────────────────────────────
const strip = (u) => u.replace(/\s+/gu, "");
function streamsFrom(corpus, idxs, mode) {
  const streams = []; const starts = [];
  for (const j of idxs) {
    const s = corpus.sentences[j]; const parts = mode === "ws" ? (s.text ? s.text.split(/\s+/u) : null) : s.units;
    if (!parts) continue;
    const st = []; const B = new Set();
    for (const u of parts) { const cp = Array.from(strip(u)); if (!cp.length) continue; B.add(st.length); for (const ch of cp) st.push(ch); }
    if (st.length >= 4) { streams.push(st); starts.push(B); }
  }
  return { streams, starts };
}
export function charCellsFrom(streams, starts) {
  const c = {}; const m = ST.boundaryModel(streams, starts);
  if (!m) { for (const id of ["c01", "c02", "c03", "c04", "c05"]) c[id] = { v: null, n: streams.length }; return c; }
  c.c01 = { v: m.gap[0], n: m.nPos }; c.c02 = { v: m.h2, n: m.nPos };
  const cnt = new Map(); let N = 0; for (const st of streams) for (const ch of st) { cnt.set(ch, (cnt.get(ch) ?? 0) + 1); N += 1; }
  c.c03 = { v: ST.entropyBits([...cnt.values()]), n: N };
  c.c04 = { v: (8 * zlib.deflateSync(Buffer.from(streams.map((s) => s.join("")).join("\n"), "utf8"), { level: 9 }).length) / N, n: N };
  c.c05 = { v: m.gap[0] - Math.max(m.gap[-2], m.gap[-1], m.gap[1], m.gap[2]), n: m.nPos, detail: { gaps: m.gap } };
  return c;
}
export function charCells(corpus, idxs, { ws = false } = {}) {
  const u = streamsFrom(corpus, idxs, "ud"); const c = charCellsFrom(u.streams, u.starts);
  if (ws) {
    const w = streamsFrom(corpus, idxs, "ws"); const mw = ST.boundaryModel(w.streams, w.starts, [0]);
    c.c01s = mw ? { v: mw.gap[0], n: mw.nPos } : { v: null, n: w.streams.length };
  }
  return c;
}

// ── sequence cells (d07, d08 and their shuffle-corrected forms): contiguous windows of the file order ────────────
function windowStats(ids, topK, minOcc) {
  const L = ids.length; const cnt = new Map();
  for (let i = 0; i < L; i++) cnt.set(ids[i], (cnt.get(ids[i]) ?? 0) + 1);
  const top = [...cnt].filter(([, v]) => v >= minOcc).sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, topK).map(([t]) => t);
  const pos = new Map(top.map((t) => [t, []]));
  for (let i = 0; i < L; i++) { const p = pos.get(ids[i]); if (p) p.push(i); }
  const Bs = []; const Hs = [];
  for (const t of top) {
    const p = pos.get(t); const b = ST.burstiness(p); if (b != null) Bs.push(b);
    const series = new Float64Array(L); for (const q of p) series[q] = 1;
    const h = ST.dfaHurst(series, { minScale: PROVISIONAL.DFA_MIN_SCALE, maxDiv: PROVISIONAL.DFA_MAX_DIV }); if (h != null) Hs.push(h);
  }
  return { B: Bs.length >= 5 ? ST.mean(Bs) : null, H: Hs.length >= 5 ? ST.mean(Hs) : null, nTypes: top.length };
}
export function sequenceCells(fileIds, N, systemKey, { shuffles = PROVISIONAL.WINDOW_SHUFFLES } = {}) {
  const T = fileIds.length;
  if (T < N) return null;
  const per = []; // per seed: { U, A, B }
  for (const seed of SEEDS) {
    const start = Math.floor(((seed - 1) * (T - N)) / 4);
    per.push({ U: windowStats(fileIds.slice(start, start + N), PROVISIONAL.TOP_TYPES, PROVISIONAL.TOP_TYPES_MIN_OCC),
      A: windowStats(fileIds.slice(start, start + N / 2), PROVISIONAL.TOP_TYPES, PROVISIONAL.TOP_TYPES_MIN_OCC),
      B: windowStats(fileIds.slice(start + N / 2, start + N), PROVISIONAL.TOP_TYPES, PROVISIONAL.TOP_TYPES_MIN_OCC) });
  }
  const rng = createSeededRng({ seed: SEED, system: systemKey, purpose: "window-shuffle" });
  const w1 = fileIds.slice(0, N); const shB = []; const shH = [];
  for (let r = 0; r < shuffles; r++) { const w = Int32Array.from(w1); ST.shuffleInPlace(w, rng); const s = windowStats(w, PROVISIONAL.TOP_TYPES, PROVISIONAL.TOP_TYPES_MIN_OCC); if (s.B != null) shB.push(s.B); if (s.H != null) shH.push(s.H); }
  return { per, shuffleB: ST.mean(shB), shuffleH: ST.mean(shH), shuffleSdB: ST.sd(shB), shuffleSdH: ST.sd(shH), T };
}

// ── the feature registry: every cell id, its group, channel and definition slug ────────────────────────────────
export const GROUP_NAME = Object.freeze({ A: "typological", B: "hierarchical", C: "boundary", D: "recurrence", E: "inventory", F: "morphology", G: "role_marking", H: "code_inventory", I: "code_distributional", T: "targets" });
export const FEATURE_REGISTRY = (() => {
  const R = {};
  const giverOf = (channel) => (/^grammar:/.test(channel) ? "the tree-sitter grammar's own symbol table (language pack)" : /^prior:code-law/.test(channel) ? "the language's own engine, through the received law prior" : /^prior:/.test(channel) ? "a received khora prior built from UD train counts"
    : /^(ast|raw:src)/.test(channel) ? "tree-sitter parse of the polyglot corpus files (train split)" : "Universal Dependencies treebank gold annotation (train split)");
  const reg = (id, group, tier, channel, definitionId, floorRule, kinds = ["nl"]) => { R[id] = Object.freeze({ id, group, groupName: GROUP_NAME[group], tier, channel, definitionId, floorRule, kinds, giver: giverOf(channel), giverCode: kinds.includes("code") && group !== "H" && group !== "I" ? "tree-sitter parse of the polyglot corpus files (train split), for code systems" : null }); };
  const A = [["a01", "nsubj"], ["a02", "obj_iobj"], ["a03", "case"], ["a04", "amod"], ["a05", "nmod"], ["a06", "aux"], ["a07", "acl"], ["a08", "mark"], ["a09", "det"], ["a10", "advmod"], ["a11", "cop"]];
  for (const [id, r] of A) reg(id, "A", "D", "ud:deprel", `${id}_${r}_dependent_before_head`, `arcs>=${MIN_ARCS}`);
  reg("a12", "A", "D", "ud:deprel", "a12_head_final_all_arcs", "arcs>=1");
  for (const [id, r] of RATE_RELS) reg(id, "A", "D", "ud:deprel", `${id}_${r}_arcs_per_100_words`, "words>=1");
  reg("a18", "A", "D", "ud:deprel", "a18_nonprojective_sentence_share", "sentences>=1"); reg("a19", "A", "D", "ud:deprel", "a19_nonprojective_arc_share", "arcs>=1");
  reg("a20", "A", "T", "ud:upos", "a20_upos_entropy_bits", "words>=1"); reg("a21", "A", "R", "raw:udtext", "a21_whitespace_per_ud_word", "text_coverage>=0.95");
  reg("a22", "A", "D", "ud:deprel", "a22_mean_dependency_length", "arcs>=1");
  const B = { b01: "mean_sentence_height", b02: "mean_node_depth", b03: "depth_share_1", b04: "depth_share_2", b05: "depth_share_3", b06: "depth_share_4", b07: "depth_share_5", b08: "depth_share_6_plus",
    b09: "mean_children_of_nonleaf", b10: "leaf_share", b11: "clause_nesting_depth", b12: "subtree_size_tail_slope", b13: "strahler_order_1_share", b14: "strahler_order_2_share",
    b15: "strahler_order_3_share", b16: "strahler_order_4_plus_share", b17: "bifurcation_ratio", b18: "strahler_fit_r2" };
  for (const [id, slug] of Object.entries(B)) reg(id, "B", "D", "ud:deprel", `${id}_${slug}`, id === "b17" || id === "b18" ? `orders>=3 with n>=${PROVISIONAL.STRAHLER_MIN}` : "nodes>=1", ["nl", "code"]);
  reg("c01", "C", "R", "ud:tok", "c01_boundary_gap_bits", "streams>=10", ["nl", "code"]); reg("c01s", "C", "R", "raw:udtext", "c01s_whitespace_boundary_gap_bits", "a21>=0.5");
  reg("c02", "C", "R", "raw:udtext", "c02_order2_bits_per_char", "streams>=10", ["nl", "code"]); reg("c03", "C", "R", "raw:udtext", "c03_unigram_char_entropy_bits", "streams>=10", ["nl", "code"]);
  reg("c04", "C", "R", "raw:udtext", "c04_zlib_bits_per_char", "streams>=10", ["nl", "code"]); reg("c05", "C", "R", "ud:tok", "c05_boundary_peak_minus_best_shift", "streams>=10", ["nl", "code"]);
  const D = { d01: "zipf_exponent_mle", d01o: "zipf_exponent_ols_rank_5_to_500", d02: "heaps_beta", d03: "hapax_types_share", d04: "hapax_tokens_share", d05: "type_token_ratio", d06: "top10_token_share", d07: "burstiness", d07x: "burstiness_excess_over_shuffle", d08: "hurst_dfa", d08x: "hurst_excess_over_shuffle" };
  for (const [id, slug] of Object.entries(D)) reg(id, "D", id.startsWith("d0") && Number(id.slice(1, 3)) >= 7 ? "R" : "T", "ud:tok", `${id}_${slug}`, id === "d01" ? `tail>=${PROVISIONAL.XMIN_TAIL} types` : "words>=N", ["nl", "code"]);
  const E = { e01: "closed_word_share", e02: "closed_types_per_1000_words", e03: "closed_dev_coverage", e04: "open_dev_coverage", e05: "dev_coverage_gap", e06: "hapax_gap_open_minus_closed", e07: "ambiguous_form_share", e07h: "ambiguous_form_tag_entropy_bits", e08: "closed_class_knee_log10_rank", e08s: "closed_class_knee_separation" };
  for (const [id, slug] of Object.entries(E)) reg(id, "E", "T", "ud:upos", `${id}_${slug}`, `n>=${MIN_ARCS}`);
  reg("e01p", "E", "T", "prior:pos", "e01p_closed_word_share_from_pos_prior", "prior source matches train"); reg("e07p", "E", "T", "prior:pos", "e07p_ambiguous_form_share_from_pos_prior", "prior source matches train");
  const F = { f01: "feature_values_per_word", f02: "case_bearing_nominal_share", f03: "forms_per_lemma", f04: "mwt_lines_per_100_words", f05: "finite_verb_agreement_share", f06: "noun_definiteness_marking_share", f07: "verb_tense_marking_share" };
  for (const [id, slug] of Object.entries(F)) reg(id, "F", "M", "ud:feats", `${id}_${slug}`, `n>=${MIN_ARCS}`);
  const Gs = { g01: ["ud:deprel", "subject_verb_object_order_entropy_bits"], g02: ["ud:feats", "core_role_case_marking_share"], g03: ["ud:deprel", "adposition_share_core_and_oblique"], g04: ["ud:feats", "subject_head_agreement_share"], g05: ["ud:deprel", "role_identifiability_ratio"] };
  for (const [id, [ch, slug]] of Object.entries(Gs)) reg(id, "G", "D", ch, `${id}_${slug}`, `n>=${MIN_ARCS}`);
  const H = { h01: "keyword_symbols", h02: "soft_keywords_from_law_prior", h03: "distinct_symbolic_tokens", h04: "node_types", h05: "precedence_levels_from_law_prior", h06b: "declares_brace_pair", h06e: "declares_end_keyword", h06i: "declares_indent_symbol", h07: "latin_share_of_keyword_letters", h08: "field_names" };
  for (const [id, slug] of Object.entries(H)) reg(id, "H", "G", id === "h02" || id === "h05" ? "prior:code-law" : "grammar:tree-sitter", `${id}_${slug}`, "grammar present", ["code"]);
  const I = { i01: "keyword_leaf_share", i02: "identifier_leaf_share", i03: "literal_leaf_share", i04: "comment_leaf_share", i05: "delimiter_leaf_share", i06: "symbolic_leaf_share", i07: "named_kinds_seen_share", i08: "parse_error_leaf_share", i09: "brace_leaf_share", i10: "end_keyword_leaf_share", i11: "paren_leaf_share", i12: "mean_abs_indent_change" };
  for (const [id, slug] of Object.entries(I)) reg(id, "I", "D", "ast:tree-sitter", `${id}_${slug}`, "leaves>=1", ["code"]);
  return Object.freeze(R);
})();
for (const [id, r] of Object.entries(FEATURE_REGISTRY)) { // the registry itself is EO-free, checked at load
  const o = assertEoFree({ cells: { [id]: { id, group: r.group, channel: r.channel, definitionId: r.definitionId } } });
  if (!o.ok) throw new Error(`FEATURE_REGISTRY contaminated: ${JSON.stringify(o.offenders)}`);
}
const CODE_B_SKIP = new Set(["b11"]); // clause nesting needs a clause relation: not defined for ASTs

// ── received priors and cards (read-only; hashed at read) ──────────────────────────────────────────────────────
function priorPath(kind, stem) { return path.join(DIRS.priors, `${kind}-${stem}.json`); }
function readTargets(stem) {
  const targets = {}; const gaps = []; const inputs = []; let roleConfigSource = null;
  const put = (id, value, n, channel, giver, extra = {}) => { targets[id] = { id, group: "T", channel, value, n, ci95: null, ci95Policy: "none:received_value", resamples: [], definitionId: id, builder: BUILDER("read_targets"), giver, floor: null, ...extra }; };
  const rc = priorPath("role-config", stem);
  if (exists(rc)) {
    const d = readJson(rc); inputs.push({ path: rc, sha256: sha256File(rc), role: "prior" });
    const giver = `khora priors/role-config-${stem}.json (UD train through ${d.provenance?.builder ?? "build-role-config"})`; const ch = `prior:role-config-${stem}`;
    for (const [role, key] of [["subject", "subject"], ["object", "object"]]) {
      const o = d[key]; if (!o) continue;
      put(`t01_${role}_before_share`, o.total ? o.before / o.total : null, o.total, ch, giver);
      put(`t01_${role}_reliability`, o.reliability ?? null, o.total, ch, giver);
      put(`t01_${role}_usable`, o.usable == null ? null : (o.usable ? 1 : 0), o.total, ch, giver);
      put(`t01_${role}_marker`, o.marker ? 1 : 0, o.total, ch, giver, { detail: o.marker ? { form: o.marker.form, precision: o.marker.precision } : null });
    }
    roleConfigSource = d.provenance?.source ?? null;
  } else gaps.push({ feature: "t01", reason: "no_role_config_prior", denominator: { have: 0, need: 1 } });
  const fp = priorPath("frame", stem);
  if (exists(fp)) {
    const d = readJson(fp); inputs.push({ path: fp, sha256: sha256File(fp), role: "prior" });
    const m = d.marginal ?? {}; const tot = ST.sum(Object.values(m));
    if (tot > 0) {
      put("t04e", ST.entropyBits(Object.values(m)), tot, `prior:frame-${stem}`, "khora priors/frame prior (hapax UPOS marginal)");
      put("t04n", ((m.NOUN ?? 0) + (m.PROPN ?? 0)) / tot, tot, `prior:frame-${stem}`, "khora priors/frame prior (hapax UPOS marginal)");
    }
  } else gaps.push({ feature: "t04", reason: "no_frame_prior", denominator: { have: 0, need: 1 } });
  for (const k of [1, 2, 3, 4]) {
    const cp = path.join(DIRS.cards, `r${k}-${stem}-dev.json`);
    if (!exists(cp)) { gaps.push({ feature: `t03_r${k}`, reason: "no_card", denominator: { have: 0, need: 1 } }); continue; }
    try {
      const d = readJson(cp); inputs.push({ path: cp, sha256: sha256File(cp), role: "card" });
      const giver = `khora competence card r${k} (output of the system under test on UD dev; object of study, never gold)`;
      put(`t03_r${k}_margin`, Number.isFinite(d.margin) ? d.margin : null, d.n ?? null, `card:r${k}`, giver);
      put(`t03_r${k}_pass`, d.pass === true ? 1 : (d.pass === false ? 0 : null), d.n ?? null, `card:r${k}`, giver, { detail: { gaps: (d.gaps ?? []).map((g) => g.reason) } });
    } catch (e) { gaps.push({ feature: `t03_r${k}`, reason: `card_unreadable:${e.message}`, denominator: { have: 0, need: 1 } }); }
  }
  return { targets, gaps, inputs, roleConfigSource };
}
function posPriorCells(stem, corpus) {
  const p = priorPath("pos", stem); const out = {}; const gaps = []; const inputs = [];
  if (!exists(p)) { gaps.push({ feature: "e01p", reason: "no_pos_prior", denominator: { have: 0, need: 1 } }, { feature: "e07p", reason: "no_pos_prior", denominator: { have: 0, need: 1 } }); return { out, gaps, inputs, prior: null }; }
  const d = readJson(p); inputs.push({ path: p, sha256: sha256File(p), role: "prior" });
  const prov = d.provenance ?? {};
  if (corpus && (prov.sentences_read !== corpus.nBlocks || prov.tokens_read !== corpus.nTokens)) {
    gaps.push({ feature: "e01p", reason: "prior_source_differs", denominator: { have: prov.tokens_read ?? 0, need: corpus.nTokens } }, { feature: "e07p", reason: "prior_source_differs", denominator: { have: prov.tokens_read ?? 0, need: corpus.nTokens } });
    return { out, gaps, inputs, prior: d };
  }
  let closed = 0; let tot = 0; let V = 0; let amb = 0;
  for (const m of Object.values(d.forms)) {
    let lex = 0; let nlex = 0;
    for (const [u, c] of Object.entries(m)) { if (u === "PUNCT" || u === "SYM") continue; tot += c; if (CLOSED_ID.has(UPOS_ID[u])) closed += c; lex += 1; nlex += c; }
    if (nlex > 0) { V += 1; if (lex > 1) amb += 1; }
  }
  out.e01p = { v: tot ? closed / tot : null, n: tot }; out.e07p = { v: V ? amb / V : null, n: V };
  return { out, gaps, inputs, prior: d };
}

// ── system discovery ───────────────────────────────────────────────────────────────────────────────────────────
const countCache = new Map();
/** { nBlocks, nTokens, nonPunct } of a CoNLL-U file by a light scan (the same counting rules as the received pos builder). */
export function quickCounts(file) {
  if (countCache.has(file)) return countCache.get(file);
  const r0 = memo("counts-v2", file, () => quickCountsRaw(file)); countCache.set(file, r0); return r0;
}
function quickCountsRaw(file) {
  let nBlocks = 0; let nTokens = 0; let nonPunct = 0; let lexical = 0; let inBlock = false;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.charCodeAt(0) === 35) continue;
    if (!line.trim()) { inBlock = false; continue; }
    if (!inBlock) { nBlocks += 1; inBlock = true; }
    const c = line.split("\t"); if (c.length < 4 || !/^[0-9]+$/.test(c[0])) continue;
    nTokens += 1; if (c[3] !== "PUNCT") { nonPunct += 1; if (c[3] !== "SYM") lexical += 1; }
  }
  return { nBlocks, nTokens, nonPunct, lexical };
}
const tbDirs = () => (exists(DIRS.tb) ? fs.readdirSync(DIRS.tb, { withFileTypes: true }).filter((d) => d.isDirectory() && exists(path.join(DIRS.tb, d.name, "train.conllu"))).map((d) => d.name).sort() : []);
const priorStems = () => (exists(DIRS.priors) ? fs.readdirSync(DIRS.priors).filter((f) => /^(pos|role-config)-.+\.json$/.test(f)).map((f) => f.replace(/^(pos|role-config)-/, "").replace(/\.json$/, "")).filter((s) => !/-unimorph$/.test(s) && s !== "en") : []);
const treebankName = (pos) => { const m = /UD_[A-Za-z_]+-[A-Za-z0-9]+/.exec(`${pos?.provenance?.source ?? ""} ${pos?.provenance?.giver ?? ""}`); return m ? m[0] : null; };

/** Which tb directory is the treebank a stem's received priors were built from. Same-file test: sentences_read and tokens_read. */
export function resolveNl() {
  const dirs = tbDirs(); const pst = priorStems(); const allNames = new Set([...dirs, ...pst]);
  // a directory like "kor-gsd" is a VARIANT of the stem "kor" (not a stem of its own) when another name is its prefix and it has no prior of its own
  const isVariant = (d) => !pst.includes(d) && [...allNames].some((o) => o !== d && d.startsWith(`${o}-`));
  const stems = [...new Set([...dirs.filter((d) => !isVariant(d)), ...pst])].sort(); const primaryDirs = new Set(); const rows = [];
  for (const stem of stems) {
    const pp = priorPath("pos", stem); const pos = exists(pp) ? readJson(pp) : null; const prov = pos?.provenance;
    const cands = dirs.filter((d) => d === stem || d.startsWith(`${stem}-`)).sort((a, b) => (a === stem ? -1 : b === stem ? 1 : a < b ? -1 : 1));
    let pick = null; let match = null;
    for (const d of cands) { const q = quickCounts(path.join(DIRS.tb, d, "train.conllu")); if (prov && q.nBlocks === prov.sentences_read && q.nTokens === prov.tokens_read) { pick = d; match = true; break; } }
    if (!pick && cands.includes(stem)) { pick = stem; match = prov ? false : null; }
    if (!pick && cands.length) { pick = cands[0]; match = prov ? false : null; }
    if (pick) primaryDirs.add(pick);
    rows.push({ stem, dir: pick, posPrior: !!pos, priorSourceMatchesTrain: match, treebank: treebankName(pos) });
  }
  const twins = dirs.filter((d) => !primaryDirs.has(d)).map((d) => {
    const readme = exists(path.join(DIRS.tb, d, "README.md")) ? fs.readFileSync(path.join(DIRS.tb, d, "README.md"), "utf8").slice(0, 2000) : "";
    return { stem: `${d}-${/KAIST/i.test(readme) ? "kaist" : "alt"}`, dir: d, twinOf: d, posPrior: false, priorSourceMatchesTrain: null, treebank: /KAIST/i.test(readme) ? "UD_Korean-Kaist" : null };
  });
  return [...rows, ...twins];
}
const codeSystemsCache = { v: null };
function codeManifest() {
  if (codeSystemsCache.v !== undefined && codeSystemsCache.v !== null) return codeSystemsCache.v;
  const p = path.join(DIRS.codeCorpus, "manifest.json");
  codeSystemsCache.v = exists(p) ? readJson(p) : false; return codeSystemsCache.v;
}
export const systemKey = (kind, name) => `${kind}:${name}`;
const normaliseKey = (id) => (/^(nl|code|notation):/.test(id) ? id : `nl:${id}`);

/** The manifest: one row per system with data now, with sha256 of every input, firstSeen, tiers and typed gaps. Pure read. */
export function discoverSystems({ refreshFirstSeen = true } = {}) {
  const prevPath = path.join(DIRS.out, "manifest.json"); const prev = exists(prevPath) ? readJson(prevPath) : null;
  const firstSeenOf = new Map((prev?.systems ?? []).map((r) => [r.system, r.firstSeen]));
  const now = new Date().toISOString(); const systems = []; const gaps = [];
  for (const r of resolveNl()) {
    const key = systemKey("nl", r.stem); const gen = genealogyOf(r.stem); const row = { system: key, kind: "nl", stem: r.stem, family: gen.branch, lineage: gen.lineage, macro: gen.macro, genealogyTyped: gen.typed, twinOf: r.twinOf ?? null, treebank: r.treebank };
    if (r.dir) {
      const train = path.join(DIRS.tb, r.dir, "train.conllu"); const q = quickCounts(train);
      const devP = r.twinOf ? null : path.join(DIRS.evalDir, r.stem, "dev.conllu");
      Object.assign(row, { dir: r.dir, trainFile: train, trainSha256: sha256File(train), devFile: devP && exists(devP) ? devP : null, nSentences: q.nBlocks, nTokens: q.nTokens, nonPunctWords: q.nonPunct, lexicalWords: q.lexical,
        priorSourceMatchesTrain: r.priorSourceMatchesTrain, tiers: ["R", "T", "D", "M", "G"], budgetReachable: q.lexical >= N_NL + 300 });
      if (row.devFile) row.devSha256 = sha256File(row.devFile); else gaps.push({ system: key, feature: "e03..e05", reason: r.twinOf ? "dev_split_belongs_to_another_treebank" : "no_dev_split", denominator: { have: 0, need: 1 } });
      if (!row.budgetReachable) gaps.push({ system: key, feature: "sampled cells", reason: "below_budget", denominator: { have: q.lexical, need: N_NL } });
    } else { Object.assign(row, { dir: null, trainFile: null, nonPunctWords: 0, tiers: r.posPrior ? ["T"] : [], budgetReachable: false }); gaps.push({ system: key, feature: "sampled cells", reason: "no_treebank_on_disk", denominator: { have: 0, need: 1 } }); }
    row.cards = [1, 2, 3, 4].filter((k) => exists(path.join(DIRS.cards, `r${k}-${r.stem}-dev.json`))).map((k) => `r${k}`);
    row.priors = ["pos", "role-config", "frame"].filter((k) => exists(priorPath(k, r.stem)));
    if (!row.trainFile && !row.priors.includes("pos")) continue; // nothing to measure
    row.firstSeen = firstSeenOf.get(key) ?? now; systems.push(row);
  }
  const cm = codeManifest();
  if (cm?.languages) for (const [lang, splits] of Object.entries(cm.languages)) {
    const train = (splits.train ?? []).filter((f) => !f.restricted);
    if (!train.length) continue;
    const key = systemKey("code", lang);
    systems.push({ system: key, kind: "code", stem: lang, family: CODE_FAMILY[lang] ?? "unlabelled", lineage: CODE_FAMILY[lang] ?? "unlabelled", macro: "code", genealogyTyped: !!CODE_FAMILY[lang],
      trainFiles: train.length, devFiles: (splits.dev ?? []).filter((f) => !f.restricted).length, tiers: ["G", "D", "R"], manifestSha256: sha256File(path.join(DIRS.codeCorpus, "manifest.json")), firstSeen: firstSeenOf.get(key) ?? now });
  }
  const notationDirs = exists(path.join(DIRS.notation, "corpus")) ? fs.readdirSync(path.join(DIRS.notation, "corpus")) : [];
  if (!notationDirs.length) gaps.push({ system: "notation:*", feature: "all", reason: "no_notation_corpus_on_disk (feasibility heads only)", denominator: { have: 0, need: 3 } });
  const m = { schema: "BarkerManifest@1", profilesVersion: PROFILES_VERSION, preregSha: PREREG_SHA, provisional: PROVISIONAL, cellStatus: cellStatus(), generatedAt: refreshFirstSeen ? now : prev?.generatedAt ?? now, systems, gaps };
  return m;
}

// ── building one natural-language profile ──────────────────────────────────────────────────────────────────────
function loadCorpus(file, split) {
  assertSplit(split);
  const parsed = parseConllu(fs.readFileSync(file, "utf8"));
  parsed.stats = parsed.sentences.map((s) => sentenceStats(s));
  return parsed;
}
function fileOrderIds(corpus) {
  const ids = []; const table = new Map();
  for (const s of corpus.sentences) for (let i = 0; i < s.n; i++) {
    const u = s.upos[i]; if (u === U.PUNCT || u === U.SYM) continue;
    const w = s.lower[i]; let id = table.get(w); if (id === undefined) { id = table.size; table.set(w, id); } ids.push(id);
  }
  return Int32Array.from(ids);
}
function evalSampleCells(corpus, idxs, Nlim, devCorpus, withWs, heaps) {
  const V = sumStats(corpus, idxs);
  const cells = additiveCells(V);
  Object.assign(cells, lexicalCells(corpus, idxs, Nlim, heaps, devCorpus));
  Object.assign(cells, charCells(corpus, idxs, { ws: withWs }));
  const codes = []; for (const j of idxs) for (const c of corpus.stats[j].g05) codes.push(c);
  cells.g05 = roleIdentifiability(codes);
  return cells;
}
function bootstrapAdditive(corpus, idxs, systemKey_, B = PROVISIONAL.BOOT_B) {
  const rng = createSeededRng({ seed: SEED, system: systemKey_, purpose: "bootstrap" });
  const S = idxs.length; const V = new Float64Array(K); const out = Object.fromEntries(BOOT_IDS.map((i) => [i, []]));
  for (let b = 0; b < B; b++) {
    V.fill(0);
    for (let s = 0; s < S; s++) { const st = corpus.stats[idxs[Math.floor(rng() * S)]].st; for (let k = 0; k < K; k++) V[k] += st[k]; }
    const cells = additiveCells(V);
    for (const id of BOOT_IDS) if (cells[id]?.v != null) out[id].push(cells[id].v);
  }
  const ci = Object.fromEntries(BOOT_IDS.map((id) => [id, ST.percentileCI(out[id])]));
  // g05: its own cluster bootstrap
  const rng2 = createSeededRng({ seed: SEED, system: systemKey_, purpose: "bootstrap-g05" }); const g = [];
  for (let b = 0; b < PROVISIONAL.G05_BOOT_B; b++) {
    const codes = []; for (let s = 0; s < S; s++) for (const c of corpus.stats[idxs[Math.floor(rng2() * S)]].g05) codes.push(c);
    const r = roleIdentifiability(codes); if (r.v != null) g.push(r.v);
  }
  ci.g05 = ST.percentileCI(g);
  return ci;
}

function makeProfileObject({ system, kind, id, inputs, labels, budget, cells: allCells, targets, gaps, extra = {} }) {
  // a cell whose pre-registered planted check FAILED (power.pass === false) is WITHHELD from `cells` and `features`: it is not offered to induction
  const cells = {}; const withheld = {};
  for (const [k, c] of Object.entries(allCells)) { if (c.power && c.power.pass === false) withheld[k] = c; else cells[k] = c; }
  const eo = assertEoFree({ cells: allCells, provenance: {} }); const eoT = assertEoFree({ cells: targets ?? {} });
  const features = Object.fromEntries(Object.entries(cells).map(([k, c]) => [k, c.value]));
  const provenance = Object.fromEntries(Object.entries(cells).map(([k, c]) => [k, { source: `${c.channel}; giver: ${c.giver}`, computation: `${c.builder} :: ${c.definitionId}${c.floor ? ` :: floor ${c.floor.rule}` : ""}` }]));
  const body = { cells: Object.fromEntries(Object.entries(cells).map(([k, c]) => [k, { value: c.value, n: c.n, resamples: c.resamples }])), inputs: inputs.filter((i) => i.role === "train" || i.role === "dev" || i.role === "grammar" || i.role === "manifest").map((i) => [i.role, i.sha256]), prereg: PREREG_SHA, v: PROFILES_VERSION };
  const profile = {
    schema: "SystemProfile@1", system, id, kind, family: labels.family, inputs, labels, budget, cells, withheld, targets: targets ?? {}, gaps, features, provenance,
    eoFree: eo.ok && eoT.ok, contentHash: `sha256:${sha256Str(canon(body))}`, profilesVersion: PROFILES_VERSION, preregSha: PREREG_SHA, ...extra,
  };
  for (const [k, c] of Object.entries(withheld)) profile.gaps.push({ feature: k, reason: `withheld:${c.power.check}_failed_${c.power.status}`, denominator: { have: c.n, need: c.floor?.rule ?? null } });
  if (!profile.eoFree) throw new Error(`EO contamination in ${system}: ${JSON.stringify([...eo.offenders, ...eoT.offenders])}`);
  return profile;
}
export function profileTypeError(p) { // lightweight validation used by the cache loader and the tests
  const errs = [];
  for (const [id, c] of Object.entries(p.cells ?? {})) {
    for (const f of ["id", "group", "channel", "definitionId", "builder", "giver"]) if (c[f] == null) errs.push(`${id}.${f}`);
    if (!Number.isFinite(c.n) && c.n !== null) errs.push(`${id}.n`);
    if (!("ci95" in c) || !c.ci95Policy) errs.push(`${id}.ci95`);
    if (!Number.isFinite(c.value)) errs.push(`${id}.value`);
  }
  return errs;
}

function priorOnlyCells(stem, out, treebank) {
  const cells = {};
  for (const [id, c] of Object.entries(out)) {
    if (c.v == null) continue; const reg = FEATURE_REGISTRY[id];
    cells[id] = { id, group: reg.group, groupName: reg.groupName, channel: `${reg.channel}-${stem}`, value: c.v, n: c.n, ci95: null, ci95Policy: "none:full_train_prior_no_resampling", resamples: [], definitionId: reg.definitionId, builder: BUILDER("pos_prior_cells"),
      giver: `khora priors/pos-${stem}.json (UD train counts; ${treebank ?? ""})`, floor: { rule: reg.floorRule, used: c.n } };
  }
  return cells;
}
const POWERED = new Set(["d01", "d01o", "d07", "d07x", "d08", "d08x"]);
function assembleCells(rowCtx, perSeed, seq, bootCI, extraCells, kind = "nl") {
  const cells = {}; const gaps = []; const builderOf = { A: "additive_cells", B: "additive_cells", C: "char_cells", D: "recurrence_cells", E: "lexical_cells", F: "additive_cells", G: "additive_cells", I: "code_additive_cells" };
  const ids = Object.values(FEATURE_REGISTRY).filter((r) => r.kinds.includes(kind) && r.group !== "T" && r.group !== "H" && !["e01p", "e07p"].includes(r.id)).map((r) => r.id);
  const trainGiver = kind === "nl" ? `Universal Dependencies treebank ${rowCtx.treebank ?? rowCtx.dir} (train split, human-annotated gold)` : `tree-sitter ${rowCtx.stem} grammar over the polyglot code corpus (train split, files as clusters)`;
  const a21 = kind === "nl" ? perSeed.map((p) => p.U.a21?.v) : [];
  const spacedCell = kind === "nl" && a21.every((v) => v != null) && ST.mean(a21) >= PROVISIONAL.SPACED_WS;
  for (const id of ids) {
    const reg = FEATURE_REGISTRY[id];
    if (id === "c01s" && !spacedCell) { gaps.push({ feature: id, reason: a21.every((v) => v != null) ? "unspaced_script_a21_below_0.5" : "a21_undefined", denominator: { have: ST.mean(a21.filter((v) => v != null)), need: PROVISIONAL.SPACED_WS } }); continue; }
    const us = perSeed.map((p) => p.U[id]); const defined = us.every((x) => x && x.v != null && Number.isFinite(x.v));
    if (!defined) {
      const have = Math.min(...us.map((x) => (x ? x.n ?? 0 : 0)));
      const reason = (id === "e03" || id === "e04" || id === "e05") && !rowCtx.hasDev ? (rowCtx.twinOf ? "dev_split_belongs_to_another_treebank" : "no_dev_split") : (id === "d07" || id === "d08" || id === "d07x" || id === "d08x") && !seq ? "below_budget" : "below_floor_or_undefined";
      gaps.push({ feature: id, reason, denominator: { have, need: reg.floorRule } }); continue;
    }
    const halves = []; for (const p of perSeed) for (const h of ["A", "B"]) halves.push(p[h][id]?.v != null && Number.isFinite(p[h][id].v) ? p[h][id].v : null);
    const ci = bootCI[id] ?? null;
    const det = id === "c05" || id === "d01" ? { seed1: us[0].detail ?? null } : (id === "d07" || id === "d07x") ? { shuffleMean: seq?.shuffleB, shuffleSd: seq?.shuffleSdB } : (id === "d08" || id === "d08x") ? { shuffleMean: seq?.shuffleH, shuffleSd: seq?.shuffleSdH } : null;
    cells[id] = { id, group: reg.group, groupName: reg.groupName, channel: reg.channel, value: ST.mean(us.map((x) => x.v)), n: us[0].n, ci95: ci, ci95Policy: ci ? (id === "g05" ? "cluster_bootstrap:sentences:B200:on_seed1_union" : `cluster_bootstrap:${kind === "nl" ? "sentences" : "files"}:B1000:on_seed1_union`) : (BOOT_IDS.includes(id) ? "none:bootstrap_degenerate" : "resample-spread"),
      resamples: halves, definitionId: reg.definitionId, builder: BUILDER(builderOf[reg.group] ?? "assemble_cells"), giver: id === "a21" || id.startsWith("c0") ? `${trainGiver}; ${kind === "nl" ? "surface text" : "source text"}` : trainGiver, floor: { rule: reg.floorRule, used: us[0].n }, ...(det ? { detail: det } : {}), ...(POWERED.has(id) ? { power: cellStatus()[id] } : {}) };
  }
  Object.assign(cells, kind === "nl" ? priorOnlyCells(rowCtx.stem, extraCells, rowCtx.treebank) : {});
  return { cells, gaps };
}

/** Build one natural-language SystemProfile@1. `system`: "eng" | "nl:eng" | a manifest row. Deterministic. */
export function buildNlProfile(system, opts = {}) {
  const manifestRow = typeof system === "object" ? system : discoverSystems({ refreshFirstSeen: false }).systems.find((r) => r.system === normaliseKey(system));
  if (!manifestRow || manifestRow.kind !== "nl") throw new Error(`unknown natural-language system ${typeof system === "string" ? system : system?.system}`);
  const row = manifestRow; const key = row.system; const N = opts.N ?? N_NL;
  const inputs = []; const gaps = [];
  const tg = readTargets(row.stem); const targets = tg.targets; gaps.push(...tg.gaps); inputs.push(...tg.inputs);
  const labels = { stem: row.stem, family: row.family, branch: row.family, lineage: row.lineage, macro: row.macro, script: null, scriptShares: null, typedBy: row.genealogyTyped ? GENEALOGY_GIVER : "unlabelled", giver: `Universal Dependencies treebank ${row.treebank ?? row.dir ?? "none"}`, twinOf: row.twinOf ?? null, treebank: row.treebank ?? null, macroarea: null };
  const budget = { N, halves: 2, seeds: SEEDS, unit: "non-PUNCT UD word", sequenceWindows: "contiguous, file order" };
  if (!row.trainFile) { // priors-only system (e.g. a language with a pos prior and no treebank file)
    const pc = posPriorCells(row.stem, null); gaps.push(...pc.gaps, { feature: "sampled cells", reason: "no_treebank_on_disk", denominator: { have: 0, need: N } }); inputs.push(...pc.inputs);
    const cells = priorOnlyCells(row.stem, pc.out, row.treebank);
    return makeProfileObject({ system: key, kind: "nl", id: `${key}@priors-only`, inputs, labels, budget, cells, targets, gaps, extra: { completeness: Object.keys(cells).length / Object.values(FEATURE_REGISTRY).filter((r) => r.kinds.includes("nl") && r.group !== "T").length } });
  }
  const corpus = loadCorpus(row.trainFile, "train");
  inputs.push({ path: row.trainFile, sha256: row.trainSha256 ?? sha256File(row.trainFile), role: "train" });
  let dev = null;
  if (row.devFile) { dev = loadCorpus(row.devFile, "dev"); inputs.push({ path: row.devFile, sha256: row.devSha256 ?? sha256File(row.devFile), role: "dev" }); }
  const textAll = corpus.sentences.map((s) => s.text ?? s.form.join(" ")).join("\n");
  const sc = scriptShares(textAll); labels.script = sc.dominant; labels.scriptShares = sc.shares;
  const totalWs = ST.sum(corpus.stats.map((x) => x.st[IDX.ws_chars])); const totalW = ST.sum(corpus.stats.map((x) => x.st[IDX.words_all]));
  const corpusSpaced = totalW > 0 && totalWs / totalW >= PROVISIONAL.SPACED_WS;
  const pc = posPriorCells(row.stem, corpus); gaps.push(...pc.gaps); inputs.push(...pc.inputs);
  const rowCtx = { stem: row.stem, dir: row.dir, treebank: row.treebank, hasDev: !!dev, twinOf: row.twinOf };
  // samples
  const draws = SEEDS.map((s) => drawSample(corpus, s, key, N));
  if (!draws.every((d) => d.ok)) {
    const total = ST.sum(corpus.stats.map((x) => x.st[IDX.nwl]));
    gaps.push({ feature: "sampled cells", reason: "below_budget", denominator: { have: total, need: N } });
    return makeProfileObject({ system: key, kind: "nl", id: `${key}@sha256:${(row.trainSha256 ?? "").slice(0, 12)}`, inputs, labels, budget, cells: priorOnlyCells(row.stem, pc.out, row.treebank), targets, gaps,
      extra: { completeness: 0, sentences: corpus.sentences.length, words: total } });
  }
  const perSeed = SEEDS.map((s, i) => {
    const d = draws[i];
    return { U: evalSampleCells(corpus, d.U, N, dev, corpusSpaced, PROVISIONAL.HEAPS_NL), A: evalSampleCells(corpus, d.A, N / 2, dev, corpusSpaced, PROVISIONAL.HEAPS_NL), B: evalSampleCells(corpus, d.B, N / 2, dev, corpusSpaced, PROVISIONAL.HEAPS_NL) };
  });
  const seq = sequenceCells(fileOrderIds(corpus), N, key);
  if (seq) perSeed.forEach((p, i) => {
    const w = seq.per[i];
    p.U.d07 = { v: w.U.B, n: N }; p.U.d08 = { v: w.U.H, n: N }; p.U.d07x = { v: w.U.B == null ? null : w.U.B - seq.shuffleB, n: N }; p.U.d08x = { v: w.U.H == null ? null : w.U.H - seq.shuffleH, n: N };
    for (const h of ["A", "B"]) { p[h].d07 = { v: w[h].B }; p[h].d08 = { v: w[h].H }; p[h].d07x = { v: w[h].B == null ? null : w[h].B - seq.shuffleB }; p[h].d08x = { v: w[h].H == null ? null : w[h].H - seq.shuffleH }; }
  });
  const bootCI = bootstrapAdditive(corpus, draws[0].U, key);
  const { cells, gaps: g2 } = assembleCells(rowCtx, perSeed, seq, bootCI, pc.out, "nl");
  gaps.push(...g2);
  const nExpected = Object.values(FEATURE_REGISTRY).filter((r) => r.kinds.includes("nl") && r.group !== "T").length;
  return makeProfileObject({ system: key, kind: "nl", id: `${key}@sha256:${(row.trainSha256 ?? "").slice(0, 12)}`, inputs, labels, budget, cells, targets, gaps,
    extra: { completeness: Object.keys(cells).length / nExpected, sentences: corpus.sentences.length, words: ST.sum(corpus.stats.map((x) => x.st[IDX.nw])), priorRoleConfigSource: tg.roleConfigSource } });
}

// ═══ code systems ══════════════════════════════════════════════════════════════════════════════════════════════
export const POOL_CODE = 200000; // leaf tokens of the per-language file pool (PROVISIONAL): files are taken in a seeded order until reached
const CODE_NAMES = ["files", "nodes", "leaf", "kids_sum", "nonleaf", "height_sum", "depth_sum"];
for (let k = 1; k <= 6; k++) CODE_NAMES.push(`dh_${k}`);
for (let s = 2; s <= 16; s++) CODE_NAMES.push(`surv_${s}`);
for (let k = 1; k <= 8; k++) CODE_NAMES.push(`ord_${k}`);
CODE_NAMES.push("leaves", "cl_k", "cl_o", "cl_d", "cl_c", "cl_l", "cl_i", "cl_x", "err", "brace", "endkw", "paren", "indent_sum", "indent_lines", "chars");
const CK = CODE_NAMES.length; const CIDX = Object.freeze(Object.fromEntries(CODE_NAMES.map((n, i) => [n, i])));

function indentStats(text) {
  let prev = null; let sum = 0; let lines = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let w = 0; for (const ch of line) { if (ch === " ") w += 1; else if (ch === "\t") w += 4; else break; }
    if (prev !== null) { sum += Math.abs(w - prev); lines += 1; }
    prev = w;
  }
  return { sum, lines };
}
function fileVector(r, text) {
  const v = new Float64Array(CK); const t = r.tree;
  v[CIDX.files] = 1; v[CIDX.nodes] = t.nodes; v[CIDX.leaf] = t.leaf; v[CIDX.kids_sum] = t.kidsSum; v[CIDX.nonleaf] = t.nonleaf; v[CIDX.height_sum] = t.heightMax; v[CIDX.depth_sum] = t.depthSum;
  t.dh.forEach((x, i) => { v[CIDX[`dh_${i + 1}`]] = x; }); t.surv.forEach((x, i) => { v[CIDX[`surv_${i + 2}`]] = x; }); t.ord.forEach((x, i) => { v[CIDX[`ord_${i + 1}`]] = x; });
  v[CIDX.leaves] = r.leaves; v[CIDX.err] = r.errLeaves; v[CIDX.brace] = r.sym.brace; v[CIDX.endkw] = r.sym.endkw; v[CIDX.paren] = r.sym.paren; v[CIDX.chars] = r.nchars;
  for (const ch of r.cls) v[CIDX[`cl_${ch}`]] += 1;
  const ind = indentStats(text); v[CIDX.indent_sum] = ind.sum; v[CIDX.indent_lines] = ind.lines;
  return v;
}
const CV_ = (V, n) => V[CIDX[n]];
/** Additive code cells from a summed file vector. */
export function codeAdditiveCells(V) {
  const c = {}; const nodes = CV_(V, "nodes"); const leaves = CV_(V, "leaves");
  c.b01 = share(CV_(V, "height_sum"), CV_(V, "files"), 1); c.b02 = share(CV_(V, "depth_sum"), nodes, 1);
  for (let k = 1; k <= 6; k++) c[`b0${2 + k}`] = share(CV_(V, `dh_${k}`), nodes, 1);
  c.b09 = share(CV_(V, "kids_sum"), CV_(V, "nonleaf"), 1); c.b10 = share(CV_(V, "leaf"), nodes, 1); c.b11 = { v: null, n: 0 };
  { const xs = []; const ys = []; for (let s = 2; s <= 16; s++) { const v = CV_(V, `surv_${s}`); if (v > 0) { xs.push(Math.log10(s)); ys.push(Math.log10(v / nodes)); } }
    c.b12 = xs.length >= 4 ? { v: ST.olsFit(xs, ys).slope, n: nodes } : { v: null, n: nodes }; }
  { const o = (k) => CV_(V, `ord_${k}`);
    c.b13 = share(o(1), nodes, 1); c.b14 = share(o(2), nodes, 1); c.b15 = share(o(3), nodes, 1); c.b16 = share(o(4) + o(5) + o(6) + o(7) + o(8), nodes, 1);
    const counts = [0]; for (let k = 1; k <= 8; k++) counts.push(o(k));
    const fit = ST.strahlerFit(counts, { minCount: PROVISIONAL.STRAHLER_MIN });
    c.b17 = fit ? { v: fit.rb, n: nodes } : { v: null, n: nodes }; c.b18 = fit ? { v: fit.r2, n: nodes } : { v: null, n: nodes }; }
  const L = (n) => share(CV_(V, n), leaves, 1);
  c.i01 = L("cl_k"); c.i02 = L("cl_i"); c.i03 = L("cl_l"); c.i04 = L("cl_c"); c.i05 = L("cl_d"); c.i06 = L("cl_o"); c.i08 = L("err"); c.i09 = L("brace"); c.i10 = L("endkw"); c.i11 = L("paren");
  c.i12 = share(CV_(V, "indent_sum"), CV_(V, "indent_lines"), 1);
  return c;
}
export const CODE_BOOT_IDS = Object.freeze(["b01", "b02", "b03", "b04", "b05", "b06", "b07", "b08", "b09", "b10", "b13", "b14", "b15", "b16", "i01", "i02", "i03", "i04", "i05", "i06", "i08", "i09", "i10", "i11", "i12"]);

function pyAvailable() { return exists(DIRS.venvPython) && exists(path.join(HERE, "ast_extract.py")); }
function runPy(args, input) {
  const r = spawnSync(DIRS.venvPython, [path.join(HERE, "ast_extract.py"), ...args], { input, encoding: "utf8", maxBuffer: 1 << 30, env: { ...process.env, TREE_SITTER_LANGUAGE_PACK_CACHE_DIR: DIRS.tsCache } });
  if (r.status !== 0) throw new Error(`ast_extract ${args.join(" ")} failed: ${(r.stderr || "").slice(0, 300)}`);
  return r.stdout;
}
const AST_CACHE = (lang) => path.join(DIRS.cache, "ast-cache", sha256File(path.join(HERE, "ast_extract.py")).slice(0, 10), lang); // keyed by the extractor's own hash
/** Extract (cached by file sha256) the per-file statistics of an ordered list of manifest file rows until `target` leaves are reached. */
function extractPool(lang, files, target) {
  fs.mkdirSync(AST_CACHE(lang), { recursive: true });
  const out = []; let leaves = 0; let failures = 0; let i = 0;
  while (i < files.length && leaves < target) {
    const batch = files.slice(i, i + 25); i += 25;
    const need = batch.filter((f) => !exists(path.join(AST_CACHE(lang), `${f.sha256}.json`)));
    if (need.length) {
      const stdout = runPy(["files", lang], JSON.stringify(need.map((f) => ({ path: f.path }))));
      const byPath = new Map(); for (const line of stdout.split("\n")) if (line.trim()) { const r = JSON.parse(line); byPath.set(r.path, r); }
      for (const f of need) { const r = byPath.get(f.path) ?? { ok: false, reason: "missing_result" }; fs.writeFileSync(path.join(AST_CACHE(lang), `${f.sha256}.json`), JSON.stringify(r)); }
    }
    for (const f of batch) {
      const r = readJson(path.join(AST_CACHE(lang), `${f.sha256}.json`));
      if (!r.ok || r.leaves === 0) { failures += 1; continue; }
      out.push({ f, r }); leaves += r.leaves;
      if (leaves >= target) break;
    }
  }
  return { pool: out, leaves, failures, scanned: Math.min(i, files.length) };
}
function lineStreams(text, starts) {
  const cp = Array.from(text); const streams = []; const B = [];
  const lineStart = [0]; for (let i = 0; i < cp.length; i++) if (cp[i] === "\n") lineStart.push(i + 1);
  const bucket = new Map(); // line index -> starts
  for (const s of starts) {
    let lo = 0; let hi = lineStart.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (lineStart[m] <= s) lo = m; else hi = m - 1; }
    let a = bucket.get(lo); if (!a) { a = []; bucket.set(lo, a); } a.push(s);
  }
  for (let li = 0; li < lineStart.length; li++) {
    const from = lineStart[li]; const to = li + 1 < lineStart.length ? lineStart[li + 1] - 1 : cp.length;
    const keepIdx = []; for (let q = from; q < to; q++) if (!/\s/u.test(cp[q])) keepIdx.push(q);
    if (keepIdx.length < 4) continue;
    const pos = new Map(keepIdx.map((q, i) => [q, i])); const bs = new Set();
    for (const s of bucket.get(li) ?? []) if (pos.has(s)) bs.add(pos.get(s));
    streams.push(keepIdx.map((q) => cp[q])); B.push(bs);
  }
  return { streams, starts: B };
}
function evalCodeSample(pool, idxs, Nid) {
  const V = new Float64Array(CK); const kinds = new Set(); const ids = []; const streams = []; const starts = [];
  for (const j of idxs) {
    const e = pool[j]; for (let k = 0; k < CK; k++) V[k] += e.vec[k]; for (const kd of Object.keys(e.r.kinds)) kinds.add(kd);
    for (const id of e.r.ids) ids.push(id);
    e.ls ??= lineStreams(e.text, e.r.starts); for (let q = 0; q < e.ls.streams.length; q++) { streams.push(e.ls.streams[q]); starts.push(e.ls.starts[q]); }
  }
  const cells = codeAdditiveCells(V);
  Object.assign(cells, recurrenceCells(ids.slice(0, Nid), Nid, Nid >= PROVISIONAL.N_ID ? PROVISIONAL.HEAPS_ID : PROVISIONAL.HEAPS_ID.filter((p) => p <= Nid)));
  Object.assign(cells, charCellsFrom(streams, starts));
  cells.i07 = { v: kinds.size, n: kinds.size }; // normalised by h04 at assembly
  return cells;
}

/** Build one code-language SystemProfile@1 from the TRAIN split of the polyglot corpus (the test list is never opened). */
export function buildCodeProfile(language, opts = {}) {
  const lang = language.replace(/^code:/, ""); const key = systemKey("code", lang);
  const cm = codeManifest(); if (!cm?.languages?.[lang]) throw new Error(`unknown code language ${lang}`);
  const files = (cm.languages[lang].train ?? []).filter((f) => !f.restricted);
  const inputs = [{ path: path.join(DIRS.codeCorpus, "manifest.json"), sha256: sha256File(path.join(DIRS.codeCorpus, "manifest.json")), role: "manifest" }];
  const gaps = []; const cells = {};
  const labels = { stem: lang, family: CODE_FAMILY[lang] ?? "unlabelled", branch: CODE_FAMILY[lang] ?? "unlabelled", lineage: CODE_FAMILY[lang] ?? "unlabelled", macro: "code", script: null, scriptShares: null, typedBy: CODE_FAMILY[lang] ? "S-code family typed by the profile author from the language's own reference (BARKER 3.6); ANSWER KEY ONLY" : "unlabelled", giver: `tree-sitter ${lang} grammar`, twinOf: null, treebank: null, macroarea: null };
  const budget = { N: PROVISIONAL.N_CODE, halves: 2, seeds: SEEDS, unit: "leaf token", pool: POOL_CODE, N_ID: PROVISIONAL.N_ID };
  const mk = (extra = {}) => makeProfileObject({ system: key, kind: "code", id: `${key}@manifest:${inputs[0].sha256.slice(0, 12)}`, inputs, labels, budget, cells, targets: {}, gaps, extra });
  if (!pyAvailable()) { gaps.push({ feature: "all", reason: "ast_adjunct_unavailable", denominator: { have: 0, need: 1 } }); return mk({ completeness: 0 }); }
  // H: grammar inventory (+ received law prior where one exists)
  let inv = null;
  try { inv = JSON.parse(runPy(["inventory", lang], "")); } catch (e) { gaps.push({ feature: "h01..h08", reason: `grammar_unavailable:${String(e.message).slice(0, 80)}`, denominator: { have: 0, need: 1 } }); }
  const giverH = `tree-sitter grammar symbol table (${inv?.pack ?? "language pack"})`;
  const putH = (id, v, n, channel, giver, floor) => { if (v == null) return; const reg = FEATURE_REGISTRY[id]; cells[id] = { id, group: "H", groupName: GROUP_NAME.H, channel, value: v, n, ci95: null, ci95Policy: "none:deterministic_inventory", resamples: [], definitionId: reg.definitionId, builder: BUILDER("grammar_inventory"), giver, floor: { rule: floor ?? reg.floorRule, used: n } }; };
  if (inv) for (const id of ["h01", "h03", "h04", "h06b", "h06e", "h06i", "h07", "h08"]) putH(id, inv[id], inv.nodeKindCount, "grammar:tree-sitter", giverH);
  if (inv) labels.declaredBlockSymbols = { brace: inv.h06b, endKeyword: inv.h06e, indent: inv.h06i };
  const lawFile = path.join(DIRS.codePriors, `${lang.replace(/_/g, "-")}-language-law-prior-v1.json`);
  if (exists(lawFile)) {
    const d = readJson(lawFile); inputs.push({ path: lawFile, sha256: sha256File(lawFile), role: "prior" });
    putH("h02", (d.lexical?.softKeywords ?? []).length, (d.lexical?.softKeywords ?? []).length, "prior:code-law", `the language's own engine (${d.giver?.resource ?? "law prior"})`);
    if (Array.isArray(d.grammar?.precedence)) putH("h05", d.grammar.precedence.length, d.grammar.precedence.length, "prior:code-law", `${d.grammar.precedenceGiver ?? "received table"}`);
  } else gaps.push({ feature: "h02,h05", reason: "no_law_prior_for_language", denominator: { have: 0, need: 1 } });
  for (const id of ["h02", "h05"]) if (!cells[id] && exists(lawFile)) gaps.push({ feature: id, reason: "not_in_law_prior", denominator: { have: 0, need: 1 } });
  // I/B/C/D: the corpus
  const ordered = [...files].sort((a, b) => (a.sha256 < b.sha256 ? -1 : 1)); ST.shuffleInPlace(ordered, createSeededRng({ seed: 0, system: key, purpose: "pool" }));
  let ex; try { ex = extractPool(lang, ordered, POOL_CODE); } catch (e) { gaps.push({ feature: "b,c,d,i", reason: `extraction_failed:${String(e.message).slice(0, 100)}`, denominator: { have: 0, need: 1 } }); return mk({ completeness: Object.keys(cells).length / 8 }); }
  if (ex.failures) gaps.push({ feature: "files", reason: "parse_or_decode_failures", denominator: { have: ex.pool.length, need: ex.pool.length + ex.failures } });
  const pool = ex.pool.map(({ f, r }) => { const text = fs.readFileSync(f.path, "utf8"); return { f, r, text, vec: fileVector(r, text), ls: null }; });
  for (const e of pool) inputs.push({ path: e.f.path, sha256: e.f.sha256, role: "train" });
  const half = PROVISIONAL.N_CODE / 2;
  const draws = SEEDS.map((seed) => {
    const idx = pool.map((_, i) => i); ST.shuffleInPlace(idx, createSeededRng({ seed, system: key, purpose: "sample" }));
    const A = []; const B = []; let ca = 0; let cb = 0;
    for (const j of idx) { const lv = pool[j].r.leaves; if (ca < half) { A.push(j); ca += lv; } else if (cb < half) { B.push(j); cb += lv; } else break; }
    return { A, B, U: [...A, ...B], ok: ca >= half && cb >= half };
  });
  if (!draws.every((d) => d.ok)) { gaps.push({ feature: "b,c,d,i", reason: "below_budget", denominator: { have: ex.leaves, need: PROVISIONAL.N_CODE } }); return mk({ completeness: Object.keys(cells).length / 8, files: pool.length }); }
  const Nid = PROVISIONAL.N_ID; const h04 = inv?.h04 ?? null;
  const perSeed = draws.map((d) => ({ U: evalCodeSample(pool, d.U, Nid), A: evalCodeSample(pool, d.A, Nid / 2), B: evalCodeSample(pool, d.B, Nid / 2) }));
  for (const p of perSeed) for (const h of ["U", "A", "B"]) { const c7 = p[h].i07; p[h].i07 = h04 ? { v: c7.v / h04, n: h04 } : { v: null, n: 0 }; }
  const allIds = []; for (const e of pool) for (const w of e.r.ids) allIds.push(w);
  const tab = new Map(); const idStream = Int32Array.from(allIds.map((w) => { let id = tab.get(w); if (id === undefined) { id = tab.size; tab.set(w, id); } return id; }));
  const seq = sequenceCells(idStream, Nid, key);
  if (seq) perSeed.forEach((p, i) => { const w = seq.per[i];
    p.U.d07 = { v: w.U.B, n: Nid }; p.U.d08 = { v: w.U.H, n: Nid }; p.U.d07x = { v: w.U.B == null ? null : w.U.B - seq.shuffleB, n: Nid }; p.U.d08x = { v: w.U.H == null ? null : w.U.H - seq.shuffleH, n: Nid };
    for (const h of ["A", "B"]) { p[h].d07 = { v: w[h].B }; p[h].d08 = { v: w[h].H }; p[h].d07x = { v: w[h].B == null ? null : w[h].B - seq.shuffleB }; p[h].d08x = { v: w[h].H == null ? null : w[h].H - seq.shuffleH }; } });
  // file-cluster bootstrap on the seed-1 union
  const rng = createSeededRng({ seed: SEED, system: key, purpose: "bootstrap" }); const U1 = draws[0].U; const out = Object.fromEntries(CODE_BOOT_IDS.map((i) => [i, []])); const Vb = new Float64Array(CK);
  for (let b = 0; b < PROVISIONAL.BOOT_B; b++) { Vb.fill(0); for (let s = 0; s < U1.length; s++) { const v = pool[U1[Math.floor(rng() * U1.length)]].vec; for (let k = 0; k < CK; k++) Vb[k] += v[k]; } const cc = codeAdditiveCells(Vb); for (const id of CODE_BOOT_IDS) if (cc[id]?.v != null) out[id].push(cc[id].v); }
  const bootCI = Object.fromEntries(CODE_BOOT_IDS.map((id) => [id, ST.percentileCI(out[id])]));
  const asm = assembleCells({ stem: lang, dir: lang, treebank: null, hasDev: false, twinOf: null }, perSeed, seq, bootCI, {}, "code");
  Object.assign(cells, asm.cells); gaps.push(...asm.gaps);
  for (const id of ["b11"]) if (!cells[id] && !gaps.some((g) => g.feature === id)) gaps.push({ feature: id, reason: "no_clause_relation_in_an_ast", denominator: { have: 0, need: 1 } });
  const nExpected = Object.values(FEATURE_REGISTRY).filter((r) => r.kinds.includes("code") && r.group !== "T").length;
  return mk({ completeness: Object.keys(cells).length / nExpected, files: pool.length, leaves: ex.leaves });
}

// ═══ notation (no corpus on disk: a typed gap profile, never a feature vector) ═══════════════════════════════════
export function buildNotationProfile(sampleId, { dir = path.join(DIRS.notation, "corpus") } = {}) {
  const key = systemKey("notation", sampleId); const have = exists(path.join(dir, sampleId));
  const gaps = [{ feature: "all", reason: have ? "notation_corpus_format_not_yet_defined" : "no_notation_corpus_on_disk", denominator: { have: have ? 1 : 0, need: 100000 } }];
  const labels = { stem: sampleId, family: "notation", branch: "notation", lineage: "notation", macro: "notation", script: null, scriptShares: null, typedBy: "unlabelled", giver: "none", twinOf: null, treebank: null, macroarea: null };
  return makeProfileObject({ system: key, kind: "notation", id: `${key}@none`, inputs: [], labels, budget: { N: 100000, halves: 2, seeds: SEEDS, unit: "unit" }, cells: {}, targets: {}, gaps, extra: { completeness: 0 } });
}

// ═══ the public interface ══════════════════════════════════════════════════════════════════════════════════════════
const cachePathFor = (key) => path.join(DIRS.cache, `${key.replace(":", "__")}.json`);
function cacheKeyFor(row) {
  const parts = { prereg: PREREG_SHA, src: SRC_SHA, v: PROFILES_VERSION, N: N_NL, kind: row.kind };
  if (row.kind === "nl") { parts.train = row.trainSha256 ?? null; parts.dev = row.devSha256 ?? null; const pp = priorPath("pos", row.stem); parts.pos = exists(pp) ? sha256File(pp) : null; }
  else if (row.kind === "code") { parts.manifest = row.manifestSha256; const lp = path.join(DIRS.codePriors, `${row.stem.replace(/_/g, "-")}-language-law-prior-v1.json`); parts.law = exists(lp) ? sha256File(lp) : null; parts.py = pyAvailable(); parts.ast = sha256File(path.join(HERE, "ast_extract.py")); }
  return sha256Str(canon(parts));
}
function refreshTargets(profile, stem) { // targets are read fresh (cards are in flux); features are cached
  const tg = readTargets(stem);
  const gaps = profile.gaps.filter((g) => !/^t0/.test(g.feature)).concat(tg.gaps);
  const inputs = profile.inputs.filter((i) => !(i.role === "card" || (i.role === "prior" && /(role-config|frame)-/.test(i.path)))).concat(tg.inputs);
  const eoT = assertEoFree({ cells: tg.targets });
  if (!eoT.ok) throw new Error(`EO contamination in targets of ${profile.system}`);
  return { ...profile, targets: tg.targets, gaps, inputs, eoFree: profile.eoFree && eoT.ok, priorRoleConfigSource: tg.roleConfigSource };
}
/** The systems with data now. Each: { system, kind, family, lineage, macro, tiers, ... } (a manifest row). */
export async function listSystems(opts = {}) {
  const m = discoverSystems({ refreshFirstSeen: false }); saveDigests();
  return opts.full ? m : m.systems;
}
/** One SystemProfile@1 (cached by input hashes; targets re-read each call). systemId: "eng" | "nl:eng" | "code:python". */
export async function profileOf(systemId, { refresh = false, cache = true } = {}) {
  const key = normaliseKey(systemId);
  if (key.startsWith("notation:")) return buildNotationProfile(key.slice(9));
  const row = discoverSystems({ refreshFirstSeen: false }).systems.find((r) => r.system === key); saveDigests();
  if (!row) throw new Error(`no data for system ${key}`);
  const file = cachePathFor(key); const ck = cacheKeyFor(row);
  if (cache && !refresh && exists(file)) {
    try { const c = readJson(file); if (c.cacheKey === ck && c.profile) return row.kind === "nl" ? refreshTargets(c.profile, row.stem) : c.profile; } catch { /* rebuild */ }
  }
  const profile = row.kind === "nl" ? buildNlProfile(row) : buildCodeProfile(row.stem);
  if (cache) { fs.mkdirSync(DIRS.cache, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ cacheKey: ck, profile })); }
  return profile;
}
/** Write profiles to outDir, one JSON per system; returns the paths. */
export function writeProfiles(outDir, profiles) {
  fs.mkdirSync(outDir, { recursive: true });
  return profiles.map((p) => { const f = path.join(outDir, `${p.system.replace(":", "__")}.json`); fs.writeFileSync(f, JSON.stringify(p)); return f; });
}
/**
 * Load profiles; re-runs assertEoFree and the type check on every one and throws on a contaminated or malformed profile.
 * Looks in `outDir`, then `outDir/profiles`, then the profile cache, and returns the first non-empty set (one profile per system).
 */
export function loadProfiles(outDir = DIRS.cache) {
  const dirs = [outDir, path.join(outDir, "profiles"), DIRS.cache].filter((d, i, a) => d && a.indexOf(d) === i && exists(d));
  for (const dir of dirs) {
    const files = fs.readdirSync(dir).filter((x) => /^(nl|code|notation)__.*\.json$/.test(x)).sort();
    if (!files.length) continue;
    const out = [];
    for (const f of files) {
      const raw = readJson(path.join(dir, f)); const p = raw.profile ?? raw;
      const eo = assertEoFree(p); if (!eo.ok) throw new Error(`${f}: EO contamination ${JSON.stringify(eo.offenders)}`);
      const errs = profileTypeError(p); if (errs.length) throw new Error(`${f}: malformed cells ${errs.slice(0, 5).join(",")}`);
      out.push(p);
    }
    return out;
  }
  return [];
}
export function writeManifest(manifest = discoverSystems()) {
  fs.mkdirSync(DIRS.out, { recursive: true }); const f = path.join(DIRS.out, "manifest.json");
  fs.writeFileSync(f, JSON.stringify(manifest, null, 1)); saveDigests(); return f;
}

// ═══ exposed for the smoke gates and the tests ═════════════════════════════════════════════════════════════════
export { sentenceStats, IDX, K as STAT_LEN, loadCorpus, sumStats, fileOrderIds, lexicalCells, sequenceCells as sequenceCellsOf, windowStats, UPOS_LIST, UPOS_ID, CLOSED_ID, OPEN_ID };
export const statsOfSentences = (sentences) => sentences.map((s) => sentenceStats(s));

/** Reorder a sentence's words: newOrder[k] = old 0-based index of the word placed at new position k. Heads and labels travel with the words. */
export function reorderSentence(s, newOrder) {
  const n = s.n; const pos = new Int32Array(n); newOrder.forEach((old, nw) => { pos[old] = nw; });
  const pick = (a) => newOrder.map((o) => a[o]);
  return { n, form: pick(s.form), lower: pick(s.lower), lemma: pick(s.lemma), upos: Uint8Array.from(newOrder, (o) => s.upos[o]),
    head: Int32Array.from(newOrder, (o) => (s.head[o] > 0 && s.head[o] <= n ? pos[s.head[o] - 1] + 1 : s.head[o])), depb: pick(s.depb),
    flags: Uint8Array.from(newOrder, (o) => s.flags[o]), caseId: Uint16Array.from(newOrder, (o) => s.caseId[o]), nfeat: Uint8Array.from(newOrder, (o) => s.nfeat[o]),
    text: null, nmwt: 0, units: pick(s.form) };
}
/** Deterministic re-linearisation of the dependency tree: "final" (all dependents before their head) or "initial" (all after). Invalid trees are returned unchanged. */
export function lineariseSentence(s, mode) {
  const n = s.n; const ok = s.head.every((h) => h >= 0 && h <= n) && s.head.some((h) => h === 0) && ST.depthsOf(s.head);
  if (!ok) return s;
  const kids = Array.from({ length: n }, () => []); const roots = [];
  for (let i = 0; i < n; i++) { if (s.head[i] === 0) roots.push(i); else kids[s.head[i] - 1].push(i); }
  const out = []; const seen = new Set();
  const walk = (i) => { if (seen.has(i)) return; seen.add(i); if (mode === "final") { for (const k of kids[i]) walk(k); out.push(i); } else { out.push(i); for (const k of kids[i]) walk(k); } };
  for (const r of roots) walk(r);
  for (let i = 0; i < n; i++) if (!seen.has(i)) out.push(i);
  return reorderSentence(s, out);
}
/** Seeded within-sentence word-order shuffle (heads and labels travel with the words). */
export function shuffleSentenceWords(s, rng) { const order = Array.from({ length: s.n }, (_, i) => i); ST.shuffleInPlace(order, rng); return reorderSentence(s, order); }

/** A planted corpus of iid words with Zipf rank-frequency exponent `s` over `V` ranks (power check P3). */
export function plantedZipfWords(N, s, V, seed) {
  const rng = createSeededRng({ seed, purpose: "planted-zipf" }); const cdf = new Float64Array(V); let acc = 0;
  for (let r = 1; r <= V; r++) { acc += r ** -s; cdf[r - 1] = acc; }
  const out = [];
  for (let i = 0; i < N; i++) { const u = rng() * acc; let lo = 0; let hi = V - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] >= u) hi = m; else lo = m + 1; } out.push(`w${lo}`); }
  return out;
}
/**
 * Planted sequence of type ids over `types` types. persistent=false: iid draws from a fixed Zipf-like law (exchangeable).
 * persistent=true: the type probabilities are modulated by multi-scale AR(1) processes (a doubly stochastic, long-memory
 * process: bursty and persistent by construction), power check P4.
 */
export function plantedSeries(N, types, persistent, seed) {
  const rng = createSeededRng({ seed, purpose: "planted-series" }); const base = Array.from({ length: types }, (_, k) => 1 / (k + 1));
  const phis = [0.9, 0.99, 0.999]; const state = Array.from({ length: types }, () => phis.map(() => 0)); const out = new Int32Array(N);
  const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rng(); return (u - 3) / Math.sqrt(0.5); };
  const w = new Float64Array(types);
  for (let t = 0; t < N; t++) {
    let tot = 0;
    for (let k = 0; k < types; k++) {
      let g = 0;
      if (persistent) for (let j = 0; j < phis.length; j++) { state[k][j] = phis[j] * state[k][j] + Math.sqrt(1 - phis[j] ** 2) * gauss(); g += state[k][j]; }
      w[k] = base[k] * Math.exp(persistent ? 0.9 * g : 0); tot += w[k];
    }
    let u = rng() * tot; let k = 0; while (k < types - 1 && u > w[k]) { u -= w[k]; k += 1; } out[t] = k;
  }
  return out;
}

/** The label a leave-family-out split blocks on: "branch" (blocking stratum), "lineage" (independence unit), "macro" (Indo-European vs rest / code), "script". */
export function familyOf(profile, by = "branch") {
  const l = profile.labels ?? {};
  return by === "branch" ? l.family : by === "lineage" ? l.lineage : by === "macro" ? l.macro : by === "script" ? l.script : by === "codeFamily" ? (profile.kind === "code" ? l.family : null) : (() => { throw new Error(`unknown family key ${by}`); })();
}

// ═══ the pre-registered planted checks (P3, P3o, P3r, N3, P4): run on demand, cached by source hash ══════════════
// the cache key tracks the header digest (definitions), the numerics file and CODE_REV; bump CODE_REV whenever a cell's VALUE could change without a header change
export const CODE_REV = "r2";
const SRC_SHA = sha256Str(`${CODE_REV}|` + fs.readFileSync(path.join(HERE, "profile-stats.mjs")));
export function powerChecks({ refresh = false } = {}) {
  const f = path.join(DIRS.cache, "power-checks.json");
  if (!refresh && exists(f)) { try { const c = readJson(f); if (c.srcSha === SRC_SHA) return c.checks; } catch { /* recompute */ } }
  const N = PROVISIONAL.N; const checks = {};
  const read = (s, seed) => { const w = plantedZipfWords(N, s, 30000, seed); return recurrenceCells(w, N, PROVISIONAL.HEAPS_NL); };
  const p3 = [3, 4, 5].map((seed) => read(1.0, seed));
  checks.P3 = { rule: "planted Zipf 1.0, N=16000, seeds 3,4,5: |d01 - 1.0| <= 0.15 for all", readings: p3.map((c) => c.d01.v), pass: p3.every((c) => c.d01.v != null && Math.abs(c.d01.v - 1.0) <= 0.15) };
  checks.P3o = { rule: "same corpora: |d01o - 1.0| <= 0.15 for all (written after seeing 0.931 and 0.940: not independent)", readings: p3.map((c) => c.d01o.v), pass: p3.every((c) => c.d01o.v != null && Math.abs(c.d01o.v - 1.0) <= 0.15) };
  const lo = read(0.8, 3); const hi = read(1.2, 3);
  checks.P3r = { rule: "planted 0.8 < 1.0 < 1.2 are read in that order by each estimator (seed 3)", d01: [lo.d01.v, p3[0].d01.v, hi.d01.v], d01o: [lo.d01o.v, p3[0].d01o.v, hi.d01o.v],
    pass: lo.d01.v < p3[0].d01.v && p3[0].d01.v < hi.d01.v && lo.d01o.v < p3[0].d01o.v && p3[0].d01o.v < hi.d01o.v };
  const ex = plantedSeries(N, 60, false, 5); const pe = sequenceCells(ex, N, "planted-exchangeable", { shuffles: 10 }); const we = windowStats(ex, 50, 5);
  checks.N3 = { rule: "planted exchangeable: |d07x| <= 0.05 and |d08 - 0.5| <= 0.06", d07x: we.B - pe.shuffleB, d08: we.H, pass: Math.abs(we.B - pe.shuffleB) <= 0.05 && Math.abs(we.H - 0.5) <= 0.06 };
  const ps = plantedSeries(N, 60, true, 7); const pp = sequenceCells(ps, N, "planted-persistent", { shuffles: 10 }); const wp = windowStats(ps, 50, 5);
  checks.P4 = { rule: "planted persistent: d07x >= 0.10 and d08 >= 0.55", d07x: wp.B - pp.shuffleB, d08: wp.H, shuffleH: pp.shuffleH, pass: wp.B - pp.shuffleB >= 0.10 && wp.H >= 0.55 };
  try { fs.mkdirSync(DIRS.cache, { recursive: true }); fs.writeFileSync(f, JSON.stringify({ srcSha: SRC_SHA, checks })); } catch { /* cache only */ }
  return checks;
}
/** cell id -> { check, pass, status } for the cells whose power checks are pre-registered. */
export function cellStatus() {
  const c = powerChecks(); const st = (check, pass) => ({ check, pass, status: pass ? "OK" : "UNDERPOWERED" });
  return { d01: st("P3", c.P3.pass), d01o: st("P3o+P3r", c.P3o.pass && c.P3r.pass), d07: st("N3+P4", c.N3.pass && c.P4.pass), d07x: st("N3+P4", c.N3.pass && c.P4.pass), d08: st("N3+P4", c.N3.pass && c.P4.pass), d08x: st("N3+P4", c.N3.pass && c.P4.pass) };
}

// ═══ CLI:  node eval/barker/profiles.mjs manifest | list | build <system> [...] ═══════════════════════════════════
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "manifest") { const f = writeManifest(); const m = JSON.parse(fs.readFileSync(f, "utf8")); console.log(`manifest ${f}: ${m.systems.length} systems (${m.systems.filter((s) => s.kind === "nl").length} nl, ${m.systems.filter((s) => s.kind === "code").length} code), ${m.gaps.length} gaps`); }
  else if (cmd === "export") { const ps = loadProfiles(DIRS.cache); const fs_ = writeProfiles(path.join(DIRS.out, "profiles"), ps); console.log(`exported ${fs_.length} profiles to ${path.join(DIRS.out, "profiles")}`); }
  else if (cmd === "list") { for (const s of await listSystems()) console.log([s.system, s.kind, s.family, s.lineage, s.nonPunctWords ?? s.trainFiles ?? "-"].join("\t")); }
  else if (cmd === "build") {
    for (const id of rest) { const t = Date.now(); const p = await profileOf(id, { refresh: process.env.REFRESH === "1" }); console.log(`${p.system}\tcells=${Object.keys(p.cells).length}\tgaps=${p.gaps.length}\tcompleteness=${(p.completeness ?? 0).toFixed(2)}\teoFree=${p.eoFree}\t${((Date.now() - t) / 1000).toFixed(1)}s\t${p.contentHash.slice(0, 19)}`); }
    saveDigests();
  } else { console.log("usage: profiles.mjs manifest | list | build <system> [...] | export"); process.exitCode = 2; }
}
