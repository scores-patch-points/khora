# PREREG: identity by surprise, startle and shock, with no hand-set threshold (step 3, replacing 61fb39f1…)

Written before any step-3 code exists. Stamped first. The user's terms: SURPRISE is being meaningfully unusual; STARTLE
is being unusual in a way that is itself unusual; SHOCK is beyond that. Every threshold below is "beyond what a
reference distribution has ever shown", so it moves with the amount of data and is never typed.

## What is learned (per test language L, from the people of the OTHER languages only; anyone also in L removed)
Each training person is split into two records (seed 20261126; all non-deprecated values kept per relation, a
superposition; each half carries the person's P31). From those self-splits and from random pairs of training records:
- m_r = P(one person's two records are disjoint on relation r), counted directly from self-splits, Laplace-smoothed.
- p_r(v) = share of training people holding value v for r, Laplace-smoothed.
For any pair of records (x, y), over the relations both hold:
- d(x, y) = sum of -log2(m_r) over relations where their value sets are disjoint: how surprising the disagreements would
  be IF they were one person.
- a(x, y) = sum of -log2(p_r(v)) over relations where they share a value (the rarest shared v): how surprising the
  agreements would be IF they were two strangers.
Reference distributions, from training records only:
- D_same: d over every training person's own two halves.   - D_diff, A_diff: d and a over random pairs of different
  training people, as many pairs as there are training people (a count the data sets, not a typed one).

## The ladder, for a test pair
- usual:    d <= max(D_same). Within how people disagree with themselves: ambiguity, no case against being one.
- SURPRISE: d >  max(D_same). Beyond any self-disagreement seen: TWO PEOPLE (excluded).
- STARTLE:  a surprise that is unusual among surprises: d > max(D_diff) (more discrepant than any two strangers) OR
            a > max(A_diff) (more alike than any two strangers, yet surprising).
- SHOCK:    both startles at once.

## Test
The same 31 usable languages and split halves as OMNI (seed 20261125); all pairs within each language; unique people
pooled as before. No identity truth is used to learn anything above.

## Questions (compared with the stated-rules run, OMNI-RESULTS, not with typed bars)
- **Q1 soundness.** Pooled share of true pairs at SURPRISE or above, with its 95% interval, against stated rules'
  3.45% [2.94, 4.02]. Expected near 1/(n_ref + 1) if a test person's self-disagreement is exchangeable with the
  training people's; a larger value means it is not, and that is reported as a finding.
- **Q2 power.** Per language, the share of distinct pairs at SURPRISE or above, against the stated run's share for the
  same language; reported language by language and as the count of languages where learned >= stated.
- **Q3 the ladder.** How many true and distinct pairs reach STARTLE and SHOCK; every true pair at STARTLE or SHOCK is
  listed with its relations, as candidate broken records.
- **Controls.** M0 no reference (any disagreement is SURPRISE): must make Q1 worse than the stated run. M1 every
  disagreement decisive (m_r -> its smallest observed value for all r): reported, to see whether the self-calibrated
  threshold absorbs it. M2 reference learned from L itself (leakage): reported. M3 no superposition (first value only):
  reported.

---
SUPERSEDED 2026-11-17T06:33:02Z, before any step-3 code, at the user's direction: levels are UNITS OF
DEVIATION (like standard deviations), each relative to its own reference and grounded in DMDs, not "beyond the max".
Replaced by IDENTITY-LADDER-PREREG.md.
