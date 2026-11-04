# ROUND 5 — closing the capitalised-target gap: pre-registration, written and hashed before held-out set v4 is released

Date: 2026-11-03. Same branch and PR (`attention-binder`, khora#95). No round-1 to round-4 file or hash, and no earlier set, is edited. The user authorised this as the last round for this approach. **v3 is SPENT and is development material** (`DEV-SET-5.json`, 167 cases: DEV-SET-4 + the 40 of v3), alongside v0, v1 and v2. Round 5 is scored once on the parent's v4, which this session has not seen.

## Why (round 4, published)
Held-out v3: P1 14/14, P2′ 14/22, T1 1/18 and K1 held; **S1 failed with 4 silent outcomes** (x21, x22 "The ISS"; y17 "The LHC Computing Grid"; y18 "The Mayflower crew"). Cause: a sentence-initial "The" followed by a capitalised word was not a description target, so the binder filed nothing. One more finding about v3, not a binder defect: x02 was scored right by the registered rule through the alias "LHC" that the cast merged into the Grid being; it is wrong by meaning (`NOTE-V3-X02.md`).

## **What was tuned on v3, stated plainly**
The one change is `capitalTargets`; it was designed from v3's four silent cases. A first version (the cast mention must start at the capitalised word) left x21 and x22 as `capitalised_unknown_name` gaps, because the cast gives "The ISS" a mention that starts at the article; the rule was corrected to use the longest mention that covers the capitalised word. That correction was made on v3's own cases. Nothing else was changed or re-tuned: the round-4 bearer test and every other option are as frozen, and the options declared OFF stay OFF (the dev set does not justify any of them: `centerRivalShare`, `openerReset` and `weakRouteCarry` showed no benefit in round 4 and v3 gives no new reason).

## The change (`capitalTargets`, declared true; absent = the round-4 call, byte for byte: the round-4 dev rows and the v3 rows are reproduced exactly, checked on this code)
Every sentence-initial article ("The …", after an optional quote or bracket, after a heading line) is a target. If the word after it is lower-case it is a description, as before. **If it is capitalised** it ends as a binding or a typed gap:
- the longest cast mention covering that word is looked up; none → gap `capitalised_unknown_name`;
- the name ends where punctuation, the end of the line or a closed class (copula, auxiliary, determiner, clause opener, coordinator) follows it; then, if the being is a candidate for "it", it is **bound as that being** (`kind: "name"`, `via: "cast-name"`), otherwise gap `capitalised_name_not_candidate`;
- if an open-class word follows the name ("The Mayflower crew", "The LHC Computing Grid consists …") it may be a part of the being or a verb and the binder has no word list to tell: gap `capitalised_name_open_word`;
- an article alone: gap `article_alone`.
A neuter pronoun inside a cast naming already files `inside_cast_mention` (round 3). So every sentence-initial "The …" target and every neuter pronoun ends as a binding or a gap by construction (unit-tested). No word list is added (G1): the only word classes read are the received closed classes of `priors.js` and `phasepost.js`.

## Sets
| set | role |
|---|---|
| `DEV-SET-5.json` (sha256 `DEV-SET-5.sha256`): 167 cases, 95 attended, 71 traps, 1 out of scope; includes v3's four capitalised cases | DEVELOPMENT; tuned on, includes v0–v3 |
| v4: new articles, new genres, capitalised aliases and part-whole names with capitals, description traps whose head word the topic owns; frozen by the parent | CONFIRMATION, scored once |

Dev numbers (not evidence): round 4 → round 5: silent 4 → **0**; bound 57 → 58; right 54 → 55; precision 0.95; right-bound coverage 0.57 → 0.58; trap wrong 8/71 = 0.11. By meaning (proxy: only bindings whose PRIMARY surface matches the case): precision 0.88, right-bound coverage 0.54.

## Reporting rule (new): every result twice
**As scored** (the registered match rule: a cast surface of the bound being equals an accepted name, or is a whole-word suffix of it or has it as one) **and by meaning**. The raw rows keep the bound being's FULL surface list, `boundRef`, and a `viaAlias` flag (the match came through an alias that is not the being's primary surface). The scorer's summary adds a proxy (`precisionByMeaningProxy`, `coverageRightByMeaningProxy`: only bindings whose primary surface matches); the by-meaning verdict that counts is the parent session's recount from the raw rows. A bound being that only shares a word with the topic's alias (v3's x02) is wrong by meaning. Both numbers are published; the bars are judged on the as-scored figure (so they stay comparable with rounds 3 and 4) and a by-meaning failure is stated as such, not hidden.

## Bars (numbers decided now; the A4 bars, S1 widened)
- **P1 precision** of bound attended cases ≥ 0.80, testable only if at least 8 are bound.
- **P2′ right-bound coverage** = RIGHT-bound attended ÷ ALL attended ≥ 0.45.
- **T1 trap wrong-bind rate** over all traps ≤ 0.20.
- **S1 zero silent outcomes, explicitly including capitalised targets** (an article followed by a capitalised word, an alias, a part-whole name). The dev check shows 0 silent on a set that contains such cases (v3's four, and the rest of the set).
- **K1 shuffled-referent control** (5 seeds 20261103–07) fails P1 on every seed.
- **G1** no word list; **G2** the he/she resolver's files, `corpus-session.js` and `eot-claim-match.js` byte-identical to base `15f82fc`, `priors.js` only gained lines, existing tests pass (the pack-dependent test excepted); **G3** nothing existing imports the binder; **R** rounds 1–4 reproduce exactly with the new option absent.
- **Honest reading, fixed in advance.** Passes only if P1, P2′, T1, S1, K1 and the gates all hold as scored. If the by-meaning recount takes P1 or P2′ under its bar while the as-scored figures hold, the round is reported as passed on the registered rule and failed by meaning; both appear in the result.

## Expected failure modes (stated before release)
- **Capitalised names followed by an open-class word are gaps** ("The Mayflower crew", "The LHC Computing Grid consists …", "The ISS orbits …"): typed, not silent, but not coverage either. A v4 rich in part-whole names with capitals will lose attended coverage here.
- **Aliases the cast merged into another being** (x02's "LHC" → the Grid; "Rosetta Stone" → "Ezana Stone"): bound, scored right, wrong by meaning. The by-meaning figures will be lower than the as-scored ones by about the dev gap (0.95 → 0.88).
- **A description trap whose head word the TOPIC owns** (the new class in v4) is not detected: the bearer test treats the topic as a plausible bearer. This is the most likely wrong-bind kind and the one most likely to push T1 up.
- A person whose weight clears the bearer share can be bound as an owner (no lexicon giver on this machine).
- Pronoun errors from cast splits; truncated names (the reader defect).

## What this can and cannot show
Closure (S1) is by construction and is unit-tested; accuracy is not changed by this round. A pass on v4 would show only that the round-4 accuracy figures transfer once the silence is closed, on a set chosen to be harder on part-whole names and topic-owned description traps. Still `text_evidence`, still unwired, still default off.
