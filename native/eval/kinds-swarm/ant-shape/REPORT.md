# ant-shape — learned single-token shape over the full impact record (condensed from the ant's hand-back, 2026-10-06)

Numbers: `results/summary.json`. Pre-registration `PREREG.md` (sha256 b829e6377e5a2429b4f93a2b3a59816d4077617ca9c621bf91e16e3530ec7769). 22 informative UD stems + IRC (6 channel-days, 600 rows).
Learner: fitLogit (ridge, lambda 1.0, PCA-24 fitted on the training fold). No capitals, priors or POS in any feature.

| claim | result | verdict |
|---|---|---|
| V1 a learned shape over the 144-d record exists (>= 0.60 in >= 14 of 22; mean above permutation q95) | 15/22; mean 0.605 vs null q95 0.508 | HOLDS, barely |
| V2 family-specific (same - other >= 0.03, same > other in >= 14, sign p <= 0.05) | -0.008, 7/22, p 0.97 (3-cluster +0.012, 14/22, p 0.14) | NOT SHOWN |
| V3 register-robust (UD-eng -> IRC >= 0.60) | 0.632 nominally; non-message-initial tokens only: eng -> IRC 0.58, all-UD -> IRC 0.67 | HOLDS nominally, CONFOUNDED by message position |
| V4 representation mattered (FULL - SHAPE24 >= 0.05) | +0.099 (CI 0.067..0.131); SHAPE24 itself 0.506 | HOLDS |
| V5 beyond case-free rivals (FULL+RIVALS - RIVALS >= 0.03 in >= 14) | +0.006 (CI -0.014..+0.025); rivals alone 0.658 beat FULL 0.605 | FALSIFIED |
| V6 company-dependent (shuffle drop >= 0.03) | 0.605 -> 0.554 (drop 0.051), still above null | PARTIAL: about half is counts |

Key points: (1) the old negative reproduces under a trained classifier (normalised family x type profile at chance 0.506); what FULL learns is in magnitude, radius bands, span rival and atmosphere.
(2) Not family-specific: training on all other 21 languages gives 0.598 ~ own-language; same-family 0.574 vs other-family 0.581. SOV-like languages score higher own-language (0.633 vs 0.595): a level difference.
(3) IRC confound: 281 of 600 sampled IRC tokens are message-initial and 94.7% of those are nickname positives; the causal rival `sentInitial` alone scores IRC AUC 0.918. Every IRC nickname AUC in the swarm may inherit this (verified by the boss on the full logs: 92.1% of nickname mentions are message-initial vs 9.3% of tokens).
(4) Sign flips between registers: in UD names leave a SMALLER shadow than matched common words (extent AUC 0.44, below 0.5 in 14 of 22 languages); in IRC nicknames leave a much bigger one (0.77); a UD-trained MAGNITUDE arm scores 0.21 on IRC.
(5) Kinds (L5, ant-kinds-ud leaves, 11 languages): kind label as an extra feature +0.055 in 11/11; conditioning (one model per kind) -0.014; so the gain is additive company information, not a signal pooling hides.
Controls: POSITION arm 0.493 (pass); sham ablation 100% null; determinism 40/40 eng and IRC; form-grouped CV 0.611 vs 0.605 (no identity leakage).
Not done: permutation nulls for arms other than FULL, War and Peace, a fresh held-out round (fold80B / new days) — the right next step for any claim above.
