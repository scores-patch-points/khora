# PREREG (round three): the identity stop rule as a sequential probability ratio test

Written before round-three code exists. Stamped (`STOPRULE3-PREREG.md.sha256`, `.time`) before the experiment runs.
Round two (STOPRULE2-PREREG.md, 57a98067…; STOPRULE2-RESULTS.md) held T1–T4, failed T5 on a spec defect, and could not
catch two mutants. New seed, new worlds. Prior art: Fellegi–Sunter (1969) for the weights, Winkler's EM for the prior,
Wald's sequential probability ratio test (1945) for when to stop fetching.

## Changes from round two (each with its reason)
1. **Capacity check removed.** With a calibrated posterior a merge at the target is right at the target rate whatever
   the world; capacity can only cost recall. Round two could not show it does anything (N-nocap uncaught).
2. **Leaving the pair out of RARITY removed.** With a corpus it did not matter (N-self uncaught). Rarity is counted over
   the corpus (`background`, else the claims in scope) as is.
3. **Leaving the pair out of the PRIOR ESTIMATE kept.** It was the one change between rounds that fixed the estimator
   (0.04-0.1x -> 1.1-1.4x). This time it has its own mutant.
4. **The lower boundary is on the evidence, not the posterior (Wald).** With B = target/(1-target):
   `same` iff posterior >= target and >= 1 agreement; `different` iff e = 0 and a discernment exists, or e > 0 and the
   log10 likelihood ratio (strength) <= -log10(B). Otherwise `unjudged` (hunger goes on) or, with nothing left to
   fetch, `held`. Without a declared prior: the shipped meaning, unchanged.

## Worlds (seed 20261122; 40 per type; 10 entities, 1-2 names each; 15 starting claims; corpus = those + 60 sampled facts)
RICH 12 x 4 uniform; POOR 4 x 2 uniform; SKEWED 12 x 6 Zipf(1). Every pair run to satiety. Target 0.95.

## Hypotheses (as in round two)
- **T1** declared true prior, noise-free: RICH and SKEWED each false-merge <= 0.05 AND recall >= 0.90.
- **T2** POOR, declared prior, noise-free: false-merge <= 0.05.
- **T3** noise-free, all worlds and modes: 0 false splits.
- **T4** estimated prior on the corpus: mean estimate within 2x of the true rate in RICH and SKEWED, AND T1's bounds hold
  with each world's own estimate.
- **T5** noise: 10% of one-valued facts wrong (corpus and fetches), e = 0.1 declared, true prior: RICH and SKEWED each
  false-merge <= 0.05, false-split rate <= 0.05, recall >= 0.80.

## Power check: every remaining part has a mutant that must violate its hypothesis
N-any merges on any agreement -> T1. N-scoped counts rarity over the in-scope claims, ignoring the corpus -> T1.
N-flat EM returns 0.5 -> T4. N-emself EM counts each pair's own claims -> T4. N-postdiff uses round two's
`posterior <= 1 - target` for `different` -> T5. N-hard calls any disagreement `different` when e > 0 -> T5.
An uncaught mutant means that part is not shown to do anything: then nothing ships.

## Decision rule
All of T1–T5 hold and all six mutants are caught: ship the rule (round-one tests still passing, plus a seeded test that
fails on the mutants). T5 alone fails (N-postdiff and N-hard then are not counted): ship the noise-free rule, noise
documented as unsupported. T4 alone fails: ship with a DECLARED prior only. Anything else: ship nothing and report.

## Not tested
Real claims; scoped grounds; transitive merges; a mis-declared noise rate or target; corpora unlike the world.
