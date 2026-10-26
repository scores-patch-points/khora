# FORM (layer 4): pre-registration, written before any result

Goal id: `penelope-outline`. Question: do section titles and sizes read off a MEASURED skeleton of the kind asked for read as the sections of a
piece of that kind, where the facet titles (two void nouns joined by "and": "Asia and bulls", "Alexandria and lighthouse") do not?

Module under test: `~/.khora/opencode-form.mjs` — `skeletonFrom({ pieces, kind })`, `outlineFrom({ tree, skeleton, kind, topic, reader })`,
`cadenceOf`, `shuffledCadence`. Parameters: `PARAMS` in the module (k=2, minTerm=4, newTerms=2, pieceShare=0.5, corpusShare=0.5, minParts=3,
minPartWords=15, titleWords=[2,12], shuffles=200), printed by the run. No word list, no heading list, no genre fact typed by hand.

## Corpora (eval/form/corpus.mjs; recorded in CORPUS.md by the run)

- Essays: 15 local pieces (the workspace's own essays; no local Wikipedia exists; the VM is not asked).
- A second kind, measured so the organ's claim to generality rests on two kinds: README.md files across the workspace repos (identical copies once),
  and the markdown tables those documents carry as a third.

## The blind pair test (human judgement; PENDING — not run here)

Ten asks, fixed now:
1. write an essay about elephants
2. write an essay about lighthouses
3. write an essay about honeybees
4. write an essay about dolphins
5. write an essay about beans
6. write an essay about sea turtles
7. write an essay about coral reefs
8. write an essay about the printing press
9. write an essay about volcanoes
10. write an essay about the Nile

For each ask, ONE slot tree (the stitch's `voidHunt` over the gather's pages; where no gather exists, the tree the run builds from cached
pages or from a job's headings and section texts). From that same tree, two title sets:
- F (facet): `defaultOutline(topic, slot labels)` from opencode-longform.mjs ("Introduction", the labels through `facetTitle`, "Conclusion").
- S (skeleton): `outlineFrom({ tree, skeleton: essay skeleton, topic, reader: { words: ask words } })` titles in its order.
A judge who is not the generator (a person, or a model that wrote neither set, shown the two sets in random left/right order with the ask and
nothing else) picks the set that reads as the section titles of an essay on the ask. Each ask yields one pick: F, S, or tie.

BAR B1: S is preferred on >= 8 of 10. A tie counts AGAINST S. A failed bar is reported as failed; it is not re-run with other asks.

## The cadence null (mechanical; run here)

For each real slot tree the run builds (3 are planned: elephants, lighthouses, honeybees), the chosen order's mean step (step = new terms /
slot terms, over the slots after the first) against the mean step of 200 shuffled orders of the same slots (seeded).
BAR B2: the chosen order's mean step is above the shuffled mean on every tree. Reported with both numbers per tree.

## The skeleton (mechanical; run here; no bar, reported as measured)

For each kind: n pieces, the share of pieces whose first part names the question (>= 1 term returning in >= k later parts), whose last part
returns to the first, whose middle parts each bring a new returning term; words per role as median and IQR. The shares are the finding. A kind
whose shares are near zero has no such skeleton, and that is reported, not smoothed.

## Mechanical checks also reported (eval/form/run.mjs)

- Titles: no skeleton title has the facet-join shape (exactly two words joined by "and"); counted over all three trees.
- Appendix: slots in outline + appendix == slots in the tree, every tree.
- Words: every section's words within the essay skeleton's IQR for its role.

## What is run here and what is not

Run here: the skeletons, the three trees' F vs S title sets side by side, the cadence null, the mechanical checks. NOT run here: the human
judgement (B1) — the title sets are printed so a judge can be given them; the pick is pending. The author of this file also wrote the module;
the asks and bars above are fixed before the run and the sha256 of this file is written to PREREG.sha before run.mjs is executed.
