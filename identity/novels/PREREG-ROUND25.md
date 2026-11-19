# PREREG-ROUND25 — a small auditable English antecedent ranker

Question: does a ranker with a few named, causal features choose the antecedent of a he/she-class pronoun better than the presence rung's top activation (the always-answering guess, round 23)? Not a mention finder: it cannot raise the giver's recall of nominals, I/you/we/it/they. It can only raise precision of the bindings the guess already makes.

## What is built (nothing here is tuned on the evaluation sets)
- Candidates: the guess rung's own candidate list (`keepCandidates`, PRONOUN_GUESS_DIALS: window 12, boost 1, feed 0, floor 0, margin 0): gender-compatible, non-personal-ruled, activation > 0. The ranker never adds a candidate.
- Features per (pronoun, candidate), all causal (only text before the pronoun, plus the rung's own earlier argmax, never the ranker's own earlier choice): log activation; is rung top; is rung second; sentence distance of the candidate's last mention (0, 1, 2, 3+); log(1 + mentions so far); candidate's last mention opened its sentence; candidate named earlier in the pronoun's own sentence; candidate is the only being named in the pronoun's own sentence; candidate was the rung's argmax for the previous pronoun; candidate is the most recently mentioned being; each of three of these (named earlier in own sentence, last mention opened its sentence, previous-pronoun argmax) crossed with pronoun kind (subject he/she, object him/her, possessive his/hers, reflexive himself/herself).
- Model: conditional logit (softmax over candidates), L2 penalty, full-batch Adam, no hidden layer. Weights are a named JSON, readable by hand.
- Decision: argmax. No threshold. A binding carries the model's own probability.

## Data (the same split as round 23, so the comparison is like for like)
- FIT: LitBank train (80 docs) and GUM slices E, C, D, F. The penalty is chosen by 5-fold cross-validation by document on FIT only, from {0.01, 0.1, 1, 10}; the final fit uses all of FIT.
- EVALUATE, once, weights frozen: LitBank dev (10 docs), GUM U, GUM dev, GUM test. Honest note: these were sighted by round 23 (dial confirmation); no unread English gold exists locally. The ranker never trains on them. The fresh set is GAP (not downloaded; needs the user's word).
- Gold and the answerable set are the round 23 definitions. Baseline is the unmodified guess on the same documents (round 23 numbers: 0.661, 0.730, 0.653, 0.772; recomputed in the same run).

## Claims, decided before running
- C1: ranker resolved-correctly >= guess on each of the four sets AND pooled, with a paired document bootstrap 95% interval of the pooled difference above zero. Otherwise the ranker is not adopted and the failure is reported.
- C2 (attack): permute the candidate labels within each pronoun in FIT, refit, evaluate: must score at or below the guess. If the permuted fit matches the real one, the gain is not from the features.
- C3 (ablation): drop each feature family and refit on FIT; report the held-out drop for each; a family whose removal does not lower pooled held-out resolved-correctly is reported as unused.
- C4: confident bindings of the rung (the default dials' bindings) are unchanged: the ranker only reorders the guess's contested set and is not applied where the default rung already binds with margin; report both variants (ranker everywhere; ranker only on contested) and adopt the one that wins C1 on pooled, ties to the simpler (contested only).
- If adopted: giver CoNLL F1 re-scored once on English-LitBank dev and English-GUM dev, reported with the round 24 numbers beside it.
