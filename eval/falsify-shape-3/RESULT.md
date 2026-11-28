# RESULT 3: filling the missing English tokenizer prior, HELD-OUT A/B (2026-11-27). The no-regression gate PASSED.

Split: **held-out**. 64 English sentences and gold written by a separate agent that read no file; half with a contraction, possessive or dotted abbreviation ("contracted"), half without ("plain"). Code frozen at khora e29920f, stamp 2026-11-27T23:07:07Z, one run per arm, the same code with one switch (`KHORA_UD_TOKENS=prior`). 256 judgments. Both labellers are LLMs; small.

| arm | correct | wrong | abstain |
|---|---|---|---|
| PRIOR tokens, no abstention (V1) | 222 | 34 | 0 |
| ADAPTER tokens, no abstention (V1) | 234 | 22 | 0 |
| PRIOR tokens, with parse-consistency (V2) | 192 | 15 | 49 |
| **ADAPTER tokens, with parse-consistency (V2), the default now** | **229** | **15** | **12** |

- **Gate (declared before the run): ADAPTER wrong <= PRIOR wrong and ADAPTER correct >= PRIOR correct, overall and on the plain half. PASSED:** wrong 15 = 15, correct 229 >= 192; the plain half is identical (119 correct, 3 wrong, 6 abstain under both).
- On the contracted half: V2 correct 73 -> 110, abstain 43 -> 6, wrong 12 = 12. Before the change the consistency check was abstaining on most contracted sentences (rightly: the parser had been handed unsplit tokens); now they are read.
- Negation (V1): wrong 11 -> 2.

## What changed and why it was missed
`the-fold/pharos-reading.mjs grammarFor` loaded `ud-tokenizer-<code>.json.gz` when present and passed `null` otherwise, silently. 78 languages have that prior; English does not. The English parser prior was trained on UD English-EWT tokens (did + n't, dog + 's, "U.S." whole), so every contraction, possessive and dotted abbreviation reached it in a form it had never seen. The grammar now carries the typed gap `tokenizer_absent`, and for English the adapter's own tokenizer (`adapters/text/english-parser.js tokenize`, which makes those cuts) fills it and is named in the gap.

## Prior art found and NOT adopted here (DEV numbers on the 100 seen English sentences, 300 fields; not results)
- `adapters/text/grammar-en.js rowsOf` (the English grammar adapter: the same parser with the UniMorph lexicon it was trained with, verb and relative-clause repairs): 259 correct against 256 with the adapter tokenizer alone; with abstention 242 correct / 20 wrong / 38 abstain against 237 / 16 / 47. More right AND more wrong: mixed, so not switched; it deserves its own held-out run.
- The second English parser (`english-parser.js`, parser-eng-ewt): 237 correct, worse alone. Agreement of the two parsers as a reliability signal: 12% wrong when they agree, 35% when they differ; weaker than parse-consistency (9% against 50% on held-out set 2).
- `ud-parser.js analyseK` (k-best): its own best beam parse of "The dog chased the cat." is wrong; the file already records that beam decoding lowered a meaning check. Not a signal.
- `readingRows(..., { predicate: true })` (predicate repair): no change on these sentences.
- Not tried: typo recovery (`form-recovery.js`, `row-recovery.js`, `sound-match.js`), `janus/priors/contractions-eng.json` for apostrophe-less "dont", the janus clitic rules (Penelope's to define), building a real `ud-tokenizer-eng` prior from the treebank (needs the treebank on disk; no corpus was downloaded).

## Still true
The 15 wrong answers that remain pass with no warning, and a small language model was wrong 4 times in 288 on set 2 against the fold's 16. This closes one cause; it does not close the gap.
