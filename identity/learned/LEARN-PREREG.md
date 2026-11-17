# PREREG: rules learned from people's records, with ambiguity as information

Written before any learning code exists or any statistic below is computed. Stamped first.

## Idea (the user's)
A one-value rule need not hold for 100% of members. Several values for a one-valued relation do not refute the rule:
they are AMBIGUITY (one of these is true: OR), which is information only because the rule exists. Without a rule,
several values are plurality (all true: AND). So a learned rule is not "every member has one value"; it is "members
have one value, or several that look like DISPUTES about one value".

## Data
The omnilingual people already saved (identity/omni/ent/*.json), each item once, those whose P31 includes Q5.
Per property and member: all NON-DEPRECATED values (so alternatives stay visible), normalized as in the omnilingual
run (item ids, strings, quantities, times at year level; coordinates, somevalue and novalue dropped).

## What is learned, per property (from people only; no rule is read here)
- k = distinct values a member holds. single: k = 1. multi: k >= 2.
- A multi member is a DISPUTE if any of: (a) exactly one of its values has preferred rank (Wikidata's own resolution
  markup); (b) time-valued and the spread of its years is <= the median year gap between two random members' values of
  that property (closer than chance: versions of one date); (c) every value carries a reference and no reference is
  shared between two values (each alternative from its own source). Otherwise PLURAL.
- S = (single + dispute) / members: how consistent the population is with a one-value rule.
- epsilon = dispute / members: the learned AMBIGUITY RATE, the weight a disagreement carries later.
- The 95% credible interval of S (Beta(single+dispute+1, plural+1)) is reported for every property.
Eligible: properties held by >= 30 members.

## Validation (Wikidata's stated rules are used ONLY here, never to learn)
Stated one-valued = the property carries a single-value (Q19474404) or single-best-value (Q52060874) constraint.
Stated plural = it carries constraints but neither of those. Properties with no constraints are not scored.
Reported separately for external identifiers and for all other datatypes; the bars apply to the non-identifier set.

## Hypotheses
- **L1 rules can be learned.** AUC of S against the stated labels >= 0.80 (non-identifier, eligible properties).
- **L2 ambiguity adds information.** AUC(S) > AUC(single share alone) on the same properties.
- **L3 ambiguity lives under rules.** Among multi members, the dispute share under stated one-valued properties exceeds
  that under stated plural properties by >= 0.20, with a 95% bootstrap interval excluding 0.
- **Controls.** K1: the stated labels shuffled 1,000 times; the observed AUC must exceed the 95th percentile of shuffled
  AUCs. K2: each property's values dealt at random across its members (each member keeps its count); the time-closeness
  disputes (b) must fall, and AUC(S) is reported again.

## Decision
L1–L3 hold and K1 passes: the learned register (S, epsilon, interval, per property) is the basis for step 3 (identity
with weighed ambiguity). Otherwise report what failed. Nothing is tuned after seeing results; any later change is a
dated, labelled amendment.
