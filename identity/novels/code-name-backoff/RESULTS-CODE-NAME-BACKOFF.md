# RESULTS — a meaning back-off for unseen name heads (REUSED SPLIT)

Preregistered (`PREREG-CODE-NAME-BACKOFF.md`, sha256 f7694689…), frozen 2026-11-24T06:19:17Z with `backoff-test.mjs` (sha256 f871e8bd…), run **once** (06:20 to 07:01; 4,096 head words embedded with `qwen3-embedding:4b` in 608 s). Joint work with the code generation session; its `eval/code-roles` data was read, nothing there was changed or imported. The reproduction gate passed first: all four of its published baseline AUCs were reproduced to 1e-9. **Reused split**: its fresh split was spent. Raw output: `RESULTS-CODE-NAME-BACKOFF.json`.

## Verdicts (the rule, declared before the run)
| arm | writes | returnsBool |
|---|---|---|
| **B1, the wired sniffer's operator class** (primary) | **NOT SUPPORTED** | **NOT SUPPORTED** |
| **B2, embedding neighbours of the head word** (secondary) | **PARTIAL: JavaScript only** | **PARTIAL: JavaScript only** |
| B3, verb-or-noun flag (control, no embedding) | Python supported; JavaScript not | not supported in either |

An arm counts only if its gain over the baseline beats the 97.5th percentile of its random-classes or random-neighbours null **and** it beats the verb-or-noun control by bootstrap over files.

## The numbers: AUC on the uncovered fresh units (heads with fewer than 5 dev units); gain over the baseline in brackets, 95% interval by file
| language, target (uncovered units, positives) | baseline | B3 flag | B1 sniffer class | B2 neighbours | overall fresh AUC: baseline to B2 |
|---|---|---|---|---|---|
| Python writes (3,002; 335) | 0.504 | **0.594** (+0.090, +0.054 to +0.123) | 0.584 (+0.080; not above the flag: −0.010) | 0.531 (+0.027, −0.002 to +0.055; not above null) | 0.568 to 0.580 |
| Python returnsBool (3,002; 101) | 0.572 | 0.601 (+0.030, −0.035 to +0.106) | 0.535 (−0.037) | 0.602 (+0.030, −0.026 to +0.086) | 0.766 to 0.777 |
| JavaScript writes (3,049; 641) | 0.563 | 0.536 (−0.027) | 0.537 (−0.026) | **0.593** (+0.030, +0.007 to +0.053; null 97.5th pct 0.023; above the flag by +0.057, +0.024 to +0.091) | 0.653 to 0.661 |
| JavaScript returnsBool (3,049; 109) | 0.552 | 0.573 (+0.021) | 0.609 (+0.056, −0.009 to +0.125; not above null) | **0.649** (+0.096, +0.056 to +0.138; null 97.5th pct 0.055; above the flag by +0.075, +0.013 to +0.137) | 0.832 to 0.846 |

## Reading
- **What worked.** For JavaScript, the neighbours of a head word in the embedding space predict what an unseen head's units do better than the global rate (writes 0.563 to 0.593; returnsBool 0.552 to 0.649) and better than a verb-or-noun flag. Replacing the prior for uncovered heads lifts the whole fresh set a little: writes +0.008, returnsBool +0.014 (covered heads are unchanged by construction).
- **What did not.** The wired sniffer's nine operator classes add nothing beyond the verb-or-noun flag in either language: coarsening a word's meaning to one of nine classes throws away what the neighbours keep. That is the same lesson as the ablation tests: the unit's own embedding carries the signal; the label sorted from it carries less.
- **Python is different.** There the plain verb-or-noun flag lifts the AUC on uncovered units for writes (0.504 to 0.594), and the embedding arms do not beat it; Python has only 51 dev heads with five or more units and 717 anchors, against 579 and 2,778 for JavaScript. A flag-plus-neighbours arm was not tested.
- **The baseline on uncovered units is near chance** (0.50 to 0.57): the name alone says almost nothing for a head the dev table has not seen, which is where the back-off has room.
- **My predictions:** B1 no better than the flag (held), B2 best and best for returnsBool and for JavaScript (held), the flag helps a little (held for Python writes only), Python uncertain (B2 failed there).

## What it means for the code work, and what it does not
- A general capacity: **back off from an unseen name head to what the word means**, learned from the dev table's own rates, no hand-written list. It is small (the overall AUC rises by 0.01) and it is a prior for a bridge that is itself modest; it is not a way to find or build code. The bottleneck the code agent measured (finding or composing the function) is untouched.
- Reused split; 4 tests per secondary arm, of which 2 passed (the primary arm passed none); syntactic writes only; English head names; the embedder read the head word alone; one machine's code; JavaScript dev code all from one folder, so the JavaScript result is "this codebase's names predict n8n's dependencies' effects", which is itself a cross-codebase transfer.
- Reusable pieces, in `backoff-test.mjs` (untouched by anyone else): `neighbourWeights`, `neighbourPriors`, `classPriors`. Adopting them is the code agent's call.
