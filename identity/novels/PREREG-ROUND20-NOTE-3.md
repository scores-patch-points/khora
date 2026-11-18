# PREREG-ROUND20 NOTE 3 — the dictionary and use meet in a helix ring: a gender ledger that re-grounds (registered before the snapshot is read or any ledger is built)

The user's directions: lexicographic rules on one side, emergent order from use on the other, SYN in the middle, the line where they meet; the emergent side is LLM-shaped, but the eoHelix (THE-MORAL-HELIX.md: each act is one ring of Ground -> Figure -> Pattern, a ring's residue becomes the next ring's ground; "it re-grounds, it does not stream") is the learning rule; gender is inferred from pronouns as much as the other way.

## The ring
- GROUND (the given): the Wikidata given-name snapshot (male / female / unisex given-name labels, English; CC0; fetched 2026-11-18 by initial letter from query.wikidata.org; a file under identity/givers/ with its sha256 and date). Immutable once written.
- FIGURE (use): in a read, a being's own clause-local gender evidence (the rung's causal rule) against the ground: a being the ground calls female that the text uses "he" of (or the reverse) is a FIGURE; a being the text says nothing about is none. One figure = one clause of evidence with its address.
- PATTERN: a name word whose figures recur across independent documents (at least two documents, each with its own clause of evidence) and whose recurrence is above its shuffle null (the same figures with the name words permuted across beings, 1000 draws; the 95th percentile of the null is the bar; no number typed here).
- RE-GROUND: a Pattern is compiled into a learned prior (name word -> counts m / f, the documents that witnessed it, its date range and source texts), stored beside the ground and never over it; `priorGender` takes the learned prior first, then the ground, and the rung's own evidence overrides both. A compiled prior can be superseded (a later pattern contradicts it) and keeps its witnesses.
- THE LINE: a name word where ground and compiled use disagree (or a figure that has not yet recurred) is reported with both colors and the counts: ground said X, use says Y, n documents. Reported, never resolved silently.

## Measure (U, 66 documents, the held-out set; the ledger is built from the 125 training-slice documents and dev, never from U or from gold: from the system's own clean bindings, the clause-local evidence the rung already collects)
- L1 (the line): the list of name words where the Wikidata ground and compiled use disagree, counted, with the 20 largest by evidence (descriptive; the names that changed gender over time are expected here).
- L2: the share of compiled Patterns whose gender agrees with the ground (reported against a shuffled-ledger null).
- L3: precision and coverage on U with soft mode (321/30, 63.6% now): ground only; ground + compiled use; the three variants against each other by document bootstrap and a permutation test of the changed set.
- L4 (falsifier): ledgers built from permuted evidence give no gain.
Expectation, stated now: the pronoun gender conflicts GUM shows are few (the gender-prior arms moved nothing), so a small or null L3 is likely and is a result; L1 and L2 are the substantive outputs. Failures reported. No threshold typed; the bars come from the shuffle null.
