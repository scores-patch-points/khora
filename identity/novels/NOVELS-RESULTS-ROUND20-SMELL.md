# Round 20 NOTE-5/6: Dignaga's relative-centroid gender smell for names never heard before

Preregistered (PREREG-ROUND20-NOTE-5/6, 2026-11-18T04:34-04:39Z), one run (identity/novels/gender-smell-eval.mjs). Data: 52,108 given names of the Wikidata snapshot (male 26,602 + 15,679 female in the training ground; names in both lists or unisex excluded); 9,827 held-out names (sha256 rule), the "never heard before" test. Embeddings: nomic-embed-text through the vector library.

| arm | claimed | accuracy among claimed |
|---|---|---|
| B1 majority (masculine) | 100% | 0.622 |
| B2 suffix naive Bayes (last 1-3 letters) | 100% | 0.820 |
| P-full (ground-relative, contrast, null) | 12.3% (1,211) | 0.964 |
| P-no-ground | 12.3% | 0.964 |
| P-no-contrast | 5.5% (541) | 0.970 |
| P-no-null (always claims) | 100% | 0.835 |

- A1 HOLDS: on the 1,211 names P-full claims, P-full 0.964 against B2 0.948 and B1 0.263; P-full minus B2 95% [+0.007, +0.025]; minus B1 [+0.673, +0.729]. The edge over the plain suffix model is small.
- A2 (ablation): dropping the GROUND changes nothing (same names, same accuracy): the score, a projection standardised by the pooled within-class spread, is invariant to the ground's translation and scale, so within one ground the relative frame adds nothing to classification; its use is the units of the null and comparison across grounds (not tested). Dropping the CONTRAST claims fewer names (5.5% vs 12.3%) at 0.970. Dropping the NULL gives full coverage at 0.835, above B2's 0.820 and B1's 0.622.
- A4 HOLDS (falsifier): grounds trained with shuffled gender labels, always claiming: mean 0.527, max 0.685 over 20 seeds, against 0.835 for the real ground.
- A3 (GUM beings the giver cannot answer) and A5 (cross-ground order, Spearman) were NOT run.
Reading: the embedding smell is a good gender smell for English given names beyond its null bound (12% coverage, 96% accuracy) and slightly better than a suffix model when forced to answer (0.835 against 0.820). The null bound is strict (the 95th percentile of 50 draws). Not yet connected to the read, and not tested on a language with cases.
