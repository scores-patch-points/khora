# Round 21: Greek, binding the dropped subject (PROIEL empty P tokens, relation sub, finite 3sg head verb)

Preregistered (PREREG-ROUND21.md, 2026-11-18T05:26:50Z); code frozen (FREEZE-ROUND21.md) before any score; one run (eval-nt-prodrop.mjs). Shipped FULL register and fold, default dials, nothing tuned. JOHN is the development book; MATT, MARK, LUKE are the test books, already scored for other arms (new hypothesis on sighted books).
Gold: 514 (JOHN) and 425 + 468 + 615 (MATT, MARK, LUKE) third-person-singular dropped subjects with antecedents; answerable (entity has a proper-noun token a cast span overlaps): 335 and 809.

| | answerable | bound | right | wrong | precision | coverage | shuffled-referent null |
|---|---|---|---|---|---|---|---|
| JOHN, ON (after the overt pronouns) | 335 | 156 | 110 | 46 | 0.705 | 46.6% | 0.594 |
| JOHN, NULLFIRST (control) | 335 | 142 | 95 | 47 | 0.669 | 42.4% | 0.597 |
| test books, ON | 809 | 350 | 193 | 157 | 0.551 | 43.3% | 0.415 |
| test books, NULLFIRST (control) | 809 | 312 | 186 | 126 | 0.596 | 38.6% | 0.465 |

- H1 HOLDS on both sets: the dropped-subject bindings beat the shuffled-referent null (0.705 vs 0.594; 0.551 vs 0.415).
- H2 HOLDS: the overt bindings are identical with ON and OFF. Pooled over the test books, the gold third-person-singular pronouns that can be answered rise from 1,181 overt to 1,990 (overt + dropped), and the share bound rises from 677 of 1,990 (34%) to 1,027 (52%): 359 + 193 = 552 right and 318 + 157 = 475 wrong, precision 0.537 against 0.530 for overt only.
- H3: the dropped-subject precision (0.551 test, 0.705 JOHN) is about the overt precision (0.530, 0.741).
- H4 (order): binding the dropped subject BEFORE the overt pronouns of its sentence gives higher precision on the test books (0.596 against 0.551) and lower on JOHN (0.669 against 0.705), with lower coverage on both; the registered order (after) gives the coverage. The two orders trade precision for coverage; neither was tuned.
Reading: Greek's missing reach was the dropped subject. Binding it adds about 800 answerable gold pronouns the reader never tried, at the overt rate of precision, and leaves the overt bindings untouched. Not claimed: Sanskrit (no gold; the same mechanism runs, unmeasured), the dropped subject's gender, or third-person plural.
