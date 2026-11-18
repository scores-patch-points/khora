# PREREG-ROUND20 NOTE 5 — smelling the gender of a name never heard before (registered before any name is embedded or scored)

Findings from NOTE-4 (not yet part of a claim): the surprise-weighted gender model on U lost 15 right bindings, of which 15 of 17 dropped bindings belong to ONE cast being, "Alex Wilson Betty" (two people merged into one being; the giver says m from "Alex", the text says she of Betty): a conflict between the dictionary and use INSIDE one being, i.e. a false merge, the line. The snapshot answers only 46% of beings with a gold gender (r = 0.854, one-clause evidence q = 0.862). So: names the dictionary has never heard are most of the cases, and a name's FORM says something about its gender. The user's direction: smell those via embedding.

## The smell
Gender smell = two centroids (masculine, feminine) of the unit embeddings of the given-name labels of the Wikidata snapshot (identity/givers/wikidata-given-names-en.json; a name in both lists or the unisex list is excluded from training); model nomic-embed-text, prefix "classification: ", through the vector library. Score of a name = cos(v, masc) - cos(v, fem). Claim only beyond the null (Smell@1 style): the 95th percentile of the scores of 50 random other names' absolute scores... declared as janus's own 50 nulls; below it the smell abstains. No typed threshold.
Baselines: B1 the majority class (masculine, 62% of snapshot names); B2 a character-suffix naive Bayes (last 1-3 letters, from the same training names), the plain-form model with no neural net.
## Data
- Held-out NAMES: names whose sha256 ends in a hex digit in {0, 1, 2} of 16 (about 19%) are the unheard-of names; centroids and B2 trained on the rest.
- Held-out BEINGS: the GUM training-slice beings with a gold pronoun gender that the snapshot does NOT answer (the real never-heard names), words scored by centroids trained on ALL snapshot names; compared with B1 and B2.
## Hypotheses
- S1: on held-out names, accuracy of the smell beyond its null bound exceeds B2's accuracy on the same names and B1's, bootstrap over names, 95% interval above zero.
- S2: coverage at the bound and precision reported; the smell abstains below it.
- S3: on the GUM beings the snapshot cannot answer: coverage gained and accuracy against gold, above B1.
- S4 (falsifier): centroids trained with shuffled gender labels give chance (20 seeds).
- S5: the smell's reliability, measured as in NOTE-4 (r_smell on GUM beings, in nats), is what a surprise-weighted gender would use for a smelled prior; no number typed.
Failures reported. Not claimed here: languages other than English (the same smell per language from that language's given-name labels, applied to the nominative stem of a name in a case language, is the next step; the user's requirement that this work for case-marked languages stands).
