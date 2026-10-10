// eval/law/window.mjs — T6, THE BOUND: "bounded by differences that make a difference".
//
// =============================== PREREGISTRATION BEGIN ===============================
// Module: eval/law/window.mjs (primitives in eval/law/window-prims.mjs).
// Written 2026-10-05 BEFORE the first run of this module. The sha256 of the lines
// between the BEGIN and END markers is computed from this file by every run and recorded
// in its output (headerSha256); it was also recorded at the moment of writing, so a
// later edit of this block is detectable. The authority is docs/LAW-FALSIFICATION.md,
// revision 2 (sha256 7911b687ef46c1e3815fbac049347ba38fc90cd9b9efe8d016d0902698a8ded2):
// where this header and that document disagree the document wins and this file is the bug.
// khora is a ZERO-MODEL reader: the learners below are generic measuring instruments
// trained from scratch on the data of the run (no pretrained weights, no embeddings, no
// external data); they are not part of khora's reading and no claim is about them.
//
// ---- 0. THE CLAIM UNDER TEST (clause C3 = L-B) ---------------------------------------
// C3: the relevant company and the relevant impact are bounded by differences that make a
// difference: widening the context or the horizon beyond the dmdWindow-measured depth
// changes nothing about the role. This module implements the document's T6 (T6a plateau,
// CORE; T6b transfer to gold, R5-only; T6c interventional scramble, CORE; T6d one bound in
// one unit, R5-only; T6e cross-sentence, AUXILIARY), the data-limitation sweep (typed gaps
// data_limited / no_sweep_headroom, amendment A9), the persistence check (typed gap
// non_monotone), and the causal versus non-causal gap (descriptive, labelled, feeds A7).
// NOT here: the claim verdict, k_N, the ladder of readings (verdict.mjs), the planted
// gates G0..G5 (gates.mjs), protocol X (needs cross-family induction descriptors; typed
// UNTESTED(protocol X not implemented in window.mjs), never inferred), the SESOI map and
// n_min (stats.mjs / gate G2: every verdict-bearing function here TAKES sesoi and nMin).
//
// ---- 1. DEFINITIONS ------------------------------------------------------------------
// 1.1 Observation and stream. As LAW-FALSIFICATION 2.1: a syntactic word is a CoNLL-U row
//   with integer ID; the stream of a sentence is its words with UPOS PUNCT removed; identity
//   = form.normalize("NFC").toLowerCase(); evaluation tokens E = stream units whose UPOS is
//   in UPOS14 = {ADJ ADP ADV AUX CCONJ DET INTJ NOUN NUM PART PRON PROPN SCONJ VERB}. An
//   observation is (sentence, index i) with its gold UPOS in a PARALLEL array; the gold is
//   never read by any feature function (rule 6).
// 1.2 The ladder. Token rungs H = {1, 2, 4, 8, 16} and the open end WHOLE (the whole
//   sentence); rung indices 0..5 (WHOLE = 5). Frame ladders (impact side): M* in
//   {0,8,16,32,64,128,256,512} preceding frames, F* in {0,1,2,4,8,16,32} following frames,
//   RUNG 0 = the self frame only. Slot-radius ladder {1,2,4,8,whole}. Size sweep N in
//   {5k,10k,20k,40k,full} tokens (nested). Document sentence ladder for T6e {0,1,2,4,8}.
// 1.3 Features (COMP-OCC, protocol W, the arm of the bound). Rung h of an observation at
//   index i sees the identities at offsets -1..-h (CAUSAL: left only) or -h..-1,+1..+h (NON-
//   CAUSAL: both sides), CENTRE MASKED, no type vector, no own descriptor, no sentinel, no
//   exposure count. Where the window leaves the sentence the missing slot is filled by an
//   identity drawn i.i.d. from the exposure's unigram distribution, seeded by (khora-law-v2,
//   stem, split, sentence index, offset): BOUNDARY-BLIND (2.3). A feature is the pair
//   (signed offset, identity) hashed to D = 2^16 buckets, value 1. PREFIX PROPERTY (declared
//   D1): the feature set of rung h is a subset of the feature set of rung 2h and the near
//   features are bit-identical across rungs, with NO cross-offset normalisation inside the
//   block (a per-token unit norm across offsets would make the near features weaker at every
//   deeper rung, a rung-dependent confound; 2.7's per-block normalisation applies between
//   arms, not between the rungs of one arm). WHOLE = offsets up to Lwhole = min(longest
//   stream in the exposure sample and the evaluation material, wholeCap), wholeCap = 64 per
//   side (a compute guard, declared D2); the share of tokens with context beyond the cap is
//   recorded as whole_capped and is never hidden.
// 1.4 Models. M_d (d in H and WHOLE): the gold-trained role model, multinomial logistic
//   regression (learner L1 of 2.8) over rung-d features, label UPOS14, trained on the
//   language's capped train sample (N_cap = 20,000 tokens, seeded permutation prefix).
//   Objective = mean cross-entropy + (lambda/2)||W||^2 (bias unpenalised, declared D13),
//   deterministic L-BFGS to relative gradient norm 1e-6 or 500 iterations, lambda from the
//   grid {1e-4,1e-3,1e-2,1e-1,1,10} (the whole budget), selected per (rung, causality) by
//   mean cross-entropy on the measurement split. U_d: the GOLD-FREE predictor of 2.6a: the
//   same features and learner, trained without any UD label to predict the identity-level
//   induced class (2.4) of the centre token; its classes come from unsupervised induction
//   on the unlabelled forms of the exposure (PPMI at offsets -2,-1,+1,+2, randomised SVD,
//   spherical k-means, K* by split-half stability above the 95th percentile of the
//   within-sentence-shuffle null, ladder {2,..,128}; K* = 1 is the typed gap
//   no_unsup_conclusion). Learner L2 (one hidden layer of 64 ReLU, Adam 1e-3, batch 256,
//   30 epochs) is available through the learner option and a unit outcome is robust only if
//   L1 and L2 agree (2.8); a stand-in for L2 is in the primitives and is labelled.
// 1.5 The conclusion, equality and the noise floor. dmdWindow(observations, derive,
//   {candidates: H, restrict, equal}) of kernel/activation.js is CALLED, not re-implemented.
//   observations = the measurement-split tokens with their full sentence context;
//   restrict(obs, depth) = the same tokens with context truncated to depth; derive(x) = the
//   ARGMAX PREDICTIONS of M_depth (or U_depth) on x, and of M_whole (U_whole) on the
//   untruncated input; equal(a, b) = the fraction of tokens whose argmax agrees is >= 1 - u.
//   The noise floor u is MEASURED (2.6a): two models per rung are trained from two seeded
//   sentence-with-replacement resamples of the capped train sample (lambda fixed at the
//   rung's selected value), and u = the median over rungs of the argmax disagreement rate on
//   the measurement split. Declared D4: u^M is measured with gold-trained pairs and used
//   for h*_an, for T6c and as the SESOI basis; u^U is measured with unsupervised pairs and
//   used for h*_u (a tolerance must be the instrument's own disagreement with itself FOR
//   THAT conclusion). u is recomputed with the same recipe at each size N of the sweep.
// 1.6 Horizons. h*_an = dmdWindow on gold-trained models (the OPERATING horizon; analytic,
//   never the transfer test, 1.3 of the document). h*_u = dmdWindow on the gold-free U_d
//   (the horizon of a conclusion that did not see gold; the object of the transfer test).
//   If no rung agrees the result is the typed gap reach_exceeds_candidates, the top rung
//   (16) is then USED AND FLAGGED, never silently substituted. PERSISTENCE: dmdWindow returns
//   the first agreeing depth; the full agreement profile over all rungs is computed and the
//   window is non_monotone if any deeper rung disagrees (UNDERPOWERED for T6a and T6b).
//   PER-TOKEN WINDOW (secondary): dmdWindow with exact equality on the single token's argmax,
//   for tokens with at least 8 tokens of left context; median and 90th percentile.
// 1.7 Data-limitation sweep. h*_u (and optionally h*_an) is re-measured at N in the nested
//   sizes. Rule: for a language with >= 40,000 train tokens h*_u(N_cap) must EQUAL
//   h*_u(2 N_cap); if h*_u rises with N the typed gap is data_limited (h* is then a lower
//   bound; T6a and T6b are UNDERPOWERED(data)); a language with < 40,000 train tokens has
//   the typed gap no_sweep_headroom and its T6 outcomes carry the label cap-limited.
//   A fall of h*_u with N is reported as n_unstable (INCONCLUSIVE, not a typed gap).
// 1.8 The accuracy curve. For each rung r (and each causality) on the EVALUATION split:
//   per-token loss l_t(r) = -log2 p'(y_t) with p' the model probability floored at 1e-4 and
//   renormalised; MAJ = the train class prior under the same floor; G(r) = mean l(MAJ) -
//   mean l(r), bits per token (2.9). Paired differences use the SAME tokens; the interval is
//   a sentence-block bootstrap (B = 2000, seeded); "x_lo" and "x_hi" are the 5th and 95th
//   percentiles (one-sided 95 percent). PLATEAU LOCUS h_p = the shallowest rung r with
//   G(WHOLE) - G(r) <= sesoi (a location, computed per bootstrap replicate for certification).
// 1.9 Transfer. T-a: h_p within one ladder rung of h*_u. T-b: H_imp within one ladder rung
//   of h*_u (both in TOKENS). T-c (interventional, on M_whole only): for the tokens with
//   at least max(k, 2) visible context units beyond the near region (k = h*_u, the distance
//   to the next dyadic rung), SCRAMBLE = a seeded random permutation of the identities at the
//   visible positions farther than h*_u from the centre (the union of both sides for the
//   non-causal arm; the left side for the causal arm), positions kept, near region intact.
//   Tokens whose beyond-region has < max(k,2) units or only identical units (the permutation
//   would be a no-op) are EXCLUDED AND COUNTED. WITHIN-CONTROL: the same permutation of the
//   near region (offsets 1..h*_u); where the near region has < 2 distinct units for a
//   token (always so for the causal arm at h*_u = 1) the control is the NEAR-RESAMPLE
//   (replace the near units by unigram draws), declared D7; both counts are reported. The
//   same scramble applied to M_{h*} (input masked beyond h*) is invariant by construction,
//   is asserted trivial and is EXCLUDED from every pass statistic. A secondary variant
//   BEYOND-RESAMPLE (beyond units replaced by unigram draws) is reported, no verdict.
// 1.10 Impact windows (the impact side of T6d; needs a slot organ, so the type function is
//   INJECTED: impactOf / typeOf; the repo's slots.mjs is wired by run.mjs, not here).
//   M* = dmdWindow over the preceding-frame ladder with conclusion = the discrete IMPACT-SLOT
//   type computed with the last `depth` preceding frames at F = 0 versus all preceding frames
//   (capped 512); F* = the same over the following-frame ladder with rung 0 at M = all
//   preceding; equal = exact agreement on >= 1 - u_imp of the sampled tokens (u_imp = the
//   disagreement of the type assignment under two seeded resamplings of the sample, labels
//   aligned by greedy majority mapping, the exact-zero null type fixed). F* = 0 defines the
//   FRAME-CAUSAL impact arm. H_imp (TOKENS) = dmdWindow with the SAME token ladder H, restrict
//   = the typed slot deltas within `depth` tokens of the ablated token (a frame boundary
//   counts as the tokens it skips), derive = the discrete type, equal as above. No
//   sentence-to-token conversion exists anywhere in this module (revision 1's median-length
//   conversion is exported ONLY as legacyFrameToTokens, to demonstrate the defect).
// 1.11 The causal versus non-causal gap (descriptive; no verdict of its own). Both arms are
//   run with the same recipe. Reported per rung: dG(h) = G_nc(h) - G_c(h) (equal h, so the
//   non-causal arm sees twice the units); the MATCHED-VISIBILITY series dGm(h) = G_nc(h) -
//   G_c(2h) for h in {1,2,4,8} (equal numbers of context units: the pure effect of looking
//   ahead); the horizon shift h*_u,nc vs h*_u,c and h_p,nc vs h_p,c in rungs. Classification
//   (reported, feeds A7 in T1/T5, never a rung): LOOKAHEAD_NEEDED iff the lower bound of
//   dG(WHOLE) > sesoi, else READING_SUFFICIENT iff the upper bound < sesoi, else UNRESOLVED.
//   PRIMARY VERDICTS USE THE CAUSAL ARM (rule 5); every non-causal number is labelled.
// 1.12 Cross-sentence (T6e, AUXILIARY). Eligible iff the TRAIN treebank has >= 100 "# newdoc"
//   markers and >= 2 sentences per document on average; otherwise UNTESTED(no document
//   order), a typed gap, never support. When eligible, the within-sentence window is fixed
//   at h*_u (causal) and a hashed bag of the identities of the r preceding sentences of the
//   same document is added, r in {0,1,2,4,8}; the unit rule of T6a is applied to the
//   r ladder with r = 0 as the base.
//
// ---- 2. UNIT OUTCOMES (2.10(5): PASS, FAIL, INCONCLUSIVE, UNDERPOWERED(.), GAP) ----------
// sesoi (bits) and nMin are INPUTS (verdict-bearing values come from gate G2); T6c's margin
// is u^M itself (the SESOI is defined in argmax-change units). CERTIFIED means the one-sided
// 95 percent level of 1.8; for the rung-distance statements of T6b and T6d it means the
// bootstrap probability of the statement is >= 0.95 (declared D6).
// T6a (plateau): precondition gaps first, in this order: GAP(no_unsup_conclusion | no_data |
//   no_induction); UNDERPOWERED(n) if the evaluation tokens < nMin; UNDERPOWERED(data) if
//   data_limited; UNDERPOWERED(non_monotone) if h*_u is not persistent. If h*_u is
//   reach_exceeds_candidates the outcome is FAIL(reach_exceeds_candidates) iff the upper
//   bound of the agreement rate at the top rung is < 1 - u^U, else INCONCLUSIVE.
//   Otherwise with j* the rung index of h*_u: PASS iff the upper bound of G(WHOLE) - G(h*_u)
//   < sesoi AND for every rung beyond h*_u the upper bound of its per-doubling increment
//   < sesoi. FAIL iff two CONSECUTIVE rungs beyond h*_u both have a certified increment
//   (lower bound) > sesoi. Otherwise INCONCLUSIVE with the reason single_rise or
//   not_equivalent. (At h*_u = 16 only one rung lies beyond, so FAIL is not reachable:
//   a ladder-top limit, reported.) Label cap-limited when no_sweep_headroom.
// T6b (transfer to gold): same preconditions. PASS iff P_boot(|idx(h_p) - idx(h*_u)| <= 1)
//   >= 0.95; FAIL iff P_boot(|idx(h_p) - idx(h*_u)| > 1) >= 0.95; else INCONCLUSIVE.
//   idx = ladder index (1,2,4,8,16,WHOLE = 0..5). h*_an vs h*_u agreement is REPORTED, not a rule.
// T6c (interventional, M_whole only, h*_u): UNDERPOWERED(n) if eligible tokens < nMin.
//   Let r_b = the argmax change rate under the beyond scramble, r_w under the within control.
//   PASS iff the upper bound of r_b < u^M AND the lower bound of r_w > u^M; FAIL iff the
//   lower bound of r_b > u^M (certified change beyond the horizon); if the beyond rate is
//   not decided but the within control is inert (lower bound of r_w <= u^M) the outcome is
//   INCONCLUSIVE(near_region_inert): the claim is vacuous for a model that ignores its near
//   context. Otherwise INCONCLUSIVE. Bootstrap = sentence-block over the eligible tokens.
// T6d (one bound in one unit): GAP(no_slot_organ) where no impact sample was supplied
//   (UNTESTED, typed); else PASS iff P_boot(|idx(H_imp) - idx(h*_u)| <= 1) >= 0.95, FAIL
//   (flag A11) iff P_boot(... > 1) >= 0.95, else INCONCLUSIVE; bootstrap over the sample.
// T6e (auxiliary): UNTESTED(no document order) or the T6a rule on the sentence ladder.
// Kill statements (6.5): T6a: two consecutive certified rises beyond h*_u (not data_limited)
//   or reach beyond the candidates; T6b: more than one rung apart; T6c: beyond-scramble
//   changes M_whole by more than u; T6d: two or more rungs apart (A11). Claim verdicts are
//   not computed here.
//
// ---- 3. NULLS ------------------------------------------------------------------------
// N1 within-sentence shuffle of the EVALUATION stream with gold carried by the token
//   (company destroyed, marginals kept): G(r) must collapse to <= sesoi at EVERY rung.
// N2 label permutation of the evaluation labels: mean G(r) <= 0 at every rung.
// N3 sentence-block bootstrap of every difference (1.8).
//
// ---- 4. CONTROLS BUILT TO FAIL AND POWER CHECKS (tests/law-window.test.js) ---------------
// C1 planted bounded additive company language (CO-ADD, horizon h0): h*_an = h*_u (oracle
//    classes) = the smallest ladder rung >= h0, h_p likewise; T6a PASS, T6b PASS, T6c PASS.
// C2 planted UNBOUNDED reach (role depends on 24 units back, rung ladder tops at 16):
//    reach_exceeds_candidates.
// C3 planted transfer failure (role reaches 16 back but the gold-free class sequence only
//    2 back): h*_u small, h_p large: T6b FAIL and T6a FAIL. The instrument must be able to
//    reject the bound.
// C4 planted data limitation (additive weights decaying with offset, small N): the sweep
//    reports data_limited (and no_sweep_headroom below 40k train tokens).
// C5 a tried array with a non-monotone tail is flagged non_monotone; the F* and M* ladders
//    include rung 0; the causal feature rows are invariant to anything right of the centre
//    and to the centre's identity (centre-swap), the non-causal rows are not invariant to
//    the right context.
// C6 beyond-scramble leaves M_{h*} EXACTLY unchanged (trivial, excluded) while it changes
//    M_whole where M_whole uses far context; within-control changes M_whole.
// C7 a planted impact generator whose slot effect reaches exactly h tokens: H_imp = the
//    smallest rung >= h and T6d PASSES against h*_u; on revision 1's sentence-to-token
//    conversion the same unit FAILS by two or more rungs.
// C8 planted right-dependent role: LOOKAHEAD_NEEDED; planted left-dependent role:
//    READING_SUFFICIENT.
// C9 the DEV-smoke gates: shuffle null N1 and label-permutation null N2 on every language.
// Power: gates.mjs G0 cell 7 (CO-TAB(h), h in {1,2,3,4,6,8}: h*_u must be the smallest rung
//   >= h in >= 90 percent of draws; UNBOUNDED -> reach_exceeds_candidates; CO-TAB(6) at one
//   quarter of the exposure -> data_limited, not h* = 1; impact horizon = h* passes T6d).
//   This module exposes recoverHorizon() so that cell can call it. A bound measured by an
//   instrument that fails that cell is UNDERPOWERED, whatever the data say.
//
// ---- 5. PREDICTIONS (recorded, not results; scored for calibration after the run) -----
// P1 (document) h*_u is 1 to 4 in analytic languages (eng, vie, ind, cmn-hans) and larger in
//    verb-final and inflected free-order languages (tur, kor, jpn, rus, fin).
// P2 (document) data_limited appears in at least 5 of 41 languages at N_cap; in the DEV smoke
//    languages: at least one of the five. vie and hun (train < 40k tokens) are
//    no_sweep_headroom.
// P3 (document) T6b passes in a majority of languages and fails in some.
// P4 (document) the beyond-scramble (T6c) passes more often than T6b passes. Added risk
//    recorded here: at N_cap = 20,000 tokens M_whole fits noise at far offsets, so a
//    beyond-scramble can change its argmax by more than u^M for a CAPACITY reason; if that
//    happens the planted gate decides whether the outcome is the law or the instrument.
// P5 plateau locus h_p <= 4 in the analytic languages; G(WHOLE) <= G(16) + sesoi in at least
//    half the languages (far features add noise at N_cap).
// P6 the non-causal arm beats the causal arm at equal h in every language, and
//    LOOKAHEAD_NEEDED in all smoke languages (right neighbours carry role information the
//    left alone does not); the matched-visibility series dGm is positive at h = 1 in all.
// P7 controls: N1 collapses G to <= sesoi at every rung and N2 gives mean G <= 0 in every
//    language (certain; a miss is an instrument defect).
//
// ---- 6. PROVISIONAL CONSTANTS FOR THE DEV SMOKE (never verdict-bearing) -----------------
// In a smoke run without the gate outputs: sesoi = the instrument's own seed floor on the
// measurement split, max over rungs of |G_A(r) - G_B(r)| between the two resampled models
// (the floor of 2.10(2), which is <= the calibrated SESOI, so the smoke is STRICT on every
// PASS and LENIENT on every FAIL); nMin = 300 tokens. Every smoke output says
// provisional: true. The DEV split is divided in two by a seeded per-sentence hash into
// MEASUREMENT (horizons, lambda, u) and EVALUATION (G curve, plateau, scramble, outcomes), so
// that the plateau is not measured on the data that set the horizon; the TEST split is never
// read by this module's CLI (the test path exists only behind the pre-registration guard of
// run.mjs: PREREGISTRATION.sha256, CODE.sha256, archived G5 pass).
//
// ---- 7. DECLARED INTERPRETATIONS (the document is silent or ambiguous; none was chosen after a result)
// D1 prefix property, no cross-offset normalisation (1.3). D2 wholeCap = 64 per side and the
// whole rung padded to a fixed width so the boundary stays blind (1.3). D3 the padding
// distribution is the train exposure unigram, fixed while reading (causal by construction).
// D4 u^M and u^U (1.5). D5 rung distance = ladder-index difference, WHOLE = index 5.
// D6 certification of rung statements by bootstrap probability >= 0.95. D7 within-control
// fallback to near-resample (1.9). D8 the dev halves (6). D9 u recomputed per sweep size.
// D10 provisional sesoi/nMin in the smoke (6). D11 protocol X is not implemented here.
// D12 the causal gap has no verdict of its own (1.11). D13 objective scaling (1.4). D14 the
// induction exposure is the capped train sample's forms. D15 reach_exceeds_candidates is a
// FAIL only when certified (2). D16 FAIL at T6a needs two consecutive certified rises, so one
// certified rise is INCONCLUSIVE(single_rise) as the document's 6.5 states.
// ================================ PREREGISTRATION END ================================

export const MODULE = "window";
// @@BODY@@
