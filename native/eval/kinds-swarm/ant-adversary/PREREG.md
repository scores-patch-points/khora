# ant-adversary PREREG (written 2026-10-06 BEFORE the first run of build.mjs on any evaluation data)

Disclosure of what was seen before this header: the BRIEF; the headers of eval/law/impact.mjs, name-rule-informal.mjs, name-war-and-peace.mjs; one timing smoke
of impactBatch on UD ENGLISH DEV (20 records, outputs discarded, 126 ms/record at M=64, 202 ms/record at M=128). No fold80B token, no IRC token outside the
earlier run's own gold.files list, has been read by any impact instrument or by my kind induction. I have NOT looked at the other ants' directories.

## What is replicated, and how it differs from the other ants (deliberate)
Central claim K3: "conditioning on induced noun kinds reveals a holographic signal that pooling hides."
- DATA: UD fold80B tail.conllu (FIRST 20% of each TRAIN treebank), languages eng spa rus fas jpn tur. IRC: ubuntu-irc channel-days >=1500 messages, en, EXCLUDING
  the six files of results/name-rule-informal.irc.json gold.files; eight days drawn with seedFor("adversary","irc-days").
- KIND INDUCTION (mine, not kind-standing.js): forms with >=8 mentions in the INDUCTION HALF (first half of the stream, sentences [0,H), H=floor(n/2); IRC: first
  halves of the 8 days, pooled). Feature of a form = Hellinger (sqrt of L1-normalised) left-neighbour and right-neighbour count vectors over the 150 most frequent
  forms + OTHER + boundary (BOS/EOS), unit-normalised; k-means (k-means++, 8 restarts, 100 iterations, seed from seedFor("adversary",corpus,K)). K in {3,4,6,8}
  (K=2 excluded: it splits on the largest variance axis, usually function vs content words, and the claim concerns kinds inside content words). K = argmax over the
  grid of EXCESS STABILITY = mean ARI between the K-partitions of two disjoint halves of the induction text (blocks of 10 sentences assigned to halves by a seeded
  coin; 3 splits; forms with >=3 mentions in each half) MINUS the same quantity on 5 within-sentence shuffles of the induction text (shuffleSentences). K also capped
  at floor(nForms/12). No gold, no POS, no capitals, no word list enters induction. Kinds are TYPE-level (a form has one kind).
- EVALUATION HALF: sentences [H, n) only (strictly after the induction text); windows M=128 sentences (UD), M=256 messages (IRC), F=0 (frame-causal), A-DEL,
  prior-free readers, impactBatch. Records: sig(85)+atm(19) = "IMP" (104-d), span signature, counts.
- ELIGIBLE token occurrence: s >= H (and s >= M), form has a kind (>=8 mentions in the induction half), form already occurred earlier in the token's causal window
  (earlier in the same sentence counts), i.e. "recurs in its causal window".
- LABEL (gold only to label, never a feature, never in induction): UD y=1 iff the token's UPOS is PROPN; controls: any eligible token with UPOS in {NOUN, VERB, ADJ,
  ADV, NUM, ADP, DET, AUX, PRON, CCONJ, SCONJ, PART, INTJ} (not PROPN, not PUNCT/SYM/X). IRC y=1 iff a name occurrence by the loadIrc rule of name-rule-informal.mjs
  (nick forms speaking >=3 messages that day, length>=3, not a topic word (>=1/300 of the day's tokens), not the speaker); controls any eligible non-gold form.
  Matching: each positive (<=10 occurrences per form, <=300 positives per UD language, <=400 IRC) is matched to a control occurrence from the SAME cell of
  (log2 form-count bin in the induction half, window-mention bin {1,2,3+}); fallback to the count bin alone (fallback share reported); controls without replacement,
  <=10 occurrences per control form. Secondary subset: NOUN-only controls (the same rows).
- CV: leave-one-block-out, 10 contiguous position blocks over the evaluation half (IRC: leave-one-DAY-out, 8 blocks). Learner: fitLogit (ridge lambda=1, IRLS 25 iters),
  standardise on train, PCA-24 on train when width>24 (the repo's cvScores recipe), imported from name-war-and-peace.mjs / impact.mjs.

## Arms (all from the same records, out-of-fold scores)
- P_IMP   pooled logistic on IMP (104-d -> PCA-24).
- K_IMP   kind-conditioned: one logistic per kind fitted on the training blocks' rows of that kind (needs >=30 rows and >=8 of each class, else the pooled model's
  score is used for that kind in that fold; PCA dim = min(24, floor(n_k/6))).
- ADD_IMP additive: pooled logistic on [PCA-24(IMP), one-hot(kind)]  (kind intercept but common slopes).
- KINDONLY score = training-fold positive rate of the kind (Laplace smoothed). No impact feature at all.
- CONF    covariates only: [log form count, log window mentions, log(1+gap to last mention), sentence length, relative index, log position]; P_CONF, K_CONF, ADD_CONF.
- IMP+CONF the concatenation (pooled, kind-conditioned, additive).
- POS     log position alone (position-only arm), scalar AUC.
- Scalar scores of name-rule-informal (S_ENTRY, S_OWN, S_ALL, S_SPAN), direction fixed (larger = more name-like).
Statistics: overall AUC; NAIVE DELTA = AUC(K_IMP)-AUC(P_IMP) (the most literal reading of K3 and the easiest to inflate: the kind-conditioned model alone knows the kind
prior); INTERACTION = AUC(K_IMP)-AUC(ADD_IMP) (what conditioning adds beyond a kind intercept); WITHIN-KIND AUC (macro mean over kinds with >=10 rows of each class,
weighted by rows) of K_IMP vs P_IMP vs ADD_IMP. Block bootstrap (B=500) resamples blocks; per-language and mean over the six UD languages (blocks resampled within each language).

## Controls built to fail
C1 label permutation within (block x kind) strata, B=100: null of AUC and of INTERACTION and of within-kind AUC.
C2 random kind partitions of the same sizes, B=100 each: (a) uniform over the forms; (b) permuted WITHIN log2 count bins of the forms (keeps each kind's frequency profile:
   if the induced kinds are frequency bands, (b) reproduces the effect). The whole K_IMP/ADD_IMP pipeline is re-run per partition.
C3 company shuffle: the same positions read on shuffleSentences(stream, seed) (token located by occurrence ordinal inside the shuffled sentence); kind labels unchanged.
C4 sham ablation on 100 rows: signature must be 100% null (K1 licence). C5 position-only arm in [0.45,0.55]. C6 determinism: 30 rows re-read, hashes equal.
C7 kinds vs frequency: NMI(kind, count tercile) and NMI(kind, sentence-initial-share tercile) vs a 200-draw permutation null.

## Typed numbers (all said): >=8 mentions (brief); 150 context forms; K grid {3,4,6,8}; 8 restarts/100 iters; blocks of 10 sentences; 3 splits; 5 shuffles;
M=128/256 (the repo's); caps 10/form, 300/400 positives; min 30 rows & 8 per class per kind; PCA floor(n_k/6); lambda=1 (repo's); SESOI 0.03 AUC (repo's bare number);
B=500 bootstrap, B=100 nulls. Family-wise: Holm over every (language x kind x scalar score) within-kind AUC test.

## PREDICTIONS (my priors; I expect to be adversarial, so these are mostly "the effect is smaller than claimed")
P1  K1: excess stability > 0 and ARI_real(K*) > max shuffle-run ARI in >=5/6 UD languages and IRC; but NMI(kind, count tercile) > 0.30 in >=4/6 (kinds partly frequency bands).
P2  Pooled P_IMP overall AUC (PROPN vs matched) mean over UD in [0.52, 0.68]; IRC (leave-day-out) in [0.55, 0.85].
P3  NAIVE DELTA (K_IMP-P_IMP) >= 0.03 in >=4/6 UD languages, mostly because of the kind prior.
P4  KINDONLY AUC >= P_IMP AUC in >=4/6 UD languages.
P5  INTERACTION (K_IMP-ADD_IMP) mean over UD < 0.03 with bootstrap lower bound <= 0  -> K3 NOT SUPPORTED.
P6  Within-kind AUC of K_IMP exceeds that of P_IMP by < 0.03 (mean over UD).
P7  K_IMP INTERACTION beats the C2(b) q95 in <= 2/6 UD languages.
P8  C3 company shuffle: P_IMP AUC in 0.5 +- 0.05; K_IMP naive delta stays > 0 (it is the kind prior); INTERACTION collapses (< 0.03).
P9  C5 position-only in [0.45,0.55] on average; the CONF-only arm reaches AUC >= 0.60 on at least half the languages (matching is imperfect: mentions/gap leak).
P10 C4 sham 100% null; C6 determinism 30/30.
P11 Simpson: no (kind, score) sign reversal survives Holm correction.
P12 K4: with six languages there are only 10 distinct 3+3 family labelings, so min p = 0.1; the cosine of the mean-difference vectors (PROPN minus control, standardised
    IMP) within family is not significantly larger than across.

## VERDICT RULE for K3 in this replication
K3 SURVIVES only if ALL hold: (V1) INTERACTION mean over UD >= 0.03 and bootstrap lower bound > 0; (V2) within-kind AUC of K_IMP exceeds P_IMP by >= 0.03, lower bound > 0;
(V3) INTERACTION beats the C2(b) q95 in >= 4/6 languages; (V4) C3 shuffle INTERACTION < 0.03; (V5) INTERACTION with CONF added (K_IMP+CONF minus ADD_IMP+CONF) >= 0.02.
SURVIVES WITH CAVEATS if V1 and V3 hold and one of V2/V4/V5 fails. NOT SUPPORTED if V1 fails and P_IMP is no better than 0.5 + SESOI. REFUTED if the naive delta is
reproduced but V1-V3 all fail with the kind-only or frequency explanation accounting for it (KINDONLY >= K_IMP - 0.01).
K1 FALSIFIER: no K in the grid has excess stability above the shuffled null in a language. K2 FALSIFIER: one-vs-rest impact AUC for the induced kinds (IMP+CONF minus CONF)
is inside the C2(b) q95. K4 cannot be established with 6 languages (see P12); it can only be refuted.
No threshold, grid, seed, matching rule or arm above is changed after a result is read; a second round is a dated amendment on fresh data.
