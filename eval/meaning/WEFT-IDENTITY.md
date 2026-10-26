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

## EXPERIMENT 5 — all the way: canonical features, the stage wiring, and the SECOND MEDIUM (2026-10-26; branch `pipeline-atoms`)
The essay (AN-EQUALS-SIGN-IS-A-DOOR) set the order and the bars. Each step, measured, in that order.

**1. Canonical, perspective-typed features (`the-fold/arrangement-features.js`).** One predicate key per synonym class (giver: Wiktionary's listed synonyms and shared translations, `makeSynonymy`; the key is the
alphabetically first member; the vocabulary is the MATERIAL's, both sides registered before any feature is written, a test pins that it is unstable otherwise); the being's POSITION in the atom as the direction
(`v:sell@0` / `@1`); a figure's measure (`m:`); the atom's stated years (`asof=`) and a figure's measure (`unit=`) as one-valued dimensions; `k:` for is_a. Two reader faults found by reading the misses, both
universal: a passive with no agent lost its role (the patient became the first argument; atoms now carry `slots`), and "X is one of the Ys" produced no claim at all (a NUM copula head; now be(X, Ys): the rules
arm gains one supported pair, 19 -> 20 of 57, nothing else moves). A `dir=` dimension from the dative suffix was built and withdrawn: "drawn TO Hood" (a goal) read as a transfer out.

| 28-29 page mentions, company only | same | right | on SUPPORTED claims right / same |
|---|---|---|---|
| plain features (experiment 4) | 11 | 5 (45%) | 3 / 9 |
| plain, after the two reader fixes | 10 | 5 (50%) | 3 / 8 |
| canonical | 12 | 7 (58%) | 5 / 9 |
| canonical, name as a node | 14 | 13 (93%) | 9 / 9 |

The bar was "well above 45%": 58% is a lift, not a large one. Of the 5 wrong: 3 are ends that are not beings ("water", "metro", "detroit": the name-token gold is wrong there), 1 is entailment, not restatement
("sit at the same elevation" against "basins conjoined": not identity's job). Set those aside and it is 7 of 9. The perspective dimensions (`unit=`, `asof=`) and the universal-feature drop never fired on this
data (0 mentions carry a dimension; no feature is carried by all 43 candidates): untested here, not refuted.

**2. The stage wiring (`the-fold/cancel-identity.js`; `kernel/stage.js` bindEnd).** The binder nominates anchors by name and, where several are nominated, asks the injected identity to CHOOSE; a being is the same as
at most one claim end (two ends that both cancel to it CONTEST it: neither is chosen; found when "Baleen whales" and "toothed whales" both cancelled to one anchor by a single shared feature). `IDENTITY=cancel
node eval/meaning/stage-run.mjs`: ambiguous binds 35 -> 18, 9 binds chosen by cancellation, verdicts unchanged (C 8/35, E 22/57, 0 false-C, checker 5/5 and 20/20). **It does not beat the name binder; it equals it
with fewer loose ends.**

**3. The second medium: CODE (`eval/meaning/identity-cancel-code.mjs`).** The same kernel, nothing in it knowing what code is. A function's features are who it calls and who calls it (adapters/code/edges.js, real
edges). Mask and recover across two versions of a file from git history (8 files; the newer version's function names hidden; gold = the same name in the older version; real evolution is the noise).

| | functions | same | right | undecided (gold in the tied set) | refused |
|---|---|---|---|---|---|
| real (two versions) | 210 | 165 | 163 (98.8%) | 45 (45) | 0 |
| planted (one version twice) | 289 | 234 | 234 (100%) | 55 (55) | 0 |
| deranged (feature sets relabelled among functions) | 210 | 165 | 11 (5%) | | 0 |

The deranged control says "same" exactly as often as the real run. **The verdict carries no information about its own correctness**: the kernel finds a plateau in a wrong world as readily as in the right one
(THE-CORE-MECHANISM's wall: a general finder is a general finder of coincidences). So a "same" needs a search-aware null, and relabelling cannot be it (it keeps every true feature set in the pool under a wrong name,
so the best candidate carries exactly what the real one does; measured: ceiling 1.00 everywhere). **The null that binds destroys the RELATION** (janus correspond.mjs's: per feature kind, the values shuffled among
all candidates, degrees kept): `kernel/identity-cancel.js standingOf`, per mention, in counts, the (1 - 1/n) quantile over 20 rewired worlds, no constant.

| standingOf, 20 rewirings | same | above the null | right among those | right but below | wrong |
|---|---|---|---|---|---|
| code, 8 files | 165 | 133 | 132 (99.2%) | 31 | 2 (1 above, 1 below) |
| text, company only | 12 | 4 | 3 (75%) | 4 | 4 (1 above, 3 below) |
| text, name as a node | 14 | 6 | 5 | 8 | 0 |

The null costs 31 right answers on code that cannot be told from coincidence and catches one of the two wrong ones. On text it lifts company-only precision from 58% to 75% at n = 4.

**What this says about the engine.** The kernel transfers: on code it is near-perfect where it commits and never silent-wrong, on text it is weak, and the difference is the ground, not the kernel: a function's
company is typed, discrete and complete (every call is an edge), a claim's company is one sentence read by an imperfect reader into features that may be the wrong facts. That is the starving floor, now with a
control that shows what a non-starving floor looks like.

**Not done.** Document-against-document identity (step 5); a door (step 6); the perspective dimensions on data that exercises them; rename gold on code (79 functions in the newer versions have no name in the
older and were not scored: new functions and renamed ones, together); a fresh pre-registered text set.

## EXPERIMENT 6 — identity as the difference a being makes TO THE READER (`eval/meaning/identity-by-difference.mjs`, 2026-10-26)
The operator's correction: the work had made identity the company a thing keeps (a feature set of the thing) and treated the read as the EOT content. The house definition says identity is "the
difference a being makes to a ground that exceeds the ground's own variation", and the ground here is the reader; the record of getting to the read is the content, the read a projection of it.
Tested by the core mechanism's one act at F1: delete the being, refold, read the difference. A being's SIGNATURE is what the reader concluded differently once its atoms were gone: `bind:<claim atom>`
(a bind or proof lost), `gap:<kind>` (a gap that appeared or vanished), `verdict:<from>><to>`. The vocabulary is the READER's, so a claim end and a source being cancel without sharing a word.
Same kernel (identity-cancel.js), same gold as the page experiments (one source being sharing the end's name token), 84 pairs that reach the stage, 112 ends with a gold.

| signature | same | right | undecided (gold in the tied set) | refused |
|---|---|---|---|---|
| company (arrangement-features: what it keeps, canonical) | 74 | 57 (77%) | 25 (22) | 13 |
| **difference to the reader** (what changes when it is deleted) | 14 | 13 (93%) | 37 (33) | **61** |
| where both decide | | agree 12, disagree 0 | | |

- **More precise, far less covering, and the coverage is the reader's.** 61 of 112 claim ends are INERT: deleting them changes nothing the reader concluded, because the reader concluded nothing
  about them (no bind, no proof, no gap). Identity by difference can only be as rich as the reader's conclusions, which is the operator's point stated as a number: as the upper layers conclude
  more, the lower layer's beings acquire identity. The inert 61 are not a defect to drive to zero; they are the open ground, typed.
- **Never wrong where company is right, and once right where company is not.** The two signatures compose: company nominates (wide), difference certifies (narrow); on the 12 both decide they agree.
- **Not done:** the record itself. The passes (RereadRec rows) are still a jsonl beside the eval; the design the operator names is that THEY are the EOT content and a being's identity is its
  trajectory of differences across passes (kernel/identity-trajectory.js is the organ: stages, similarityAt, continuity). The signature here is one pass (the whole read), not a trajectory.

## EXPERIMENT 7 — identity from the READER'S side (`native/kernel/reader-identity.js`, `eval/meaning/reader-identity-run.mjs`, 2026-10-26)
The other agent's diagnosis, confirmed in the code: the identity test had treated the reading as the evidence (corpus-identity.js: nodes per mention, three occurrences on both sides, the reader a
constant stamped on the verdict). Built instead: the reader is the instrument. THE STATE is an append-only log of admissions (address, relation, value) kept as a holograph of slots
(bayes-surprise.js); MEETING a mention is scored by how far it moves the state (bits). **Same for the reader if meeting B moves the state the way meeting A again would; new if it moves like a new
thing; undecided named; the margin read off the candidates; a deranged-order null (values shuffled among addresses within each relation) before a same is a finding.** Recall is on what the thing
IS (its arrangements that are not one-valued slots), a tie broken by what it SAYS, and the one-valued slots are read at the recalled address AFTER: a slot that moves is the discrepancy.

Four things the build taught, each from a run that went wrong first:
1. **Two facts sit at the chance floor.** Values shuffled independently per relation among n addresses co-land on one address with probability n^-(k-1); the floor is the (1 - 1/n) quantile, so one
   distinctive fact is a coincidence, two sit at the floor, three are a finding. The null's arithmetic, not a constant.
2. **The name is an arrangement the reader meets.** Left out (to test company alone), a claim about one measure shared nothing distinctive and was met as new; the discrepancy was never read. "A name is a
   mouth": it nominates the address; what the thing then says of itself moves the slots.
3. **Recall first, slots after.** With the slots in the recall, a wrong value at the recalled address costs MORE than an empty slot (a slot holding one value expects another less than an empty one does),
   so "Mercury with a wrong radius" lost to "a new thing" and the slot was never read.
4. **A slot value meets within the margin the two state.** 2,440 km against 1,516 miles converted (2,439.77 km) and 79 lb against 36 kg "moved" the slot as strings: the two false flags. `valuesMeet`:
   within the stated resolution of either when the caller supplies it, else the stage's own 2% rule. The falsification's finding (a figure's last digit is its DMD), now a line of code.

| 108 pairs, the reader meets each source being then each claim end | result |
|---|---|
| recall (165 ends with a name-token gold) | same 132, right 132; 15 above the null; 33 met as new. Nearly tautological: the gold IS the name token and the name is an arrangement |
| the null | licenses 15 of 132: a one-sentence source holds 2-4 beings, so by the arithmetic above almost every same sits at or below the floor. Honest, and the same verdict the holographic test gave ("needs deeper reading"), now with the reason as a number |
| **the discrepancy finder** (a one-valued `has_<measure>` slot that moves at the recalled address) | **4 pairs flagged, 4 labelled C, 0 false**; before the margin, 6 flagged with 2 false (the unit-conversion pairs) |
| against the stage's licensed measure check | the stage names 8 (figures 5, a superlative holder, bracketed alternates, approx 5%); the reader finds 4 from its own movement with one declaration and no license table |

Not done: the reader's state written to the weft (the log IS the state here, in memory); the reader as a trajectory across passes (re-entry's rec rows as admissions, so a being's identity is what it
did to the reader over time: identity-trajectory.js); the Motorola resolution against its exhibits, the first real discrepancy case the analysis names; a null for the slot movement itself.
