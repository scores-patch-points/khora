# PREREG-ROUND24 — a fixed external giver for judging competency: the official CorefUD scorer on the CorefUD 1.3 dev sets

The user, after seeing that our own competency measure (a narrow subset of third-person singular pronouns, our own definition of answerable and of right) was "not very effective" and ignored "all the other pronouns": "go find a giver for judging competency, these need to not have moving goal posts."
## The giver (pinned; nothing here is ours to change)
- Scorer: ufal/corefud-scorer commit 4fd7b0e0c661aeeff88bc60c19ef507b84d1b590 (2025-01-30), vendored in identity/givers/corefud-scorer; Python 3 with udapi (venv /tmp/corefud-venv); CoNLL F1 = the mean of the MUC, B-cubed and CEAFe F1, HEAD mention matching, singletons ignored (the primary CRAC metric); also with singletons (`-s`, the supplementary score). Every mention counts: pronouns of every person and number, names, nominal mentions.
- Data: CorefUD 1.3 public (CorefUD-1.3-public.zip, 102,547,413 bytes, lindat handle 11234/1-5896), the dev split of each dataset, never altered. Test splits are not public.
- System file: identity/pronouns-multilingual/score/predict-corefud.mjs from the canonical read: each cast being is a cluster of its mention spans plus the pronouns the read binds to it (English: pronounsGuess; other languages: pronounsPresence). Controls: the ORACLE (gold written back as the system) must score 100.00 (it does: CoNLL 100.00 on 3 LitBank dev documents) and an EMPTY system must score 0.
## What is scored (one run each, after the freeze; nothing tuned to it)
English-LitBank dev (10 documents), English-GUM dev (30), French-Democrat dev (46), Ancient_Greek-PROIEL dev (5). The result is the fixed competency measure: the system's score, with the scorer's own precision and recall, in the competency profile in place of the narrow measure. Not hypotheses about improvement: a measurement.
- Expected, stated now: low recall, because the reader finds only names and the he/she-class pronouns: no nominal mentions, no I/you/we/it/they. The CoNLL F1 will therefore be far below the 94% bar, and the bar needs restating on this scale.
Failures reported.
