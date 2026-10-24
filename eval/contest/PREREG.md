# The contest: claims of one piece faced against each other — pre-registration

2026-10-23. Written before `opencode-contest.mjs` is run on anything and before the synthetic set exists. Frozen: the sha256 of this file is written
beside it (`PREREG.sha`) before `eval/contest/run.mjs` is built; the set is generated from a seed after that. Plan goal: `penelope-contest`.

## The miss this answers
The dolphins essay said "Thirty-six dolphin species are found in every ocean." and, in the next sentence, "There are around forty to forty-five dolphin
species living in nearly all aquatic environments ...". The judge faces each sentence against the SOURCES (fold-chat-falsify-answer.js) and never against
another sentence of the same piece, so it reported 0 contradictions. Two sentences of one piece on the same ends whose typed values cannot both hold are a
CONTEST, and a piece owes its reader the count.

## What is measured
`contests({ graph })` over `claimGraph({ claims })`, where a claim is `{ text, standing, at }` as the residue ledger and the profile give it.
- a claim's ENDS: the referents the piece individuates (native/the-fold/referents.js `buildReferents` over the whole piece, `resolveText` per claim —
  names and recurrent definite descriptors), plus the bare common nominals the builder cannot see: a noun lemma (the received parser prior's dominant
  class NOUN/PROPN, never a list) that recurs across distinct claims — the same recurrence bar the builder's descriptor tier already holds. A noun
  that an ordinal indexes ("the fourth lighthouse") is a distinct end from the same noun under another ordinal.
- a claim's VALUES, typed: a COUNT (a numeral — digits or the language's number words, a closed grammar like the digits — with the noun lemmas it
  quantifies as its head: "36 dolphin species" → 36 of {dolphin, species}; a unit is a head: "4 metres" → 4 of {metre}); a DATE (a year, with month
  and day when given, as an interval at its own grain); a RANGE or BOUND ("40 to 45", "between 40 and 45", "more than 40") as an interval. Every
  value carries its GRAIN: 10^-decimals for a decimal, the span of its trailing zeros for a round integer (9,000 → ±500), the calendar unit for a date.
- a date value's RELATION: the nearest preceding word the parser prior classes VERB, by lemma (born / died / completed), compared with the morphology
  prior's `sameAct` or equal lemma; two dates compare only under one relation. A count's relation is its head.
- a CONTEST: two claims whose end sets are equal or nested (each side's extras, if any, on one side only), with a value each of the same kind and the
  same head/relation, whose intervals, widened to their grain, do NOT overlap. Overlap at grain (a range containing a value; 36 and "36 species in every
  ocean"; 8,849 against "about 9,000") is CONSISTENT, not a contest. Different ends, different heads or a different relation is UNRELATED, not a contest.
- SETTLED (conceded): (a) a third claim on the same ends carries both contested values (it states the relation between them); (b) exactly one side
  carries a scoping year that is not its compared value (a time-scoped version); (c) for counts only, one side's ends strictly include the other's and
  the extras are proper referents (a narrower scope; a date of an event is not scoped by a place). A conceded contest is still a contest for recall.
- NULL (resolve.mjs discipline): a claim with no ends is the typed gap `no_ends`, with no typed value `no_value`; neither is ever guessed into a contest.

## The bars (fixed before the set exists; a miss is reported and REC'd, never retuned on this set)
- **B1 recall:** of the planted conflicting pairs, the share reported as a contest (settled or resting) is >= 0.90.
- **B2 false contests:** of the planted consistent, unrelated and scoped pairs, the share reported as a contest (settled or resting) is <= 0.05.
- **B3 the null collapses:** with the ends of all claims shuffled across claims (20 shuffles, the same seed series), the mean contest count is <= 0.10 of
  the real run's count. Reported beside: the mean shuffled false-contest rate.
- Descriptive, not a bar: the share of planted settled pairs whose concession names the right settling address; the per-kind recall.

## The synthetic set (built AFTER this file is frozen; `run.mjs --seed N`, default seed 7)
Pairs of sentences on shared referents, each pair independent (its own referent names, so pairs cannot cross-contest). Fixtures are data, not rules:
pools of invented proper names (places, lighthouses, towns, bodies) and of common-noun subjects the parser prior attests as nouns.
- value kinds: count with head (species, members, inhabitants ...), measure with unit (metres, kilometres, years, percent), year, year-month, ordinal-
  indexed referent; numerals as digits, number words, hyphenated number words, comma groups.
- phrasings: at least four per kind ("X has N Y", "There are N Y in X", "N Y are found in X", "X counts N Y"; "X was completed in Y", "Completed in Y, X ...",
  "X dates from Y", "X opened in Y").
- conditions, labelled at generation: CONFLICT (disjoint at grain, resting), CONFLICT-SETTLED (the above with a third claim, a scope year, or a narrower
  proper-name scope), CONSISTENT (equal; a range containing the value; a round number at grain), UNRELATED (different heads; a different relation on the
  same ends: born/died; different referents under ordinals; different proper referents), plus distractor claims with no value.
- 300 pairs, drawn about evenly over kinds and conditions; the labels are generated with the pair, never read from the module's output.
- The dolphins pair, verbatim from the essay, is run beside the set and reported by itself.

## The held-out real set (later; not built here)
Sentences from the residue ledger's real answers and the longform pieces (`~/.fold/worknotes/*`), grouped by task: every pair of claims on shared ends is
listed and a PERSON — not the agent that built this — labels each pair contest / consistent / unrelated, blind to the module's output. The same bars
B1 and B2 apply; a miss there is a REC of this frame (the ends, the typed value reader, or the relation rule), not a retune on the labels.

## Declared, not measured
- No unit conversion (4 metres against 13 feet is unrelated, a miss by construction). No Julian/Gregorian guard beyond year grain.
- A count's relation is its head only ("won 2 prizes" / "was nominated for 3 prizes" would contest); the verb is not read for counts, so the dolphins
  pair ("are found" / "living") stays a contest.
- Number words are English; the numeral grammar (units, teens, tens, hundred/thousand/million/billion, ordinals, "to"/"between ... and"/bound words)
  is a closed class and is written as grammar, not learned. Another language is the typed gap `no_numeral_grammar`.
- The parser prior's dominant class is out of context ("dolphin" is PROPN in it); the noun tier takes NOUN or PROPN and a one-word singular fold that the
  prior itself attests, so the ends are the prior's, noisy where it is.

## Amendment 1 (2026-10-23, written while the module's unit tests were being built, BEFORE run.mjs or the synthetic set existed; no run has happened)
The grain rule above ("the span of its trailing zeros for a round integer") read "40 bells" as 35–45, so 36 against 40 was consistent — and "36 species"
against "40 species" would have been too, which is the motivating miss by another number. Amended: the trailing-zero grain applies only to an integer
of a thousand or more (9,000 → ±500; 45,000 → ±500), the comma-group scale at which English writes a round figure as an approximation; below a thousand
an integer is exact (40 is 40; 300 is 300). Declared, not measured, like the rule it replaces. The bars B1–B3 and the set design are unchanged.

## Run 1 result (seed 7, 300 pairs; eval/contest/RESULTS-run1-seed7.md) — recorded before anything below was written
B1 recall 59.1% (MISSED, bar 90%); B2 false contests 1.6% (holds); B3 shuffled null 14.0% of the real count (MISSED, bar 10%). Dolphins pair: 1 contest, resting.
Where it missed, read from the per-condition table: yearmonth/conflict 0 of 15, year/conflict 2 of 9, measure/conflict 9 of 17, settled-scope 5 of 12, and the two
false contests were year/unrelated-relation. Not retuned on seed 7.

## Amendment 2 (2026-10-23, written AFTER run 1 and informed by it; run on a NEW seed, never on seed 7)
Three causes, each named by what it is:
1. A defect, not a rule: the tokenizer let a comma-grouped numeral end in a comma, so "Completed in June 1759, X still stands" carried no value (every
   phrasing with a figure before a comma). Fixed as a bug.
2. The declared design misapplied: month names were admitted as proper ends ("March" and "June" as beings), so two month-grain dates never had equal ends.
   The PREREG already names months as calendar grammar; the builder's capitalised month is now dropped from the ends.
3. A FRAME change (the REC): a date's relation was "the nearest PRECEDING verb"; "In 1759 X was completed", and a table row "X | completed | 1759", gave none,
   and a missing relation was incomparable with a stated one (the misses) while two missing relations compared (the two false contests). New frame: a
   date's relation is the nearest verb in the same unit, before it first, then after it, reading across a table row's separators.
Bars B1–B3 unchanged. Run 2 is seed 8 with the same generator (300 pairs). A pass on seed 8 is a pass of the amended frame on a fresh draw of the same
synthetic design; it is not a pass on seed 7, and the held-out real set remains the test that counts.

### Amendment 2, erratum (same day, after run 2 on seed 8: B1 76.4% missed, B2 0.0% holds, B3 11.6% missed; eval/contest/RESULTS-run2-seed8.md)
Reading the relation AFTER a date (Amendment 2, item 3) gave "In 2020 X had 36 bells" a relation for its year, so the year stopped being the count's time
scope and the unit test for the scoped concession (C7) failed. The scope rule the PREREG and the code already stated — a year that opens the unit before
every count frames it — is restored explicitly. No other change. Run 3 is seed 9; the misses that remain there are the frame's and are reported as such.

## Amendment 3 (2026-10-24, plan goal `penelope-contest-2`; written AFTER runs 1–3 (seeds 7, 8, 9: B1 59–76% missed, B3 11.6–14% missed, B2 0–1.6% holds) and BEFORE any code of this amendment; the next run is on a NEW seed)
The diagnosis on record (RESULTS.md): every missed pair contests when run alone; inside the ~650-unit graph the noun tier admits hub ends that recur
piece-wide ("kind" from "of its kind", "records", the table label "length", the building type in every name), so one side of a pair carries an end the
other lacks, the sets are not nested, and the pair reads as two cells; the same hubs re-pair shuffled claims (B3). This is a FRAME change (REC), not a retune.

**The rule, as janus `resolve.mjs` weighs company ("a few rare shared things decide it; common ones count for nothing"; `makeSurprisal`):**
- The POOL is the piece's claims that carry at least one end (n of them). For an end e, c(e) is the number of pool claims carrying it; its surprisal is
  resolve's, −log((c(e) + 0.5) / (n + 1)). T is the pool's total end tokens (Σ over claims of |ends|), m its distinct ends.
- The CHANCE FLOOR is the count an end has when the pool's T end tokens are dealt evenly over its m distinct ends: T / m — the same deal the B3 null
  draws from. An end is a HUB when c(e) > T / m (equivalently: its surprisal is below the surprisal of a chance-dealt end, −log((T/m + 0.5)/(n + 1))).
  No constant is chosen: the floor is the pool's own. The literal quantile reading of resolve's assert floor (1 − 1/n: an end carried by more than
  n − 1 claims, i.e. by every claim) was examined and set aside before this run because no end of the synthetic pool is in every claim, so it could
  not have changed runs 1–3; it is named here so it is not re-chosen after a result.
- A hub end NEITHER JOINS NOR SEPARATES: edges, nestedness, the narrower-scope concession's extras and the third-claim cover are judged over each claim's
  WEIGHTED ends (its ends minus the pool's hubs). The ordinal index stays on its noun as before (lighthouse#3 is a different end from lighthouse#4).
- A claim all of whose ends are hubs has nothing rare to join on: it is the typed gap `hub_ends` (beside `no_ends` and `no_value`), counted and never
  guessed into a contest. Declared cost: in a short piece about one thing, where that thing is in most claims, two claims on it alone will not contest
  under this frame; the held-out real set is where that cost is measured.
- The hub set is a property of the pool's end counts, so the shuffled null (ends dealt across claims) has the same hubs; weighted ends are recomputed
  per shuffle from the dealt ends. The comparison claimGraph(…, { weighting: "none" }) keeps the run 1–3 behaviour for a DIAGNOSTIC column only.

**The generator fix (a defect of the set, not of the module):** the settled-scope phrasing lower-cased the first character of the unit after "In YEAR ",
which was the proper name when the phrasing opens with it ("In 1964 dunrow Lighthouse has …"), so the builder did not individuate it. Fixed: the first word is
lower-cased only when it is not the proper name. Declared, not fixed: the conflict condition can draw a range at a coarser grain than its point
("9,000 to 9,008" against 7,000 — grain 1000 against 1), which the declared grain rule reads as consistent; it stays a planted miss by construction.

**Seed:** 10 (300 pairs, 20 shuffles). Bars unchanged: B1 ≥ 0.90, B2 ≤ 0.05, B3 ≤ 0.10 of real. The dolphins pair alone must still contest.
**Prediction, before the run:** B1 rises (the missed pairs contest in isolation and the hubs that split them are above the floor by a wide margin);
B3 falls (hubs no longer re-pair shuffled claims); B2 is the bar AT RISK, since two claims about different beings that share only a rare end would now
meet — the set's unrelated-referent pairs are the test of that. On a miss: a REC with the next frame (subject referents via keyed's `subjectNounsOf` +
proper referents as the ends), no retune on seed 10.
