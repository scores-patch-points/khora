# PREREG: the ladder with three fixes (dates by closeness, disagreement only under a rule, population surprise)

Written before any code for it. Stamped first. Motivated by LADDER-DIAGNOSIS.md (post-result), so this is a second,
separately stamped test, not a repair of the first. Base: IDENTITY-LADDER-PREREG.md (cc27d700…), unchanged except below.

## F1 dates by closeness
For a time-valued relation (values at year level) the pair's term uses the smallest year gap g between the two value
sets (g = 0 when they share a year): + log2( Pself(g) / Pstr(g) ), where Pself is the gap distribution over training
self-splits holding r on both sides and Pstr over random stranger pairs holding r on both sides, both Laplace-smoothed
over 0..(largest gap seen). This replaces the categorical agreement and disagreement terms for those relations only.
## F2 a disagreement counts only under a rule
Each disagreement term is multiplied by w_r = (d_r + S_r) / (d_r + p_r + 1), learned on the training people exactly as
LEARN-PREREG defines single / dispute / plural (d_r disputes, p_r plurals, S_r = (single + dispute)/members). With no
multi-valued member w_r = S_r; with many, w_r is the dispute share. Agreements are not weighted.
## F3 population surprise
For each relation r held by members of test language L and of the other languages: JS_r(L) = Jensen–Shannon divergence
(bits) between L's and the others' value distributions for r. score(L) = the median over r, weighted by L's members.
Each language's score is computed the same way against the rest. L is a POPULATION SURPRISE when
(score(L) - median(scores)) / unit(scores) >= 1, unit = 1.4826 x MAD (the ladder's unit, one level up). A surprised
population gets "reference does not transfer" and no pair verdicts; it is reported, and its pairs are also scored
separately so the effect of withholding is visible.

## Questions (compared with ladder v1 and the stated run, not typed bars)
- Q1 soundness: pooled true people at SURPRISE or above over non-surprised languages, 95% interval, vs v1 6.86%
  [6.15, 7.63] and stated 3.45% [2.94, 4.02].
- Q2 power: distinct pairs at SURPRISE or above per language vs v1 and vs stated.
- Q3 the ladder: true people at STARTLE and SHOCK (v1: 4 and 1), each listed.
- Q4 population: which languages are surprised. PREDICTION (stated now): Swedish is among them.
- Attribution: each fix alone (F1, F2, F3) and all three, all reported.
