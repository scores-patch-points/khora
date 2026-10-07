# kind induction across the ethos corpus — result

Instrument: `eval/identity/corpus-kinds.mjs` (new file, 2026-10-07; pre-registration in the file). Entities = the recurring figures
the prior-free reader hears; relations = its gfp relations (`eval/law/impact.mjs` readWindow, R-C); kind induction =
`induceKindsAndFunctions` (inducer method). Corpus: `/Users/mlacy/Documents/3.0/ethos`, sampled across **all 16 categories**.

## The claim is falsified, on two independent counts

**Sample:** 62 files, 13,702 sentences, **42,750 relations**, **9,713 referents** across all categories.

**1. It does not scale — the inducer is O(n²) in entities.** `kernel/entity-kind-induction.js::affinityField` builds a pair-affinity
Map over every entity pair; at n ≈ 4,096 it exceeds V8's Map limit and throws `RangeError: Map maximum size exceeded` (the first
run crashed). The sample already yields 9,713 referents; the full corpus yields orders of magnitude more. So "kind induction
across our entire corpus" is **impossible as built** — not slow, impossible. (Reported as the wall; the run then capped to the
top 1,500 referents by degree to get any reading at all.)

**2. At the scale it can run, the kinds are meaningless.** On the tractable population the inducer returns **one kind** — a single
basin of **1,269 members** whose defining relation is **","** (a comma), over a **closed-class** label. Its member sample is
numeric/format tokens (`000`, `01T00`, `0700`, `100`, `1800`), not people, places or organisations; capitalised-proper share is
**0.15**. Verdict: **FALSIFIED** (every induced kind is a closed-class bucket). The reason is upstream of the inducer: the
relations the reader extracts from prose are function words and punctuation (`,`, `of`, `is`, `and`), so induction over "who
shares a comma" cannot recover a semantic kind.

## What this means

- "Kind induction across our entire corpus" needs two things that do not exist yet: (a) an inducer that **scales** — sparse or
  approximate over pairs, not a dense O(n²) affinity map — and (b) **relations that carry meaning**, not the reader's
  function-word/punctuation connectors.
- (b) is the same gap the whole identity thread keeps hitting: the raw reader gives *structure* (who sits near whom), not
  *meaning*. Kind induction over structure without meaning yields one punctuation blob, not the kinds one might need.
- On planted data with clean, semantic relations the chain works (see `exclusion-falsify-RESULTS.md`). On the real corpus, with
  the reader's own relations, it does not — and the first wall is memory, not semantics.

## Scope

Sample of the corpus (all categories, ~2 MB of text), not the full 570 MB; the scaling wall conclusion holds a fortiori for the
full corpus, and the "meaningless kinds" conclusion is what the reader's relations yield at any scale it can run.

Reproduce: `node eval/identity/corpus-kinds.mjs` (add `--json`; `--per-cat`, `--cap`, `--max-entities` to change the sample).
