# Physics of the holograph: report (2026-10-06)

## Summary in plain language

We asked whether the physical words used about the holograph (mass, inertia, gravity, density, warp, energy, time) can be made into
quantities a program measures, and whether the laws they imply survive attempts to break them. No model, capital letters or grammar
labels were used; rules were written before each run.

**Survives.** *Mass*, as an additive count: the reader slots that change when you delete a being. Two beings that do not touch add
exactly (ratio 1.000 in 99.9% of 1,312 pairs); a being's mentions add exactly from the third up; the total grows a little slower
than the mention count (power 0.84), and not by one law everywhere. *Attraction*: words keep company with a being at a measurable
strength that falls steeply with distance (0.25-0.35 at one token, 0.15 at two, 0.01-0.02 at 65-128). Scrambling inside sentences
kills the near part (ratio 0.02); scrambling sentence order kills the far part (0.01). *Affect*: 70% of mentions of a recurring being
change at least one slot; about half of the change lands on slots the being did not occupy; 94% is in the same relation.

**Does not survive.** *Inertia*: from three mentions up, one mention's effect does not depend on how many others the being has
(rho -0.009); only a cliff at two mentions (the recurrence floor) exists. *Density*, *momentum* (a being's company is stationary),
*time dilation* (every key decays at one rate; the measured window is the ladder's ceiling every time), *conservation* (a deletion
empties 1.18 slots, creates 0.02). The attraction is not a power law with a stable exponent: power beats exponential in 65% of
corpora, the exponent does not repeat across two independent folds (rho -0.11), it is not family-specific, and sentence-scale
clustering is exponential.

**Is the warp gravity?** Not as defined here. The warp (how far other words' mutual distances move when a being is removed) is
indistinguishable from removing any equally frequent word, and given mention count it is uncorrelated with the attraction the same
being exerts (partial rho about -0.06; attraction measured reliably, 0.3-0.7). Inertial and gravitational mass are weakly related
at best (partial rho 0.11, interval 0.03 to 0.20).

**Also found.** `kernel/activation.js` never decays a key seen on consecutive ticks (off-by-one). Two of my own estimators failed
planted-law checks and were fixed before use. The user's other session found no name-specific shape; neither did this work, except
for IRC nicknames.

## 1. What was defined and tested

| experiment (file) | corpora | unit of evidence | header sha256 (first 12) |
|---|---|---|---|
| reader handles: mass additivity, inertia, density, horizon, reader force law, conservation, affect (`reader-handles.mjs`, report `reader-report.mjs`) | wave 1: Ubuntu IRC (3 channel-days), War and Peace, UD held-out fold A of eng fra spa deu hin fas tur jpn; 150 snapshot windows each (M = 128 sentences, 256 messages for IRC); about 14 single deletions, 2 pairs, 1 whole-body and mention-by-mention read per window; wave 2 (replication: UD fold B, new IRC days, shifted War and Peace grid) running | slot-changes in the real prior-free readers (`eval/law/impact.mjs`) | 7af658b90aae |
| attraction / gravity, burst clock, vacuum (`gravity.mjs`, `attraction.mjs`, `gravity-report.mjs`) | 25 UD stems on two held-out folds (cmn-hans excluded from across-language statistics), IRC (6 days), SMS, CoSEM, War and Peace: 33 corpora | excess coincidence of company | c5d29e2ac02c |
| curvature, geodesic, warp vs gravity, momentum (`curvature.mjs`, `curvature-report.mjs`, `reliability.mjs`) | irc, wp, UD folds A and B of 8 languages | cosine geometry of adjacent company | 56f4c0fc6c13 |
| clock and energy (`clock-energy.mjs`) | synthetic plus 8 corpora | `kernel/activation.js` as shipped | see LOG.md |
| equivalence (`equivalence.mjs`) | 8 corpora (IRC excluded: design gap) | per-body join of the above | see LOG.md |
| planted-law power check (`plant.mjs`) | synthetic, 10 seeds x 5 modes, two scales | estimator validation | c1e70a3659 / 08438495de |

Definitions, units and invariances for each concept are in `PHYSICS-HANDLES.md`. Gold (IRC speaker names, hand-verified War and
Peace cast, UD part-of-speech) only stratifies or evaluates. UD slices are the held-out `fold80`/`fold80B` tails of train treebanks;
no spent test split was read. Everything about reading is prefix-only; text is lowercased.

## 2. Controls built to fail, and what they did

* **K1 sham** (delete nothing): 0 slot changes in 1,500 reader snapshots (10 corpora) and 0 distance change in every curvature corpus.
* **K2 determinism**: reruns identical in every checked case.
* **K3 informativeness** of the additivity test (replace one shadow by a random other body of the same count): R^2 falls from 1.00 to
  0.54, gain 0.46 (needed 0.10): the test can tell a real sum from a wrong one.
* **K5 licence**: 9 of 10 reader corpora change a slot in at least 20% of n >= 3 deletions; Hindi (0.13) fails and enters no verdict.
* **Planted laws** (`plant.mjs`): the estimator *failed* twice and was fixed before any real corpus. Run 1 (plug-in total variation):
  recovered planted exponents 0.5 / 1.0 / 1.5 in 0 / 6 / 2 of 10 seeds (it saturates at small samples). Run 2 (unbiased excess
  coincidence, log fit on bins above the band): 10 / 4 / gaps (selection of bins above the band biases steep laws). Run 3 (weighted fit
  on all bins): unbiased (means 0.52, 1.07, 1.42) but at 2,400 mentions precision about +-0.2, so V1 failed as registered. Run 4,
  the same check at 9,600 mentions (added before running, thresholds unchanged): VALID, 10/10, 10/10, 8/10, exponential 10/10, null
  10/10 returns no law. Exponents from corpora under 10^4 mentions are labelled underpowered.
* **Nulls** (gravity): random placement inside its band by construction; within-sentence shuffle and sentence-order shuffle move the
  curve exactly where predicted (medians near 0.02 / 0.98 and 1.00 / 0.01).

## 3. Ledger of pre-registered predictions (failures included; thresholds never changed after a result)

### 3a. Reader handles (wave 1, 9 licensed corpora; wave 2 replication still running, see section 7)

| id | prediction | outcome |
|---|---|---|
| MASS-ADD | far pairs additive: slope and median ratio in [0.85, 1.15] | **held**: slope 1.000, ratio 1.000, 99.9% exact (n = 1,312) |
| P1 | near pairs have a lower median ratio than far | **failed**: both 1.0; near differs only in tails (12.4% sub, 3.9% super) |
| P2 | mentions of one body super-additive (ratio above 1.15, n = 2-3) | **failed**: sub-additive at n = 2 (whole 4.5, parts 9.5, median 0.46); exactly additive at n = 3 (91%) |
| P3 | log-shadow slope on log n below 1, not the same across corpora | **held**: 0.84 (se 0.015); 0.65 to 1.02; Q = 64.5, p < 0.0001 |
| I1 / P6 | Spearman(n, fragility) < 0 for n >= 3, pooled and in 60% of corpora | **failed**: -0.009 (-0.029, 0.009); 2 of 9 corpora negative |
| P7 | CV-selected form a power law, exponent 0.3-1.5 | **failed**: constant selected (deviance 2.2946 vs 2.2948); exponent 0.007 (-0.008, 0.029) |
| P4 | floor cliff n = 2 over n = 3-4 at least 2 | **held**: 2.09 (4.17 vs 1.99); n = 1: 0.91 |
| P5 | IRC name AUC within exact n at most 0.60; War and Peace 0.45-0.55 | **IRC failed** (0.81, 0.74-0.90); War and Peace held (0.53) |
| P8 | n beats density | **held trivially**: n, rho, Born, constant all within 0.5% deviance (nothing to control) |
| P9 | horizon H_slot tracks H_cast recency, rho at least 0.6 | **failed**: 0.50 (0.48-0.53) |
| P10 | no mass scaling of the horizon (partial < 0.2) | **held**: -0.07 (-0.22, 0.09); H_slot falls with n (-0.25); 80% of sampled bodies have an empty conclusion (inert) |
| P11 | collateral change probability falls monotonically with distance in 60% of corpora | **failed**: 3 of 9 (pooled -0.94; per-corpus noisy at the shortest lags) |
| P12 | power beats exponential in 60% | **held**: 9 of 9, exponent 1.52 (1.38-1.69), dAIC 13-21 |
| P13 | scrambled-window far excess at most half the real | **held, noisy**: 6 of 9 |
| P14 | conservation rule fails (median net below -0.2) | **failed as predicted direction**: median 0 (rule satisfied vacuously); mean -0.27; emptied 1.18 vs born 0.02 |
| P15 | collateral share of change at least 0.5 | **held**: 0.539 (0.533-0.545) |
| K5 | readers not deaf (>= 20% of n >= 3 deletions change a slot) | 9 of 10 pass; Hindi fails |

### 3b. Attraction, burst clock, vacuum (`gravity.mjs`; 33 corpora)

| id | prediction | outcome |
|---|---|---|
| PG1 | >= 6 of 8 bins above null band in 90% of powered corpora | **failed**: 24 of 33 (73%) |
| PG2 | power law survives (>= 75%); median exponent in [0.2, 1.0] | **not established**: wins in 20 of 31 (65%, falsified only below 50%); median 1.14 (0.90-1.42), outside range |
| PG3 | exponent stable across folds (rho >= 0.6, median |diff| <= 0.15) | **failed**: rho -0.11 (13 powered languages), median diff 0.22; all 21: 0.13 |
| PG4 | exponent not family-specific; left/right asymmetry is, on both folds | **exponent: held** (p 0.039 / 0.73); **asymmetry: not on both** (p 0.18 / 0.045) |
| PG5a | within-sentence shuffle: near ratio <= 0.5, far >= 0.75 in 75% | **narrowly failed by count** (24 of 33); medians 0.02 and 0.98 |
| PG5b | sentence-order shuffle: far <= 0.5, near >= 0.75 in 75% | **held** 26 of 33; medians 0.01 and 1.00 |
| PG6 | per-neighbour pull weaker for frequent bodies, interval below 0 in two thirds | **direction held, count failed**: median rho -0.12; 21 of 33 |
| PG7 | burst kernel above band in 6 of 12 lags and power law | **failed**: above band 61%; power wins in 2 of 21: exponential (lambda 3-36 sentences) |
| PG8 | no time dilation (rho(n bin, reach) <= 0.3 in 60%) | **failed / inconclusive**: 15 of 33 at most 0.3; 10 at least 0.5 |
| PG9 | vacuum band slope in [-0.65, -0.35] | **failed**: -0.24 (eng), -0.35 (IRC), -0.14 (War and Peace) |

### 3c. Clock, energy, equivalence

| id | prediction | outcome |
|---|---|---|
| PE1 | activation: sum over keys equals total; steady state s x window; same decay for all keys | **failed on identity (code defect)**; steady state and same-decay held |
| PE2 | cast-based dmdWindow is a ceiling or gap | **held**: 24 of 24 cells; in the reader 58-85% gaps, found windows always the top candidate |
| EQ0 | split-half reliability of fragility at least 0.20 | **passed**: 0.60 (456 bodies with 4+ samples) |
| PQ1 | equivalence fails: partial rho within +-0.10 | **narrowly failed (small positive)**: attraction energy 0.114 (0.029, 0.204), deranged q95 0.064, positive in 6 of 8 corpora |
| PQ2 | slope of z(-fragility) on z(gravitational mass) below 0.15 | **held**: 0.108, spread 0.994 |

## 4. Surviving handles, with measured constants

| handle | definition (code) | measured | confidence |
|---|---|---|---|
| **shadow mass** | slots changed by deleting all mentions of a body (`reader-handles.mjs`) | additive over untouching bodies: slope 1.000 (1.000-1.000), n = 1,312; additive over mentions for n >= 3 (91% exact); extensive exponent 0.84 (se 0.015), per corpus 0.65-1.02 | block bootstrap over 1,350 snapshots; wave-2 replication pending |
| **floor cliff** | mean one-mention shadow at n = 2 over n = 3-4 | 2.09 (4.17 vs 1.99); n = 1: 0.91; flat 1.8-2.0 from n = 3 to 20+ | 10,714 deletions at n >= 3 |
| **local attraction** | amplitude a(d) = sqrt(excess coincidence), 8 lag bins (`attraction.mjs`) | one token 0.25-0.35, two tokens 0.15-0.18, 65-128 tokens 0.010-0.017; informal English local exponent (fit over 8 bins) IRC 0.80 (0.78-0.84), SMS 0.66 (0.62-0.70), CoSEM 0.82 (0.74-0.98), formal English fold B 0.86 (0.78-0.94) | planted-law validated at >= 10^4 mentions; body bootstrap |
| **two-source structure** | near ratio / far ratio under within-sentence and sentence-order shuffles | near 0.02, far 0.98 (within-sentence); near 1.00, far 0.01 (sentence order); medians over 33 corpora | instrument responds as designed |
| **burst memory** | sentence-lag clustering kernel L(d) (`gravity.mjs`) | exponential, lambda about 3-10 sentences (chat, treebank slices), 30-36 (IRC, War and Peace); `ud-fra-A` (no discourse order) L = 0 | power law wins in 2 of 21 |
| **affect profile** | typed slot change by radius and direction | P(at least one slot) 0.70, 1.9 slot-changes; collateral 0.539 (0.533-0.545); radius 1: 93.6%; entry family 1.9% | 10,714 deletions |
| **reader locality law** | collateral change probability by token distance | r^-1.52 (1.38-1.69) beyond two tokens, power beats exponential 9/9; but 94% of change is in the same relation (the extractor's locality) | pooled bootstrap over snapshots |
| **IRC nickname signature** | within-n AUC of entry-slot change, nicknames vs other words | 0.81 (0.74-0.90); War and Peace 0.53, UD PROPN 0.48-0.57 | block bootstrap |

Constants that are **not** stable and should not be quoted as constants: the attraction exponent (21-language fold agreement
rho 0.13, median disagreement 0.22), the extensivity exponent (heterogeneous), the vacuum slope.

## 5. Dead or unsupported metaphors

* **Inertia** (heavier = harder to change): fragility is flat in mention count above the floor. Only the *relative* effect of one
  mention falls as about 1/n, which is additivity.
* **Momentum**: persistence ratio 1.000; reliability 0.07; the only impulse law is the arithmetic of a running mean (J(n) slope
  -0.65, about -1 for pure averaging; stationary company).
* **Density** as the controlling quantity: fragility depends on neither n nor n/L nor Born share (all within 0.5% of the constant).
* **Time dilation / a clock in `activation.js`**: no body-dependent rate exists; the cast `dmdWindow` is the ceiling in all cells;
  an off-by-one prevents consecutive-tick keys from decaying.
* **Schwarzschild-type horizon** (range grows with mass): partial -0.07 (-0.22, 0.09); the horizon of a body falls with its mention
  count (rho -0.25) and 80% of bodies have no conclusion to change.
* **Conservation of slots or of anything else**: deletion is dissipative (1.18 emptied, 0.02 born).
* **The warp as a property of beings**: see section 5a below once curvature is final.
* **A power-law gravity with a universal / family-specific exponent**: not supported (stability rho -0.11; family p 0.039/0.73).
* **A name-specific shape** (as tested by `name-shape.mjs` and here): not supported, except the IRC nickname signature.

### 3d. Curvature, geodesic, warp versus gravity, momentum (`curvature.mjs`; the 11 corpora with at least 40 bodies finished: UD eng, spa, deu, hin on both folds, fra both folds, tur fold B; irc, wp and jpn runs had not finished when this was written)

| id | prediction | outcome |
|---|---|---|
| C1 | a body warps beyond its count (excess over matched-random positive for >= 60% of bodies, in 60% of corpora) | **falsified**: 0 of 11 corpora; share 0.43-0.51, median 0.48 (the registered "falsified" zone is 0.40-0.60) |
| C2 | slope of log warp on log n in [0.3, 1.2] for deletion and for random, within 0.15 | **held in 10 of 11**: deletion 0.99, random 0.90 (the scaling is the arithmetic of how many tokens go) |
| C3 | warp falls with distance from the body in 75% of corpora (deletion and column drop) | **failed narrowly**: 8 of 11 (73%) deletion, 9 of 11 column drop (bookkeeping falls too) |
| C4 | identity removal is at least half the warp | **held**: median 0.65 (MASK and COLDROP are identical by construction here) |
| C5 | paths through a body lengthen more than other paths in 75% of bodies | **failed**: holds in 3 of 11 corpora; betweenness vs log n 0.24; vs attraction given n -0.04 |
| WG | warp and attraction are one quantity (partial rho at least 0.30, above deranged q95 + 0.15, collapses when scrambled, repeats across folds) | **no**: partial rho median -0.06 (range -0.17 to +0.10), raw -0.10, deranged q95 0.11, scrambled-corpus partial 0.02; 0 of 11 corpora; fold pairs agree (all within 0.2) on a near-zero value |
| PW1 | raw Spearman(attraction, warp) at least 0.5 | **failed**: -0.10 (the two are not even co-varying through mass: warp tracks log n at 0.77, attraction energy at -0.10) |
| PW2 | partial positive but below 0.30 | **failed on sign**: -0.06 |
| M1 | company drifts slowly in text time (persistence ratio below 1, in 60% of corpora) | **failed** (my prediction): median 1.000, interval below 1 in 1 of 11 |
| M2 / PM2 | persistence is not a stable property of a being (reliability below 0.30) | **held**: median 0.07; J(n) slope -0.65 |
| power gate for WG (post-hoc, not pre-registered) | per-body attraction energy split-half reliability at least 0.30 | 0.31-0.74 in the corpora checked: the null is informative, not noise |

**Verdict on the user's suspicion.** With the operational definitions used here (warp = change of company distances among other
words when the being is deleted; gravity = excess coincidence of its company at range), warp and gravity are **not one quantity**:
the warp is explained by how many tokens are removed, the attraction is a property of the body's company that mass does not
predict, and given mass the two do not correlate (partial -0.06, reliability high). This does not exclude a different geometry (see
next experiments), and it does not say beings do not curve anything: in the slot graph, deleting a body changes collateral slots
(54% of change, mostly at radius 1), a reader-level "warp" that was measured but is not comparable to the company-distance one.

## 6. Three experiments to run next

1. **Warp and gravity in the reader's own geometry, and the future field.** Join the reader's per-body collateral shadow (already in
   `results/reader/*.jsonl`: `col`, `dir`, by body and window) to the attraction energies of `gravity.mjs --half H1`, partial on mass,
   with the same deranged control: this tests "warp = gravity" in the slot graph rather than company vectors at almost no cost. In the
   same run, re-read first mentions with a non-causal window of 32 sentences, and ask whether the effect of a first mention sits at the
   frames of the being's *later* mentions (the claim "the fold is ahead of the being").
2. **Exponent stability at 10x size, and beings rather than word types.** PG3 failed at 20-60k tokens (rho -0.11). Repeat the
   attraction measurement on the full train treebanks (priors rebuilt without them is not needed: no labels are fitted) for
   16 languages, and on a coreference-annotated corpus (CorefUD / GUM) where the body is a referent (name, pronoun, descriptor), with
   the cross-fit lexicon variant for attraction between two different bodies. Pre-register: exponent difference between folds at
   most 0.15 in 75% of languages, else the exponent is not a constant.
3. **Repair and measure the clock.** Make a copy of `activation.js` with the stamping fixed (decay old values to `now + 1`), rerun
   the listening cast's `dmdWindow` with a conclusion that is stable under truncation (for example the top-k beings by activation),
   and test the dilation idea directly: give each being its own gamma proportional to its measured burst reach and see whether
   next-sentence recurrence prediction improves over one global rate. Falsifier: no gain at equal parameter count.

## 7. Replication (wave 2, partial: 8 licensed corpora, 5,815 single deletions at n >= 3)

Wave 2 repeats the reader experiments on new text (UD fold B, new IRC channel-days, shifted War and Peace windows) with the rules fixed
before wave 1. At writing IRC, War and Peace and Persian are complete (150 windows), Turkish 136, German 66, French 35, Hindi 46,
Spanish 29, English 28 and Japanese 0; the report was computed on what existed (`results/reader/_report.w2.json`).

| finding | wave 1 | wave 2 | replicated |
|---|---|---|---|
| far pairs additive (slope, exact share) | 1.000, 99.9% (n = 1,312) | 1.000, 100% (n = 717) | yes |
| near pairs | 0.983, 83.7% exact | 0.972, 84.2% exact | yes |
| mentions of one body: n = 2 / n = 3 | sub-additive 4.5 vs 9.5 / exact 91% | 4.2 vs 8.8 / exact 93% | yes |
| log-shadow slope on log n, heterogeneous | 0.84, Q p < 1e-4 | 0.75, Q p = 4e-4 | yes (sub-extensive, not one law) |
| inertia: Spearman(n, fragility), n >= 3 | -0.009 (-0.029, 0.009) | -0.025 (-0.049, 0.001) | yes (interval still reaches 0); I1 fails again |
| CV-selected form | constant | exponential, exponent 0.037 (0.011-0.066), deviance gain 0.07% | **no** (the effect is tiny: both are "almost flat") |
| floor cliff n = 2 over n = 3-4 | 2.09 | 2.11 | yes |
| IRC nickname within-n AUC | 0.81 | 0.81 (new days); War and Peace 0.53 -> 0.56 | yes |
| density: Born share best, below the 2% threshold | 0.4% | 0.8% | yes (a small, consistent Born-share edge, not enough) |
| horizon vs recency, partial with mass | 0.50, -0.07 | 0.51, -0.08 | yes |
| reader force law exponent | 1.52 (1.38-1.69), power wins 9/9 | 1.45 (1.32-1.92), 7/8 | yes |
| scrambled-window far excess <= half the real | 6 of 9 | 3 of 7 | **no** |
| conservation | emptied 1.18, born 0.02 | 0.97, 0.03 | yes |
| collateral share | 0.539 | 0.526 (0.516-0.536) | yes |

A small honest correction from the replication: the one-mention shadow may decline very slightly with n (exponent 0.04), but at the
size of a hundredth of the floor cliff; "inertia" would still be a dead metaphor.

## 8. Defects and limits

* `kernel/activation.js` `observe()` off-by-one (stamp `now + 1`, decay to `now`): per-key activation of a continuously present key
  grows without bound (400.0 after 400 ticks, window 8) while `total` saturates at the window (8.0). Not edited.
* The attraction estimator needs about 10^4 mentions (planted check); 9 of 33 corpora were below and are labelled.
* UD word segmentation of Chinese and Japanese is the treebank's; informal corpora have no part-of-speech gold, so no cross-register
  name test other than IRC speaker names.
* The shadow is a count in the reader's slot structure; the readers are local, which makes additivity partly an instrument fact.
* IRC could not enter the equivalence test (reader windows and half-run gravity use different channel-days).
* Hindi fails the reader licence; Persian/Turkish curvature slices had fewer than 40 bodies and are not in section 3d.
* The cast `dmdWindow` derives "the cast with two arrivals", a conclusion that depends on the whole window; a different conclusion
  could give a measured window. The finding is about that conclusion.
* Timestamps in `LOG.md` after the first entries are my estimates; the order of entries and every sha256 are exact.

## 9. Files (all new, under `native/eval/physics-handles/`)

`PHYSICS-HANDLES.md` (concepts, definitions, laws, falsifiers, verdicts), `REPORT.md`, `LOG.md`; code: `lib.mjs`, `attraction.mjs`,
`plant.mjs`, `gravity.mjs`, `gravity-report.mjs`, `curvature.mjs`, `curvature-report.mjs`, `reliability.mjs`, `reader-handles.mjs`,
`reader-report.mjs`, `clock-energy.mjs`, `equivalence.mjs`; results in `results/` (`reader/`, `gravity/`, `curvature/`, plant files,
`clock-energy.json`, `equivalence.w1.json`); run logs in `logs/`.

## 10. State at the end of the session

Finished and analysed: all gravity runs (33 corpora, plus 18 first-half runs), the reader wave 1 (10 corpora x 150 windows), the planted
checks, the clock/energy checks, the equivalence run with attraction energy (wave 1), the curvature runs for 11 corpora. **Still
running in the background when this was written** (my own jobs; outputs land in `results/` and the numbers above are not updated by
them): reader wave 2 for English, French, Spanish, German, Hindi, Turkish (finishing) and Japanese fold B; curvature full runs for
Japanese (both folds), IRC and War and Peace; the first-half curvature runs that the curvature version of the equivalence test needs.
To refresh: `node eval/physics-handles/reader-handles.mjs report --out eval/physics-handles/results/reader --wave 2`,
`node eval/physics-handles/curvature.mjs report --out eval/physics-handles/results/curvature`,
`node eval/physics-handles/equivalence.mjs --wave 1`. Rules live in the headers, not in the report scripts.
