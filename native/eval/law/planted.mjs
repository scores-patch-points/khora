/*PREREG-BEGIN
=====================================================================================================================
native/eval/law/planted.mjs — THE PLANTED LANGUAGES (POWER CHECK GENERATORS) AND THE G0 HARNESS
Pre-registration in the file header, written BEFORE any harness run (rule II.5). Hashed: see PREREG_SHA256_FROZEN.
=====================================================================================================================

0. STATUS AND GOVERNING DOCUMENT
   Governing design: docs/LAW-FALSIFICATION.md revision 2, sha256
   7911b687ef46c1e3815fbac049347ba38fc90cd9b9efe8d016d0902698a8ded2 (section 4 gate G0; Appendix A; section 7 module
   list). Where this header and that document disagree, the document wins, except in the numbered precisions of
   section 6 below, each of which is a place where the document is silent or is not satisfiable as written; every
   such place is a FINDING reported to the orchestrator (none is a silent change).
   khora is a zero-model reader: no LLM call appears here. The learners in planted-ref.mjs are generic measuring
   instruments trained from scratch on the data of each draw (no pretrained weights, no embeddings, no external data).
   Files: planted.mjs (this file: header, generators, truth table, oracles, cells), planted-util.mjs (seeds, streams,
   Zipf, strings, statistics), planted-ref.mjs (the REFERENCE instrument and the harness), planted-toy.mjs (the
   planted toy reader: slots, ablation, typed deltas, signatures, fold). Tests: tests/law-planted.test.js.

1. WHAT THIS MODULE IS
   It tests THE INSTRUMENT, never the law. A planted language is a synthetic corpus in which the role of every
   evaluated token is a known function of exactly one named determinant (company, form, position, impact, or a
   declared mixture); the other candidate determinants are independent of the role by construction. The harness
   asks: does each instrument arm detect the determinant it should (reach a fraction of the oracle ceiling), and
   reject every determinant it should not (G at or below the instrument's own noise floor)? An instrument that cannot
   pass is UNDERPOWERED for the claims that rest on it; it is never "not falsified".
   The reference instrument (REF) is an INDEPENDENT implementation of the arms and learners of design 2.3, 2.7, 2.8,
   used so that the generators can be certified before the real instrument modules exist, and as a second
   implementation to cross-check them. Any other instrument plugs in through the same interface (planted-ref.mjs).

2. DEFINITIONS
   2.1 Plant. An object {id, kind, opts, truth, roles, language(draw), generate(split, draw), roleAt?, ...}. A
       LANGUAGE is the fixed random structure of one draw (alphabet, type forms, partitions, tables, transition
       matrices, derived only from sha256("khora-law-v2", plant id, option key, draw, "language")). A CORPUS is the
       emission of that language for one split. Train, dev and test of one draw share the language and differ in the
       emission stream. Every draw is reproducible byte for byte.
   2.2 Sizes and profile (design Appendix A "common frame"). Roles R = 10, type pool V = 3,000, Zipf s = 1.0,
       sentence length 3 + Poisson(14), train 20,000 tokens (= N_cap), dev 10,000, test 10,000 (preset "full").
       Preset "fast" (unit tests and smoke only; stated, never mixed into a full result): V = 150, train 5,000,
       dev 2,500, test 2,500. The planted streams are written as CoNLL-U (id, form, lemma, upos = the role,
       xpos "_", feats "_", head, deprel, deps "_", misc "_"). Roles are carried as UPOS14 tag names so that the
       real loaders and the evaluation set E (UPOS in UPOS14) apply unchanged: ROLE_UPOS = DET ADP CCONJ NOUN VERB
       ADJ ADV PROPN NUM INTJ (the first three are the closed roles of the T2 within-class strata, the rest open).
       A token whose role is undefined carries UPOS X, which E excludes from evaluation and training but which stays
       in the stream as context (design 2.1). There is no PUNCT in a planted stream.
   2.3 Identity of a unit: form.normalize("NFC").toLowerCase() (design 2.1). Alphabets are random per language, so
       form never transfers between languages by accident.
   2.4 OOV. dev and test tokens are replaced by a FRESH type (never emitted before) with probability rho; train has
       none beyond the natural tail of the pool. rho = 0.15 for the lexical and morphological plants (FO-LEX, FO-MORPH,
       PO, HMM-*, HOM, AGGL) per the common frame; rho = 0 for the company-determined plants (CO-*, MIX, FO-INDEP,
       CLASSMIX, CACHE, LATENT, BAG, UNBOUNDED) because a company determinant cannot be read through a neighbour whose
       identity was never seen (precision P3). The knob `oov` overrides.
   2.5 Oracle ceiling. G_oracle = CE(MAJ) - CE(oracle) in bits per evaluated test token, where CE(MAJ) is the
       cross-entropy of the TRAIN class prior and the oracle is the finite-sample Bayes lookup P(role | key) estimated
       on the train split (add-1/2, probabilities floored at 1e-4 and renormalised, unseen key -> the train prior)
       where `key` is the plant's own GENERATING VARIABLE for that token: the tuple of latent classes of the window
       (CO-TAB, CO-ADD, CO-PAR), the type (FO-LEX), the suffix class (FO-MORPH), the position class (PO), the
       (company class, form bit) pair (FO-INDEP), the latent state (LATENT), and so on (truth.oracleKey). This is
       the design's oracle. Two further reference ceilings are reported beside it and never replace it:
       G_attain, the same lookup with every window class replaced by "?" when the identity at that offset has fewer
       than 3 occurrences in the train split (the ceiling of a learner that knows the class of every type it has
       seen at least three times and nothing else; plants whose key is already the identity have G_attain = G_oracle),
       and, for HMM plants, G_obs, the exact Bayes posterior of the true generating model given the observed window.
       The ratio G(arm)/G_oracle is the detection statistic; G(arm)/G_attain is the diagnostic that tells a generator
       that exceeds identity-level learnability at the declared exposure from an instrument that cannot hear the
       structure (precision P4).
   2.6 Arms of the reference instrument (design 2.3, 2.7, W protocol): MAJ; POS (exact index i and distance
       n - i + 1, each one-hot up to 24, then a "24+" bucket); FREQ (log2(1 + n_w) bucket of the type's train count);
       FORM-LEX (the identity); FORM-MORPH (suffixes 1..4, prefixes 1..3 as one group); FORM (both); COMP-OCC(h, side)
       (one group per offset, the identity at that offset, centre masked, boundary-blind padding: where the window
       leaves the sentence the slot is filled by an identity drawn i.i.d. from the train unigram distribution, seeded
       by sha256 of (khora-law-v2, "pad", plant, draw, split, sentence index, offset); no sentinel, no type vector, no
       own descriptor, no exposure count); COMP-SENT (COMP-OCC with ^ and $ instead of padding); BAG (the set of the
       other identities of the sentence, one group); COMP-SUF(h) (COMP-OCC on the 2-character suffix of each window
       identity: sub-word company); combinations by concatenation. Each feature GROUP is L2-normalised to unit norm
       per token (design 2.7). The REF exposure is the train counts (no online update; precision P8).
   2.7 Learners (design 2.8). L1: multinomial logistic regression, L2 penalty lambda on the MEAN cross-entropy
       (bias unpenalised), L-BFGS (memory 10), warm-started down the lambda path from the largest value, at most 200
       iterations, relative gradient norm 1e-5. L2: one hidden layer of 64 ReLU units, sparse Adam (lr 1e-3, batch
       256, 30 epochs, fixed seed), L2 penalty lambda on the touched rows. Tuning budget, identical for every arm:
       L1 lambda in {1e-4, 1e-3, 1e-2, 1e-1, 1, 10}; L2 lambda in {1e-3, 1e-2} (declared reduction, compute-bound,
       equal for every arm). Selection by mean cross-entropy on the draw's DEV split. Probabilities floored at 1e-4
       and renormalised. G = CE(MAJ) - CE(arm), bits per token, TEST split.
   2.8 epsilon_noise (instrument stability floor, design 2.10(1), G2). The 95th percentile of |G(seed s) - G(seed s')|
       over the NULL cells {FO-LEX x (COMP-OCC(2), POS, FREQ), PO x (COMP-OCC(2), FORM-LEX, FREQ), CO-ADD(1) x
       (FORM-LEX, POS)} and P seed pairs (P = 20 in a full run, 8 in the fast tests), where a seed re-draws the
       COMP-OCC padding and a sentence-bootstrap resample of the train split, on identical dev and test data.
   2.9 Detect and reject (design G0). DETECT(arm, plant): G(arm) >= theta * G_oracle with theta = 0.8, AND the
       label-permutation p < 0.05 (B_perm = 200 permutations of the test labels with the trained predictions fixed),
       in at least ceil(0.95 * D) of D draws. REJECT(arm, plant): G(arm) <= epsilon_noise in at least ceil(0.95 * D)
       of D draws. D = 200 in a full run, 6 in the fast tests (where ceil(0.95 * 6) = 6: all six). A cell PASSES iff
       every registered DETECT and every registered REJECT holds. A cell that does not pass is reported as failed;
       it is never re-run with changed settings.
   2.10 Determination verified by intervention, not asserted. For every deterministic plant the role is a pure
       function plant.roleAt(ids, i) of the observable stream. verifyDetermination(plant) (a) re-computes every
       emitted role from that function, (b) replaces the centre identity, every token outside the declared window,
       and the position, one at a time, and requires the role to be unchanged wherever the declaration says it is
       independent, and (c) replaces the window tokens with tokens of other classes and requires the role to change
       in a share of draws no smaller than 1 - 1/R minus its own sampling bound (the determinant matters).

3. NULLS (what each result is compared with)
   N1 label permutation of the test labels (G > 0, p < 0.05); N2 learner null: train on label-permuted TRAIN data,
   G on the real test must be <= epsilon_noise (G1); N3 within-sentence shuffle of the test stream: COMP-OCC must
   collapse on a company plant and FORM-LEX must not move on a form plant (design T1, T9); N4 the random-role plant
   IMPACT-NULL (roles independent of structure): impact arms at epsilon_noise; N5 the equal-count matched
   selection of SLOT-ONLY and SPAN-ONLY, which makes the rival signature carry exactly zero information about the
   role by construction.

4. CONTROLS BUILT TO FAIL (each must come out the wrong way when the instrument or generator is wrong)
   C1 the old modular-sum plant CO-PAR(2): the assertion G(COMP-OCC) >= 0.8 G_oracle is REGISTERED TO FAIL for both
      learners (a parity-like determination that a logistic model cannot represent and a 64-unit network cannot
      learn from the declared exposure); if it passes, the oracle ceiling or the learner is wrong.
   C2 FO-LEX with company i.i.d.: G(COMP-OCC) must be <= epsilon_noise (this assertion fails under the revision-1
      COMP definition that carried the centre's own type vector; it is the leak detector).
   C3 centre-swap invariance: COMP-OCC, COMP-SENT, COMP-W feature vectors are unchanged when the centre identity is
      replaced, and FORM-LEX, FREQ, POS-with-identity features change (the property must fail where it should).
   C4 label-permuted train (N2); label-permuted test (N1).
   C5 sham ablation (toy reader): the typed-delta signature is the null type in 100 percent of cases.
   C6 offset invariance (toy reader): deleting a token leaves every slot of an unrelated sentence unchanged while
      the string/span rival's offsets-moved component is non-zero.
   C7 self-substitution (fold): A <- A is the null type in 100 percent of cases.
   C8 symmetric planted pair SLOT-ONLY / SPAN-ONLY: the slot arm must win the first and lose the second, so that T10
      can fail in either direction.
   C9 the parity plant UNBOUNDED: no bounded window determines the role (the exact conditional entropy given any
      window shorter than the prefix equals the marginal entropy).

5. REGISTERED CELLS (preset "fast" in the tests; preset "full" for the report) AND PREDICTIONS (recorded ahead of data)
   Cell            plant                         DETECT (learner)                       REJECT
   CO-ADD-1/2/4    CO-ADD(h, left)               COMP-OCC(h, left) (L1)                 FORM-LEX, FORM-MORPH, POS, FREQ
   CO-TAB-1        CO-TAB(1, left)               COMP-OCC(1, left) (L1)                 FORM-LEX, FORM-MORPH, POS, FREQ
   CO-TAB-2/4      CO-TAB(h, left)               COMP-OCC(h, left) (L2)                 FORM-LEX, FORM-MORPH, POS, FREQ
   CO-PAR-2        CO-PAR(2) (documented fail)   COMP-OCC(2) (L1 and L2) must NOT reach 0.8
   FO-LEX          FO-LEX                        FORM-LEX (L1)                          COMP-OCC(2), POS
   FO-MORPH        FO-MORPH                      FORM-MORPH (L1)                        COMP-OCC(2), POS, FORM-LEX
   PO              PO                            POS (L1)                               COMP-OCC(2), FORM, FREQ
   HMM-SHARED      HMM-SHARED                    COMP-OCC(2) (L1) vs the latent oracle   POS beyond boundary effects (reported)
   Prediction P-a: CO-ADD-1, CO-ADD-2, CO-TAB-1, FO-LEX, FO-MORPH, PO PASS in preset fast; CO-PAR-2 FAILS (as
   registered); CO-TAB-2 and CO-TAB-4 are OPEN (prior 0.5 each: whether a 64-unit network learns a 64- to 256-cell
   class table over identity inputs from 5,000 tokens); CO-ADD-4 is OPEN (the lag-3 and lag-4 weights have scale
   1/3 and 1/4, so the h = 4 determination is weakly identifiable at 5,000 tokens). HMM-SHARED DETECT is predicted
   to FAIL against the latent oracle (identity-level learners do not identify the neighbours' roles of rare open
   types) and to be informative as a ratio, not as a pass.
   Prediction P-b (the coverage bound, derived analytically before any run): with Zipf s = 1 over V = 3,000 and 20,000
   train tokens the expected count of the type of rank r is about 2,331 / r, so the share of window tokens whose
   type has at least 3 train occurrences is H(777)/H(3000), about 0.84; an identity-level learner can know the class
   of at most that share of the neighbours, so at the LITERAL pool (V = 3000) the CO plants with h = 2 and h = 4 are
   expected NOT to reach 0.8 of G_oracle (about 0.84^h of it at best), while h = 1 is borderline; the diagnostic
   `dense` pool (V = 150 at 20,000 tokens, full coverage) removes the bound. If the literal cells fail and the dense
   cells pass, the report says "instrument adequate, generator beyond identity-level learnability at N_cap", which
   is a design finding for the G0 cells of T1 (precision P4), not an instrument failure.
   Prediction P-c: epsilon_noise(REF) is below 0.02 bits in preset fast.
   Shapley recovery (design G0): MIX(pi) for pi in {0.2, 0.5, 0.8} with the company component CO-TAB(1) (precision
   P10: the design's CO-TAB(2) is not representable by L1): the recovered share phi_K / (phi_K + phi_F) is within
   0.10 of pi in at least ceil(0.9 D) draws. Prediction: OPEN (prior 0.4); a failure is reported as a failure.
   Impact cells (toy reader, section 7) and fold cells (section 8) have their own registered rules there.

6. PRECISIONS AND DEVIATIONS FROM APPENDIX A (each one a finding)
   P1 Boundary handling. Appendix A gives "padding kappa = 0" for the CO plants while G0 requires COMP-OCC to be
      boundary-blind (random padding). Those cannot both hold: a boundary token's determinant (a pad class)
      is unobservable to a boundary-blind arm, so up to h/17 of the tokens (24 percent at h = 4) would be
      undetectable by construction. Resolution: a token whose determining window is incomplete carries UPOS X
      (excluded from E), so the evaluated tokens all have complete windows and COMP-OCC never needs padding on them.
   P2 Every role used. For h = 1 the table has q = 8 cells for R = 10 roles, so "every role used" is unsatisfiable;
      T covers min(cells, R) distinct roles (truth.rolesUsed is recorded).
   P3 OOV rate 0 for company-determined plants (2.4 above).
   P4 Learnability. The design's learnability criterion is the table size (at most 256 cells). The identity-to-class
      map of kappa must also be learned from the exposure; the coverage bound of P-b makes the literal CO cells
      unreachable for identity-level learners at h >= 2. Reported through G_attain and the `dense` diagnostic pool; the
      DETECT rule stays the design's (G_oracle).
   P5 Horizon plants. With i.i.d. identities (the CO-TAB of the design) the gold-free horizon h*_u of T6 is undefined,
      because the text itself carries no dependence at any lag. plantCOTab accepts `textHorizon` (default 0 = i.i.d.):
      the type pool is split into role-plane classes u (what role depends on) and text-plane classes v, and v follows
      a class chain of order `textHorizon`, so an unsupervised class-transition predictor has a measurable
      horizon equal to `textHorizon`, independent of the role horizon h. truth.roleHorizon and truth.textHorizon are
      both recorded; textHorizon = h couples them and textHorizon != h is the control built to fail for T6b.
   P6 F in IMPACT-PLANT. The design's F ("filler never in a relation: no-slot, nothing changes") cannot be realised
      by a prior-free toy reader without a stop list (a lexicon prior that makes the role identity-determined).
      F is realised as a FREE FIGURE: a recurrent figure that fills no relation; its ablation changes only its
      referent entry. The four roles are N-end, V, F-free, U.
   P7 Where "rejection sampling" matches the rival signature (SLOT-ONLY, SPAN-ONLY), tokens that are not selected
      keep their place in the text as context and carry UPOS X (excluded), so the matched sample is a selection of
      evaluated tokens, never an edit of the text.
   P8 REF exposure is train counts, not the online listener's lifetime exposure (design E1); it is the same for
      every arm, so it cannot favour one.
   P9 Mixed per-token coin for MIX(pi): the coin is a latent per-token Bernoulli(pi), as written.
   P10 The Shapley cell uses a CO-TAB(1) company component because L1 cannot represent the interaction of CO-TAB(2).
   P11 LAW-TRUE (R4 and R5) is NOT realised as a planted universe (see section 9). LAW-FALSE and LAW-CO-ONLY are.

7. THE PLANTED TOY READER AND THE IMPACT PLANTS (R1: ablate at the slot, not the span)
   The toy reader reads a document (a list of sentences of identities): a FIGURE is an identity with at least two
   mentions in the document, admitted in the order of its second mention; an EDGE in a sentence is a triple
   (end1, label, end2) with end1 and end2 figures at token distance `reach` (default 2) and the label the token
   after end1, found by a left-to-right non-overlapping scan. Slots: rel-end1 (the subject slot of the prior-free
   reading), rel-label, rel-end2, each addressed (sentence offset e, ordinal j, field), and ref-entry addressed by
   admission ordinal; fillers are the referent entry, the connector string, and the entry with its mention count.
   Ablation modes: delete (A-DEL, primary), mask, fill (a neutral filler of the same slot class), and sham. Slots are
   aligned by structure (longest common subsequence over edges sharing at least one equal field, ties to the earlier
   ordinal) and never by byte offset. The seven typed deltas are emptied, retyped, rebound, refilled, shifted, born,
   unchanged, assigned with the precedence emptied > retyped > rebound > refilled > shifted > unchanged. The IMPACT-SLOT
   signature has 85 components (4 slot families x 3 radius bands x 6 non-trivial delta types = 72, the 12 per-cell
   slot counts, and the no-slot flag), each transformed sign(x) log2(1 + |x|); a difference below 1e-9 is zero. The
   span rival IMPACT-SPAN has 12 string-keyed components (edges lost, born, with changed ends, with changed label,
   entry births, entry losses, mention shift, t is a figure, t as end1, t as label, t as end2, offsets-moved).
   Plants: IMPACT-PLANT (roles N-end, V, F-free, U by construction; IMPACT-NULL = the same text with roles assigned
   independently of structure), IMPACT-SUFF (role a function of the impact class), IMPACT-LOSSY (role a function of
   the impact class and of a window marker the signature discards), LONGRANGE (role = the later-frame effect of the
   token, with a window marker in the next frame that a non-causal bag can read and a prefix cannot), SLOT-ONLY and
   SPAN-ONLY (selection of evaluated tokens so that the rival signature has zero information), IMPACT-HORIZON(h)
   (edges at token distance h, so the measured impact extent is h). Identities of structural slots are drawn from the
   same Zipf pool as every other token, with placeholders mapped to distinct draws, so the role is independent of
   identity up to the distinctness constraint.
   Registered impact rules (REF toy cells, dense PCA-24 for both signatures, L1, N_imp = 4,000 train, 2,000 dev,
   2,000 test evaluated tokens): IMPACT-PLANT: G(IMPACT-SLOT) >= 0.8 G_oracle and IMPACT-NULL: G(IMPACT-SLOT) <=
   epsilon_noise; SLOT-ONLY: G(IMPACT-SLOT) >= 0.8 G_oracle and G(IMPACT-SPAN) <= epsilon_noise; SPAN-ONLY: the
   reverse; LONGRANGE: G(COMP-W) >= 0.8 G_oracle and G(COMP-W-C), G(COMP-OCC) <= epsilon_noise; IMPACT-SUFF: case (S):
   S(COMP-W given IMPACT-SLOT) <= epsilon_noise (the toy has no u_l, so SESOI_REF = epsilon_noise, the floor of
   2.10(2)); IMPACT-LOSSY: case (L): S(COMP-W given IMPACT-SLOT) > epsilon_noise. Prediction: all PASS (the toy
   structure is built to be heard); a failure means the harness or the generator is wrong.

8. THE FOLD PLANT (R2: identity as a fold)
   FOLD-PLANT(variant) plants beings with private relation structure and several surfaces (a name, a recurring
   pronoun-class token, a descriptor), with gold chains and mention spans. Two slot organs read it: STRING (the
   referent entry of a mention is its string, as the shipped prior-free reader indexes referents) and REF (the entry
   is the gold chain: the planted-side binder, the criterion's ceiling). FOLD(s; p, w) is the typed structure within
   slot-graph radius w of the slot of s visible from perspective p. SUBSTITUTION puts the referent entry of mention B
   into the slot of mention A (a slot substitution, not a string edit) and compares the folds at radius 1..w by typed
   deltas, excluding the slot itself; same referent iff the deltas are the null type. Variants: (a) surface variation,
   (b) homonym, (c) company-twin, (d) fold-blind (form-marked chains, structure random), (e) singleton, (f)
   perspective (two holders). Registered rules: with the REF organ FOLD links (a) and separates (b) and (c) in at
   least 95 percent of pairs and does not beat STRING on (d); with the STRING organ FOLD separates (c) but cannot
   link (a) name-pronoun or separate (b) homonyms (amendment A10: instrument-specific); STRING fails (a) and (b);
   COMP-SIM fails (c); self-substitution is null in 100 percent of cases. Prediction: all PASS.

9. COMPOSITE UNIVERSES (design Appendix A, LAW-*)
   LAW-FALSE: FO-LEX and PO mixed per token with the same role marginals; every company claim must fail. LAW-CO-ONLY:
   CO-TAB(h0) coupled text with the toy-reader impact null (no recurrence structure); R0 to R3 pass, R4 fails.
   LAW-TRUE is a SPECIFICATION with an explicit table of which of its conditions are realised exactly and which are not
   (precision P11): the text conditions of R0 to R3, T1b, T2 literal and T6 are realised by a deterministic CLOZE
   language (the class of every token is a function of the h0 classes before it; the identity within a class is
   random, so S(FORM given COMP-OCC) = 0 exactly); the condition R4 (role = the typed slot-ablation impact type AND
   impact determined by company AND no dependence on the centre identity beyond company) is NOT realised, because
   the impact of ablating a token depends on the token's own class through its neighbours' readings, so a planted
   world in which impact is the role and the centre identity adds nothing beyond company needs a reader whose slot
   type IS the company class; no such toy reader is built here. Gate G5 for R4 and R5 therefore cannot be met by
   these generators alone and must be redefined in v3 (reported in the limits).

10. DEV-ONLY RULE FOR REAL DATA
   The only real data this module ever reads is the DEV split of UD treebanks, to compare the planted Zipf profile
   (rank-frequency slope, type-token ratio, hapax share, sentence length) with real data; realProfile() throws for
   any split other than "dev". It never reads a TEST file. Registered profile check: the planted Zipf slope (OLS of
   log10 frequency on log10 rank, ranks 1..200, on the first 10,000 tokens of a split) is within 0.30 of the median
   real DEV slope over the sampled stems, and the planted type-token ratio at 10,000 tokens is within a factor of 2
   of the median real DEV ratio. This is a profile match report, not a fit: nothing is tuned to it.

11. LIMITS RECORDED IN ADVANCE
   REF is a stand-in instrument: L1 and L2 are implemented, but the unsupervised induction (K*, class descriptors,
   COMP-TYPE-D), the dmdWindow horizon measurement and the T2 convergence curve are the job of the real modules
   (company.mjs, window.mjs); the planted generators expose the truth those modules must recover (truth.roleHorizon,
   truth.textHorizon, CACHE and CLASSMIX structure) and structural tests check it without an instrument. The toy
   reader is not the shipped reader (adapters/text/relations-gfp.js): a real reader may be deaf to planted
   structure that the toy hears; that is exactly the UNDERPOWERED(reader) outcome the design reserves.
PREREG-END*/

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sha256hex } from "./planted-util.mjs";

/** The pre-registration header, as written. */
export function preregText() {
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const a = src.indexOf("/*PREREG-BEGIN"), b = src.indexOf("PREREG-END*/");
  return src.slice(a, b + "PREREG-END*/".length);
}
export function preregSha256() { return sha256hex(preregText()); }
/** Filled in when the header is frozen, before the first harness run. Outside the hashed block on purpose. */
export const PREREG_SHA256_FROZEN = "UNFROZEN";
export const DESIGN_SHA256 = "7911b687ef46c1e3815fbac049347ba38fc90cd9b9efe8d016d0902698a8ded2";

import { existsSync } from "node:fs";
import {
  makeRng, seedFor, zipfCdf, cdfOf, drawCdf, makeAlphabet, randomString, uniqueForms, log2, mean, quantile, entropyBits,
  lookupOracle, piForBits, h2, PROB_FLOOR,
} from "./planted-util.mjs";

// ───────────────────────── constants (section 2.2) ─────────────────────────

export const ROLE_UPOS = Object.freeze(["DET", "ADP", "CCONJ", "NOUN", "VERB", "ADJ", "ADV", "PROPN", "NUM", "INTJ"]);
export const UPOS14 = Object.freeze(["ADJ", "ADP", "ADV", "AUX", "CCONJ", "DET", "INTJ", "NOUN", "NUM", "PART", "PRON", "PROPN", "SCONJ", "VERB"]);
export const CLOSED_ROLES = Object.freeze(["DET", "ADP", "CCONJ"]);
export const R = ROLE_UPOS.length;
export const SPLITS = Object.freeze(["train", "dev", "test"]);
export const PRESETS = Object.freeze({
  full: Object.freeze({ name: "full", V: 3000, train: 20000, dev: 10000, test: 10000, zipf: 1.0, lenBase: 3, lenPoisson: 14 }),
  fast: Object.freeze({ name: "fast", V: 150, train: 5000, dev: 2500, test: 2500, zipf: 1.0, lenBase: 3, lenPoisson: 14 }),
});
const resolvePreset = (p) => (typeof p === "string" ? PRESETS[p] : p) ?? PRESETS.full;
export const ROLE_INDEX = Object.freeze(Object.fromEntries(ROLE_UPOS.map((r, i) => [r, i])));

/** An evaluated role is a UPOS14 tag; X (undefined role) is excluded from E and carried as context. */
export const isEvaluated = (row) => row.role >= 0;
export const identityOf = (form) => form.normalize("NFC").toLowerCase();
export const idsOf = (sentence) => sentence.rows.map((r) => identityOf(r.form));

// ───────────────────────── CoNLL-U-like I/O ─────────────────────────

/** Write a corpus (array of sentences or {sentences}) as CoNLL-U. Roles go in UPOS; X for undefined. */
export function toConllu(corpus, { roleNames = ROLE_UPOS } = {}) {
  const sentences = Array.isArray(corpus) ? corpus : corpus.sentences;
  const out = [];
  let lastDoc = null;
  for (const s of sentences) {
    if (s.doc != null && s.doc !== lastDoc) { out.push(`# newdoc id = ${s.doc}`); lastDoc = s.doc; }
    out.push(`# sent_id = ${s.id}`);
    out.push(`# text = ${s.rows.map((r) => r.form).join(" ")}`);
    s.rows.forEach((r, k) => {
      const upos = r.role >= 0 ? (roleNames[r.role] ?? ROLE_UPOS[r.role]) : "X";
      out.push([k + 1, r.form, r.form, upos, "_", "_", k === 0 ? 0 : 1, k === 0 ? "root" : "dep", "_", "_"].join("\t"));
    });
    out.push("");
  }
  return out.join("\n") + "\n";
}
/** A small CoNLL-U reader (integer ids only, as design 2.1): sentences of {id, rows:[{form, upos}]}. */
export function parseConlluLite(text) {
  const sentences = [];
  let rows = [], id = null, doc = null, pendingDoc = null;
  const flush = () => { if (rows.length) sentences.push({ id: id ?? `s${sentences.length}`, doc, rows }); rows = []; id = null; };
  for (const raw of text.split("\n")) {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (line === "") { flush(); continue; }
    if (line.charCodeAt(0) === 35) {
      let m;
      if ((m = /^#\s*sent_id\s*=\s*(.*)$/.exec(line))) id = m[1];
      else if ((m = /^#\s*newdoc(?:\s+id\s*=\s*(.*))?$/.exec(line))) { doc = m[1] ?? `d${sentences.length}`; pendingDoc = doc; }
      continue;
    }
    const f = line.split("\t");
    if (f.length < 10 || !/^\d+$/.test(f[0])) continue;
    rows.push({ form: f[1], upos: f[3] });
  }
  flush();
  void pendingDoc;
  return sentences;
}

// ───────────────────────── profile (section 10) ─────────────────────────

/** Rank-frequency slope (OLS of log10 frequency on log10 rank, ranks 1..maxRank), type-token ratio, hapax share, length. */
export function profileOf(sentences, { maxTokens = Infinity, maxRank = 200, trainIds = null } = {}) {
  const counts = new Map();
  let tokens = 0, sentCount = 0, lenSum = 0, oov = 0;
  for (const s of sentences) {
    if (tokens >= maxTokens) break;                                  // whole sentences only; the last may overshoot
    const ids = Array.isArray(s) ? s : (s.rows ? s.rows.map((r) => identityOf(r.form)) : s.ids);
    sentCount++; lenSum += ids.length;
    for (const id of ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1); tokens++;
      if (trainIds && !trainIds.has(id)) oov++;
    }
  }
  const freqs = [...counts.values()].sort((a, b) => b - a);
  const top = Math.min(maxRank, freqs.length);
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let r = 1; r <= top; r++) { const x = Math.log10(r), y = Math.log10(freqs[r - 1]); sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const slope = top >= 3 ? (top * sxy - sx * sy) / (top * sxx - sx * sx) : NaN;
  const hapax = freqs.filter((c) => c === 1).length;
  return {
    tokens, types: counts.size, ttr: tokens ? counts.size / tokens : NaN, hapaxShareOfTypes: counts.size ? hapax / counts.size : NaN,
    zipfSlope: slope, meanSentenceLength: sentCount ? lenSum / sentCount : NaN, sentences: sentCount,
    oovRate: trainIds ? oov / Math.max(1, tokens) : null,
  };
}
/** The DEV split of a UD treebank only (section 10): throws for any other split. Words that are not PUNCT, forms lowercased. */
export function realProfile(stem, { split = "dev", maxTokens = 10000, root = "/private/tmp/claude-501/ud-eval" } = {}) {
  if (split !== "dev") throw new Error(`planted.mjs reads the DEV split of real data only (asked for "${split}")`);
  const p = `${root}/${stem}/dev.conllu`;
  if (!existsSync(p)) return { gap: "no_data", stem, path: p };
  const sents = parseConlluLite(readFileSync(p, "utf8")).map((s) => s.rows.filter((r) => r.upos !== "PUNCT").map((r) => identityOf(r.form)));
  return { stem, path: p, ...profileOf(sents.filter((s) => s.length), { maxTokens }) };
}

// ───────────────────────── the plant factory ─────────────────────────

const optKeyOf = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
const sentenceLength = (rng, preset) => Math.min(60, preset.lenBase + rng.poisson(preset.lenPoisson));

/**
 * Build a plant from a spec: { id, kind, opts, roles, roleNames, truth, rho, buildLanguage(rng, draw, preset, plant),
 * genSentence(lang, rng, ctx) -> rows, roleAt?(lang, ids, i), oracleMode?, attainKey?(lang, ids, i, row), generate?(split, draw, lang) }.
 * A row is {type, form, role (-1 = undefined, carried as UPOS X), key (the generating variable), ...}.
 */
function makePlant(spec) {
  const preset = resolvePreset(spec.opts.preset);
  const optKey = optKeyOf(spec.opts);
  const langCache = new Map();
  const plant = {
    id: spec.id, kind: spec.kind, opts: spec.opts, optKey, preset, roles: spec.roles ?? R, roleNames: spec.roleNames ?? ROLE_UPOS,
    truth: spec.truth, rho: spec.rho ?? 0, oracleMode: spec.oracleMode ?? "lookup",
    language(draw) {
      if (!langCache.has(draw)) {
        const rng = makeRng("language", spec.id, optKey, draw);
        langCache.set(draw, spec.buildLanguage(rng, draw, preset, plant));
      }
      return langCache.get(draw);
    },
    /** The corpus of one split of one draw. Pure function of (plant, options, split, draw). */
    generate(split, draw = 0) {
      if (!SPLITS.includes(split)) throw new Error(`planted: unknown split "${split}"`);
      const lang = plant.language(draw);
      const sentences = spec.generate
        ? spec.generate(split, draw, lang, plant)
        : emitText(plant, spec, lang, split, draw);
      let tokens = 0, evaluated = 0;
      for (const s of sentences) { tokens += s.rows.length; for (const r of s.rows) if (r.role >= 0) evaluated++; }
      return { plant: spec.id, kind: spec.kind, split, draw, sentences, tokens, evaluated, roles: plant.roles, roleNames: plant.roleNames };
    },
    corpusSet(draw = 0) { return { lang: plant.language(draw), train: plant.generate("train", draw), dev: plant.generate("dev", draw), test: plant.generate("test", draw) }; },
    conllu(split, draw = 0) { return toConllu(plant.generate(split, draw), { roleNames: plant.roleNames }); },
    roleAt: spec.roleAt ?? null,
    attainKey: spec.attainKey ?? null,
    spec,
  };
  return plant;
}

function emitText(plant, spec, lang, split, draw) {
  const rng = makeRng("emit", plant.id, plant.optKey, draw, split);
  const N = plant.preset[split];
  const sentences = [];
  let total = 0;
  for (const sp of SPLITS) ctxCounter(lang, sp).n = 0;               // a re-generated split is byte-identical
  while (total < N) {
    let n = sentenceLength(rng, plant.preset);
    if (total + n > N) n = N - total;
    if (n < 1) break;
    const rows = spec.genSentence(lang, rng, { split, n, index: sentences.length, draw, plant });
    sentences.push({ id: `${plant.id}.${draw}.${split}.${sentences.length}`, rows });
    total += rows.length;
  }
  return sentences;
}

/** Evaluated tokens of a corpus: {s, i, role, key}. */
export function evaluatedOf(corpus) {
  const out = [];
  corpus.sentences.forEach((s, si) => s.rows.forEach((r, i) => { if (r.role >= 0) out.push({ s: si, i, role: r.role, key: r.key }); }));
  return out;
}

// ───────────────────────── the oracle (section 2.5) ─────────────────────────

/**
 * Oracle ceilings of one draw: G_oracle (the design's: lookup on the generating variable), G_attain (lookup on the
 * identity-level observable key, when the plant declares one), the evaluated share and the role entropy. Bits per token.
 */
export function oracle(plant, { draw = 0, set = null } = {}) {
  const cs = set ?? plant.corpusSet(draw);
  const take = (corpus, keyFn) => {
    const keys = [], roles = [];
    corpus.sentences.forEach((s) => {
      const ids = idsOf(s);
      s.rows.forEach((r, i) => { if (r.role >= 0) { keys.push(keyFn ? keyFn(s, ids, i, r) : r.key); roles.push(r.role); } });
    });
    return { keys, roles };
  };
  const exact = plant.oracleMode === "exact";
  const kf = exact ? (s, ids, i, r) => `role:${r.role}` : null;
  const tr = take(cs.train, kf), te = take(cs.test, kf);
  const o = lookupOracle(tr.keys, tr.roles, te.keys, te.roles, plant.roles);
  let attain = null;
  if (plant.attainKey && !exact) {
    const counts = new Map();
    for (const s of cs.train.sentences) for (const r of s.rows) { const id = identityOf(r.form); counts.set(id, (counts.get(id) ?? 0) + 1); }
    const af = (s, ids, i, r) => plant.attainKey(cs.lang, ids, i, r, counts);
    const ta = take(cs.train, af), tb = take(cs.test, af);
    attain = lookupOracle(ta.keys, ta.roles, tb.keys, tb.roles, plant.roles);
  }
  const counts = new Map(); for (const r of tr.roles) counts.set(r, (counts.get(r) ?? 0) + 1);
  return {
    plant: plant.id, draw, G_oracle: o.G, ce: o.ce, ceMaj: o.ceMaj, n: o.n, seenShare: o.seenShare,
    G_attain: attain ? attain.G : o.G, attainSeenShare: attain ? attain.seenShare : o.seenShare,
    evaluatedShare: cs.test.tokens ? cs.test.evaluated / cs.test.tokens : 0,
    roleEntropy: entropyBits(counts), rolesUsed: counts.size,
  };
}

// ───────────────────────── class languages (CO family, FO-INDEP, MIX, CLASSMIX share this) ─────────────────────────

const qFor = (m) => Math.min(8, Math.floor(Math.pow(256, 1 / m) + 1e-9));
const tupleIndex = (vals, q) => { let x = 0; for (let k = 0; k < vals.length; k++) x = x * q + vals[k]; return x; };

/** Window indices of token i of a sentence of length n: left lags, right lags, or both; null when incomplete (P1). */
export function windowIndices(side, h, i, n) {
  const idx = [];
  if (side === "left" || side === "both") for (let d = h; d >= 1; d--) idx.push(i - d);
  if (side === "right" || side === "both") for (let d = 1; d <= h; d++) idx.push(i + d);
  for (const j of idx) if (j < 0 || j >= n) return null;
  return idx;
}
export function windowOffsets(side, h) {
  const o = [];
  if (side === "left" || side === "both") for (let d = h; d >= 1; d--) o.push(-d);
  if (side === "right" || side === "both") for (let d = 1; d <= h; d++) o.push(d);
  return o;
}

/**
 * The type pool partitioned into role-plane classes u (what the role depends on) and text-plane classes v (what a
 * text-level class chain of order `textHorizon` depends on; q_v = 1 means i.i.d. identities). Zipf mass per type, the type
 * index is the rank. Fresh (OOV) types are minted deterministically per (split, counter); their classes are a hash of the form.
 */
function buildClassLang(rng, { V, q, qv = 1, zipf = 1.0 }) {
  const alphabet = makeAlphabet(rng.child("alphabet"), 22);
  const forms = uniqueForms(rng.child("forms"), alphabet, V);
  const cells = q * qv;
  const arng = rng.child("assign");
  const order = arng.perm(V);
  const uOf = new Int16Array(V), vOf = new Int16Array(V);
  for (let k = 0; k < V; k++) {
    const t = order[k];
    const c = k < cells * 2 ? k % cells : arng.int(cells);
    uOf[t] = Math.floor(c / qv); vOf[t] = c % qv;
  }
  const mass = new Float64Array(V);
  for (let t = 0; t < V; t++) mass[t] = Math.pow(t + 1, -zipf);
  const cellTypes = Array.from({ length: cells }, () => []);
  for (let t = 0; t < V; t++) cellTypes[uOf[t] * qv + vOf[t]].push(t);
  const cellCdf = cellTypes.map((ts) => (ts.length ? cdfOf(ts.map((t) => mass[t])) : null));
  const uMass = new Float64Array(q);
  for (let t = 0; t < V; t++) uMass[uOf[t]] += mass[t];
  const idType = new Map();
  for (let t = 0; t < V; t++) idType.set(identityOf(forms[t]), t);
  const lang = {
    V, q, qv, zipf, alphabet, forms, uOf, vOf, mass, cellTypes, cellCdf, uCdf: cdfOf(uMass), idType, rng, freshForms: new Map(),
    formOf(t) {
      if (t < V) return forms[t];
      let f = lang.freshForms.get(t);
      if (!f) {
        const fr = makeRng("fresh", ...rng.parts, t);
        f = randomString(fr, alphabet, 6 + fr.int(5)).normalize("NFC").toLowerCase();
        while (lang.idType.has(identityOf(f)) && lang.idType.get(identityOf(f)) !== t) f += alphabet[0];
        lang.freshForms.set(t, f); lang.idType.set(identityOf(f), t);
      }
      return f;
    },
    freshType(split, k) { return V + (split === "train" ? 1 : split === "dev" ? 2 : 3) * 1_000_000 + k; },
    typeOfId(id) { const t = lang.idType.get(id); return t === undefined ? -1 : t; },
    /** role-plane class of an identity: the pool class, or a hash class for fresh identities (also for unknown ones). */
    idU(id) { const t = lang.idType.get(id); return t !== undefined && t < V ? uOf[t] : fnv(id) % q; },
    idV(id) { const t = lang.idType.get(id); return t !== undefined && t < V ? vOf[t] : (fnv(id) >>> 8) % qv; },
  };
  return lang;
}

/** Draw one token type for a sentence position: role-plane class from the class marginal, text-plane class by the chain. */
function drawClassToken(lang, rng, ctx, vs, i, { textHorizon = 0, eps = 0.1, oov = 0, split, counter }) {
  const { q, qv } = lang;
  let u = drawCdf(lang.uCdf, rng.u());
  let v = 0;
  if (qv > 1) {
    if (textHorizon > 0 && i >= textHorizon && rng.u() > eps) {
      const tup = []; for (let d = textHorizon; d >= 1; d--) tup.push(vs[i - d]);
      v = lang.Psi[tupleIndex(tup, qv)];
    } else v = rng.int(qv);
  }
  let cell = u * qv + v;
  if (!lang.cellTypes[cell].length) { for (let vv = 0; vv < qv; vv++) if (lang.cellTypes[u * qv + vv].length) { cell = u * qv + vv; v = vv; break; } }
  if (oov > 0 && split !== "train" && rng.u() < oov) {
    const t = lang.freshType(split, counter.n++);
    lang.formOf(t);
    return { type: t, fresh: true, v: lang.idV(identityOf(lang.formOf(t))) };
  }
  const ts = lang.cellTypes[cell];
  return { type: ts[drawCdf(lang.cellCdf[cell], rng.u())], fresh: false, v };
}

// ───────────────────────── CO-TAB, CO-ADD, CO-PAR, UNBOUNDED ─────────────────────────

/**
 * Role determined by company only. kind: "tab" (table lookup on the tuple of role-plane classes of the window),
 * "add" (argmax of a sum of per-offset class weights), "par" (modular sum; parity-like), "unbounded" (parity of the whole prefix).
 * opts: h (window size per side), side ("left" | "right" | "both"), preset, pool (type pool V override), textHorizon (P5),
 * oov (P3: default 0), roleNoise (probability that an evaluated role is replaced by a uniform random role), seedTag.
 */
function makeCO(kind, opts) {
  const o = { h: 1, side: "left", preset: "full", textHorizon: 0, oov: 0, roleNoise: 0, ...opts };
  const preset = resolvePreset(o.preset);
  const V = o.pool ?? preset.V;
  const side = kind === "unbounded" ? "left" : o.side;
  const h = kind === "unbounded" ? Infinity : o.h;
  const m = kind === "unbounded" ? Infinity : (side === "both" ? 2 * o.h : o.h);
  const q = kind === "unbounded" ? 2 : kind === "par" ? 8 : qFor(m);
  const qv = o.textHorizon > 0 ? 2 : 1;
  const nR = kind === "unbounded" ? 2 : R;
  const id = kind === "unbounded" ? "UNBOUNDED" : `CO-${kind.toUpperCase()}(${o.h},${side})`;
  const offsets = kind === "unbounded" ? null : windowOffsets(side, o.h);

  const buildLanguage = (rng) => {
    const lang = buildClassLang(rng, { V, q, qv, zipf: preset.zipf });
    const trng = rng.child("table");
    if (kind === "tab") {
      const cells = Math.pow(q, m);
      const T = new Array(cells);
      for (let k = 0; k < cells; k++) T[k] = k < R ? k : trng.int(R);
      trng.shuffle(T);
      lang.T = Int8Array.from(T);
      lang.rolesUsed = new Set(T).size;
      lang.roleFn = (uw) => lang.T[tupleIndex(uw, q)];
    } else if (kind === "add") {
      const W = [];
      for (let k = 0; k < m; k++) {
        const d = Math.abs(offsets[k]);
        W.push(Array.from({ length: R }, () => Array.from({ length: q }, () => trng.normal() / d)));
      }
      lang.W = W;
      lang.rolesUsed = null;
      lang.roleFn = (uw) => {
        let best = -1, bs = -Infinity;
        for (let r = 0; r < R; r++) { let s = 0; for (let k = 0; k < m; k++) s += W[k][r][uw[k]]; if (s > bs) { bs = s; best = r; } }
        return best;
      };
    } else if (kind === "par") {
      const c = Array.from({ length: m }, () => 1 + trng.int(R - 1));
      lang.c = c;
      lang.roleFn = (uw) => { let s = 0; for (let k = 0; k < m; k++) s += c[k] * uw[k]; return s % R; };
    } else {
      lang.roleFn = (uw) => { let s = 0; for (const x of uw) s += x; return s & 1; };
    }
    if (qv > 1) {
      const th = o.textHorizon, cellsV = Math.pow(qv, th);
      lang.Psi = Int8Array.from({ length: cellsV }, () => trng.int(qv));
    }
    return lang;
  };

  const rolesOf = (lang, ids) => {
    const n = ids.length;
    const us = ids.map((x) => lang.idU(x));
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      if (kind === "unbounded") {
        if (i === 0) { out[i] = { role: -1, key: "" }; continue; }
        const uw = us.slice(0, i);
        const role = lang.roleFn(uw);
        out[i] = { role, key: String(role) };
        continue;
      }
      const w = windowIndices(side, o.h, i, n);
      if (!w) { out[i] = { role: -1, key: "" }; continue; }
      const uw = w.map((j) => us[j]);
      out[i] = { role: lang.roleFn(uw), key: uw.join(".") };
    }
    return out;
  };

  const roleAt = (lang, ids, i) => rolesOf(lang, ids)[i].role;

  const genSentence = (lang, rng, ctx) => {
    const n = ctx.n;
    const vs = new Array(n), toks = new Array(n);
    for (let i = 0; i < n; i++) {
      const t = drawClassToken(lang, rng, ctx, vs, i, { textHorizon: o.textHorizon, oov: o.oov, split: ctx.split, counter: ctxCounter(lang, ctx.split) });
      vs[i] = t.v; toks[i] = t;
    }
    const forms = toks.map((t) => lang.formOf(t.type));
    const ids = forms.map(identityOf);
    const rl = rolesOf(lang, ids);
    return toks.map((t, i) => {
      let role = rl[i].role;
      if (role >= 0 && o.roleNoise > 0 && rng.u() < o.roleNoise) role = rng.int(nR);
      return { type: t.type, form: forms[i], role, key: rl[i].key, fresh: t.fresh };
    });
  };

  const truth = {
    determinant: "company", kind, side, roleHorizon: kind === "unbounded" ? Infinity : o.h, textHorizon: o.textHorizon, windowSize: m,
    classes: q, pool: V, oov: o.oov, roleNoise: o.roleNoise,
    dependsOn: { centre: false, offsets, position: false, sentence: kind === "unbounded" ? "prefix" : false },
    roleCount: nR,
  };
  return makePlant({
    id, kind: `CO-${kind.toUpperCase()}`, opts: o, roles: nR, roleNames: kind === "unbounded" ? ["NOUN", "VERB"] : ROLE_UPOS,
    truth, rho: o.oov, buildLanguage, genSentence, roleAt,
    oracleMode: kind === "unbounded" ? "exact" : "lookup",
    attainKey: (lang, ids, i, row, counts) => {
      if (kind === "unbounded") return `${i}`;
      const w = windowIndices(side, o.h, i, ids.length);
      return w ? w.map((j) => ((counts.get(ids[j]) ?? 0) >= 3 ? lang.idU(ids[j]) : "?")).join(".") : "";
    },
  });
}
const ctxCounters = new WeakMap();
function ctxCounter(lang, split) {
  let m = ctxCounters.get(lang); if (!m) { m = {}; ctxCounters.set(lang, m); }
  // one counter per (language, split); generation of a split restarts it, so a re-generated split is identical
  return (m[split] ??= { n: 0 });
}

export const plantCOTab = (opts = {}) => makeCO("tab", opts);
export const plantCOAdd = (opts = {}) => makeCO("add", opts);
/** The modular-sum determination of revision 1. Kept for UNBOUNDED and as the documented-failing cell CO-PAR(2) (control C1). */
export const plantCOPar = (opts = {}) => (opts.h === Infinity ? makeCO("unbounded", opts) : makeCO("par", opts));
/** Role = parity of the whole prefix (control C9): no bounded window determines it. */
export const plantUnbounded = (opts = {}) => makeCO("unbounded", opts);

// @@APPEND-HERE
