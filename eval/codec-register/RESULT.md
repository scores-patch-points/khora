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

---
# RUN 2 (2026-11-28): the repair, on a FRESH part. The gate PASSED. A new row; run 1 above stands as recorded.

`native/scripts/measure-codec-register-rates.mjs`. Every document falls in one of five parts by a hash of its path: parts 3 and 4 choose each source's terms; part 2 measures each source's hit rates (documents the terms were not chosen on, each document one vote); part 0 is the passages run 1 saw (DEV); part 1 is FRESH. Gate declared before the run (`STAMP-run2.txt`): PATTERN more correct than COUNT and no more wrong. One run; raw output in `run2-output.txt`.

Two reads were built on DEV:
- `registerByRates`: each source alone against the rest, by its measured hit rates inside and outside its genre.
- `registerByPattern`: each held register is a hypothesis about the hits of ALL sources; named when it beats the runner-up by more than log2(G) bits.

**A register source is scoped by language.** Found on DEV: the "literature" shelf holds Don Quixote in Spanish, Les Miserables in French, the Iliad in Greek, the Aeneid in Latin, and the government-legal shelf is mostly treaties in Arabic, Spanish, Russian and other languages (348 of its 400 documents are not English by `codec-regions`). Pooled, a "register" was partly a language. So every document's main root is read by `codec-regions` and only English documents are used. **Run 1's government-legal figures were therefore mostly detecting non-English text, not a register.**

| FRESH passages | arm | correct | wrong | abstain |
|---|---|---|---|---|
| 300 terms, 65 passages (literature 9, encyclopedic 14, academic 41, government-legal 1) | **PATTERN** | **62** | **3** | 0 |
| | RATES | 57 | 0 | 8 |
| | V1 (the size-priced read of run 1) | 48 | 5 | 12 |
| | COUNT | 18 | 47 | 0 |
| | MAJORITY (academic) | 41 | 24 | 0 |
| 40 terms, 67 passages | PATTERN | 58 | 5 | 4 |
| | RATES | 51 | 3 | 13 |
| | COUNT | 23 | 44 | 0 |
| | MAJORITY | 42 | 25 | 0 |

- Gate: PATTERN 62 > COUNT 18 correct, 3 <= 47 wrong. **Passed.** RATES was never wrong at 300 terms and abstained on 8.
- DEV (part 0, after the language scope): PATTERN 50 correct / 4 wrong / 1 abstain of 55; RATES 47 / 1 / 7.

## What this does and does not show
- Shows: with sources scoped to one language and carrying measured hit rates, three registers (literature, encyclopedic, academic) are told apart on unseen documents far better than counting or the majority.
- Small: 65 passages, 41 of them academic; the majority baseline is already 41. English government-legal has 9 documents in all (1 fresh passage, wrong).
- `registerByPattern` has no hypothesis for a register NO source measures: it names the nearest. `registerByRates` abstains there (hand examples only). The business-formal register is still not addressed: no source exists.
- Not wired: the shipped GenrePrior@1 files carry no hit rates and are not scoped by language (their generator hard-codes the owner's machine path and was not run). Wiring needs those two things added where the prior is made.
- "Literature" is still a shelf, not a register: the Federalist Papers, the Origin of Species and Leviathan sit in it.
