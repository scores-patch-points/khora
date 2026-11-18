# Rounds 15-16: embedding and static "smell" rulings for he/she (confirmatory, 66 unused GUM train documents, 552 answerable pronouns)

Frozen in FREEZE-ROUND15-16.md before the run; one run. Centroids built without these documents. Raw aggregation below (arms are S0 default, S6 word table (round 14), S7* embedding, S8* union with S6, S9* static word-vector smell).

Verdicts:
- FAIL H2 (embedding window ruling S7W precision over S0: interval [-0.008, +0.106] includes zero); S9W the same.
- FAIL H3 (coverage): S7W and S9W lose 6-8 points, intervals exclude zero. Context rulings throw out real people (S7W removes 22 right bindings and 16 wrong ones; the word table removed 3 right and 15 wrong).
- FAIL H6: S7W precision 0.907 < S6 0.911.
- HOLD H1 (changed bindings wrong 42% / 39% vs 12.6% overall, p = 0.0002) and H5 (on beings with no table word, the embedding rules non-person correctly 85.5%, static 87.9%, string alone 91.8%).
- HOLD F1 (static agrees with embedding on 0.893 of beings; the embedding's own half-split agreement is 0.888), F5 (static compute 141 ms per document median with no model call; word fetch 4 ms; 0.6% unknown words).
- The derived window (dmdWindow) is radius 0 for most beings (1362 of 1787 embedding, 1172 static), but its ruling equals the widest-radius ruling by construction and the widest radius is not the best: radius 1-2 static arms do best (S9EW1 0.925, S9EW2 0.927 at about 60% coverage, lower interval ends +0.007, +0.006 and coverage lower than S0 by 3-4 points). Not compared with S6 directly.
- The string alone is the weakest in the embedding (S7ES 0.870 at 51% coverage) and fine in the static form (S9SS 0.893 at 64%); the "context beats string" claim was not tested as a paired difference.
- Nothing beats the round-14 word table as the single ruling (S6 0.911 at 63.4%, the word table errs on only 41 gold persons against 78 static and 121 embedding). The union S8 reaches 0.922 at 55.6%.
- F4 (shuffled-label falsifier) and the P and Q smells (part of speech / proper noun, substitution) were not run.

Decision: the word table (S6) is the candidate to wire; the static smell is kept as the fast, model-free ruling for names the table has never seen (and for other languages where a treebank gives labels).

```
U-emb pronouns 552 docs 38
arm      right wrong   prec    cov  dPrec95 / dCov95 vs S0
S0         305    44  0.874  63.2%  
S6         319    31  0.911  63.4%  [+0.002, +0.106] / [-0.044, +0.049]
S7W        283    29  0.907  56.5%  [-0.008, +0.106] / [-0.131, -0.025]
S8W        289    27  0.915  57.2%  [+0.000, +0.119] / [-0.132, -0.011]
S7EW0      303    32  0.904  60.7%  [-0.006, +0.108] / [-0.071, +0.004]
S7EW1      297    28  0.914  58.9%  [+0.002, +0.115] / [-0.101, -0.008]
S7EW2      291    28  0.912  57.8%  [+0.000, +0.117] / [-0.113, -0.016]
S7EW4      284    27  0.913  56.3%  [+0.001, +0.114] / [-0.136, -0.027]
S7EW8      283    29  0.907  56.5%  [-0.006, +0.109] / [-0.134, -0.027]
S7ES       247    37  0.870  51.4%  [-0.083, +0.081] / [-0.246, -0.014]
S9SS       317    38  0.893  64.3%  [-0.002, +0.055] / [-0.039, +0.064]
S9SR       318    35  0.901  63.9%  [+0.003, +0.070] / [-0.020, +0.044]
S9W        278    27  0.911  55.3%  [-0.003, +0.114] / [-0.161, -0.025]
S9EW0      312    42  0.881  64.1%  [-0.002, +0.023] / [-0.029, +0.051]
S9EW1      308    25  0.925  60.3%  [+0.007, +0.132] / [-0.065, -0.006]
S9EW2      303    24  0.927  59.2%  [+0.006, +0.144] / [-0.082, -0.014]
S9EW4      284    28  0.910  56.5%  [-0.001, +0.109] / [-0.144, -0.017]
S9EW8      278    27  0.911  55.3%  [-0.002, +0.116] / [-0.167, -0.026]
S7ER       276    38  0.879  56.9%  [-0.030, +0.049] / [-0.161, +0.014]
S7EC       303    32  0.904  60.7%  [-0.006, +0.107] / [-0.074, +0.004]
S7EA       264    29  0.901  53.1%  [-0.034, +0.105] / [-0.220, +0.000]
S8         283    24  0.922  55.6%  [+0.006, +0.122] / [-0.180, +0.011]
H1 S7W changed 38, wrong share 0.421 vs S0 0.126, p=0.0002 ; wrong->right/none/wrong 0/16/0, right->wrong/none 0/22
H1 S9W changed 44, wrong share 0.386 vs S0 0.126, p=0.0002 ; wrong->right/none/wrong 0/17/0, right->wrong/none 0/27
H1 S6 changed 18, wrong share 0.833 vs S0 0.126, p=0.0002 ; wrong->right/none/wrong 0/15/0, right->wrong/none 0/3
F1 model self-agreement (half0 vs half1 embedding window ruling) 0.888 over 1787 beings
F1 static vs embedding ruling agreement 0.893 | static ruled non-person 715, embedding 845
being-level S7W: ruled non-person 845 of 1787, correct (gold non-person) 0.857; of beings gold-person ruled out 121
being-level S9W: ruled non-person 715 of 1787, correct (gold non-person) 0.891; of beings gold-person ruled out 78
being-level S6: ruled non-person 691 of 1787, correct (gold non-person) 0.941; of beings gold-person ruled out 41
A2/H5 beings with no word in the table (735): S7W ruled 379, correct 0.855
A2/H5 beings with no word in the table (735): S9W ruled 313, correct 0.879
A2/H5 beings with no word in the table (735): ES<0 ruled 413, correct 0.918
timing per doc ms: total median 2793; static compute median 141; static word fetch median 4; oov mean 0.0059
embedding windows (radius) {0: 1362, 1: 214, 4: 62, 2: 71, 8: 78} | static windows {0: 1172, 2: 123, 1: 249, 4: 121, 8: 122}
```
