# PREREG: identity from LEARNED rules, with ambiguity weighed (step 3)

Written before any step-3 code exists. Stamped first. Builds on LEARN-RESULTS.md (63aa534d…): rules learned from people
recover the stated ones (AUC 0.905) and multiple values under a rule are mostly disputes (83% vs 7%).
Baseline to compare: the stated-rules omnilingual run (OMNI-RESULTS.md): pooled true pairs contradicted 3.45%
[2.94, 4.02]; distinct pairs contradicted >= 20% in 30/31 languages.

## Method (no stated rule is read; no identity truth is used to learn)
For each test language L, learn from the people of the OTHER languages (anyone also in L's sample removed), per
relation r held by >= 30 of them:
- multi_r = share of members holding >= 2 distinct non-deprecated values.
- m_r = max(multi_r, 1/(n_r + 2)): P(two records of one person show disjoint values for r).
- u_r = 1 - collision_r, collision_r = P(two random members' value sets overlap) (2,000 seeded random pairs).
- p_r(v) = Laplace-smoothed share of members holding value v.
Records are the split halves of RULES/OMNI (seed 20261125, each half carrying its item's P31), with ALL non-deprecated
values kept per relation (a superposition: alternatives, not rivals).
Evidence for a pair (x, y), over relations both hold:
- the value sets overlap: + log10((1 - m_r) / p_r(v)) for the rarest shared v (agreement, weighed by rarity);
- they are disjoint: + log10(m_r / u_r) (disagreement, weighed by how often one person disagrees with themself).
Verdict: excluded iff total <= -log10(19) (Wald's lower boundary, as before). Same normalization as OMNI.

## Hypotheses (31 usable languages, unique people pooled as in OMNI ERRATUM-1/2)
- **W1 sound.** True pairs excluded: no language with a Clopper–Pearson lower bound > 5%; pooled upper bound <= 5%.
- **W2 sounder than stated rules.** Pooled true-pair exclusion rate below the stated baseline's 3.45%.
- **W3 power kept.** Distinct pairs excluded >= 20% in >= 80% of languages.
- **W4 measured.** Of the stated run's contradicted true pairs, how many are now NOT excluded, and why (agreements
  outweighing a weighed disagreement).
- **Mutants.** M1: every disagreement decisive (m_r -> 0.0001): must break W1 (pooled lower bound > 5% or W2 fails).
  M2: no superposition (each record keeps only its first value per relation): reported. M3: learn from L itself
  (leakage): reported, to show the size of the leak the design avoids.

## Decision
W1–W3 hold and M1 breaks W1 or W2: learned identity is at least as sound as stated rules with power kept, and the
learned register becomes the candidate to snapshot into pharos (Zenodotus ingester). Otherwise report what failed.

---
SUPERSEDED 2026-11-17T06:31:09Z, before any step-3 code existed, at the user's direction: the thresholds above
(0.95 boundary, 5% and 20% bars, the 30-member floor, 2,000 pairs) are hand-set. Replaced by IDENTITY-SURPRISE-PREREG.md.
