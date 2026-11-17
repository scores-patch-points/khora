# STOP RULE ROUND TWO RESULTS (preregistered in STOPRULE2-PREREG.md, stamped 2026-11-17T03:06:19Z, sha256 57a98067…)

**Decision: NOT SHIPPED.** T5 failed and two mutants (N-self, N-nocap) were not caught; the decision rule ships nothing
in that case. `khora-identity.diff` is unchanged (identity-warrant@1 from IDENTITY-PREREG). Candidate in
`stoprule-not-shipped/round2/`.

## Results (seed 20261121, 40 worlds per type)
| | false-merge | recall | other | verdict |
|---|---|---|---|---|
| RICH, declared prior | 0.0143 | 1.00 | | T1 pass |
| SKEWED, declared prior | 0.0226 | 1.00 | | T1 pass |
| POOR, declared prior | 0 (no merges) | 0 | 453 held | T2 pass |
| noise-free, all | | | 0 false splits | T3 pass |
| RICH / SKEWED, estimated prior | 0.030 / 0.024 | 0.937 / 0.954 | estimate 1.36x / 1.11x true | T4 pass |
| RICH / SKEWED, noise 10%, e=0.1 | 0.122 / 0.324 | 0.19 / 0.12 | false splits 79% / 87% | **T5 FAIL** |
Power: N-flat caught (T4: estimate ~11x), N-hard caught (T5). **N-self not caught** (T1 passes, false-merge <= 0.01).
**N-nocap not caught** (POOR: 2 merges, both correct).

## Readings
- The estimator's round-one bias WAS self-counting: leaving each pair out took it from 0.04-0.1x to 1.1-1.4x of the
  true rate, and recall with the estimated prior is 0.94-0.95. (The diagnosis was stated in the prereg before the run.)
- Round one's timidity came from estimating rarity on the tiny in-scope claims. With a 75-claim corpus, leaving the
  pair out barely matters: N-self passes. Not shown necessary here.
- The capacity check never bound: without it POOR merged 2 pairs, both true. Not shown necessary here.
- T5 failed on a SPEC DEFECT, not the evidence model: with e > 0, `different` was "posterior <= 1 - target", and the
  prior alone (~0.047) is already below 0.05, so pairs were called different before any evidence (0.3-0.5 fetches per
  pair). `different` must require at least one actual disagreement.

## For a round three
1. Ship-candidate: corpus rarity + leave-pair-out EM + declared or estimated prior, noise-free (T1-T4 held).
2. Either drop leave-pair-out-in-rarity and the capacity check, or test them in worlds where they bind
   (a small corpus; a poor world with skewed values) so their mutants can be caught.
3. Noise: `different` requires >= 1 disagreement and posterior <= 1 - target.
