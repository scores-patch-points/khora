# LADDER-2 RESULTS (LADDER2-PREREG.md, stamped 2026-11-17T06:49:58Z, sha256 27478ddf…; ladder2.py 3076ebed…)

Each fix alone and all three together; same 31 languages, same halves, each language judged with what was learned
from the others. Reference: ladder v1 6.86% [6.15, 7.63], power 66.2%, startle 4, shock 1; stated rules 3.45%.

| variant | true people at SURPRISE (pooled) | median power | startle / shock | populations flagged |
|---|---|---|---|---|
| v1 | 6.86% [6.15, 7.63] | 66.2% | 4 / 1 | – |
| F1 dates by closeness | **5.95%** [5.28, 6.67] | 62.4% | **1 / 0** | – |
| F2 disagreement only under a rule | 9.36% [8.54, 10.24] | 71.1% | 4 / 1 | – |
| F3 population surprise | 6.86% (identical to v1) | 66.2% | 4 / 1 | **none** |
| all three | 8.63% [7.84, 9.48] | 65.3% | 1 / 0 | none |

## What each result says
- F1 helps: fewer false splits, one startle left (Alexander Hippius), a small power cost. It removes exactly the cases
  the diagnosis named.
- F2 backfired, and the mechanism is measured (diagnose3.py): weighting disagreements by w_r makes most people exactly
  equal to themselves, so the ladder's unit (1.4826 x MAD of the self-split reference) collapses from about 0.12 to
  about 0.00, and every small deviation then reads as hundreds of units. The principle (a disagreement on a plural
  relation is not evidence) was NOT refuted; this implementation interacted badly with a relative unit.
- F3's prediction FAILED. Stated in advance: "Swedish is among the surprised populations". Swedish scored z = +0.20
  (the highest of any language was +0.67); no population was flagged. The measure (median Jensen–Shannon divergence of
  value distributions per relation) does not see what is odd about Swedish, which is how generic positions pair up
  inside a record, not what values occur.
- The prereg said a zero unit is a typed gap. A near-zero unit is the same failure and was not caught.

Swedish stays anomalous in every variant (36/120 true people at surprise in "all three", power 25.2%).
