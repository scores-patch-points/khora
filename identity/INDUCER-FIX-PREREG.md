# PREREG: an untested member is not an agreeing one (khora kind-functional-induction.js)

Written before the fix is applied in its shippable form and before the fresh sample is fetched. Stamped first.
Found by REAL-FALSIFY (d8b60475…): `induceKindsAndFunctions` skips a disagreement with an unwitnessed side as
non-evidence, then counts the member as AGREED (`else if (!anyDisagree) r.agreed += 1`), so relations whose every
disagreement has an unreferenced side become `fixed`. khora's own eval (exclusion-falsify.mjs) cannot see this: it
declares every assertion witnessed. Its baseline on the unfixed code: SURVIVED (all claims, all controls).

## The fix
A member whose only disagreements were skipped as unwitnessed is UNTESTED: counted exposed, never agreed, never
refuting. Reported as `untested` in the relations table. No standing is renamed; nothing else changes.

## Hypotheses
- **I1 no regression.** khora's exclusion-falsify.mjs still SURVIVES on the fixed code (C0–C4, K1–K4).
- **I2 the bug is gone (unit, planted).** A member with two DIFFERENT values, one unreferenced, is not counted agreed;
  a relation whose exposed members are all like that is never `fixed`. Two equal values still count agreed; two
  different witnessed values still refute. Each case a test in a new `kind-functional-induction.test.mjs`.
- **I3 real data, fresh sample.** Wikidata humans, citizens of the Kingdom of France (Q70972), born 1750–1800, first
  150 ids — never fetched before. With the fixed inducer: no relation is `fixed` for which every member with >= 2
  values had differing values (checked directly from the data); and the shipped identity-warrant's split-half false-split
  rate (arm Y, as REAL-FALSIFY) is <= 5%.
- **I4 the original sample.** On the REAL-FALSIFY data (Russian Empire), the same two checks hold (it motivated the
  fix, so it is reported, not counted as evidence).
- **Power check.** The unfixed code (the bug) must fail I2's unit tests and I3's first check on the fresh sample. If the
  unfixed code passes them, the tests cannot see the bug and the fix is not shown.

## Decision rule
I1, I2, I3 hold and the unfixed code fails I2 and I3's first check: ship `khora-inducer-fix.diff` (the fix and its test).
Otherwise ship nothing and report. Recall on real data is NOT claimed to improve (REAL-FALSIFY's diagnostic says it will
not); it is reported.
