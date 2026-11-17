# PREREG: the stop rule for identity (merge only when the coincidence beats the prior)

Written before the stop rule is coded. Stamped (`STOPRULE-PREREG.md.sha256`, `.time`) before the experiment runs.
Builds on IDENTITY-PREREG.md (67648a5c…) and its post-hoc satiety run, which motivated this and is NOT evidence for it:
the worlds and seed here are new. Prior art: this is Fellegi–Sunter record linkage (1969) with m = 1 (true facts always
agree); the prior is the match proportion, estimated without truth by EM (Winkler).

## The rule (to be added to `identity-warrant.js`)
- `strength` = sum over DISTINCT agreeing one-valued keys of log10(1/p), p = Laplace-smoothed frequency of the agreeing
  value among the + claims of that relation in scope. Computed from the claims alone.
- With a declared prior (`prior: { rate }`, the coreference rate among name pairs) and a target (default 0.95):
  posterior odds = rate/(1-rate) x 10^strength.
  - **different**: one witnessed discernment (unchanged, stable).
  - **same**: no discernment and posterior >= target. The derived same-as claim carries strength, prior and posterior.
  - **unjudged**: neither, and something is left to fetch; the hunger list (live first, then cold) is returned.
  - **held**: no discernment, below target, and every declared one-valued relation is known for both: indiscernible on
    every observable. A typed gap, never a merge.
- Without a declared prior the old behaviour stands (bare agreement => provisional `same`), so existing callers and
  the shipped tests do not change meaning silently; `strength` is reported either way.
- `estimatePrior(claims, names, {functional})`: EM over all name pairs with at least one compared one-valued key.
  P(obs | same) = prod (agree ? 1-e : e), e = 0.01; P(obs | distinct) = prod (agree ? p : 1-p). Returns the rate.

## Worlds (new seed 20261120; 40 worlds each; 10 entities, 1-2 names each, 15 starting claims; ground "/")
- RICH: 12 one-valued relations x 4 values, uniform.  POOR: 4 x 2, uniform.  SKEWED: 12 x 6, Zipf(1) values (the
  frequency-based strength must cope with common values).
- Every pair is run to satiety: decide; if unjudged, fetch the first hunger item from the world (true fact); repeat.

## Hypotheses (falsified as stated)
- **S1 declared prior, decidable worlds.** In RICH and SKEWED with the true rate declared and target 0.95: false-merge
  rate among merges <= 0.05 AND recall (true pairs merged) >= 0.90.
- **S2 declared prior, undecidable world.** In POOR: false-merge rate among merges <= 0.05 (merging little or nothing is
  allowed; merging wrongly is not). Pairs indiscernible on everything end `held`.
- **S3 discernment untouched.** Over all worlds, `different` is never returned for two names of one entity. 0 violations.
- **S4 the prior can be estimated.** `estimatePrior` on each world's 15 starting claims plus 60 more sampled facts
  (the "survey"): the mean estimate over worlds is within a factor of 2 of the true rate in RICH and SKEWED; and using
  each world's OWN estimate in place of the true rate, S1's bounds still hold.
- **Power check.** Mutant M-any merges on any agreement (old behaviour); mutant M-fixed ignores the prior and merges at
  a fixed 0.5 decades; mutant M-flat makes estimatePrior return 0.5. M-any and M-fixed must each violate S1; M-flat
  must violate S4. Otherwise the experiment is too weak and nothing is implemented.

## Measured, not falsifiers
Fetches to a decision; held counts; a noise arm (10% wrong one-valued facts, RICH, declared prior): false merges and
false splits.

## Decision rule
Implement (the rule and `estimatePrior` in `identity-warrant.js`, a seeded test that fails on the three mutants, the
old tests still passing) iff S1–S4 hold and all three mutants are caught. If S4 alone fails, ship the rule with a
DECLARED prior only and report the estimator as not working. Any S1–S3 failure: ship nothing, report the counterexample.

## Not tested
Real claims; noise in the S hypotheses; scoped grounds; transitive merges across pairs; values that are themselves names.
