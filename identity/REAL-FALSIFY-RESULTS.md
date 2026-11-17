# REAL-DATA FALSIFICATION RESULTS (preregistered in REAL-FALSIFY-PREREG.md, stamped 2026-11-17T04:01:32Z, sha256 d8b60475…)

**Verdict: the shipped identity organ is FALSIFIED on real data** (R1, R3, R4). Nothing was tuned; the module is unchanged.

Data: Wikidata humans, citizens of the Russian Empire, born 1750–1800, first 150 ids (lexicographic). **Deviation:** 145
items came back (5 ids collapsed, most likely redirects to already-merged duplicates). 2,822 statements. Split-half:
145 true pairs among 41,905 pairs (true rate 0.00346). Saved: `real-falsify/wikidata-entities-2026-11-17.json`.

| falsifier | arm Y (year) | arm D (day) | |
|---|---|---|---|
| R1 halves of one person called `different` (limit 5%) | **21.4%** (31/145) | **20.7%** (30/145) | FALSIFIED |
| R2 false merges among `same` (limit 5%) | 0 — no `same` at all | 0 | not falsified (vacuous) |
| R3 >= 3 fixed relations and recall >= 20% | 7 fixed, recall **0** | 6 fixed, recall 0 | FALSIFIED |
| R4 prior within 0.5x–2x | **0.19x** | 0.09x | FALSIFIED |

## Why: a bug in khora's inducer, found by this test
Relations induced `fixed` included P1343 (described by source), P27 (citizenship), P735 (given name), P26 (spouse),
P1412 (languages), P53 (family). In the data, EVERY member with two or more values for these had DIFFERENT values
(20/20, 16/16, 12/12, 4/4, 4/4, 3/3), but every differing pair had an unreferenced side. `kind-functional-induction.js`
skips an unwitnessed disagreement as non-evidence and then counts the member as AGREED (`else if (!anyDisagree)
r.agreed += 1`). An untested member is counted as an agreeing one, so relations that disagree 100% of the time become
"fixed". Only P570 (date of death) is genuinely one-valued here (11/13 agree).

## Post-hoc diagnostic (NOT preregistered): that one line patched in a copy (`inducer-untested-fix.diagnostic.diff`)
Arm Y: fixed relations = P570 only. False splits **0.7%** (1/145: a record holding two death years, 1781 and 1784 — a
real source disagreement). Recall still **0**; prior 0.41x. R1 would pass; R3 and R4 still fail.

## What this says
1. Discernment is sound on real data once untested members stop counting as agreement; what remains is genuine
   disagreement inside one source's record, which the shipped organ cannot weigh (noise is unsupported).
2. Positive identity is starved on real records: one-valuedness is only induced from REPEATED statements per member,
   and real records rarely repeat a property, so almost nothing is induced and nothing can merge.
3. The earlier passes (synthetic worlds) did not predict either failure.
