# PREREG: the hunger tries the most severe refutation first

Written before the ordering is coded. Stamped (`SEVERITY-PREREG.md.sha256`, `.time`) before the experiment runs.
Builds on identity-warrant@2 (STOPRULE3-PREREG.md, ac722c3c…; shipped noise-free). Prior art: Popper's severe tests;
Mayo's severity (a hypothesis passes severely if, were it false, the test would very probably have failed it).

## The change (candidate identity-warrant@3)
Each hunger item carries `severity` = the probability it refutes "x and y are one" IF they are in fact distinct, per fetch:
- live item (one name has value v for the relation, the other has none): severity = 1 - p(v), cost 1 fetch.
- cold item (neither name has a value): severity = 1 - sum over values of p^2 (a random collision), cost 2 fetches; per
  fetch, severity / 2.
p as in @2 (Laplace-smoothed frequency in the corpus). `hunger.live` and `hunger.cold` are each sorted by severity
(descending); `hunger.next` is the single item with the highest severity per fetch. Verdicts are unchanged.

## Experiment (seed 20261123; 40 worlds per type; declared true prior; noise-free; worlds as STOPRULE3)
Three orderings on IDENTICAL worlds (fetches draw no randomness when noise-free, so the comparison is paired):
FIRST = @2's order (first live, else first cold); SEVERE = `hunger.next`; ANTI = the least severe item per fetch.
Measured per world type: fetches per pair to a verdict, false-merge rate, recall, false splits.

## Hypotheses
- **V1** SKEWED: SEVERE uses at least 10% fewer fetches per pair than FIRST.
- **V2** SEVERE keeps the shipped bounds: RICH and SKEWED false-merge <= 0.05, recall >= 0.90; 0 false splits everywhere.
- **V3** RICH (uniform values): SEVERE uses no more than 2% more fetches per pair than FIRST.
- **Power check.** ANTI must use at least 10% MORE fetches than FIRST in SKEWED (the ordering is real, and the
  experiment can see it). If not, the experiment cannot tell orderings apart and nothing ships.

## Decision rule
V1–V3 hold and ANTI is caught: ship @3 (shipped tests still passing, plus a seeded test that fails when `next` is the
first live item, and when it is the least severe). Otherwise ship nothing and report.

## Not tested
Real claims; noise; an ordering that also weighs how fast agreement accrues for true pairs (only refutation is ranked).
