# RESULT: the fold's sentence shape, put to a preregistered test (2026-11-27). NEGATIVE on two of three falsifiers.

Split: **exploratory**. 48 sentences (40 English, 8 French) written by one labeller, who is an LLM; gold and scorer hashed before any run (`STAMP.txt`, 2026-11-27T22:39:35Z); one run per arm; no tuning afterwards. Code measured: khora branch `weave-roles-polarity-question` (PR #117), `the-fold/pharos-roles.mjs` `shapeOf`. Files here are as run: `arm-fold.mjs` and `score.mjs` carry the absolute paths of the session that ran them (editing them would break the stamp); `gold.json` was at `gold/gold.json`.

Four fields per sentence (192 judgments): main predicate negated; statement or question; agent (kartṛ); patient (karman).

| arm | correct | wrong | abstain |
|---|---|---|---|
| FOLD | 165 | 19 | 8 |
| POSITION (word-order twin, same parser tags) | 161 | 29 | 2 |
| LLM (smallest model, blind to gold, saw items.json only by its own report) | 189 | 3 | 0 |

By field, correct/wrong/abstain. FOLD: negated 46/2/0, form 40/0/8, agent 39/9/0, patient 40/8/0. POSITION: 44/4/0, 48/0/0, 34/13/1, 35/12/1. LLM: 46/2/0, 48/0/0, 48/0/0, 47/1/0.

## Falsifiers
- **F1 (kāraka adds nothing over word order): NOT triggered.** Roles: fold 79 of 96, position 69 of 96. The whole margin is passives (fold 0 wrong, position 10 wrong). Elsewhere the two are level, and on questions the fold is worse (2 wrong against 0 wrong, 2 abstained).
- **F2 (the fold's wrong count is not lower than the LLM's): TRIGGERED.** 19 against 3.
- **F3 (the fold errs more than it abstains on its misses): TRIGGERED.** 19 wrong, 8 abstained, and all 8 abstentions are the French question form (no adapter). The fold never abstained on a sentence it then got wrong: typed gaps fire for a missing prior or adapter, not for an unreliable parse, so a parser error becomes a confident wrong answer.

## Where the fold was wrong (all 19, by item)
14 and 36 negation missed ("didn't", "dont"); 17, 18 a negation inside another phrase or clause lost the roles; 21 "What did the dog chase?" roles swapped; 24 fronted object; 25, 26 a relative clause lost the main agent; 35 the typo "dgo" kept; 37 get-passive read backwards; 39, 40 ditransitives (recipient taken as patient; passive recipient); 45, 47 French ("voir" as patient; "ce" as agent). Correct on every plain active, passive and imperative.

## What this does and does not show
- Shows: on these sentences the fold's roles beat word order only through passives; the fold is much less accurate than a small LLM; "nominates or abstains" is false for parse errors as built.
- Does NOT show: anything about a real corpus; the LLM's two negation "errors" (15 "Nobody chased the cat", 16 "chased no cat") are arguable gold; the gold shares an origin with the LLM arm and favours it; some fold errors may lie in the extraction rule of the test (a role must attach to the root row) and not in the organs: not separated, because separating after seeing scores is tuning.
- What would overturn the negative: a second labeller's gold, a corpus sample with role gold (a fixed external giver), and a parse-reliability signal that turns these 19 into abstentions without turning the 165 into abstentions. That signal does not exist. Any fix must be tested on FRESH sentences: these 48 are now seen.
