# Round 17: standardized part-of-speech centroids, and sniffing words the prior does not hold

Preregistered (PREREG-ROUND17.md, stamped 2026-11-18T02:10:10Z), one run, GUM test tokens (28,397) against centroids built from the POS prior (UD English EWT train, 14,538 single-class forms, 17 UPOS classes). The prior is a different corpus from the test.

| | tokens | B1 (prior's dominant class; most frequent class for unseen words) | P0 (word vector, nearest centroid) | P1 (word + sentence mean) |
|---|---|---|---|---|
| all | 28,397 | 0.779 | 0.526 | 0.481 |
| IN the prior | 23,194 | 0.912 | 0.504 | 0.459 |
| OOV (not in the prior) | 5,203 | 0.186 | 0.626 | 0.582 |

- Q1 HOLDS: on OOV tokens P0 - B1 = [+0.399, +0.485] (document bootstrap).
- Q2 FAILS: the sentence blend makes it worse, P1 - P0 = [-0.069, -0.022]. In this static form context did not carry POS.
- Q3 HOLDS: PROPN is 34.2% of OOV tokens; P0 recalls 61.0% of them at 80.6% precision (the confusions: NOUN 462, VERB 62).
- Q4 HOLDS: 20 shuffled-label centroid sets get 0.055 on OOV (best 0.103).
- Q5 holds weakly: on tokens the prior knows, the centroid agrees with the prior's dominant class 49.5% of the time (chance 16.5%); the prior is the right tool there (0.912).
Reading: the sniff is for words the prior does not hold; it is not a replacement where the prior has an answer.

Exploratory, after the run (not preregistered): the null bound (the class centroid's own p95 over 50 random forms of other classes) does not separate right from wrong: claimed 0.637, unclaimed 0.615. Clustering the unclaimed words by the same bound gives topical groups (language/linguistics, music, politics, weather), 651 of them: the word embedding carries topic more than grammatical class, so "emergent POS" built this way finds semantic fields, not syntactic classes. A syntactic representation (distribution over frames, the complementary-distribution kernel) is the likely route and is not tried.
