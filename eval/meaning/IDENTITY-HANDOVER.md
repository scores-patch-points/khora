# Identity determination — handover (2026-10-26, khora main `1cf8891f`)

What exists, where it is, how to run it, what it gives, and what is open. Written so an agent can take the work over without this session.

## The pieces, in the order the pipeline runs them
| piece | file | what it is | test |
|---|---|---|---|
| the one reader | `native/reading.js` -> `native/the-fold/read-core.mjs` | the master pipeline (WeftEntry@4); `rows: true` keeps each sentence's UD rows on the entry | `native/tests/reading-pipeline.test.js` |
| atoms from the entry | `native/the-fold/weft-atoms.js` | `atomsFromWeft` (per sentence), `atomsOfPage` (one coreference over the page) | `weft-atoms.test.mjs` |
| canonical features | `native/the-fold/arrangement-features.js` | one predicate key per synonym class (giver: Wiktionary via makeSynonymy), position as direction, `m:`/`unit=`/`asof=` | `arrangement-features.test.mjs` |
| identity as cancellation | `native/kernel/identity-cancel.js` | `cancelIdentity` (same / undecided / refused; plateau [noise, dmd); perspective excludes); `standingOf` (the rewiring null) | `identity-cancel.test.mjs` |
| the stage's identity hook | `native/the-fold/cancel-identity.js` | chooses among name-nominated anchors; one-to-one | `cancel-identity.test.mjs` |
| identity from the reader's side | `native/kernel/reader-identity.js` | the state an append-only log kept as a holograph; `meet` (same if B moves the reader as A again would), `valuesMeet` (the stated margin), the deranged-order null | `reader-identity.test.mjs` |
| re-entry | `native/the-fold/reread.js` | gaps ask for remedies (page, k-best on the source; lexicon); `recurse`; every pass recorded | `reread.test.mjs` |
| the reader's log | `native/the-fold/reader-log.js` | passes append admissions and retractions; `stateAt` a cursor; `trajectoryOf` | `reader-log.test.mjs` |
| the reader as the weft's projection | branch `weft-reader` (not merged) | `passOf`, `readerAt(weft, cursor)` | 3 of 4 pass |

## The runs (all from the khora checkout root unless said; `FOLD_WIKT_SLIM` = the slim Wiktionary dir; `IDENTITY=cancel` injects the chooser)
- `node eval/meaning/regression-108.mjs` — the frozen baseline check (G0).
- `node eval/meaning/stage-run.mjs` — the stage on the 108 pairs (`ATOMS_VIA=weft` reads through the master reader; byte-identical results).
- `node eval/meaning/identity-cancel-canon.mjs` — company signatures on 28 page mentions (needs FOLD_WIKT_SLIM); `identity-cancel-run.mjs` the plain ones.
- `node eval/meaning/identity-cancel-code.mjs` — the second medium (git history of 8 files).
- `node eval/meaning/identity-by-difference.mjs` — deletion signatures.
- `node eval/meaning/reader-identity-run.mjs` — the reader's side and the discrepancy finder.
- `IDENTITY=cancel FOLD_WIKT_SLIM=... node eval/meaning/reread-run.mjs` — re-entry with blanket and random controls; `reader-reentry-run.mjs` joins it to the reader's log.
- `node eval/meaning/identity-margin-sensitivity.mjs` (needs EO_TERMINAL) — the hand constants of the financial identity code, swept.

## The results, in one place
`eval/meaning/WEFT-IDENTITY.md` (experiments 1-7), `EQUALITY-FALSIFIED.md` (the definition attacked), `REREAD-RESULT.md` (re-entry and the reader's log), `ATTACH-PRIOR-PREREG.md` (the attach prior, PR #65, open and unwired), `IDENTITY-LOG.md` (this plan's log). The essay `AN-EQUALS-SIGN-IS-A-DOOR-ESSAY.md` is in the workspace root, not the repo.

## Open, by the plan's phases
- P1: the Motorola resolution against its exhibits. janus `native/organs/identity/run/motorola.mjs` reads "the Motorola primary document"; the exhibit sets and the hand-written mismatch list are the operator's.
- P2: document on both sides; a derived margin in place of EO-terminal's `worldsFloor`; perspective dimensions on data that exercises them; the propagated margin for sums; the lexicon tier of re-entry; identity's `same_below_null` as a re-entry trigger; a prior that yields to one sighting (alpha = 1 does not).
- P3-P6: as the plan states. Known hard cases to seed P5: fission (the fictional corvane), Google/Alphabet, the Russian case forms, same-template invoices.
- Not in any phase yet: a door (the stage runs only in evals); `coref.js` and `pronouns.js` are two resolvers; the clause tree is English-only.
