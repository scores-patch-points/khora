# Identity through THE reader's page — what was wired, what was measured (2026-10-26)

The stage's binder takes an injected `identity` (kernel/stage.js `bindEnd`; adapters/text/atom-world.js `atomIdentity`) and janus ships `resolve.mjs` ("which one is it?"), which its own
RESOLVE.md says no consumer imports. The sources in the English pairs are single sentences cut from whole pages, and the pages are on disk (`fresh19`, `fresh20`: 32 English pairs).
So the question here is not "can identity be wired" but "does a page-sized world, read by THE reader, give identity anything to say that a sentence-sized world cannot?"

**What was built (`native/the-fold/weft-atoms.js::atomsOfPage`).** The page is read once by `readDocument(..., { rows: true })`, coreference is resolved ONCE over every sentence, and each sentence is
atomized against those entities, so an entity id means one being across the whole entry (the per-sentence `atomsFromWeft` numbers its entities afresh in every call, which is fine for a sentence
and wrong for a world). Both scripts below are evals (`eval/meaning/identity-run.mjs`, `eval/meaning/resolve-run.mjs`); neither changes a verdict.

## EXPERIMENT 1 — the holographic `same` test (`atomIdentity`) with the page as the source's world
32 English pairs, median page 11 sentences. The stage judged the pairs the atoms arm leaves open; only **1** committed a verdict (E or C), and no verdict moved with identity injected (by
construction: identity convicts only on a declared exclusion, and none is declared).

| standings drawn by the claim's binds | sentence world | page world |
|---|---|---|
| needs_deeper_reading | 59 | 59 |
| same / raised_difference / against | 0 | 0 |

**The page gave identity nothing more to say, and the reason is structural, not a thin page.** The test needs `minOccurrences: 3` on BOTH readings (corpus-identity.js). The page side is rich
("Lake Michigan": 7 occurrences) but the claim is one sentence: across the 32 claims, 82 beings occur at most 6 times and only 26 reach 3. "Same being across two readings" cannot be asked of a
one-sentence reading. The stage README's item 5 ("identity at corpus scale") is right, and the corpus has to be on BOTH sides (a document against a document: the Motorola resolution against its
exhibits), not a claim against a page.

## EXPERIMENT 2 — janus `resolve` (mention -> referent), the question a claim end actually asks
Mention = a claim's end (its company: `v:<predicate>`, `w:<the other end's name token>`); candidates = the page's referents (median pool 43, max 62); gold = the one page referent sharing the
mention's name token (28 of 82 mentions have exactly one; the rest are not scored). The lens states no `assertAt`, so resolve's own rule applies: the pool's chance floor, 1 - 1/n (0.977 at n = 43).

| | scored | top-1 is the gold referent | asserts (right) | asks | gaps |
|---|---|---|---|---|---|
| mention carries its name token | 28 | 25 (89%) | 0 | 10 | 18 |
| company only (what the claim says of it) | 28 | 7 (25%; chance is about 2%) | 2 (0 right) | 11 | 15 |

- The posterior ranks the right referent first when the name is one of its nodes, but then the name binder (which the stage already has) does the same job.
- From company alone it is far above chance and far from usable, and both assertions it made were wrong.
- With no stated stakes it never commits when it has the name. **The stakes of a wrong binding are the user's to state** (`lens.assertAt`); no number was chosen here.

## What this means
- The identity hook stays what it was: optional, annotating, never convicting. Nothing in the stage's verdicts changes.
- The page world is real and consistent now (`atomsOfPage`), which was the missing piece for any corpus-scale identity.
- To make identity settle: (1) a document-scale CLAIM side, or a declared `lens.assertAt`; (2) coreference that keeps a repeated name one being (the learned ranker opens a new entity for it; a `todo` test in
  weft-atoms.test.mjs fails on it); (3) a declared exclusion (a functional relation) for `against` to be possible at all.

## Not done
Wiring identity into any door; a corpus-on-both-sides world (Motorola resolution vs exhibits); a neighbour graph for `resolve` (the run passes none: `neighbors` is empty); janus `same.mjs`/`correspond.mjs` over the page (correspond takes dependency rows, which the entry now carries, but it matches two graphs of one language or of editions, not a mention to a being).
