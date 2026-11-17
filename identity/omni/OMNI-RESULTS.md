# OMNILINGUAL RESULTS (OMNI-PREREG 43205d94… + ERRATUM-1 b048d19b… + ERRATUM-2 3842f760… + ERRATUM-3 2e2c5056…)

Scored as stamped (omni-score.py at the ERRATUM-3 hash) against khora main @ 148037f. 33 languages fetched; 31 usable
(Amharic 39 and Swahili 31 distinct items: too thin). 3,279 unique people pooled (293 repeat appearances dropped).
Full table: `omni-score-output.txt`; data: `omni-results.json`, `runs/`, `ent/`, `property-constraints.json`.

| | result | verdict |
|---|---|---|
| O1 per language (falsified only if 95% lower bound > 5%) | none falsified; 27/31 cannot show <= 5% at their n | not falsified |
| O1 pooled (unique people) | 113 / 3,279 = 3.45%, 95% [2.94%, 4.02%] | HOLDS |
| O2 power >= 20% in >= 80% of languages | 30/31 = 97% (Bangla 5.0%) | HOLDS |
| O3 Spearman(referenced share, power) | 0.61 over 31 languages | descriptive |
| power check: M-flip true-pair contradictions > 5% in >= 50% | 100% of languages | caught |
| power check: M-norules distinct contradicted < 5% everywhere | FALSE (Latin 19.1%, Ottoman Turkish 13.0%, Persian 12.3%, German 11.3%, ...) | **not met** |

**Decision (as preregistered): the EXPERIMENTAL label stays** — the power-check clause failed. Not reinterpreted here.
What the failed clause shows: M-norules removes only the one-valued rules and keeps the ten difference-within-range
rules, which on their own exclude many distinct pairs in some populations. The expectation "< 5% everywhere" was wrong;
the flipped mutant shows the test can see failure. Any re-reading belongs in a dated post-result erratum.

Contradicted true pairs by class (summed over languages, 130): record-disagreement 87, rank-permitted 43 (single-best-value
with a preferred-rank statement on the item: a rule misfire, since rank is unused).
Confounds (ERRATUM-2): samples are text-sorted id prefixes, so item age and creation source vary with language; no
difference between languages is attributed to language.
