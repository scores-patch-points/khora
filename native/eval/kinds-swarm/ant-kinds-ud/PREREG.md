# PREREG — ant-kinds-ud: kind induction on the UD languages and the holographic signature per kind

Written 2026-10-06, BEFORE the first run of any script in this directory (the only runs made before this file existed were
timing probes of impact.mjs on `swe` dev: snapshot 45 ms, one ablation 16 ms; no statistic was read). Header hash recorded in the
mark log and in REPORT.md. Everything below the line `END-OF-PREREG` is not part of the hash.

DISCLOSURE. Seen before this file: the BRIEF; the headers of kind-standing.js, impact.mjs, name-shape.mjs and the learner in
name-war-and-peace.mjs; NAME-SHAPE-RESULTS (pooled PROPN shadow ~ random-set shadow, cos 0.98). `swe` is the DEBUG language: code
paths are exercised on it and its numbers are shown but excluded from every verdict count. Nothing here is retuned after reading a result;
a second round is a new dated amendment on fresh text (fold80 tail), with the same code and thresholds.

DATA. UD DEV only (impact.mjs readConlluStream: lowercase word units, punctuation removed, NFC). Gold UPOS is read in exactly three places:
(i) AFTER induction, to DESCRIBE kinds (purity, NMI, which are noun-like / proper-noun-like); (ii) to SELECT which tokens form the gold strata
PROPN and NOUN and their frequency-matched controls (as name-shape.mjs selects by gold), and to stratify reports; (iii) as the label of K3a.
Gold never enters induction, a feature, or a threshold. First batch: eng spa rus cmn-hans fas jpn tur arb hin fin (+ swe debug). Extension if time:
the other languages (cmn is the same text in traditional script and is excluded from K4 and from pooled counts).

## 1. INDUCTION (kinds from company only; nothing named, nothing taught)
Company of a form occurrence = the token before and the token after (`^` / `$` at the sentence edge, its own token), COUNTS not sets, as kind-standing.js
contextVectors. Features: `b:x` and `a:y`; a context word with fewer than MM total mentions in the stream collapses to `~` (it keeps "rare word precedes" as evidence).
Vector = sqrt(count), L2-normalised (cosine). Forms = those with >= MM mentions. TYPED NUMBERS (each declared): MM = 5 (a company vector from 5 mentions has 10
observations; sensitivity at 3 and 8 is reported for K only, not used); minimum forms 60 (below: typed gap `thin`); k-means: spherical, k-means++ seeding, 3 restarts
for stability fits and 10 for the final fit, <= 30 iterations, seeded by seedFor(stem, ...); S = 10 split pairs; ladder K in {2,3,4,6,8,12,16,24} capped at floor(sqrt(nForms));
minChild = 8 forms (a kind with fewer members cannot be tested; a split leaving a child below it is rejected); chronology/tercile K for K1 controls: the induced K* and 4.
HOW MANY KINDS (derived, not typed): STABILITY under random sentence-half split. For each K: split the sentences at random into two halves A, B, build each half's company
vectors, k-means each half independently, ARI between the two partitions of the forms with >= ceil(MM/2) mentions in both halves; statistic = median over S splits.
NULL = the same procedure on the within-sentence-shuffled stream (company destroyed, marginals kept; shuffleSentences), q95 over S splits. margin(K) = median_obs - q95_null.
K* = argmax_K margin(K), required margin > 0, else K* = 1 (typed gap `no_stable_kinds`). One REFINEMENT level: each kind with >= 2*minChild forms is split by the same rule with
ladder {2,3,4} (own null on the same forms); accepted only if margin > 0 and every child >= minChild. KINDS = leaves. Forms below MM mentions carry label `u` (unclustered; used only
as a frequency class, never as a kind).
DESCRIPTION AFTER THE FACT (gold, descriptive only): per leaf the gold-UPOS token distribution; purity = majority share; noun-like = (NOUN+PROPN) share >= 0.5; proper-noun-like =
PROPN share >= 0.5 (typed descriptive thresholds; they define the NOMINAL STRATUM used for secondary analyses and nothing else); sample members; NMI(kind, UPOS) vs the NMI of kinds induced
on the shuffled stream at the same K*.

## 2. CLAIMS, FALSIFIERS, PREDICTIONS
K1 kinds exist. Per language passes iff (a) K*>=2 (margin>0); (b) chronological halves (first / second half of the stream, same K*): ARI of independent partitions > q95 of the same on 10
shuffled streams; (c) frequency control: in >= 2 of 3 frequency terciles of forms, split-half margin at K=4 > 0 (kinds are not only frequency bands); and report NMI(kinds, equal-count
frequency bands of the same number). K1 FALSIFIED if fewer than 80% of the verdict languages pass (a)-(c) (typed fraction).
 P1 K1 holds (a,b,c) in >= 8 of 10 first-batch languages; median K* in [3, 12]. P2 NMI(kinds, freq bands) < 0.30 in a majority. P3 every language has >= 1 noun-like kind; >= 1 proper-noun-like
 kind in >= 5 of 10; a proper-noun-like kind that is split by the refinement into >= 2 leaves each >= 0.5 PROPN in <= 3 of 10 (people vs places is hard from one-token company on 10-50k tokens).
K2 kinds differ in signature. Single-token records (impactOfToken, A-DEL, M = min(128, floor(N/5)) causal frames, F = 0, withC false) for tokens recurring (>= 2 occurrences) in their causal
window s >= M: up to Q = 80 per leaf, up to 250 gold-PROPN and 250 gold-NOUN tokens each with a frequency-matched control (same log2 stream-frequency bin, same recurrence, non-class). Coordinates:
85 slot + 19 atmosphere + 3 extent (tokens, frames, radius); constants dropped, z-scored per language.
 T2a eta^2 = between-kind / total sum of squares of the standardised coordinates over leaf kinds with >= 20 records; NULL = form-level label permutation WITHIN log2-frequency strata (B=1000);
 also an unrestricted form-label permutation (random partitions of the same sizes). Passes iff p <= 0.05 under the frequency-stratified permutation. Same on the nominal stratum alone.
 T2b joint ablation of all tokens of a kind in a window (name-shape.mjs joint: shadow 24-d type distribution, imprint 5-d, collateral shadow, amplification), W = 6 windows of M causal frames
 ends spread evenly, a (kind, window) evaluated only if the kind has >= 10 tokens there (typed floor; below it a joint ablation moves almost nothing). D = mean pairwise (1-cos) between the kinds'
 window-pooled shadows (and imprints); NULL = B = 20 draws of form-level label permutation within frequency strata (pseudo-kinds with the same sizes and frequency profile; their joint ablations
 are the matched RAND sets). Passes iff observed D exceeds all 20 null values (p <= 1/21). Specificity per kind: cos(kind shadow, mean pseudo-kind shadow) below the q05 of leave-one-out null cosines.
 Amplification and magnitude likewise. Pooled gold PROPN and NOUN are run through the same RAND procedure as the reference (it must reproduce the cos ~ 0.98 negative; if it does not, say so).
 Which coordinates: per kind, the paired difference to matched controls (Cohen's d) on each coordinate; the top coordinates by pooled |d| are named by SIG_LABELS/ATM_LABELS.
 Fragility vs mention count: per kind the OLS slope of log2(1+magnitude) on log2(mentions of the form in the window); between-kind slope variance vs the frequency-stratified permutation.
 SIMPSON CHECK. Strata S in {gold PROPN, gold NOUN}. pooled effect d_c(S) = mean paired difference (token minus its frequency-matched control) per coordinate; per kind d_c^k over the pairs whose S-token is in
 kind k; bootstrap (B = 500 over pairs) 95% interval. REVERSAL: pooled interval excludes 0, kind interval excludes 0 with the opposite sign. CANCELLATION: pooled interval includes 0 while two kinds have
 intervals excluding 0 with opposite signs. Counts are compared with the same counts under the frequency-stratified label permutation of kinds among S tokens (B = 200); a count is "above chance" iff it
 exceeds the null q95.
 K2 FALSIFIED if T2a (frequency-stratified) and T2b both pass in fewer than half of the verdict languages.
 P4 T2a passes in >= 7 of 10 (largely closed vs open class); on the nominal stratum alone in >= 5 of 10. P5 T2b D passes in >= 6 of 10. P6 (the user's reading) at least one proper-noun-like kind has a
 shadow farther from its matched random set (1 - cos, as a z against the pseudo-kind null) than pooled gold PROPN, in >= 6 of the languages having both. P7 SIMPSON: reversal or cancellation counts
 above chance in >= 3 of 10 languages. P8 mention-count slopes differ between kinds (permutation p <= 0.05) in >= 5 of 10.
K3 kind-conditioning reveals what pooling hides. Same records; label y = gold PROPN (K3a: PROPN stratum + matched controls) ; blocks = 10 position blocks of the sentence index; the learner is
name-war-and-peace.mjs fitLogit / standardise / predict / aucOf / bootDiff with PCA-24 as cvScores does when > 24 columns. Arms (leave-one-block-out): P = pooled signature model; Kd = kind one-hot only
(company information alone: logistic on the leaf one-hot); PK = signature + kind one-hot (pooled, kind as a feature); C = kind-conditioned: one signature model per kind fitted on the training blocks
(>= 30 rows with both classes >= 5, else the pooled fit), its score a logit with intercept, so it carries the kind's prior. Contrasts with block-bootstrap intervals (B = 1000): C - P, PK - Kd (does the
signature add anything to company-kind alone), C - PK (does a kind-SPECIFIC shape add anything to kind as a feature). K3b (which kinds are detectable): per kind with >= 40 members and >= 40 matched
non-members (same log2 stream-frequency bin, drawn from other kinds), the pooled signature model's CV AUC vs the label-permutation (within blocks, B = 100) q95. SESOI 0.03 AUC (bare provisional,
as name-shape). K3 SUPPORTED in a language iff C - PK >= 0.03 with a bootstrap lower bound > 0 AND PK - Kd >= 0.03 with lower bound > 0; K3 FALSIFIED if that holds in fewer than 40% of verdict languages.
 P9 C - P > 0 in >= 8 of 10 (the kind prior carries company). P10 PK - Kd >= 0.03 (lower bound > 0) in <= 3 of 10 (the signature adds little beyond company: consistent with NAME-RULE-RESULTS).
 P11 C - PK >= 0.03 (lower bound > 0) in <= 3 of 10. P12 K3b: at least one detectable kind (AUC > its permutation q95) in every language (closed-class kinds are trivially detectable).
K4 family. Kind structure per language: K* and the number of leaves; per-kind centroid of the centred signature (kind mean minus the language's all-record mean, coordinates standardised with
statistics pooled over all languages); alignment S(A,B) = mean over kinds a in A of the best cosine to a kind of B, averaged with the symmetric term (nearest centroid; kinds with >= 20 records;
min 2 kinds per language). Family schemes (from BRIEF, derived from role-config k-means): 3-cluster SOV-like {fas kor jpn nld hin urd tur}, SVO-A {eng cmn cmn-hans fra por vie ind swe}, SVO-B {spa rus arb heb deu ita pol ukr ell fin}; 2-family
= SOV vs (SVO-A + SVO-B). Statistic: mean S within family minus across, one-sided permutation over family labels of languages (B = 10000). Same for |K*_a - K*_b|. Controls: the same S
with frequency-band partitions of the same sizes in place of kinds (a family effect there would be a frequency artefact) and the random-partition alignment baseline (is cross-language alignment above
random at all). K4 SUPPORTED iff the within-minus-across gap > 0 with p <= 0.05 under the 3-cluster scheme AND under the 2-family scheme AND the frequency-band control does not show it.
 P13 K4 is NOT supported (family effects small: p > 0.05 in the signature alignment and in K*); cross-language alignment of kind signatures is above the random-partition baseline.

WHICH COUNTS AS A FAILURE: any P above whose stated threshold is missed is reported as a failure with the number. If the first-batch result for a claim is weak, the extension languages are reported
separately, never merged in to rescue a verdict.

CONTROLS BUILT TO FAIL: company shuffle (within-sentence) must collapse induced structure (margin <= 0 for the shuffled stream when it is itself the "observed"; checked by running the
procedure on a shuffled stream as if it were the data and requiring K* = 1 in >= 90% of those runs, 10 runs per language); sham joint ablation of zero tokens leaves every record unchanged; determinism
(re-run of one joint ablation reproduces); label-permutation nulls throughout; the frequency-matched pseudo-kinds.

END-OF-PREREG

AMENDMENT 2026-10-06 (dated, appended after END-OF-PREREG; not part of the hash; made before any K2/K3 statistic was read). The machine load average was 60-200, the first rec job (Q=80, PN=250,
about 2200 records per language) had not finished one language in 4 minutes. D3: single-token sample reduced to Q = 40 per leaf and PN = 120 per gold stratum (the coordinator also asked for small samples).
Everything else (thresholds, tests, nulls) unchanged. D1: Simpson intervals are paired-t (d +- 1.96 se) for observed and null counts, not bootstrap. D4: K3b permutations B = 50 instead of 100. A1: the K selection
control also records the best margin of each shuffled run so the observed best margin can be ranked against them (the first control, cmn-hans 0.7 of shuffled runs giving K*=1, failed the 90% criterion; see REPORT).
