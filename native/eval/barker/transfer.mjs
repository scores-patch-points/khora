// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══  eval/barker/transfer.mjs  (Barker, the transfer)
// Written BEFORE the first real-data run of this file. Consistent with docs/BARKER.md section 5 (L1-L4 and the gain
// rule 5.0), section 4.6 (replication unit, reachability), section 6.0 (SESOI, power trio) and the tests of 8.3.
// Where this header adds a conjunct to a BARKER.md rule it says so and the addition is STRICTER, never looser.
// Nothing below is a result. Smoke runs on DEV only; the held-out gold read anywhere in this module is `dev.conllu`.
//
// ── WHAT THIS MODULE IS ─────────────────────────────────────────────────────────────────────────────────────────────
// The LEARN-BETTER half of Barker (mandate C): does what induced KINDS of systems say about a system let us predict
// its parameters, its priors and its failures when the system was NOT in the induction, better than controls built to
// be beaten? One yes-or-no gain rule serves four tasks. A gain is claimed only against controls on held-out SYSTEMS,
// by whole BRANCH, judged by LINEAGE (the independence unit, U lineages; branches are blocking strata). The module
// emits a card, never a prose verdict. It makes no claim about EO and imports nothing EO-shaped; zero model, no
// network. The kinds it consumes are NOT its own claim: whether a kind is real is induce.mjs's question. Here a kind
// is a PREDICTOR whose only licence is out-of-system gain over (M0*, M4, shuffled labels) at a registered SESOI.
//
// ── TASKS ───────────────────────────────────────────────────────────────────────────────────────────────────────────
//  L1 transfer of a system's PARAMETERS (headline). Targets from the received priors/role-config-<stem>.json: object
//     before-share, subject before-share, object marker present, subject marker present, object reliability, subject
//     reliability, object dominant side before, subject dominant side before (8 targets). Loss = squared error (Brier
//     for the 0/1 targets). Predictors STRICT (primary): groups C, D, E, F plus a13..a22 and b01..b16, NO direction
//     feature a01..a12 (role-config is built from the same arcs). LEAKY (diagnostic, labelled, never headline): adds
//     a01..a12 (Greenberg/Dryer head-direction correlations are prior art for what it will predict).
//  L2 DERIVE the thresholds the reading types by hand. Registry (each outcome is implementable from UD gold, scored
//     on dev; the typed setting is reproduced as an integrity check): G-frame `min_frame = 5`
//     (scripts/build-frame-prior.mjs), G-floor `wordFloor(form, 3)` base (adapters/text/script-floor.js, a PROXY
//     outcome), G-volume `MIN_VOLUME = 20` (scripts/build-role-config.mjs; run only if its integrity check passes).
//     Grid = typed x 2^k, k = -2..4 (pre-registered; never extended after a run). tau*(s) = argmax Y on dev. FLATNESS
//     FIRST: a gate is INERT iff the paired-bootstrap difference Y(tau*) - Y(typed) is within its own SE for at least
//     the number of lineages that makes the sign test attainable (INERT counts as a positive result for the reading:
//     the typed number is harmless). Otherwise routes are compared by regret = Y(tau*) - Y(route): T0 typed, T1
//     median tau* of training systems (nested), T2 median tau* of the assigned KIND-mates (fallback T1), T3 log-linear
//     regression of log2 tau* on (log N, log vocabulary, zipf exponent) (the continuous comparator), T4 random-kind
//     mates (control). Baseline M0* = better of T0, T1. s_L = 0.01 regret in the outcome's own units.
//  L3 which PRIOR FAMILY to borrow: the non-lexical frame prior (build-frame-prior.mjs: UPOS of hapax forms by the
//     classes of their neighbours; the frame table crosses languages, the lexicon does not). Target: the held-out
//     language's own dev OOV tokens (lowercase form absent from its train), gold UPOS, context resolved through its own
//     train majority classes (count < 2 -> UNK, as the builder). Donor rules: D_global (all training systems),
//     D_script (training systems sharing the target's dominant derived Unicode script), D_family (LOSO only: the
//     target's own branch), D_kind (union of the kinds the target is a member of; unknown -> D_global, counted),
//     D_random (same donor count as D_kind, 1,000 draws), D_knn (3 nearest by standardised features, the continuous
//     comparator), D_oracle (best single donor in hindsight: an UPPER BOUND, never a claim). Donor prior = equal-weight
//     mixture of the donors' received priors/frame-<stem>.json cells (backoff P|N, P|*, *|N, *|*, additive smoothing
//     1/(17 x total)). Loss = mean cross-entropy bits per OOV token. Also reported: the VALUE OF TRANSFER n_even, the
//     number of the target's own train sentences (50, 200, 1,000, 5,000) at which its own table first beats the
//     borrowed one, and two reference rows (uniform over UPOS, own full-train table), never entering the rule.
//  L4 which RUNGS fail for a STRUCTURAL reason shared across a kind: outcomes from competence/r1..r4 cards (SUT output,
//     object of study, never gold): pass in {0,1} (null = MISSING, never 0), each gap reason as a 0/1 outcome defined for
//     every stem that has that rung's card, and r1 `needs_ear`. Question: do kinds induced WITHOUT the cards predict an
//     outcome better than script, branch and the continuous regressors? POSITIVE CONTROLS on real data (II.23): r3
//     `script_without_case` and r1 `ear_inert_not_needed` are known structural causes; they must be RECOVERED from
//     RAW-ONLY features (a21, c01..c04, d01..d06) before any other outcome is read; if not, L4 is UNDERPOWERED whatever
//     the other outcomes show. Loss = Brier.
//
// ── DEFINITIONS (everything is registered; nothing is chosen after a run) ────────────────────────────────────────────
//  SYSTEM: a language with a pinned train treebank and a dev file; id = stem; `kor` pairs with tb/kor-gsd (the treebank
//     its priors came from). LINEAGE (independence) and BRANCH (blocking) are ANSWER KEYS from transfer-data.mjs
//     GENEALOGY (Glottolog; typed by the author; never a feature). The data tree is growing: U is read from the data at
//     the run (12 lineages and 19 branches at the writing of this header, with the Dravidian pair excluded by the fixed
//     word budget N = 16,000), and every card prints the lineage count it actually used.
//  FOLDS: leave-one-BRANCH-out (primary; each IE branch is its own fold, so IE counts ONCE after nesting),
//     leave-one-LINEAGE-out and S-macro (IE to non-IE) as the stricter reports, leave-one-SYSTEM-out as a second
//     table (the only place M2 is defined). Everything fitted (bin cut points, kinds, regressors, lambda, taus) is
//     refitted on the training branches of the fold. Predictors are standardised and binned on TRAINING systems only.
//  NESTED MEAN: systems within a branch, branches within a lineage, lineages within the pool (a lineage is one vote).
//  KIND REPRESENTATION: a system is a vector over signatures `feature=lo|hi` (bins cut at the TRAINING median of the
//     pooled resamples of that feature); activity 1 + ln(count) over its ten resamples (5 seeds x halves A, B). The two
//     signatures of one feature are ONE block. Similarity = cosine. MEMBERSHIP (gated sources): mean cosine of the
//     held-out system to the kind's members, with the POPULATION null of organs/kind-standing.js::kindMembership (the
//     share of non-member training systems that fit the kind at least as well; member iff p < alpha); not_member or
//     unknown -> M0 and counted (`no_kind` rate is part of every card: a model that abstains on half the lineages has
//     not generalised). A held-out system's prediction = the loss of the BEST-FIT member kind's members (L3: the union
//     of its member kinds).
//  KIND SOURCES (the thing under test; each is run and printed on its own):
//     barker            organs/barker.js::induceSystemKinds, CLUSTER-labelled kinds ONLY (the registered primary). If the
//                       organ is absent at the run the card says so and NO registered gain can be claimed.
//     kanada-gated      kernel/entity-kind-induction.js::induceEntityKindCandidates on the signature index; only
//                       field.stable candidates, never fallbackNomination, never a basin larger than half the training
//                       population. EXPLORATORY: the organ's own per-basin null only (no search-aware ceiling). Its
//                       false-kind rate on block-permuted matrices is measured and printed on every card.
//     linkage-gated     average-linkage clustering on cosine distance of the signature vectors, k by maximum silhouette
//                       over 2..8, clusters of at least max(2, floor(sqrt(n)/2)) members. EXPLORATORY.
//     linkage-nearest   same clusters, assignment to the best-fit cluster with NO membership gate. EXPLORATORY; reported
//                       because the gate can only make a kind abstain, and the abstention is half the story.
//     Exploratory sources are not claims about kinds: their p-values are multiplied by the number of exploratory
//     sources tried (Bonferroni) before the within-task Holm. A card with only exploratory sources reads
//     `registered: false` and cannot support a statement of the form "Barker's kinds help".
//  MODELS: M0 = the better (hindsight, held-out) of global mean and lineage-mean-of-means; M1 = mean of the training
//     systems that share the target's DOMINANT derived Unicode script (global if none); M2 = mean of the target's own
//     training branch (LOSO only); M0* = best of M0, M1 (and M2 under LOSO) by nested held-out loss (hindsight: this
//     is conservative AGAINST the kinds); M3 = the kind model above (fallback M0); M4 = random kinds of the same size
//     profile dealt from the training systems, 1,000 draws, assigned by the SAME procedure; M5 = continuous regressors
//     on the same features: 3 nearest neighbours on z-scores, and kernel ridge (linear kernel; lambda in {1,10,100,
//     1e3,1e4} by leave-one-system-out via the hat-matrix identity inside the training fold; PROVISIONAL).
//  s_L (SESOI, PROVISIONAL until signed, BARKER Appendix B5): L1, L3, L4 = 5 percent of the nested held-out loss of M0*;
//     L2 = 0.01 regret in the outcome's own units. Sensitivity at half and double is printed, never selected from.
//
// ── THE GAIN RULE (BARKER 5.0; all conjuncts, all registered) ─────────────────────────────────────────────────────────
//  per-lineage gain g_l = loss_l(M0*) - loss_l(M3) (nested). Barker claims a GAIN on a target iff ALL of:
//   (a) the lineage-cluster bootstrap (B = 2,000, percentile) 95 percent interval of mean_l g_l has its LOWER bound
//       above s_L;
//   (b) loss(M3) is below the M4 draws (p = (1 + #{draws with loss <= loss(M3)}) / 1,001) AND, for scalar targets
//       (L1, L4; ADDED CONJUNCT, stricter than BARKER 5.0), the observed gain exceeds the gain of 999 SHUFFLED-LABEL
//       worlds (target values permuted across systems; the whole M0*/M3 evaluation repeated; p = (1 + #{gain_r >=
//       gain_obs}) / 1,000). Both p-values are Holm-adjusted within the task's targets, after the exploratory
//       Bonferroni factor;
//   (c) the sign gate: of the n_l lineages where the target is defined (ties count as not wins and stay in n_l), at
//       least the reachability count have g_l > 0: n_l = 9: 8, 8: 7, 7: 7, 6: 6, 5: 5, 10: 9, 11: 9, 12: 10, below 5:
//       UNREACHABLE (UNDERPOWERED by reachability). The sign test is a replication gate at alpha, NOT Holm-corrected;
//   (d) the gain survives (point estimate of the nested mean above s_L) after dropping any single LINEAGE and any
//       single BRANCH (jackknife);
//   (e) the power trio of the planted worlds (below): P_up >= 0.8 AND P_down >= 0.8, and the planted null world does
//       not reach GAIN at more than alpha.
//  VERDICT: INSTRUMENT_FAILED if a control built to fail survived (below). Else UNDERPOWERED by reachability if
//  n_l < 5. Else GAIN iff (a)-(e). Else NO_GAIN iff P_up and P_down hold and the interval's UPPER bound is below s_L.
//  Else UNDERPOWERED (the interval straddles s_L, or the instrument cannot resolve it), with the failed conjuncts
//  listed. If GAIN: "kinds help beyond a continuous regressor" iff loss(M3) <= loss(M5) + 1 SE, else "structure helps;
//  the kind is a summary of it, not the mechanism".
//
// ── CONTROLS BUILT TO FAIL (II.23; each must come out failing, else INSTRUMENT_FAILED) ────────────────────────────────
//  C1 SHUFFLED LABELS: target permuted across systems; the (a),(b1),(c),(d) conjunction must reach GAIN in no more than
//     alpha of 999 worlds (exact one-sided binomial test of "rate <= alpha"; M4 reduced to 200 draws in this control,
//     which only makes it more lenient, so a pass is an upper bound on the false-GAIN rate).
//  C2 RANDOM KINDS: the share of M4 draws that individually satisfy (a) and (c) must not be rejected as <= alpha.
//  C3 STRUCTURELESS FEATURES: the exploratory inducers on block-permuted signature matrices: the false-kind rate is
//     MEASURED and printed (the organ's probe: 9 of 40); a gain claimed from a source whose false-kind rate exceeds 0.15
//     is labelled `inducer_unresolved` and stays exploratory whatever (a)-(e) say.
//  C4 L4 POSITIVE CONTROLS (real data): see L4; a failure makes every other L4 outcome UNDERPOWERED.
//  C5 INTEGRITY (G0 pattern): the re-implemented frame builder reproduces the received frame-<stem>.json cells exactly
//     for every stem whose sentence and hapax counts equal the prior's own; the comparable count is printed; fewer than
//     10 comparable stems is UNDERPOWERED integrity, and L2/L3 cards say so.
//
// ── POWER CHECKS (a planted structure of the claimed kind must be detected by the same instrument) ─────────────────────
//  P_trio: on the task's REAL system set and lineage/branch structure (n and the lineage sizes of the data, not synthetic
//  sizes), plant 3 kinds spanning >= 3 lineages (size 15 percent of n each) with detectable signatures (24 features
//  shifted by 1.28 SD, strength 0.8: the strongest admissible cell of BARKER 4.4 and the only one a 33-system induction
//  can be expected to resolve), a target = kind mean + noise whose between-kind separation is CALIBRATED so that an
//  ORACLE kind predictor (true kinds, same folds) reduces M0* loss by exactly 2 s_L-relative (claim true), 0.5 s_L
//  (claim negligible) and 0. The WHOLE pipeline runs (bins, kind source, assignment, M4, shuffles, rule (a)-(d)).
//  P_up = rate of GAIN-conjuncts (a)-(d) at 2 s_L; P_down = rate at which the interval's upper bound is below s_L at
//  0.5 s_L; P_null = false GAIN rate at 0 (must be <= alpha by the exact binomial test). The planted kinds are
//  detectable BY CONSTRUCTION, so P_up measures "given detectable kinds, can the gain rule resolve a 2 s_L effect at this
//  n"; kind detectability itself is the BARKER 4.4 power grid (induce.mjs). A source whose planted P_up < 0.8 reads
//  UNDERPOWERED on every target; its real-data statistic is printed beside that label and never as a verdict.
//  L2 and L3 reuse the SAME planted scalar world on their own system sets (the rule's power is task-agnostic; only the
//  scorer differs); L2 additionally plants a known tau* dependence on a kind and requires the T2 route to recover it.
//
// ── TYPED NUMBERS (BARKER 3.8; every bare integer is PROVISIONAL) ────────────────────────────────────────────────────
//  alpha = adapters/text/keyness.js KEY_ALPHA (asserted); bootstrap B = 2,000; M4 draws 1,000; shuffle worlds 999;
//  planted reps 50 (CLI) ; seeds: SEED 20261005 mixed per purpose through kernel/rng.js; binning median (2 bins);
//  kNN k = 3; ridge grid {1,10,100,1e3,1e4}; membership alpha 0.05; Kanada defaults of the organ; linkage k <= 8;
//  L2 grid typed x 2^k (k -2..4); fixed word budget N = 16,000 (transfer-data.mjs); a feature undefined in more than
//  10 percent of the systems is DROPPED (typed gap) and a remaining undefined cell gets no signature and z = 0.
//  Each is printed in the card's `typed` block. None was chosen after a run.
//
// ── RECORDED PREDICTIONS (before any run; the architect's guesses, formed after reading the data inventory) ───────────
//  L1 strict: P(any target reaches GAIN (a)-(e) from the registered source) = 0.25 (BARKER 10.1); P(any target reaches
//     GAIN from any EXPLORATORY source) = 0.15 (Bonferroni, the SESOI and the P_down half of (e) make it harder);
//     P(UNDERPOWERED is the verdict on at least 6 of 8 targets) = 0.75; P(M5 beats M3 | a gain) = 0.75 (BARKER: 0.25 for
//     M3 <= M5). LEAKY: P(a continuous regressor beats M0* by (a)-(c) on objBeforeShare) = 0.70; strict: 0.35.
//  L2: P(at least one gate INERT) = 0.70; P(a derivation beats typed on at least one gate at GAIN) = 0.20 (BARKER 5.2).
//  L3: P(D_kind beats D_global at (a)-(d)) = 0.30 (BARKER 5.3); P(D_global or D_script beats uniform) = 0.99; P(the
//     target's own table at 1,000 sentences beats the best borrowed prior) = 0.90; P(D_oracle < D_global) = 1.
//  L4: P(kinds beat script on any outcome) = 0.10 (BARKER 5.4); P(both positive controls recovered) = 0.35 (r3 has about
//     11 cards).  Inducer calibration: P(kanada-gated false-kind rate >= 0.15) = 0.80.
//  Headline: the dominant reading will be "script, branch and a continuous regressor already hold what kinds hold, and at
//  this n the rule cannot say more", reported as such.
//
// ── SPLITS ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
//  Features: train split only. Held-out scoring: dev only. No profile, prior or table is built or compared on any other
//  split; this file never names one. (transfer-data.mjs::devPath throws for any split but the development one.)
//
// ── WHAT THIS MODULE CANNOT SAY ──────────────────────────────────────────────────────────────────────────────────────────
//  That a kind is real (induce.mjs); that a gain generalises beyond the sampled lineages (U is 12 at best, 8 are
//  singletons, 24+ of the languages are Indo-European, UD conventions are shared by every system: BARKER R2, R4, R5); that a
//  threshold is "right" (L2 scores a proxy outcome on one split); that a borrowed frame prior helps the READER (L3 scores
//  OOV UPOS cross-entropy, not the reading). A null result at this n is reported UNDERPOWERED, never "not falsified".
// ═══ END PRE-REGISTRATION ═══

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createSeededRng, shuffled } from "../../kernel/rng.js";
import { KEY_ALPHA, logBinomialUpperTail } from "../../adapters/text/keyness.js";
import { induceEntityKindCandidates } from "../../kernel/entity-kind-induction.js";
import { headerDigest } from "../competence/lib.mjs";
import { systemSummary, GATES, K_TYPED, lossOf, volumeIntegrity, loadSys } from "./transfer-gates.mjs";
import {
  OUT_DIR, N_BUDGET, LITE_STRICT, LITE_DIRECTION, GENEALOGY_GIVER, genealogyOf, discoverStems, buildLiteProfile,
  scriptShares, readRoleConfig, roleConfigTargets, L1_TARGETS, collectCardOutcomes, readFramePrior, readTreebank,
  trainPath, devPath, formTally, buildFrameTable, applyFloor, frameDist, oovTokens, uposIndex, UPOS, wordsIn, smoothedCell,
} from "./transfer-data.mjs";

export const TRANSFER_VERSION = "1";
export const SEED = 20261005;
export const ALPHA = KEY_ALPHA;
if (ALPHA !== 0.05) throw new Error("transfer: ALPHA must equal keyness KEY_ALPHA (0.05)");
export const BOOT_B = 2000;
export const M4_DRAWS = 1000;
export const SHUFFLES = 999;
export const PLANT_REPS = 30;
export const KNN_K = 3;
export const RIDGE_GRID = Object.freeze([1, 10, 100, 1e3, 1e4]);
export const SESOI_REL = 0.05;       // L1, L3, L4: 5 percent relative of loss(M0*)
export const SESOI_REGRET = 0.01;    // L2: regret in the outcome's own units
export const MEMBER_ALPHA = 0.05;
export const MIN_LINEAGES = 5;
export const FEATURE_DROP_SHARE = 0.10;
export const TYPED = Object.freeze({
  alpha: ALPHA, bootB: BOOT_B, m4Draws: M4_DRAWS, shuffles: SHUFFLES, plantReps: PLANT_REPS, knnK: KNN_K, ridgeGrid: RIDGE_GRID,
  sesoiRel: SESOI_REL, sesoiRegret: SESOI_REGRET, memberAlpha: MEMBER_ALPHA, bins: 2, featureDropShare: FEATURE_DROP_SHARE,
  wordBudget: N_BUDGET, seed: SEED, linkageKmax: 8, minLineages: MIN_LINEAGES,
});

const HERE = path.dirname(new URL(import.meta.url).pathname);
export const registryDigest = () => headerDigest(path.join(HERE, "transfer.mjs"));

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 1. STATISTICS (pure; identical in meaning to the organs/barker.js contract so a later swap is a one-line change)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
export const mean = (xs) => { let s = 0, n = 0; for (const x of xs) if (Number.isFinite(x)) { s += x; n++; } return n ? s / n : NaN; };
export const median = (xs) => { const a = xs.filter(Number.isFinite).sort((x, y) => x - y); if (!a.length) return NaN; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
export const quantile = (sortedAsc, q) => { if (!sortedAsc.length) return NaN; const r = q * (sortedAsc.length - 1), lo = Math.floor(r), hi = Math.min(lo + 1, sortedAsc.length - 1); return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (r - lo); };
export const sd = (xs) => { const v = xs.filter(Number.isFinite); if (v.length < 2) return NaN; const m = mean(v); return Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / (v.length - 1)); };

/** Exact binomial upper tail P(X >= k | n, p0). */
export function signTestP(k, n, p0 = 0.5) { return n <= 0 ? 1 : k <= 0 ? 1 : Math.exp(logBinomialUpperTail(k, n, p0)); }
/** Reachability (BARKER 4.6): the sign test cannot reach alpha below 5 defined lineages. */
export function reachability(nLineages, alpha = ALPHA) {
  const minP = Math.pow(0.5, nLineages);
  if (!(nLineages >= 1) || minP > alpha) return { unreachable: true, minP };
  let k = 0;
  for (let j = 0; j <= nLineages; j++) if (signTestP(j, nLineages) <= alpha) { k = j; break; }
  return { minP, kNeeded: k, p: signTestP(k, nLineages) };
}
/** Holm step-down: boolean[] reject flags at familywise alpha. */
export function holm(ps, alpha = ALPHA) {
  const idx = ps.map((p, i) => [p, i]).filter(([p]) => Number.isFinite(p)).sort((a, b) => a[0] - b[0]);
  const rej = ps.map(() => false);
  const m = idx.length;
  for (let r = 0; r < m; r++) { if (idx[r][0] <= alpha / (m - r)) rej[idx[r][1]] = true; else break; }
  return rej;
}
/** Percentile bootstrap of the mean over clusters (lineages). */
export function clusterBootstrap(values, { B = BOOT_B, seed = SEED, purpose = "boot" } = {}) {
  const v = values.filter(Number.isFinite);
  const n = v.length;
  if (!n) return { est: NaN, ci95: [NaN, NaN], n: 0 };
  const rng = createSeededRng({ seed, purpose });
  const means = new Float64Array(B);
  for (let b = 0; b < B; b++) { let s = 0; for (let i = 0; i < n; i++) s += v[Math.floor(rng() * n)]; means[b] = s / n; }
  const sorted = Array.from(means).sort((a, b) => a - b);
  return { est: mean(v), ci95: [quantile(sorted, 0.025), quantile(sorted, 0.975)], n };
}
/** Exact (n <= 18) or sampled sign-flip permutation p of "mean > 0" for paired per-lineage differences. */
export function signFlipP(diffs, { draws = 20000, seed = SEED } = {}) {
  const d = diffs.filter((x) => Number.isFinite(x) && x !== 0);
  const n = d.length;
  if (!n) return 1;
  const obs = d.reduce((a, b) => a + b, 0);
  if (n <= 18) { let ge = 0; const tot = 1 << n; for (let m = 0; m < tot; m++) { let s = 0; for (let i = 0; i < n; i++) s += m & (1 << i) ? d[i] : -d[i]; if (s >= obs - 1e-12) ge++; } return ge / tot; }
  const rng = createSeededRng({ seed, purpose: "signflip" });
  let ge = 0;
  for (let t = 0; t < draws; t++) { let s = 0; for (let i = 0; i < n; i++) s += rng() < 0.5 ? d[i] : -d[i]; if (s >= obs - 1e-12) ge++; }
  return (ge + 1) / (draws + 1);
}

/**
 * nestedMean(valuesBySystem, branchOf, lineageOf): systems -> branches -> lineages. valuesBySystem is {id:number}|Map; NaN is
 * undefined and skipped. Returns { perBranch, perLineage, mean } (Maps keyed by branch / lineage).
 */
export function nestedMean(valuesBySystem, branchOf, lineageOf) {
  const entries = valuesBySystem instanceof Map ? [...valuesBySystem] : Object.entries(valuesBySystem);
  const byBranch = new Map();
  for (const [id, v] of entries) { if (!Number.isFinite(v)) continue; const b = branchOf[id] ?? branchOf.get?.(id); (byBranch.get(b) ?? byBranch.set(b, []).get(b)).push(v); }
  const perBranch = new Map([...byBranch].map(([b, vs]) => [b, mean(vs)]));
  const lineageBranches = new Map();
  for (const b of perBranch.keys()) {
    const sample = entries.find(([id]) => (branchOf[id] ?? branchOf.get?.(id)) === b)[0];
    const l = lineageOf[sample] ?? lineageOf.get?.(sample);
    (lineageBranches.get(l) ?? lineageBranches.set(l, []).get(l)).push(perBranch.get(b));
  }
  const perLineage = new Map([...lineageBranches].map(([l, bs]) => [l, mean(bs)]));
  return { perBranch, perLineage, mean: mean([...perLineage.values()]) };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 2. DATASET: systems x features, with genealogy answer keys carried separately
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/**
 * makeDataset({ ids, lineage, branch, macro, script, scriptShares, features:[id], value: n x F (NaN missing),
 *               resamp: n x F x R (NaN missing) }) -> the frozen shape every function below consumes.
 * Dense integer indices for lineage and branch are derived; the keys themselves stay strings for printing.
 */
export function makeDataset({ ids, lineage, branch, macro = null, script = null, scriptSharesBy = null, features, value, resamp, gaps = [], meta = {} }) {
  const n = ids.length, F = features.length;
  const lineages = [...new Set(lineage)], branches = [...new Set(branch)];
  const lineageIdx = Int32Array.from(lineage, (l) => lineages.indexOf(l));
  const branchIdx = Int32Array.from(branch, (b) => branches.indexOf(b));
  const branchLineage = branches.map((b) => lineageIdx[branch.indexOf(b)]);
  const R = resamp ? resamp.length / (n * F) : 0;
  return Object.freeze({
    ids, n, F, features, lineage, branch, macro: macro ?? lineage.map(() => null), script: script ?? ids.map(() => null), scriptSharesBy,
    lineages, branches, lineageIdx, branchIdx, branchLineage, nLineages: lineages.length, nBranches: branches.length,
    value, resamp, R, gaps, meta,
  });
}
const idxOf = (ds, id) => ds.ids.indexOf(id);

/**
 * Feature selection by set name, as a predicate on a cell id (so the lite stand-in and the real SystemProfile@1 objects are filtered by the SAME rule).
 * strict (BARKER 5.1): groups C, D, E, F plus a13..a21 and b01..b16, NO direction feature a01..a12; dev-derived cells e03..e06 are never predictors
 * (a target scored on dev must not see dev). leaky (diagnostic, labelled) adds a01..a12. raw (the L4 positive controls): a21, c01..c04, d01..d06.
 */
const strictId = (id) => /^a(1[3-9]|2[01])$/.test(id) || /^b(0[1-9]|1[0-6])$/.test(id) || /^[cdf]\d/.test(id) || (/^e\d/.test(id) && !/^e0[3-6]$/.test(id));
export const FEATURE_SETS = Object.freeze({
  strict: strictId,
  leaky: (id) => strictId(id) || /^a(0[1-9]|1[0-2])$/.test(id),
  raw: (id) => id === "a21" || /^c0[1-4]$/.test(id) || /^d0[1-6]$/.test(id),
});
const natural = (a, b) => a.localeCompare(b, "en", { numeric: true });

/**
 * from profile-shaped objects { stem, labels:{lineage,branch,macro,script,scriptShares}, values:{id:number}, resamples:{id:[..]}, builder, gap? } to a Dataset.
 * A cell id is a candidate iff the set's predicate admits it; `excludeIds` removes cells another instrument has labelled UNDERPOWERED.
 */
export function datasetFromProfiles(profiles, { featureSet = "strict", requireIds = null, excludeIds = [], minCompleteness = 0.8 } = {}) {
  const gaps = profiles.filter((p) => p.gap).map((p) => ({ system: p.stem, ...p.gap }));
  const ok = profiles.filter((p) => !p.gap && p.values && (!requireIds || requireIds.includes(p.stem)));
  const pred = FEATURE_SETS[featureSet];
  if (!pred) throw new Error(`datasetFromProfiles: unknown feature set "${featureSet}"`);
  const universe = new Set(); for (const p of ok) for (const id of Object.keys(p.values)) if (pred(id) && !excludeIds.includes(id)) universe.add(id);
  const wanted = [...universe].sort(natural);
  // a system that defines fewer than `minCompleteness` of the candidate cells is a typed gap (a priors-only or below-budget profile), never imputed
  const complete = ok.filter((p) => !wanted.length || wanted.filter((f) => Number.isFinite(p.values[f])).length / wanted.length >= minCompleteness);
  for (const p of ok) if (!complete.includes(p)) gaps.push({ system: p.stem, reason: "profile_incomplete", denominator: { have: wanted.filter((f) => Number.isFinite(p.values[f])).length, need: wanted.length } });
  // drop features undefined in more than FEATURE_DROP_SHARE of systems (a typed gap, never imputed as supported)
  const keep = [];
  for (const f of wanted) {
    const have = complete.filter((p) => p.values[f] != null && Number.isFinite(p.values[f])).length;
    if (complete.length && (complete.length - have) / complete.length > FEATURE_DROP_SHARE) gaps.push({ feature: f, reason: "undefined_in_more_than_10_percent_of_systems", denominator: { have, need: complete.length } });
    else keep.push(f);
  }
  const n = complete.length, F = keep.length, R = 10;
  const value = new Float64Array(n * F).fill(NaN), resamp = new Float64Array(n * F * R).fill(NaN);
  complete.forEach((p, i) => keep.forEach((f, j) => {
    const v = p.values[f]; if (v != null && Number.isFinite(v)) value[i * F + j] = v;
    const rs = p.resamples?.[f]; if (rs) for (let r = 0; r < Math.min(R, rs.length); r++) { const x = rs[r]; if (x != null && Number.isFinite(x)) resamp[(i * F + j) * R + r] = x; }
  }));
  return makeDataset({
    ids: complete.map((p) => p.stem), lineage: complete.map((p) => p.labels.lineage), branch: complete.map((p) => p.labels.branch), macro: complete.map((p) => p.labels.macro),
    script: complete.map((p) => p.labels.script), scriptSharesBy: complete.map((p) => p.labels.scriptShares), features: keep, value, resamp, gaps,
    meta: { featureSet, profileSource: complete[0]?.builder ?? null, giver: GENEALOGY_GIVER, excludedByPowerStatus: excludeIds },
  });
}
export function subsetDataset(ds, keepIdx) {
  const idx = [...keepIdx];
  const n = idx.length, F = ds.F, R = ds.R;
  const value = new Float64Array(n * F), resamp = new Float64Array(n * F * R);
  idx.forEach((i, k) => { for (let j = 0; j < F; j++) { value[k * F + j] = ds.value[i * F + j]; for (let r = 0; r < R; r++) resamp[(k * F + j) * R + r] = ds.resamp[(i * F + j) * R + r]; } });
  return makeDataset({
    ids: idx.map((i) => ds.ids[i]), lineage: idx.map((i) => ds.lineage[i]), branch: idx.map((i) => ds.branch[i]), macro: idx.map((i) => ds.macro[i]),
    script: idx.map((i) => ds.script[i]), scriptSharesBy: ds.scriptSharesBy ? idx.map((i) => ds.scriptSharesBy[i]) : null, features: ds.features, value, resamp, gaps: ds.gaps, meta: ds.meta,
  });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 3. FOLDS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/**
 * lofoFolds(dataset, { by }) -> [{ fold, train:[idx], test:[idx] }]. "branch" = leave-one-BRANCH-out (the primary, aggregated by
 * nestedMean to lineages), "lineage" = leave-one-LINEAGE-out, "macro" = train IE test non-IE, "system" = leave-one-SYSTEM-out.
 */
export function lofoFolds(ds, { by = "branch" } = {}) {
  const all = Array.from({ length: ds.n }, (_, i) => i);
  const group = (keyOf) => {
    const keys = [...new Set(all.map(keyOf))];
    return keys.map((k) => ({ fold: String(k), train: all.filter((i) => keyOf(i) !== k), test: all.filter((i) => keyOf(i) === k) }));
  };
  if (by === "branch") return group((i) => ds.branch[i]);
  if (by === "lineage") return group((i) => ds.lineage[i]);
  if (by === "system") return group((i) => ds.ids[i]);
  if (by === "macro") {
    const ie = all.filter((i) => ds.macro[i] === "IE"), non = all.filter((i) => ds.macro[i] !== "IE");
    return [{ fold: "IE->nonIE", train: ie, test: non }]; // the reverse (8 train, 24 test) is underpowered by design and is not run
  }
  throw new Error(`lofoFolds: unknown split "${by}"`);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 4. SIGNATURES, COSINE, KINDS, MEMBERSHIP
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** the fold's cut points (median of the pooled TRAINING resamples of each feature) */
export function foldCuts(ds, trainIdx) {
  const cuts = new Float64Array(ds.F).fill(NaN);
  for (let j = 0; j < ds.F; j++) {
    const pool = [];
    for (const i of trainIdx) for (let r = 0; r < ds.R; r++) { const x = ds.resamp[(i * ds.F + j) * ds.R + r]; if (Number.isFinite(x)) pool.push(x); }
    cuts[j] = median(pool);
  }
  return cuts;
}
/** signature vectors (2F, activity 1 + ln count) and counts for ALL systems, binned with the given cuts */
export function signatureVectors(ds, cuts) {
  const D = 2 * ds.F;
  const vec = new Float64Array(ds.n * D), cnt = new Int16Array(ds.n * D);
  for (let i = 0; i < ds.n; i++) for (let j = 0; j < ds.F; j++) {
    const c = cuts[j]; if (!Number.isFinite(c)) continue;
    let lo = 0, hi = 0;
    for (let r = 0; r < ds.R; r++) { const x = ds.resamp[(i * ds.F + j) * ds.R + r]; if (!Number.isFinite(x)) continue; if (x > c) hi++; else lo++; }
    cnt[i * D + 2 * j] = lo; cnt[i * D + 2 * j + 1] = hi;
    vec[i * D + 2 * j] = lo ? 1 + Math.log(lo) : 0; vec[i * D + 2 * j + 1] = hi ? 1 + Math.log(hi) : 0;
  }
  return { vec, cnt, D };
}
export function cosineMatrix(vec, n, D) {
  const norm = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let d = 0; d < D; d++) s += vec[i * D + d] ** 2; norm[i] = Math.sqrt(s); }
  const M = new Float64Array(n * n);
  for (let a = 0; a < n; a++) for (let b = a; b < n; b++) {
    let s = 0; for (let d = 0; d < D; d++) s += vec[a * D + d] * vec[b * D + d];
    const c = norm[a] && norm[b] ? s / (norm[a] * norm[b]) : 0;
    M[a * n + b] = c; M[b * n + a] = c;
  }
  return M;
}
/** z-score matrix over the TRAINING systems (missing -> 0) for the continuous comparators */
export function zMatrix(ds, trainIdx) {
  const mu = new Float64Array(ds.F), sg = new Float64Array(ds.F);
  for (let j = 0; j < ds.F; j++) {
    const xs = trainIdx.map((i) => ds.value[i * ds.F + j]).filter(Number.isFinite);
    mu[j] = mean(xs); sg[j] = sd(xs) || 1;
  }
  const Z = new Float64Array(ds.n * ds.F);
  for (let i = 0; i < ds.n; i++) for (let j = 0; j < ds.F; j++) { const x = ds.value[i * ds.F + j]; Z[i * ds.F + j] = Number.isFinite(x) && Number.isFinite(mu[j]) ? (x - mu[j]) / sg[j] : 0; }
  return Z;
}

const meanFit = (cos, n, h, members) => { let s = 0; for (const m of members) s += cos[h * n + m]; return s / members.length; };
/** population null of one kind: how well every NON-member training system fits it (kindMembership's own null) */
function populationFits(cos, n, trainIdx, members) {
  const mem = new Set(members);
  const out = [];
  for (const y of trainIdx) { if (mem.has(y)) continue; const others = members.filter((m) => m !== y); if (others.length) out.push(meanFit(cos, n, y, others)); }
  return out;
}
/**
 * assignment of a held-out system to kinds. gated: member iff p < alpha against the population null; nearest: no gate.
 * Returns the kinds it is a member of sorted by fit (best first); [] means no_kind.
 */
export function assignKinds(h, kinds, cos, n, { gated = true, alpha = MEMBER_ALPHA } = {}) {
  const res = [];
  for (let k = 0; k < kinds.length; k++) {
    const kind = kinds[k];
    if (!kind.members.length) continue;
    const fit = meanFit(cos, n, h, kind.members);
    if (!gated) { res.push({ k, fit, p: null }); continue; }
    const pop = kind.pop;
    if (!pop || pop.length < 2) continue;
    let above = 0; for (const v of pop) if (v >= fit) above++;
    const p = above / pop.length;
    if (p < alpha) res.push({ k, fit, p });
  }
  res.sort((a, b) => b.fit - a.fit);
  return res;
}
const withPop = (kinds, cos, n, trainIdx) => kinds.map((kd) => ({ ...kd, pop: populationFits(cos, n, trainIdx, kd.members) }));

// ── kind source: Kanada (the repo's organ), organ null only, EXPLORATORY ─────────────────────────────────────────────
function entityFeatureMap(ds, trainIdx, cnt, D, cuts) {
  const ef = new Map();
  for (const i of trainIdx) {
    const rec = new Map();
    for (let j = 0; j < ds.F; j++) for (const [b, name] of [[0, "lo"], [1, "hi"]]) {
      const c = cnt[i * D + 2 * j + b]; if (!c) continue;
      const sig = `${ds.features[j]}=${name}`;
      rec.set(sig, { signature: sig, featureKey: ds.features[j], featureValue: name, firstAt: 0, lastAt: 0, evidenceIds: new Set(Array.from({ length: c }, (_, r) => `${ds.ids[i]}:${ds.features[j]}:${r}`)), witnessRefs: new Set([ds.ids[i]]) });
    }
    ef.set(ds.ids[i], rec);
  }
  return ef;
}
export function kanadaKinds(ds, trainIdx, { cnt, D, cuts, population = "systems" }) {
  const ef = entityFeatureMap(ds, trainIdx, cnt, D, cuts);
  const res = induceEntityKindCandidates(ef, { population });
  const n = trainIdx.length;
  const kept = [];
  for (const c of res.candidates) {
    if (c.fallbackNomination) continue;               // never read (BARKER 2.4)
    if (c.field?.stable !== true) continue;
    if (c.memberCount > Math.floor(n / 2)) continue;   // a basin larger than its complement is judged as its complement (S41)
    kept.push({ members: c.memberRefs.map((r) => idxOf(ds, r)), source: "kanada" });
  }
  return { kinds: kept, diagnostics: res.diagnostics };
}

// ── kind source: average-linkage clustering on cosine distance, k by silhouette, EXPLORATORY ─────────────────────────────
export function linkageKinds(trainIdx, cos, n, { kmax = 8, minSize = null } = {}) {
  const m = trainIdx.length;
  const minKind = minSize ?? Math.max(2, Math.floor(Math.sqrt(m) / 2));
  let clusters = trainIdx.map((i) => [i]);
  const dist = (A, B) => { let s = 0; for (const a of A) for (const b of B) s += 1 - cos[a * n + b]; return s / (A.length * B.length); };
  const partitions = new Map();
  partitions.set(clusters.length, clusters.map((c) => c.slice()));
  while (clusters.length > 2) {
    let bi = 0, bj = 1, bd = Infinity;
    for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) { const d = dist(clusters[i], clusters[j]); if (d < bd) { bd = d; bi = i; bj = j; } }
    clusters = clusters.filter((_, k) => k !== bi && k !== bj).concat([clusters[bi].concat(clusters[bj])]);
    partitions.set(clusters.length, clusters.map((c) => c.slice()));
  }
  let best = null;
  for (let k = 2; k <= Math.min(kmax, m - 1); k++) {
    const part = partitions.get(k); if (!part) continue;
    const label = new Map(); part.forEach((c, ci) => c.forEach((i) => label.set(i, ci)));
    let s = 0, cnt = 0;
    for (const i of trainIdx) {
      const own = part[label.get(i)];
      if (own.length < 2) continue;
      const a = own.filter((x) => x !== i).reduce((acc, x) => acc + (1 - cos[i * n + x]), 0) / (own.length - 1);
      let b = Infinity;
      part.forEach((c, ci) => { if (ci === label.get(i)) return; const d = c.reduce((acc, x) => acc + (1 - cos[i * n + x]), 0) / c.length; if (d < b) b = d; });
      const sil = (b - a) / Math.max(a, b || 1e-12);
      s += sil; cnt++;
    }
    const sil = cnt ? s / cnt : -1;
    if (!best || sil > best.sil) best = { k, sil, part };
  }
  if (!best) return { kinds: [], diagnostics: { silhouette: null } };
  return { kinds: best.part.filter((c) => c.length >= minKind).map((c) => ({ members: c, source: "linkage" })), diagnostics: { k: best.k, silhouette: best.sil } };
}

/** the organ (organs/barker.js) if it exists at the run; the module is built concurrently, so absence is a typed state */
let barkerOrgan = undefined;
export async function loadBarkerOrgan() {
  if (barkerOrgan !== undefined) return barkerOrgan;
  try { const m = await import("../../organs/barker.js"); barkerOrgan = typeof m.induceSystemKinds === "function" ? m : null; } catch { barkerOrgan = null; }
  return barkerOrgan;
}
/**
 * adapter to organs/barker.js (BARKER 8.1): block matrix from the TRAINING systems' continuous values and resamples (bins cut at the
 * training median by the organ itself), then induceSystemKinds under the search-aware ceiling; CLUSTER-labelled kinds ONLY.
 * The organ's own control (block-permuted copies) is not re-run per fold (controlReps 0: it is induce.mjs's control and costs minutes
 * per fold); the card says so.
 */
export function barkerKinds(organ, ds, trainIdx, { draws = 99, instruments = null, nulls = null, fold = "S" } = {}) {
  const ids = trainIdx.map((i) => ds.ids[i]);
  const rows = trainIdx.map((i) => Array.from({ length: ds.F }, (_, j) => ds.value[i * ds.F + j]));
  const resamples = trainIdx.map((i) => Array.from({ length: ds.F }, (_, j) => Array.from({ length: ds.R }, (_, r) => ds.resamp[(i * ds.F + j) * ds.R + r]).filter(Number.isFinite)));
  const bm = organ.blockMatrixFromValues(rows, { ids, featureKeys: ds.features, bins: 2, resamples, branches: trainIdx.map((i) => ds.branch[i]), lineages: trainIdx.map((i) => ds.lineage[i]) });
  const opts = { draws, controlReps: 0, neighborSweep: false, branches: bm.branches, lineages: bm.lineages, population: `transfer:${fold}`, group: "strict" };
  if (instruments) opts.instruments = instruments;
  if (nulls) opts.nulls = nulls;
  const res = organ.induceSystemKinds(bm, opts);
  const kinds = [];
  for (const k of res.kinds ?? []) {
    if (k.status !== "CLUSTER") continue;
    const members = (k.smallerSide ?? k.memberRefs ?? []).map((r) => idxOf(ds, String(r))).filter((x) => x >= 0);
    if (members.length) kinds.push({ members, source: "barker", instrument: k.instrument, id: k.id });
  }
  return { kinds, diagnostics: { refused: res.refused ?? [], tried: res.diagnostics?.tried, statuses: (res.kinds ?? []).map((k) => k.status), draws } };
}

const dsKeyCache = new WeakMap();
/** a content key of a dataset (ids, features, values): the memo and the organ's disk cache are keyed by it, so a changed profile never reuses a stale kind set */
export function dsKey(ds) {
  let k = dsKeyCache.get(ds);
  if (!k) { const h = createHash("sha256"); h.update(JSON.stringify([ds.ids, ds.features, ds.lineage, ds.branch])); h.update(Buffer.from(ds.value.buffer, ds.value.byteOffset, ds.value.byteLength)); h.update(Buffer.from(ds.resamp.buffer, ds.resamp.byteOffset, ds.resamp.byteLength)); k = h.digest("hex").slice(0, 16); dsKeyCache.set(ds, k); }
  return k;
}
const MODEL_MEMO = new Map();
/** fold models are target-independent, so every task that shares a dataset, a split and a source shares them */
export function modelsFor(ds, folds, opts) {
  const key = `${dsKey(ds)}|${folds.map((f) => f.fold).join(",")}|${opts.source}|${opts.m4Draws}|${opts.seed ?? SEED}`;
  if (!MODEL_MEMO.has(key)) MODEL_MEMO.set(key, buildFoldModels(ds, folds, opts));
  return MODEL_MEMO.get(key);
}

export const KIND_SOURCES = Object.freeze({
  barker: { registered: true, gated: true },
  oracle: { registered: false, gated: true, planted: true }, // planted worlds only: the true kinds are supplied (an upper bound on any source)
  "kanada-gated": { registered: false, gated: true },
  "linkage-gated": { registered: false, gated: true },
  "linkage-nearest": { registered: false, gated: false },
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 5. FOLD MODELS: everything that does not depend on the target (kinds, assignments, random-kind draws, neighbours)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function sizeProfile(kinds) { return kinds.map((k) => k.members.length); }
function dealRandomKinds(trainIdx, sizes, rng) {
  const pool = shuffled(trainIdx, rng);
  const out = []; let at = 0;
  for (const s of sizes) { if (at + s > pool.length) { out.push({ members: shuffled(trainIdx, rng).slice(0, s) }); continue; } out.push({ members: pool.slice(at, at + s) }); at += s; }
  return out;
}

/**
 * buildFoldModels(ds, folds, { source, organ, m4Draws, seed }) -> per fold, everything target-independent:
 *   { fold, train, test, kinds:[{members}], assign: Map(h -> [{k,fit,p}]), m4: Int32Array? , knn: Map(h -> [3 idx]), Z, noKindRate }
 * m4assign[d] is a Map(h -> member list of the best-fit random kind, or null).
 */
export function buildFoldModels(ds, folds, { source = "kanada-gated", organ = null, m4Draws = M4_DRAWS, seed = SEED, knnK = KNN_K, truthKinds = null, barkerDraws = 99, cacheDir = null } = {}) {
  const spec = KIND_SOURCES[source];
  if (!spec) throw new Error(`buildFoldModels: unknown kind source "${source}"`);
  const out = [];
  for (const f of folds) {
    const cuts = foldCuts(ds, f.train);
    const { vec, cnt, D } = signatureVectors(ds, cuts);
    const cos = cosineMatrix(vec, ds.n, D);
    let kr;
    if (source === "kanada-gated") kr = kanadaKinds(ds, f.train, { cnt, D, cuts, population: `fold:${f.fold}` });
    else if (source === "linkage-gated" || source === "linkage-nearest") kr = linkageKinds(f.train, cos, ds.n, {});
    else if (source === "barker") {
      if (!organ) throw new Error("buildFoldModels: source barker requested but organs/barker.js is absent");
      const cf = cacheDir ? path.join(cacheDir, `barker-kinds-${dsKey(ds)}-${createHash("sha256").update(`${f.fold}|${barkerDraws}`).digest("hex").slice(0, 10)}.json`) : null;
      if (cf && fs.existsSync(cf)) { const c = JSON.parse(fs.readFileSync(cf, "utf8")); kr = { kinds: c.kinds.map((k) => ({ ...k, members: k.memberIds.map((id) => idxOf(ds, id)) })), diagnostics: { ...c.diagnostics, fromCache: true } }; }
      else {
        kr = barkerKinds(organ, ds, f.train, { draws: barkerDraws, fold: f.fold });
        if (cf) { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(cf, JSON.stringify({ kinds: kr.kinds.map((k) => ({ source: k.source, instrument: k.instrument, id: k.id, memberIds: k.members.map((i) => ds.ids[i]) })), diagnostics: kr.diagnostics })); }
      }
    }
    else if (source === "oracle") {
      if (!truthKinds) throw new Error("buildFoldModels: source oracle needs truthKinds (planted worlds only)");
      const K = Math.max(...truthKinds) + 1; const ks = [];
      for (let k = 0; k < K; k++) { const members = f.train.filter((i) => truthKinds[i] === k); if (members.length >= 2) ks.push({ members, source: "oracle" }); }
      kr = { kinds: ks, diagnostics: { oracle: true } };
    }
    const kinds = withPop(kr.kinds, cos, ds.n, f.train);
    const assign = new Map();
    const rng = createSeededRng({ seed, purpose: "m4", fold: f.fold, source });
    const sizes = sizeProfile(kinds);
    const m4 = [];
    if (source === "oracle") {
      // an UPPER BOUND on every source: the true kinds AND the true assignment; the control relabels the kind membership of all systems at random
      for (const h of f.test) assign.set(h, truthKinds[h] >= 0 ? [{ k: kinds.findIndex((kd) => kd.members.some((m) => truthKinds[m] === truthKinds[h])), fit: 1, p: 0 }].filter((a) => a.k >= 0) : []);
      for (let d = 0; d < m4Draws; d++) {
        const perm = shuffled(Array.from({ length: ds.n }, (_, i) => truthKinds[i]), rng);
        const mp = new Map();
        for (const h of f.test) {
          if (perm[h] < 0) { mp.set(h, []); continue; }
          const members = f.train.filter((i) => perm[i] === perm[h]);
          mp.set(h, members.length ? [{ k: perm[h], fit: 1, p: 0, members }] : []);
        }
        m4.push(mp);
      }
    } else {
      for (const h of f.test) assign.set(h, assignKinds(h, kinds, cos, ds.n, { gated: spec.gated }));
    }
    // random kinds of the same size profile, same assignment procedure
    if (source !== "oracle" && sizes.length) for (let d = 0; d < m4Draws; d++) {
      const rk = withPop(dealRandomKinds(f.train, sizes, rng), cos, ds.n, f.train);
      const mp = new Map();
      for (const h of f.test) mp.set(h, assignKinds(h, rk, cos, ds.n, { gated: spec.gated }).map((a) => ({ ...a, members: rk[a.k].members })));
      m4.push(mp);
    }
    // continuous comparators
    const Z = zMatrix(ds, f.train);
    const knn = new Map();
    for (const h of f.test) {
      const ds2 = f.train.map((i) => { let s = 0; for (let j = 0; j < ds.F; j++) s += (Z[h * ds.F + j] - Z[i * ds.F + j]) ** 2; return [s, i]; }).sort((a, b) => a[0] - b[0]);
      knn.set(h, ds2.slice(0, knnK).map((x) => x[1]));
    }
    const abstain = f.test.filter((h) => !assign.get(h).length).length;
    out.push({ ...f, kinds, assign, m4, sizes, Z, knn, cos, cuts, diagnostics: kr.diagnostics, noKind: abstain });
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 6. SCORERS AND MODEL EVALUATION (one machinery; a scorer says what a donor SET is worth to a target)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** nested weights over a training index list (a lineage is one vote, a branch one vote inside it) */
export function nestedWeights(ds, idxs) {
  const byL = new Map();
  for (const i of idxs) { const l = ds.lineageIdx[i], b = ds.branchIdx[i]; const bm = byL.get(l) ?? byL.set(l, new Map()).get(l); (bm.get(b) ?? bm.set(b, []).get(b)).push(i); }
  const w = new Map();
  const nL = byL.size;
  for (const bm of byL.values()) { const nB = bm.size; for (const members of bm.values()) for (const i of members) w.set(i, 1 / (nL * nB * members.length)); }
  return w;
}

/** nested lineage means of a per-system loss array; `drop` removes one lineage or branch for the jackknife */
export function lossByLineage(ds, loss, { dropLineage = -1, dropBranch = -1, only = null } = {}) {
  const nB = ds.nBranches;
  const bs = new Float64Array(nB), bn = new Int32Array(nB);
  for (let i = 0; i < ds.n; i++) {
    const v = loss[i];
    if (!(v === v) || v === Infinity || v === -Infinity) continue;
    if (only && !only.has(i)) continue;
    const b = ds.branchIdx[i];
    if (ds.lineageIdx[i] === dropLineage || b === dropBranch) continue;
    bs[b] += v; bn[b]++;
  }
  const ls = new Float64Array(ds.nLineages), lc = new Int32Array(ds.nLineages);
  for (let b = 0; b < nB; b++) if (bn[b]) { const l = ds.branchLineage[b]; ls[l] += bs[b] / bn[b]; lc[l]++; }
  const per = new Float64Array(ds.nLineages).fill(NaN);
  for (let l = 0; l < ds.nLineages; l++) if (lc[l]) per[l] = ls[l] / lc[l];
  return per;
}
export const lineageMean = (per) => mean(Array.from(per));

/**
 * evalScalar(ds, models, y, { loss }) -> per-system loss arrays for every model, for ONE scalar target y (NaN undefined).
 * scorer: the loss of predicting y[h] by the weighted mean of y over a donor set.
 */
export function scalarScorer(y, kind = "sq") {
  return (h, idx, w = null) => {
    let s = 0, ws = 0;
    for (let a = 0; a < idx.length; a++) { const v = y[idx[a]]; if (!Number.isFinite(v)) continue; const wt = w ? w[a] : 1; s += wt * v; ws += wt; }
    if (!ws || !Number.isFinite(y[h])) return NaN;
    const p = s / ws;
    return kind === "brier" ? (y[h] - Math.min(1, Math.max(0, p))) ** 2 : (y[h] - p) ** 2;
  };
}

/**
 * evalModels(ds, models, scorer, { loso, fallbackM0 }) -> { loss: {M0g, M0l, M1, M2?, M0, M0star, M3, M5knn}, loss4: Float64Array(D x n), noKind, m0name, m0starName }
 * The scorer takes (h, idx[], w[]|null) and returns a loss or NaN.
 */
export function evalModels(ds, models, scorer, { loso = false, m3Union = false } = {}) {
  const n = ds.n;
  const L = { M0g: new Float64Array(n).fill(NaN), M0l: new Float64Array(n).fill(NaN), M1: new Float64Array(n).fill(NaN), M2: new Float64Array(n).fill(NaN), M3: new Float64Array(n).fill(NaN), M5knn: new Float64Array(n).fill(NaN) };
  const pending = []; // M3 needs the M0 choice first
  for (const f of models) {
    const train = f.train;
    const nw = nestedWeights(ds, train);
    const nwArr = train.map((i) => nw.get(i));
    for (const h of f.test) {
    L.M0g[h] = scorer(h, train, null);
    L.M0l[h] = scorer(h, train, nwArr);
    const same = train.filter((i) => ds.script[i] != null && ds.script[i] === ds.script[h]);
    L.M1[h] = same.length ? scorer(h, same, null) : L.M0g[h];
    if (loso) { const rel = train.filter((i) => ds.branchIdx[i] === ds.branchIdx[h]); L.M2[h] = rel.length ? scorer(h, rel, null) : L.M0g[h]; }
    L.M5knn[h] = scorer(h, f.knn.get(h), null);
    pending.push([f, h]);
    }
  }
  const nested = (a) => lineageMean(lossByLineage(ds, a));
  const m0name = nested(L.M0g) <= nested(L.M0l) ? "M0g" : "M0l";
  const candidates = [["M0g", L.M0g], ["M0l", L.M0l], ["M1", L.M1]].concat(loso ? [["M2", L.M2]] : []);
  const m0starName = candidates.reduce((b, c) => (nested(c[1]) < nested(b[1]) ? c : b))[0];
  const M0 = L[m0name], M0star = L[m0starName];
  let noKind = 0, tested = 0;
  for (const [f, h] of pending) {
    tested++;
    const a = f.assign.get(h);
    let v = NaN;
    if (a.length) {
      const idx = m3Union ? [...new Set(a.flatMap((x) => f.kinds[x.k].members))] : f.kinds[a[0].k].members;
      v = scorer(h, idx, null);
    }
    if (!Number.isFinite(v)) { if (!a.length) noKind++; v = M0[h]; }
    L.M3[h] = v;
  }
  // M4: random kinds, same procedure; the draw count is whatever the models carry
  const D = models.reduce((m, f) => Math.max(m, f.m4.length), 0);
  const loss4 = new Float64Array(D * n).fill(NaN);
  for (let d = 0; d < D; d++) for (const f of models) {
    if (!f.m4.length) { for (const h of f.test) loss4[d * n + h] = M0[h]; continue; }
    const mp = f.m4[d];
    for (const h of f.test) {
      const a = mp.get(h);
      let v = NaN;
      if (a.length) { const idx = m3Union ? [...new Set(a.flatMap((x) => x.members))] : a[0].members; v = scorer(h, idx, null); }
      loss4[d * n + h] = Number.isFinite(v) ? v : M0[h];
    }
  }
  return { loss: { ...L, M0, M0star }, loss4, D, noKind, tested, m0name, m0starName };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 7. THE GAIN RULE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/**
 * gainRule({ ds, lossM0, lossM3, loss4, D, shuffleGains, sesoi, power, boot }) -> { components, stats, verdict, reasons }
 * Components a-e per BARKER 5.0 (this module's header). `power` = { up, down, nullRate } from the planted trio (or null when
 * not run, in which case (e) is undefined and the verdict cannot exceed UNDERPOWERED). b-adjusted p-values are applied by the caller
 * through `holmReject` ({ b1, b2 } booleans); when absent, the raw p <= ALPHA is used.
 */
export function gainRule({ ds, lossM0, lossM3, loss4 = null, D = 0, shuffleGains = null, sesoi, power = null, holmReject = null, alphaB = ALPHA, boot = true, B = BOOT_B, seed = SEED, only = null }) {
  const perM0 = lossByLineage(ds, lossM0, { only }), perM3 = lossByLineage(ds, lossM3, { only });
  const lin = [], g = [];
  for (let l = 0; l < ds.nLineages; l++) if (Number.isFinite(perM0[l]) && Number.isFinite(perM3[l])) { lin.push(l); g.push(perM0[l] - perM3[l]); }
  const nl = g.length;
  const reach = reachability(nl);
  const wins = g.filter((x) => x > 0).length;
  const meanGain = mean(g);
  const bs = boot ? clusterBootstrap(g, { B, seed, purpose: "gain" }) : { est: meanGain, ci95: [NaN, NaN] };
  const a = bs.ci95[0] > sesoi;
  // (b1) random kinds
  let p4 = NaN;
  if (loss4 && D) {
    const own = lineageMean(perM3);
    let le = 0;
    for (let d = 0; d < D; d++) { const l4 = lineageMean(lossByLineage(ds, loss4.subarray(d * ds.n, (d + 1) * ds.n), { only })); if (l4 <= own) le++; }
    p4 = (1 + le) / (D + 1);
  }
  // (b2) shuffled labels
  let pShuf = NaN;
  if (shuffleGains && shuffleGains.length) { let ge = 0; for (const x of shuffleGains) if (x >= meanGain - 1e-15) ge++; pShuf = (1 + ge) / (shuffleGains.length + 1); }
  const b1 = holmReject?.b1 ?? (Number.isFinite(p4) ? p4 <= alphaB : false);
  const b2 = shuffleGains ? (holmReject?.b2 ?? (Number.isFinite(pShuf) ? pShuf <= alphaB : false)) : true; // not applicable (L2, L3) = true
  const c = !reach.unreachable && wins >= reach.kNeeded;
  // (d) jackknife
  let minDropL = Infinity, minDropB = Infinity;
  for (const l of lin) { const pm0 = lossByLineage(ds, lossM0, { dropLineage: l, only }), pm3 = lossByLineage(ds, lossM3, { dropLineage: l, only }); const gg = []; for (let k = 0; k < ds.nLineages; k++) if (Number.isFinite(pm0[k]) && Number.isFinite(pm3[k])) gg.push(pm0[k] - pm3[k]); minDropL = Math.min(minDropL, mean(gg)); }
  const branchesIn = new Set(); for (let i = 0; i < ds.n; i++) if (Number.isFinite(lossM0[i]) && Number.isFinite(lossM3[i])) branchesIn.add(ds.branchIdx[i]);
  for (const b of branchesIn) { const pm0 = lossByLineage(ds, lossM0, { dropBranch: b, only }), pm3 = lossByLineage(ds, lossM3, { dropBranch: b, only }); const gg = []; for (let k = 0; k < ds.nLineages; k++) if (Number.isFinite(pm0[k]) && Number.isFinite(pm3[k])) gg.push(pm0[k] - pm3[k]); minDropB = Math.min(minDropB, mean(gg)); }
  const d = Number.isFinite(minDropL) && Number.isFinite(minDropB) && minDropL > sesoi && minDropB > sesoi;
  const eUp = power ? power.up >= 0.8 : null, eDown = power ? power.down >= 0.8 : null, eNull = power ? power.nullOk !== false : null;
  const e = power ? eUp && eDown && eNull : null;
  const components = { a, b1, b2, c, d, e };
  const reasons = [];
  if (!a) reasons.push("a: bootstrap lower bound does not clear the SESOI");
  if (!b1) reasons.push("b1: not below the random-kind draws after Holm");
  if (!b2) reasons.push("b2: not beyond the shuffled-label worlds after Holm");
  if (!c) reasons.push(reach.unreachable ? `c: sign test unreachable at n_l = ${nl}` : `c: ${wins} of ${nl} lineages gain, ${reach.kNeeded} needed`);
  if (!d) reasons.push("d: the gain does not survive dropping a single lineage or branch");
  if (e === null) reasons.push("e: power trio not run"); else if (!e) reasons.push(`e: power trio failed (P_up ${power.up.toFixed?.(2)}, P_down ${power.down.toFixed?.(2)})`);
  let verdict;
  if (reach.unreachable) verdict = "UNDERPOWERED";
  else if (a && b1 && b2 && c && d && e === true) verdict = "GAIN";
  else if (e === true && bs.ci95[1] < sesoi) verdict = "NO_GAIN";
  else verdict = "UNDERPOWERED";
  const conj = a && b1 && b2 && c && d; // (a)-(d): the part that does not need the power card
  return {
    verdict, components, conjunctAD: conj, reasons,
    stats: { nLineages: nl, wins, ties: g.filter((x) => x === 0).length, reach, meanGain, ci95: bs.ci95, sesoi, p4, pShuf, jackknife: { minDropLineage: minDropL, minDropBranch: minDropB }, perLineage: lin.map((l, i) => ({ lineage: ds.lineages[l], gain: g[i], m0: perM0[l], m3: perM3[l] })) },
  };
}
/** Bonferroni for exploratory sources, then Holm within the task's targets, on one named p-vector */
export function adjustTask(ps, { exploratoryFactor = 1, alpha = ALPHA } = {}) { return holm(ps.map((p) => Math.min(1, p * exploratoryFactor)), alpha); }

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 8. SCALAR TARGETS (L1, L4): shuffled-label worlds, controls, planted power
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
export function scalarGainOnce(ds, models, y, kind, { loso = false } = {}) {
  const ev = evalModels(ds, models, scalarScorer(y, kind), { loso });
  const per0 = lossByLineage(ds, ev.loss.M0star), per3 = lossByLineage(ds, ev.loss.M3);
  const g = []; for (let l = 0; l < ds.nLineages; l++) if (Number.isFinite(per0[l]) && Number.isFinite(per3[l])) g.push(per0[l] - per3[l]);
  return { ev, gain: mean(g) };
}
/** the gains of `R` shuffled-label worlds (target permuted across the systems where it is defined) */
export function shuffledGains(ds, models, y, kind, { R = SHUFFLES, seed = SEED, tag = "", loso = false } = {}) {
  const defined = []; for (let i = 0; i < ds.n; i++) if (Number.isFinite(y[i])) defined.push(i);
  const rng = createSeededRng({ seed, purpose: "shuffle", tag });
  const light = models.map((f) => ({ ...f, m4: [] })); // shuffles need no M4
  const gains = new Float64Array(R);
  for (let r = 0; r < R; r++) {
    const perm = shuffled(defined, rng);
    const ys = new Float64Array(y.length).fill(NaN);
    defined.forEach((i, k) => { ys[i] = y[perm[k]]; });
    gains[r] = scalarGainOnce(ds, light, ys, kind, { loso }).gain;
  }
  return Array.from(gains);
}

// ── planted world ──────────────────────────────────────────────────────────────────────────────────────────────────────
const phiInv = (p) => { // Acklam's rational approximation
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
};
const gauss = (rng) => { let u = 0, v = 0; while (u === 0) u = rng(); v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/**
 * plantWorld(ds, { kinds: 3, share: 0.15, strength: 0.8, signatureCount: 24, noiseCount: ..., seed }) -> { ds2, truth: { kindOf: Int32Array (-1 background) } }
 * The planted dataset keeps the REAL ids, lineages, branches and script labels (the structure the rule must work on) and replaces the
 * feature matrix by a planted one: F features of which `signatureCount` carry the kinds, the rest noise. Every kind spans >= 3 lineages.
 */
export function plantWorld(ds, { kinds = 2, share = 0.4, strength = 0.8, signatureCount = 24, F = 45, R = 10, resampNoise = 0.3, seed = SEED, tag = "" } = {}) {
  const n = ds.n;
  const rng = createSeededRng({ seed, purpose: "plant", tag });
  const delta = phiInv((1 + strength) / 2);
  const size = Math.max(3, Math.round(share * n));
  let kindOf;
  for (let attempt = 0; attempt < 200; attempt++) {
    const order = shuffled(Array.from({ length: n }, (_, i) => i), rng);
    kindOf = new Int32Array(n).fill(-1);
    for (let k = 0; k < kinds; k++) for (let a = 0; a < size; a++) kindOf[order[k * size + a]] = k;
    let ok = true;
    for (let k = 0; k < kinds; k++) { const span = new Set(); for (let i = 0; i < n; i++) if (kindOf[i] === k) span.add(ds.lineageIdx[i]); if (span.size < Math.min(3, ds.nLineages)) ok = false; }
    if (ok) break;
  }
  const sig = Math.min(signatureCount, F);
  const sign = Array.from({ length: kinds }, () => Array.from({ length: sig }, () => (rng() < 0.5 ? -1 : 1)));
  const value = new Float64Array(n * F), resamp = new Float64Array(n * F * R);
  for (let i = 0; i < n; i++) for (let j = 0; j < F; j++) {
    let x = gauss(rng);
    if (j < sig && kindOf[i] >= 0) x += delta * sign[kindOf[i]][j];
    value[i * F + j] = x;
    for (let r = 0; r < R; r++) resamp[(i * F + j) * R + r] = x + resampNoise * gauss(rng);
  }
  const features = Array.from({ length: F }, (_, j) => `p${String(j).padStart(2, "0")}`);
  const ds2 = makeDataset({ ids: ds.ids, lineage: ds.lineage, branch: ds.branch, macro: ds.macro, script: ds.script, scriptSharesBy: ds.scriptSharesBy, features, value, resamp, meta: { planted: true } });
  return { ds2, truth: { kindOf, delta, size } };
}
/** the kind-mean pattern of a planted target for a given separation `d` (in noise SDs); background systems have mean 0 */
export function plantMean(truth, d) {
  const n = truth.kindOf.length;
  const K = Math.max(...truth.kindOf) + 1;
  const mu = Array.from({ length: K }, (_, k) => d * (k - (K - 1) / 2));
  return Float64Array.from({ length: n }, (_, i) => (truth.kindOf[i] >= 0 ? mu[truth.kindOf[i]] : 0));
}
/** y = kind mean + noise */
export function plantTarget(truth, d, rng) {
  const m = plantMean(truth, d);
  return Float64Array.from(m, (v) => v + gauss(rng));
}
/** the oracle predictor: true kind (and the background group) known; same folds. Returns its relative reduction of the M0* loss. */
function oracleReduction(ds, pre, truth, y) {
  // the perfect-assignment kind model: a member predicts the mean of its training kind-mates; a background system falls back to the
  // global mean (exactly what an M3 with a perfect gate does); compared with the best of the non-kind baselines
  const n = ds.n;
  const A = new Float64Array(n).fill(NaN), Bv = new Float64Array(n).fill(NaN), lossOr = new Float64Array(n).fill(NaN);
  const sc = scalarScorer(y);
  for (const { f, nwArr, byKind } of pre) {
    for (const h of f.test) {
      A[h] = sc(h, f.train, null); Bv[h] = sc(h, f.train, nwArr);
      const same = truth.kindOf[h] >= 0 ? byKind[truth.kindOf[h]] : [];
      lossOr[h] = same.length ? sc(h, same, null) : A[h];
    }
  }
  const m0star = lineageMean(lossByLineage(ds, A)) <= lineageMean(lossByLineage(ds, Bv)) ? A : Bv;
  const a = lineageMean(lossByLineage(ds, m0star)), b = lineageMean(lossByLineage(ds, lossOr));
  return 1 - b / a;
}
/**
 * bisect the separation d so the oracle's mean relative reduction equals `target`. Common random numbers: the SAME noise draws are used at
 * every d, so the reduction is a smooth monotone function of d and the bisection solves the structure, not the noise.
 */
export function calibrateSeparation(ds, folds, truth, target, { reps = 80, seed = SEED } = {}) {
  if (target <= 0) return 0;
  const rng = createSeededRng({ seed, purpose: "calibrate-noise" });
  const eps = Array.from({ length: reps }, () => Float64Array.from({ length: ds.n }, () => gauss(rng)));
  const K = Math.max(...truth.kindOf) + 1;
  const pre = folds.map((f) => { const nw = nestedWeights(ds, f.train); return { f, nwArr: f.train.map((i) => nw.get(i)), byKind: Array.from({ length: K }, (_, k) => f.train.filter((i) => truth.kindOf[i] === k)) }; });
  const f = (d) => { const m = plantMean(truth, d); let s = 0; for (const e of eps) s += oracleReduction(ds, pre, truth, Float64Array.from(m, (v, i) => v + e[i])); return s / reps; };
  let lo = 0, hi = 8;
  if (f(hi) < target) return hi;
  for (let it = 0; it < 20; it++) { const mid = (lo + hi) / 2; if (f(mid) < target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/**
 * plantedPowerTrio(ds, { source, organ, reps, m4Draws, shuffles, sesoiRel, holmFamily, ladder }) ->
 *   { up, down, nullRate, nullOk, byEffect, mde, ... }
 * Runs the WHOLE pipeline (bins, kind source, assignment, M4, shuffles, rule a-d) on planted worlds built on the real system structure.
 * Effects are RELATIVE reductions of the M0* loss achieved by a perfectly-gated oracle kind model on the same folds: 2 s_L (claim true),
 * 0.5 s_L (claim negligible), 0 (null), plus an informational LADDER of larger effects that reports the smallest effect the rule can resolve
 * (the MDE in relative loss); the ladder never enters a verdict, it only says where the registered rule has power.
 * P_up = rate at which (a)-(d) all hold at 2 s_L; P_down = rate at which the interval's UPPER bound is below s_L at 0.5 s_L; P_null = rate
 * at which (a)-(d) hold at 0 (must not be rejected as <= alpha).
 */
export function plantedPowerTrio(ds, { source = "kanada-gated", organ = null, reps = PLANT_REPS, m4Draws = M4_DRAWS, shuffles = SHUFFLES, sesoiRel = SESOI_REL, holmFamily = 1, folds = null, loso = false, seed = SEED, scalar = true, ladder = [], plant = {} } = {}) {
  const foldList = folds ?? lofoFolds(ds, { by: "branch" });
  const alphaEff = ALPHA / holmFamily;
  const effects = [{ name: "up", rel: 2 * sesoiRel }, { name: "down", rel: 0.5 * sesoiRel }, { name: "null", rel: 0 }, ...ladder.map((rel) => ({ name: `ladder${rel}`, rel }))];
  const tally = Object.fromEntries(effects.map((e) => [e.name, { hit: 0, below: 0, a: 0, b1: 0, b2: 0, c: 0, d: 0, noKind: 0, gainRel: 0, sep: 0 }]));
  const kindsFound = [];
  for (let r = 0; r < reps; r++) {
    const { ds2, truth } = plantWorld(ds, { seed, tag: `rep${r}`, ...plant });
    const models = buildFoldModels(ds2, foldList.map((f) => ({ ...f })), { source, organ, m4Draws, seed: seed + r, truthKinds: truth.kindOf });
    kindsFound.push(models.reduce((a, f) => a + f.kinds.length, 0) / models.length);
    for (const e of effects) {
      // the separation is calibrated PER WORLD: the oracle's reduction depends on where the kind members fall (singleton lineages weigh as much as Indo-European)
      const sep = calibrateSeparation(ds2, foldList, truth, e.rel, { seed: seed + r });
      const rng = createSeededRng({ seed, purpose: "plant-y", kind: e.name, r });
      const y = plantTarget(truth, sep, rng);
      const { ev } = scalarGainOnce(ds2, models, y, "sq", { loso });
      const sg = shuffledGains(ds2, models, y, "sq", { R: shuffles, seed, tag: `${e.name}${r}`, loso });
      const base = lineageMean(lossByLineage(ds2, ev.loss.M0star));
      const sesoi = sesoiRel * base;
      const gr = gainRule({ ds: ds2, lossM0: ev.loss.M0star, lossM3: ev.loss.M3, loss4: ev.loss4, D: ev.D, shuffleGains: scalar ? sg : null, sesoi, alphaB: alphaEff, boot: true, seed: seed + r });
      const t = tally[e.name];
      if (gr.conjunctAD) t.hit++;
      if (gr.stats.ci95[1] < sesoi) t.below++;
      for (const c of ["a", "b1", "b2", "c", "d"]) if (gr.components[c]) t[c]++;
      t.noKind += ev.noKind / Math.max(1, ev.tested); t.gainRel += gr.stats.meanGain / Math.max(1e-12, base); t.sep += sep;
    }
  }
  const byEffect = {};
  for (const e of effects) { const t = tally[e.name]; byEffect[e.name] = { rel: e.rel, rate: t.hit / reps, belowRate: t.below / reps, components: { a: t.a / reps, b1: t.b1 / reps, b2: t.b2 / reps, c: t.c / reps, d: t.d / reps }, noKind: t.noKind / reps, realisedGainRel: t.gainRel / reps, separation: t.sep / reps }; }
  const nullHits = tally.null.hit;
  const nullOk = !(nullHits > 0 && signTestP(nullHits, reps, ALPHA) <= ALPHA); // "not rejected as <= alpha": the exact binomial test of rate <= alpha must not reject
  const ladderRows = ladder.map((rel) => ({ rel, ...byEffect[`ladder${rel}`] }));
  const mde = ladderRows.find((l) => l.rate >= 0.8)?.rel ?? null;
  return { up: byEffect.up.rate, down: byEffect.down.belowRate, nullRate: nullHits / reps, nullHits, nullOk, reps, byEffect, mdeRelativeLoss: mde, ladder: ladderRows.map((l) => ({ rel: l.rel, rate: l.rate })), source, n: ds.n, nLineages: ds.nLineages, alphaEff, meanKindsPerFold: mean(kindsFound), sesoiRel, plant: { kinds: 2, share: 0.4, ...plant } };
}


// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 9. CONTINUOUS COMPARATORS: kernel ridge (M5)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** inverse of a symmetric positive definite matrix (Gauss-Jordan; n <= ~50) */
export function invertSPD(A, n) {
  const M = new Float64Array(n * 2 * n);
  for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) M[i * 2 * n + j] = A[i * n + j]; M[i * 2 * n + n + i] = 1; }
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r * 2 * n + c]) > Math.abs(M[piv * 2 * n + c])) piv = r;
    if (piv !== c) for (let j = 0; j < 2 * n; j++) { const t = M[c * 2 * n + j]; M[c * 2 * n + j] = M[piv * 2 * n + j]; M[piv * 2 * n + j] = t; }
    const d = M[c * 2 * n + c];
    for (let j = 0; j < 2 * n; j++) M[c * 2 * n + j] /= d;
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r * 2 * n + c]; if (f) for (let j = 0; j < 2 * n; j++) M[r * 2 * n + j] -= f * M[c * 2 * n + j]; }
  }
  const inv = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) inv[i * n + j] = M[i * 2 * n + n + j];
  return inv;
}
/**
 * ridgeLoss(ds, models, y, kind): linear-kernel ridge on the standardised features of the fold's training systems; lambda from the
 * grid by leave-one-system-out inside the training fold via the hat-matrix identity. Returns { loss: Float64Array(n), lambdas }.
 */
export function ridgeLoss(ds, models, y, kind = "sq") {
  const loss = new Float64Array(ds.n).fill(NaN), lambdas = [];
  for (const f of models) {
    const tr = f.train.filter((i) => Number.isFinite(y[i]));
    const m = tr.length;
    if (m < 4) continue;
    const Z = f.Z, F = ds.F;
    const K = new Float64Array(m * m);
    for (let a = 0; a < m; a++) for (let b = a; b < m; b++) { let s2 = 0; for (let j = 0; j < F; j++) s2 += Z[tr[a] * F + j] * Z[tr[b] * F + j]; K[a * m + b] = s2; K[b * m + a] = s2; }
    const ybar = mean(tr.map((i) => y[i]));
    const yc = tr.map((i) => y[i] - ybar);
    let best = null;
    for (const lam of RIDGE_GRID) {
      const A = Float64Array.from(K); for (let a = 0; a < m; a++) A[a * m + a] += lam;
      const inv = invertSPD(A, m);
      let sse = 0; const alpha = new Float64Array(m);
      for (let a = 0; a < m; a++) { let s2 = 0; for (let b = 0; b < m; b++) s2 += inv[a * m + b] * yc[b]; alpha[a] = s2; const r = s2 / inv[a * m + a]; sse += r * r; }
      if (!best || sse < best.sse) best = { lam, sse, alpha };
    }
    lambdas.push(best.lam);
    for (const h of f.test) {
      if (!Number.isFinite(y[h])) continue;
      let p = ybar;
      for (let a = 0; a < m; a++) { let k = 0; for (let j = 0; j < F; j++) k += Z[h * F + j] * Z[tr[a] * F + j]; p += best.alpha[a] * k; }
      if (kind === "brier") p = Math.min(1, Math.max(0, p));
      loss[h] = (y[h] - p) ** 2;
    }
  }
  return { loss, lambdas };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 10. CONTROLS BUILT TO FAIL (C1 shuffled labels, C2 random kinds, C3 structureless features)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const gainParts = (ds, loss0, loss3, sesoi, { B = 300, seed = SEED, tag = "ctl" } = {}) => {
  const per0 = lossByLineage(ds, loss0), per3 = lossByLineage(ds, loss3);
  const g = []; for (let l = 0; l < ds.nLineages; l++) if (Number.isFinite(per0[l]) && Number.isFinite(per3[l])) g.push(per0[l] - per3[l]);
  const reach = reachability(g.length);
  const wins = g.filter((x) => x > 0).length;
  const bs = clusterBootstrap(g, { B, seed, purpose: tag });
  return { a: bs.ci95[0] > sesoi, c: !reach.unreachable && wins >= reach.kNeeded, meanGain: mean(g) };
};
/** C1: the share of shuffled-label worlds in which (a), (c), (d) and b1 all hold. Must not be rejected as <= alpha. */
export function falseGainControl(ds, models, y, kind, { R = 200, seed = SEED, tag = "", loso = false, alphaB = ALPHA } = {}) {
  const defined = []; for (let i = 0; i < ds.n; i++) if (Number.isFinite(y[i])) defined.push(i);
  const rng = createSeededRng({ seed, purpose: "ctl-shuffle", tag });
  const light = models.map((f) => ({ ...f, m4: [] }));
  let hits = 0;
  for (let r = 0; r < R; r++) {
    const perm = shuffled(defined, rng);
    const ys = new Float64Array(y.length).fill(NaN); defined.forEach((i, k) => { ys[i] = y[perm[k]]; });
    const ev = evalModels(ds, light, scalarScorer(ys, kind), { loso });
    const sesoi = SESOI_REL * lineageMean(lossByLineage(ds, ev.loss.M0star));
    const gr = gainRule({ ds, lossM0: ev.loss.M0star, lossM3: ev.loss.M3, sesoi, boot: true, B: 300, seed: seed + r, shuffleGains: null });
    if (!(gr.components.a && gr.components.c && gr.components.d)) continue;
    const full = evalModels(ds, models, scalarScorer(ys, kind), { loso });
    const g2 = gainRule({ ds, lossM0: full.loss.M0star, lossM3: full.loss.M3, loss4: full.loss4, D: full.D, sesoi, boot: false, alphaB, shuffleGains: null });
    if (g2.components.b1) hits++;
  }
  return { R, hits, rate: hits / R, rejectedAsLeAlpha: hits > 0 && signTestP(hits, R, ALPHA) <= ALPHA };
}
/** C2: the share of random-kind draws that individually satisfy (a) and (c) against M0*. Must not be rejected as <= alpha. */
export function randomKindControl(ds, ev, { draws = 200, seed = SEED } = {}) {
  const sesoi = SESOI_REL * lineageMean(lossByLineage(ds, ev.loss.M0star));
  const D = Math.min(draws, ev.D);
  let hits = 0;
  for (let d = 0; d < D; d++) { const p = gainParts(ds, ev.loss.M0star, ev.loss4.subarray(d * ds.n, (d + 1) * ds.n), sesoi, { B: 300, seed: seed + d, tag: "ctl-rk" }); if (p.a && p.c) hits++; }
  return { draws: D, hits, rate: D ? hits / D : NaN, rejectedAsLeAlpha: hits > 0 && signTestP(hits, D, ALPHA) <= ALPHA };
}
/** C3: false-kind rate of the organ's Kanada on block-permuted signature matrices of the whole universe (the organ's own per-basin null) */
export function inducerFalseKindRate(ds, { reps = 40, seed = SEED } = {}) {
  const all = Array.from({ length: ds.n }, (_, i) => i);
  const cuts = foldCuts(ds, all);
  let found = 0;
  for (let r = 0; r < reps; r++) {
    const rng = createSeededRng({ seed, purpose: "ctl-permute", r });
    // permute whole blocks (a feature's ten resamples move with the system), independently per feature
    const resamp = Float64Array.from(ds.resamp), value = Float64Array.from(ds.value);
    for (let j = 0; j < ds.F; j++) {
      const perm = shuffled(all, rng);
      for (let i = 0; i < ds.n; i++) { value[i * ds.F + j] = ds.value[perm[i] * ds.F + j]; for (let k = 0; k < ds.R; k++) resamp[(i * ds.F + j) * ds.R + k] = ds.resamp[(perm[i] * ds.F + j) * ds.R + k]; }
    }
    const dsP = makeDataset({ ids: ds.ids, lineage: ds.lineage, branch: ds.branch, macro: ds.macro, script: ds.script, features: ds.features, value, resamp });
    const { cnt, D } = signatureVectors(dsP, cuts);
    const kr = kanadaKinds(dsP, all, { cnt, D, cuts, population: `perm${r}` });
    if (kr.kinds.length) found++;
  }
  return { reps, found, rate: found / reps };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 11. TASK RUNNERS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
export const CACHE_DIR = path.join(OUT_DIR, "transfer-cache");
const fmt = (x, d = 4) => (Number.isFinite(x) ? Number(x.toFixed(d)) : null);

export function loadLiteUniverse({ featureSet = "strict", cacheDir = CACHE_DIR, stems = null } = {}) {
  const disc = discoverStems();
  const profiles = (stems ?? disc.stems).map((s) => buildLiteProfile(s, { cacheDir }));
  const ds = datasetFromProfiles(profiles, { featureSet });
  return { ds, profiles, discoveryGaps: disc.gaps, source: "transfer-data.mjs lite stand-in (profiles.mjs not consumed)" };
}

/** the macro label as this module uses it */
const macroOf = (m) => (m === "IE" || m === "Indo-European" ? "IE" : "nonIE");
/**
 * adapts SystemProfile@1 objects (eval/barker/profiles.mjs, the owner of the contract) to the profile shape datasetFromProfiles reads.
 * Skipped with a typed gap: non-NL systems, within-language twins (labels.twinOf), systems with no genealogy key. Cells that profiles.mjs itself labels
 * UNDERPOWERED (its planted-structure power checks failed) are excluded from every predictor set: another instrument's finding is not overridden here.
 */
export function adaptSystemProfiles(sps) {
  const out = [], gaps = [], excluded = new Set();
  for (const p of sps) {
    if (p.kind !== "nl") continue;
    const stem = p.labels?.stem ?? String(p.system).split(":")[1];
    if (p.labels?.twinOf) { gaps.push({ system: stem, reason: "within_language_twin_not_a_system" }); continue; }
    const own = genealogyOf(stem);
    const lineage = p.labels?.lineage && p.labels.lineage !== "unlabelled" ? p.labels.lineage : own?.lineage ?? null;
    const branch = p.labels?.branch && p.labels.branch !== "unlabelled" ? p.labels.branch : own?.branch ?? null;
    if (!lineage || !branch) { gaps.push({ system: stem, reason: "no_genealogy_key" }); continue; }
    const values = {}, resamples = {};
    for (const [id, c] of Object.entries(p.cells ?? {})) {
      if (c.power?.status === "UNDERPOWERED") excluded.add(id);
      if (Number.isFinite(c.value)) { values[id] = c.value; resamples[id] = c.resamples ?? []; }
    }
    out.push({ stem, id: p.id, kind: "nl", labels: { lineage, branch, macro: macroOf(p.labels?.macro ?? own?.macro), script: p.labels?.script ?? null, scriptShares: p.labels?.scriptShares ?? null, giver: p.labels?.typedBy ?? GENEALOGY_GIVER }, values, resamples, builder: `eval/barker/profiles.mjs ${p.profilesVersion ?? ""} preregSha ${String(p.preregSha ?? "").slice(0, 12)}`, contentHash: p.contentHash });
  }
  return { profiles: out, gaps, excludeIds: [...excluded].sort() };
}
export const SNAPSHOT_DIR = path.join(OUT_DIR, "transfer-profiles");
/**
 * snapshotProfiles(): copies the producer's profile files (read-only on its side) into this module's own directory and writes a manifest of their
 * sha256, so that a run is attributable to ONE set of profiles even while profiles.mjs is rebuilding its cache. Refuses to copy while any file is
 * younger than `settleSeconds` (a rebuild in progress). The producer's files are never modified.
 */
export function snapshotProfiles({ src = "/private/tmp/claude-501/barker/profiles", dst = SNAPSHOT_DIR, settleSeconds = 90 } = {}) {
  const files = fs.readdirSync(src).filter((f) => /^nl__.*\.json$/.test(f)).sort();
  const now = Date.now();
  const young = files.filter((f) => now - fs.statSync(path.join(src, f)).mtimeMs < settleSeconds * 1000);
  if (young.length) return { ok: false, reason: "producer still writing", young };
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(dst)) if (/^nl__.*\.json$/.test(f)) fs.unlinkSync(path.join(dst, f));
  const manifest = { schema: "TransferProfileSnapshot@1", takenAt: new Date().toISOString(), src, files: {} };
  for (const f of files) { fs.copyFileSync(path.join(src, f), path.join(dst, f)); manifest.files[f] = createHash("sha256").update(fs.readFileSync(path.join(dst, f))).digest("hex"); }
  manifest.sha256 = createHash("sha256").update(JSON.stringify(manifest.files)).digest("hex");
  fs.writeFileSync(path.join(dst, "manifest.json"), JSON.stringify(manifest, null, 1));
  return { ok: true, files: files.length, sha256: manifest.sha256 };
}
/** the universe the tasks run on: the real SystemProfile@1 when profiles.mjs has produced them, else the lite stand-in (stated on every card) */
export async function loadUniverse({ featureSet = "strict", prefer = "auto", cacheDir = CACHE_DIR } = {}) {
  if (prefer !== "lite") {
    try {
      const mod = await import("./profiles.mjs");
      const snap = fs.existsSync(path.join(SNAPSHOT_DIR, "manifest.json")) && prefer !== "live";
      const sps = typeof mod.loadProfiles === "function" ? (snap ? mod.loadProfiles(SNAPSHOT_DIR) : mod.loadProfiles()) : [];
      const nl = sps.filter((p) => p.kind === "nl");
      if (nl.length >= 20) {
        const ad = adaptSystemProfiles(nl);
        const ds = datasetFromProfiles(ad.profiles, { featureSet, excludeIds: ad.excludeIds });
        ds.gaps.push(...ad.gaps);
        const man = snap ? JSON.parse(fs.readFileSync(path.join(SNAPSHOT_DIR, "manifest.json"), "utf8")) : null;
        return { ds, profiles: ad.profiles, discoveryGaps: ad.gaps, snapshot: man ? { sha256: man.sha256, takenAt: man.takenAt } : null, source: `eval/barker/profiles.mjs SystemProfile@1, ${snap ? `SNAPSHOT ${man.sha256.slice(0, 12)} of ${man.takenAt}` : "LIVE cache (unstable while profiles.mjs rebuilds)"} (${ad.profiles.length} systems; cells excluded by its own power status: ${ad.excludeIds.join(",") || "none"})` };
      }
    } catch (e) { if (prefer === "real") throw e; }
  }
  const lite = loadLiteUniverse({ featureSet, cacheDir });
  return lite;
}

/** the sources actually available at this run */
export async function availableSources(requested) {
  const organ = await loadBarkerOrgan();
  const all = requested ?? ["barker", "kanada-gated", "linkage-gated", "linkage-nearest"];
  const out = [];
  const absent = [];
  for (const s of all) { if (s === "barker" && !organ) { absent.push({ source: "barker", reason: "organs/barker.js absent or without induceSystemKinds" }); continue; } out.push(s); }
  return { sources: out, organ, absent };
}

const nestedSE = (ds, loss) => { const v = Array.from(lossByLineage(ds, loss)).filter(Number.isFinite); return v.length > 1 ? sd(v) / Math.sqrt(v.length) : NaN; };

/**
 * evaluateScalarTargets({ ds, models, targets: [{ id, kind, y }], source, power, shuffles, ... }) -> per-target cards.
 * Holm is applied here across the task's targets, after the exploratory Bonferroni factor.
 */
export function evaluateScalarTargets({ ds, models, targets, source, registered, exploratoryFactor = 1, power = null, powerByTarget = null, shuffles = SHUFFLES, ctlShuffles = 200, loso = false, seed = SEED, controls = true }) {
  const rows = [];
  for (const t of targets) {
    const lineagesDefined = new Set(); for (let i = 0; i < ds.n; i++) if (Number.isFinite(t.y[i])) lineagesDefined.add(ds.lineageIdx[i]);
    const ys = Array.from(t.y).filter(Number.isFinite);
    if (lineagesDefined.size < MIN_LINEAGES || sd(ys) < 1e-12) { rows.push({ id: t.id, kind: t.kind, skipped: true, nSystems: ys.length, nLineages: lineagesDefined.size, reason: lineagesDefined.size < MIN_LINEAGES ? "unreachable: fewer than 5 lineages define the target" : "degenerate: the target does not vary" }); continue; }
    const ev = evalModels(ds, models, scalarScorer(t.y, t.kind), { loso });
    const ridge = ridgeLoss(ds, models, t.y, t.kind);
    const sesoi = SESOI_REL * lineageMean(lossByLineage(ds, ev.loss.M0star));
    const sg = shuffledGains(ds, models, t.y, t.kind, { R: shuffles, seed, tag: `${source}:${t.id}`, loso });
    const raw = gainRule({ ds, lossM0: ev.loss.M0star, lossM3: ev.loss.M3, loss4: ev.loss4, D: ev.D, shuffleGains: sg, sesoi, power: null, seed });
    rows.push({ id: t.id, kind: t.kind, y: t.y, ev, ridge, sesoi, sg, raw, nSystems: ys.length });
  }
  const live = rows.filter((r) => !r.skipped);
  const b1 = adjustTask(live.map((r) => r.raw.stats.p4), { exploratoryFactor });
  const b2 = adjustTask(live.map((r) => r.raw.stats.pShuf), { exploratoryFactor });
  live.forEach((r, k) => { r.holm = { b1: b1[k], b2: b2[k] }; });
  const cards = rows.map((r) => {
    if (r.skipped) return { id: r.id, kind: r.kind, verdict: "UNDERPOWERED", reason: r.reason, nSystems: r.nSystems, nLineages: r.nLineages };
    const pw = powerByTarget?.[r.id] ?? power;
    const final = gainRule({ ds, lossM0: r.ev.loss.M0star, lossM3: r.ev.loss.M3, loss4: r.ev.loss4, D: r.ev.D, shuffleGains: r.sg, sesoi: r.sesoi, power: pw ? { up: pw.up, down: pw.down, nullOk: pw.nullOk } : null, holmReject: r.holm, seed });
    const nm = (a) => fmt(lineageMean(lossByLineage(ds, a)));
    const m5best = Math.min(lineageMean(lossByLineage(ds, r.ev.loss.M5knn)), lineageMean(lossByLineage(ds, r.ridge.loss)));
    const m3 = lineageMean(lossByLineage(ds, r.ev.loss.M3));
    const se3 = nestedSE(ds, r.ev.loss.M3);
    let interpretation = null;
    if (final.verdict === "GAIN") interpretation = m3 <= m5best + se3 ? "kinds help beyond a continuous regressor" : "structure helps; the kind is a summary of it, not the mechanism";
    const m4sorted = []; for (let d = 0; d < r.ev.D; d++) m4sorted.push(lineageMean(lossByLineage(ds, r.ev.loss4.subarray(d * ds.n, (d + 1) * ds.n))));
    m4sorted.sort((a, b) => a - b);
    const ctl = controls ? {
      shuffledLabels: falseGainControl(ds, models, r.y, r.kind, { R: ctlShuffles, seed, tag: `${source}:${r.id}`, loso, alphaB: ALPHA / Math.max(1, live.length) }),
      randomKinds: randomKindControl(ds, r.ev, { draws: ctlShuffles, seed }),
    } : null;
    let verdict = final.verdict;
    const failed = ctl && (ctl.shuffledLabels.rejectedAsLeAlpha || ctl.randomKinds.rejectedAsLeAlpha);
    if (failed) verdict = "INSTRUMENT_FAILED";
    else if (verdict === "GAIN" && pw?.bound) { verdict = "UNDERPOWERED"; final.reasons.push("e: this source's power is established only as an oracle upper bound"); }
    const relGain = final.stats.meanGain / Math.max(1e-12, lineageMean(lossByLineage(ds, r.ev.loss.M0star)));
    return {
      id: r.id, kind: r.kind, nSystems: r.nSystems, verdict, interpretation, components: final.components, reasons: final.reasons,
      losses: { M0g: nm(r.ev.loss.M0g), M0l: nm(r.ev.loss.M0l), M1_script: nm(r.ev.loss.M1), M0star: nm(r.ev.loss.M0star), M0starIs: r.ev.m0starName, M3: nm(r.ev.loss.M3), M4median: fmt(quantile(m4sorted, 0.5)), M5knn: nm(r.ev.loss.M5knn), M5ridge: nm(r.ridge.loss) },
      sesoi: fmt(r.sesoi), sesoiHalf: fmt(r.sesoi / 2), sesoiDouble: fmt(r.sesoi * 2),
      gain: { mean: fmt(final.stats.meanGain), relativeToM0star: fmt(relGain), ci95: final.stats.ci95.map((x) => fmt(x)), lineagesWin: `${final.stats.wins} of ${final.stats.nLineages}`, ties: final.stats.ties, reach: final.stats.reach, jackknifeMin: { lineage: fmt(final.stats.jackknife.minDropLineage), branch: fmt(final.stats.jackknife.minDropBranch) } },
      p: { m4: fmt(final.stats.p4, 5), shuffle: fmt(final.stats.pShuf, 5), holmM4: r.holm.b1, holmShuffle: r.holm.b2 },
      noKindRate: fmt(r.ev.noKind / Math.max(1, r.ev.tested), 3),
      ifRegisteredPowerWereWaived: { conjunctAD: final.conjunctAD, note: "(a)-(d) only; NOT a verdict" },
      controls: ctl, perLineage: final.stats.perLineage.map((x) => ({ lineage: x.lineage, gain: fmt(x.gain), m0star: fmt(x.m0), m3: fmt(x.m3) })),
      ridgeLambdas: r.ridge.lambdas.length ? r.ridge.lambdas : null,
    };
  });
  return { cards, source, registered };
}

/** the power card for one system set: trio + ladder, with the oracle upper bound printed beside the real source */
export function powerForSet(ds, { source, organ, reps, m4Draws, shuffles, holmFamily, ladder, seed, plant = {}, scalar = true, sesoiRel = SESOI_REL }) {
  const t = Date.now();
  // The organ (source "barker") costs minutes per fold, so it cannot be planted per fold per replicate. Its power is therefore ESTABLISHED ONLY AS AN
  // UPPER BOUND: the oracle (true kinds, true assignment) cannot be beaten by any source. If the oracle's P_up is below 0.8 the organ is UNDERPOWERED
  // with certainty; if it is above, the organ's own power is still not established and no GAIN may be claimed from it (`bound: true`).
  const bound = source === "barker";
  const r = plantedPowerTrio(ds, { source: bound ? "oracle" : source, organ, reps, m4Draws, shuffles, holmFamily, ladder, seed, plant, scalar, sesoiRel });
  return { ...r, source, bound, powerBasis: bound ? "oracle upper bound (the organ is too slow to plant per fold)" : "planted through the source itself", ms: Date.now() - t, n: ds.n, nLineages: ds.nLineages };
}

const defSignature = (y) => Array.from(y).map((v) => (Number.isFinite(v) ? 1 : 0)).join("");
const subsetFor = (ds, y) => subsetDataset(ds, Array.from({ length: ds.n }, (_, i) => i).filter((i) => Number.isFinite(y[i])));

/** L1: transfer of role-config parameters. variant: "strict" (headline) | "leaky" (diagnostic) */
export async function runL1({ ds, sources, organ, variant = "strict", quick = false, seed = SEED, reps = PLANT_REPS, m4Draws = M4_DRAWS, shuffles = SHUFFLES, ladder = [0.4, 0.8], skipPower = false, loso = false }) {
  const defs = L1_TARGETS.map((t) => ({ ...t, y: new Float64Array(ds.n).fill(NaN) }));
  const gaps = [];
  ds.ids.forEach((stem, i) => { const tg = roleConfigTargets(readRoleConfig(stem)); if (!tg) { gaps.push({ system: stem, reason: "no_role_config" }); return; } for (const d of defs) if (tg[d.id] != null) d.y[i] = tg[d.id]; });
  const folds = lofoFolds(ds, { by: loso ? "system" : "branch" });
  const exploratory = sources.filter((s) => !KIND_SOURCES[s].registered).length;
  const out = { schema: "TransferCard@1", task: "L1", variant, split: loso ? "LOSO" : "LOBO", preregSha: registryDigest(), version: TRANSFER_VERSION, typed: TYPED, system: describeDs(ds), gaps, sources: [] };
  const powerCache = new Map();
  for (const src of sources) {
    const t0 = Date.now();
    const models = modelsFor(ds, folds, { source: src, organ, m4Draws, seed, cacheDir: CACHE_DIR });
    const calibration = src === "kanada-gated" ? inducerFalseKindRate(ds, { reps: quick ? 10 : 40, seed }) : null;
    let power = null;
    if (!skipPower) {
      const sig = defSignature(defs[0].y);
      const key = `${src}|${sig}`;
      if (!powerCache.has(key)) powerCache.set(key, powerForSet(subsetFor(ds, defs[0].y), { source: src, organ, reps, m4Draws, shuffles, holmFamily: defs.length, ladder, seed }));
      power = powerCache.get(key);
    }
    const ev = evaluateScalarTargets({ ds, models, targets: defs, source: src, registered: KIND_SOURCES[src].registered, exploratoryFactor: Math.max(1, exploratory), power, shuffles, ctlShuffles: quick ? 60 : 200, loso, seed });
    out.sources.push({
      source: src, registered: KIND_SOURCES[src].registered, inducerCalibration: calibration,
      inducerUnresolved: calibration ? calibration.rate > 0.15 : null,
      kindsPerFold: models.map((f) => ({ fold: f.fold, kinds: f.kinds.map((k) => k.members.map((i) => ds.ids[i])), noKind: f.noKind, held: f.test.length })),
      power: power ? { up: power.up, down: power.down, nullRate: power.nullRate, nullOk: power.nullOk, mdeRelativeLoss: power.mdeRelativeLoss, ladder: power.ladder, byEffect: power.byEffect, reps: power.reps, meanKindsPerFold: power.meanKindsPerFold, plant: power.plant } : null,
      targets: ev.cards, seconds: Math.round((Date.now() - t0) / 1000),
    });
  }
  return out;
}

export function describeDs(ds) {
  return { n: ds.n, features: ds.F, lineages: ds.nLineages, branches: ds.nBranches, ids: ds.ids, lineageSizes: Object.fromEntries(ds.lineages.map((l, k) => [l, ds.ids.filter((_, i) => ds.lineageIdx[i] === k).length])), droppedFeatures: ds.gaps.filter((g) => g.feature), droppedSystems: ds.gaps.filter((g) => g.system), featureSet: ds.meta?.featureSet ?? null, profileSource: ds.meta?.profileSource ?? null };
}

/** L4: rung outcomes from the competence cards (SUT output). Positive controls first, on RAW-only features. */
export async function runL4({ ds, dsRaw, sources, organ, quick = false, seed = SEED, reps = PLANT_REPS, m4Draws = M4_DRAWS, shuffles = SHUFFLES, skipPower = false }) {
  const table = collectCardOutcomes(ds.ids);
  const mk = (dsx, id) => { const y = new Float64Array(dsx.n).fill(NaN); dsx.ids.forEach((s, i) => { if (s in (table[id] ?? {})) y[i] = table[id][s]; }); return y; };
  const outcomeIds = Object.keys(table).sort();
  const POSITIVE = ["r3.gap.script_without_case", "r1.gap.ear_inert_not_needed"];
  const out = { schema: "TransferCard@1", task: "L4", preregSha: registryDigest(), version: TRANSFER_VERSION, typed: TYPED, system: describeDs(ds), outcomes: outcomeIds, sources: [] };
  const exploratory = sources.filter((s) => !KIND_SOURCES[s].registered).length;
  for (const src of sources) {
    const t0 = Date.now();
    // positive controls: RAW-only features
    const foldsRaw = lofoFolds(dsRaw, { by: "branch" });
    const modelsRaw = modelsFor(dsRaw, foldsRaw, { source: src, organ, m4Draws, seed, cacheDir: CACHE_DIR });
    const posTargets = POSITIVE.filter((id) => table[id]).map((id) => ({ id, kind: "binary", y: mk(dsRaw, id) }));
    const powerRaw = {};
    if (!skipPower) for (const t of posTargets) { const sub = subsetFor(dsRaw, t.y); if (sub.nLineages >= MIN_LINEAGES) powerRaw[t.id] = powerForSet(sub, { source: src, organ, reps, m4Draws, shuffles, holmFamily: posTargets.length, ladder: [0.4, 0.8], seed }); }
    const pos = evaluateScalarTargets({ ds: dsRaw, models: modelsRaw, targets: posTargets.map((t) => ({ ...t, kind: "brier" })), source: src, registered: KIND_SOURCES[src].registered, exploratoryFactor: Math.max(1, exploratory), powerByTarget: powerRaw, shuffles, ctlShuffles: quick ? 60 : 200, seed });
    const recovered = Object.fromEntries(pos.cards.map((c) => [c.id, { strict: c.verdict === "GAIN", directionOnly: c.gain?.ci95?.[0] > 0, verdict: c.verdict }]));
    const bothRecovered = POSITIVE.every((id) => recovered[id]?.strict);
    // every outcome on the full strict features
    const folds = lofoFolds(ds, { by: "branch" });
    const models = modelsFor(ds, folds, { source: src, organ, m4Draws, seed, cacheDir: CACHE_DIR });
    const targets = outcomeIds.map((id) => ({ id, kind: "brier", y: mk(ds, id) }));
    const powerBy = {};
    if (!skipPower) { const seen = new Map(); for (const t of targets) { const sig = defSignature(t.y); const sub = subsetFor(ds, t.y); if (sub.nLineages < MIN_LINEAGES) continue; if (!seen.has(sig)) seen.set(sig, powerForSet(sub, { source: src, organ, reps, m4Draws, shuffles, holmFamily: targets.length, ladder: [0.4, 0.8], seed })); powerBy[t.id] = seen.get(sig); } }
    const ev = evaluateScalarTargets({ ds, models, targets, source: src, registered: KIND_SOURCES[src].registered, exploratoryFactor: Math.max(1, exploratory), powerByTarget: powerBy, shuffles, ctlShuffles: quick ? 60 : 200, seed });
    // the positive-control rule: if both are not recovered, every other outcome is UNDERPOWERED whatever it shows
    if (!bothRecovered) for (const c of ev.cards) if (!POSITIVE.includes(c.id) && c.verdict === "GAIN") { c.registeredVerdict = "GAIN"; c.verdict = "UNDERPOWERED"; c.reasons = [...(c.reasons ?? []), "C4: the positive controls (r3 script_without_case, r1 ear_inert_not_needed) were not both recovered from raw-only kinds"]; }
    out.sources.push({ source: src, registered: KIND_SOURCES[src].registered, positiveControls: { recovered, bothRecovered, cards: pos.cards }, targets: ev.cards, seconds: Math.round((Date.now() - t0) / 1000) });
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 12. L3: which prior family to borrow (the non-lexical frame prior)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const log2 = Math.log2;
export function frameScorer(ds, summaries, frames) {
  const cache = new Map();
  const ctxOf = ds.ids.map((_, i) => (summaries[i]?.l3 ? Object.entries(summaries[i].l3.ctx) : null));
  const donor = (d, key) => {
    const id = `${d}#${key}`;
    let v = cache.get(id);
    if (v === undefined) {
      const fr = frames[d];
      if (!fr) v = null; else { const [P, N] = key.split("|"); const fd = frameDist(fr, P, N); v = fd ? fd.dist : null; }
      cache.set(id, v);
    }
    return v;
  };
  return (h, idx, w = null) => {
    const ctx = ctxOf[h]; const S = summaries[h]?.l3;
    if (!ctx || !S || !S.nTok) return NaN;
    let bits = 0;
    const mix = new Float64Array(UPOS.length);
    for (const [key, counts] of ctx) {
      mix.fill(0); let ws = 0;
      for (let a = 0; a < idx.length; a++) { const dd = donor(idx[a], key); if (!dd) continue; const wt = w ? w[a] : 1; for (let u = 0; u < mix.length; u++) mix[u] += wt * dd[u]; ws += wt; }
      if (!ws) return NaN;
      for (let u = 0; u < counts.length; u++) if (counts[u]) bits += counts[u] * -log2(mix[u] / ws);
    }
    return bits / S.nTok;
  };
}

export async function runL3({ ds, sources, organ, quick = false, seed = SEED, reps = PLANT_REPS, m4Draws = M4_DRAWS, shuffles = SHUFFLES, skipPower = false, loso = false, cacheDir = CACHE_DIR, ladder = [0.4, 0.8] }) {
  const summaries = ds.ids.map((stem) => { try { return systemSummary(stem, { cacheDir, gates: [] }); } catch (e) { return { stem, error: String(e.message) }; } });
  const frames = ds.ids.map((stem) => readFramePrior(stem)?.frames ?? null);
  const gaps = ds.ids.flatMap((stem, i) => (!frames[i] ? [{ system: stem, reason: "no_received_frame_prior" }] : !summaries[i]?.l3?.nTok ? [{ system: stem, reason: "no_oov_tokens_or_summary" }] : []));
  const integrity = summaries.map((x) => x?.integrity?.frame).filter(Boolean);
  const comparable = integrity.filter((x) => x.comparable);
  const integrityCard = { comparable: comparable.length, equal: comparable.filter((x) => x.equal).length, differs: integrity.filter((x) => !x.comparable).map((x) => ({ stem: x.stem, reason: x.reason })), verdict: comparable.length < 10 ? "UNDERPOWERED integrity (fewer than 10 comparable stems)" : comparable.every((x) => x.equal) ? "PASS" : "FAIL: the re-implemented builder disagrees with a received prior" };
  const scorer = frameScorer(ds, summaries, frames);
  const folds = lofoFolds(ds, { by: loso ? "system" : "branch" });
  const exploratory = sources.filter((s) => !KIND_SOURCES[s].registered).length;
  const out = { schema: "TransferCard@1", task: "L3", split: loso ? "LOSO" : "LOBO", preregSha: registryDigest(), version: TRANSFER_VERSION, typed: TYPED, system: describeDs(ds), gaps, integrity: integrityCard, sources: [] };
  const powerCache = new Map();
  for (const src of sources) {
    const t0 = Date.now();
    const models = modelsFor(ds, folds, { source: src, organ, m4Draws, seed, cacheDir });
    const ev = evalModels(ds, models, scorer, { loso, m3Union: true });
    const live = Array.from({ length: ds.n }, (_, i) => i).filter((i) => Number.isFinite(ev.loss.M0g[i]));
    const sub = subsetDataset(ds, live);
    let power = null;
    if (!skipPower) { const key = `${src}|${live.join(",")}`; if (!powerCache.has(key)) powerCache.set(key, powerForSet(sub, { source: src, organ, reps, m4Draws, shuffles, holmFamily: 1, ladder, seed, scalar: false })); power = powerCache.get(key); }
    const base = lineageMean(lossByLineage(ds, ev.loss.M0star));
    const sesoi = SESOI_REL * base;
    const gr = gainRule({ ds, lossM0: ev.loss.M0star, lossM3: ev.loss.M3, loss4: ev.loss4, D: ev.D, shuffleGains: null, sesoi, power: power ? { up: power.up, down: power.down, nullOk: power.nullOk } : null, seed });
    // references that never enter the rule
    const oracleSingle = new Float64Array(ds.n).fill(NaN), uniform = new Float64Array(ds.n).fill(NaN), own = {};
    for (const n of [50, 200, 1000, 5000, "full"]) own[n] = new Float64Array(ds.n).fill(NaN);
    for (const f of models) for (const h of f.test) {
      let best = Infinity; for (const d of f.train) { const v = scorer(h, [d], null); if (Number.isFinite(v) && v < best) best = v; }
      oracleSingle[h] = Number.isFinite(best) ? best : NaN;
      if (summaries[h]?.l3?.nTok) { uniform[h] = summaries[h].l3.uniform; for (const n of Object.keys(own)) own[n][h] = summaries[h].l3.own[n]; }
    }
    const nm = (a) => fmt(lineageMean(lossByLineage(ds, a)));
    const borrowed = (h) => Math.min(ev.loss.M0g[h], Number.isFinite(ev.loss.M3[h]) ? ev.loss.M3[h] : Infinity);
    const nEven = live.map((h) => { for (const n of [50, 200, 1000, 5000]) if (own[n][h] < borrowed(h)) return n; return ">5000"; });
    const nEvenCounts = {}; for (const v of nEven) nEvenCounts[v] = (nEvenCounts[v] ?? 0) + 1;
    const m5 = nestedSE(ds, ev.loss.M3);
    const m4sorted = []; for (let d = 0; d < ev.D; d++) m4sorted.push(lineageMean(lossByLineage(ds, ev.loss4.subarray(d * ds.n, (d + 1) * ds.n)))); m4sorted.sort((a, b) => a - b);
    let verdict = gr.verdict, interpretation = null;
    if (verdict === "GAIN" && power?.bound) { verdict = "UNDERPOWERED"; gr.reasons.push("e: this source's power is established only as an oracle upper bound"); }
    if (verdict === "GAIN") interpretation = lineageMean(lossByLineage(ds, ev.loss.M3)) <= lineageMean(lossByLineage(ds, ev.loss.M5knn)) + m5 ? "kinds help beyond a continuous regressor" : "structure helps; the kind is a summary of it, not the mechanism";
    out.sources.push({
      source: src, registered: KIND_SOURCES[src].registered, verdict, interpretation, components: gr.components, reasons: gr.reasons,
      losses: { D_global: nm(ev.loss.M0g), D_lineageWeighted: nm(ev.loss.M0l), D_script: nm(ev.loss.M1), M0star: nm(ev.loss.M0star), M0starIs: ev.m0starName, D_kind: nm(ev.loss.M3), D_randomMedian: fmt(quantile(m4sorted, 0.5)), D_knn: nm(ev.loss.M5knn), D_bestSingleDonor_hindsight_REFERENCE: nm(oracleSingle), uniform_REFERENCE: nm(uniform), own50: nm(own[50]), own200: nm(own[200]), own1000: nm(own[1000]), own5000: nm(own[5000]), ownFull_REFERENCE: nm(own.full) },
      sesoi: fmt(sesoi), gain: { mean: fmt(gr.stats.meanGain), relative: fmt(gr.stats.meanGain / base), ci95: gr.stats.ci95.map((x) => fmt(x)), lineagesWin: `${gr.stats.wins} of ${gr.stats.nLineages}`, reach: gr.stats.reach, p4: fmt(gr.stats.p4, 5), jackknifeMin: { lineage: fmt(gr.stats.jackknife.minDropLineage), branch: fmt(gr.stats.jackknife.minDropBranch) } },
      noKindRate: fmt(ev.noKind / Math.max(1, ev.tested), 3),
      randomKindControl: randomKindControl(ds, ev, { draws: quick ? 60 : 200, seed }),
      valueOfTransfer_nEven: nEvenCounts,
      anyDonorBeatsUniform: lineageMean(lossByLineage(ds, ev.loss.M0star)) < log2(UPOS.length),
      power: power ? { up: power.up, down: power.down, nullRate: power.nullRate, nullOk: power.nullOk, mdeRelativeLoss: power.mdeRelativeLoss, ladder: power.ladder } : null,
      ifRegisteredPowerWereWaived: { conjunctAD: gr.conjunctAD, note: "(a)-(d) only; NOT a verdict" },
      perLineage: gr.stats.perLineage.map((x) => ({ lineage: x.lineage, gain: fmt(x.gain), m0star: fmt(x.m0), m3: fmt(x.m3) })),
      kindsPerFold: models.map((f) => ({ fold: f.fold, kinds: f.kinds.map((k) => k.members.map((i) => ds.ids[i])), noKind: f.noKind, held: f.test.length })),
      seconds: Math.round((Date.now() - t0) / 1000),
    });
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 13. L2: derive the thresholds the reading types in by hand
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const weightedMedian = (vals, w) => {
  const e = vals.map((v, i) => [v, w ? w[i] : 1]).filter(([v]) => Number.isFinite(v)).sort((a, b) => a[0] - b[0]);
  if (!e.length) return NaN;
  const tot = e.reduce((a, x) => a + x[1], 0); let c = 0;
  for (const [v, wt] of e) { c += wt; if (c >= tot / 2 - 1e-12) return v; }
  return e[e.length - 1][0];
};
const snap = (k, lo, hi) => Math.min(hi, Math.max(lo, Math.round(k)));

export async function runL2({ ds, sources, organ, gates = ["G-frame", "G-floor"], quick = false, seed = SEED, reps = PLANT_REPS, m4Draws = M4_DRAWS, shuffles = SHUFFLES, skipPower = false, cacheDir = CACHE_DIR }) {
  const folds = lofoFolds(ds, { by: "branch" });
  const summaries = ds.ids.map((stem) => { try { return systemSummary(stem, { cacheDir, gates }); } catch (e) { return { stem, error: String(e.message), gates: {} }; } });
  const d01 = ds.features.indexOf("d01");
  const exploratory = sources.filter((s) => !KIND_SOURCES[s].registered).length;
  const out = { schema: "TransferCard@1", task: "L2", preregSha: registryDigest(), version: TRANSFER_VERSION, typed: TYPED, system: describeDs(ds), notRun: [
    { gate: "ARRIVALS_FLOOR = 2", reason: "declared structural, not a dial (listening-cast); its outcome needs the whole lane" },
    { gate: "KEY_ALPHA = 0.05 (the keyness reading)", reason: "its outcome needs the lane and a gold of 'being'" },
    { gate: "r1 NEED_FLOOR = 0.02", reason: "needs r1's tokeniser and ear arms" } ], gates: [] };
  for (const gid of gates) {
    const gate = GATES[gid];
    const kStar = new Float64Array(ds.n).fill(NaN), Ymat = ds.ids.map(() => null), flat = new Float64Array(ds.n).fill(NaN);
    ds.ids.forEach((_, i) => { const g = summaries[i]?.gates?.[gid]; if (!g || !(g.kStar >= 0)) return; kStar[i] = g.kStar; Ymat[i] = g.Y; flat[i] = g.flat ? 1 : 0; });
    const definedIdx = Array.from({ length: ds.n }, (_, i) => i).filter((i) => Number.isFinite(kStar[i]));
    const regretOf = (h, k) => { const Y = Ymat[h]; if (!Y) return NaN; const a = Y[snap(k, 0, Y.length - 1)], b = Y[kStar[h]]; return Number.isFinite(a) && Number.isFinite(b) ? lossOf(gate, a) - lossOf(gate, b) : NaN; };
    const scorer = (h, idx, w = null) => { if (!Number.isFinite(kStar[h])) return NaN; const k = weightedMedian(idx.map((i) => kStar[i]), w); return Number.isFinite(k) ? regretOf(h, k) : NaN; };
    // T0: typed; T3: regression
    const T0 = new Float64Array(ds.n).fill(NaN), T3 = new Float64Array(ds.n).fill(NaN);
    for (const i of definedIdx) T0[i] = regretOf(i, K_TYPED);
    const predictors = (i) => [1, log2(summaries[i].sys?.trainWords ?? 1), log2(summaries[i].sys?.trainVocab ?? 1), d01 >= 0 ? ds.value[i * ds.F + d01] : 0];
    for (const f of folds) {
      const tr = f.train.filter((i) => Number.isFinite(kStar[i]) && summaries[i]?.sys);
      if (tr.length < 6) continue;
      const X = tr.map(predictors), yv = tr.map((i) => kStar[i]);
      const p = X[0].length; const A = new Float64Array(p * p), b = new Float64Array(p);
      X.forEach((x, r) => { for (let a = 0; a < p; a++) { b[a] += x[a] * yv[r]; for (let c = 0; c < p; c++) A[a * p + c] += x[a] * x[c]; } });
      for (let a = 1; a < p; a++) A[a * p + a] += 1e-3; // tiny ridge so the solve is defined when a predictor is constant
      const inv = invertSPD(A, p); const beta = Array.from({ length: p }, (_, a) => { let s2 = 0; for (let c = 0; c < p; c++) s2 += inv[a * p + c] * b[c]; return s2; });
      for (const h of f.test) if (Number.isFinite(kStar[h]) && summaries[h]?.sys) { const x = predictors(h); T3[h] = regretOf(h, x.reduce((acc, xv, a) => acc + xv * beta[a], 0)); }
    }
    // flatness (INERT)
    const lineageFlat = [];
    for (let l = 0; l < ds.nLineages; l++) { const mem = definedIdx.filter((i) => ds.lineageIdx[i] === l); if (!mem.length) continue; lineageFlat.push({ lineage: ds.lineages[l], flat: mem.filter((i) => flat[i] === 1).length / mem.length >= 0.5, systems: mem.length }); }
    const nl = lineageFlat.length, reach = reachability(nl), flatN = lineageFlat.filter((x) => x.flat).length;
    const inert = !reach.unreachable && flatN >= reach.kNeeded;
    const typedRegret = lineageMean(lossByLineage(ds, T0));
    const gateCard = {
      gate: gid, typed: gate.typed, unit: gate.unit, proxy: gate.proxy, file: gate.file, grid: gate.grid, systems: definedIdx.length, lineages: nl,
      kStarDistribution: Object.fromEntries(GATES[gid].grid.map((tau, k) => [tau, definedIdx.filter((i) => kStar[i] === k).length])),
      meanY: gate.grid.map((_, k) => fmt(mean(definedIdx.map((i) => Ymat[i][k])))),
      flatness: { flatLineages: flatN, lineages: nl, reach, inert, rule: "INERT iff the paired-bootstrap Y(tau*) - Y(typed) is within its SE for at least the reachability count of lineages" },
      typedNestedRegret: fmt(typedRegret), integrity: gid === "G-frame" ? "see L3 integrity (same builder)" : gid === "G-floor" ? "wordFloor is the imported function: the typed setting is reproduced by construction" : "see volumeIntegrity",
      sources: [],
    };
    for (const src of sources) {
      const models = modelsFor(ds, folds, { source: src, organ, m4Draws, seed, cacheDir });
      const ev = evalModels(ds, models, scorer, {});
      const lossStar = lineageMean(lossByLineage(ds, T0)) <= lineageMean(lossByLineage(ds, ev.loss.M0)) ? T0 : ev.loss.M0;
      const starName = lossStar === T0 ? "T0 typed" : `T1 median (${ev.m0name})`;
      const sesoi = SESOI_REGRET;
      const rel = Math.min(0.49, sesoi / Math.max(1e-9, lineageMean(lossByLineage(ds, lossStar))));
      let power = null;
      if (!skipPower && nl >= MIN_LINEAGES) { power = powerForSet(subsetDataset(ds, definedIdx), { source: src, organ, reps, m4Draws, shuffles, holmFamily: 1, ladder: [0.4, 0.8], seed, scalar: false, sesoiRel: rel }); }
      const gr = gainRule({ ds, lossM0: lossStar, lossM3: ev.loss.M3, loss4: ev.loss4, D: ev.D, shuffleGains: null, sesoi, power: power ? { up: power.up, down: power.down, nullOk: power.nullOk } : null, seed });
      let verdict = inert ? "INERT" : gr.verdict;
      if (verdict === "GAIN" && power?.bound) { verdict = "UNDERPOWERED"; gr.reasons.push("e: this source's power is established only as an oracle upper bound"); }
      const nm = (a) => fmt(lineageMean(lossByLineage(ds, a)));
      gateCard.sources.push({
        source: src, registered: KIND_SOURCES[src].registered, verdict, registeredVerdictIfNotInert: gr.verdict, components: gr.components, reasons: gr.reasons,
        regret: { T0_typed: nm(T0), T1_median: nm(ev.loss.M0), M0star: nm(lossStar), M0starIs: starName, T2_kindMates: nm(ev.loss.M3), T3_regression: nm(T3), kNN_mates: nm(ev.loss.M5knn) },
        sesoi, relativeSesoiForPower: fmt(rel, 4), gain: { mean: fmt(gr.stats.meanGain), ci95: gr.stats.ci95.map((x) => fmt(x)), lineagesWin: `${gr.stats.wins} of ${gr.stats.nLineages}`, reach: gr.stats.reach, p4: fmt(gr.stats.p4, 5), jackknifeMin: { lineage: fmt(gr.stats.jackknife.minDropLineage), branch: fmt(gr.stats.jackknife.minDropBranch) } },
        noKindRate: fmt(ev.noKind / Math.max(1, ev.tested), 3),
        power: power ? { up: power.up, down: power.down, nullRate: power.nullRate, nullOk: power.nullOk, mdeRelativeLoss: power.mdeRelativeLoss, ladder: power.ladder } : null,
        ifRegisteredPowerWereWaived: { conjunctAD: gr.conjunctAD, note: "(a)-(d) only; NOT a verdict" },
      });
    }
    out.gates.push(gateCard);
  }
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// 14. CLI
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function parseArgs(argv) {
  const a = { task: "all", sources: null, quick: false, reps: PLANT_REPS, m4: M4_DRAWS, shuffles: SHUFFLES, skipPower: false, variant: "strict", out: OUT_DIR, gates: ["G-frame", "G-floor"], loso: false, profiles: "auto" };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--task") a.task = argv[++i];
    else if (k === "--sources") a.sources = argv[++i].split(",");
    else if (k === "--quick") a.quick = true;
    else if (k === "--reps") a.reps = Number(argv[++i]);
    else if (k === "--m4") a.m4 = Number(argv[++i]);
    else if (k === "--shuffles") a.shuffles = Number(argv[++i]);
    else if (k === "--skip-power") a.skipPower = true;
    else if (k === "--variant") a.variant = argv[++i];
    else if (k === "--gates") a.gates = argv[++i].split(",");
    else if (k === "--loso") a.loso = true;
    else if (k === "--profiles") a.profiles = argv[++i];
    else if (k === "--snapshot") a.snapshot = true;
    else if (k === "--out") a.out = argv[++i];
    else if (k === "--split") { if (argv[++i] !== "dev") throw new Error("transfer: only the development split exists here (--split dev)"); }
    else throw new Error(`transfer: unknown argument ${k}`);
  }
  if (a.quick) { a.reps = Math.min(a.reps, 8); a.m4 = Math.min(a.m4, 200); a.shuffles = Math.min(a.shuffles, 199); }
  return a;
}
const brief = (card) => JSON.stringify(card, (k, v) => (v instanceof Float64Array ? undefined : v), 1);

export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  if (a.snapshot) { console.log(JSON.stringify(snapshotProfiles())); return 0; }
  const { sources, organ, absent } = await availableSources(a.sources);
  const strict = await loadUniverse({ featureSet: a.variant === "leaky" ? "leaky" : "strict", prefer: a.profiles });
  const results = { schema: "TransferReport@1", preregSha: registryDigest(), absentSources: absent, universeSource: strict.source, universe: describeDs(strict.ds), args: a, cards: {} };
  fs.mkdirSync(a.out, { recursive: true });
  const write = (name, card) => { fs.writeFileSync(path.join(a.out, `transfer-${name}.json`), brief(card)); results.cards[name] = card; };
  const want = (t) => a.task === "all" || a.task === t;
  if (want("L1")) write(`L1-${a.variant}`, await runL1({ ds: strict.ds, sources, organ, variant: a.variant, quick: a.quick, reps: a.reps, m4Draws: a.m4, shuffles: a.shuffles, skipPower: a.skipPower, loso: a.loso }));
  if (want("L3")) write("L3", await runL3({ ds: strict.ds, sources, organ, quick: a.quick, reps: a.reps, m4Draws: a.m4, shuffles: a.shuffles, skipPower: a.skipPower, loso: a.loso }));
  if (want("L2")) write("L2", await runL2({ ds: strict.ds, sources, organ, gates: a.gates, quick: a.quick, reps: a.reps, m4Draws: a.m4, shuffles: a.shuffles, skipPower: a.skipPower }));
  if (want("L4")) { const raw = await loadUniverse({ featureSet: "raw", prefer: a.profiles }); write("L4", await runL4({ ds: strict.ds, dsRaw: raw.ds, sources, organ, quick: a.quick, reps: a.reps, m4Draws: a.m4, shuffles: a.shuffles, skipPower: a.skipPower })); }
  fs.writeFileSync(path.join(a.out, "transfer-report.json"), brief({ ...results, cards: Object.keys(results.cards) }));
  console.log(JSON.stringify({ wrote: Object.keys(results.cards).map((k) => path.join(a.out, `transfer-${k}.json`)), absentSources: absent, universe: results.universe.n }, null, 1));
  return 0;
}
if (import.meta.url === `file://${process.argv[1]}`) main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
