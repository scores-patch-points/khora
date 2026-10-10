// eval/law/impact.mjs — HOLOGRAPHIC IMPACT BY PERTURBATION, READ AT THE SLOT (not at the span).
// Design of record: docs/LAW-FALSIFICATION.md, revision 2 (sha256 7911b687ef46c1e3815fbac049347ba38fc90cd9b9efe8d016d0902698a8ded2),
// sections 1.2, 1.10, 2.5 (R1: slot ablation), 2.6b/2.6c (reader and impact horizons), T5, T10, G0 cells 8 and 9, G3 (impact
// causality), Appendix A (IMPACT-PLANT, IMPACT-SUFF, IMPACT-LOSSY, LONGRANGE, SLOT-ONLY, SPAN-ONLY, IMPACT-HORIZON).
// Where this header and that document disagree the document wins and this file is the bug. In the design's module table this is
// the file named `slots.mjs` (plus `impactWindows` / `impactHorizonTokens` of `window.mjs`); it was commissioned as `impact.mjs`
// and exports the design's names (READERS, slotStructure, ablate, alignSlots, slotDeltas, slotSignature, atmosphere, spanSignature,
// shamAblation, impactTypes, assignType, companyStructureImpact, nullImpactShare, slotRoleVariant, impactWindows, impactHorizonTokens).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// PRE-REGISTRATION (READING-POLICY II.5, II.23, II.4). Written BEFORE any code below and BEFORE any run of it (the first thing
// that exists of this file is this header; `headerSha256()` hashes it, from the first line to the END marker, and the hash taken
// at the moment of writing is reported with the module). Nothing in this header is edited after the first run; a defect found
// later is fixed in the code under a new code hash and reported next to the original smoke, never in place of it.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
//
// 0. WHAT THIS MODULE IS, AND IS NOT.
//  It is the INSTRUMENT of claim C2 ("a token's role is determined by the TYPE OF IMPACT it has on the holograph"), operationalised
//  as the user's refinement R1 binds it: "Ablate the tokens and see how they impact things, look at the slot not the spans."
//  For a sampled token t it rebuilds khora's own reading with t ABLATED and compares, SLOT BY SLOT, the reading with t present
//  against the reading with t gone. Its output is, per token: the typed slot deltas, the IMPACT-SLOT signature (the distribution
//  of those deltas), the atmosphere block (memory/activation.js), the span/string RIVAL signature (IMPACT-SPAN, section 2.5.4 of
//  the design), the company-structure diagnostic (IMPACT-C), the extent of the effect in tokens (for H_imp), and a DATA-DERIVED
//  TYPE VOCABULARY over the signatures (no impact class is declared by hand). It computes NO verdict, NO role-prediction score
//  and NO learner: G, S, NMI against role, the equivalence tests and every pass rule of T5 and T10 live in the design and in the
//  scorer, not here. It contains no model and no LLM call (khora is a ZERO-MODEL reader). It never reads a gold label as a
//  feature: the only gold it may be handed is a parallel array used to SELECT and STRATIFY which tokens are evaluated, and to
//  stratify a report (rule 6); a static scan of this file (tests/law-impact.test.js) asserts that no feature function names it.
//
// 1. THE READERS (2.5.1): three real shipped readers, PRIOR-FREE (posPrior = null, framePrior = null, functionWords = null, no
//  ear). Forbidden in every primary arm (contamination ledger 2.7): priors/pos-*, frame-*, role-config-*, proclitics, morph*;
//  language-grammar.js, heard-nominals.js, reader-bundle.js, grain-typing::makeGrainTyper, the positional slot organ with a
//  RoleConfig. This file imports none of them (a static scan asserts it). The contaminated variants (a received POS prior; the
//  positional slot organ; a nominal source built from heard-nominals/listening-cast; an ear built from a prior) exist ONLY as
//  INJECTED hooks (`opts.referentSource`, `opts.ear`, `slotRoleVariant(extract)`): the caller supplies the function, the result is
//  stamped `contaminated: true` in its provenance, and by the design it can carry no verdict.
//  R-A  memory/activation.js::readForward, one frame per sentence, text frames (its own tokenizer): codeSize, traceSize,
//       activation, recalled, novelty, reach per frame. Atmosphere block (ATM). reach null is a gap, not a zero.
//  R-B  organs/heard-surfaces.js logic (heardSurfaces with posPrior = null): floors minMentions 2 (ARRIVALS_FLOOR), minShare 0.5
//       (GRAMMAR_MIN_SHARE), minMembers 2, over the window's sentences; then adapters/text/surfaces.js::discoverReferents over the
//       heard surfaces (the referent index; an entry is a set of surfaces; a being is born at first admission). The shipped nullArm
//       is SPENT ONCE PER WINDOW SNAPSHOT (NULL_DRAWS shuffles, alpha NULL_ALPHA, a seed passed by the caller) and its per-word
//       ceilings are HELD FIXED across the present and the ablated reading, so a delta is never an artifact of a re-drawn null.
//       Because the shipped function computes its ceiling from the sentences it is handed, the ceiling-held-fixed form is a
//       replica of discoverCompanyKinds' selection built on its exported contextVectors; a conformance test pins the replica to
//       heardSurfaces(nullArm) byte for byte (same sentences, same seed). R-B1 sets minMentions 1: a labelled floor-1
//       counterfactual for the single-mention rule (1.5), never the primary.
//  R-C  adapters/text/relations-gfp.js::extractGfpRelations(text, {posPrior: null, functionWords: null, clauseAware: true}).
//       One call per SENTENCE with the figure set of the WHOLE WINDOW (figures = tokens recurring at least minRec = 2 times in the
//       window, length >= wordFloor(token, 3), the extractor's own self-discovery rule, replicated), so that a frame is a hard
//       boundary (no arrangement crosses a sentence) and the slot coordinate (e, j) is exact. This is the design's call with
//       sentence boundaries made explicit; it is a disclosed departure in form, not in rule. Edges are {end1, label, end2}; the
//       reader's `cell`, `grain`, `polarity` fields are DROPPED (EO structures are never inputs) and its byte `offset` is used
//       only inside this module to locate which tokens an edge covers and, separately, as the span rival's coordinate; it is
//       never a unit of comparison between the two readings of the slot structure.
//  Inputs are the UNIT STREAM of the window: per sentence a list of identities (NFC, lowercased, PUNCT removed; any whitespace
//  inside an identity is replaced by "_") joined by single spaces.
//
// 2. THE PERTURBATION (2.5.2). Window of sentences [s - M, s + F] of the token's stream (clipped to the stream; a sentence that
//  becomes empty stays as an empty frame, so sentence offsets are stable). X0 = the window as is. Ablation of the token at
//  (s, i): A-DEL (primary) deletes it (adjacency repaired: the repo's perturbation family, one relation destroyed); A-MASK replaces
//  it by MASK_TOKEN (a fixed identity not in any language: the slot stays occupied, the identity goes); A-FILL replaces it by the
//  neutral filler of its slot class supplied by the caller (`opts.fill`; the most frequent identity of its occurrence-level induced
//  class lives in induce.mjs, which this file does not import; without `fill`, A-FILL is the typed gap `no_induced_class`).
//  FRAME-CAUSAL ARM: F = 0 (the self frame and the preceding frames only). It is the only impact arm that may enter a claim about
//  reading; replacing every sentence after s by arbitrary text leaves its signature hash-identical (tested). F > 0 is
//  non-causal by definition and is labelled so wherever it is reported.
//
// 3. THE SLOT STRUCTURE AND THE TYPED DELTAS (2.5.1, 2.5.2). A SLOT is a structural position a token fills:
//    rel-end1 (the subject slot of the prior-free reading; the repo never writes subject or object onto a record, P72/P76),
//    rel-label, rel-end2: coordinate (e, j, field), e the sentence offset in the window, j the ordinal of the edge among the edges of
//    sentence e in reading order; filler = (figure string, the surface-set key of the referent entry the string resolves to, or null);
//    ref-entry: coordinate (k), k the ordinal of the entry by first admission in reading order; filler = (surface set, mention count).
//  A token FILLS a slot if it lies in a figure string at an end, in a connector, or is a mention of a surface of an admitted entry.
//  A token that fills no slot carries the flag no-slot.
//  ALIGNMENT BY STRUCTURE, NEVER BY OFFSET. Per sentence, the edges of X0 and X1 are aligned by a deterministic order-preserving
//  longest-common-subsequence over edges (two edges match when they share at least one equal field among end1, label, end2; earlier
//  ordinals win ties); then, among the leftover edges of the same sentence, a second pass pairs an X0 edge with an X1 edge when an end
//  filler of one sits in the other end of the other (the REBOUND pass). Entries are aligned by shared surface (greedy, earlier first).
//  An unmatched X0 slot is EMPTIED; an unmatched X1 slot is BORN. The seven TYPES, one per slot, with the precedence
//    emptied > retyped > rebound > refilled > shifted > unchanged   (born is assigned to slots that exist only in X1):
//    emptied   the slot has no filler in X1 (its edge or entry was lost);
//    retyped   a LABEL slot whose filler changed while both ends of its edge are unchanged;
//    rebound   an END filler now sits in the other end of the edge (swap), or in another edge of the same sentence (pass 2);
//    refilled  filled in both by a different filler (a different string, a different resolved entry, a different surface set or mention count);
//    shifted   the same filler, but its ordinal j (or k) changed: the slot moved inside the slot structure;
//    born      a slot present in X1 and not in X0;
//    unchanged none of the above.
//  THE SLOT GRAPH and the radius. Nodes are slots; two slots are adjacent when they are fields of one relation, when they are
//  the same field of edges j and j+1 of one sentence or end2(j) and end1(j+1), or when their fillers resolve to the same referent
//  key (the entry key if the string resolves to an entry, else the figure string) anywhere in the window; an entry slot is adjacent
//  to every end slot whose filler resolves to that entry. The radius r of a slot is its graph distance (BFS, X0 graph) from the slot(s)
//  t filled in X0; a BORN slot takes 1 + the least radius of an X0 slot it is adjacent to through the X1 graph via the matched
//  slots. BANDS: band 0 = r = 0 (the slot of t); band 1 = r = 1 (the other fields of the same relation, the entry's linked slots,
//  the adjacent ordinals); band 2 = 2 <= r <= w. w is the SLOT HORIZON (measured by dmdWindow, ladder {1, 2, 4, 8, whole}; default
//  whole = Infinity here): slots beyond a finite w are excluded; slots unreachable from t (a different component, or t has no slot)
//  count in band 2 only when w is whole (they are the non-local, company-mediated effects: a token that fills no slot but whose
//  removal re-binds slots elsewhere).
//
// 4. THE SIGNATURES.
//  IMPACT-SLOT (85 components, order fixed): for family f in {rel-end1, rel-label, rel-end2, ref-entry}, band b in {0, 1, 2}, type y in
//  {emptied, retyped, rebound, refilled, shifted, born}: the count of slots of that type in that cell (index ((3 f + b) 6 + y) for
//  72 components); then the number of slots considered in each family-band cell (12 components); then the no-slot flag (1). Every
//  integer component x is transformed sign(x) log2(1 + |x|). A difference below 1e-9 in a real component is zero (the readers are
//  deterministic, so any larger difference is real; whether it MAKES a difference is decided by the types and the bound, not by a
//  tolerance). THE NULL TYPE is the signature whose 72 delta components are all exactly zero (the token made no difference within
//  w; with or without the no-slot flag). IMPACT-SLOT+ATM appends the 19 atmosphere components (104).
//  ATMOSPHERE (19) from readForward over X0 and X1: for each of the six observables (codeSize, traceSize, activation, recalled,
//  novelty, reach): the self-frame difference, the spread (sum over the other frames of |difference|) and the extent (the largest
//  frame distance from the self frame of a frame whose observable changed); then one flag: the self frame's reach changed nullness.
//  A null (reach, novelty) contributes difference 0 and the flag, never a zero standing in for a gap. Same transform.
//  IMPACT-SPAN (32 components), THE RIVAL (2.5.4): the same 19 atmosphere components; R-B: births, losses, kind-flips (surfaces present
//  in both whose entry's surface set differs), mention shift (sum of |change| of mentions of surfaces present in both), tIsBeing0 (5);
//  R-C by STRING KEY (end1, label, end2) and in the byte coordinate of the window text (sentences joined by newline): lost, born,
//  changed-ends (a lost edge with a born edge of the same label), changed-label (a lost edge with a born edge of the same ends and a
//  different label), lost edges in which t's identity stood as end1, as a token of the label, as end2 (7); and OFFSETS-MOVED, the
//  number of edges, matched by string key, whose byte offset moved (1). It is the nuisance coordinate included on purpose.
//  IMPACT-C (8, diagnostic, built to be reducible to company): the change of the descriptors of the left and right neighbour of t
//  (L2), of t's own type descriptor, flags for whether either neighbour's class changes, the class-bigram surprisal of the bigrams
//  destroyed and created, and the net number of bigrams. The company model is INJECTED (`opts.companyModel`, the induction of
//  induce.mjs); the default is a window-local identity-grain model, labelled as such.
//  EXTENT: for each non-unchanged slot the token distance from t (a token coordinate over the window, a frame boundary counts the tokens
//  it skips); H_imp of a token = the largest such distance (tokens), reported with the frame extent; the impact horizon is measured
//  in tokens in the SAME ladder as the company horizon h* (design 2.6c), so no sentence-to-token conversion exists.
//
// 5. THE DERIVED TYPE VOCABULARY (2.5.3). Pool the signatures of the sample. NULL type = id 0. Among the rest, spherical k-means
//  (k-means++ seeding, KM_RESTARTS restarts, KM_ITERS iterations at most) with K chosen by split-half stability against the shuffle null:
//  for each K in the ladder {2, 4, 8, 16, 32} with K <= (non-null count)/4, fit on two disjoint random halves, label the whole pool by
//  both, take the adjusted Rand index; the OBSERVED statistic is the median over STAB_PAIRS = 20 splits; the NULL is the 95th percentile
//  of the same statistic over STAB_PAIRS splits of the pool with each component permuted independently across tokens (marginals
//  kept, structure destroyed: the analogue of the within-sentence shuffle). K* = the largest K whose observed statistic exceeds its
//  null quantile; none -> K* = 1 and the typed gap `no_stable_k`. Each type is NAMED by its two largest mean components (as
//  discoverCompanyKinds names kinds by signature). assignType(sig, vocab) = 0 for the null signature, else 1 + the nearest centroid
//  by cosine. Across families the vocabulary fitted on training families is applied to a held-out language by assignType alone (no
//  labels). The ONE-HOT of the type is the IMPACT-SLOT-TYPE arm; the PCA(d_imp) of the signature (d_imp = min(24, rank), fitted on the
//  train sample, unsupervised) is the IMPACT-SLOT arm; the same two for IMPACT-SPAN (capacity equality, 2.5.3).
//
// 6. SAMPLING AND COST (2.5.6). N_imp = 2,000 evaluated tokens per language per split, uniform at random (seed = seedFor(stem, split,
//  purpose)), plus a hapax oversample of the test split up to 500, with inverse-inclusion weights for pooled statistics. Evaluated
//  tokens are those whose gold UPOS is in UPOS14 (a SELECTION by gold, permitted by rule 6; never a feature). A `stratify: "role"` mode
//  (equal quota per role present, inverse-inclusion weights) exists for smoke and for the per-class null-impact audit. Hapax (H1:
//  type absent from the exposure and occurring once in the stream) is a named stratum; recurrence is never an existence criterion
//  (user standing rule): a token is evaluated whether or not its type recurs, and its fold exists at its single point. Tokens of one
//  sentence share one snapshot (one X0, one fixed null, one atmosphere reading): cost is reported in `cost` (readings, snapshots,
//  seconds). A DETERMINISM CHECK (`determinismCheck`) recomputes the signatures twice, once in a shuffled evaluation order, and
//  requires byte-identical hashes.
//
// 7. HORIZON HELPERS (2.6b, 2.6c). `impactWindows` measures M* (candidates {0, 8, 16, 32, 64, 128, 256, 512} preceding frames, capped
//  by the stream) and F* (candidates {0, 1, 2, 4, 8, 16, 32} following frames, rung 0 = the self frame only) with
//  kernel/activation.js::dmdWindow; the conclusion is the discrete IMPACT-SLOT type (including null) of each sampled token at that
//  depth; `equal` is agreement on at least 1 - u_imp of the tokens, u_imp the disagreement of two vocabularies fitted on two seeded
//  resamplings of the sample (labels matched greedily by overlap); `non_monotone` and `reach_exceeds_candidates` are typed gaps.
//  `impactHorizonTokens` measures H_imp in the token ladder {1, 2, 4, 8, 16, whole} with dmdWindow, `restrict` = the deltas within
//  `depth` tokens of t. They are the instrument for T6d; this file draws no conclusion from them.
//
// 8. NULLS AND CONTROLS BUILT TO FAIL (each an assertion in tests/law-impact.test.js; a planted toy has known answers).
//  N1 SHAM ABLATION: a position that is not a token (an extra whitespace inside the joined text) must give the NULL TYPE in 100 percent of
//     cases; otherwise the pipeline manufactures impact. Built to fail: the same sham moves the byte offsets of every later edge, so the
//     IMPACT-SPAN offsets-moved component is NON-ZERO on it while every slot delta is `unchanged` (the offset-invariance control: slot
//     comparison does not move, the span coordinate does; if both are zero the case is not scored).
//  N2 PLANTED IMPACT-PLANT (Appendix A): figures N (sentence-initial recurring names: entries), figures B (recurring, mid-sentence),
//     connectors V (hapax between two figures), fillers F (a short recurring token, no slot), unique U (a hapax content word at the
//     sentence edge, no slot, atmosphere only). Ablating N must change ref-entry and rel slots; B only rel slots; V the label and ends;
//     F nothing at all; U nothing in the slots and something in the atmosphere. The derived types must align with the planted roles
//     (NMI far above the role-permutation null) and a planted IMPACT-NULL (roles assigned at random, independent of structure) must give
//     NMI inside the null; a role-blind (constant) reader must give NMI 0.
//  N3 FRAME-CAUSAL: with F = 0, replacing every sentence after s by arbitrary text leaves the signature hash-identical; the F > 0
//     signature must CHANGE (it proves the two arms differ).
//  N4 DETERMINISM: byte-identical signatures across reruns and across evaluation orders.
//  N5 CONFORMANCE: the held-fixed-null replica equals heardSurfaces(nullArm) on the same sentences and seed; with nullArm omitted it equals
//     heardSurfaces without one.
//  N6 TYPED DELTAS: constructed slot structures give each of the seven types, with the stated precedence; the three ablation modes agree
//     on a constructed unambiguous case and DISAGREE where adjacency repair matters (so the modes are distinguishable).
//  N7 CONTAMINATION: a static scan finds no forbidden import and no gold field in this file's feature code.
//  N8 COMPANY-SHUFFLE PIPELINE NULL (run by the scorer, supported here by `shuffleSentences`): the whole ablation pipeline re-run on
//     within-sentence-shuffled text; the T5a NMI must fall to the role-permutation null.
//
// 9. PASS RULE (of the INSTRUMENT; the law-level pass rules are those of T5, T10 and the outcome tables of the design, restated nowhere and
//  altered nowhere). This module is ACCEPTED for use in T5 and T10 iff all hold: (a) N1, N3, N4, N5, N6, N7 pass exactly (they are
//  properties, not statistics); (b) on the planted IMPACT-PLANT toy the derived types reach NMI against the planted roles of at least 0.8
//  (a declared fraction of the oracle NMI = 1, the design's theta) and above the 95th percentile of the role-permutation null, and on the
//  planted IMPACT-NULL NMI lies inside that null; (c) the DEV smoke runs to completion with the sham at 100 percent null and the hash
//  check identical. If (b) fails the readers are DEAF to the planted structure: the design's gate says UNDERPOWERED(reader), not
//  "impact does not determine role". Whatever the DEV smoke shows about real languages is a measurement of THE SHIPPED PRIOR-FREE
//  READERS, not a verdict on the law (design 9.1, R15), and no threshold, window, feature or reader is changed after seeing it.
//
// 10. PREDICTIONS (recorded before the first smoke; scored after; a miss is reported as a miss). Smoke = DEV, M = 8, F = 0, A-DEL.
//  P1 the sham is the null type in 100 percent of cases (a property: any shortfall is a defect). P2 the determinism hashes are identical.
//  P3 the F = 0 signature is hash-identical under replacement of later sentences, on every checked token. P4 on English dev the
//  null-type share over the evaluated tokens is at least 0.5 (most tokens change no slot within a short window under prior-free readers),
//  and the closed classes {ADP, AUX, CCONJ, DET, PART, PRON, SCONJ} have a higher null share than the open classes {NOUN, PROPN, VERB}
//  (the design's recorded prediction: closed classes are deaf in the holograph). P5 the offsets-moved component of IMPACT-SPAN is non-zero
//  for a majority of tokens that have a later edge in their window, while the slot deltas at sentences with no relation to the slot of t
//  are unchanged. P6 the derived K* is in 2..8, or the typed gap `no_stable_k`. P7 the null/non-null decision of A-DEL and A-MASK agrees on
//  at least 0.8 of tokens. P8 the prior-free R-B reading admits no entry in at least half of the short windows (the reader is deaf to
//  beings there: a limit of the shipped instrument, design R15, reported as a gap about the reader).
//
// 11. DECLARED CONSTANTS (every typed number and why).
//  SIG_DIM 85 = 4 families x 3 bands x 6 types + 12 + 1 (design 2.5.3). ATM_DIM 19 (design). SPAN_DIM 32 (design). C_DIM 8 (design).
//  D_IMP 24 (design). NULL_DRAWS 20: with alpha 0.05 the 95th percentile of 20 shuffles is the second largest, the smallest draw count at
//  which the shipped quantile rule `ceil((1 - alpha) n) - 1` leaves a non-maximal ceiling. NULL_ALPHA 0.05 (the repo's alpha). minMentions 2,
//  minShare 0.5, minMembers 2, minRec 2, length floor 3 (script-aware): the repo's givers (design section 10). NUM_EPS 1e-9 (design 2.5.3).
//  KM_RESTARTS 5, KM_ITERS 100, STAB_PAIRS 20, K ladder {2..32} (design 2.5.3), K <= n/4 (a cluster needs on average four members to
//  be a type). MASK_TOKEN "zqxmaskxqz". M ladder, F ladder, token ladder, w ladder: the design's. MAX_FRAMES 512 (the design's cap).
//  Smoke settings (M = 8, F = 0 / 2, n = 150) are not findings and not tuned; they are declared here before the run.
//
// 12. LIMITS KNOWN IN ADVANCE.
//  · The prior-free R-B hears only recurring words whose dominant company is the sentence start (a positional kind with at least two
//    members): short windows usually admit nothing; function words that open sentences are admitted (no prior refuses them). The prior-free
//    R-C hears an arrangement only where a non-figure token (a hapax, a short word) stands between two recurring figures; recurring
//    function words are figures and join to each other with an empty connector, which is no arrangement. These are the SHIPPED readers; a
//    failure to hear a role is a failure of L-M as instantiated, reported separately from a failure in principle (design 1.2).
//  · clauseAware = true applies adapters/text/clause-spans.js, whose closed classes are English (its own header); it is the design's setting.
//  · The slot graph, the bands and the alignment are this file's reading of design 2.5.2 where the design leaves a detail open; they are fixed
//    here, before any run, and tested on constructed structures.
//  · Token coordinates are a nuisance used only for extents; slot comparison never uses them.
//  · Whitespace inside an identity (Vietnamese UD words) is replaced by "_" and splits into several reader tokens; an edge field inside such
//    an identity maps to its unit token through character ranges.
//  · A-FILL needs the induced class of induce.mjs; absent, it is a typed gap. The default IMPACT-C company model is identity-grain.
//  · The smoke reads DEV only (the loader refuses a TEST path).
// ==== END PRE-REGISTRATION ====

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// CODE. Everything above this line is the frozen registration. Feature code lives between @@FEATURES-BEGIN and
// @@FEATURES-END and mentions no label; the sampler, the smoke loader and the reports live outside it.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { extractGfpRelations } from "../../adapters/text/relations-gfp.js";
import { contextVectors } from "../../organs/kind-standing.js";
import { discoverReferents } from "../../adapters/text/surfaces.js";
import { readForward } from "../../memory/activation.js";
import { dmdWindow } from "../../kernel/activation.js";
import { symmetricEigen } from "../../kernel/dmd.js";
import { hear, withEar } from "../../adapters/text/active-ear.js";
import { wordFloor } from "../../adapters/text/script-floor.js";

const SELF_PATH = fileURLToPath(import.meta.url);
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** sha256 of the frozen pre-registration (first line to the END marker, inclusive of its newline). */
export function headerSha256() {
  const src = fs.readFileSync(SELF_PATH, "utf8");
  const mark = "// ==== END PRE-REGISTRATION ====\n";
  const k = src.indexOf(mark);
  if (k < 0) throw new Error("impact.mjs: the END PRE-REGISTRATION marker is missing");
  return sha256(src.slice(0, k + mark.length));
}

// ─── declared constants (header section 11) ──────────────────────────────────────────────────────────────────────────
export const SIG_DIM = 85;
export const ATM_DIM = 19;
export const SPAN_DIM = 32;
export const C_DIM = 8;
export const D_IMP = 24;
export const NULL_DRAWS = 20;
export const NULL_ALPHA = 0.05;
export const NUM_EPS = 1e-9;
export const KM_RESTARTS = 5;
export const KM_ITERS = 100;
export const STAB_PAIRS = 20;
export const K_LADDER = Object.freeze([2, 4, 8, 16, 32]);
export const MASK_TOKEN = "zqxmaskxqz";
export const MAX_FRAMES = 512;
export const M_LADDER = Object.freeze([0, 8, 16, 32, 64, 128, 256, 512]);
export const F_LADDER = Object.freeze([0, 1, 2, 4, 8, 16, 32]);
export const TOKEN_LADDER = Object.freeze([1, 2, 4, 8, 16]);
export const W_LADDER = Object.freeze([1, 2, 4, 8]);
export const FAMILIES = Object.freeze(["rel-end1", "rel-label", "rel-end2", "ref-entry"]);
export const DELTA_TYPES = Object.freeze(["emptied", "retyped", "rebound", "refilled", "shifted", "born"]);
export const ALL_TYPES = Object.freeze([...DELTA_TYPES, "unchanged"]);
export const UPOS14 = Object.freeze(["ADJ", "ADP", "ADV", "AUX", "CCONJ", "DET", "INTJ", "NOUN", "NUM", "PART", "PRON", "PROPN", "SCONJ", "VERB"]);
export const CLOSED_UPOS = Object.freeze(["ADP", "AUX", "CCONJ", "DET", "PART", "PRON", "SCONJ"]);
export const OPEN_UPOS = Object.freeze(["ADJ", "ADV", "INTJ", "NOUN", "NUM", "PROPN", "VERB"]);

/** The repo's own seed derivation for this design: first 32 bits of sha256("khora-law-v2" 0x1f parts joined by 0x1f). */
export const seedFor = (...parts) => parseInt(sha256(["khora-law-v2", ...parts.map(String)].join("\x1f")).slice(0, 8), 16) >>> 0;

export const rngFor = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const shuffleInPlace = (arr, rnd) => {
  for (let i = arr.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
};
const logT = (x) => (x === 0 ? 0 : Math.sign(x) * Math.log2(1 + Math.abs(x)));
const fix = (x) => { const v = Number(Number(x).toFixed(9)); return v === 0 ? 0 : v; };
const median = (xs) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
const quantile = (xs, q) => { if (!xs.length) return NaN; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))]; };

// @@FEATURES-BEGIN

// ─── the unit stream, its text, its windows ────────────────────────────────────────────────────────────────────────────
const cleanId = (id) => String(id).replace(/\s+/g, "_");
/** A sentence (a list of identities) as the readers see it: single-space joined. */
export const sentenceText = (toks) => toks.map(cleanId).join(" ");

/** The window [s - M, s + F] of a stream (a list of sentences), clipped; `self` is the evaluated sentence's index inside it. */
export function windowOf(stream, s, { M = 0, F = 0, cap = MAX_FRAMES } = {}) {
  const m = Math.min(M === Infinity ? cap : M, cap);
  const f = Math.min(F === Infinity ? cap : F, cap);
  const lo = Math.max(0, s - m);
  const hi = Math.min(stream.length - 1, s + f);
  return { sents: stream.slice(lo, hi + 1), self: s - lo, lo, hi };
}

const cumLens = (sents) => { const out = []; let c = 0; for (const s of sents) { out.push(c); c += s.length; } return out; };

// ─── the three prior-free readers ──────────────────────────────────────────────────────────────────────────────────────
const WORD_G = /[\p{L}\p{N}]+/gu;
const SPLIT_BEING = /[^\p{L}\p{N}']+/u;
const DENSE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const minWordLength = (w) => (DENSE.test(w) ? 2 : 3);
const POSITIONAL = "before=^";

export const READING = Object.freeze({
  minMentions: 2, minShare: 0.5, minMembers: 2, nullDraws: NULL_DRAWS, nullAlpha: NULL_ALPHA, nullSeed: 1,
  minRec: 2, clauseAware: true, functionWords: null,
  ra: true, rb: true, rc: true, ear: null, edgeSource: null, referentSource: null, contaminated: undefined,
});

/** The registry of the shipped readers this module reads through (design 2.5.1). */
export const READERS = Object.freeze({
  "R-A": Object.freeze({ id: "R-A", via: "memory/activation.js::readForward", posPrior: null, contaminated: false }),
  "R-B": Object.freeze({ id: "R-B", via: "organs/kind-standing.js::contextVectors (heardSurfaces selection, null held fixed) + adapters/text/surfaces.js::discoverReferents", posPrior: null, minMentions: 2, minShare: 0.5, minMembers: 2, contaminated: false }),
  "R-B1": Object.freeze({ id: "R-B1", via: "as R-B with minMentions 1 (floor-1 counterfactual for the single-mention rule)", minMentions: 1, contaminated: false }),
  "R-C": Object.freeze({ id: "R-C", via: "adapters/text/relations-gfp.js::extractGfpRelations(clauseAware, posPrior null, functionWords null), window-level figures", contaminated: false }),
});

const heardOf = (texts) => texts.map((t) => String(t ?? "").toLowerCase());

/** heardSurfaces' vocabulary tally (replicated: same split, same length floor). */
function tally(heard) {
  const counts = new Map();
  const sentenceCounts = new Map();
  for (const text of heard) {
    const seen = new Set();
    for (const w of text.split(SPLIT_BEING)) {
      if (w.length < minWordLength(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
      if (!seen.has(w)) { seen.add(w); sentenceCounts.set(w, (sentenceCounts.get(w) ?? 0) + 1); }
    }
  }
  return { counts, sentenceCounts };
}

/** The shipped nullArm of discoverCompanyKinds (same LCG, same shuffle, same quantile), spent ONCE: a per-word ceiling map. */
export function nullCeiling(texts, { draws = NULL_DRAWS, alpha = NULL_ALPHA, seed = 1, minMentions = READING.minMentions } = {}) {
  const heard = heardOf(texts).map((text) => ({ text }));
  const { counts } = tally(heard.map((h) => h.text));
  const vocabulary = [...counts.entries()].filter(([, n]) => n >= minMentions).map(([w]) => w);
  return ceilingFor(heard, vocabulary, { draws, alpha, seed });
}
function ceilingFor(heard, vocabulary, { draws, alpha, seed }) {
  let sd = seed >>> 0;
  const rnd = () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const perWord = new Map();
  for (let d = 0; d < draws; d += 1) {
    const redealt = heard.map((sent) => {
      const words = String(sent.text ?? sent).split(/\s+/);
      for (let i = words.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
      return { text: words.join(" ") };
    });
    const nv = contextVectors(redealt, vocabulary, {});
    for (const [word, v] of nv) {
      let tot = 0, best = 0;
      for (const [f, n] of v) { if (!f.startsWith("before=")) continue; tot += n; if (n > best) best = n; }
      if (!tot) continue;
      if (!perWord.has(word)) perWord.set(word, []);
      perWord.get(word).push(best / tot);
    }
  }
  const ceiling = new Map();
  for (const [word, shares] of perWord) {
    shares.sort((a, b) => a - b);
    const idx = Math.min(shares.length - 1, Math.ceil((1 - alpha) * shares.length) - 1);
    ceiling.set(word, shares[Math.max(0, idx)]);
  }
  return ceiling;
}

/**
 * The beings the window hears, prior-free: heardSurfaces' selection (positionally signed company kinds with at least minMembers
 * members, recurring at least minMentions times), with the null ceiling either computed here (ceiling === undefined and
 * nullDraws > 0), held from another window snapshot (a Map), or absent (null). Returns {beings, ceiling}.
 */
export function heardBeings(texts, { minMentions = READING.minMentions, minShare = READING.minShare, minMembers = READING.minMembers, nullDraws = NULL_DRAWS, nullAlpha = NULL_ALPHA, nullSeed = 1 } = {}, ceiling) {
  const heard = heardOf(texts).map((text) => ({ text }));
  const { counts, sentenceCounts } = tally(heard.map((h) => h.text));
  const vocabulary = [...counts.entries()].filter(([, n]) => n >= minMentions).map(([w]) => w);
  if (!vocabulary.length) return { beings: [], ceiling: ceiling === undefined ? null : ceiling };
  let ceil = ceiling;
  if (ceil === undefined) ceil = nullDraws > 0 ? ceilingFor(heard, vocabulary, { draws: nullDraws, alpha: nullAlpha, seed: nullSeed }) : null;
  const vecs = contextVectors(heard, vocabulary, {});
  const bySignature = new Map();
  for (const [word, v] of vecs) {
    let total = 0, best = null, bestN = 0;
    for (const [f, n] of v) {
      if (!f.startsWith("before=")) continue;
      total += n;
      if (n > bestN) { bestN = n; best = f; }
    }
    if (!best || total < minMentions) continue;
    const share = bestN / total;
    if (share < minShare) continue;
    if (!bySignature.has(best)) bySignature.set(best, []);
    bySignature.get(best).push({ word, share });
  }
  const kinds = [];
  for (const [signature, members] of bySignature) {
    if (members.length < minMembers) continue;
    const kept = ceil ? members.filter((m) => m.share > (ceil.get(m.word) ?? 1)) : members;
    if (kept.length < minMembers) continue;
    kinds.push({ signature, members: kept.map((m) => m.word) });
  }
  const set = new Set();
  for (const kind of kinds) if (kind.signature === POSITIONAL) for (const m of kind.members) set.add(m);
  const beings = [...set]
    .map((surface) => ({ surface, mentions: counts.get(surface) ?? 0, sentences: sentenceCounts.get(surface) ?? 0 }))
    .sort((a, b) => b.mentions - a.mentions);
  return { beings, ceiling: ceil };
}

/** The unit tokens of a sentence that mention a being surface (a unit token mentions it when one of its heard subwords equals it). */
const subwordsOf = (tok) => String(tok).toLowerCase().split(SPLIT_BEING).filter(Boolean);

/** Beings -> the referent index (discoverReferents): entries with a surface-set key, mentions, first position in reading order. */
function referentEntries(beings, sents, discover = discoverReferents) {
  if (!beings.length) return { entries: [], surfaceEntry: new Map() };
  const { events } = discover(beings);
  const byId = new Map();
  for (const ev of events ?? []) {
    if (ev?.type !== "DEF.admit") continue;
    if (!byId.has(ev.referent_id)) byId.set(ev.referent_id, []);
    byId.get(ev.referent_id).push(ev.surface);
  }
  const mentionsOf = new Map(beings.map((b) => [b.surface, b.mentions]));
  const raw = [];
  for (const [id, surfaces] of byId) {
    const set = new Set(surfaces);
    let first = null;
    outer: for (let e = 0; e < sents.length; e += 1) {
      for (let i = 0; i < sents[e].length; i += 1) {
        if (subwordsOf(sents[e][i]).some((w) => set.has(w))) { first = { e, i }; break outer; }
      }
    }
    if (!first) continue;
    const sorted = [...set].sort();
    raw.push({ id, surfaces: sorted, key: sorted.join("|"), mentions: sorted.reduce((a, s) => a + (mentionsOf.get(s) ?? 0), 0), first });
  }
  raw.sort((a, b) => a.first.e - b.first.e || a.first.i - b.first.i || (a.key < b.key ? -1 : 1));
  const entries = raw.map((en, k) => ({ ...en, k }));
  const surfaceEntry = new Map();
  for (const en of entries) for (const s of en.surfaces) surfaceEntry.set(s, en.key);
  return { entries, surfaceEntry };
}

/** The window's figures: the extractor's own self-discovery rule (recur >= minRec, length >= wordFloor(token, 3), not a function word). */
export function windowFigures(texts, { minRec = READING.minRec, functionWords = null } = {}) {
  const counts = new Map();
  for (const t of texts) for (const m of hear(t).matchAll(WORD_G)) { const k = m[0].toLowerCase(); counts.set(k, (counts.get(k) ?? 0) + 1); }
  const out = new Set();
  for (const [t, c] of counts) if (c >= minRec && t.length >= wordFloor(t, 3) && !(functionWords && functionWords.has(t))) out.add(t);
  return out;
}

const tokenRanges = (text) => [...text.matchAll(/\S+/g)].map((m) => [m.index, m.index + m[0].length]);
/** unit tokens overlapping the character interval [a, b): [first, last + 1) or null */
function overlapTokens(ranges, a, b) {
  let lo = -1, hi = -1;
  for (let t = 0; t < ranges.length; t += 1) {
    if (ranges[t][1] > a && ranges[t][0] < b) { if (lo < 0) lo = t; hi = t; }
  }
  return lo < 0 ? null : [lo, hi + 1];
}

/** Which unit tokens an edge covers (end1, connector, end2), by characters of the sentence text. The byte offset is used only here. */
function locateEdge(text, ed) {
  if (hear(text) !== text) return null; // an ear moved the characters: no positional span
  const ranges = tokenRanges(text);
  const s1 = ed.offset - ed.end1.length;
  let ls = ed.offset;
  while (ls < text.length && /\s/.test(text[ls])) ls += 1;
  let le = ls;
  for (const ch of ed.label) { if (ch === " ") { while (le < text.length && /\s/.test(text[le])) le += 1; } else le += 1; }
  let s2 = le;
  while (s2 < text.length && /\s/.test(text[s2])) s2 += 1;
  if (!text.startsWith(ed.end2, s2)) { const k = text.indexOf(ed.end2, le); s2 = k < 0 ? s2 : k; }
  return {
    end1: overlapTokens(ranges, s1, ed.offset),
    label: overlapTokens(ranges, ls, le),
    end2: overlapTokens(ranges, s2, s2 + ed.end2.length),
  };
}

/** R-C: the arrangements of each sentence, read with the figure set of the whole window (a frame is a hard boundary). */
function relationEdges(texts, o) {
  const figures = windowFigures(texts, { minRec: o.minRec, functionWords: o.functionWords });
  const out = [];
  for (let e = 0; e < texts.length; e += 1) {
    const text = texts[e];
    let raw = [];
    if (o.edgeSource) raw = o.edgeSource(text, { figures, e }) ?? [];
    else if (figures.size) raw = extractGfpRelations(text, { posPrior: null, functionWords: o.functionWords, minRec: o.minRec, figures, clauseAware: o.clauseAware });
    out.push(raw.map((ed, j) => ({ e, j, end1: ed.end1, label: ed.label, end2: ed.end2, offset: ed.offset ?? null, span: ed.offset == null ? null : locateEdge(text, ed) })));
  }
  return { edges: out, figures };
}

/**
 * Read a window of sentence TEXTS with the three readers. `ceiling`: undefined = compute the null ceiling from this window (X0),
 * a Map = hold a ceiling from another snapshot fixed (X1), null = no null arm.
 */
export function readWindow(texts, opts = {}, ceiling) {
  const o = { ...READING, ...opts };
  const body = () => {
    const sents = texts.map((t) => (t.length ? t.split(/\s+/).filter(Boolean) : []));
    const out = { texts, params: { minMentions: o.minMentions, minShare: o.minShare, minMembers: o.minMembers, minRec: o.minRec, clauseAware: o.clauseAware }, contaminated: o.contaminated ?? Boolean(o.ear || o.edgeSource || o.referentSource) };
    if (o.rc) { const r = relationEdges(texts, o); out.edges = r.edges; out.figures = r.figures; } else { out.edges = texts.map(() => []); out.figures = new Set(); }
    if (o.rb) {
      let beings, ceil = null;
      if (o.referentSource) beings = o.referentSource(heardOf(texts)) ?? [];
      else { const r = heardBeings(texts, o, ceiling); beings = r.beings; ceil = r.ceiling; }
      out.beings = beings; out.ceiling = ceil;
      const re = referentEntries(beings, sents);
      out.entries = re.entries; out.surfaceEntry = re.surfaceEntry;
    } else { out.beings = []; out.entries = []; out.surfaceEntry = new Map(); out.ceiling = null; }
    out.atm = o.ra ? readForward(texts.map((text, order) => ({ order, text }))).records : null;
    return out;
  };
  return o.ear ? withEar(o.ear, body) : body();
}

// ─── the slot structure ──────────────────────────────────────────────────────────────────────────────────────────────────
/** SL(x): rel slots (e, j, field) and ref-entry slots (k); coordinates in the slot structure, never byte offsets. */
export function slotStructure(reading) {
  const keyOf = (str) => reading.surfaceEntry.get(str) ?? null;
  const rel = [];
  reading.edges.forEach((arr) => arr.forEach((ed) => rel.push({ e: ed.e, j: ed.j, end1: ed.end1, label: ed.label, end2: ed.end2, k1: keyOf(ed.end1), k2: keyOf(ed.end2), span: ed.span })));
  const ref = reading.entries.map((en) => ({ k: en.k, key: en.key, surfaces: en.surfaces, mentions: en.mentions, first: en.first }));
  return { rel, ref, nSent: reading.texts.length };
}

/** Deterministic order-preserving alignment (LCS) of two lists under a match predicate; earlier ordinals win ties. */
function lcsPairs(a, b, match) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1) {
    dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1], match(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : 0);
  }
  const pairs = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (match(a[i], b[j]) && dp[i][j] === dp[i + 1][j + 1] + 1) { pairs.push([i, j]); i += 1; j += 1; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i += 1;
    else j += 1;
  }
  return pairs;
}

/**
 * alignSlots(sl0, sl1): by STRUCTURE. Edges per sentence: LCS on "share at least one equal field", then the REBOUND pass over the
 * leftovers of the sentence; entries by shared surface. Returns index pairs into sl.rel / sl.ref and the lost / born indices.
 */
export function alignSlots(sl0, sl1) {
  const group = (rel) => { const m = new Map(); rel.forEach((ed, idx) => { if (!m.has(ed.e)) m.set(ed.e, []); m.get(ed.e).push(idx); }); return m; };
  const g0 = group(sl0.rel), g1 = group(sl1.rel);
  const es = [...new Set([...g0.keys(), ...g1.keys()])].sort((a, b) => a - b);
  const relPairs = [], relLost = [], relBorn = [];
  for (const e of es) {
    const a = g0.get(e) ?? [], b = g1.get(e) ?? [];
    const matched0 = new Set(), matched1 = new Set();
    for (const [x, y] of lcsPairs(a, b, (p, q) => { const A = sl0.rel[p], B = sl1.rel[q]; return A.end1 === B.end1 || A.label === B.label || A.end2 === B.end2; })) {
      relPairs.push({ a: a[x], b: b[y], via: "lcs" }); matched0.add(a[x]); matched1.add(b[y]);
    }
    for (const p of a) {
      if (matched0.has(p)) continue;
      const A = sl0.rel[p];
      const q = b.find((cand) => !matched1.has(cand) && (A.end1 === sl1.rel[cand].end2 || A.end2 === sl1.rel[cand].end1));
      if (q !== undefined) { relPairs.push({ a: p, b: q, via: "rebound" }); matched0.add(p); matched1.add(q); }
    }
    for (const p of a) if (!matched0.has(p)) relLost.push(p);
    for (const q of b) if (!matched1.has(q)) relBorn.push(q);
  }
  const refPairs = [], refLost = [], refBorn = [];
  const taken1 = new Set();
  sl0.ref.forEach((A, ia) => {
    let best = -1, bestShared = 0;
    sl1.ref.forEach((B, ib) => {
      if (taken1.has(ib)) return;
      const shared = A.surfaces.filter((s) => B.surfaces.includes(s)).length;
      if (shared > bestShared) { bestShared = shared; best = ib; }
    });
    if (best >= 0) { refPairs.push({ a: ia, b: best }); taken1.add(best); } else refLost.push(ia);
  });
  sl1.ref.forEach((_, ib) => { if (!taken1.has(ib)) refBorn.push(ib); });
  relPairs.sort((p, q) => p.a - q.a);
  return { relPairs, relLost, relBorn, refPairs, refLost, refBorn };
}

/** The type of each of the three fields of a matched pair of edges (precedence emptied > retyped > rebound > refilled > shifted > unchanged). */
export function pairFieldTypes(A, B) {
  const sameOrd = A.e === B.e && A.j === B.j;
  const same = (x, kx, y, ky) => x === y && kx === ky;
  const e1 = same(A.end1, A.k1, B.end1, B.k1), e2 = same(A.end2, A.k2, B.end2, B.k2), lb = A.label === B.label;
  const endType = (isSame, swapped) => (isSame ? (sameOrd ? "unchanged" : "shifted") : swapped ? "rebound" : "refilled");
  return [
    endType(e1, A.end1 === B.end2),
    lb ? (sameOrd ? "unchanged" : "shifted") : (e1 && e2 ? "retyped" : "refilled"),
    endType(e2, A.end2 === B.end1),
  ];
}
const entryType = (A, B) => (A.key === B.key && A.mentions === B.mentions ? (A.k === B.k ? "unchanged" : "shifted") : "refilled");

// ─── the slot graph and radius ───────────────────────────────────────────────────────────────────────────────────────────
function buildSlotGraph(sl, side) {
  const adj = new Map(), groupsOf = new Map(), members = new Map();
  const add = (id) => { if (!adj.has(id)) { adj.set(id, new Set()); groupsOf.set(id, []); } };
  const link = (x, y) => { adj.get(x).add(y); adj.get(y).add(x); };
  const grp = (g, id) => { if (!members.has(g)) members.set(g, []); members.get(g).push(id); groupsOf.get(id).push(g); };
  const rid = (idx, f) => `${side}:r:${idx}:${f}`;
  sl.rel.forEach((ed, idx) => {
    for (let f = 0; f < 3; f += 1) add(rid(idx, f));
    link(rid(idx, 0), rid(idx, 1)); link(rid(idx, 1), rid(idx, 2)); link(rid(idx, 0), rid(idx, 2));
    grp(ed.k1 ? `E${ed.k1}` : `F${ed.end1}`, rid(idx, 0));
    grp(ed.k2 ? `E${ed.k2}` : `F${ed.end2}`, rid(idx, 2));
  });
  for (let idx = 0; idx + 1 < sl.rel.length; idx += 1) {
    if (sl.rel[idx].e !== sl.rel[idx + 1].e) continue;
    for (let f = 0; f < 3; f += 1) link(rid(idx, f), rid(idx + 1, f));
    link(rid(idx, 2), rid(idx + 1, 0));
  }
  sl.ref.forEach((en, idx) => { const id = `${side}:k:${idx}:0`; add(id); grp(`E${en.key}`, id); });
  return { adj, groupsOf, members };
}
function neighboursOf(graph, id) {
  const out = new Set(graph.adj.get(id) ?? []);
  for (const g of graph.groupsOf.get(id) ?? []) for (const m of graph.members.get(g)) if (m !== id) out.add(m);
  return out;
}
function bfs(graph, sources) {
  const dist = new Map();
  const expanded = new Set();
  let frontier = [];
  for (const s of sources) if (graph.adj.has(s) && !dist.has(s)) { dist.set(s, 0); frontier.push(s); }
  let d = 0;
  while (frontier.length) {
    const next = [];
    for (const n of frontier) {
      for (const nb of graph.adj.get(n)) if (!dist.has(nb)) { dist.set(nb, d + 1); next.push(nb); }
      for (const g of graph.groupsOf.get(n)) {
        if (expanded.has(g)) continue;
        expanded.add(g);
        for (const m of graph.members.get(g)) if (!dist.has(m)) { dist.set(m, d + 1); next.push(m); }
      }
    }
    frontier = next; d += 1;
  }
  return dist;
}

/** The nodes (slots) a token at (e, i) of X0 fills: the edge fields whose token range holds it, the entries it is a mention of. */
export function tokenSlotsOf(sl0, sents0, e, i) {
  const ids = [];
  sl0.rel.forEach((ed, idx) => {
    if (ed.e !== e) return;
    const inSpan = (sp) => sp && i >= sp[0] && i < sp[1];
    if (ed.span) {
      if (inSpan(ed.span.end1)) ids.push(`0:r:${idx}:0`);
      if (inSpan(ed.span.label)) ids.push(`0:r:${idx}:1`);
      if (inSpan(ed.span.end2)) ids.push(`0:r:${idx}:2`);
    } else {
      const words = subwordsOf(sents0[e][i]);
      if (words.includes(ed.end1)) ids.push(`0:r:${idx}:0`);
      if (ed.label.split(/\s+/).some((w) => words.includes(w))) ids.push(`0:r:${idx}:1`);
      if (words.includes(ed.end2)) ids.push(`0:r:${idx}:2`);
    }
  });
  const words = subwordsOf(sents0[e][i]);
  sl0.ref.forEach((en, idx) => { if (words.some((w) => en.surfaces.includes(w))) ids.push(`0:k:${idx}:0`); });
  return ids;
}

/**
 * slotDeltas(sl0, sl1, ctx): the typed slot deltas between two slot structures, with the radius and band of every slot. ctx:
 * tokenSlots (node ids of X0 the ablated token filled), pos0(node) / pos1(node) token coordinates (for extents only), tCoord.
 */
export function slotDeltas(sl0, sl1, { tokenSlots = [], coord0 = null, coord1 = null, tCoord = null, shiftAfter = null } = {}) {
  const al = alignSlots(sl0, sl1);
  const recs = [];
  const phi = [];
  const posOf = (sl, coords, kind, idx, f) => {
    if (!coords) return null;
    if (kind === "r") { const ed = sl.rel[idx]; const sp = ed.span?.[f === 0 ? "end1" : f === 1 ? "label" : "end2"]; return sp ? coords.cum[ed.e] + sp[0] : null; }
    const en = sl.ref[idx]; return coords.cum[en.first.e] + en.first.i;
  };
  const push = (side, kind, idx, f, type, fam, e, j, pos) => recs.push({ id: `${side}:${kind}:${idx}:${f}`, side, kind, idx, f, fam, type, e, j, pos });
  const pairByA = new Map(al.relPairs.map((p) => [p.a, p]));
  sl0.rel.forEach((ed, idx) => {
    const p = pairByA.get(idx);
    const types = p ? pairFieldTypes(ed, sl1.rel[p.b]) : ["emptied", "emptied", "emptied"];
    for (let f = 0; f < 3; f += 1) {
      push(0, "r", idx, f, types[f], f, ed.e, ed.j, posOf(sl0, coord0, "r", idx, f));
      if (p) phi.push([`0:r:${idx}:${f}`, `1:r:${p.b}:${f}`]);
    }
  });
  const refByA = new Map(al.refPairs.map((p) => [p.a, p]));
  sl0.ref.forEach((en, idx) => {
    const p = refByA.get(idx);
    push(0, "k", idx, 0, p ? entryType(en, sl1.ref[p.b]) : "emptied", 3, en.first.e, en.k, posOf(sl0, coord0, "k", idx, 0));
    if (p) phi.push([`0:k:${idx}:0`, `1:k:${p.b}:0`]);
  });
  for (const b of al.relBorn) for (let f = 0; f < 3; f += 1) push(1, "r", b, f, "born", f, sl1.rel[b].e, sl1.rel[b].j, posOf(sl1, coord1, "r", b, f));
  for (const b of al.refBorn) push(1, "k", b, 0, "born", 3, sl1.ref[b].first.e, sl1.ref[b].k, posOf(sl1, coord1, "k", b, 0));

  // radii from the slot(s) of t: X0 BFS; born slots through the X1 graph via the matched slots
  const g0 = buildSlotGraph(sl0, 0), g1 = buildSlotGraph(sl1, 1);
  const radius0 = bfs(g0, tokenSlots);
  const dist1 = new Map();
  for (const [n0, n1] of phi) { const d = radius0.get(n0); if (d !== undefined) dist1.set(n1, d); }
  const bornIds = recs.filter((r) => r.side === 1).map((r) => r.id);
  const nbs = new Map(bornIds.map((id) => [id, [...neighboursOf(g1, id)]]));
  let changed = bornIds.length > 0 && dist1.size > 0;
  while (changed) {
    changed = false;
    for (const id of bornIds) {
      let best = dist1.get(id) ?? Infinity;
      for (const nb of nbs.get(id)) { const d = dist1.get(nb); if (d !== undefined && d + 1 < best) best = d + 1; }
      if (best < (dist1.get(id) ?? Infinity)) { dist1.set(id, best); changed = true; }
    }
  }
  for (const r of recs) {
    r.radius = r.side === 0 ? (radius0.get(r.id) ?? Infinity) : (dist1.get(r.id) ?? Infinity);
    let pos = r.pos;
    if (r.side === 1 && pos != null && shiftAfter != null && tCoord != null && pos >= tCoord) pos += shiftAfter;
    r.dist = pos != null && tCoord != null ? Math.abs(pos - tCoord) : null;
  }
  return { records: recs, noSlot: tokenSlots.length === 0, tokenSlots: [...tokenSlots], alignment: al };
}

const bandOf = (r, w) => (r === 0 ? 0 : r === 1 ? 1 : r === Infinity ? (w === Infinity ? 2 : null) : r <= w ? 2 : null);

/** slotSignature(deltaResult, {w, maxTokens}): the 85-component IMPACT-SLOT signature (log-transformed), and its raw counts. */
export function slotSignature(sd, { w = Infinity, maxTokens = Infinity } = {}) {
  const counts = new Float64Array(72), considered = new Float64Array(12);
  for (const r of sd.records) {
    const b = bandOf(r.radius, w);
    if (b === null) continue;
    if (maxTokens !== Infinity && r.type !== "unchanged" && r.dist != null && r.dist > maxTokens) continue;
    considered[r.fam * 3 + b] += 1;
    if (r.type !== "unchanged") counts[(r.fam * 3 + b) * 6 + DELTA_TYPES.indexOf(r.type)] += 1;
  }
  const sig = new Array(SIG_DIM);
  for (let c = 0; c < 72; c += 1) sig[c] = logT(counts[c]);
  for (let c = 0; c < 12; c += 1) sig[72 + c] = logT(considered[c]);
  sig[84] = sd.noSlot ? 1 : 0;
  return { sig, counts: Array.from(counts), considered: Array.from(considered) };
}

/** The labels of the 85 components. */
export const SIG_LABELS = Object.freeze(Array.from({ length: SIG_DIM }, (_, c) => {
  if (c < 72) return `${DELTA_TYPES[c % 6]}@${FAMILIES[Math.floor(c / 18)]}/b${Math.floor((c % 18) / 6)}`;
  if (c < 84) return `n(${FAMILIES[Math.floor((c - 72) / 3)]}/b${(c - 72) % 3})`;
  return "no-slot";
}));
/** The NULL TYPE: every one of the 72 delta components exactly zero. */
export const isNullSignature = (sig) => { for (let c = 0; c < 72; c += 1) if (Math.abs(sig[c]) > NUM_EPS) return false; return true; };

// ─── the atmosphere (R-A) ────────────────────────────────────────────────────────────────────────────────────────────────
const OBS = Object.freeze(["codeSize", "traceSize", "activation", "recalled", "novelty", "reach"]);
export const ATM_LABELS = Object.freeze([...OBS.flatMap((o) => [`${o}.self`, `${o}.spread`, `${o}.extent`]), "reach.nullflip"]);
/** atmosphere(recs0, recs1, self): 19 components from readForward over X0 and X1 (same frames). */
export function atmosphere(recs0, recs1, self) {
  const out = new Array(ATM_DIM).fill(0);
  if (!recs0 || !recs1) return out;
  OBS.forEach((o, oi) => {
    let selfD = 0, spread = 0, extent = 0;
    for (let f = 0; f < recs0.length; f += 1) {
      const a = recs0[f][o], b = recs1[f]?.[o];
      let d = 0, flipped = false;
      if (a == null || b == null) flipped = (a == null) !== (b == null); else d = b - a;
      if (f === self) selfD = d; else spread += Math.abs(d);
      if (Math.abs(d) > NUM_EPS || flipped) extent = Math.max(extent, Math.abs(f - self));
      if (o === "reach" && f === self && flipped) out[18] = 1;
    }
    out[oi * 3] = logT(selfD); out[oi * 3 + 1] = logT(spread); out[oi * 3 + 2] = logT(extent);
  });
  return out;
}

// ─── the rival: span / string impact (IMPACT-SPAN) ───────────────────────────────────────────────────────────────────────
export const SPAN_LABELS = Object.freeze([...ATM_LABELS, "births", "losses", "kindFlips", "mentionShift", "tIsBeing0", "edgesLost", "edgesBorn", "changedEnds", "changedLabel", "lostAsEnd1", "lostAsLabel", "lostAsEnd2", "offsetsMoved"]);
const edgeKey = (ed) => `${ed.end1}\u0001${ed.label}\u0001${ed.end2}`;
function globalEdges(reading) {
  const starts = []; let c = 0;
  for (const t of reading.texts) { starts.push(c); c += t.length + 1; }
  const out = [];
  reading.edges.forEach((arr) => arr.forEach((ed) => out.push({ key: edgeKey(ed), end1: ed.end1, label: ed.label, end2: ed.end2, g: ed.offset == null ? null : starts[ed.e] + ed.offset })));
  return out;
}
/** spanSignature(r0, r1, {identity}): 32 components, edges by STRING KEY, in the byte coordinate of the window text. */
export function spanSignature(r0, r1, { identity, self }) {
  const atm = atmosphere(r0.atm, r1.atm, self);
  const s0 = new Map(r0.beings.map((b) => [b.surface, b])), s1 = new Map(r1.beings.map((b) => [b.surface, b]));
  let births = 0, losses = 0, kindFlips = 0, mentionShift = 0;
  for (const k of s1.keys()) if (!s0.has(k)) births += 1;
  for (const k of s0.keys()) if (!s1.has(k)) losses += 1;
  for (const [k, b] of s0) {
    if (!s1.has(k)) continue;
    mentionShift += Math.abs((s1.get(k).mentions ?? 0) - (b.mentions ?? 0));
    if ((r0.surfaceEntry.get(k) ?? null) !== (r1.surfaceEntry.get(k) ?? null)) kindFlips += 1;
  }
  const words = subwordsOf(identity);
  const tIsBeing0 = words.some((w) => s0.has(w)) ? 1 : 0;
  const e0 = globalEdges(r0), e1 = globalEdges(r1);
  const bucket = (arr) => { const m = new Map(); for (const ed of arr) { if (!m.has(ed.key)) m.set(ed.key, []); m.get(ed.key).push(ed); } return m; };
  const b0 = bucket(e0), b1 = bucket(e1);
  const lost = [], born = [];
  let offsetsMoved = 0;
  for (const [k, list] of b0) {
    const other = b1.get(k) ?? [];
    list.forEach((ed, n) => { if (n < other.length) { if (ed.g !== other[n].g) offsetsMoved += 1; } else lost.push(ed); });
  }
  for (const [k, list] of b1) { const other = b0.get(k) ?? []; list.forEach((ed, n) => { if (n >= other.length) born.push(ed); }); }
  let changedEnds = 0, changedLabel = 0, lostAsEnd1 = 0, lostAsLabel = 0, lostAsEnd2 = 0;
  for (const ed of lost) {
    if (born.some((b) => b.label === ed.label)) changedEnds += 1;
    if (born.some((b) => b.end1 === ed.end1 && b.end2 === ed.end2 && b.label !== ed.label)) changedLabel += 1;
    if (words.includes(ed.end1)) lostAsEnd1 += 1;
    if (ed.label.split(/[^\p{L}\p{N}']+/u).some((w) => words.includes(w.toLowerCase()))) lostAsLabel += 1;
    if (words.includes(ed.end2)) lostAsEnd2 += 1;
  }
  const tail = [births, losses, kindFlips, mentionShift, tIsBeing0, lost.length, born.length, changedEnds, changedLabel, lostAsEnd1, lostAsLabel, lostAsEnd2, offsetsMoved].map(logT);
  return [...atm, ...tail];
}

// ─── IMPACT-C: the company-structure diagnostic (built to be reducible to company) ──────────────────────────────────────
export const C_LABELS = Object.freeze(["dLeft", "dRight", "dSelf", "classLeftChanged", "classRightChanged", "surprisalDestroyed", "surprisalCreated", "bigramNet"]);
/** A window-local, identity-grain company model (labelled: the induced classes of induce.mjs are injected instead via opts.companyModel). */
export function windowCompanyModel(sents) {
  const n = new Map(), L = new Map(), R = new Map(), init = new Map(), fin = new Map(), big = new Map();
  const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const s of sents) {
    s.forEach((w, i) => {
      bump(n, w);
      if (i === 0) bump(init, w);
      if (i === s.length - 1) bump(fin, w);
      const l = i > 0 ? s[i - 1] : "^", r = i + 1 < s.length ? s[i + 1] : "$";
      if (!L.has(w)) L.set(w, new Map()); bump(L.get(w), l);
      if (!R.has(w)) R.set(w, new Map()); bump(R.get(w), r);
      bump(big, `${l}\u0001${w}`);
    });
  }
  const V = Math.max(2, n.size);
  const ent = (m) => { if (!m) return 0; let t = 0; for (const v of m.values()) t += v; let h = 0; for (const v of m.values()) h -= (v / t) * Math.log(v / t); return h / Math.log(V + 1); };
  return {
    grain: "identity (window-local; no induced classes)",
    descriptor: (w) => { const c = n.get(w) ?? 0; return [Math.log(1 + c), c ? (L.get(w)?.size ?? 0) / c : 0, c ? (R.get(w)?.size ?? 0) / c : 0, ent(L.get(w)), ent(R.get(w)), c ? (init.get(w) ?? 0) / c : 0, c ? (fin.get(w) ?? 0) / c : 0]; },
    classOf: (w) => w,
    surprisal: (a, b) => -Math.log2(((big.get(`${a}\u0001${b}`) ?? 0) + 1) / ((n.get(b) ?? 0) + V)),
  };
}
const l2 = (a, b) => { let t = 0; for (let k = 0; k < a.length; k += 1) t += (a[k] - b[k]) ** 2; return Math.sqrt(t); };
/** companyStructureImpact(sents0, s, i, sents1, factory): delete t from the company statistics themselves and read the change (8 components). */
export function companyStructureImpact(sents0, s, i, sents1, factory = windowCompanyModel) {
  const m0 = factory(sents0), m1 = factory(sents1);
  const line0 = sents0[s], line1 = sents1[s];
  const left = i > 0 ? line0[i - 1] : null, right = i + 1 < line0.length ? line0[i + 1] : null;
  const t = line0[i];
  const dLeft = left != null ? l2(m0.descriptor(left), m1.descriptor(left)) : 0;
  const dRight = right != null ? l2(m0.descriptor(right), m1.descriptor(right)) : 0;
  const dSelf = l2(m0.descriptor(t), m1.descriptor(t));
  const ctx = (line, idx, off) => line[idx + off] ?? null;
  const cls = (m, w, line, idx) => (w == null ? null : m.classOf(w, ctx(line, idx, -1), ctx(line, idx, 1)));
  // after deleting position i, the left neighbour sits at i - 1 and the right neighbour at i in line1
  const classLeftChanged = left != null && cls(m0, left, line0, i - 1) !== cls(m1, left, line1, i - 1) ? 1 : 0;
  const classRightChanged = right != null && cls(m0, right, line0, i + 1) !== cls(m1, right, line1, i) ? 1 : 0;
  let destroyed = 0, created = 0, nd = 0, nc = 0;
  if (left != null) { destroyed += m0.surprisal(m0.classOf(left), m0.classOf(t)); nd += 1; }
  if (right != null) { destroyed += m0.surprisal(m0.classOf(t), m0.classOf(right)); nd += 1; }
  if (left != null && right != null) { created += m1.surprisal(m1.classOf(left), m1.classOf(right)); nc += 1; }
  return [dLeft, dRight, dSelf, classLeftChanged, classRightChanged, destroyed, created, nc - nd].map(logT);
}

// ─── the perturbation: ablation, snapshots, the impact of one token ────────────────────────────────────────────────────
/**
 * ablate(sents, s, i, {mode, fill}): the window with the token at (s, i) ablated. Modes: "delete" (A-DEL, primary), "mask" (A-MASK),
 * "fill" (A-FILL: the neutral filler of its slot class, supplied by the caller; without it the typed gap `no_induced_class`),
 * "sham" (nothing is ablated: the control; the tokens are unchanged).
 */
export function ablate(sents, s, i, { mode = "delete", fill = null, mask = MASK_TOKEN } = {}) {
  const out = sents.map((a) => a.slice());
  if (mode === "delete") out[s].splice(i, 1);
  else if (mode === "mask") out[s][i] = mask;
  else if (mode === "fill") {
    if (typeof fill !== "function") return { gap: "no_induced_class", sents: null };
    out[s][i] = fill(sents[s][i], { s, i, sents });
  } else if (mode !== "sham") throw new TypeError(`ablate: unknown mode ${mode}`);
  return { sents: out };
}

/** The sham: a position that is not a token. An extra whitespace after the token at (s, i) of the JOINED text; the readers normalise whitespace. */
export function shamAblation(texts0, s, i) {
  const toks = texts0[s].split(" ");
  const texts = texts0.slice();
  texts[s] = `${toks.slice(0, i + 1).join(" ")}  ${toks.slice(i + 1).join(" ")}`;
  return texts;
}

const readerOptsOf = (o, s) => {
  const r = {};
  for (const k of Object.keys(READING)) if (o[k] !== undefined) r[k] = o[k];
  r.nullSeed = o.nullSeed ?? seedFor(o.seedTag ?? "impact", "nullarm", s);
  return r;
};

/** One window snapshot: X0 read once, its null ceiling spent once, shared by every token of the evaluated sentence. */
export function makeSnapshot(stream, s, opts = {}) {
  const win = windowOf(stream, s, { M: opts.M ?? 0, F: opts.F ?? 0, cap: opts.cap ?? MAX_FRAMES });
  const texts0 = win.sents.map(sentenceText);
  const ropts = readerOptsOf(opts, s);
  const reading0 = readWindow(texts0, ropts);
  return { s, win, sents: win.sents, self: win.self, lo: win.lo, hi: win.hi, texts0, ropts, reading0, sl0: slotStructure(reading0), ceiling: reading0.ceiling, cum0: cumLens(win.sents), cost: { readings: 1 } };
}

/**
 * impactOfToken(snap, i, opts): the typed slot deltas of ablating the token at index i of the evaluated sentence, and the signatures
 * derived from them. Returns a plain record (arrays), or {gap} when the mode cannot run.
 */
export function impactOfToken(snap, i, { mode = "delete", fill = null, w = Infinity, companyModel = windowCompanyModel, withC = true, keepDeltas = false } = {}) {
  const e = snap.self;
  const identity = snap.sents[e][i];
  let sents1, texts1;
  if (mode === "sham") { sents1 = snap.sents; texts1 = shamAblation(snap.texts0, e, i); }
  else {
    const a = ablate(snap.sents, e, i, { mode, fill });
    if (a.gap) return { gap: a.gap, s: snap.s, i, mode };
    sents1 = a.sents; texts1 = sents1.map(sentenceText);
  }
  const reading1 = readWindow(texts1, snap.ropts, snap.ceiling === undefined ? null : snap.ceiling);
  snap.cost.readings += 1;
  const sl1 = slotStructure(reading1);
  const tokenSlots = tokenSlotsOf(snap.sl0, snap.sents, e, i);
  const tCoord = snap.cum0[e] + i;
  const sd = slotDeltas(snap.sl0, sl1, { tokenSlots, coord0: { cum: snap.cum0 }, coord1: { cum: cumLens(sents1) }, tCoord, shiftAfter: mode === "delete" ? 1 : 0 });
  const { sig, counts, considered } = slotSignature(sd, { w });
  const atm = atmosphere(snap.reading0.atm, reading1.atm, e);
  const span = spanSignature(snap.reading0, reading1, { identity, self: e });
  const c = withC && mode === "delete" ? companyStructureImpact(snap.sents, e, i, sents1, companyModel) : new Array(C_DIM).fill(0);
  let tokens = 0, frames = 0, radius = 0;
  for (const r of sd.records) {
    if (r.type === "unchanged") continue;
    if (r.dist != null) tokens = Math.max(tokens, r.dist);
    if (r.e != null) frames = Math.max(frames, Math.abs(r.e - e));
    if (Number.isFinite(r.radius)) radius = Math.max(radius, r.radius);
  }
  let laterEdges = 0;
  for (const ed of snap.sl0.rel) if (ed.e > e || (ed.e === e && ed.span?.end1 && ed.span.end1[0] > i)) laterEdges += 1;
  const rec = { s: snap.s, i, identity, mode, w, laterEdges, noSlot: sd.noSlot, nTokenSlots: tokenSlots.length, sig, counts, considered, atm, span, c, isNull: isNullSignature(sig), extent: { tokens, frames, radius } };
  rec.hash = recordHash(rec);
  if (keepDeltas) rec.sd = sd;
  return rec;
}
export const recordHash = (rec) => sha256(JSON.stringify([rec.sig.map(fix), rec.atm.map(fix), rec.span.map(fix), rec.c.map(fix)]));

/** The IMPACT-SLOT+ATM concatenation (104 components). */
export const slotAtm = (rec) => [...rec.sig, ...rec.atm];

// @@FEATURES-END

// ─── sampling (selection by gold is allowed; gold is never a feature) ──────────────────────────────────────────────────
/**
 * sampleTokens(stream, {gold, n, seed, exposure, mode, hapaxExtra}): the evaluated tokens. `gold` is a parallel array of UPOS used
 * to SELECT (UPOS in UPOS14) and to STRATIFY the evaluation; it is never a feature. `exposure` (Map identity -> train count) defines the
 * strata H0 (first sight at read time) and H1 (absent from the exposure and once in the stream). mode "uniform" (the design's) or
 * "role" (equal quota per role present). hapaxExtra adds up to that many H1 tokens. Inverse-inclusion weights are returned.
 */
export function sampleTokens(stream, { gold = null, n = 2000, seed = 1, exposure = null, mode = "uniform", hapaxExtra = 0, evalUpos = UPOS14 } = {}) {
  const inE = new Set(evalUpos);
  const streamCount = new Map();
  for (const s of stream) for (const w of s) streamCount.set(w, (streamCount.get(w) ?? 0) + 1);
  const seenSoFar = new Map();
  const cand = [];
  stream.forEach((sent, s) => sent.forEach((id, i) => {
    const before = seenSoFar.get(id) ?? 0;
    seenSoFar.set(id, before + 1);
    const upos = gold ? gold[s][i] : null;
    if (gold && !inE.has(upos)) return;
    const nTrain = exposure ? (exposure.get(id) ?? 0) : null;
    const h0 = exposure ? nTrain + before === 0 : null;
    const h1 = exposure ? nTrain === 0 && streamCount.get(id) === 1 : null;
    cand.push({ s, i, id, upos, h: h1 ? "H1" : h0 ? "H0" : exposure ? "H2" : null });
  }));
  const rnd = rngFor(seed);
  const N = cand.length;
  const pick = new Set();
  const incl = new Map();
  if (mode === "role" && gold) {
    const strata = new Map();
    cand.forEach((c, idx) => { if (!strata.has(c.upos)) strata.set(c.upos, []); strata.get(c.upos).push(idx); });
    const roles = [...strata.keys()].sort();
    const quota = Math.floor(n / roles.length);
    let extra = n - quota * roles.length;
    for (const r of roles) {
      const pool = shuffleInPlace([...strata.get(r)], rnd);
      const q = Math.min(pool.length, quota + (extra > 0 ? 1 : 0));
      if (extra > 0) extra -= 1;
      pool.slice(0, q).forEach((idx) => { pick.add(idx); incl.set(idx, q / pool.length); });
    }
  } else {
    const order = shuffleInPlace(Array.from({ length: N }, (_, k) => k), rnd);
    const m = Math.min(n, N);
    order.slice(0, m).forEach((idx) => pick.add(idx));
    for (let idx = 0; idx < N; idx += 1) incl.set(idx, m / N);
  }
  if (hapaxExtra > 0 && exposure) {
    const h1 = cand.map((c, idx) => (c.h === "H1" ? idx : -1)).filter((x) => x >= 0);
    const pool = shuffleInPlace(h1.filter((idx) => !pick.has(idx)), rnd);
    const p2 = h1.length ? Math.min(1, hapaxExtra / Math.max(1, pool.length)) : 0;
    pool.slice(0, hapaxExtra).forEach((idx) => pick.add(idx));
    for (const idx of h1) { const p1 = incl.get(idx) ?? 0; incl.set(idx, 1 - (1 - p1) * (1 - p2)); }
  }
  return [...pick].sort((a, b) => a - b).map((idx) => ({ ...cand[idx], weight: 1 / Math.max(1e-12, incl.get(idx)) }));
}

/** Within-sentence shuffle of a stream (marginals kept, company destroyed): the repo's own perturbation null (N8). */
export function shuffleSentences(stream, seed) {
  const rnd = rngFor(seed);
  return stream.map((s) => shuffleInPlace(s.slice(), rnd));
}

// ─── the batch, the determinism check, the causality check ─────────────────────────────────────────────────────────────
/** impactBatch(stream, sample, opts): the records of every sampled token under every requested mode, sharing one snapshot per sentence. */
export function impactBatch(stream, sample, opts = {}) {
  const o = { M: 8, F: 0, modes: ["delete"], maxSeconds: Infinity, keepDeltas: false, ...opts };
  const t0 = Date.now();
  const order = sample.map((t, k) => k).sort((a, b) => sample[a].s - sample[b].s || sample[a].i - sample[b].i);
  const records = Object.fromEntries(o.modes.map((m) => [m, new Array(sample.length).fill(null)]));
  let snap = null, snapshots = 0, readings = 0, done = 0, gap = null;
  for (const k of order) {
    const { s, i } = sample[k];
    if ((Date.now() - t0) / 1000 > o.maxSeconds) { gap = "budget"; break; }
    if (!snap || snap.s !== s) { if (snap) readings += snap.cost.readings; snap = makeSnapshot(stream, s, o); snapshots += 1; if (o.onSnapshot) o.onSnapshot(snap); }
    for (const mode of o.modes) records[mode][k] = impactOfToken(snap, i, { mode, fill: o.fill, w: o.w ?? Infinity, companyModel: o.companyModel, withC: o.withC ?? true, keepDeltas: o.keepDeltas });
    done += 1;
  }
  if (snap) readings += snap.cost.readings;
  return { records, cost: { snapshots, readings, tokens: done, requested: sample.length, seconds: (Date.now() - t0) / 1000 }, gap };
}

/** Byte-identical signatures across reruns and across a shuffled evaluation order (N4). */
export function determinismCheck(stream, sample, opts = {}) {
  const a = impactBatch(stream, sample, opts);
  const rnd = rngFor(seedFor("determinism", sample.length));
  const perm = shuffleInPlace(sample.map((_, k) => k), rnd);
  const b = impactBatch(stream, perm.map((k) => sample[k]), opts);
  const mode = (opts.modes ?? ["delete"])[0];
  const hb = new Map(); perm.forEach((k, pos) => hb.set(k, b.records[mode][pos]?.hash));
  let same = 0, total = 0;
  sample.forEach((_, k) => { if (a.records[mode][k] && hb.get(k)) { total += 1; if (a.records[mode][k].hash === hb.get(k)) same += 1; } });
  return { ok: total > 0 && same === total, same, total };
}

/**
 * Frame-causal conformance (N3): replace every sentence after s by arbitrary text; the F = 0 record must be hash-identical and, for
 * F > 0, must change. `replacement(s, stream)` supplies the arbitrary later sentences.
 */
export function causalCheck(stream, sample, opts = {}, replacement = (s, st) => { const later = st.slice(s + 1).map((x, k) => x.map((w) => `${w}qq${k}`)); return later.length ? later : [["alpha", "beta", "gamma"], ["delta", "alpha"]]; }) {
  const out = { F0: { same: 0, total: 0 }, Fpos: { changed: 0, total: 0 } };
  for (const t of sample) {
    const later = replacement(t.s, stream);
    const stream2 = stream.slice(0, t.s + 1).concat(later);
    for (const [label, F] of [["F0", 0], ["Fpos", opts.Fpos ?? 2]]) {
      const o = { ...opts, F, modes: ["delete"] };
      const a = impactBatch(stream, [t], o).records.delete[0];
      const b = impactBatch(stream2, [t], o).records.delete[0];
      if (!a || !b) continue;
      if (label === "F0") { out.F0.total += 1; if (a.hash === b.hash) out.F0.same += 1; }
      else { out.Fpos.total += 1; if (a.hash !== b.hash) out.Fpos.changed += 1; }
    }
  }
  return out;
}

// ─── metrics used by the types and the reports ─────────────────────────────────────────────────────────────────────────
/** Adjusted Rand index between two labelings. */
export function ari(a, b) {
  const n = a.length;
  if (n < 2) return 0;
  const tab = new Map(), ra = new Map(), rb = new Map();
  for (let k = 0; k < n; k += 1) {
    const key = `${a[k]}|${b[k]}`;
    tab.set(key, (tab.get(key) ?? 0) + 1); ra.set(a[k], (ra.get(a[k]) ?? 0) + 1); rb.set(b[k], (rb.get(b[k]) ?? 0) + 1);
  }
  const c2 = (x) => (x * (x - 1)) / 2;
  let sumIj = 0; for (const v of tab.values()) sumIj += c2(v);
  let sumA = 0; for (const v of ra.values()) sumA += c2(v);
  let sumB = 0; for (const v of rb.values()) sumB += c2(v);
  const expected = (sumA * sumB) / c2(n);
  const max = (sumA + sumB) / 2;
  return max === expected ? 0 : (sumIj - expected) / (max - expected);
}
/** Normalised mutual information, arithmetic-mean normalisation. */
export function nmi(a0, b0) {
  const a = a0.map(String), b = b0.map(String);
  const n = a.length;
  if (!n) return 0;
  const tab = new Map(), ra = new Map(), rb = new Map();
  for (let k = 0; k < n; k += 1) {
    const key = `${a[k]}\u0001${b[k]}`;
    tab.set(key, (tab.get(key) ?? 0) + 1); ra.set(a[k], (ra.get(a[k]) ?? 0) + 1); rb.set(b[k], (rb.get(b[k]) ?? 0) + 1);
  }
  const H = (m) => { let h = 0; for (const v of m.values()) h -= (v / n) * Math.log(v / n); return h; };
  let I = 0;
  for (const [key, v] of tab) { const [x, y] = key.split("\u0001"); I += (v / n) * Math.log((v * n) / (ra.get(x) * rb.get(y))); }
  const ha = H(ra), hb = H(rb);
  return ha + hb === 0 ? 0 : (2 * I) / (ha + hb);
}
/** NMI against a label-permutation null: {nmi, nullQ95, nullMean, p}. */
export function nmiVsPermutation(types, roles, { B = 500, seed = 1 } = {}) {
  const obs = nmi(types, roles);
  const rnd = rngFor(seed);
  const perm = roles.slice();
  const nulls = [];
  for (let b = 0; b < B; b += 1) { shuffleInPlace(perm, rnd); nulls.push(nmi(types, perm)); }
  return { nmi: obs, nullQ95: quantile(nulls, 0.95), nullMean: nulls.reduce((a, x) => a + x, 0) / nulls.length, p: (1 + nulls.filter((x) => x >= obs).length) / (1 + B) };
}
/** Disagreement of two labelings after greedy label matching by overlap. */
export function typeDisagreement(a, b) {
  const n = a.length;
  const tab = new Map();
  for (let k = 0; k < n; k += 1) { const key = `${a[k]}\u0001${b[k]}`; tab.set(key, (tab.get(key) ?? 0) + 1); }
  const cells = [...tab.entries()].map(([key, v]) => ({ key, v, x: key.split("\u0001")[0], y: key.split("\u0001")[1] })).sort((p, q) => q.v - p.v || (p.key < q.key ? -1 : 1));
  const ua = new Set(), ub = new Set();
  let agree = 0;
  for (const c of cells) { if (ua.has(c.x) || ub.has(c.y)) continue; ua.add(c.x); ub.add(c.y); agree += c.v; }
  return n ? 1 - agree / n : 0;
}

// ─── the derived type vocabulary ───────────────────────────────────────────────────────────────────────────────────────
const normRow = (v) => { let t = 0; for (const x of v) t += x * x; t = Math.sqrt(t); return t === 0 ? v.slice() : v.map((x) => x / t); };
const dotv = (a, b) => { let t = 0; for (let k = 0; k < a.length; k += 1) t += a[k] * b[k]; return t; };

function sphericalKMeans(X, K, rnd, { restarts = KM_RESTARTS, iters = KM_ITERS } = {}) {
  const n = X.length, dim = X[0].length;
  K = Math.min(K, n);
  let best = null;
  for (let r = 0; r < restarts; r += 1) {
    // k-means++ seeding on d = 1 - cos
    const cent = [X[Math.floor(rnd() * n)].slice()];
    const d2 = new Float64Array(n).fill(Infinity);
    while (cent.length < K) {
      let tot = 0;
      const last = cent[cent.length - 1];
      for (let p = 0; p < n; p += 1) { const d = Math.max(0, 1 - dotv(X[p], last)); d2[p] = Math.min(d2[p], d * d); tot += d2[p]; }
      let pickIdx = n - 1;
      if (tot > 0) { let u = rnd() * tot; for (let p = 0; p < n; p += 1) { u -= d2[p]; if (u <= 0) { pickIdx = p; break; } } }
      else pickIdx = Math.floor(rnd() * n);
      cent.push(X[pickIdx].slice());
    }
    let labels = new Int32Array(n).fill(-1);
    for (let it = 0; it < iters; it += 1) {
      let moved = 0;
      for (let p = 0; p < n; p += 1) {
        let bi = 0, bv = -Infinity;
        for (let k = 0; k < K; k += 1) { const v = dotv(X[p], cent[k]); if (v > bv) { bv = v; bi = k; } }
        if (labels[p] !== bi) { labels[p] = bi; moved += 1; }
      }
      const sums = Array.from({ length: K }, () => new Float64Array(dim));
      const cnt = new Int32Array(K);
      for (let p = 0; p < n; p += 1) { cnt[labels[p]] += 1; const s = sums[labels[p]]; for (let q = 0; q < dim; q += 1) s[q] += X[p][q]; }
      for (let k = 0; k < K; k += 1) {
        if (cnt[k] === 0) { cent[k] = X[Math.floor(rnd() * n)].slice(); continue; }
        cent[k] = normRow(Array.from(sums[k]));
      }
      if (moved === 0) break;
    }
    let obj = 0;
    for (let p = 0; p < n; p += 1) obj += dotv(X[p], cent[labels[p]]);
    if (!best || obj > best.obj) best = { centroids: cent.map((c) => c.slice()), labels: Array.from(labels), obj };
  }
  return best;
}
const nearest = (cent, x) => { let bi = 0, bv = -Infinity; for (let k = 0; k < cent.length; k += 1) { const v = dotv(x, cent[k]); if (v > bv) { bv = v; bi = k; } } return bi; };

/**
 * impactTypes(rows, {seed, isNull, ladder, pairs}): the DERIVED type vocabulary. Type 0 = the null type; among the rest spherical k-means
 * with K chosen by split-half stability against the shuffle null (header section 5). Returns {K, centroids, names, counts, stability, gap}.
 */
export function impactTypes(rows, { seed = 1, isNull = isNullSignature, ladder = K_LADDER, pairs = STAB_PAIRS, labels = SIG_LABELS } = {}) {
  const rnd = rngFor(seed);
  const nonnull = rows.filter((r) => !isNull(r));
  const nNull = rows.length - nonnull.length;
  const base = { nNull, nNonNull: nonnull.length, stability: [], gap: null, labels };
  if (nonnull.length === 0) return { ...base, K: 0, centroids: [], names: [], counts: [nNull], gap: "too_few_nonnull" };
  const X = nonnull.map(normRow);
  const nameOf = (rowsIn) => {
    const mean = new Array(rowsIn[0].length).fill(0);
    for (const r of rowsIn) for (let c = 0; c < mean.length; c += 1) mean[c] += r[c] / rowsIn.length;
    return mean.map((v, c) => [v, c]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, 2).map(([, c]) => labels[c]).join("+");
  };
  if (nonnull.length < 8) {
    const c = normRow(nonnull[0].map((_, q) => nonnull.reduce((a, r) => a + r[q], 0)));
    return { ...base, K: 1, centroids: [c], names: [nameOf(nonnull)], counts: [nNull, nonnull.length], gap: "too_few_nonnull" };
  }
  const stat = (data, K) => {
    const idx = shuffleInPlace(Array.from({ length: data.length }, (_, k) => k), rnd);
    const half = idx.length >> 1;
    const A = idx.slice(0, half).map((k) => data[k]), B = idx.slice(half).map((k) => data[k]);
    const cA = sphericalKMeans(A, K, rnd).centroids, cB = sphericalKMeans(B, K, rnd).centroids;
    return ari(data.map((x) => nearest(cA, x)), data.map((x) => nearest(cB, x)));
  };
  const permuted = () => {
    const cols = X[0].length;
    const out = X.map(() => new Array(cols));
    for (let c = 0; c < cols; c += 1) { const col = shuffleInPlace(X.map((r) => r[c]), rnd); for (let k = 0; k < X.length; k += 1) out[k][c] = col[k]; }
    return out.map(normRow);
  };
  let chosen = 1;
  for (const K of ladder) {
    if (K > Math.floor(nonnull.length / 4)) break;
    const obs = Array.from({ length: pairs }, () => stat(X, K));
    const nul = Array.from({ length: pairs }, () => stat(permuted(), K));
    const o = median(obs), q = quantile(nul, 0.95);
    const pass = o > q;
    base.stability.push({ K, observed: o, nullQ95: q, pass });
    if (pass) chosen = K;
  }
  if (chosen === 1) base.gap = "no_stable_k";
  const fit = sphericalKMeans(X, chosen, rnd);
  const groups = Array.from({ length: fit.centroids.length }, () => []);
  fit.labels.forEach((l, k) => groups[l].push(nonnull[k]));
  const keep = groups.map((g, k) => [g, k]).filter(([g]) => g.length > 0);
  return { ...base, K: keep.length, centroids: keep.map(([, k]) => fit.centroids[k]), names: keep.map(([g]) => nameOf(g)), counts: [nNull, ...keep.map(([g]) => g.length)] };
}
/** assignType(sig, vocab): 0 for the null signature, else 1 + the nearest centroid by cosine. */
export function assignType(sig, vocab, { isNull = isNullSignature } = {}) {
  if (isNull(sig)) return 0;
  if (!vocab.centroids.length) return 1;
  return 1 + nearest(vocab.centroids, normRow(sig));
}

/** The span rival's null: every one of its 32 components exactly zero. */
export const isNullSpan = (sp) => sp.every((x) => Math.abs(x) <= NUM_EPS);

// ─── capacity equality: unsupervised PCA (d_imp = min(24, rank)) ───────────────────────────────────────────────────────
export function fitPCA(rows, d = D_IMP) {
  const n = rows.length, dim = rows[0].length;
  const mean = new Array(dim).fill(0);
  for (const r of rows) for (let c = 0; c < dim; c += 1) mean[c] += r[c] / n;
  const cov = Array.from({ length: dim }, () => new Array(dim).fill(0));
  for (const r of rows) for (let a = 0; a < dim; a += 1) { const da = r[a] - mean[a]; if (da === 0) continue; for (let b = a; b < dim; b += 1) cov[a][b] += da * (r[b] - mean[b]); }
  for (let a = 0; a < dim; a += 1) for (let b = a; b < dim; b += 1) { cov[a][b] /= Math.max(1, n - 1); cov[b][a] = cov[a][b]; }
  const { values, vectors } = symmetricEigen(cov);
  const top = values[0] ?? 0;
  const rank = values.filter((v) => v > 1e-9 * Math.max(top, 1e-300)).length;
  const k = Math.min(d, rank);
  return { mean, k, rank, values: values.slice(0, k), comps: Array.from({ length: k }, (_, j) => vectors.map((row) => row[j])) };
}
export const projectPCA = (pca, row) => pca.comps.map((v) => { let t = 0; for (let c = 0; c < v.length; c += 1) t += (row[c] - pca.mean[c]) * v[c]; return t; });

/** The dense and one-hot impact arms of a record, given a PCA and a type vocabulary fitted on the TRAIN sample (no labels anywhere). */
export function impactArms(rec, { pcaSlot, pcaSpan, vocabSlot, vocabSpan, K }) {
  const hot = (id, k) => { const v = new Array(k + 1).fill(0); v[id] = 1; return v; };
  return {
    "IMPACT-SLOT": projectPCA(pcaSlot, rec.sig),
    "IMPACT-SLOT-TYPE": hot(assignType(rec.sig, vocabSlot), K ?? vocabSlot.K),
    "IMPACT-SLOT+ATM": projectPCA(pcaSlot, slotAtm(rec)),
    "IMPACT-SPAN": projectPCA(pcaSpan, rec.span),
    "IMPACT-SPAN-TYPE": hot(assignType(rec.span, vocabSpan, { isNull: isNullSpan }), vocabSpan.K),
    "IMPACT-C": rec.c.slice(),
  };
}

/** The null-impact audit: the share of tokens with the null type and with no-slot, per class (class labels are the caller's, for reporting). */
export function nullImpactShare(records, classOf) {
  const by = new Map();
  records.forEach((r, k) => {
    if (!r) return;
    const c = classOf(k) ?? "?";
    if (!by.has(c)) by.set(c, { n: 0, nullType: 0, noSlot: 0 });
    const b = by.get(c);
    b.n += 1; if (r.isNull) b.nullType += 1; if (r.noSlot) b.noSlot += 1;
  });
  return Object.fromEntries([...by].map(([c, b]) => [c, { n: b.n, nullShare: b.nullType / b.n, noSlotShare: b.noSlot / b.n }]));
}

/** SLOT-ROLE (CONTAMINATED, labelled): wrap a caller-supplied positional slot organ so it can serve as `opts.edgeSource`. Carries no verdict. */
export function slotRoleVariant(extract) {
  const f = (text) => (extract(text) ?? []).map((r) => ({ end1: r.end1, label: r.label, end2: r.end2, offset: r.offset ?? null }));
  f.contaminated = true;
  f.id = "SLOT-ROLE";
  return f;
}

// ─── horizons (T6d instruments; no conclusion is drawn here) ───────────────────────────────────────────────────────────
const agreement = (a, b) => { let s = 0; for (let k = 0; k < a.length; k += 1) if (a[k] === b[k]) s += 1; return a.length ? s / a.length : 1; };

/** u_imp: the disagreement of two vocabularies fitted on two seeded resamplings of the sample, over the whole sample (labels matched greedily). */
export function uImp(rows, { seed = 1, isNull = isNullSignature, pairs = 3 } = {}) {
  const rnd = rngFor(seed);
  const ds = [];
  for (let p = 0; p < pairs; p += 1) {
    const boot = () => Array.from({ length: rows.length }, () => rows[Math.floor(rnd() * rows.length)]);
    const va = impactTypes(boot(), { seed: Math.floor(rnd() * 2 ** 31), isNull, pairs: 5 }), vb = impactTypes(boot(), { seed: Math.floor(rnd() * 2 ** 31), isNull, pairs: 5 });
    ds.push(typeDisagreement(rows.map((r) => assignType(r, va, { isNull })), rows.map((r) => assignType(r, vb, { isNull }))));
  }
  return median(ds);
}

/**
 * impactHorizonTokens(records, vocab, {u, ladder, w}): H_imp in TOKENS, in the same ladder as the company horizon h*. `records` carry their
 * delta results (impactBatch with keepDeltas). Uses kernel/activation.js::dmdWindow; `restrict` keeps the deltas within `depth` tokens of t;
 * the conclusion is the discrete impact type. Typed gaps: reach_exceeds_candidates, non_monotone.
 */
export function impactHorizonTokens(records, vocab, { u = 0, ladder = TOKEN_LADDER, w = Infinity } = {}) {
  const live = records.filter((r) => r && r.sd);
  const typesAt = (depth) => live.map((r) => assignType(slotSignature(r.sd, { w, maxTokens: depth }).sig, vocab));
  const equal = (a, b) => agreement(a, b) >= 1 - u;
  const res = dmdWindow({ depth: Infinity }, (obs) => typesAt(obs.depth), { candidates: [...ladder], equal, restrict: (obs, depth) => ({ depth }) });
  const whole = typesAt(Infinity);
  const table = ladder.map((d) => ({ depth: d, agrees: equal(typesAt(d), whole) }));
  let gap = res.gap ?? null;
  if (res.window != null && table.some((r) => r.depth > res.window && !r.agrees)) gap = "non_monotone";
  const ext = live.map((r) => r.extent.tokens);
  return { window: res.window, gap, table, u, n: live.length, extentMedian: median(ext), extentP90: quantile(ext, 0.9) };
}

/**
 * impactWindows(stream, sample, {ladderM, ladderF, ...}): M* (preceding frames, rung 0 = the self frame only) and F* (following frames,
 * rung 0 = the self frame only) by dmdWindow on the discrete IMPACT-SLOT type. M* is measured at F = 0 (the frame-causal arm); F* at M = M*.
 * `equal` = agreement on at least 1 - u of the tokens (u = uImp unless given). Typed gaps as in the design.
 */
export function impactWindows(stream, sample, opts = {}) {
  const { ladderM = M_LADDER, ladderF = F_LADDER, seed = 1, base = {} } = opts;
  const cache = new Map();
  const sigAt = (M, F) => {
    const key = `${M}|${F}`;
    if (cache.has(key)) return cache.get(key);
    const rec = impactBatch(stream, sample, { ...base, M, F, modes: ["delete"], withC: false }).records.delete.map((r) => r?.sig ?? new Array(SIG_DIM).fill(0));
    cache.set(key, rec);
    return rec;
  };
  const stat = (axis, ladder, fixed) => {
    const top = Math.max(...ladder);
    const topSig = axis === "M" ? sigAt(top, fixed) : sigAt(fixed, top);
    const vocab = impactTypes(topSig, { seed });
    const u = opts.u ?? uImp(topSig, { seed });
    const typesFor = (d) => (axis === "M" ? sigAt(d, fixed) : sigAt(fixed, d)).map((s) => assignType(s, vocab));
    const whole = typesFor(top);
    const equal = (a, b) => agreement(a, b) >= 1 - u;
    const res = dmdWindow({ depth: top }, (obs) => typesFor(obs.depth), { candidates: [...ladder], equal, restrict: (obs, depth) => ({ depth }) });
    const table = ladder.map((d) => ({ depth: d, agrees: equal(typesFor(d), whole) }));
    let gap = res.gap ?? null;
    if (res.window != null && table.some((r) => r.depth > res.window && !r.agrees)) gap = "non_monotone";
    return { window: res.window, gap, table, u, vocab: { K: vocab.K, gap: vocab.gap }, atCap: res.window === top && table.filter((r) => r.depth < top).every((r) => !r.agrees) };
  };
  const Mres = stat("M", ladderM, 0);
  const Mstar = Mres.window ?? Math.max(...ladderM);
  const Fres = stat("F", ladderF, Mstar);
  return { M: Mres, F: Fres, Mstar, Fstar: Fres.window };
}

// ─── the DEV smoke (reads DEV and TRAIN only; refuses a TEST path) ──────────────────────────────────────────────────────
const UD_EVAL = "/private/tmp/claude-501/ud-eval";
const TB = "/private/tmp/claude-501/tb";

/** A minimal CoNLL-U reader for the smoke: words (integer IDs), PUNCT removed, identity = NFC lowercase. Refuses a held-out TEST file. */
export function readConlluStream(file) {
  if (/[\\/]test\.conllu(\.gz)?$/.test(file)) throw new Error(`impact.mjs: refusing to read a TEST split (${file}); the smoke is DEV only`);
  const sents = [], upos = [];
  let cur = [], cu = [];
  const flush = () => { if (cur.length) { sents.push(cur); upos.push(cu); } cur = []; cu = []; };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line) { flush(); continue; }
    if (line[0] === "#") continue;
    const f = line.split("\t");
    if (f.length < 10 || !/^\d+$/.test(f[0])) continue;
    if (f[3] === "PUNCT") continue;
    cur.push(f[1].normalize("NFC").toLowerCase()); cu.push(f[3]);
  }
  flush();
  return { sents, upos };
}
const trainPathOf = (stem) => `${TB}/${stem === "kor" ? "kor-gsd" : stem}/train.conllu`;
export function exposureOf(stem) {
  const p = trainPathOf(stem);
  if (!fs.existsSync(p)) return null;
  const { sents } = readConlluStream(p);
  const m = new Map();
  for (const s of sents) for (const w of s) m.set(w, (m.get(w) ?? 0) + 1);
  return m;
}

/**
 * smoke({stem, n, M, F, ...}): DEV only. Samples n evaluated tokens (equal quota per role, plus a hapax oversample), computes the A-DEL and sham
 * records, the mask agreement, the determinism and causality checks, the derived types, and reports each pre-registered prediction (header
 * section 10) as computed. It draws no conclusion about the law.
 */
export function smoke({ stem = "eng", n = 150, M = 8, F = 0, hapax = 30, maskN = 60, detN = 30, causalN = 12, seedTag = null } = {}) {
  const t0 = Date.now();
  const dev = readConlluStream(`${UD_EVAL}/${stem}/dev.conllu`);
  const exposure = exposureOf(stem);
  const tag = seedTag ?? `${stem}:dev`;
  const sample = sampleTokens(dev.sents, { gold: dev.upos, n, seed: seedFor(stem, "dev", "impact-smoke"), exposure, mode: "role", hapaxExtra: exposure ? hapax : 0 });
  const snaps = [];
  const main = impactBatch(dev.sents, sample, { M, F, modes: ["delete", "sham"], seedTag: tag, onSnapshot: (s) => snaps.push({ entries: s.reading0.entries.length, beings: s.reading0.beings.length, edges: s.sl0.rel.length, ceilingWords: s.ceiling ? s.ceiling.size : null }) });
  const del = main.records.delete, sham = main.records.sham;
  const live = sample.map((t, k) => k).filter((k) => del[k] && sham[k]);
  const share = (xs) => (xs.length ? xs.filter(Boolean).length / xs.length : null);
  const P1 = { shamNullShare: share(live.map((k) => sham[k].isNull)), n: live.length };
  const shamLater = live.filter((k) => sham[k].laterEdges > 0);
  const offsets = { laterEdgeTokens: shamLater.length, shamOffsetsMoved: share(shamLater.map((k) => sham[k].span[31] > 0)), shamSlotNull: share(shamLater.map((k) => sham[k].isNull)) };
  const delLater = live.filter((k) => del[k].laterEdges > 0);
  const P5 = { delLaterEdgeTokens: delLater.length, delOffsetsMovedShare: share(delLater.map((k) => del[k].span[31] > 0)) };
  // mask agreement on a subset
  const sub = sample.slice(0, maskN);
  const mk = impactBatch(dev.sents, sub, { M, F, modes: ["delete", "mask"], seedTag: tag });
  const agreeIdx = sub.map((_, k) => k).filter((k) => mk.records.delete[k] && mk.records.mask[k]);
  const P7 = { maskAgreement: agreeIdx.length ? agreeIdx.filter((k) => mk.records.delete[k].isNull === mk.records.mask[k].isNull).length / agreeIdx.length : null, n: agreeIdx.length };
  const P2 = determinismCheck(dev.sents, sample.slice(0, detN), { M, F, modes: ["delete"], seedTag: tag });
  const P3 = causalCheck(dev.sents, sample.slice(0, causalN), { M, seedTag: tag, Fpos: 2 });
  // derived types and the per-class null share
  const rows = live.map((k) => del[k].sig);
  const vocab = impactTypes(rows, { seed: seedFor(stem, "dev", "types") });
  const types = rows.map((r) => assignType(r, vocab));
  const roles = live.map((k) => sample[k].upos);
  const nm = nmiVsPermutation(types, roles, { B: 200, seed: seedFor(stem, "dev", "nmi") });
  const spanRows = live.map((k) => del[k].span);
  const spanVocab = impactTypes(spanRows, { seed: seedFor(stem, "dev", "types-span"), isNull: isNullSpan, labels: SPAN_LABELS });
  const spanTypes = spanRows.map((r) => assignType(r, spanVocab, { isNull: isNullSpan }));
  const nmSpan = nmiVsPermutation(spanTypes, roles, { B: 200, seed: seedFor(stem, "dev", "nmi-span") });
  const byUpos = nullImpactShare(live.map((k) => del[k]), (idx) => roles[idx]);
  const closed = live.filter((k) => CLOSED_UPOS.includes(sample[k].upos)), open = live.filter((k) => ["NOUN", "PROPN", "VERB"].includes(sample[k].upos));
  const P4 = { nullShareAll: share(live.map((k) => del[k].isNull)), nullShareClosed: share(closed.map((k) => del[k].isNull)), nullShareOpen3: share(open.map((k) => del[k].isNull)), nClosed: closed.length, nOpen3: open.length };
  const P8 = { windowsWithNoEntry: snaps.length ? snaps.filter((s) => s.entries === 0).length / snaps.length : null, windows: snaps.length, windowsWithEdges: snaps.length ? snaps.filter((s) => s.edges > 0).length / snaps.length : null };
  const hap = live.filter((k) => sample[k].h === "H1");
  return {
    module: "eval/law/impact.mjs", headerSha256: headerSha256(), split: "dev", stem, M, F, mode: "A-DEL", seedTag: tag,
    sample: { requested: n, hapaxExtra: exposure ? hapax : 0, drawn: sample.length, evaluated: live.length, hapaxEvaluated: hap.length, hapaxNullShare: share(hap.map((k) => del[k].isNull)), exposure: exposure ? "train forms (unlabelled)" : "absent" },
    predictions: {
      P1_shamNullShare: P1, P2_determinism: P2, P3_causal: P3, P4_nullShare: P4, P5_offsets: { ...P5, sham: offsets }, P6_types: { K: vocab.K, gap: vocab.gap, stability: vocab.stability, names: vocab.names, counts: vocab.counts }, P7_modeAgreement: P7, P8_deafness: P8,
    },
    typesVsUpos: { slot: nm, span: nmSpan, spanK: spanVocab.K, spanGap: spanVocab.gap, note: "smoke diagnostic only; T5a and T10 are the scorer's, with their own nulls and learners" },
    nullByUpos: byUpos,
    extentTokens: { median: median(live.map((k) => del[k].extent.tokens)), p90: quantile(live.map((k) => del[k].extent.tokens), 0.9) },
    cost: { ...main.cost, totalSeconds: (Date.now() - t0) / 1000 },
  };
}

// CLI: node eval/law/impact.mjs smoke --stem eng --n 150 --M 8 --F 0 [--out file]
if (process.argv[1] === SELF_PATH) {
  const argv = process.argv.slice(2);
  const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i < 0 ? d : argv[i + 1]; };
  const cmd = argv[0];
  if (cmd === "smoke") {
    const out = smoke({ stem: arg("stem", "eng"), n: Number(arg("n", 150)), M: Number(arg("M", 8)), F: Number(arg("F", 0)), hapax: Number(arg("hapax", 30)) });
    const text = JSON.stringify(out, null, 2);
    if (arg("out", null)) fs.writeFileSync(arg("out", null), text);
    console.log(text);
  } else if (cmd === "header") console.log(headerSha256());
  else console.error("usage: node eval/law/impact.mjs smoke --stem eng [--n 150] [--M 8] [--F 0] [--hapax 30] [--out file] | header");
}
