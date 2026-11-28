# PREREG — the bare-unit sniffer: does a unit's own embedding, against canonical centroids from other languages, say which cell it acts in? (REUSED SPLIT)

Written 2026-11-24, before the one run. Frozen with `FREEZE-UNIT-SNIFFER.md` (sha256 and UTC of this file, `unit-sniffer-eval.mjs`, `native/adapters/text/unit-sniffer.mjs`, `native/adapters/text/ablation-sniffer.mjs`, `unit-eval.mjs`, `ablation-eval.mjs`, `embed-client.mjs`, and the previous freeze). The thing falsified is the thing built: the experiment imports the module.

## Reused split, and what I already know
Both ablation tests (`RESULTS-ABLATION-SNIFFER.md`, `RESULTS-ABLATION-UNITS.md`) found that the unit's own embedding beat the negative space of removing it; the bare word scored 0.614 balanced accuracy in English and 0.282 across 28 languages, the bare clause 0.350 across 27, against canonical word centroids of 35 words per operator. This test builds on those numbers, so it is not independent of them. Held fixed: the lemma split (sha256 mod 5), the labels, the embedder (`qwen3-embedding:4b`), the clause items (the same 405, cached). New: the canon (a different, equal-weight-per-language word set), a held-out family test, a surface baseline, a calibration check.

## The claim (what the fallback has to earn)
Embed a unit's own text with a frozen multilingual codec, take its cosine against the canonical centroid of each cell (built from other languages' labelled words), and the nearest centroid is the unit's cell; the margin says how much to trust it; a language need not have been seen, nor its family.

## Data and design (declared now)
- **Gold**: `eo-lexical-analysis/data/crossling/<language>/classified.json` (operator and alternative) and `referent_axis.json` (grain), 28 languages, 19 families as the study labels them; English uses its larger `llm_classifications.json` for the operator head. The labels are an LLM giver's, assigned through English glosses, so this tests agreement with that giver.
- **Canon**: per language, train lemmas only (sha256 mod 5 is not 0): up to 2 words per cell (the cell head), topped up to 6 per operator, in hash order. A language's class mean is the mean of its unit vectors; the canon is the equal-weight mean over languages. Operator head: 9 classes; cell head: the 27 operator × grain cells that appear.
- **Test**: per language, the first 30 held-out (test-lemma) verbs in hash order, embedded as bare words. Clause level: the same 405 clause-head occurrences as `RESULTS-ABLATION-UNITS.md`, the bare clause text embedded.
- **Held-out regimes**: **LFO, leave the language's whole family out** (the strict, primary regime: no related language's words in its canon), **LOLO** (only the language itself left out; related languages remain).
- **Arms**: **S1** the sniffer (embedding × canon). **S2** the surface baseline: the word's characters (1 to 4 grams, edge markers, hashed to 2,048 signed buckets) against a canon built the same way from the same words, same exclusions. A constant guess scores 1 over the classes present (balanced accuracy). **Null**: 200 runs with each language's canonical labels dealt out again, centroids rebuilt, the same test items.
- **Statistics**: balanced accuracy; bootstrap over languages (28 clusters, 2,000 resamples, seed 20261123), the conservative cluster because a language's words share its canon.

## Hypotheses and the decision (no hand-set threshold)
All three on the **operator head, LFO, words**:
- **H1**: S1 beats the 97.5th percentile of the shuffled-label null.
- **H2**: S1 beats S2 (paired 95% lower bound above 0): the embedding adds meaning beyond spelling in a family it never saw.
- **H3**: the top-margin tercile beats the bottom tercile on balanced accuracy (95% lower bound above 0): the margin is a usable confidence.
**Verdict: SUPPORTED** iff H1, H2 and H3 hold; **PROPOSER-ONLY** iff H1 and H2 hold and H3 fails (a sniff may propose a cell, flagged uncalibrated, and may never be trusted per case); **FALSIFIED** iff H1 or H2 fails.
Descriptive, no verdict: LOLO; the 27-cell head (same null and baseline); per family and per language; the multi-label read (every cell whose cosine clears its own null bound, the 95th percentile of cosines against words of other classes, against {operator, alternative}); the clause level (the same canon, LFO and LOLO, against the earlier 0.350); the seconds the new embeddings took.
No prior is wired by this run. The canon over every language, both heads, is staged (`stage/unit-cells-qwen3-embedding_4b-{op,cell}.json`) marked not wired; wiring needs a SUPPORTED or PROPOSER-ONLY verdict and the owner's word.

## My prediction, recorded before the run
H1 holds under LOLO and is close under LFO (the family exclusion removes all of Indo-European's 12 languages for its members, leaving the canon to the other 16); I expect LFO balanced accuracy of about 0.25 to 0.30 against a null near 0.12. H2 holds under LFO: spelling should be near chance across scripts (it may carry some signal under LOLO through cognates, which is why LFO is primary). H3 is where I expect it to fail: the margin was flat in both ablation tests and the class prior is lopsided (INS is 63% of English gold), so the likeliest verdict is PROPOSER-ONLY. The 27-cell head should be near chance, with about 2 canonical words per cell per language.

## Known limits, stated now
The labels are an LLM giver's through English glosses, which favours an embedder aligned to English; verbs only (nothing here tests nouns, particles or phrases); the canon is small by necessity (the embedder runs at about 2.5 embeddings/s here), so it is a lower bound on what a canon of the study's 30,000 verbs could do; the surface baseline is character n-grams only (no cognate dictionary); the clause label is the head verb's, declared; 30 words per language.

## Deviations log
(empty; any change after the freeze is written here, never hidden)
