# PREREG-ROUND14 — a measured name-personhood ruling for he/she (the non-personal giver)

Context: round 13 left the default presence rung (S0) as the best. 69% of its wrong bindings go to a being that is not a person
(places, organisations, abstract names). Exploration (not confirmatory, stated here so it is not hidden): a token table built from GUM train
documents NOT in slices C-F vetoed 46 of 643 bound pronouns on C-F: 41 wrong, 5 right. That was looked at before this registration.

## Candidate (S6)
S0 plus a ruling `nonPersonal` = the cast beings whose own mention words carry measured non-person evidence:
- Table (`scripts/build-name-prior.mjs`, from UD English GUM TRAIN gold entity types, all 197 documents): for every gold mention, its key words
  (its PROPN words; if none, its last word), lower-cased, counted [person, not person].
- A being is non-personal iff, summed over the key words found in its mention spans, not-person > person and the total >= 2 (the same declared
  minimum of two observations as the verb prior; not tuned).
- It is passed to the rung as `nonPersonal` (the rung's existing option). English only.

## Data and freeze
Evaluated once on GUM dev (30 docs) and GUM test (30 docs), he/she answerable pronouns as in round 13 (same scorer, `gum-stages.mjs` logic,
`identity/novels/gum-name-veto.mjs`). Dev and test were read in round 13 for S0..S5 counts only; neither was ever used to build or choose the table.
Code and table hashed in FREEZE-ROUND14.md before the run. Leak-free secondary (exploratory, already seen): C-F with a table built from the other train documents.

## Hypotheses (all against S0, pooled dev+test, document-cluster bootstrap, 10000 draws)
- H1: the pronouns whose binding the ruling changes are wrong more often than a random set of the same number of S0 bindings (permutation null, 10000 draws); one-sided p < 0.05.
- H2: precision(S6) - precision(S0) has a 95% interval above zero.
- H3: coverage(S6) - coverage(S0) has a 95% interval that includes zero or is above it (the ruling must not just refuse).
- H4 (falsifier K): the same table with the person/not-person counts permuted across words gives no precision gain (its change-set wrong share is not above the null).
- H5: a read in any language other than English is byte-identical (the ruling is English-only).
Failures are reported as such. No dial is tuned. If H1 fails, the ruling is not wired.
