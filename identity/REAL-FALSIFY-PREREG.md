# PREREG: falsify the shipped identity organ on real data

Written before any statement data is fetched or looked at. Stamped (`REAL-FALSIFY-PREREG.md.sha256`, `.time`) first.
Subject: the shipped `identity-warrant.js` (identity-warrant@2, noise-free stop rule; khora-identity.diff) plus khora's own
`induceKindsAndFunctions` for the one-valued relations (nothing hand-set). Every earlier result came from worlds I
generated with true facts; this is the first contact with real records.

## Data (real, public, read-only)
Wikidata, fetched once and saved: humans (P31 = Q5) with country of citizenship Russian Empire (Q34266), born 1750–1800,
first 150 by item id (ORDER BY item). All statements except deprecated rank; references kept (witnessed = has >= 1
reference). Values: item ids as ids; strings and external ids as strings; quantities as amounts; times at YEAR level
(arm Y, precision >= 9) and at DAY level (arm D, precision 11, else year). Coordinates dropped.

## Design: split-half, no invented truth
Each item's statements are dealt at random (seed 20261125) into two records, A and B. The two records of one item are a
TRUE pair (one real entity); records of different items are DISTINCT pairs. One-valued relations: induced by
`induceKindsAndFunctions` over the whole items (kinds = each item's own P31, a given Wikidata classification;
exposureFloor 3; sameValue = equality; witnessed as above); its `fixed` relations become `functional`. Prior: the
shipped `estimatePrior` on all records. Background corpus: all records. Every pair decided once (no fetching). Target 0.95.

## Falsifiers (each stated so it can fail)
- **R1 discernment on real data.** Arm Y: `different` on more than 5% of true pairs falsifies "a discernment is a
  refutation" for real records. (Prediction, written now: some false splits will occur, from items whose own statements
  disagree — e.g. two birth dates — dealt to opposite halves.) Arm D reported beside it.
- **R2 merge precision.** Arm Y: among `same` verdicts, more than 5% on distinct pairs falsifies the stop rule on real data.
- **R3 not vacuous.** Fewer than 3 `fixed` relations induced, or fewer than 20% of true pairs reaching `same`, falsifies
  the claim that the organ does useful work on real records (it would be silent, not wrong).
- **R4 the prior.** The estimate outside 0.5x–2x of the true rate (150 true pairs among C(300,2)) falsifies the estimator
  on real data.

## Reported regardless
Every true pair called `different`, with the statements that discerned it (so each false split can be read); held and
unjudged counts; which relations were induced fixed, and how exposed.

## What a failure means
A falsified claim is reported as falsified, with its counterexamples; nothing is tuned to pass. The shipped module is
not changed in this experiment.
