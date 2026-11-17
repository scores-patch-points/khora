# PREREG: identity on a ladder of relative deviations (surprise, startle, shock) — step 3, replacing cfff03ed…

Written before any step-3 code exists. Stamped first. The user's terms: levels are like standard deviations, but each is
RELATIVE, measured in the unit of its own reference, grounded in DMDs; surprise is meaningfully unusual, startle is
unusual in a way that is itself unusual, shock is beyond that.

## Disclosed exploration (before this prereg; NOT on the test data)
On the earlier Russian Empire and France samples only (289 people), self-split disagreement and stranger disagreement
overlap heavily (self: 42% zero, sd 0.50, max 5.03 bits; strangers: median 1.03, sd 1.27): a "beyond the max" bar sits
above 90% of strangers. Strangers differ from self-splits mostly in what they SHARE. Hence the scalar below combines
agreements and disagreements, and the unit is a robust spread so one broken record cannot stretch it.

## Scalar (learned per test language L from the other languages only; anyone also in L removed)
Training people are split into two records (seed 20261126; all non-deprecated values kept: a superposition; each half
carries the person's P31). From self-splits and random stranger pairs:
- m_r = P(a person's two records are disjoint on r); c_r = P(two strangers' records overlap on r); p_r(v) = share of
  people holding v. All Laplace-smoothed counts, nothing typed.
- For a pair (x, y), over relations both hold, in bits: overlap -> + log2((1 - m_r) / p_r(v_rarest_shared));
  disjoint -> + log2(m_r / (1 - c_r)). Their sum Lambda(x, y) is how much more the pair looks like one person than two.
## The ladder (unit = robust spread: 1.4826 x median absolute deviation, the standard estimator of a deviation unit)
- s1(x, y) = (median(L_same) - Lambda) / unit(L_same), L_same = Lambda over training self-splits.
  usual: s1 < 1. SURPRISE: s1 >= 1 — one unit less like a person than people are like themselves: TWO PEOPLE.
- s2 = (s1 - median(P1)) / unit(P1), P1 = s1 of the random stranger pairs that are at SURPRISE. STARTLE: s2 >= 1.
- s3 = (s2 - median(P2)) / unit(P2), P2 = s2 of the stranger pairs at STARTLE. SHOCK: s3 >= 1.
If a reference pool is empty or its unit is 0, that level is a typed gap for that language, never a guess.

## Test and questions (as IDENTITY-SURPRISE-PREREG, compared with the stated-rules run, not typed bars)
Same 31 languages and split halves as OMNI (seed 20261125); all pairs within each language; unique people pooled.
- Q1 soundness: pooled share of true pairs at SURPRISE or above (95% interval) vs stated rules' 3.45% [2.94, 4.02].
- Q2 power: per language, distinct pairs at SURPRISE or above vs the stated run's share; count of languages learned >= stated.
- Q3 ladder: true and distinct pairs at STARTLE and SHOCK; every true pair at STARTLE or SHOCK listed (candidate broken records).
- Controls: M0 no agreements (Lambda from disagreements only): reported. M2 reference from L itself (leak): reported.
  M3 no superposition (first value only): reported.
