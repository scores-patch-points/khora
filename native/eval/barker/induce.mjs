// eval/barker/induce.mjs — BARKER, the induction: kinds of systems (Level S), of word types (Level W)
// and of relations (Level R), and the arch cards A01..A13, each with a permutation null, resampling
// stability and a planted-structure power check before anything is reported. Zero model: no LLM
// call, no learned vector representation, no network access anywhere in this file.
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═════════════════════════════════
// Written BEFORE the first run of this file on any real system. Nothing below is tuned after a
// result; a prediction that fails is reported as failed. The sha256 of this leading comment block
// is stamped into every output (prereg_sha256) so that an after-the-fact edit is visible by
// comparing digests. This block restates, for the part of docs/BARKER.md that THIS file builds,
// the claim, definitions, nulls, controls, power checks and pass rules; where it is stricter or
// more specific than BARKER.md it says so ("ADAPTATION"), and where BARKER.md is silent or
// ambiguous it states the reading adopted and flags it ("READING"). BARKER.md wins on any
// conflict it does not mark.
//
// STANDING. Nomination and a measuring instrument, not a finding. FoA (Foundations of
// Archdisciplinarity, ARC 2024) is paraphrased by printed page in docs/BARKER.md; nothing of it
// is reproduced here. Every falsifier in this file is Barker-in-khora, not FoA's.
//
// ── 0. SPLIT AND DATA DISCIPLINE ───────────────────────────────────────────────────────────────
//   --split dev (default) reads ONLY a system's train treebank (what it is built from), its dev
//   gold file (held-out gold) and the received priors under native/priors. The paths come from the
//   system's own SystemProfile@1 inputs (a system id pins file hashes, never a stem; stem kor is
//   the GSD treebank its priors are built on, tb/kor being KAIST). A file named test.conllu is
//   NEVER opened: --split test is refused unless eval/barker/PREREG.lock.json exists AND
//   --confirmatory is passed, and every read goes through guardPath(), which throws on a test
//   file otherwise. Development and smoke runs are DEV only.
//   Sentences of a system are sampled by the BARKER 3.5 rule: five seeds {1..5}, sentences shuffled
//   with createSeededRng({seed, system, purpose:"sample"}), filled to N = 16,000 non-PUNCT words
//   (PROVISIONAL, P4). A system with fewer than N words is a typed gap for every fixed-budget
//   quantity; N is never lowered for it (at the time of writing mar, tam, tel, uig and the
//   treebank-less lat, grc, san are such gaps).
//   Genealogy (lineage = independence unit, branch = blocking stratum) is an ANSWER KEY: the
//   profile's labels.lineage and labels.family (its branch), else GENEALOGY below (typed from the
//   standard classification, BARKER.md 2.1). It is never a feature. A disagreement between a
//   profile's label and GENEALOGY is reported (genealogyDisagreements).
//
// ── 1. WHAT THIS FILE CLAIMS, AND WHAT IT DOES NOT ─────────────────────────────────────────────
//   C1 (Level S). Given zero-model SystemProfile@1 vectors, the Kanada / characteristic-set /
//   spectral menu run under the organ's ONE search-aware ceiling (organs/barker.js::induceSystemKinds)
//   finds, per feature group A..G and on their concatenation (ALL), kinds of systems that survive
//   (a) the block-moving nulls N-feat, N-cov, N-cov1 and N-fam and (b) a gap (dip) test, labelled
//   CLUSTER, FAMILY-BOUND, GRADIENT or REFUSED exactly as BARKER 4.3. The matrix is the organ's own
//   block matrix (blockMatrixOf: median cuts, one-hot blocks, stability weights from the resamples)
//   after this file's drop rule (section 9). A statement of ABSENCE is licensed only if the SESOI
//   cell of the planted power grid (>= 4 systems, >= 3 lineages, >= 12 signature features at
//   strength >= 0.5) is admissible; otherwise absence reads UNDERPOWERED. A group whose W-copula
//   calibration is rejected reports no kind (INSTRUMENT_FAILED).
//   C2 (stability). A partition is STABLE iff the 5th percentile of its resample ARI exceeds the
//   95th percentile of the ARI between two independent N-feat-null partitions of the same matrix
//   (BARKER 7 S1: the bar is the null's own). Resamples: B_feat = 60 feature-block bootstraps
//   (blocks resampled with replacement) and B_sys = 60 system subsamples (80 percent without
//   replacement, re-binned); null pairs = 100. All four numbers are PROVISIONAL typed constants.
//   Partition = the partition an instrument's whole output induces (every candidate kind; 0 for
//   none), NOT a best-matching kind: best-matching would give the observation a selection the
//   null pair does not get (II.10). The ceiling-free instrument passes used for stability are the
//   spectral first split (sign of the first left singular vector of the column-standardised
//   matrix) and Kanada's validated (not fallback) candidates. A probe that finds no partition in
//   the data reads NO_PARTITION, never STABLE.
//   C3 (decomposition). Every dominant split and every kind is decomposed against the ANSWER KEYS
//   lineage, branch and script by adjusted Rand index with a permutation null WITHIN strata of the
//   other key (lineage and branch against script strata, script against lineage strata): "the kind
//   is the script" or "the kind is the family" are measured outcomes here, not failures.
//   C4 (Levels W and R). W: word types of ONE system, grouped by their company
//   (organs/kind-standing.js::discoverCompanyKinds on GOLD tokens, PUNCT removed, with its own
//   within-phrase shuffle nullArm: minMentions 10, minShare 0 (the null decides), minMembers 3,
//   100 null draws), scored afterwards against UPOS by NMI; the control is the same corpus with
//   each sentence's tokens shuffled, which must dissolve every kind. R: relation entities = (system,
//   deprel base) with >= 30 arcs in >= 3 of the 5 seeds, described by 8 LABEL-FREE descriptors
//   (dir: share of arcs with the dependent before its head; depClosed, headClosed: share of
//   dependents / heads whose UPOS is closed; dlen: mean |linear distance|; subsize: mean log2
//   dependent subtree size; valency: mean number of dependents of the head; proj: share of
//   projective arcs; depth: mean dependent depth), binned at pooled TERCILES (the organ's block
//   matrix), the five seeds as the stability weights. The organ's ceiling runs with `branches` =
//   the entity's SYSTEM (N-fam therefore redeals within system: entities of one system are not
//   exchangeable with another's) and the real lineages (a kind is labelled by lineage span). Scored
//   afterwards by NMI of the kind partition (0 = none) against the deprel label and against the
//   system label. Level K (kinds of kinds) is NOT implemented here (section 7).
//   C5 (cards). The registered arch cards (ARCH_REGISTRY), under the persistence rule of
//   BARKER 4.6 with the ADAPTATIONS of section 5.
//   NOT CLAIMED: that any kind is real, that any arch is universal, or anything about EO. This
//   file tests no EO claim and imports no EO module (the EO battery is eval/barker/eo-claims.mjs).
//
// ── 2. NULLS AND CONTROLS BUILT TO FAIL (II.23) ────────────────────────────────────────────────
//   Level S and R: the organ's ceiling over N-feat, N-cov, N-cov1, N-fam. The organ itself runs
//   control (a): the whole pipeline on controlReps block-permuted copies of the matrix must yield
//   no kind (exact binomial rule), else INSTRUMENT_FAILED; control (b): the W-copula calibration
//   (worlds carrying the real correlation and marginals, no cluster; exact binomial rule 16 of 200
//   at the registered size); control (c): the W-continuum world must be called GRADIENT or nothing.
//   Stability control (tests): block-permuted matrices must read no stable partition.
//   Cards: each card has its own null and its own control (section 6); a control is the registered
//   null itself run as the "real" corpus through the whole pipeline, and it must NOT show an effect
//   (pooled lower bound above the SESOI means INSTRUMENT_FAILED).
//
// ── 3. POWER (planted structure of the claimed kind; run FIRST, before any real-data statistic) ─
//   R2 ordering inside one run: (1) the Level-S power grid and the copula calibration of every
//   group (organ; reduced sizes in --smoke are stamped), (2) every card's power trio, in family
//   workers that prepare their data once and keep it for the later phases, (3) the power result is
//   canonicalised, hashed (power_sha256) and written to induce-power-<split>.json BEFORE (4) the
//   controls, and (5) the real-data statistics. A card row whose power trio fails is NOT run on
//   real data (status UNDERPOWERED, the real number is not computed); --peek computes it anyway,
//   labelled peeked, and the status stays UNDERPOWERED. A group whose calibration is rejected
//   reports no kind.
//   Card power TRIO (BARKER 6.0, applied to cards): planted worlds on the REAL per-system shapes
//   and denominators, whose true effect in the statistic's own units is 2 s_R (claim true), 0.5 s_R
//   (claim negligible) and 0.1 s_R at ten times the sample. P_up = share of replicates whose
//   whole-pipeline pooled interval has lower bound above s_R (needs >= 0.8); P_down = share whose
//   upper bound is below s_R (needs >= 0.8); tiny = share reaching the PERSISTENT conditions (needs
//   <= alpha). The planted effect is injected by a DIAL on the arrangement the null destroys,
//   calibrated per system (or globally where the statistic is joint) by calibrateDial: the first
//   upward crossing of the target on a grid, then bisection, so that the card's own statistic hits
//   the target in its own units; the same measurement function and the same persistence rule then
//   run unchanged. When the dial cannot reach the target (capped) the achieved effect is recorded
//   in power.calibration; passing P_up at a weaker planted effect implies passing at 2 s_R, and a
//   cap below s_R is UNDERPOWERED by construction. Replicates: 10 (smoke 4; the tiny world half as
//   many, at least 3), bootstrap B = 400 inside a replicate.
//   The system-level cards run their planted checks with the power stage: A07 (planted within-branch
//   partial Spearman -0.6 must give an interval upper bound below -0.3, -0.15 must not; on the real
//   layout) and A12 (a planted unity world must give an excess ARI above 0.20 with p <= alpha and a
//   planted pluralism world must not). Their pooled real-data estimate is printed only if the
//   planted check passes (else withheld, no peek).
//
// ── 4. SESOI (BARKER 4.7a; PROVISIONAL until signed, Appendix B5; written before any power card) ─
//   A01 0.03 F1; A02 0.02 (S) and 0.05 (Gini); A03 0.25 (Rb); A04 derived at run; A05 0.10
//   (Jaccard); A06 0.20; A07 rho <= -0.30 / variance ratio <= 0.80; A08 0.10 (exponent); A09
//   0.05 / 0.01 nats; A10 1.25 (ratio); A11 none; A12 0.20 (ARI); A13 0.05.
//
// ── 5. THE PERSISTENCE RULE AS IMPLEMENTED (BARKER 4.6) AND ITS ADAPTATIONS ────────────────────
//   Per system s: stat_s, null draws, excess_s = stat_s - median(null_s), excess95_s = stat_s -
//   q95(null_s). Nested means systems -> branches -> lineages give theta_l and theta95_l.
//   h_l = 1 iff theta_l > 0, else 0; UNDEFINED (out of the denominator, never a 0) when every
//   system of l fails the card's denominator floor. n_l = defined lineages; k = sum h_l; the sign
//   gate passes iff the exact one-sided binomial tail P(X >= k | n_l, 1/2) <= alpha, reachable
//   only for n_l >= 5 (reachability table 5/5, 6/6, 7/7, 7/8, 8/9 ... derived, printed).
//   PERSISTENT needs ALL of: (1) the lineage-cluster bootstrap (B = 2,000, lineages resampled with
//   replacement after nested averaging) 95 percent LOWER bound of pooled theta above s_R; (2) the
//   sign gate and leave-one-lineage-out lower bounds all above s_R; (3) >= 2 independent channels
//   agree (see ADAPTATION A); (4) the control built to fail failed; (5) the card's power trio
//   passed (P_up >= 0.8, P_down >= 0.8, tiny <= alpha); (6) pooled theta95 >= s_R (the registered
//   trivial null is beaten by at least the SESOI). PERSISTENT-OUTSIDE-IE repeats (1), (2), (6) over
//   lineages other than Indo-European and is read only when PERSISTENT is not. FAMILY-BOUND = the
//   pooled interval passes but the sign gate or the leave-one-lineage-out check fails. TRIVIAL =
//   (6) fails. ABSENT = upper bound below s_R AND the trio passed AND the control failed.
//   UNDERPOWERED = trio failed, or n_l < 5, or the interval straddles s_R. INSTRUMENT_FAILED = the
//   control survived. Holm (over the cards) applies to the pooled test only.
//   ADAPTATION A (single channel). Every UD-only card has ONE channel (treebank layers share an
//   ancestor, BARKER 3.3). Condition (3) therefore cannot be met by any card in this build and
//   the registered status is capped: a card that would otherwise be PERSISTENT reads
//   UNDERPOWERED with reason "channels < 2", and statusIfChannelWaived is printed beside it,
//   labelled DIAGNOSTIC, entering no list. (A second channel needs a code-AST corpus or a second
//   giver; neither exists on disk at the time of writing.)
//   ADAPTATION B (statistics that are not per-lineage quantities: A07, A12). They are undefined
//   inside a one-system lineage, so n_l < 5 and the registered gate is UNDERPOWERED BY
//   REACHABILITY by construction. The pooled estimate and its lineage-cluster interval are still
//   printed (when the planted check passes), with a leave-one-lineage-out table as a DIAGNOSTIC
//   that a later addendum could promote to a gate. This is reported as a design finding (a
//   registered card that cannot pass), not as a result about the regularity.
//   ADAPTATION C (denominators). Because N is common, the planted power at a lineage's own n
//   equals the card-level power, so a lineage is UNDEFINED only for a failed denominator floor.
//   ADAPTATION D (A01 matched-frequency). A01 that would otherwise be PERSISTENT (or capped by A)
//   reads TRIVIAL when the pooled matched-frequency sign test (closed types have lower context
//   diversity than open types within token-mass deciles, ties dropped and counted) has p > alpha.
//
// ── 6. CARDS IMPLEMENTED IN THIS BUILD (rule, null, control, planted world) ────────────────────
//   A08 ZIPF (calibration card). stat: rank-frequency exponent s = 1/(alpha - 1) from the
//     approximate discrete power-law MLE of Clauset-Shalizi-Newman (eq. 3.7; xmin on a grid of at
//     most 25 distinct count values with >= 50 tail types, chosen by KS distance; PROVISIONAL grid)
//     on the N-word sample of gold tokens. Null: M = 40 monkey-typing corpora per system, N tokens
//     whose characters are drawn i.i.d. from the system's own character distribution with the
//     token-boundary probability matched (tokens / characters); one axis differs (no lexical
//     structure). theta_s = |s_obs - mu_monkey| - 2 sd_monkey (outside the monkey band; the null
//     draws are the band half-width). Control: a monkey corpus run as "real" must land inside the
//     band. Planted: tokens drawn from a Zipf(s_gen) over 40,000 ranks, s_gen = mu_monkey + 2q,
//     q calibrated per system. Recorded: TRIVIAL expected (P 0.90).
//   A03 HIERARCHICAL LADDER. stat: bifurcation ratio Rb = exp(-slope) of a node-count-weighted
//     regression of ln N_k on Strahler order k (leading orders with N_k >= 3, at least 3 orders;
//     R-squared printed). Null: D = 40 draws (five-seed means) of ARITY-MATCHED random plane trees
//     (each sentence keeps its size and its multiset of child counts; arrangement uniform by the
//     cycle lemma, verified by exact enumeration in the tests; PUNCT excluded). theta_s =
//     |Rb_real - median(Rb_null)|; null draws are |Rb_d - median|. Control: a null draw run as
//     "real". Planted: a fraction q of sentence trees replaced by the degree-sorted breadth-first
//     arrangement of the same degree multiset, the rest random; q calibrated so theta = target. The
//     signed difference per system is printed (the claim says family-consistent). FoA's MHC scores
//     behaviour; this scores products: a proxy.
//   A02 RECURSION WITH TYPES. stat S = share of non-root tokens having a proper descendant of the
//     same deprel base; G = Gini of the per-type shares over types with >= 30 tokens. Null (i):
//     deprel bases permuted within each tree among non-root tokens (shape and per-tree label
//     multiset fixed), D = 40. Two rows (S: s_R 0.02; G: s_R 0.05); the card status is the WEAKEST
//     of the two rows by the order INSTRUMENT_FAILED < UNDERPOWERED < ABSENT < TRIVIAL <
//     FAMILY-BOUND < CHANNEL-BOUND < PERSISTENT-OUTSIDE-IE < PERSISTENT (type concentration is the
//     discriminating claim, so G cannot be waived). Controls: flat trees (all tokens children of the
//     root) must give S = 0 exactly; a label-permuted corpus run as "real". Planted: on the real
//     shapes non-root tokens take a label drawn from the system's label marginal or, with probability
//     q when the parent is a non-root token of a nesting type, the parent's label. Nesting types: the
//     3 most frequent types for the S row; the types at frequency ranks 3 and 7 (1-indexed) for the
//     G row (Gini excess is non-monotone in q: it rises, peaks and falls, so the dial is the first
//     upward crossing). Each row's world is calibrated in that row's units.
//   A05 GRADED MIDDLE. From priors/pos-<stem>.json: a form carries a tag if the tag count >= 2
//     (PUNCT, SYM, X are not word classes); edge weight of a tag pair = number of forms carrying
//     both; E_s = the top k = 5 pairs by weight (ties by pair key; k PROVISIONAL). theta_s = mean over
//     systems of OTHER lineages of Jaccard(E_s, E_t) minus the median of the same quantity under the
//     configuration null (the tag column of the (form, tag) pairs shuffled across forms; per-form
//     tag counts and global tag marginals kept; a form that would receive a tag twice is repaired by
//     swapping with a random pair elsewhere, so no collapse), D = 200 joint draws. Control: a
//     configuration-null draw run as "real". Planted: every form with >= 2 tags has, with probability
//     q, its tags replaced by a pair from {(ADP,PROPN), (INTJ,NUM), (PART,PRON)}; q global. The
//     bimodality sub-claim of the card (a 2-component mixture over (log frequency, context
//     diversity)) is NOT run: typed gap.
//   A07 ROLE-IDENTIFIABILITY CONSERVATION. Reads profile cells g01 (order entropy) and g02 (case
//     share): partial Spearman of g01 and g02 after residualising both ranks on branch and
//     script dummies (negative is the claim; needs more than 4 systems beyond the dummy count). Null: g02
//     permuted within branch strata, D = 999. theta = -(rho - median null). Interval: lineage-cluster
//     bootstrap (B = 500). The variance-ratio component needs per-channel information terms the
//     profile does not carry (only the joint g05): NOT run (typed gap). Reachability: ADAPTATION B.
//   A12 CROSS-GROUP CONSENSUS. Per group, the partition of the dominant spectral axis (k = 2); the
//     statistic is the mean inter-group ARI minus its median under a permutation of one group's
//     partition within branch strata (D = 999, joint draws); within-group stability from C2. "UNITY"
//     only if the lineage-bootstrap lower bound of theta exceeds 0.20; "PLURALISM" iff the upper
//     bound is below 0.20 while at least half of the groups' spectral partitions are STABLE; else
//     UNDECIDED. ADAPTATION B applies.
//   A01 CLOSED / OPEN SPLIT. Per lowercased form: frequency rank r and context diversity
//     cd = (distinct left + distinct right neighbour forms) / (2 x occurrences) in the seed-1 sample
//     (sentence edges are neighbour symbols). READING (the literal "largest r such that ... below
//     the (1-alpha) quantile" is dominated by the null's own noise at large r, where a mass-
//     matched random set is nearly the whole vocabulary): the derived cutoff is r* = argmax over a
//     geometric rank grid (ratio 1.25) of z(r) = (mu_null(r) - M(r)) / sd_null(r), M(r) the mean cd
//     of the r most frequent forms and the null the mean cd of D = 199 random form sets of equal
//     token mass; the cutoff is LICENSED only if max z exceeds the (1-alpha) quantile of the maximum
//     z under the same null (the role-config max-statistic pattern; search-aware); an unlicensed
//     system has no derived cutoff and scores F1 = 0 (never dropped). Gold: closed UPOS {ADP, AUX,
//     CCONJ, DET, PART, PRON, SCONJ} on the DEV file, token level, over dev tokens whose lowercased
//     form occurs in the sample; a dev token is predicted closed iff its form's train rank <= cutoff.
//     B1 = one global rank cutoff, the argmax over the common rank grid of the nested mean (systems,
//     then lineages) F1 over the TRAINING lineages, i.e. leaving the held-out lineage out; B3 (the
//     per-language oracle cutoff, an upper bound) is printed, never gated; B2 (tag entropy alone) is
//     NOT run: typed gap. theta_s = F1(derived) - F1(B1). Null: dev gold closedness permuted at the
//     TOKEN level within the 10 token-mass deciles of the form's train rank (frequency information at
//     decile resolution kept, form identity destroyed), D = 100. Matched-frequency control
//     (ADAPTATION D): in each decile with >= 3 closed and >= 3 open dev types, closed types have lower
//     cd than open types (sign test over deciles and systems, ties dropped and counted); this replaces
//     the registered "coverage" wording, which is degenerate inside a frequency bin. Planted: on a
//     real system's arrays, a closed class of size C_s = clamp(80 x 2^(1.5 (2u-1)), 20, V/4) (u a
//     seeded uniform per system, so a global cutoff cannot fit all), 15 percent of it displaced to
//     ranks [C_s, 2 C_s), whose cd is multiplied by (1 - g); dev tokens proportional to the train
//     counts; g global, calibrated on the lineage-nested mean excess. The 10x world scales the dev
//     tokens only (the train-side cd structure is fixed): its noise reduction is partial, stated.
//   A11 LEDGER (Level R). Through kernel/kind-functional-induction.js::induceKindsAndFunctions over
//     the Level-R kinds, DECLARED (the organ's inducer is not run a second time): an entity's
//     assertions are its binned descriptor values in each of the five seeds; sameValue = equal bin;
//     exposureFloor 3. The ledger prints, per induced relation kind and per descriptor, the organ's
//     own standing (unexposed / refuted / candidate) with named counterexample members; no test, no
//     verdict, "established" is not an outcome. A second table, labelled CROSS-MEMBER, lists per kind
//     and descriptor the modal bin of its members, the agreeing share and the disagreeing members.
//
// ── 7. REGISTERED ITEMS NOT IMPLEMENTED HERE (typed gaps, never "supported") ───────────────────
//   A04 self-similarity (needs a DFA/Hurst estimator and burstiness against monkey typing at three
//   levels); A06 levels from surprise (needs the order-2 Witten-Bell boundary model and a gold
//   boundary rank; READING-SPEC S43 already records this door refuted once); A09 unit/relation/
//   system triad (needs node-feature mixtures and promotion rates); A10 sameness under inversion
//   (needs typed kind-graph alignment); A13 the kind graph is not a tree (needs Level K, kinds of
//   kinds with language-free descriptors, and a tree-plus-measurement-noise null); Level K itself.
//   Their ARCH_REGISTRY rows are kept so that the arch table lists them as NOT_IMPLEMENTED with the
//   instrument they need.
//
// ── 8. OUTPUT ───────────────────────────────────────────────────────────────────────────────────
//   JSON to stdout (a summary) and <out>/induce-<split>.json (everything), plus the hashed power
//   file <out>/induce-power-<split>.json. Every run stamps prereg_sha256, power_sha256, the organ's
//   exports found and missing, the draws, replicates and grid sizes used, and a SMOKE label for
//   reduced runs. The arch table lists every registered card with its status; failures first is the
//   caller's rendering, not this file's.
//
// ── 9. TYPED NUMBERS (PROVISIONAL unless derived; P4) ───────────────────────────────────────────
//   alpha 0.05 (= KEY_ALPHA); SEED 20261005; report draws 999, smoke draws 39 or 99 (stamped); N
//   16,000; seeds 5; median-split bins (terciles for Level R); a system is dropped from a group if
//   it lacks >= 25 percent of the group's features, then features undefined for a retained system
//   are dropped; a group needs >= 12 systems and >= 6 features; stability B_feat = B_sys = 60, subsample
//   0.8, null pairs 100; arc floor 30; type floor 30 tokens; Strahler order floor N_k >= 3; D per seed
//   40; monkey M 40; xmin grid <= 25, tail >= 50; A05 k = 5, tag floor 2, D 200; A07 and A12 D 999;
//   A01 grid ratio 1.25, mass-matched D 199, permutation D 100, deciles 10; Level W minMentions 10,
//   minShare 0, minMembers 3, nullArm draws 100; A11 exposureFloor 3; bootstrap B 2,000 (400 inside
//   power replicates, 500 for A07 and A12); null draws inside power replicates: A03 20 (its 10x null 16),
//   A02 16 (10x: 8), A05 20, A01 20 with mass-matched D 99; planted replicates 10 (report 30, smoke 4); dial grid 0..1 in tenths
//   and 10 bisection steps; the planted pairs of A05, the closed-class size law of A01 and the nesting
//   ranks of A02 as stated above.
//
// ── 10. RECORDED PREDICTIONS (before any run; guesses, not findings) ────────────────────────────
//   BARKER.md 10.1 rows stand (Level S: at least one CLUSTER 0.30, at least one GRADIENT 0.80;
//   A01 0.55, A02 0.25, A03 0.20, A05 0.35, A07 0.30, A08 TRIVIAL 0.90, A12 unity 0.18, as
//   P(PERSISTENT or the card's positive reading BEFORE the single-channel cap)). Added here:
//   every card reads non-PERSISTENT in this build (structural: ADAPTATION A) 1.00 (near-foregone);
//   A07 and A12 read UNDERPOWERED BY REACHABILITY 1.00 (near-foregone: ADAPTATION B); at least one
//   Level-S partition passes the stability bar 0.35; Level R kinds have higher NMI with deprel
//   label than with system label 0.60; Level W finds at least one kind beyond its nullArm in at
//   least 80 percent of systems 0.50; power: the A03 card passes its trio at the real shapes 0.70;
//   the A02 S row 0.60 and its G row 0.35 (the Gini dial may not reach 2 s_R); A08 0.85; A05 0.60
//   (the top-5 Jaccard dial may not reach 2 s_R); A01 0.50.
//
// ── 11. WHAT HAD BEEN SEEN WHEN THIS WAS WRITTEN ───────────────────────────────────────────────
//   docs/BARKER.md in full (including the recorded predictions); the sibling pilot's reported
//   summary figures (read as summaries, not recomputed); the existence and listing of the
//   treebank and prior files; the kernel organs' source; during the build, the source of
//   organs/barker.js and eval/barker/profiles.mjs (the contracts, not any result), one timing run of
//   profiles.mjs on eng and one profile cell value (eng a01) printed while checking the cell
//   schema. NO card statistic and NO Level-S/W/R result had been computed on any real system. All
//   timing and development runs of this file used synthetic worlds (toy treebanks written by
//   makeToyWorld, planted profiles), whose results were read: for the toy world the A03 power trio
//   passed, the A02 S row passed, and the A02 G dial was capped below 2 s_R. Those toy results
//   informed the recorded power predictions above and nothing else.
//
// ── 12. SOURCE RULES ENFORCED BY THE TESTS ──────────────────────────────────────────────────────
//   No model call, no learned representation, no network (the scanned words are not written out
//   here); no import of any EO module; no read of a test.conllu; fallbackNomination is only ever
//   read to be EXCLUDED; no BIC-style penalty; the SESOI is registered, never read off the
//   instrument.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { createSeededRng, stableHash } from "../../kernel/rng.js";
import { induceEntityKindCandidates } from "../../kernel/entity-kind-induction.js";
import { characteristicSetKinds } from "../../kernel/kind-functional-induction.js";
import { discoverCompanyKinds } from "../../organs/kind-standing.js";
import { logBinomialUpperTail, KEY_ALPHA } from "../../adapters/text/keyness.js";
import { parseConllu } from "../competence/lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ═══ 1. constants ═══════════════════════════════════════════════════════════════════════════════
export const INDUCE_VERSION = "1";
export const SEED = 20261005;
export const ALPHA = KEY_ALPHA;             // 0.05, the repo's declared resolution
export const DRAWS_REPORT = 999;
export const DRAWS_SMOKE = 99;
export const N_BUDGET = 16000;              // non-PUNCT words per fixed-budget sample (PROVISIONAL)
export const SEEDS = Object.freeze([1, 2, 3, 4, 5]);
export const PATHS = Object.freeze({
  TB_DIR: "/private/tmp/claude-501/tb",
  EVAL_DIR: "/private/tmp/claude-501/ud-eval",
  PRIORS_DIR: path.resolve(HERE, "../../priors"),
  OUT_DIR: "/private/tmp/claude-501/barker",
  PROFILES_DIR: "/private/tmp/claude-501/barker/out",
  PILOT_DIR: "/private/tmp/claude-501/barker/work/prof",
  LOCK: path.resolve(HERE, "PREREG.lock.json"),
});
/** The typed numbers of header section 9, all PROVISIONAL (P4) unless said otherwise. */
export const TYPED = Object.freeze({
  groupDropShare: 0.25, groupMinSystems: 12, groupMinFeatures: 6,
  stabilityBFeat: 60, stabilityBSys: 60, subsample: 0.8, nullPairs: 100,
  arcFloor: 30, typeFloor: 30, orderFloor: 3, minOrders: 3, treeDrawsPerSeed: 40,
  monkeyM: 40, xminGridMax: 25, xminTailMin: 50,
  a05K: 5, a05TagFloor: 2, a05Draws: 200, a07Draws: 999, a12Draws: 999,
  a01GridRatio: 1.25, a01MassDraws: 199, a01PermDraws: 100, a01Deciles: 10,
  wMinMentions: 10, wMinShare: 0, wMinMembers: 3, wNullDraws: 100,
  bootB: 2000, reps: 10, repsReport: 30, bisectionSteps: 10,
  powerUp: 0.8, powerDown: 0.8,
});

// ═══ 2. registry: genealogy answer key and the 13 arch cards ════════════════════════════════════
/** ANSWER KEY (never a feature). giver: standard classification (Glottolog top-level families), BARKER.md 2.1, extended to arrivals. */
export const GENEALOGY = Object.freeze({
  rus: ["Indo-European", "Slavic"], ukr: ["Indo-European", "Slavic"], pol: ["Indo-European", "Slavic"], bul: ["Indo-European", "Slavic"],
  ces: ["Indo-European", "Slavic"], slk: ["Indo-European", "Slavic"], slv: ["Indo-European", "Slavic"], hrv: ["Indo-European", "Slavic"], srp: ["Indo-European", "Slavic"],
  spa: ["Indo-European", "Romance"], ita: ["Indo-European", "Romance"], por: ["Indo-European", "Romance"], fra: ["Indo-European", "Romance"],
  ron: ["Indo-European", "Romance"], cat: ["Indo-European", "Romance"], glg: ["Indo-European", "Romance"],
  eng: ["Indo-European", "Germanic"], deu: ["Indo-European", "Germanic"], nld: ["Indo-European", "Germanic"], swe: ["Indo-European", "Germanic"],
  dan: ["Indo-European", "Germanic"], nob: ["Indo-European", "Germanic"],
  hin: ["Indo-European", "Indo-Iranian"], urd: ["Indo-European", "Indo-Iranian"], fas: ["Indo-European", "Indo-Iranian"], mar: ["Indo-European", "Indo-Iranian"],
  ell: ["Indo-European", "Hellenic"], hye: ["Indo-European", "Armenian"], lav: ["Indo-European", "Baltic"], lit: ["Indo-European", "Baltic"],
  arb: ["Afro-Asiatic", "Semitic"], heb: ["Afro-Asiatic", "Semitic"],
  cmn: ["Sino-Tibetan", "Sinitic"], "cmn-hans": ["Sino-Tibetan", "Sinitic"],
  jpn: ["Japonic", "Japonic"], kor: ["Koreanic", "Koreanic"], "kor-gsd": ["Koreanic", "Koreanic"], tur: ["Turkic", "Turkic"],
  fin: ["Uralic", "Finnic"], est: ["Uralic", "Finnic"], hun: ["Uralic", "Ugric"],
  ind: ["Austronesian", "Austronesian"], vie: ["Austroasiatic", "Austroasiatic"],
  eus: ["Basque", "Basque"], kat: ["Kartvelian", "Kartvelian"], tam: ["Dravidian", "Dravidian"], tel: ["Dravidian", "Dravidian"],
});
/** tb directory of a system stem (kor's priors and ud-eval are GSD; tb/kor is KAIST). */
export const TB_ALIAS = Object.freeze({ kor: "kor-gsd" });
export const CLOSED_UPOS = Object.freeze(new Set(["ADP", "AUX", "CCONJ", "DET", "PART", "PRON", "SCONJ"]));
export const OPEN_UPOS = Object.freeze(new Set(["NOUN", "VERB", "ADJ", "ADV", "PROPN", "INTJ"]));

export const ARCH_STATUS = Object.freeze(["PERSISTENT", "PERSISTENT-OUTSIDE-IE", "FAMILY-BOUND", "CHANNEL-BOUND", "TRIVIAL", "ABSENT", "UNDERPOWERED", "INSTRUMENT_FAILED"]);
const WEAKEST_ORDER = Object.freeze(["INSTRUMENT_FAILED", "UNDERPOWERED", "ABSENT", "TRIVIAL", "FAMILY-BOUND", "CHANNEL-BOUND", "PERSISTENT-OUTSIDE-IE", "PERSISTENT"]);

const card = (o) => Object.freeze({ priorArt: [], channels: ["ud:deprel"], ...o });
/** A01..A13 (BARKER 4.7 / 4.7a). `status`: implemented | not_implemented (typed gap: `needs`). */
export const ARCH_REGISTRY = Object.freeze({
  A01: card({ id: "A01", name: "closed/open split", foaArch: "5 (function-word types, p.57); 7 (classes, pp.32-34)", sesoi: { value: 0.03, unit: "F1 (derived minus global typed cutoff)" },
    nulls: ["UPOS closedness permuted within train-frequency deciles"], control: "closedness-permuted dev gold must give F1 difference at chance", power: "planted closed block with a context-diversity gap",
    kill: "no gain over the global typed cutoff: closed class stays descriptive (TRIVIAL)", priorArt: ["function versus content words"], pPersistent: 0.55, status: "implemented", channels: ["ud:upos", "ud:tok"] }),
  A02: card({ id: "A02", name: "recursion with types", foaArch: "1 (universal computation, pp.20-21, 78-80)", sesoi: { S: 0.02, G: 0.05, unit: "share of tokens; Gini excess" },
    nulls: ["deprel bases permuted within each tree"], control: "flat trees S = 0; a null corpus run as real", power: "planted type-concentrated nesting on real shapes",
    kill: "S and G inside the label-permutation 95th percentile", priorArt: ["Everett 2005 and replies"], pPersistent: 0.25, status: "implemented" }),
  A03: card({ id: "A03", name: "hierarchical complexity ladder", foaArch: "2 (complexity, pp.22-23)", sesoi: { value: 0.25, unit: "|Rb - null median|" },
    nulls: ["arity-matched random plane trees"], control: "a null draw run as real", power: "degree-sorted arrangement dial on real shapes",
    kill: "real Rb inside the matched-null band: TRIVIAL (Horton behaviour is generic to branching)", priorArt: ["Strahler 1957", "Shreve"], pPersistent: 0.20, status: "implemented" }),
  A04: card({ id: "A04", name: "self-similarity", foaArch: "3 (fracticality, pp.23-25)", sesoi: { derived: true, floor: 0.03, unit: "Hurst H minus monkey-band edge (derived at run)" },
    nulls: ["within-sentence shuffle", "monkey typing matched to rank-frequency"], control: "a series of Hurst 0.5 must read 0.5", power: "planted fractional series, Hurst 0.7",
    kill: "inside the monkey band at 2 of 3 levels", priorArt: ["Montemurro and Pury", "Altmann et al."], pPersistent: 0.12, status: "not_implemented", needs: "DFA Hurst and burstiness estimators at character, word and clause levels with monkey-typing bands" }),
  A05: card({ id: "A05", name: "graded middle", foaArch: "4 (included middle, p.25)", sesoi: { value: 0.10, unit: "Jaccard of top-k ambiguity edges across lineages, minus null median" },
    nulls: ["configuration null on (form, tag) pairs"], control: "a null draw run as real", power: "planted shared pair set",
    kill: "recurrence of top-k edges inside the configuration null (marginals explain it)", priorArt: ["ambiguity classes in tagging"], pPersistent: 0.35, status: "implemented", channels: ["prior:pos"] }),
  A06: card({ id: "A06", name: "levels from surprise", foaArch: "6 (integrative levels, p.22, pp.32-34)", sesoi: { value: 0.20, unit: "Spearman rho minus permuted median" },
    nulls: ["gold rank permuted within sentence", "random boundaries"], control: "within-sentence character shuffle", power: "planted 4-level grammar",
    kill: "READING-SPEC S43 refuted this door once; modes move with neighborCount", priorArt: ["READING-SPEC S43"], pPersistent: 0.15, status: "not_implemented", needs: "order-2 Witten-Bell boundary strength per character gap and a gold boundary rank (token < clause < sentence)" }),
  A07: card({ id: "A07", name: "role-identifiability conservation", foaArch: "derivation step: same function by inverted carriers (pp.77-79)", sesoi: { rho: -0.30, varRatio: 0.80, unit: "partial Spearman; variance ratio" },
    nulls: ["g02 permuted within branch strata"], control: "channel-independent planted languages must not show it", power: "planted trade-off",
    kill: "partial association not negative; lineage gate unreachable (ADAPTATION B)", priorArt: ["Sapir", "Blake 2001", "Sinnemaki 2008", "Gibson et al. 2013"], pPersistent: 0.30, status: "implemented", channels: ["ud:deprel", "ud:feats"] }),
  A08: card({ id: "A08", name: "Zipf recurrence (calibration)", foaArch: "3 neighbour (recurrence)", sesoi: { value: 0.10, unit: "Zipf exponent outside the monkey band" },
    nulls: ["monkey typing matched on character distribution and boundary probability"], control: "a monkey corpus run as real lands inside the band", power: "planted Zipf(s_gen) over spelled types",
    kill: "inside the monkey band: TRIVIAL (expected)", priorArt: ["Miller 1957", "Li 1992", "Clauset, Shalizi, Newman 2009"], pPersistent: 0.10, status: "implemented", channels: ["ud:tok"] }),
  A09: card({ id: "A09", name: "unit / relation / system triad", foaArch: "pp.77-84 (static, dynamic, multinamic)", sesoi: { promotion: 0.05, loglik: 0.01, unit: "promotion rate; nats per node" },
    nulls: ["matched-arity random trees"], control: "planted 2-role and 3-role grammars told apart", power: "planted grammars",
    kill: "k = 3 not preferred over 2 and 4 in half of held-out families", priorArt: [], pPersistent: 0.10, status: "not_implemented", needs: "mixture over node feature vectors with leave-one-lineage-out likelihood and a promotion-rate null" }),
  A10: card({ id: "A10", name: "sameness under inversion", foaArch: "pp.77-79, 83-85", sesoi: { value: 1.25, unit: "maximum common core weight ratio to degree-preserving null" },
    nulls: ["configuration-model graphs with the same degree sequence"], control: "a scrambled copy of itself must not beat the null; itself must", power: "planted mirrored grammar pair",
    kill: "cross-family cores do not exceed the null, or vanish without shared family or script", priorArt: [], pPersistent: 0.18, status: "not_implemented", needs: "typed kind-graph alignment with arc reversal and a maximum-common-core solver" }),
  A11: card({ id: "A11", name: "functional-determination ledger", foaArch: "ledger, no test", sesoi: { none: true, unit: "n/a" },
    nulls: [], control: "n/a (a ledger issues no verdict)", power: "n/a", kill: "a counterexample member is named; 'established' is not an outcome", priorArt: ["Pham et al. 2015", "Neumann and Moerkotte 2011"], pPersistent: null, status: "implemented", channels: ["ud:deprel"] }),
  A12: card({ id: "A12", name: "cross-group consensus", foaArch: "pluralism and unity (p.60)", sesoi: { value: 0.20, unit: "inter-group ARI minus permutation-null median" },
    nulls: ["one group's dominant partition permuted within branch strata"], control: "groups built from independent planted partitions must read pluralism", power: "planted one-latent-partition world",
    kill: "inter-group ARI not above null while within-group stability is high: pluralism", priorArt: [], pPersistent: 0.18, status: "implemented", channels: ["profile"] }),
  A13: card({ id: "A13", name: "the kind graph is not a tree", foaArch: "Xunzi design claim (kernel/kind-graph-structure.js)", sesoi: { value: 0.05, unit: "mean three-point violation minus tree-plus-noise median" },
    nulls: ["UPGMA tree positions plus each entity's own measurement noise"], control: "a true tree plus noise must not read non-tree", power: "planted non-tree resemblance",
    kill: "violations inside the tree-plus-noise 95th percentile: graph claim refuted for this material", priorArt: ["ultrametric / four-point conditions"], pPersistent: 0.40, status: "not_implemented", needs: "Level K (kinds of kinds with language-free descriptors) and a tree-plus-measurement-noise null; ADAPTATION B would apply" }),
});

// ═══ 3. small numerics ══════════════════════════════════════════════════════════════════════════
export const sum = (a) => { let s = 0; for (const x of a) s += x; return s; };
export const mean = (a) => (a.length ? sum(a) / a.length : NaN);
export function quantile(values, q) {
  const v = Array.from(values).filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!v.length) return NaN;
  const pos = Math.min(1, Math.max(0, q)) * (v.length - 1);
  const lo = Math.floor(pos), hi = Math.min(lo + 1, v.length - 1);
  return v[lo] + (v[hi] - v[lo]) * (pos - lo);
}
export const median = (a) => quantile(a, 0.5);
export function sd(a) { const v = Array.from(a).filter(Number.isFinite); if (v.length < 2) return NaN; const m = mean(v); return Math.sqrt(sum(v.map((x) => (x - m) ** 2)) / (v.length - 1)); }
/** Seeded stream for a purpose: every random draw in this file comes from here. */
export const rngFor = (...parts) => createSeededRng({ seed: SEED, parts });
export function shuffleInPlace(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
export function randn(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/** Exact one-sided binomial tail P(X >= k | n, p). */
export const binomUpper = (k, n, p = 0.5) => Math.exp(logBinomialUpperTail(k, n, p));
export const signTestP = (k, n) => (n <= 0 ? 1 : binomUpper(k, n, 0.5));
/** Sign-test reachability at alpha (BARKER 4.6): { n, minP, kNeeded } or { unreachable:true }. */
export function reachability(n, alpha = ALPHA) {
  if (!(n >= 1)) return { unreachable: true, n, minP: 1 };
  const minP = 0.5 ** n;
  if (minP > alpha) return { unreachable: true, n, minP };
  let k = n; while (k > 0 && signTestP(k - 1, n) <= alpha) k--;
  return { n, minP, kNeeded: k };
}
/** Exact one-sided binomial calibration test: is `x` rejects of `n` worlds inconsistent with a true rate <= p0? (BARKER 4.4) */
export function rateRejected(x, n, p0 = ALPHA, alpha = ALPHA) { return binomUpper(x, n, p0) <= alpha; }

/** Hubert-Arabie adjusted Rand index of two label vectors (any comparable labels). */
export function ari(a, b) {
  const n = a.length; if (n !== b.length) throw new RangeError("ari: length mismatch"); if (n < 2) return NaN;
  const ia = new Map(), ib = new Map(); const tab = new Map();
  for (let i = 0; i < n; i++) {
    const x = ia.get(a[i]) ?? ia.set(a[i], ia.size).get(a[i]); const y = ib.get(b[i]) ?? ib.set(b[i], ib.size).get(b[i]);
    const key = x * 100003 + y; tab.set(key, (tab.get(key) ?? 0) + 1);
  }
  const rows = new Array(ia.size).fill(0), cols = new Array(ib.size).fill(0);
  for (const [key, c] of tab) { const x = Math.floor(key / 100003), y = key % 100003; rows[x] += c; cols[y] += c; }
  const c2 = (m) => (m * (m - 1)) / 2;
  let sij = 0; for (const c of tab.values()) sij += c2(c);
  let sa = 0; for (const r of rows) sa += c2(r);
  let sb = 0; for (const c of cols) sb += c2(c);
  const exp = (sa * sb) / c2(n), max = (sa + sb) / 2;
  return max === exp ? (sij === exp ? 1 : 0) : (sij - exp) / (max - exp);
}
/** Normalised mutual information (arithmetic-mean normalisation, plug-in) of two label vectors. */
export function nmi(a, b) {
  const n = a.length; if (!n) return NaN;
  const ca = new Map(), cb = new Map(), joint = new Map();
  for (let i = 0; i < n; i++) {
    ca.set(a[i], (ca.get(a[i]) ?? 0) + 1); cb.set(b[i], (cb.get(b[i]) ?? 0) + 1);
    if (!joint.has(a[i])) joint.set(a[i], new Map()); const row = joint.get(a[i]); row.set(b[i], (row.get(b[i]) ?? 0) + 1);
  }
  const H = (m) => { let h = 0; for (const c of m.values()) { const p = c / n; h -= p * Math.log2(p); } return h; };
  const ha = H(ca), hb = H(cb); let mi = 0;
  for (const [x, row] of joint) for (const [y, c] of row) mi += (c / n) * Math.log2((c * n) / (ca.get(x) * cb.get(y)));
  const d = (ha + hb) / 2; return d === 0 ? 1 : mi / d;
}
/** Average ranks (ties share the mean rank). */
export function ranks(x) {
  const idx = x.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]); const r = new Array(x.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j < idx.length && idx[j][0] === idx[i][0]) j++; const m = (i + j + 1) / 2; for (let k = i; k < j; k++) r[idx[k][1]] = m; i = j; }
  return r;
}
export function pearson(x, y) {
  const n = x.length; const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
}
export const spearman = (x, y) => pearson(ranks(x), ranks(y));
/** Residuals of y on the columns of Z (an n-by-p array of rows; intercept added), by ridge-stabilised normal equations. */
export function residualise(y, Zrows) {
  const n = y.length; const p = (Zrows[0]?.length ?? 0) + 1;
  const X = Zrows.map((r) => [1, ...r]);
  const A = Array.from({ length: p }, () => new Array(p).fill(0)); const b = new Array(p).fill(0);
  for (let i = 0; i < n; i++) for (let a = 0; a < p; a++) { b[a] += X[i][a] * y[i]; for (let c = 0; c < p; c++) A[a][c] += X[i][a] * X[i][c]; }
  for (let a = 0; a < p; a++) A[a][a] += 1e-9;
  for (let c = 0; c < p; c++) { // Gauss-Jordan with partial pivoting
    let piv = c; for (let r = c + 1; r < p; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]];
    const d = A[c][c] || 1e-12;
    for (let r = 0; r < p; r++) if (r !== c) { const f = A[r][c] / d; if (f) { for (let k = c; k < p; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } }
  }
  const beta = b.map((v, i) => v / (A[i][i] || 1e-12));
  return y.map((v, i) => v - X[i].reduce((s, x, a) => s + x * beta[a], 0));
}
/** Partial Spearman of x and y given dummy/continuous controls Zrows. */
export const partialSpearman = (x, y, Zrows) => pearson(residualise(ranks(x), Zrows), residualise(ranks(y), Zrows));
export function gini(values) {
  const v = Array.from(values).filter((x) => Number.isFinite(x) && x >= 0).sort((a, b) => a - b); const n = v.length; const s = sum(v);
  if (n < 2 || s === 0) return 0; let acc = 0; for (let i = 0; i < n; i++) acc += (2 * (i + 1) - n - 1) * v[i]; return acc / (n * s);
}
/** Jaccard index of two Sets. */
export function jaccard(a, b) { let i = 0; for (const x of a) if (b.has(x)) i++; const u = a.size + b.size - i; return u ? i / u : 0; }
/** Dummy-coded rows for a categorical label vector (drop the first level). */
export function dummies(labels) { const levels = [...new Set(labels)].sort(); return labels.map((l) => levels.slice(1).map((v) => (l === v ? 1 : 0))); }
export const hconcat = (A, B) => A.map((r, i) => [...r, ...B[i]]);

// ── nested averaging, bootstrap ───────────────────────────────────────────────────────────────────
/** nestedMean(valuesBySystem: Map<id, number|null>, branchOf(id), lineageOf(id)) -> { byLineage: Map, pooled } ; systems -> branches -> lineages; undefined values leave the denominator. */
export function nestedMean(values, branchOf, lineageOf) {
  const byL = new Map();
  for (const [id, v] of values) {
    if (!Number.isFinite(v)) continue; const l = lineageOf(id), b = branchOf(id);
    if (!byL.has(l)) byL.set(l, new Map()); const bm = byL.get(l); if (!bm.has(b)) bm.set(b, []); bm.get(b).push(v);
  }
  const byLineage = new Map(); for (const [l, bm] of byL) byLineage.set(l, mean([...bm.values()].map(mean)));
  return { byLineage, pooled: byLineage.size ? mean([...byLineage.values()]) : NaN };
}
/** Lineage-cluster bootstrap of the mean of lineage values: { est, lo, hi, se, B }. */
export function lineageBootstrap(lineageValues, { B = TYPED.bootB, rng = rngFor("lineage-bootstrap") } = {}) {
  const v = lineageValues.filter(Number.isFinite); const n = v.length;
  if (!n) return { est: NaN, lo: NaN, hi: NaN, se: NaN, B: 0 };
  const est = mean(v); const draws = new Array(B);
  for (let b = 0; b < B; b++) { let s = 0; for (let i = 0; i < n; i++) s += v[Math.floor(rng() * n)]; draws[b] = s / n; }
  return { est, lo: quantile(draws, 0.025), hi: quantile(draws, 0.975), se: sd(draws), B };
}
export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
/** sha256 of this file's leading `//` comment block — the stamp that makes a post-hoc edit of the pre-registration visible. */
export function headerDigest(file = fileURLToPath(import.meta.url)) {
  const lines = [];
  for (const l of fs.readFileSync(file, "utf8").split("\n")) { if (l.startsWith("//") || !l.trim()) lines.push(l); else break; }
  return sha256(lines.join("\n").trim());
}

// ═══ 4. the organ seam (organs/barker.js is built concurrently; coded against BARKER.md 8.1) ═════
export const ORGAN_CONTRACT = Object.freeze(["BARKER_VERSION", "SEED", "ALPHA", "DRAWS", "EO_BAN", "VERDICTS", "ARCH_STATUS", "assertEoFree", "makeSystemProfile",
  "featureIndexOf", "plantSystems", "matchedLoading", "participationRatio", "dipStatistic", "kindOrGradient", "redeal", "spectralSplits", "searchAwareCeiling",
  "induceSystemKinds", "powerGrid", "copulaCalibration", "detectability", "assignSystem", "signTestP", "reachability", "holm", "clusterBootstrap", "nestedMean",
  "coarsenToK", "powerTrio", "minimumEffectVerdict", "persistence", "independenceAudit", "archonStanding", "mapLines"]);
let ORGAN = null, ORGAN_ERROR = null;
try { ORGAN = await import("../../organs/barker.js"); } catch (e) { ORGAN_ERROR = String(e?.message ?? e).split("\n")[0]; }
/** { present, error, found, missing }: what of the BARKER.md 8.1 contract the organ currently exports. */
export function organStatus() {
  const found = ORGAN ? ORGAN_CONTRACT.filter((n) => n in ORGAN) : [];
  return { present: !!ORGAN, error: ORGAN_ERROR, version: ORGAN?.BARKER_VERSION ?? null, found, missing: ORGAN_CONTRACT.filter((n) => !found.includes(n)) };
}
export class OrganMissing extends Error { constructor(name) { super(`organ_missing:${name}`); this.code = "ORGAN_MISSING"; this.name = "OrganMissing"; this.missing = name; } }
/** The organ's export `name`, or throw OrganMissing (a typed refusal, never a silent fallback). */
export function organFn(name) { const f = ORGAN?.[name]; if (typeof f !== "function") throw new OrganMissing(name); return f; }
let PROFILES_MOD = null, PROFILES_ERR = null;
/** eval/barker/profiles.mjs (built concurrently), or null. */
export async function profilesModule() {
  if (PROFILES_MOD || PROFILES_ERR) return PROFILES_MOD;
  try { PROFILES_MOD = await import("./profiles.mjs"); } catch (e) { PROFILES_ERR = String(e?.message ?? e).split("\n")[0]; }
  return PROFILES_MOD;
}
export const profilesStatus = () => ({ present: !!PROFILES_MOD, error: PROFILES_ERR });

// ═══ 5. IO: the TEST guard, the compact treebank reader, the seeded sampler ═════════════════════
/** Every treebank read goes through here. A file named test.conllu is never opened (header section 0). */
export function guardPath(p, { split = "dev", confirmatory = false } = {}) {
  if (/(^|[\\/])test\.conllu$/i.test(String(p))) {
    if (split === "test" && confirmatory && fs.existsSync(PATHS.LOCK)) return p;
    throw new Error(`guardPath: refusing to read ${p}: the TEST split is not touched (header section 0)`);
  }
  return p;
}
const baseOf = (deprel) => { const i = deprel.indexOf(":"); return i < 0 ? deprel : deprel.slice(0, i); };
/**
 * readTreebank(file) -> { sentences:[{ form[], upos[], head[], deprel[], feats[] }], words, sents }. One entry per UD syntactic word (MWT
 * ranges and empty nodes dropped); head is the 1-based integer head (0 = root); deprel is the BASE relation (subtypes stripped).
 * `words` counts non-PUNCT, non-SYM words (the budget unit).
 */
export function readTreebank(file, opts = {}) {
  const text = fs.readFileSync(guardPath(file, opts), "utf8"); const sentences = []; let words = 0;
  let form = [], upos = [], head = [], deprel = [], feats = [];
  const flush = () => { if (form.length) sentences.push({ form, upos, head, deprel, feats }); form = []; upos = []; head = []; deprel = []; feats = []; };
  for (const line of text.split("\n")) {
    if (!line) { flush(); continue; }
    if (line.charCodeAt(0) === 35) continue; // '#'
    const c = line.split("\t"); if (c.length < 8 || !/^[0-9]+$/.test(c[0])) continue;
    form.push(c[1]); upos.push(c[3]); feats.push(c[5]); head.push(/^[0-9]+$/.test(c[6]) ? Number(c[6]) : -1); deprel.push(baseOf(c[7]));
    if (c[3] !== "PUNCT" && c[3] !== "SYM") words++;
  }
  flush();
  return { sentences, words, sents: sentences.length };
}
const wordCount = (s) => { let n = 0; for (const u of s.upos) if (u !== "PUNCT" && u !== "SYM") n++; return n; };
/** The seeded fixed-budget sample (BARKER 3.5): indices of sentences, shuffled by seed, taken until >= N non-PUNCT words; null if the treebank is smaller than N. */
export function sampleIndices(tb, { N = N_BUDGET, seed = 1, system = "sys" } = {}) {
  if (tb.words < N) return null;
  const idx = Array.from({ length: tb.sents }, (_, i) => i); shuffleInPlace(idx, createSeededRng({ seed, system, purpose: "sample" }));
  const out = []; let w = 0; for (const i of idx) { out.push(i); w += wordCount(tb.sentences[i]); if (w >= N) break; }
  return { indices: out, words: w };
}
/**
 * A sentence as a TREE with PUNCT removed: { m, parent[] (-1 = root), label[] ("root" at the root), kids[][], root } or null when the sentence is not
 * a single-rooted tree after removal (counted by the caller as a typed gap). A token whose head is PUNCT climbs to the PUNCT's own head.
 */
export function sentTree(s) {
  const n = s.form.length; const keep = []; const newIdx = new Int32Array(n + 1).fill(-1);
  for (let i = 0; i < n; i++) if (s.upos[i] !== "PUNCT") { newIdx[i + 1] = keep.length; keep.push(i); }
  const m = keep.length; if (m < 1) return null;
  const parent = new Int32Array(m).fill(-2); let root = -1;
  for (let k = 0; k < m; k++) {
    let h = s.head[keep[k]]; let guard = 0;
    while (h > 0 && newIdx[h] < 0 && guard++ < n) h = s.head[h - 1];
    if (h < 0) return null; if (h === 0) { if (root >= 0) return null; root = k; parent[k] = -1; } else if (newIdx[h] < 0) return null; else parent[k] = newIdx[h];
  }
  if (root < 0) return null;
  const kids = Array.from({ length: m }, () => []); for (let k = 0; k < m; k++) if (parent[k] >= 0) kids[parent[k]].push(k);
  // tree check: everything reachable from root exactly once
  const order = [root]; for (let i = 0; i < order.length; i++) for (const c of kids[order[i]]) order.push(c);
  if (order.length !== m) return null;
  const label = keep.map((i, k) => (k === root ? "root" : s.deprel[i]));
  return { m, parent, label, kids, root, order, tokens: keep };
}

// ── systems on disk ────────────────────────────────────────────────────────────────────────────────
export const stemOfId = (id) => (/^nl:([^@:]+)/.exec(String(id)) ?? [])[1] ?? String(id).replace(/^[a-z]+:/, "");
export function genealogyOf(stem, labels = null) {
  const g = GENEALOGY[stem];
  const lb = labels?.branch ?? labels?.family ?? null; // profiles.mjs labels carry the branch as `family`
  const lineage = labels?.lineage ?? g?.[0] ?? null, branch = lb ?? g?.[1] ?? null;
  const disagree = g && labels && ((labels.lineage && labels.lineage !== g[0]) || (lb && lb !== g[1])) ? { table: g, labels: { lineage: labels.lineage, branch: lb } } : null;
  return { lineage, branch, disagree };
}
/** Describe a system's files without reading them. */
export function systemFiles(stem, { split = "dev" } = {}) {
  const tbStem = TB_ALIAS[stem] ?? stem;
  const train = path.join(PATHS.TB_DIR, tbStem, "train.conllu");
  const dev = path.join(PATHS.EVAL_DIR, stem, "dev.conllu");
  const pos = path.join(PATHS.PRIORS_DIR, `pos-${stem}.json`);
  return { stem, tbStem, train: fs.existsSync(train) ? train : null, dev: split === "dev" && fs.existsSync(dev) ? dev : null, pos: fs.existsSync(pos) ? pos : null };
}
/** Stems with a train treebank, a dev gold file and a POS prior; `kor-gsd` is folded into `kor` (the alias). */
export function discoverStems({ split = "dev" } = {}) {
  const out = [];
  for (const d of fs.readdirSync(PATHS.TB_DIR)) {
    if (d === "kor-gsd") continue; if (!fs.existsSync(path.join(PATHS.TB_DIR, d, "train.conllu"))) continue;
    const f = systemFiles(d, { split }); if (!f.train) continue; out.push(f);
  }
  return out.sort((a, b) => a.stem.localeCompare(b.stem));
}
const TB_CACHE = new Map();
/** Parse a treebank once per process (LRU of 2: the biggest are 500k tokens). */
export function cachedTreebank(file, opts = {}) {
  if (TB_CACHE.has(file)) { const v = TB_CACHE.get(file); TB_CACHE.delete(file); TB_CACHE.set(file, v); return v; }
  const tb = readTreebank(file, opts); TB_CACHE.set(file, tb); while (TB_CACHE.size > 2) TB_CACHE.delete(TB_CACHE.keys().next().value); return tb;
}

// ═══ 6. Level S: profiles -> binned block matrix -> the organ's ceiling; stability; decomposition ═══
const GROUP_NAMES = Object.freeze({ typological: "A", hierarchical: "B", boundary: "C", surprise: "C", recurrence: "D", zipf: "D", inventory: "E", closedclass: "E", morphology: "F", rolemarking: "G", role: "G", codeinventory: "H", codedistributional: "I", target: "T", targets: "T" });
/** Normalise a cell's group to a letter A..I or T ("A", "A typological", "typological"; fallback: first letter of the feature id). */
export function groupOf(cell, featureId = cell?.id) {
  const g = String(cell?.group ?? "").trim();
  if (/^[A-Ia-i]$/.test(g)) return g.toUpperCase();
  const m = /^([A-Ia-i])[\s:_-]/.exec(g); if (m) return m[1].toUpperCase();
  const k = g.toLowerCase().replace(/[^a-z]/g, ""); if (GROUP_NAMES[k]) return GROUP_NAMES[k];
  const f = /^([a-i])[0-9]/.exec(String(featureId ?? "")); if (f) return f[1].toUpperCase();
  if (/^t[0-9]/.test(String(featureId ?? ""))) return "T";
  return null;
}
export const profileStem = (p) => p?.labels?.stem ?? stemOfId(p?.id);
/** The system view cards and levels share: id, stem, lineage, branch, script. */
export function systemView(p) {
  const stem = profileStem(p); const g = genealogyOf(stem, p?.labels ?? null);
  return { id: p.id, stem, lineage: g.lineage ?? `unknown:${stem}`, branch: g.branch ?? `unknown:${stem}`, script: p?.labels?.script ?? null, genealogyDisagree: g.disagree, kind: p.kind ?? "nl" };
}
/**
 * Bin one feature across systems: median split (bins 2) or tercile split (bins 3). `>` at the median; if no value exceeds the median (the median is the
 * maximum) `>=` is used instead. Returns { cuts, bin:Int8Array, labels, of(v) } or null if the feature is constant at the split.
 */
export function binColumn(values, bins = 2) {
  const n = values.length; const bin = new Int8Array(n);
  if (bins === 3) {
    const c1 = quantile(values, 1 / 3), c2 = quantile(values, 2 / 3); const raw = (v) => (v > c2 ? 2 : v > c1 ? 1 : 0);
    const used = [...new Set(values.map(raw))].sort(); if (used.length < 2) return null;
    const remap = new Map(used.map((b, k) => [b, k])); const of = (v) => remap.get(raw(v)) ?? (raw(v) > used[used.length - 1] ? used.length - 1 : 0);
    for (let i = 0; i < n; i++) bin[i] = of(values[i]);
    return { cuts: [c1, c2], bin, labels: used.length === 3 ? ["lo", "mid", "hi"] : ["lo", "hi"], of };
  }
  const m = median(values); let strictHi = 0; for (const v of values) if (v > m) strictHi++;
  const of = strictHi > 0 ? (v) => (v > m ? 1 : 0) : (v) => (v >= m ? 1 : 0);
  let hi = 0; for (let i = 0; i < n; i++) { bin[i] = of(values[i]); hi += bin[i]; }
  if (hi === 0 || hi === n) return null;
  return { cuts: [m], bin, labels: ["lo", "hi"], of };
}
/**
 * levelSInput(profiles, group|"ALL", { bins }) -> { group, systemIds, systems[], featureIds[], signatures[], matrix(n x m 0/1), activity(n x m), blocks[][], blockOf[],
 *   continuous(n x p), cuts, branches[], lineages[], scripts[], dropped:{ systems, features }, gaps[] } | { group, gap }.
 * The drop rule is header section 9: a system lacking >= 25 percent of the group's features leaves the group; then features undefined for any
 * retained system leave; a group needs >= 12 systems and >= 6 features.
 */
export function levelSInputLocal(profiles, group = "A", { bins = 2, dropShare = TYPED.groupDropShare, minSystems = TYPED.groupMinSystems, minFeatures = TYPED.groupMinFeatures } = {}) {
  const sys = profiles.slice();
  const featSet = new Map(); // featureId -> group letter
  for (const p of sys) for (const [fid, cell] of Object.entries(p.cells ?? {})) { const g = groupOf(cell, fid); if (g && g !== "T" && (group === "ALL" || g === group)) featSet.set(fid, g); }
  const featureIds0 = [...featSet.keys()].sort();
  const defined = (p, f) => { const c = p.cells?.[f]; return c && Number.isFinite(c.value); };
  const gaps = []; const droppedSystems = [];
  let keepSys = sys.slice();
  if (featureIds0.length) {
    keepSys = sys.filter((p) => { const miss = featureIds0.filter((f) => !defined(p, f)).length; const drop = miss / featureIds0.length >= dropShare; if (drop) droppedSystems.push({ id: p.id, missing: miss, of: featureIds0.length }); return !drop; });
  }
  const featureIds = featureIds0.filter((f) => keepSys.every((p) => defined(p, f)));
  const droppedFeatures = featureIds0.filter((f) => !featureIds.includes(f)).map((f) => ({ id: f, reason: "undefined for a retained system" }));
  if (keepSys.length < minSystems || featureIds.length < minFeatures) return { group, gap: { reason: "group below floor", systems: keepSys.length, needSystems: minSystems, features: featureIds.length, needFeatures: minFeatures }, dropped: { systems: droppedSystems, features: droppedFeatures } };
  const n = keepSys.length; const cols = []; const blocks = []; const signatures = []; const keptFeatures = []; const cuts = {};
  const continuous = Array.from({ length: n }, () => []);
  for (const f of featureIds) {
    const values = keepSys.map((p) => p.cells[f].value); const b = binColumn(values, bins);
    if (!b) { droppedFeatures.push({ id: f, reason: "constant at the split" }); continue; }
    const block = [];
    for (let j = 0; j < b.labels.length; j++) { block.push(cols.length); signatures.push(`${f}=${b.labels[j]}`); cols.push({ f, j, bin: b }); }
    blocks.push(block); keptFeatures.push(f); cuts[f] = b.cuts; values.forEach((v, i) => continuous[i].push(v));
  }
  if (keptFeatures.length < minFeatures) return { group, gap: { reason: "group below floor after constant features", systems: n, features: keptFeatures.length, needFeatures: minFeatures }, dropped: { systems: droppedSystems, features: droppedFeatures } };
  const m = cols.length; const matrix = Array.from({ length: n }, () => new Array(m).fill(0)); const activity = Array.from({ length: n }, () => new Array(m).fill(0));
  const blockOf = new Array(m);
  blocks.forEach((bl, bi) => bl.forEach((c) => { blockOf[c] = bi; }));
  cols.forEach((col, c) => {
    for (let i = 0; i < n; i++) if (col.bin.bin[i] === col.j) {
      matrix[i][c] = 1; const rs = keepSys[i].cells[col.f].resamples; let cnt = 1;
      if (Array.isArray(rs) && rs.length) { cnt = 0; for (const v of rs) if (Number.isFinite(v) && col.bin.of(v) === col.j) cnt++; cnt = Math.max(1, cnt); }
      activity[i][c] = 1 + Math.log(cnt);
    }
  });
  const views = keepSys.map(systemView);
  return { group, systemIds: keepSys.map((p) => p.id), systems: views, featureIds: keptFeatures, signatures, matrix, activity, blocks, blockOf, continuous, cuts, branches: views.map((v) => v.branch), lineages: views.map((v) => v.lineage), scripts: views.map((v) => v.script), dropped: { systems: droppedSystems, features: droppedFeatures }, gaps };
}
/**
 * levelSInput(profiles, group|"ALL", { bins }) — the organ-backed input: the same drop rule as levelSInputLocal (header section 9), then the ORGAN's block matrix
 * (blockMatrixOf: median/tercile cuts, stability weights from the resamples, one block per feature) so that every null and every probe moves the very same
 * bins. Adds { bm } to the shape of levelSInputLocal; the dense 0/1 matrix, blocks and continuous rows are derived from it. Falls back to the local binning
 * (with bm = null) when the organ is absent.
 */
export function levelSInput(profiles, group = "A", { bins = 2, dropShare = TYPED.groupDropShare, minSystems = TYPED.groupMinSystems, minFeatures = TYPED.groupMinFeatures } = {}) {
  if (typeof ORGAN?.blockMatrixOf !== "function") { const r = levelSInputLocal(profiles, group, { bins, dropShare, minSystems, minFeatures }); return { ...r, bm: null }; }
  const feats = new Set(); for (const p of profiles) for (const [fid, cell] of Object.entries(p.cells ?? {})) { const g = groupOf(cell, fid); if (g && g !== "T" && (group === "ALL" || g === group)) feats.add(fid); }
  const f0 = [...feats].sort(); const defined = (p, f) => Number.isFinite(p.cells?.[f]?.value); const droppedSystems = [];
  const keepSys = f0.length ? profiles.filter((p) => { const miss = f0.filter((f) => !defined(p, f)).length; const drop = miss / f0.length >= dropShare; if (drop) droppedSystems.push({ id: p.id, missing: miss, of: f0.length }); return !drop; }) : [];
  const fKeep = f0.filter((f) => keepSys.every((p) => defined(p, f))); const droppedFeatures = f0.filter((f) => !fKeep.includes(f)).map((f) => ({ id: f, reason: "undefined for a retained system" }));
  if (keepSys.length < minSystems || fKeep.length < minFeatures) return { group, gap: { reason: "group below floor", systems: keepSys.length, needSystems: minSystems, features: fKeep.length, needFeatures: minFeatures }, dropped: { systems: droppedSystems, features: droppedFeatures } };
  const keepSet = new Set(fKeep); const trimmed = keepSys.map((p) => ({ ...p, cells: Object.fromEntries(Object.entries(p.cells).filter(([k]) => keepSet.has(k))) }));
  const bm = ORGAN.blockMatrixOf(trimmed, { groups: null, bins, minCoverage: 0 }); bm.group = group;
  for (const g of bm.gaps ?? []) if (g.type === "feature_dropped") droppedFeatures.push({ id: g.feature, reason: g.reason });
  if (bm.featureKeys.length < minFeatures) return { group, gap: { reason: "group below floor after constant features", systems: bm.n, features: bm.featureKeys.length, needFeatures: minFeatures }, dropped: { systems: droppedSystems, features: droppedFeatures } };
  const views = keepSys.map(systemView); const dense = denseOf(bm);
  return { group, bm, systemIds: bm.ids, systems: views, featureIds: bm.featureKeys, signatures: dense.signatures, matrix: dense.matrix, blocks: dense.blocks, blockOf: dense.blockOf, continuous: ORGAN.valueRows(bm), activity: null, cuts: Object.fromEntries(bm.featureKeys.map((k, j) => [k, bm.cuts[j]])), branches: views.map((v) => v.branch), lineages: views.map((v) => v.lineage), scripts: views.map((v) => v.script), dropped: { systems: droppedSystems, features: droppedFeatures }, gaps: bm.gaps ?? [] };
}
/** Dense 0/1 rows, one-hot blocks (column indices grouped by feature) and signature names of an organ block matrix. */
export function denseOf(bm) {
  const { cols, names } = ORGAN.denseColumns(bm); const n = bm.n; const matrix = Array.from({ length: n }, (_, i) => cols.map((c) => c[i]));
  const byFeature = new Map(); names.forEach((nm, c) => { if (!byFeature.has(nm.feature)) byFeature.set(nm.feature, []); byFeature.get(nm.feature).push(c); });
  const blocks = [...byFeature.values()]; const blockOf = new Array(cols.length); blocks.forEach((bl, bi) => bl.forEach((c) => { blockOf[c] = bi; }));
  return { matrix, blocks, blockOf, signatures: names.map((x) => x.signature) };
}
/** The Kanada feature index for a block matrix: Map<systemId, Map<signature, record>> (sequencePosition semantics: firstAt = lastAt = 0, evidenceIds sized by the stability weight). */
export function featureIndexFromInput(inp, { suffix = "" } = {}) {
  const idx = new Map();
  inp.systemIds.forEach((id, i) => {
    const m = new Map();
    inp.signatures.forEach((sig, c) => { if (inp.matrix[i][c] === 1) { const [k, v] = sig.split("="); const s = `${sig}${suffix}`; const cnt = Math.max(1, Math.round(Math.exp(inp.activity[i][c] - 1))); m.set(s, { signature: s, featureKey: `${k}${suffix}`, featureValue: v, firstAt: 0, lastAt: 0, evidenceIds: new Set(Array.from({ length: cnt }, (_, e) => `${id}:${s}:${e}`)), witnessRefs: new Set([`profile:${id}`]) }); } });
    idx.set(id, m);
  });
  return idx;
}
/** Effective feature dimension PR = (sum lambda)^2 / sum lambda^2 of the correlation matrix = p^2 / ||R||_F^2 (no eigendecomposition needed). */
export function participationRatioOf(continuous) {
  const n = continuous.length, p = continuous[0]?.length ?? 0; if (n < 3 || p < 2) return NaN;
  const cols = Array.from({ length: p }, (_, j) => continuous.map((r) => r[j])); let f2 = 0;
  for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) { const r = a === b ? 1 : pearson(cols[a], cols[b]); f2 += Number.isFinite(r) ? r * r : 0; }
  return (p * p) / f2;
}
/** Column-standardise (centre, divide by sd; zero-variance columns become 0). */
export function standardise(X) {
  const n = X.length, m = X[0]?.length ?? 0; const Z = Array.from({ length: n }, () => new Float64Array(m));
  for (let j = 0; j < m; j++) { let mu = 0; for (let i = 0; i < n; i++) mu += X[i][j]; mu /= n; let v = 0; for (let i = 0; i < n; i++) v += (X[i][j] - mu) ** 2; const s = Math.sqrt(v / Math.max(1, n - 1)); for (let i = 0; i < n; i++) Z[i][j] = s > 1e-12 ? (X[i][j] - mu) / s : 0; }
  return Z;
}
/** First left singular vector of Z by power iteration on the n-by-n Gram matrix; { u, share } with share = sigma1^2 / sum sigma^2. */
export function firstAxis(Z, rng = rngFor("first-axis")) {
  const n = Z.length, m = Z[0]?.length ?? 0; const G = Array.from({ length: n }, () => new Float64Array(n)); let tr = 0;
  for (let i = 0; i < n; i++) for (let k = i; k < n; k++) { let s = 0; for (let j = 0; j < m; j++) s += Z[i][j] * Z[k][j]; G[i][k] = s; G[k][i] = s; if (i === k) tr += s; }
  if (!(tr > 0)) return { u: new Float64Array(n), share: 0 };
  let u = new Float64Array(n); for (let i = 0; i < n; i++) u[i] = rng() - 0.5; let lam = 0;
  for (let it = 0; it < 500; it++) {
    const w = new Float64Array(n); for (let i = 0; i < n; i++) { let s = 0; const gi = G[i]; for (let k = 0; k < n; k++) s += gi[k] * u[k]; w[i] = s; }
    let nrm = 0; for (let i = 0; i < n; i++) nrm += w[i] * w[i]; nrm = Math.sqrt(nrm); if (!(nrm > 0)) break;
    for (let i = 0; i < n; i++) w[i] /= nrm; let d = 0; for (let i = 0; i < n; i++) d += Math.abs(Math.abs(w[i]) - Math.abs(u[i])); u = w; if (Math.abs(nrm - lam) < 1e-12 * nrm && d < 1e-10) { lam = nrm; break; } lam = nrm;
  }
  return { u, share: lam / tr };
}
/** The dominant-axis two-way partition (sign of u, deterministic orientation: the smaller side is 1; a tie in size keeps sign) and its share. */
export function dominantSplit(X, rng) {
  const { u, share } = firstAxis(standardise(X), rng); const lab = Array.from(u, (v) => (v > 0 ? 1 : 0)); const ones = sum(lab);
  if (ones > lab.length - ones) for (let i = 0; i < lab.length; i++) lab[i] = 1 - lab[i];
  return { labels: lab, share, axis: Array.from(u) };
}
/** Ceiling-free Kanada partition (validated candidates only; fallbackNomination is read ONLY to exclude it): kind id per system, 0 = none. */
export function kanadaPartition(featureIndex, ids, { population = "systems", permutations = null } = {}) {
  const res = induceEntityKindCandidates(featureIndex, { population, ...(permutations ? { permutations } : {}) });
  const label = new Map(ids.map((id) => [id, 0])); let k = 0; const kept = [];
  for (const c of res.candidates) { if (c.fallbackNomination === true) continue; if (c.field?.stable !== true) continue; k++; for (const m of c.memberRefs) label.set(m, k); kept.push({ kindKey: c.kindKey, members: [...c.memberRefs], bindingEnergy: c.field.bindingEnergy }); }
  return { labels: ids.map((id) => label.get(id)), kinds: kept, diagnostics: res.diagnostics };
}
/** N-feat redeal at block level: every block's row assignment permuted across systems independently (marginals and one-hot structure kept). */
export function blockPermute(X, blocks, rng) {
  const n = X.length; const Y = X.map((r) => r.slice());
  for (const bl of blocks) { const perm = shuffleInPlace(Array.from({ length: n }, (_, i) => i), rng); for (let i = 0; i < n; i++) for (const c of bl) Y[i][c] = X[perm[i]][c]; }
  return Y;
}
/** Re-bin a continuous matrix (rows = systems) at its own medians/terciles into { matrix, blocks } (the resampling analogue of levelSInput). */
export function binMatrix(continuous, { bins = 2 } = {}) {
  const n = continuous.length, p = continuous[0]?.length ?? 0; const cols = []; const blocks = [];
  for (let f = 0; f < p; f++) { const b = binColumn(continuous.map((r) => r[f]), bins); if (!b) continue; const bl = []; for (let j = 0; j < b.labels.length; j++) { bl.push(cols.length); cols.push({ f, j, bin: b }); } blocks.push(bl); }
  const matrix = Array.from({ length: n }, (_, i) => cols.map((c) => (c.bin.bin[i] === c.j ? 1 : 0)));
  return { matrix, blocks, features: blocks.length };
}
const probePartition = (instrument, X, blocks, ids, rng, { population = "probe" } = {}) => {
  if (instrument === "spectral") return dominantSplit(X, rng).labels;
  if (instrument === "kanada") {
    const sigs = X[0].map((_, c) => `c${c}=1`); const idx = new Map();
    ids.forEach((id, i) => { const m = new Map(); X[i].forEach((v, c) => { if (v === 1) m.set(sigs[c], { signature: sigs[c], featureKey: `c${c}`, featureValue: 1, firstAt: 0, lastAt: 0, evidenceIds: new Set([`${id}:${c}`]), witnessRefs: new Set(["probe"]) }); }); idx.set(id, m); });
    return kanadaPartition(idx, ids, { population, permutations: 20 }).labels;
  }
  throw new Error(`probePartition: unknown instrument ${instrument}`);
};
/**
 * Stability of an instrument's whole partition (header C2): feature-block bootstrap and 80-percent system subsample, ARI against the original,
 * against the bar = 95th percentile of the ARI between two independent N-feat-null partitions of the same matrix.
 */
export function partitionStability(inp, instrument, { Bfeat = TYPED.stabilityBFeat, Bsys = TYPED.stabilityBSys, frac = TYPED.subsample, pairs = TYPED.nullPairs, bins = 2, seed = SEED } = {}) {
  const n = inp.systemIds.length; const ids = inp.systemIds; const rng = rngFor("stability", instrument, inp.group, seed);
  const P0 = probePartition(instrument, inp.matrix, inp.blocks, ids, rngFor("stab-orig", instrument, inp.group));
  const aris = { feat: [], sys: [], null: [] };
  for (let b = 0; b < Bfeat; b++) {
    const pick = Array.from({ length: inp.blocks.length }, () => Math.floor(rng() * inp.blocks.length)); const cols = []; const blocks = []; for (const bi of pick) { const bl = []; for (const c of inp.blocks[bi]) { bl.push(cols.length); cols.push(c); } blocks.push(bl); }
    const X = inp.matrix.map((r) => cols.map((c) => r[c]));
    aris.feat.push(ari(P0, probePartition(instrument, X, blocks, ids, rngFor("stab-f", instrument, inp.group, b))));
  }
  const k = Math.max(4, Math.round(frac * n));
  for (let b = 0; b < Bsys; b++) {
    const keep = shuffleInPlace(Array.from({ length: n }, (_, i) => i), rng).slice(0, k).sort((x, y) => x - y);
    const sub = !inp.continuous?.length ? { matrix: keep.map((i) => inp.matrix[i]), blocks: inp.blocks } : inp.bm ? (() => { const sbm = ORGAN.blockMatrixFromValues(keep.map((i) => inp.continuous[i]), { ids: keep.map((i) => ids[i]), featureKeys: inp.featureIds, bins }); const d = denseOf(sbm); return { matrix: d.matrix, blocks: d.blocks }; })() : binMatrix(keep.map((i) => inp.continuous[i]), { bins });
    aris.sys.push(ari(keep.map((i) => P0[i]), probePartition(instrument, sub.matrix, sub.blocks, keep.map((i) => ids[i]), rngFor("stab-s", instrument, inp.group, b))));
  }
  for (let b = 0; b < pairs; b++) {
    const A = blockPermute(inp.matrix, inp.blocks, rngFor("stab-null-a", instrument, inp.group, b)), B = blockPermute(inp.matrix, inp.blocks, rngFor("stab-null-b", instrument, inp.group, b));
    aris.null.push(ari(probePartition(instrument, A, inp.blocks, ids, rngFor("stab-na", instrument, inp.group, b)), probePartition(instrument, B, inp.blocks, ids, rngFor("stab-nb", instrument, inp.group, b))));
  }
  const fin = (a) => a.filter(Number.isFinite);
  const bar = quantile(fin(aris.null), 0.95), p05f = quantile(fin(aris.feat), 0.05), p05s = quantile(fin(aris.sys), 0.05);
  return { instrument, group: inp.group, partitionSizes: [...new Set(P0)].map((l) => P0.filter((x) => x === l).length), bar, feat: { p05: p05f, median: median(fin(aris.feat)), B: aris.feat.length }, sys: { p05: p05s, median: median(fin(aris.sys)), B: aris.sys.length },
    nullPairs: aris.null.length, stable: Number.isFinite(bar) && p05f > bar && p05s > bar, degenerate: new Set(P0).size < 2,
    verdict: new Set(P0).size < 2 ? "NO_PARTITION" : Number.isFinite(bar) && p05f > bar && p05s > bar ? "STABLE" : "UNSTABLE" };
}
/** Decompose a partition against the answer keys (header C3): ARI and NMI against lineage, branch, script with a permutation null WITHIN strata of the other key. */
export function labelDecomposition(partition, { lineages, branches, scripts }, { draws = 499, seed = SEED, tag = "part" } = {}) {
  const out = {}; const n = partition.length;
  const keys = { lineage: lineages, branch: branches, script: scripts };
  const strataFor = { lineage: scripts, branch: scripts, script: lineages };
  for (const [key, labels] of Object.entries(keys)) {
    if (!labels || labels.some((x) => x == null)) { out[key] = { gap: "key missing for some system" }; continue; }
    const obs = ari(partition, labels); const strata = strataFor[key] ?? labels.map(() => 0);
    const groups = new Map(); strata.forEach((s, i) => { const k = String(s ?? "none"); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
    let ge = 0; const rng = rngFor("decomp", tag, key, seed); const nulls = [];
    for (let d = 0; d < draws; d++) { const perm = labels.slice(); for (const idx of groups.values()) { const v = shuffleInPlace(idx.map((i) => labels[i]), rng); idx.forEach((i, t) => { perm[i] = v[t]; }); } const a = ari(partition, perm); nulls.push(a); if (a >= obs) ge++; }
    out[key] = { ari: obs, nmi: nmi(partition, labels), nullMedian: median(nulls), nullQ95: quantile(nulls, 0.95), p: (ge + 1) / (draws + 1), within: key === "script" ? "lineage strata" : "script strata" };
  }
  return out;
}

// ═══ 7. planted toy: SystemProfile@1-shaped objects with a KNOWN kind / continuum / nothing ════════
/** Inverse standard normal CDF (Acklam's rational approximation; abs error < 1.2e-9). */
export function qnorm(p) {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const lo = 0.02425, hi = 1 - lo; let q, r;
  if (p < lo) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > hi) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
export const TOY_STEMS = Object.freeze("arb bul cat ces cmn cmn-hans deu ell eng fas fin fra glg heb hin hrv ind ita jpn kor nld pol por ron rus slk slv spa srp swe tur ukr urd vie".split(" "));
/** The planted effect delta(strength) in SD units: Phi^-1((1+strength)/2) (BARKER 4.4). */
export const deltaOfStrength = (strength) => qnorm((1 + strength) / 2);
/** Loading l with l^2 = the pairwise correlation among signature features of the planted-gap world (closed form; BARKER 4.4 W-continuum). */
export function matchedLoading({ strength, memberShare }) { const v = memberShare * (1 - memberShare) * deltaOfStrength(strength) ** 2; return Math.sqrt(v / (1 + v)); }
/**
 * plantedToyProfiles({ world: "kind"|"continuum"|"null", stems, strength, signatureCount, commonCount, noiseGroups, noisePerGroup, kindBranches, seed })
 * -> { profiles, truth:{ members:Set<id>|null } }. Group A holds the signature features (planted), the common and some noise features; groups B.. hold noise only.
 */
export function plantedToyProfiles({ world = "kind", stems = TOY_STEMS, strength = 0.8, signatureCount = 24, commonCount = 6, noiseInA = 20, noiseGroups = ["B", "C"], noisePerGroup = 14, kindBranches = ["Romance", "Semitic", "Turkic", "Germanic"], resampleSd = 0.25, seed = 1 } = {}) {
  const rng = rngFor("toy", world, strength, signatureCount, seed); const n = stems.length;
  const gen = stems.map((s) => genealogyOf(s)); const members = new Set(); stems.forEach((s, i) => { if (world === "kind" && kindBranches.includes(gen[i].branch)) members.add(i); });
  const delta = deltaOfStrength(strength); const share = members.size / n; const l = world === "continuum" ? matchedLoading({ strength, memberShare: members.size ? share : 0.3 }) : 0;
  const t = stems.map(() => randn(rng)); const feat = []; // [id, group, role]
  const pad = (i) => String(i).padStart(2, "0");
  for (let i = 0; i < signatureCount; i++) feat.push([`a${pad(i + 1)}`, "A", "sig"]);
  for (let i = 0; i < commonCount; i++) feat.push([`a${pad(signatureCount + i + 1)}`, "A", "common"]);
  for (let i = 0; i < noiseInA; i++) feat.push([`a${pad(signatureCount + commonCount + i + 1)}`, "A", "noise"]);
  for (const g of noiseGroups) for (let i = 0; i < noisePerGroup; i++) feat.push([`${g.toLowerCase()}${pad(i + 1)}`, g, "noise"]);
  const cellsFor = (i) => {
    const cells = {};
    for (const [id, group, role] of feat) {
      let v = randn(rng);
      if (role === "sig") { if (world === "kind" && members.has(i)) v += delta; if (world === "continuum") v = l * t[i] + Math.sqrt(1 - l * l) * v; }
      if (role === "common") v += 2;
      const resamples = Array.from({ length: 10 }, () => v + resampleSd * randn(rng));
      cells[id] = { id, group, channel: "toy:synthetic", value: v, n: 10000, ci95: [v - 0.1, v + 0.1], resamples, definitionId: `toy:${id}`, builder: "induce.mjs#plantedToyProfiles", giver: "synthetic", floor: null };
    }
    return cells;
  };
  const profiles = stems.map((stem, i) => ({ schema: "SystemProfile@1", id: `nl:${stem}@toy`, kind: "nl", inputs: [], labels: { stem, family: gen[i].branch, lineage: gen[i].lineage, branch: gen[i].branch, script: "Latn", macroarea: null, typedBy: "toy", giver: "synthetic" },
    budget: { N: 0, halves: 2, seeds: [...SEEDS], unit: "synthetic" }, cells: cellsFor(i), gaps: [], eoFree: true, contentHash: stableHash(`${stem}|${seed}|${world}`) }));
  return { profiles, truth: { members: world === "kind" ? new Set([...members].map((i) => profiles[i].id)) : null, delta, memberShare: share } };
}
/** F1 of a candidate member set against a planted truth set. */
export function f1Against(candidate, truth) { const c = new Set(candidate); let tp = 0; for (const x of c) if (truth.has(x)) tp++; const p = c.size ? tp / c.size : 0, r = truth.size ? tp / truth.size : 0; return p + r ? (2 * p * r) / (p + r) : 0; }

// ═══ 8. the Level-S runner (organ calls are wrapped: a missing or failing organ is a typed result, never a crash) ═══
/** The organ's KindRecord with the system labels attached (the organ already speaks ids; this only flattens and keeps the fields a reader needs). */
export function normaliseKind(k, inp) {
  const ids = inp.systemIds; const smaller = k.smallerSide ?? k.memberRefs ?? [];
  return { id: k.id ?? null, instrument: k.instrument ?? null, foundBy: k.foundBy ?? null, status: k.status ?? null, refusal: k.refusal ?? null, members: k.memberRefs ?? smaller, smallerSide: smaller,
    lineageSpan: k.lineageSpan ?? new Set(smaller.map((m) => inp.lineages[ids.indexOf(m)])).size, lineageSpanAfterDrop: k.lineageSpanAfterDrop ?? null, branchSpan: k.branchSpan ?? null, famInformative: k.famInformative ?? null,
    signatureCount: k.signatureCount ?? null, coreSignatures: (k.coreSignatures ?? []).slice(0, 12), statistic: k.statistic ?? null, ceiling: k.ceiling ?? null, p: k.p ?? null, survives: k.survives ?? null,
    gap: k.gap ?? null, effectiveDimension: k.effectiveDimension ?? null, detectability: k.detectability ?? null };
}
/**
 * runLevelS({ profiles, groups, draws, ... }) -> { level:"S", groups:{ [g]: GroupCard }, consensus, organ, params }.
 * GroupCard: { group, n, m, features, blocks, pr, dominant:{share, sizes, decomposition}, stability:{spectral,kanada}, copulaCalibration, organ:{ status, kinds[], refused[], ceiling, diagnostics }, absence }.
 * The organ's induceSystemKinds runs its own control built to fail (block-permuted copies, `controlReps`) and honours `power.copula[g]` (a rejected calibration refuses every kind).
 */
export async function runLevelS({ profiles, groups = ["A", "B", "C", "D", "E", "F", "G", "ALL"], draws = DRAWS_SMOKE, alpha = ALPHA, seed = SEED, instruments = ["kanada", "charset", "spectral"], bins = 2, stability = true, stabilityOpts = {}, power = null, decomposeDraws = 499, population = "systems:nl", controlReps = undefined, onProgress = null, workers = 1 } = {}) {
  const out = { level: "S", groups: {}, params: { draws, alpha, seed, bins, instruments, stability, population, controlReps: controlReps ?? "organ default", workers }, organ: organStatus() };
  const opts = { draws, alpha, seed, instruments, bins, stability, stabilityOpts, power, decomposeDraws, population, controlReps };
  const results = workers > 1 ? await parallelMap(groups.map((g) => ({ type: "levelSGroup", profiles, group: g, opts })), workers) : groups.map((g) => levelSGroup(profiles, g, { ...opts, onProgress }));
  const dominantByGroup = {};
  results.forEach((r, k) => { if (r?.error) out.groups[groups[k]] = { group: groups[k], organ: { status: "ERROR", error: r.error, kinds: [] } }; else { out.groups[groups[k]] = r.rec; if (r.dominant) dominantByGroup[groups[k]] = r.dominant; } });
  out.consensus = interGroupConsensus(dominantByGroup, profiles, { draws: TYPED.a12Draws });
  return out;
}
/** One feature group of Level S: input, dominant axis, decomposition, stability, the organ's ceiling run. Returns { rec, dominant }. Runs in a worker thread when called through parallelMap. */
export function levelSGroup(profiles, g, { draws, alpha, seed, instruments, bins, stability, stabilityOpts = {}, power = null, decomposeDraws, population, controlReps, onProgress = null }) {
  const inp = levelSInput(profiles, g, { bins });
  if (inp.gap) return { rec: { group: g, gap: inp.gap, dropped: inp.dropped }, dominant: null };
  const rec = { group: g, n: inp.systemIds.length, m: inp.signatures.length, features: inp.featureIds.length, blocks: inp.blocks.length, pr: participationRatioOf(inp.continuous), dropped: inp.dropped, systems: inp.systemIds, binning: inp.bm ? "organ" : "local" };
  const dom = dominantSplit(inp.matrix, rngFor("dominant", g));
  rec.dominant = { share: dom.share, sizes: [sum(dom.labels), dom.labels.length - sum(dom.labels)], decomposition: labelDecomposition(dom.labels, inp, { draws: decomposeDraws, seed, tag: `dom-${g}` }) };
  if (stability) { rec.stability = {}; for (const ins of ["spectral", "kanada"]) { try { rec.stability[ins] = partitionStability(inp, ins, { bins, seed, ...stabilityOpts }); } catch (e) { rec.stability[ins] = { error: String(e?.message ?? e) }; } } }
  const cal = power?.copula?.[g] ?? null; rec.copulaCalibration = cal;
  try {
    if (!inp.bm) throw new OrganMissing("blockMatrixOf");
    const res = organFn("induceSystemKinds")(inp.bm, { instruments, draws, alpha, seed, population: `${population}:${g}`, group: g, branches: inp.branches, lineages: inp.lineages, calibration: cal, grid: power?.grid ?? null, ...(controlReps !== undefined ? { controlReps } : {}), ...(onProgress ? { onProgress } : {}) });
    const kinds = (res.kinds ?? []).map((k) => { const nk = normaliseKind(k, inp); nk.decomposition = labelDecomposition(inp.systemIds.map((id) => (nk.smallerSide.includes(id) ? 1 : 0)), inp, { draws: decomposeDraws, seed, tag: `kind-${g}-${nk.id}` }); return nk; });
    const failed = (res.refused ?? []).find((r) => r.type === "control_survived" || r.type === "copula_calibration_failed");
    rec.organ = { status: failed ? "INSTRUMENT_FAILED" : "OK", reason: failed?.type ?? null, kinds, refused: res.refused ?? [], ceiling: res.ceiling ?? null, diagnostics: res.diagnostics ?? null, gaps: res.gaps ?? [] };
  } catch (e) { rec.organ = e?.code === "ORGAN_MISSING" ? { status: "ORGAN_MISSING", missing: e.missing, kinds: [] } : { status: "ERROR", error: String(e?.stack ?? e).split("\n").slice(0, 4).join(" | "), kinds: [] }; }
  const cell = power?.grid?.sesoiCell ?? null;
  rec.absence = { licensed: !!(cell && cell.admissible), reason: cell ? (cell.admissible ? "SESOI cell admissible" : "SESOI cell inadmissible: absence is UNDERPOWERED") : "no power grid: absence is UNDERPOWERED" };
  return { rec, dominant: { ids: inp.systemIds, labels: dom.labels } };
}

// ── worker-thread pool (the organ is pure; groups, calibration worlds and grid cells are independent) ──
const JOBS = { levelSGroup: (j) => levelSGroup(j.profiles, j.group, j.opts) };
/** Register a job type (used by sections defined after this one). */
export const registerJob = (type, fn) => { JOBS[type] = fn; };
/** Run jobs [{ type, ... }] in worker threads, `concurrency` at a time; results in job order; a failing job yields { error }. */
export async function parallelMap(jobs, concurrency = 4) {
  const results = new Array(jobs.length); let next = 0;
  const runOne = (job) => new Promise((resolve) => {
    const w = new Worker(new URL(import.meta.url), { workerData: { __barkerJob: job } });
    w.once("message", (m) => resolve(m)); w.once("error", (e) => resolve({ error: String(e?.stack ?? e).split("\n").slice(0, 4).join(" | ") }));
    w.once("exit", (c) => { if (c !== 0) resolve({ error: `worker exit ${c}` }); });
  });
  const lane = async () => { while (next < jobs.length) { const i = next++; results[i] = await runOne(jobs[i]); } };
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, lane));
  return results;
}

// ═══ 9. Level W: kinds of word types within one system (company, gold tokens) ═══════════════════════
const normForm = (f) => String(f).toLowerCase().replace(/\s+/g, "_");
/** wordKinds(system) -> { stem, vocab, kinds:[{ name, size, nmiPartOfKind }], coverage, nmiUpos, control } through discoverCompanyKinds with its nullArm (header C4). */
export function wordKinds(sys, { N = N_BUDGET, seed = 1, draws = TYPED.wNullDraws, minMentions = TYPED.wMinMentions, minShare = TYPED.wMinShare, minMembers = TYPED.wMinMembers, alpha = ALPHA, split = "dev" } = {}) {
  const tb = cachedTreebank(sys.train, { split }); const smp = sampleIndices(tb, { N, seed, system: sys.stem });
  if (!smp) return { stem: sys.stem, gap: { reason: "treebank below budget", words: tb.words, need: N } };
  const sentences = []; const tally = new Map(); const upos = new Map();
  for (const i of smp.indices) {
    const s = tb.sentences[i]; const ws = [];
    for (let k = 0; k < s.form.length; k++) { if (s.upos[k] === "PUNCT" || s.upos[k] === "SYM") continue; const f = normForm(s.form[k]); ws.push(f); tally.set(f, (tally.get(f) ?? 0) + 1); if (!upos.has(f)) upos.set(f, new Map()); const m = upos.get(f); m.set(s.upos[k], (m.get(s.upos[k]) ?? 0) + 1); }
    if (ws.length) sentences.push({ text: ws.join(" ") });
  }
  const vocabulary = [...tally].filter(([, c]) => c >= minMentions).map(([w]) => w).sort();
  const opts = { minMentions, minShare, minMembers, clean: (t) => t, nullArm: { draws, seed: SEED, alpha } };
  const kinds = discoverCompanyKinds(sentences, vocabulary, opts);
  const gold = (w) => [...upos.get(w).entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
  const memberLabel = [], goldLabel = []; kinds.forEach((k, ki) => k.members.forEach((w) => { memberLabel.push(ki); goldLabel.push(gold(w)); }));
  const covTypes = memberLabel.length / Math.max(1, vocabulary.length); const covTokens = sum(kinds.flatMap((k) => k.members.map((w) => tally.get(w)))) / smp.words;
  // the control built to fail: the same corpus with each sentence's tokens shuffled (company destroyed) must produce no kind at the same declared floors
  const rng = rngFor("w-control", sys.stem); const shuffledSents = sentences.map((s) => ({ text: shuffleInPlace(s.text.split(" "), rng).join(" ") }));
  const controlKinds = discoverCompanyKinds(shuffledSents, vocabulary, opts);
  return { stem: sys.stem, vocab: vocabulary.length, words: smp.words, kinds: kinds.map((k) => ({ name: k.name, size: k.members.length, sample: k.members.slice(0, 6) })), kindCount: kinds.length,
    coverage: { types: covTypes, tokens: covTokens }, nmiUpos: memberLabel.length > 1 && new Set(memberLabel).size > 1 ? nmi(memberLabel, goldLabel) : null,
    control: { survivors: controlKinds.length, passed: controlKinds.length === 0 }, params: { N, seed, draws, minMentions, minShare, minMembers, alpha } };
}

// ═══ 10. A12 core: inter-group consensus of dominant partitions ══════════════════════════════════════
/**
 * interGroupConsensus(dominantByGroup: { [g]: { ids, labels } }, profiles, { draws }) -> { pairs:[{g1,g2,shared,ari,nullMedian,excess}], theta, nullTheta, p, groups }.
 * theta = mean over group pairs of (ARI - median ARI under a permutation of one group's partition WITHIN BRANCH strata); the null's draws are joint over pairs.
 */
export function interGroupConsensus(dominantByGroup, profiles, { draws = TYPED.a12Draws, seed = SEED } = {}) {
  const gs = Object.keys(dominantByGroup).filter((g) => g !== "ALL").sort(); const view = new Map(profiles.map((p) => [p.id, systemView(p)]));
  const pairs = [];
  for (let a = 0; a < gs.length; a++) for (let b = a + 1; b < gs.length; b++) {
    const A = dominantByGroup[gs[a]], B = dominantByGroup[gs[b]]; const bi = new Map(B.ids.map((id, i) => [id, i])); const shared = A.ids.filter((id) => bi.has(id));
    if (shared.length < 6) continue; const la = shared.map((id) => A.labels[A.ids.indexOf(id)]), lb = shared.map((id) => B.labels[bi.get(id)]);
    pairs.push({ g1: gs[a], g2: gs[b], shared, la, lb, branches: shared.map((id) => view.get(id)?.branch ?? "?") });
  }
  if (!pairs.length) return { gap: "fewer than two groups with shared systems", pairs: [] };
  const nulls = pairs.map(() => []); const rng = rngFor("a12-null", seed);
  for (let d = 0; d < draws; d++) pairs.forEach((pr, k) => {
    const strata = new Map(); pr.branches.forEach((br, i) => { if (!strata.has(br)) strata.set(br, []); strata.get(br).push(i); });
    const perm = pr.lb.slice(); for (const idx of strata.values()) { const v = shuffleInPlace(idx.map((i) => pr.lb[i]), rng); idx.forEach((i, t) => { perm[i] = v[t]; }); }
    nulls[k].push(ari(pr.la, perm));
  });
  const rows = pairs.map((pr, k) => { const o = ari(pr.la, pr.lb); const nm = median(nulls[k].filter(Number.isFinite)); return { g1: pr.g1, g2: pr.g2, shared: pr.shared.length, ari: o, nullMedian: nm, nullQ95: quantile(nulls[k], 0.95), excess: o - nm }; });
  const fin = (x) => (Number.isFinite(x) ? x : 0);
  const theta = mean(rows.map((r) => fin(r.excess)));
  const nullTheta = Array.from({ length: draws }, (_, d) => mean(rows.map((r, k) => fin(nulls[k][d]) - r.nullMedian)));
  const ge = nullTheta.filter((x) => x >= theta).length;
  return { groups: gs, pairs: rows, theta, nullThetaQ95: quantile(nullTheta, 0.95), p: (ge + 1) / (draws + 1), draws, internal: pairs };
}

// ═══ 11. the card harness: per-lineage rows -> BARKER 4.6 persistence (with the header's adaptations) ═══
/**
 * evaluateRow({ perSystem: Map<id,{stat,nullDraws}|{gap}>, views: Map<id,view>, sesoi, B, seed, direction })
 *   -> { n, theta:{pooled,lo,hi}, theta95:{pooled}, lineages:[{lineage,theta,theta95,h,systems}], nLineages, k, sign:{p,reach}, lolo:[{drop,lo,hi}], outsideIE:{...} }
 * excess_s = stat - median(null_s) ; excess95_s = stat - q95(null_s); nested means over systems -> branches -> lineages; lineages with no defined system leave the denominator.
 */
export function evaluateRow({ perSystem, views, sesoi, B = TYPED.bootB, seed = SEED, lolo = true, tag = "row" }) {
  const ex = new Map(), ex95 = new Map(); let gaps = 0;
  for (const [id, r] of perSystem) {
    if (!r || r.gap || !Number.isFinite(r.stat)) { gaps++; continue; }
    const nd = (r.nullDraws ?? []).filter(Number.isFinite); const med = nd.length ? median(nd) : 0, q95 = nd.length ? quantile(nd, 0.95) : 0;
    ex.set(id, r.stat - med); ex95.set(id, r.stat - q95);
  }
  const brOf = (id) => views.get(id).branch, liOf = (id) => views.get(id).lineage;
  const nm = nestedMean(ex, brOf, liOf), nm95 = nestedMean(ex95, brOf, liOf);
  const lineages = [...nm.byLineage.keys()].sort().map((l) => ({ lineage: l, theta: nm.byLineage.get(l), theta95: nm95.byLineage.get(l), h: nm.byLineage.get(l) > 0 ? 1 : 0 }));
  const vals = lineages.map((l) => l.theta), n = vals.length, k = sum(lineages.map((l) => l.h));
  const boot = lineageBootstrap(vals, { B, rng: rngFor("row-boot", tag, seed) });
  const out = { systemsDefined: ex.size, systemsGap: gaps, nLineages: n, k, theta: { pooled: nm.pooled, lo: boot.lo, hi: boot.hi, se: boot.se }, theta95: { pooled: nm95.pooled }, lineages,
    sign: { p: n ? signTestP(k, n) : 1, reach: reachability(n), pass: false } };
  const reach = out.sign.reach; out.sign.pass = !reach.unreachable && k >= reach.kNeeded && out.sign.p <= ALPHA;
  if (lolo) out.lolo = lineages.map((l, i) => { const rest = vals.filter((_, j) => j !== i); const b = lineageBootstrap(rest, { B: Math.min(B, 400), rng: rngFor("row-lolo", tag, i, seed) }); return { drop: l.lineage, pooled: mean(rest), lo: b.lo, hi: b.hi }; });
  const nonIE = lineages.filter((l) => l.lineage !== "Indo-European"); const vNon = nonIE.map((l) => l.theta); const bNon = lineageBootstrap(vNon, { B: Math.min(B, 800), rng: rngFor("row-nonie", tag, seed) });
  const kNon = sum(nonIE.map((l) => l.h)); const rNon = reachability(nonIE.length);
  out.outsideIE = { nLineages: nonIE.length, k: kNon, pooled: mean(vNon), lo: bNon.lo, hi: bNon.hi, signP: nonIE.length ? signTestP(kNon, nonIE.length) : 1, reach: rNon, signPass: !rNon.unreachable && kNon >= rNon.kNeeded, theta95: mean(nonIE.map((l) => l.theta95)) };
  return out;
}
/**
 * rowStatus({ ev, sesoi, power, control, channels, direction }) -> { status, reasons[], statusIfChannelWaived }: BARKER 4.6 in a fixed order (header section 5).
 * power: { up, down, tiny, pass } | null ; control: { survived:boolean } | null ; channels: effective independent channels (>= 2 needed).
 */
export function rowStatus({ ev, sesoi, power, control, channels = 1 }) {
  const reasons = [];
  if (control?.survived) return { status: "INSTRUMENT_FAILED", reasons: ["control built to fail survived"], statusIfChannelWaived: null };
  if (!power) return { status: "UNDERPOWERED", reasons: ["power card absent"], statusIfChannelWaived: null };
  if (!power.pass) return { status: "UNDERPOWERED", reasons: [`power trio failed (P_up ${power.up}, P_down ${power.down}, tiny ${power.tiny})`], statusIfChannelWaived: null };
  if (ev.sign.reach.unreachable) return { status: "UNDERPOWERED", reasons: [`n_l = ${ev.nLineages} < 5: UNDERPOWERED BY REACHABILITY`], statusIfChannelWaived: null };
  const lo = ev.theta.lo, hi = ev.theta.hi;
  if (hi < sesoi) return { status: "ABSENT", reasons: [`interval upper ${hi.toFixed(4)} < SESOI ${sesoi}`], statusIfChannelWaived: null };
  if (!(lo > sesoi)) return { status: "UNDERPOWERED", reasons: [`interval [${lo.toFixed(4)}, ${hi.toFixed(4)}] straddles or sits at SESOI ${sesoi}`], statusIfChannelWaived: null };
  if (!(ev.theta95.pooled >= sesoi)) return { status: "TRIVIAL", reasons: [`pooled theta95 ${ev.theta95.pooled.toFixed(4)} < SESOI ${sesoi}: the registered trivial null reaches it`], statusIfChannelWaived: null };
  const loloOk = (ev.lolo ?? []).every((x) => x.lo > sesoi);
  const passAll = ev.sign.pass && loloOk;
  const out = ev.outsideIE; const passOut = !out.reach.unreachable && out.signPass && out.lo > sesoi && out.theta95 >= sesoi;
  let cand = passAll ? "PERSISTENT" : passOut ? "PERSISTENT-OUTSIDE-IE" : "FAMILY-BOUND";
  if (cand === "FAMILY-BOUND") reasons.push(ev.sign.pass ? `leave-one-lineage-out drops the lower bound to the SESOI (${(ev.lolo ?? []).filter((x) => !(x.lo > sesoi)).map((x) => x.drop).join(", ")})` : `sign gate failed: k ${ev.k} of ${ev.nLineages}, needs ${ev.sign.reach.kNeeded}`);
  if ((cand === "PERSISTENT" || cand === "PERSISTENT-OUTSIDE-IE") && channels < 2) return { status: "UNDERPOWERED", reasons: ["channels < 2 (ADAPTATION A: a single-channel card cannot be PERSISTENT)"], statusIfChannelWaived: cand };
  return { status: cand, reasons, statusIfChannelWaived: null };
}
/** Merge row statuses of one card by the WEAKEST-link order of header section 6 (A02). */
export const weakestStatus = (statuses) => statuses.slice().sort((a, b) => WEAKEST_ORDER.indexOf(a) - WEAKEST_ORDER.indexOf(b))[0];
/** powerTrio rates from replicate evaluations: { up, down, tiny, pass, reps }. `evals` = { two:[ev...], half:[ev...], tiny:[ev...] }. */
export function powerRates(evals, sesoi) {
  const rate = (arr, pred) => (arr.length ? arr.filter(pred).length / arr.length : NaN);
  const up = rate(evals.two ?? [], (e) => e.theta.lo > sesoi), down = rate(evals.half ?? [], (e) => e.theta.hi < sesoi);
  const tiny = rate(evals.tiny ?? [], (e) => e.theta.lo > sesoi && e.theta95.pooled >= sesoi && e.sign.pass);
  return { up, down, tiny, reps: { two: evals.two?.length ?? 0, half: evals.half?.length ?? 0, tiny: evals.tiny?.length ?? 0 }, pass: up >= TYPED.powerUp && down >= TYPED.powerDown && tiny <= ALPHA };
}

// ═══ 12. tree banks, Strahler orders, arity-matched random trees (A03) and same-type descendants (A02) ═══
const MAXM = 1500;
/**
 * prepareTrees(sys) -> { stem, seeds:[{ nSent, offsets, parent, label, order, deg, root, ancOff, ancList }], labelNames, labelCounts, skipped } | { stem, gap }.
 * One flat typed-array block per seed sample (header section 0): PUNCT removed, non-tree sentences skipped and counted. Label id 0 is "root".
 */
export function prepareTrees(sys, { N = N_BUDGET, seeds = SEEDS, split = "dev" } = {}) {
  const tb = cachedTreebank(sys.train, { split }); const labelIds = new Map([["root", 0]]); const out = []; let skipped = 0, seen = 0;
  for (const seed of seeds) {
    const smp = sampleIndices(tb, { N, seed, system: sys.stem }); if (!smp) return { stem: sys.stem, gap: { reason: "treebank below budget", words: tb.words, need: N } };
    const trees = []; for (const i of smp.indices) { seen++; const t = sentTree(tb.sentences[i]); if (!t || t.m > MAXM) { skipped++; continue; } trees.push(t); }
    const total = sum(trees.map((t) => t.m)); const sd = { nSent: trees.length, offsets: new Int32Array(trees.length + 1), parent: new Int16Array(total), label: new Uint8Array(total), order: new Int16Array(total), deg: new Int16Array(total), root: new Int16Array(trees.length), ancOff: new Int32Array(total + 1) };
    const anc = []; let o = 0, a = 0;
    trees.forEach((t, ti) => {
      sd.offsets[ti] = o; sd.root[ti] = t.root;
      for (let k = 0; k < t.m; k++) {
        sd.parent[o + k] = t.parent[k]; sd.deg[o + k] = t.kids[k].length; sd.order[o + k] = t.order[k];
        if (!labelIds.has(t.label[k])) labelIds.set(t.label[k], labelIds.size); sd.label[o + k] = Math.min(255, labelIds.get(t.label[k]));
        sd.ancOff[o + k] = a; let p = t.parent[k]; while (p >= 0 && p !== t.root) { anc.push(p); a++; p = t.parent[p]; }
      }
      o += t.m;
    });
    sd.offsets[trees.length] = o; sd.ancOff[total] = a; sd.ancList = Int16Array.from(anc); sd.words = smp.words; out.push(sd);
  }
  const names = [...labelIds.keys()]; const counts = new Float64Array(names.length); for (const sd of out) for (let i = 0; i < sd.label.length; i++) counts[sd.label[i]]++;
  return { stem: sys.stem, seeds: out, labelNames: names, labelCounts: counts, skipped, seen };
}
const NK = 24;
const mxT = new Int8Array(MAXM + 8), cnT = new Int8Array(MAXM + 8);
/** Accumulate Strahler order counts of the REAL trees of a seed block into Nk (index = order). */
export function strahlerReal(sd, Nk) {
  for (let s = 0; s < sd.nSent; s++) {
    const o = sd.offsets[s], m = sd.offsets[s + 1] - o; for (let i = 0; i < m; i++) { mxT[i] = 0; cnT[i] = 0; }
    for (let t = m - 1; t >= 0; t--) { const node = sd.order[o + t]; const ord = mxT[node] === 0 ? 1 : cnT[node] >= 2 ? mxT[node] + 1 : mxT[node]; if (ord < NK) Nk[ord]++; const p = sd.parent[o + node]; if (p >= 0) { if (ord > mxT[p]) { mxT[p] = ord; cnT[p] = 1; } else if (ord === mxT[p]) cnT[p]++; } }
  }
}
const seqT = new Int16Array(MAXM + 8), parT = new Int16Array(MAXM + 8), stN = new Int16Array(MAXM + 8), stR = new Int16Array(MAXM + 8);
/**
 * Strahler counts of ARITY-MATCHED random plane trees: each sentence keeps its size and its multiset of child counts; the arrangement is uniform
 * (shuffle + the cycle-lemma rotation, so exactly one rotation is a valid preorder). With probability `q` the sentence instead takes the
 * degree-sorted breadth-first arrangement (the planted world's dial; q = 0 is the null). `repeat` replays every sentence that many times.
 */
export function strahlerArranged(sd, rng, Nk, { q = 0, repeat = 1 } = {}) {
  for (let rep = 0; rep < repeat; rep++) for (let s = 0; s < sd.nSent; s++) {
    const o = sd.offsets[s], m = sd.offsets[s + 1] - o; for (let i = 0; i < m; i++) seqT[i] = sd.deg[o + i];
    if (q > 0 && rng() < q) { const sub = seqT.subarray(0, m); sub.sort(); sub.reverse(); let next = 1; for (let i = 0; i < m; i++) for (let c = 0; c < seqT[i]; c++) parT[next++] = i; parT[0] = -1; }
    else {
      for (let i = m - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = seqT[i]; seqT[i] = seqT[j]; seqT[j] = t; }
      let sacc = 0, mn = 1e9, arg = 0; for (let i = 0; i < m; i++) { sacc += seqT[i] - 1; if (sacc < mn) { mn = sacc; arg = i; } }
      const start = (arg + 1) % m; let sp = 0;
      for (let t = 0; t < m; t++) { const d = seqT[(start + t) % m]; if (t === 0) parT[0] = -1; else { parT[t] = stN[sp - 1]; if (--stR[sp - 1] === 0) sp--; } if (d > 0) { stN[sp] = t; stR[sp] = d; sp++; } }
    }
    for (let i = 0; i < m; i++) { mxT[i] = 0; cnT[i] = 0; }
    for (let i = m - 1; i >= 0; i--) { const ord = mxT[i] === 0 ? 1 : cnT[i] >= 2 ? mxT[i] + 1 : mxT[i]; if (ord < NK) Nk[ord]++; const p = parT[i]; if (p >= 0) { if (ord > mxT[p]) { mxT[p] = ord; cnT[p] = 1; } else if (ord === mxT[p]) cnT[p]++; } }
  }
}
/** Bifurcation ratio from order counts: weighted (by N_k) least squares of ln N_k on k over the leading orders with N_k >= 3, at least 3 orders. { Rb, r2, orders } | null. */
export function fitRb(Nk) {
  let kmax = 0; while (kmax + 1 < Nk.length && Nk[kmax + 1] >= TYPED.orderFloor) kmax++;
  if (kmax < TYPED.minOrders) return null;
  let sw = 0, sx = 0, sy = 0; for (let k = 1; k <= kmax; k++) { const w = Nk[k]; sw += w; sx += w * k; sy += w * Math.log(Nk[k]); }
  const mx = sx / sw, my = sy / sw; let sxx = 0, sxy = 0, syy = 0; for (let k = 1; k <= kmax; k++) { const w = Nk[k]; const dx = k - mx, dy = Math.log(Nk[k]) - my; sxx += w * dx * dx; sxy += w * dx * dy; syy += w * dy * dy; }
  const slope = sxy / sxx; return { Rb: Math.exp(-slope), r2: syy > 0 ? (sxy * sxy) / (sxx * syy) : 1, orders: kmax };
}
const meanDefined = (a, minCount = 3) => { const v = a.filter(Number.isFinite); return v.length >= minCount ? mean(v) : NaN; };
/** Rb of the real trees, per seed. */
export function a03Real(data) { return data.seeds.map((sd) => { const Nk = new Float64Array(NK); strahlerReal(sd, Nk); return fitRb(Nk); }); }
/** Rb of one arranged corpus (all seeds) -> { Rb (seed mean), per:[...], r2 }. */
export function a03Arranged(data, rngKey, { q = 0, repeat = 1 } = {}) {
  const per = data.seeds.map((sd, si) => { const Nk = new Float64Array(NK); strahlerArranged(sd, rngFor(...rngKey, si), Nk, { q, repeat }); return fitRb(Nk); });
  return { Rb: meanDefined(per.map((x) => x?.Rb)), r2: meanDefined(per.map((x) => x?.r2)), per };
}
/**
 * A03 measurement for one system. mode "real": stat = |Rb_real - m| with m the median of the matched-null Rb; nullDraws = |Rb_d - m|.
 * mode "planted" (q, repeat): the same, with the corpus replaced by the q-mixture of sorted and random arrangements; the null is the real system's.
 * mode "control": a null draw (q = 0) run as the real corpus. `cache` holds { nullRb, m } from the real run.
 */
export function a03Measure(data, { mode = "real", draws = TYPED.treeDrawsPerSeed, q = 0, repeat = 1, cache = {}, rngKey = ["a03"], stem = data.stem } = {}) {
  if (data.gap) return { gap: data.gap };
  const ck = `r${repeat}`; cache[ck] ??= (() => { const nullRb = Array.from({ length: draws }, (_, d) => a03Arranged(data, ["a03-null", stem, d], { q: 0, repeat }).Rb); return { nullRb, m: median(nullRb.filter(Number.isFinite)) }; })();
  const m = cache[ck].m; if (!Number.isFinite(m)) return { gap: { reason: "fewer than 3 seeds with 3 Strahler orders under the null" } };
  let obs, r2 = null, per = null;
  if (mode === "real") { per = a03Real(data); obs = meanDefined(per.map((x) => x?.Rb)); r2 = meanDefined(per.map((x) => x?.r2)); }
  else if (mode === "planted") { const r = a03Arranged(data, [...rngKey, "planted", stem], { q, repeat }); obs = r.Rb; r2 = r.r2; }
  else if (mode === "control") { const r = a03Arranged(data, [...rngKey, "control", stem], { q: 0, repeat }); obs = r.Rb; r2 = r.r2; }
  if (!Number.isFinite(obs)) return { gap: { reason: "fewer than 3 seeds with 3 Strahler orders" } };
  return { stat: Math.abs(obs - m), signed: obs - m, Rb: obs, r2, nullMedian: m, nullDraws: cache[ck].nullRb.filter(Number.isFinite).map((x) => Math.abs(x - m)), seedsDefined: per ? per.filter(Boolean).length : undefined };
}
/** Accumulate A02 counts for a label array: has[t] = tokens of type t with a same-type proper descendant, tot[t] = tokens of type t (non-root). */
export function a02Accumulate(sd, labels, has, tot) {
  const L = has.length; const mark = a02Mark.length >= sd.label.length ? a02Mark : (a02Mark = new Uint8Array(sd.label.length));
  mark.fill(0, 0, sd.label.length);
  for (let s = 0; s < sd.nSent; s++) {
    const o = sd.offsets[s], m = sd.offsets[s + 1] - o, r = sd.root[s];
    for (let k = 0; k < m; k++) { if (k === r) continue; const lk = labels[o + k]; if (lk >= L) continue; tot[lk]++; for (let a = sd.ancOff[o + k]; a < sd.ancOff[o + k + 1]; a++) { const y = sd.ancList[a]; if (labels[o + y] === lk) mark[o + y] = 1; } }
    for (let k = 0; k < m; k++) if (k !== r && mark[o + k] && labels[o + k] < L) has[labels[o + k]]++;
  }
}
let a02Mark = new Uint8Array(0);
/** S and Gini from accumulated counts (types with >= typeFloor tokens enter G). */
export function a02Finish(has, tot) { let H = 0, T = 0; const shares = []; for (let t = 1; t < has.length; t++) { H += has[t]; T += tot[t]; if (tot[t] >= TYPED.typeFloor) shares.push(has[t] / tot[t]); } return { S: T ? H / T : NaN, G: shares.length >= 3 ? gini(shares) : NaN, types: shares.length }; }
/** Permute the labels WITHIN each tree among the non-root tokens (shape and per-tree label multiset fixed); writes into `out`. */
export function permuteLabelsWithinTrees(sd, labels, rng, out) {
  out.set(labels); const buf = [];
  for (let s = 0; s < sd.nSent; s++) { const o = sd.offsets[s], m = sd.offsets[s + 1] - o, r = sd.root[s]; buf.length = 0; for (let k = 0; k < m; k++) if (k !== r) buf.push(labels[o + k]); shuffleInPlace(buf, rng); let b = 0; for (let k = 0; k < m; k++) if (k !== r) out[o + k] = buf[b++]; }
}
/** Planted labels: each non-root token draws a label from the marginal, or (probability q when the parent is a non-root token of one of the nesting types) copies its parent's label. */
export function plantLabels(sd, { q, nesting, cdf }, rng, out) {
  const draw = () => { const u = rng(); let lo = 1, hi = cdf.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] >= u) hi = mid; else lo = mid + 1; } return lo; };
  for (let s = 0; s < sd.nSent; s++) {
    const o = sd.offsets[s], m = sd.offsets[s + 1] - o, r = sd.root[s]; out[o + r] = 0;
    for (let t = 0; t < m; t++) { const node = sd.order[o + t]; if (node === r) continue; const p = sd.parent[o + node]; out[o + node] = (p !== r && nesting.has(out[o + p]) && rng() < q) ? out[o + p] : draw(); }
  }
}
/** The marginal CDF over non-root label ids (index 0 unused) and the 3 most frequent types. */
export function labelMarginal(data, nestingRanks = [0, 1, 2]) {
  const c = Array.from(data.labelCounts); c[0] = 0; const tot = sum(c); const cdf = new Array(c.length).fill(0); let acc = 0; for (let t = 1; t < c.length; t++) { acc += c[t] / tot; cdf[t] = acc; } cdf[c.length - 1] = 1;
  const byFreq = c.map((v, t) => [v, t]).filter((x) => x[1] > 0 && x[0] > 0).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const nesting = new Set(nestingRanks.filter((r) => r < byFreq.length).map((r) => byFreq[r][1])); return { cdf, nesting };
}
/**
 * A02 measurement for one system -> { S:{stat,nullDraws}, G:{stat,nullDraws}, types } (stat is the statistic; excess is taken against median(null) by evaluateRow).
 * mode "real" | "planted" (q, repeat: labels re-drawn per seed and copy) | "control" (labels permuted once and run as real). The null permutes the OBSERVED
 * label arrays within trees (so a planted corpus is permuted, not regenerated).
 */
export function a02Measure(data, { mode = "real", draws = TYPED.treeDrawsPerSeed, q = 0, repeat = 1, rngKey = ["a02"], stem = data.stem, nestingRanks = [0, 1, 2] } = {}) {
  if (data.gap) return { S: { gap: data.gap }, G: { gap: data.gap } };
  const L = data.labelNames.length; const { cdf, nesting } = labelMarginal(data, nestingRanks); const reps = mode === "real" ? 1 : repeat;
  const sets = data.seeds.map((sd, si) => Array.from({ length: reps }, (_, r) => {
    if (mode === "real") return sd.label;
    const arr = new Uint8Array(sd.label.length);
    if (mode === "planted") plantLabels(sd, { q, nesting, cdf }, rngFor(...rngKey, "planted", stem, si, r), arr); else permuteLabelsWithinTrees(sd, sd.label, rngFor(...rngKey, "control", stem, si, r), arr);
    return arr;
  }));
  const finish = (si, arrs) => { const has = new Float64Array(L), tot = new Float64Array(L); for (const a of arrs) a02Accumulate(data.seeds[si], a, has, tot); return a02Finish(has, tot); };
  const obs = data.seeds.map((_, si) => finish(si, sets[si])); const S = meanDefined(obs.map((o) => o.S), 3), G = meanDefined(obs.map((o) => o.G), 3);
  if (!(Number.isFinite(S) && Number.isFinite(G))) { const g = { gap: { reason: "fewer than 3 seeds with 3 typed relations" } }; return { S: g, G: g }; }
  const nullS = [], nullG = []; const tmp = data.seeds.map((sd) => new Uint8Array(sd.label.length));
  for (let d = 0; d < draws; d++) {
    const ss = [], gg = [];
    for (let si = 0; si < data.seeds.length; si++) {
      const has = new Float64Array(L), tot = new Float64Array(L);
      sets[si].forEach((arr, r) => { permuteLabelsWithinTrees(data.seeds[si], arr, rngFor(...rngKey, "null", stem, d, si, r), tmp[si]); a02Accumulate(data.seeds[si], tmp[si], has, tot); });
      const f = a02Finish(has, tot); ss.push(f.S); gg.push(f.G);
    }
    nullS.push(meanDefined(ss, 3)); nullG.push(meanDefined(gg, 3));
  }
  return { S: { stat: S, nullDraws: nullS.filter(Number.isFinite) }, G: { stat: G, nullDraws: nullG.filter(Number.isFinite) }, types: obs[0].types };
}

// ═══ 13. dial calibration (the planted effect is injected by a dial and calibrated in the statistic's own units) ═══
/**
 * calibrateDial(f, target, { grid, steps }) -> { q, achieved, capped }: scan the grid upward for the FIRST crossing of `target` (f need not be monotone: planted
 * Gini excess rises then falls), then bisect inside the crossing interval. If the target is never reached, the grid argmax is returned with capped = true.
 */
export function calibrateDial(f, target, { grid = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], steps = TYPED.bisectionSteps } = {}) {
  const vals = grid.map((q) => f(q));
  if (vals[0] >= target) return { q: grid[0], achieved: vals[0], capped: false };
  for (let i = 1; i < grid.length; i++) if (vals[i - 1] < target && vals[i] >= target) {
    let lo = grid[i - 1], hi = grid[i], vlo = vals[i - 1], vhi = vals[i];
    for (let s = 0; s < steps; s++) { const mid = (lo + hi) / 2; const v = f(mid); if (v >= target) { hi = mid; vhi = v; } else { lo = mid; vlo = v; } }
    return { q: hi, achieved: vhi, capped: false };
  }
  let best = 0; for (let i = 1; i < vals.length; i++) if (vals[i] > vals[best]) best = i;
  return { q: grid[best], achieved: vals[best], capped: true };
}

// ═══ 14. A08 Zipf: the exponent estimator, monkey typing, planted Zipf ═══════════════════════════════
/** Rank-frequency exponent s = 1/(alpha - 1) from the approximate discrete power-law MLE (Clauset-Shalizi-Newman eq. 3.7), xmin by KS on a grid of <= gridMax values with >= tailMin tail types. */
export function zipfExponent(counts, { gridMax = TYPED.xminGridMax, tailMin = TYPED.xminTailMin } = {}) {
  const v = Float64Array.from(counts).filter((c) => c >= 1).sort(); const n = v.length; if (n < tailMin) return null;
  const firstIdx = []; for (let i = 0; i < n; i++) if (i === 0 || v[i] !== v[i - 1]) firstIdx.push(i);
  const cand = firstIdx.filter((i) => n - i >= tailMin); if (!cand.length) return null;
  const pick = cand.length <= gridMax ? cand : Array.from({ length: gridMax }, (_, k) => cand[Math.round((k * (cand.length - 1)) / (gridMax - 1))]);
  let best = null;
  for (const i0 of [...new Set(pick)]) {
    const xmin = v[i0], nt = n - i0; let sl = 0; for (let i = i0; i < n; i++) sl += Math.log(v[i] / (xmin - 0.5)); if (!(sl > 0)) continue;
    const alpha = 1 + nt / sl; if (!(alpha > 1)) continue;
    let D = 0; for (let i = i0; i < n;) { let j = i; while (j < n && v[j] === v[i]) j++; const Femp = (j - i0) / nt, Fmod = 1 - ((v[i] + 0.5) / (xmin - 0.5)) ** (1 - alpha); D = Math.max(D, Math.abs(Femp - Fmod), Math.abs((i - i0) / nt - Fmod)); i = j; }
    if (!best || D < best.D) best = { s: 1 / (alpha - 1), alpha, xmin, D, tail: nt };
  }
  return best;
}
/** Token counts per type from an array of strings. */
export function countTypes(tokens) { const m = new Map(); for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1); return Int32Array.from(m.values()); }
/**
 * prepareZipf(sys) -> { stem, counts:[Int32Array per seed], chars:{ symbols[], cum Float64Array }, pBoundary, words } | { stem, gap }.
 * Words are the lowercased gold tokens (non-PUNCT, non-SYM). Character distribution and boundary probability come from the seed-1 sample.
 */
export function prepareZipf(sys, { N = N_BUDGET, seeds = SEEDS, split = "dev" } = {}) {
  const tb = cachedTreebank(sys.train, { split }); const counts = []; let chars = null, pB = null;
  for (const seed of seeds) {
    const smp = sampleIndices(tb, { N, seed, system: sys.stem }); if (!smp) return { stem: sys.stem, gap: { reason: "treebank below budget", words: tb.words, need: N } };
    const toks = []; for (const i of smp.indices) { const s = tb.sentences[i]; for (let k = 0; k < s.form.length; k++) if (s.upos[k] !== "PUNCT" && s.upos[k] !== "SYM") toks.push(s.form[k].toLowerCase()); }
    counts.push(countTypes(toks));
    if (seed === seeds[0]) { const cm = new Map(); let tc = 0; for (const t of toks) for (const ch of t) { cm.set(ch, (cm.get(ch) ?? 0) + 1); tc++; } const symbols = [...cm.keys()].sort(); const cum = new Float64Array(symbols.length); let acc = 0; symbols.forEach((c, i) => { acc += cm.get(c) / tc; cum[i] = acc; }); cum[cum.length - 1] = 1; chars = { symbols, cum }; pB = toks.length / tc; }
  }
  return { stem: sys.stem, counts, chars, pBoundary: pB, words: N };
}
/** One monkey-typing corpus: nTokens tokens, characters iid from `chars`, a token ends after each character with probability pBoundary. Returns type counts. */
export function monkeyCounts(chars, pBoundary, nTokens, rng) {
  const { symbols, cum } = chars; const m = new Map(); const L = symbols.length;
  for (let t = 0; t < nTokens; t++) {
    let tok = ""; for (let len = 0; len < 40; len++) { const u = rng(); let lo = 0, hi = L - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] >= u) hi = mid; else lo = mid + 1; } tok += symbols[lo]; if (rng() < pBoundary) break; }
    m.set(tok, (m.get(tok) ?? 0) + 1);
  }
  return Int32Array.from(m.values());
}
/** nTokens draws from a Zipf distribution p_r ~ r^-s over `ranks` ranks; returns type counts. */
export function zipfCounts(sGen, nTokens, rng, ranks = 40000) {
  const cum = new Float64Array(ranks); let acc = 0; for (let r = 0; r < ranks; r++) { acc += (r + 1) ** -sGen; cum[r] = acc; } const tot = acc;
  const c = new Int32Array(ranks); for (let t = 0; t < nTokens; t++) { const u = rng() * tot; let lo = 0, hi = ranks - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] >= u) hi = mid; else lo = mid + 1; } c[lo]++; }
  return Int32Array.from(c).filter((x) => x > 0);
}
const sOf = (counts) => zipfExponent(counts)?.s ?? NaN;
/**
 * A08 measurement for one system. The monkey band (M corpora of N * scale tokens) is cached per scale. stat = |s - mu_monkey|; nullDraws = [2 sd_monkey] (the band half-width),
 * so excess = |s - mu| - 2 sd, the registered theta. mode "real" | "planted" (sGen: Zipf generator exponent) | "control" (one more monkey corpus run as real).
 */
export function a08Measure(data, { mode = "real", M = TYPED.monkeyM, scale = 1, sGen = null, cache = {}, rngKey = ["a08"], stem = data.stem } = {}) {
  if (data.gap) return { gap: data.gap };
  const key = `s${scale}`; const nTok = data.words * scale;
  if (!cache[key]) { const ss = Array.from({ length: M }, (_, d) => sOf(monkeyCounts(data.chars, data.pBoundary, nTok, rngFor("a08-monkey", stem, scale, d)))).filter(Number.isFinite); cache[key] = { ss, mu: mean(ss), sd: sd(ss) }; }
  const band = cache[key]; if (band.ss.length < Math.ceil(M / 2) || !Number.isFinite(band.sd)) return { gap: { reason: "monkey band undefined" } };
  let s;
  if (mode === "real") s = mean(data.counts.map(sOf).filter(Number.isFinite));
  else if (mode === "control") s = mean(data.counts.map((_, si) => sOf(monkeyCounts(data.chars, data.pBoundary, nTok, rngFor(...rngKey, "control", stem, scale, si)))).filter(Number.isFinite));
  else if (mode === "planted") s = mean(data.counts.map((_, si) => sOf(zipfCounts(sGen, nTok, rngFor(...rngKey, "planted", stem, scale, si)))).filter(Number.isFinite));
  if (!Number.isFinite(s)) return { gap: { reason: "no power-law tail with >= 50 types" } };
  return { stat: Math.abs(s - band.mu), signed: s - band.mu, s, monkeyMean: band.mu, monkeySd: band.sd, nullDraws: [2 * band.sd] };
}

// ═══ 15. A05 graded middle: the ambiguity graph from received POS priors, top-k edges, configuration null ═══
export const UPOS_WORD = Object.freeze(["ADJ", "ADP", "ADV", "AUX", "CCONJ", "DET", "INTJ", "NOUN", "NUM", "PART", "PRON", "PROPN", "SCONJ", "VERB"]);
const TAGID = new Map(UPOS_WORD.map((t, i) => [t, i]));
const PAIRKEY = (a, b) => (a < b ? a * 32 + b : b * 32 + a);
/**
 * preparePos(sys, { tagFloor }) -> { stem, flat:Int8Array, off:Int32Array, forms (count), tagCount } | { stem, gap }.
 * One form per entry (CSR layout); a form carries a tag iff its prior count for the tag is >= tagFloor (header: 2). PUNCT, SYM and X are not word classes and are left out.
 */
export function preparePos(sys, { tagFloor = TYPED.a05TagFloor } = {}) {
  if (!sys.pos) return { stem: sys.stem, gap: { reason: "no POS prior on disk" } };
  const prior = JSON.parse(fs.readFileSync(sys.pos, "utf8")); const flat = []; const off = [0]; const tagCount = new Float64Array(UPOS_WORD.length);
  for (const f of Object.values(prior.forms ?? {})) { const tags = []; for (const [t, c] of Object.entries(f)) if (c >= tagFloor && TAGID.has(t)) tags.push(TAGID.get(t)); if (!tags.length) continue; tags.sort((x, y) => x - y); for (const t of tags) { flat.push(t); tagCount[t]++; } off.push(flat.length); }
  const forms = off.length - 1; if (forms < 200) return { stem: sys.stem, gap: { reason: "fewer than 200 forms with a counted tag", forms } };
  return { stem: sys.stem, flat: Int8Array.from(flat), off: Int32Array.from(off), forms, tagCount, source: path.basename(sys.pos) };
}
/** Top-k tag pairs of the ambiguity graph (weight = forms carrying both tags; ties by pair key), as a Set of pair keys; null if fewer than k pairs exist. */
export function topPairs(flat, off, k = TYPED.a05K) {
  const w = new Int32Array(32 * 32); const F = off.length - 1;
  for (let f = 0; f < F; f++) { const a = off[f], b = off[f + 1]; if (b - a < 2) continue; for (let i = a; i < b; i++) for (let j = i + 1; j < b; j++) w[PAIRKEY(flat[i], flat[j])]++; }
  const list = []; for (let a = 0; a < UPOS_WORD.length; a++) for (let b = a + 1; b < UPOS_WORD.length; b++) { const x = w[PAIRKEY(a, b)]; if (x > 0) list.push([x, PAIRKEY(a, b)]); }
  if (list.length < k) return null; list.sort((p, q) => q[0] - p[0] || p[1] - q[1]); return new Set(list.slice(0, k).map((x) => x[1]));
}
/**
 * Configuration null: the tag column of the (form, tag) pairs shuffled across forms (per-form tag counts and global tag marginals kept). A form that would
 * receive the same tag twice is repaired by swapping with a random pair elsewhere, so every form keeps its number of DISTINCT tags (no collapse).
 */
export function redealPos(flat, off, rng) {
  const out = Int8Array.from(flat); const n = out.length; const F = off.length - 1;
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = out[i]; out[i] = out[j]; out[j] = t; }
  const formOf = new Int32Array(n); for (let f = 0; f < F; f++) for (let i = off[f]; i < off[f + 1]; i++) formOf[i] = f;
  const has = (f, t, skip) => { for (let i = off[f]; i < off[f + 1]; i++) if (i !== skip && out[i] === t) return true; return false; };
  for (let f = 0; f < F; f++) for (let i = off[f]; i < off[f + 1]; i++) {
    if (!has(f, out[i], i)) continue;
    for (let attempt = 0; attempt < 200; attempt++) { const q = Math.floor(rng() * n); const g = formOf[q]; if (g === f) continue; if (has(f, out[q], -1) || has(g, out[i], q)) continue; const t = out[i]; out[i] = out[q]; out[q] = t; break; }
  }
  return out;
}
const PLANT_PAIRS = Object.freeze([[1, 11], [6, 8], [9, 10]]); // (ADP,PROPN), (INTJ,NUM), (PART,PRON): pairs the tag marginals do not favour
/** Planted ambiguity: every form with >= 2 tags has, with probability q, its tags REPLACED by exactly a pair drawn from the planted shared set. */
export function plantPos(flat, off, q, rng) {
  const nf = []; const no = [0]; const F = off.length - 1;
  for (let f = 0; f < F; f++) { const len = off[f + 1] - off[f]; if (len >= 2 && rng() < q) { const [a, b] = PLANT_PAIRS[Math.floor(rng() * PLANT_PAIRS.length)]; nf.push(Math.min(a, b), Math.max(a, b)); } else for (let i = off[f]; i < off[f + 1]; i++) nf.push(flat[i]); no.push(nf.length); }
  return { flat: Int8Array.from(nf), off: Int32Array.from(no) };
}
/** theta_s = mean Jaccard of E_s with the E_t of systems of OTHER lineages. */
export function a05Theta(edges /* Map<id, Set> */, lineageOf) {
  const ids = [...edges.keys()].filter((id) => edges.get(id)); const out = new Map();
  for (const id of ids) { const js = []; for (const o of ids) if (o !== id && lineageOf(o) !== lineageOf(id)) js.push(jaccard(edges.get(id), edges.get(o))); out.set(id, js.length ? mean(js) : NaN); }
  return out;
}
/**
 * A05 over all systems jointly (the null draws are joint). prepared: Map<id, preparePos result>; views: Map<id, view>.
 * mode "real" | "planted" (q) | "control" (one configuration-null draw run as real). Returns Map<id, { stat, nullDraws }|{ gap }>.
 */
export function a05Measure(prepared, views, { mode = "real", q = 0, draws = TYPED.a05Draws, rngKey = ["a05"] } = {}) {
  const ids = [...prepared.keys()].filter((id) => !prepared.get(id).gap); const lin = (id) => views.get(id).lineage;
  const obs = new Map(ids.map((id) => { const p = prepared.get(id); if (mode === "planted") return [id, plantPos(p.flat, p.off, q, rngFor(...rngKey, "plant", id))]; if (mode === "control") return [id, { flat: redealPos(p.flat, p.off, rngFor(...rngKey, "control", id)), off: p.off }]; return [id, { flat: p.flat, off: p.off }]; }));
  const edgesOf = (m) => new Map(ids.map((id) => [id, topPairs(m.get(id).flat, m.get(id).off)]));
  const theta = a05Theta(edgesOf(obs), lin); const nulls = new Map(ids.map((id) => [id, []]));
  for (let d = 0; d < draws; d++) { const red = new Map(ids.map((id) => [id, { flat: redealPos(obs.get(id).flat, obs.get(id).off, rngFor(...rngKey, "null", id, d)), off: obs.get(id).off }])); const th = a05Theta(edgesOf(red), lin); for (const id of ids) nulls.get(id).push(th.get(id)); }
  const res = new Map();
  for (const [id, p] of prepared) { if (p.gap) { res.set(id, { gap: p.gap }); continue; } const o = theta.get(id); res.set(id, Number.isFinite(o) ? { stat: o, nullDraws: nulls.get(id).filter(Number.isFinite) } : { gap: { reason: "fewer than k ambiguity pairs" } }); }
  return res;
}

// ═══ 16. A01 closed/open: rank, context diversity, derived cutoff, F1 against the dev gold ═══════════
/** Geometric rank grid, ratio r (header: 1.25): unique rounded powers of the ratio up to `max`. */
export function rankGrid(max, ratio = TYPED.a01GridRatio) { const g = []; let x = 1; while (Math.round(x) <= max) { const r = Math.round(x); if (!g.length || r > g[g.length - 1]) g.push(r); x *= ratio; } return g; }
/**
 * prepareClosed(sys) -> { stem, V, cnt, cd, prefMass, prefCd, decile (token-mass decile of each rank), dev:{ n:Float64Array, closed:Float64Array, tokens }, ... } | { stem, gap }.
 * Forms are lowercased gold tokens (non-PUNCT, non-SYM); neighbours are the adjacent forms in the sentence, with ^ and $ at the edges; cd = (distinct left + distinct right) / (2 x occurrences).
 */
export function prepareClosed(sys, { N = N_BUDGET, seed = 1, split = "dev" } = {}) {
  if (!sys.dev) return { stem: sys.stem, gap: { reason: "no dev gold file (split " + split + ")" } };
  const tb = cachedTreebank(sys.train, { split }); const smp = sampleIndices(tb, { N, seed, system: sys.stem }); if (!smp) return { stem: sys.stem, gap: { reason: "treebank below budget", words: tb.words, need: N } };
  const info = new Map();
  for (const i of smp.indices) {
    const s = tb.sentences[i]; const w = []; for (let k = 0; k < s.form.length; k++) if (s.upos[k] !== "PUNCT" && s.upos[k] !== "SYM") w.push(s.form[k].toLowerCase());
    for (let k = 0; k < w.length; k++) { let e = info.get(w[k]); if (!e) { e = { n: 0, L: new Set(), R: new Set() }; info.set(w[k], e); } e.n++; e.L.add(k ? w[k - 1] : "^"); e.R.add(k + 1 < w.length ? w[k + 1] : "$"); }
  }
  const forms = [...info.keys()].sort((a, b) => info.get(b).n - info.get(a).n || (a < b ? -1 : 1)); const V = forms.length;
  const cnt = new Float64Array(V), cd = new Float64Array(V); forms.forEach((f, i) => { const e = info.get(f); cnt[i] = e.n; cd[i] = (e.L.size + e.R.size) / (2 * e.n); });
  const prefMass = new Float64Array(V + 1), prefCd = new Float64Array(V + 1); for (let i = 0; i < V; i++) { prefMass[i + 1] = prefMass[i] + cnt[i]; prefCd[i + 1] = prefCd[i] + cd[i]; }
  const total = prefMass[V]; const decile = new Uint8Array(V); for (let i = 0; i < V; i++) decile[i] = Math.min(TYPED.a01Deciles - 1, Math.floor((prefMass[i] / total) * TYPED.a01Deciles));
  const rank = new Map(forms.map((f, i) => [f, i])); const dv = cachedTreebank(sys.dev, { split }); const devN = new Float64Array(V), devClosed = new Float64Array(V); let tokens = 0, closedTokens = 0; const tokRank = [], tokClosed = [];
  for (const s of dv.sentences) for (let k = 0; k < s.form.length; k++) { if (s.upos[k] === "PUNCT" || s.upos[k] === "SYM") continue; const r = rank.get(s.form[k].toLowerCase()); if (r === undefined) continue; const c = CLOSED_UPOS.has(s.upos[k]) ? 1 : 0; devN[r]++; devClosed[r] += c; tokens++; closedTokens += c; tokRank.push(r); tokClosed.push(c); }
  if (tokens < 200 || closedTokens < 20) return { stem: sys.stem, gap: { reason: "dev gold too small for an F1", tokens, closedTokens } };
  return { stem: sys.stem, V, cnt, cd, prefMass, prefCd, decile, forms, dev: { n: devN, closed: devClosed, tokens, closedTokens, tokRank: Int32Array.from(tokRank), tokClosed: Uint8Array.from(tokClosed) } };
}
/** F1 (closed class, token level over dev tokens whose form is in the sample) of "closed iff train rank < r"; prefix sums over ranks. */
export function closedF1Curve(devClosed, devN) {
  const V = devN.length; const pc = new Float64Array(V + 1), pn = new Float64Array(V + 1); for (let i = 0; i < V; i++) { pc[i + 1] = pc[i] + devClosed[i]; pn[i + 1] = pn[i] + devN[i]; }
  const T = pc[V]; return (r) => { const rr = Math.min(Math.max(0, r), V); const tp = pc[rr], pp = pn[rr]; return pp + T > 0 ? (2 * tp) / (pp + T) : 0; };
}
/** The derived cutoff: argmax over the rank grid of z(r) = (mu_null(r) - M(r)) / sd_null(r), licensed iff max z beats the (1-alpha) quantile of the null's max z (header A01 READING). */
export function derivedCutoff(p, { draws = TYPED.a01MassDraws, rngKey = ["a01-cut"], alpha = ALPHA } = {}) {
  const V = p.V; const grid = rankGrid(V); const M = grid.map((r) => p.prefCd[r] / r); const target = grid.map((r) => p.prefMass[r]); const order = Array.from({ length: V }, (_, i) => i);
  const nullM = grid.map(() => new Float64Array(draws)); const rng = rngFor(...rngKey, p.stem);
  for (let d = 0; d < draws; d++) {
    shuffleInPlace(order, rng); const cm = new Float64Array(V + 1), cc = new Float64Array(V + 1); for (let i = 0; i < V; i++) { cm[i + 1] = cm[i] + p.cnt[order[i]]; cc[i + 1] = cc[i] + p.cd[order[i]]; }
    grid.forEach((_, j) => { let lo = 1, hi = V; while (lo < hi) { const mid = (lo + hi) >> 1; if (cm[mid] >= target[j]) hi = mid; else lo = mid + 1; } nullM[j][d] = cc[lo] / lo; });
  }
  const mu = nullM.map((a) => mean(a)), sg = nullM.map((a, j) => Math.max(1e-9, sd(a)));
  const z = grid.map((_, j) => (mu[j] - M[j]) / sg[j]); let jb = 0; z.forEach((v, j) => { if (v > z[jb]) jb = j; });
  const zmaxNull = Array.from({ length: draws }, (_, d) => { let m = -Infinity; grid.forEach((_, j) => { m = Math.max(m, (mu[j] - nullM[j][d]) / sg[j]); }); return m; });
  const thr = quantile(zmaxNull, 1 - alpha);
  return { r: grid[jb], zmax: z[jb], threshold: thr, licensed: z[jb] > thr, grid, z };
}
/**
 * A01 over all systems (needs the leave-one-lineage-out global cutoff B1). prepared: Map<id, prepareClosed>; views: Map<id, view>.
 * mode "real" | "planted" (prepared already holds the planted arrays) | "control" (labels permuted within token-mass deciles, run as real).
 * Returns { perSystem: Map<id, { stat, nullDraws, ... }|{ gap }>, b1:Map<lineage, r>, matched:{ k, n, p } }.
 */
export function a01Measure(prepared, views, { mode = "real", draws = TYPED.a01PermDraws, massDraws = TYPED.a01MassDraws, rngKey = ["a01"], cutCache = new Map() } = {}) {
  const ids = [...prepared.keys()].filter((id) => !prepared.get(id).gap); const maxV = Math.max(...ids.map((id) => prepared.get(id).V)); const grid = rankGrid(maxV);
  const lin = (id) => views.get(id).lineage; const per = new Map();
  for (const id of ids) {
    const p = prepared.get(id); let ck = cutCache.get(id); if (!ck) { ck = derivedCutoff(p, { draws: massDraws, rngKey: [...rngKey, "cut"] }); cutCache.set(id, ck); }
    const f1 = closedF1Curve(p.dev.closed, p.dev.n); per.set(id, { p, ck, f1, curveGrid: grid.map((r) => f1(r)) });
  }
  // B1: the single global rank cutoff fitted on the OTHER lineages (nested mean of F1 over systems, then lineages), argmax over the common grid
  const lineages = [...new Set(ids.map(lin))]; const b1 = new Map();
  for (const l of lineages) { const others = lineages.filter((x) => x !== l); if (!others.length) { b1.set(l, null); continue; }
    const score = grid.map((_, j) => mean(others.map((o) => mean(ids.filter((id) => lin(id) === o).map((id) => per.get(id).curveGrid[j]))))); let jb = 0; score.forEach((v, j) => { if (v > score[jb]) jb = j; }); b1.set(l, grid[jb]); }
  const out = new Map();
  for (const id of ids) {
    const { p, ck, f1 } = per.get(id); const rB1 = b1.get(lin(id)); if (rB1 == null) { out.set(id, { gap: { reason: "no training lineages for B1" } }); continue; }
    const obsF1 = (curve) => (ck.licensed ? curve(ck.r) : 0) - curve(rB1);
    let obsCurve = f1;
    if (mode === "control") obsCurve = closedF1Curve(...permutedGold(p, rngFor(...rngKey, "control", id)));
    const nullStats = []; for (let d = 0; d < draws; d++) nullStats.push(obsF1(closedF1Curve(...permutedGold(p, rngFor(...rngKey, "null", id, d)))));
    const oracle = Math.max(...grid.filter((r) => r <= p.V).map((r) => f1(r)));
    out.set(id, { stat: obsF1(obsCurve), nullDraws: nullStats, f1Derived: ck.licensed ? obsCurve(ck.r) : 0, f1B1: obsCurve(rB1), f1Oracle: oracle, cutoff: ck.r, licensed: ck.licensed, zmax: ck.zmax, b1: rB1 });
  }
  for (const [id, p] of prepared) if (p.gap) out.set(id, { gap: p.gap });
  // matched-frequency control: per token-mass decile, closed types have lower cd than open types (types by their dominant dev class)
  let k = 0, n = 0, ties = 0;
  for (const id of ids) { const p = prepared.get(id); for (let d = 0; d < TYPED.a01Deciles; d++) { const c = [], o = []; for (let r = 0; r < p.V; r++) if (p.decile[r] === d && p.dev.n[r] > 0) (p.dev.closed[r] * 2 > p.dev.n[r] ? c : o).push(p.cd[r]); if (c.length >= 3 && o.length >= 3) { const mc = mean(c), mo = mean(o); if (mc === mo) ties++; else { n++; if (mc < mo) k++; } } } }
  return { perSystem: out, b1, matched: { k, n, ties, p: n ? signTestP(k, n) : 1 } };
}
/** Dev-token gold with closedness permuted WITHIN token-mass deciles of the form's train rank: returns [devClosed, devN] arrays for closedF1Curve. */
export function permutedGold(p, rng) {
  const { tokRank, tokClosed } = p.dev; const lab = Uint8Array.from(tokClosed); const byDec = new Map();
  for (let t = 0; t < tokRank.length; t++) { const d = p.decile[tokRank[t]]; if (!byDec.has(d)) byDec.set(d, []); byDec.get(d).push(t); }
  for (const idx of byDec.values()) { const v = idx.map((t) => tokClosed[t]); shuffleInPlace(v, rng); idx.forEach((t, i) => { lab[t] = v[i]; }); }
  const devClosed = new Float64Array(p.V); for (let t = 0; t < tokRank.length; t++) devClosed[tokRank[t]] += lab[t];
  return [devClosed, p.dev.n];
}

/** A01 planted world on a real system's arrays: a closed class of size C (15 percent of it displaced to ranks [C, 2C)) whose context diversity is lowered by the factor (1 - g); dev gold from the train counts. */
export function plantClosed(p, { g, C, rng, scale = 1 }) {
  const V = p.V; const closed = new Uint8Array(V); const base = Array.from({ length: Math.min(C, V) }, (_, i) => i); const disp = Math.round(0.15 * base.length);
  const keep = shuffleInPlace(base.slice(), rng).slice(disp); for (const r of keep) closed[r] = 1;
  const hiCap = Math.min(V, 2 * C); for (let k = 0, guard = 0; k < disp && guard < 50 * disp + 10; guard++) { const r = C + Math.floor(rng() * Math.max(1, hiCap - C)); if (r < V && !closed[r]) { closed[r] = 1; k++; } }
  const cd = Float64Array.from(p.cd, (v, r) => v * (1 - g * closed[r])); const prefCd = new Float64Array(V + 1); for (let i = 0; i < V; i++) prefCd[i + 1] = prefCd[i] + cd[i];
  const n = new Float64Array(V), cl = new Float64Array(V), tokRank = [], tokClosed = []; let tokens = 0, closedTokens = 0;
  for (let r = 0; r < V; r++) { n[r] = Math.max(0, Math.round(p.cnt[r] * 0.5 * scale * (0.8 + 0.4 * rng()))); if (closed[r]) { cl[r] = n[r]; closedTokens += n[r]; } tokens += n[r]; for (let t = 0; t < n[r]; t++) { tokRank.push(r); tokClosed.push(closed[r]); } }
  return { ...p, cd, prefCd, dev: { n, closed: cl, tokens, closedTokens, tokRank: Int32Array.from(tokRank), tokClosed: Uint8Array.from(tokClosed) } };
}
/** Closed-class size of a planted system: 80 x 2^(1.5 (2u - 1)) clamped to [20, V/4], u a seeded uniform per system (heterogeneity a global cutoff cannot absorb). */
export const plantedClosedSize = (V, id) => { const u = rngFor("a01-size", id)(); return Math.round(Math.min(V / 4, Math.max(20, 80 * 2 ** (1.5 * (2 * u - 1))))); };

// ═══ 17. system-level statistics: A07 (partial association) and A12 (cross-group consensus) ═══════════
/**
 * A07 from profile cells g01 (order entropy) and g02 (case share): partial Spearman after residualising both ranks on branch and script dummies; null = g02 permuted within
 * branch strata. theta = -(rho - median null) (negative association is the claim). Reachability is part of the result (header ADAPTATION B).
 */
export function a07Measure(profiles, { draws = TYPED.a07Draws, B = 500, seed = SEED } = {}) {
  const rows = []; for (const p of profiles) { const v = systemView(p); const a = p.cells?.g01?.value, b = p.cells?.g02?.value; if (Number.isFinite(a) && Number.isFinite(b)) rows.push({ id: p.id, branch: v.branch, lineage: v.lineage, script: v.script ?? "none", a, b }); }
  const n = rows.length; if (n < 12) return { gap: { reason: "fewer than 12 systems with g01 and g02", n } };
  const rhoOf = (rs) => { const Z = hconcat(dummies(rs.map((r) => r.branch)), dummies(rs.map((r) => r.script))); if (Z[0].length >= rs.length - 4) return NaN; return partialSpearman(rs.map((r) => r.a), rs.map((r) => r.b), Z); };
  const rho = rhoOf(rows); if (!Number.isFinite(rho)) return { gap: { reason: "too few residual degrees of freedom after branch and script dummies", n } };
  const strata = new Map(); rows.forEach((r, i) => { if (!strata.has(r.branch)) strata.set(r.branch, []); strata.get(r.branch).push(i); });
  const rng = rngFor("a07-null", seed); const nulls = [];
  for (let d = 0; d < draws; d++) { const perm = rows.map((r) => ({ ...r })); for (const idx of strata.values()) { const v = shuffleInPlace(idx.map((i) => rows[i].b), rng); idx.forEach((i, t) => { perm[i].b = v[t]; }); } nulls.push(rhoOf(perm)); }
  const fin = nulls.filter(Number.isFinite); const med = median(fin); const ge = fin.filter((x) => x <= rho).length;
  const byLin = new Map(); rows.forEach((r) => { if (!byLin.has(r.lineage)) byLin.set(r.lineage, []); byLin.get(r.lineage).push(r); });
  const lins = [...byLin.keys()]; const brng = rngFor("a07-boot", seed); const boots = [];
  for (let b = 0; b < B; b++) { const pick = []; for (let k = 0; k < lins.length; k++) pick.push(...byLin.get(lins[Math.floor(brng() * lins.length)])); const r = rhoOf(pick); if (Number.isFinite(r)) boots.push(-(r - med)); }
  const nDefined = lins.filter((l) => byLin.get(l).length >= 4).length;
  const lolo = lins.map((l) => ({ drop: l, rho: rhoOf(rows.filter((r) => r.lineage !== l)) }));
  return { n, rho, nullMedian: med, nullQ95: quantile(fin, 0.05), p: (ge + 1) / (fin.length + 1), theta: -(rho - med), ci: [quantile(boots, 0.025), quantile(boots, 0.975)], boots: boots.length, lineages: lins.length, lineagesDefined: nDefined, reach: reachability(nDefined), lolo, draws: fin.length };
}
/** A07 status per ADAPTATION B: the registered gate is UNDERPOWERED BY REACHABILITY when fewer than 5 lineages can define the association. */
export function systemLevelStatus({ reach, theta, ci, sesoi, control = null, power = null }) {
  if (control?.survived) return { status: "INSTRUMENT_FAILED", reasons: ["control survived"] };
  if (reach.unreachable) return { status: "UNDERPOWERED", reasons: [`n_l = ${reach.n} < 5 lineages can define the statistic: UNDERPOWERED BY REACHABILITY (ADAPTATION B)`] };
  if (power && !power.pass) return { status: "UNDERPOWERED", reasons: ["power card failed"] };
  if (ci[1] < sesoi) return { status: "ABSENT", reasons: [`interval upper ${ci[1].toFixed(3)} < SESOI`] };
  if (!(ci[0] > sesoi)) return { status: "UNDERPOWERED", reasons: ["interval straddles the SESOI"] };
  return { status: "UNDERPOWERED", reasons: ["no lineage-level gate is registered for a system-level statistic"] };
}
/** Planted partial association: g01 and g02 with branch random effects and a known within-branch correlation rhoTrue (BARKER A07 power world), on the real layout. */
export function plantedA07Rows(views, rhoTrue, rng) {
  const bx = new Map(), by = new Map(); const profiles = [];
  for (const v of views) { if (!bx.has(v.branch)) { bx.set(v.branch, randn(rng)); by.set(v.branch, randn(rng)); } const x = bx.get(v.branch) + randn(rng); const y = by.get(v.branch) + rhoTrue * (x - bx.get(v.branch)) + Math.sqrt(1 - rhoTrue ** 2) * randn(rng); profiles.push({ id: v.id, labels: { stem: v.stem, lineage: v.lineage, branch: v.branch, script: v.script ?? "Latin" }, cells: { g01: { value: x }, g02: { value: y } } }); }
  return profiles;
}
/** A12 card from a Level-S result: theta with a lineage-cluster interval, the outcome of the registered reading, within-group stability, and the reachability note. */
export function a12Card(levelS, profiles, { B = 500, seed = SEED } = {}) {
  const c = levelS.consensus; if (!c || c.gap || !c.internal?.length) return { gap: c?.gap ?? "no consensus", status: "UNDERPOWERED" };
  const view = new Map(profiles.map((p) => [p.id, systemView(p)])); const lins = [...new Set(c.internal.flatMap((p) => p.shared.map((id) => view.get(id)?.lineage)))]; const rng = rngFor("a12-boot", seed); const boots = [];
  const idsByLin = new Map(lins.map((l) => [l, new Set(profiles.filter((p) => view.get(p.id)?.lineage === l).map((p) => p.id))]));
  for (let b = 0; b < B; b++) {
    const pick = []; for (let k = 0; k < lins.length; k++) pick.push(lins[Math.floor(rng() * lins.length)]); const w = new Map(); for (const l of pick) for (const id of idsByLin.get(l)) w.set(id, (w.get(id) ?? 0) + 1);
    const ex = c.internal.map((pr, k) => { const idx = []; pr.shared.forEach((id, i) => { for (let r = 0; r < (w.get(id) ?? 0); r++) idx.push(i); }); if (idx.length < 6) return NaN; return ari(idx.map((i) => pr.la[i]), idx.map((i) => pr.lb[i])) - c.pairs[k].nullMedian; });
    const f = ex.filter(Number.isFinite); if (f.length) boots.push(mean(f));
  }
  const ci = [quantile(boots, 0.025), quantile(boots, 0.975)]; const stable = Object.values(levelS.groups).filter((g) => g.stability?.spectral?.verdict === "STABLE").length; const withStab = Object.values(levelS.groups).filter((g) => g.stability?.spectral && g.group !== "ALL").length;
  const s = ARCH_REGISTRY.A12.sesoi.value; const outcome = ci[0] > s ? "UNITY" : ci[1] < s && withStab && stable / withStab >= 0.5 ? "PLURALISM" : "UNDECIDED";
  const reach = reachability(0); const st = systemLevelStatus({ reach: { ...reach, n: 0 }, theta: c.theta, ci, sesoi: s });
  return { theta: c.theta, ci, p: c.p, nullThetaQ95: c.nullThetaQ95, groups: c.groups, pairs: c.pairs, outcome, groupsStable: stable, groupsWithStability: withStab, boots: boots.length, ...st };
}
/** Planted consensus worlds on toy stems: "unity" (one latent partition carried by three groups) and "pluralism" (a different latent partition per group). Returns profiles. */
export function plantedConsensusProfiles({ mode = "unity", stems = TOY_STEMS, strength = 0.9, signatureCount = 14, seed = 1 } = {}) {
  const rng = rngFor("consensus", mode, seed); const n = stems.length; const delta = deltaOfStrength(strength); const gen = stems.map((s) => genealogyOf(s)); const groups = ["A", "B", "C"];
  const memberSet = () => { const m = new Set(); const k = Math.round(n * 0.35); while (m.size < k) m.add(Math.floor(rng() * n)); return m; }; const shared = memberSet(); const perGroup = Object.fromEntries(groups.map((g) => [g, mode === "unity" ? shared : memberSet()]));
  const profiles = stems.map((stem, i) => ({ schema: "SystemProfile@1", id: `nl:${stem}@toy`, kind: "nl", inputs: [], labels: { stem, family: gen[i].branch, lineage: gen[i].lineage, branch: gen[i].branch, script: "Latn", typedBy: "toy", giver: "synthetic" }, cells: {}, gaps: [] }));
  for (const g of groups) for (let f = 0; f < signatureCount + 8; f++) { const id = `${g.toLowerCase()}${String(f + 1).padStart(2, "0")}`; profiles.forEach((p, i) => { let v = randn(rng); if (f < signatureCount && perGroup[g].has(i)) v += delta; p.cells[id] = { id, group: g, channel: "toy", value: v, n: 1000, ci95: null, resamples: Array.from({ length: 10 }, () => v + 0.25 * randn(rng)), definitionId: id, builder: "toy", giver: "synthetic" }; }); }
  return { profiles, truth: { shared: mode === "unity" ? [...shared].map((i) => profiles[i].id) : null } };
}

// ═══ 18. card runtimes: calibrated planted worlds, power trio, control, real ═══════════════════════
/** Per-system summaries kept in the output (nullDraws are reduced to quantiles). */
const slim = (r) => (r?.gap ? { gap: r.gap } : { stat: r?.stat, excess: r?.stat - median(r?.nullDraws ?? [0]), excess95: r?.stat - quantile(r?.nullDraws ?? [0], 0.95), nullMedian: median(r?.nullDraws ?? [0]), nullQ95: quantile(r?.nullDraws ?? [0], 0.95), ...(r?.signed !== undefined ? { signed: r.signed } : {}), ...(r?.Rb !== undefined ? { Rb: r.Rb, r2: r.r2 } : {}), ...(r?.s !== undefined ? { s: r.s, monkeyMean: r.monkeyMean, monkeySd: r.monkeySd } : {}), ...(r?.f1Derived !== undefined ? { f1Derived: r.f1Derived, f1B1: r.f1B1, f1Oracle: r.f1Oracle, cutoff: r.cutoff, licensed: r.licensed, b1: r.b1 } : {}) });
const effectGrid = (sesoi) => ({ two: 2 * sesoi, half: 0.5 * sesoi, tiny: 0.1 * sesoi });
/** PHASE 1 of a statistic (R2): the power trio on calibrated planted worlds. spec = { key, sesoi, calibrate(target, world) -> state, planted(state, replicate, scale) -> Map<id, measure> }. */
export function rowPower(spec, views, { reps = TYPED.reps, log = () => {} } = {}) {
  const t0 = Date.now(); const evals = { two: [], half: [], tiny: [] }; const calib = {}; const tg = effectGrid(spec.sesoi);
  for (const w of ["two", "half", "tiny"]) {
    const state = spec.calibrate(tg[w], w); calib[w] = state.summary ?? null; const R = w === "tiny" ? Math.max(3, Math.ceil(reps / 2)) : reps;
    for (let r = 0; r < R; r++) { const per = spec.planted(state, r, w === "tiny" ? 10 : 1); evals[w].push(evaluateRow({ perSystem: per, views, sesoi: spec.sesoi, B: 400, lolo: false, tag: `${spec.key}-${w}-${r}` })); }
    log(`  ${spec.key} power ${w}: ${evals[w].length} replicates`);
  }
  return { ...powerRates(evals, spec.sesoi), targets: tg, calibration: calib, seconds: (Date.now() - t0) / 1000 };
}
/** PHASE 2: the control built to fail, run as the real corpus through the whole row pipeline. */
export function rowControl(spec, views) {
  const per = spec.control(); const ev = evaluateRow({ perSystem: per, views, sesoi: spec.sesoi, B: 400, lolo: false, tag: `${spec.key}-control` });
  return { survived: ev.theta.lo > spec.sesoi, theta: ev.theta, nLineages: ev.nLineages };
}
/** PHASE 3: the real statistic, only if the trio passed (or `peek`, labelled). */
export function rowReal(spec, views, power, control, { channels = 1, peek = false, extraConditions = null } = {}) {
  const row = { key: spec.key, sesoi: spec.sesoi, power, control };
  if (!power.pass && !peek) { row.status = "UNDERPOWERED"; row.reasons = [`power trio failed (P_up ${fmt(power.up)}, P_down ${fmt(power.down)}, tiny ${fmt(power.tiny)}); the real statistic is NOT computed (no peek)`]; row.real = null; return row; }
  const per = spec.real(); const ev = evaluateRow({ perSystem: per, views, sesoi: spec.sesoi, B: TYPED.bootB, tag: `${spec.key}-real` });
  const st = rowStatus({ ev, sesoi: spec.sesoi, power: power.pass ? power : { ...power, pass: true }, control, channels });
  if (extraConditions) { const x = extraConditions(per, ev, st); if (x) Object.assign(st, x); }
  row.status = st.status; row.reasons = st.reasons; row.statusIfChannelWaived = st.statusIfChannelWaived ?? null; if (!power.pass && peek) row.peeked = true;
  row.real = { ev, perSystem: Object.fromEntries([...per].map(([id, r]) => [id, slim(r)])) };
  return row;
}
const fmt = (x) => (Number.isFinite(x) ? x.toFixed(2) : "n/a");

/** A03 runtime over prepared trees. */
export function a03Runtime({ trees, views, caches }) {
  const ids = [...trees.keys()].filter((id) => !trees.get(id).gap);
  const nullCache = (id, repeat) => { const c = caches.get(id); const k = `r${repeat}`; if (!c[k]) a03Measure(trees.get(id), { mode: "control", cache: c, repeat, rngKey: ["a03", "warm"], draws: repeat > 1 ? 16 : TYPED.treeDrawsPerSeed }); return c; };
  return {
    key: "A03", sesoi: ARCH_REGISTRY.A03.sesoi.value,
    calibrate: (target) => { const q = new Map(), got = new Map(); let capped = 0;
      for (const id of ids) { const data = trees.get(id); const c = nullCache(id, 1); const m = c.r1.m; if (!Number.isFinite(m)) continue;
        const f = (qq) => Math.abs(mean([0, 1, 2].map((rep) => a03Arranged(data, ["a03cal", id, rep], { q: qq }).Rb).filter(Number.isFinite)) - m);
        const cal = calibrateDial(f, target); q.set(id, cal.q); got.set(id, cal.achieved); if (cal.capped) capped++; }
      return { q, summary: { target, systems: q.size, capped, achievedMean: mean([...got.values()]) } }; },
    planted: (state, rep, scale) => new Map([...trees.keys()].map((id) => { const data = trees.get(id); if (data.gap) return [id, { gap: data.gap }]; if (!state.q.has(id)) return [id, { gap: { reason: "no calibration" } }]; nullCache(id, scale); return [id, a03Measure(data, { mode: "planted", q: state.q.get(id), repeat: scale, cache: caches.get(id), rngKey: ["a03", "rep", rep], draws: 20 })]; })),
    control: () => new Map([...trees].map(([id, data]) => { if (data.gap) return [id, { gap: data.gap }]; nullCache(id, 1); return [id, a03Measure(data, { mode: "control", cache: caches.get(id), rngKey: ["a03", "ctl"] })]; })),
    real: () => new Map([...trees].map(([id, data]) => { if (data.gap) return [id, { gap: data.gap }]; nullCache(id, 1); return [id, a03Measure(data, { mode: "real", cache: caches.get(id) })]; })),
  };
}
/** A02 runtime: two rows (S with top-3 nesting, G with nesting on frequency ranks 3 and 7). */
export function a02Runtime({ trees, views }) {
  const ids = [...trees.keys()].filter((id) => !trees.get(id).gap);
  const NEST = { S: [0, 1, 2], G: [2, 6] };
  const excessOf = (data, q, rk, tag) => { const d1 = { ...data, seeds: [data.seeds[0], data.seeds[0], data.seeds[0]] }; const r = a02Measure(d1, { mode: "planted", q, draws: 6, nestingRanks: NEST[rk], rngKey: ["a02cal", tag] }); const x = r[rk]; return x.gap ? -1 : x.stat - median(x.nullDraws); };
  const memo = { real: new Map(), control: new Map() };
  const cached = (kind, id, fn) => { if (!memo[kind].has(id)) memo[kind].set(id, fn()); return memo[kind].get(id); };
  const mk = (rk) => ({
    key: `A02-${rk}`, sesoi: ARCH_REGISTRY.A02.sesoi[rk], rowKey: rk,
    calibrate: (target) => { const q = new Map(); let capped = 0; const got = []; for (const id of ids) { const cal = calibrateDial((qq) => excessOf(trees.get(id), qq, rk, id), target); q.set(id, cal.q); got.push(cal.achieved); if (cal.capped) capped++; } return { q, summary: { target, systems: q.size, capped, achievedMean: mean(got) } }; },
    planted: (state, rep, scale) => new Map([...trees].map(([id, data]) => { if (data.gap) return [id, { gap: data.gap }]; const r = a02Measure(data, { mode: "planted", q: state.q.get(id) ?? 0, repeat: scale, draws: scale > 1 ? 8 : 16, nestingRanks: NEST[rk], rngKey: ["a02", "rep", rk, rep] }); return [id, r[rk]]; })),
    control: () => new Map([...trees].map(([id, data]) => { if (data.gap) return [id, { gap: data.gap }]; return [id, cached("control", id, () => a02Measure(data, { mode: "control", draws: 20, rngKey: ["a02", "ctl"] }))[rk]]; })),
    real: () => new Map([...trees].map(([id, data]) => { if (data.gap) return [id, { gap: data.gap }]; return [id, cached("real", id, () => a02Measure(data, { mode: "real" }))[rk]]; })),
  });
  return { S: mk("S"), G: mk("G") };
}
/** The flat-tree control of A02: every non-root token a child of the root gives S = 0 exactly. Returns the S of a flat copy of one prepared system. */
export function a02FlatControl(data) {
  const sd0 = data.seeds[0]; const flat = { nSent: sd0.nSent, offsets: sd0.offsets, label: sd0.label, root: sd0.root, ancOff: new Int32Array(sd0.ancOff.length), ancList: new Int16Array(0) };
  const L = data.labelNames.length; const has = new Float64Array(L), tot = new Float64Array(L); a02Accumulate(flat, flat.label, has, tot); return a02Finish(has, tot).S;
}
/** A08 runtime: the planted dial is the generator exponent sGen = mu_monkey + 2 q. */
export function a08Runtime({ zipf, views, caches }) {
  const ids = [...zipf.keys()].filter((id) => !zipf.get(id).gap);
  return {
    key: "A08", sesoi: ARCH_REGISTRY.A08.sesoi.value,
    calibrate: (target) => { const sg = new Map(); let capped = 0; const got = [];
      for (const id of ids) { const data = zipf.get(id); const c = caches.get(id); const b0 = a08Measure(data, { mode: "control", cache: c, M: TYPED.monkeyM, rngKey: ["a08", "warm"] }); if (b0.gap) continue; const mu = c.s1.mu;
        const f = (qq) => { const r = a08Measure(data, { mode: "planted", sGen: mu + 2 * qq, cache: c, rngKey: ["a08cal", id, Math.round(qq * 1e6)] }); return r.gap ? -1 : r.stat - r.nullDraws[0]; };
        const cal = calibrateDial(f, target, { grid: [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.6, 0.8, 1] }); sg.set(id, mu + 2 * cal.q); got.push(cal.achieved); if (cal.capped) capped++; }
      return { sg, summary: { target, systems: sg.size, capped, achievedMean: mean(got) } }; },
    planted: (state, rep, scale) => new Map([...zipf].map(([id, data]) => { if (data.gap) return [id, { gap: data.gap }]; if (!state.sg.has(id)) return [id, { gap: { reason: "no calibration" } }]; return [id, a08Measure(data, { mode: "planted", sGen: state.sg.get(id), scale, cache: caches.get(id), rngKey: ["a08", "rep", rep] })]; })),
    control: () => new Map([...zipf].map(([id, data]) => [id, data.gap ? { gap: data.gap } : a08Measure(data, { mode: "control", cache: caches.get(id), rngKey: ["a08", "ctl"] })])),
    real: () => new Map([...zipf].map(([id, data]) => [id, data.gap ? { gap: data.gap } : a08Measure(data, { mode: "real", cache: caches.get(id) })])),
  };
}
/** A05 runtime (joint nulls; one global dial q). */
export function a05Runtime({ pos, views }) {
  return {
    key: "A05", sesoi: ARCH_REGISTRY.A05.sesoi.value,
    calibrate: (target) => { const f = (q) => { const r = a05Measure(pos, views, { mode: "planted", q, draws: 8, rngKey: ["a05cal"] }); return mean([...r.values()].filter((x) => !x.gap).map((x) => x.stat - median(x.nullDraws))); }; const cal = calibrateDial(f, target); return { q: cal.q, summary: { target, q: cal.q, achieved: cal.achieved, capped: cal.capped } }; },
    planted: (state, rep, scale) => a05Measure(pos, views, { mode: "planted", q: state.q, draws: 20, rngKey: ["a05", "rep", rep, scale] }),
    control: () => a05Measure(pos, views, { mode: "control", draws: 40, rngKey: ["a05", "ctl"] }),
    real: () => a05Measure(pos, views, { mode: "real", draws: TYPED.a05Draws }),
  };
}
/** A01 runtime (one global gap dial g; per-system closed-class sizes). `matched()` is the matched-frequency control of the last real run. */
export function a01Runtime({ closed, views }) {
  const withG = (g, scale, rep) => new Map([...closed].map(([id, p]) => [id, p.gap ? p : plantClosed(p, { g, C: plantedClosedSize(p.V, id), rng: rngFor("a01-plant", id, rep, Math.round(g * 1e6)), scale })]));
  const nested = (res) => { const ex = new Map([...res.perSystem].filter(([, r]) => !r.gap).map(([id, r]) => [id, r.stat - median(r.nullDraws)])); return nestedMean(ex, (id) => views.get(id).branch, (id) => views.get(id).lineage).pooled; };
  let lastMatched = null;
  return {
    key: "A01", sesoi: ARCH_REGISTRY.A01.sesoi.value, matched: () => lastMatched,
    calibrate: (target) => { const cal = calibrateDial((g) => nested(a01Measure(withG(g, 1, "cal"), views, { mode: "planted", draws: 12, massDraws: 39, rngKey: ["a01cal"] })), target, { grid: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9] }); return { g: cal.q, summary: { target, g: cal.q, achieved: cal.achieved, capped: cal.capped } }; },
    planted: (state, rep, scale) => a01Measure(withG(state.g, scale, rep), views, { mode: "planted", draws: 20, massDraws: 99, rngKey: ["a01", "rep", rep] }).perSystem,
    control: () => a01Measure(closed, views, { mode: "control", draws: 40, massDraws: TYPED.a01MassDraws, rngKey: ["a01", "ctl"] }).perSystem,
    real: () => { const r = a01Measure(closed, views, { mode: "real", draws: TYPED.a01PermDraws, massDraws: TYPED.a01MassDraws }); lastMatched = r.matched; return r.perSystem; },
  };
}

// ═══ 19. card workers: each statistic family prepares its data once and answers power / control / real in that order ═══
const viewsOf = (systems) => new Map(systems.map((s) => [s.id, { id: s.id, stem: s.stem, lineage: s.lineage, branch: s.branch, script: s.script ?? null }]));
/** Prepare everything a family needs from ONE parse of each system's treebank. */
const FAMILIES = {
  trees: { cards: ["A02", "A03"], async init(systems, o) {
    const views = viewsOf(systems); const trees = new Map(), caches = new Map(); const gaps = [];
    for (const s of systems) { try { const t = prepareTrees(s, { N: o.N, split: o.split }); trees.set(s.id, t); if (t.gap) gaps.push({ id: s.id, gap: t.gap }); } catch (e) { trees.set(s.id, { stem: s.stem, gap: { reason: `read failed: ${String(e?.message ?? e)}` } }); gaps.push({ id: s.id, gap: { reason: "read failed" } }); } caches.set(s.id, {}); }
    const a02 = a02Runtime({ trees, views }); const specs = { A03: a03Runtime({ trees, views, caches }), "A02-S": a02.S, "A02-G": a02.G };
    return { views, specs, gaps, extras: () => ({ flatControlS: [...trees.values()].filter((t) => !t.gap).slice(0, 3).map((t) => ({ stem: t.stem, S: a02FlatControl(t) })) }) };
  } },
  zipf: { cards: ["A08"], async init(systems, o) {
    const views = viewsOf(systems); const zipf = new Map(), caches = new Map(), gaps = [];
    for (const s of systems) { try { const z = prepareZipf(s, { N: o.N, split: o.split }); zipf.set(s.id, z); if (z.gap) gaps.push({ id: s.id, gap: z.gap }); } catch (e) { zipf.set(s.id, { stem: s.stem, gap: { reason: "read failed" } }); } caches.set(s.id, {}); }
    return { views, specs: { A08: a08Runtime({ zipf, views, caches }) }, gaps };
  } },
  pos: { cards: ["A05"], async init(systems, o) {
    const views = viewsOf(systems); const pos = new Map(), gaps = [];
    for (const s of systems) { const p = preparePos(s); pos.set(s.id, p); if (p.gap) gaps.push({ id: s.id, gap: p.gap }); }
    return { views, specs: { A05: a05Runtime({ pos, views }) }, gaps };
  } },
  closed: { cards: ["A01"], async init(systems, o) {
    const views = viewsOf(systems); const closed = new Map(), gaps = [];
    for (const s of systems) { try { const c = prepareClosed(s, { N: o.N, split: o.split }); closed.set(s.id, c); if (c.gap) gaps.push({ id: s.id, gap: c.gap }); } catch (e) { closed.set(s.id, { stem: s.stem, gap: { reason: "read failed" } }); } }
    const rt = a01Runtime({ closed, views }); return { views, specs: { A01: rt }, gaps, matched: () => rt.matched() };
  } },
};
export const familyOfCard = (cardId) => Object.keys(FAMILIES).find((f) => FAMILIES[f].cards.includes(cardId));
/** An initialised family in this thread: power(keys), control(keys), real(keys, powerBy, controlBy, opts). */
export async function initFamily(family, systems, o) {
  const st = await FAMILIES[family].init(systems, o); const rows = (keys) => keys ?? Object.keys(st.specs);
  return {
    gaps: st.gaps,
    power: (keys) => Object.fromEntries(rows(keys).map((k) => [k, rowPower(st.specs[k], st.views, { reps: o.reps, log: o.log ?? (() => {}) })])),
    control: (keys) => ({ rows: Object.fromEntries(rows(keys).map((k) => [k, rowControl(st.specs[k], st.views)])), extras: st.extras?.() ?? null }),
    real: (keys, powerBy, controlBy) => Object.fromEntries(rows(keys).map((k) => [k, rowReal(st.specs[k], st.views, powerBy[k], controlBy[k], { channels: 1, peek: !!o.peek, extraConditions: k === "A01" ? (per, ev, stt) => { const m = st.matched?.(); if (!m) return null; const x = { matched: m }; if ((stt.status === "UNDERPOWERED" && stt.statusIfChannelWaived) || stt.status === "PERSISTENT" || stt.status === "PERSISTENT-OUTSIDE-IE") if (m.p > ALPHA) return { ...x, status: "TRIVIAL", reasons: [...(stt.reasons ?? []), `matched-frequency control failed: closed types lower in cd than open types in ${m.k} of ${m.n} deciles (p ${m.p.toFixed(3)}): frequency alone explains it`], statusIfChannelWaived: null }; return x; } : null })])),
  };
}
/** A family running in its own worker thread; the same three-phase interface through promises. */
export class FamilyWorker {
  constructor(family, systems, o) { this.w = new Worker(new URL(import.meta.url), { workerData: { __barkerFamily: { family, systems, o: { ...o, log: undefined } } } }); this.pending = new Map(); this.n = 0; this.dead = null;
    this.w.on("message", (m) => { const p = this.pending.get(m.id); if (p) { this.pending.delete(m.id); m.ok ? p.resolve(m.out) : p.resolve({ __error: m.error }); } });
    this.w.on("error", (e) => { this.dead = String(e?.stack ?? e).split("\n").slice(0, 4).join(" | "); for (const p of this.pending.values()) p.resolve({ __error: this.dead }); this.pending.clear(); });
    this.w.on("exit", (c) => { if (c !== 0) { this.dead ??= `worker exit ${c}`; for (const p of this.pending.values()) p.resolve({ __error: this.dead }); this.pending.clear(); } }); }
  call(phase, ...args) { if (this.dead) return Promise.resolve({ __error: this.dead }); return new Promise((resolve) => { const id = ++this.n; this.pending.set(id, { resolve }); this.w.postMessage({ id, phase, args }); }); }
  close() { return this.w.terminate(); }
}

// ═══ 19b. Level R (kinds of relations) and the A11 ledger ═══════════════════════════════════════════
export const REL_DESCRIPTORS = Object.freeze(["dir", "depClosed", "headClosed", "dlen", "subsize", "valency", "proj", "depth"]);
/** Per-relation descriptor means for ONE seed block of one system: Map<relBase, { n, v:Float64Array(8) }>. Label-free: the deprel base names the entity and is never a feature. */
export function relationDescriptors(tb, indices) {
  const acc = new Map();
  for (const i of indices) {
    const s = tb.sentences[i]; const t = sentTree(s); if (!t || t.m > MAXM) continue; const m = t.m; const depth = new Int16Array(m); const size = new Int16Array(m).fill(1);
    for (let k = 1; k < m; k++) { const node = t.order[k]; depth[node] = depth[t.parent[node]] + 1; } for (let k = m - 1; k > 0; k--) { const node = t.order[k]; size[t.parent[node]] += size[node]; }
    const isDesc = (anc, x) => { for (let p = t.parent[x]; p >= 0; p = t.parent[p]) if (p === anc) return true; return false; };
    for (let x = 0; x < m; x++) {
      if (x === t.root) continue; const h = t.parent[x]; const rel = t.label[x]; let e = acc.get(rel); if (!e) { e = { n: 0, v: new Float64Array(REL_DESCRIPTORS.length) }; acc.set(rel, e); }
      const lo = Math.min(x, h), hi = Math.max(x, h); let proj = 1; for (let u = lo + 1; u < hi && proj; u++) if (!isDesc(h, u)) proj = 0;
      const ux = s.upos[t.tokens[x]], uh = s.upos[t.tokens[h]];
      e.n++; e.v[0] += x < h ? 1 : 0; e.v[1] += CLOSED_UPOS.has(ux) ? 1 : 0; e.v[2] += CLOSED_UPOS.has(uh) ? 1 : 0; e.v[3] += hi - lo; e.v[4] += Math.log2(size[x]); e.v[5] += t.kids[h].length; e.v[6] += proj; e.v[7] += depth[x];
    }
  }
  for (const e of acc.values()) for (let j = 0; j < e.v.length; j++) e.v[j] /= e.n; return acc;
}
/** One system's relation entities over the five seeds: { id, rels: { [rel]: { counts:[...], values:[[8]...] } } } | { id, gap }. */
export function systemRelationEntities(sys, { N = N_BUDGET, seeds = SEEDS, split = "dev" } = {}) {
  const tb = cachedTreebank(sys.train, { split }); const per = [];
  for (const seed of seeds) { const smp = sampleIndices(tb, { N, seed, system: sys.stem }); if (!smp) return { id: sys.id, gap: { reason: "treebank below budget", words: tb.words, need: N } }; per.push(relationDescriptors(tb, smp.indices)); }
  const rels = {}; const names = new Set(per.flatMap((m) => [...m.keys()]));
  for (const r of names) { const counts = per.map((m) => m.get(r)?.n ?? 0); const ok = counts.filter((c) => c >= TYPED.arcFloor).length; if (ok < 3) continue; rels[r] = { counts, values: per.map((m) => (m.get(r) && m.get(r).n >= TYPED.arcFloor ? Array.from(m.get(r).v) : null)) }; }
  return { id: sys.id, rels };
}
registerJob("relEntities", (j) => systemRelationEntities(j.system, j.opts));
/**
 * relationKinds({ systems, entities, draws, ... }) -> { level:"R", n, systems, kinds, nmi:{ deprel, system }, ... }.
 * Entities are (system, deprel base) pairs with >= 30 arcs in >= 3 of 5 seeds; 8 label-free descriptors binned at pooled terciles; the organ's ceiling runs with
 * `branches` = the SYSTEM of each entity (so N-fam redeals within system: entities of one system are not exchangeable with another's) and the real lineages.
 */
export async function relationKinds({ systems, entities, draws = DRAWS_SMOKE, alpha = ALPHA, seed = SEED, workers = 4, controlReps = undefined, split = "dev", N = N_BUDGET } = {}) {
  const sysById = new Map(systems.map((s) => [s.id, s]));
  const ents = entities ?? (workers > 1 ? await parallelMap(systems.map((s) => ({ type: "relEntities", system: s, opts: { N, split } })), workers) : systems.map((s) => systemRelationEntities(s, { N, split })));
  const ids = [], rows = [], res = [], lin = [], sysOf = [], relOf = [], gaps = [];
  for (const e of ents) { if (e?.error || e?.gap) { gaps.push({ id: e?.id ?? "?", gap: e.gap ?? { reason: e.error } }); continue; } const s = sysById.get(e.id); for (const [rel, r] of Object.entries(e.rels)) { const ok = r.values.filter(Boolean); ids.push(`${e.id}|${rel}`); rows.push(REL_DESCRIPTORS.map((_, j) => mean(ok.map((v) => v[j])))); res.push(REL_DESCRIPTORS.map((_, j) => ok.map((v) => v[j]))); lin.push(s.lineage); sysOf.push(e.id); relOf.push(rel); } }
  if (ids.length < 40) return { level: "R", gap: { reason: "fewer than 40 relation entities", n: ids.length }, gaps };
  const bm = organFn("blockMatrixFromValues")(rows, { ids, featureKeys: [...REL_DESCRIPTORS], bins: 3, resamples: res, branches: sysOf, lineages: lin });
  const out = { level: "R", n: ids.length, systems: new Set(sysOf).size, relations: new Set(relOf).size, features: bm.featureKeys.length, gaps: [...gaps, ...(bm.gaps ?? [])], params: { draws, alpha, seed, controlReps: controlReps ?? "organ default" } };
  try {
    const r = organFn("induceSystemKinds")(bm, { draws, alpha, seed, population: "relations", group: "R", branches: sysOf, lineages: lin, ...(controlReps !== undefined ? { controlReps } : {}) });
    const label = new Map(ids.map((id) => [id, 0])); const kinds = (r.kinds ?? []).filter((k) => k.status !== "REFUSED").map((k, ki) => { for (const m of k.memberRefs) label.set(m, ki + 1); const comp = new Map(); for (const m of k.memberRefs) { const rel = relOf[ids.indexOf(m)]; comp.set(rel, (comp.get(rel) ?? 0) + 1); } return { id: k.id, status: k.status, instrument: k.instrument, size: k.memberRefs.length, lineageSpan: k.lineageSpan, systemSpan: k.branchSpan, p: k.p, coreSignatures: (k.coreSignatures ?? []).slice(0, 8), topRelations: [...comp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8), members: k.memberRefs }; });
    const part = ids.map((id) => label.get(id)); out.kinds = kinds; out.refused = r.refused ?? []; out.ceiling = r.ceiling ? { value: r.ceiling.value, D: r.ceiling.D, nulls: r.ceiling.nulls } : null; out.diagnostics = { control: r.diagnostics?.control ?? null, knobStable: r.diagnostics?.knobStable ?? null, effectiveDimension: r.diagnostics?.effectiveDimension ?? null };
    out.nmi = kinds.length ? { deprel: nmi(part, relOf), system: nmi(part, sysOf), coverage: part.filter(Boolean).length / part.length } : null;
    Object.defineProperty(out, "_tables", { value: { ids, relOf, sysOf, bm }, enumerable: false }); Object.defineProperty(out, "_entities", { value: ents, enumerable: false });
  } catch (e) { out.error = String(e?.stack ?? e).split("\n").slice(0, 4).join(" | "); }
  return out;
}
/**
 * A11 — the functional-determination LEDGER through kernel/kind-functional-induction.js::induceKindsAndFunctions over the Level-R kinds (declared, so the organ's own
 * inducer is not run a second time): an entity's assertions are its binned descriptor values in each of the five seeds; sameValue = equal bin. Per kind and descriptor the
 * organ's standing (unexposed / refuted / candidate; "established" is not an outcome) with named counterexample members; plus the CROSS-MEMBER table (modal bins).
 */
export function relationLedger(levelR, { exposureFloor = 3 } = {}) {
  if (!levelR?.kinds?.length || !levelR._tables) return { status: "NO_KINDS", gap: "no Level-R kinds to hold a ledger over" };
  const { ids, bm } = levelR._tables; const idx = new Map(ids.map((id, i) => [id, i])); const bin = (j, v) => { let b = 0; for (const c of bm.cuts[j]) if (v > c) b++; return b; };
  const perSeed = new Map(); for (const e of levelR._entities ?? []) if (!e.gap && !e.error) for (const [rel, r] of Object.entries(e.rels)) perSeed.set(`${e.id}|${rel}`, r.values);
  const assertions = new Map();
  for (const id of ids) { const vals = perSeed.get(id); const a = []; REL_DESCRIPTORS.forEach((d, j) => { const seedBins = vals ? vals.filter(Boolean).map((v) => bin(j, v[j])) : [bm.bins[j][idx.get(id)]]; seedBins.forEach((b, s) => a.push({ id: `${id}:${d}:${s}`, rel: d, value: b })); }); assertions.set(id, a); }
  const res = organFn("induceKindsAndFunctions")(ids, { assertionsOf: (id) => assertions.get(id) ?? [], sameValue: (a, b) => a === b, exposureFloor, declaredKinds: levelR.kinds.map((k) => ({ kindKey: k.id, memberRefs: k.members })) });
  const table = levelR.kinds.map((k) => { const rel = res.relations.get(k.id) ?? {}; const modal = {}; REL_DESCRIPTORS.forEach((d, j) => { const bins = k.members.map((m) => bm.bins[j][idx.get(m)]); const cnt = new Map(); for (const b of bins) cnt.set(b, (cnt.get(b) ?? 0) + 1); const top = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0]; modal[d] = { modalBin: top[0], share: top[1] / bins.length, disagreeing: k.members.filter((m) => bm.bins[j][idx.get(m)] !== top[0]).slice(0, 5) }; });
    return { kind: k.id, size: k.size, standings: Object.fromEntries(Object.entries(rel).map(([d, v]) => [d, { standing: v.standing, members: v.members, exposed: v.exposed, agreed: v.agreed, changed: v.changed, simultaneous: v.simultaneous, refutedBy: v.refutedBy }])), crossMember: modal }; });
  return { exposureFloor, kinds: table, note: "a corpus can refute a single-valued claim and can never establish one: 'candidate' is defeasible forever" };
}

// ═══ 20. inputs, the Level-S power stage, the driver and the CLI ═══════════════════════════════════
/** A synthetic treebank (random recursive trees, Zipfian words, closed forms for case/det) for development and tests. */
export function genToyConllu({ sents = 1200, seed = 1, vocab = 400, zipf = 1.0, labels = ["nsubj", "obj", "nmod", "amod", "advmod", "case", "det", "conj", "cc", "acl", "mark", "aux"] } = {}) {
  const rng = rngFor("toy-conllu", seed); const cumW = []; let acc = 0; for (let r = 1; r <= vocab; r++) { acc += r ** -zipf; cumW.push(acc); }
  const word = () => { const u = rng() * acc; let lo = 0, hi = vocab - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cumW[m] >= u) hi = m; else lo = m + 1; } return "w" + lo; };
  const out = [];
  for (let i = 0; i < sents; i++) {
    const m = 4 + Math.floor(rng() * 20); const parent = [-1]; for (let k = 1; k < m; k++) parent.push(Math.floor(rng() * k));
    const perm = shuffleInPlace(Array.from({ length: m }, (_, k) => k), rng); const pos = new Array(m); perm.forEach((node, p) => { pos[node] = p + 1; });
    const lines = [`# sent_id = t${i}`];
    for (let p = 0; p < m; p++) {
      const node = perm[p]; const head = parent[node] < 0 ? 0 : pos[parent[node]]; const lab = parent[node] < 0 ? "root" : labels[Math.floor(rng() ** 2 * labels.length)];
      let upos = "NOUN", form; if (lab === "case") { upos = "ADP"; form = ["of", "in", "to", "by"][Math.floor(rng() * 4)]; } else if (lab === "det") { upos = "DET"; form = ["the", "a"][Math.floor(rng() * 2)]; } else form = word();
      lines.push([p + 1, form, "_", upos, "_", "_", head, lab, "_", "_"].join("\t"));
    }
    out.push(lines.join("\n"));
  }
  return out.join("\n\n") + "\n";
}
/** Write a toy world (systems with train, dev and POS-prior files) under `dir`; returns the system list. */
export function makeToyWorld(dir, { lineages = [["L1", "B1"], ["L1", "B1"], ["L1", "B2"], ["L2", "B3"], ["L2", "B3"], ["L3", "B4"], ["L4", "B5"], ["L5", "B6"], ["L6", "B7"], ["L7", "B8"], ["L8", "B9"]], sents = 1200 } = {}) {
  fs.mkdirSync(path.join(dir, "pos"), { recursive: true }); const systems = [];
  lineages.forEach(([lineage, branch], i) => {
    const stem = `t${i}`; fs.mkdirSync(path.join(dir, "tb", stem), { recursive: true }); fs.mkdirSync(path.join(dir, "dev", stem), { recursive: true });
    const trainP = path.join(dir, "tb", stem, "train.conllu"), devP = path.join(dir, "dev", stem, "dev.conllu"), posP = path.join(dir, "pos", `pos-${stem}.json`);
    const z = 0.9 + 0.05 * (i % 5); const train = genToyConllu({ sents, seed: 100 + i, zipf: z }); fs.writeFileSync(trainP, train); fs.writeFileSync(devP, genToyConllu({ sents: Math.ceil(sents / 4), seed: 900 + i, zipf: z }));
    const tags = {}; for (const line of train.split("\n")) { const c = line.split("\t"); if (c.length < 8) continue; (tags[c[1]] ??= {})[c[3]] = (tags[c[1]]?.[c[3]] ?? 0) + 1; } fs.writeFileSync(posP, JSON.stringify({ schema: "POSPrior@1", forms: tags }));
    systems.push({ id: `nl:${stem}`, stem, lineage, branch, script: "Latn", train: trainP, dev: devP, pos: posP });
  });
  return systems;
}
/** A card-system record from a SystemProfile@1: the pinned train/dev paths come from the profile's own inputs (a system id pins file hashes, never a stem). */
export function systemFromProfile(p) {
  const v = systemView(p); const train = (p.inputs ?? []).find((i) => i.role === "train")?.path ?? null; const dev = (p.inputs ?? []).find((i) => i.role === "dev")?.path ?? null;
  const pos = path.join(PATHS.PRIORS_DIR, `pos-${v.stem}.json`);
  return { id: p.id, stem: v.stem, lineage: v.lineage, branch: v.branch, script: v.script, train, dev, pos: fs.existsSync(pos) ? pos : null, genealogyDisagree: v.genealogyDisagree ?? null };
}
registerJob("buildProfile", async (j) => { const PM = await profilesModule(); return PM.profileOf(j.stem, { cache: false }); });
export const PROFILE_CACHE = "/private/tmp/claude-501/barker/induce-profiles";
/**
 * NL profiles for a run, from profiles.mjs. They are cached in THIS file's own directory (one JSON per stem), so a run is internally consistent even if
 * profiles.mjs is edited while it runs; missing ones are built (in worker threads when workers > 1) and written. The profiles' contentHash and preregSha are
 * stamped into the output by runAll. Restricted to `stems` when given; only systems whose treebank reaches the budget and that are not script twins.
 */
export async function loadNlProfiles({ stems = null, workers = 1, cacheDir = PROFILE_CACHE, log = () => {} } = {}) {
  const PM = await profilesModule(); if (!PM) throw new Error(`profiles.mjs unavailable: ${profilesStatus().error}`);
  const rows = PM.discoverSystems({ refreshFirstSeen: false }).systems.filter((r) => r.kind === "nl" && r.trainFile && !r.twinOf && r.budgetReachable && (!stems || stems.includes(r.stem)));
  fs.mkdirSync(cacheDir, { recursive: true }); const file = (stem) => path.join(cacheDir, `nl__${stem}.json`); const have = new Map(); const need = [];
  for (const r of rows) { if (fs.existsSync(file(r.stem))) { try { have.set(r.stem, JSON.parse(fs.readFileSync(file(r.stem), "utf8"))); continue; } catch { /* rebuild */ } } need.push(r.stem); }
  if (need.length) { log(`building ${need.length} profiles`); const built = workers > 1 ? await parallelMap(need.map((stem) => ({ type: "buildProfile", stem })), workers) : await Promise.all(need.map(async (stem) => PM.profileOf(stem, { cache: false }))); need.forEach((stem, i) => { if (built[i]?.error) { log(`profile ${stem} FAILED ${String(built[i].error).slice(0, 160)}`); return; } fs.writeFileSync(file(stem), JSON.stringify(built[i])); have.set(stem, built[i]); }); }
  return rows.map((r) => have.get(r.stem)).filter(Boolean);
}
/** Merge organ powerGrid cells computed one cell per job. */
export function mergeGrids(parts) {
  const cells = parts.flatMap((p) => p.cells ?? []); const adm = cells.filter((c) => c.admissible); const mde = adm.length ? adm.slice().sort((a, b) => a.strength - b.strength || a.signatureCount - b.signatureCount)[0] : null;
  const sc = cells.find((c) => c.strength >= 0.5 && c.signatureCount >= 12 && c.admissible) ?? null;
  return { cells, mde, sesoiCell: sc ? { strength: sc.strength, signatureCount: sc.signatureCount, admissible: true } : { admissible: false }, absenceLicensed: !!sc, kindSize: parts[0]?.kindSize ?? null, config: parts[0]?.config ?? null };
}
registerJob("wordKinds", (j) => wordKinds(j.system, j.opts));
registerJob("gridCell", (j) => organFn("powerGrid")({ ...j.opts, strengths: [j.strength], signatureCounts: [j.signatureCount] }));
registerJob("copula", (j) => { const inp = levelSInput(j.profiles, j.group, { bins: j.bins ?? 2 }); if (inp.gap || !inp.bm) return { gap: inp.gap ?? "no organ matrix" }; return organFn("copulaCalibration")(inp.bm, j.opts); });
/**
 * Level-S power stage (organ): the planted W-kind / W-continuum grid on the REAL branch layout and the W-copula calibration of every group.
 * Heavy by design (BARKER 9): `grid` and `cal` set the replicates and draws; whatever is used is stamped in the result.
 */
export async function levelSPower({ profiles, groups = ["A", "B", "C", "D", "E", "F", "G", "ALL"], grid = {}, cal = {}, workers = 4, bins = 2, log = () => {} } = {}) {
  const inp = levelSInput(profiles, "ALL", { bins }); if (inp.gap) return { gap: inp.gap };
  const cnt = new Map(); inp.branches.forEach((b) => cnt.set(b, (cnt.get(b) ?? 0) + 1)); const order = [...cnt.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const branchSizes = order.map((x) => x[1]); const lineageOf = order.map(([b]) => inp.lineages[inp.branches.indexOf(b)]);
  const gopts = { branchSizes, lineageOf, reps: grid.reps ?? 4, continuumReps: grid.continuumReps ?? 10, draws: grid.draws ?? 39, continuumDraws: grid.continuumDraws ?? 29, variants: grid.variants ?? ["free", "branch"], noiseCount: grid.noiseCount ?? 60 };
  const strengths = grid.strengths ?? [0.5, 0.8], sigs = grid.signatureCounts ?? [12, 24];
  const jobs = [...strengths.flatMap((s) => sigs.map((c) => ({ type: "gridCell", strength: s, signatureCount: c, opts: gopts }))), ...groups.map((g) => ({ type: "copula", group: g, profiles, bins, opts: { worlds: cal.worlds ?? 20, draws: cal.draws ?? 19, ...(cal.df ? { df: cal.df } : {}) } }))];
  const t0 = Date.now(); const res = workers > 1 ? await parallelMap(jobs, workers) : jobs.map((j) => JOBS[j.type](j));
  const nGrid = strengths.length * sigs.length; const gridParts = res.slice(0, nGrid).filter((r) => r && !r.error); const copula = {};
  groups.forEach((g, k) => { const r = res[nGrid + k]; copula[g] = r?.error ? { error: r.error } : r; });
  return { grid: gridParts.length ? mergeGrids(gridParts) : null, gridErrors: res.slice(0, nGrid).filter((r) => r?.error).map((r) => r.error), copula, layout: { branchSizes, lineageOf }, config: { grid: { ...gopts, strengths, signatureCounts: sigs }, cal, workers }, seconds: (Date.now() - t0) / 1000 };
}
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) && !ArrayBuffer.isView(x) ? Object.fromEntries(Object.keys(x).sort().map((q) => [q, x[q]])) : typeof x === "number" && !Number.isFinite(x) ? null : x));
/** Level W across systems: the per-system rows plus the counts a reader needs (systems with a kind, the control, the NMI against UPOS). */
export function summariseWordKinds(rows) {
  const ok = rows.filter((r) => r && !r.error && !r.gap); const withKind = ok.filter((r) => r.kindCount > 0);
  return { systems: rows.length, measured: ok.length, gaps: rows.filter((r) => r?.gap || r?.error).map((r) => ({ stem: r?.stem ?? null, gap: r?.gap ?? r?.error })), withKind: withKind.length, controlPassed: ok.filter((r) => r.control.passed).length,
    medianNmiUpos: median(ok.map((r) => r.nmiUpos).filter(Number.isFinite)), medianTypeCoverage: median(ok.map((r) => r.coverage.types)), perSystem: ok.map((r) => ({ stem: r.stem, vocab: r.vocab, kinds: r.kindCount, coverage: r.coverage, nmiUpos: r.nmiUpos, control: r.control, top: r.kinds.slice(0, 4) })) };
}
const CARD_ORDER = ["A01", "A02", "A03", "A05", "A08"];
/**
 * runAll(opts) — the R2 order in one process: (1) Level-S power + calibration, (2) every card's power trio, power file hashed and written, (3) controls,
 * (4) real: Level S, cards, system-level cards A07 and A12, Level W; (5) the output. Never opens a TEST file.
 */
export async function runAll(o) {
  const t0 = Date.now(); const log = o.log ?? (() => {}); const split = o.split ?? "dev";
  if (split !== "dev") throw new Error(`induce.mjs: split "${split}" refused: development runs read DEV only (header section 0)`);
  const preregSha = headerDigest(); const out = { schema: "BarkerInduction@1", version: INDUCE_VERSION, split, prereg_sha256: preregSha, organ: organStatus(), profilesModule: profilesStatus(), params: Object.fromEntries(Object.entries(o).filter(([k]) => !['profiles', 'systems', 'power', 'log', 'flags'].includes(k))), startedAt: new Date().toISOString(), cards: {}, gaps: [] };
  const profiles = o.profiles ?? (await loadNlProfiles({ stems: o.stems ?? null, workers: o.workers ?? 4, log })); out.systems = profiles.map((p) => { const v = systemView(p); return { id: p.id, stem: v.stem, lineage: v.lineage, branch: v.branch, script: v.script }; });
  out.profileHashes = Object.fromEntries(profiles.map((p) => [p.id, { contentHash: p.contentHash ?? null, preregSha: p.preregSha ?? null }]));
  out.layout = { systems: profiles.length, lineages: new Set(out.systems.map((s) => s.lineage)).size, branches: new Set(out.systems.map((s) => s.branch)).size };
  const disagree = profiles.map(systemView).filter((v) => v.genealogyDisagree).map((v) => ({ stem: v.stem, ...v.genealogyDisagree })); if (disagree.length) out.genealogyDisagreements = disagree;
  const systems = o.systems ?? profiles.map(systemFromProfile).filter((s) => s.train); const cardList = (o.cards ?? CARD_ORDER).filter((c) => CARD_ORDER.includes(c));
  const wantS = (o.levels ?? ["S"]).includes("S"); const workers = o.workers ?? 4;
  // (1) Level-S power
  let power = o.power ?? null;
  if (wantS && !power && !o.skipPower) { log("Level-S power grid and copula calibration ..."); power = await levelSPower({ profiles, groups: o.groups ?? undefined, grid: o.grid, cal: o.cal, workers, log }); }
  // (2) card power trios, in family workers (data prepared once per family)
  const fams = [...new Set(cardList.map(familyOfCard))].filter(Boolean); const fw = new Map(); const cardPower = {}; const famGaps = {};
  const sysSlim = systems.map(({ id, stem, lineage, branch, script, train, dev, pos }) => ({ id, stem, lineage, branch, script, train, dev, pos }));
  for (const f of fams) fw.set(f, o.inline ? await initFamily(f, sysSlim, { N: o.N ?? N_BUDGET, split, reps: o.reps ?? TYPED.reps, peek: !!o.peek, log }) : new FamilyWorker(f, sysSlim, { N: o.N ?? N_BUDGET, split, reps: o.reps ?? TYPED.reps, peek: !!o.peek }));
  const call = async (f, phase, ...args) => { const w = fw.get(f); const r = await (o.inline ? w[phase](...args) : w.call(phase, ...args)); return r; };
  const keysOf = (f) => (f === "trees" ? ["A03", "A02-S", "A02-G"].filter((k) => cardList.includes(k.slice(0, 3))) : FAMILIES[f].cards.filter((c) => cardList.includes(c)));
  log("card power trios ..."); const pw = await Promise.all(fams.map(async (f) => [f, await call(f, "power", keysOf(f))])); for (const [f, r] of pw) { if (r?.__error) { famGaps[f] = r.__error; continue; } Object.assign(cardPower, r); }
  out.power = { levelS: power ? { ...power } : null, cards: cardPower, familyErrors: famGaps }; out.power.sha256 = sha256(canon(out.power));
  if (o.outDir !== false) { fs.mkdirSync(o.outDir ?? PATHS.OUT_DIR, { recursive: true }); fs.writeFileSync(path.join(o.outDir ?? PATHS.OUT_DIR, `induce-power-${split}.json`), JSON.stringify(out.power)); }
  // A07 / A12 planted checks run with the power stage too (no real statistic yet)
  out.planted = plantedSystemChecks(profiles, { draws: o.a07Draws ?? 199 });
  // (3) controls
  log("controls ..."); const ctl = {}; const ctlExtras = {}; for (const f of fams) { const r = await call(f, "control", keysOf(f).filter((k) => cardPower[k])); if (r?.__error) { famGaps[f] = r.__error; continue; } Object.assign(ctl, r.rows); ctlExtras[f] = r.extras; }
  out.controls = { cards: ctl, extras: ctlExtras };
  // (4) real
  log("real data ..."); const rows = {};
  for (const f of fams) { const ks = keysOf(f).filter((k) => cardPower[k] && ctl[k]); const r = await call(f, "real", ks, Object.fromEntries(ks.map((k) => [k, cardPower[k]])), Object.fromEntries(ks.map((k) => [k, ctl[k]]))); if (r?.__error) { famGaps[f] = r.__error; continue; } Object.assign(rows, r); }
  for (const f of fams) { if (o.inline) { /* nothing to close */ } else await fw.get(f).close(); }
  out.rows = rows; out.familyErrors = famGaps;
  for (const id of cardList) { const rk = id === "A02" ? ["A02-S", "A02-G"] : [id]; const rs = rk.map((k) => rows[k]).filter(Boolean); if (!rs.length) { out.cards[id] = { id, status: "NOT_RUN", reason: famGaps[familyOfCard(id)] ?? "no rows" }; continue; } out.cards[id] = { id, status: weakestStatus(rs.map((r) => r.status)), rows: rs.map((r) => ({ key: r.key, status: r.status, reasons: r.reasons, statusIfChannelWaived: r.statusIfChannelWaived ?? null })), channels: 1, note: "ADAPTATION A: a single-channel card cannot be PERSISTENT" }; }
  if (wantS) { log("Level S ..."); out.levelS = await runLevelS({ profiles, groups: o.groups ?? undefined, draws: o.draws ?? DRAWS_SMOKE, power, stability: !o.noStability, stabilityOpts: o.stabilityOpts ?? {}, decomposeDraws: o.decomposeDraws ?? 499, controlReps: o.controlReps, workers }); }
  if ((o.levels ?? ["S"]).includes("W")) { log("Level W ..."); const wk = workers > 1 ? await parallelMap(sysSlim.map((s) => ({ type: "wordKinds", system: s, opts: { N: o.N ?? N_BUDGET, split } })), workers) : sysSlim.map((s) => wordKinds(s, { N: o.N ?? N_BUDGET, split })); out.levelW = summariseWordKinds(wk); }
  if ((o.levels ?? ["S"]).includes("R")) { log("Level R ..."); const lr = await relationKinds({ systems: sysSlim, draws: o.draws ?? DRAWS_SMOKE, workers, controlReps: o.controlReps, split, N: o.N ?? N_BUDGET }); out.levelR = lr; out.ledger = relationLedger(lr); }
  out.systemLevel = {}; out.systemLevel.A07 = a07System(profiles, out.planted, o); if (out.levelS) out.systemLevel.A12 = a12Gated(out.levelS, profiles, out.planted, o);
  // registry table
  out.archTable = Object.fromEntries(Object.values(ARCH_REGISTRY).map((c) => [c.id, c.status === "not_implemented" ? { name: c.name, status: "NOT_IMPLEMENTED", needs: c.needs, sesoi: c.sesoi, pPersistent: c.pPersistent } : { name: c.name, sesoi: c.sesoi, pPersistent: c.pPersistent, result: out.cards[c.id] ?? (c.id === "A07" ? out.systemLevel.A07 : c.id === "A12" ? out.systemLevel.A12 : c.id === "A11" ? (out.ledger ?? { status: "NOT_RUN" }) : { status: "NOT_RUN" }) }]));
  out.seconds = (Date.now() - t0) / 1000; return out;
}
/** Planted detection checks for the system-level cards: A07 (planted partial rho) and A12 (unity vs pluralism) on the REAL layout / toy stems. */
export function plantedSystemChecks(profiles, { draws = 199, reps = 6 } = {}) {
  const views = profiles.map(systemView); const res = { A07: { two: [], half: [] } };
  for (const [w, rho] of [["two", -0.6], ["half", -0.15]]) for (let r = 0; r < reps; r++) { const pl = plantedA07Rows(views, rho, rngFor("a07-plant", w, r)); const m = a07Measure(pl, { draws, B: 200, seed: SEED + r }); res.A07[w].push(m.gap ? null : { theta: m.theta, ci: m.ci }); }
  const sesoi = -ARCH_REGISTRY.A07.sesoi.rho; const ok = (a) => a.filter(Boolean);
  res.A07.up = ok(res.A07.two).length ? ok(res.A07.two).filter((x) => x.ci[0] > sesoi).length / ok(res.A07.two).length : NaN; res.A07.down = ok(res.A07.half).length ? ok(res.A07.half).filter((x) => x.ci[1] < sesoi).length / ok(res.A07.half).length : NaN; res.A07.pass = res.A07.up >= TYPED.powerUp && res.A07.down >= TYPED.powerDown;
  res.A12 = plantedConsensusCheck({ draws, reps: 4 });
  res.A07.layout = { systems: views.length, lineages: new Set(views.map((v) => v.lineage)).size, lineagesWith4: [...new Set(views.map((v) => v.lineage))].filter((l) => views.filter((v) => v.lineage === l).length >= 4).length };
  return res;
}
function a07System(profiles, planted, o) {
  const m = a07Measure(profiles, { draws: o.a07Draws ?? TYPED.a07Draws }); if (m.gap) return { status: "UNDERPOWERED", reasons: [m.gap.reason], gap: m.gap };
  const withheld = planted?.A07 && !planted.A07.pass && !o.peek; const st = systemLevelStatus({ reach: m.reach, theta: m.theta, ci: m.ci, sesoi: -ARCH_REGISTRY.A07.sesoi.rho, power: planted?.A07 ?? null });
  return { ...st, plantedCheck: planted?.A07 ? { up: planted.A07.up, down: planted.A07.down, pass: planted.A07.pass, layout: planted.A07.layout } : null, estimate: withheld ? { withheld: "planted check failed: the pooled estimate is not printed (no peek)" } : { n: m.n, rho: m.rho, nullMedian: m.nullMedian, p: m.p, theta: m.theta, ci: m.ci, lineages: m.lineages, lineagesDefined: m.lineagesDefined, reach: m.reach, lolo: m.lolo, draws: m.draws }, varianceRatioComponent: "NOT_RUN: the profile carries only the joint g05, not per-channel information terms" };
}
function a12Gated(levelS, profiles, planted, o = {}) {
  const c = a12Card(levelS, profiles); if (c.internal) delete c.internal; c.plantedCheck = planted?.A12 ? { up: planted.A12.up, down: planted.A12.down, pass: planted.A12.pass } : null;
  if (planted?.A12 && !planted.A12.pass && !o.peek) { return { status: "UNDERPOWERED", reasons: ["planted unity/pluralism check failed: the pooled estimate is not printed (no peek)"], plantedCheck: c.plantedCheck, estimate: { withheld: true } }; }
  return c;
}

/** Planted A12 worlds: unity (one latent partition in three groups) must give a large positive excess ARI; pluralism (an independent partition per group) must not. */
export function plantedConsensusCheck({ reps = 4, draws = 199 } = {}) {
  const run = (mode, r) => { const { profiles } = plantedConsensusProfiles({ mode, seed: r }); const dom = {}; for (const g of ["A", "B", "C"]) { const inp = levelSInput(profiles, g, { minSystems: 12, minFeatures: 6 }); if (inp.gap) return null; dom[g] = { ids: inp.systemIds, labels: dominantSplit(inp.matrix, rngFor("pc", mode, r, g)).labels }; } const c = interGroupConsensus(dom, profiles, { draws }); return c.gap ? null : { theta: c.theta, p: c.p }; };
  const u = Array.from({ length: reps }, (_, r) => run("unity", r)).filter(Boolean), p = Array.from({ length: reps }, (_, r) => run("pluralism", r)).filter(Boolean); const s = ARCH_REGISTRY.A12.sesoi.value;
  return { unity: u, pluralism: p, up: u.length ? u.filter((x) => x.theta > s && x.p <= ALPHA).length / u.length : NaN, down: p.length ? p.filter((x) => x.theta < s).length / p.length : NaN, pass: u.length > 0 && p.length > 0 && u.every((x) => x.theta > s) && p.every((x) => x.theta < s) };
}
const OPT_FLAGS = { "--split": "split", "--source": "source", "--stems": "stems", "--levels": "levels", "--cards": "cards", "--draws": "draws", "--reps": "reps", "--workers": "workers", "--power-file": "powerFile", "--out": "outDir", "--n": "N", "--grid-reps": "gridReps", "--cal-worlds": "calWorlds", "--stability-b": "stabilityB", "--groups": "groups", "--control-reps": "controlReps" };
/** Parse argv into run options. */
export function parseCli(argv) {
  const o = { split: "dev", source: "profiles", levels: ["S"], flags: new Set() };
  for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (OPT_FLAGS[a]) { o[OPT_FLAGS[a]] = argv[++i]; } else if (a.startsWith("--")) o.flags.add(a.slice(2)); }
  for (const k of ["draws", "reps", "workers", "N", "gridReps", "calWorlds", "stabilityB", "controlReps"]) if (o[k] !== undefined) o[k] = Number(o[k]);
  for (const k of ["stems", "levels", "cards", "groups"]) if (typeof o[k] === "string") o[k] = o[k].split(",").filter(Boolean);
  o.peek = o.flags.has("peek"); o.noStability = o.flags.has("no-stability"); o.skipPower = o.flags.has("skip-power"); o.inline = o.flags.has("inline"); o.smoke = o.flags.has("smoke"); o.confirmatory = o.flags.has("confirmatory");
  return o;
}
/** The reduced numbers of --smoke (stamped in the output; a smoke run is labelled, never a report). */
export function applySmoke(o) {
  if (!o.smoke) return o;
  return { ...o, draws: o.draws ?? 39, reps: o.reps ?? 4, N: o.N ?? N_BUDGET, grid: { reps: o.gridReps ?? 3, continuumReps: 6, draws: 29, continuumDraws: 19, strengths: [0.8], signatureCounts: [12, 24] }, cal: { worlds: o.calWorlds ?? 10, draws: 19 },
    stabilityOpts: { Bfeat: o.stabilityB ?? 20, Bsys: o.stabilityB ?? 20, pairs: 30 }, decomposeDraws: 199, a07Draws: 199, label: "SMOKE (reduced draws, replicates and grid; not a report)" };
}
/** CLI entry: prints a compact JSON summary and writes the full result to <out>/induce-<split>.json. */
export async function main(argv = process.argv.slice(2)) {
  const o0 = parseCli(argv); if (o0.split === "test") { if (!(o0.confirmatory && fs.existsSync(PATHS.LOCK))) { console.error("induce.mjs: --split test is refused (no PREREG.lock.json / --confirmatory). DEV only."); return 3; } }
  const o = applySmoke(o0); const outDir = o.outDir ?? PATHS.OUT_DIR; fs.mkdirSync(outDir, { recursive: true });
  const log = (m) => process.stderr.write(`[induce] ${m}\n`);
  let res;
  if (o.source === "toy") {
    const dir = fs.mkdtempSync(path.join(outDir, "toy-")); const systems = makeToyWorld(dir); const { profiles } = plantedToyProfiles({ world: "kind", kindBranches: ["Semitic", "Turkic", "Koreanic", "Japonic", "Austroasiatic"], seed: 1 });
    res = await runAll({ ...o, profiles, systems: systems.map((s) => ({ ...s, id: s.id })), N: o.N ?? 8000, log, outDir, groups: o.groups ?? ["A", "B", "C"], cards: o.cards ?? CARD_ORDER });
  } else res = await runAll({ ...o, log, outDir });
  const file = path.join(outDir, `induce-${o.split}.json`); fs.writeFileSync(file, JSON.stringify(res)); res.file = file;
  const summary = { file, split: res.split, label: o.label ?? "REPORT", prereg_sha256: res.prereg_sha256, power_sha256: res.power?.sha256, organ: { present: res.organ.present, missing: res.organ.missing.length }, layout: res.layout, seconds: res.seconds,
    levelS: res.levelS ? Object.fromEntries(Object.entries(res.levelS.groups).map(([g, r]) => [g, r.gap ? { gap: r.gap.reason } : { n: r.n, features: r.features, pr: r.pr, organ: r.organ?.status, kinds: (r.organ?.kinds ?? []).map((k) => `${k.status}:${k.members.length}`), stable: r.stability ? Object.fromEntries(Object.entries(r.stability).map(([k, v]) => [k, v.verdict ?? v.error])) : null }])) : null,
    archTable: Object.fromEntries(Object.entries(res.archTable).map(([k, v]) => [k, v.status ?? v.result?.status ?? "?"])), familyErrors: res.familyErrors };
  console.log(JSON.stringify(summary, null, 1)); return 0;
}

// END-OF-PART-N

// ── worker-thread entries (the file is its own worker script) ──────────────────────────────────────────────────
if (!isMainThread && workerData?.__barkerJob) {
  const job = workerData.__barkerJob;
  try { const fn = JOBS[job.type]; if (!fn) throw new Error(`unknown job ${job.type}`); parentPort.postMessage(await fn(job)); }
  catch (e) { parentPort.postMessage({ error: String(e?.stack ?? e).split("\n").slice(0, 5).join(" | ") }); }
}
if (!isMainThread && workerData?.__barkerFamily) {
  const { family, systems, o } = workerData.__barkerFamily; let rt = null;
  parentPort.on("message", async (m) => { try { rt ??= await initFamily(family, systems, o); const out = await rt[m.phase](...m.args); parentPort.postMessage({ id: m.id, ok: true, out }); } catch (e) { parentPort.postMessage({ id: m.id, ok: false, error: String(e?.stack ?? e).split("\n").slice(0, 5).join(" | ") }); } });
}
if (isMainThread && process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) { process.exitCode = await main(); }
