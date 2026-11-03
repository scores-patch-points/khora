# ROUND 2 — trap handling for the attention binder: pre-registration, written and hashed before the fresh set is released

Date: 2026-11-03. Same branch and PR as round 1 (`attention-binder`, khora#95). Round-1 files (`PREREG-ATTENTION.md` and `-A1`, `RESULT-ATTENTION.md`, their hashes, `GOLD-*RAW.txt`, `score.mjs`, `DEV-SET.json`) are untouched. Round-1's gold set (PARA-GOLD v0 b01–b15) is now SPENT: used here for diagnosis and as development material.

## Why (round 1, published)
P3 failed (b09 bound to the Eiffel Tower); b15 "The river" bound to "Middle Tennessee" with margin 1.0 because it was alone; 4 of 6 trap cases bound wrong. A wrong binding is worse than a gap.

## What was diagnosed
- **b15.** The cast has no "Cumberland River" being at all. "river" reached "Middle Tennessee" only through its alias "Tennessee River", which is named in the TAIL of b15's own sentence; round 1 registered a sentence's namings before deciding its targets, so the target read evidence from its own future. Alone in its pool, the being had margin 1.0.
- **b09.** The previous sentence ("These objections were an expression of…") began with a demonstrative noun phrase, not "The <word>", so the centre veto saw nothing; the tower led by margin 0.53.
- Event or entity anaphora in general ("It was removed…" after a sentence about a restaurant) has an antecedent that is not in the cast.

## The changes (all optional arguments of `bindAttended`; absent = the round-1 call, byte for byte: the round-1 gold scorer re-run on this code reproduces `GOLD-RAW.txt` exactly)
1. **`causalWords`**: a target sees only what sentences BEFORE its own named (surface words, noun-phrase words, mention counts). Fixes the leak.
2. **`minWordShare` (the lone-candidate rule).** Alone in its pool, a being has margin 1 by construction, which is no confidence. A description now binds only if the word is characteristic of the being's own naming: the share of its mentions read so far whose bytes or enclosing noun phrase carried the word (1 when the text predicated the word of it with a copula, its kind). Declared 0.25. Judged against the being itself, not against a competitor. (Dev: no measured effect at any threshold; see DEV-RESULT-2.md.)
3. **`carryVeto` (event and entity anaphora).** A pronoun binds to the attended being only if the previous sentence named it or bound a target to it. Otherwise `center_not_carried`: the pronoun most likely continues something the previous sentence introduced or a whole clause, neither of which is in the cast. Costs coverage on purpose.
4. **`demonstrativeSubject`.** A previous sentence opened by a demonstrative or indefinite noun phrase ("These objections…") is about its own noun unless the cast gave exactly one candidate that word: the centre veto then fires.
5. **`expletiveVeto`.** "it" followed within two tokens by a copula or auxiliary, and in the same clause (up to a comma or full stop) by the complementizer "that" ("It is said that…", "It was in 1889 that…"), files `expletive_or_cleft`. The words read are the received `COPULA_FORMS` and `AUXILIARY_VERBS`; "that" is the one literal (the closed-class complementizer). Extraposition with "to" or "for" ("It took nine years to…") is NOT detected by this rule; `carryVeto` catches some of those by accident.
Declared round-2 values (`score2.mjs::DECLARED`): round-1 dials unchanged plus `minWordShare` 0.25, `carryVeto`, `expletiveVeto`, `demonstrativeSubject`, `causalWords` all on.

## Sets
| set | role |
|---|---|
| `DEV-SET-2.json` (sha256 in `DEV-SET-2.sha256`): 61 cases = 24 round-1 dev + 15 spent PARA-GOLD v0 + 22 new hand-labelled (37 attended, 23 traps: entity 13, event 2, competing 2, expletive 6, 1 out of scope) | DEVELOPMENT |
| FRESH: about 30 cases from five new Wikipedia articles, hand-labelled by the parent session (not blind), about 16 attended + about 14 traps of four kinds, hashed by the parent before release | CONFIRMATION, scored once |

Expected file format of the fresh set (the scorer's loader): `{ cases: [{ id, doc, start, end, text, surface, nth?, tokenStart?, kind: "attended"|"elsewhere"|"out_of_scope", trapKind?, accept: [names] }] }` with byte offsets into `<dir>/text/<doc>.txt`; the token is `tokenStart` if given, else the `nth` (default 0) whole-word occurrence of `surface` inside the span. Command: `node eval/attention/score2.mjs --file <cases.json> --dir <dir>`; `--controls` for K1.

## Terms
Match rule as round 1: a bound referent is right iff one of its cast surfaces equals an accepted name or is a whole-word suffix of it or has it as one (prefix does not count). A trap case is any `elsewhere` case; ANY binding on it is wrong, a typed gap is right. Bound = a binding at the token's address.

## Bars (numbers decided now)
- **P1 precision** of bound attended cases ≥ 0.80 (untestable if fewer than 5 are bound).
- **P2 coverage** of attended cases ≥ 0.50.
- **T1 trap wrong-bind rate** over all trap cases ≤ 0.20 (with 14 traps: at most 2 wrong; 3 fails). Reported also per kind, no separate bar.
- **K1 shuffled-referent control** (5 seeds 20261103–07) fails P1 on every seed.
- **G1** no word list in `attention-binder.js` (`gates.mjs`; the one literal comparison, "that", is a single closed-class word, not a list). **G2** the he/she resolver's files, `corpus-session.js` and `eot-claim-match.js` byte-identical to base `15f82fc`; existing tests pass (the one pack-dependent test excepted); **G3** nothing existing imports the binder. **R1** the round-1 scorer on this code reproduces `GOLD-RAW.txt` (done: identical).
- **R2 honest reading**: if P1 and P2 hold but T1 fails, round 2 failed; coverage bought by binding traps is not a result.

## What this can and cannot show
~30 cases, one labeller (the parent), not blind. Dev numbers are optimistic (tuned on; includes spent gold; precision 25/25, coverage 0.68, trap wrong 3/23). Not run under the lexicon giver's ruling (the Wiktionary pack is absent), so a person such as Laboulaye may still be a candidate for "it" (n11 shows it). Expletive "to"/"for" extraposition and weather "it" are not detected. `minWordShare` is untested by dev. Still not wired anywhere and still default off.
