# Round 23: English competency, part 1 — a rung that always answers, measured as the 94% bar measures

Preregistered (PREREG-ROUND23.md, 2026-11-18T05:54:25Z); dials chosen on DEVELOPMENT data only (CorefUD English-LitBank train, 80 documents, and the GUM training slices E, C, D, F; pooled resolved-correctly 0.349 default -> 0.525 with window 12, boost 1, feed 0, floor 0, margin 0); frozen (FREEZE-ROUND23.md) before the confirmatory run. The bar's measure: right / answerable (abstaining counts against it).

| confirmatory set | answerable | default: resolved (precision at coverage) | always-answering: resolved (precision) | difference, 95% bootstrap over documents |
|---|---|---|---|---|
| English FICTION, held out (LitBank dev, 10 documents, fresh) | 604 | 0.518 (0.792 at 65.4%) | 0.661 (0.662) | [+0.067, +0.216] |
| GUM U (66 documents, sighted) | 552 | 0.576 (0.893 at 64.5%) | 0.730 (0.730) | [+0.069, +0.267] |
| GUM dev (30, sighted) | 199 | 0.538 (0.856 at 62.8%) | 0.653 (0.657) | [+0.057, +0.193] |
| GUM test (30, sighted) | 219 | 0.667 (0.907 at 73.5%) | 0.772 (0.772) | [-0.027, +0.283] |

- G1 HOLDS (fresh fiction: +14.3 points, interval above zero). G2 HOLDS on U and dev; on the 30-document test the interval includes zero (+10.5 points). G3: precision drops (0.66 to 0.77): the confident bindings (`pronounsPresence`) are unchanged and the always-answering output is a separate `pronounsGuess`, each marked confident (the default rung bound the same pronoun to the same being) or contested.
- Tried on development and NOT adopted: roles from the English clause parser (LitBank 0.329 -> 0.315 subject, 0.308 subject + co-argument: worse); a hybrid of the confident bindings plus guesses for the rest (0.471 against 0.506).
- Pooled over the four confirmatory sets: 0.699 resolved correctly (1,101 of 1,574). English fiction 0.661, the weakest set GUM dev 0.653. The 94% bar is NOT met: short by about 0.24.
- Not done in this round (ranked by what the errors say): the remaining wrong guesses (1,464 of 5,152 on LitBank train under the default; the right referent is in the candidate set but outranked, or the real referent was never admitted), quotation and speaker structure (conversation had a 50% wrong rate), the name ruling for fiction (LitBank carries entity types: a second typed corpus for the table), and the revision-without-erasure of early guesses.
