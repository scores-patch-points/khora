# Where we are (2026-11-17)

A mechanical (no model) way to decide when two records are one thing, built and tested in the open: every experiment
preregistered and stamped before it ran, with the failures kept. This file is the map; each section names its record.

## The thread in one paragraph
Identity turned out to be a conjecture that survives attempts to refute it: one witnessed difference proves two things
distinct; agreement only supports sameness, weighed by how rare it is; and where nothing can separate two things the honest
answer is a typed gap. Getting there meant finding that khora's own inducer had a bug real data exposed, that Wikidata states
rules we can read, that rules can also be learned from people's records, that ambiguity under a rule is information, and that
"surprise" is best measured in units of a thing's own spread. The pharos log gained a binary store and a backward reader.

## What is pushed
| repo | at | what |
|---|---|---|
| khora main | 148037f | (1) inducer fix: an untested member is not an agreeing one; (2) `reasoning-lint` reports the identity partition in force per holon; (3) Wikidata property constraints as a given register plus a range step, marked EXPERIMENTAL. All with tests; khora's own identity eval still survives. |
| pharos main | e9f5d4f | (1) binary storage PHB1 (56.7% of JSONL, byte-exact round trip, hash chain, torn-tail and tamper detection, blobs); (2) `askHeads`, a backward reader that stops only on proof. 50/50 tests with the default format. |
Pointers pinned to the old `pharos/lib/pharos.mjs` hash must be re-pinned (khora's door turns itself off and says why).

## Results, in the order they happened (each has PREREG / RESULTS files here)
1. **Identity warrant (shipped-then-falsified).** Three preregistered rounds built a noise-free Fellegi–Sunter/Wald identity
   test. On real Wikidata records it was falsified: 21.4% of people split from themselves, nothing merged, prior estimated 0.19x.
   Cause: khora's inducer bug (above). The module is NOT in khora (it duplicated khora's own identity organs).
2. **Inducer fix.** A fresh 144-person French sample: unfixed 9 true pairs split, fixed 0. Real records rarely state a property
   twice, so induction alone finds almost nothing; this fix removes errors and adds no power.
3. **Stated rules (Wikidata property constraints).** True pairs contradicted 1.4% / 4.9% (bar 5%), distinct pairs excluded
   8.9% / 29.7% (bar 20%, missed on one sample), the range step added under 1% (bar 1%): sound, underpowered, so EXPERIMENTAL.
4. **Omnilingual (31 languages, 3,279 people).** Sound pooled (3.45%, 95% [2.94, 4.02]); powerful in 30/31 languages; power
   tracks how many statements are referenced (Spearman 0.61). One of my power-check mutants was mis-specified and failed its
   bar, so the label stays. 43 of 130 false contradictions are single-best-value misfires (rank unused).
   An independent review session found and corrected four design problems before any result existed (errata 1-3).
5. **Rules learned from people.** From 3,349 people alone, one-valued vs plural relations recovered at AUC 0.905; among people
   holding several values, 83% look like disputes under one-valued relations vs 7% under plural ones (ambiguity is information
   only because there are rules). Each rule carries a learned ambiguity rate (birth date 3.1%, death date 1.3%).
6. **The surprise ladder** (surprise / startle / shock as units of deviation relative to a reference's own spread). Pooled true
   people at surprise 6.86%; distinct separated 66% (stated rules ~35%); startle wrongly split 4 of 3,279, shock 1. Three follow-up
   fixes: dates by closeness helped (5.95%); weighting disagreements backfired (9.36%, the unit collapsed); population surprise
   falsified my own prediction (Swedish was not flagged). Swedish stays anomalous (bulk-imported generic office-holders).
7. **A net-new kind: Open Library books** (no stated rules). 99.8% of distinct works told apart; 17.8% of true pairs wrongly split,
   mostly translations (62% when languages differ) and author-key mismatches. 2 of 3 predictions held.
8. **The curious loop** (predict, encounter, measure surprise against the source's own spread, learn, choose by learning progress).
   v1 was superseded before its real run (it was secretly round-robin; its surprise was context-free; it bypassed the reader's
   codec). v2 runs through khora's own `readFull` into the binary pharos log and the whole run replays from the log with 0
   mismatches, but most hypotheses failed: Zenodotus genre priors are over-representation lists, confounded by size (own genre
   fit best 21% / 12% for two genres), and khora's holograph is a poor open-vocabulary model (held-out loss RISES as it learns),
   so "does it learn" is not yet measurable. Novelty-seeking fixes on one source at 100%, as expected.
9. **Pharos binary, stages 1-2.** Stage 1: one preregistered bar failed and was accepted (a full cold load ~35% slower). Stage 2:
   hot addresses read a median 4.76% of the bytes (bar 5%), cold 44%; one mutant needs a targeted test; the reader trusts the
   chained attestation. Four design changes after smoke runs are logged in PREREG-S2.md.notes.

10. **Answering questions about novels with no model** (identity/novels/, rounds 1-7, NarrativeQA extractive subset, 25+ books read whole through khora's one reader). Best end to end: exact match 0-9%, F1 about 0.05-0.11; intervals include 0. A frame-fold answerer scored 0.000 (round 1); a paraphrase fold built from
    co-occurrence did not help (round 2); the named characters place the answer's sentence in about 1.5% of a book, about 30x chance, and this replicated on three sets of unread books (rounds 3-4); a tracker (presence + speaker) raised the share of clause arguments attached to a character from about 7% to 8-40% but the graph's acts stayed too sparse to answer from (round 4);
    one universal learner found the right evidence to attend on record identity (AUC 0.994) and a direction-only gain on answer choice (round 5); description wormholes were too rare to matter (round 6); the most-mentioned character is a real prior when no character is named (round 7, thin). Several early "leads" vanished on fresh books.
11. **Pheromone to synapse** (identity/synapse/, a sub-agent's preregistered tests). Promoting a trail to a persistent edge by tag-and-capture works (held-out precision 0.79 vs 0.18); the expressway role failed (97% of promoted edges join referents already in one sentence); the induced-kind role is weakly supported and underpowered.

12. **Thoughts and competence** (identity/novels rounds 8-9; now native/organs/thoughts.js, native/docs/THOUGHTS.md). The system writes thoughts about its own earlier records (wormhole, pronoun rule, synapse, expressway) into the pharos and measures the surprise they remove in hindsight and in foresight. Foresight held on every book (8 of 8 unread, 33 of 33 development); random thoughts of the same kind increased surprise; a learned admission policy (a meta-thought) kept the same surprise reduction while admitting 7.5 thoughts instead of 17.5 (precision 0.49 to 0.83 on unread books). The pharos log replays exactly.
13. **Pronoun binding, falsified** (rounds 10-11; native/docs/PRONOUN-BINDING-STATUS.md). "98% of he/she pronouns bound" is coverage: on 48 novels at least 17% are provably wrong, and on UD English GUM documents no dial was tuned on the chosen dials are right 0.55 of the time (0.49 on fiction; 0.36 on the last untouched slice). The control dials bind about half the answerable pronouns at 0.69 precision and are now the canonical read's provisional default (English only; other languages get a typed gap). The preregistered confirmation of that choice did not hold on its own (interval touches 0); the deviation is written down. The binder's confidence (margin) does not separate right from wrong; Mandarin has no cast to bind to and Ancient Greek has no pronoun registry.

## What we learned about learning (a fuller, dated ledger: LEARNING-ABOUT-LEARNING.md)
- Learn distributions, not rules: "birth date is one-valued" is a rate (about 97% single, 3% ambiguous).
- A relative unit needs a reference with spread; a near-zero unit is as bad as zero (it cost us F2 and I did not catch it).
- Real records disagreed with every synthetic world; the real failures (inducer bug, sparse records, Swedish) were all found on real data.
- Predictions on record are what make failures informative; several of mine failed and that was the most useful output.
- Learn leave-one-out (each language or subject judged only on what is learned from the others).
- Hand-set thresholds were removed one at a time: the surprise ladder's levels are units of a reference's own spread.

## Not done
- Pharos Stage 3: attention as an index (trails with seekable positions, evaporation by net saving).
- A rank-aware single-best-value (preferred statements as the best value) and weighing "suggestion" constraints below mandatory ones.
- The Zenodotus rule register (timestamped, ingestable updates, folded at read time; the binary blob store exists now) and a snapshot of it.
- The curious loop's next version: a vocabulary-aware model; a context signal that carries frequencies or is normalised by prior size.
- Pharos `compare` (causal relation, per-event verdicts at a depth, horizon): built and tested in a scratch clone, never committed;
  only `pharos-compare-only.patch` exists (untracked, in the khora checkout root).
- Whether anything in such a system experiences anything is not something these measurements address; what exists is behaviour that
  is curious in a precise, testable sense.

## Caveats that apply across results
Samples are text-sorted id prefixes (item age and import source confound language, ERRATUM-2); Wikidata and Open Library are the
only real sources; truth in split-half tests is "two halves of one item"; every experiment was run by one session, with one independent
review (the omnilingual preregistration).

## Layout
Top-level `*PREREG.md`/`*RESULTS.md` (+ `.sha256`/`.time` stamps) per experiment; `omni/`, `learned/`, `books/`, `novels/`, `synapse/`, `curious/`,
`real-falsify/`, `rules-not-shipped/`, `stoprule*/`, `severity-not-shipped/`, `example/` hold scripts and small results. Raw data
(Wikidata and Open Library snapshots, Zenodotus documents, logs) is not in this commit; the fetch scripts and hashes reproduce it.
Six scripts had machine paths scrubbed before merging; see SCRUB-NOTE.md for what changed and the hash chain.
