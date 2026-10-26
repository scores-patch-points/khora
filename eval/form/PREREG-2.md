# FORM (layer 4), REC frame: pre-registration 2, written before any code change and before any result

Goal id: `penelope-outline-2` (the REC of `penelope-outline` after its cadence null B2 failed on 2 of 3 real trees; eval/form/RESULTS.md,
section "Three real trees"). Agent: cc-outline2. Date: 2026-10-24.

## Why B2 failed (the diagnosis the REC answers)

The step was measured over a slot's BODY: every stem of every sentence that mentions the slot's seed terms (opencode-form.mjs `slotsFrom`,
`body`). A broad slot (elephants: `sg2` battle, 528 sentences' worth of stems) carries most of the tree's vocabulary, so wherever it stands,
every slot after it has few terms left to bring, and no order of the middle beats a shuffle. But a section does not SAY its body. It says its
fills: the units the stitched layer chose for it (opencode-stitch.mjs `fillSlots`, `fill` per leaf, at most LIMITS.perSlot = 3 per leaf), under
a title cut from its own clause, around the question its terms pose.

## The new step, exactly

For a slot `s` of a StitchTree@1 (a level-1 slot or level-1 gap, with everything under it):

- `question(s)` = the stems of `s.terms` and of every descendant's `terms` (unchanged: `slotsFrom`'s `question`).
- `fillStems(s)` = the union of `index.sentences[fill.id].stems` over every `fill` of every leaf under `s` (the stitched layer's chosen units;
  when a fill carries no `id`, the stems of its `text` through the index's conflator). A slot with no fills (an unfilled gap) has an empty
  `fillStems`.
- `say(s)` = `question(s)` ∪ `fillStems(s)`. This is the set the step is measured on.

For a plain slot list (`[{ id, label, terms?, text | sentences, fill? }]`, the test fixtures): `say(s)` = the slot's own terms ∪ the stems of
its `fill` texts when given, else the stems of its `sentences`/`text` (a plain list has no gather, so its sentences are what it says).

A term is a stem (the index's conflator over the corpus's own vocabulary; a word form of at least `PARAMS.minTerm` = 4 letters). A term is NEW
at position `p` of an order when it is in `say(order[p])` and in no `say(order[q])` for `q < p`.

Step at position `p > 0` = `|new terms at p| / |say(order[p])|` (0 when `say` is empty). The cadence of an order is the mean step over
positions 1..n-1. This is `cadenceOf(slots, order)` with `PARAMS.cadence = "say"` (the default after this change). The old measure stays
available as `PARAMS.cadence = "body"`, labelled DIAGNOSTIC; it is what RESULTS.md's first run used and it is reported beside the new one.

What does NOT change: the opener is the slot whose question terms recur in the most other slots' bodies; the closer is the one whose body
shares the most with the opener's; isolation (appendix) is on the body; titles are a clause of the slot's own sentences (fills first).
The middle order is the permutation of the middle (ends held) with the largest mean step on the NEW measure, exhaustive up to
`PARAMS.maxExhaustive` = 8 middle slots, greedy above (`PARAMS.order = "exhaustive"`, as it already stands).

## The three unseen asks (fixed now)

Rule given to this worker: from the ten pre-registered asks (PREREG.md), those NOT yet used (sea turtles, coral reefs, the printing press,
volcanoes, the Nile, dolphins, beans) that have a gather on disk; if none, trees from recent jobs' pages for asks not in RESULTS.md.

Checked before writing this (gather cache ~/.local/share/foldcode/gather-cache, the run's page rule: title names the topic, text names it
>= 20 times): sea turtles 0 pages, coral reefs 0, printing press 0, volcanoes 1, the Nile 0; dolphins 104, beans 104. So:

1. `dolphins` — ask "write an essay about dolphins" (PREREG.md ask 4; jobs longform-dolphins-*). Title rule `/dolphins?/i`.
2. `beans` — ask "write an essay about beans" (PREREG.md ask 5; jobs longform-beans-*). Title rule `/\bbeans?\b/i`.
3. `jaguar` — ask "write an essay about jaguar" (the most recent essay job whose ask is not in RESULTS.md: ~/.fold/worknotes/essay-jaguar-bda71b3a,
   "An essay on jaguar"). Title rule `/jaguars?/i`. 30 cached pages pass the rule, and the top 8 by mentions include homonyms (Jaguar Cars,
   Jaguar Land Rover, Atari Jaguar, SEPECAT Jaguar, Fender Jaguar, Jacksonville Jaguars). They are NOT removed by hand: the page rule is the
   run's rule, and a tree with homonym slots is a real condition of a real gather. It is declared here so the number is read with it.

Each tree is built once, exactly as the first run built its three: the 8 pages most mentioning the topic under the rule above, through
`stitch({ passages, topic })` (voidHunt + fillSlots, zero model calls). Elephants, lighthouses and honeybees are NOT re-read for the bar:
they were seen when the frame was changed.

## The null and the bar

Null: 200 FULL shuffles of the live order (every position, the ends included; `shuffledCadence`, seed 1, mulberry32 as already in the module),
each scored on the new measure; the null is their mean.

BAR B3: on every one of the three unseen trees, the chosen order's mean step on the new measure is ABOVE the shuffled mean. Reported with both
numbers, the per-slot steps, and the null's max. Three of three or the bar fails; a failed bar is reported as failed and the goal is REC'd,
not re-run with other asks or other parameters.

Reported beside it, not a bar: the same three trees on the old (body) measure — the order the old frame would have chosen (exhaustive on the
body measure) against 200 full shuffles on the body measure — so the two measures can be compared on the same trees. And the ends-held
diagnostic (middle only shuffled) on the new measure.

## Tests added with the code (bounded, synthetic, no file, no model)

- A tree whose broadest slot has many seed-mention sentences but few fills: on the body measure that slot's size dwarfs the others; on the
  say measure it does not, and the step of the slot after it is higher on say than on body.
- On every synthetic tree in the test file (the fixture and generated ones), the chosen order's mean step is above the 200-shuffle mean.
- The opener and the closer are the same slots whether the cadence is measured on say or on body.

## Also unchanged and still pending

B1 (the blind pair test, human judgement, >= 8 of 10, ties against) is not run here and not this worker's to run.

The sha256 of this file is written to eval/form/PREREG-2.sha before any code is changed; run.mjs refuses to run its unseen-tree section if
the file changed after freezing.
