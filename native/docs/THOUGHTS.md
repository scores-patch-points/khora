# Thoughts and competence

**Standing: EXPERIMENTAL.** Evidence is in `identity/novels/` (rounds 8-11: `NOVELS-RESULTS-ROUND8.md`, `-ROUND9.md`, `-ROUND10.md`) and the dated ledger `identity/LEARNING-ABOUT-LEARNING.md`. Both win any disagreement with this document.

## What it is
A **thought** is an entry the system writes about its own earlier records: a wormhole (a description such as "the girl" is one referent), a rule that generates links (every he/she is its presence-bound referent), a synapse or an expressway (when one referent is present another is expected). Each cites the places it is about (byte ranges of the source, pinned by sha256). Thoughts may cite thoughts: a **meta-thought** cites the thoughts it was learned from and records which kinds paid.

**Competence** of a thought is the surprise it removes. *Hindsight*: had it been known from the start, the first two thirds of the stream are less surprising, net of the thought's own cost. *Foresight*: the last third, which it was never fitted to, is less surprising. Hindsight is the proposal; foresight is the test. A thought whose foresight is negative is retracted by a later entry; nothing is deleted.

## Pipeline (one text)
1. Read through the one reader (`native/the-fold/read-process.mjs::readToWeft`).
2. Attach every clause argument to a cast referent (`native/adapters/text/clause-attach.js`: overlap, pronoun by the presence rung, speaker for "I").
3. Build the stream and assess thoughts (`native/organs/thoughts.js`: `streamOf`, `assessThoughts`).
4. Record into the pharos with `recordThoughts`; rebuild from the log with `replayThoughts` (must match exactly). The meta policy: `learnMeta`, `metaAdmits`, `recordMeta`, `replayMeta`.
Command line: `node cli/thoughts.mjs --text book.txt [--weft w.json] [--pharos pointer.json --log name --dir dir]`. The learner is `native/kernel/attend.js` (no task code in it).

## What was measured, and what it does not show
- Foresight held on every book tried (rounds 8-9: 8 of 8 unread test books, 33 of 33 development books; 8-11% of last-third surprise removed, 25-30% with the pronoun rule on). Random thoughts of the same number and kind made things worse. A learned admission policy kept the same surprise reduction while admitting 7.5 thoughts instead of 17.5 (precision 0.49 to 0.83 on eight unread books).
- **The pronoun rule gives most of the saving and part of that is circular**: a pronoun bound to the most-present referent is cheap to code by construction. Binding is not correctness: on unseen English the presence rung is right 49-70% of the time depending on its dials and genre (`NOVELS-RESULTS-ROUND10.md`).
- Foresight here is later text of the same book. Transfer of thoughts across books is not shown.
- All constants are declared in `THOUGHT_CONSTANTS` and are not tuned.
