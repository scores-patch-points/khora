# PREREG-CAST-A5 — the edges follow the repaired identity; no English prior applied to another language

Opt-in and off by default (`castIdentity`); with the option absent or `false` the entry is JSON-identical to base (R1). Supersedes nothing: PREREG-CAST-A4-1 (head `3d5a32a`, sha256 `6cbe5329…`, code `ef00e61`) stays the layer-3 candidate for the cast; A5 adds two things on top of it. No exam is claimed; the spent exams are used only to measure and to check that LAYER3 does not drop.

**Frozen code commit: `77fce0c`.** The commit after it (`ad1f12d`) adds evidence files and this note touch only `eval/cast/`: `git diff 77fce0c HEAD -- native package.json` is empty. Scorer unchanged: `score-cast.mjs` sha256 `db15e251abaa9792f4fddbfb562de504aa4337a03a512c5885a657b46efc5e43`, test `dc898a2c…`.

## 1. The edges follow the repair

**Where the decision is made.** The relation reader builds an edge's ends from the sentence (`organs/hypergraph.js`: `end1Of(t)` → `endpoint()` → `faceOf()`), before the cast is repaired, and merges the sentences that state the same pair into one edge: "Apollo 11", "Apollo 12" and "Apollo 13" all arrive as the end `apollo`. The index (`makeReferentIndex`/`index.resolve`) is the base's; moving the decision into it would change the base reader for everyone and would still not tell three sentences apart, because the merge into one edge happens before anything is resolved by position. The smallest correct change is therefore after the cast repair and before everything that reads edges (`quality.gates`, the referent ledger): `organs/cast-identity.js::repairEdges`, called from `read-core.mjs::readWith` for `castIdentity` (`castIdentity: { edges: false }` keeps the A4.1 behaviour).

**Rule.** For each sentence an edge was read from (`spans[].ref` ends in `#<passage start>-…`, the span start is relative to it), each end is looked up in that sentence: where the end's words stand, exactly one repaired being's mention must stand (covering all the end's words but one), at every place the end stands in the sentence. Then the end's face is that being's name and the end is the mention as the text wrote it ("Apollo" over "Apollo 11" becomes `apollo 11`; "Strauss" stays `strauss`). An end that stands over mentions of several beings, over none, or at a place that is nobody's, is left as the reader built it and counted (`ambiguous`, `unresolved`). An edge whose sentences now name different beings splits into one edge per pair (statements divided, standing recomputed); edges that come to name the same pair of beings in the same relation merge, with their sentences and statements. `pronouns[].ref`, the ledger and `quality.gates` read the repaired cast and edges. The report is `entry.castIdentity.edges` `{ rewritten, split, merged, ambiguous, unresolved, samples }`.

**Measure** (real pipeline, option off vs on; the 23 census articles with my 58-entity inventory, and the parent's spent exams v1 to v3 with their inventories; `eval/cast/dev/` and `eval/cast/a5/edgemetrics.mjs`). An end is "exact" when the lower-cased form equals the end after folding case, diacritics, possessive and punctuation; a face is exact the same way.

| set | forms that are an exact edge end | forms that are an exact face | forms in no edge | distinct ends per entity (entities with an end) |
|---|---|---|---|---|
| census, 76 forms | 81.6% → **98.7%** | 18 → 55 | 0 → 0 | 4.33 → 4.59 |
| exam v1, 77 forms | 53.2% → **76.6%** | 19 → 47 | 11 → 5 | 2.21 → 2.69 |
| exam v2, 71 forms | 60.6% → **81.7%** | 21 → 51 | 11 → 10 | 2.15 → 2.23 |
| exam v3, 93 forms | 71.0% → **87.1%** | 36 → 69 | 1 → 1 | 2.24 → 2.20 |

**One of the two success criteria is met and one is not.** The share of name forms that are exact edge ends rises on all four sets. The number of distinct edge ends per entity does **not** fall: it rises on census, v1 and v2 and falls by 0.04 on v3. I tried the other design first (write the being's full name into every end): distinct ends fell on three of four sets (census 4.33 → 3.84, v2 2.15 → 1.92, v3 2.24 → 1.99; v1 rose to 2.32), but the exact-end share fell on the census (81.6% → 76.3%) because every short form ("Strauss") stopped being an end, and it rose less on the exams (v1 64.9%, v2 71.8%, v3 78.5%). Faces are what the notes layer keys on (`kernel/notes.js::canonEnds` prefers `end1Face`), so the identity is carried by the face; I kept the end at the form the sentence used. The distinct-ends count is therefore not a measure of one identity here, and I report it as not met. "Distinct faces per entity" is not comparable between off and on: the base gives most ends no face (49 entities have one on the census, 57 with the option on).

**LAYER3 does not drop** on the three spent exams with the final code (the cast is not touched by the edge repair): v1 41/50 (0.82), v2 56/61 (0.918), v3 60/80 (0.75) — the same as A4.1 (`eval/cast/a5/layer3-v*.json`).

Observed, not fixed: an edge end follows the cast. "Moon" is folded into the book title "Lost Moon" in the cast (the introduced fold); the edges then say `lost moon` for the Moon. That is a layer-3 defect now visible in layer 4.

## 2. The missing-prior guard

When the read language is not `declared` or `heard` with a filed stem, or the prior set reports `no_pos_prior`, the repair does not use the part-of-speech prior (it would be English's applied to another language's words). It records the typed gap **`cast_identity_no_pos_prior`** and skips the three rules that read the prior: the lower-case variant of a name (needs "is this word a noun"), the classification of a connector word as adposition or conjunction (`connectorOk` becomes "unknown, allowed under the introduction guard and three recurrences"), and the common-noun test of an edge word in HAPAX and the typed-gap rule (`commonNoun` becomes false). **Rules that still run** because they read only the text: LEAD, VARIANTS, RESCUE (joiners, numbers and designations, initials and recurring-period names, runs of five or more tokens, closed extensions, bare names, coordinating pairs by exclusivity), CLAIMS, INITIALS, UNMERGE, FOLD, SPANS, and the edge repair. The positional-capital test uses the text's own lower-case counts and runs.

Shown on three languages with the English-only priors and then with the 18-language priors (`eval/cast/a5/langguard.mjs`, the OMNI-0 Colosseum texts):

| lang | English-only priors: source, stem, gap | 18-language priors: source, stem, gap |
|---|---|---|
| de | declared-unknown, eng; `unknown_language`, **`cast_identity_no_pos_prior`** | declared, deu; no such gap |
| fr | declared-unknown, eng; same two gaps | declared, fra; none |
| ru | declared-unknown, eng; same two gaps | declared, rus; none |

## R1, G1, tests, preflight

R1: with the option absent or `false` the entry equals base `15f82fcd` on the three fixtures (`eval/cast/r1-base-hashes.json`), in `native/organs/cast-identity.test.mjs` (21 tests pass, three new: edge split, ambiguous end left, prior-less run). G1 passes (`eval/cast/cast-identity-gate.mjs`). Protected files unchanged. `canon-check.mjs` on the clean tree at `ad1f12d` (code identical to `77fce0c`): CANON-OK, exit 0, hash `d736e9ab132190e819b8a31fb6107465d6b9f4b0a3fcf2c2b0071b0fa4ff2766`.

## Expected failure modes

The edge repair trusts the cast: a wrong fold becomes a wrong edge face. An end that stands over several beings is left as the reader built it, so ambiguous sentences (Apollo 11 and Apollo 12 in one sentence) keep the old end. Ends are not recovered where the end's words do not occur in the sentence. An edge split divides `statements` by span count. The prior-less guard does not make the text-only rules language-aware: in a caseless script nothing capitalised is a name and the cast is empty.
