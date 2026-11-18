# Round 25: a small auditable English antecedent ranker — not adopted

Preregistered (PREREG-ROUND25.md, 2026-11-18T06:45:04Z), frozen (FREEZE-ROUND25.md, 06:55:02Z), one run. Code: `native/adapters/text/pronoun-ranker.js` (19 named causal features, conditional logit, L2, no hidden layer); rows `identity/pronouns-multilingual/eng/build-ranker-rows.mjs`; run `eval-ranker.mjs`; weights and every number in `eng/results/ranker-round25.json`. Fit on LitBank train + GUM E, C, D, F (205 docs, 6,222 answerable pronouns); penalty 0.01 by 5-fold document CV (CV resolved-correctly 0.548 against the guess's 0.525 on the same documents). Evaluated once on four sighted sets (no unread English gold exists locally; the ranker never trained on them).

| held-out set | answerable | guess (round 23) | ranker everywhere | ranker on contested only |
|---|---|---|---|---|
| LitBank dev | 604 | 0.6606 | 0.6589 | 0.6639 |
| GUM U | 552 | 0.7283 | 0.7373 | 0.7554 |
| GUM dev | 199 | 0.6533 | 0.7085 | 0.6884 |
| GUM test | 219 | 0.7717 | 0.8037 | 0.7808 |
| pooled | 1,574 | 0.6989 | 0.7128 | 0.7154 |

Guess numbers reproduce round 23 exactly, so the comparison is like for like.

## Claims
- C1 (ranker at least the guess on every set and pooled, paired document bootstrap interval of the pooled difference above zero): NOT MET. Ranker everywhere is below the guess on LitBank dev and its pooled interval is [-0.012, +0.044]. Contested-only is at or above the guess on all four sets, pooled +1.65 points, interval [0.000, +0.041]: the lower end touches zero, so the preregistered test (above zero) is not met. Not adopted; nothing is wired into the read.
- C2 (permuted labels): permuted fits score 0.518, 0.364, 0.474, all far below the guess (0.699) and the real fit (0.713). The small gain comes from the labels, not from the machinery.
- C3 (ablation, pooled held-out; full model 0.7128): without activation 0.7058, distance 0.7014, salience 0.7090, same-sentence 0.7141, continuity 0.7160, kind-crossed 0.7186. Distance and activation carry whatever there is. Same-sentence, continuity and the kind-crossed features do not help held-out (removing them scores equal or higher): unused.
- C4: contested-only is the better variant on pooled, so by the prereg's rule it would be the one adopted had C1 held.

## Reading
The rung's activation already holds nearly everything these cheap features can see. A larger gain needs information the rung lacks (a clause parser that works on fiction was tried and did not help; semantic fit between a pronoun's predicate and a being; the quoted-speech structure), not a reweighting of the same signals. And a ranker cannot touch the giver's actual limit: round 24 scored 28 CoNLL F1 on English because the reader finds only names and he/she-class pronouns, not nominals or I/you/we/it/they. Raising antecedent precision by 1.5 points moves that by a point or two at most; recall of mentions is the lever.
