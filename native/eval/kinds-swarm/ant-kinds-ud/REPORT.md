# ant-kinds-ud — kind induction on 19 UD languages, then the holographic signature per kind (condensed from the ant's hand-back, 2026-10-06)

Pre-registration `PREREG.md` (header sha256 85a7227147bbdb3820b9b869af708d3860e63641e1d58cc981c55e993c1d353b). Numbers: `results/dev/AGG*.txt`, `TABLE.txt`, `results/dev/lang/<stem>.json`.
First batch (verdict set, 10): eng spa rus cmn-hans fas jpn tur arb hin fin; extension (9): kor fra ita nld por deu urd pol heb. UD DEV only; no fold replication, no informal English.

**Kinds** (company only: token before/after, sqrt + L2, spherical k-means, K by split-half stability vs within-sentence-shuffled null): exist, coarse and POS-like (function words, pronoun/aux/verb forms, nominal forms);
NOT frequency bands (NMI vs frequency bands median 0.01); NMI vs UPOS 0.23 vs 0.09 for shuffled-company kinds. K* median 3 (2-12); only the 2-3 top-level kinds are stable across the mention floor (3/5/8), and only in large vocabularies.
**No proper-noun-majority kind exists in any of 19 languages** (max PROPN share in a kind: hin 0.33, spa 0.23, rus 0.18, eng 0.18): names rarely reach 5 mentions in 10-50k-token DEV sets (eng 32% of PROPN tokens, rus 4%).
Noun kinds are coherent where they exist (spa: roles/organisations vs government and places incl. city names; hin: agents/institutions vs places/documents; arb: city names vs institutions — company separates place from institution, which UPOS tags both NOUN/X).

| claim | result | verdict |
|---|---|---|
| K1 kinds stable and beyond a shuffled-company null | first 10: 6/10 (needed 80%); all 19: 15 (79%); shuffled control K*=1 only 86% (needed 90%) so the registered rule was too permissive; amendment A1: observed best margin ranks above all 10 shuffled maxima in 19/19 | NOT SUPPORTED as registered; structure beyond null holds |
| K2 kinds differ in signature more than random partitions | frequency-stratified permutation 5/10 (11/19); unrestricted 9/10 (18/19); eta^2 0.03-0.10; fragility slopes differ between kinds in 0/19 | WEAK; about half is frequency/mention count |
| K3 kind-conditioning reveals a signal pooling hides (C - PK >= 0.03 and PK - Kd >= 0.03 in >= 40%) | 0/17; mean AUC pooled signature 0.59, kind one-hot 0.59, signature+kind-as-feature 0.67, kind-conditioned 0.59; C - PK mean -0.077 | FALSIFIED. The best arm is the pooled signature PLUS kind as a feature: both carry information, conditioning adds nothing |
| K4 kind structure family-specific | 3-cluster -0.007 (p 0.62); 2-family +0.030 (p 0.079; frequency-band control +0.022, p 0.19); kind centroids align across languages 0.481 vs random 0.286 vs frequency bands 0.528 | NOT SUPPORTED |
Simpson check: 0 reversals in 19 languages (PROPN and NOUN strata); power low (<= 2-3 kinds per stratum with >= 15 pairs). Within-kind AUC of the pooled model is uneven (mean 0.605 over 23 kinds; tur kind 1 reaches 0.94 on n=30).
Pooled PROPN shadow vs frequency-matched random deletion: differs (cosine below the null 5th percentile) in 17 of 18 languages but cosines stay 0.885-0.95+; NAME-SHAPE-RESULTS found 1 of 20 — the two nulls differ (window-pooled pseudo-draws vs single-window draws) and were not reconciled.
Controls: sham ablation all null; determinism identical. Deviations declared in PREREG.md (D3 samples cut for machine load; D4 B=50; D1 paired-t Simpson intervals). Kind labels are selected from the whole DEV stream (the reading itself is causal).
