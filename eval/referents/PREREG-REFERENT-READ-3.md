# PREREG-REFERENT-READ-3 — the clean confirmation: the 65 documents set aside by seed 20261140, read for NAMES ONLY, once

Registered 2026-10-27 by `referent-read`, before any of these documents is read by the reader or the ledger. It amends nothing in `PREREG-REFERENT-READ.md` or `-2.md` (their sha256 `ed931efb…` and `40172c11…`
stand). Its hash and timestamp are beside it (`.sha256`, `.time`) and in the log entry that freezes the commit.

## Why a third confirmation, and by whose leave

The first confirmation (slice E, 6 documents) and the second (slice F, 90 documents, first read) were red as registered; the module and the harness were then changed after seeing them, so the ledger now
agrees with the plain index on every name number on A, E and F but no clean confirmation of this commit exists (see `PREREG-REFERENT-READ-2.md` and the log entries `referent-read-7` to `-9`). I asked the coordinating
session whether I might read the 65 documents the pronoun golden set aside; it answered on the user's behalf under the standing delegation (2026-10-27, provisional): yes, for NAMES ONLY, once, under a new
registration written and hashed first, with these conditions, which are this file's: (1) register first; (2) both arms scored over the same universe, asserted by a fixture; (3) no change to the module or the harness after reading them, and the result stands
whichever way it falls; (4) the PR says which documents were read.

## Data

Slice **G**: the 65 documents of `aside` in `/Users/mlacy/Downloads/workspace/reading-rules-audit/gum-slices.json` (sha256 `e6b1e72f253122968d8d0c19b8a994cc36a79b7c04c19536e9c96f76a6ec4e92`, key `aside`), which the harness rebuilds from the golden's own construction
(seed 20261140 over the documents of at least 20 sentences outside A, B, C) and asserts equal to that file's list and disjoint from A, B, C, D. UD_English-GUM train, sha256 `88c410ca6a51ccc79f9536d75feb1633421691165cd191f8137f8b37569a0329`.
Disclosure of what these documents already carried: they were set aside by claude-ring's person-typer experiment as training documents and never scored on names; the cast work drew 30 of them (E, seed 20261150) and scored the cast-admission question on it once;
claude-ring-8 reserved 30 others (P, seed 20261160) for an oracle pilot that has not run; 5 are in neither. Names-only clustering is a different question from each of those. I read all 65, for this one question, one time, and tune nothing on them.

## Measure, bars and controls (unchanged from the first registration, now on G)

Gold names, the evaluation set, labels (largest overlap; ties to the earlier-starting span, then the longer), unbound = singleton, micro-pooled B-cubed and pairwise, margin 0.005: as in `PREREG-REFERENT-READ.md` and the harness `eval/referents/referent-read.mjs`
(`--slice G`), which labels both arms from the plain cast's universe (`universeSpans`, asserted by a unit test and by a throw in the harness).

- **B1** ledger B-cubed F1 >= plain minus 0.005. **B2** ledger pairwise F1 >= plain minus 0.005. **B3** the ledger binds at least the plain arm's share minus 0.005.
- **C1** the shuffled-assignment control (199 draws, seed 20261111) below the real ledger's B-cubed F1 at its 95th percentile.
- **C2** the entries read without the option are byte-identical to the base commit `4ea6fa977c6f2efa8e1e16b3911f59a03ae313c1` over every document of G.
- **B6** the unit tests pass (21 at the frozen commit) and `npm test` and `npm run test:code` pass.

## Decision rule

All of B1, B2, B3, C1, C2, B6 hold on G, and the pull request's CI is green: then the pull request is merged and the merged sha is logged. Any of them fails: the result is a finding, it is reported with its numbers, the pull request stays unmerged,
and nothing about the module or harness is changed to turn it green. What a pass means is limited as before: the title and numeral cues have fired zero times on corpus text so far, so a pass says the ledger costs nothing on names; it does not say splitting is right on corpus text.
