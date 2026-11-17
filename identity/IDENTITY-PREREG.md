# PREREG: a same-as claim derived from ground, not declared

Written before any code for it exists. Stamped (`IDENTITY-PREREG.md.sha256`, `.time`) before the experiment runs.
Subject: a new pure function `warrantIdentity(claims, x, y, {at, functional})` beside khora `lintGfp`
(@ b12728493c662d1b87a6c56a0cf69ef36a276c2a + khora-identity.diff). No model anywhere.

## The procedure
For two names x, y at ground `at`, over the claims whose ground overlaps `at`:
- a FACT about a name is a claim where the name fills a non-value role; its KEY is the relation plus its other roles,
  with the name itself replaced by a placeholder (so "x died-in 1910" and "y died-in 1910" share a key).
- **different** if some one-valued (declared functional) key has different values for x and y, or some key holds
  with + for one name and - for the other. Warrant: the conflicting claim ids. (Leibniz: identicals are indiscernible,
  so one true discernment proves distinctness.)
- else **same** if at least one one-valued key has equal values for both. Warrant: the agreeing claim ids. Provisional.
- else **unjudged**. Output the HUNGER LIST: one-valued keys known for one name and not the other ("live": fetching
  can flip the verdict) and keys known for neither ("cold": needs two fetches), live first.
- the derived identity is an ordinary `same-as` gfpClaim at `at` whose `basis` carries the verdict and the warrant ids,
  so the partition reported per holon (khora-identity.diff) and pharos `compare` see grounded, not declared, identity.

## World (ground truth known)
Seeded (20261118). Per world: 10 entities; each has a true value for 3 one-valued relations f0..f2 (domain size
D in {2, 3, 5}) and a true set for a plain relation q over 4 values; each entity has 1 or 2 names. 10-25 claims sampled
from the truth (name, relation, value; q as + if in the set, else -), all at ground "/". 300 worlds per D, every name pair.

## Hypotheses (each falsified by ONE counterexample)
- **H1 discernment is sound.** With true claims, `different` is never returned for two names of the same entity.
- **H2 the hunger closes.** For every `unjudged` pair, fetching every item on its hunger list from the world (the true
  fact) and deciding again yields `same` or `different`; never `unjudged` again.
- **H3 agrees with the kernel.** `different` <=> adding `same-as(x,y)@/` to the claims makes `lintGfp` raise a NEW
  conflict finding (standing_contradiction, polarity_contradiction, overridden_in_scope or refuted_in_scope) on a
  claim about x or y. Checked on the first 100 worlds per D.
- **Power check.** Mutant W1 ignores polarity (only one-valued disagreements discern): must violate H3. Mutant W2
  treats any differing value, even in the plain relation q, as a discernment: must violate H1. Each must produce >= 1
  violation, or the experiment is too weak and nothing is implemented.

## Measured (not falsifiers)
- False merges: P(truly distinct | `same`), by number of agreeing keys k and by D. Expected to fall with k and with D;
  this is the honest limit of identity-of-indiscernibles under thin observation.
- Fetch cost to close the hunger (items fetched per unjudged pair), live-first.
- Noise arm: 10% of one-valued claims given a wrong value. Rate of `different` for truly-same pairs (false splits).
  Expected > 0: discernment is only as sound as the claims; the conflicting claim ids are reported so the conflict
  itself becomes the next thing to fetch.

## Decision rule (fixed now)
Implement (ship `identity-warrant.js`, a seeded test that fails on both mutants, and the derived `same-as` claim with its
warrant) iff H1, H2, H3 have 0 violations and the power check catches both mutants. Otherwise report the smallest
counterexample and stop.

## Not tested
Real claims; scoped grounds other than "/"; transitive merging across many pairs (pairwise only); caseless or resolver
base identity; claims with force `strict`.
