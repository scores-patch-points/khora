# LADDER RESULTS (IDENTITY-LADDER-PREREG.md, stamped 2026-11-17T06:33:02Z, sha256 cc27d700…; ladder.py 7d98375f…)

Rules and ambiguity learned from people only (each language judged with what was learned from the others); levels are
units of deviation, each relative to its own reference (1.4826 x MAD). Same 31 languages and halves as the stated-rules
run (the Python split reproduces the JavaScript split statement for statement; checked on Japanese, 1,940 of 1,940).

| verdict | true people at or above (pooled unique, 3,279) | distinct pairs at or above (median over languages) |
|---|---|---|
| stated Wikidata rules (OMNI) | 3.45% [2.94, 4.02] | ~35% |
| learned SURPRISE | 6.86% [6.15, 7.63] | 66.2%; learned >= stated in 29/31 languages |
| learned STARTLE | 4 people (0.12%) | 19.9% |
| learned SHOCK | 1 person | 7.9% |

Controls: M0 no agreements: 8.23% true at surprise. M3 no superposition: 7.99%. M2 learned from the test language
itself (leak): 6.19%, power 74.5%. Agreements and superposition each make the verdict sounder.

## Readings
- SURPRISE is "probably two people": twice the stated rules' power at twice their false-split rate.
- STARTLE is "two people": 4 of 3,279 real people, against 113 under stated rules, with a fifth of distinct pairs.
- Learned rules do not depend on references: Bangla 5.0% (stated) -> 66.2%.
- Swedish is anomalous: 27/120 people at SURPRISE against themselves, power 29.6% (stated 69.0%). Not explained here;
  the ERRATUM-2 confound (text-sorted id samples, bulk imports) is the first suspect.
- Levels are units, so their rates are set by shape, not by a chosen cut: about a fifth of surprising stranger pairs
  are startling, and a similar share of those are shocking.
