# v1 — cast-level sidecar (frozen 2026-10-07)

Scope: the FIRST sidecar layer — name-bearing referents per document, ear chosen by detector-with-abstention then ear-by-signal,
chrome projected out by family genericity, append-only JSONL. No relations as a v1 layer (recorded raw only).

## The language leg (reconciled)

`the-fold/read-door.mjs` was merged across the concurrent langid work: the fold detector (`identify`, preloaded once) drives
per-sentence language **trails** and the document language; on **abstention** the **ear-by-signal** selector (debiased by lift,
not raw signal) reads; `earSelection:"auto"` is the wiring. The concurrent per-sentence trail + debiased-selector edits were
kept; my detector loader, auto branch and format guards were folded in. `read-door.test.mjs`: **10 pass / 0 fail / 2 todo**
(the two todos are the known non-Latin gaps, Russian/Chinese/Japanese and Arabic).

## The three families (20 docs each, `--ear auto`, then projection)

| family | reads | language source | cast in → projected | relations (raw → gated) | docs ≥2 names | chrome (family genericity) |
|---|---|---|---|---|---|---|
| gitenberg | 20 | 20/20 detected (eng, confident) | 304 → 96 | 325 → 12 | 20/20 | fired (gutenberg, ebook 19/20) → 0 survivors |
| world-factbook | 20 | 20/20 detected (eng) | 533 → 151 | 453 → 53 | 20/20 | fired (factbook boilerplate) → 0 survivors |
| un-udhr | 20 | 12 detected / **8 abstained → by-ear** | 584 → 30 | 200 → 94 | 7/20 | fired (shared UDHR furniture) |

Gitenberg projected casts are the acceptance specimen: `Nicolo Machiavelli, The Prince, Florence, Marriott, Medici, Lorenzo`,
`Charles Dickens, Pip, Pirrip`, `Alexander Hamilton, James Madison, John Jay`. Chrome = 0 survivors; name-witness rule keeps
only open-class, capital-witnessed surfaces.

## Honest gaps

- **Relations are not a v1 layer**: 12–94 gate-kept out of 325–453 because the reader's relation ends are surface phrases, not
  referent ids. That is Track A of v2 (bind relation ends to referents), not something the projection can fix.
- **UDHR is the stress family**: non-Latin and many languages with no khora grammar → detector abstains (a feature), the
  by-ear fallback reads whatever gets a signal, and casts are small (7/20 docs clear the 2-name bar). This is the honest
  measure of where omni stands: it does not.
- **Chrome is sample-relative**: family genericity needs dozens of docs per source to be reliable; at 20/family it behaved, at
  3/family it over-removes.

## Freeze

- Sidecars: `eval/sidecar/v1-{gitenberg,factbook,udhr}/sidecar.jsonl`
- Projections: `eval/sidecar/v1-{gitenberg,factbook,udhr}-projected/{projected.jsonl,summary.json}`
- Repro: `node eval/sidecar/pilot.mjs --dir <family> --docs 20 --chars 3000 --out <out> --ear auto` then
  `node eval/sidecar/project.mjs --in <out>/sidecar.jsonl --out <projected>`.

v1 acceptance: cast clean (names only), zero chrome survivors, ears honest (detector→signal fallback), reproduces. Met for the
English families; UDHR demonstrates the abstention + fallback path working as designed.