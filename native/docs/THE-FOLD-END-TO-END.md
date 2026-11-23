# The Fold — end to end

What the system is, what is already built, and everything it still needs, in one document.

## The system

A mechanical reader-and-answerer over the **kāraka holograph**: every mention is read to a referent
(a thing in a DAG of roles — agent, patient, locus, …), every turn declares a **void** (the shape of
what is needed), deliberates through a **thought** (the middle ground), and **releases** it as a
sentence. Nothing is a "most likely continuation"; everything is **tension → release** over structure.

The substrate is the **kāraka DAG**, which is modality-invariant: text, image, audio, video, code,
notation and math all read into the same roles, so the void and the reasoning are the same regardless
of the medium. The record is **pharos**: every step is a mark in one of nine operators
(`NUL · SIG · INS · SEG · CON · SYN · DEF · EVA · REC`) × three grains (Ground/Figure/Pattern), causally
`of`-linked, so a future system reads the same record and behaves the same.

The three tension layers, one per domain:
- **Existence** (count) — *which thing?* (identity, reference, definition, kind)
- **Structure** (relation) — *which relation?* (relational, copular, topic)
- **Significance** (sign) — *which judgment?* (polar, meta)

## The loop

```
read (any modality → EOT / kāraka DAG)
  → void  (DEF:  gap + held + shape + register + modality, over the EOT, at one of the 3 layers)
  → thought (INS: the plan + the derivation trace + the research trail — the middle ground)
  → narrow  (EVA: the DMD contention over the coherence thread, with a grounded null)
  → release (REC: fold → surface, reformatted, gated by reverse-parse)
```

## Built (native/demo/ + native/adapters/text/)

- **Read**: the parser → rows with kārakas; loose-span tolerance (`form-recovery` Damerau + jumble,
  `sound-match` homophone, `span-resolver` kāraka slot); `row-recovery` wires it into the read.
- **Void**: `wh-narrow` (WH → kāraka → kind), `gap-fill` (DMD over the fold), and the routing tree
  (`fold-store.ask`) for identity / reference / definitional / kind / time / location / self /
  relational / copular / polar / topic / meta / current.
- **Reference layer**: `kind-hierarchy.js` — Wikidata `entityInfo`, `personOf` (instance-of-human),
  `kindChain` (P279 direct hypernyms); the full-name mention (Donald Trump, not "trump"); admit only
  genuine beings; titles are a time-dependent gap, never a random human.
- **Knowledge**: hyperlexicon (`names`, and `relations` syn/derived/hyper/hypo/mero/holo on disk),
  kaikki definitions, pos/pronunciation priors, the clock (time) and timezone (location).
- **Thought**: the derivation trace (tension → candidates → prior → rule → release) with the research
  trail (the Wikidata candidates searched), woven `INS·Figure` of the void.
- **Coherence**: `coherence.js` — shared-referent connected components; the identity assertions
  ("you are an AI") cohere into their own thread, distinct from the world-facts. Tested.
- **Generation**: `voice.mjs` — fold → surface (kāraka order), `reformat` (join contractions, no
  ransom-note fragments).
- **Record**: `record.mjs` — all nine operators written to pharos with the causal `of`-chain.

Live at `http://localhost:4860` (`native/demo/server.mjs`). Committed to `scores-patch-points/khora`
main (cdbec62, 7c894c3).

## Needed, end to end

### 1. Reference layer — the two-layer resolution (the "Genoa" case)
Resolve a mention to **both** layers and link them, not choose one:
- the **local referent** (the cast, the fold's roles + provenance),
- the **global entity** (Wikidata kind + description).
Answer the *holographic identity*: "Genoa — in this text, a character (agent of 'estate', 3 mentions);
in the world, a city in Liguria." `folded-card.js` already renders the local side; extend it to carry
the global entity beside it. **Also**: the hyperlexicon `relations` (syn/derived) are on disk but not
wired — that is the mechanical synonymy that makes paraphrase and the fold fold `captured ≈ took`.

### 2. Coreference (the attention layer)
`he`/`she`/`it` → the salient referent by gender/number/recency (not the hand-written "last subject").
The reference resolution must **admit** what it resolves (done), and the pronoun register /
`attention-binder.js` must do the general resolution. This is what makes "what did he do" follow
"who is Tolstoy".

### 3. Time-dependent knowledge (reality through code)
The clock and timezone are done. Add the **current officeholder** giver ("who is the president" →
the holder of the office now, via Wikidata `P1308`/`P35` with time). Then "the president" is answered,
not gaped.

### 4. The entity fallback
When the fold has no relation but the referent has a description ("what did he do" → "he was a Russian
author"), fall back to the entity's description. The person description is already admitted to the
fold (`describe`); the relational handler just needs to use it on a no-triple.

### 5. Generation — the full realization (not a ransom note)
- **Imperative detection**: "write/tell/make X" → a generation void, not a read.
- **Structure shapes**: story, poem, list, letter — the answer is a *sequence* of realized relations.
- **Register**: "make it funny" — a surface constraint carried beside the kārakas, applied by the
  **Pathos archons** (`organs/output-voice.js`: Eastwood=lean, Kubrick=precise, Strunk & White=plain,
  Terry Gross=oral). Content and surface are two layers; the void must name both.
- **Recursive void**: a generation void can contain a nested relational void ("write a story about
  who gave the book to Sita" → fill the inner hole, then wrap it in the outer structure).
- **The gate**: reverse-parse each realization; it must fold back to the same void (`sameOrOther`).

### 6. Omnimodal EOT-native front-ends
The void detector must read the **EOT arcs**, not the text parser (`rowsOf`). `reading-one.mjs`
already routes `.png/.mp4/.mp3/.abc` by extension; the missing piece is that each modality's reader
produces the same kāraka EOT, and `ask`/`narrow`/`release` operate on that, never back on a surface.
`native/adapters/math/` exists and should be wired in the same way (`math.js` like in the foldcode
branch).

### 7. The instruction/context document
A loaded, **visible** instruction set (the identity assertions = the persona, the declared rules =
the void shapes, the operators, the coherence) — the analogue of a system prompt, shown in the UI so
we can see what the system is drawing from. The identity thread is already surfaced; the rules side
is a static declared text.

## The order

1. Reference: two-layer resolution + hyperlexicon `relations` (synonymy).
2. Coreference (pronoun register).
3. Time-dependent knowledge (current officeholder).
4. Entity fallback.
5. Generation (imperative, structure, register, recursive void, gate).
6. Omnimodal EOT-native front-ends (math, image, audio, video).
7. The visible instruction/context document.

Each of 1–4 is a contained fix; 5 is the large generation build; 6–7 are the substrate/context
completions.
