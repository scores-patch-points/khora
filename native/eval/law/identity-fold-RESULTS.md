# identity-as-fold — test on CorefUD (result)

Instrument: `eval/law/identity-fold.mjs` (new file, 2026-10-07; pre-registration header sha256 `da996962d5559c20…`).
The user's binding refinement R2 operationalised: a pair of mention forms is the same referent iff exchanging their
occurrences leaves the slot structure (the real, prior-free `eval/law/impact.mjs` readers R-A/R-B/R-C) unchanged within
slot-graph band `w=1` — "no difference that makes a difference within w". Fold distance = L1 of the typed slot-delta signature
at the slots the two forms fill. Gold: CorefUD chains via the built D15 adapter (`eval/law/corpus.mjs`), split **dev** =
bucket 4 of the TRAIN file; **the CorefUD dev/test file was never opened**.

## Headline: the pre-registered test FAILS, and the raw fold is *anti*-predictive

Held-out pairs per treebank (balanced pos/neg, sampled): fold AUC is **below chance** in all three, while company beats it.

| treebank | pairs (fold/gap) | pos/neg | docs | **fold** | foldRef | string | span | company | lemma | doc-boot 95% CI | pass |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CorefUD_Catalan-AnCora | 245 / 55 | 127/118 | 134 | **0.449** | 0.449 | 0.500 | 0.492 | 0.543 | 0.524 | [0.375, 0.526] | false |
| CorefUD_English-GUM | 261 / 39 | 137/124 | 43 | **0.350** | 0.354 | 0.500 | 0.738 | 0.787 | 0.511 | [0.282, 0.424] | false |
| CorefUD_English-LitBank | 280 / 20 | 144/136 | 17 | **0.380** | 0.379 | 0.500 | 0.730 | 0.632 | 0.507 | [0.301, 0.457] | false |

Controls K1 (sham exchange changes no relation slot, L1 = 0) and K2 (determinism) hold on all three. `string` and `lemma`
are at chance (0.50) — as designed: the pairs are dominated by cross-surface pairs (name→pronoun, name→nominal), which the
string/lemma rules cannot link. `company` (shared sentence context) is the strongest rival (0.54–0.79). `fold` is worse than
chance: same-referent pairs perturb the slot structure *more* than unrelated pairs.

## Root cause (post-hoc, labelled): the raw fold L1 is a centrality proxy

Added after the pre-registered run was read; it changes no pre-registered verdict. `fold L1` correlates with the pair's total
occurrence count (Spearman ρ): Catalan 0.768, GUM 0.740, LitBank 0.758. Same-referent pairs are simply more frequent
(mean occurrences pos vs neg — GUM 7.28 vs 3.85; LitBank 9.15 vs 4.21), so exchanging them reshuffles more edges.

Stratifying by centrality quartile removes the artifact and leaves at most a weak positive signal:

| treebank | fold AUC stratified by centrality | company AUC |
|---|---|---|
| Catalan-AnCora | 0.537 | 0.544 |
| English-GUM | 0.582 | 0.787 |
| English-LitBank | 0.534 | 0.632 |

So: (1) the raw identity-as-fold distance, built from the global typed-slot-delta L1, measures how *salient* the two forms are,
not whether they co-refer; (2) even centrality-matched, it sits at 0.53–0.58, far below the pre-registered bar (0.70) and the
required +0.10 over `company`. The premise as operationalised is not supported. **A difference of use is not a difference of
referent, and here it is not even a difference of identity** — the anti-signal is a frequency effect.

## What this does and does not say

- It does **not** falsify the note's *design* (fold at a point from a perspective, truncated at a measured `w`); it falsifies
  this first operationalisation: a symmetric global exchange whose signature is summed over all slots the forms fill.
- The two deviations from a faithful reading, both stated in the header: the prior-free readers have no perspective `p` (the
  window itself is used as the standpoint), and `w` is the fixed band 1 rather than a per-pair measured `dmdWindow`.
- `company` clears the same bar only in GUM (0.787); it is the rival to beat next, not the fold.

## Amendment A — the HOLOGRAPH arm (added after v1 was read; the correction)

v1 scored only the slot skeleton. The instrument of "impact on the holograph" is `impact.mjs`'s **atmosphere**
(`memory/activation.js::readForward`): the six record observables — activation, recalled, novelty, reach, codeSize, traceSize —
read over the window before and after the substitution. Amendment A adds that to the same exchange and pairs (header sha `c843dcb1…`).

| treebank | pairs | **fold** (slot) | **holo** (holograph) | holoSlot | string | span | company | lemma | pass | passHolo |
|---|---|---|---|---|---|---|---|---|---|---|
| Catalan-AnCora | 245 | 0.449 | **0.480** | 0.441 | 0.500 | 0.492 | 0.543 | 0.524 | false | false |
| English-GUM | 261 | 0.350 | **0.519** | 0.427 | 0.500 | 0.738 | 0.787 | 0.511 | false | false |
| English-LitBank | 280 | 0.380 | **0.478** | 0.419 | 0.500 | 0.730 | 0.632 | 0.507 | false | false |

K1 now checks the holograph too: the sham exchange changes the atmosphere by exactly 0, and K2 still holds. So the corrected
instrument runs and is sound — but the answer barely moves: including the record's activation state lifts the fold from
*anti*-predictive (0.35–0.45) to **chance** (0.48–0.52), still nowhere near the 0.70 bar and still beaten by a dumb company
overlap (0.54–0.79). Reading the whole holograph does not, on its own, turn a frequency effect into an identity signal.

## Amendment B — the horizon bound to DMD (measured `w*`, not declared)

Amendment A measured the *holograph* but still declared the horizon (`W = 1`). Amendment B measures it: for each pair, the
slot-delta records carry a graph radius, and `kernel/activation.js::dmdWindow` finds the shallowest radius at which dropping
everything beyond it changes nothing (the conclusion = the family×type count vector). That is the note's "truncated at the
horizon w where widening stops making a difference." Header sha `c3b9a1a2…`.

| treebank | pairs | fold | holo | **foldDmd** | measured `w*` (median) | company | passDmd |
|---|---|---|---|---|---|---|---|
| Catalan-AnCora | 245 | 0.449 | 0.480 | **0.435** | **0** | 0.543 | false |
| English-GUM | 261 | 0.350 | 0.519 | **0.359** | **0** | 0.787 | false |
| English-LitBank | 280 | 0.380 | 0.478 | **0.367** | **0** | 0.632 | false |

The DMD does its job — it measures a horizon rather than taking a declared one — and the answer is that the horizon is
**zero**: the substantive difference the substitution makes is entirely at radius 0, the token's own slot; widening through the
graph changes no conclusion. So a measured horizon does not improve the score at all (still 0.36–0.44, still below chance,
still far below the 0.70 bar and below a company overlap). Binding by DMD is now done, honestly, and it confirms the v1
diagnosis rather than fixing it: substitution impact is *local and salience-driven*, not an identity signal.

Two DMD facts worth keeping: (1) `dmdWindow` returns `window` on the radius axis only because its `restrict` was injected as a
radius filter — the default axis is recency (it was "built on" time); a production identity rung should state which axis it
measures on. (2) `kernel/activation.js` ends with a rule this test respects: "identity is not this module's business… only how
*present* it is right now fades" — so DMD buys the horizon and the presence weighting, never the identity verdict itself.

## Next (not run here)

1. Re-operationalise "fold survives substitution" **locally**: compare the reachable slot subgraph at A's slot with B placed
   there (a structural isomorphism of the two local folds), instead of a global exchange L1 — and normalise by centrality by
   construction (a per-slot rate, not a count).
2. Make the real arm a **centrality-matched** statistic from the start (match positives and negatives on occurrence/slot
   counts), so the frequency effect cannot be read as identity evidence.
3. Measure `w` per pair with `kernel/activation.js::dmdWindow` (the note's "truncated where widening stops making a
   difference") rather than fixing band 1.
4. Only then re-pre-register and judge on a fresh draw; CorefUD dev here is spent.

Runtime: 3 treebanks in 29 s. Reproduce: `node eval/law/identity-fold.mjs run --tbs English-GUM,English-LitBank,Catalan-AnCora`.
