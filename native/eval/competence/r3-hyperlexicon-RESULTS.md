# R3 + hyperlexicon lookup — FAILS (DEV, 2026-10-08)

Instrument: `eval/competence/r3-hyperlexicon.mjs` (new file; pre-registration in its header). It adds two
lookup arms to R3 (find beings, case-stripped) and asks whether the hyperlexicon — the field the weft folds
into — lets the reader find beings its own lexicon cannot name. TEST is spent; this is DEV only.

## Design
Split each stem's DEV in half. BUILD the field on the first half with the production perceiver
(`the-fold/corpus-session.js`, case-stripped, language declared) folded via `janus/ruliad.js::fieldFromWeft`.
Two lookup arms on the second half:
- **hyperlexicon** — recurring candidates that are ends of a field row carrying a resolved ref (not a settled common noun); `keyedHl` = keyed ∪ hyperlexicon.
- **refs** — recurring candidates among the perceiver's own referents (`sessionReferents`); `keyedRefs` = keyed ∪ refs.

## Result — the lookup adds only non-beings

| stem | keyed | lexicon_filter | capital | hyperlexicon | keyedHl | refs | keyedRefs | net-new / PROPN |
|---|---|---|---|---|---|---|---|---|
| eng | **0.585** | 0.548 | 0.554 | 0.025 | 0.207 | 0.082 | 0.555 | 416 / **0** (refs 8 / **0**) |
| spa | **0.750** | — | — | 0.175 | 0.533 | 0.278 | 0.741 | — |
| deu | **0.402** | — | — | 0.000 | 0.231 | 0.000 | 0.402 | — |

`keyedHl` and `keyedRefs` are at or below `keyed` on every stem (paired sign test: 0 wins, ≥4 losses). The
union is worse because the lookup contributes candidates that are **not PROPN** — 416 net-new forms in eng,
**0** of them gold PROPN (referent lookup: 8 net-new, **0** PROPN). The field's relation-ends are mostly
verbs/function words (its top labels are `have`, `to`, `get`, `the`, `said`); the perceiver's referents are
likewise common nouns (people, bush, …), not the names gold wants.

## Verdict
**FALSIFIED.** The hyperlexicon lookup does not improve the being rung; as operationalised it is a
precision loss. Neither "the field's attested relation-ends" nor "the production perceiver's referents" is a
PROPN being-set. This agrees with R3's own finding (keyed ≈ lexicon_filter + capital) and with the earlier
falsifications (`identity-fold` anti-predictive, `kinds-swarm` K2): the strongest signals are the received
lexicon and the capital witness, and neither the fold nor company-kind induction beats them.

## Limits / next
- One document's first half as the lookup source (a within-document, cross-half lookup), not the whole corpus.
- The production reader carries priors (`corpus-session.js`), so any win would have been prior-driven anyway.
- Untried: a whole-corpus field keyed on **both-bound** relations only; a lookup that resolves a candidate to
  a **kind** (role/alias) rather than to a relation-end; live doors (Wikidata) for the unseen stratum.
