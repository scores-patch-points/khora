# GFP predicate arm — the reader's relations are function words by CONSTRUCTION (FALSIFIED, 2026-10-08)

Instrument: `eval/law/gfp-predicate-arm.mjs` (new; pre-registration in its header). Driven on each stem's DEV
sentences with the language's own `posPrior` (production config) and on the prior-free config as contrast.

## Claim
Under the language's own posPrior the reader's relations stop being function-word buckets: cells get typed
(`grain_gap` < 0.5), and a PREDICATE arm (connector settled as a verb → cell `CON·Figure (Link)`) is ≥ 0.10 of
edges with semantic (verb) labels whose ends are figures.

## Result — FALSIFIED on all three languages

| stem | edges | grain_gap | CON·Ground | **CON·Figure (pred)** | top PREDICATE labels |
|---|---|---|---|---|---|
| eng | 1348 | 0.697 | 0.151 | **0.133** | `is`:29, `be`:17, `do`:5, then singletons |
| spa | 2552 | 0.616 | 0.207 | **0.112** | `es`:14, `ha`:6, then singletons |
| deu | 892 | 0.802 | 0.091 | **0.095** | `hielt`:1, `umgeht`:1, … (every one a singleton) |

- **Most connectors are untyped** (`grain_gap` 0.62–0.80): the connector's head is usually punctuation or a
  function word that does not settle.
- **The predicate arm is copulas/auxiliaries** (`is`, `be`, `es`, `ha`) — light verbs, not content predicates —
  and in German the verbs are diffuse (each occurs once: no recurring predicate).
- Ends ARE figures (ends-not-figures = 0), so figure discovery is fine; the connector is the defect.

## Why — structural, not a tuning failure
`extractGfpRelations` emits an arrangement as **{end1, label, end2}** where `label` is *the text between two
adjacent recurring figures*. Adjacent figures are frequently separated only by a comma or an `of`, so the
"relation" is that comma/`of`; typing the connector renames the cell but cannot manufacture a predicate that
isn't there. The GFP shape is figure-connector-figure, deliberately **not** subject-verb-object (its own header:
"No subject, verb, or object anywhere"). So the substrate every identity/kind organ is downstream of —
`identity-induction`, `kind-functional-induction`, `induceKinds` — **is closed-class by construction**, which is
exactly why `corpus-kinds`, `kinds-swarm` K2, `identity-fold`, and the hyperlexicon arm all collapse to the same
wall.

## Consequence
The bottleneck is the reader's relation SHAPE, not its typing, its lookup, or its induction. Improving reading
requires an extractor that yields a predicate with its arguments (a clause-level subject–predicate–object read),
i.e., a change to the GFread itself — not another arm over figure-connector-figure.

## Limits
DEV sample only (400 sentences/stem, one document family each); "function word" here includes light verbs
(copulas/auxiliaries) — flagged, since `is`/`es` are technically verbs; the pass rule counted them as function
and would fail even a light-verb predicate arm.
