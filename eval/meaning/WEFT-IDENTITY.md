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

## EXPERIMENT 4 — identity as cancellation within a plateau (`native/kernel/identity-cancel.js`, `eval/meaning/identity-cancel-run.mjs`)
The restated equation (EQUALITY-FALSIFIED.md part 2) as code. A candidate's RESIDUAL is how many of the mention's features it does not carry; the best residual is the NOISE; the next distinct residual is the
DMD (the smallest difference that changes the answer); any margin in [noise, dmd) gives the same answer, so no constant is chosen. `same` when one candidate has the noise residual alone; `undecided` when several tie
(named, never broken by order); `refused` when the mention keeps nothing, no candidate does, or nothing cancels. A candidate holding ANOTHER value of a dimension the perspective declares one-valued (direction, unit,
as-of) is EXCLUDED, not given a residual (an opposite value is a difference that makes a difference; absence is noise). 9 unit tests, each refusal a constructed violation first.

Same 28 mentions, same page candidates, same gold as experiments 2 and 3, no stated threshold:

| | radius 0 (the company as it stands) | widened to radius 1 / 2 / 3 |
|---|---|---|
| name as a node | same 15 (13 right, 87%); undecided 13, gold among the tied in 9, median tied set 2 | same 12 / 9 / 13 |
| company only | same 11 (5 right, 45%); undecided 17, gold among the tied in 8, median tied set 4 (of about 43) | same 6 / 1 / 0, right 1 / 0 / 0 |

- **It is parameter-free and it narrows.** Undecided is not silence: the tied set is a short named list (median 4 of about 43 when the claim carries no name; median 2 with the name).
- **Company-only still misidentifies (6 of 9 "same" calls on SUPPORTED claims are the wrong referent; the 2 on contradicting pairs are right, so contradiction is not the cause).** Read one by one: the mentions are thin and generic
  (`v:has_count, w:one` for "Indiana"; `v:more:more` for "water"; `v:small_than, w:region` for "metro"), a feature carried by many referents separates nothing, and the claim's wording ("is one of the Great Lakes")
  does not share a vocabulary with the page's atoms (`v:be`, `v:is_a`, `v:of`). Some scored "ends" are not beings the page names at all ("water", "river"), so the name-token gold is itself weak there.
- **The fold-depth failure janus recorded reproduces here.** Widening the fold radius collapses the verdict into ties: 11 -> 6 -> 1 -> 0 "same" calls and every mention tied at radius 3. `dmdWindow` read as "the conclusion
  equals the whole" lands on radius 3 for 27 of 28 (the whole is the vacuous tie). One parameter-free alternative, stated before it was run and run once (the shallowest radius with the fewest candidates tied at the best residual):
  company-only same 14 (6 right), named same 21 (17 right, 81%): no clear gain at n = 28; not adopted.
- **Not shown:** that this beats resolve's cosine posterior (7 of 28 top-1, 2 assertions both wrong) on a fair footing: both are weak without the name, and n is 28. What it adds is the plateau, the typed refusals and a short named list.

## What the build now needs (the operator's first sentence: the full reading pipeline should give the atoms we need)
Identity can only cancel features that share one vocabulary and discriminate. The pipeline's atoms must therefore be canonical (a predicate and its synonyms one key, a role one name, a being typed), typed with the perspective W
(unit and currency, direction, period and as-of) so a one-valued dimension can exclude, and the features that every candidate carries must be dropped (they never make a difference). That is the next change, in the reader, not here.
