# PREREG-ROUND23 — English competency, part 1: a rung that always answers, measured as the 94% bar measures

The user: "improve our English competency", with the bar "94% to consider competency in any language". The bar's measure is resolved correctly = right / answerable: a pronoun the reader abstains on counts as not resolved. The default rung abstains on 39-64% of answerable pronouns (floor 2, margin 0.3), so its measure is low even where its precision is high: 0.329 on English FICTION (CorefUD English-LitBank train, 80 documents, 5,152 answerable, 0.537 precision at 61.3% coverage), 0.349 pooled with GUM E, C, D, F, 0.582 on GUM U.
## Development (done; data used only for choosing the dials; recorded here before the confirmatory run)
CorefUD English-LitBank train (80 documents) and GUM train slices E, C, D, F. Dials grid: window {2,4,6,8,12,16} x boost {1,2,3,4} x feed {0,1}, floor 0, margin 0. Rule: the arm with the highest pooled resolved-correctly. Chosen: window 12, boost 1, feed 0 (pooled 0.525 against 0.349 for the default; LitBank 0.506, GUM 0.613); declared in native/adapters/text/pronoun-presence-chosen.js as PRONOUN_GUESS_DIALS. Also tried and not adopted: roles from the English clause parser (LitBank resolved 0.329 -> 0.315 subject, 0.308 subject + co-argument: worse), and a hybrid of the confident bindings plus guesses for the rest (0.471 on LitBank against 0.506 for answering everything).
## Confirmatory (one run each, after the freeze)
CorefUD English-LitBank dev (10 documents, never read by any arm) as the fresh set; GUM U, dev and test as sighted checks (read for S0 and S6 in rounds 14-20). Arms: BASE (today) and GUESS (PRONOUN_GUESS_DIALS, same sentences, mentions and non-personal ruling, the rung re-run on the read's own presenceInputs).
- G1: on LitBank dev, resolved-correctly of GUESS exceeds BASE, 95% bootstrap interval over documents above zero.
- G2: the same on GUM U, dev, test (sighted).
- G3: precision of GUESS vs BASE (expected lower; reported) and the confident bindings of the read unchanged (the read keeps `pronounsPresence` as is; GUESS is a separate output `pronounsGuess`, each guess marked confident when the default rung bound the same pronoun to the same being, contested otherwise).
- G4 (falsifier): the same guesses with the referents permuted over the same pronouns, 200 draws.
- G5 (descriptive, by genre): GUM genres from the document ids.
The bar itself (94%) is not expected to be met; the result is the new measured distance. Failures reported. Nothing tuned beyond the one declared selection.
