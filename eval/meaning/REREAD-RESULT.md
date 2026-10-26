# Re-entry: the upper layer sends its gaps back down, the lower layer reads again, the delta is recorded (2026-10-26)

**The direction (the operator):** with the layers running one way we are at the mercy of garbage in, garbage out; with the ability to recursively go back and read better, and to record the delta
of the more careful reading, the upper layers can improve the lower ones and so their own meaningfulness. House law already says it: "a spiral with no re-entry is a line" (lesson 41); "when
the defs don't eva, you rec them". Built as `native/the-fold/reread.js`; measured by `eval/meaning/reread-run.mjs`; the deltas in `eval/meaning/rec/reread.jsonl` (RereadRec@1, append-only).

## The organ
- A verdict's typed gaps already say WHERE the reading was not enough: `ambiguous_binding`, `needs_deeper_reading` (with how much is missing), `direction_swap`, `different_sense`, an unread word.
- Each gap asks for REMEDIES, in order, each a side and a tier (`remediesOf`): a binding gap asks for the referent tier (the source sentence as the master reader read it IN ITS PAGE, one coreference
  over the whole page) and then the parse tier (the source under its k best parses, read BESIDE the production parse, never in its place); a swap or a sense gap asks for the parse tier; an unread
  word asks for the lexicon tier (the hyperlexicon's door; unavailable in this runner, a typed stop).
- The loop (`recurse`): judge; take the gaps; spend the first remedy asked for that this caller can read, once; judge again; append the pass (what triggered it, which side and tier, the atoms
  added and removed, the gaps before and after, the verdict before and after, whether it changed); stop when no gap is left or every remedy asked for is spent.

## Three things the build taught, each from a measurement that went wrong first
1. **The first reading must stay the production reading.** The beam's own first parse is NOT the production parse and can be worse ("is" hung as a clause); a re-read that replaced the
   reading with the beam lost every atom of a sentence and every verdict moved. Now the production parse is reading 0 and the beam is read beside it.
2. **More care on the CLAIM hurts; more care on the SOURCE helps.** Every claim atom must be met, so a second reading of the claim only raises the bar (supported 23 -> 18 in the first blanket
   run); a source states what any close reading of it states (the k3 arm's own rule). Remedies re-read the source; the claim's only remedy is the lexicon.
3. **A pass that changed nothing must not end the recursion.** Stopping at the first tier that did not help reached the beam 10 times in 61 passes and moved nothing; letting every remedy
   asked for be spent once reached it 51 times and moved one verdict. The recursion's DMD is "every remedy spent", not "the first that was quiet".

## Measured (108 English pairs, identity = cancellation, the proof checker gating every C)

| arm | C (false) | E (false) | N | passes | gaps closed | atoms added | verdicts moved (right / wrong) |
|---|---|---|---|---|---|---|---|
| one-way (as the pipeline runs) | 8 (0) | 23 (1) | 77 | 0 | | 0 | |
| **directed re-entry** (only where a gap is; page then beam, source only) | 8 (0) | **24** (1) | 76 | 102 on 51 pairs | 18 | 171 | 1 (1 / 0) |
| blanket (every pair's source, beam and page, gaps or not) | 9 (0) | 24 (1) | 75 | | | 478 | 2 (2 / 0) |
| random (the same remedies on a coin's half of the pairs) | 8 (0) | 24 (1) | 76 | | | | 1 (1 / 0) |

- Re-reading the source more carefully never produced a false verdict in any arm.
- Directed re-entry gets half of blanket's gain for about a third of the added atoms, leaves the 57 pairs with no gap untouched, and brings 8 pairs to "no gap left". The one gain blanket has
  that direction does not is in a pair whose gaps name no side (a license gap): direction cannot reach what the gaps do not point at, by design.
- The gain is small (+1 of 108) because the gaps are mostly binding gaps and the remedies available here are a page and a beam; the remedy most asked for and least available is the lexicon
  (an unread word), which needs the hyperlexicon's door.
- **The record is the product**: 102 RereadRec@1 rows, each saying what was read again, why, what it added, and what it changed; sha256 of the file in the run's output.

## Not done
The lexicon tier (the door); re-entry from the identity layer's own standings (`same_below_null` as a trigger); the delta written into the weft entry and the hyperlexicon (the record of the
mind being changed) rather than a jsonl beside the eval; a fresh pre-registered set.

## The reader's state and the record are one log (`the-fold/reader-log.js`, `eval/meaning/reader-reentry-run.mjs`, 2026-10-26)
Re-entry (above) and identity from the reader's side (WEFT-IDENTITY experiment 7) joined: the first reading admits each being's arrangements at pass 0; every directed pass appends what the more careful
reading added as admissions and what it removed as RETRACTIONS, tagged with the pass (the log is never rewritten); the reader at any cursor is the projection (`stateAt`); a being's identity is its
trajectory across the cursors (`trajectoryOf`). Each claim end is met at the first cursor and at the last.

| 108 pairs, 51 re-read, 102 passes, 272 claim ends met | first reading | after re-entry |
|---|---|---|
| same / new / undecided | 144 / 121 / 7 | 148 / 116 / 8 |
| same above the null | 15 | 17 |
| moved | | new -> same 6, undecided -> same 1, same -> other 3, null gained 4 |
| discrepancy finder (pairs flagged / contradictions / false) | 4 / 4 / 0 | 4 / 4 / 0 |
| the record | | 2,087 rows (RereadAdmission@1 admissions and retractions, RereadRec@1 passes), one file, sha256 in the run's output |

- The upper layer's gaps, sent down, changed what the reader could place: 7 ends it met as new or tied it now recalls, and 4 of its recalls now clear the null. A more careful reading can also
  UN-settle (3 ends): the re-read page or beam changed what the source said of a being, and the reader says so, rather than keeping a settled thing settled.
- The discrepancy finder did not move: the figure contradictions it finds were readable in the first reading; re-entry's remedies (page, beam) add referent and parse facts, not figures.
- The record is the product: what was read, what was read again and why, what each pass added and retracted, and what the reader concluded at each cursor, in one append-only file. The weft
  (the-fold/weft.js) is where it belongs; it is a jsonl beside the eval here.
