// eval/law/form.mjs — the FORM rival, the POSITION rival, the 2x2 VISIBILITY HARNESS and the FACTOR DECOMPOSITION of the
// LAW-FALSIFICATION instrument.
// Design of record: docs/LAW-FALSIFICATION.md, revision 2 (sha256 7911b687ef46c1e3815fbac049347ba38fc90cd9b9efe8d016d0902698a8ded2),
// sections 2.3, 2.4, 2.7, 2.8, 2.9, 2.10, 4 (G0, G1, G3), T1, T2, T3, T4, T9 and Appendix A. Where this header and that document
// disagree the document wins and this file is the bug.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// PRE-REGISTRATION (READING-POLICY II.5, II.23, II.4). Written BEFORE any code below and BEFORE any run of it. Nothing in this
// header is edited after the first run; a defect found later is fixed in the code and reported next to the original smoke,
// never in place of it. The sha256 of this header block (the bytes from the first line down to the END marker line) is
// recorded by the author at write time and re-derivable with headerSha256().
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
//
// 0. WHAT THIS MODULE IS AND IS NOT. It builds the arms that RIVAL company in the law's own contrast ("a token's role is
//    determined by its company, not by its own form and not by its absolute position", C1): FORM (the token's own spelling and
//    morphology), POSITION (index and boundary distances, no content), FREQ and LEXD (the token's own exposure statistics:
//    baselines and nesting diagnostics), SUBWORD (affix company, A1); it holds the 2x2 harness (token identity visible x
//    context visible) and the factor decomposition (Shapley, interaction, partial information) that T1(ii) and T2 read. It
//    contains no LLM, no reader, no prior and no pretrained weight: khora is ZERO-MODEL and so is this file. The learners are
//    generic measuring instruments (design 2.8) trained from scratch on the data of the run. It TESTS NO HYPOTHESIS ABOUT THE
//    LAW and issues no verdict: it emits per-token information gains, statistics and intervals; verdict.mjs applies the
//    pass rules. Its only claims are about itself (section 7). The gold labels reach the scorer and the strata, never a
//    feature (rule 6); EO structures (cube, operators, phasepost) are not inputs; khora priors (pos/frame/role-config/proclitics/
//    morph) are not imported (contamination ledger, design 2.7, G4).
//
// 1. DEFINITIONS (each a pre-registered choice; the design section it implements is named).
//  1.1 Stream, evaluation set, grains (2.1, 2.2). A sentence is {units: string[] (surface forms of the stream, PUNCT removed),
//    labels: string[] (gold, parallel, scorer only), nWords}. Identity of a unit = form.normalize("NFC").toLowerCase(); FORM arms
//    alone see the spelling (case, characters). The evaluation set E = units whose label maps to a class of the grain
//    (G1 UPOS14; G2 nominal vs other; G3 PROPN vs NOUN among nominals); other units stay in the stream as context only.
//  1.2 EXPOSURE (2.3, regime E1, "listener's lifetime"; causal). Q_0 = the unlabelled forms of the language's capped train split
//    read IN ORDER (seeded sentence permutation), then the evaluation stream read in order. n_w at read time = occurrences of the
//    identity in all tokens read BEFORE the token (earlier sentences and earlier positions of its own sentence). The train
//    stream is read through the same causal exposure as the test stream, so first-sight tokens exist in training (a train token
//    seen for the first time has n = 0, exactly like a test OOV token): no leave-one-out algebra and no train/test mismatch
//    at n = 0. The dev and test passes each start from a COPY of the end-of-train exposure (the test never sees dev).
//    The strata of the evaluated test tokens (design T4, corpus.mjs D9): H0 = n_w at read time is 0; H1 = type absent from train
//    and occurring exactly once in the test stream (a SELECTOR computed from whole-stream counts, never a feature); H2 = not H0.
//    CLOSED = {ADP AUX CCONJ DET PART PRON SCONJ}, OPEN = {ADJ ADV INTJ NOUN NUM PROPN VERB} (gold, stratification only).
//  1.3 ARMS. Protocol W (within language, identities allowed, features hashed to D = 2^16 buckets; each feature GROUP is
//    L2-normalised to unit norm per token) and protocol X (dense language-independent summaries, standardised by the language's
//    own train mean and sd; no identity, no class id and no label ever crosses a language boundary).
//    W:  FORM-LEX    one feature, lex=<identity>.
//        FORM-MORPH  suffixes s1..s4 and prefixes p1..p3 of the identity (affix k present only when the identity has more than k
//                    code points: a proper affix leaves a stem), and shape=<run-compressed shape of the SPELLING> (X upper, x
//                    lower, d digit, a other letter of a caseless script, - ' the hyphen and apostrophe, _ other; a run of two or
//                    more of one class is written class+). One group.
//        FORM-W      FORM-LEX and FORM-MORPH as two groups: "FORM" in W (design 2.7).
//        POS-S       i=<bucket(i)>, first=<0|1>; POS-S-NC (non-causal, the lookahead bound, labelled) adds r=<bucket(n-i+1)>,
//                    q=<decile(i/n)>, n=<bucket(n)>, last=<0|1>. bucket(x) = x for x <= 8 else 8 + ceil(log2(x/8)); decile(q) =
//                    min(9, floor(10 q)). i is the 1-based index in the stream, n the stream length. No content of any token.
//    X:  FORM-X      30 dimensions: len, loglen; script one-hot over 10 classes (latin cyrillic greek arabic hebrew indic han kana
//                    hangul other, by the majority script of the letters); has_digit, all_digit; init_upper, all_upper, inner_upper;
//                    has_hyphen, has_apostrophe (internal); distinct_ratio (distinct code points / code points); and for suffixes
//                    1,2,3 and prefixes 1,2 of the identity the pair (type share = log(1+types(a))/log(1+types), Baayen
//                    productivity = hapaxes(a)/max(1,tokens(a))) from the READING exposure (so causal and train-consistent; an
//                    affix absent from the exposure, or longer than the token allows, is (0,0)).
//        FORM-IND    4 dimensions: the descriptor (log token share, log type count, mean log length, mean affix productivity) of the
//                    induced FORM class of the token (design 2.4, the equal-footing counterpart of company's induced classes). The
//                    induction is injected (formInduction); without one the arm is the typed gap `form_ind_absent`.
//        POS-D       [i, log i, first]; POS-D-NC adds [n-i+1, i/n, n, last].
//    both: FREQ      [log(1+n_w), frequency-rank percentile of n_w among exposure types (share of types with a larger count),
//                    n_w == 0]; FREQ+POS = FREQ with POS-S (W) or POS-D (X).
//          LEXD      the centre's own type descriptor [log(1+n_w), D_L, D_R, H_L, H_R, s_init, s_final] from earlier occurrences only
//                    (D = distinct neighbours / n_w; H = entropy of the neighbour CLASS distribution / log K*, classes injected; with no
//                    induction H is over identities and the normaliser is log(max(2, n_w)), labelled LEXD-ID). Lexicon-equivalent: it is
//                    a function of the centre's identity BY DESIGN and is reported only as a nesting diagnostic.
//          SUBWORD   affix company (A1, no identity): for each affix of FORM-MORPH, the pooled neighbour features of the OTHER exposure
//                    types sharing it (own type removed); W: top 8 pooled neighbour keys per affix as hashed share-valued features
//                    (left neighbours only when causal); X: the 2.4 descriptor of the pooled company per affix (needs injected classes).
//    The company arms (COMP-OCC, COMP-SENT, COMP-TYPE, COMP-W, BAG) belong to company.mjs. For the harness's own gate and smoke
//    this file carries COMP-OCC-REF, a reference implementation of design 2.3's COMP-OCC (identities at offsets within h of the
//    centre, centre masked, no type vector, no own descriptor, no sentinel, BOUNDARY-BLIND padding by identities drawn i.i.d. from
//    the unigram distribution of Q_0, seeded by sha256 of (khora-law-v2, stem, split, sentence index, offset)). When company.mjs
//    exists its compOcc is the arm of record and a conformance test compares the two; this one is labelled `reference` everywhere.
//  1.4 THE LEARNER AND THE BUDGET: ONE FOR EVERY ARM (2.8). L1 = multinomial logistic regression, L2 penalty (lambda/2)||W||^2 on the
//    mean cross-entropy (bias unpenalised), full-batch L-BFGS (history 8, Armijo backtracking) to relative gradient norm 1e-6 or 500
//    iterations. L2 = one hidden layer of 64 ReLU units, weight decay lambda (L2 added to the gradient), Adam (lr 1e-3, batch 256,
//    30 epochs, fixed seed), sparse first-layer rows updated lazily (SparseAdam semantics, the same for every arm). The tuning budget
//    is EXACTLY lambda in {1e-4,1e-3,1e-2,1e-1,1,10} (descending, warm start) and nothing else; selection is by mean cross-entropy
//    on the language's dev split (W) and the selected lambda is reported. Probabilities floored at 1e-4 and renormalised. The
//    harness refuses any arm-specific hyperparameter: arms differ only in the feature columns they are given. Dense blocks are
//    standardised by the TRAIN mean and sd of that block (identical for every arm). A claim about an arm is robust only if L1 and
//    L2 agree (2.8); the harness runs both and reports both.
//  1.5 METRIC (2.9). G(arm) = CE(MAJ) - CE(arm) in bits per evaluated token on held-out tokens; MAJ = the training class prior.
//    The per-token gain g_i = log2 p_arm(y_i) - log2 p_MAJ(y_i) is kept so that every stratum, bootstrap and difference is a mean
//    of kept numbers. Partial information S(a given b) = G(a + b) - G(b). Players F (form visible), K (company visible), P
//    (position); v(S) = G(arm with exactly the players S visible), v(empty) = 0.
//    phi_F = 1/2 [v(F) + v(FK) - v(K)], phi_K = 1/2 [v(K) + v(FK) - v(F)], I_FK = v(FK) - v(F) - v(K); the three-player Shapley
//    value averages marginal contributions over the six orders; share_K = phi_K / (phi_K + phi_F) when both are positive, else null.
//    D1b = G(COMP) - G(FORM) per stratum (T1(ii)); S(FORM given COMP), S(COMP given FORM), S(POS given COMP), S(COMP given FREQ+POS)
//    (T1(i)), and name-ness AUROC (PROPN vs rest, score = p(PROPN)) for T4. Intervals: sentence-block bootstrap of the kept
//    per-token gains (design 2.10(7); the hierarchical bootstrap across languages is verdict.mjs's), one-sided 95 percent.
//
// 2. NULLS (design 2.10(7)).
//  N1 Label permutation: the evaluated test labels permuted over tokens (the trained learner reused), B_perm = 1,000: p for G > 0.
//  N2 Learner null (G1): train on label-permuted TRAIN data (20 repeats in the CLI, 3 in the unit test); G on real test must be at
//     most epsilon_noise. An arm that learns from noise is a broken learner, not a finding.
//  N3 Within-sentence shuffle of the TEST stream (company destroyed, marginals kept): COMP must fall, FORM-LEX/FORM-MORPH must not
//     move at all (they are functions of the token alone), POS must fall (the role stays with the token, the position moves).
//  N4 Conditional permutation for S(FORM given COMP): FORM feature rows permuted among tokens inside bins of the company window
//     (bin = the identity pair at h = 1; bins with fewer than 4 members merged into one residual bin), train and test, the arms
//     retrained, B = 500 in the CLI (B_smoke declared where used).
//
// 3. CONTROLS BUILT TO FAIL, AND THE POWER CHECK (the module gate MG; rule 2). Planted toy languages with a known determinant and an
//  ORACLE CEILING G_oracle (the Bayes lookup table, add-0.5 smoothed and floored, on the generating variables estimated on the train
//  tokens, scored on the same test tokens). Common frame, declared: R = 6 roles; type pool V = 120, Zipf s = 1.0 for emission; sentence
//  length 3 + Poisson(8); random alphabet of 18 letters per toy instance; type strings 3-7 letters; train about 8,000 tokens,
//  dev about 3,000, test about 4,000; OOV rate at test 0.05 (fresh random strings); seeds = sha256 of (khora-law-v2, "form-toy",
//  generator, draw); R_draw = 200 in the CLI and 6 in the unit test; the rates below are rates of draws.
//  TOY-CO1 role_i = T[kappa(w_{i-1})] (a random partition of V into 6 classes, T a random permutation onto the 6 roles; the virtual
//          left neighbour of i = 1 is a uniformly random class, so no arm can read the boundary). TOY-CO2: role_i = T[kappa8(w_{i-1}),
//          kappa8(w_{i-2})] on an 8-class partition and a random 8x8 table onto the 6 roles. TOY-FO (FO-LEX): role = a fixed random map
//          type -> role, neighbours i.i.d.; OOV types get a uniformly random role. TOY-FM (FO-MORPH): a fresh random stem per token
//          plus one of 6 two-letter suffixes, role = the suffix. TOY-PO: role 0 at i = 1, else 1 + (i mod 5); identities i.i.d.
//          TOY-MIX(pi): per token, with probability pi the TOY-CO1 role, else the TOY-FO role (design Appendix A, MIX), pi in
//          {0.2, 0.5, 0.8}.
//  MG-1 DETECT. The matching arm reaches at least theta = 0.8 of G_oracle AND is above zero by label permutation (N1, p < 0.05) in at
//       least 95 percent of draws: TOY-CO1 with COMP-OCC-REF (h = 1, left, causal); TOY-CO2 with COMP-OCC-REF (h = 2, left); TOY-FO with
//       FORM-W and with FORM-LEX; TOY-FM with FORM-MORPH; TOY-PO with POS-S (causal).
//  MG-2 REJECT. Every non-matching arm named below has G <= epsilon_noise in at least 95 percent of draws (design Appendix A lists):
//       TOY-CO1, TOY-CO2: FORM-W, POS-S, FREQ. TOY-FO: COMP-OCC-REF, POS-S, FREQ. TOY-FM: COMP-OCC-REF, POS-S, FREQ, FORM-LEX. TOY-PO:
//       COMP-OCC-REF, FORM-W, FREQ. (FORM-MORPH on TOY-FO is NOT required to reject: a 4-letter suffix is a near-identity.)
//  MG-3 SHAPLEY RECOVERY. On TOY-MIX(pi), pi in {0.2, 0.5, 0.8}, share_K from the L1 arms FORM-W, COMP-OCC-REF(h=1,left), both: within
//       0.10 of pi in at least 90 percent of draws. The oracle's own share (v from the oracle on the visible variables) is reported
//       beside it as a diagnostic of the planted truth.
//  MG-4 COLLAPSE. (a) FORM feature rows permuted among test tokens with the same sentence index (identity scrambled within position
//       strata): G(FORM-LEX) on TOY-FO falls to at most epsilon_noise while G(COMP-OCC-REF) on TOY-CO1 is exactly unchanged (its rows
//       are untouched); (b) within-sentence shuffle of the test stream (N3): TOY-CO1 COMP-OCC-REF falls to at most epsilon_noise,
//       TOY-FO FORM-LEX is exactly unchanged, TOY-PO POS-S falls to at most epsilon_noise.
//  MG-5 CENTRE-SWAP. Replacing the centre's identity by another type (window, exposure, position fixed) CHANGES the feature rows of
//       FORM-LEX, FORM-MORPH, FORM-X, FREQ and LEXD and leaves POS-S, POS-D and COMP-OCC-REF unchanged: the property is asserted to
//       fail where it must (a leak-free FORM arm would be a bug) and to hold where it must.
//  MG-6 CAUSAL CONFORMANCE. The causal arms' feature rows of token i are hash-identical when every later sentence AND every later unit
//       of the same sentence is replaced by arbitrary other material; POS-S-NC and POS-D-NC are NOT (the arms differ).
//  MG-7 GOLD-FREE. Every feature row of every arm is hash-identical when the gold labels of the input are replaced by a random
//       permutation (the features receive units, never labels).
//  MG-8 SAME LEARNER, SAME BUDGET. Every arm of a harness run reports a selection record with exactly the six lambda values of the
//       grid and the same learner key; a re-run with the same seeds gives byte-identical per-token gains (determinism, G2).
//  MG-9 LEARNER CORRECTNESS. Analytic gradients of L1 and L2 agree with central finite differences to relative error below 1e-5 on a tiny
//       problem; the learner null (N2) is at most epsilon_noise on the toy test.
//  epsilon_noise (design 2.10(1)): the 95th percentile, over (toy x arm), of |G_s - G_s'| between seeds of the training sample (a
//  seeded bootstrap of the train sentences) and of the learner initialisation, on IDENTICAL data and with lambda fixed to the value
//  selected on the original; 20 seed pairs in the CLI, 6 in the unit test. It is the instrument's stability floor only.
//  MG-10 (diagnostic, reported not gating): nesting, G(a + b) >= max(G(a), G(b)) - epsilon_noise.
//
// 4. THE PASS RULES THIS MODULE FEEDS (restated from design 2.10 and T1, T2, T4; NOT modified here; verdict.mjs applies them).
//  T1(ii): unit outcome per stratum (a) all tokens, (b) H0, (c) H1 on D1b = G(COMP-OCC) - G(FORM): PASS if the one-sided 95 percent lower
//   bound of D1b is at least -SESOI; FAIL if the upper bound is below -SESOI; otherwise INCONCLUSIVE; a stratum below n_min is
//   UNDERPOWERED(n). (a) is PREDICTED to fail (the lexicon is a stored company); (b), (c) are the rows reading R3 requires. In W FORM =
//   FORM-W; X reports G(COMP-OCC-X) vs G(FORM-X + FORM-IND) directional and non-decisive (design 2.7).
//  T2: literal S(FORM given COMP-OCC) <= SESOI at f = 1 (equivalence: upper bound < SESOI and n >= n_min); position S(POS given COMP-OCC)
//   <= SESOI and S(COMP-SENT given COMP-OCC) as the boundary contribution (A8). The cache row uses COMP-TYPE-D (company.mjs); this file
//   supplies S(FORM given .) and the exposure-fraction retraining hook (evaluateAtFractions).
//  T4: name-ness AUROC of FORM-MORPH, POS and COMP-OCC on H1, caseless scripts included. The SESOI, n_min and k_N are derived by
//   stats.mjs and gates.mjs (G2); this file invents none.
//  THE MODULE'S OWN PASS RULE (the instrument gate): form.mjs is fit for use on real data iff MG-1..MG-9 all pass; a failing MG cell makes
//   every statistic this file emits for that arm UNDERPOWERED(instrument: form.mjs) by design section 4 ("a claim that fails its gate is
//   UNDERPOWERED"), never "not falsified". The only numeric thresholds this file adds are the toy gate's (theta 0.8, 95 percent,
//   90 percent, 0.10, 1e-5, 1e-6, 500 iterations), each taken from the design or from a convention named above.
//
// 5. PREDICTIONS (recorded before the first run; scored after; a miss is reported as a miss).
//  P1 (toy gate) all of MG-1..MG-9 pass on the first complete run; probability 0.55 (the least certain cells: MG-1 TOY-CO2 at the
//     0.8 ceiling with 8000 tokens, and MG-3 at pi = 0.8, where the arms' learning efficiencies could differ by more than 0.10).
//  P2 (toy) L2 reaches at least 0.8 of L1's G on TOY-FO and TOY-CO1 (probability 0.5: lazy Adam at lr 1e-3 may underfit sparse rows).
//  P3 (toy, analytic) the oracle share of TOY-MIX is about 0.14, 0.50, 0.86 for pi = 0.2, 0.5, 0.8 (the per-token coin makes the
//     Shapley share a convex function of pi); the pre-registered tolerance of 0.10 around pi therefore passes the oracle itself.
//  P4 (real DEV, design T1/T2 predictions) FORM-W G exceeds COMP-OCC-REF G on seen tokens (H2) in at least 35 of 41 languages (the
//     lexicon is a stored company) and is at or below it on H1 in analytic languages; POS-S (causal) G stays below 0.15 bits in every
//     language; FREQ+POS exceeds POS alone everywhere.
//
// 6. DISCLOSURES / LIMITS KNOWN IN ADVANCE.
//  · The harness's learner is a REFERENCE implementation of design 2.8; learner.mjs (a sibling) is the learner of record when it exists and
//    conformance with it is a separate test, not assumed here.
//  · FORM-X affix-productivity values can act as an identity fingerprint inside one language (two affixes with distinct productivities
//    are distinguishable); they do not transfer across languages, which is why FORM-X is an X arm only, and the within-language decision is
//    made with FORM-W.
//  · FORM-IND needs a K* from company's induction (design 2.4): it is injected, never typed here.
//  · Protocol X (leave-one-family-out orchestration over many languages) is run.mjs's; this file provides concatenation of per-language
//    dense arm data and the per-language standardisation it needs.
//  · The DEV smoke selects lambda on one seeded half of dev and reports on the other half ("dev-B"), so the smoke's number is not selected
//    on; it is a smoke, not a verdict, and the TEST split is never read.
//  · UPOS is partly lexical (favours FORM) and DEPREL relational (favours COMPANY): the harness takes any label map so that both grains
//    are measured; none is chosen here.
//  · Unspaced-script tokens are UD-gold words; the character-grain stream (charGrainStream) removes that leak for T3 only.
// ==== END PRE-REGISTRATION ====
//
// ==== ADDENDUM A1 (written AFTER the header hash above was recorded and BEFORE any code of this file was run) ====
// While reading the siblings (the instruction was to code against the contract and poll) company-learner.mjs appeared: the learner family
// of record (pre-registered in company.mjs sections 3 and 4). Three consequences are declared here, before any run, instead of editing the
// frozen header:
//  A1.1 NO LEARNER OF MY OWN. Equal treatment is enforced by importing company-learner.mjs: every arm of this file is trained by its
//       fitSelect (L1: L-BFGS memory 10 - header 1.4 said 8 -, columns compacted to the train-active buckets, warm start along the
//       descending lambda path; L2: lazy Adam, He first layer; ties in lambda go to the larger lambda). Everything else in header 1.4 is
//       unchanged and identical (objective, tolerance 1e-6, 500 iterations, 64 ReLU units, Adam 1e-3, batch 256, 30 epochs, the grid, the
//       floor). MG-8 reads: every arm of a run is fitted by that one function and reports the same six lambda; MG-9's gradient checks run on
//       company-learner.mjs's own lrObjective and mlpGradient (the code this file stands on), not on a copy; the learner null is unchanged.
//  A1.2 EXPOSURE CONVENTION. Header 1.2 read the train stream in order from a cold start. Revised BEFORE any run to the leave-own-sentence-out
//       convention of company.mjs D4: a TRAIN token's exposure is Q_0 minus its own sentence plus the earlier tokens of that sentence
//       (exact decrement: unobserveSentence, then token-wise observe), so its n_w has the distribution of a test token's (a cold start would
//       give n = 0 to 15-50 percent of training tokens, the type-token ratio, against a few percent at test, and the FREQ/LEXD/FORM-X
//       statistics would be fitted on a shifted population). The dev and test passes are unchanged: forward in reading order from a copy of
//       the end-of-train Q_0. The causal-conformance probe (MG-6) therefore runs on the forward passes; train rows are examples, not reads.
//  A1.3 SEEDS. seedFor, mulberry32, hashing and group normalisation come from company-learner.mjs (seedFor joins its parts with NUL;
//       corpus.mjs joins with 0x1f: the siblings disagree and no claim depends on which; one function derives every seed in this file).
//  A1.4 Files governed by this header: form.mjs, form-toy.mjs (the planted toys and the module gate MG), form-smoke.mjs (the DEV smoke CLI),
//       tests/law-form.test.js. Position arms and the arm names of the design's position.mjs are exported from form.mjs (position.mjs is not
//       created, to leave that name to whoever owns it).
// ==== END ADDENDUM A1 ====

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  TAG, LAMBDA_GRID, HASH_D, PROB_FLOOR, seedFor, mulberry32, fmix32, shuffleInPlace, permutation,
  hashFeatures, selectRows, fitSelect, ceBitsPerToken, priorProba, meanOf,
} from "./company-learner.mjs";

export const MODULE = "eval/law/form.mjs";
export const DESIGN_SHA256 = "7911b687ef46c1e3815fbac049347ba38fc90cd9b9efe8d016d0902698a8ded2";
export { LAMBDA_GRID, HASH_D, PROB_FLOOR, seedFor, mulberry32 };

/** sha256 of this file's pre-registration header (first line down to the END PRE-REGISTRATION marker, inclusive), so a run archives it. */
export function headerSha256(path = fileURLToPath(import.meta.url)) {
  const lines = readFileSync(path, "utf8").split("\n");
  const end = lines.findIndex((l) => l.startsWith("// ==== END PRE-REGISTRATION ===="));
  if (end < 0) return null;
  return createHash("sha256").update(lines.slice(0, end + 1).join("\n") + "\n").digest("hex");
}
/** sha256 of the addendum block (from the ADDENDUM A1 line to its END marker, inclusive). */
export function addendumSha256(path = fileURLToPath(import.meta.url)) {
  const lines = readFileSync(path, "utf8").split("\n");
  const a = lines.findIndex((l) => l.startsWith("// ==== ADDENDUM A1"));
  const b = lines.findIndex((l) => l.startsWith("// ==== END ADDENDUM A1"));
  if (a < 0 || b < 0) return null;
  return createHash("sha256").update(lines.slice(a, b + 1).join("\n") + "\n").digest("hex");
}

// ═══════════════════════════════════════ 1. LABELS, GRAINS, STRATA ═══════════════════════════════════════

export const UPOS14 = Object.freeze(["ADJ", "ADP", "ADV", "AUX", "CCONJ", "DET", "INTJ", "NOUN", "NUM", "PART", "PRON", "PROPN", "SCONJ", "VERB"]);
export const CLOSED_UPOS = Object.freeze(new Set(["ADP", "AUX", "CCONJ", "DET", "PART", "PRON", "SCONJ"]));
export const OPEN_UPOS = Object.freeze(new Set(["ADJ", "ADV", "INTJ", "NOUN", "NUM", "PROPN", "VERB"]));

/** A grain: classes and a map from a gold label to a class index, or -1 when the unit is not evaluated (it stays in the stream as context). */
export const GRAINS = Object.freeze({
  G1: { name: "G1", classes: UPOS14, map: (u) => UPOS14.indexOf(u) },
  G2: { name: "G2", classes: ["non-nominal", "nominal"], map: (u) => (UPOS14.includes(u) ? (u === "NOUN" || u === "PROPN" ? 1 : 0) : -1) },
  G3: { name: "G3", classes: ["NOUN", "PROPN"], map: (u) => (u === "NOUN" ? 0 : u === "PROPN" ? 1 : -1) },
});
/** A grain over arbitrary role names (planted toys): every label evaluated. */
export function grainOf(name, classes) {
  const ix = new Map(classes.map((c, i) => [c, i]));
  return { name, classes, map: (l) => (ix.has(l) ? ix.get(l) : -1) };
}
export const STRATA = Object.freeze(["all", "H0", "H1", "H2", "closed", "open"]);

// ═══════════════════════════════════════ 2. TEXT UTILITIES (spelling, script, shape, affixes) ═══════════════════════════════════════

/** Identity of a unit: NFC, lower case (case is not company: heard rule S1). */
export const identityOf = (form) => String(form).normalize("NFC").toLowerCase();
const cps = (s) => Array.from(s);

export const SCRIPT_CLASSES = Object.freeze(["latin", "cyrillic", "greek", "arabic", "hebrew", "indic", "han", "kana", "hangul", "other"]);
const SCRIPT_RES = [
  /\p{Script=Latin}/u,
  /\p{Script=Cyrillic}/u,
  /\p{Script=Greek}/u,
  /\p{Script=Arabic}/u,
  /\p{Script=Hebrew}/u,
  /[\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}]/u,
  /\p{Script=Han}/u,
  /[\p{Script=Hiragana}\p{Script=Katakana}]/u,
  /\p{Script=Hangul}/u,
];
const LETTER_OR_MARK = /[\p{L}\p{M}]/u;
const scriptCache = new Map();
/** Script class index of one code point: 0..8 a named script, 9 other letter, -1 not a letter (digit, punctuation, symbol: no vote). */
function scriptOfChar(ch) {
  let v = scriptCache.get(ch);
  if (v !== undefined) return v;
  v = -1;
  if (LETTER_OR_MARK.test(ch)) {
    v = 9;
    for (let k = 0; k < SCRIPT_RES.length; k++) if (SCRIPT_RES[k].test(ch)) { v = k; break; }
  }
  scriptCache.set(ch, v);
  return v;
}
/** Majority script class of the letters of a spelling (ties to the lower index); no letters -> "other". */
export function scriptClassOf(spelling) {
  const votes = new Int32Array(10);
  for (const ch of spelling) { const k = scriptOfChar(ch); if (k >= 0) votes[k]++; }
  let best = 9, bv = 0;
  for (let k = 0; k < 10; k++) if (votes[k] > bv) { bv = votes[k]; best = k; }
  return SCRIPT_CLASSES[best];
}

const classCache = new Map();
function shapeClass(ch) {
  let c = classCache.get(ch);
  if (c !== undefined) return c;
  if (/[\p{Lu}\p{Lt}]/u.test(ch)) c = "X";
  else if (/\p{Ll}/u.test(ch)) c = "x";
  else if (/\p{Nd}/u.test(ch)) c = "d";
  else if (/[\p{L}\p{M}]/u.test(ch)) c = "a";
  else if ("-‐‑–−".includes(ch)) c = "-";
  else if ("'’ʼ".includes(ch)) c = "'";
  else c = "_";
  classCache.set(ch, c);
  return c;
}
/** Run-compressed shape of a SPELLING: X upper, x lower, d digit, a other letter/mark, - hyphen, ' apostrophe, _ other; a run of two or more -> class+. */
export function shapeOf(spelling) {
  let out = "", prev = "", run = 0;
  for (const ch of spelling) {
    const c = shapeClass(ch);
    if (c === prev) { run++; continue; }
    if (prev) out += run > 1 ? prev + "+" : prev;
    prev = c; run = 1;
  }
  if (prev) out += run > 1 ? prev + "+" : prev;
  return out;
}

/** The seven affix slots of FORM-MORPH, in fixed order: suffixes 1..4 then prefixes 1..3. */
export const AFFIX_SLOTS = Object.freeze([["s", 1], ["s", 2], ["s", 3], ["s", 4], ["p", 1], ["p", 2], ["p", 3]]);
const affCache = new Map();
/** The seven affix keys of an identity (null where the identity has k or fewer code points: a proper affix leaves a stem). */
export function affixesOf(id) {
  let a = affCache.get(id);
  if (a) return a;
  const c = cps(id);
  a = AFFIX_SLOTS.map(([kind, k]) => (c.length > k ? kind + k + ":" + (kind === "s" ? c.slice(c.length - k).join("") : c.slice(0, k).join("")) : null));
  if (affCache.size > 200000) affCache.clear();
  affCache.set(id, a);
  return a;
}

// ═══════════════════════════════════════ 3. THE READING EXPOSURE (causal; exact decrement) ═══════════════════════════════════════

const FW_CAP = 1 << 15;
/**
 * Q: what has been read so far. Counts per identity, a Fenwick tree over counts (frequency rank), per-affix token/type/hapax counts
 * (Baayen productivity), and optionally per-type neighbour statistics and per-affix pooled neighbour counts (LEXD, SUBWORD).
 * Token-wise `observeToken` is the read; `endSentence` closes the sentence (a final position accrues when it is known to be final);
 * `unobserveSentence` is the exact inverse of observing a whole sentence (leave-own-sentence-out for training tokens, addendum A1.2).
 */
export class ReadingExposure {
  constructor({ neighbours = false } = {}) {
    this.cnt = new Map();
    this.nTok = 0;
    this.nTyp = 0;
    this.fw = new Int32Array(FW_CAP + 2);
    this.aff = new Map();            // affix key -> Int32Array [tokens, types, hapaxes, init, final]
    this.neighbours = neighbours;
    this.nb = neighbours ? new Map() : null;     // identity -> {L: Map, R: Map, init, fin}
    this.pool = neighbours ? new Map() : null;   // affix key -> Map(neighbour key "l=id"|"r=id" -> count)
  }
  count(id) { return this.cnt.get(id) ?? 0; }
  _fwAdd(c, d) { if (c > FW_CAP) c = FW_CAP; for (; c <= FW_CAP; c += c & -c) this.fw[c] += d; }
  _fwPrefix(c) { if (c > FW_CAP) c = FW_CAP; let s = 0; for (; c > 0; c -= c & -c) s += this.fw[c]; return s; }
  /** Share of exposure types with a larger count than n (1 for an unseen type). */
  rankPct(n) { return this.nTyp ? (this.nTyp - this._fwPrefix(n)) / this.nTyp : 1; }
  _affRec(key) { let r = this.aff.get(key); if (!r) { r = new Int32Array(5); this.aff.set(key, r); } return r; }
  _bump(id, d) {
    const c = this.cnt.get(id) ?? 0, c2 = c + d;
    if (c > 0) this._fwAdd(c, -1);
    if (c2 > 0) this._fwAdd(c2, 1);
    const ak = affixesOf(id);
    for (let a = 0; a < 7; a++) {
      const key = ak[a]; if (key === null) continue;
      const r = this._affRec(key);
      r[0] += d;
      if (d > 0) { if (c === 0) { r[1]++; r[2]++; } else if (c === 1) r[2]--; }
      else { if (c === 1) { r[1]--; r[2]--; } else if (c === 2) r[2]++; }
      if (r[0] === 0 && r[1] === 0 && r[2] === 0 && r[3] === 0 && r[4] === 0) this.aff.delete(key);
    }
    this.nTok += d;
    if (d > 0 && c === 0) this.nTyp++;
    if (d < 0 && c2 === 0) this.nTyp--;
    if (c2 === 0) this.cnt.delete(id); else this.cnt.set(id, c2);
  }
  _nbOf(id) { let r = this.nb.get(id); if (!r) { r = { L: new Map(), R: new Map(), init: 0, fin: 0 }; this.nb.set(id, r); } return r; }
  _mapAdd(m, k, d) { const v = (m.get(k) ?? 0) + d; if (v === 0) m.delete(k); else m.set(k, v); }
  _poolAdd(id, nbrKey, d) {
    for (const key of affixesOf(id)) {
      if (key === null) continue;
      let p = this.pool.get(key); if (!p) { p = new Map(); this.pool.set(key, p); }
      this._mapAdd(p, nbrKey, d);
      if (p.size === 0) this.pool.delete(key);
    }
  }
  _affFlag(id, slot, d) { for (const key of affixesOf(id)) if (key !== null) this._affRec(key)[slot] += d; }
  observeToken(ids, i) {
    const id = ids[i];
    this._bump(id, 1);
    if (!this.neighbours) return;
    const rec = this._nbOf(id);
    if (i === 0) { rec.init++; this._affFlag(id, 3, 1); }
    if (i > 0) {
      const prev = ids[i - 1];
      this._mapAdd(rec.L, prev, 1); this._poolAdd(id, "l=" + prev, 1);
      this._mapAdd(this._nbOf(prev).R, id, 1); this._poolAdd(prev, "r=" + id, 1);
    }
  }
  endSentence(ids) {
    if (!this.neighbours || !ids.length) return;
    const id = ids[ids.length - 1];
    this._nbOf(id).fin++; this._affFlag(id, 4, 1);
  }
  observeSentence(ids) { for (let i = 0; i < ids.length; i++) this.observeToken(ids, i); this.endSentence(ids); }
  unobserveSentence(ids) {
    if (this.neighbours && ids.length) { const id = ids[ids.length - 1]; this._nbOf(id).fin--; this._affFlag(id, 4, -1); }
    for (let i = ids.length - 1; i >= 0; i--) {
      const id = ids[i];
      if (this.neighbours) {
        const rec = this._nbOf(id);
        if (i > 0) {
          const prev = ids[i - 1];
          this._mapAdd(this._nbOf(prev).R, id, -1); this._poolAdd(prev, "r=" + id, -1);
          this._mapAdd(rec.L, prev, -1); this._poolAdd(id, "l=" + prev, -1);
        }
        if (i === 0) { rec.init--; this._affFlag(id, 3, -1); }
      }
      this._bump(id, -1);
    }
    if (this.neighbours) this._prune(ids);
  }
  _prune(ids) {
    for (const id of ids) {
      const r = this.nb.get(id);
      if (r && !r.L.size && !r.R.size && r.init === 0 && r.fin === 0) this.nb.delete(id);
    }
  }
  clone() {
    const q = new ReadingExposure({ neighbours: this.neighbours });
    q.cnt = new Map(this.cnt); q.nTok = this.nTok; q.nTyp = this.nTyp; q.fw = this.fw.slice();
    q.aff = new Map(); for (const [k, v] of this.aff) q.aff.set(k, v.slice());
    if (this.neighbours) {
      q.nb = new Map(); for (const [k, v] of this.nb) q.nb.set(k, { L: new Map(v.L), R: new Map(v.R), init: v.init, fin: v.fin });
      q.pool = new Map(); for (const [k, v] of this.pool) q.pool.set(k, new Map(v));
    }
    return q;
  }
  /** Canonical digest of the whole state (tests: the observe/unobserve round trip must restore it exactly). */
  digest() {
    const h = createHash("sha256");
    const sorted = (m) => [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    h.update(JSON.stringify([this.nTok, this.nTyp, sorted(this.cnt), sorted(this.aff).map(([k, v]) => [k, [...v]])]));
    h.update(Buffer.from(this.fw.buffer, this.fw.byteOffset, this.fw.byteLength));
    if (this.neighbours) {
      h.update(JSON.stringify(sorted(this.nb).map(([k, v]) => [k, sorted(v.L), sorted(v.R), v.init, v.fin])));
      h.update(JSON.stringify(sorted(this.pool).map(([k, v]) => [k, sorted(v)])));
    }
    return h.digest("hex");
  }
}
/** Build Q_0 from unlabelled sentences of units (labels never read). */
export function createExposureFrom(streams, { neighbours = false } = {}) {
  const q = new ReadingExposure({ neighbours });
  for (const units of streams) q.observeSentence(units.map(identityOf));
  return q;
}

// ═══════════════════════════════════════ 4. THE FORM ARMS ═══════════════════════════════════════

/** FORM-LEX and FORM-MORPH keys of a token (protocol W). token = the spelling. */
export function formSparse(token) {
  const spelling = String(token).normalize("NFC");
  const id = identityOf(spelling);
  const lex = ["lex=" + id];
  const morph = [];
  const ak = affixesOf(id);
  for (const key of ak) if (key !== null) morph.push(key);
  morph.push("shape=" + shapeOf(spelling));
  return { lex, morph };
}

export const FORM_X_NAMES = Object.freeze([
  "len", "loglen",
  ...SCRIPT_CLASSES.map((s) => "script_" + s),
  "has_digit", "all_digit", "init_upper", "all_upper", "inner_upper", "has_hyphen", "has_apostrophe", "distinct_ratio",
  "suf1_types", "suf1_baayen", "suf2_types", "suf2_baayen", "suf3_types", "suf3_baayen",
  "pre1_types", "pre1_baayen", "pre2_types", "pre2_baayen",
]);
export const FORM_X_DIM = FORM_X_NAMES.length; // 30
export const FORM_IND_NAMES = Object.freeze(["ind_log_token_share", "ind_log_type_count", "ind_mean_log_len", "ind_mean_affix_prod"]);
const X_AFFIX_SLOTS = [0, 1, 2, 4, 5]; // s1 s2 s3 p1 p2 of AFFIX_SLOTS
const UPPER = /[\p{Lu}\p{Lt}]/u, LETTER = /\p{L}/u, ND = /\p{Nd}/u;

/** Affix productivity pair (type share, Baayen P) of one affix key against the exposure; (0,0) for an absent or improper affix. */
export function affixProductivity(exposure, key) {
  if (key === null) return [0, 0];
  const r = exposure.aff.get(key);
  if (!r || r[0] <= 0) return [0, 0];
  return [Math.log1p(r[1]) / Math.log1p(Math.max(1, exposure.nTyp)), r[2] / Math.max(1, r[0])];
}

/** FORM-X (30 dims, language independent) [+ FORM-IND (4 dims) when a formInduction is given]. token = the spelling. */
export function formDense(token, exposure, formInduction = null) {
  const spelling = String(token).normalize("NFC");
  const id = identityOf(spelling);
  const c = cps(spelling), len = Math.max(1, c.length);
  const out = new Float64Array(formInduction ? FORM_X_DIM + 4 : FORM_X_DIM);
  out[0] = c.length;
  out[1] = Math.log(len);
  out[2 + SCRIPT_CLASSES.indexOf(scriptClassOf(spelling))] = 1;
  let o = 12;
  let hasDigit = 0, allDigit = c.length > 0 ? 1 : 0, initUpper = 0, innerUpper = 0, hyph = 0, apos = 0, letters = 0, uppers = 0;
  for (let k = 0; k < c.length; k++) {
    const ch = c[k];
    if (ND.test(ch)) hasDigit = 1; else allDigit = 0;
    if (LETTER.test(ch)) { letters++; if (UPPER.test(ch)) { uppers++; if (k === 0) initUpper = 1; else innerUpper = 1; } }
    if (k > 0 && k < c.length - 1) {
      if ("-‐‑–".includes(ch)) hyph = 1;
      if ("'’ʼ".includes(ch)) apos = 1;
    }
  }
  out[o++] = hasDigit; out[o++] = allDigit; out[o++] = initUpper;
  out[o++] = letters >= 2 && uppers === letters ? 1 : 0;
  out[o++] = innerUpper; out[o++] = hyph; out[o++] = apos;
  out[o++] = new Set(c).size / len;
  const ak = affixesOf(id);
  for (const slot of X_AFFIX_SLOTS) { const [t, b] = affixProductivity(exposure, ak[slot]); out[o++] = t; out[o++] = b; }
  if (formInduction) { const d = formInduction.descriptorOf(id, spelling); for (let k = 0; k < 4; k++) out[o++] = d[k]; }
  return out;
}

// ═══════════════════════════════════════ 5. THE POSITION, FREQUENCY AND LEXICON ARMS ═══════════════════════════════════════

const bucket = (x) => (x <= 8 ? x : 8 + Math.ceil(Math.log2(x / 8)));
const decile = (q) => Math.min(9, Math.floor(10 * q));
export const POS_D_NAMES = Object.freeze(["i", "log_i", "first"]);
export const POS_D_NC_NAMES = Object.freeze(["i", "log_i", "first", "n_minus_i_plus_1", "i_over_n", "n", "last"]);
/** POS-D / POS-D-NC. i is the 1-based index in the stream, n the stream length; no content of any token. */
export function positionDense(i, n, { causal = true } = {}) {
  const base = [i, Math.log(i), i === 1 ? 1 : 0];
  return Float64Array.from(causal ? base : [...base, n - i + 1, i / n, n, i === n ? 1 : 0]);
}
/** POS-S / POS-S-NC keys (protocol W, one-hot bucketed). */
export function positionSparse(i, n, { causal = true } = {}) {
  const keys = ["i=" + bucket(i), "first=" + (i === 1 ? 1 : 0)];
  if (!causal) keys.push("r=" + bucket(n - i + 1), "q=" + decile(i / n), "n=" + bucket(n), "last=" + (i === n ? 1 : 0));
  return keys;
}
export const FREQ_NAMES = Object.freeze(["log1p_n", "rank_pct", "unseen"]);
/** FREQ: the type's exposure frequency only. token = the spelling; exposure = the reading state BEFORE the token. */
export function freqDense(token, exposure) {
  const n = exposure.count(identityOf(token));
  return Float64Array.from([Math.log1p(n), exposure.rankPct(n), n === 0 ? 1 : 0]);
}
/** FREQ+POS as one dense/sparse pair (the T1/T4 baseline). */
export function freqPos(token, i, n, exposure, { causal = true } = {}) {
  return { freq: freqDense(token, exposure), posDense: positionDense(i, n, { causal }), posKeys: positionSparse(i, n, { causal }) };
}

export const LEXD_NAMES = Object.freeze(["log1p_n", "D_L", "D_R", "H_L", "H_R", "s_init", "s_final"]);
function entropyOf(counts, norm) {
  let tot = 0; for (const v of counts.values()) tot += v;
  if (tot <= 0 || !(norm > 0)) return 0;
  let h = 0; for (const v of counts.values()) { const p = v / tot; h -= p * Math.log(p); }
  return h / norm;
}
function byClass(m, classOf, K) {
  const out = new Map();
  for (const [id, v] of m) { const c = classOf ? classOf(id) : id; const k = c === undefined || c < 0 ? "other" : c; out.set(k, (out.get(k) ?? 0) + v); }
  return { dist: out, norm: classOf ? Math.log(K + 1) : 0 };
}
/**
 * LEXD: the centre's own type descriptor from earlier occurrences only. With classOf (an injected induction: identity -> class or -1) H is the
 * entropy of the neighbour CLASS distribution over K+1 bins; without it (LEXD-ID) H is over identities, normalised by log(max(2, n)).
 * Needs a neighbour-tracking exposure. A function of the centre's identity BY DESIGN.
 */
export function lexd(token, exposure, { classOf = null, K = 0 } = {}) {
  const id = identityOf(token), n = exposure.count(id);
  const out = new Float64Array(7);
  if (n === 0 || !exposure.nb) return out;
  const rec = exposure.nb.get(id);
  out[0] = Math.log1p(n);
  if (!rec) return out;
  out[1] = rec.L.size / n; out[2] = rec.R.size / n;
  const L = byClass(rec.L, classOf, K), R = byClass(rec.R, classOf, K);
  const nrm = classOf ? 0 : Math.log(Math.max(2, n));
  out[3] = entropyOf(L.dist, classOf ? L.norm : nrm); out[4] = entropyOf(R.dist, classOf ? R.norm : nrm);
  out[5] = rec.init / n; out[6] = rec.fin / n;
  return out;
}

export const SUBWORD_TOP = 8;
/** The pooled neighbour counts of the OTHER types sharing an affix (own type removed): Map(neighbour key -> count). */
function pooledOthers(exposure, affKey, id, causal) {
  const p = exposure.pool.get(affKey);
  const out = new Map();
  if (!p) return out;
  const own = exposure.nb.get(id);
  for (const [k, v] of p) {
    if (causal && k.charCodeAt(0) === 114) continue; // "r=": right neighbours are not causal company
    const sub = k.slice(2);
    const mine = own ? (k.charCodeAt(0) === 108 ? own.L.get(sub) : own.R.get(sub)) ?? 0 : 0;
    const a = v - mine;
    if (a > 0) out.set(k, a);
  }
  return out;
}
/**
 * SUBWORD (W): for each affix of FORM-MORPH, the top SUBWORD_TOP pooled neighbour keys of the other exposure types sharing the affix,
 * as share-valued keys "<affix>|<l=|r=><identity>" (left only when causal). No identity of the centre is in the keys. Returns {keys, vals}.
 */
export function subwordSparse(token, exposure, { causal = true } = {}) {
  const id = identityOf(token);
  const keys = [], vals = [];
  for (const key of affixesOf(id)) {
    if (key === null) continue;
    const m = pooledOthers(exposure, key, id, causal);
    if (!m.size) continue;
    let tot = 0; for (const v of m.values()) tot += v;
    const top = [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, SUBWORD_TOP);
    for (const [k, v] of top) { keys.push(key + "|" + k); vals.push(v / tot); }
  }
  return { keys, vals };
}
export const SUBWORD_X_DIM = 7 * 7;
/**
 * SUBWORD (X): per affix slot the 2.4 descriptor [log(1+n), D_L, D_R, H_L, H_R, s_init, s_final] of the pooled company of the OTHER types
 * sharing the affix (49 dims); classOf/K are injected (class entropies need an induction; without one they are over identities, labelled).
 */
export function subwordCompany(token, exposure, { classOf = null, K = 0, causal = true } = {}) {
  const id = identityOf(token);
  const out = new Float64Array(SUBWORD_X_DIM);
  const own = exposure.nb.get(id), nOwn = exposure.count(id);
  const ak = affixesOf(id);
  for (let a = 0; a < 7; a++) {
    const key = ak[a]; if (key === null) continue;
    const r = exposure.aff.get(key); if (!r) continue;
    const nPool = r[0] - nOwn;
    if (nPool <= 0) continue;
    const m = pooledOthers(exposure, key, id, causal);
    const Lm = new Map(), Rm = new Map();
    for (const [k, v] of m) (k.charCodeAt(0) === 108 ? Lm : Rm).set(k.slice(2), v);
    const L = byClass(Lm, classOf, K), R = byClass(Rm, classOf, K);
    const nrm = classOf ? 0 : Math.log(Math.max(2, nPool));
    const o = a * 7;
    out[o] = Math.log1p(nPool);
    out[o + 1] = Lm.size / nPool; out[o + 2] = Rm.size / nPool;
    out[o + 3] = entropyOf(L.dist, classOf ? L.norm : nrm); out[o + 4] = entropyOf(R.dist, classOf ? R.norm : nrm);
    out[o + 5] = (r[3] - (own ? own.init : 0)) / nPool; out[o + 6] = (r[4] - (own ? own.fin : 0)) / nPool;
  }
  return out;
}

/** Character-grain stream for unspaced scripts (T3): unit = code point, label = the label of the containing word. */
export function charGrainStream(sentences) {
  return sentences.map((s) => {
    const units = [], labels = [], wordOf = [];
    s.units.forEach((u, w) => { for (const ch of cps(u)) { units.push(ch); labels.push(s.labels ? s.labels[w] : null); wordOf.push(w); } });
    return { units, labels, wordOf };
  });
}

// @@CODE-TAIL@@
