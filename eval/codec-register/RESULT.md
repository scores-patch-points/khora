# RESULT: the register of a text against measured genre sources (2026-11-28). NEGATIVE: it loses to counting.

Why it was built: the owner's ruling (2026-11-28) that a codec is generated on demand for a text's region, era and register, and the failure recorded in `eval/codec-regions/RESULT.md` (business English cut into English plus Indonesian: a register is not a language root). The first register sources already held are Zenodotus's `GenrePrior@1` (academic, encyclopedic, government-legal, literature). `the-fold/codec-register.mjs` reads a text against such sources with a fitted share and a description-length bar.

## Test (`native/scripts/measure-codec-register.mjs`)
The shipped priors were measured over the whole corpus, so the sources were REBUILT from a training part by GenrePrior@1's own declared test (term of 4+ letters, 4+ occurrences, over-represented by document frequency, G-squared 3.841), and the read scored on one passage from the middle of each HELD-OUT document (every fifth by a hash of its path). Code stamped before the run (`STAMP.txt`); this was the first and only run; raw output in `run-output.txt`. Split: **held-out documents**, exploratory in size. Train documents: literature 37, encyclopedic 46, academic 151, government-legal 291.

| passage | arm | correct | wrong | abstain |
|---|---|---|---|---|
| 300 terms, 124 passages | REGISTER (the module) | 45 | 15 | 64 |
| | COUNT (the source with most hits) | 86 | 38 | 0 |
| | MAJORITY (government-legal) | 67 | 57 | 0 |
| 40 terms, 133 passages | REGISTER | 42 | 13 | 78 |
| | COUNT | 75 | 58 | 0 |
| | MAJORITY | 75 | 58 | 0 |

By genre at 300 terms: academic 38 of 38; encyclopedic 4 of 7; **literature 0 of 12** (all read as encyclopedic); **government-legal 3 of 67, 64 abstentions**.

## Why it fails
The model prices a marked term at 1/T (T = the source's term count) against a nominal 1/N. The rebuilt sources differ twelvefold in size (literature 35,207 terms from 37 long books; government-legal 2,940), so a large source can never be named (T > N) and the comparison between sources is a comparison of their sizes. The fault is the model's, not the sources'.

## What stands
- A register IS readable from these sources by a trivial count (86 of 124 against a majority baseline of 67), so the evidence is there.
- The module abstains where it should on text no source covers (the business line, a plain sentence: hand examples only, not measured).
- Falsifier for a repair: on a FRESH split (these passages are seen), a read using each source's measured hit rate inside and outside its genre must beat COUNT in correct answers without more wrong answers than it has now. GenrePrior@1 does not carry those rates; they would have to be added where the prior is generated (Zenodotus), which this session cannot run (the generator hard-codes the owner's machine path).
- Not wired into anything. No business, chat or era source exists; the business-formal case is not addressed at all.
