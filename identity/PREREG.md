# PREREG: is the identity partition the right "universe" for a lint verdict?

Written before any experiment code exists. Stamped (`PREREG.md.sha256`, `PREREG.md.time`) before the experiment runs.
Subject: khora `lintGfp` at commit b12728493c662d1b87a6c56a0cf69ef36a276c2a, patched so each `holons[i]` carries
`identity` (the merged name classes in force at that ground; see `khora-identity.diff`), and pharos `compare`
(`pharos-compare-only.patch`).

## Claim under test
The per-holon identity partition is the whole of what identity contributes to a verdict: two systems with the same
content claims have the same verdicts **if and only if** their partitions agree at every content holon. And pharos
`compare`, fed those partitions as universes, reports in sync **if and only if** they agree.

If true, the partition is a sufficient and necessary universe: no false "agree", and no difference flagged that no
content could ever witness. If false, the patch reports the wrong thing and is not implemented.

## Hypotheses (each is falsified by ONE counterexample)
- **H1 sufficiency.** Same content, partitions equal at every content holon => identical lint verdict
  (ok, counts, unjudged, apart, and the set of findings by kind|at|severity|claims), even when the identity
  CLAIMS differ (reordered, swapped roles, duplicated, transitively implied, redundantly re-stated deeper).
- **H2 necessity.** Partitions differ at a content holon h => there is a probe (a pair of content claims at h, naming
  one name pair that one system merges and the other does not) on which the two lints give different findings,
  the merging system reporting a `polarity_contradiction` at h.
- **H3 end to end.** Build one pharos per system (a holon verdict = an event; its universe = the identity-partition
  sources at that holon and below). `compare(A,B).inSync` is true if and only if the partitions are equal at every
  content holon.

## Design
Seeded PRNG (mulberry32, seed 20261117). Pool of 6 names/values, a ground tree of 7 holons (depth <= 3), 4-8 content
claims over a one-valued relation `p` (declared functional) and a plain relation `q` with random polarity, 0-5 identity
claims (same-as) at random grounds. Second system: with p=0.4 an equivalence-preserving rewrite of the first system's
identity claims, else a random mutation (add, drop, move ground). Equality of partitions is MEASURED from the lint's
own output, never trusted from how the rewrite was built.

- E1: N=3000 trials; need >= 300 trials with equal partitions AND different identity-claim sets, else inconclusive.
- E2: same trials; need >= 300 with differing partitions, else inconclusive.
- E3: first 200 trials, through pharos.
- **Power check (the experiment must be able to fail).** Two deliberately broken reporters: M1 reports the partition
  at "/" for every holon (scope-blind); M2 reports only the NUMBER of identity claims in scope (this is the information
  `basis.declared.identity` carries today). The experiment must produce >= 1 violation for EACH mutant. If it does not,
  it is too weak to support the claim and nothing is implemented.
- E4 (measurement, not a falsifier): among differing-partition pairs with identical verdicts, how many have both
  merged names present in the content (a live difference) versus absent from it (latent). Reported, not thresholded.

## Decision rule (fixed now)
Implement (ship the khora change with a seeded property test that fails on the unpatched lint, and keep the pharos
`compare` patch) iff: E1, E2, E3 each have 0 violations AND meet their minimum non-trivial counts AND the power check
catches both mutants. Any violation => do not implement; report the smallest counterexample. If a minimum count is not
met: adjust the generator ONCE, rerun, and report both runs.

## What this does not test
Real-world claim sets (all content here is synthetic); `baseIdf` other than exact identity; claims with force `strict`;
khora callers of `lintGfp`.
