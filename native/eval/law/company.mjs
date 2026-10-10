// native/eval/law/company.mjs — COMPANY: the five company arms, the exposure, the
// rival reference arms, the learner harness and the controls built to fail.
// PRE-REGISTRATION (this header) written 2026-10-05, BEFORE any code below it and
// BEFORE any run of any instrument it describes. No result is in this header.
//
// STANDING AND AUTHORITY
//   Implements the COMPANY half of docs/LAW-FALSIFICATION.md revision 2
//   (sha256 7911b687ef46c1e3815fbac049347ba38fc90cd9b9efe8d016d0902698a8ded2).
//   Where this header and that document disagree, the document wins and this
//   file is the bug. Where the document is silent this header DECLARES the
//   choice (section 3, "declared here"), before any run; a declared choice is
//   frozen with the code hash (run.mjs --freeze-code) and is never changed
//   after a result. A bug found after a run is appended to the BUG LOG at the
//   foot of this header, next to the original run, never in place of it.
//   Files governed by this header: company.mjs, company-induce.mjs (numerics,
//   unsupervised induction), company-learner.mjs (the learner family),
//   company-smoke.mjs (the DEV smoke CLI), tests/law-company.test.js.
//   khora is a ZERO-MODEL reader: nothing here calls a model. The learners of
//   section 4 are generic measuring instruments trained from scratch on the
//   data of the run (no pretrained weights, no embeddings, no external data).
//   Imports: node built-ins and sibling files only. NO prior is imported
//   (priors/pos-*, frame-*, role-config-*, proclitics-*, morph*, language-grammar,
//   heard-nominals, reader-bundle, grain-typing, relations-positional with a
//   RoleConfig, any ear): doc 2.7 contamination ledger, enforced by G4. The
//   repo's organs/company-index.js is imported by the TEST only, to assert
//   COMP-NATIVE conformance; no EO structure (cube, operator, phasepost, cell)
//   is an input anywhere (rule 6).
//
// 0. WHAT THIS MODULE IS FOR
//   The law under test: "you know a word by the company it keeps // a token's
//   role is determined by the type of impact it has on the holograph, bounded by
//   differences that make a difference". This module owns clause C1 (Firth):
//   a token's ROLE is determined by its COMPANY, not by its own form and not by
//   its absolute position, and the bound C3 as far as company goes. It builds:
//     (a) the company arms COMP-OCC, COMP-SENT, COMP-TYPE (+ the lossy dense
//         COMP-TYPE-D), COMP-W / COMP-W-C (the matched-visibility comparator that
//         T5/T10 use), BAG, and COMP-NATIVE (the repo's own company, doc 2.3);
//     (b) the causal (prefix-only) and non-causal (lookahead bound) variants;
//     (c) per language the unsupervised induction (K*, classes, type
//         descriptors, class descriptors) and the language-independent summary
//         profiles that let a company feature cross a family boundary: context
//         diversity, left/right entropy, the neighbour-class transition profile,
//         frequency rank, boundary surprise (doc 2.4, X protocol);
//     (d) within-language lexical company vectors (W protocol, hashed identity
//         features) and the type-aggregated lexicon arm;
//     (e) the shared learner family L1 (multinomial logistic regression) and L2
//         (one hidden layer) used by EVERY rival arm, with the one tuning budget;
//     (f) REFERENCE implementations of the rival arms MAJ, POS, FREQ, FREQ+POS,
//         FORM (FORM-LEX, FORM-MORPH, FORM-X), LEXD, so that equal treatment is
//         enforced by construction (one feature pass, one learner, one budget);
//         form.mjs / position.mjs of the design may replace them through the
//         arm registry; conformance is asserted by the same tests;
//     (g) the harness that predicts UPOS (G1), is-nominal (G2), name-vs-common
//         (G3) and DEPREL (G4) on held-out tokens, per-token cross-entropy in
//         bits, G, S(a given b), strata H0/H1/H2, the sentence-block bootstrap;
//     (h) the controls built to fail that belong to company: within-sentence
//         shuffle, beyond/within scramble, centre swap, collision Bayes error.
//   It does NOT build: IMPACT (slots.mjs), the fold (fold.mjs), the horizon
//   measurement by dmdWindow (window.mjs), SESOI / n_min / k_N (gates.mjs,
//   stats.mjs), verdicts (verdict.mjs). It computes statistics; it does not
//   decide the law. Develop and smoke on DEV only; the TEST split is never read
//   by this module or its smoke CLI (the loader refuses a path named test.conllu).
//
// 1. DEFINITIONS (frozen; doc 2.1 to 2.4, restated so the code has one source)
//   Identity: form.normalize("NFC").toLowerCase(). Company sees identities only;
//   spelling is kept for the FORM arms only.
//   Stream: the syntactic words of a sentence (rows with a plain-integer ID;
//   ranges "1-2" and empty nodes "1.1" skipped) with rows whose UPOS is PUNCT
//   removed (heard rule S1/S2). Empty streams are skipped. Gold lives in a
//   parallel array {upos, deprel}; no feature function receives it (rule 6).
//   Evaluation set E: stream units with UPOS in UPOS14 = {ADJ ADP ADV AUX CCONJ
//   DET INTJ NOUN NUM PART PRON PROPN SCONJ VERB}; SYM and X stay in the stream
//   as context and are neither trained on nor evaluated. Grains: G1 UPOS14;
//   G2 is-nominal (NOUN/PROPN vs the other twelve); G3 PROPN vs NOUN among
//   nominal tokens; G4 DEPREL with subtype stripped, restricted to the labels
//   with at least 0.5 percent of the pooled train tokens supplied by the caller.
//   Horizon ladder H = {1,2,4,8,16,whole}; the operating horizon h*_l is MEASURED
//   by window.mjs on DEV (dmdWindow); this module takes h as a parameter and
//   reports the whole curve G(h) for the plateau test T6a; it never types one.
//   THE CENTRE TOKEN IS NEVER IN ITS OWN COMPANY. Arms and visibilities:
//   COMP-OCC   the identities at offsets within h of the centre (causal: left
//              offsets 1..h; non-causal: both sides), centre masked. No type
//              vector, no own descriptor, no exposure count, no sentinel, no
//              boundary indicator. BOUNDARY-BLIND PADDING: a slot beyond the
//              sentence is filled by an identity drawn i.i.d. from the unigram
//              distribution of the frozen exposure Q_0, so the vector carries no
//              information on the distance to the boundary except what the
//              words carry. The ONLY arm that may carry "not by form, not by
//              position". W: hashed keys L<k>=<identity>, R<k>=<identity>
//              (offsets above 16, for the whole-sentence rung, pooled into the
//              bag keys L>16=, R>16=). X: language-independent descriptors (3.4).
//   COMP-SENT  COMP-OCC with the repo's sentinels ^ and $ in the missing slots
//              (organs/company-index.js), plus in X the boundary indicators and
//              the boundary surprise. Boundary-aware by construction. The
//              difference S(COMP-SENT given COMP-OCC) is the boundary
//              contribution (amendment A8).
//   COMP-TYPE  the type company of the centre's identity at the exposure at read
//              time: W sparse vector of counts of keyed neighbour features
//              o-k=<identity> (k=1..min(h,4), left), o+k=<identity> (right),
//              sentinels ^ and $ at the sentence ends, aggregated over all
//              EARLIER occurrences of the type: a lossless pointer to identity
//              once aggregated, therefore labelled COMP+FORM-LEX-equivalent
//              wherever it appears and never carrying "not by form". At h=1 it is
//              COMP-NATIVE (before=, after=). COMP-TYPE-D is its lossy dense
//              form: W (within language, the A3 test): per (side, offset band)
//              the normalised distribution of the neighbours' induced CLASSES,
//              dimension 2 * (#bands up to h) * (K*+1), no frequency, no
//              identity, no position; X (language independent): per (side, band)
//              the mean class descriptor of those neighbour classes (3.4).
//   COMP-W     the matched-visibility window: the identities in the frames
//              (sentences) [s-M, s+F], centre masked; W: order-preserving bag,
//              key f<e>=<identity> (e the frame offset; the self frame e=0 split
//              by side of the centre: f0L=, f0R=); X: per frame-offset band the
//              mean class descriptor and class entropy, same-frame left and
//              right summaries. COMP-W-C is frame-causal: frames [s-M, s].
//   BAG        the multiset of identities of the sentence other than the centre
//              (causal variant: the prefix before the centre only); W hashed set
//              b=<identity>; X mean and entropy of the others' class descriptors.
//   Rivals (reference implementations): MAJ (training prior); POS (index and
//   boundary distances, no content); FREQ (the type's exposure frequency only);
//   FORM (the token's own spelling: FORM-LEX identity, FORM-MORPH affixes and
//   shape; X: FORM-X shape vector); LEXD (the centre's own type descriptor).
//   Concatenation arms: COMP-OCC+FORM, COMP-OCC+FREQ+POS (the baseline pair of
//   T1/T4), COMP-OCC+POS, COMP-TYPE+FORM, COMP-W+<arm>.
//
// 2. THE QUANTITIES (doc 2.9)
//   G(arm) = CE(MAJ) - CE(arm), bits per evaluated token, on held-out tokens.
//   S(a given b) = G(a+b) - G(b). D1 = S(COMP-OCC given FREQ+POS) (T1(i));
//   D1b(stratum) = G(COMP-OCC) - G(FORM) (T1(ii)) on all tokens, on H0, on H1.
//   Strata (T4), from counts only: H0 first sight (type absent from the exposure
//   at read time); H1 true hapax (absent from Q_0 and exactly once in the
//   evaluation stream; the stream count selects which tokens are EVALUATED, no
//   feature uses it); H2 the rest. Open/closed UPOS split of T2 (gold stratifies
//   the evaluation, never a feature). Intervals: sentence-block bootstrap of
//   per-sentence loss sums (B_boot = 2000, seeded). Label permutation for G>0
//   (B_perm = 1000, test labels, trained model reused).
//
// 3. DECLARED HERE (the document is silent; frozen with the code hash)
//   D1  N_cap = 20,000 stream tokens (PUNCT removed), the longest prefix of a
//       seeded permutation of the train sentences whose total is at most N_cap.
//   D2  Padding: slots drawn from the Q_0 unigram (frozen, independent of the
//       evaluation stream, hence trivially causal), seeded by a per-sentence
//       sha256 of (khora-law-v2, stem, split, sentence index) mixed with the
//       relative offset by the murmur3 32-bit finaliser; identities in the
//       unigram are ordered by (count desc, identity asc) for determinism.
//   D3  Hashing: FNV-1a 32-bit of "<group>|<key>" through the murmur3 finaliser,
//       masked to D = 2^16 buckets (robustness run D' = 2^10). Every feature
//       GROUP (block) is L2-normalised to unit norm per token (collisions add
//       before normalising); an arm is the union of its groups, so an arm with
//       more features is not advantaged by scale. Active-feature counts reported.
//   D4  EXPOSURE Q (regime E1). Q_0 = the unlabelled identities of the capped
//       train sentences. CAUSAL features of token i use Q at the moment before
//       token i is read: Q_0 + every earlier evaluation sentence + the earlier
//       tokens of the token's own sentence (token-wise ledger; a type's right
//       company accrues as later tokens are read; s_final accrues when the
//       sentence ends). NON-CAUSAL features (labelled lookahead) use Q_0 + the
//       whole evaluation stream MINUS the token's own sentence (so the exposure
//       statistics of a neighbour never contain the centre). TRAIN-split tokens
//       (the learner's examples) use the jackknife: Q_0 minus the token's own
//       sentence, plus (causal arms) the earlier tokens of that sentence, so the
//       exposure statistics at training and at test have the same distribution.
//   D5  COMP-TYPE offsets are recorded up to typeH = 4 (declared cap); higher h
//       is truncated to 4 in COMP-TYPE only.
//   D6  Induction (company-induce.mjs, doc 2.4 made concrete). V_ind = identities
//       with >= ARRIVALS_FLOOR = 2 occurrences in Q_0. Positive PMI (plain: no
//       smoothing, no shift) of each v in V_ind against context identities in
//       V_ind at offsets {-2,-1,+1,+2}; randomised SVD (oversample 10, 2 power
//       iterations, Gaussian test matrix, seeded) to rank min(128, |V_ind|-1);
//       embedding U S^(1/2), rows L2-normalised AFTER truncation to d = K
//       columns; spherical k-means with k-means++ seeding (cosine), at most 20
//       iterations in the stability runs and 50 in the final run. K* = the
//       largest K in {2,4,8,16,32,64,128} (K <= floor(common vocabulary / 4))
//       whose split-half ARI (two disjoint halves of the Q_0 sentences, seeded;
//       identities present in both) exceeds the 95th percentile of the same ARI
//       over 20 within-sentence shuffles of the two halves; d = K*; none ->
//       K* = 1 and a typed gap (counted, X company arms unavailable). The
//       occurrence-level class of a token is the nearest centroid to the
//       fold-in of its window: e = r V S^(-1/2), r[c] = max(0, ln(Npairs /
//       (nctx * cnt(c)))) over the nctx in-window context identities in V_ind,
//       L2-normalised (causal: offsets -2,-1; non-causal: -2..+2 with the
//       centre masked). A type's class is its centroid class (V_ind) else its
//       occurrence-level class. All class identifiers are within-language.
//   D7  Type descriptor delta(w;Q) = [ln(1+n_w), D_L, D_R, H_L, H_R, s_init,
//       s_final]: D_L (D_R) = distinct real left (right) neighbour identities at
//       offset 1 / n_w (sentinels excluded); H_L (H_R) = entropy of the offset-1
//       neighbour-CLASS distribution over the K*+1 bins (K* classes + "other")
//       / ln(K*+1); s_init (s_final) = share of occurrences opening (closing) a
//       sentence. Unseen type: all zero. z-scored per component with the mean
//       and sd over V_ind at Q_0 (unsupervised, frozen for the whole run).
//       Class descriptor delta_bar(c) = [token-mass-weighted mean of the
//       z-scored delta over the types of class c (7), ln(token share of c),
//       ln(type count of c)] (9 dims); the mass is the live exposure count.
//   D8  X dense layouts. BANDS = [1],[2],[3-4],[5-8],[9+]. COMP-OCC-X: per side
//       (L; plus R when non-causal) and per band: mean class descriptor of the
//       neighbours in the band (9) + masked flag (1) (the band lies beyond h);
//       per side the mean own delta of the in-window neighbours (7); the
//       centre's occurrence-level class descriptor (9); mean and max class-
//       bigram surprisal over adjacent in-window neighbour pairs, centre
//       excluded (2); the centre-class-missing flag (1). 69 dims causal, 126
//       non-causal. COMP-SENT-X adds [i=1], [i=n] (non-causal), and the
//       sentence-start (and end) surprisal -log2 P(class of the first (last)
//       token | boundary). BAG-X: mean class descriptor of the others (9),
//       class entropy (1), missing share (1). COMP-W-X: self frame left and
//       right (mean class descriptor 9 + entropy 1 each), then per dyadic frame
//       band (-1, -2..-3, -4..-7, ...; +1, +2..+3, ...) mean class descriptor
//       (9) + entropy (1) + masked flag (1). TYPE-D-X: per side and band the
//       mean class descriptor of the type's aggregated neighbour classes (9)
//       + masked flag (1). LEXD: the 7 z-scored delta of the centre. FREQ-X:
//       [ln(1+n_w), frequency-rank percentile, n_w = 0]. POS-X causal [i,
//       ln i, i=1]; non-causal adds [n-i+1, i/n, n, i=n]. FORM-X: length, ln
//       length, script one-hot (10 Unicode script classes), digit flags,
//       capitalisation flags, internal hyphen/apostrophe flags, distinct-
//       character ratio, ln(1+#types of Q_0 sharing each of the 1,2,3-char
//       suffixes and 1,2-char prefixes). FORM-IND (the induced form classes of
//       doc 2.4 that give FORM equal footing in X) is NOT built here; it belongs
//       to form.mjs, and every X company-versus-form number from this module is
//       labelled "FORM-X shape only" (a limit, reported). Every dense column is
//       standardised per language by the mean and sd of that language's own
//       capped, unlabelled train features, identically for every arm.
//   D9  X training cap (compute): the pooled cross-family learner trains on a
//       seeded uniform subsample of X_TRAIN_PER_LANGUAGE = 2,000 labelled tokens
//       per training language (a full pooled 20,000 x 38 = 760k-token full-batch
//       fit is infeasible in plain JavaScript); exposure, induction and
//       standardisation still use the full N_cap forms. Equal for every arm.
//       This is a DECLARED DEVIATION from "the capped train splits of every
//       language outside the fold"; it is reported wherever X appears.
//   D10 Smoke tune/eval split. DEV is split by a seeded permutation of its
//       sentences into dev-A (lambda selection) and dev-B (smoke evaluation), so
//       that selection and evaluation never share tokens. The real run selects
//       lambda on dev and evaluates on test (doc 3.2); this module never reads
//       test. Smoke numbers carry no verdict about the law.
//   D11 Seeds: sha256 over (khora-law-v2, ...parts joined by NUL); the first 32
//       bits seed a mulberry32 stream. Every random act (cap sample, split,
//       padding, shuffle, scramble, bootstrap, permutation, k-means, SVD test
//       matrix, MLP init and batch order) has its own purpose string.
//
// 4. THE LEARNER FAMILY AND THE ONE TUNING BUDGET (doc 2.8; company-learner.mjs)
//   L1 multinomial logistic regression, objective mean cross-entropy + (lambda/2)
//   ||W||^2 (bias unpenalised), deterministic full-batch L-BFGS (memory 10,
//   Armijo backtracking, curvature-skipped updates), initial weights 0, stop at
//   relative gradient norm ||g||/||g_0|| <= 1e-6 or 500 iterations (a stall guard
//   stops when the objective change is below 1e-12 relative; the problem is
//   strictly convex, so warm starts along the lambda path change speed, not the
//   optimum). L2 one hidden layer of 64 ReLU units, same objective with weight
//   decay lambda added to the gradient (coupled), Adam (lr 1e-3, betas 0.9 and
//   0.999, eps 1e-8), batch 256, 30 epochs, seeded init and batch order. First-
//   layer weights ~ N(0, 2/E||x||^2) (He with the effective fan-in the mean
//   squared input norm), second layer Glorot normal, biases 0. For hashed sparse
//   inputs the first layer uses row-sparse Adam (moments and weight decay of a
//   row move only in steps where its feature is active: the LazyAdam
//   convention); for dense inputs every row is active in every batch so the
//   update is exactly Adam. One implementation, identical for every arm.
//   Budget: exactly lambda in {1e-4,1e-3,1e-2,1e-1,1,10}, selected by mean
//   cross-entropy on the tune set (W: the language's own; X: the pooled tune
//   sets of the training-fold languages), nothing else. Probabilities floored
//   at 1e-4 and renormalised. A claim is robust only if L1 and L2 agree.
//
// 5. NULLS AND CONTROLS BUILT TO FAIL (owned by this module; doc 2.10(7), G1, G3)
//   N1 label permutation of the test labels (G > 0).
//   N2 within-sentence shuffle of the TEST stream (company destroyed, marginals
//      kept; gold carried by tokens): G(COMP-OCC) must fall to <= SESOI. Valid
//      because COMP-OCC carries no type vector and no own descriptor.
//   N3 learner null: train on label-permuted TRAIN data; G on real held-out
//      tokens must be <= epsilon_noise (smoke floor 0.01 bits, section 7).
//   C1 centre-swap invariance: the feature vector of the token at i is invariant
//      when the centre identity is replaced by another (window, exposure and
//      position fixed) for COMP-OCC, COMP-SENT, COMP-W, in W and X; it MUST FAIL
//      for FORM, FREQ, LEXD and COMP-TYPE (built to fail on a leak).
//   C2 COMP-OCC contains no sentinel key and no boundary indicator.
//   C3 causal conformance: every arm labelled causal has hash-identical features
//      when all sentences after the current one are replaced by other sentences.
//   C4 gold-free: feature hashes are identical under a permutation of the gold.
//   C5 COMP-NATIVE equals createCompanyIndex().vectors byte for byte.
//   C6 exposure ledger: observeSentence then unobserveSentence restores every
//      count and descriptor (to 1e-9).
//   C7 planted toys (a small mirror of appendix A, G0): CO-TAB(h) and CO-ADD(h)
//      for h in {1,2,4} must be detected by COMP-OCC at >= theta = 0.8 of the
//      oracle ceiling (finite-sample Bayes lookup on the generating variables)
//      with learner L1 for CO-ADD and h=1, and the result reported for L2 on the
//      table generators; FO-LEX (company i.i.d.) and PO (position classes) must
//      be REJECTED (G <= epsilon floor); CO-PAR(2) detection is expected to FAIL
//      (the document's documented-failing assertion); within-sentence shuffle
//      collapses COMP-OCC on CO-TAB; collision D separates exact determination,
//      10 percent noise and FO. A planted result that falls short is reported as
//      "instrument underpowered at that cell", never repaired by retuning.
//   C8 learner: finite-difference gradient checks (L1, L2), byte-identical
//      reruns, agreement with an independent numpy solution of the same L1
//      objective on one smoke problem (objective within 1e-6 relative).
//
// 6. PASS RULES FOR THE STATISTICS THIS MODULE FEEDS (the verdict module decides)
//   Per doc 5 and 2.10: T1(i) unit PASS iff the lower one-sided 95 percent bound
//   of S(COMP-OCC given FREQ+POS) exceeds SESOI (causal arm primary); T1(ii) iff
//   G(COMP-OCC) - G(FORM) >= -SESOI on H0 and on H1 (W only); T4 iff
//   S(COMP-OCC given FREQ+POS; H1) > SESOI and the name-ness AUROC lower bound
//   exceeds 0.5 + SESOI_AUC; T9/T1 shuffle control iff G(COMP-OCC; shuffled) <=
//   SESOI. SESOI, n_min, k_N and epsilon_noise are DERIVED by the gates (G2), not
//   typed here; on DEV smoke the module reports "lower bound > 0" and labels it
//   so, and reports L1 and L2 side by side.
//
// 7. MODULE ACCEPTANCE (smoke; none of these is a verdict about the law)
//   The module is accepted on DEV iff all of: C1 to C6 and C8 pass exactly as
//   stated in section 5; the learner null of N3 gives G <= 0.01 bits in every
//   smoke language; C7 cells that are stated as "must be detected/rejected" are
//   met, and every cell that is not met is reported as a typed instrument gap
//   with its numbers. The 0.01-bit floor is a smoke acceptance threshold only;
//   the claim-level floor is the derived epsilon_noise of gate G2.
//
// 8. PREDICTIONS RECORDED AHEAD OF DATA (scored for calibration; a miss is a miss)
//   Smoke languages: eng (analytic, Latin), tur (agglutinative), cmn-hans
//   (unspaced Han, gold segmentation disclosed), plus one X fold (tur held out;
//   eng spa rus fin heb cmn-hans ind training).
//   P1 (0.95) D1 = S(COMP-OCC given FREQ+POS) > 0 with the bootstrap interval
//      excluding 0, causal h=2, L1, in every smoke language.
//   P2 (0.85) G(FORM) > G(COMP-OCC) on all tokens in every smoke language (the
//      lexicon is a stored company, T1(ii)(a) predicted to fail).
//   P3 (0.55 per language) G(COMP-OCC) >= G(FORM) on H0 first-sight tokens.
//   P4 (0.90) the within-sentence shuffle of the dev-B stream reduces G(COMP-OCC)
//      to under 25 percent of its real value.
//   P5 (0.95) learner null G <= 0.01 bits for every arm and language.
//   P6 (0.80) G(COMP-OCC; h) rises from h=1 to h=2 and the gain from h=4 to h=8
//      is below the gain from h=1 to h=2.
//   P7 (0.95) non-causal G(COMP-OCC) > causal G(COMP-OCC) in every language.
//   P8 (0.80) C7: CO-ADD(h) for h in {1,2,4} detected at >= 0.8 oracle by L1.
//   P9 (0.60) C7: CO-TAB(1) detected by L1; (0.35) CO-TAB(2) and CO-TAB(4) detected
//      by L2 at 20,000 tokens (identity features; the instrument may be
//      underpowered here, and that is a finding about the gate, not the law).
//   P10 (0.95) FO-LEX and PO rejected by COMP-OCC; PO detected by POS.
//   P11 (0.70) X fold: G(COMP-OCC-X) > G(FREQ+POS-X) on the held-out family.
//
// 9. WHAT WOULD COUNT AS THE MODULE BEING WRONG
//   Any C-check failing, a feature that moves when the gold is permuted, a causal
//   feature that moves when the future moves, COMP-OCC that moves when the centre
//   is swapped, FO-LEX or PO detected by COMP-OCC, a rerun that is not
//   byte-identical, or an L1 optimum that disagrees with the independent numpy
//   solution. Each is reported as a failure of this instrument.
//
// BUG LOG (append only; entries: date, what, found by, effect on any run)
//   (none)

// @@CODE-BEGINS@@
