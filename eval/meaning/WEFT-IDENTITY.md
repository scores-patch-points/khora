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

## EXPERIMENT 3 — confidence determined regionally (`eval/meaning/regional-resolve.mjs`)
The operator's direction (2026-10-26): confidence is not a number anyone states; it is "regionally determined based on DMD of relative assertions and a baseline from past experience".
Experiment 2's page-wide pool (n about 43) put resolve's own chance floor at 0.977, which no mention reached. Built from organs the repo has, janus's `resolve.mjs` unchanged:
- **region:** the mention's company widened hop by hop through the page's own referent graph (nodes sharing an atom are neighbours), radius 0 to 3; at each radius only the candidates whose region
  overlaps the mention's are in play, so the pool's chance floor `1 - 1/n` is read over the REGION's n;
- **DMD:** resolve at every radius; the window is the shallowest radius whose top candidate equals the widest radius's (`activation.js dmdWindow`);
- **experience:** per region key (window, regional pool size) the share of earlier tops that were right, add-half smoothed, from OTHER pages only (leave-one-page-out); no experience, no assertion;
- **assert** when resolve asserts at the window and the key's past precision reaches the region's chance floor.

| 28 scored mentions, 32 pages | window found | top right at the window | resolve asserts (right) | with the experience gate: asserts (right) | no experience |
|---|---|---|---|---|---|
| name as a node | 28 | 20 | 9 (9) | 12 (12) | 11 |
| company only | 28 | 2 | 4 (2) | 1 (0) | 11 |

- Page-wide, resolve asserted nothing in either variant; over the regional pool it asserts, and with the name as a node every assertion it makes is right (12 of 12 gated; 9 of 9 ungated).
- **Company only is the real test of "what a claim says of a thing finds the thing", and it stays weak**: the window stabilises (it is found for all 28) but the top it stabilises on is right 2 of 28 times,
  and the experience gate keeps the system nearly silent (1 assertion, wrong). Regional determination removes the stated threshold; it does not make weak evidence strong.
- **Power is small and the claim is narrow.** 28 mentions, leave-one-page-out experience from the other 31 pages, 11 mentions with no past experience for their key, one language, gold by name token. The NAMED row
  is nearly tautological (the name is a node). Not shown: that this holds on another corpus, that the window radii (0-3) are the right family, that the experience keys (window, n) are the right keys.
- **Next, in the direction given:** keys from the experience organ's own signature (`experience-priors.js` network signature: topology, cycle rank, branching, size) in place of (window, n); and experience that outlives a run
  (a prior file, built from earlier readings and carried in the weft) instead of one rebuilt from this set.
