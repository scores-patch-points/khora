# RESULTS round 12: why the canonical English read fails 31% of the time (2026-11-17)
Script: gum-errors.mjs (replicates the presence rung's own arithmetic, checked against the rung's bindings: 0 mismatches on 1,350 of 1,350 pronoun events; joins UD English GUM gold). Slices E, C, D, F (92 documents with answerable pronouns, 1,299 answerable pronouns, no dial tuned on any). Default dials, canonical read, no lexicon pack on the machine.
## The 31%
643 pronouns bound (60% of the 1,070 he/she answerable pronouns; the other 229 answerable pronouns are neuter it/its, which the he/she class never looks at), 443 right, 200 wrong: 31.1% wrong.
Causes of the 200 wrong bindings (mutually exclusive, in this order):
| cause | wrong | share of errors | share of all bound |
|---|---|---|---|
| bound a NON-PERSON (abstract topic 70, place 46, organisation 9, object 9, event 2, time 1) | 137 | 68.5% | 21.3% |
| the right antecedent was a candidate but a more salient one won (right one ranked 2nd in 24 of 50; the winner's gender was unknown in 33 of 50, so a gender check had nothing to use) | 50 | 25.0% | 7.8% |
| the right antecedent was not available (8 of 10 had no earlier mention: it comes later) | 10 | 5.0% | 1.6% |
| bound a person of the OTHER gender | 3 | 1.5% | 0.5% |
| the right antecedent is not in the cast | 0 | 0% (by the test's definition) | 0% |
Refusing non-persons perfectly would give precision 0.875 at 39% of answerable pronouns bound (from 0.689 at 49.5%).
## Where the errors sit
Three documents hold 86 of the 200 wrong bindings (43%): an article on Galois (41: "Siméon Poisson" bound 27 times, partly a cast that merges the person with "Poisson distribution"), one on Chao (31: "China New Culture", a movement), one conversation (14). Without the top two documents precision is 0.776. 26 of the 58 documents with any bound pronoun have every bound pronoun right. Precision by genre: conversation 0.50, biography 0.69, fiction 0.79, news 0.80 (bound >= 40).
## Why the machine had it wrong without telling anyone
adapters/text/non-personal.js is the repo's ruling that refuses non-persons ("March" and "the Home Office" were candidates for "he" and "she"; its own header measured 44 of 62 shipped bindings wrong before it). It needs the English Wiktionary pack and the time prior as givers. This machine has no pack, the ruling is not passed to the read, and the entry said nothing. The canonical read now files the typed gap `pronoun_presence_no_nonpersonal_ruling` on every read that lacks it.
## What it does not show
The ruling was NOT run (no pack here); 0.875 is what a perfect refusal of the labelled non-persons would give, not a measured result. Some "non-person" labels are cast defects (a person's name inside a compound topic phrase). The gold entity types are GUM's. Per-genre counts are small.
