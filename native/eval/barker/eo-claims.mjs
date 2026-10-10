// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══  eval/barker/eo-claims.mjs
// Written 2026-10-05, BEFORE the first run of any statistic in this file. Consistent with docs/BARKER.md
// (sections 6, 6.0a, 6.1-6.5, 6.8, 6.9, 8.2, 8.3, 9, 10, 11), which is authoritative; where this header
// states an operational choice BARKER.md leaves open, the choice is listed in "OPERATIONAL CHOICES" and
// is registered here, once, before any run. Nothing below was tuned after a result.
//
// WHAT THIS FILE IS. The EO FALSIFICATION BATTERY (BARKER.md section 6): one exported test function per
// testable claim of the claim registry (EO-1..EO-4), the competing structures, the controls built to fail,
// the power trios, and honest typed gaps for the claims that cannot be tested yet. Barker-in-khora wrote
// every falsifier; none is attributed to FoA (Barker et al. 2024), which does not name EO.
//
// RULES THAT BIND IT (READING-SPEC / FOLD-CONSTITUTION / EO constitution)
//   * ZERO MODEL: no LLM, no learned vector model, no network, no model-derived label anywhere in this file.
//   * INDEPENDENT GOLD: UD treebank annotation, VerbNet 3 (class numbering and FRAMES), real parsers.
//     EO's own instruments are the SYSTEM UNDER TEST and are touched ONLY inside the functions named
//     underTest* (kernel/cube.js CELL_OF_GRAMMAR; the ActPrior@1 file). The competence cards are SUT
//     outputs read for EO-4's structural claim, never gold for anything else.
//   * EVERY CLAIM: a steelman first (EO's own words, file and section); a control built to FAIL; a power
//     TRIO (planted 2s, 0.5s, 0.1s at ten times n) run BEFORE any real-data statistic; a test whose power
//     card fails is NOT run on real data (UNDERPOWERED, statistic withheld: no peek).
//   * A failure of a control is INSTRUMENT_FAILED. An interval that straddles the SESOI is UNDERPOWERED,
//     never "not falsified". Gaps are results (typed, with denominators).
//   * No edits to existing source; no commits; competence cards, priors and treebanks are read-only.
//
// SPLITS (operational choice 1). --split dev  : the held-out gold is ud-eval/<stem>/dev.conllu (and the
//   competence cards <rung>-<stem>-dev.json). --split test : ud-eval/<stem>/test.conllu (and -test cards).
//   Fitting data is always tb/<stem>/train.conllu. The DEV split is the exploratory/smoke split: this file
//   was developed and smoked on DEV only. The TEST split is the one-shot confirmatory run and is refused
//   unless PREREG.lock.json exists (written by run.mjs --freeze, which refuses unsigned SESOI rows) AND
//   --confirm-test is passed. In dev runs no test.conllu / *-test.json path is ever opened (static test).
//   BARKER.md 6.2 says EO-1 scores on DEV+TEST tokens; the task's dev/test discipline overrides it: the
//   two splits are scored separately, never pooled. EXCEPTION for EO-2 ONLY (operational choice 16, below): its development data are the TRAIN
//   treebank files tb/<stem>/train.conllu and its confirmatory data are ud-eval/<stem>/dev.conllu plus test.conllu (the table has no fitted
//   parameter, so any non-test data are valid for developing the analysis, and the confirmatory run needs the larger sample).
//
// ───────────────────────── COMMON DEFINITIONS ─────────────────────────
// alpha 0.05 (= adapters/text/keyness.js KEY_ALPHA, asserted). SEED 20261005, mixed with test id and purpose
// by kernel/rng.js seedFrom. Null draws 9,999 (EO-1 N1/N1b/N1c; EO-2 joint draws); bootstrap B = 2,000
// (lemma clusters in EO-1, lineage clusters in EO-2..4); equalisation downsamples 200. Holm family = the
// battery's nine primary p-values [S1b, S1c, S2, O1H1, O1H2, O2H1, O2H2, EO3r1, EO3r2]; a slot not run in a
// given invocation is p = 1 (conservative, deterministic).
// SESOI registry (BARKER.md 6.0a; PROVISIONAL until signed, signedBy is EMPTY here by construction):
//   EO-1 S1 0.02 bits per held-out verb token | S2 0.06 share of centroid variance | S3 capture ratio 1/3
//   EO-1 rivals 0.02 bits | EO-2 0.05 (Gamma - 0.5) | EO-3 0.01 bits per character | EO-4 0.05 (CR gap).
//   Sensitivity at half and double each SESOI is PRINTED, never selected from.
// VERDICT FUNCTION (one for the whole battery; BARKER.md 6.0 table), components:
//   P_up   power card: planted 2s, real-n pipeline gives theta interval LOWER bound > s at rate >= 0.8.
//   P_down power card: planted 0.5s gives interval UPPER bound < s at rate >= 0.8.
//   tiny   planted 0.1s at 10x n must NOT reach SURVIVES: observed rate not rejected as <= alpha by the exact
//          one-sided binomial test at 0.05 (rejected iff P(X >= k | R, alpha) < 0.05).
//   C      every control built to fail failed.      N  observed beats its null (Holm over the battery).
//   M      interval lower bound of theta > s.       A  every must-beat rival is beaten by > s; every null's
//          95th percentile is cleared by s.         F  lineage sign gate (reachability table; not Holm).
//   I      >= 2 channels with distinct givers agree where more than one exists.
//   B      the bridge is licensed (a defender-signed eoSentence exists).   K  the headline rows are unconsumed.
//   INSTRUMENT_FAILED = not C (or a calibration failed).
//   UNDERPOWERED     = power gate failed (statistic withheld), or the interval straddles s, or P_up fails when
//                      the interval would pass, or P_down fails when it would refute, or reachability fails.
//   REFUTED          = P_down and C and interval UPPER bound < s and B (an unlicensed bridge cannot refute).
//   WEAKENED         = M holds but not A, or not F, or not I; or (unlicensed bridge) the proxy failed.
//   SURVIVES         = P_up, C, N, M, A, F, I, B, K all hold ("this test": survival is not confirmation).
//   NOT_TESTABLE_NOW = a typed gap naming the exact missing data.
//   Without a licensing eoSentence REFUTED is unavailable (a failure prints WEAKENED, bridge: failed; a pass
//   prints SURVIVES, bridge: unlicensed) and the result is excluded from the headline. There is NO aggregate
//   EO score. Tests whose recorded probability lies outside [0.10, 0.90] are near-foregone calibrations and
//   do not enter the headline tally.
//
// ───────────────────────── EO-1: THE NINE-ACT TABLE ─────────────────────────
// CLAIM (the-fold/relation-kinds.js header; ActPrior@1; THE-27-CELLS s1; THE-THREE-MATHEMATICS sI, sV): a verb's
//   semantics performs one of nine acts; the table (VerbNet class -> act, declared) partitions verb classes.
// STEELMAN: not that verbs are "about" operators, but that the PARTITION of VerbNet classes into the table's
//   groups carries behavioural information that a grouping respecting Levin neighbourhoods alone does not, and
//   that the 3x3 (mode x domain) arrangement is not arbitrary. Concession from EO's own file: grain is absent
//   at this level; REC "enters only through alt readings" (a real absence).
// BEARING: DIRECT on the partition, PROXY on "closed universe". Default eoSentence is the architect-proposed README
//   line; licensed:false until the EO defender confirms it (B6), so REFUTED is unavailable until then.
// DATA. Fit: tb/eng/train.conllu (UD_English-EWT). Held-out gold: ud-eval/eng/<split>.conllu. Independent giver of
//   nulls and the Peirce rival: VerbNet 3 (nltk_data/corpora/verbnet3: class ids, top-level FRAMES). SUT: ActPrior@1.
//   class -> act is recovered from the act prior's own candidate lists (325 classes, a class never maps to two acts,
//   8 non-empty acts, REC empty: the table is a partition of 325 classes into K_EO = 8 groups).
// UNITS (one rule for the real mapping and every null mapping). Universe: VERB lemmas (UPOS VERB, lowercased lemma)
//   that appear in ActPrior.forms. A lemma's PRIMARY CLASS is classes[0] of its unanimous entry or of its first
//   candidate (the file's own order); the lemma's act under ANY mapping is mapping[primaryClass]. SCORING UNITS are
//   universe lemmas with >= 5 tokens in the held-out split file (PROVISIONAL; half/double printed). The unit set is
//   the same across all draws. Folds: 5, by hash of (lemma, SEED) over the WHOLE universe; centroids are fitted on
//   TRAIN tokens of universe lemmas outside the fold; scoring is on held-out-split tokens of scoring units in the
//   fold (lemma and sentence both held out).
// BEHAVIOUR (one symbol per block per token, four blocks, weight 1/4 each):
//   b1 frame: sorted multiset of dependents' deprel (exact if in {nsubj, nsubj:pass, obj, iobj, obl, ccomp, xcomp,
//      advcl, csubj, expl, compound:prt}, else its base before ':' if that is in the set, else ignored); the 32 most
//      frequent frames over ALL train VERB tokens plus "other"; empty frame is its own symbol.
//   b2 voice/finiteness: (VerbForm, Voice, Mood) values from FEATS ('_' absent).
//   b3 tense-polarity company: (Tense, neg, aux) where neg = Polarity=Neg on the verb or on a dependent, aux = a
//      dependent with deprel aux or aux:pass.
//   b4 oblique marker: lemma (lowercased) of the `case` dependent of the verb's leftmost obl dependent; 20 most
//      frequent over train plus "other"; "none-obl" if no obl dependent; "none-case" if the obl has no case child.
// CENTROIDS: per group and block, p_g(s) = (c_gs + p_0(s)) / (N_g + 1) where p_0 is the fold's global block
//   distribution p_0(s) = (c_s + 1/V) / (N + 1) (one pseudo-token; PROVISIONAL, half/double printed).
// STATISTIC: lemma-weighted held-out cross-entropy, bits per token: ce_l(M) = mean over l's tokens of the block-average
//   of -log2 p; G(M) = mean over scoring lemmas of [ce_l(global) - ce_l(M)]. Comparisons are at EQUAL k = K_EO = 8
//   (BARKER.md says nine; REC has no classes, so the realised k is 8; rivals of other k are coarsened to 8 by
//   TRAIN-ONLY agglomeration: merge the pair whose merger least raises train code length). Native-k CE is printed
//   and never used in a verdict. There is no parameter-count penalty anywhere.
// S1. NULLS (9,999 draws each, all keep K = 8 groups): N1 plain redeal of class->act keeping class counts per act (a
//   CALIBRATION, near-foregone: a nine-range Levin table must pass it); N1b acts permuted only among the classes of the
//   SAME Levin major group (integer prefix of the class number; 102 groups on disk, BARKER.md's "about 57" is wrong);
//   N1c 8 contiguous blocks of the class list in Levin order, draws alternating family A (EO's group-size profile in
//   random block order) and family B (random cut points). theta_S1 = G_EO - max(median G|N1b, median G|N1c); p_b, p_c =
//   share of draws with G >= G_EO (with +1). CI: lemma-cluster bootstrap (B=2,000) of theta with the null medians
//   recomputed from the per-lemma contributions of null draws 1..999 (declared shortcut; p-values use all 9,999).
//   N: p_b and p_c both <= their Holm-adjusted alpha. M: bootstrap lower bound of theta_S1 > 0.02.
//   A (must-beat P3, role registry): Peirce valence = modal number of NP elements in the class's top-level VerbNet frames
//   (ties to the smaller), clipped to {1, 2, 3+}; EO coarsened to 3 by train-only agglomeration; EO beats P3 iff the
//   paired lemma-bootstrap lower bound of CE(P3) - CE(EO3) > 0.02. EO's own mode-3 and domain-3 groupings are printed.
// S2. For the 8 measured acts, centroid vector V = the four blocks' log2-probabilities concatenated. Additive model
//   V_(m,d) = mu + alpha_m + beta_d fitted by least squares on TRAIN centroids over the measured cells (5 parameters per
//   coordinate, 8 cells); NA = held-out residual sum of squares (held-out act centroids minus the train-fitted additive
//   prediction) / total held-out variance of the centroids, accumulated over the 5 folds. EO's arrangement is the
//   (mode, domain) of cube.js. N2: every injective placement of the 8 acts into the 9 cells, ENUMERATED EXACTLY (362,880);
//   p2 = share with NA <= NA_EO. theta_S2 = median over placements of NA - NA_EO; SESOI 0.06; CI by lemma bootstrap with
//   the median over 500 fixed random placements (declared shortcut). N: p2 <= Holm alpha. M: lower bound > 0.06.
// S3. Ward-type agglomeration (merge cost = rise in train code length) of the classes with train data, per fold; held-out
//   CE(k) for k = 2..40 at equal k; k* by the 1-SE rule; knee by two-segment piecewise-linear fit of CE(k) with a
//   lemma-bootstrap interval; capture ratio r = (CE_global - CE_EO)/(CE_global - CE_D9) where D9 is the data-driven
//   8-partition (reference). r defined only when G(D9) >= 0.02 bits; WEAKENED iff r's interval upper bound < 1/3.
//   A missing knee at 8-9 is printed and cannot by itself refute.
// ROLES (RIVAL_REGISTRY, exactly one each): N1 null(calibration) | N1b null | N1c null | P3 must-beat | D9 reference |
//   L9 reference | LN, V311 reference (native k, printed only).
// CONTROLS BUILT TO FAIL (INSTRUMENT_FAILED if any survives): (i) class->act by the first letter of the class name
//   (8 contiguous alphabet buckets, balanced class counts): S1 must read no gain (N not met); (ii) behaviour vectors
//   permuted across lemmas (class labels kept, behaviour detached): S1 and S2 must read nothing; (iii) a table built from 8
//   contiguous Levin ranges with NO EO input must PASS plain N1 and must NOT beat N1b or N1c at more than alpha;
//   (iv) EO's own acts redealt within major groups (100 extra N1b draws, scored against the N1b null): the rate of p_b <=
//   alpha must not be rejected as > alpha by the exact binomial rule.
// POWER TRIO (before real data): synthetic lemma behaviours on the REAL units, class sizes and token counts: a hierarchical
//   log-ratio model (major group + class + lemma Gaussian components, variances matched label-free to three real gains: Levin
//   major group native k, native VerbNet class, lemma-own), plus a planted group effect gamma along EO's own partition
//   (class-coherent), gamma calibrated so that E[theta] = 2s, 0.5s, 0; the 0.1s world at 10x token counts. R_power = 40
//   replicates, D_power = 499 draws, B_power = 500. A world with class locality and NO group component must not pass N1b
//   or N1c at more than alpha. Likewise planted additive 3x3 organisation for S2 and planted capture ratio for S3.
// RECORDED PROBABILITIES (BARKER.md 10.1): plain N1 passes 0.97 (near-foregone); S1 survives 0.25; S2 survives 0.12;
//   r >= 1/3 0.45; knee within CI of 9 0.20.
//
// ───────────────────────── EO-2: THE CUBE AS GRAMMAR ─────────────────────────
// CLAIM (kernel/cube.js CELL_OF_GRAMMAR, "declared, revisable theory", derived from Ancient Greek endings): a language's
//   Case/Person/Number/VerbForm/Mood/Voice/Tense/Aspect values are cells worn by its surfaces; "The mapping is the theory;
//   the priors are its measurement". STEELMAN: a table fitted to three ancient inflectional languages TRANSFERS: in a
//   language that did not derive it, values at the SAME grain are more alike than values at DIFFERENT grains, within a
//   feature (so feature identity cannot explain it). BRIDGE: cube.js says the cells come from word-final ENDINGS; it does
//   NOT say role profiles are similar within a grain. O1 (role profiles) is therefore PROXY-BRIDGE (Barker's auxiliary
//   hypothesis: a failure refutes the conjunction); O2 (endings, the builders' own endingLength 2) is PROXY. Both must pass.
// DOCUMENT AUDIT (no data): cube.js header prose and the table disagree in at least four places (Person is SIG/INS in the table
//   vs the header's Lens; Mood-Imp NUL; Tense-Pres EVA-Figure vs the header's Paradigm; Aspect to NUL/INS/SIG). The TABLE is what
//   the code uses and is tested; if the defender names the header reading, the defender supplies the mapping (P7).
// CONSUMED LANGUAGES: grc, lat, san (derivation; no tb/ dir), rus (case-marking-rus.json was built through the table), ell (near).
//   The headline uses UNCONSUMED languages only; consumed rows are computed and printed apart. The grammar table is locked by
//   cellOfGrammarSha (sha256 of the sorted-key JSON of CELL_OF_GRAMMAR).
// DATA: every language with the split's files (dev: tb/<stem>/train.conllu; test: ud-eval/<stem>/dev.conllu and test.conllu); a stem without a typed lineage key is a typed gap.
//   Genealogy (answer key only, never a feature): typed lineage and branch table LANG_KEYS (Glottolog top-level family).
//   Profiles are estimated on the development files (EO-2 dev = tb/<stem>/train.conllu; test = ud-eval dev+test: operational choice 16); the
//   data-driven reference DD learns on the OTHER languages' files of the SAME split.
// VALUES: a token carries value v of feature F iff FEATS has F=v with a single value (comma-multivalues skipped) and its UPOS
//   is in the feature's content class: Case (nominal: NOUN PROPN ADJ PRON NUM DET); VerbForm Mood Voice Tense Aspect (verbal:
//   VERB AUX); Person, Number (both). Only values of CELL_OF_GRAMMAR count. A value is PRESENT iff >= 100 tokens (floor,
//   PROVISIONAL; derive later from the Wilson half-width at the SESOI).
// PROFILES: O1 rho_v = distribution over the incoming-arc deprel BASE (before ':') of v's tokens. O2 eps_v = distribution
//   of the WORD-FINAL 2 characters (lowercase NFC, letters only) over the language's 50 commonest endings plus "other".
//   O2 is a typed gap for cmn, cmn-hans, vie, ind, jpn, kor (isolating or non-alphabetic; BARKER.md 6.3).
// DISTANCE: d = JSD base 2 of COUNT-EQUALISED profiles: for each 3-subset of present values, every value is downsampled
//   WITHOUT replacement to n_min = the smallest count among the three (>= the 100 floor) before profiles are formed, d
//   averaged over 200 downsamples (50 in power replicates, declared). Un-equalised Gamma is printed beside to show the
//   artefact size.
// TRIPLES. A triple (u,v | w) has grain(u) = grain(v) != grain(w). Computed from the table: 47 triples over 7 features, 36
//   Case (oblique-only 16, mixed 20, core-only 0); Number has none. Core cases = {Nom, Acc}. Triple score (symmetric; operational
//   choice 2): s = 0.5*(1[d(u,v) < d(u,w)] + 1[d(u,v) < d(v,w)]) with ties 0.5; chance 0.5. Gamma_{L,F} = mean over F's triples;
//   Gamma_L(stratum) = mean over features (feature-weighted). STRATA: H1 non-Case (Person, VerbForm, Mood, Voice, Tense, Aspect),
//   H2 Case-oblique-only; Case-all and Case-mixed printed. A language is INCLUDED iff it has >= 3 INDEPENDENT CONTRASTS in total (distinct same-grain pairs, counted over all
//   features, as BARKER.md 6.3 words it) and contributes to a stratum iff that stratum holds >= 1 of its triples (operational choice 3 as REVISED by choice 19), else a typed gap.
// STATISTIC: theta = Gamma - 0.5 after equalisation, nested mean (languages in a branch, branches in a lineage) over UNCONSUMED
//   languages. NULL: within each (L,F) the grain labels permuted over the PRESENT values preserving the multiset (exact
//   enumeration; labelings are then drawn jointly across features and languages, 9,999 draws, or exhaustively if fewer than
//   20,000 joint labelings); lineage h_l = 1 iff theta_l > median(null_l); pooled p = share of joint draws with pooled mean >=
//   observed. M: lineage-cluster bootstrap (B=2,000) lower bound > 0.05. F: sign gate by reachability over the lineages for which
//   h_l is DEFINED (planted power at that lineage's own inventory >= 0.8 at 2s; decided by the power card BEFORE real data).
// ROLES: G-null null | BL must-beat (Case only; rank Nom 1, Acc 2, Gen 3, Dat 4, Loc/Ins/Abl 5, Voc unranked) | CO must-beat
//   (Case only; core vs oblique) | TR must-beat (Person only) NOT RUN (no received operational mapping: BARKER.md's own rule) |
//   FR must-beat (frequency-rank grains: contiguous frequency-rank blocks with the table's block sizes; mean over the distinct
//   block orders, max printed) | DD reference (within-feature 3-partition by average-linkage on the other languages' mean JSD
//   matrix; leave-one-language-out, lineage-out as the stricter) | UDI reference.
//   Rival scoring (operational choice 4): on EO's own triples, a rival R names the pair it predicts closest (BL: smallest rank gap;
//   CO, DD, FR: the unique same-group pair) or NO prediction (score 0.5); score_R = the same symmetric triple functional of
//   its predicted pair. EO beats a rival iff the paired lineage-cluster bootstrap lower bound of score_EO - score_R > 0.05.
//   Capture ratio r2 = (Gamma_EO - 0.5)/(Gamma_DD - 0.5); WEAKENED iff its interval upper bound < 1/3.
// CONTROLS BUILT TO FAIL: (c1) grains by the alphabetical order of value names; (c2) grains permuted across features; both
//   must read pooled theta interval upper bound < 0.05; (c4) a PLANTED ARTEFACT language: profiles identical across values, token
//   counts unequal like the real feature: Gamma must read 0.5 after equalisation (interval upper bound of theta < 0.05) and exceed
//   it BEFORE (the artefact exists and the fix removes it).
// POWER TRIO: synthetic languages on the REAL per-language triple sets and token counts; value profile = base-distribution tilted
//   by a grain-shared random vector (strength lambda) and a value-specific noise (epsilon in {0.1, 0.3, 0.5}); lambda calibrated
//   so E[Gamma-0.5] = 2s = 0.10, 0.5s = 0.025, 0; 0.1s at 10x counts; run separately for H1, H2 and each of O1 and O2.
//   R_power = 20 per cell, D_power = 999 joint draws, 50 downsamples. The card prints per language the independent contrasts and the
//   minimum attainable permutation p.
// RECORDED PROBABILITIES (BARKER.md 10.1): non-Case testable at power 0.8 : 0.35; Case O1 beats null by SESOI : 0.40; EO-2
//   SURVIVES (all of the above) : 0.08; UNDERPOWERED overall : 0.55.
//
// ───────────────────────── EO-3: THE DIFFERENCE LADDER (near-foregone calibration) ─────────────────────────
// CLAIM/STEELMAN (THE-THREE-MATHEMATICS sIII; THE-WHEEL item 3): grains are three orders of difference: constant, value, rate;
//   higher orders are the same Pattern act iterated, so "exactly three and no fourth" is NOT a claim a ladder of models can refute.
//   Testable: the weak form (rungs 1 and 2 are non-trivial in real sequences). BEARING: PROXY-WEAK. Verdict vocabulary: "rungs 1 and 2
//   hold / do not hold"; no REFUTED/SURVIVES is printed for "three".
// MODELS (character stream; fit on the first 300,000 characters of tb/<stem>/train.conllu `# text` lines [PROVISIONAL], scored on the
//   split file's `# text` lines): M0 static unigram; M1 interpolated (Witten-Bell) context model, order k <= 6 chosen on a train
//   validation slice; M2 = M1 + one decayed cache mixed online (decay and weight chosen on the validation slice); M3 = M2 + a second cache
//   of a different timescale; M4 = M3 + a sentence-level cache (reset at each sentence). Delta_k = L(M_{k-1}) - L(M_k) in bits/char;
//   paired block bootstrap (blocks of 200 characters; B=2,000).
// PRE-REGISTERED READOUT: pooled (lineage-nested) lower bound of Delta_1 and of Delta_2 exceeds the SESOI 0.01 bits per character with
//   the lineage sign gate; the saturation depth per system is DESCRIPTIVE and never compared with 3.
// CONTROLS: both train and held-out text permuted at the character level (marginals kept): Delta_1 and Delta_2 upper bounds < 0.01.
// POWER: planted K difference orders (K = 1..4 generators: Markov source; + topic at one timescale; + a second timescale; + a
//   sentence-level topic) at the real stream lengths: the instrument must read Delta_K lower bound > 0.01 and Delta_{K+1} not.
// RECORDED PROBABILITIES: Delta_1 > 0 : 0.99; Delta_2 > 0 : 0.90; Delta_3 > 0 : 0.70 (would not touch EO).
//
// ───────────────────────── EO-4: FLOORS AS A DEPENDENCY ORDER ─────────────────────────
// CLAIM (THE-CORE-MECHANISM; READING-SPEC S14): a floor can starve because the floor below did not individuate enough events; across
//   systems, outcomes on the ladder r1 < r2 < r3 < r4 form an implicational (Guttman) scale in floor order, failures cascading
//   UPWARD. STEELMAN: every adjacency of the chain is a presupposition. BEARING: PROXY (the cards are the SUT's outputs; the claim
//   tested is the structure of their ORDER, never their level). DATA: competence/r1..r4-<stem>-<split>.json `pass` in {true,false,null};
//   null is MISSING. r0 and r5 are not floors. STATISTIC: coefficient of reproducibility CR of the scalogram (Goodenough-Edwards
//   minimal flips to a 1..10..0 pattern) over languages with >= 3 non-missing rungs; EO's order against ALL 24 orders; theta = CR_EO -
//   mean CR of the other 23; null permutes each rung's column across languages (within script strata as the stratified arm).
//   SESOI 0.05 and EO's order must rank first of 24. POWER: Guttman-scaled synthetic matrices with 10% response error at the real
//   number of languages per rung; planted 2s and 0.5s above the permutation mean. EXPECTED: UNDERPOWERED (r4 has few cards).
// RECORDED PROBABILITIES: testable 0.15; survives if testable 0.40.
//
// ───────────────────────── CALIBRATIONS, CROSSWALK, GAPS ─────────────────────────
// K2 (cells from content) and K3 (company as act) are planted-analogue instruments run here; K6 (plain N1 vacuous) is EO-1 control
// (iii); K7 (count artefact) is EO-2 control (c4). K1, K4, K5 belong to the arch cards and the kind pipeline (induce.mjs, organs/barker.js)
// and are returned as typed `delegated` entries, never as passed. EO-5 and EO-6 are ON RECORD REFUTED (95.7 percent of cell assignments
// survived shuffling words inside 2,527 paragraphs; recurrence alone is not admission): calibrations, not re-litigated. EO-7..EO-10 are
// NOT_TESTABLE_NOW with the exact missing data (BARKER.md 6.9). EO-11, EO-12 are not run (no operational reading / an audit of code).
//
// ───────────────────────── OPERATIONAL CHOICES (registered once, here) ─────────────────────────
//  1 dev/test split semantics (above). 2 symmetric triple score. 3 >= 3 independent contrasts per language IN TOTAL (revised by 19). 4 rival scoring
//  on EO's own triples via a predicted closest pair. 5 EO-1 K = 8 (REC empty), Levin groups counted from disk (102). 6 centroid smoothing by
//  one pseudo-token. 7 Holm family of nine with unrun slots at p = 1. 8 bootstrap shortcuts for null medians (999 draws; 500 placements).
//  9 power replicate counts R_power = 40 / 20 / 8 / 200 for EO-1 / EO-2 / EO-3 / EO-4, with reduced draws as stated. 10 For EO-1 the sign
//  gate F is not applicable (one language, one lineage): any SURVIVES here is a statement about English EWT only and is labelled scope:
//  "english-ewt-only". 11 lineage/branch labels for languages that arrived after the design (dan nob est hun eus hye kat lav lit tam tel)
//  are typed by the implementer from Glottolog and are answer keys only.
//  12 (REGISTERED BEFORE ANY REAL-DATA STATISTIC; only planted toys had been run, and on them the as-first-written S2 returned NA values near 20, far
//  outside any share-of-variance reading, because a held-out centroid smoothed with its own small sample has a different floor from the train
//  centroid) The S2 held-out act centroid is the held-out MLE rescaled to the TRAIN centroid's effective sample size, V_H = log2((h * N_train/N_held + p0)
//  / (N_train + 1)), so a symbol absent from both gets the same floor in V_T and V_H. Nothing else in S2 changed.
//  13 (registered before any EO-2 code ran) EO-2's power gate is the card at noise epsilon = 0.3 (the middle registered value) for each of the four cells
//  (O1/O2 x H1/H2); epsilon 0.1 and 0.5 are printed as optimistic and pessimistic sensitivities, never selected from. The planted world carries the effect
//  in BOTH strata at once (H1 on non-Case features, H2 on Case), each calibrated separately, since the two statistics read disjoint features. A power card whose
//  planted target is unreachable (below the world's zero-effect baseline, or above what the maximum planted effect reaches) FAILS and says why.
//  14 (same) EO-2 OVERALL outcome from its four components: INSTRUMENT_FAILED if any control failed; else REFUTED if any component is REFUTED with a licensed bridge;
//  else WEAKENED if any component is WEAKENED or REFUTED-unlicensed; else UNDERPOWERED if any component is UNDERPOWERED; else SURVIVES (all four survive).
//  16 (registered 2026-10-05 AFTER the counts-only inventory (R2) of the ud-eval dev.conllu files and BEFORE any JSD, Gamma, profile or null statistic had been computed on real
//  data) What had been seen: on the 45 dev.conllu files only 6 languages (cat eng lav lit ron spa) have >= 3 independent H1 contrasts, all but one in Indo-European, and only 3 (eus hye tur)
//  have >= 3 H2 contrasts, so neither stratum could reach the 5-lineage reachability bar of 4.6 whatever the table does. Because the table has NO fitted parameter, any data that are not the
//  confirmatory data are valid for developing the analysis, so EO-2's DEVELOPMENT data are the TRAIN treebank files and its CONFIRMATORY data are ud-eval dev.conllu plus test.conllu (the
//  largest held-out sample available). Every other EO test keeps dev = ud-eval dev.conllu. No rule, floor, SESOI or stratum was changed by this.
//  17 (same) 8 stems that arrived after the design and have tb files get typed genealogy keys (afr cym gle lzh mar mlt uig wol): answer keys only.
//  18 (registered before any EO-3 statistic ran) EO-3 details: the model is fitted on the first 90 percent of the 300,000-character budget and is NOT refit; the last 10 percent is
//  the validation slice (order, cache timescales and weights are chosen there); cache timescales rho in {0.9, 0.95, 0.98, 0.99, 0.995, 0.998}, weights in {0.02, 0.05, 0.1, 0.2, 0.3};
//  the held-out stream is capped at 200,000 characters; bootstrap blocks are 200 characters; the lineage sign gate counts lineages whose pooled Delta_k exceeds the SESOI; the per-lineage
//  paired sign test of Delta_k against the same system's character-shuffled control supplies the Holm p-values EO3r1 and EO3r2. The planted generators (alphabet 30, 5 topics, timescales
//  60 and 1,500 characters, sentence length about 70; EO3_GENERATORS) have each rung's STRENGTH calibrated by bisection so that rung's own Delta equals the planted target 2s, 0.5s or 0.1s (the last
//  at ten times the held-out length); the trio is run for rungs 1 and 2; the K = 1..4 ladder read at 2s per rung is printed beside it and is not part of the gate.
//  19 (registered before any EO-2 JSD, Gamma or null statistic had been computed on real data; the TRAIN-file counts-only inventory had been seen) Choice 3 as first written read BARKER.md's
//  "fewer than 3 independent contrasts" per language AND per stratum. The design's own wording ("per language and feature ... A language with fewer than 3 independent contrasts is excluded") is
//  language-level, and the per-stratum reading would leave 3 lineages in each of H1 and H2 (every non-Indo-European inflecting language has only 1 or 2 contrasts in a stratum). Revised to the
//  literal reading: a language is included iff its total independent contrasts >= 3; it contributes to H1 (H2) iff it has >= 1 non-Case (oblique-only Case) triple. Counts only had been seen.
//  20 (same) The lineage sign gate is part of the PRE-DATA power decision for EO-2: a cell whose number of DEFINED lineages (planted power >= 0.8 per lineage) is below 5 is UNDERPOWERED BY
//  REACHABILITY and its statistic is withheld; the defined-lineage count is known before any real profile is read.
//  15 (same) EO-2 rival comparison, capture ratio and sign gate use the lineages for which h_l is defined; h_l is defined iff the planted-power rate P(h_l = 1) at 2s for
//  that lineage's own inventory is >= 0.8 in the epsilon = 0.3 card.
//
// IMPLEMENTER'S OWN PREDICTIONS, written before the first run (so surprise is measurable):
//   EO-1 power gate passes in BOTH directions on dev : 0.20 (about 150 to 250 scoring lemmas against a 0.02-bit SESOI).
//   EO-1 S1 survives given the gate passes           : 0.25. EO-1 plain N1 passes: 0.97.
//   EO-2 H2 (Case oblique-only) has >= 5 defined lineages on dev : 0.20; H1 testable : 0.45; any SURVIVES : 0.05.
//   EO-3 rungs 1 and 2 hold : 0.88.   EO-4 testable : 0.10.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { seedFrom } from "../../kernel/rng.js";
import { parseConllu, headerDigest, TB_DIR, EVAL_DIR, KEY_ALPHA, binomUpperTail } from "../competence/lib.mjs";

const HERE = fileURLToPath(import.meta.url);
export const EO_CLAIMS_VERSION = "1.1";   // bumped when code that changes results changes (power-card caches are keyed by it)
export const ALPHA = 0.05;
if (ALPHA !== KEY_ALPHA) throw new Error(`ALPHA ${ALPHA} must equal adapters/text/keyness.js KEY_ALPHA ${KEY_ALPHA}`);
export const SEED = 20261005;
export const OUT_DIR = process.env.BARKER_OUT_DIR || "/private/tmp/claude-501/barker/out";
const VERBNET_DIR = process.env.BARKER_VERBNET_DIR || "/Users/mlacy/nltk_data/corpora/verbnet3";
const COMPETENCE_DIR = process.env.BARKER_COMPETENCE_DIR || "/private/tmp/claude-501/competence";
const LOCK_FILE = path.join(path.dirname(HERE), "PREREG.lock.json");

// ── typed numbers (header: COMMON DEFINITIONS and OPERATIONAL CHOICES) ──────
export const DRAWS = 9999;
export const BOOT = 2000;
export const DOWNSAMPLES = 200;
export const TOKEN_FLOOR = 100;      // PROVISIONAL (P4): derive from the Wilson half-width at the SESOI
export const LEMMA_FLOOR = 5;        // PROVISIONAL
export const FOLDS = 5;
export const FRAME_VOCAB = 32;       // PROVISIONAL
export const OBL_VOCAB = 20;         // PROVISIONAL
export const SMOOTH_PSEUDO = 1;      // PROVISIONAL: one pseudo-token per centroid
export const TRAIN_CHAR_BUDGET = 300000;  // PROVISIONAL (EO-3)
export const POWER_REPS = Object.freeze({ eo1: 40, eo2: 20, eo3: 8, eo4: 200 });
export const POWER_DRAWS = Object.freeze({ eo1: 499, eo2: 999 });
export const POWER_BOOT = 500;

// ── a seeded generator with a 128-bit state (xoshiro128**), keyed by arbitrary parts ──────
export function makeRng(...keyParts) {
  let s = seedFrom({ seed: SEED, key: keyParts.map(String).join("|") }) >>> 0;
  const sm = () => {
    s = (s + 0x9e3779b9) | 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
  let a = sm(), b = sm(), c = sm(), d = sm();
  const rotl = (x, k) => (x << k) | (x >>> (32 - k));
  return () => {
    const r = Math.imul(rotl(Math.imul(b, 5), 7), 9) >>> 0;
    const t = b << 9;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= t; d = rotl(d, 11);
    return r / 4294967296;
  };
}
export const gauss = (rng) => { let u = 0; while (u === 0) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); };
export function shuffleInPlace(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
/** n items of `arr` WITHOUT replacement (partial Fisher-Yates on a copy). */
export function sampleWithoutReplacement(arr, n, rng) {
  const m = arr.length;
  if (n >= m) return arr.slice();
  const idx = Int32Array.from({ length: m }, (_, i) => i);
  const out = new Array(n);
  for (let i = 0; i < n; i++) { const j = i + Math.floor(rng() * (m - i)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; out[i] = arr[idx[i]]; }
  return out;
}
/** Multinomial counts of n draws from `probs` (cumulative binary search; probs need not sum to exactly 1). */
export function multinomial(n, probs, rng) {
  const V = probs.length, cum = new Float64Array(V);
  let tot = 0;
  for (let i = 0; i < V; i++) { tot += probs[i]; cum[i] = tot; }
  const out = new Float64Array(V);
  for (let t = 0; t < n; t++) {
    const u = rng() * tot;
    let lo = 0, hi = V - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] > u) hi = mid; else lo = mid + 1; }
    out[lo]++;
  }
  return out;
}

// ── statistics ───────────────────────────────────────────────────────────────
export const mean = (a) => { if (!a.length) return NaN; let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; };
export function sd(a) { if (a.length < 2) return NaN; const m = mean(a); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - m) ** 2; return Math.sqrt(s / (a.length - 1)); }
export function quantileSorted(sorted, q) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
export const quantile = (arr, q) => quantileSorted(Float64Array.from(arr).sort(), q);
export const median = (arr) => quantile(arr, 0.5);
/** Wilson 95% interval for k of n. */
export function wilson(k, n, z = 1.959964) {
  if (n === 0) return [0, 1];
  const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [Math.max(0, (c - h) / d), Math.min(1, (c + h) / d)];
}
/** Exact one-sided binomial: is "true rate <= p0" REJECTED by k of n at alpha? (P(X >= k | n, p0) < alpha) */
export const rejectsRateLE = (k, n, p0 = ALPHA, alpha = ALPHA) => (k <= 0 ? false : binomUpperTail(k, n, p0) < alpha);
export const signTestP = (k, n, p0 = 0.5) => (n === 0 ? 1 : binomUpperTail(k, n, p0));
/** Lineage reachability (BARKER.md 4.6): the smallest attainable sign p is 2^-n; alpha is reachable only for n >= 5. */
export function reachability(nLineages, alpha = ALPHA) {
  if (nLineages < 1) return { unreachable: true, n: nLineages };
  const minP = 2 ** -nLineages;
  if (minP > alpha) return { unreachable: true, n: nLineages, minP };
  let k = nLineages;
  while (k > 0 && signTestP(k - 1, nLineages) <= alpha) k--;
  return { n: nLineages, minP, kNeeded: k, p: signTestP(k, nLineages) };
}
/** Holm step-down over the p-values; returns [{p, adjAlpha, reject}] in the INPUT order. */
export function holmStepDown(ps, alpha = ALPHA) {
  const m = ps.length, order = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
  const out = ps.map((p) => ({ p, adjAlpha: alpha / m, reject: false }));
  let stop = false;
  order.forEach(([p, i], rank) => {
    const thr = alpha / (m - rank);
    out[i].adjAlpha = thr;
    if (!stop && p <= thr) out[i].reject = true; else stop = true;
  });
  return out;
}
/** Percentile interval of bootstrap replicates. */
export function percentileCI(samples, level = 0.95) {
  const s = Float64Array.from(samples).sort(), a = (1 - level) / 2;
  return [quantileSorted(s, a), quantileSorted(s, 1 - a)];
}
/** Nested mean: systems -> branches -> lineages. values: {id: number}; returns {mean, perLineage, perBranch}. */
export function nestedMean(values, branchOf, lineageOf) {
  const byBranch = new Map();
  for (const [id, v] of Object.entries(values)) {
    if (!Number.isFinite(v)) continue;
    const b = branchOf(id);
    (byBranch.get(b) ?? byBranch.set(b, []).get(b)).push(v);
  }
  const perBranch = {}, byLineage = new Map();
  for (const [b, vs] of byBranch) {
    perBranch[b] = mean(vs);
    const l = lineageOf(b);
    (byLineage.get(l) ?? byLineage.set(l, []).get(l)).push(perBranch[b]);
  }
  const perLineage = {};
  for (const [l, vs] of byLineage) perLineage[l] = mean(vs);
  const lv = Object.values(perLineage);
  return { mean: lv.length ? mean(lv) : NaN, perLineage, perBranch, nLineages: lv.length };
}
/** Cluster bootstrap over a vector of cluster values (e.g. lineage means): mean with percentile interval. */
export function clusterBootstrapMean(clusterValues, { B = BOOT, rng = makeRng("clusterBootstrap") } = {}) {
  const n = clusterValues.length;
  if (n === 0) return { est: NaN, ci95: [NaN, NaN], n };
  const reps = new Float64Array(B);
  for (let b = 0; b < B; b++) { let s = 0; for (let i = 0; i < n; i++) s += clusterValues[Math.floor(rng() * n)]; reps[b] = s / n; }
  return { est: mean(clusterValues), ci95: percentileCI(reps), n };
}

// ── information measures on count vectors ────────────────────────────────────
const LOG2 = Math.LN2;
export const log2 = (x) => Math.log(x) / LOG2;
/** JSD base 2 between two count (or probability) vectors; each is normalised by its own total. */
export function jsd2(c1, c2) {
  let n1 = 0, n2 = 0;
  for (let i = 0; i < c1.length; i++) { n1 += c1[i]; n2 += c2[i]; }
  if (n1 === 0 || n2 === 0) return NaN;
  let j = 0;
  for (let i = 0; i < c1.length; i++) {
    const p = c1[i] / n1, q = c2[i] / n2, m = 0.5 * (p + q);
    if (p > 0) j += 0.5 * p * Math.log(p / m);
    if (q > 0) j += 0.5 * q * Math.log(q / m);
  }
  return j / LOG2;
}
export const sha256 = (x) => createHash("sha256").update(typeof x === "string" ? x : JSON.stringify(x)).digest("hex");
const fileShaCache = new Map();
export function fileSha256(p) {
  if (!fileShaCache.has(p)) fileShaCache.set(p, createHash("sha256").update(fs.readFileSync(p)).digest("hex"));
  return fileShaCache.get(p);
}
export const headerSha = () => headerDigest(HERE);

// ── the SPLIT guard (header: SPLITS). No test-split path is opened in a dev run. ──────
export const SPLITS = Object.freeze(["dev", "test"]);
export function makeCtx({ split = "dev", confirmTest = false, outDir = OUT_DIR, quick = false } = {}) {
  if (!SPLITS.includes(split)) throw new Error(`split must be dev|test, got ${split}`);
  if (split === "test") {
    if (!fs.existsSync(LOCK_FILE)) throw new Error("test split refused: PREREG.lock.json does not exist (run.mjs --freeze refuses unsigned SESOI rows)");
    if (!confirmTest) throw new Error("test split refused: pass --confirm-test (one-shot confirmatory run)");
  }
  return { split, outDir, quick, headerSha: headerSha(), manifest: new Map() };
}
export function heldOutPath(ctx, stem) { return path.join(EVAL_DIR, stem, `${ctx.split}.conllu`); }
export function trainPath(stem) { return path.join(TB_DIR, stem, "train.conllu"); }
export function cardPath(ctx, rung, stem) { return path.join(COMPETENCE_DIR, `${rung}-${stem}-${ctx.split}.json`); }
function pin(ctx, role, file) { const sha = fileSha256(file); ctx.manifest.set(file, { role, sha256: sha }); return sha; }
const parsedCache = new Map();
export function readSentences(file) {
  if (!parsedCache.has(file)) parsedCache.set(file, parseConllu(fs.readFileSync(file, "utf8")));
  return parsedCache.get(file);
}
/** `# text = ...` lines of a CoNLL-U file, up to maxChars characters (scan without parsing). */
export function readTextLines(file, { maxChars = Infinity } = {}) {
  const s = fs.readFileSync(file, "utf8"), out = [];
  let pos = 0, total = 0;
  while (pos < s.length && total < maxChars) {
    let e = s.indexOf("\n", pos); if (e < 0) e = s.length;
    if (s.startsWith("# text = ", pos)) { const t = s.slice(pos + 9, e).normalize("NFC"); out.push(t); total += t.length; }
    pos = e + 1;
  }
  return out;
}
export function parseFeats(f) {
  const o = {};
  if (!f || f === "_") return o;
  for (const kv of f.split("|")) { const i = kv.indexOf("="); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1); }
  return o;
}

// ── genealogy ANSWER KEYS (typed by the implementer from Glottolog top-level families; never a feature) ──
export const LANG_KEYS = Object.freeze({
  rus: ["Indo-European", "Slavic"], ukr: ["Indo-European", "Slavic"], pol: ["Indo-European", "Slavic"], bul: ["Indo-European", "Slavic"],
  ces: ["Indo-European", "Slavic"], slk: ["Indo-European", "Slavic"], slv: ["Indo-European", "Slavic"], hrv: ["Indo-European", "Slavic"], srp: ["Indo-European", "Slavic"],
  spa: ["Indo-European", "Romance"], ita: ["Indo-European", "Romance"], por: ["Indo-European", "Romance"], fra: ["Indo-European", "Romance"],
  ron: ["Indo-European", "Romance"], cat: ["Indo-European", "Romance"], glg: ["Indo-European", "Romance"],
  eng: ["Indo-European", "Germanic"], deu: ["Indo-European", "Germanic"], nld: ["Indo-European", "Germanic"], swe: ["Indo-European", "Germanic"],
  dan: ["Indo-European", "Germanic"], nob: ["Indo-European", "Germanic"],
  hin: ["Indo-European", "Indo-Iranian"], urd: ["Indo-European", "Indo-Iranian"], fas: ["Indo-European", "Indo-Iranian"],
  ell: ["Indo-European", "Hellenic"], lav: ["Indo-European", "Baltic"], lit: ["Indo-European", "Baltic"], hye: ["Indo-European", "Armenian"],
  arb: ["Afro-Asiatic", "Semitic"], heb: ["Afro-Asiatic", "Semitic"],
  cmn: ["Sino-Tibetan", "Sinitic"], "cmn-hans": ["Sino-Tibetan", "Sinitic"],
  jpn: ["Japonic", "Japonic"], kor: ["Koreanic", "Koreanic"], "kor-gsd": ["Koreanic", "Koreanic"],
  tur: ["Turkic", "Turkic"], fin: ["Uralic", "Finnic"], est: ["Uralic", "Finnic"], hun: ["Uralic", "Ugric"],
  ind: ["Austronesian", "Austronesian"], vie: ["Austroasiatic", "Austroasiatic"],
  kat: ["Kartvelian", "Kartvelian"], tam: ["Dravidian", "Dravidian"], tel: ["Dravidian", "Dravidian"], eus: ["Basque", "Basque"],
  afr: ["Indo-European", "Germanic"], cym: ["Indo-European", "Celtic"], gle: ["Indo-European", "Celtic"], mar: ["Indo-European", "Indo-Iranian"],
  lzh: ["Sino-Tibetan", "Sinitic"], mlt: ["Afro-Asiatic", "Semitic"], uig: ["Turkic", "Turkic"], wol: ["Niger-Congo", "Atlantic"],
});
export const lineageOfStem = (s) => LANG_KEYS[s]?.[0] ?? null;
export const branchOfStem = (s) => LANG_KEYS[s]?.[1] ?? null;
export const lineageOfBranch = (b) => { for (const v of Object.values(LANG_KEYS)) if (v[1] === b) return v[0]; return null; };
/** A language is "consumed" by the grammar table if its authors derived the table from it or applied it (header). */
export const CONSUMED_LANGUAGES = Object.freeze({
  grc: { status: "derived", source: "cube.js PROVENANCE: UD_Ancient_Greek PROIEL and Perseus endings tallied (no tb/ dir: not among the measured languages)" },
  lat: { status: "derived", source: "cube.js header: tallied for Latin; scripts/build-latin-case-prior.mjs (no tb/ dir)" },
  san: { status: "derived", source: "cube.js header: tallied for Vedic Sanskrit; case-marking-san.json (no tb/ dir)" },
  rus: { status: "consumed", source: "ethos/derived-priors/case-priors/case-marking-rus.json is a CasePrior@1 built from UD_Russian-GSD train through the table, each ending's cell printed" },
  ell: { status: "near", source: "Modern Greek follows Ancient Greek, from which the table was derived (BARKER.md F8)" },
});
export const consumedStatus = (stem) => CONSUMED_LANGUAGES[stem]?.status ?? "unconsumed";
export const CONSUMED_BASIS = "unconsumed is CONDITIONAL on the grammar table's revision history (B7, P9), which has not been supplied";
/** Isolating or non-alphabetic systems: a typed gap for the ending operationalisation O2 (BARKER.md 6.3). */
export const O2_GAP_STEMS = Object.freeze({ cmn: "Han script, isolating", "cmn-hans": "Han script, isolating", vie: "isolating", ind: "near-isolating", jpn: "non-alphabetic script (kana/kanji)", kor: "Hangul syllable blocks", "kor-gsd": "Hangul syllable blocks" });

// ── the registries (BARKER.md 6.0, 6.0a, 6.1): hashed, one role per rival ──────────
const row = (o) => Object.freeze({ ...o, mappingSha: sha256(o.mappingDef) });
export const RIVAL_REGISTRY = Object.freeze([
  row({ id: "N1", giver: "the null", k: 8, role: "null", tests: ["EO-1"], note: "calibration only: vacuous by design (Levin locality)", mappingDef: "random class->act redeal keeping the number of classes per act" }),
  row({ id: "N1b", giver: "null built on the VerbNet class numbering", k: 8, role: "null", tests: ["EO-1"], mappingDef: "acts permuted only among the classes of the SAME Levin major group (integer prefix)" }),
  row({ id: "N1c", giver: "null built on the VerbNet class numbering", k: 8, role: "null", tests: ["EO-1"], mappingDef: "8 contiguous blocks of the Levin-ordered class list; family A EO's size profile in random order, family B random cut points" }),
  row({ id: "P3", giver: "VerbNet 3 top-level frames (independent of UD and of EO); Peirce's valency analogy", k: 3, role: "must-beat", tests: ["EO-1"], mappingDef: "modal number of NP elements over the class's top-level frames, ties to the smaller, clipped to {1,2,3+}; EO coarsened to 3 by train-only agglomeration" }),
  row({ id: "D9", giver: "the data", k: 8, role: "reference", tests: ["EO-1"], mappingDef: "train-only agglomeration of class centroids to k=8 by rise in train code length (per fold)" }),
  row({ id: "L9", giver: "Levin 1993 via VerbNet", k: 8, role: "reference", tests: ["EO-1"], mappingDef: "Levin major group coarsened to 8 by train-only agglomeration" }),
  row({ id: "LN", giver: "Levin 1993 via VerbNet", k: 102, role: "reference", tests: ["EO-1"], note: "native k, printed only", mappingDef: "Levin major group at native k" }),
  row({ id: "V311", giver: "VerbNet 3", k: 325, role: "reference", tests: ["EO-1"], note: "native k (325 top-level classes on disk), printed only", mappingDef: "native VerbNet top-level class at native k" }),
  row({ id: "G-null", giver: "the null", k: 3, role: "null", tests: ["EO-2"], mappingDef: "grain labels permuted over a feature's present values, multiset kept, exact enumeration" }),
  row({ id: "BL", giver: "Blake 2001, a received ordering", k: 5, role: "must-beat", tests: ["EO-2"], scope: "Case only", mappingDef: { Nom: 1, Acc: 2, Gen: 3, Dat: 4, Loc: 5, Ins: 5, Abl: 5, Voc: null } }),
  row({ id: "CO", giver: "UD guidelines (core versus oblique arguments)", k: 2, role: "must-beat", tests: ["EO-2"], scope: "Case only", mappingDef: { core: ["Nom", "Acc"], oblique: "all other Case values" } }),
  row({ id: "TR", giver: "integral literature as FoA pp.32-33 and p.28 report it; lens-risk flagged", k: 3, role: "must-beat", tests: ["EO-2"], scope: "Person only", status: "NOT_RUN: no received operational mapping (BARKER.md 6.0: a mapping the architect invents is Barker's lens)", mappingDef: "Person 1/2/3 read as I/we/it: no proximity order stated" }),
  row({ id: "FR", giver: "the null (count-driven alternative)", k: 3, role: "must-beat", tests: ["EO-2"], note: "BARKER.md 6.3 control c3; failing it is WEAKENED, not INSTRUMENT_FAILED", mappingDef: "grains by contiguous frequency-rank blocks with the table's block sizes; mean over distinct block orders" }),
  row({ id: "DD", giver: "the data (leave-one-language-out; lineage-out as the stricter)", k: 3, role: "reference", tests: ["EO-2"], mappingDef: "within-feature average-linkage 3-partition on the other languages' mean count-equalised JSD matrix" }),
  row({ id: "UDI", giver: "UD inventories (17 UPOS, 37 deprel bases, FEATS values)", k: 0, role: "reference", tests: ["EO-1", "EO-2"], note: "native inventory; printed only", mappingDef: "UD native inventories" }),
]);
const sesoi = (o) => Object.freeze({ signedBy: "", ...o });
export const SESOI = Object.freeze({
  "EO-1.S1": sesoi({ testId: "EO-1.S1", statistic: "G_EO - max(median G | N1b, median G | N1c)", unit: "bits per held-out verb token", value: 0.02, justification: "about 50 verb tokens accumulate one bit (a factor two) of evidence at this size; a partition needing more does not work at reading scale" }),
  "EO-1.S2": sesoi({ testId: "EO-1.S2", statistic: "median over placements of NA minus NA_EO", unit: "share of centroid variance", value: 0.06, justification: "Cohen's medium eta-squared: the grid must explain six more points of variance than the typical arrangement" }),
  "EO-1.S3": sesoi({ testId: "EO-1.S3", statistic: "capture ratio r = (CE_global - CE_EO)/(CE_global - CE_D9)", unit: "ratio", value: 1 / 3, justification: "EO's partition captures at least a third of what the data's best equal-k partition captures" }),
  "EO-1.rivals": sesoi({ testId: "EO-1.rivals", statistic: "CE(rival) - CE(EO) at equal k", unit: "bits per held-out verb token", value: 0.02, justification: "one unit, one test" }),
  "EO-2": sesoi({ testId: "EO-2", statistic: "Gamma - 0.5 after count equalisation, lineage-nested over unconsumed languages", unit: "probability above chance", value: 0.05, justification: "55 percent against 50 percent chance that the same-grain pair is closer: fewer than one prediction in twenty changed below it" }),
  "EO-3": sesoi({ testId: "EO-3", statistic: "Delta_k = L(M_{k-1}) - L(M_k)", unit: "bits per character", value: 0.01, justification: "under half a percent of an order-2 character model's code length" }),
  "EO-4": sesoi({ testId: "EO-4", statistic: "CR_EO minus the mean CR of the other 23 orders (EO's order must rank first)", unit: "reproducibility coefficient", value: 0.05, justification: "Guttman reproducibility is judged against 0.90; five points above the mean of the alternative orders is the least that separates an order from its permutations" }),
});
/** Per-test defender sentences (B6). The text is the observable the claim itself states; licensed stays false until the EO defender signs it. */
export const EO_SENTENCES = Object.freeze({
  "EO-1": { testId: "EO-1", bearing: "DIRECT on the partition; PROXY on 'closed universe'", eoSentence: "which of the engine's nine acts ... its VerbNet class's own semantics perform", source: "ethos/derived-priors/act-priors/README.md", licensed: false, note: "architect-proposed default; the EO defender has not confirmed (B6)" },
  "EO-2.O1": { testId: "EO-2.O1", bearing: "PROXY-BRIDGE (Barker's auxiliary hypothesis: role profiles are grain-similar)", eoSentence: "The mapping is the theory; the priors are its measurement.", source: "kernel/cube.js, PROVENANCE comment", licensed: false, note: "does not state the role-profile observable; a failure refutes the conjunction" },
  "EO-2.O2": { testId: "EO-2.O2", bearing: "PROXY (word-final endings, the builders' own endingLength 2)", eoSentence: "The mapping is the theory; the priors are its measurement.", source: "kernel/cube.js, PROVENANCE comment", licensed: false, note: "nearer EO's own derivation; still unsigned" },
  "EO-3": { testId: "EO-3", bearing: "PROXY-WEAK", eoSentence: "Pattern's definition is literally a difference equation.", source: "docs/THE-THREE-MATHEMATICS.md section III", licensed: false, note: "near-foregone calibration" },
  "EO-4": { testId: "EO-4", bearing: "PROXY (cards are SUT outputs)", eoSentence: "the floor below did not individuate enough events for the same mechanism to bite", source: "docs/THE-CORE-MECHANISM.md", licensed: false, note: "unsigned" },
});
export const NEAR_FOREGONE = Object.freeze({ "EO-1.N1": 0.97, "EO-3": 0.99 });
export const RECORDED_P = Object.freeze({
  "EO-1.N1": 0.97, "EO-1.S1": 0.25, "EO-1.S2": 0.12, "EO-1.r>=1/3": 0.45, "EO-1.knee@9": 0.20,
  "EO-2.nonCaseTestable": 0.35, "EO-2.CaseO1": 0.40, "EO-2.survives": 0.08, "EO-2.underpowered": 0.55,
  "EO-3.D1>0": 0.99, "EO-3.D2>0": 0.90, "EO-3.D3>0": 0.70, "EO-4.testable": 0.15, "EO-4.survives|testable": 0.40,
});
export const EO_CLAIMS = Object.freeze([
  { id: "EO-1", claim: "The nine acts are a closed universe of relation kinds; a verb's semantics performs one of nine acts (mode x domain).", file: "the-fold/relation-kinds.js header; ActPrior@1; THE-27-CELLS s1; THE-THREE-MATHEMATICS sI, sV", status: "TESTABLE_NOW (English, EWT)", bearing: "DIRECT on the partition; PROXY on closed universe" },
  { id: "EO-2", claim: "The cube projects onto grammar: Case, Person, Number, Tense, Mood, Voice, Aspect values are cells worn by a language's surfaces.", file: "kernel/cube.js CELL_OF_GRAMMAR", status: "TESTABLE_NOW as a bridge-dependent proxy (O1) and an ending-level proxy (O2)", bearing: "PROXY-BRIDGE (O1), PROXY (O2)" },
  { id: "EO-3", claim: "Grains are three orders of difference: constant (Ground), value (Figure), rate (Pattern); 0 / n / 1.", file: "THE-THREE-MATHEMATICS sIII; THE-WHEEL", status: "testable only in the weak form; near-foregone", bearing: "PROXY-WEAK" },
  { id: "EO-4", claim: "A floor can starve when the floor below did not individuate enough events; the operator chain is a dependency order.", file: "THE-CORE-MECHANISM; LEVELS ladder 1; READING-SPEC S14", status: "testable on cards in principle; expected UNDERPOWERED", bearing: "PROXY" },
  { id: "EO-5", claim: "Cells classify moves, never content; deriving a cell from a passage is refuted.", file: "THE-27-CELLS s1", status: "ON RECORD REFUTED as a content reading (95.7 percent survived within-paragraph shuffle); calibration K2", bearing: "n/a" },
  { id: "EO-6", claim: "Recurrence alone is not admission; company is not act.", file: "READING-SPEC; THE-27-CELLS", status: "ON RECORD REFUTED; calibrations K1 and K3", bearing: "n/a" },
  { id: "EO-7", claim: "Omnilingual invariance: translation-equivalent connectors land on one cell.", file: "the-fold/relation-kinds.js header", status: "NOT_TESTABLE_NOW", bearing: "DIRECT" },
  { id: "EO-8", claim: "Occurrence-level grain (27 not 9).", file: "adapters/text/phasepost.js", status: "NOT_TESTABLE_NOW", bearing: "DIRECT" },
  { id: "EO-9", claim: "Moves have cells (independent move gold).", file: "THE-27-CELLS", status: "NOT_TESTABLE_NOW", bearing: "DIRECT" },
  { id: "EO-10", claim: "Presence is not identity (an index of existence is not an index of establishment, P38).", file: "constitution amendments; clearance.js", status: "NOT_TESTABLE_NOW", bearing: "DIRECT" },
  { id: "EO-11", claim: "The three mathematics are the three domains; stances are isomorphic across them.", file: "THE-THREE-MATHEMATICS", status: "no operational reading; specimen-scale support recorded by EO (binding transfer 5/5), untested beyond one stance", bearing: "not run" },
  { id: "EO-12", claim: "Every structure-finder is one act (destroy one relation); three comparison families.", file: "THE-CORE-MECHANISM", status: "a claim about the code base: audited by reading, not by data", bearing: "not run" },
]);
/** BARKER.md 6.9: what is NOT testable now, with the exact missing data. */
export const NOT_TESTABLE = Object.freeze({
  "EO-7": { why: "EO's act prior and phasepost lexicon are English only; any non-English table written by Barker is Barker's lens", missing: "(a) sentence-aligned parallel treebanks (UD PUD, about 20 languages, not on disk) and (b) an act prior for at least two non-English languages built by a DECLARED procedure" },
  "EO-8": { why: "grain is a mechanical heuristic in phasepost.js with no independent gold; the heuristic can only be unit-tested, not falsified", missing: "occurrence-level gold of 'what an act lands on' (none exists)" },
  "EO-9": { why: "no move gold", missing: "dialogue-act corpora with human acts (Switchboard-DAMSL, ICSI-MRDA, AMI, MapTask) AND an EO-supplied mapping from act tags to the 27 cells (not supplied; Barker writing it would be Barker's lens)" },
  "EO-10": { why: "presence-versus-identity needs coreference gold", missing: "CorefUD or OntoNotes coreference plus EO's establishment ladder (clearance.js) as the SUT" },
  "EO-chain": { why: "S14's 'only this one of nearly thirteen hundred orderings survives' consistency checks are internal to EO", missing: "independent sequences of acts with an independent 'presupposes' relation (e.g. human-annotated procedural text)" },
  REC: { why: "lexically unpopulated (ActPrior@1.disclosed.recSparse); the table has 8 non-empty acts", missing: "discourse-level re-framing gold" },
  "EO-11": { why: "no operational reading of 'the stances are isomorphic across the three mathematics'", missing: "an operational definition of stance-isomorphism from EO" },
  "EO-12": { why: "an audit of the code base, by reading", missing: "n/a: not a data claim" },
});
/** The registry lint (BARKER.md 8.3 rule 7). strict also demands signedBy (the freeze gate). */
export function registryLint({ strict = false } = {}) {
  const errs = [], seen = new Set();
  for (const r of RIVAL_REGISTRY) {
    if (seen.has(r.id)) errs.push(`rival ${r.id} registered twice`);
    seen.add(r.id);
    if (!["null", "must-beat", "reference"].includes(r.role)) errs.push(`rival ${r.id}: role ${r.role}`);
    if (typeof r.k !== "number") errs.push(`rival ${r.id}: no k`);
    if (!r.giver) errs.push(`rival ${r.id}: no giver`);
    if (!r.mappingSha || r.mappingSha.length !== 64) errs.push(`rival ${r.id}: no mapping hash`);
  }
  for (const s of Object.values(SESOI)) {
    if (!s.unit || !s.justification || !(s.value > 0)) errs.push(`SESOI ${s.testId}: unit, justification or value missing`);
    if (strict && !s.signedBy) errs.push(`SESOI ${s.testId}: unsigned`);
  }
  for (const s of Object.values(EO_SENTENCES)) {
    if (!s.eoSentence || s.eoSentence.replace(/\.\.\./g, " ").split(/\s+/).filter(Boolean).length > 15) errs.push(`eoSentence ${s.testId}: missing or longer than 15 words`);
    if (!s.source) errs.push(`eoSentence ${s.testId}: no source`);
  }
  if (errs.length) throw new Error(`registry lint: ${errs.join("; ")}`);
  return true;
}
export const roleOf = (id) => { const r = RIVAL_REGISTRY.find((x) => x.id === id); if (!r) throw new Error(`rival ${id} is not in RIVAL_REGISTRY: refusing to read a role that was never registered`); return r.role; };

// ── the one verdict function (header; BARKER.md 6.0) ────────────────────────────────
export const VERDICTS = Object.freeze(["INSTRUMENT_FAILED", "UNDERPOWERED", "REFUTED", "WEAKENED", "SURVIVES", "NOT_TESTABLE_NOW"]);
const OUTCOME_OF = Object.freeze({ INSTRUMENT_FAILED: "instrument_failed", UNDERPOWERED: "underpowered", REFUTED: "refuted", WEAKENED: "weakened", SURVIVES: "survives", NOT_TESTABLE_NOW: "untestable" });
export const outcomeOf = (v) => OUTCOME_OF[v];
export function minimumEffectVerdict({ theta, ci95, sesoi: s, powerUp, powerDown, tinyOk = true, controlsOk, nullOk, mustBeatOk, signGate = null, channelsOk = null, bridge = "licensed", consumed = false, withheld = false, reachable = true, nearForegone = false }) {
  const reasons = [];
  const done = (verdict, extra = {}) => ({ verdict, outcome: OUTCOME_OF[verdict], reasons, bridge: extra.bridge ?? bridge, headline: false, ...extra });
  if (controlsOk === false) { reasons.push("a control built to fail survived (II.23)"); return done("INSTRUMENT_FAILED"); }
  if (withheld) { reasons.push("power gate failed before real data: the statistic is withheld (no peek)"); return done("UNDERPOWERED"); }
  if (!reachable) { reasons.push("the lineage sign gate is unreachable at this number of defined lineages"); return done("UNDERPOWERED"); }
  const [lo, hi] = ci95 ?? [NaN, NaN];
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) { reasons.push("no interval"); return done("UNDERPOWERED"); }
  if (lo <= s && hi >= s) { reasons.push(`interval [${lo.toFixed(4)}, ${hi.toFixed(4)}] straddles the SESOI ${s}`); return done("UNDERPOWERED"); }
  const eligible = (v, b) => v !== "UNDERPOWERED" && v !== "INSTRUMENT_FAILED" && b === "licensed" && consumed === false && !nearForegone;
  if (hi < s) {
    if (!powerDown) { reasons.push("upper bound below the SESOI but P_down failed: the card could not have refuted"); return done("UNDERPOWERED"); }
    if (bridge !== "licensed") { reasons.push("unlicensed bridge: REFUTED is unavailable; the proxy failed (bridge: failed)"); return done("WEAKENED", { bridge: "failed" }); }
    reasons.push(nullOk ? "an effect exists and is smaller than the SESOI" : "no effect clears the SESOI");
    const r = done("REFUTED"); r.headline = eligible("REFUTED", bridge); return r;
  }
  // lo > s
  if (!powerUp) { reasons.push("lower bound above the SESOI but P_up failed: the card could not have confirmed"); return done("UNDERPOWERED"); }
  if (!tinyOk) { reasons.push("the planted 0.1s world at 10x n reached SURVIVES more often than alpha: the rule is not conservative"); return done("UNDERPOWERED"); }
  const fails = [];
  if (nullOk === false) fails.push("N (null not beaten after Holm)");
  if (mustBeatOk === false) fails.push("A (a must-beat rival or null 95th percentile not beaten by the SESOI)");
  if (signGate === false) fails.push("F (lineage sign gate)");
  if (channelsOk === false) fails.push("I (independent channels disagree)");
  if (fails.length) { reasons.push(`M holds but ${fails.join(", ")} fails`); return done("WEAKENED"); }
  const out = done("SURVIVES", { bridge: bridge === "licensed" ? "licensed" : "unlicensed" });
  out.headline = eligible("SURVIVES", out.bridge);
  if (!out.headline) reasons.push(`excluded from the headline: ${bridge !== "licensed" ? "bridge unlicensed; " : ""}${consumed !== false ? "consumed or near rows; " : ""}${nearForegone ? "near-foregone calibration" : ""}`.replace(/; $/, ""));
  return out;
}
/** Planted-power summary (the trio of 6.0): up/down/tiny rates and the rule that gates real data. */
export function powerGate({ up, down, tiny, reps }) {
  const upRate = up.hits / up.n, downRate = down.hits / down.n;
  const tinyRejected = rejectsRateLE(tiny.hits, tiny.n);
  const pass = upRate >= 0.8 && downRate >= 0.8 && !tinyRejected;
  return { P_up: upRate >= 0.8, P_down: downRate >= 0.8, tinyOk: !tinyRejected, up: { ...up, rate: upRate, wilson: wilson(up.hits, up.n) }, down: { ...down, rate: downRate, wilson: wilson(down.hits, down.n) }, tiny: { ...tiny, rate: tiny.hits / tiny.n, rejectedAsLEalpha: tinyRejected }, reps, pass };
}

// ── the ONLY places EO's own instruments are read (the system under test) ────────────
/** the ONLY place cube.js is read. Synchronous: require(esm) is enabled by default in node >= 22.12. */
export function underTestGrammarCells() {
  const require = createRequire(import.meta.url);
  return require("../../kernel/cube.js").CELL_OF_GRAMMAR;
}
/** the (mode, domain) of each operator, as cube.js declares it (EO's own arrangement of the nine acts into the 3x3 grid). */
export function underTestOperatorGrid() {
  const require = createRequire(import.meta.url);
  const cube = require("../../kernel/cube.js");
  const out = {};
  for (const op of ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]) { const c = cube.cellOf(op, "Ground"); out[op] = { mode: c.mode, domain: c.domain }; }
  return { grid: out, MODES: [...cube.MODES], DOMAINS: [...cube.DOMAINS] };
}
/** the ONLY place the ActPrior@1 file is read. Returns {forms, classToAct, counts, disclosed}. */
export function underTestActTable(file = process.env.BARKER_ACT_PRIOR || "/Users/mlacy/Documents/3.0/ethos/derived-priors/act-priors/act-prior-en.json") {
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  const classToAct = {}, forms = {};
  for (const [form, v] of Object.entries(d.forms)) {
    const cands = v.standing === "contested" ? v.candidates : [v];
    forms[form] = { standing: v.standing, classes: cands.flatMap((c) => c.classes), primaryClass: cands[0].classes[0], acts: [...new Set(cands.map((c) => c.op))] };
    for (const c of cands) for (const cl of c.classes) {
      if (classToAct[cl] && classToAct[cl] !== c.op) throw new Error(`act prior maps class ${cl} to two acts`);
      classToAct[cl] = c.op;
    }
  }
  return { forms, classToAct, counts: d.counts, disclosed: d.disclosed, giver: d.giver, sha256: fileSha256(file) };
}
/** sha256 of CELL_OF_GRAMMAR with sorted keys: locked into PREREG.lock.json as cellOfGrammarSha. */
export function cellOfGrammarSha() {
  const t = underTestGrammarCells();
  const canon = (x) => (Array.isArray(x) ? x.map(canon) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, canon(x[k])])) : x);
  return sha256(JSON.stringify(canon(t)));
}

// ═════════════════════════════════ EO-1 ENGINE ═════════════════════════════════
export const ACT_ORDER = Object.freeze(["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]);
const FRAME_SET = new Set(["nsubj", "nsubj:pass", "obj", "iobj", "obl", "ccomp", "xcomp", "advcl", "csubj", "expl", "compound:prt"]);
const frameDep = (dr) => { if (FRAME_SET.has(dr)) return dr; const b = String(dr).split(":")[0]; return FRAME_SET.has(b) ? b : null; };
const baseOf = (dr) => String(dr).split(":")[0];

/** One record per VERB token of a sentence: lemma and the four behaviour symbols (header: BEHAVIOUR). */
export function verbTokenSymbols(sent) {
  const toks = sent.tokens, kids = new Map();
  for (const t of toks) { const h = Number(t.head); if (!(h > 0)) continue; (kids.get(h) ?? kids.set(h, []).get(h)).push(t); }
  const out = [];
  for (const t of toks) {
    if (t.upos !== "VERB") continue;
    const ch = kids.get(t.id) ?? [];
    const frame = ch.map((c) => frameDep(c.deprel)).filter(Boolean).sort().join("+") || "none";
    const f = parseFeats(t.feats);
    const neg = f.Polarity === "Neg" || ch.some((c) => parseFeats(c.feats).Polarity === "Neg");
    const aux = ch.some((c) => c.deprel === "aux" || c.deprel === "aux:pass");
    const obl = ch.filter((c) => baseOf(c.deprel) === "obl").sort((a, b) => a.id - b.id)[0];
    let b4 = "none-obl";
    if (obl) { const cs = (kids.get(obl.id) ?? []).find((c) => baseOf(c.deprel) === "case"); b4 = cs ? cs.lemma.toLowerCase() : "none-case"; }
    out.push({ lemma: t.lemma.toLowerCase(), b1: frame, b2: `${f.VerbForm ?? "_"}/${f.Voice ?? "_"}/${f.Mood ?? "_"}`, b3: `${f.Tense ?? "_"}/${neg ? "neg" : "pos"}/${aux ? "aux" : "noaux"}`, b4 });
  }
  return out;
}

/** VerbNet 3: class ids in Levin order, major group, top-level frames' modal NP count (P3). */
export function loadVerbNet(dir = VERBNET_DIR) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".xml"));
  const recs = [];
  for (const f of files) {
    const id = f.slice(0, -4);
    const m = /^(.*)-(\d+(?:\.\d+)*)$/.exec(id);
    if (!m) throw new Error(`VerbNet class id not parseable: ${id}`);
    const nums = m[2].split(".").map(Number);
    const top = fs.readFileSync(path.join(dir, f), "utf8").split("<SUBCLASSES")[0];
    const counts = [];
    for (const fr of top.matchAll(/<FRAME>([\s\S]*?)<\/FRAME>/g)) {
      const syn = /<SYNTAX>([\s\S]*?)<\/SYNTAX>/.exec(fr[1]);
      if (syn) counts.push([...syn[1].matchAll(/<NP[\s>]/g)].length);
    }
    let valency = null;
    if (counts.length) {
      const tally = new Map(); for (const c of counts) tally.set(c, (tally.get(c) ?? 0) + 1);
      let best = null; for (const [c, n] of [...tally].sort((a, b) => b[1] - a[1] || a[0] - b[0])) { best = c; break; }
      valency = Math.min(3, Math.max(1, best));
    }
    recs.push({ id, nums, major: nums[0], valency, nFrames: counts.length });
  }
  recs.sort((a, b) => { for (let i = 0; i < Math.max(a.nums.length, b.nums.length); i++) { const d = (a.nums[i] ?? -1) - (b.nums[i] ?? -1); if (d) return d; } return a.id < b.id ? -1 : 1; });
  return { classes: recs, sha256: sha256(recs.map((r) => `${r.id}:${r.valency}`).join("|")) };
}

/** Build the folds-by-class tables for a set of lemma records (real or synthetic). */
export function makeEo1Dataset({ lemmas, trainVec, heldVec, classes, off, size, eoAct, lemmaFloor = LEMMA_FLOOR, unitMask = null }) {
  const S = off[off.length - 1] + size[size.length - 1], C = classes.length, L = lemmas.length;
  const classIdx = new Map(classes.map((c, i) => [c.id, i]));
  const majors = [...new Set(classes.map((c) => c.major))].sort((a, b) => a - b), majIdx = new Map(majors.map((m, i) => [m, i]));
  const classMajor = Int32Array.from(classes, (c) => majIdx.get(c.major));
  const lemmaClass = new Int32Array(L), lemmaFold = new Int32Array(L), nHeld = new Float64Array(L), nTrain = new Float64Array(L);
  for (let l = 0; l < L; l++) {
    const rec = lemmas[l];
    if (!classIdx.has(rec.cls)) throw new Error(`lemma ${rec.lemma}: class ${rec.cls} is not a VerbNet class on disk`);
    lemmaClass[l] = classIdx.get(rec.cls); lemmaFold[l] = rec.fold;
    let nh = 0, nt = 0; for (let s = 0; s < size[0]; s++) { nh += heldVec[l * S + s]; nt += trainVec[l * S + s]; }
    nHeld[l] = nh; nTrain[l] = nt;
  }
  const unitIdx = []; for (let l = 0; l < L; l++) if (unitMask ? unitMask[l] : nHeld[l] >= lemmaFloor) unitIdx.push(l);
  const mask = Uint8Array.from({ length: L }, () => 0); for (const l of unitIdx) mask[l] = 1;
  const nU = unitIdx.length;
  const unitW = new Float64Array(nU * S), unitFold = new Int32Array(nU), unitClass = new Int32Array(nU);
  unitIdx.forEach((l, u) => {
    unitFold[u] = lemmaFold[l]; unitClass[u] = lemmaClass[l];
    for (let s = 0; s < S; s++) unitW[u * S + s] = heldVec[l * S + s] / (4 * nHeld[l]);
  });
  const T = [], W = [], Tnz = [], Wnz = [], p0 = [], L0 = [], Ntot = [];
  for (let f = 0; f < FOLDS; f++) {
    const Tf = new Float64Array(C * S), Wf = new Float64Array(C * S), nzT = new Set(), nzW = new Set();
    for (let l = 0; l < L; l++) {
      if (lemmaFold[l] === f) continue;
      const c = lemmaClass[l]; if (c < 0) continue;
      for (let s = 0; s < S; s++) Tf[c * S + s] += trainVec[l * S + s];
      if (nTrain[l] > 0) nzT.add(c);
    }
    for (let u = 0; u < nU; u++) {
      if (unitFold[u] !== f) continue;
      const c = unitClass[u];
      for (let s = 0; s < S; s++) Wf[c * S + s] += unitW[u * S + s] / nU;
      nzW.add(c);
    }
    // the fold's global block distributions (all universe lemmas outside the fold)
    const g = new Float64Array(S); let N = 0;
    for (let c = 0; c < C; c++) for (let s = 0; s < S; s++) g[s] += Tf[c * S + s];
    for (let s = 0; s < size[0]; s++) N += g[s];
    const p = new Float64Array(S), Lg = new Float64Array(S);
    for (let b = 0; b < off.length; b++) for (let s = off[b]; s < off[b] + size[b]; s++) { p[s] = (g[s] + 1 / size[b]) / (N + SMOOTH_PSEUDO); Lg[s] = -log2(p[s]); }
    T.push(Tf); W.push(Wf); Tnz.push([...nzT]); Wnz.push([...nzW]); p0.push(p); L0.push(Lg); Ntot.push(N);
  }
  const ds = { unitMask: mask, S, C, L, off, size, classes, classIdx, classMajor, nMajor: majors.length, lemmas, lemmaClass, lemmaFold, nTrain, nHeld, trainVec, heldVec, unitIdx: Int32Array.from(unitIdx), nU, unitW, unitFold, unitClass, T, W, Tnz, Wnz, p0, L0, Ntot, eoAct };
  ds.ceGlobUnits = new Float64Array(nU);
  for (let u = 0; u < nU; u++) { let ce = 0; const L0f = L0[unitFold[u]]; for (let s = 0; s < S; s++) ce += unitW[u * S + s] * L0f[s]; ds.ceGlobUnits[u] = ce; }
  ds.ceGlob = mean(ds.ceGlobUnits);
  // EO's own partition as group ids 0..K-1 over the non-empty acts
  if (eoAct) {
    const used = ACT_ORDER.filter((a) => eoAct.some((x) => x === a));
    ds.eoActs = used; ds.K = used.length;
    ds.eoG = Int32Array.from(eoAct, (a) => (a == null ? -1 : used.indexOf(a)));
    ds.eoSizes = used.map((a) => eoAct.filter((x) => x === a).length);
  }
  return ds;
}

export const gAt = (part, f) => (part.perFold ? part.perFold[f] : part.g);
/** per-fold group log-probabilities (-log2) for a partition: Float64Array(K*S). */
function foldNegLog(ds, f, part) {
  const g = gAt(part, f), K = part.K, S = ds.S, Tf = ds.T[f], agg = new Float64Array(K * S);
  for (const c of ds.Tnz[f]) { const gi = g[c]; if (gi < 0) continue; const o = c * S, oa = gi * S; for (let s = 0; s < S; s++) agg[oa + s] += Tf[o + s]; }
  const Lg = new Float64Array(K * S), p0 = ds.p0[f];
  for (let k = 0; k < K; k++) {
    const oa = k * S; let N = 0; for (let s = 0; s < ds.size[0]; s++) N += agg[oa + s];
    const inv = 1 / (N + SMOOTH_PSEUDO);
    for (let s = 0; s < S; s++) Lg[oa + s] = -Math.log2((agg[oa + s] + SMOOTH_PSEUDO * p0[s]) * inv);
  }
  return Lg;
}
/** lemma-weighted mean held-out cross-entropy (bits/token) of a partition: the fast class-level form. */
export function meanCE(ds, part) {
  let tot = 0; const S = ds.S;
  for (let f = 0; f < FOLDS; f++) {
    const Lg = foldNegLog(ds, f, part), g = gAt(part, f), Wf = ds.W[f], L0f = ds.L0[f];
    for (const c of ds.Wnz[f]) {
      const gi = g[c], o = c * S; let acc = 0;
      if (gi < 0) for (let s = 0; s < S; s++) acc += Wf[o + s] * L0f[s];
      else { const oa = gi * S; for (let s = 0; s < S; s++) acc += Wf[o + s] * Lg[oa + s]; }
      tot += acc;
    }
  }
  return tot;
}
/** per-unit held-out cross-entropy (bits/token), Float64Array(nU). */
export function ceUnits(ds, part) {
  const S = ds.S, out = new Float64Array(ds.nU), Lgs = [];
  for (let f = 0; f < FOLDS; f++) Lgs.push(foldNegLog(ds, f, part));
  for (let u = 0; u < ds.nU; u++) {
    const f = ds.unitFold[u], gi = gAt(part, f)[ds.unitClass[u]], base = u * S; let ce = 0;
    if (gi < 0) { const L0f = ds.L0[f]; for (let s = 0; s < S; s++) ce += ds.unitW[base + s] * L0f[s]; }
    else { const Lg = Lgs[f], oa = gi * S; for (let s = 0; s < S; s++) ce += ds.unitW[base + s] * Lg[oa + s]; }
    out[u] = ce;
  }
  return out;
}
export const gainOf = (ds, part) => ds.ceGlob - meanCE(ds, part);

// ── partitions and nulls ─────────────────────────────────────────────────────
export const partOf = (g, K) => ({ g: Int32Array.from(g), K: K ?? (Math.max(...g) + 1) });
/** N1: plain redeal of the class->act labels keeping the number of classes per act. */
export function redealPlain(eoG, rng) { const lab = Array.from(eoG); shuffleInPlace(lab, rng); return Int32Array.from(lab); }
/** N1b: acts permuted only among the classes of the SAME Levin major group (the multiset of acts per group is kept). */
function withinMajor(eoG, classMajor, { draws, seed = "N1b", onDraw }) {
  const byMajor = new Map();
  classMajor.forEach((m, c) => { (byMajor.get(m) ?? byMajor.set(m, []).get(m)).push(c); });
  const multi = [...byMajor.values()].filter((cs) => cs.length > 1);
  const rng = makeRng("EO-1", seed);
  const out = [];
  for (let d = 0; d < draws; d++) {
    const g = Int32Array.from(eoG);
    for (const cs of multi) { const lab = cs.map((c) => eoG[c]); shuffleInPlace(lab, rng); cs.forEach((c, i) => { g[c] = lab[i]; }); }
    out.push(onDraw ? onDraw(g, d) : g);
  }
  return out;
}
/** N1c: contiguous blocks of the Levin-ordered class list. Draws alternate family A (EO's size profile in random order) and B (random cut points). */
function contiguousBlocks(C, sizeProfile, { draws, seed = "N1c", onDraw }) {
  const rng = makeRng("EO-1", seed), K = sizeProfile.length, out = [];
  for (let d = 0; d < draws; d++) {
    const g = new Int32Array(C); let sizes;
    if (d % 2 === 0) { sizes = shuffleInPlace(sizeProfile.slice(), rng); }
    else {
      const cuts = new Set(); while (cuts.size < K - 1) cuts.add(1 + Math.floor(rng() * (C - 1)));
      const cs = [0, ...[...cuts].sort((a, b) => a - b), C]; sizes = cs.slice(1).map((c, i) => c - cs[i]);
    }
    let pos = 0; sizes.forEach((sz, k) => { for (let i = 0; i < sz; i++) g[pos++] = k; });
    out.push(onDraw ? onDraw(g, d) : g);
  }
  return out;
}

const majorOfId = (id) => Number(/-(\d+)(?:\.|$)/.exec(id)?.[1]);
const levinSort = (ids) => ids.slice().sort((a, b) => { const pa = /-(\d+(?:\.\d+)*)$/.exec(a)[1].split(".").map(Number), pb = /-(\d+(?:\.\d+)*)$/.exec(b)[1].split(".").map(Number); for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] ?? -1) - (pb[i] ?? -1); if (d) return d; } return a < b ? -1 : 1; });
/**
 * N1b. Design signature: withinMajorGroupPermutations(classToAct: {classId: act}, { draws, seed }) -> array of {classId: act} redeals in which acts are
 * permuted only among the classes of the SAME Levin major group. (Internal style: (eoG, classMajor, { draws, seed, onDraw }) over typed arrays.)
 */
export function withinMajorGroupPermutations(a, b, c) {
  if (a instanceof Int32Array || Array.isArray(a)) return withinMajor(a, b, c);
  const ids = levinSort(Object.keys(a)), act = Int32Array.from(ids, (id) => ACT_ORDER.indexOf(a[id])), major = Int32Array.from(ids, majorOfId);
  return withinMajor(act, major, { ...b, onDraw: (g) => Object.fromEntries(ids.map((id, i) => [id, ACT_ORDER[g[i]]])) });
}
/**
 * N1c. Design signature: contiguousLevinCoarsenings(classes: ids in Levin order or their count, { sizeProfile, draws, seed }) -> array of partitions (Int32Array of block ids
 * along the class list): family A uses EO's group-size profile in random block order, family B random cut points. (Internal style: (C, sizeProfile, { draws, seed, onDraw }).)
 */
export function contiguousLevinCoarsenings(classes, b, c) {
  if (typeof b === "number" || Array.isArray(b)) return contiguousBlocks(classes, b, c);
  const C = typeof classes === "number" ? classes : classes.length;
  return contiguousBlocks(C, b.sizeProfile, b);
}

/** the table-with-no-EO-input control: 8 contiguous Levin ranges in a fixed block order (K6). */
export function levinRangeTable(C, sizeProfile, order) { const g = new Int32Array(C); let pos = 0; for (const k of order) { for (let i = 0; i < sizeProfile[k]; i++) g[pos++] = k; } return g; }

// ── train-only agglomeration (merge cost = rise in train code length, bits) ──────
/** Coarsen the groups of `startGroup` (Int32Array over classes, -1 = none) by the train data of fold f; returns Map(k -> Int32Array over classes). */
export function agglomerate(ds, f, startGroup, ks) {
  const S = ds.S, Tf = ds.T[f];
  const gids = [...new Set(Array.from(startGroup).filter((g) => g >= 0))];
  let cnt = [], N = [], members = [];
  for (const gid of gids) {
    const v = new Float64Array(S); const mem = [];
    startGroup.forEach((g, c) => { if (g === gid) { mem.push(c); for (let s = 0; s < S; s++) v[s] += Tf[c * S + s]; } });
    let n = 0; for (let s = 0; s < ds.size[0]; s++) n += v[s];
    if (n > 0) { cnt.push(v); N.push(n); members.push(mem); }
  }
  // groups with no train mass are dropped: their classes stay -1 (the fold's global centroid)
  const n0 = cnt.length, act = Array.from({ length: n0 }, (_, i) => i);
  const xl = (x) => (x > 0 ? x * Math.log2(x) : 0);
  const codeLen = (v, n) => { let e = 0; for (let s = 0; s < S; s++) e += xl(v[s]); return n * Math.log2(n) - e / 4; };
  const H = cnt.map((v, i) => codeLen(v, N[i]));
  const D = new Float64Array(n0 * n0), tmp = new Float64Array(S);
  const cost = (i, j) => { for (let s = 0; s < S; s++) tmp[s] = cnt[i][s] + cnt[j][s]; return codeLen(tmp, N[i] + N[j]) - H[i] - H[j]; };
  for (let i = 0; i < n0; i++) for (let j = i + 1; j < n0; j++) D[i * n0 + j] = D[j * n0 + i] = cost(i, j);
  const out = new Map(), want = new Set(ks);
  const record = () => {
    const k = act.length;
    if (!want.has(k)) return;
    const g = new Int32Array(ds.C).fill(-1);
    act.forEach((i, gi) => members[i].forEach((c) => { g[c] = gi; }));
    // classes of start groups that had train mass are assigned; classes in dataless groups stay -1
    out.set(k, g);
  };
  record();
  while (act.length > Math.min(...ks, act.length)) {
    let bi = -1, bj = -1, best = Infinity;
    for (let a = 0; a < act.length; a++) { const i = act[a]; for (let b = a + 1; b < act.length; b++) { const j = act[b]; const d = D[i * n0 + j]; if (d < best) { best = d; bi = i; bj = j; } } }
    for (let s = 0; s < S; s++) cnt[bi][s] += cnt[bj][s];
    N[bi] += N[bj]; members[bi] = members[bi].concat(members[bj]); H[bi] = codeLen(cnt[bi], N[bi]);
    act.splice(act.indexOf(bj), 1);
    for (const k of act) if (k !== bi) D[bi * n0 + k] = D[k * n0 + bi] = cost(bi, k);
    record();
  }
  return out;
}
/** perFold partitions coarsened to k from a start partition (or from singleton classes when start is null). */
export function coarsenPartition(ds, start, k) {
  const perFold = [];
  for (let f = 0; f < FOLDS; f++) {
    const sg = start ? Int32Array.from(gAt(start, f)) : Int32Array.from({ length: ds.C }, (_, c) => c);
    const m = agglomerate(ds, f, sg, [k]);
    const g = m.get(k) ?? Int32Array.from(sg).fill(-1);
    perFold.push(g);
  }
  return { perFold, K: k };
}

// ═════════════════════════════════ EO-1 DATA AND STATISTICS ═════════════════════════════════
/** Real EO-1 dataset: UD_English-EWT train (fit) and the split file (held-out), VerbNet classes, the SUT's table. */
export function buildEo1Data(ctx, { stem = "eng", actTable = underTestActTable(), vn = loadVerbNet() } = {}) {
  const trainFile = trainPath(stem), heldFile = heldOutPath(ctx, stem);
  const shaTrain = pin(ctx, "train", trainFile), shaHeld = pin(ctx, `held-out:${ctx.split}`, heldFile);
  const train = readSentences(trainFile), held = readSentences(heldFile);
  const trainRecs = train.flatMap(verbTokenSymbols), heldRecs = held.flatMap(verbTokenSymbols);
  const tally = (key, recs) => { const m = new Map(); for (const r of recs) m.set(r[key], (m.get(r[key]) ?? 0) + 1); return m; };
  const top = (m, n, skip = []) => [...m].filter(([k]) => !skip.includes(k)).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n).map(([k]) => k);
  const alpha = {
    b1: [...top(tally("b1", trainRecs), FRAME_VOCAB), "other"],
    b2: [...[...tally("b2", trainRecs).keys()].sort(), "other"],
    b3: [...[...tally("b3", trainRecs).keys()].sort(), "other"],
    b4: [...top(tally("b4", trainRecs), OBL_VOCAB, ["none-obl", "none-case"]), "none-obl", "none-case", "other"],
  };
  const blocks = ["b1", "b2", "b3", "b4"], size = blocks.map((b) => alpha[b].length), off = [0, size[0], size[0] + size[1], size[0] + size[1] + size[2]];
  const index = blocks.map((b) => new Map(alpha[b].map((s, i) => [s, i])));
  const S = off[3] + size[3];
  const forms = actTable.forms;
  const lemSet = new Set([...trainRecs, ...heldRecs].map((r) => r.lemma).filter((l) => forms[l]));
  const lemList = [...lemSet].sort(), lemIdx = new Map(lemList.map((l, i) => [l, i]));
  const L = lemList.length, trainVec = new Float64Array(L * S), heldVec = new Float64Array(L * S);
  const bump = (vec, recs) => {
    for (const r of recs) {
      const l = lemIdx.get(r.lemma); if (l === undefined) continue;
      blocks.forEach((b, bi) => { const i = index[bi].get(r[b]) ?? index[bi].get("other"); vec[l * S + off[bi] + i] += 1; });
    }
  };
  bump(trainVec, trainRecs); bump(heldVec, heldRecs);
  const classes = vn.classes;
  const lemmas = lemList.map((lemma) => ({ lemma, cls: forms[lemma].primaryClass, fold: seedFrom({ lemma, seed: SEED }) % FOLDS, standing: forms[lemma].standing, nClasses: forms[lemma].classes.length, acts: forms[lemma].acts }));
  const eoAct = classes.map((c) => actTable.classToAct[c.id] ?? null);
  const ds = makeEo1Dataset({ lemmas, trainVec, heldVec, classes, off, size, eoAct });
  ds.alphabets = alpha;
  ds.meta = {
    stem, split: ctx.split, giverTrain: "UD_English-EWT train", trainSha256: shaTrain, heldSha256: shaHeld,
    actPriorSha256: actTable.sha256, verbnetSha256: vn.sha256, nTrainSentences: train.length, nHeldSentences: held.length,
    nTrainVerbTokens: trainRecs.length, nHeldVerbTokens: heldRecs.length, universe: L, scoringUnits: ds.nU,
    heldTokensInUnits: [...ds.unitIdx].reduce((a, l) => a + ds.nHeld[l], 0), classesOnDisk: classes.length, classesWithUnits: new Set(ds.unitClass).size,
    majorGroups: ds.nMajor, K: ds.K, eoActs: ds.eoActs, eoSizes: ds.eoSizes, emptyActs: ACT_ORDER.filter((a) => !ds.eoActs.includes(a)),
    contestedUnits: [...ds.unitIdx].filter((l) => lemmas[l].standing === "contested").length,
    foldsOfUnits: [0, 1, 2, 3, 4].map((f) => ds.unitFold.filter((x) => x === f).length),
  };
  const h = createHash("sha256"); h.update(trainVec); h.update(heldVec); h.update(lemList.join("|"));
  ds.fingerprint = h.digest("hex");
  return ds;
}
export const labelFreeGains = (ds) => {
  const LN = partOf(ds.classMajor, ds.nMajor), V = partOf(Int32Array.from({ length: ds.C }, (_, i) => i), ds.C);
  // lemma-own: the lemma's own train distribution (smoothed like a centroid) scored on its held-out tokens (label-free)
  let own = 0;
  for (let u = 0; u < ds.nU; u++) {
    const l = ds.unitIdx[u], f = ds.unitFold[u], p0 = ds.p0[f], N = ds.nTrain[l]; let ce = 0;
    for (let s = 0; s < ds.S; s++) ce += ds.unitW[u * ds.S + s] * -log2((ds.trainVec[l * ds.S + s] + p0[s]) / (N + SMOOTH_PSEUDO));
    own += ds.ceGlobUnits[u] - ce;
  }
  return { LN: gainOf(ds, LN), V311: gainOf(ds, V), lemmaOwn: own / ds.nU };
};

// ── S1: the structure-preserving nulls ────────────────────────────────────────
/** Draw the null mappings and record G (all draws) and per-unit CE for the first `bootDraws`. */
export function eo1Nulls(ds, { draws, bootDraws, keySuffix = "", plain = true }) {
  const K = ds.K, out = { draws, bootDraws };
  const run = (name, gen) => {
    const G = new Float64Array(draws), ceMat = new Float64Array(Math.min(bootDraws, draws) * ds.nU);
    gen((g, d) => {
      const part = { g, K };
      if (d < bootDraws) { const ce = ceUnits(ds, part); ceMat.set(ce, d * ds.nU); G[d] = ds.ceGlob - mean(ce); }
      else G[d] = ds.ceGlob - meanCE(ds, part);
      return 0;
    });
    out[name] = { G, ceMat };
  };
  if (plain) { const rng = makeRng("EO-1", "N1", keySuffix); run("N1", (cb) => { for (let d = 0; d < draws; d++) cb(redealPlain(ds.eoG, rng), d); }); }
  run("N1b", (cb) => withinMajorGroupPermutations(ds.eoG, ds.classMajor, { draws, seed: `N1b${keySuffix}`, onDraw: cb }));
  run("N1c", (cb) => contiguousLevinCoarsenings(ds.C, ds.eoSizes, { draws, seed: `N1c${keySuffix}`, onDraw: cb }));
  return out;
}
const pGE = (G, x) => { let k = 0; for (let i = 0; i < G.length; i++) if (G[i] >= x - 1e-12) k++; return (1 + k) / (G.length + 1); };
const medOf = (a) => median(Array.from(a));
const q95Of = (a) => quantile(a, 0.95);
/** S1 statistic and its bootstrap interval (lemma clusters; null medians from the first bootDraws draws). */
export function eo1S1(ds, nulls, ceEO, { boot = BOOT, rngKey = "S1" } = {}) {
  const GEO = ds.ceGlob - mean(ceEO);
  const medB = medOf(nulls.N1b.G), medC = medOf(nulls.N1c.G);
  const theta = GEO - Math.max(medB, medC);
  const out = {
    G_EO: GEO, N1: nulls.N1 ? { median: medOf(nulls.N1.G), q95: q95Of(nulls.N1.G), p: pGE(nulls.N1.G, GEO) } : null,
    N1b: { median: medB, q95: q95Of(nulls.N1b.G), p: pGE(nulls.N1b.G, GEO) }, N1c: { median: medC, q95: q95Of(nulls.N1c.G), p: pGE(nulls.N1c.G, GEO) },
    theta, ceGlobalBitsPerToken: ds.ceGlob, gainPercentOfGlobal: (100 * GEO) / ds.ceGlob,
  };
  const nB = Math.min(nulls.bootDraws, nulls.draws), nU = ds.nU, rng = makeRng("EO-1", rngKey, "boot");
  const reps = new Float64Array(boot), idx = new Int32Array(nU), mb = new Float64Array(nB), mc = new Float64Array(nB);
  for (let b = 0; b < boot; b++) {
    for (let i = 0; i < nU; i++) idx[i] = Math.floor(rng() * nU);
    let sg = 0, se = 0; for (let i = 0; i < nU; i++) { sg += ds.ceGlobUnits[idx[i]]; se += ceEO[idx[i]]; }
    const cg = sg / nU, GEOb = cg - se / nU;
    for (let d = 0; d < nB; d++) {
      let s1 = 0, s2 = 0; const o = d * nU;
      for (let i = 0; i < nU; i++) { s1 += nulls.N1b.ceMat[o + idx[i]]; s2 += nulls.N1c.ceMat[o + idx[i]]; }
      mb[d] = cg - s1 / nU; mc[d] = cg - s2 / nU;
    }
    const mbs = Float64Array.from(mb).sort(), mcs = Float64Array.from(mc).sort();
    reps[b] = GEOb - Math.max(quantileSorted(mbs, 0.5), quantileSorted(mcs, 0.5));
  }
  out.thetaCI = percentileCI(reps);
  out.bootstrap = { B: boot, unit: "scoring lemmas", nullMedianDraws: nB };
  return out;
}
/** Paired lemma bootstrap of mean(a - b) (per-unit CE vectors). */
export function pairedBootstrapMean(a, b, { boot = BOOT, rngKey = "paired" } = {}) {
  const n = a.length, rng = makeRng("EO-1", rngKey), reps = new Float64Array(boot), d = new Float64Array(n);
  for (let i = 0; i < n; i++) d[i] = a[i] - b[i];
  for (let t = 0; t < boot; t++) { let s = 0; for (let i = 0; i < n; i++) s += d[Math.floor(rng() * n)]; reps[t] = s / n; }
  return { est: mean(d), ci95: percentileCI(reps) };
}

// ── S2: the additive grid ─────────────────────────────────────────────────────
function gaussSolve(A, B, n, m) { // solves A X = B (A n x n, B n x m), in place copies
  const a = A.map((r) => r.slice()), b = B.map((r) => r.slice());
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[piv][c])) piv = r;
    [a[c], a[piv]] = [a[piv], a[c]]; [b[c], b[piv]] = [b[piv], b[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const f = a[r][c] / a[c][c]; if (f) { for (let k = c; k < n; k++) a[r][k] -= f * a[c][k]; for (let k = 0; k < m; k++) b[r][k] -= f * b[c][k]; } }
  }
  return b.map((r, i) => r.map((v) => v / a[i][i]));
}
/** The 9 projection matrices P_e of the additive model (mu + mode + domain) over the 8 cells that remain when cell e is empty. */
export function additiveProjections() {
  const P = [];
  for (let e = 0; e < 9; e++) {
    const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((c) => c !== e);
    const X = cells.map((c) => { const m = Math.floor(c / 3), d = c % 3; return [1, m === 1 ? 1 : 0, m === 2 ? 1 : 0, d === 1 ? 1 : 0, d === 2 ? 1 : 0]; });
    const XtX = Array.from({ length: 5 }, (_, i) => Array.from({ length: 5 }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0)));
    const Xt = Array.from({ length: 5 }, (_, i) => X.map((r) => r[i]));
    const inv = gaussSolve(XtX, Xt, 5, 8); // (XtX)^-1 Xt, 5 x 8
    P.push({ e, cells, P: X.map((r) => Float64Array.from({ length: 8 }, (_, k) => r.reduce((s, v, i) => s + v * inv[i][k], 0))) });
  }
  return P;
}
const PROJ = additiveProjections();
let PERMS = null;
function permutations8() {
  if (PERMS) return PERMS;
  const n = 8, out = new Uint8Array(40320 * 8), a = [0, 1, 2, 3, 4, 5, 6, 7], c = new Array(n).fill(0);
  let k = 0; const push = () => { for (let i = 0; i < n; i++) out[k * 8 + i] = a[i]; k++; };
  push(); let i = 0;
  while (i < n) { if (c[i] < i) { const j = i % 2 === 0 ? 0 : c[i]; [a[j], a[i]] = [a[i], a[j]]; push(); c[i]++; i = 0; } else { c[i] = 0; i++; } }
  if (k !== 40320) throw new Error("permutation enumeration failed");
  return (PERMS = out);
}
/** Gram quantities for the placement-invariant parts, from per-fold train and held-out centroid log-prob matrices (K x S each). */
export function s2Grams(VT, VH) {
  const K = VT[0].length, GTT = Array.from({ length: K }, () => new Float64Array(K)), GHT = Array.from({ length: K }, () => new Float64Array(K));
  let trHH = 0, TV = 0;
  for (let f = 0; f < VT.length; f++) {
    const S = VT[f][0].length;
    for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) {
      let tt = 0, ht = 0; for (let s = 0; s < S; s++) { tt += VT[f][a][s] * VT[f][b][s]; ht += VH[f][a][s] * VT[f][b][s]; }
      GTT[a][b] += tt; GHT[a][b] += ht;
    }
    const mu = new Float64Array(S); for (let a = 0; a < K; a++) for (let s = 0; s < S; s++) mu[s] += VH[f][a][s] / K;
    for (let a = 0; a < K; a++) for (let s = 0; s < S; s++) { trHH += VH[f][a][s] ** 2; TV += (VH[f][a][s] - mu[s]) ** 2; }
  }
  return { GTT, GHT, trHH, TV };
}
/** NA of ONE placement: e = the empty cell, perm = the act at each occupied cell (ascending cell order). */
export function s2NA(g, e, perm /* array/Uint8Array of 8 act indices */, off = 0) {
  const P = PROJ[e].P; let cross = 0, third = 0;
  for (let j = 0; j < 8; j++) {
    const Pj = P[j], aj = perm[off + j], hr = g.GHT[aj], tr = g.GTT[aj];
    for (let k = 0; k < 8; k++) { const ak = perm[off + k]; cross += Pj[k] * hr[ak]; third += Pj[k] * tr[ak]; }
  }
  // RSS = trHH - 2 sum_jk P_jk GHT[pi(j),pi(k)] + sum_kl P_kl GTT[pi(k),pi(l)]  (P symmetric idempotent)
  return (g.trHH - 2 * cross + third) / g.TV;
}
/** EO's own placement of its (up to 8) acts into the 3x3 grid: { e, perm } with perm indexing ds.eoActs. */
export function eoPlacement(eoActs) {
  const { grid, MODES, DOMAINS } = underTestOperatorGrid();
  const cellOfAct = new Map(eoActs.map((a, i) => [i, grid[a].mode ? MODES.indexOf(grid[a].mode) * 3 + DOMAINS.indexOf(grid[a].domain) : -1]));
  const used = new Set(cellOfAct.values()); if (used.size !== 8) throw new Error("S2 needs exactly 8 measured acts in distinct cells");
  const e = [0, 1, 2, 3, 4, 5, 6, 7, 8].find((c) => !used.has(c));
  const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((c) => c !== e);
  const perm = cells.map((c) => [...cellOfAct].find(([, cc]) => cc === c)[0]);
  return { e, perm };
}
/** per-fold train and held-out centroid log-prob matrices for EO's acts. multiplicity = per-unit resample counts (or null). */
export function s2Centroids(ds, multiplicity = null) {
  const K = ds.K, S = ds.S, VT = [], VH = [], part = { g: ds.eoG, K };
  for (let f = 0; f < FOLDS; f++) {
    const Lg = foldNegLog(ds, f, part);
    VT.push(Array.from({ length: K }, (_, a) => { const v = new Float64Array(S); for (let s = 0; s < S; s++) v[s] = -Lg[a * S + s]; return v; }));
    const H = Array.from({ length: K }, () => new Float64Array(S)), N = new Float64Array(K), NT = new Float64Array(K);
    for (const c of ds.Tnz[f]) { const gi = ds.eoG[c]; if (gi < 0) continue; for (let s = 0; s < ds.size[0]; s++) NT[gi] += ds.T[f][c * S + s]; }
    for (let u = 0; u < ds.nU; u++) {
      if (ds.unitFold[u] !== f) continue; const m = multiplicity ? multiplicity[u] : 1; if (!m) continue;
      const a = ds.eoG[ds.unitClass[u]]; if (a < 0) continue; const l = ds.unitIdx[u];
      for (let s = 0; s < S; s++) H[a][s] += m * ds.heldVec[l * S + s];
      N[a] += m * ds.nHeld[l];
    }
    // held-out centroid: the held-out MLE rescaled to the TRAIN centroid's effective sample size, so a symbol absent from both gets the same floor in T and H
    VH.push(H.map((h, a) => { const v = new Float64Array(S), p0 = ds.p0[f], sc = N[a] > 0 ? NT[a] / N[a] : 0; for (let s = 0; s < S; s++) v[s] = Math.log2((h[s] * sc + p0[s]) / (NT[a] + SMOOTH_PSEUDO)); return v; }));
  }
  return { VT, VH };
}
/** S2: the exact enumeration (362,880) and the lemma bootstrap (median over 500 fixed random placements). */
export function eo1S2(ds, { boot = BOOT, rngKey = "S2", nPlacementsBoot = 500, enumerate = true } = {}) {
  if (ds.K !== 8) return { gap: "S2 needs exactly 8 measured acts", K: ds.K };
  const { e: eE, perm: pE } = eoPlacement(ds.eoActs), perms = permutations8();
  const { VT, VH } = s2Centroids(ds), g = s2Grams(VT, VH);
  const NAeo = s2NA(g, eE, pE, 0);
  const out = { NA_EO: NAeo, placements: 9 * 40320 };
  if (enumerate) {
    const all = new Float64Array(9 * 40320); let k = 0, le = 0;
    for (let e = 0; e < 9; e++) for (let p = 0; p < 40320; p++) { const v = s2NA(g, e, perms, p * 8); all[k++] = v; if (v <= NAeo + 1e-12) le++; }
    out.p2 = le / all.length; out.medianNA = median(all); out.q05NA = quantile(all, 0.05); out.theta = out.medianNA - NAeo;
    let mn = Infinity; for (let i = 0; i < all.length; i++) if (all[i] < mn) mn = all[i]; out.minNA = mn;
  }
  // bootstrap
  const rng = makeRng("EO-1", rngKey, "boot"), fixed = [];
  for (let i = 0; i < nPlacementsBoot; i++) fixed.push([Math.floor(rng() * 9), Math.floor(rng() * 40320)]);
  const reps = new Float64Array(boot), mult = new Float64Array(ds.nU);
  for (let b = 0; b < boot; b++) {
    mult.fill(0); for (let i = 0; i < ds.nU; i++) mult[Math.floor(rng() * ds.nU)]++;
    const c = s2Centroids(ds, mult), gb = s2Grams(c.VT, c.VH);
    const eo = s2NA(gb, eE, pE, 0), nas = fixed.map(([e, p]) => s2NA(gb, e, perms, p * 8));
    reps[b] = median(nas) - eo;
  }
  out.thetaCI = percentileCI(reps);
  out.bootstrap = { B: boot, unit: "scoring lemmas", placementsForMedian: nPlacementsBoot };
  return out;
}

// ── S3: does the data want nine ──────────────────────────────────────────────────
function hingeFit(ks, ys) {
  let best = null;
  for (let b = ks[1]; b <= ks[ks.length - 2]; b++) {
    const X = ks.map((k) => [1, k, Math.max(0, k - b)]);
    const XtX = [0, 1, 2].map((i) => [0, 1, 2].map((j) => X.reduce((s, r) => s + r[i] * r[j], 0)));
    const Xty = [0, 1, 2].map((i) => [X.reduce((s, r, t) => s + r[i] * ys[t], 0)]);
    let beta; try { beta = gaussSolve(XtX, Xty, 3, 1).map((r) => r[0]); } catch { continue; }
    if (!beta.every(Number.isFinite)) continue;
    const sse = X.reduce((s, r, t) => s + (ys[t] - (beta[0] * r[0] + beta[1] * r[1] + beta[2] * r[2])) ** 2, 0);
    if (!best || sse < best.sse) best = { b, sse, beta };
  }
  return best;
}
export const S3_KS = Object.freeze(Array.from({ length: 39 }, (_, i) => i + 2));
export function eo1S3(ds, ceEO, { boot = BOOT, rngKey = "S3", withNullMedians = null } = {}) {
  const ks = [...new Set([...S3_KS, ds.K])].sort((a, b) => a - b);
  const perFoldMaps = [];
  for (let f = 0; f < FOLDS; f++) perFoldMaps.push(agglomerate(ds, f, Int32Array.from({ length: ds.C }, (_, c) => c), ks));
  const ceK = new Map();
  for (const k of ks) {
    const perFold = perFoldMaps.map((m) => m.get(k) ?? new Int32Array(ds.C).fill(-1));
    ceK.set(k, ceUnits(ds, { perFold, K: k }));
  }
  const CE = S3_KS.map((k) => mean(ceK.get(k))), kmin = S3_KS[CE.indexOf(Math.min(...CE))];
  const ceD9 = ceK.get(ds.K), GD9 = ds.ceGlob - mean(ceD9), GEO = ds.ceGlob - mean(ceEO);
  const out = { G_D9: GD9, G_EO: GEO, CEbyK: Object.fromEntries(S3_KS.map((k, i) => [k, CE[i]])), kMin: kmin };
  const rng = makeRng("EO-1", rngKey, "boot"), nU = ds.nU, idx = new Int32Array(nU), reps = [], knees = [], kmins = [], kstars = [];
  const rdef = GD9 >= SESOI["EO-1.rivals"].value;
  const ratio = [];
  for (let b = 0; b < boot; b++) {
    for (let i = 0; i < nU; i++) idx[i] = Math.floor(rng() * nU);
    const cb = S3_KS.map((k) => { const v = ceK.get(k); let s = 0; for (let i = 0; i < nU; i++) s += v[idx[i]]; return s / nU; });
    let sg = 0, se = 0, s9 = 0; for (let i = 0; i < nU; i++) { sg += ds.ceGlobUnits[idx[i]]; se += ceEO[idx[i]]; s9 += ceD9[idx[i]]; }
    const gEO = (sg - se) / nU, g9 = (sg - s9) / nU;
    if (g9 > 1e-9) ratio.push(gEO / g9);
    knees.push(hingeFit(S3_KS, cb)?.b ?? NaN);
    const m = Math.min(...cb), km = S3_KS[cb.indexOf(m)]; kmins.push(km); reps.push(cb[S3_KS.indexOf(km)]);
  }
  const seMin = sd(reps);
  const kStar = S3_KS.find((k, i) => CE[i] <= Math.min(...CE) + seMin);
  const kneeFit = hingeFit(S3_KS, CE);
  out.kStar1SE = kStar; out.kneePoint = kneeFit?.b ?? null; out.kneeCI = percentileCI(knees.filter(Number.isFinite));
  out.kneeNearNine = out.kneeCI[0] <= ds.K + 1 && out.kneeCI[1] >= ds.K;
  if (rdef) { out.r = GEO / GD9; out.rCI = percentileCI(ratio); out.rExcludedResamples = boot - ratio.length; }
  else { out.r = null; out.rGap = `G(D9) = ${GD9.toFixed(4)} bits is below the 0.02-bit rival SESOI: the capture ratio is undefined (typed gap)`; }
  if (withNullMedians && rdef) out.rNull = { N1b: withNullMedians.N1b / GD9, N1c: withNullMedians.N1c / GD9 };
  out.D9 = ceD9;
  return out;
}

// ── the rivals scored on the same per-unit CE ─────────────────────────────────────
export function eo1Rivals(ds, ceEO, { boot = BOOT, s3 = null } = {}) {
  const alt = {}; const sRiv = SESOI["EO-1.rivals"].value;
  const rec = (name, part, extra = {}) => { const ce = ceUnits(ds, part); alt[name] = { G: ds.ceGlob - mean(ce), k: part.K, ...extra }; return ce; };
  // P3: Peirce valence from VerbNet frames, EO coarsened to 3
  const val = Int32Array.from(ds.classes, (c) => (c.valency == null ? -1 : c.valency - 1));
  const ceP3 = rec("P3", { g: val, K: 3 }, { role: roleOf("P3") });
  const eo3 = coarsenPartition(ds, { g: ds.eoG, K: ds.K }, 3), ceEO3 = rec("EO@3", eo3, { note: "EO coarsened to 3 by train-only agglomeration" });
  alt.P3.minusEO3 = pairedBootstrapMean(ceP3, ceEO3, { boot, rngKey: "P3" });
  alt.P3.eoBeatsBySesoi = alt.P3.minusEO3.ci95[0] > sRiv;
  // EO's own coarser groupings, printed
  const { grid, MODES, DOMAINS } = underTestOperatorGrid();
  const m3 = Int32Array.from(ds.eoG, (a) => (a < 0 ? -1 : MODES.indexOf(grid[ds.eoActs[a]].mode))), d3 = Int32Array.from(ds.eoG, (a) => (a < 0 ? -1 : DOMAINS.indexOf(grid[ds.eoActs[a]].domain)));
  rec("EO.mode3", { g: m3, K: 3 }, { note: "EO's own mode grouping (printed)" }); rec("EO.domain3", { g: d3, K: 3 }, { note: "EO's own domain grouping (printed)" });
  // reference partitions at equal k
  const L9 = coarsenPartition(ds, { g: ds.classMajor, K: ds.nMajor }, ds.K); rec("L9", L9, { role: roleOf("L9") });
  rec("LN", partOf(ds.classMajor, ds.nMajor), { role: roleOf("LN"), note: "native k: printed only" });
  rec("V311", partOf(Int32Array.from({ length: ds.C }, (_, i) => i), ds.C), { role: roleOf("V311"), note: "native k: printed only" });
  if (s3) alt.D9 = { G: s3.G_D9, k: ds.K, role: roleOf("D9") };
  alt.EO = { G: ds.ceGlob - mean(ceEO), k: ds.K };
  return alt;
}

// ═════════════════════════════════ EO-1 CONTROLS, PLANTED WORLDS, POWER ═════════════════════════════════
function globalBlocks(ds) {
  if (ds._pg) return ds._pg;
  const S = ds.S, c = new Float64Array(S);
  for (let l = 0; l < ds.L; l++) for (let s = 0; s < S; s++) c[s] += ds.trainVec[l * S + s];
  const p = new Float64Array(S);
  for (let b = 0; b < ds.off.length; b++) { let N = 0; for (let s = ds.off[b]; s < ds.off[b] + ds.size[b]; s++) N += c[s]; for (let s = ds.off[b]; s < ds.off[b] + ds.size[b]; s++) p[s] = (c[s] + 1 / ds.size[b]) / (N + 1); }
  return (ds._pg = p);
}
const softmaxBlocks = (y, ds, out) => {
  for (let b = 0; b < ds.off.length; b++) {
    let mx = -Infinity; for (let s = ds.off[b]; s < ds.off[b] + ds.size[b]; s++) if (y[s] > mx) mx = y[s];
    let z = 0; for (let s = ds.off[b]; s < ds.off[b] + ds.size[b]; s++) { out[s] = Math.exp(y[s] - mx); z += out[s]; }
    for (let s = ds.off[b]; s < ds.off[b] + ds.size[b]; s++) out[s] /= z;
  }
};
const countsFor = (n, p, ds, vec, base, rng) => {
  for (let b = 0; b < ds.off.length; b++) {
    const probs = p.subarray(ds.off[b], ds.off[b] + ds.size[b]), m = multinomial(n, probs, rng);
    for (let s = 0; s < ds.size[b]; s++) vec[base + ds.off[b] + s] = m[s];
  }
};
/**
 * A planted EO-1 world on the REAL units, class sizes and token counts. A lemma's log-ratio to the global block
 * distribution = major-group + class + lemma Gaussian components (sig.M, sig.C, sig.L; matched label-free to real gains)
 * + gamma times a group effect along EO's own partition (class-coherent). structure "group": independent group vectors;
 * "additive": mode + domain vectors (a planted 3x3 organisation). scale multiplies every token count.
 */
export function plantEo1World(ds, { sig, gamma = 0, scale = 1, structure = "group", key }) {
  const rng = makeRng("EO-1", "plant", key), S = ds.S, K = ds.K, pg = globalBlocks(ds), lpg = Float64Array.from(pg, Math.log);
  const nrm = (sd) => { const v = new Float64Array(S); for (let s = 0; s < S; s++) v[s] = sd * gauss(rng); return v; };
  const aM = Array.from({ length: ds.nMajor }, () => nrm(sig.M)), bC = Array.from({ length: ds.C }, () => nrm(sig.C));
  let eta;
  if (structure === "additive") {
    const { grid, MODES, DOMAINS } = underTestOperatorGrid();
    const al = Array.from({ length: 3 }, () => nrm(Math.SQRT1_2)), be = Array.from({ length: 3 }, () => nrm(Math.SQRT1_2));
    eta = ds.eoActs.map((a) => { const v = new Float64Array(S), m = MODES.indexOf(grid[a].mode), d = DOMAINS.indexOf(grid[a].domain); for (let s = 0; s < S; s++) v[s] = al[m][s] + be[d][s]; return v; });
  } else eta = Array.from({ length: K }, () => nrm(1));
  const trainVec = new Float64Array(ds.L * S), heldVec = new Float64Array(ds.L * S), y = new Float64Array(S), p = new Float64Array(S);
  for (let l = 0; l < ds.L; l++) {
    const c = ds.lemmaClass[l], m = ds.classMajor[c], g = ds.eoG[c];
    for (let s = 0; s < S; s++) y[s] = lpg[s] + aM[m][s] + bC[c][s] + sig.L * gauss(rng) + (g >= 0 ? gamma * eta[g][s] : 0);
    softmaxBlocks(y, ds, p);
    countsFor(Math.round(ds.nTrain[l] * scale), p, ds, trainVec, l * S, rng);
    countsFor(Math.round(ds.nHeld[l] * scale), p, ds, heldVec, l * S, rng);
  }
  const w = makeEo1Dataset({ lemmas: ds.lemmas, trainVec, heldVec, classes: ds.classes, off: ds.off, size: ds.size, eoAct: ds.eoAct, unitMask: ds.unitMask });
  w.alphabets = ds.alphabets; return w;
}
/** Control (ii): behaviour DISTRIBUTIONS attached to random other lemmas (class labels kept, per-lemma token counts kept). */
export function permuteBehaviour(ds, key) {
  const rng = makeRng("EO-1", "permute", key), S = ds.S, donors = [], pg = globalBlocks(ds);
  for (let l = 0; l < ds.L; l++) if (ds.nTrain[l] >= 5) donors.push(l);
  const trainVec = new Float64Array(ds.L * S), heldVec = new Float64Array(ds.L * S), p = new Float64Array(S);
  for (let l = 0; l < ds.L; l++) {
    let j = donors[Math.floor(rng() * donors.length)]; if (j === l) j = donors[(donors.indexOf(j) + 1) % donors.length];
    for (let b = 0; b < ds.off.length; b++) for (let s = ds.off[b]; s < ds.off[b] + ds.size[b]; s++) p[s] = (ds.trainVec[j * S + s] + pg[s]) / (ds.nTrain[j] + 1);
    countsFor(Math.round(ds.nTrain[l]), p, ds, trainVec, l * S, rng); countsFor(Math.round(ds.nHeld[l]), p, ds, heldVec, l * S, rng);
  }
  const w = makeEo1Dataset({ lemmas: ds.lemmas, trainVec, heldVec, classes: ds.classes, off: ds.off, size: ds.size, eoAct: ds.eoAct, unitMask: ds.unitMask });
  w.alphabets = ds.alphabets; return w;
}
/** Match the three label-free real gains (Levin major group native k, native class, lemma-own) by coordinate bisection on (M, C, L). */
export function calibrateSigmas(ds, real = labelFreeGains(ds), { passes = 3, iters = 9, reps = 2 } = {}) {
  const sig = { M: 0.3, C: 0.3, L: 0.5 };
  const gains = (sg) => { const acc = { LN: 0, V311: 0, lemmaOwn: 0 }; for (let r = 0; r < reps; r++) { const g = labelFreeGains(plantEo1World(ds, { sig: sg, gamma: 0, key: `sigma${r}` })); for (const k in acc) acc[k] += g[k] / reps; } return acc; };
  for (let p = 0; p < passes; p++) for (const [coord, tgt] of [["M", "LN"], ["C", "V311"], ["L", "lemmaOwn"]]) {
    let lo = 0, hi = 3;
    for (let i = 0; i < iters; i++) { const mid = (lo + hi) / 2; sig[coord] = mid; if (gains(sig)[tgt] < real[tgt]) lo = mid; else hi = mid; }
    sig[coord] = (lo + hi) / 2;
  }
  const fin = gains(sig);
  return { sig, real, matched: fin, residual: Object.fromEntries(Object.keys(real).map((k) => [k, fin[k] - real[k]])) };
}

// ── controls built to fail, on the real structure ────────────────────────────────
function firstLetterTable(ds) {
  const order = ds.classes.map((c, i) => [c.id, i]).sort((a, b) => (a[0] < b[0] ? -1 : 1)), g = new Int32Array(ds.C); let pos = 0;
  ds.eoSizes.forEach((sz, k) => { for (let i = 0; i < sz; i++) g[order[pos++][1]] = k; });
  return g;
}
export function eo1Controls(ds, nulls, { s1 = null, nCtrl = 40 } = {}) {
  const K = ds.K, out = [], ge = (G, x) => pGE(G, x);
  // (i) class->act by the first letter of the class name
  const gFL = gainOf(ds, { g: firstLetterTable(ds), K }), pb = ge(nulls.N1b.G, gFL), pc = ge(nulls.N1c.G, gFL);
  out.push({ id: "i-first-letter", expected: "no gain: not both p_b and p_c <= alpha", observed: { G: gFL, pb, pc }, survived: pb <= ALPHA && pc <= ALPHA });
  // (iii) a table from contiguous Levin ranges with NO EO input (K6): passes plain N1, does not beat N1b/N1c at more than alpha
  const rng = makeRng("EO-1", "ctrl-levin"), tabs = [];
  for (let r = 0; r < nCtrl; r++) {
    const order = shuffleInPlace(Array.from({ length: K }, (_, i) => i), rng), g = levinRangeTable(ds.C, ds.eoSizes, order), G = gainOf(ds, { g, K });
    tabs.push({ G, pN1: nulls.N1 ? ge(nulls.N1.G, G) : null, pb: ge(nulls.N1b.G, G), pc: ge(nulls.N1c.G, G) });
  }
  const hitsPb = tabs.filter((t) => t.pb <= ALPHA).length, hitsPc = tabs.filter((t) => t.pc <= ALPHA).length, passN1 = nulls.N1 ? tabs.filter((t) => t.pN1 <= ALPHA).length : null;
  out.push({ id: "iii-levin-ranges (K6)", expected: "passes plain N1 (vacuity); not rejected as beating N1b or N1c at more than alpha", observed: { tables: nCtrl, passN1, hitsPb, hitsPc, medianG: median(tabs.map((t) => t.G)) },
    survived: rejectsRateLE(hitsPb, nCtrl) || rejectsRateLE(hitsPc, nCtrl), calibrationReproduced: nulls.N1 ? passN1 / nCtrl >= 0.5 : null });
  // (iv) EO's own acts redealt WITHIN major groups (draws of N1b held out from the null set): p_b <= alpha no more often than alpha
  const draws = withinMajorGroupPermutations(ds.eoG, ds.classMajor, { draws: 100, seed: "N1b-ctrl-iv", onDraw: (g) => gainOf(ds, { g, K }) });
  const hits = draws.filter((G) => ge(nulls.N1b.G, G) <= ALPHA).length;
  out.push({ id: "iv-eo-within-major-groups", expected: "p_b <= alpha at rate <= alpha", observed: { draws: 100, hits }, survived: rejectsRateLE(hits, 100) });
  return out;
}
/** Control (ii) on a behaviour-permuted dataset: S1 and S2 must read nothing (reduced draws, declared). */
export function eo1ControlPermuted(ds, { draws = 999 } = {}) {
  const w = permuteBehaviour(ds, "ii"), nulls = eo1Nulls(w, { draws, bootDraws: Math.min(199, draws), plain: false, keySuffix: "-ii" });
  const ceEO = ceUnits(w, { g: w.eoG, K: w.K }), s1 = eo1S1(w, nulls, ceEO, { boot: 500, rngKey: "ctrl-ii" });
  const s2 = eo1S2(w, { boot: 0 });
  const pass1 = s1.N1b.p <= ALPHA && s1.N1c.p <= ALPHA && s1.theta >= SESOI["EO-1.S1"].value;
  const pass2 = s2.p2 <= ALPHA && s2.theta >= SESOI["EO-1.S2"].value;
  return { id: "ii-behaviour-permuted", expected: "S1 and S2 read nothing", observed: { G_EO: s1.G_EO, pb: s1.N1b.p, pc: s1.N1c.p, theta1: s1.theta, p2: s2.p2, theta2: s2.theta }, survived: pass1 || pass2 };
}

// ── the power card ───────────────────────────────────────────────────────────────
const GAMMA_GRID = Object.freeze([0, 0.05, 0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 1.0, 1.5, 2.0, 3.0]);
/** gamma whose mean estimate hits `target` by linear interpolation of the calibration grid (first crossing). */
function solveGamma(grid, target) {
  const base = grid[0].est;
  if (target < base - 1e-9) return { gamma: 0, reachable: false, reason: `target ${target.toFixed(4)} is below the zero-effect baseline ${base.toFixed(4)} (the world's class locality alone already exceeds it)` };
  if (target <= base + 1e-9) return { gamma: 0, reachable: true };
  for (let i = 1; i < grid.length; i++) if (grid[i].est >= target) { const a = grid[i - 1], b = grid[i]; return { gamma: a.gamma + ((target - a.est) / (b.est - a.est || 1)) * (b.gamma - a.gamma), reachable: true }; }
  return { gamma: grid[grid.length - 1].gamma, reachable: false, reason: `target ${target.toFixed(4)} is not reached within gamma <= ${grid[grid.length - 1].gamma} (maximum mean estimate ${grid[grid.length - 1].est.toFixed(4)})` };
}
const cachePath = (ctx, name, fp) => path.join(ctx.outDir, "power", `${name}-${ctx.split}-${sha256(`${fp}|${ctx.headerSha}|${EO_CLAIMS_VERSION}`).slice(0, 16)}.json`);
function readCache(file) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } }
function writeCache(file, obj) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(obj)); }
/** Generic power trio runner. plant(gamma, scale, key) -> world; point(world) -> number; replicate(world) -> {est, ci, ...}. */
function powerTrio({ plant, point, replicate, s, targets, R, Rcal, hitUp, hitDown, hitTiny, hitZero, log }) {
  const grid = GAMMA_GRID.map((gamma) => { let acc = 0; for (let r = 0; r < Rcal; r++) acc += point(plant(gamma, 1, `cal${r}`)) / Rcal; return { gamma, est: acc }; });
  const refine = (g, target) => {            // one secant correction at fresh seeds: calibration noise would otherwise mislabel the worlds
    if (!g.reachable || g.gamma === 0) return g;
    let est = 0; for (let r = 0; r < Rcal; r++) est += point(plant(g.gamma, 1, `ref${r}`)) / Rcal;
    const base = grid[0].est, num = target - base, den = est - base;
    return den > 1e-9 && Math.abs(den / num - 1) > 0.1 ? { ...g, gamma: Math.min(GAMMA_GRID[GAMMA_GRID.length - 1], g.gamma * (num / den)), refinedFrom: g.gamma, refinementEst: est } : { ...g, refinementEst: est };
  };
  const gUp = refine(solveGamma(grid, targets.up), targets.up), gDown = refine(solveGamma(grid, targets.down), targets.down), gTiny = solveGamma(grid, targets.tiny);
  const run = (g, scale, tag, hit) => {
    if (!g.reachable) return { hits: 0, n: R, unreachable: true, reason: g.reason, meanEst: null };
    let hits = 0; const ests = [];
    for (let r = 0; r < R; r++) { const rep = replicate(plant(g.gamma, scale, `${tag}${r}`)); ests.push(rep.est); if (hit(rep)) hits++; }
    return { hits, n: R, meanEst: mean(ests.filter(Number.isFinite)), sdEst: sd(ests.filter(Number.isFinite)) };
  };
  const up = run(gUp, 1, "up", hitUp), down = run(gDown, 1, "down", hitDown), tiny = run(gTiny, 10, "tiny", hitTiny), zero = run({ gamma: 0, reachable: true }, 1, "zero", hitZero);
  log?.(`trio ${JSON.stringify({ up, down, tiny, zero })}`);
  const unreachable = [["up", up], ["down", down], ["tiny", tiny]].filter(([, w]) => w.unreachable).map(([k, w]) => `${k}: ${w.reason}`);
  const gate = powerGate({ up, down, tiny: tiny.unreachable ? { hits: 0, n: R } : tiny, reps: R });
  const zeroRejected = rejectsRateLE(zero.hits, zero.n);
  return { grid, gammas: { up: gUp, down: gDown, tiny: gTiny }, targets, up: gate.up, down: gate.down, tiny: gate.tiny, zero: { ...zero, rejectedAsLEalpha: zeroRejected }, P_up: gate.P_up && !up.unreachable, P_down: gate.P_down && !down.unreachable, tinyOk: gate.tinyOk, zeroOk: !zeroRejected, unreachable, pass: gate.pass && !zeroRejected && unreachable.length === 0 };
}
/** Power curve at multiples of s (only when P_up fails): smallest tested multiple with P(lower bound > s) >= 0.8 is the MDE estimate. */
function powerCurve({ plant, replicate, grid, s, multiples = [1, 2, 3, 4, 6, 8], R = 20, hitUp }) {
  const out = [];
  for (const m of multiples) {
    const g = solveGamma(grid, m * s); if (!g.reachable) { out.push({ multiple: m, reachable: false, reason: g.reason }); continue; }
    let hits = 0; for (let r = 0; r < R; r++) if (hitUp(replicate(plant(g.gamma, 1, `curve${m}-${r}`)))) hits++;
    out.push({ multiple: m, theta: m * s, rate: hits / R, n: R });
  }
  const first = out.find((o) => o.rate >= 0.8);
  return { curve: out, mde: first ? { multiple: first.multiple, theta: first.theta } : null };
}
export function eo1PowerCard(ds, ctx, { log = null, force = false } = {}) {
  const file = cachePath(ctx, "eo1-power", `${ds.fingerprint}|${POWER_REPS.eo1}|${ctx.quick}`);
  if (!force) { const c = readCache(file); if (c) return { ...c, cached: true, cacheFile: file }; }
  const t0 = Date.now(), R = ctx.quick ? 8 : POWER_REPS.eo1, Rcal = ctx.quick ? 2 : 8, D = POWER_DRAWS.eo1, B = POWER_BOOT, nb = Math.min(199, D);
  const cal = calibrateSigmas(ds); log?.(`sigma calibration ${JSON.stringify(cal.sig)} residual ${JSON.stringify(cal.residual)}`);
  const sig = cal.sig, s1 = SESOI["EO-1.S1"].value, s2 = SESOI["EO-1.S2"].value, s3 = SESOI["EO-1.S3"].value;
  const plantG = (g, sc, key) => plantEo1World(ds, { sig, gamma: g, scale: sc, structure: "group", key });
  const plantA = (g, sc, key) => plantEo1World(ds, { sig, gamma: g, scale: sc, structure: "additive", key });
  // S1
  const pointS1 = (w) => { const n = eo1Nulls(w, { draws: 199, bootDraws: 0, plain: false, keySuffix: "-cal" }); return (w.ceGlob - meanCE(w, { g: w.eoG, K: w.K })) - Math.max(medOf(n.N1b.G), medOf(n.N1c.G)); };
  const repS1 = (w) => { const n = eo1Nulls(w, { draws: D, bootDraws: nb, plain: false, keySuffix: "-pw" }); const r = eo1S1(w, n, ceUnits(w, { g: w.eoG, K: w.K }), { boot: B, rngKey: "pw" }); return { est: r.theta, ci: r.thetaCI, pb: r.N1b.p, pc: r.N1c.p }; };
  const S1 = powerTrio({ plant: plantG, point: pointS1, replicate: repS1, s: s1, targets: { up: 2 * s1, down: 0.5 * s1, tiny: 0.1 * s1 }, R, Rcal, log,
    hitUp: (r) => r.ci[0] > s1, hitDown: (r) => r.ci[1] < s1, hitTiny: (r) => r.ci[0] > s1, hitZero: (r) => r.pb <= ALPHA && r.pc <= ALPHA });
  if (!S1.P_up) S1.curve = powerCurve({ plant: plantG, replicate: repS1, grid: S1.grid, s: s1, hitUp: (r) => r.ci[0] > s1 });
  log?.(`S1 power done ${(Date.now() - t0) / 1000}s: ${JSON.stringify({ P_up: S1.P_up, P_down: S1.P_down, tinyOk: S1.tinyOk, zeroOk: S1.zeroOk })}`);
  // S2
  const pointS2 = (w) => eo1S2(w, { boot: 0 }).theta;
  const repS2 = (w) => { const r = eo1S2(w, { boot: B }); return { est: r.theta, ci: r.thetaCI, p2: r.p2 }; };
  const S2 = powerTrio({ plant: plantA, point: pointS2, replicate: repS2, s: s2, targets: { up: 2 * s2, down: 0.5 * s2, tiny: 0.1 * s2 }, R, Rcal, log,
    hitUp: (r) => r.ci[0] > s2, hitDown: (r) => r.ci[1] < s2, hitTiny: (r) => r.ci[0] > s2, hitZero: (r) => r.p2 <= ALPHA });
  log?.(`S2 power done ${(Date.now() - t0) / 1000}s: ${JSON.stringify({ P_up: S2.P_up, P_down: S2.P_down, tinyOk: S2.tinyOk, zeroOk: S2.zeroOk })}`);
  // S3 (capture ratio r): fewer replicates (agglomeration is the costly step)
  const R3 = ctx.quick ? 4 : Math.max(10, Math.floor(R / 2));
  const pointS3 = (w) => { const ce = ceUnits(w, { g: w.eoG, K: w.K }); const r = eo1S3(w, ce, { boot: 0 }); return r.r ?? NaN; };
  const repS3 = (w) => { const ce = ceUnits(w, { g: w.eoG, K: w.K }); const r = eo1S3(w, ce, { boot: Math.min(B, 200), rngKey: "pw3" }); return { est: r.r ?? NaN, ci: r.rCI ?? [NaN, NaN] }; };
  const S3 = powerTrio({ plant: plantG, point: (w) => { const v = pointS3(w); return Number.isFinite(v) ? v : 0; }, replicate: repS3, s: s3, targets: { up: 2 * s3, down: 0.5 * s3, tiny: 0.1 * s3 }, R: R3, Rcal: Math.min(Rcal, 4), log,
    hitUp: (r) => r.ci[0] > s3, hitDown: (r) => r.ci[1] < s3, hitTiny: (r) => r.ci[0] > s3, hitZero: () => false });
  log?.(`S3 power done ${(Date.now() - t0) / 1000}s: ${JSON.stringify({ P_up: S3.P_up, P_down: S3.P_down, tinyOk: S3.tinyOk })}`);
  const card = { schema: "EO1PowerCard@1", split: ctx.split, fingerprint: ds.fingerprint, reps: { R, R3, Rcal, D, B, bootDraws: nb }, sigmaCalibration: cal, S1, S2, S3, seconds: (Date.now() - t0) / 1000, headerSha: ctx.headerSha, planted: "real units, class sizes and token counts; hierarchical log-ratio world; group effect along EO's own partition (class-coherent)" };
  writeCache(file, card);
  return { ...card, cached: false, cacheFile: file };
}

// ═════════════════════════════════ EO-1 RUNNER ═════════════════════════════════
export const HOLM_KEYS = Object.freeze(["S1b", "S1c", "S2", "O1H1", "O1H2", "O2H1", "O2H2", "EO3r1", "EO3r2"]);
/** Holm over the battery's nine primary p-values; a slot not supplied is p = 1 (conservative, deterministic). */
export function holmBattery(ps) {
  const arr = HOLM_KEYS.map((k) => (Number.isFinite(ps[k]) ? ps[k] : 1)), res = holmStepDown(arr, ALPHA);
  return Object.fromEntries(HOLM_KEYS.map((k, i) => [k, res[i]]));
}
const ser = (o) => JSON.parse(JSON.stringify(o, (k, v) => (v instanceof Float64Array || v instanceof Int32Array ? undefined : typeof v === "number" && !Number.isFinite(v) ? null : v)));
const STEEL_EO1 = "The strongest reading is not that verbs are 'about' operators but that the PARTITION of VerbNet classes into the table's groups carries behavioural information that a grouping respecting Levin neighbourhoods alone does not, and that the 3x3 (mode, domain) arrangement of the nine is not arbitrary. Concessions from EO's own file: grain is absent at this level; REC enters only through alt readings (recSparse), a real absence.";
function sensitivityOf(args, s) { const mk = (m) => minimumEffectVerdict({ ...args, sesoi: s * m }).verdict; return { halfSesoi: mk(0.5), registered: mk(1), doubleSesoi: mk(2), printedNotSelected: true }; }

export function runEo1(ctx, { log = null, ds = null, powerCard = null, nDraws = DRAWS, boot = BOOT } = {}) {
  registryLint();
  const t0 = Date.now();
  ds ??= buildEo1Data(ctx);
  const power = powerCard ?? eo1PowerCard(ds, ctx, { log });
  log?.(`power card ${power.cached ? "loaded from cache" : "computed"}: S1 ${power.S1.pass} S2 ${power.S2.pass} S3 ${power.S3.pass}`);
  // the null distributions and the controls are instrument properties, not EO's statistic: computed whatever the gate says
  const nulls = eo1Nulls(ds, { draws: nDraws, bootDraws: Math.min(999, nDraws) });
  const controls = [...eo1Controls(ds, nulls), eo1ControlPermuted(ds)];
  const controlsOk = controls.every((c) => !c.survived) && controls.find((c) => c.id.startsWith("iii"))?.calibrationReproduced !== false;
  const nullFloor = { N1: { median: medOf(nulls.N1.G), q95: q95Of(nulls.N1.G) }, N1b: { median: medOf(nulls.N1b.G), q95: q95Of(nulls.N1b.G) }, N1c: { median: medOf(nulls.N1c.G), q95: q95Of(nulls.N1c.G) },
    note: "Gain G (bits per held-out verb token) a mapping must exceed; instrument property, independent of EO's own value" };
  const bridge = EO_SENTENCES["EO-1"].licensed ? "licensed" : "unlicensed";
  const subTests = {}, statistic = {}, alt = {};
  const part = { g: ds.eoG, K: ds.K }, ceEO = power.S1.pass || power.S2.pass || power.S3.pass ? ceUnits(ds, part) : null;
  const sGate = { S1: power.S1.pass, S2: power.S2.pass, S3: power.S3.pass };
  const withheld = (g) => ({ withheld: true, reason: `power card ${g} failed (P_up ${power[g].P_up}, P_down ${power[g].P_down}, tinyOk ${power[g].tinyOk}); the statistic is not computed on real data (no peek)` });
  let s1r = null, s2r = null, s3r = null;
  if (sGate.S1) { s1r = eo1S1(ds, nulls, ceEO, { boot }); Object.assign(alt, eo1Rivals(ds, ceEO, { boot, s3: null })); } else statistic.S1 = withheld("S1");
  if (sGate.S2) s2r = eo1S2(ds, { boot }); else statistic.S2 = withheld("S2");
  if (sGate.S3) { s3r = eo1S3(ds, ceEO, { boot, withNullMedians: { N1b: nullFloor.N1b.median, N1c: nullFloor.N1c.median } }); alt.D9 = { G: s3r.G_D9, k: ds.K, role: "reference" }; } else statistic.S3 = withheld("S3");
  const hb = holmBattery({ S1b: s1r?.N1b.p, S1c: s1r?.N1c.p, S2: s2r?.p2 });
  const consumed = false;
  // S1
  if (s1r) {
    const sA = SESOI["EO-1.S1"].value;
    const mustBeatOk = alt.P3.eoBeatsBySesoi === true && s1r.G_EO - s1r.N1b.q95 >= sA && s1r.G_EO - s1r.N1c.q95 >= sA;
    const args = { theta: s1r.theta, ci95: s1r.thetaCI, sesoi: sA, powerUp: power.S1.P_up, powerDown: power.S1.P_down, tinyOk: power.S1.tinyOk && power.S1.zeroOk, controlsOk, nullOk: hb.S1b.reject && hb.S1c.reject, mustBeatOk, signGate: null, channelsOk: null, bridge, consumed };
    subTests.S1 = { ...minimumEffectVerdict(args), scope: "english-ewt-only", sensitivity: sensitivityOf(args, sA), components: { N: args.nullOk, M: s1r.thetaCI[0] > sA, A: mustBeatOk, F: "n/a (one language, one lineage)", I: "n/a (one channel)", holm: { S1b: hb.S1b, S1c: hb.S1c } } };
    statistic.S1 = ser({ ...s1r, N1: s1r.N1, sesoi: sA });
  } else subTests.S1 = { verdict: "UNDERPOWERED", outcome: "underpowered", reasons: ["power gate failed before real data: the statistic is withheld (no peek)"], headline: false };
  // S2
  if (s2r && !s2r.gap) {
    const sB = SESOI["EO-1.S2"].value;
    const args = { theta: s2r.theta, ci95: s2r.thetaCI, sesoi: sB, powerUp: power.S2.P_up, powerDown: power.S2.P_down, tinyOk: power.S2.tinyOk && power.S2.zeroOk, controlsOk, nullOk: hb.S2.reject, mustBeatOk: null, bridge, consumed };
    subTests.S2 = { ...minimumEffectVerdict(args), scope: "english-ewt-only", sensitivity: sensitivityOf(args, sB), components: { N: hb.S2.reject, M: s2r.thetaCI[0] > sB, holm: hb.S2 } };
    statistic.S2 = ser({ ...s2r, sesoi: sB });
  } else if (s2r?.gap) { subTests.S2 = { verdict: "NOT_TESTABLE_NOW", outcome: "untestable", reasons: [s2r.gap] }; statistic.S2 = ser(s2r); }
  else subTests.S2 = { verdict: "UNDERPOWERED", outcome: "underpowered", reasons: ["power gate failed before real data: the statistic is withheld (no peek)"], headline: false };
  // S3
  if (s3r) {
    const sC = SESOI["EO-1.S3"].value;
    if (s3r.r == null) subTests.S3 = { verdict: "UNDERPOWERED", outcome: "underpowered", reasons: [s3r.rGap], headline: false };
    else {
      const args = { theta: s3r.r, ci95: s3r.rCI, sesoi: sC, powerUp: power.S3.P_up, powerDown: power.S3.P_down, tinyOk: power.S3.tinyOk, controlsOk, nullOk: null, mustBeatOk: null, bridge: "unlicensed", consumed };
      const v = minimumEffectVerdict(args);
      subTests.S3 = { ...v, note: "S3 can print WEAKENED for 'closed universe of nine' and never REFUTED; a missing knee at the table's k is printed and cannot refute", sensitivity: sensitivityOf(args, sC) };
    }
    const { D9, ...rest } = s3r; statistic.S3 = ser({ ...rest, sesoi: SESOI["EO-1.S3"].value });
  }
  const primary = subTests.S1;
  const card = {
    id: "EO-1", claim: EO_CLAIMS[0].claim, source: EO_CLAIMS[0].file, steelman: STEEL_EO1, bearing: EO_SENTENCES["EO-1"].bearing,
    eoSentence: EO_SENTENCES["EO-1"].eoSentence, eoSentenceLicensed: EO_SENTENCES["EO-1"].licensed, consumed, consumedBasis: "README of the act prior states independence from any corpus text; revision history unsupplied (B7): conditional",
    split: ctx.split, outcome: primary.outcome, verdict: primary.verdict, verdictReasons: primary.reasons, headline: primary.headline ?? false, scope: "english-ewt-only: one language, one treebank, one lineage",
    subTests: ser(subTests), statistic,
    null: { family: ["N1 (calibration, near-foregone)", "N1b within Levin major group", "N1c contiguous Levin blocks"], draws: nDraws, floor: nullFloor, k: ds.K, rule: "G_EO must exceed the 95th percentile of both structure-preserving nulls AND theta = G_EO - max(median) must clear the SESOI" },
    control: ser(controls),
    power: ser({ S1: { ...power.S1, grid: undefined }, S2: { ...power.S2, grid: undefined }, S3: { ...power.S3, grid: undefined }, sigmaCalibration: power.sigmaCalibration, reps: power.reps, seconds: power.seconds, cached: power.cached, calibrationGrid: { S1: power.S1.grid, S2: power.S2.grid, S3: power.S3.grid } }),
    alternativeScores: ser(alt),
    heldOutSystems: [`eng (UD_English-EWT; lemmas held out by ${FOLDS} folds; scored on ${ctx.split}.conllu tokens)`],
    inputs: { ...(ds.meta ?? {}), headerSha256: ctx.headerSha, manifest: [...ctx.manifest].map(([f, v]) => ({ file: f, ...v })) },
    gaps: [{ gap: "REC", detail: "no VerbNet class maps to REC: the table measures 8 of 9 acts; every equal-k comparison is at k = 8" }, { gap: "27-cell grain", detail: "grain is absent from the table (EO-8, NOT_TESTABLE_NOW)" }, { gap: "other languages and treebanks", detail: "English EWT only" }, { gap: "contested forms", detail: `${ds.meta?.contestedUnits ?? "?"} of ${ds.nU} scoring lemmas are contested forms; their act is the first listed class's` }],
    notes: [`Scoring units: ${ds.nU} lemmas (${ds.meta?.heldTokensInUnits} held-out tokens), ${ds.meta?.classesWithUnits} of ${ds.meta?.classesOnDisk} classes populated. BARKER.md's 'about 57' Levin major groups is ${ds.nMajor} on disk.`,
      "DEV split only unless --split test --confirm-test; the confirmatory run is one-shot.", `seconds: ${(Date.now() - t0) / 1000}`],
  };
  return card;
}

// ═════════════════════════════════ PLANTED TOYS (for tests and for the control instruments) ═════════════════════════════════
/** A small base dataset (no real data): fake Levin-ordered classes in major groups, 8 acts dealt mostly by major group, lemma counts only. */
export function toyEo1Base({ nMajor = 16, perMajor = 4, lemmasPerClass = 4, nTrain = 24, nHeld = 8, blockSizes = [6, 5, 5, 6], seed = "toy", actNoise = 0.15, unitShare = 0.7 } = {}) {
  const rng = makeRng("toy-eo1", seed), size = blockSizes, off = [0, size[0], size[0] + size[1], size[0] + size[1] + size[2]], S = off[3] + size[3];
  const classes = []; for (let m = 0; m < nMajor; m++) for (let k = 0; k < perMajor; k++) classes.push({ id: `c${m}x${k}-${10 + m}.${k + 1}`, nums: [10 + m, k + 1], major: 10 + m, valency: 1 + ((m + k) % 3) });
  const act = (c) => { const m = Math.floor(c / perMajor); return ACT_ORDER[(rng() < actNoise ? Math.floor(rng() * 8) : m % 8)]; };
  const eoAct = classes.map((_, c) => act(c));
  for (let a = 0; a < 8; a++) if (!eoAct.includes(ACT_ORDER[a])) eoAct[a] = ACT_ORDER[a]; // every one of the 8 acts is populated
  const lemmas = [], trainVec = [], heldVec = [];
  classes.forEach((c, ci) => { for (let j = 0; j < lemmasPerClass; j++) lemmas.push({ lemma: `l${ci}_${j}`, cls: c.id, fold: (ci * 7 + j) % FOLDS }); });
  const L = lemmas.length, tv = new Float64Array(L * S), hv = new Float64Array(L * S);
  const pg = new Float64Array(S); for (let b = 0; b < 4; b++) { let z = 0; for (let s = off[b]; s < off[b] + size[b]; s++) { pg[s] = Math.exp(gauss(rng)); z += pg[s]; } for (let s = off[b]; s < off[b] + size[b]; s++) pg[s] /= z; }
  lemmas.forEach((lm, l) => {
    const nh = rng() < unitShare ? nHeld : 1;
    for (let b = 0; b < 4; b++) { const probs = pg.subarray(off[b], off[b] + size[b]), a = multinomial(nTrain, probs, rng), h = multinomial(nh, probs, rng); for (let s = 0; s < size[b]; s++) { tv[l * S + off[b] + s] = a[s]; hv[l * S + off[b] + s] = h[s]; } }
  });
  return makeEo1Dataset({ lemmas, trainVec: tv, heldVec: hv, classes, off, size, eoAct });
}

// ═════════════════════════════════ EO-2 ENGINE: THE CUBE AS GRAMMAR ═════════════════════════════════
export const EO2_FEATURES = Object.freeze(["Case", "Person", "Number", "VerbForm", "Mood", "Voice", "Tense", "Aspect"]);
const NOMINAL = new Set(["NOUN", "PROPN", "ADJ", "PRON", "NUM", "DET"]), VERBAL = new Set(["VERB", "AUX"]);
const uposFor = (F) => (F === "Case" ? NOMINAL : F === "Person" || F === "Number" ? new Set([...NOMINAL, ...VERBAL]) : VERBAL);
export const CORE_CASES = Object.freeze(new Set(["Nom", "Acc"]));
export const BLAKE_RANK = Object.freeze({ Nom: 1, Acc: 2, Gen: 3, Dat: 4, Loc: 5, Ins: 5, Abl: 5 });
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const triKey = (a, b, c) => [a, b, c].sort().join("|");
const lt = (a, b) => (Math.abs(a - b) <= 1e-12 ? 0.5 : a < b ? 1 : 0);
const endingOf = (form) => { const f = form.toLowerCase().normalize("NFC"); if (!/^[\p{L}\p{M}]+$/u.test(f)) return null; const cp = Array.from(f); return cp.slice(-2).join(""); };

/** grains of the table: {F: {v: "Ground"|"Figure"|"Pattern"}} (the SUT's own table). */
export function tableGrains() {
  const t = underTestGrammarCells(), out = {};
  for (const F of EO2_FEATURES) { out[F] = {}; for (const [v, cell] of Object.entries(t[F])) out[F][v] = cell[1]; }
  return out;
}
/** unordered same-grain pairs x a third value of a different grain. grainOf: {v: grain}. */
export function enumerateTriples(values, grainOf) {
  const out = [], vs = [...values].sort();
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
    if (grainOf[vs[i]] !== grainOf[vs[j]]) continue;
    for (const w of vs) if (w !== vs[i] && w !== vs[j] && grainOf[w] !== grainOf[vs[i]]) out.push({ u: vs[i], v: vs[j], w });
  }
  return out;
}
export const caseStratum = (t) => { const nCore = [t.u, t.v, t.w].filter((x) => CORE_CASES.has(x)).length; return nCore === 0 ? "oblique" : "mixed"; };
/** number of distinct labelings of the multiset of grains over m values (m! / prod n_g!). */
export function distinctLabelingCount(grainList) {
  const cnt = new Map(); for (const g of grainList) cnt.set(g, (cnt.get(g) ?? 0) + 1);
  let n = 1; for (let i = 2; i <= grainList.length; i++) n *= i; for (const c of cnt.values()) for (let i = 2; i <= c; i++) n /= i;
  return Math.round(n);
}
/**
 * Counts-only inventory (BARKER.md 6.3, R2). With no argument: the table's own inventory (47 triples over 7 features, 36 Case).
 * With lang = { counts: { Feature: { value: n } } }: the triples whose three values each have >= floor tokens in that language.
 */
export function tripleInventory(lang = null, { floor = TOKEN_FLOOR } = {}) {
  const grains = tableGrains(), features = {}, triples = [], perFeatureCounts = {}, minPermP = {}, pairs = new Set();
  for (const F of EO2_FEATURES) {
    const values = Object.keys(grains[F]).filter((v) => !lang || (lang.counts?.[F]?.[v] ?? 0) >= floor);
    const tr = enumerateTriples(values, grains[F]);
    features[F] = { values, triples: tr.length };
    perFeatureCounts[F] = Object.fromEntries(values.map((v) => [v, lang?.counts?.[F]?.[v] ?? null]));
    for (const t of tr) { triples.push({ F, ...t, stratum: F === "Case" ? caseStratum(t) : "non-Case" }); pairs.add(`${F}:${pairKey(t.u, t.v)}`); }
    minPermP[F] = values.length >= 3 ? 1 / distinctLabelingCount(values.map((v) => grains[F][v])) : null;
  }
  const strata = {}; for (const t of triples) strata[t.stratum] = (strata[t.stratum] ?? 0) + 1;
  const contrastsBy = (pred) => new Set(triples.filter(pred).map((t) => `${t.F}:${pairKey(t.u, t.v)}`)).size;
  return { features, triples, nTriples: triples.length, strata, perFeatureCounts, independentContrasts: { total: pairs.size, H1: contrastsBy((t) => t.stratum === "non-Case"), H2: contrastsBy((t) => t.stratum === "oblique"), caseAll: contrastsBy((t) => t.F === "Case") }, minPermP };
}

// ── language inventories (token symbol arrays per feature value) ───────────────────
/** EO-2's files for a split (operational choice 16): dev = the TRAIN treebank; test = ud-eval dev plus test. */
export function eo2Files(ctx, stem) {
  return ctx.split === "dev" ? [trainPath(stem)] : [path.join(EVAL_DIR, stem, "dev.conllu"), path.join(EVAL_DIR, stem, "test.conllu")];
}
/** One language's files -> {counts, tokens, alphabets}. Symbol arrays are Int32Array ids into the language's O1 and O2 alphabets. Sentences are not cached (the train files are large). */
export function buildLanguageInventory(ctx, stem) {
  const files = eo2Files(ctx, stem), table = underTestGrammarCells();
  const sha = files.map((f) => pin(ctx, `eo2:${ctx.split}`, f)).join("+");
  const sents = files.flatMap((f) => parseConllu(fs.readFileSync(f, "utf8")));
  const dep = new Map(), depId = (s) => dep.get(s) ?? (dep.set(s, dep.size), dep.size - 1), endCount = new Map();
  const raw = new Map(); // F -> v -> {o1: [], o2: []}
  let nTok = 0;
  const okUpos = Object.fromEntries(EO2_FEATURES.map((F) => [F, uposFor(F)]));
  const content = new Set([...NOMINAL, ...VERBAL]);
  for (const s of sents) for (const t of s.tokens) {
    nTok++; depId(baseOf(t.deprel));
    if (content.has(t.upos)) { const e = endingOf(t.form); if (e) endCount.set(e, (endCount.get(e) ?? 0) + 1); }
  }
  const topEnd = [...endCount].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 50).map(([e]) => e);
  const endIdx = new Map(topEnd.map((e, i) => [e, i])), OTHER = topEnd.length;
  for (const s of sents) for (const t of s.tokens) {
    const f = parseFeats(t.feats); if (!Object.keys(f).length) continue;
    for (const F of EO2_FEATURES) {
      const v = f[F]; if (!v || v.includes(",") || !table[F][v] || !okUpos[F].has(t.upos)) continue;
      const fm = raw.get(F) ?? raw.set(F, new Map()).get(F), rec = fm.get(v) ?? fm.set(v, { o1: [], o2: [] }).get(v);
      rec.o1.push(depId(baseOf(t.deprel)));
      const e = endingOf(t.form); if (e) rec.o2.push(endIdx.has(e) ? endIdx.get(e) : OTHER);
    }
  }
  const counts = {}, tokens = {};
  for (const [F, fm] of raw) { counts[F] = {}; tokens[F] = {}; for (const [v, rec] of fm) { counts[F][v] = { o1: rec.o1.length, o2: rec.o2.length }; tokens[F][v] = { o1: Int32Array.from(rec.o1), o2: Int32Array.from(rec.o2) }; } }
  return { stem, split: ctx.split, sha256: sha, nTokens: nTok, nSentences: sents.length, counts, tokens, A: { o1: dep.size, o2: topEnd.length + 1 }, endings: topEnd };
}
/** the languages that have this split's EO-2 files, each with a typed genealogy key or a typed gap. */
export function discoverEo2Languages(ctx) {
  const root = ctx.split === "dev" ? TB_DIR : EVAL_DIR, need = ctx.split === "dev" ? ["train.conllu"] : ["dev.conllu", "test.conllu"];
  const stems = fs.existsSync(root) ? fs.readdirSync(root).filter((s) => need.every((f) => fs.existsSync(path.join(root, s, f)))).sort() : [];
  const ok = [], gaps = [];
  for (const s of stems) { if (!LANG_KEYS[s]) gaps.push({ stem: s, reason: "no typed lineage/branch key (LANG_KEYS)" }); else ok.push(s); }
  return { stems: ok, gaps };
}
const countsOf = (inv, op) => { const o = {}; for (const [F, vs] of Object.entries(inv.counts)) { o[F] = {}; for (const [v, c] of Object.entries(vs)) o[F][v] = c[op]; } return o; };

// ── count-equalised divergence ───────────────────────────────────────────────────
/**
 * Count-equalised JSD between the values of one set: every value is downsampled WITHOUT replacement to n_min (the smallest count; >= floor)
 * before its profile is formed, d averaged over `downsamples` draws. tokensByValue: {value: Int32Array of symbol ids}; A the alphabet size.
 * Also returns the un-equalised plug-in JSD (the artefact print). null when n_min < floor.
 */
export function equalisedJsd(tokensByValue, A, { floor = TOKEN_FLOOR, downsamples = DOWNSAMPLES, rng }) {
  const vals = Object.keys(tokensByValue).sort(), nMin = Math.min(...vals.map((v) => tokensByValue[v].length));
  if (nMin < floor) return null;
  const d = {}, raw = {}, idx = {}, cnt = {};
  for (const v of vals) { idx[v] = Int32Array.from({ length: tokensByValue[v].length }, (_, i) => i); cnt[v] = new Float64Array(A); }
  const full = {}; for (const v of vals) { full[v] = new Float64Array(A); for (const x of tokensByValue[v]) full[v][x]++; }
  for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) { raw[pairKey(vals[i], vals[j])] = jsd2(full[vals[i]], full[vals[j]]); d[pairKey(vals[i], vals[j])] = 0; }
  for (let r = 0; r < downsamples; r++) {
    for (const v of vals) {
      cnt[v].fill(0); const ix = idx[v], arr = tokensByValue[v], n = arr.length;
      for (let i = 0; i < nMin; i++) { const j = i + Math.floor(rng() * (n - i)); const t = ix[i]; ix[i] = ix[j]; ix[j] = t; cnt[v][arr[ix[i]]]++; }
    }
    for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) d[pairKey(vals[i], vals[j])] += jsd2(cnt[vals[i]], cnt[vals[j]]) / downsamples;
  }
  return { nMin, d, raw };
}
/** distance caches of one language and operationalisation: every 3-subset of present values (and every pair, for DD). */
export function languageCache(inv, op, { floor = TOKEN_FLOOR, downsamples = DOWNSAMPLES, pairs = false, rngKey = "" } = {}) {
  const cache = { op, subsets: {}, pairs: {}, present: {}, A: inv.A[op] };
  const rng = makeRng("EO-2", inv.stem, op, rngKey);
  for (const F of EO2_FEATURES) {
    const vs = Object.keys(inv.counts[F] ?? {}).filter((v) => inv.counts[F][v][op] >= floor).sort();
    cache.present[F] = vs; cache.subsets[F] = new Map();
    for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) for (let k = j + 1; k < vs.length; k++) {
      const e = equalisedJsd({ [vs[i]]: inv.tokens[F][vs[i]][op], [vs[j]]: inv.tokens[F][vs[j]][op], [vs[k]]: inv.tokens[F][vs[k]][op] }, cache.A, { floor, downsamples, rng });
      if (e) cache.subsets[F].set(triKey(vs[i], vs[j], vs[k]), e);
    }
    if (pairs) {
      cache.pairs[F] = new Map();
      for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
        const e = equalisedJsd({ [vs[i]]: inv.tokens[F][vs[i]][op], [vs[j]]: inv.tokens[F][vs[j]][op] }, cache.A, { floor, downsamples: Math.min(downsamples, 50), rng });
        if (e) cache.pairs[F].set(pairKey(vs[i], vs[j]), e.d[pairKey(vs[i], vs[j])]);
      }
    }
  }
  return cache;
}

// ── triple scores ────────────────────────────────────────────────────────────────
/** symmetric score of predicting pair (a,b) closest within {a,b,c}: 0.5*(1[d(a,b)<d(a,c)] + 1[d(a,b)<d(b,c)]), ties 0.5. */
const scoreOfPair = (sub, a, b, c, raw = false) => { const D = raw ? sub.raw : sub.d; return 0.5 * (lt(D[pairKey(a, b)], D[pairKey(a, c)]) + lt(D[pairKey(a, b)], D[pairKey(b, c)])); };
/** per-feature statistics of one labeling: {all, oblique, mixed: {sum, n}, contrasts:Set, rawAll}. grainOf = {value: grain} over the present values. */
function featureGammas(F, present, grainOf, subsets) {
  const out = { all: { sum: 0, n: 0 }, oblique: { sum: 0, n: 0 }, mixed: { sum: 0, n: 0 }, rawAll: { sum: 0, n: 0 }, rawOblique: { sum: 0, n: 0 }, contrasts: new Set(), obliqueContrasts: new Set() };
  for (const t of enumerateTriples(present, grainOf)) {
    const sub = subsets.get(triKey(t.u, t.v, t.w)); if (!sub) continue;
    const s = scoreOfPair(sub, t.u, t.v, t.w), sr = scoreOfPair(sub, t.u, t.v, t.w, true);
    out.all.sum += s; out.all.n++; out.rawAll.sum += sr; out.rawAll.n++; out.contrasts.add(pairKey(t.u, t.v));
    if (F === "Case") { const st = caseStratum(t); out[st].sum += s; out[st].n++; if (st === "oblique") { out.obliqueContrasts.add(pairKey(t.u, t.v)); out.rawOblique.sum += sr; out.rawOblique.n++; } }
  }
  return out;
}
const gam = (x) => (x.n ? x.sum / x.n : NaN);
/** all distinct labelings of the grain multiset over `present` (values sorted), as arrays of grain per value. */
function distinctLabelings(present, grainOf) {
  const labels = present.map((v) => grainOf[v]), cnt = new Map(); for (const g of labels) cnt.set(g, (cnt.get(g) ?? 0) + 1);
  const kinds = [...cnt.keys()].sort(), out = [], cur = [];
  const rec = () => { if (cur.length === labels.length) { out.push(cur.slice()); return; } for (const k of kinds) if (cnt.get(k) > 0) { cnt.set(k, cnt.get(k) - 1); cur.push(k); rec(); cur.pop(); cnt.set(k, cnt.get(k) + 1); } };
  rec(); return out;
}
/**
 * One language, one operationalisation, one labeling (grains: {F: {v: grain}} restricted by this function to the present values).
 * Returns per-stratum Gamma (observed, un-equalised raw), independent contrasts, and the exact null distribution of Gamma_L by labeling redeal.
 */
export function languageStrata(cache, grains, { draws = DRAWS, rngKey = "", withNull = true } = {}) {
  const obs = {}, perFeature = {};
  for (const F of EO2_FEATURES) {
    const present = cache.present[F].filter((v) => grains[F]?.[v] != null);
    const grainOf = {}; for (const v of present) grainOf[v] = grains[F][v];
    perFeature[F] = { present, grainOf, ...featureGammas(F, present, grainOf, cache.subsets[F]) };
  }
  const nonCase = EO2_FEATURES.filter((F) => F !== "Case" && perFeature[F].all.n > 0);
  const feat = (F, k) => gam(perFeature[F][k]);
  const mean1 = (arr) => (arr.length ? mean(arr) : NaN);
  obs.H1 = { gamma: mean1(nonCase.map((F) => feat(F, "all"))), raw: mean1(nonCase.map((F) => gam(perFeature[F].rawAll))), contrasts: nonCase.reduce((s, F) => s + perFeature[F].contrasts.size, 0), features: nonCase };
  obs.H2 = { gamma: perFeature.Case.oblique.n ? feat("Case", "oblique") : NaN, raw: perFeature.Case.rawOblique.n ? gam(perFeature.Case.rawOblique) : NaN, contrasts: perFeature.Case.obliqueContrasts.size, features: ["Case"] };
  obs.caseAll = { gamma: feat("Case", "all"), raw: gam(perFeature.Case.rawAll), contrasts: perFeature.Case.contrasts.size };
  obs.caseMixed = { gamma: feat("Case", "mixed") };
  obs.total = obs.H1.contrasts + obs.caseAll.contrasts;
  const out = { obs, perFeature, nTriples: Object.fromEntries(EO2_FEATURES.map((F) => [F, perFeature[F].all.n])) };
  if (!withNull) return out;
  // exact labeling distributions per feature
  const rng = makeRng("EO-2", "null", cache.op, rngKey);
  const lab = {};
  for (const F of EO2_FEATURES) {
    const pf = perFeature[F]; if (!pf.all.n) continue;
    const labelings = distinctLabelings(pf.present, pf.grainOf), vals = { all: [], oblique: [], mixed: [] };
    for (const L of labelings) {
      const g = {}; pf.present.forEach((v, i) => { g[v] = L[i]; });
      const fg = featureGammas(F, pf.present, g, cache.subsets[F]);
      vals.all.push(gam(fg.all)); vals.oblique.push(gam(fg.oblique)); vals.mixed.push(gam(fg.mixed));
    }
    lab[F] = vals;
  }
  const draw = (arr) => { const v = arr[Math.floor(rng() * arr.length)]; return Number.isFinite(v) ? v : 0.5; };
  const nullH1 = new Float64Array(draws), nullH2 = new Float64Array(draws);
  for (let d = 0; d < draws; d++) {
    if (nonCase.length) { let s = 0; for (const F of nonCase) s += draw(lab[F].all); nullH1[d] = s / nonCase.length; } else nullH1[d] = NaN;
    nullH2[d] = lab.Case && obs.H2.contrasts ? draw(lab.Case.oblique) : NaN;
  }
  out.nulls = { H1: nullH1, H2: nullH2 }; out.nLabelings = Object.fromEntries(Object.entries(lab).map(([F, v]) => [F, v.all.length]));
  return out;
}

// ── nested lineage statistics for one stratum ─────────────────────────────────────
/** langStats: {stem: languageStrata result}; stratum "H1"|"H2". Uses UNCONSUMED languages with >= 3 independent contrasts in total and >= 1 triple of the stratum. */
export function stratumStatistic(langStats, stratum, { definedLineages = null, boot = BOOT, rngKey = "" } = {}) {
  const rows = [], gaps = [];
  for (const [stem, ls] of Object.entries(langStats)) {
    const o = ls.obs[stratum], cs = consumedStatus(stem);
    if (!(ls.obs.total >= 3) || !(o.contrasts >= 1) || !Number.isFinite(o.gamma)) { gaps.push({ stem, reason: `${ls.obs.total} independent contrasts in total (< 3) or no ${stratum} triple (${o.contrasts ?? 0})` }); continue; }
    rows.push({ stem, gamma: o.gamma, theta: o.gamma - 0.5, raw: o.raw, contrasts: o.contrasts, consumed: cs, lineage: lineageOfStem(stem), branch: branchOfStem(stem) });
  }
  const head = rows.filter((r) => r.consumed === "unconsumed"), printed = rows.filter((r) => r.consumed !== "unconsumed");
  const thetaBy = Object.fromEntries(head.map((r) => [r.stem, r.theta]));
  const nm = nestedMean(thetaBy, branchOfStem, lineageOfBranch);
  const rawBy = Object.fromEntries(head.filter((r) => Number.isFinite(r.raw)).map((r) => [r.stem, r.raw - 0.5]));
  const rawNm = nestedMean(rawBy, branchOfStem, lineageOfBranch);
  const lineages = Object.keys(nm.perLineage), defined = (definedLineages ? lineages.filter((l) => definedLineages.includes(l)) : lineages);
  const out = { stratum, languages: head.length, lineages: lineages.length, perLineage: nm.perLineage, theta: nm.mean, rawTheta: rawNm.mean, rawPerLineage: rawNm.perLineage, rows, printedApart: printed, gaps, definedLineages: defined };
  // pooled null by index: nested mean of per-language null draws
  const have = head.filter((r) => langStats[r.stem].nulls);
  if (have.length === head.length && head.length) {
    const D = langStats[head[0].stem].nulls[stratum].length, nullPool = new Float64Array(D), perLinNull = {};
    for (const l of lineages) perLinNull[l] = new Float64Array(D);
    for (let d = 0; d < D; d++) {
      const vals = {}; for (const r of head) vals[r.stem] = langStats[r.stem].nulls[stratum][d] - 0.5;
      const nmd = nestedMean(vals, branchOfStem, lineageOfBranch); nullPool[d] = nmd.mean; for (const l of lineages) perLinNull[l][d] = nmd.perLineage[l];
    }
    let k = 0; for (let d = 0; d < D; d++) if (nullPool[d] >= nm.mean - 1e-12) k++;
    out.p = (1 + k) / (D + 1); out.nullMedian = median(nullPool); out.nullQ95 = quantile(nullPool, 0.95);
    out.h = Object.fromEntries(lineages.map((l) => [l, nm.perLineage[l] > median(perLinNull[l]) ? 1 : 0]));
    const dl = defined, kHit = dl.filter((l) => out.h[l] === 1).length, reach = reachability(dl.length);
    out.sign = { n: dl.length, k: kHit, reach, p: dl.length ? signTestP(kHit, dl.length) : 1, pass: !reach.unreachable && kHit >= reach.kNeeded };
    out.nullPool = nullPool;
  }
  const boots = clusterBootstrapMean(Object.values(nm.perLineage), { B: boot, rng: makeRng("EO-2", "boot", stratum, rngKey) });
  out.ci95 = boots.ci95; out.bootstrap = { B: boot, unit: "lineages (nested over branches and unconsumed languages)", n: boots.n };
  return out;
}

// ── rivals scored on EO's own triples ──────────────────────────────────────────────
/** a rival names a pair or no pair. predict(F, t, present) -> [a,b] | null. */
function rivalScores(cache, tableGrainsObs, rival, { stratum }) {
  const rows = [];
  for (const F of EO2_FEATURES) {
    if (rival.features && !rival.features.includes(F)) continue;
    const present = cache.present[F].filter((v) => tableGrainsObs[F]?.[v] != null), grainOf = {}; for (const v of present) grainOf[v] = tableGrainsObs[F][v];
    for (const t of enumerateTriples(present, grainOf)) {
      const st = F === "Case" ? caseStratum(t) : "non-Case"; if (stratum === "H2" ? st !== "oblique" : st !== "non-Case") continue;
      const sub = cache.subsets[F].get(triKey(t.u, t.v, t.w)); if (!sub) continue;
      const eo = scoreOfPair(sub, t.u, t.v, t.w), pr = rival.predict(F, t, present, cache);
      const rs = pr ? scoreOfPair(sub, pr[0], pr[1], [t.u, t.v, t.w].find((x) => x !== pr[0] && x !== pr[1])) : 0.5;
      rows.push({ F, eo, rival: rs, defined: !!pr });
    }
  }
  return rows;
}
const byGroups = (groupOf) => (F, t) => { const g = [t.u, t.v, t.w].map((x) => groupOf(x)); for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) { const k = 3 - i - j; if (g[i] != null && g[i] === g[j] && g[k] !== g[i]) return [[t.u, t.v, t.w][i], [t.u, t.v, t.w][j]]; } return null; };
export const RIVAL_PREDICTORS = Object.freeze({
  BL: { features: ["Case"], predict: (F, t) => { const vs = [t.u, t.v, t.w]; if (vs.some((x) => BLAKE_RANK[x] == null)) return null; const prs = [[0, 1], [0, 2], [1, 2]].map(([i, j]) => ({ p: [vs[i], vs[j]], g: Math.abs(BLAKE_RANK[vs[i]] - BLAKE_RANK[vs[j]]) })); const m = Math.min(...prs.map((x) => x.g)), best = prs.filter((x) => x.g === m); return best.length === 1 ? best[0].p : null; } },
  CO: { features: ["Case"], predict: byGroups((x) => (CORE_CASES.has(x) ? "core" : "oblique")) },
});
/** frequency-rank grains with the table's own block sizes: a labeling per block order (6 distinct), mean score over orders; max printed. */
export function frequencyRankLabelings(F, present, counts, grainOf) {
  const byFreq = [...present].sort((a, b) => counts[b] - counts[a] || (a < b ? -1 : 1)), sizes = {}; for (const v of present) sizes[grainOf[v]] = (sizes[grainOf[v]] ?? 0) + 1;
  const kinds = Object.keys(sizes).sort(), perms = [];
  const rec = (cur, rest) => { if (!rest.length) { perms.push(cur); return; } rest.forEach((k, i) => rec([...cur, k], rest.filter((_, j) => j !== i))); }; rec([], kinds);
  return perms.map((order) => { const g = {}; let pos = 0; for (const k of order) for (let i = 0; i < sizes[k]; i++) g[byFreq[pos++]] = k; return g; });
}

// ═════════════════════════════════ EO-2 ANALYSIS: PIPELINE, RIVALS, CONTROLS ═════════════════════════════════
/** the whole pipeline for one operationalisation over a set of language inventories. grains: {F:{v:grain}} or (stem, cache) => that. */
export function eo2Analyse(invs, op, { draws = DRAWS, downsamples = DOWNSAMPLES, boot = BOOT, definedLineages = null, withNull = true, pairs = false, rngKey = "", grains = null, caches = null } = {}) {
  const tg = tableGrains(), langStats = {}, outCaches = {}, gaps = [];
  for (const [stem, inv] of Object.entries(invs)) {
    if (op === "o2" && O2_GAP_STEMS[stem]) { gaps.push({ stem, reason: `O2 typed gap: ${O2_GAP_STEMS[stem]}` }); continue; }
    const cache = caches?.[stem] ?? languageCache(inv, op, { downsamples, pairs, rngKey });
    outCaches[stem] = cache;
    const g = typeof grains === "function" ? grains(stem, cache) : grains ?? tg;
    langStats[stem] = languageStrata(cache, g, { draws, rngKey: `${stem}${rngKey}`, withNull });
  }
  const H1 = stratumStatistic(langStats, "H1", { definedLineages: definedLineages?.H1 ?? null, boot, rngKey }), H2 = stratumStatistic(langStats, "H2", { definedLineages: definedLineages?.H2 ?? null, boot, rngKey });
  return { op, langStats, caches: outCaches, H1, H2, gaps };
}

// ── DD: a within-feature 3-partition learned from the OTHER languages ───────────────────
export function learnDD(cachesByStem, target, { lineageOut = false } = {}) {
  const targetLin = lineageOfStem(target), dd = {};
  for (const F of EO2_FEATURES) {
    const sums = new Map(), cnts = new Map(), vals = new Set();
    for (const [stem, cache] of Object.entries(cachesByStem)) {
      if (stem === target || (lineageOut && lineageOfStem(stem) === targetLin)) continue;
      for (const [pk, d] of cache.pairs?.[F] ?? []) { sums.set(pk, (sums.get(pk) ?? 0) + d); cnts.set(pk, (cnts.get(pk) ?? 0) + 1); const [a, b] = pk.split("|"); vals.add(a); vals.add(b); }
    }
    const values = [...vals].sort(); if (values.length < 4) { dd[F] = null; continue; }
    const all = [...sums].map(([k, v]) => v / cnts.get(k)), glob = mean(all), D = (u, v) => { const k = pairKey(u, v); return cnts.has(k) ? sums.get(k) / cnts.get(k) : glob; };
    let cl = values.map((v) => [v]);
    while (cl.length > 3) {
      let bi = 0, bj = 1, best = Infinity;
      for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) { let s = 0; for (const u of cl[i]) for (const v of cl[j]) s += D(u, v); s /= cl[i].length * cl[j].length; if (s < best) { best = s; bi = i; bj = j; } }
      cl[bi] = cl[bi].concat(cl[bj]); cl.splice(bj, 1);
    }
    dd[F] = Object.fromEntries(cl.flatMap((c, i) => c.map((v) => [v, `dd${i}`])));
  }
  return dd;
}
/** per-language mean (score_EO - score_R) and mean score_R over EO's own triples, for a predictor over triples. */
function meanDiff(rows) { return rows.length ? { diff: mean(rows.map((r) => r.eo - r.rival)), eo: mean(rows.map((r) => r.eo)), rival: mean(rows.map((r) => r.rival)), n: rows.length, definedShare: rows.filter((r) => r.defined).length / rows.length } : null; }
function frRows(cache, inv, op, tg, stratum) {
  const rows = [];
  for (const F of EO2_FEATURES) {
    const present = cache.present[F].filter((v) => tg[F]?.[v] != null), grainOf = {}; for (const v of present) grainOf[v] = tg[F][v];
    const counts = Object.fromEntries(present.map((v) => [v, inv.counts[F][v][op]])), orders = frequencyRankLabelings(F, present, counts, grainOf);
    for (const t of enumerateTriples(present, grainOf)) {
      const st = F === "Case" ? caseStratum(t) : "non-Case"; if (stratum === "H2" ? st !== "oblique" : st !== "non-Case") continue;
      const sub = cache.subsets[F].get(triKey(t.u, t.v, t.w)); if (!sub) continue;
      const eo = scoreOfPair(sub, t.u, t.v, t.w); let acc = 0, def = 0;
      for (const g of orders) { const pr = byGroups((x) => g[x])(F, t); if (pr) { acc += scoreOfPair(sub, pr[0], pr[1], [t.u, t.v, t.w].find((x) => x !== pr[0] && x !== pr[1])); def++; } else acc += 0.5; }
      rows.push({ F, eo, rival: acc / orders.length, defined: def > 0, maxOrderScore: null });
    }
  }
  return rows;
}
function ratioBootstrap(perLinA, perLinB, { B = BOOT, rngKey = "" } = {}) {
  const ls = Object.keys(perLinA).filter((l) => l in perLinB), n = ls.length, rng = makeRng("EO-2", "ratio", rngKey), reps = [];
  if (!n) return { est: NaN, ci95: [NaN, NaN], n };
  const num = mean(ls.map((l) => perLinA[l])), den = mean(ls.map((l) => perLinB[l]));
  for (let b = 0; b < B; b++) { let a = 0, d = 0; for (let i = 0; i < n; i++) { const l = ls[Math.floor(rng() * n)]; a += perLinA[l]; d += perLinB[l]; } if (d / n > 1e-9) reps.push(a / d); }
  return { est: den > 1e-9 ? num / den : null, ci95: reps.length ? percentileCI(reps) : [NaN, NaN], n, excluded: B - reps.length };
}
/** BL, CO (Case only; H2), FR (both), DD (reference): paired differences on EO's own triples, nested over unconsumed languages. */
export function eo2Rivals(analysis, invs, op, stratum, { boot = BOOT, lineageOut = false, rngKey = "" } = {}) {
  const S = stratum === "H2" ? "H2" : "H1", sA = SESOI["EO-2"].value, tg = tableGrains(), res = {};
  const head = analysis[S].rows.filter((r) => r.consumed === "unconsumed").map((r) => r.stem);
  const agg = (byStem) => { const nm = nestedMean(byStem, branchOfStem, lineageOfBranch), ci = clusterBootstrapMean(Object.values(nm.perLineage), { B: boot, rng: makeRng("EO-2", "riv", rngKey, stratum) }); return { est: nm.mean, ci95: ci.ci95, perLineage: nm.perLineage, nLineages: nm.nLineages }; };
  const predictorRows = { BL: null, CO: null };
  const collect = (name, fn) => { const diff = {}, rv = {}, eo = {}, cov = {}; for (const stem of head) { const m = meanDiff(fn(stem)); if (m) { diff[stem] = m.diff; rv[stem] = m.rival - 0.5; eo[stem] = m.eo - 0.5; cov[stem] = m.definedShare; } } return { diff, rv, eo, cov }; };
  if (S === "H2") for (const k of ["BL", "CO"]) {
    const c = collect(k, (stem) => rivalScores(analysis.caches[stem], tg, RIVAL_PREDICTORS[k], { stratum: S }));
    const a = agg(c.diff); res[k] = { role: roleOf(k), ...a, eoBeatsBySesoi: a.ci95[0] > sA, meanDefinedShare: mean(Object.values(c.cov)), languages: Object.keys(c.diff).length };
  } else for (const k of ["BL", "CO"]) res[k] = { role: roleOf(k), scope: "Case only: not applicable to H1" };
  { const c = collect("FR", (stem) => frRows(analysis.caches[stem], invs[stem], op, tg, S)); const a = agg(c.diff); res.FR = { role: roleOf("FR"), ...a, eoBeatsBySesoi: a.ci95[0] > sA, languages: Object.keys(c.diff).length, note: "mean over the distinct block orders" }; }
  { const cachesWithPairs = analysis.caches, c = collect("DD", (stem) => { const dd = learnDD(cachesWithPairs, stem, { lineageOut }); const pred = { features: null, predict: (F, t) => (dd[F] ? byGroups((x) => dd[F][x] ?? null)(F, t) : null) }; return rivalScores(cachesWithPairs[stem], tg, pred, { stratum: S }); });
    const a = agg(c.diff), eoNm = nestedMean(c.eo, branchOfStem, lineageOfBranch), ddNm = nestedMean(c.rv, branchOfStem, lineageOfBranch), r2 = ratioBootstrap(eoNm.perLineage, ddNm.perLineage, { B: boot, rngKey: `${rngKey}${stratum}` });
    res.DD = { role: roleOf("DD"), ...a, coverage: mean(Object.values(c.cov)), languages: Object.keys(c.diff).length, lineageOut, captureRatio: r2, weakened: Number.isFinite(r2.ci95[1]) && r2.ci95[1] < 1 / 3 }; }
  res.TR = { role: roleOf("TR"), status: "NOT_RUN: no received operational mapping" };
  return res;
}

// ── controls built to fail, on the real profiles ──────────────────────────────────────────
const sortedBlocks = (cache, tg, valuesOrder, blockOrder) => { const out = {}; for (const F of EO2_FEATURES) { const present = cache.present[F].filter((v) => tg[F]?.[v] != null), sizes = {}; for (const v of present) sizes[tg[F][v]] = (sizes[tg[F][v]] ?? 0) + 1; const kinds = (blockOrder ?? Object.keys(sizes).sort()), ord = valuesOrder(F, present); let pos = 0; out[F] = {}; for (const k of kinds) for (let i = 0; i < (sizes[k] ?? 0); i++) out[F][ord[pos++]] = k; } return out; };
export function plantArtefact(invs, op, key) {
  const rng = makeRng("EO-2", "artefact", key), out = {};
  for (const [stem, inv] of Object.entries(invs)) {
    const tokens = {}, counts = {};
    for (const F of Object.keys(inv.tokens)) {
      const A = inv.A[op], pool = new Float64Array(A).fill(0); for (const v of Object.keys(inv.tokens[F])) for (const x of inv.tokens[F][v][op]) pool[x]++;
      for (let a = 0; a < A; a++) pool[a] += 1 / A;
      tokens[F] = {}; counts[F] = {};
      for (const v of Object.keys(inv.tokens[F])) {
        const n = inv.tokens[F][v][op].length, arr = new Int32Array(n), cum = new Float64Array(A); let t = 0; for (let a = 0; a < A; a++) { t += pool[a]; cum[a] = t; }
        for (let i = 0; i < n; i++) { const u = rng() * t; let lo = 0, hi = A - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] > u) hi = m; else lo = m + 1; } arr[i] = lo; }
        tokens[F][v] = { o1: op === "o1" ? arr : new Int32Array(0), o2: op === "o2" ? arr : new Int32Array(0) }; counts[F][v] = { o1: op === "o1" ? n : 0, o2: op === "o2" ? n : 0 };
      }
    }
    out[stem] = { ...inv, tokens, counts };
  }
  return out;
}
export function eo2Controls(invs, op, caches, { boot = 500, definedLineages = null, rngKey = "" } = {}) {
  const sE = SESOI["EO-2"].value, tg = tableGrains(), out = [];
  const settle = (id, expected, an, extra = {}) => { const ci = { H1: an.H1.ci95, H2: an.H2.ci95 }; const survivedH = (h) => an[h].languages > 0 && Number.isFinite(ci[h][1]) && ci[h][1] >= sE; return { id, op, expected, observed: { H1: { theta: an.H1.theta, ci95: ci.H1, languages: an.H1.languages }, H2: { theta: an.H2.theta, ci95: ci.H2, languages: an.H2.languages } }, survived: survivedH("H1") || survivedH("H2"), ...extra }; };
  // c1: grains by the alphabetical order of the value names (blocks of the table's own sizes)
  const c1 = eo2Analyse(invs, op, { boot, withNull: false, caches, rngKey: "c1", grains: (stem, cache) => sortedBlocks(cache, tg, (F, present) => [...present].sort()) });
  out.push(settle("c1-alphabetical-grains", "pooled theta interval upper bound < SESOI", c1));
  // c2: grains permuted across features (20 permutations; lineage values averaged over them)
  const perms = []; for (let r = 0; r < 20; r++) perms.push(eo2Analyse(invs, op, { boot: 1, withNull: false, caches, rngKey: `c2${r}`, grains: (stem, cache) => { const rng = makeRng("EO-2", "c2", stem, r), pairs = []; for (const F of EO2_FEATURES) for (const v of cache.present[F]) if (tg[F]?.[v]) pairs.push([F, v]); const gr = shuffleInPlace(pairs.map(([F, v]) => tg[F][v]), rng), o = {}; pairs.forEach(([F, v], i) => { (o[F] ??= {})[v] = gr[i]; }); return o; } }));
  const avg = (h) => { const ls = Object.keys(perms[0][h].perLineage), pl = Object.fromEntries(ls.map((l) => [l, mean(perms.map((p) => p[h].perLineage[l]).filter(Number.isFinite))])); const cb = clusterBootstrapMean(Object.values(pl), { B: boot, rng: makeRng("EO-2", "c2boot", h, rngKey) }); return { theta: mean(Object.values(pl)), ci95: cb.ci95, languages: perms[0][h].languages }; };
  const c2 = { H1: avg("H1"), H2: avg("H2") }; out.push(settle("c2-grains-permuted-across-features", "pooled theta interval upper bound < SESOI", c2));
  // c4: planted artefact language: identical profiles, unequal counts
  const art = plantArtefact(invs, op, rngKey), c4 = eo2Analyse(art, op, { boot, withNull: false, downsamples: 50, rngKey: "c4" });
  const rawCI = (h) => { const pl = c4[h].rawPerLineage ?? {}, v = Object.values(pl); return v.length ? clusterBootstrapMean(v, { B: boot, rng: makeRng("EO-2", "c4raw", h) }).ci95 : [NaN, NaN]; };
  out.push(settle("c4-planted-artefact-language (K7)", "Gamma 0.5 after equalisation (upper bound < SESOI) and above 0.5 before", c4, { rawTheta: { H1: c4.H1.rawTheta, H2: c4.H2.rawTheta, ci95: { H1: rawCI("H1"), H2: rawCI("H2") } }, artefactDemonstrated: { H1: rawCI("H1")[0] > 0, H2: rawCI("H2")[0] > 0 } }));
  return out;
}

// ── planted worlds on the REAL per-language inventories ───────────────────────────────────
/** A synthetic world for operationalisation op: value profile = the language's pooled distribution tilted by lambda*u_grain + eps*xi_value; real counts (x scale). */
export function plantEo2World(invs, op, { lambdaH1, lambdaH2, eps, scale = 1, key }) {
  const tg = tableGrains(), rng = makeRng("EO-2", "plant", op, key), out = {};
  for (const [stem, inv] of Object.entries(invs)) {
    const A = inv.A[op], tokens = {}, counts = {};
    for (const F of Object.keys(inv.tokens)) {
      const pool = new Float64Array(A); for (const v of Object.keys(inv.tokens[F])) for (const x of inv.tokens[F][v][op]) pool[x]++;
      let tot = 0; for (let a = 0; a < A; a++) { pool[a] += 1 / A; tot += pool[a]; }
      const lam = F === "Case" ? lambdaH2 : lambdaH1, u = {}; for (const g of ["Ground", "Figure", "Pattern"]) { u[g] = new Float64Array(A); for (let a = 0; a < A; a++) u[g][a] = lam * gauss(rng); }
      tokens[F] = {}; counts[F] = {};
      // equalisation downsamples every value to the smallest count among three, which never exceeds the feature's THIRD-largest count: tokens beyond it are never drawn (a subsample of a random sample is a random sample)
      const presentN = Object.values(inv.tokens[F]).map((t) => t[op].length).filter((n) => n >= TOKEN_FLOOR).sort((a, b) => b - a), cap = presentN.length >= 3 ? Math.round(presentN[2] * scale) : 0;
      for (const v of Object.keys(inv.tokens[F]).sort()) {
        const n0 = inv.tokens[F][v][op].length, n = Math.min(Math.round(n0 * scale), cap);
        const arr = new Int32Array(n0 >= TOKEN_FLOOR ? n : 0);
        if (arr.length) {
          const p = new Float64Array(A), cum = new Float64Array(A), g = tg[F][v]; let z = 0;
          for (let a = 0; a < A; a++) { p[a] = (pool[a] / tot) * Math.exp(u[g][a] + eps * gauss(rng)); z += p[a]; }
          let t = 0; for (let a = 0; a < A; a++) { t += p[a]; cum[a] = t; }
          for (let i = 0; i < n; i++) { const r = rng() * t; let lo = 0, hi = A - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] > r) hi = m; else lo = m + 1; } arr[i] = lo; }
        }
        tokens[F][v] = { o1: op === "o1" ? arr : new Int32Array(0), o2: op === "o2" ? arr : new Int32Array(0) };
        counts[F][v] = { o1: op === "o1" ? arr.length : 0, o2: op === "o2" ? arr.length : 0 };
      }
    }
    out[stem] = { ...inv, tokens, counts };
  }
  return out;
}

// ═════════════════════════════════ EO-2 POWER CARD AND RUNNER ═════════════════════════════════
const LAMBDA_GRID = Object.freeze([0, 0.05, 0.1, 0.2, 0.3, 0.45, 0.6, 0.8, 1.0, 1.5, 2.0]);
const EO2_EPS_GATE = 0.3, EO2_EPS_SENS = Object.freeze([0.1, 0.5]);
export function eo2Fingerprint(invs) {
  const h = createHash("sha256");
  for (const stem of Object.keys(invs).sort()) { h.update(stem); h.update(invs[stem].sha256 ?? ""); h.update(JSON.stringify(invs[stem].counts)); }
  return h.digest("hex");
}
/** Power for one (operationalisation, epsilon): the planted world carries both strata at once, each calibrated separately. */
export function eo2PowerOp(invs, op, eps, { R, Rcal, D, B, dsCal = 20, dsRep = 50, log = null }) {
  const sE = SESOI["EO-2"].value, plant = (l1, l2, scale, key) => plantEo2World(invs, op, { lambdaH1: l1, lambdaH2: l2, eps, scale, key });
  const point = (w, key) => { const a = eo2Analyse(w, op, { withNull: false, downsamples: dsCal, boot: 1, rngKey: key }); return { H1: a.H1.languages ? a.H1.theta : NaN, H2: a.H2.languages ? a.H2.theta : NaN, L: { H1: a.H1.languages, H2: a.H2.languages } }; };
  const grid = LAMBDA_GRID.map((lam) => { const acc = { H1: [], H2: [] }; let L = null; for (let r = 0; r < Rcal; r++) { const p = point(plant(lam, lam, 1, `cal${r}`), `cal${r}`); acc.H1.push(p.H1); acc.H2.push(p.H2); L = p.L; } return { gamma: lam, est1: mean(acc.H1.filter(Number.isFinite)), est2: mean(acc.H2.filter(Number.isFinite)), L }; });
  const avail = { H1: grid[0].L.H1 > 0, H2: grid[0].L.H2 > 0 };
  const solve = (key, target) => solveGamma(grid.map((g) => ({ gamma: g.gamma, est: g[key] })), target);
  const targets = { up: 2 * sE, down: 0.5 * sE, tiny: 0.1 * sE };
  const lam = {};
  for (const [name, t] of Object.entries(targets)) lam[name] = { H1: avail.H1 ? solve("est1", t) : { gamma: 0, reachable: false, reason: "no language has >= 3 independent H1 contrasts" }, H2: avail.H2 ? solve("est2", t) : { gamma: 0, reachable: false, reason: "no language has >= 3 independent H2 contrasts" } };
  for (const name of ["up", "down"]) {   // one secant correction at fresh seeds
    if (!(lam[name].H1.reachable || lam[name].H2.reachable)) continue;
    let e1 = 0, e2 = 0, n1 = 0, n2 = 0;
    for (let r = 0; r < Rcal; r++) { const p = point(plant(lam[name].H1.gamma, lam[name].H2.gamma, 1, `ref${name}${r}`), `ref${r}`); if (Number.isFinite(p.H1)) { e1 += p.H1; n1++; } if (Number.isFinite(p.H2)) { e2 += p.H2; n2++; } }
    for (const [h, e, n, key] of [["H1", e1, n1, "est1"], ["H2", e2, n2, "est2"]]) if (lam[name][h].reachable && lam[name][h].gamma > 0 && n) { const base = grid[0][key], num = targets[name] - base, den = e / n - base; if (den > 1e-9 && Math.abs(den / num - 1) > 0.1) lam[name][h] = { ...lam[name][h], gamma: Math.min(LAMBDA_GRID[LAMBDA_GRID.length - 1], lam[name][h].gamma * (num / den)), refinedFrom: lam[name][h].gamma }; }
  }
  const rep = (world, key) => { const a = eo2Analyse(world, op, { draws: D, downsamples: dsRep, boot: B, rngKey: key }); return a; };
  const runWorld = (name, scale, Rn) => {
    const l1 = lam[name].H1.reachable ? lam[name].H1.gamma : 0, l2 = lam[name].H2.reachable ? lam[name].H2.gamma : 0;
    const cells = { H1: { hits: 0, n: 0, ests: [] }, H2: { hits: 0, n: 0, ests: [] } }, hl = { H1: {}, H2: {} };
    for (let r = 0; r < Rn; r++) {
      const a = rep(plant(l1, l2, scale, `${name}${r}`), `${name}${r}`);
      for (const h of ["H1", "H2"]) {
        const H = a[h]; if (!H.languages || !H.ci95 || !Number.isFinite(H.ci95[0])) continue;
        const c = cells[h]; c.n++; c.ests.push(H.theta);
        if (name === "up") c.hits += H.ci95[0] > sE ? 1 : 0;
        else if (name === "down") c.hits += H.ci95[1] < sE ? 1 : 0;
        else if (name === "tiny") c.hits += H.ci95[0] > sE ? 1 : 0;
        else c.hits += (H.p ?? 1) <= ALPHA ? 1 : 0;
        if (name === "up" && H.h) for (const [l, v] of Object.entries(H.h)) hl[h][l] = (hl[h][l] ?? 0) + v;
      }
    }
    return { cells, hl, Rn };
  };
  const Rt = Math.max(8, Math.floor(R / 2)), worlds = { up: runWorld("up", 1, R), down: runWorld("down", 1, R), tiny: runWorld("tiny", 10, Rt), zero: runWorld("zero", 1, R) };
  const out = { eps, op, reps: { R, Rt, Rcal, D, B, downsamplesCal: dsCal, downsamplesRep: dsRep }, grid, lambdas: lam, targets, cells: {} };
  for (const h of ["H1", "H2"]) {
    if (!avail[h]) { out.cells[h] = { available: false, pass: false, reason: lam.up[h].reason }; continue; }
    const w = (n) => ({ hits: worlds[n].cells[h].hits, n: worlds[n].cells[h].n, meanEst: mean(worlds[n].cells[h].ests), sdEst: sd(worlds[n].cells[h].ests) });
    const up = w("up"), down = w("down"), tiny = w("tiny"), zero = w("zero");
    const unreachable = ["up", "down", "tiny"].filter((n) => !lam[n][h].reachable).map((n) => `${n}: ${lam[n][h].reason}`);
    const gate = powerGate({ up, down, tiny, reps: R }), zeroRejected = rejectsRateLE(zero.hits, zero.n);
    const defined = Object.entries(worlds.up.hl[h]).filter(([, k]) => k / worlds.up.Rn >= 0.8).map(([l]) => l), reach = reachability(defined.length);
    if (reach.unreachable) unreachable.push(`reachability: ${defined.length} defined lineage(s); the sign gate needs >= 5`);
    out.cells[h] = { available: true, up: gate.up, down: gate.down, tiny: gate.tiny, zero: { ...zero, rejectedAsLEalpha: zeroRejected }, P_up: gate.P_up && !lam.up[h].reason, P_down: gate.P_down && !lam.down[h].reason, tinyOk: gate.tinyOk, zeroOk: !zeroRejected, unreachable,
      definedLineages: defined, reachability: reach, lineageRates: Object.fromEntries(Object.entries(worlds.up.hl[h]).map(([l, k]) => [l, k / worlds.up.Rn])), pass: gate.pass && !zeroRejected && unreachable.length === 0 };
  }
  log?.(`eo2 power ${op} eps ${eps}: ${JSON.stringify(Object.fromEntries(["H1", "H2"].map((h) => [h, { pass: out.cells[h].pass, up: out.cells[h].up?.rate, down: out.cells[h].down?.rate, defined: out.cells[h].definedLineages?.length }])))}`);
  return out;
}
export function eo2PowerCard(invs, ctx, { log = null, force = false } = {}) {
  const fp = eo2Fingerprint(invs), file = cachePath(ctx, "eo2-power", `${fp}|${POWER_REPS.eo2}|${ctx.quick}`);
  if (!force) { const c = readCache(file); if (c) return { ...c, cached: true, cacheFile: file }; }
  const t0 = Date.now(), q = ctx.quick, R = q ? 6 : POWER_REPS.eo2, Rcal = q ? 2 : 6, D = q ? 199 : POWER_DRAWS.eo2, B = q ? 100 : POWER_BOOT;
  const card = { schema: "EO2PowerCard@1", split: ctx.split, fingerprint: fp, gateEpsilon: EO2_EPS_GATE, ops: {}, headerSha: ctx.headerSha, planted: "real per-language inventories and token counts; value profile = pooled distribution tilted by lambda*u_grain + eps*xi_value" };
  for (const op of ["o1", "o2"]) {
    card.ops[op] = { gate: eo2PowerOp(invs, op, EO2_EPS_GATE, { R, Rcal, D, B, log }), sensitivity: {} };
    if (!q) for (const e of EO2_EPS_SENS) card.ops[op].sensitivity[String(e)] = eo2PowerOp(invs, op, e, { R: 8, Rcal: 4, D, B, log });
    log?.(`eo2 power ${op} done ${(Date.now() - t0) / 1000}s`);
  }
  card.seconds = (Date.now() - t0) / 1000; writeCache(file, card);
  return { ...card, cached: false, cacheFile: file };
}

const STEEL_EO2 = "The strongest reading: a table fitted to three ancient inflectional languages TRANSFERS. In a language that did not derive it, values the table puts at the SAME grain are more alike than values it puts at DIFFERENT grains, within a feature (so feature identity cannot explain it). Bridge: cube.js says the cells come from word-final ENDINGS; it does not say role profiles are grain-similar. O1 (role profiles) is therefore the conjunction with Barker's auxiliary hypothesis (PROXY-BRIDGE: a failure refutes the conjunction), O2 (endings, the builders' own endingLength) is nearer EO's own derivation (PROXY); both must pass.";
/** Build every language's inventory for the split (progress logged). */
export function buildEo2Inventories(ctx, { log = null, only = null } = {}) {
  const { stems, gaps } = discoverEo2Languages(ctx), invs = {};
  for (const s of stems) { if (only && !only.includes(s)) continue; try { invs[s] = buildLanguageInventory(ctx, s); log?.(`inventory ${s}: ${invs[s].nTokens} tokens`); } catch (e) { gaps.push({ stem: s, reason: `inventory failed: ${e.message}` }); } }
  return { invs, gaps };
}
const OP_NAME = { o1: "O1 (role profiles; PROXY-BRIDGE)", o2: "O2 (word-final endings; PROXY)" };
export function runEo2(ctx, { log = null, invs = null, gaps: gapsIn = [], powerCard = null, draws = DRAWS, boot = BOOT, downsamples = DOWNSAMPLES } = {}) {
  registryLint();
  const t0 = Date.now();
  if (!invs) { const b = buildEo2Inventories(ctx, { log }); invs = b.invs; gapsIn = b.gaps; }
  const inventory = {}, tg = tableGrains();
  for (const [stem, inv] of Object.entries(invs)) inventory[stem] = { lineage: lineageOfStem(stem), branch: branchOfStem(stem), consumed: consumedStatus(stem), o1: tripleInventory({ counts: countsOf(inv, "o1") }), o2: O2_GAP_STEMS[stem] ? { gap: O2_GAP_STEMS[stem] } : tripleInventory({ counts: countsOf(inv, "o2") }) };
  const invSummary = Object.fromEntries(Object.entries(inventory).map(([s, v]) => [s, { lineage: v.lineage, consumed: v.consumed, nTriplesO1: v.o1.nTriples, contrastsO1: v.o1.independentContrasts, nTriplesO2: v.o2.nTriples ?? null, contrastsO2: v.o2.independentContrasts ?? null }]));
  const power = powerCard ?? eo2PowerCard(invs, ctx, { log });
  const sE = SESOI["EO-2"].value, controlsByOp = {}, analyses = {}, rivals = {}, comps = {};
  const cellGate = (op, h) => power.ops[op].gate.cells[h];
  for (const op of ["o1", "o2"]) {
    const any = cellGate(op, "H1").pass || cellGate(op, "H2").pass;
    const defined = { H1: cellGate(op, "H1").definedLineages ?? [], H2: cellGate(op, "H2").definedLineages ?? [] };
    // controls need caches under alternative labelings: they are instrument checks, not EO's statistic
    const cachesCtl = {}; for (const [stem, inv] of Object.entries(invs)) if (!(op === "o2" && O2_GAP_STEMS[stem])) cachesCtl[stem] = languageCache(inv, op, { downsamples: any ? downsamples : Math.min(downsamples, 50), pairs: any });   // controls guard a withheld statistic when no cell passed: reduced downsamples, declared
    controlsByOp[op] = eo2Controls(invs, op, cachesCtl, { boot: Math.min(boot, 1000), definedLineages: defined });
    if (any) { analyses[op] = eo2Analyse(invs, op, { draws, downsamples, boot, definedLineages: defined, pairs: true, caches: cachesCtl }); log?.(`eo2 ${op} analysed ${(Date.now() - t0) / 1000}s`); }
  }
  const ps = {}; for (const op of ["o1", "o2"]) for (const h of ["H1", "H2"]) if (analyses[op] && cellGate(op, h).pass) ps[`${op.toUpperCase()}${h}`] = analyses[op][h].p;
  const hb = holmBattery(ps);
  const cells = {};
  for (const op of ["o1", "o2"]) for (const h of ["H1", "H2"]) {
    const key = `${op.toUpperCase()}${h}`, g = cellGate(op, h), controlsOk = controlsByOp[op].every((c) => !c.survived), bridge = EO_SENTENCES[`EO-2.${op.toUpperCase()}`].licensed ? "licensed" : "unlicensed";
    if (!analyses[op] || !g.pass) { cells[key] = { verdict: "UNDERPOWERED", outcome: "underpowered", reasons: [g.available === false ? `no language qualifies: ${g.reason}` : `power gate failed (P_up ${g.P_up}, P_down ${g.P_down}, tinyOk ${g.tinyOk}, zeroOk ${g.zeroOk}${g.unreachable?.length ? `; ${g.unreachable.join("; ")}` : ""}); the statistic is withheld (no peek)`], bridge, headline: false, statistic: { withheld: true }, gate: g, controlsOk }; continue; }
    const H = analyses[op][h], riv = (rivals[key] = eo2Rivals(analyses[op], invs, op, h, { boot: Math.min(boot, 1000), rngKey: key })), consumedFree = true;
    const mustBeatOk = [riv.FR, riv.BL, riv.CO].filter((x) => x && x.eoBeatsBySesoi !== undefined).every((x) => x.eoBeatsBySesoi) && H.theta - H.nullQ95 >= sE;
    const args = { theta: H.theta, ci95: H.ci95, sesoi: sE, powerUp: g.P_up, powerDown: g.P_down, tinyOk: g.tinyOk && g.zeroOk, controlsOk, nullOk: hb[key].reject, mustBeatOk, signGate: H.sign?.pass ?? false, channelsOk: null, bridge, consumed: false, reachable: !(H.sign?.reach?.unreachable) };
    const v = minimumEffectVerdict(args);
    if (riv.DD?.weakened && v.verdict === "SURVIVES") { v.verdict = "WEAKENED"; v.outcome = "weakened"; v.headline = false; v.reasons.push("capture ratio against the data-driven partition has its interval upper bound below 1/3"); }
    cells[key] = { ...v, components: { N: hb[key], A: { mustBeatOk, FR: riv.FR?.eoBeatsBySesoi, BL: riv.BL?.eoBeatsBySesoi, CO: riv.CO?.eoBeatsBySesoi, nullQ95Cleared: H.theta - H.nullQ95 >= sE }, F: H.sign, M: H.ci95[0] > sE }, sensitivity: sensitivityOf(args, sE), statistic: ser({ theta: H.theta, ci95: H.ci95, p: H.p, nullMedian: H.nullMedian, nullQ95: H.nullQ95, rawTheta_unequalised: H.rawTheta, languages: H.languages, lineages: H.lineages, perLineage: H.perLineage, h: H.h, sign: H.sign, rows: H.rows, printedApartConsumed: H.printedApart, gaps: H.gaps, bootstrap: H.bootstrap }), rivals: ser(riv), gate: g, controlsOk };
  }
  // the overall outcome (operational choice 14)
  const all = Object.values(cells), vs = all.map((c) => c.verdict);
  const anyCtlFail = Object.values(controlsByOp).some((cs) => cs.some((c) => c.survived));
  let verdict = anyCtlFail ? "INSTRUMENT_FAILED" : vs.includes("REFUTED") ? "REFUTED" : vs.includes("WEAKENED") ? "WEAKENED" : vs.includes("UNDERPOWERED") ? "UNDERPOWERED" : "SURVIVES";
  const caseAllPrinted = Object.fromEntries(["o1", "o2"].filter((o) => analyses[o]).map((op) => [op, Object.fromEntries(Object.entries(analyses[op].langStats).filter(([, l]) => Number.isFinite(l.obs.caseAll.gamma)).map(([s, l]) => [s, { caseAll: l.obs.caseAll.gamma, caseMixed: l.obs.caseMixed.gamma, contrasts: l.obs.caseAll.contrasts }]))]));
  const reachRows = {}; for (const op of ["o1", "o2"]) for (const h of ["H1", "H2"]) { const g = cellGate(op, h); reachRows[`${op}${h}`] = { definedLineages: g.definedLineages ?? [], reachability: reachability((g.definedLineages ?? []).length) }; }
  return {
    id: "EO-2", claim: EO_CLAIMS[1].claim, source: EO_CLAIMS[1].file, steelman: STEEL_EO2, bearing: `${EO_SENTENCES["EO-2.O1"].bearing} | ${EO_SENTENCES["EO-2.O2"].bearing}`,
    eoSentence: { O1: EO_SENTENCES["EO-2.O1"].eoSentence, O2: EO_SENTENCES["EO-2.O2"].eoSentence }, eoSentenceLicensed: false, consumed: "rus consumed, ell near, grc/lat/san derived: printed apart; headline rows are the unconsumed languages", consumedBasis: CONSUMED_BASIS,
    split: ctx.split, outcome: OUTCOME_OF[verdict], verdict, verdictReasons: [`overall by the registered aggregation (operational choice 14): ${Object.entries(cells).map(([k, c]) => `${k} ${c.verdict}`).join(", ")}`], headline: false,
    cells: ser(cells),
    statistic: { note: "per-cell statistics are inside cells[*].statistic; a withheld cell failed its power gate", cellOfGrammarSha: cellOfGrammarSha(), tableInventory: ser(tripleInventory()) },
    null: { family: "G-null: grain labels permuted over each feature's present values, multiset kept (exact labelings; joint draws)", draws, rule: "pooled theta must exceed the null's 95th percentile by the SESOI after Holm over the battery" },
    control: ser(controlsByOp),
    power: ser({ gateEpsilon: power.gateEpsilon, ops: Object.fromEntries(Object.entries(power.ops).map(([op, o]) => [op, { gate: { ...o.gate, grid: undefined }, sensitivity: Object.fromEntries(Object.entries(o.sensitivity).map(([e, x]) => [e, { ...x, grid: undefined }])) }])), seconds: power.seconds, cached: power.cached, reachability: reachRows }),
    alternativeScores: ser(rivals),
    heldOutSystems: Object.keys(invs).map((s) => `${s} (${lineageOfStem(s)}/${branchOfStem(s)}, ${consumedStatus(s)})`),
    inventory: ser(invSummary), caseAllPrintedApart: ser(caseAllPrinted),
    inputs: { headerSha256: ctx.headerSha, manifest: [...ctx.manifest].map(([f, v]) => ({ file: f, ...v })), cellOfGrammarSha: cellOfGrammarSha() },
    gaps: [...gapsIn, ...Object.entries(O2_GAP_STEMS).filter(([s]) => invs[s]).map(([stem, reason]) => ({ stem, reason: `O2 typed gap: ${reason}` })), { gap: "TR (Person triad)", detail: "not run: no received operational mapping" }, { gap: "document audit", detail: "cube.js header prose disagrees with its table in at least four places (P7); the TABLE is tested" }],
    notes: ["Cells whose power gate failed are not computed on real data (no peek). Unconsumed is conditional on the table's revision history (B7).", `seconds: ${(Date.now() - t0) / 1000}`],
  };
}

// ═════════════════════════════════ EO-3: THE DIFFERENCE LADDER ═════════════════════════════════
// Character streams; M0 unigram, M1 interpolated context model (order <= 6, chosen on a validation slice), M2 one decayed cache, M3 two timescales, M4 + a sentence cache.
export const EO3_MAX_ORDER = 6, EO3_VAL_SHARE = 0.1, EO3_BLOCK = 200, EO3_EVAL_CHARS = 200000;
const RHOS = Object.freeze([0.9, 0.95, 0.98, 0.99, 0.995, 0.998]), WTS = Object.freeze([0.02, 0.05, 0.1, 0.2, 0.3]);
/** map every code point to one UTF-16 unit so context slicing is cheap; unseen code points share one symbol. */
function encodeStreams(trainText, evalText) {
  const ids = new Map(); let next = 0x100;
  for (const ch of trainText) if (!ids.has(ch)) ids.set(ch, next++);
  const UNK = String.fromCharCode(0xfffd), mapTo = (t) => { let o = ""; for (const ch of t) o += ids.has(ch) ? String.fromCharCode(ids.get(ch)) : UNK; return o; };
  return { train: mapTo(trainText), evalS: mapTo(evalText), A: ids.size + 1, newline: ids.has("\n") ? String.fromCharCode(ids.get("\n")) : null };
}
/** an interpolated Witten-Bell model of orders 0..K: counts only. */
export function buildCharModel(s, K) {
  const kc = [], ct = [];
  for (let k = 0; k <= K; k++) {
    const c = new Map(), t = new Map();
    for (let i = k; i < s.length; i++) {
      const ctx = s.slice(i - k, i), key = s.slice(i - k, i + 1), old = c.get(key) ?? 0; c.set(key, old + 1);
      let n = t.get(ctx); if (!n) { n = { t: 0, d: 0 }; t.set(ctx, n); } n.t++; if (old === 0) n.d++;
    }
    kc.push(c); ct.push(t);
  }
  return { kc, ct, K };
}
/** per-position probability of each character of s under the model of order <= K (history cut at the stream start). */
export function charProbs(model, s, K, A) {
  const out = new Float64Array(s.length);
  for (let t = 0; t < s.length; t++) {
    let p = 1 / A;
    for (let k = 0; k <= K; k++) {
      if (t < k) break;
      const ctx = s.slice(t - k, t), node = model.ct[k].get(ctx); if (!node) break;
      const c = model.kc[k].get(ctx + s[t]) ?? 0;
      p = (c + node.d * p) / (node.t + node.d);
    }
    out[t] = p;
  }
  return out;
}
/** q_t = decayed-count probability of the character at t given the past of the same stream (0 when the cache is empty). */
function cacheSeq(s, rho) {
  const out = new Float64Array(s.length), a = new Map(); let g = 1, W = 0;
  for (let t = 0; t < s.length; t++) {
    const c = s[t], v = a.get(c) ?? 0; out[t] = W > 0 ? v / W : 0;
    a.set(c, v + g); W += g; g /= rho;
    if (g > 1e150) { for (const [k, x] of a) a.set(k, x * 1e-150); W *= 1e-150; g *= 1e-150; }
  }
  return out;
}
function sentenceSeq(s, nl) {
  const out = new Float64Array(s.length); let a = new Map(), W = 0;
  for (let t = 0; t < s.length; t++) { const c = s[t], v = a.get(c) ?? 0; out[t] = W > 0 ? v / W : 0; a.set(c, v + 1); W++; if (c === nl) { a = new Map(); W = 0; } }
  return out;
}
const lossOf = (p, comps, w) => { // mean -log2 of (1 - sum w) p + sum w_i q_i
  let s = 0, wsum = 0; for (const x of w) wsum += x; const base = 1 - wsum;
  for (let t = 0; t < p.length; t++) { let m = base * p[t]; for (let i = 0; i < comps.length; i++) m += w[i] * comps[i][t]; s -= Math.log2(m); }
  return s / p.length;
};
const lossArr = (p, comps, w) => { const out = new Float64Array(p.length); let wsum = 0; for (const x of w) wsum += x; const base = 1 - wsum; for (let t = 0; t < p.length; t++) { let m = base * p[t]; for (let i = 0; i < comps.length; i++) m += w[i] * comps[i][t]; out[t] = -Math.log2(m); } return out; };
/**
 * One system: streams (train text, held-out text) -> per-character losses of M0..M4 on the held-out stream and Delta_k with a paired block bootstrap.
 * trainText and evalText are plain strings (sentences joined by newlines).
 */
export function eo3System(trainText, evalText, { boot = BOOT, rngKey = "", maxOrder = EO3_MAX_ORDER } = {}) {
  const { train, evalS, A, newline } = encodeStreams(trainText, evalText);
  const nVal = Math.floor(train.length * EO3_VAL_SHARE), fitS = train.slice(0, train.length - nVal), valS = train.slice(train.length - nVal);
  const model = buildCharModel(fitS, maxOrder);
  // M1 order on the validation slice
  let bestK = 0, bestL = Infinity; const valP = {};   // order 0 is allowed: M1 contains M0, so Delta_1 >= 0 by construction (BARKER.md: 'order k <= 6')
  for (let k = 0; k <= maxOrder; k++) { valP[k] = charProbs(model, valS, k, A); const l = lossOf(valP[k], [], []); if (l < bestL) { bestL = l; bestK = k; } }
  const pVal = valP[bestK];
  const qVal = Object.fromEntries(RHOS.map((r) => [r, cacheSeq(valS, r)])), sVal = sentenceSeq(valS, newline);
  // M2: one decayed cache
  let b2 = { l: lossOf(pVal, [], []), rho: null, w: 0 };
  for (const r of RHOS) for (const w of WTS) { const l = lossOf(pVal, [qVal[r]], [w]); if (l < b2.l) b2 = { l, rho: r, w }; }
  // M3: a second timescale (w2 may be 0: nested)
  let b3 = { ...b2, rho2: null, w2: 0 };
  if (b2.rho != null) for (const r2 of RHOS) { if (r2 === b2.rho) continue; for (const w1 of WTS) for (const w2 of WTS) { if (w1 + w2 > 0.9) continue; const l = lossOf(pVal, [qVal[b2.rho], qVal[r2]], [w1, w2]); if (l < b3.l) b3 = { l, rho: b2.rho, w: w1, rho2: r2, w2 }; } }
  // M4: a sentence-level cache
  let b4 = { ...b3, w3: 0 };
  for (const w3 of WTS) { const comps = [], ws = []; if (b3.w) { comps.push(qVal[b3.rho]); ws.push(b3.w); } if (b3.w2) { comps.push(qVal[b3.rho2]); ws.push(b3.w2); } comps.push(sVal); ws.push(w3); if (ws.reduce((a, b) => a + b, 0) > 0.95) continue; const l = lossOf(pVal, comps, ws); if (l < b4.l) b4 = { ...b3, l, w3 }; }
  // evaluate on the held-out stream (cache states start empty)
  const ev = evalS.slice(0, EO3_EVAL_CHARS), p0 = charProbs(model, ev, 0, A), p1 = charProbs(model, ev, bestK, A);
  const qE = (r) => cacheSeq(ev, r), sE = sentenceSeq(ev, newline);
  const comps2 = b2.w ? [qE(b2.rho)] : [], w2 = b2.w ? [b2.w] : [];
  const c3 = [], w3v = []; if (b3.w) { c3.push(qE(b3.rho)); w3v.push(b3.w); } if (b3.w2) { c3.push(qE(b3.rho2)); w3v.push(b3.w2); }
  const c4 = c3.slice(), w4 = w3v.slice(); if (b4.w3) { c4.push(sE); w4.push(b4.w3); }
  const L = [lossArr(p0, [], []), lossArr(p1, [], []), lossArr(p1, comps2, w2), lossArr(p1, c3, w3v), lossArr(p1, c4, w4)];
  const n = ev.length, nBlocks = Math.floor(n / EO3_BLOCK), rng = makeRng("EO-3", rngKey, "boot");
  const deltas = [], cis = [];
  for (let k = 1; k <= 4; k++) {
    const blk = new Float64Array(nBlocks); for (let b = 0; b < nBlocks; b++) { let s = 0; for (let t = b * EO3_BLOCK; t < (b + 1) * EO3_BLOCK; t++) s += L[k - 1][t] - L[k][t]; blk[b] = s / EO3_BLOCK; }
    deltas.push(mean(blk));
    const reps = new Float64Array(boot); for (let r = 0; r < boot; r++) { let s = 0; for (let b = 0; b < nBlocks; b++) s += blk[Math.floor(rng() * nBlocks)]; reps[r] = s / nBlocks; }
    cis.push(percentileCI(reps));
  }
  return { delta: deltas, ci: cis, bitsPerChar: L.map((l) => mean(l)), order: bestK, hyper: { m2: { rho: b2.rho, w: b2.w }, m3: { rho2: b3.rho2, w2: b3.w2 }, m4: { w3: b4.w3 } }, nTrain: fitS.length, nVal, nEval: n, alphabet: A };
}
/** deterministic character permutation (marginals kept, all order and recency structure destroyed). */
export function shuffleText(text, key) { const a = Array.from(text), rng = makeRng("EO-3", "shuffle", key); shuffleInPlace(a, rng); return a.join(""); }

// planted generators with K difference orders: each rung adds ONE source of structure; each rung's STRENGTH is calibrated so its own Delta equals the planted target (2s, 0.5s, 0.1s)
export const EO3_GENERATORS = Object.freeze({ alphabet: 30, sharp: 1.6, topic: 1.1, topic2: 1.1, sent: 1.1, nTopics: 5, tau1: 60, tau2: 1500, sentenceLen: 70 });
export function eo3Generate(K, n, key, params = {}) {
  const G = { ...EO3_GENERATORS, ...params }, rng = makeRng("EO-3", "gen", key), A = G.alphabet, logit = (m) => Array.from({ length: A }, () => m * gauss(rng));
  const base = Array.from({ length: A }, () => logit(G.sharp));                         // order-1 transition logits
  const topic = Array.from({ length: G.nTopics }, () => logit(G.topic)), topic2 = Array.from({ length: G.nTopics }, () => logit(G.topic2));
  const out = new Array(n); let prev = 0, z1 = 0, z2 = 0, sb = logit(0), left = 0;
  for (let t = 0; t < n; t++) {
    if (K >= 2 && rng() < 1 / G.tau1) z1 = Math.floor(rng() * G.nTopics);
    if (K >= 3 && rng() < 1 / G.tau2) z2 = Math.floor(rng() * G.nTopics);
    if (K >= 4 && --left < 0) { sb = logit(G.sent); left = Math.max(10, Math.round(G.sentenceLen * (0.5 + rng()))); out[t] = 0; prev = 0; continue; }
    const lg = new Float64Array(A); let mx = -Infinity;
    for (let c = 0; c < A; c++) { lg[c] = base[prev][c] + (K >= 2 ? topic[z1][c] : 0) + (K >= 3 ? topic2[z2][c] : 0) + (K >= 4 ? sb[c] : 0); if (lg[c] > mx) mx = lg[c]; }
    let z = 0; for (let c = 0; c < A; c++) { lg[c] = Math.exp(lg[c] - mx); z += lg[c]; }
    let u = rng() * z, c = 0; while (c < A - 1 && u >= lg[c]) { u -= lg[c]; c++; }
    out[t] = c; prev = c;
  }
  // character 0 plays the sentence separator for K = 4; map to printable symbols
  return out.map((c) => String.fromCharCode(c === 0 && K >= 4 ? 10 : 0x41 + c)).join("");
}
export function eo3Texts(ctx, stem) {
  const trainFile = trainPath(stem), heldFile = path.join(EVAL_DIR, stem, `${ctx.split}.conllu`);
  if (!fs.existsSync(trainFile) || !fs.existsSync(heldFile)) return null;
  pin(ctx, "eo3-train", trainFile); pin(ctx, `eo3-held-out:${ctx.split}`, heldFile);
  const tr = readTextLines(trainFile, { maxChars: TRAIN_CHAR_BUDGET }).join("\n"), ev = readTextLines(heldFile, { maxChars: EO3_EVAL_CHARS }).join("\n");
  return { train: tr.slice(0, TRAIN_CHAR_BUDGET), held: ev };
}
const RUNG_PARAM = Object.freeze({ 1: "sharp", 2: "topic", 3: "topic2", 4: "sent" });
/**
 * The power card: each rung's strength is calibrated so its own Delta equals 2s, 0.5s, 0.1s (the last at 10x the held-out length) in a world with that rung and the rungs below it;
 * the trio is run for rungs 1 and 2, and the LADDER check plants K = 1..4 at 2s per rung: the instrument must read exactly K rungs (lower bound > s) at the real stream lengths.
 */
export function eo3PowerCard(ctx, { nTrain = TRAIN_CHAR_BUDGET, nEval = 100000, log = null, force = false } = {}) {
  const q = ctx.quick, file = cachePath(ctx, "eo3-power", `${nTrain}|${nEval}|${POWER_REPS.eo3}|${q}`);
  if (!force) { const c = readCache(file); if (c) return { ...c, cached: true, cacheFile: file }; }
  const s = SESOI["EO-3"].value, R = q ? 2 : POWER_REPS.eo3, Rcal = q ? 1 : 2, nT = q ? 60000 : nTrain, nE = q ? 20000 : nEval, B = q ? 100 : 400, t0 = Date.now();
  const gen = (K, params, key, nE2 = nE) => { const text = eo3Generate(K, nT + nE2, key, params); return eo3System(text.slice(0, nT), text.slice(nT), { boot: B, rngKey: key }); };
  const strengths = { 1: {}, 2: {}, 3: {}, 4: {} }, calib = {};
  const targets = { up: 2 * s, down: 0.5 * s, tiny: 0.1 * s };
  const solve = (K, tgt, fixed) => {              // bisection on the rung's own strength; Delta_K is increasing in it
    const name = RUNG_PARAM[K]; let lo = 0, hi = 3.2, est = NaN;
    for (let i = 0; i < (q ? 3 : 7); i++) { const mid = (lo + hi) / 2; let acc = 0; for (let r = 0; r < Rcal; r++) acc += gen(K, { ...fixed, [name]: mid }, `cal${K}-${i}-${r}`).delta[K - 1] / Rcal; est = acc; if (acc < tgt) lo = mid; else hi = mid; }
    return { value: (lo + hi) / 2, est };
  };
  let fixed = {};
  for (const K of [1, 2, 3, 4]) { const up = solve(K, targets.up, fixed); strengths[K].up = up.value; fixed = { ...fixed, [RUNG_PARAM[K]]: up.value }; calib[K] = up; log?.(`eo3 calibrated rung ${K} at 2s: ${RUNG_PARAM[K]} = ${up.value.toFixed(3)} (Delta ${up.est.toFixed(4)})`); }
  const fixedBelow = (K) => Object.fromEntries([1, 2, 3, 4].filter((j) => j < K).map((j) => [RUNG_PARAM[j], strengths[j].up]));
  const rungTrio = {};
  for (const K of [1, 2]) {
    const dn = solve(K, targets.down, fixedBelow(K)), tn = solve(K, targets.tiny, fixedBelow(K)), mk = (v) => ({ ...fixedBelow(K), [RUNG_PARAM[K]]: v });
    const runW = (v, tag, hit, longEval = false) => { let hits = 0, ests = []; const Rn = longEval ? Math.max(4, Math.floor(R / 2)) : R; for (let r = 0; r < Rn; r++) { const res = gen(K, mk(v), `${tag}${K}-${r}`, longEval ? nE * 10 : nE); ests.push(res.delta[K - 1]); if (hit(res.ci[K - 1])) hits++; } return { hits, n: Rn, meanEst: mean(ests) }; };
    const up = runW(strengths[K].up, "up", (ci) => ci[0] > s), down = runW(dn.value, "down", (ci) => ci[1] < s), tiny = runW(tn.value, "tiny", (ci) => ci[0] > s, true), zero = runW(0, "zero", (ci) => ci[0] > s);
    const g = powerGate({ up, down, tiny, reps: R }), zr = rejectsRateLE(zero.hits, zero.n);
    rungTrio[K] = { up: g.up, down: g.down, tiny: g.tiny, zero: { ...zero, rejectedAsLEalpha: zr }, P_up: g.P_up, P_down: g.P_down, tinyOk: g.tinyOk, zeroOk: !zr, pass: g.pass && !zr, strengths: { up: strengths[K].up, down: dn.value, tiny: tn.value } };
    log?.(`eo3 rung ${K} trio: ${JSON.stringify({ up: up.hits, down: down.hits, tiny: tiny.hits, zero: zero.hits, pass: rungTrio[K].pass })} ${(Date.now() - t0) / 1000}s`);
  }
  const ladder = {};
  for (const K of [1, 2, 3, 4]) { const reads = []; for (let r = 0; r < R; r++) { const res = gen(K, fixedBelow(K + 1), `ladder${K}-${r}`); const first = res.ci.findIndex((ci) => !(ci[0] > s)); reads.push(first === -1 ? 4 : first); } ladder[K] = { exactReads: reads.filter((x) => x === K).length, n: R, reads }; }
  const ladderPass = [1, 2, 3, 4].every((K) => ladder[K].exactReads / R >= 0.8);
  const card = { schema: "EO3PowerCard@1", split: ctx.split, targets, calibration: calib, rungs: rungTrio, ladder, ladderPass, P_up: rungTrio[1].P_up && rungTrio[2].P_up, P_down: rungTrio[1].P_down && rungTrio[2].P_down, tinyOk: rungTrio[1].tinyOk && rungTrio[2].tinyOk && rungTrio[1].zeroOk && rungTrio[2].zeroOk, pass: rungTrio[1].pass && rungTrio[2].pass, reps: { R, Rcal, nTrain: nT, nEval: nE, B }, seconds: (Date.now() - t0) / 1000, headerSha: ctx.headerSha, rule: "the trio (2s, 0.5s, 0.1s at 10x held-out length) for rungs 1 and 2; the K = 1..4 ladder read at 2s per rung is printed beside it (not part of the gate)" };
  writeCache(file, card); return { ...card, cached: false, cacheFile: file };
}
export function runEo3(ctx, { log = null, powerCard = null, boot = BOOT, only = null } = {}) {
  registryLint(); const t0 = Date.now();
  const power = powerCard ?? eo3PowerCard(ctx, { log }), s = SESOI["EO-3"].value, gate = { 1: power.rungs[1].pass, 2: power.rungs[2].pass };
  const base = {
    id: "EO-3", claim: EO_CLAIMS[2].claim, source: EO_CLAIMS[2].file,
    steelman: "Grains are three orders of difference (the ground, a figure as a difference from its ground, a pattern as the difference a figure made to the NEXT ground). Higher orders are the same Pattern act iterated, so 'exactly three and no fourth' is NOT a claim a ladder of models can refute; any finite ladder can be extended by iterating Pattern, and EO's own definition licenses the iteration. What is testable is the weak form: the rungs it names are non-trivial in real sequences.",
    bearing: EO_SENTENCES["EO-3"].bearing, eoSentence: EO_SENTENCES["EO-3"].eoSentence, eoSentenceLicensed: false, consumed: false, nearForegone: true, split: ctx.split,
    claimTested: "weak form: rungs 1 and 2 are non-trivial", exactlyThree: "not testable: iterating Pattern extends any ladder (EO's own definition); the battery prints no verdict for 'three'", headline: false,
  };
  if (!gate[1] && !gate[2]) return { ...base, outcome: "underpowered", verdict: "UNDERPOWERED", verdictReasons: ["power gate failed for both rungs before real data: the statistic is withheld (no peek)"], rungs: { 1: "undetermined", 2: "undetermined", note: "vocabulary limited to 'rungs 1 and 2 hold / do not hold'" }, statistic: { withheld: true }, null: {}, control: [], power: ser(power), alternativeScores: {}, heldOutSystems: [], gaps: [], inputs: { headerSha256: ctx.headerSha }, notes: [`seconds ${(Date.now() - t0) / 1000}`] };
  const stems = Object.keys(LANG_KEYS).filter((st) => (!only || only.includes(st)) && fs.existsSync(trainPath(st)) && fs.existsSync(path.join(EVAL_DIR, st, `${ctx.split}.conllu`)));
  const rows = {}, ctl = {}, gaps = [];
  for (const stem of stems) {
    const tx = eo3Texts(ctx, stem); if (!tx || tx.train.length < 50000 || tx.held.length < 5000) { gaps.push({ stem, reason: `too little text (train ${tx?.train.length ?? 0}, held ${tx?.held.length ?? 0})` }); continue; }
    const real = eo3System(tx.train, tx.held, { boot, rngKey: stem }); rows[stem] = real;
    const shuf = eo3System(shuffleText(tx.train, `${stem}tr`), shuffleText(tx.held, `${stem}ev`), { boot: 300, rngKey: `${stem}c` }); ctl[stem] = shuf;
    log?.(`eo3 ${stem}: ${real.delta.map((d) => d.toFixed(3)).join(" ")} (shuffled ${shuf.delta.map((d) => d.toFixed(3)).join(" ")})`);
  }
  const lineageValues = (src, k) => { const by = Object.fromEntries(Object.keys(src).map((st) => [st, src[st].delta[k]])); return nestedMean(by, branchOfStem, lineageOfBranch); };
  const rung = {}, ps = {};
  for (const k of [0, 1, 2, 3]) {
    const nm = lineageValues(rows, k), nmc = lineageValues(ctl, k), cb = clusterBootstrapMean(Object.values(nm.perLineage), { B: boot, rng: makeRng("EO-3", "lin", k) }), cc = clusterBootstrapMean(Object.values(nmc.perLineage), { B: boot, rng: makeRng("EO-3", "linc", k) });
    const lins = Object.keys(nm.perLineage), pos = lins.filter((l) => nm.perLineage[l] > nmc.perLineage[l]).length, sign = { n: lins.length, k: pos, p: signTestP(pos, lins.length), reach: reachability(lins.length) };
    const hGt = lins.filter((l) => nm.perLineage[l] > s).length, rch = reachability(lins.length);
    rung[k + 1] = { theta: nm.mean, ci95: cb.ci95, lineages: lins.length, perLineage: nm.perLineage, control: { theta: nmc.mean, ci95: cc.ci95 }, sign, lineagesAboveSesoi: hGt, signGate: { n: lins.length, k: hGt, reach: rch, pass: !rch.unreachable && hGt >= rch.kNeeded } };
    if (k < 2) ps[`EO3r${k + 1}`] = sign.p;
  }
  const hb = holmBattery(ps), controlsOk = [1, 2].every((k) => rung[k].control.ci95[1] < s), bridge = EO_SENTENCES["EO-3"].licensed ? "licensed" : "unlicensed", verdicts = {};
  for (const k of [1, 2]) {
    const R = rung[k], args = { theta: R.theta, ci95: R.ci95, sesoi: s, powerUp: power.rungs[k].P_up, powerDown: power.rungs[k].P_down, tinyOk: power.rungs[k].tinyOk && power.rungs[k].zeroOk, controlsOk, nullOk: hb[`EO3r${k}`].reject, mustBeatOk: null, signGate: R.signGate.pass, reachable: !R.signGate.reach.unreachable, bridge, consumed: false, nearForegone: true, withheld: !gate[k] };
    verdicts[k] = { ...minimumEffectVerdict(args), sensitivity: sensitivityOf(args, s) };
    if (!gate[k]) rung[k] = { withheld: true, reason: "power gate failed for this rung" };
  }
  const hold = (k) => (verdicts[k].verdict === "SURVIVES" ? "holds" : ["UNDERPOWERED", "INSTRUMENT_FAILED"].includes(verdicts[k].verdict) ? "undetermined" : "does not hold");
  const RANK = ["INSTRUMENT_FAILED", "REFUTED", "WEAKENED", "UNDERPOWERED", "SURVIVES"], primary = [verdicts[1], verdicts[2]].sort((x, y) => RANK.indexOf(x.verdict) - RANK.indexOf(y.verdict))[0];
  return {
    ...base, outcome: primary.outcome, verdict: primary.verdict, verdictReasons: primary.reasons, rungs: { 1: hold(1), 2: hold(2), note: "vocabulary limited to 'rungs 1 and 2 hold / do not hold'" },
    statistic: ser({ rungs: rung, descriptiveSaturation: Object.fromEntries(Object.entries(rows).map(([st, r]) => [st, { order: r.order, deltas: r.delta, hyper: r.hyper, bitsPerChar: r.bitsPerChar }])) }),
    null: { rule: "per-lineage paired sign test of Delta_k against the same system's character-shuffled control; Holm over the battery" }, control: ser({ shuffledText: { expected: "Delta_1 and Delta_2 upper bounds < 0.01", observed: { 1: rung[1].control, 2: rung[2].control }, survived: !controlsOk } }),
    power: ser(power), alternativeScores: {}, heldOutSystems: Object.keys(rows).map((st) => `${st} (${lineageOfStem(st)})`),
    verdicts: ser(verdicts), gaps: [...gaps, { gap: "exactly three", detail: "any finite ladder can be extended by iterating Pattern" }], inputs: { headerSha256: ctx.headerSha, manifest: [...ctx.manifest].map(([f, v]) => ({ file: f, ...v })) },
    notes: [`${Object.keys(rows).length} systems; train text first ${TRAIN_CHAR_BUDGET} characters (model fitted on the first 90 percent, no refit), held-out text up to ${EO3_EVAL_CHARS} characters; seconds ${(Date.now() - t0) / 1000}`],
  };
}

// ═════════════════════════════════ EO-4: FLOORS AS A DEPENDENCY ORDER ═════════════════════════════════
export const EO4_RUNGS = Object.freeze(["r1", "r2", "r3", "r4"]);
const permutationsOf = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => permutationsOf([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p])));
export const EO4_ORDERS = Object.freeze(permutationsOf([0, 1, 2, 3]));            // 24 orders of the four rungs (indices into EO4_RUNGS)
const EO_ORDER_INDEX = EO4_ORDERS.findIndex((o) => o.join("") === "0123");
/** The competence cards of the split: {stem: [r1..r4 each true|false|null]}; r0 and r5 are not floors. Typed gaps for missing or malformed cards. */
export function readCards(ctx, { dir = COMPETENCE_DIR } = {}) {
  const matrix = {}, gaps = [];
  const re = new RegExp(`^r[1-4]-(.+)-${ctx.split}\\.json$`), stems = fs.existsSync(dir) ? [...new Set(fs.readdirSync(dir).map((f) => re.exec(f)?.[1]).filter(Boolean))].sort() : [];
  for (const stem of stems) {
    const row = EO4_RUNGS.map((r) => {
      const f = path.join(dir, `${r}-${stem}-${ctx.split}.json`); if (!fs.existsSync(f)) return null;
      try { const d = JSON.parse(fs.readFileSync(f, "utf8")); pin(ctx, `eo4-card:${r}`, f); if (d.split && d.split !== ctx.split) { gaps.push({ stem, rung: r, reason: `card split ${d.split} != ${ctx.split}` }); return null; } return d.pass === true ? true : d.pass === false ? false : null; } catch (e) { gaps.push({ stem, rung: r, reason: `unreadable: ${e.message}` }); return null; }
    });
    if (row.some((x) => x !== null)) matrix[stem] = row;
  }
  return { matrix, gaps, stems: Object.keys(matrix) };
}
/** Goodenough-Edwards errors of one language's responses read in order `order`: minimal flips to a 1..10..0 pattern (failures cascade UPWARD). */
export function scalogramErrors(row, order) {
  const x = order.map((j) => row[j]).filter((v) => v !== null && v !== undefined).map((v) => (v ? 1 : 0)), m = x.length;
  if (m < 3) return null;
  let best = Infinity; for (let c = 0; c <= m; c++) { let e = 0; for (let i = 0; i < m; i++) e += i < c ? (x[i] === 0 ? 1 : 0) : (x[i] === 1 ? 1 : 0); if (e < best) best = e; }
  return { errors: best, responses: m };
}
/** coefficient of reproducibility of one order over the languages (those with >= 3 non-missing rungs). */
export function coefficientOfReproducibility(matrix, order, stems = Object.keys(matrix)) {
  let E = 0, N = 0, used = 0;
  for (const s of stems) { const r = scalogramErrors(matrix[s], order); if (!r) continue; E += r.errors; N += r.responses; used++; }
  return N ? { cr: 1 - E / N, languages: used, responses: N } : { cr: NaN, languages: 0, responses: 0 };
}
export function eo4Statistic(matrix, stems = Object.keys(matrix)) {
  const crs = EO4_ORDERS.map((o) => coefficientOfReproducibility(matrix, o, stems).cr), eo = crs[EO_ORDER_INDEX], others = crs.filter((_, i) => i !== EO_ORDER_INDEX);
  return { crEO: eo, meanOthers: mean(others), theta: eo - mean(others), rank: 1 + others.filter((c) => c > eo + 1e-12).length, first: others.every((c) => c < eo - 1e-12), crs };
}
/** the dominant Unicode script of a system's own text (derived, never typed). */
export function scriptOfText(text) {
  const SC = [["Latin", /\p{Script=Latin}/u], ["Cyrillic", /\p{Script=Cyrillic}/u], ["Greek", /\p{Script=Greek}/u], ["Arabic", /\p{Script=Arabic}/u], ["Hebrew", /\p{Script=Hebrew}/u], ["Han", /\p{Script=Han}/u], ["Kana", /[\p{Script=Hiragana}\p{Script=Katakana}]/u], ["Hangul", /\p{Script=Hangul}/u], ["Indic", /[\p{Script=Devanagari}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Bengali}]/u], ["Georgian", /\p{Script=Georgian}/u], ["Armenian", /\p{Script=Armenian}/u]];
  const cnt = new Map(); for (const ch of text) { const f = SC.find(([, re]) => re.test(ch)); if (f) cnt.set(f[0], (cnt.get(f[0]) ?? 0) + 1); }
  return [...cnt].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Other";
}
function permuteColumns(matrix, stems, strata, rng) {
  const out = Object.fromEntries(stems.map((s) => [s, matrix[s].slice()])), groups = new Map();
  for (const s of stems) (groups.get(strata ? strata[s] : "all") ?? groups.set(strata ? strata[s] : "all", []).get(strata ? strata[s] : "all")).push(s);
  for (const g of groups.values()) for (let j = 0; j < 4; j++) { const idx = g.filter((s) => matrix[s][j] !== null), vals = shuffleInPlace(idx.map((s) => matrix[s][j]), rng); idx.forEach((s, i) => { out[s][j] = vals[i]; }); }
  return out;
}
/** the pooled statistic with a lineage-cluster bootstrap and the permutation nulls (unstratified and script-stratified). */
export function eo4Analyse(matrix, { stems = Object.keys(matrix), strata = null, draws = DRAWS, boot = BOOT, rngKey = "" } = {}) {
  const ok = stems.filter((s) => scalogramErrors(matrix[s], [0, 1, 2, 3])), obs = eo4Statistic(matrix, ok);
  const rng = makeRng("EO-4", "null", rngKey), nullCR = (st) => { const arr = new Float64Array(draws); for (let d = 0; d < draws; d++) arr[d] = coefficientOfReproducibility(permuteColumns(matrix, ok, st, rng), EO4_ORDERS[EO_ORDER_INDEX], ok).cr; return arr; };
  const n0 = nullCR(null), pAll = (1 + n0.filter((x) => x >= obs.crEO - 1e-12).length) / (draws + 1);
  let pStrat = null; if (strata) { const n1 = nullCR(strata); pStrat = (1 + n1.filter((x) => x >= obs.crEO - 1e-12).length) / (draws + 1); }
  const byLin = new Map(); for (const s of ok) (byLin.get(lineageOfStem(s)) ?? byLin.set(lineageOfStem(s), []).get(lineageOfStem(s))).push(s);
  const lins = [...byLin.keys()], brng = makeRng("EO-4", "boot", rngKey), reps = [];
  for (let b = 0; b < boot; b++) { const pick = []; for (let i = 0; i < lins.length; i++) pick.push(...byLin.get(lins[Math.floor(brng() * lins.length)])); const rm = Object.fromEntries(pick.map((s, i) => [`${s}#${i}`, matrix[s]])); const st = eo4Statistic(rm); if (Number.isFinite(st.theta)) reps.push(st.theta); }
  return { ...obs, languages: ok.length, lineages: lins.length, ci95: reps.length ? percentileCI(reps) : [NaN, NaN], pPermutation: pAll, pStratified: pStrat, permutationMeanCR: mean(Array.from(n0)) };
}
/** a Guttman-scaled world at the real missingness: with probability q a language is scaled (10 percent response error), else random at the rung's marginal rate. */
export function plantGuttmanWorld(matrix, q, key, { copies = 1, error = 0.1 } = {}) {
  const rng = makeRng("EO-4", "plant", key), stems = Object.keys(matrix), rate = [0, 1, 2, 3].map((j) => { const v = stems.map((s) => matrix[s][j]).filter((x) => x !== null); return v.length ? v.filter(Boolean).length / v.length : 0.5; });
  const out = {};
  for (let c = 0; c < copies; c++) for (const s of stems) {
    const h = Math.floor(rng() * 5), scaled = rng() < q;
    out[`${s}#${c}`] = matrix[s].map((v, j) => { if (v === null) return null; if (!scaled) return rng() < rate[j]; const ideal = j < h; return rng() < error ? !ideal : ideal; });
  }
  return out;
}
export function eo4PowerCard(matrix, ctx, { force = false, log = null } = {}) {
  const fp = sha256(JSON.stringify(matrix)), file = cachePath(ctx, "eo4-power", `${fp}|${ctx.quick}`);
  if (!force) { const c = readCache(file); if (c) return { ...c, cached: true, cacheFile: file }; }
  const s = SESOI["EO-4"].value, R = ctx.quick ? 40 : POWER_REPS.eo4, D = ctx.quick ? 199 : 499, B = ctx.quick ? 100 : 200, Rcal = ctx.quick ? 10 : 30;
  const qGrid = Array.from({ length: 11 }, (_, i) => i / 10), point = (w) => { const m = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v])); return eo4Statistic(m).theta; };
  const grid = qGrid.map((q) => { let acc = 0, n = 0; for (let r = 0; r < Rcal; r++) { const t = point(plantGuttmanWorld(matrix, q, `cal${r}`)); if (Number.isFinite(t)) { acc += t; n++; } } return { gamma: q, est: n ? acc / n : NaN }; });
  const nLang = Object.keys(matrix).filter((st) => scalogramErrors(matrix[st], [0, 1, 2, 3])).length;
  if (nLang < 4) { const card = { schema: "EO4PowerCard@1", split: ctx.split, pass: false, P_up: false, P_down: false, tinyOk: true, languages: nLang, reason: `only ${nLang} languages have >= 3 non-missing rungs`, headerSha: ctx.headerSha }; writeCache(file, card); return { ...card, cached: false, cacheFile: file }; }
  const targets = { up: 2 * s, down: 0.5 * s, tiny: 0.1 * s }, g = Object.fromEntries(Object.entries(targets).map(([k, t]) => [k, solveGamma(grid, t)]));
  const run = (gm, copies, tag, hit) => { if (!gm.reachable) return { hits: 0, n: R, unreachable: true, reason: gm.reason }; let hits = 0, ests = []; for (let r = 0; r < R; r++) { const w = plantGuttmanWorld(matrix, gm.gamma, `${tag}${r}`, { copies }), a = eo4Analyse(w, { stems: Object.keys(w), draws: D, boot: B, rngKey: `${tag}${r}` }); ests.push(a.theta); if (hit(a)) hits++; } return { hits, n: R, meanEst: mean(ests.filter(Number.isFinite)) }; };
  const up = run(g.up, 1, "up", (a) => a.ci95[0] > s && a.first), down = run(g.down, 1, "down", (a) => a.ci95[1] < s), tiny = run(g.tiny, 10, "tiny", (a) => a.ci95[0] > s && a.first), zero = run({ gamma: 0, reachable: true }, 1, "zero", (a) => a.pPermutation <= ALPHA);
  const gate = powerGate({ up, down, tiny: tiny.unreachable ? { hits: 0, n: R } : tiny, reps: R }), zr = rejectsRateLE(zero.hits, zero.n);
  const card = { schema: "EO4PowerCard@1", split: ctx.split, languages: nLang, grid, gammas: g, targets, up: gate.up, down: gate.down, tiny: gate.tiny, zero: { ...zero, rejectedAsLEalpha: zr }, P_up: gate.P_up && !up.unreachable, P_down: gate.P_down && !down.unreachable, tinyOk: gate.tinyOk, zeroOk: !zr, pass: gate.pass && !zr && !up.unreachable && !down.unreachable, reps: { R, D, B, Rcal }, headerSha: ctx.headerSha };
  log?.(`eo4 power: ${JSON.stringify({ up: up.hits, down: down.hits, tiny: tiny.hits, zero: zero.hits, pass: card.pass })}`);
  writeCache(file, card); return { ...card, cached: false, cacheFile: file };
}
export function runEo4(ctx, { log = null, cards = null, powerCard = null, draws = DRAWS, boot = BOOT } = {}) {
  registryLint(); const t0 = Date.now(), c = cards ?? readCards(ctx), sE = SESOI["EO-4"].value;
  const base = { id: "EO-4", claim: EO_CLAIMS[3].claim, source: EO_CLAIMS[3].file,
    steelman: "Every adjacency of the operator chain is a presupposition (S14): a floor can starve because the floor below did not individuate enough events. The strongest reading: across systems, outcomes on the ladder form an implicational (Guttman) scale in floor order, failures cascading UPWARD and not downward. The cards are the SUT's outputs; the claim tested is the structure of their ORDER, never their level; a script confound is the first alternative (r3's script_without_case is a script property).",
    bearing: EO_SENTENCES["EO-4"].bearing, eoSentence: EO_SENTENCES["EO-4"].eoSentence, eoSentenceLicensed: false, consumed: false, split: ctx.split,
    inputs: { headerSha256: ctx.headerSha, manifest: [...ctx.manifest].map(([f, v]) => ({ file: f, ...v })) } };
  const nPer = EO4_RUNGS.map((r, j) => c.stems.filter((s) => c.matrix[s][j] !== null).length), nUsable = c.stems.filter((s) => scalogramErrors(c.matrix[s], [0, 1, 2, 3])).length;
  const heldOutSystems = c.stems;
  if (nUsable < 4) return { ...base, outcome: "untestable", verdict: "NOT_TESTABLE_NOW", verdictReasons: [`only ${nUsable} languages have >= 3 non-missing rungs on the ${ctx.split} cards`], statistic: { cardsPerRung: Object.fromEntries(EO4_RUNGS.map((r, j) => [r, nPer[j]])), languagesWithThreeRungs: nUsable }, null: {}, control: [], power: {}, alternativeScores: {}, heldOutSystems, gaps: c.gaps.concat([{ gap: "cards", detail: "more cards of r3 and r4 across more languages (the competence workflow is producing them)" }]), notes: [] };
  const power = powerCard ?? eo4PowerCard(c.matrix, ctx, { log });
  const cardsPerRung = Object.fromEntries(EO4_RUNGS.map((r, j) => [r, nPer[j]]));
  if (!power.pass) return { ...base, outcome: "underpowered", verdict: "UNDERPOWERED", verdictReasons: ["power gate failed before real data: the statistic is withheld (no peek)"], headline: false, statistic: { withheld: true, cardsPerRung, languagesWithThreeRungs: nUsable }, null: {}, control: [], power: ser(power), alternativeScores: {}, heldOutSystems, gaps: c.gaps, notes: ["EXPECTED by BARKER.md 6.5: r4 has few cards"] };
  const scriptBy = {}; for (const s of Object.keys(c.matrix)) { const f = trainPath(s); scriptBy[s] = fs.existsSync(f) ? scriptOfText(readTextLines(f, { maxChars: 20000 }).join("")) : "Other"; }
  const a = eo4Analyse(c.matrix, { strata: scriptBy, draws, boot }), controlsOk = true;
  const args = { theta: a.theta, ci95: a.ci95, sesoi: sE, powerUp: power.P_up, powerDown: power.P_down, tinyOk: power.tinyOk && power.zeroOk, controlsOk, nullOk: a.pPermutation <= ALPHA && (a.pStratified ?? 1) <= ALPHA && a.first, mustBeatOk: a.first, signGate: null, bridge: EO_SENTENCES["EO-4"].licensed ? "licensed" : "unlicensed", consumed: false };
  const v = minimumEffectVerdict(args);
  return { ...base, outcome: v.outcome, verdict: v.verdict, verdictReasons: v.reasons, headline: v.headline, sensitivity: sensitivityOf(args, sE), statistic: ser({ ...a, crs: undefined, cardsPerRung, scripts: scriptBy, eoRankOf24: a.rank, sesoi: sE }), null: { rule: "each rung's column permuted across languages (unstratified and within script strata)", draws }, control: [{ id: "column-permutation", expected: "CR_EO at the permutation mean", observed: { permutationMeanCR: a.permutationMeanCR }, survived: false }], power: ser(power), alternativeScores: { orders: "all 24 orders of the four rungs", eoRank: a.rank }, heldOutSystems, gaps: c.gaps, notes: [`seconds ${(Date.now() - t0) / 1000}`] };
}

// ═════════════════════════════════ CALIBRATIONS (K2, K3), CROSSWALK, DISPATCH, CLI ═════════════════════════════════
const hashWord = (w) => { let h = 2166136261; for (const ch of w) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
/**
 * K2 instrument: label stability under a within-unit shuffle of the words. contentShare = (stability - chance) / (1 - chance), chance = sum of squared label
 * marginals. A labeler whose lower-bound contentShare exceeds 1/2 (a bare ratio gate: PROVISIONAL) is CONTENT-DETERMINED: REFUTED as a move taxonomy.
 */
export function labelStability(units, labeler, { boot = 500, key = "" } = {}) {
  const rng = makeRng("K2", key), perUnit = [], marg = new Map(); let tot = 0;
  for (const u of units) {
    const orig = u.map((w, i) => labeler(w, i, u)), perm = shuffleInPlace(u.map((_, i) => i), rng), sh = perm.map((p) => u[p]);
    let same = 0; sh.forEach((w, j) => { if (labeler(w, j, sh) === orig[perm[j]]) same++; });
    perUnit.push([same, u.length]); for (const l of orig) { marg.set(l, (marg.get(l) ?? 0) + 1); tot++; }
  }
  const chance = [...marg.values()].reduce((a, c) => a + (c / tot) ** 2, 0), share = (pairs) => { const s = pairs.reduce((a, [x]) => a + x, 0) / pairs.reduce((a, [, n]) => a + n, 0); return (s - chance) / (1 - chance); };
  const reps = []; for (let b = 0; b < boot; b++) { const pick = []; for (let i = 0; i < perUnit.length; i++) pick.push(perUnit[Math.floor(rng() * perUnit.length)]); reps.push(share(pick)); }
  const stability = perUnit.reduce((a, [x]) => a + x, 0) / perUnit.reduce((a, [, n]) => a + n, 0), ci = percentileCI(reps);
  return { stability, chance, contentShare: share(perUnit), ci95: ci, contentDetermined: ci[0] > 0.5 };
}
/** K3 instrument: does company (previous and next word) predict a token's act beyond chance? Plug-in mutual information minus Miller-Madow, permutation p. */
export function companyAct(tokens, { draws = 199, key = "" } = {}) {
  const rng = makeRng("K3", key), n = tokens.length, ctxs = tokens.map((t) => `${t.prev}|${t.next}`), acts = tokens.map((t) => String(t.act));
  const mi = (c, a) => { const cj = new Map(), cc = new Map(), ca = new Map(); for (let i = 0; i < n; i++) { const k = `${c[i]}#${a[i]}`; cj.set(k, (cj.get(k) ?? 0) + 1); cc.set(c[i], (cc.get(c[i]) ?? 0) + 1); ca.set(a[i], (ca.get(a[i]) ?? 0) + 1); } let m = 0; for (const [k, v] of cj) { const [x, y] = k.split("#"); m += (v / n) * Math.log2((v * n) / (cc.get(x) * ca.get(y))); } return m - ((cc.size - 1) * (ca.size - 1)) / (2 * n * Math.LN2); };
  const obs = mi(ctxs, acts); let ge = 0; const sh = acts.slice();
  for (let d = 0; d < draws; d++) { shuffleInPlace(sh, rng); if (mi(ctxs, sh) >= obs) ge++; }
  return { mi: obs, p: (1 + ge) / (draws + 1) };
}
/** BARKER.md 6.8: calibration claims known false; K1, K4, K5 belong to other modules and are returned as typed `delegated`, never as passed. */
export function calibration(ctx = null, { quick = false } = {}) {
  const cards = [], R = quick ? 3 : 40;
  const vocab = Array.from({ length: 200 }, (_, i) => `w${i}`), mkUnits = (key) => { const rng = makeRng("K2", "units", key); return Array.from({ length: 120 }, () => Array.from({ length: 40 }, () => vocab[Math.floor(rng() * vocab.length)])); };
  const units = mkUnits("a"), content = (w) => hashWord(w) % 9, move = (w, i, u) => (i + hashWord(i > 0 ? u[i - 1] : "^")) % 9;
  const kc = labelStability(units, content, { key: "content" }), km = labelStability(units, move, { key: "move" });
  cards.push({ id: "K2 cells from content", planted: "labels generated from word identity versus labels depending on position and the previous word", observed: { content: kc, move: km }, required: "the content labeler reads content-determined (REFUTED as a move taxonomy); the move labeler does not", pass: kc.contentDetermined === true && km.contentDetermined === false, verdict: kc.contentDetermined && !km.contentDetermined ? "REFUTED as a move taxonomy reproduced" : "INSTRUMENT_FAILED" });
  let hits = 0, powerHits = 0;
  for (let r = 0; r < R; r++) {
    const rng = makeRng("K3", "world", r), W = Array.from({ length: 40 }, (_, i) => `v${i}`), toks = Array.from({ length: 1500 }, () => ({ prev: W[Math.floor(rng() * 40)], next: W[Math.floor(rng() * 40)], act: Math.floor(rng() * 9) }));
    if (companyAct(toks, { key: `n${r}`, draws: 99 }).p <= ALPHA) hits++;
    const dep = toks.map((t) => ({ ...t, act: hashWord(t.prev) % 3 === 0 ? 0 : t.act })); if (companyAct(dep, { key: `p${r}`, draws: 99 }).p <= ALPHA) powerHits++;
  }
  cards.push({ id: "K3 company as act", planted: "an act independent of company; and the same world with a planted dependence", observed: { falseRate: hits / R, hits, worlds: R, detectsPlanted: powerHits / R }, required: "company statistics at chance (false rate not rejected as > alpha) and a planted dependence detected at rate >= 0.8", pass: !rejectsRateLE(hits, R) && powerHits / R >= 0.8, verdict: !rejectsRateLE(hits, R) && powerHits / R >= 0.8 ? "company is not act reproduced" : "INSTRUMENT_FAILED" });
  cards.push({ id: "K6 plain N1 is vacuous", delegated: "EO-1 control iii (eo1Controls), run inside runEo1", pass: null, verdict: "see EO-1 controls" });
  cards.push({ id: "K7 count artefact", delegated: "EO-2 control c4 (eo2Controls), run inside runEo2", pass: null, verdict: "see EO-2 controls" });
  for (const [id, owner] of [["K1 recurrence alone admits identity", "the arch cards (induce.mjs: every card using recurrence returns TRIVIAL)"], ["K4 wrong k", "the arch cards A06 and A09 (induce.mjs)"], ["K5 a gradient is not a kind", "the kind pipeline (organs/barker.js: W-continuum)"]]) cards.push({ id, delegated: owner, pass: null, verdict: "DELEGATED: not run here, never counted as passed" });
  return cards;
}
/** The COMPARATIVE phase (BARKER.md 6.7): structure claimed, operational reading available now, where tested. No verdicts. */
export function crosswalk() {
  return [
    { framework: "EO", claim: "9 operators = 3 modes x 3 domains; 3 grains (void, beings, fold; 0/n/1); cells classify moves", reading: "partly: the act table (EO-1), the grammar table (EO-2), floor order on cards (EO-4); moves: no", where: "EO-1..EO-4" },
    { framework: "Peirce (valence reading is a received analogy, not FoA's)", claim: "three categories: monadic, dyadic, triadic", reading: "yes, as valency of VerbNet frames", where: "EO-1 rival P3" },
    { framework: "Integral theory (Wilber; FoA pp.19, 26-27)", claim: "four quadrants; Big Three I, we, it", reading: "partly: Person only; no received proximity order, so NOT RUN", where: "EO-2 rival TR (not run)" },
    { framework: "Henriques' Unified Theory of Knowledge (FoA pp.19, 31-32)", claim: "joint points energy-matter, life, mind, culture", reading: "no (not a property of text)", where: "none" },
    { framework: "Commons' model of hierarchical complexity (FoA pp.22-23)", claim: "orders by coordination of lower-order actions", reading: "proxy on products (Strahler order); EO cites MHC so agreement is not independent", where: "arch card A03" },
    { framework: "Chomsky universal grammar (FoA Table 4, p.113)", claim: "interfaces plus recursion", reading: "partly: self-nesting (recursion) of relation types", where: "arch card A02" },
    { framework: "Alderman integral grammatology (FoA p.28)", claim: "six parts of speech as onto-epistemic elements", reading: "partly: a six-class partition claim", where: "arch card A01; EO-2 context" },
    { framework: "Nicolescu (FoA p.25)", claim: "included middle", reading: "yes: graded boundary", where: "arch card A05" },
    { framework: "Feibleman laws of levels (FoA p.22)", claim: "levels organise those below plus an emergent quality", reading: "partly", where: "arch card A06" },
    { framework: "Wolfram ruliad (FoA pp.29-31)", claim: "the limit of all possible rule applications", reading: "no", where: "gap" },
    { framework: "UD (practical typology)", claim: "17 UPOS, 37 deprels, FEATS", reading: "yes: the gold", where: "everywhere" },
    { framework: "Barker's own induced metastructure", claim: "the kinds and arches Barker finds", reading: "yes, by construction", where: "self.mjs (section 7)" },
  ].map((r) => ({ ...r, phase: "COMPARATIVE", verdict: null }));
}
const untestableCard = (id, ctx) => { const e = EO_CLAIMS.find((c) => c.id === id), g = NOT_TESTABLE[id] ?? NOT_TESTABLE[id === "EO-9" ? "EO-9" : id]; return { id, claim: e?.claim, source: e?.file, steelman: "see the claim's own documents; the test cannot be built without the missing data", bearing: e?.bearing, split: ctx.split, outcome: "untestable", verdict: "NOT_TESTABLE_NOW", statistic: null, null: null, control: null, power: null, alternativeScores: {}, heldOutSystems: [], gaps: [{ gap: "missing data", why: g?.why ?? e?.status, missing: g?.missing ?? "n/a" }], notes: [] }; };
export function runClaim(id, ctx, opts = {}) {
  switch (id) {
    case "EO-1": return runEo1(ctx, opts);
    case "EO-2": return runEo2(ctx, opts);
    case "EO-3": return runEo3(ctx, opts);
    case "EO-4": return runEo4(ctx, opts);
    case "EO-5": case "EO-6": { const e = EO_CLAIMS.find((c) => c.id === id); return { id, claim: e.claim, source: e.file, steelman: "on record refuted by EO's own tests; used as a calibration, not re-litigated", bearing: "n/a", split: ctx.split, outcome: "refuted", verdict: "REFUTED (on record, calibration)", statistic: null, null: null, control: calibration(ctx, { quick: opts.quick }), power: null, alternativeScores: {}, heldOutSystems: [], gaps: [], notes: ["EO's record: 95.7 percent of cell assignments survived shuffling words inside 2,527 paragraphs; recurrence alone is not admission"] }; }
    case "EO-7": case "EO-8": case "EO-9": case "EO-10": return untestableCard(id, ctx);
    case "EO-11": case "EO-12": { const e = EO_CLAIMS.find((c) => c.id === id), g = NOT_TESTABLE[id]; return { ...untestableCard(id, ctx), verdict: "NOT_RUN", gaps: [{ gap: "not run", why: g.why, missing: g.missing }] }; }
    default: throw new Error(`unknown claim ${id}; known: ${EO_CLAIMS.map((c) => c.id).join(", ")}`);
  }
}
const SEVERITY = ["INSTRUMENT_FAILED", "UNDERPOWERED", "REFUTED", "WEAKENED", "SURVIVES", "NOT_TESTABLE_NOW"];
/** failures first; near-foregone tests in their own table; no aggregate EO score. */
export function batterySummary(cards) {
  const rows = cards.map((c) => ({ id: c.id, verdict: c.verdict, outcome: c.outcome, headline: !!c.headline, nearForegone: !!c.nearForegone, bearing: c.bearing }));
  const rank = (r) => { const i = SEVERITY.indexOf(String(r.verdict).split(" ")[0]); return i < 0 ? 99 : i; };
  return { failuresFirst: rows.filter((r) => !r.nearForegone).sort((a, b) => rank(a) - rank(b)), nearForegone: rows.filter((r) => r.nearForegone), aggregateEoScore: null, note: "there is no aggregate EO score; the report lists claims" };
}
export function writeCard(ctx, card, tag = card.id) { fs.mkdirSync(ctx.outDir, { recursive: true }); const f = path.join(ctx.outDir, `eo-claims-${ctx.split}-${tag}.json`); fs.writeFileSync(f, JSON.stringify(card, null, 1)); return f; }
export function parseCli(argv) {
  const o = { split: "dev", claim: null, confirmTest: false, quick: false, out: OUT_DIR, list: false, crosswalk: false, calibration: false, powerOnly: false, only: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--split") o.split = argv[++i]; else if (a === "--claim") o.claim = argv[++i]; else if (a === "--confirm-test") o.confirmTest = true; else if (a === "--quick") o.quick = true;
    else if (a === "--out") o.out = argv[++i]; else if (a === "--list") o.list = true; else if (a === "--crosswalk") o.crosswalk = true; else if (a === "--calibration") o.calibration = true; else if (a === "--power-only") o.powerOnly = true; else if (a === "--only") o.only = argv[++i].split(",");
    else throw new Error(`unknown argument ${a}`);
  }
  return o;
}
export async function main(argv = process.argv.slice(2)) {
  const o = parseCli(argv), log = (s) => process.stderr.write(`[eo-claims ${new Date().toISOString().slice(11, 19)}] ${s}\n`);
  if (o.list) { console.log(JSON.stringify(EO_CLAIMS.map((c) => ({ id: c.id, status: c.status, bearing: c.bearing })), null, 1)); return 0; }
  if (o.crosswalk) { console.log(JSON.stringify(crosswalk(), null, 1)); return 0; }
  const ctx = makeCtx({ split: o.split, confirmTest: o.confirmTest, outDir: o.out, quick: o.quick });
  if (o.calibration) { console.log(JSON.stringify(calibration(ctx, { quick: o.quick }), null, 1)); return 0; }
  const ids = o.claim ? [o.claim] : ["EO-1", "EO-2", "EO-3", "EO-4", "EO-5", "EO-6", "EO-7", "EO-8", "EO-9", "EO-10", "EO-11", "EO-12"], cards = [];
  for (const id of ids) {
    log(`running ${id} on ${ctx.split}${o.quick ? " (QUICK: reduced power replicates, not the registered card)" : ""}`);
    const card = runClaim(id, ctx, { log, quick: o.quick, only: o.only }); card.preregHeaderSha256 = ctx.headerSha; card.quick = o.quick; cards.push(card);
    log(`${id}: ${card.verdict} (${card.outcome}) -> ${writeCard(ctx, card)}`);
  }
  const summary = batterySummary(cards); if (!o.claim) { writeCard(ctx, { crosswalk: crosswalk(), calibration: calibration(ctx, { quick: o.quick }), summary }, "battery"); }
  console.log(JSON.stringify({ split: ctx.split, summary: o.claim ? cards.map((c) => ({ id: c.id, verdict: c.verdict, outcome: c.outcome, reasons: c.verdictReasons })) : summary, outDir: ctx.outDir }, null, 1));
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === HERE) main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
