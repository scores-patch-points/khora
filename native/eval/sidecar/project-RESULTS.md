# sidecar projection — result (the "updates")

Instruments: `eval/sidecar/project.mjs` (new; pre-registration in the file) run over `eval/sidecar/pilot.mjs`'s sidecar, after
`the-fold/read-door.mjs` was changed to expose each referent's `ref` id so relations can be **joined to the cast by id** (not
surface). No new reading beyond the re-run pilot (40 docs, all categories, 4,000 chars). Chrome rule = corpus-genericity
(`organs/martial.js`'s rule): a surface recurring across ≥ `chromeDf` of documents is boilerplate and is projected out.

## What improved

| | before | after |
|---|---|---|
| cast (whole slice) | 1,285 | 391 |
| capital share of cast | 0.304 | (all kept are capital-witnessed) |
| relations (whole slice) | 964 | **132** |
| relations whose ends both bind the cast (by surface) | 0.147 | — |
| documents keeping ≥ 2 names | — | 37/40 |

The two real gains: (1) the **name-witness filter** drops lowercase common nouns (`night`, `luck`, `sea`, `gloom`) — cast
1,285 → 391; (2) **exposing referent ids** and joining relations on `ref` instead of surface raised surviving relations from
**13 → 132** (10×) — most of the loss was the id linkage, not the reader.

## What did NOT improve, and why (honest)

- **Chrome was not projected out.** `chromeExamples` is empty: in a 40-document *cross-category* sample, Project Gutenberg's
  document frequency is ~3/40 = 0.075, far below any sane threshold. **Genericity is a corpus-scale property, not a
  sample-scale one** — per-source-family boilerplate only becomes "recurrent across unrelated documents" once you read many
  documents of that family. So the genericity rule is correct but **cannot fire in a small sample**; the pilot's PASS is
  therefore weak (its chrome clause was vacuous: nothing was marked chrome).
- **The cast still carries chrome and title tokens.** `Project Gutenberg`, `Project Gutenberg EBook` (uncaugh chrome), and
  title words that are capitalised but are not referents: `Crime`, `Punishment`, `Darkness`, `Heart`. Capitalisation is a name
  witness, but a heading/title is not a referent — a heading/`<h1>`/title furniture filter (P5.3's move, applied to plain-text
  titles) or a stronger witness (holographic effect) is needed.
- **Relations mostly still drop.** 132 survive of 964: **86%** of relations have a participant that is a phrase or function
  word, not a referent — `Character encoding: ASCII :: set`, `He is | for his contributions… :: known`. The reader's relations
  are clause-shaped, and their ends are not resolved to the cast; the projection cannot fix that, the **reader** must resolve
  relation ends to referents.

## Verdict

The updates are real but modest: **the cast is much cleaner, the id-linkage recovers 10× the relations, and the genericity
rule works in principle** — but the layer is still not clean (chrome and titles in the cast, 86% of relations unbound), and two
of its three pass clauses are either vacuous (chrome) or sample-limited. The pilot's "PASSING" should be read with that caveat.

## Update: family-scale genericity (chrome actually projected out)

Genericity was measured corpus-wide only, where a 40-doc sample can't see per-source boilerplate. It is now measured **within
the source family** (category/directory) as well.

- **Gitenberg alone, 20 docs:** chrome fires cleanly — `project gutenberg (19/20)`, `gutenberg ebook (19/20)`,
  `project gutenberg ebook (16/20)`; after projection `chromeSurvivors = 0`, cast 304 → 96, and the casts are genuinely
  good: `Nicolo Machiavelli, The Prince, Florence, Marriott, Medici, Lorenzo`; `Charles Dickens, Pip, Pirrip`;
  `Alexander Hamilton, James Madison, John Jay`; `Thomas Paine`. **This is the demonstration that "who cares about chrome"
  is right once genericity sees it.**
- **Cross-category 40 docs, family df:** cast 1,285 → 228 (vs 391 corpus-df-only), relations 126, docs ≥2 names 32/40;
  Gutenberg chrome removed via the literature family (`3/3`).
- **Caveat (measured):** with only **3 docs per family**, family df is jumpy — it flagged genuine academic terms as chrome
  (`discontinuous galerkin`, `radau collocation`). **Family-genericity needs enough documents per family** (dozens, as
  Gitenberg had) to be reliable; at three it over-removes. Threshold and family size are coupled.

## Next (in order)

1. **Run the sidecar at family scale** (dozens of documents per source) so genericity can actually mark chrome.
2. **Resolve relation ends to referents in the reader** (participants carry `ref`, not surface phrases) — the single biggest
   lever for relation quality.
3. **Title/heading furniture filter** on the cast, or a stronger witness than capitalization (holographic effect) so headings
   and titles are not admitted as beings.

Reproduce: `node eval/sidecar/pilot.mjs --docs 40 --per-cat 3 --chars 4000 --out eval/sidecar/pilot-results-ref`
then `node eval/sidecar/project.mjs --in eval/sidecar/pilot-results-ref/sidecar.jsonl --out eval/sidecar/projected-ref`.
