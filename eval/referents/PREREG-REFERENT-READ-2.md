# PREREG-REFERENT-READ-2 — an amendment to PREREG-REFERENT-READ.md, written after its confirmation slice came out red, before any read of slice F

Registered 2026-10-27 by `referent-read`. The first file (`PREREG-REFERENT-READ.md`, sha256 `ed931efbc1950e8b2d969f925bffaee7f4809f09652e38906f271caa866037a3`) stands as written; this file amends it and
adds a second confirmation. Its hash and timestamp are beside it (`.sha256`, `.time`) and in the log entry that announces it.

## What happened to the first confirmation, on the record

Slice E of the first file could not be drawn as registered: it asked for 30 fresh documents and the pool held **6** (GUM train has few documents of at least 20 sentences; A, B, C, D and the golden's 65 set-aside
take the rest). It was read once, at implementation commit `55bd5058d56a74e011b79cd56f501e664a3cedcc`, and **the bars B1 and B2 failed**: B-cubed F1 ledger .916 against plain .923 (a margin of 0.005 allows .918), pairwise F1 ledger .701 against plain .762.
Cause, found by reading the documents (not by changing a number): the harness scored the two arms over different universes. The plain arm labels a gold name from `entry.cast`; the ledger arm labelled it from every referent the ledger holds, which includes
`entry.heard` (common nouns). In `GUM_bio_padalecki` (64 of the 99 names) a gold mention that is a whole noun phrase, "Padalecki, who has been candid about his own struggles with depression", overlapped the common noun "depression" most, and only the ledger arm could label it with that.
That is a harness bug that biased against the ledger, and nothing in the ledger. The as-registered result is a FAIL and stays one.

## The amendment

1. **The ledger arm's labels come from the referents the ledger inserted as beings (`standing: "referent"`, those of `entry.cast`), the same universe as the plain arm.** Nothing else in the measure changes: gold names, G, labels by largest overlap (ties: the earlier span), unbound = singleton, micro-pooled B-cubed and pairwise, the 0.005 margin.
   This fix was made after seeing E, so slice E and slice A are no longer clean for it. With the fix, on the spent slices (diagnostic only): A plain B-cubed F1 .911 and ledger .910, pairwise .807 and .806; E plain and ledger both .923 and .762.
2. **Slice F, the confirmation under this file.** All 90 documents of the golden's slices B, C and D (documents of at least 20 sentences, in id order; `slicesOf` of `pronoun-golden.mjs`). They were read by the pronoun golden, which scores pronoun bindings
   through `entry.pronouns` and `entry.cast`, and by no name-clustering evaluation and not by the ledger at any time. F is read once, at the commit that carries the harness fix and nothing else changed in the module. Slices A and E are reported with F, with their spent status said.
3. **Bars unchanged**, now on F: B1 ledger B-cubed F1 >= plain minus 0.005; B2 pairwise likewise; B3 the ledger binds at least the plain arm's share minus 0.005; C1 the shuffled-assignment control (199 draws, seed 20261111) below the real ledger's B-cubed F1 at its 95th percentile; C2 the entries read without the option are byte-identical to the base commit
   (4ea6fa9ec3f3... as the base worktree reports it) over every document of A, E and F and the three fixtures; C3 each gap type fires on a fixture; B4 and B6 are the unit tests (they do not depend on GUM and are unchanged).
4. **What F can and cannot show.** On GUM the ledger has never split a being (the title and numeral cues fired zero times on A and E), so a pass on F says the ledger costs nothing on names; it does not say the splitting is right on corpus text, which has not been measured because GUM has almost no such cases. That limit is stated in the PR.
