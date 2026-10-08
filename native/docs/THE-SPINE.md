# The spine — khora · janus · penelope, and their objects

**Standing: nomination.** This document names the three bodies of the Fold and the object each owns,
once, so it is not restated three ways and allowed to drift. It is a reading of the code; the code wins
any disagreement with it. Written 2026-10-07. Checked by `native/docs/check-spine.mjs` (citations
resolve; every singular name has one non-shim owner); if the check fails, this document is stale.

This is the *body* spine. The same one act is named three positions by `THE-WHEEL.md` (Void · Beings ·
Fold) and stated as one mechanism by `THE-CORE-MECHANISM.md`; those documents win on the metaphysics.
This one covers **which body owns which object**, and the seam.

## The three-body spine (the cube's three modes)

Stated once in `janus/README.md:8-10`; not re-derived here.

| body | mode | myth | its object |
|---|---|---|---|
| **khora** | Differentiates — cuts apart (reading, ground, measurement) | **Odysseus** — the voyage (`penelope/README.md:494`) | **the holograph** |
| **janus** | Relates — puts beside (what follows from the record) | **Janus** — the logos · the reasoner · the mark (`janus/README.md:1`) | **the hyperlexicon** (the field) |
| **penelope** | Generates — brings into being (artifact, record, mouth) | **Penelope** — the weaver, wove by day, unweaved by night (`penelope/README.md:3`) | **the weave** |

## The objects

- **the holograph — khora's.** The projection that stands in for a reading: the record is the object,
  and what a consumer is handed is a small addressed pattern computed from it (`THE-HOLOGRAPH.md:11`).
  Machinery: `native/organs/output-holograph.js`, `native/the-fold/proposition-holograph.js`,
  `cli/holograph.mjs`. Khora *computes* it; the mouth (penelope) *consumes* it with addresses struck.
- **the hyperlexicon — janus's.** The field: an explicit ledger of relation-composition affordances —
  experience nominates, a named giver licenses (`native/kernel/hyperlexicon.js`, hosted by janus as
  `janus/native/kernel/hyperlexicon.js`). Not a vocabulary. The text face (SVOC + the English verb gate)
  is `native/organs/hyperlexicon.js`; the medium-blind assertion ledger beneath it is `native/kernel/notes.js`.
- **the weave — penelope's.** Generation as a single operation: weave by day (assemble), unweave by
  night (falsify what does not verify). Machinery: `gym/weave.mjs`, `gym/unweave.mjs`, `TAPESTRY.md`.

## The seam: the record — the weft, woven into the cloth

None of the three owns the record. **The record is the seam.** Material crosses between the bodies
"only as addressed record — feed bytes, comp evidence, scars, verdicts — never as assertion"
(`penelope/README.md:512`); "the ledger: his scars are her weft" (`penelope/README.md:505`).

The record's four terms, from the loom (`native/the-fold/weft.js`):

| term | in the myth | in the system |
|---|---|---|
| **the warp** | threads strung first, held under tension | the received structure — priors, grammar, schema |
| **the weft** | the thread carried through, pass by pass | **the log** — the append-only record of reading passes |
| **the cloth** | the fabric | **the holograph** — the projection from the weft |
| the loom | Penelope at work | generation (`penelope`) |

`native/the-fold/weft.js` is the weft as an organ: `appendPass` (immutable, P1), `clothAt` (fold at a
cursor, P3), `reopen` (re-expand a holon address to bytes), `mouthFacing` (strike addresses — the shadow).
Every holon carries a permanent `source#byte` address; the mouth never sees one.

## No duplicate organs (one home per organ)

An organ lives in exactly ONE home; a second location is a **SHIM** that re-exports it, never a copy.
The direction is forced by the import graph: **janus imports khora, and khora imports janus nowhere**, so
khora is the base and owns shared organs; janus references them. (A khora→janus shim would be a cycle.)

Reconciled 2026-10-07: 28 organs that khora and janus both carried — 22 body-identical, 6 differing only
in that janus's copies had their imports repointed to khora — were reduced to one home in khora; janus's
copies became re-export shims (`export * from "../../../khora/native/<path>"`). Verified: all 28 shims
import cleanly; janus's own test passes.

**One declared fork.** `organs/corroboration.js` genuinely differs: janus's injects the witness-read
(`wireWitnessRead`) so the reasoner never reaches into the reader's ledger, while khora binds `native/kernel/notes.js`
directly. The seam requires two forms; it is declared in `check-spine.mjs` with its reason.

`check-spine.mjs` enforces this (exit 1 on any duplicate organ or undeclared fork).

## See also

`THE-WHEEL.md` (the one act, three positions), `THE-CORE-MECHANISM.md` (the one mechanism),
`THE-HOLOGRAPH.md` (the handoff), `THE-ADDRESS.md` (why every part can point at the whole),
`THE-MODULE-CENSUS.md` (module → act).
