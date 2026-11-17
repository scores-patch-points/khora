# PREREG (round two): the identity stop rule, with the four diagnosed fixes

Written before round-two code exists. Stamped (`STOPRULE2-PREREG.md.sha256`, `.time`) before the experiment runs.
Round one (STOPRULE-PREREG.md, 6afa67c7…) failed S1 and S4 and is reported in STOPRULE-RESULTS.md. Its post-hoc
diagnostic motivated fixes 1 and 2 and is NOT evidence for them. New seed, new worlds.
Prior art: Fellegi–Sunter record linkage (1969); EM for the match proportion (Winkler).

## The rule (candidate `identity-warrant.js`; starts from stoprule-not-shipped/identity-warrant.stoprule-candidate.js)
1. **Rarity from a corpus, the pair left out.** New option `background` (corpus claims). How common a value is (p) is
   counted over `background` (or the claims in scope if none is given) EXCLUDING every claim that names x or y.
2. **Capacity check.** capacity = sum over declared one-valued relations of the entropy (in decades) of that relation's
   value distribution in the same corpus: the expected strength of a full agreement. The knee =
   log10(target/(1-target)) - log10(rate/(1-rate)). If capacity < knee, the pair is never merged (held at satiety).
3. **The prior estimate leaves the pair out too.** `estimatePrior` computes p per pair without that pair's claims.
   Diagnosis (stated now so it can be wrong): round one's EM was low for the same self-counting reason as the strength.
4. **Noise (Fellegi–Sunter, m < 1).** New option `noise` (e, the declared per-fact error rate; default 0 = the round-one
   stable discernment, unchanged). With e > 0, per DISTINCT compared one-valued key: agree adds log10((1-e)^2 / p),
   disagree adds log10((1-(1-e)^2) / (1-p)); a polarity conflict adds log10((1-(1-e)^2) / 0.5). Posterior as before.
   `different` then means P(same) <= 1 - target; until then the hunger continues.
Verdicts with a declared prior: `same` iff no stable discernment, posterior >= target, capacity >= knee, >= 1 agreement;
`different` (e = 0: any discernment; e > 0: posterior <= 1 - target); `unjudged` if anything is left to fetch; else
`held`. Without a declared prior: the shipped meaning, unchanged (the shipped tests must still pass).

## Worlds (seed 20261121; 40 per type; 10 entities, 1-2 names each; 15 starting claims; corpus = those + 60 sampled facts)
RICH 12 x 4 uniform; POOR 4 x 2 uniform; SKEWED 12 x 6 Zipf(1). Every pair run to satiety (decide; fetch the first hunger
item from the world; repeat). Target 0.95.

## Hypotheses
- **T1** declared true prior, noise-free: RICH and SKEWED each false-merge <= 0.05 AND recall >= 0.90.
- **T2** POOR, declared prior, noise-free: false-merge <= 0.05.
- **T3** noise-free, all worlds and modes: 0 false splits.
- **T4** estimated prior (on the corpus): mean estimate within 2x of the true rate in RICH and SKEWED, AND T1's bounds
  hold with each world's own estimate.
- **T5** noise: 10% of one-valued facts wrong (corpus and fetches), e = 0.1 declared, true prior declared: RICH and
  SKEWED each false-merge <= 0.05, false-split rate (true pairs called different) <= 0.05, recall >= 0.80.
- **Power check** (each mutant must violate its hypothesis, else nothing ships): N-self counts the pair's own claims
  (round one) -> T1; N-nocap drops the capacity check -> T2; N-flat EM returns 0.5 -> T4; N-hard treats any
  disagreement as `different` even when e > 0 -> T5.

## Decision rule
All of T1–T5 hold and all four mutants are caught: ship the rule (with the round-one tests still passing, plus a seeded
test that fails on the mutants). T4 alone fails: ship with a DECLARED prior only. T5 alone fails: ship the noise-free
rule only, noise documented as unsupported. T4 and T5 both fail: ship the declared-prior, noise-free rule only. Any T1–T3
failure, or an uncaught mutant: ship nothing and report.

## Not tested
Real claims; scoped grounds; transitive merges; a mis-declared noise rate; corpora that differ from the world.
