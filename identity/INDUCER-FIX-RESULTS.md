# INDUCER FIX RESULTS (preregistered in INDUCER-FIX-PREREG.md, stamped 2026-11-17T04:24:51Z, sha256 b5ed9f33…)

**Decision: SHIPPED** as `khora-inducer-fix.diff` (khora @ b127284): `kind-functional-induction.js` counts a member whose
only disagreements have an unwitnessed side as `untested` (never agreed), plus `kind-functional-induction.test.mjs`.
The diff applies cleanly to the pinned files; the new test passes and khora's exclusion-falsify.mjs still SURVIVES.

| check | fixed | unfixed (the bug) |
|---|---|---|
| I1 khora's exclusion-falsify.mjs | SURVIVED | SURVIVED (it declares every assertion witnessed, so it cannot reach the bug) |
| I2 unit tests (4) | 4 pass | fails the bug case (and the `untested` field check) |
| I3 fresh sample (Kingdom of France, 144 items): relations `fixed` though every member with >= 2 values differs | none | P108, P214, P268, P734 |
| I3 fresh sample: split-half false splits (shipped identity-warrant, arm Y) | 0/144 = 0% | 9/144 = 6.25% |
| I4 original sample (Russian Empire, reported only) | P570 only; 1/145 = 0.7% | 21.4% |

## What the fix does not do
It removes false one-valuedness; it adds no power. On the fresh sample the fixed inducer induces NOTHING: every true
pair ends `held`, recall 0, and the prior estimate is meaningless (28.7x, from almost no comparisons). One-valuedness
induced only from a member repeating a property is starved on real records.

## The explicit rules exist
Wikidata states property constraints (saved: `real-falsify/wikidata-property-constraints.json`): P569 and P570 are
single-best-value; P570 must lie within -1..+150 years of P569 ("you can't be born after you're dead"); P27 and P26
are contemporary, not single-value; P26 is symmetric; P1343 and P735 carry no single-value constraint. These match the
data where the buggy inducer did not.
