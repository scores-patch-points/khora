# Progress log — the reading sidecar and the recursive self-record

Running log for the sidecar / language-leg / relation-binding / self-record workstream (khora native), and our **confidence** in the
quality of each piece. Entries are append-only; a later entry corrects an earlier one rather than overwriting it (the same rule the
record itself obeys). Confidence is declared as: **high** (measured, pre-registered, controls pass, reproducible), **medium**
(measured but data-dependent or trade-offs), **low** (eyeballed or not yet adjudicated), **untested**.

Confidence is about the *machinery being sound and honest*, not about the corpus being right. "X is low confidence" means: we can
say the mechanism did what it said, but we can't yet say the output is true.

## 2026-10-07 — v1 cast-level sidecar + recursion object

### Ear by signal (`the-fold/read-door.mjs`)
- Wired `earSelection: "signal"` (choose the ear by measured signal, memoised + pheromone trails) and `"auto"` (detector → signal
  fallback). Debiased selector (lift, not raw signal) landed from the langid work concurrently and was reconciled; the read keeps
  one detector, preloaded.
- **Confidence: medium.** Evidence: an English text misdetected as `lat` recovered 11x signal via by-ear; the debias test passes;
  but `probe`-only binding is ~0 and cross-Latin English-magnet was real until the lift fix. Eyeballed on samples, not a full gold.

### Language leg (detector + abstention) — merged with the langid agent
- `read-door` now uses the fold detector at document level and per sentence; on **abstention** falls to ear-by-signal; format-guards
  reject codes khora can't declare.
- **Confidence: medium.** The detector is measured 51/51 on prior-bearing UDHR and 20/20 on the app's languages (its own runs);
  abstention works. But it can still confidently misname short English (`Tesla was born in Smiljan.` → `af`), and the UDHR coverage
  tier is deliberately NOT wired for routing (42% wrong). The non-Latin grammars stay a known gap (R/C/J 0).

### Chrome / family genericity (`eval/sidecar/project.mjs`)
- Chrome removed by **corpus/family genericity** (a surface recurring across ≥ chromeDf of a family's documents), not by a
  per-source cleaner. Family df added so cross-category samples see it.
- **Confidence: high at family scale, low at 3/family.** Gitenberg (20 docs): `project gutenberg (19/20)` fired, 0 chrome
  survivors, casts genuinely clean (`Machiavelli, The Prince, Florence, Medici, Lorenzo`). At 3 docs/family it over-removed real
  terms (`discontinuous galerkin`) — threshold and family size are coupled (measured).

### Cast (name-witness) — part of the v1 freeze
- Projection keeps only non-chrome, open-class, **capital-witnessed** surfaces. Cast 1285 → 391 (cross-cat), 304 → 96 (Gitenberg).
- **Confidence: medium.** The name filter is real and reproducible, but **title/heading tokens still pass** (`Crime`, `Darkness`,
  `Heart`) — capitalization is one witness, not a heading detector; that is a named, open defect (eyeballed).

### Relation binding as assertion (`eval/sidecar/bind-relations.mjs`)
- The end→referent binding is an **assertion with standing** (`witness`/`probe`/`ambiguous`/typed `unbound`), never a silent
  join; both-bound relations are written as `EORelationAssertion@1`. Chrome/name gates applied to ends.
- **Confidence: high for the mechanism** (standings, typed gaps, deterministic). **Low for the layer's completeness**: bound share
  is 9.2% (gitenberg) / 13.9% (factbook) / 64% (udhr) before a reader change; most ends are `unbound` because extraction emits
  clause/function-word ends (measured), and `probe`≈0 because there's no coreference/individuation pass (measured). No gold yet;
  the samples mix genuine (`Machiavelli |was born at| Florence`) with noise (`gutenberg ebook |THE| The Prince`).

### The self-record / recursion object (`eval/recursion/self-record.mjs`, `sidecar-record.mjs`)
- The object that makes reading recursive: **append-only log, projection-at-a-cursor, revision-as-append**. Verified on a planted
  demo and wired onto the real sidecar: `project(log, asOf)` folds up to a cursor; append-only `revisions.jsonl` re-keys the past
  without erasing it (P1 past stays at the old cursor, K2 log only grows, K3 no retroactive rewrite).
- **Adopted (2026-10-07):** `project.mjs --as-of` folds the real cast projection at a cursor and consumes the persisted
  `revisions.jsonl`; the identity ops **SYN (merge), SEG/rename and drop** are revisions, applied only at cursors >= their own
  seq. Verified on v1-gitenberg: at cursor 20 `Project Gutenberg EBook` is present; after a `syn` revision it is merged into
  `Project Gutenberg` in the present fold while the past cursor still shows the original — a later-learned identity re-reads the
  past without erasing it, on the built sidecar.
- **Identity lattice adopted (same run):** `referentsAt(log, asOf)` folds the surface→referent lattice — at cursor 20 the five
  gutenberg surfaces are five referents; at cursor 21, SYN merged `project gutenberg ebook` into `project gutenberg` (one
  referent, two members); at cursor 100, SEG re-split it. Same immutable log, three recoverable readings.
- **Kinds adopted (same run):** `kindsAt(log, asOf)` types each referent from the folded lattice — chrome (dropped at ≤ the
  cursor) / name (capital-witnessed) / lexical. The gutenberg referents are all "lexical" at cursor 20 and "chrome" at cursor 21
  after genericity/drops learned otherwise: the KIND of a referent is time-dependent and folds at a cursor, without erasing the
  earlier reading.
- **Evidence gate (the "when there is sufficient evidence" rule) adopted:** revisions are NOMINATIONS — a candidate
  (standing `candidate`, evidence weight below `EVIDENCE_BAR=2`) is recorded in the log but the fold IGNORES it at every cursor;
  when corroborated (evidence ≥ 2) it re-keys the fold from its own seq onward, non-retroactively. Verified: a `seg` candidate
  (evidence 1) hangs — the lattice stays merged at cursor 100; corroborated (evidence 3) it splits at cursor 22.5, while cursor
  21 still shows the merged reading. Cast, identity and kinds all read the same gate (`project.mjs` included), so **everything
  is recursively changeable, only when sufficient evidence clears the bar** — and the on-the-fly folds are recomputed from the
  log, never persisted as truth.
- **K1 — the third term earned by evidence, not imported (eval/recursion/k1.mjs):** a two-term in-place system vs the record
  on the same history. Arm A (dyad) flipped on one weak witness and could not recover the past (past-loss + drift); Arm B
  (record) suspended the weak counter, kept the original at its cursor, and re-keyed the corroborated counter (evidence 3)
  non-retroactively. **Verdict: the record-mediator does work a two-term system cannot — it has a place because it changes
  behavior.** The participatory generating middle is still absent and therefore unclaimed (honesty rule). This is the basis for
  keeping the "third term" at all: evidence, not the philosophy.
- **Kernel organs verified cursor-native (eval/recursion/organ-asof.mjs):** kind-functional-induction's REGISTER and
  identity-exclusion's JUDGE already fold at `asOf`. Verified on planted records: `born` is UNEXPOSED at cursor 1 and FIXED at
  cursor 2 (the standing is time-dependent, both readings recoverable); two people are UNBOUND at cursor 1 (b asserts no birth
  yet) and CONTRADICTED at cursor 2 when b's revised birth arrives — the early cursor still returns UNBOUND. K2 holds:
  an assertional with seq > the cursor is never believed, and a register earned later never licenses an earlier verdict. The
  bridge is passing the record's `asOf` through when the organs are called.
- **The participatory middle built and earned (eval/recursion/middle.mjs):** a distinctioning organ that reconciles an
  arriving witness with the fold at a cursor — mechanical if consistent (reuse, nothing appended), PARTICIPATORY on a
  meaning-gap (it generates the re-key itself, records it with cumulative evidence, and adopts it from its own seq once the
  bar clears; `reopens:true` when it re-opens an inherited/given distinction). K1 control: two contradictory witnesses leave a
  no-middle row's fold unchanged (deaf), while the middle turns corroboration into a re-keyed reading (`rival of Edison` →
  `collaborated with Edison`) on exactly the same arrivals, past preserved at the old cursor. **THE MIDDLE EARNS ITS PLACE by
  evidence** — one witness hangs (pending), two adopt, nothing is unlogged.
- **Confidence: high for the mechanism** (record P1/P2/K1/K2, evidence gate, cursor-native organs, and now the participatory
  generator, all deterministic and K1-falsifiable). **Not yet wired into a running read loop** (the generator must be fed real
  surprises/refutations from actual reads, and attention must decide which arrivals it reconciles) — that is the loop, the
  last mile toward v3. Relations gold and coreference still form a separate v2 track.

### v1 sidecar freeze (`eval/sidecar/v1-{gitenberg,factbook,udhr}/`)
- **Confidence: medium, and only for the English families.** Acceptance met for gitenberg/factbook (clean casts, zero chrome,
  reproducible); UDHR is the stress family and shows where omni stands (detector abstains → by-ear reads thin casts; 7/20 docs
  clear the 2-name bar). Relations are explicitly **not** a v1 layer.

## Overall

| layer | confidence | why |
|---|---|---|
| ear-by-signal + trails | medium | measured, works for Latin/English; size-bias was real, now lift-debiased |
| language leg (detector/abstention) | medium | 51/51 on prior-bearing; still short-input misnames; UDHR tier off |
| chrome genericity | high @ family scale / low @ 3-per-family | Gitenberg clean; over-removal measured at small families |
| cast (name-witness) | medium | cleaner and reproducible; title tokens remain (open defect) |
| relation assertion binding | high (mechanism) / low (completeness) | tape correct; bound share 9–64%, no coref, no gold |
| self-record / recursion | high (mechanism) / untested (adoption) | P1/P2/K1/K2 pass; read path not yet cursor-folding |
| non-Latin / omni | low / untested | R/C/J 0, ar 0/4, hi 1/4 — the open frontier |
| embeddings A/B | untested | harness could not build prototypes (C4 unmeasured) |

**What would raise confidence:** a held-out cast/relation gold (score, not eyeball); coreference/individuation so `probe` moves to
`witness`; entity-bounded extraction so `unbound` drops; adopting `asOf` in the real projections; family-scale chrome runs.

**Severity of open defects:** none are silent — every gap above is typed or disclosed (`unbound_end`, `language_undetected`,
`same_script_switch_unresolved`, chrome over-removal, title-token leak). The machinery is honest even where it is not yet good.

## 2026-10-07 (later) — the self-record promoted from eval to the kernel

- **`native/kernel/self-record.js` (EOSelfRecord@1)** — the object the recursion workstream built now lives in the kernel, not
  only in `eval/`. It carries the immutable claim log (`emptyLog`/`readEntry`/`reviseEntry`/`projectEntries`, P1/P2/P3), the
  evidence gate (`EVIDENCE_BAR`, `adjudicated`), the key/value revision record (`createRecord`/`valueAt`), and the participatory
  middle (`distinguish`). Exported from `kernel/index.js`; tested in `native/tests/self-record.test.js` (9 tests: P1 immutability,
  P2/P3 past-at-cursor, K1 determinism, the gate, and the middle's mechanical → pending → adopted → reopens arc).
- **The evals now import the organ** (house rule: an experiment that holds moves its organ into the khora and keeps only the
  numbers and the falsifier). `eval/recursion/{self-record,k1,middle,sidecar-record}.mjs` dropped their private copies and import
  from `../../kernel/self-record.js`. Verified byte-identical output before/after for self-record, k1, middle, and sidecar-record
  on `v1-gitenberg` (sidecar-record's `P1 FAILS` on that sample is pre-existing — its drop targets are absent from that document's
  cast, not introduced here).
- **Confidence: high for the promotion** (mechanical, deterministic, output-preserving); **the mechanism's own confidence is
  unchanged** from the v1 entry above — **NOT yet wired into a running read loop.** The next mile is the same: feed it real
  arrivals, let attention pick which misfits the middle reconciles, and pass the record's `asOf` through the live projections. The
  claim-log fold (`projectEntries`) and the revision-record fold (`valueAt`) are two views of one principle; folding the sidecar's
  own `project` onto the record is future work.
- Falsifying control: `node --test native/tests/self-record.test.js` — the K1 test fails if a two-term in-place edit could match
  the record's behavior; the gate test fails if a below-bar candidate is ever believed.

## 2026-10-07 (later #2) — relation-end gates (v2 step a): chrome helps, the capital name-gate hurts

- Wired `bind-relations.mjs`'s already-written gate functions into a run (`--chrome-gate` / `--name-gate`), measured
  separately. A0 reproduces exactly with gates off (K1). Full numbers and reasoning: `bind-relations-RESULTS.md` A1.
- **Chrome gate: keep.** Removes boilerplate relation ends (gitenberg 29, factbook 9; inert on udhr) at small cost.
- **Capital name-gate: off.** It rejects genuine names the reader found (`abdelmadjid tebboune`, `bouteflika`, `mundu`) because
  the reader's cast displays are **majority lowercase** (gitenberg 174/314, factbook 302/534, udhr 446/586) — capitalisation is
  the source's witness, not the reader's. Keep it demonstrated, not wired.
- **Confidence: high** for both (projection, pure fold over the frozen raw sidecar, deterministic, reproducible). The result is
  a **negative that costs nothing**: it removes a wrong witness before it was adopted.
- This repoints step (b): the relation-tier name witness must be the **cast's own admission standing**, not display casing;
  and the remaining lever is still the reader (entity-bounded ends + coreference), unchanged.