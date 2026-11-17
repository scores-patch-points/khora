# RESULTS rounds 2 and 3 (paraphrase fold; entity -> scene -> role -> word), holdout run 2026-11-17

Prereg: PREREG-PARAPHRASE.md (c4f16a75…, 17:18:11Z) + ERRATUM-1, PREREG-ROUND3.md (17:29:56Z) + NOTE-1, FREEZE-ROUND3.md (17:32:59Z, before any holdout question was filtered). Holdout: 8 books never read before this round
(db50738d Peter Pan in Kensington Gardens, bff11693 The Spanish Curate, 9bb9407d Blanco Posnet, 019a9611 Lisbeth Longfrock, 78775713 Earth Spirit, 1b82b150 The Recruiting Officer, 4a130666 Youth, fcc49197 Overruled; 78 questions after Q1-Q5; mostly plays and short fiction).
Raw: NOVELS-ROUND3-holdout-raw.txt, NOVELS-ROUND2-holdout-raw.txt. No model of any kind.

## Answers (F1 / EM, 78 questions, unanswered = 0)
| system | F1 | EM |
|---|---|---|
| R (round 1's role-blind ablation: its LCS-anchor sentence + first typed candidate) | 0.115 | 0.064 |
| E (entity -> scene -> BM25 inside -> first typed candidate) | 0.078 | 0.051 |
| Ef (E + fold) | 0.060 | 0.051 |
| B1 most frequent typed candidate / B2 BM25 / B0 random | 0.024 / 0.024 / 0.014 | 0.000 / 0.013 / 0.000 |
| F (round 1's frozen frame fold) | 0.006 | 0.000 |
Ep/Efp (proximity span choice) equal E/Ef. On spent books (dev, seen) every system sat at 0.02-0.07; the holdout ordering R > E is not a prediction anyone made and rests on 78 questions: treat it as a lead, not a finding.

## Retrieval (a reference answer inside the top-k sentences)
| | top-5 | top-25 |
|---|---|---|
| plain BM25 | 0.192 | 0.346 |
| E (scene first) | 0.244 | 0.500 |
| Ef | 0.218 | 0.526 |
(dev, seen: plain 0.107 / E 0.243 / Ef 0.282; the lift shrank from +0.14 to +0.05 on the holdout.) Round 2 own metric on the holdout: fold BM25 top-5 0.141 (plain 0.218), top-25 0.397 (0.410); top-5 non-overlapping windows reach 0.321.

## Hypotheses (95% book-cluster intervals of differences)
- E1 (E retrieval > plain): NOT SUPPORTED. top-5 +0.052 [-0.077, 0.172]; top-25 +0.154 [-0.072, 0.352].
- E2 (E F1 > B1): NOT SUPPORTED. +0.054 [-0.054, 0.142].
- E3 (Ef adds over E): FALSE. retrieval top-5 -0.026 [-0.123, 0.086]; F1 -0.018 [-0.064, 0.028].
- E4 (fold alone does not beat E): held, trivially (fold alone is not better than plain).
- R1 (fold raises retrieval): FALSE. top-5 fold - plain -0.077 [-0.181, 0.013]; top-25 -0.013 [-0.140, 0.127]. R2 (window adds): FALSE. window reach (<= 25 sentences) minus plain top-25 -0.09 [-0.237, 0.077].
- R5 (fold reaches the no-overlap questions): FALSE. On the 26 holdout questions whose answer sentence shares no content lemma with the question: plain top-5 0.000, fold top-5 0.000, window reach 0.154.
- R3, R4 (F1 of folded BM25 B2f; FRf): NOT RUN (only the retrieval side of round 2 was built).
- Predictions: E top-5 in 0.20-0.40 held (0.244); E F1 under 0.12 held (0.078); Ef adds under 3 points held (it subtracts); fold improves only modestly: it did not improve.
- Exploratory (not preregistered, one interval excludes 0): E - B2 F1 +0.059 [0.007, 0.112].
Disclosed: the salience signal from khora's holograph (bayes-surprise.js) was tested on spent questions as the user's text-specific holograph with priors and fell to AUC 0.532 (NOTE-1); not used.

## What it says
Entity-anchored scene localisation roughly doubles top-25 retrieval on the holdout (0.35 -> 0.50) but the evidence that it beats plain BM25 is weak at 8 books (intervals include 0). The paraphrase fold, built from 280k tokens of co-occurrence, does not reach the questions
that need paraphrase (0 of 26) and adds false folds (about 134 folded words per question). With the answer sentence given, span choice reached F1 0.28 on spent questions; end to end the best holdout system is at EM 5-6%, F1 8-12%. The wall is both reaching the sentence and choosing the span in it.
