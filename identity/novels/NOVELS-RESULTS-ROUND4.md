# RESULTS round 4 (tracked graph + holograph query), fresh books, 2026-11-17

Prereg PREREG-ROUND4.md (stamped 18:01:02Z), FREEZE-ROUND4.md (before any fresh book was downloaded). Fresh books (never read before): 1b548ec7 The Knight's Tale, 0c6bb0eb Le Cid, 40d8b1ee Louis Lambert, eaba6723 The Castle of Otranto,
1fa32a07 The Call of the Wild, 2584ef22 Le Bal de Sceaux, 29b3a0b4 The Way of the World, e3f3a84e The Great Stone Face; 87 questions after Q1-Q5. One run. Raw: NOVELS-ROUND4-fresh-raw.txt, tracker-fresh.log.

## Hypotheses
- T1 (tracked subject attachment at least doubles on every fresh book): HELD on 8/8. Subjects attached, exact-span only -> tracked: 6.8 -> 33.9, 3.0 -> 11.6, 3.8 -> 15.1, 8.5 -> 43.5, 10.9 -> 39.7, 1.3 -> 24.2, 2.1 -> 11.8, 2.6 -> 19.7 (%). Pronoun presence supplies most; the speaker rung helps in some books (Otranto +12.9) and is near 0 in others.
- T2 (H4's cut holds the answer sentence more than H's): NOT SUPPORTED. 0.492 vs 0.476; difference interval [-0.106, 0.143] (63 questions that name a cast referent). The cut is 1.4-1.7% of a book, so both are about 30x chance.
- T3 (H4 answers more than H): HELD, 25 vs 17 of 87.
- T4 (H4 F1 > B1): FALSE. H4 0.008 vs B1 0.087. T5 (H4 F1 > E): FALSE (0.008 vs 0.013). Predicted.

## Answers on the fresh books (F1 / EM)
B1 0.087 / 0.034 (best), B0 0.028 / 0.011, B2 0.010, R 0.021, F 0.000, E 0.013 / 0.000, Ef 0.018, Efp 0.046, H4 0.008, H 0.004. No system answers above the baseline of "the most frequent typed candidate".
The round-3 holdout lead did NOT replicate: R was 0.115 on the holdout, 0.021 here; E was 0.078, here 0.013; "E - B2 excluded zero" is gone ([-0.018, 0.031]). It was noise; E - B1 is now significantly negative ([-0.148, -0.009]).
What did replicate: referent-graph retrieval. E's top-25 reach 0.494 vs plain BM25 0.333 here (holdout 0.500 vs 0.346; dev 0.472 vs 0.333); interval [0.000, 0.299] here. The answer's sentence is in the referent cut (1.4% of the book) 48-49% of the time.

## What it says
Across three rounds of unseen books the one stable result is localisation: a question's named referents place the answer's sentence in a small region of the book, 3-30 times better than chance depending on the cut, and this does not need a word of the verb. The tracker makes the graph denser
(attachment 2-10x) but not enough to read answers off it: the graph-act path answers 25 of 87 and is no better than chance on the ones it answers. Choosing the answer inside the located region is the open wall. A zero-LLM system on these questions sits at EM 0-3%, F1 1-9% (the best being the most-frequent-typed-candidate baseline); the earlier holdout hints of 5-6% EM were noise.
Caveats: 8 books, 87 questions, wide intervals; plays and short stories in a translated/archaic register are over-represented; the speaker rung has no gold; question filters keep answers that repeat in the text, which favours B1.
