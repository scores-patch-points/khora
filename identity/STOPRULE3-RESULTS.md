# STOP RULE ROUND THREE RESULTS (preregistered in STOPRULE3-PREREG.md, stamped 2026-11-17T03:13:29Z, sha256 ac722c3c…)

**Decision: SHIPPED, noise-free** (the rule's "T5 alone fails" branch). `khora-identity.diff` now carries
`identity-warrant.js` (identity-warrant@2) and `identity-stoprule.test.mjs`. Passing `noise` throws a TypeError that
names this result. The noise-capable candidate is kept in `stoprule3/`.

## Preregistered runs (seed 20261122, 40 worlds per type)
| | false-merge | recall | other | verdict |
|---|---|---|---|---|
| RICH, declared prior | 0.0192 | 1.00 | | T1 pass |
| SKEWED, declared prior | 0.0051 | 1.00 | | T1 pass |
| POOR, declared prior | 0 (no merges) | 0 | 438 held | T2 pass |
| noise-free, all | | | 0 false splits | T3 pass |
| RICH / SKEWED, estimated prior | 0.0265 / 0.0055 | 0.902 / 0.938 | estimate 1.24x / 1.10x true | T4 pass |
| RICH / SKEWED, 10% noise, e = 0.1 | 0.027 / 0.008 | **0.75 / 0.75** | false splits 0.037 / 0.034 | **T5 FAIL (recall)** |

## Power check: all six mutants caught
| mutant | caught by | evidence |
|---|---|---|
| N-any (merge on any agreement) | T1 | false-merge 0.84 |
| N-scoped (rarity from in-scope claims, not the corpus) | T1 | recall 0.74 |
| N-flat (prior estimate 0.5) | T4 | estimate 10.8x |
| N-emself (estimate counts each pair's own claims) | T4 | estimate 0.048x |
| N-postdiff (round two's posterior lower boundary) | T5 | false splits 0.87 |
| N-hard (any disagreement discerns under noise) | T5 | false splits 0.71 |

## Shipped module, re-checked on the same seed
Declared: identical to the candidate (0.0192 / 1.00; 0.0051 / 1.00; POOR no merges). Estimated: identical
(0.0265 / 0.902 / 1.24x; 0.0055 / 0.938 / 1.10x). Removing the noise path changed nothing noise-free.
`identity-stoprule.test.mjs`: passes 4/4 on the shipped module; fails on N-any (3), N-scoped (2), N-flat (1), N-emself (1).
The diff applies cleanly to khora b127284 and all three test files pass there (2 + 5 + 4).

## Readings
- The identity hunger is a sequential probability ratio test. With the lower boundary on the evidence (Wald), noise
  errors fell from 79–87% false splits (round two) to 3–4%, and false merges stayed under 3%.
- Under noise, recall is limited by how many observables exist: with 12 relations, a quarter of true pairs ran out of
  facts between the boundaries and were held. More relations, or a lower target, would raise it; neither was tested.
- Over three rounds the parts that survived each have a mutant that fails without them: the prior threshold, rarity
  from a corpus, the EM estimate, and leaving each pair out of that estimate.

## Not tested
Real claims; scoped grounds; transitive merges across pairs; a mis-declared target; corpora unlike the world; noise.
