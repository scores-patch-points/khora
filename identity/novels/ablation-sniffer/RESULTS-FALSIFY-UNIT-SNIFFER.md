# RESULTS — the attack on the wired bare-unit sniffer

Preregistered (`PREREG-FALSIFY-UNIT-SNIFFER.md`, sha256 e9143def…), frozen 2026-11-24T05:18:25Z with `falsify-unit-sniffer.mjs` (sha256 e8ef071a…) and the same module, eval files, embedder and canon as `RESULTS-UNIT-SNIFFER.md`, run **once** (05:19 to 05:25, 2,142 new embeddings). Fresh held-out words (positions 30 to 90 of each language's test lemmas in hash order; never scored before), the same labels, the same leave-the-whole-family-out regime, the same operator head. No deviation from the freeze. Raw output: `RESULTS-FALSIFY-UNIT-SNIFFER.json`.

## Verdict: SURVIVES (C1, C2 and C3 all hold)

| attack | what would have killed it | result |
|---|---|---|
| **C1 replication**, 1,433 fresh words, 9 classes | balanced accuracy at or below the shuffled-label null's 97.5th percentile, or not above the spelling baseline | **0.403** (95% 0.308 to 0.468) against null 0.132 (97.5th pct 0.190); spelling baseline 0.118; sniffer minus spelling +0.185 to +0.356. **Holds.** |
| **C2 not a translation lookup**, split by whether any gloss item matches a canonical word of another family | uncovered words at or below their own null | uncovered (787 words): **0.337** (0.259 to 0.450) against null 97.5th pct 0.229. Covered (633 words): 0.422 (0.328 to 0.490) against 0.210. **Holds.** |
| **C3 form invariance**, 385 lemma/inflected-form pairs, 27 languages | agreement no better than independence predicts | lemma and form get the same sniff **57.1%** of the time against 12.2% expected; difference **+0.449** (0.391 to 0.503). **Holds.** |
| C4 margin against character-scrambled non-words (reported, not in the verdict) | interval for the margin's area under the curve not above 0.5 | area **0.585** (0.539 to 0.629); by top cosine 0.546 (0.516 to 0.576). The margin does separate real words from non-words, weakly. |

## Reading
- **The first verdict was not luck of the first 814 words.** The fresh words score higher (0.403 against 0.329); two samples of words from the same languages, with overlapping intervals, so no claim that it improved.
- **It is not only translation lookup.** Words with no gloss shared with another family's canonical word still score 0.337, 80% of the covered words' 0.422. Coverage may add a little (the intervals overlap, so no claim); the rest is generalisation from the embedding. Near-synonyms are not caught by the gloss keys, so "uncovered" is a lower bar than "nothing like it in the canon".
- **It reads meaning, not spelling.** A verb's inflected form gets the same sniff as its lemma more than four times as often as chance, across 27 languages. (The inflected forms scored 0.341 against 0.219 for their lemmas on these 385 pairs: a different, inflecting-verb-heavy subset, so not comparable to the main number, and not a finding.)
- **The margin is a faint signal of "this is a word"** (area 0.585): real words have a slightly larger margin (0.0038 against 0.0027), and the absolute margins are tiny.
- **My predictions** were conservative on every count: balanced accuracy 0.40 against the 0.30 I predicted, uncovered 0.34 against 0.27, agreement 0.57 against 0.35 to 0.50, and the margin's area clearly above 0.5, where I expected it not to be.

## What the attack found that the wired prior should say
- **Junk is pulled toward one class.** The 501 scrambled non-words were assigned ALT (the current cube's DEF) 32% of the time (162 of 501), against about 18% for real words in the first test's predictions. A string with no meaning tends to read as DEF. A high share of DEF answers in some text may therefore be noise.
- **The earlier weaknesses stand** (these attacks do not change them): plain accuracy below always answering INS, top-3 below the class-frequency prior, a class-dependent margin, empty claims by null bound. This is a weak proposer that is not a lookup and not spelling.

## Limits
Same labels (an LLM giver's, through English glosses), same canon, same embedder, and no second multilingual embedder installed: a bias shared by the giver and the embedder cannot be seen here. Fresh words come from the same 25 languages (Tagalog, Tamil, Yoruba have none left). Gloss matching misses near-synonyms. Scrambled non-words can resemble real words in another script. Nothing here changes the wiring.
