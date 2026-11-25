# PREREG — try to break the wired bare-unit sniffer

Written 2026-11-24, before the one run. Frozen with `FREEZE-FALSIFY-UNIT-SNIFFER.md` (sha256 and UTC of this file, `falsify-unit-sniffer.mjs`, the files it imports, and the previous freeze). The thing attacked is the thing wired: the canon is the one built for `RESULTS-UNIT-SNIFFER.md`, the same cached embeddings, the same leave-family-out regime, the same operator head.

## Why attack it
It is the only claim that has survived a test (SUPPORTED, balanced accuracy 0.329 against a null of 0.173), and it is wired as a proposer. A claim that has only ever been tested once, on words I had already looked at, with labels that come from English glosses, has not earned trust. My post-hoc look already found weak points (plain accuracy below always answering INS, top-3 below the class-frequency prior, a margin that helped some classes and not others). These four attacks go at what could make the verdict simply wrong.

## The claim being attacked
"From a verb's own embedding, in a language family the canon never saw, the nearest canonical operator centroid recovers the verb's operator class from its meaning, better than spelling, and the margin tells you something."

## Data (declared now)
- **Fresh words.** For each language, the held-out lemmas (sha256 mod 5 is 0) in hash order, positions 30 to 90. The first 30 were the first test's words; these have never been scored. About 1,420 words in 25 languages (Tagalog, Tamil, Yoruba have too few verbs left).
- Everything else as in `RESULTS-UNIT-SNIFFER.md`: `qwen3-embedding:4b`, the 2,201 canonical train words (same selection, same cache), canon equal weight per language, leave-the-whole-family-out, nine operator classes, labels an LLM giver's through English glosses.

## The four attacks and what kills the claim

**C1, replication.** On the fresh words: balanced accuracy of the sniffer (S1) above the 97.5th percentile of a 200-run shuffled-label null **and** S1 above the character-spelling baseline S2 (paired, bootstrap over the 28 languages, 95% lower bound above 0). *Killed if either fails: the first verdict was luck of the 814 words.*

**C2, not a translation lookup.** The labels come from English glosses, so a held-out verb often has a translation in the canon that carries the same label, and a multilingual embedder would match them without recovering anything general. A fresh word is **covered** if any gloss item of it (comma and semicolon separated, "to " dropped; an English verb is its own item) equals a gloss item of a canonical word of another family; otherwise **uncovered** (the coverage is generous: about 45% of fresh words are covered). *Killed if the balanced accuracy on the uncovered words does not exceed the 97.5th percentile of the shuffled-label null computed on that same subset: then the sniffer is a lookup against a small labelled multilingual lexicon, not a recovery of meaning class.* Near-synonyms (kill and murder) are not caught by the gloss keys, so "uncovered" is a lower bar than "nothing like it in the canon".

**C3, form invariance.** A verb and its inflected form mean the same; a sniffer reading meaning should put them in the same place. For up to 15 held-out lemmas per language (one inflected surface form each, from the UD files beside the labels, form different from lemma), compare the sniff of the lemma and of the form. *Killed if the agreement of the two sniffs does not exceed the agreement that independence predicts from their class marginals (observed minus expected, 95% lower bound above 0 by language bootstrap): then it is reading spelling.*

**C4, does the margin track anything real.** For 20 fresh words per language, make a character-scrambled non-word (the same characters shuffled; for words under three characters, characters drawn from the language's own verb inventory). Compare real words with their non-words by margin (best minus second-best cosine) and by top cosine, as the area under the curve (0.5 is no difference). *Reported with a stated reading: if the lower end of the bootstrap interval for the margin's area is not above 0.5, the margin carries no information about whether a string is a word, which strengthens the caveat already on the wired prior.* C4 does not enter the verdict.

## Verdict (no hand-set threshold)
**SURVIVES** iff C1, C2 and C3 all hold; otherwise **BROKEN**, naming the failed attacks (C1 did not replicate; C2 reduces to translation lookup; C3 sensitive to inflection). If BROKEN, I will say so, propose a stronger caveat on the wired prior and offer to unwire it (the two `rm` commands in `WIRED.md`); changing the wiring needs the owner's word.

## My prediction, recorded before the run
C1 holds, balanced accuracy near 0.30 against a null near 0.17. C2 holds but weaker: I expect the covered words to score clearly higher (about 0.40) than the uncovered (about 0.27), still above the uncovered null (about 0.18), which would say part of the signal is lexical coverage and part is generalisation. C3 holds modestly (agreement 0.35 to 0.5 against 0.13 expected). C4 is my least certain call: I expect the area under the curve for the margin to be near 0.5 to 0.6, not clearly above 0.5, because the first test already showed the margins are tiny and class-dependent.

## Known limits, stated now
Same labels, canon and embedder, so no independent label source and no second embedder (only one multilingual embedder is installed): a bias shared by the giver and the embedder cannot be seen here. Fresh words come from the same 25 languages. Gloss matching misses near-synonyms. UD inflected forms are the ones the treebanks contain. A scrambled non-word can accidentally resemble a real word in another script. The test shows the claim survives or breaks on these four attacks, not that it is right.

## Deviations log
(empty; any change after the freeze is written here, never hidden)
