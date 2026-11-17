# STOP RULE RESULTS (preregistered in STOPRULE-PREREG.md, stamped 2026-11-17T02:57:41Z, sha256 6afa67c7…)

**Decision: NOT SHIPPED.** S1 failed. Per the decision rule, nothing from the stop rule is in `khora-identity.diff`;
the shipped `identity-warrant.js` is the IDENTITY-PREREG version. The candidate is in `stoprule-not-shipped/`.

## Preregistered runs (seed 20261120, 40 worlds per type)
| | false-merge | recall | held | verdict |
|---|---|---|---|---|
| RICH, declared prior | 0 | **0.787** | 42 (all true pairs) | S1 FAIL (recall < 0.90) |
| SKEWED, declared prior | 0 | **0.787** | 41 (all true pairs) | S1 FAIL |
| POOR, declared prior | 0 (no merges) | 0 | 416 | S2 pass |
| all worlds | — | — | — | S3 pass: 0 false splits on true facts |
| RICH / SKEWED, estimated prior | 0 | 0.07 / 0.04 | — | S4 FAIL: estimate 0.105x / 0.037x the true rate |
Power check: M-any false-merge 0.84 (caught), M-fixed 0.37 (caught), M-flat estimate 11x too high (caught).
Noise arm (10% wrong facts, RICH): 180 false splits, recall 0.05. Discernment is stable only on TRUE facts.

## Post-hoc diagnostic (NOT preregistered; `stop-diag.js`): rarity from a background corpus, the pair left out
RICH false-merge 0.015, recall 1.00; SKEWED 0.0145, 1.00 (S1 would pass). POOR: 2 false merges of 7 (S2 would FAIL).
Reading: the preregistered strength counted the pair's own agreeing claims toward how common their value is
(self-counting), so agreement always looked cheap. Leaving the pair out fixes the rich worlds; a small background
then overstates rarity in a world that cannot support identity.

## What a next preregistration needs
1. Rarity from a corpus independent of the pair, with the pair left out.
2. A capacity check: if the most strength the declared relations could ever give is below the knee, never merge (POOR).
3. A working prior estimate (the EM here is biased low by 10-27x; cause not yet found).
4. Noise: Fellegi–Sunter with m < 1, so one disagreement is strong evidence, not proof. This gives up "difference is
   stable" for real data, where some facts are wrong.
