# RESULTS round 9: our best pronoun resolution, then what meta-thoughts add (2026-11-17)
Prereg PREREG-ROUND9.md (19:59:22Z), FREEZE-ROUND9.md (20:02:14Z, before the unread books were run through meta.mjs). Raw: NOVELS-ROUND9-final-raw.txt, meta-dev.json, meta-final.json; the first final run was a MISRUN (policy trained on 32 books because nine ids were passed to `cat` as filenames): NOVELS-ROUND9-final-raw-MISRUN-32books.txt; the frozen procedure was rerun unchanged with all 41 books. Pharos log: logs9/ (not committed).
## Pronouns (P1)
Used: the presence rung with the dials its own preregistration CHOSE (window 3, boost 1, feed 1, floor 0, margin 0; PRESENCE-DIALS-B.json), not the control arm's dials that rounds 4-8 used by mistake. The attention binder (it, descriptions) was not used: its own round 5 failed 3 of 6 bars.
- Share of he/she pronouns bound: about 66% -> 97.6%.
- Pronoun rule foresight saving per book (33 books, paired): 499 -> 1,101 bits, +602 [516, 689], up on 33/33. Joint competence 10.97% -> 24.86%. P1 HELD on the direction; the prediction of a rise under 20% was FALSE (it more than doubled).
## Meta-thoughts: M2 learns which candidate thoughts to admit (leave-one-book-out on 41 books; then one run on 8 unread train-split books)
| | development: precision / net-of-cost bits / admitted | unread (8): precision / net-of-cost bits / admitted |
|---|---|---|
| R8, round 8's rule | 0.629 / 2,678 / 18.9 | 0.494 / 2,701 / 17.5 |
| M1, kind-level only | identical to R8 (every kind clears 1/2) | identical to R8 |
| M2, learned probability of a positive foresight | 0.822 / 2,813 / 11.7 | 0.833 / 2,863 / 7.5 |
| ORACLE (every thought with foresight > 0) | 1.000 / 2,549 / 28.8 | 1.000 / 2,655 / 19.0 |
- M2-a (precision above R8's): HELD. development +0.19 [0.12, 0.27]; unread +0.34 [0.21, 0.46].
- M2-b (net-of-cost above R8's): HELD. development +135 bits [40, 236]; unread +162 [65, 296]. Gross foresight is NOT different (development +12 [-18, 47]; unread +21 [-0.4, 43]).
- M2-c (M2 above M1): HELD (M1 equals R8, it changes nothing). M2-d (survives on unread books): HELD.
- What M2 weighs (standardised): the size of the thought's hindsight saving (log hindsight 1.07, hindsight relative to the book 1.24) far above everything else; kind and cost count little.
- Replay: the learned meta-thought was written into the pharos and rebuilt from the log; the held-out admission decisions were reproduced exactly on 49/49 folds.
## What it says
The meta-thought makes the system admit fewer thoughts and be right far more often (0.49 -> 0.83 on unread books), keeping the same surprise reduction while paying for less than half as many thoughts. It does not raise the gross surprise reduction; it removes thoughts that did not pay. The ORACLE row shows the ceiling for precision, and that admitting every positive thought is not the best net result once costs count.
## Caveats that matter
- The pronoun rule gives most of the competence, and part of that is circular: a pronoun bound to the most-present referent is, by construction, easy to predict from presence, which is the reader's own signal. The foresight test does not remove this (both parts of the book have it). The share bound (97.6%) says nothing about how many are bound RIGHT; the 84% precision is from the GUM test set, not novels. There is no pronoun gold on these books.
- Costs are declared (log2 sizes); a different cost model would change the net-of-cost column, not the precision column.
- Unread = 8 books never used in any round (NarrativeQA train split, no questions involved). Eight books is small; the unread intervals are wide but exclude 0 for M2-a and M2-b.
