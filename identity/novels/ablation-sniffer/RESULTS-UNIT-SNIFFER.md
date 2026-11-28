# RESULTS — the bare-unit sniffer (REUSED SPLIT)

Preregistered (`PREREG-UNIT-SNIFFER.md`, sha256 8d43e69d…), frozen 2026-11-24T04:37:41Z with `unit-sniffer-eval.mjs` (sha256 c65a29bc…) and `native/adapters/text/unit-sniffer.mjs` (sha256 9f42ab3e…), run **once** (04:38 to 04:43). Same lemma split, labels, embedder (`qwen3-embedding:4b`) and clause items as the ablation tests, so a reused split; I had seen those results. No deviation from the freeze. Raw output: `RESULTS-UNIT-SNIFFER.json`. The post-hoc section below is exploratory and was written after the verdict.

## Verdict: SUPPORTED (H1, H2 and H3 all hold, operator head, words, leave-family-out)

28 languages, 19 families, 814 held-out verbs (30 per language, held-out lemmas, never in a canon), 9 operator classes, chance balanced accuracy 0.111. Canon: per language at most 2 words per cell and 6 per operator, equal weight per language, built only from languages outside the test language's family.

| head, regime | sniffer | surface baseline | shuffled null (mean; 97.5th pct) | sniffer minus surface (95%) | top-margin tercile minus bottom (95%) |
|---|---|---|---|---|---|
| **operator (9), leave family out** | **0.329** | 0.102 | 0.118; 0.173 | +0.137 to +0.300 | +0.087 to +0.339 |
| operator, leave language out | 0.333 | 0.111 | 0.113; 0.171 | +0.133 to +0.295 | +0.111 to +0.334 |
| 27 cells (25 present), leave family out | 0.202 (chance 0.040) | 0.040 | 0.044; 0.114 | +0.084 to +0.204 | +0.036 to +0.240 |
| 27 cells, leave language out | 0.207 | 0.040 | 0.043; 0.094 | +0.085 to +0.210 | +0.034 to +0.235 |

- **Excluding the whole family costs nothing** (0.329 against 0.333), so it is not relatedness or cognates that carries it, and spelling alone is at chance. The embedding recovers a verb's operator from its meaning across scripts and families.
- **The clause level** (same canon, the 405 clause occurrences from the earlier test): balanced accuracy 0.384 leave-family-out, 0.391 leave-language-out (earlier, with a smaller canon: 0.350).
- **Per family (leave-family-out, 30 to 90 words each, so read only the extremes):** Austronesian 0.54, Austroasiatic 0.52, Japonic 0.49, Hellenic 0.45 at the top; Isolate (Basque) 0.08, Niger-Congo 0.19, Uralic, Turkic, Germanic and Romance 0.22 at the bottom.
- **My prediction** was PROPOSER-ONLY (H3 failing). H1 and H2 held as predicted; H3 held, which I did not expect. The post-hoc check below says the margin result is weaker than its interval suggests.

## What a SUPPORTED verdict does not mean (post-hoc, exploratory)
Re-derived from the cache (0 model calls; it reproduces 814 items, balanced accuracy 0.329).
- **It is a proposer, not a classifier.** Plain accuracy is 0.275; always answering INS (43.4% of the gold verbs) scores 0.434. The sniffer earns its balanced accuracy by spreading its answers over the classes (recall 0.17 to 0.35 for each class).
- **Top-k:** the gold operator is in the 1, 2, 3 nearest centroids 27.5%, 48.3%, 64.1% of the time (with the alternative operator counted: 31.6%, 52.9%, 69.4%), well above chance (11%, 22%, 33%) but **below the class-frequency prior** (always the 1, 2, 3 most frequent classes: 43.4%, 60.6%, 75.4%).
- **The margin's calibration is partly class composition.** Balanced accuracy by margin tercile (0.18, 0.25, 0.42) overstates it: plain accuracy rises only 0.232, 0.288, 0.305, and the predicted INS share falls 0.23, 0.19, 0.11. Within a class, a high margin helped for CON (+0.28), DES (+0.36) and SEG (+0.19) but not for the two largest classes, INS (−0.02) and ALT (−0.08): mean +0.117 over six classes. The margin is a weak, class-dependent confidence, not a calibrated one.
- **"Not just one" through null bounds still fails:** at each cell's 95th-percentile bound, 91.3% of words claim no cell, 0.52 cells per word on average, any-hit 6.6%, precision 0.139, recall 0.062. A ranked top-k read is the usable multi-label form, and it beats chance but not the prior.
- **The labels are an LLM's, assigned through English glosses.** What is recovered is a verb's lexical meaning class; the translation of a held-out verb in a canonical language shares its gloss and so its label. This does not show that grammatical categories (case, tense) sit in the same cells across languages: the earlier PUD test says they do not.

## Staged, not wired
`stage/unit-cells-qwen3-embedding_4b-op.json` and `-cell.json` (the canon over every language, bounds, giver, model, the verdict). Wiring them into the priors home needs the owner's word; the loader is `loadUnitCanon(model, head)` in `unit-sniffer.mjs` and no reader path calls it.

## Limits
Verbs only; the canon is small (2,201 embeddings of words, 28 languages) because the embedder runs at 2.5 embeddings/s here; 30 test words per language, intervals by language clusters; labels through English glosses; one embedder; the families are the study's own labels.
