# RESULTS round 5: learning how to choose the answer, with one universal learner and learned attention (2026-11-17)

Prereg PREREG-ROUND5.md (18:17:45Z) + NOTE-1 (18:23:05Z); FREEZE-ROUND5.md (18:37:00Z, before any final-test question was filtered). Learner: attend.mjs (no task code; declared constants only). Raw: qa-lobo.json, qa-curve.log, identity-loso.json, NOVELS-ROUND5-final-raw.txt.

## Task 1, choosing the answer (282 questions on 25 read books, leave-one-book-out; pool = candidates in the tracked-graph cut, entity-scene top 25 and BM25 top 10)
Pool ceiling: a candidate with F1 >= 0.5 is in the pool for 35% of questions; best-in-pool F1 0.31, random-in-pool 0.034, B1 0.059 (EM 0.021).
| learner | LOBO F1 | EM |
|---|---|---|
| ungated (L2 chosen by validation: 0.01 in 23/25 folds) | 0.085 | 0.050 |
| gated (pheromone attention) | 0.078 | 0.039 |
- L1 (learned > B1): NOT SUPPORTED. ungated - B1 [-0.020, 0.072]; gated - B1 [-0.026, 0.061]. Direction positive, interval includes 0. Who 0.12 vs B1 0.09; what 0.06 vs 0.02; where 0.00 vs 0.08 (25 questions); number 6 questions.
- L2 (curve still rising at 24 books): NOT SUPPORTED. F1 by training books 4 / 8 / 16 / 24 = 0.072 / 0.074 / 0.076 / 0.085; F1(24) - F1(8) = +0.011, [-0.004, 0.027]. About +0.01 per doubling of data at best.
- L3 (leave-one-group-out ablation): NOT RUN. What attention found instead: the pheromone gate kept ONLY the frequency channel in 24 of 25 folds, i.e. it rediscovered B1's signal and evaporated everything else.
- A1 (attention pays on this task): NOT SUPPORTED. gated - ungated [-0.034, 0.018]; the evaporation rule over-prunes when each channel's validation credit is small and noisy.
## L4, final unread books (8 books, 80 questions, one run, frozen learner trained on all 25 books)
B1 F1 0.053 EM 0.013; ungated learner F1 0.113 EM 0.087; gated 0.067 EM 0.050. ungated - B1 F1 [-0.029, 0.167]; EM [-0.011, 0.169]. L4 NOT SUPPORTED (interval includes 0); the direction matches LOBO. Pool oracle on these books 0.340.
## Task 2, record identity (1,200 Open Library edition pairs, leave-one-subject-out over 10 subjects; same attend.mjs, no tuning)
Title-token Jaccard alone AUC 0.937; best single learned channel (author) 0.963; ungated learner 0.9943 (accuracy 0.969); gated 0.9902 (0.965), keeping only title and author in 10/10 folds.
- A2 (gating within 0.005 AUC with fewer channels): HELD (0.0041 difference, 2 of 11 channels). A3 (attended sets differ between tasks): HELD (frequency vs title+author). A4 (learner beats the best single channel without per-task tuning): HELD (0.994 vs 0.963; no interval computed over 10 subjects).
## What it says
One learner, with no task code in it, found which evidence to attend on two unrelated tasks: on identity it found the two channels that matter and lost 0.004 AUC; on answer choice it found only the frequency signal. The learned chooser is the first thing in these five rounds whose direction beats the baseline on both cross-validation and unread books (F1 0.085 / 0.113 vs 0.059 / 0.053),
but with 8-25 books it cannot be told from noise, more data of this kind adds about +0.01 F1 per doubling, and the ceiling is the pool (35% of questions have a usable candidate). The wall has moved to what reaches the pool: better retrieval and a denser graph, not a better chooser on the same inputs.
Caveats: the pheromone rule's constants were declared, not tuned (an over-pruning result is informative, not a tuning invitation); question filters favour repeated answers; where-questions are 25 of 282; the speaker rung has no gold.
