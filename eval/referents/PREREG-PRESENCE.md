# PRONOUNS: a presence rung and a locality rung beside the shipped resolver — pre-registration, written before the option exists and before the confirmation slice is read

Date: 2026-10-27. Agent: cc-cast-initial. Asked by `P-…-claude-ring-49` (next) after the diagnosis in `/Users/mlacy/Downloads/workspace/pronoun-activation/FINDINGS.md`: the shipped resolver's "activation" is associative
recall of vocabulary with no recency, no mention count and no grammatical role; a plain recency-plus-salience baseline (window 4, boost 2, floor 2, margin 0.3; dials chosen on slice A; `dev_ge20` scored once)
binds 89 right / 18 wrong / 165 unbound against the shipped resolver's 7 / 10 / 255. This builds that rung INSIDE the pipeline as an opt-in arm, and the locality rung of `legacy2/khora-read-across` beside it.

## The arms (all read the same entry; the shipped resolver's `entry.pronouns` is untouched and is the plain control)

`readerOptions.pronounPresence = { window, boost, feed, floor, margin, locality }` (no defaults: every dial is declared; off = absent) adds `entry.pronounsPresence`, one item per pronoun of the
resolver's own class (`he him his himself she her hers herself`, the resolver's matcher) that this rung binds: `{ pronoun, at, sentence, surface, ref, mechanism, activation, margin }`, addressed like `entry.pronouns`.

Process, sentence by sentence in the entry's own order (`entry.sentences`), events in text order:
1. a cast mention fires its being: +`boost` when it is the first cast mention of its sentence (a POSITION PROXY for the grammatical subject; no parse), else +1; decay `gammaFor(window)^(sentence distance)`
   (`kernel/activation.js`'s own derivation; `window: null` is the undecayed control). A mention earlier in the pronoun's own sentence counts at distance 0; one after it does not.
2. a pronoun of the class: **locality** (only when `locality: true`, the legacy `namedScope: "local"`): if exactly ONE distinct being is named in the pronoun's own clause (`sameClause`) and it is not
   non-personal and is gender-compatible, it decides, with no arithmetic. Otherwise, or when `locality` is false: the **presence ladder**: candidates are the beings with activation > 0, minus the
   non-personal ones (the read's own `nonPersonalOf` ruling over the cast) and, for a clean pronoun, those whose clause-local gender evidence (the resolver's own rule, causal) contradicts it; bind to
   the highest if its activation >= `floor` and `(top - second) / top >= margin` (a lone candidate has margin 1, as in `kernel/contest.js`); ties go to the more recent mention. Otherwise the pronoun stays unbound.
3. `feed: 1`: a pronoun this rung binds re-fires the being it bound (+1).

Off (the default): no code runs and the entry is what it was.

## What is a declaration and what is not done (stated now)

- **The window is a DECLARATION**, chosen on the development slice from a declared grid, "carrying its reason" (`kernel/activation.js`). It is NOT measured per material (READING-POLICY P1 asks for that): a measurement
  needs a gold-free `derive` for `dmdWindow` to ask "does forgetting older mentions change what the reader concludes?", and none is registered here. Typed gap `window_declared`; the Russian full text has no pronoun gold.
- **The boost is a position proxy**, not the reader's UD subject (the parse is an opt-in per-document cost not asked of this read). Typed gap `boost_is_position_proxy`.
- English only (the resolver's pronoun class is English's); another language is a typed gap and no item.
- **Binding theory predicts the locality rung may lose in English**: a non-reflexive pronoun is disjoint from a same-clause antecedent ("Anna told Boris about her": her is not Anna), while a reflexive
  ("himself", "herself") takes the sole same-clause compatible antecedent. The rung is registered as asked and reported split by reflexive and non-reflexive.

## Sets

| set | what | role |
|---|---|---|
| B | the pronoun golden's slice B (seed 20261120) | DEVELOPMENT: the dials are chosen here only |
| E | the 30 set-aside documents drawn by `cast-initial.mjs::setsOf` (`gum-slices.json` key E) | CONFIRMATION, scored once. Scored for CAST admission (khora#80) and never for pronouns; no pronoun result on it has been seen by this agent. |

Not used: P (reserved by the oracle pilot), the 5 leftover documents (too few), `dev_ge20` and `test` (spent by the diagnosis). E's freshness for pronouns is as far as this agent knows.

## Dial selection (on B only; the declared grid and rule)

Grid (the diagnosis agent's own declared space, 1,728 configurations): window in {2, 3, 4, 6, 8, 12, 24, null}, boost in {1, 2, 3}, feed in {0, 1}, floor in {0, 0.2, 0.5, 1, 2, 4}, margin in {0, 0.1, 0.2, 0.3, 0.5, 0.7}.
Rule: maximise the answerable pronouns bound RIGHT subject to precision `right / (right + wrong)` >= the shipped resolver's precision on B (derived from the control, not typed). Ties: fewer wrong, larger floor,
larger margin, smaller window (`null` last), smaller boost, `feed` 0. The chosen dials are printed and frozen before E is read; `locality` reuses them, untuned.

## Arms scored on E

R the shipped resolver (`entry.pronouns`), **P** the presence rung with the dials chosen on B, **PL** P plus the locality rung (same dials), **P-A** the diagnosis agent's dials (window 4, boost 2, feed 1, floor 2, margin 0.3, chosen
by it on slice A) as a transfer check, and the control **K1** the same dials with the being each cast mention names permuted within the document (mulberry32 seed 20261190), built to fail.
The golden's own terms: an answerable pronoun, right iff the bound being's own cast spans overlap a gold mention of its entity (`pronoun-golden.mjs::scoreDocument`).

## Bars (numbers decided now; each reported held / failed / untestable with its number)

On E:
- **Q1 gain**: P right - R right, paired bootstrap over documents (2,000 draws, seed 20261180): the 95% interval's lower bound is above 0.
- **Q2 precision**: P's precision `right / (right + wrong)` >= R's on E. Untestable if R binds fewer than 5.
- **Q3 locality**: of the bindings PL makes by locality, precision >= P's precision on E, AND PL right >= P right. Untestable if fewer than 10 are made by locality.
- **Q4 identity (C2)**: (a) option off (the default), the 30 entries are deep-equal (excluding `ms`) to the ones `main` reads, in a second checkout; (b) option on, the entry minus `pronounsPresence` equals option off.
- **Q5 transfer**: P-A also holds Q1 and Q2.

Control: **K1** must FAIL Q1 or Q2. If K1 holds both, the bars cannot tell a resolver from noise and that is said.

Reported with no bar: the arms' right / wrong / unbound; how many of P's bindings sit in a name-bearing sentence (the 58% of the unbound the diagnosis found skipped) and their precision; reflexive and non-reflexive split of the locality
bindings; what stays unbound by cause (out of class, no candidate, below floor, margin).

## What this can and cannot show

It can show whether a recency-plus-salience rung inside the pipeline binds more answerable pronouns than the shipped resolver at a precision no lower, on documents its dials never saw, and whether the legacy locality rung
helps. It cannot show: that the window is right for any material but English GUM (it is declared), that the first-mention boost is a subject, that gold coreference is truth, anything for a language other than English, or that
the rung would bind well on a genre GUM lacks. 30 documents; a handful hold most of the bindings, and the bootstrap over documents says so in its interval.
