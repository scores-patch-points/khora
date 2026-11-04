# PREREG-BIND-V6 — the binder's trap errors (frozen before the held-out exam v6 is scored)

Frozen code: commit `fa769a7` on branch `binder-traps` (worktree cut from `cast-identity` a66216a = khora main 92bfada; binder files from PR 95 a8302ab, not rebased). Everything under this file's hash is scored once, on v6, by the parent. Nothing held out was read, run or scored here.

## What changed
`native/adapters/text/attention-traps.js::bindTraps` runs the unchanged binder and then re-reads each binding of kind pronoun or description against the previous sentence and the cast. A binding the evidence overturns moves to `gaps` with a typed reason and the measured evidence; nothing is rebound to another being. Off (`traps` absent or false) the call is the binder's own call (unit test: JSON-identical). The reader (`readDocument`, `read-core.mjs`) is untouched, so reader output is JSON-identical to base with the binder off. The binder file gained one non-enumerable property on its result (`context`), no behaviour change. `attention-switch.js` passes `traps` and `topicShare` through; off by default.

Rules, all from the reader's own structure and the repaired cast (castIdentity:true):
1. `trap_not_topic`: the bound being's mentions before this sentence are less than `topicShare` of the most-named candidate's. Declared dial `topicShare = 0.5`. Meaning: "It" and "The <noun>" continue what the document has been about; something named under half as often is a thing the text came to along the way.
2. `trap_close_candidates`: the binder's own near-tie resolution (`via: attended-tie`) is refused: two candidates this close are a typed gap.
3. `trap_center_elsewhere`: for a pronoun, the previous sentence's first naming, after nothing but closed-class words (a determiner), is a candidate other than the bound one (the binder's own centre veto missed subjects that began with an article).
4. `trap_expletive_or_cleft`: for "it", a complementizer inside the first four words of its clause, whatever verb stands between (the binder's rule needed a copula or auxiliary).
Closed classes are priors.js's (determiners, clause openers, coordinators, copula and auxiliary forms). No word list; one literal word, the complementizer, appears in rule 4, as in the binder's own expletive rule. Gate `eval/attention/binder-traps-gate.mjs` (no array or object of five or more string literals, no alternated-word regex): PASS on attention-traps.js, FAIL on a planted list.
Configuration to score: readDocument with localLexicon("en"), castIdentity:true, binder on with the declared round-5 dials (window 12, minActivation 0.5, minMargin 0.2, boost 2, and the round-2 to round-5 switches in score6.mjs `DECLARED`), capitalTargets on, text_evidence ruling, `traps: true`, `topicShare: 0.5`. Scorer: `eval/attention/score6.mjs` with `BIND_TRAPS=1` (`--types` prints the case-type table, `--controls` the five-seed shuffled control).

## Bars (the round-5 bars, unchanged)
P1 precision of bound attended cases ≥ 0.80 (testable only if ≥ 8 bound); P2' right-bound ÷ all attended ≥ 0.45; T1 trap wrong-bind rate ≤ 0.20; S1 zero silent outcomes; K1 the shuffled-referent control (five seeds) fails P1 on every seed.

## Development numbers (FITTED: bindgold2 to 5 are spent; the rules and the 0.5 dial were chosen while looking at them; optimistic, never evidence)
Before = binder a8302ab + castIdentity (this reader), after = with traps. Cells are right / gap / wrong / right_other (traps: right_other = bound to the entity the case says it is, counted right by the scorer).
| set | type | n | before | after |
|---|---|---|---|---|
| v2 | attended-pronoun | 8 | 6/2/0/0 | 6/2/0/0 |
| v2 | attended-description | 12 | 4/7/1/0 | 4/8/0/0 |
| v2 | trap-new-thing | 8 | 0/6/0/2 | 0/8/0/0 |
| v2 | expletive | 4 | 0/4/0/0 | 0/4/0/0 |
| v2 | trap-description | 4 | 0/1/3/0 | 0/2/2/0 |
| v3 | attended-pronoun | 10 | 7/3/0/0 | 7/3/0/0 |
| v3 | attended-description | 12 | 8/4/0/0 | 8/4/0/0 |
| v3 | trap-new-thing | 8 | 0/6/1/1 | 0/7/1/0 |
| v3 | expletive | 4 | 0/4/0/0 | 0/4/0/0 |
| v3 | trap-description | 6 | 0/6/0/0 | 0/6/0/0 |
| v4 | attended-pronoun | 10 | 7/2/1/0 | 7/2/1/0 |
| v4 | attended-description | 12 | 6/6/0/0 | 6/6/0/0 |
| v4 | trap-new-thing | 8 | 0/3/5/0 | 0/7/1/0 |
| v4 | expletive | 4 | 0/4/0/0 | 0/4/0/0 |
| v4 | trap-description | 6 | 0/5/1/0 | 0/5/1/0 |
| v5 | attended-pronoun | 9 | 5/4/0/0 | 4/5/0/0 |
| v5 | attended-description | 13 | 7/4/2/0 | 6/6/1/0 |
| v5 | trap-new-thing | 8 | 0/6/2/0 | 0/8/0/0 |
| v5 | expletive | 4 | 0/3/1/0 | 0/4/0/0 |
| v5 | trap-description | 6 | 0/4/1/1 | 0/4/1/1 |

Totals (bound / right of attended; traps wrong): v2 11/10 → 10/10, 3/16 → 2/16; v3 15/15 → 15/15, 1/18 → 1/18; v4 14/13 → 14/13, 6/18 → 2/18; v5 14/12 → 11/10, 4/18 → 1/18. After: P1 on v2..v5 = 1.00, 1.00, 0.93, 0.91; P2' = 0.50, 0.68, 0.59, 0.45 (v5 exactly at the bar, 10 of 22); T1 = 0.13, 0.06, 0.11, 0.06; S1 zero silent on all. K1 on each set: right ≤ 1 of 10 to 14 bound, precision ≤ 0.10, on all 20 seed runs. Raw outputs in `eval/attention/dev-v6/`.
Canon preflight (`eval/attention/dev-v6/canon-preflight.txt`, KHORA_PRIORS_DIR at the janus stand-in): CANON-OK, ten priors identical, no reader gaps, preflight sha256 240e2ca7eb55c3a4009a5100f47d5370344da079ea334051f705fe8cff682c12.
Dial sweep seen (topicShare 0.1, 0.3, 0.5, 0.6; v5 right 11, 10, 10, 9): 0.5 was kept as "at least half"; 0.7 would catch more traps and lose coverage.

## Expected failure modes (stated before v6)
- Coverage is the weak point: every rule turns a binding into a gap, so P2' has about 0.0 to 0.05 of slack on a fresh exam (dev v5 sits exactly at 0.45). Rule 1 also gaps a true "It" that continues a local, minor topic (a section about a part).
- Remaining wrong traps are of the kinds the evidence cannot see: an "It" after a sentence whose last-named thing is a first-mentioned being the cast holds under a fragment or not at all (v3 y08), a description whose noun is a being's own surface word but names a different thing (v2 t14, t15, v4 y18, v5 u15, same head noun as the topic), an attended description bound to a named sibling of the topic (v5 w16).
- Cast errors (a trailing apostrophe, fragments of named entities such as "Madonna" or "Salon") are layer 3's; rule 1 hides some of them as gaps, which is not a repair.
- No rule reads whether a new indefinite thing was introduced by the previous sentence. A first measurement (indefinite noun phrases, new words after the topic's last naming) separated nothing on the dev sets and is not used; `indefiniteNPs` is exported and unused by the rules.
- "The Louvre Palace"-type names: handled only through the repaired cast (v5 u18 binds correctly there); rules 1 to 4 do not target it.

## What this does not show
Development numbers are fitted on five spent exams (40 cases each at most, six or so articles each, one genre, one labeller). They are not evidence of the held-out rate; the 95% interval on 4 of 18 is already about 0.09 to 0.45. Nothing here tests another language, another genre, or the binder without castIdentity. The one declared dial (`topicShare`) and the rule set were chosen on the same sets they are reported on.
