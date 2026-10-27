# Contest layer — results (2026-10-23)

PREREG: `PREREG.md`, frozen before the runner and the set existed; every freeze is in `PREREG.sha` (first sha `7277993…cc88`, then one line per amendment;
current `e838423…81e4`). Module: `~/.khora/opencode-contest.mjs`; tests: `opencode-contest.test.mjs` (9 of 9). Three runs, each on its own seed, none retuned
on its own set:

| run | seed | B1 recall (>= 90%) | B2 false contests (<= 5%) | B3 shuffled null (<= 10% of real) | dolphins pair |
|---|---|---|---|---|---|
| 1, as pre-registered | 7 | **59.1% MISSED** | 1.6% holds | **14.0% MISSED** | 1 contest, resting |
| 2, Amendment 2 (comma tokenizer bug; months are not ends; date relation = nearest verb either side) | 8 | **76.4% MISSED** | 0.0% holds | **11.6% MISSED** | 1 contest, resting |
| 3, Amendment 2 erratum (opening year is the count's scope, as declared) | 9 | **70.5% MISSED** | 0.0% holds | **12.0% MISSED** | 1 contest, resting |

**Standing: B1 and B3 are missed; the goal `penelope-contest` is REC-owed, not passed.** B2 holds on every run (no clean pair was ever raised after run 1;
the two false contests of run 1 were the missing-relation case Amendment 2 named). The motivating miss (36 vs forty to forty-five) is caught on every run.

## Where the recall goes (seed 9, read from `results.json` `pairs`)
Every missed pair CONTESTS when run alone as a two-claim piece (checked: a July/March pair, a table-row/prose measure pair, a narrower-scope pair, a 8,000/14,000
pair). They are missed inside the 652-unit graph because the noun tier admits any noun lemma that recurs across the piece, and in a large piece incidental nouns
recur piece-wide: "kind" (from "of its kind"), "records" ("the records say"), "length" (a table label), "lighthouse"/"bridge" (the building type in every name).
One side of a pair then carries an incidental end the other lacks, the end sets are no longer nested, and the pair is read as two cells. The same hub ends are
what the shuffled null re-pairs on (B3 at 12% rather than 10%): a shuffled claim keeps meeting another through "lighthouse" + "length" + "year".
Smaller causes, each a generator defect of this set and not of the module: the scope phrasing lower-cased the proper name ("In 1964 dunrow Lighthouse"), so the
builder did not individuate it (settled-scope misses); the measure head "years"/"percent" collides with the year grammar in "At 3,000 years" (read as a count, fine)
but the generator also drew "9,000 to 9,008" ranges whose grain (1000 against 1) is consistent with the planted point by the declared rule.

## The frame change proposed (REC, not applied here — the plan's law)
`penelope-contest` → `penelope-contest-2`: **ends are weighed by surprisal, the discipline janus `resolve.mjs` already states ("a few rare shared things decide it;
common ones count for nothing").** A hub end — one carried by more claims than the piece's chance floor (1 − 1/n of the pool, resolve's own quantile) — neither
joins two claims nor separates them; nestedness is judged over the remaining ends. Equivalently, the claim's ends are its SUBJECT referents (keyed's `subjectNounsOf`:
the nsubj and its compounds) and its proper referents, not every recurrent noun in an oblique phrase. Bars unchanged (B1 >= 0.90, B2 <= 0.05, B3 <= 0.10); a new seed;
the same generator with the lower-casing defect fixed and declared. Prediction, stated before it is run: B1 rises because every missed pair contests in isolation;
B3 falls because hub ends no longer re-pair shuffled claims; B2 is the bar at risk, since two claims about different beings that share only a rare end would then meet.

## Not done
- The held-out real set (sentences from the residue ledger's real answers, labelled by a person) is not built; the PREREG names it as the test that counts.
- No wiring into the piece or the confession (opencode-longform / stitch / doorway are owned elsewhere); `rest()` returns the counts the confession will print.
- No unit conversion, no verb for counts, English numerals only (declared in the PREREG).

---

## Run 4 (2026-10-24, seed 10, Amendment 3: ends weighed by surprisal; goal `penelope-contest-2`)

PREREG Amendment 3 frozen first (`PREREG.sha` line 5, `b8b4be32…16afb`): a hub end — carried by more claims than the pool's chance floor T/m (its end tokens
dealt evenly over its distinct ends; resolve's surprisal below a chance-dealt end's) — neither joins nor separates; nestedness, edges and the concessions are judged
over each claim's weighted ends; a claim with only hub ends is the typed gap `hub_ends`. The generator's lower-casing of the proper name in the scope phrasing is
fixed. `claimGraph(…, { weighting: "none" })` keeps the run 1–3 frame for the diagnostic column. Tests: `opencode-contest.test.mjs` 12 of 12 (C10–C12 new).
Detail: `RESULTS-run4-seed10.md` / `results-run4-seed10.json`; the diagnostic: `RESULTS-run4-oldweighting-seed10.md`.

| seed 10, 300 pairs (125 planted, 53 settled, 175 clean), 660 units | Amendment 3 (this run) | old weighting (DIAGNOSTIC, same seed) |
|---|---|---|
| B1 recall (>= 90%) | **92.8% holds** | 69.6% missed |
| B2 false contests (<= 5%) | **0.0% holds** | 0.0% holds |
| B3 shuffled null (<= 10% of real) | **35.1 vs 134 real = 26.2% MISSED** | 14.3 vs 88 real = 16.2% missed |
| concessions naming the planted settler | 47 of 53 | 40 of 53 |
| contests across different pairs (descriptive) | 17 | 0 |
| typed gaps | 95 (no_value 32, hub_ends 63) | 32 (no_value) |
| hub ends | 62 (29 of them proper referents) | — |
| dolphins pair alone | 1 contest, resting | 1 contest, resting |

**Standing: B1 and B2 hold, B3 is missed and is worse than before; the goal is not passed. Not retuned on seed 10.** The prediction held for B1 (up) and B2
(at risk, held) and failed for B3 (predicted down, went up). Two findings, read from the run, each named by what it is:

1. **The nine remaining B1 misses are all `hub_ends` gaps with one cause: the set's names are not its own.** `freshName` cycles 24 × 14 = 336 stems over 660
   names and changes only the building type ("Thornbury Lighthouse", then "Thornbury Bridge"); the referents builder merges the two into one being
   ("thornbury lighthouse" on both pairs' claims), so a pair's own name is carried by 4–7 claims, crosses the floor (T/m ≈ 2.4) and the pair has nothing rare
   left. The same merge is the 17 cross-pair contests. The PREREG promised "each pair its own referent names"; the generator breaks that promise at 300 pairs.
   A set defect, like the lower-casing (Amendment 3) and the comma (Amendment 2), not a rule of the module — and not fixed here, because it was seen after the run.
2. **B3 cannot go under the bar with this null on this set, and the weighting makes that visible rather than causing it.** The null deals END SETS across
   claims. After the hubs are gone a pair's two sets are identical ({kelrow, kelrow lighthouse} on both sides), so wherever the twin sets land, the two claims
   are "on the same ends" by construction and contest whenever their values are comparable and disjoint. The null count is then the set's own base rate of
   comparable-disjoint values between random claims (≈ 12% of pairs: 35 of 300 twin deals), and the ratio to the real count (134 of 300) is ≈ 26% whatever
   the ends are. In the old frame fewer twin sets were identical (one side carried "records", the other "kind"), which is why its null was LOWER — the same
   defect that cost it recall. The 20 shuffles' false-contest rate on clean pairs stays 0.1%: the null is not raising clean pairs, it is re-pairing twins.

**REC (proposed, not applied — the plan's law):** `penelope-contest-3`, Amendment 4 before any run, seed 11: (a) the generator draws every name from its own
stem (PRE × SUF × TYPES without a repeated PRE+SUF), restoring the PREREG's own promise; (b) the B3 null deals end TOKENS across claims (each claim keeps its end
count; a twin set is broken), which is what the PREREG says B3 tests — "the contests were about shared ends" — with the set-deal null reported beside it as
the set's value base rate; (c) the weighting rule unchanged. Prediction: B1 ≥ 0.95 (the nine misses are the collision), B2 unchanged, B3 under 0.10 under the
token deal. If B3 still misses under the token deal, the ends frame itself is wrong and the next REC is the subject-referent ends (keyed's `subjectNounsOf` +
proper referents).

Smaller things seen, declared: the builder admits "in April" and "fourth" and the verb forms "count"/"measure"/"stretch" as ends (the prior's noisy classes);
all are hubs on this set and cost nothing here, and they are the noise the PREREG already declares ("the ends are the prior's, noisy where it is").

---

## Run 3 detail (seed 9), as `run.mjs` wrote it

# Contest: synthetic run (seed 9)

PREREG: eval/contest/PREREG.md, sha256 in PREREG.sha (frozen before this runner and this set existed). Generated: 300 pairs (122 planted
contradictions of which 55 with a settling fact, 178 consistent/unrelated), 30 distractors, 665 units in one graph. 33 typed gaps.

| bar | value | bar | holds |
|---|---|---|---|
| B1 recall of planted contradictions | 70.5% | >= 90% | NO |
| B2 false contests on clean pairs | 0.0% | <= 5% | yes |
| B3 shuffled-ends null (mean of 20) | 12.6 contests vs 105 real (12.0%) | <= 10% of real | NO |

Descriptive: 19 contests across different pairs (claims that share only a head word or a building type; counted here, not in B2 since they are not labelled pairs);
concessions naming the planted settling address: 38 of 55; shuffled false-contest rate on clean pairs: 0.1%.
The dolphins pair from the essay, run alone: 1 contest (Thirty-six vs forty to forty-five, resting).

## Per kind and condition (found = the pair raised at least one contest)
| kind/condition | pairs | found |
|---|---|---|
| count/conflict | 9 | 9 |
| count/consistent-equal | 10 | 0 |
| count/consistent-range | 8 | 0 |
| count/consistent-round | 10 | 0 |
| count/settled-narrow | 5 | 3 |
| count/settled-scope | 6 | 4 |
| count/settled-third | 11 | 11 |
| count/unrelated-head | 5 | 0 |
| count/unrelated-ordinal | 11 | 0 |
| count/unrelated-referent | 7 | 0 |
| measure/conflict | 21 | 12 |
| measure/consistent-equal | 10 | 0 |
| measure/consistent-range | 10 | 0 |
| measure/consistent-round | 8 | 0 |
| measure/settled-scope | 9 | 5 |
| measure/settled-third | 8 | 3 |
| measure/unrelated-head | 7 | 0 |
| measure/unrelated-ordinal | 8 | 0 |
| measure/unrelated-referent | 10 | 0 |
| year/conflict | 14 | 14 |
| year/consistent-equal | 9 | 0 |
| year/consistent-range | 7 | 0 |
| year/settled-third | 7 | 7 |
| year/unrelated-ordinal | 5 | 0 |
| year/unrelated-referent | 9 | 0 |
| year/unrelated-relation | 11 | 0 |
| yearmonth/conflict | 23 | 9 |
| yearmonth/consistent-equal | 7 | 0 |
| yearmonth/consistent-range | 6 | 0 |
| yearmonth/settled-third | 9 | 9 |
| yearmonth/unrelated-ordinal | 6 | 0 |
| yearmonth/unrelated-referent | 8 | 0 |
| yearmonth/unrelated-relation | 6 | 0 |

## Misses (planted contradictions not raised)
- measure/conflict: 9 of 21
- yearmonth/conflict: 14 of 23
- count/settled-narrow: 2 of 5
- measure/settled-third: 5 of 8
- measure/settled-scope: 4 of 9
- count/settled-scope: 2 of 6

## False contests (clean pairs raised)
- none

A bar is MISSED. Per the plan's law this is reported, not retuned on this set: a frame change (REC) is proposed in the report, and the next run is a new PREREG amendment.
