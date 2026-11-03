# ROUND 2 RESULT — PARA-GOLD-BIND v1 (held-out, 30 cases, five new articles), scored once, 2026-11-03

Frozen binder: commit `b6ef650`; pre-registration `PREREG-ATTENTION-A2.md` sha256 `62eddeb7…` (bars fixed there). Set: `PARA-GOLD-BIND-V1.binder.json` sha256 `27356e90ac741c98751c5af631045abd6140907dfc93a9e3def61cfc2ade5ba1`
(a deterministic conversion of the parent's frozen `PARA-GOLD-BIND-V1.json`, sha256 `8f388a21…`; no label changed). Loader/scorer-only commit `6e4b359` (made before scoring): expletive traps (marked `out_of_scope` in the file) scored as traps; a trap bound to the entity the set lists in `accept` counts right; `--separate`. The binder is byte-identical to the frozen commit. Ruling: `text_evidence` (no Wiktionary pack). Raw output: `FRESH-RAW.txt`, `FRESH-CONTROL-RAW.txt`.

## Bars (pre-registered)
| bar | result | number |
|---|---|---|
| P1 precision ≥ 0.80 (bound ≥ 5) | **held, at the minimum** | 5 / 5 right (exactly 5 bound; 95% Wilson lower bound about 0.57) |
| **P2 coverage ≥ 0.50** | **FAILED** | 5 / 16 = **0.31** |
| T1 trap wrong-bind rate ≤ 0.20 | held | 1 / 14 = 0.07 (95% interval about 0.01–0.31) |
| K1 shuffled control fails P1, every seed | held | bound 4, 5, 6, 3, 5; right 0 on all five |
| G1/G2/G3 | held (`gates.mjs`) | |

**Round 2 does not pass.** Of the three bars on the thing the binder is for, the two that reward restraint held and the one that rewards binding failed. T1 is cheap for a binder that abstains: it gapped 12 of 14 traps and also gapped 9 of 16 attended cases. The result is "trap handling is fixed, coverage is not".

## Per case
Right: v03, v04 ("It", Colosseum), v09, v10, v16 ("The canal", "The bridge"). The only wrong binding: **v22** ("It was an all-Wagner orchestral concert…", a new-entity trap) bound to "International Fleet Review" at activation 4.75 / margin 0.39.

Attended (16): 5 right · 0 wrong · 9 gaps · 2 not seen.
- `pronoun_no_margin` (5): v01, v02 (Brooklyn Bridge), v06, v07 (Panama Canal), v08 (Sydney Opera House): two candidates tied or nearly (margins 0.00–0.12), typically the cast splitting one thing into several beings; not diagnosed further, to avoid tuning on the held-out set.
- `center_elsewhere` (1): v05 (the previous sentence began with another being).
- `description_unbound` (3): v11 "The span", v12 and v13 "The building": nothing in the text before them gave a candidate that word (no copula kind, not in a surface). This is the earned-not-typed rule working as designed, and it costs every description whose head noun differs from the topic's name.
- **Not seen (2): v14 "The expanded waterway", v15 "The facility".** No binding and no gap was filed. v15 follows a section heading in the same text line ("== Description ==\nThe facility…"), so the reader's sentence does not start with "The" and the sentence-initial target is never found; v14 and v28 sit mid-paragraph and the sentence boundary is not where the target needs it. This is a **silent miss, a defect**: a target the binder should have reported either way. Not fixed (frozen).

Traps (14): 1 wrong · 12 typed gaps · 1 not seen (v28 "The original locks", counted as no binding).
- new-entity (6): wrong 1 (v22); gaps 5: v17, v20 `center_elsewhere`; v18, v21 `center_not_carried`; v19 `pronoun_no_margin`.
- definite-other (4): wrong 0; v27, v29, v30 `description_unbound`, v28 not seen. The b15-style failure (a lone wrong-word candidate) did not occur here.
- expletive (4): wrong 0; v24, v25, v26 `expletive_or_cleft` (the rule worked); v23 was gapped by `center_not_carried`, not by the expletive rule.

Part-whole and bridging cases (v11, v14, v27, v28, v30), reported apart: attended 2 (v11 gap, v14 not seen), traps 3 (none wrong; v27, v30 gaps, v28 not seen). The remaining 25: attended 14, bound 5, right 5; traps 11, wrong 1. The result does not turn on them: P2 fails with or without them (5/14 = 0.36).

## Reading it plainly
- The restraint works: 11 of 14 traps ended in a gap for a stated reason, and the only wrong binding is a confident one (margin 0.39) to a non-topic being that the cast has no reason to rule out, which the lexicon giver's ruling (absent here) might have caught.
- The cost is large. Dev coverage was 0.68; held-out coverage is 0.31. Dev coverage was optimistic: the dev texts are leads about things whose cast split less, and the dev set was tuned on.
- Where the binder says nothing it says why, except the two silent misses.
- Of the 11 attended gaps, 5 are tied candidates and 3 are descriptions with no earned word; 2 are target-finding failures. None of them is fixed by a threshold change, which is why nothing was re-tuned.

## What this did not show
30 cases, one labeller (not blind, no second reader), one genre (Wikipedia articles about structures), five documents; the `text_evidence` ruling, not the giver's; the loader reads the parent's `accept` convention (v18, v19, v20, v29 list a stated entity; none was bound to it). T1's interval is wide (a rate of 0.07 over 14 is also consistent with 0.31).

## Possible round 3 (not started, not claimed)
Find targets after a heading or a merged sentence; merge cast beings that are one thing (a part of another's name) before ranking, which is where the tied-candidate gaps come from; earn kind words beyond the first copula sentence. Each would need its own held-out set: this one is spent.
