# RESULT 2: parse-consistency on HELD-OUT sentences (2026-11-27). The fix works as a signal; the fold is still wrong more often than a small model.

Split: **held-out** for `adapters/text/parse-consistency.mjs` (built on the 48 seen sentences of `eval/falsify-shape`). 72 sentences (60 English, 12 French) and their gold written by a separate agent on a different model that read no file; the fix's author did not read them before the run. Code frozen at khora 47253dd; stamp 2026-11-27T22:47:48Z (`STAMP.txt`); one run per arm. Both labellers are LLMs and the set is small: exploratory in size. Files are as run (absolute paths of the session; `gold.json` was at `gold/gold.json`).

288 judgments (negated, form, agent, patient):

| arm | correct | wrong | abstain |
|---|---|---|---|
| FOLD-V1 (no consistency) | 239 | 37 | 12 |
| FOLD-V2 (abstains where the sentence is flagged) | 218 | 16 | 54 |
| POSITION (word-order twin) | 218 | 64 | 6 |
| LLM (smallest model, blind by its own report) | 284 | 4 | 0 |

By field, correct/wrong/abstain. V1: negated 64/8/0, form 59/1/12, agent 63/9/0, patient 53/19/0. V2: 59/3/10, 59/1/12, 53/3/16, 47/9/16. POSITION: 60/12/0, 72/0/0, 49/20/3, 37/32/3. LLM: 68/4/0, 72/0/0, 72/0/0, 72/0/0.

## Falsifiers
- **G1 (V2 not wrong less often than V1): NOT triggered.** 16 against 37.
- **G2 (the flag is noise): NOT triggered.** Of V1's answers on negated, agent and patient, 21 of 42 are wrong inside flagged scope (50%) and 15 of 174 outside it (9%). 16 of 72 sentences were flagged (clausal_participant 6, root_not_predicate 5, unattested_closed_class 5, karman_contested 1, duplicate_kartr 1).
- **G3 (V2 still wrong more often than the LLM): TRIGGERED.** 16 against 4.
- **G4 (cost):** V2 abstains on 21 fields V1 had right.

## What is still wrong after the fix (all 16)
Patient taken from the wrong word in an unflagged parse (102 "overnight", 137, 150 "unattended", 143, 166 null); typos kept as written (146 "tomatoe", 153 "lawnmover"); negation missed with no fingerprint (121, 152, 155); roles lost or swapped (136, 156, 159); one statement read as a question (142). These leave no structural trace the five checks can see.

## Reading
- On held-out sentences the fold now abstains on most of what it gets wrong for structural reasons, and the flag carries information (50% against 9% error).
- It remains far less accurate than a small model, and 15 wrong answers still pass with no warning: abstention narrows the gap in wrong answers (37 -> 16 against 4), it does not close it, and it costs coverage (239 -> 218 correct).
- The LLM's 4 errors are all negation items 118 to 121; whether a negative subject or object negates the main predicate is a gold convention, the same dispute as items 15 and 16 of the first set.
- Roles again beat word order (V1 116 of 144 role fields against 86).
- Not measured: a corpus, a human labeller, other languages, whether an unsplit contraction is better REPAIRED (the clitic rules are Penelope's to define on the log) than flagged.
