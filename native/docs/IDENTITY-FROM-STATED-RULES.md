# Identity from stated rules — what was tested, and what each result licenses (2026-11-17)

Three changes, each preregistered (stamped sha256 and time before its run) and run against real records. The
preregistrations, run scripts and raw results are kept outside the repo with the session that made them; their hashes
are given so the texts can be checked.

## 1. kind-functional-induction: an untested member is not an agreeing one — SHIPPED
Preregistration sha256 `b5ed9f33…` (2026-11-17T04:24:51Z).

`induceKindsAndFunctions` skipped a disagreement with an unwitnessed side as non-evidence and then counted the member
as AGREED, so relations that disagreed for every member became `fixed`. eval/identity/exclusion-falsify.mjs could not
see it: it declares every assertion witnessed. Found by splitting real Wikidata items in half (two records of one
person): with the bug, 21.4% of 145 people (citizens of the Russian Empire, born 1750–1800) were split from themselves,
on relations induced `fixed` though every member's values differed (described by source, citizenship, given name,
spouse, languages, family). Fix: such a member is `untested` — exposed, never agreed, never refuting.

| check | fixed | unfixed |
|---|---|---|
| exclusion-falsify.mjs | SURVIVED | SURVIVED (cannot reach the bug) |
| kind-functional-induction.test.mjs (4) | 4 pass | fails the bug case |
| fresh sample (Kingdom of France, 144 items): relations `fixed` though every member's values differ | none | employer, VIAF id, BnF id, family name |
| fresh sample: true pairs split | 0/144 | 9/144 |

It removes false one-valuedness and adds no power: on the fresh sample nothing at all is induced, because real records
rarely state a property twice. That is why rules must come from somewhere else (section 3).

## 2. reasoning-lint: each holon reports the identity partition in force — SHIPPED
Preregistration sha256 `95ee5ece…` (2026-11-17T02:12:07Z).

`lintGfp`'s `basis.declared.identity` counts declared identity relations; two runs with the same claims and the same
basis can merge different names and reach different verdicts. `holons[i].identity` now lists the name classes merged
there. Falsification (3,000 seeded trials): equal partitions gave equal verdicts (1,649 trials, 1,007 reached by
different identity claims), every differing partition was separated by a probe (1,351), 0 violations; a scope-blind
reporter (51 violations) and a count-only reporter (caught) both failed. Synthetic claims only.

## 3. Wikidata property constraints as a given register; a range step in identity-exclusion — EXPERIMENTAL
Preregistration sha256 `09c15ab3…` (2026-11-17T04:31:06Z).

`adapters/wikidata/constraints.js` reads each property's own P2302 statements: subject type (the kind), single-value
and single-best-value (one-valued; separators and exceptions honoured), difference-within-range (step 4: "you can't be
born after you're dead", P570 within -1..150 years of P569). Every rule cites its constraint statement as its giver, so
it may convict. `identity-exclusion.js` step 4 compares the merged pair's cross values only.

| | Russian Empire (145) | Kingdom of France (144) | bar |
|---|---|---|---|
| true pairs contradicted | 1.4% | 4.9% | <= 5% — held |
| distinct pairs contradicted | **8.9%** | 29.7% | >= 20% each — **missed** |
| contradicted only by the range step | 0.05% | 0.27% | >= 1% — **missed** |
| no one-valued rules (mutant) | 0.1% | 1.1% | caught |
| range sign flipped (mutant) | 18.6% of true pairs | 33.3% | caught |

Sound, far more than induction (1.4–4.9% against 21%); every true pair contradicted is an item holding two referenced
values for a single-value property (two birthplaces, deaths in 1800 and 1849). Power follows references: khora does not
convict on unreferenced statements, and the Russian items mostly lack them. The range step is correct but rarely needed.
Not wired into any caller. Untested and worth a preregistration: single-best-value means a preferred-rank statement is
the best value and others are allowed alternatives; rank was not used.

## Not here
`identity-warrant.js` (a parallel discernment organ built before khora's identity organs were found; it duplicates
identity-exclusion / identity-induction) is deliberately not included.
