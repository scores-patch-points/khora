# LADDER DIAGNOSIS (post-result look at LADDER-RESULTS.md; diagnose.py, diagnose2.py)

## The four people startled against themselves are date disputes, not broken records
| person | sample | what their two halves disagree on |
|---|---|---|
| Badari Narayan Chaudhari 'Premghan' (Q15662203) | Sanskrit | born 1856 / 1855; died 1923 / 1922 |
| Alexander Hippius (Q105620613) | Arabic | only plural relations (languages, awards, schools, two VIAF clusters) |
| Sándor Fischer (Q1001731) | English | born 1854 / 1853; died 1888 / 1889 |
| Lobsang Pelden Tenpe Dronme (Q1033183) — SHOCK | Chinese | born 1890 / 1892; died 1958 / 1957; positions held |
The scorer compares years as categories, so a one-year dispute counts as a full disagreement.

## Why true people reach SURPRISE (248, counted per language)
- 41 (17%): their only weighty disagreement (< -1 bit) is a birth or death date 1–2 years apart.
- the rest: no weighty disagreement at all; many small ones on PLURAL relations (position held, occupation, family and
  given names), each slightly negative because strangers almost never share them, summing past one unit.

## Swedish
91 of 120 hold generic positions ("president" 92 statements, "board member" 26, "city council member" 17) whose
organisation sits in a qualifier: a bulk import of local office-holders (the ERRATUM-2 creation-source confound).
Halves of one person hold different generic posts (disagreement, about -0.8 bits each); strangers share "board member",
which other languages taught is rare (false agreement credit, so power falls to 29.6%). What was learned elsewhere
does not transfer to this population.

## Fixes this points to (each would need its own preregistration)
1. Dates by closeness: a year gap weighed by P(gap | one person's own disputes) / P(gap | strangers), both learned.
2. Disagreements only under a rule: a disagreement weighed by the relation's learned one-valuedness (step 2), so plural
   relations contribute agreements, never disagreements. "Ambiguity is information only because there are rules."
3. Population-level surprise: a test population whose reference statistics lie a unit or more from the training
   reference is reported as "reference does not transfer", not judged pair by pair.
