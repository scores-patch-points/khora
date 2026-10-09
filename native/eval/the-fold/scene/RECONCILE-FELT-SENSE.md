# Reconcile: two khora perceptions by ablation (2026-10-08)

Two opencode sessions built, at the same time, the same doctrine by two different ablations. This note holds
them apart so they compose instead of duplicating. Both are **khora** (perception), **rebuilt at read time**,
never precomputed; both keep the **anchors/laws in janus** and the **manifold in khora**.

## The two

| | `eval/the-fold/scene/sensefield.mjs` (this session) | `adapters/text/felt-sense.js` (sibling session) |
|---|---|---|
| name | **the field of meaning by ablation** | **the felt sense** |
| ablation | subtract the corpus-wide background: `PPMI = log2( c(w,n)·N / (c(w)·c(n) ) )` — "the observed co-occurrence minus the corpus-wide expectation IS the positive space after ablating the negative" | delete the word from its sentence: the reader's span-delta signature (`impact.mjs::impactOfToken`), i.e. what the reading loses with the word gone |
| unit | word in a window of raw text | word in its sentence (one ablation per word, words never split) |
| output | an unknown word resolved to the **anchored** (dictionary- or kind-headed) word whose PPMI vector it abuts, gated by POS agreement | one **axis per part of speech** from the deltas; each word's projection = how verby / nouny it reads here |
| answers | "what does this unknown word mean, near the anchors?" | "how does this word feel here, as a gradient?" |
| the giver (janus) | the dictionary heads + the induced being-kinds | the POS prior (names the poles only) |

## Why they are not duplicates, and how they join
- `sensefield` ablates the **negative space** (the background the word is *not*) — the user's "use embedding to
  ablate the negative space." `felt-sense` ablates the **word itself** — the user's "the sentence with and without
  the word." Different ablations, different questions, one doctrine.
- They are complementary by construction: `sensefield` fixes the field's **anchors** (what there is to mean, and
  where an unseen word lands); `felt-sense` reads a **known** word's perturbation of the reader. An unknown word
  resolves in the field, then can be felt in the reader.
- The anchors already meet: `sensefield`'s `kinds` anchors are the same company-induced being-kinds that
  `eval/law/felt-cross-reference.mjs` cross-references against the felt axes (felt ↔ POS(gold) NMI 0.766;
  felt ↔ KIND 0.354, p=0.005; KIND ↔ POS 0.385, p=0.005). So the two perceptions land on the same manifold.

## Rules so they stay reconciled
1. Neither rebuilds the other's mechanism. `felt-sense` does not rebuild a PPMI field; `sensefield` does not
   measure the reader delta. If `felt-sense` needs the field, it **consumes** `makeSenseField`'s `vectorOf` /
   `nearestAnchored`; if the field needs a felt value, it consumes `feltSense`.
2. Both keep the doctrine header ("KHORA'S, NOT JANUS'S… rebuilt at read time") and both keep anchors in janus.
3. Both are perceptions, so **neither is a law**: no law doc, no janus side. The pole names (POS) and the
   dictionary/kind heads are the givers.

## Placement (open item)
`sensefield.mjs` lives under `eval/the-fold/scene/` (a draft eval tier); `felt-sense.js` lives under
`adapters/text/` (production perception tier). If both are to be production, they belong together — either both
under `adapters/text/` (the reader tier) or both behind the same perception seam. Recommend: move `sensefield`'s
core (the PPMI field builder) to `adapters/text/` and leave the Greek scene driver in eval.
