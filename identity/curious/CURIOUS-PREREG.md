# PREREG: a curious loop (predict, encounter, measure surprise against the source's own spread, learn, choose by learning progress)

Written before any agent code exists. Stamped first. Motivation (the user): a system that is naturally curious and seeks to
be surprised as it tries to understand the world. Our parts: hunger (open edges priced by cost), the surprise ladder
(surprise relative to a reference's own spread), preregistered predictions that can fail, khora's "a kind is learned when one
more instance stops moving it". This tests whether they compose into one loop that avoids the known failure of a
novelty-seeker: being drawn to randomness (the noisy-TV problem). It is the loop's FIRST version; hand-set values are
declared and swept, not tuned.

## World
10 sources, each a stream of facts (slot, value), batches of 25 facts per encounter:
- 8 REAL sources: the people of 8 of the omnilingual samples (Japanese, Arabic, Russian, French, Hindi, Swedish, Latin, Persian), their statements
  as (property, value) in person order within a seeded shuffle of persons. The last 300 facts of each are held out, never shown.
- CONSTANT: every fact is ("c", "x"). Learned after one batch. NOISE: every fact is ("n", a random 12-hex string): unlearnable.
Streams cycle when exhausted (a repeated fact has been seen). Budget 300 encounters. At tick 150 the Japanese source's stream
is REPLACED by the Tamil people's facts (its model keeps its counts): a shift the agent must notice.

## The model (khora's holograph, reused)
Per source, per slot: Dirichlet counts over values with alpha = 1 (Laplace, declared) and the novel bucket, exactly
`predict` / `klAdmit` of native/kernel/bayes-surprise.js. Counts are updated directly (khora's admit models one value per slot
per instance; these facts repeat slots). No model decay (gamma = 1): forgetting lives only in the interest memory below.
Surprisal S of an encounter = the mean bits per fact of its batch under the model BEFORE learning it.

## The ladder per source (same construction as the identity ladder)
Reference = that source's own earlier encounters' S (discounted by gamma_i). s = (S - median) / unit, unit = 1.4826 x MAD,
floored by the median unit of the other sources (the lesson of LADDER2: a collapsed unit needs a floor from the next level up).
usual: s < 1. SURPRISE: s >= 1. STARTLE: s relative to the source's past surprises' s-values >= 1. SHOCK: likewise one level up.
"Not enough reading yet" (fewer than 5 prior encounters, or fewer than 5 prior surprises for startle) is a typed gap, never a level.

## The policies (all start with one visit to each source)
- RANDOM, ROUND-ROBIN.
- NOVELTY: the source with the highest discounted mean S (what a raw novelty-seeker does).
- CURIOUS (ours): discounted UCB over compression progress. LP_k = discounted mean of the source's earlier S minus S_k;
  reward r = max(LP_k, 0) / (largest S seen so far, over all sources); index = discounted mean reward + sqrt(2 ln N / N_i),
  N_i the discounted encounter count of source i, N their sum, discount gamma_i. The constant 2 is UCB1's (Auer, Cesa-Bianchi,
  Fischer 2002), taken, not tuned. gamma_i in {0.99, 0.95, 0.90}, all reported.
Each encounter writes a PREDICTION first (the expected S under the model: slot-frequency-weighted predictive entropy) and an
OUTCOME citing it, to a pharos log for seed 1 (and the best gamma_i).

## Seeds
20 seeds (person order, noise strings, tie-breaks); every policy sees the same seed's streams.

## Hypotheses (each can fail)
- **C1 the pathology exists.** NOVELTY spends more than half its encounters after tick 30 on NOISE (otherwise this world cannot
  show the failure and C2 is inconclusive).
- **C2 curiosity is not drawn to noise.** CURIOUS spends no more of its encounters after tick 30 on NOISE than RANDOM does (1/10).
- **C3 it is satiated.** Likewise for CONSTANT.
- **C4 it learns.** Final mean held-out surprisal over the 8 real sources (bits per fact; lower is better), paired over seeds:
  CURIOUS lower than RANDOM and lower than ROUND-ROBIN (sign test, 20 seeds, p < 0.05 each). The expectation is modest: round-robin
  wastes 2 of 10 encounters on the two useless sources.
- **C5 it notices the shift.** The agent revisits the Japanese source within 60 ticks of the shift in at least 90% of seeds, and the
  first post-shift encounter there is at SURPRISE or above in at least 90% of those revisits.
- **C6 the log is the record.** Folding the pharos log alone and recomputing every encounter's ladder level reproduces the live levels
  exactly (100%).

## Reported either way
Per policy: encounter share per source, held-out score, how many encounters were spent before a source's LP fell to zero.
Sensitivity of CURIOUS to gamma_i. Calibration of the predictions (expected vs observed S, per source).

## Not tested
Choosing a NEW source it has never met (the bandit has a fixed set); real-world curiosity beyond these streams; anything
experiential.

---
SUPERSEDED 2026-11-17T07:08:57Z, before any preregistered run (one smoke run on seed 1 only), at the user's direction and
after the smoke run. Three reasons, all found before results existed:
1. The smoke run's CURIOUS policy was identical to ROUND-ROBIN (same shares, same held-out score): the UCB bonus swamps rewards that I
   normalised by the largest surprisal. UCB's bound assumes rewards spanning [0,1]; mine span a few percent.
2. Surprise was context-free: a flat Laplace model cannot tell an identifier slot (a new value every time: expected) from an enumerated
   slot (a new value: shocking). More training made new identifiers look MORE surprising, so held-out loss rose with learning.
   The system already has contextual surprise (experience-priors.js; prior-query.js loading Zenodotus derived-priors by genre).
3. The facts were ingested by an ad-hoc normaliser, not through the reader's codec (EOT: EOTSource / EOTRecipe / EOTObservation with byte
   addresses, typed by operator, grain, terrain, stance).
The redesign: sources are Zenodotus documents read through the reader into EOT; expectations come from the genre priors
(academic, encyclopedic, government-legal, literature); rewards are scaled by their observed range.
