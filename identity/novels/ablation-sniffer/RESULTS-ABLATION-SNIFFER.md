# RESULTS — falsifying the ablation sniffer

Preregistered (`PREREG-ABLATION-SNIFFER.md`, sha256 091a7c28…), frozen 2026-11-23T22:39:54Z with `ablation-eval.mjs` (sha256 40cbb76e…), `embed-client.mjs` and `native/adapters/text/ablation-sniffer.mjs`, run **once** per stage (English 22:41 to 22:46, cross-language 22:46 to 23:08). Held out by lemma. No deviation from the freeze. Raw output: `RESULTS-ABLATION-english.json`, `RESULTS-ABLATION-cross.json`.

## Verdict: FALSIFIED at both stages (no prior is wired)

| | Stage 1: English, `nomic-embed-text` | Stage 2: 28 languages, `qwen3-embedding:4b` |
|---|---|---|
| test units | 999 held-out verb occurrences | 826 held-out verb occurrences |
| classes present, chance balanced accuracy | 8, 0.125 | 8, 0.125 |
| **P1 the claim** (negative space of the removed unit × canonical word centroids) | **0.435** | **0.360** |
| shuffled-label null (mean; 97.5th pct) | 0.123; 0.288 | 0.109; 0.168 |
| **H1** beats shuffled labels | **holds** | **holds** |
| P5 control: another word removed | 0.209 | 0.111 (at chance) |
| P1 − P5, paired 95% | +0.226 (−0.055 to +0.360) | +0.249 (+0.156 to +0.334) |
| **H2** it is the unit, not the sentence | **fails** (interval includes 0) | **holds** |
| P4 the bare word alone × canonical word centroids | 0.614 | 0.282 |
| P1 − P4, paired 95% | −0.178 (−0.347 to −0.089) | +0.078 (−0.037 to +0.175) |
| **H3** ablation adds beyond the word | **fails: the word wins** | **fails** (interval includes 0) |

Primary metric is balanced accuracy (a constant guess scores 0.125). The three claims had to hold together; none did at English, two of three at cross-language.

## What the diagnostics add (all descriptive)
- **The nearest-centroid read is badly calibrated on plain accuracy.** English P1: 0.139 plain accuracy against a majority class (INS) that is 63% of the gold verbs; it earns its balanced accuracy by calling many verbs rare classes. The bare word (P4) reaches 0.787 plain. Cross-language: P1 0.180, bare word 0.247.
- **The margin carries no confidence** (the earlier ablation-pressure test failed the same way): English P1 accuracy by margin tercile 0.147, 0.153, 0.117.
- **"Not just one" does not work at the 95th-percentile null bound.** Multi-label read against {operator, alternative}: 93.7% of units claim no cell at all, 0.33 cells per unit on average, any-hit 4.5%, precision 0.139, recall 0.041. The units' negative spaces do not resemble the word centroids enough to clear their own bound.
- **27 cells (operator × grain), 984 referent-labelled English verbs, 22 cells in training:** ablation 0.136 balanced accuracy, bare word 0.393, chance 0.071.
- **Removal beats masking** on the same centroids: P1 0.435 balanced (0.139 plain) against the masked-unit read P6 0.335 (0.086). Delta centroids (P2 0.377, P3 mask 0.364) do no better than word centroids on balanced accuracy but much better on plain accuracy (0.311, 0.427), because they absorb the class prior.
- **Per language (stage 2, 30 occurrences each, standard error about 0.08, so read only the extremes):** ablation beats the bare word in 7 of 28 languages. Worst for ablation: Ancient Greek 0.20 against 0.53, Old Church Slavonic 0.23 against 0.50, Turkish 0.10 against 0.27. Best for ablation: Tamil 0.20 against 0.03, Tagalog 0.25 against 0.06, Coptic 0.17 against 0.07, Persian 0.13 against 0.07. That pattern (ablation helps where the word's own embedding is weak) was seen after the fact and selecting on the weak side invites regression to the mean; it needs its own preregistered test.

## Reading
- **Falsified: the strong form.** The negative space of a removed word does not identify its cell better than the word's own embedding, in English it is much worse, and its per-case confidence and multi-label claims do not work.
- **Survives: the weak form.** The negative space carries a real aggregate signal about the unit (H1 at both stages; in the multilingual model H2 holds too, so it is the unit's effect and not just the sentence's). The preregistered prediction was right on H1 and H3, and wrong on H2 at stage 2.
- **Not tested here:** units other than verbs; phrase and clause units (a larger unit moves the sentence more, so the negative space should be less noisy); a different embedder; fusing the delta with the bare word.
- **Wiring:** none. `stage/ablation-cells-english-nomic.json` is marked "STAGED, not wired" with its verdict; the module `native/adapters/text/ablation-sniffer.mjs` stays untracked and is not used by any reader path.

## Limits
One embedder per stage; the labels are an LLM giver's, at operator grain; stage 2 is small (about 30 per language) and its centroids come from 35 words per operator; a removal changes the sentence's length, which the P5 control matches only roughly; the caches (`cache-nomic.jsonl`, `cache-qwen3.jsonl`) let a re-run skip every model call.
