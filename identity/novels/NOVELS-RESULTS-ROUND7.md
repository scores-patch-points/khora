# RESULTS round 7: a referent is the company it keeps (2026-11-17)
Prereg PREREG-ROUND7.md (19:28:12Z), FREEZE-ROUND7.md (19:28:53Z). Development: 94 no-name questions on the 34 read books (78 have a referent as the answer). Test: 30 no-name questions of the 8 round-6 books (only 11 have a referent as the answer; the retrieval counts of these questions were seen in round 6).
## Results (SQuAD F1, questions naming no character whose answer is a character)
| | development (78) | test (11) |
|---|---|---|
| C: prior x company likelihood | 0.051 | 0.045 |
| PRIOR: the most-mentioned referent | 0.174 | 0.224 |
| LIK: company likelihood only | 0.026 | 0.000 |
| B1: most frequent typed candidate (round 1) | 0.098 | 0.073 |
- C1 (C > B1): NOT SUPPORTED. Test [-0.300, 0.155].
- C2 (C beats PRIOR and LIK): FALSE. C - PRIOR [-0.556, 0.125] on the test; on development PRIOR beats C [-0.234, -0.015]. C beats LIK (test [0.000, 0.167]) only because LIK is 0.
- C3 (about-the-whole-book questions: PRIOR as good as C): the prediction held trivially (PRIOR >= C), 2 test questions, 14 development.
- Exploratory (not preregistered): PRIOR - B1 development [-0.081, 0.226]; test [0.000, 0.467] with 11 questions.
## What it says
Matching the words of a description to each character's surrounding text does not work (LIK alone at chance), the same as every other word-matching attempt in these rounds. What works a little is centrality: when no character is named, answering with the most-mentioned character gives F1 0.17-0.22 on questions whose answer is a character, about double the frequency baseline, but the evidence is thin (the test set has 11 such questions).
In short stories fewer no-name questions have a character as the answer (37% against 83% in the longer books), so these gains do not carry far.
