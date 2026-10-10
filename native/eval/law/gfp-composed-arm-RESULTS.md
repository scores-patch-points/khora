# GFP → the language's grammar (the pivot) — wired but STARVED (FALSIFIED, 2026-10-08)

Instrument: `eval/law/gfp-composed-arm.mjs` (new; pre-registration in its header). Reader: the EXISTING
`adapters/text/gfp-relations-composed.js::composedRelations` — GFP recurrence arrangements PLUS a positional leg
(the predicate) read under the language's measured `RoleConfig@1`, clause-split.

## Claim
With the language's `RoleConfig` declared and clauses split, the positional leg settles a predicate on ≥ 0.20 of
clauses, its labels are content verbs (≥ 0.60 content), beating the recurrence leg by ≥ 0.20.

## Result — FALSIFIED: the positional leg settles ~2% of clauses

| stem | clauses | positional edges | coverage | content | recurrence edges |
|---|---|---|---|---|---|
| eng | 580 | 11 | **0.019** | 1.00 | 1246 |
| spa | 438 | 12 | **0.027** | 1.00 | 2516 |
| deu | 419 | 0 | **0.000** | — | 878 |
| cat | 406 | 6 | **0.015** | 1.00 | 3217 |

The pivot is correct in kind — **when** the grammar leg fires, its label is the predicate (`comes`, `recicló`,
`arribar`, `destaquen`), not a function word. But it fires on under 3% of clauses, so the composed read is
essentially the recurrence read and the substrate stays closed-class. FALSIFIED on coverage (< 0.10) in every stem.

## Why — the positional leg's own stated wall
`relations-positional.js` reads ONE main clause per call and refuses the rest as `ambiguous_verb` (the composed
reader's own header: "47/60 real sentences"; "4 of 155 sentences on a real essay"). Clause-splitting recovers only
a sliver. So the grammar is not wrong — it is **under-settling**.

## Wiring note (found while tracing)
- The pivot IS online where `composedRelations` is used — `conductor/conductor.js` and `adapters/text/recursive.js`
  (with `roleConfig`). 
- The engine path `the-fold/reader-bundle.js:118` calls `relationExtractorsFor({ language, roleConfig: null,
  posPrior: null, ... })` → mode "gfp". So that path runs **pure GFP, no grammar pivot at all**.

## Consequence — the lever is the pivot's COVERAGE
The bottleneck is not GFP, not typing, not lookup, not induction: it is that the grammar-based clause reader
settles almost no clauses. The next lever is raising positional coverage — settle more clauses (a clause reader
that names the predicate with more recall) — after which the predicate relations (content) become the substrate
the identity/kind organs have been starved of.

## Limits
DEV sample (~400 sentences/stem, one family each); both legs receive the language's own `posPrior`/`RoleConfig`
(received knowledge); the content classifier flags `AUX` as function (light verbs); "verb-like share" returned 0
despite obvious verbs — a classifier artifact (the prior's majority class for these forms), not the coverage result.
