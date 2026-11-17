# PREREG: the dependency sequence from stated rules (Wikidata property constraints), judged by khora's identity-exclusion

Written before the adapter, the new exclusion step, or the property constraints for the samples exist here. Stamped first.
Follows INDUCER-FIX (b5ed9f33…): induction from repeated statements is starved on real records; Wikidata states the
rules. They are GIVEN (a named giver: the Wikidata community, cited per constraint statement), so khora's lattice lets
them convict. Nothing is hand-set here: every rule used is read from a property's own P2302 statements.

## What is built (khora @ b127284 + khora-inducer-fix.diff)
1. `native/adapters/wikidata/constraints.js`: property entities -> a given register.
   - KIND (step 1): a rule applies to the classes in its property's subject-type constraint (Q21503250, P2308); a
     referent's kinds are its own P31 values (no subclass reasoning: a stated limit).
   - ONE-VALUED (step 2): single-value (Q19474404) and single-best-value (Q52060874) constraints.
   - RANGE (new step 4): difference-within-range (Q21510854): rel minus base (P2306) within [P2313, P2312], in years.
   - Read and reported, not used for judging yet: distinct-values (keys, Q21502410), symmetric, contemporary, conflicts-with.
   - Giver string per rule: `wikidata:<property>#<constraint statement id>`.
2. `identity-exclusion.js` gains an optional step 4: `differences` (Map kind -> [{ rel, base, min, max, giver }]) and
   an injected `difference(u, v, rel, base) -> number | null`. For the MERGED pair it compares a's `rel` values with
   b's `base` values and the reverse (cross pairs only; a record against itself is not identity evidence). Out of range
   on witnessed assertions under a given rule convicts (`by: "range"`); null is incomparable, never a conflict. Without
   `differences` the organ is byte-for-byte unchanged in behaviour.
3. Values: times compared at the COARSER of the two precisions (year unless both are day, month, day); different
   calendars compare at year (a gate, SEG·G). Items by id, strings and quantities by equality.

## Data
The two saved samples (Russian Empire 145 items; Kingdom of France 144), split-half exactly as before (seed 20261125).
Constraints fetched once, for every property appearing in either sample, and saved.

## Hypotheses
- **E1 soundness.** True pairs (two halves of one item) `contradicted`: <= 5% in EACH sample. Every one is listed with
  its proof, so each can be read.
- **E2 power.** Distinct pairs `contradicted`: >= 20% in each sample (else the rules are too sparse to matter).
- **E3 the range step works.** It contradicts >= 1% of distinct pairs that steps 1–3 alone leave unbound, in at least
  one sample, and causes no more than 1% of true pairs to be contradicted beyond those steps.
- **E4 no regression.** khora's corpus-exclusion.test.mjs (12) and exclusion-falsify.mjs pass unchanged; new unit
  tests for step 4 and the adapter pass.
- **Power check.** M-norules (register with no one-valued rules) must fail E2. M-flip (range compares base minus rel)
  must fail E1. Otherwise nothing ships.

## Decision rule
E1–E4 hold and both mutants are caught: ship (adapter + step 4 + tests) as `khora-rules.diff`. E3 alone fails: ship
without step 4. Anything else: ship nothing and report. Merging (positive identity) is not tested here: exclusion only.
