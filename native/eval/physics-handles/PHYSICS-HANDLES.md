# Physics handles for the holograph

Written 2026-10-06. Standing: **nomination checked against measurement.** Every number below is computed by code in this directory
from a pre-registration written before the run (headers carry their sha256, `LOG.md` records each one). Where a pre-registered
prediction failed it says so. Nothing here uses a model, a capital, a part-of-speech tag or a treebank label as a feature; gold
(IRC speaker names, the hand-verified War and Peace cast, UD part-of-speech) is used only to stratify or to evaluate. Raw results are in
`results/`; the full ledger of predictions is in `REPORT.md`.

## 0. The short version

| word | operational handle | verdict |
|---|---|---|
| **mass** | the *shadow* of a being: how many slots of the reader's slot structure change when every mention is deleted | **survives as an additive slot count**: shadows of two untouching bodies add (ratio exactly 1.000 in 99.9% of 1,312 pairs); the mentions of one body add exactly from the third mention up (91%); sub-extensive in mentions (slope 0.84, 0.65-1.02), not one law across corpora. Additivity is partly the reader's locality, said below |
| **inertia** | the fragility of a single mention: slot-changes when only that mention is deleted | **metaphor only.** Above the recurrence floor a mention's effect does not depend on how many other mentions the being has (Spearman -0.009, 95% interval -0.029 to 0.009; cross-validated form = constant). Only a *floor cliff* exists (n=2 mentions: 4.2 slot-changes, n=3-4: 2.0, n=1: 0.9) |
| **momentum** | persistence of a being's company direction across successive mentions | **dead.** The company is stationary: real/permuted-order angle ratio 1.000 |
| **density** | mentions per token, or Born share | **metaphor only.** Fragility depends on neither count nor density; nothing for density to control |
| **gravity / attraction** | excess coincidence of a being's company at range d (`attraction.mjs`) | **survives as a measured local attraction** (amplitude 0.25-0.35 at one token, about 0.15 at two, 0.01-0.02 at 65-128), a steep near-field plus a long shallow tail; **the power-law claim with a stable exponent does not survive**: power beats exponential in 65% of corpora (needed 75%), the exponent is not stable across independent folds (rho -0.11), and it is not family-specific |
| **curvature (the warp)** | change of company-distances among *other* words when a being is deleted (`curvature.mjs`) | **metaphor only as a property of beings.** It is the same as deleting any equally frequent word (excess positive for 43-51% of bodies; slope against mass 0.99 vs 0.90 for random words); it falls with distance from the body, but so does pure bookkeeping |
| **warp = gravity?** | partial Spearman of attraction and curvature given mass | **no** (median partial rho -0.06; raw -0.10; reliable attraction measure, split-half 0.31-0.74) |
| **geodesic** | shortest path in the nearest-neighbour graph of company | weak: paths through a body lengthen when it is removed, but the effect is not general (see section 8) |
| **time dilation / presence decay** | `kernel/activation.js` | **not a clock for beings.** Every key decays at the same rate; the measured window is the ladder's ceiling in 100% of cells; a code defect (off-by-one) makes a continuously present key never decay; the burst memory of recurring words is exponential, with no mass dependence established |
| **energy / conservation** | slot count, total activation | **nothing conserved.** A deletion empties 1.18 slots and creates 0.02 (typically one relation edge, 3 slots, lost, none born). Total activation obeys a leaky-integrator balance (steady state = tokens-per-tick x window) but the per-key sum does not equal it (the defect) |
| **equivalence principle** | inertial rank (-fragility) against attraction energy (and curvature) | **not established, nearly independent**: partial rho 0.11 (0.03-0.20) with attraction energy, needed 0.30; curvature version **not tested** (first-half curvature runs unfinished) |
| **affect** | slots changed by deleting a being | **survives as an operational statement.** 70% of mentions of a being with 3+ mentions change at least one slot; 54% of the change is on slots the being did not occupy; 94% is at slot-graph radius 1 (the same relation); only 2% is in the referent index |
| **void / ground** | the null ensemble and its band | **survives as "the reference you subtract"**: all shuffled nulls sit inside their band by construction; the vacuum is *not* pure counting noise (band shrinks with corpus size at slope -0.14 to -0.35, not -0.5) |

Words to drop as physics (keep as poetry if wanted): **inertia, momentum, density, time dilation, Schwarzschild horizon, conservation of slots, "warp is gravity".** Words that earn a physical reading: **mass (as additive shadow), attraction (local company), affect (typed shadow), void (null band).**

## 1. The instruments and what they must not depend on

* **Shadow of a deletion** (`reader-handles.mjs`, on `eval/law/impact.mjs`): re-read a prefix window of M sentences (128; 256 messages for IRC) with a set of tokens deleted, null ceiling held fixed, align slots by structure, count slots whose filler changed (emptied, retyped, rebound, refilled; `shifted` ordinal moves and `born` slots are separate). Units: slot-changes. Frame-causal: nothing after the window end is read. Invariant to case (lowercased stream); not invariant to language (mean single-mention shadow 1.2 in War and Peace, 2.9 in Japanese) or to window size.
* **Attraction** (`attraction.mjs`): the excess coincidence D_b(d) of the tokens at lag d around the mentions of body b, minus random placement of b; amplitude a(d) = sqrt(D). Unbiased at any sample size (the first estimator, total variation, saturated and failed its power check; see REPORT.md). Units: a distance between two word distributions. Lags in word units.
* **Warp** (`curvature.mjs`): a cosine geometry on the 250 most frequent word types built from adjacent company (two words each side), rebuilt with a body deleted. Units: cosine distance per pair.
* **Presence** (`kernel/activation.js`): `createActivation` / `dmdWindow`, used as shipped.

All three are zero-model and deterministic (K2 checks: reruns identical). A sham ablation (delete nothing) changed no slot in 1,500 snapshots of 10 corpora and no distance in any corpus.

## 2. Mass

**(a) Definition.** m_shadow(b) = S(all mentions of b in the window): the number of substantive slot-changes. Other candidates computed beside it: mentions n; activation (kernel); Born share a_b^2 / sum a^2 (the repo's born mode applied to the window activation); slots filled. Units: slot-changes (shadow, slots), mentions (n), discounted mentions (activation), a share (Born).

**(b) Laws the metaphor implies.** (i) *Additive*: deleting two bodies that do not touch changes S(A) + S(B). (ii) *Additive over mentions*: S(whole body) = sum of the one-mention shadows. (iii) *Extensive*: S proportional to n. (iv) *One definition*: the same relation in every corpus.

**(c) Falsifiers (registered before the run).** (i) slope of S(A+B) on S(A)+S(B) outside [0.85, 1.15], or an informativeness control (replace S(B) by a random other body of the same count: R^2 must drop by 0.10) that does not discriminate; (ii) super-additive was *predicted* (a being is more than the sum of its mentions): predicted ratio above 1.15; (iii) slope of log S on log n with interval excluding 1; (iv) heterogeneity Q across corpora with p < 0.05.

**(d) Verdict.**
* (i) **holds.** Far pairs (no shared sentence), 1,312 pairs: slope 1.000 (interval 1.000-1.000), median ratio 1.000, exactly additive in 99.9%. The control passes (R^2 of the true sum 1.00 against 0.54 for a wrong sum: gain 0.46). Near pairs (sharing a sentence), 1,331: slope 0.983 (0.978-0.988); 83.7% exactly additive, 12.4% sub-additive, 3.9% super-additive. The registered prediction that near pairs have a lower median ratio than far pairs **failed** (both medians 1.0; the difference shows only in the tails).
* (ii) **failed as predicted, and what was found is different.** Mentions of one body: from n = 3, 91% exactly additive (whole 6.2 slot-changes, sum of parts 6.4); at n = 2 it is *sub*-additive (whole 4.5 against 9.5: each single deletion crosses the readers' recurrence floor of two and empties the same body; the joint deletion empties it once). So the being is the sum of its mentions, except where the floor makes the two mentions one event.
* (iii) **sub-extensive.** Pooled slope of log shadow on log n = 0.84 (standard error 0.015); per corpus 0.65 (War and Peace) to 1.02 (German); extensive (interval contains 1) only for German.
* (iv) **not one law**: heterogeneity Q = 64.5 on 8 degrees of freedom, p < 0.0001. Rank correlations among the candidate masses fall in two blocks: *count-like* (n, activation, Born: 0.84-0.99 with each other) and *structure-like* (slots, shadow: 0.88-0.93), with 0.43-0.70 between blocks. The defect in `activation.js` (section 9) is one reason activation behaves like a count.

**What this does and does not mean.** The shadow is a measure over the reader's slots; the reader's relation extractor is local (93.6% of collateral change is at slot-graph radius 1), so additivity across bodies is partly a property of the instrument. It is still a real, falsifiable regularity: it could have failed (the near-pair tail shows it can) and it would fail for a reader that bound slots globally. The one global element, the recurrence floor, is exactly where additivity breaks (n = 2).

## 3. Inertia

**(a) Definition.** phi(m) = S({m}) for a single mention m; inertia is "phi small". Units: slot-changes per mention. The being-level quantity (mean phi over the mentions of a body) is used in section 11.

**(b) Law.** A being with more mentions resists deletion of one: phi decreasing in n. Functional form to be *derived* (constant, power law, exponential) by cross-validated Poisson deviance.

**(c) Falsifier.** Spearman(n, phi) for n >= 3 with a block-bootstrap interval not below -0.05, pooled and in 60% of corpora. (The floor effect at n = 2 is excluded: a single deletion there crosses the reader's floor, a threshold event, not inertia.)

**(d) Verdict: falsified.** n >= 3, 10,714 single deletions in nine licensed corpora (Hindi fails the licence, share changed 0.13): pooled Spearman -0.009 (-0.029 to 0.009); negative only in Persian (-0.156) and Japanese (-0.116). Cross-validated Poisson deviance: constant 2.2946, power 2.2948, exponential 2.2949; fitted exponent 0.007 (-0.008 to 0.029). Mean slot-changes by n: 0.91 (n = 1), 4.17 (n = 2), 1.99 (3-4), 1.90 (5-9), 1.82 (10-19), 2.00 (20+). The **floor cliff** is real: n = 2 over n = 3-4 = 2.09 (predicted at least 2). The effect does not decay with the age of the mention (1.93, 1.96, 1.98, 2.00 for ages 0-31, 32-63, 64-95, 96-127 sentences; exploratory) and barely changes when the window is scrambled inside sentences (1.86 against 1.94): the single-mention effect is a count of relation edges the token sits in, not a company effect.

So the untested hypothesis from the name-rule work ("a heavily mentioned being barely moves when one mention goes") is true only in *relative* terms: a single mention is a fraction of the being's whole shadow about 1/n (mean 2.0 of 6.2 at n = 3), which is additivity again. There is no resistance beyond arithmetic. Consequence for the War and Peace null (AUC 0.51): within exact n, gold names are not more fragile than other words there (AUC 0.53, 0.50-0.59); likewise UD PROPN (0.48-0.57). **IRC is different and the registered prediction failed**: within exact n, nicknames are more fragile in the referent-entry slots than other words (AUC 0.81, 0.74-0.90, against 0.92 raw), so the 0.84 of the earlier test is not a count effect.

## 4. Momentum

**(a)** Persistence ratio R = mean angle between company vectors of successive blocks of eight mentions, real order over random order (20 permutations), bodies with 24+ mentions; and J(n), the angle between the vector from the first n and the first n+1 mentions. **(b) Law:** a being has a velocity in company space (R below 1) that is a property of the being (split-half reliability), and an impulse law. **(c) Falsifier:** R interval not excluding 1; reliability below 0.30. **(d) Verdict: dead.** Median R = 1.000 (interval excludes 1 in 1 of 11 corpora), median split-half reliability 0.07; the log-log slope of J(n) is -0.65, the arithmetic of a running mean. A being's company is stationary in text time (11 corpora with at least 40 bodies; irc, wp, jpn runs unfinished at writing).

## 5. Density

**(a)** rho = n / (tokens in window); Born share. **(b) Law:** what controls fragility is mass per window, so fragility collapses on rho across window sizes M, M/2, M/4. **(c) Falsifier:** rho (or Born share) beats n by 2% of cross-validated deviance. **(d) Verdict:** no corpus has density winning (0 of 9), but the reason is that nothing beats the constant: deviance 2.2522 (n), 2.2520 (rho), 2.2419 (Born), 2.2516 (constant). There is no variable for density to control. Drop the word, or use it only for the descriptive "mentions per hundred tokens".

## 6. Gravity (attraction)

**(a) Definition.** For a body with at least 8 mentions: A_b(d) = excess coincidence of its company in eight dyadic lag bins (1, 2, 3-4, 5-8, 9-16, 17-32, 33-64, 65-128 tokens) on each side, inside the document, against random placement of the same mentions (`attraction.mjs`); a(d) = sqrt(pooled D). The sentence-scale version is the burst kernel L(d), the observed over expected number of sentence pairs both containing the body, minus 1. Units: a(d) is a distance between word distributions; L(d) a ratio.

**(b) Law implied.** a(d) ~ d^-alpha with alpha stable across corpora (a property of language), possibly different by word-order family; the null (random placement) has no law; a within-sentence shuffle destroys the near-field; a sentence-order shuffle destroys the far-field.

**(c) Falsifiers.** Power law must beat exponential (dAIC at least 4, in 80% of bootstrap resamples) in 75% of corpora (falsified below 50%); alpha across independent folds Spearman at least 0.6 and median difference at most 0.15; family permutation p at most 0.05 on both folds (the user's belief); null controls behave as stated.

**(d) What was measured** (33 corpora: 24 languages on two held-out folds, Ubuntu IRC, NUS SMS, CoSEM Singlish chat, War and Peace; the estimator passed its planted-law power check at 10^4 or more mentions, REPORT.md section 3).
* The attraction **exists** and is strong: pooled amplitude about 0.25-0.35 at one token, 0.15-0.18 at two, 0.06-0.10 at three to four, then 0.05 to 0.01 out to 128 tokens (informal English: IRC 0.268, 0.151, 0.080, 0.047, 0.029, 0.019, 0.013, 0.012). At least 6 of 8 bins above the null band in 24 of 33 corpora (73%; needed 90%: the shorter UD slices lose their far bins).
* **The form.** The shape is a steep local part and a long shallow tail (War and Peace has a plateau; the old PPMI prototype saw the same). Power beats exponential in 20 of 31 fitted corpora (65%): neither the 75% needed to survive nor the under-50% that falsifies. Median amplitude exponent 1.14 (quartiles 0.90-1.42), outside the predicted [0.2, 1.0]. The large informal corpora fit cleanly: IRC 0.80 (0.78-0.84), SMS 0.66 (0.62-0.70), CoSEM 0.82 (0.74-0.98); formal English fold B 0.86 (0.78-0.94), fold A 1.42 (and there the exponential wins: only 4 bins above band).
* **Stability: failed.** Across the 13 languages that are powered and fitted on both folds, Spearman(alpha_A, alpha_B) = -0.11; median difference 0.22; across all 21 fitted on both, 0.13. The exponent is not a stable constant of a language at these sizes.
* **Family: not shown.** alpha permutation p = 0.039 (fold A, 13 languages) and 0.73 (fold B): not on both folds. The left/right asymmetry at the first two lags (right minus left over their sum): strict-SVO-like -0.18, freer-order -0.22, SOV-like -0.02 (means over both folds), permutation p = 0.18 on fold A and 0.045 on fold B: suggestive (SOV languages are more symmetric), not confirmed. By family mean alpha: 1.15, 1.02, 1.11.
* **Nulls.** Random placement: inside the band by construction (and the planted check returns the typed gap on null text 10/10). Within-sentence shuffle: near-field ratio median 0.02, far-field 0.98. Sentence-order shuffle: near 1.00, far 0.01. The instrument responds exactly to the structure it claims to measure (the registered "75% of corpora" rule narrowly fails for the first, 24/33, because of short slices).
* **Not a constant G.** Spearman(n, attraction at one token) has median -0.12 and is negative with interval below 0 in 21 of 33 corpora (needed two thirds): per-neighbour pull is weaker for frequent bodies; the coupling is a property of the body.
* **Sentence-scale burst: exponential, not power.** The power law wins in 2 of 21 corpora with a fit; the time constant is 3-10 sentences in chat and treebank slices, about 30-36 in IRC and War and Peace; `ud-fra-A` (sentences not in discourse order) has L(d) = 0 at every lag, a natural no-discourse control.

**Verdict.** Gravity as a *local attraction of company with distance* **survives** (large, controlled, instrument-validated). Gravity as a *power law with a universal or family-specific exponent* **does not survive**: it is a two-component curve whose exponent is not stable between samples.

## 7. Curvature (the warp) and the question whether warp is gravity

**(a) Definition.** C(b) = mean absolute change of company-distance among the other 247 high-frequency words when b is deleted and the geometry rebuilt (cosine on adjacent company); controls: matched random deletion (two words of the nearest frequency), column drop (bookkeeping), unseen placeholder (sham, exactly 0). Units: cosine distance per pair.

**(b) Laws.** (1) a being warps beyond its count; (2) the warp scales with mass; (3) it falls with distance from the being; (4) warp and attraction are one quantity.

**(c) Falsifiers.** (1) excess over matched-random positive for at least 60% of bodies in at least 60% of corpora (falsified if the share is 40-60%); (4) partial Spearman of attraction energy (even-numbered mentions) and warp (odd-numbered mentions deleted) given log n at least 0.30, above a deranged control by 0.15, collapsing on the scrambled corpus, repeating across folds.

**(d) Verdict (11 corpora with at least 40 bodies: UD eng, spa, deu, hin, fra on both folds, tur fold B; irc, wp, jpn had not finished).** (1) **falsified:** share of bodies whose warp exceeds a matched random word's is 0.43-0.51, median 0.48. (2) Slope of log C on log n 0.99 for deletion and 0.90 for random words. (3) falls with distance in 8 of 11 corpora (needed 75%) and the same holds for the column drop. (4) **warp is not gravity:** median partial rho -0.06 (range -0.17 to +0.10), raw -0.10, scrambled-corpus partial 0.02; the attraction measure is reliable (split-half Spearman 0.31-0.74) so the null is informative. They measure different things: C is driven by count (Spearman with log n 0.77), the attraction energy is not (-0.10).

**My verdict on whether warp and gravity are one quantity: no, under these definitions.** The user's suspicion that warp is gravity is not supported: the warp is the arithmetic of removing that many tokens (it does not exceed a matched random word's), and given mass it does not correlate with attraction (partial -0.06, with a reliable attraction measure). It remains possible under a different geometry (the slot graph, not company vectors), see next experiments.

## 8. Geodesic / path of least resistance

**(a)** Shortest paths in the k-nearest-neighbour graph of the 250 targets (k the smallest connecting k); bending = change of geodesic for pairs whose original shortest path runs through the body; betweenness = share of pairs through it. **(d)** paths through a body lengthen by about 0.2-1.0 in cosine distance when it is removed against about 0 for other pairs, but "through longer than other" holds per body in only 27% of corpora at the 75% rule; betweenness rises weakly with mass (Spearman 0.24) and is unrelated to attraction given mass (-0.04). Verdict: **weak / not general**; nothing here needs the word.

## 9. Presence decay, time dilation: is `activation.js` a clock?

**(a) Definition.** Each observation is one tick; key activation = value x gamma^(ticks since), gamma = 1 - 1/window; the window is meant to be measured by `dmdWindow` (the shallowest depth at which dropping older material changes no conclusion). **(b) Law implied:** presence decays at a rate the material sets, and heavier bodies age more slowly (dilation).

**(d) Verdict.** *No body-dependent rate exists in the code:* after the input stops every key decays by the same factor (spread 4e-16). *The measured window is a ceiling:* for the cast conclusion (listening-cast `deriveCast`), in 150 windows per corpus the window found is always the top candidate or a gap (58-85% gaps); in 24 of 24 (corpus, grouping) cells of the tick-invariance test it is the ceiling, so it is a count of observations, not a duration. *A code defect:* `observe()` stamps a cell at t = now + 1 but decays the old value only to `now`, so a key observed on consecutive ticks is never decayed (activation 400.0 after 400 consecutive ticks where the leaky steady state is the window, 8 for window 8); keys observed once decay correctly, and the sum over keys of `activationOf` does not equal `total`. (Not edited; reported.) *Burst memory is exponential:* the sentence-scale clustering decays as exp(-lag / lambda), lambda 3-36 sentences; whether lambda grows with mass is inconclusive (15 of 33 corpora at most 0.3, 10 at least 0.5). So "presence decay is a clock" is **only a metaphor** for beings: it is a leaky integrator with one global rate, whose rate for the cast conclusion is not measured.

## 10. Energy and conservation

Slots: a deletion empties 1.18 slots on average (n >= 3) and creates 0.02; at n = 1, 0.45 and 0.07. Among deletions that change anything by emptying or birth the median net is -0.75 (three slots emptied, none born: one relation edge lost). The registered conservation rule (median of (born - emptied)/(born + emptied + 1) within +-0.2) is **met only vacuously** (median 0 because most deletions empty nothing); my prediction that the median would fall below -0.2 **failed**, the mean is -0.27. Deletion is dissipative. Total activation: steady state s x window (within 1%) and a balance input - decay, an accounting identity of a leaky integrator, not a conservation law of language. The Born normalisation is bookkeeping. **No conserved quantity was found.**

## 11. The equivalence principle

**(a)** Inertial rank = rank of -(mean single-mention shadow of the body, n >= 3); gravitational masses measured on the *first* half of the same document, reader windows in the *second* half: attraction energy E_b and curvature C_b. **(c) Falsifier:** pooled partial Spearman given log n at least 0.30 (interval lower bound above 0.10, above a deranged control by 0.15, positive in 60% of corpora); falsified if the interval includes 0; power gate: split-half reliability of fragility at least 0.20. **(d) Verdict: not established, nearly independent.** Wave 1, eight corpora (IRC excluded), 572 bodies: reliability of fragility 0.60 (gate passed); partial Spearman of -fragility and attraction energy given log n = **0.114** (95% interval 0.029 to 0.204), deranged-control 95th percentile 0.064, positive in 6 of 8 corpora, slope of z on z 0.108, spread 0.994 (a body's inertial rank explains about 1% of its gravitational rank). The curvature version needs the first-half curvature runs, which had not finished at writing (**not tested**). So the equivalence principle does not survive at the registered 0.30 and is not falsified at 0: inertial resistance and attraction are almost independent properties of a being. My prediction (within +-0.10 of zero) narrowly failed.

## 12. "Affect"

Operationally: a body affects the holograph where deleting it changes the typed slot structure of the prefix window it appears in; the effect has a probability, a size, a location in the slot graph, and a share on slots it did not itself fill. For n >= 3 (10,714 deletions): P(at least one slot changes) 0.70, mean 1.9 slot-changes; 54% of changed slots are collateral (interval 53.3-54.5%); by slot-graph radius, 93.6% at radius 1 (probability 0.065 per slot), 2.7% at radius 2, 1.8% unreachable (company-mediated); only 1.9% of changed slots are in the referent index (entry family). Registered prediction (collateral share at least 0.5) **held**. The reader's field of influence is overwhelmingly the relation the token sits in. The reader's collateral change probability falls with token distance as r^-1.52 (interval 1.38-1.69) beyond two tokens (power beats exponential in 9 of 9 corpora, dAIC 13-21), but this "force law" is the locality of the relation extractor; at 33+ tokens the excess is of the order 1e-4 per slot. The registered per-corpus monotone fall failed (3 of 9). A first mention is invisible to a causal read (earlier result); the effect of a first mention lives in the future field, which this work did not re-measure.

## 13. The void (ground)

Operationally the ground of any observable is the distribution of that observable under the matched shuffle (random placement; within-sentence and sentence-order shuffles are the *partial* grounds). The figure is the departure from it; "the void must stay empty" is the requirement that the null mean is zero and the band known. Checks: every null mean is inside its band; the planted check returns no law on null text 10/10 and recovers planted exponents 0.5/1.0/1.5 at scale; the band is **not** pure counting noise: on three corpora it shrinks with corpus size at slope -0.24 (formal English), -0.35 (IRC) and -0.14 (War and Peace), not the -0.5 registered (-0.65 to -0.35). The vacuum has structure that does not average away; that is a finding about the ground, not a reason to drop the word.

## 14. The shape question (name-shape.mjs, run by the user's other session)

`eval/law/results/name-shape/_report.json` (25 stems, finished; read, not touched): the shape of deleting all proper nouns **does not exist in the form tested** (their verdicts: shapeExists false, familySpecific false): the PROPN hole differs from a random equal-frequency hole in 1 of 20 informative languages; T3 mean AUC 0.545 (4 of 24 at least 0.60); same-family cosine 0.904 against 0.894 different-family (p 0.16); imprint and collateral shapes not family-specific (p 0.90, 0.21); amplification of deleting PROPN is *lower* than deleting equally frequent words (2.42 against 2.80; higher in 4 of 25). This agrees with the single-mention results here (UD PROPN within-n AUC about 0.5) and with the family tests of attraction. What survives of the shape idea is IRC: nicknames, a register where names are addressed, keep a within-count signature (0.81). The user's belief (shape specific to word-order families) is **not supported by name-shape, nor by the attraction exponent here; weakly suggested only by the left/right asymmetry of attraction (SOV more symmetric)**.

## 15. Defects and limits found along the way

* `kernel/activation.js` observe() decay off-by-one (section 9). Not edited.
* My first attraction estimator (total variation) failed its own planted-law check (saturation), the second (bin-selected log fit) was biased for steep laws; both were fixed without changing thresholds (REPORT.md section 3).
* IRC could not be used for the equivalence test: reader windows and half-run gravity/curvature used different channel-days (design gap).
* Hindi failed the reader licence (share of single deletions changing a slot 0.13).
* UD word segmentation of Chinese and Japanese is the treebank's, not the ear's.
* Corpora: UD slices are held-out folds of train treebanks (not the spent test splits).
