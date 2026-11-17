# STATED-RULES RESULTS (preregistered in RULES-PREREG.md, stamped 2026-11-17T04:31:06Z, sha256 09c15ab3…)

**Decision: NOT SHIPPED.** E2 failed (Russian sample) and E3 failed (both). Candidate in `rules-not-shipped/`
(adapter `adapters/wikidata/constraints.js`, step 4 in `identity-exclusion.js`, tests). Declared before running and
kept: each half record carries its item's own P31.

Register read from 480 properties' P2302 statements: 364 properties with a one-valued rule (single-value /
single-best-value), 10 difference-within-range rules (all in years), 0 unread.

| | Russian Empire (145) | Kingdom of France (144) | bar |
|---|---|---|---|
| E1 true pairs contradicted | 2 = 1.4% | 7 = 4.9% | <= 5% — holds |
| E2 distinct pairs contradicted | **8.9%** | 29.7% | >= 20% each — **fails** |
| E3 contradicted only by the range step (distinct / true) | **0.05%** / 0 | **0.27%** / 0 | >= 1% / <= 1% — **fails** |
| E4 khora corpus-exclusion (12), exclusion-falsify, new tests (6 + 3) | pass | | holds |
| M-norules distinct contradicted | 0.1% | 1.1% | caught |
| M-flip true contradicted | 18.6% | 33.3% | caught |

## Readings
- Stated rules are far sounder than induced ones: 1.4–4.9% of true pairs contradicted, against 21% with the buggy
  inducer. Every true pair contradicted is an item holding two values for a single-value property, both referenced:
  two birthplaces (Q656 / Q270), death 1800 / 1849, two birth dates in 1771, two CERL and two National Library of Russia
  ids. The record disagrees with itself; no rule can repair that.
- Power follows references: in the Russian sample most conflicts are raised as `unwitnessed_conflict` (18,873 pairs)
  and convict nothing, by khora's own discipline.
- The range rule is correct (0 true pairs contradicted by it; the flipped mutant is caught at once) but adds almost
  nothing on real pairs: a one-valued conflict nearly always decides first.

## Not done, worth a preregistration
Wikidata's single-best-value semantics: a preferred-rank statement marks the best value and other values are allowed
alternatives. Rank was not used; some true-pair contradictions may be exactly that.
