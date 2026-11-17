# RESULTS: mechanical question answering on novels not read before (NarrativeQA extractive subset), run 2026-11-17

Preregistration NOVELS-PREREG.md (sha256 033991b6…, stamped 16:50:14Z), Amendments 1, 1b, 2 (stamped before any question was matched), FREEZE.md (answerer sha256 02f80bb8…, 17:14:04Z, before any evaluation question was filtered).
Raw output: NOVELS-RESULTS-raw.txt. No model of any kind in the system.

## Data actually used
8 evaluation books (9562ea78 The Variable Man, b6154115 The Rivals [play], c9fab7d8 Captain Brassbound's Conversion [play], feacf157 A Planet for Texans, 14fc0de6 A Sentimental Journey, 72ddeff1 The Time Machine, 3bbc2ac0 Quality Street [play],
95e9be5f Voodoo Planet [replaced the drawn Shadows in Zamboula, whose token count was 15.4% off the stated count]); 103 questions after Q1-Q5 (6-21 per book; a book contributes 6-21, so book clusters are uneven). Each book was read whole through the one reader
(`readToWeft`, EOT sidecar, byte addresses; 47-168 s per book, no errors, no gaps). The size-only draw included three plays and a travel narrative. NarrativeQA's wiki title for dev book 4a92bf27 does not match the Gutenberg title (the text contains the story).
Dev book e72d83e5 resolves to a different (zoology) text and yields no questions. Dev set was 14 questions: too small to tune on, so nothing was tuned beyond two defects fixed (unresolved pronouns as candidates; frame head taken from alignment, not the question's own parse).

## Result (F1 over all 103 questions, every question answered by B0/B1; F abstains when no frame fits)
| system | F1 | EM | answered |
|---|---|---|---|
| B0 random typed candidate | 0.028 | 0.019 | 103 |
| B1 most frequent typed candidate | 0.069 | 0.029 | 103 |
| B2 BM25 sentence -> first typed candidate | 0.021 | 0.010 | 66 |
| F (Tier 1 frame fold + Tier 2 entity fold) | 0.000 | 0.000 | 24 |
| F1only / F2only | 0.000 / 0.000 | | 19 / 6 |
| R role-blind (F's sentence, any typed candidate) | 0.048 | 0.010 | 92 |
| FL (F climbed the terrain ladder, window radius 0-2; extra, not preregistered) | 0.000 | 0.000 | 24 |
Stage A (reader ceiling, uses gold, not a system): exact reader candidate equals a reference answer for 77.7% of the questions; best-candidate F1 0.909 (0.763 within the type-matched pool).
Book-cluster bootstrap (10,000), 95% interval of the F1 difference: F-B2 [-0.058, 0.000]; F-B1 [-0.132, -0.019]; F-B0 [-0.068, 0.000]; F-R [-0.088, -0.011]; F-F1only and F-F2only [0, 0]; FL-F [0, 0].

## Hypotheses and predictions
- N1 (F beats the best baseline): FALSE. F is the worst system; B1 (most frequent typed candidate) is the best, at 0.069.
- N2 (abstention informative): not evaluable; F's answered set has F1 0.000, nothing to separate.
- N3 (both tiers matter): FALSE (no difference from either ablation; each ablation is also 0).
- N4 (the frame helps; F beats R): FALSE, reversed (R beats F, interval excludes 0).
- N5 (control C1): not run.
- P1 (F beats B2 on who and where, not on what/which): FALSE (F is 0 on every type).
- P2 (the oracle ceiling is under 70%): FALSE (77.7% exact-chunk share). The ceiling is high mainly because the book has thousands of candidate spans per book (7,362 in the dev book), so it says little about how few the answerer can choose among.
- P3 (Tier 2 adds under 3 F1 points): true, trivially (it adds 0).

## What this shows, and what it does not
Mechanical alignment of a question's frame to a book's frames, as built here, does not reach a model-free answer to these questions: the best single-sentence scoring finds a sentence containing the gold string in only 3 to 5 of 14 dev questions, and
when it did the chosen span was almost never the answer. Where the answer is a repeated name (B1's few wins), frequency beats alignment. Failure sources visible in the dev inspection, not separated here on the evaluation set: (1) no paraphrase fold between
the question's words and the text's (the book's own lemma lexicon only covers clause predicates); (2) questions parse poorly (non-declarative); (3) the answer often sits in a neighbouring sentence (the ladder did not repair this); (4) reader clause units are
sparse (objects present in about 1 of 4 clauses). A named gap, not a finding about meaning: the system's best-scoring cases cannot be separated from chance with 103 questions.
Not done: control C1; the preregistered per-type tests beyond the table; abstention at SURPRISE (F answers too few for it to matter). The paraphrase fold that the janus `same()` formula and the terrain ladder (entity -> kind, link -> network) would supply was only approximated (LCS anchors, window widening).
