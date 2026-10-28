# PREREG-REFERENT-READ — the read path's entity is a referent, a span only its address (ReadingReferents@1)

Registered 2026-10-27 by `referent-read`, before any scoring of the ledger on GUM and before the ledger exists as code. The hash of this file and its
timestamp are written beside it (`PREREG-REFERENT-READ.sha256`, `.time`) and in the PIPELINE-LOG entry that announces it. A bar below is changed only by a new
file that says so; it is never edited.

## What is claimed

`readWith(text, { referents: true })` (and `readDocument`) adds `entry.referents`, a ledger in which
(1) a referent is inserted once and addressed `ref_<hash of its INS event>`, never a slug of a spelling; (2) a span is `spn_<hash(source, start, end)>`;
(3) a mention is bound to a referent by a CON event with a giver and a basis (sign: `symbol` for a name, `index` for a pronoun; there is no icon);
(4) the plain index (`entry.cast`, `entry.heard`, `ref:auto:<slug>`) is untouched and is the plain arm;
(5) an edge in the ledger relates referents, per statement, and corroboration counts distinct sentences of one (referent, label, referent) key;
(6) what the spans cannot decide is a typed gap in `entry.gaps` (`referent_split`, `referent_merge_unearned`, `mention_ambiguous`, `pronoun_ambiguous`,
`edge_self_link_by_rewrite`, `edge_ends_unbound`, `edge_statement_unlocated`, `mention_overlap`, `referent_without_span`), never a default;
(7) with the option off, nothing changes.

Grounding (the user's quotes file, 2026-10-27; page references as that file gives them, to be checked before printing): Kant AA IV 79-81 (A 103-107, the
object as X, the unity of a rule), AA IV 81 (A 107, numerical identity is not got from empirical data), AA III 75 (B 75), AA III 108 (B 131-132), AA III 111 (B 137),
AA III 216-217 (A 263 / B 319, different places at the same time ground numerical difference), AA III 222; Peirce MS 675, CP 5.473, CP 4.531, MS 793, MS 634.

## Data

UD_English-GUM, `en_gum-ud-train.conllu`, sha256 `88c410ca6a51ccc79f9536d75feb1633421691165cd191f8137f8b37569a0329`. Documents of at least 20 sentences, in id order, text =
the sentences joined by one space, `language: "en"`, `minCharacters: 0`, the local Wiktionary lexicon (as `eval/referents/pronoun-golden.mjs`), `parseGum` and `slicesOf` reused.

- **Slice A** (design; spent by this run): 30 documents, seed 20261110, built as the golden builds its excluded slice A. The implementation may be iterated against A; the bars may not.
- **Slice E** (confirmation, fresh, read once): 30 documents, seed 20261201, drawn from the documents in none of A, B, C, D and not in the 65 the golden set aside. The implementation commit is
  frozen and its hash written to the log before E is read. E is run one time. Both slices are reported, whatever they say.
- The four probe fixtures of the audit run and the nine failing-input tests (below) are not GUM and are not scored for B-cubed.

## What is measured

**Gold names.** A gold mention is a GUM entity mention whose head is PROPN and that no other gold mention strictly contains (non-nested). The evaluation set G of a document is the gold names that at
least one *plain* cast span overlaps (character overlap > 0). Both arms are scored on this one set.

**Labels.** Plain arm: the `ref` of the plain cast span with the largest overlap (ties: the earlier span). Ledger arm: the `ref_…` of the ledger span with the largest overlap if that span is bound; a gold
name with no bound ledger span is a singleton cluster of its own. (An unbound mention is not given the benefit of a cluster.) Gold cluster: the entity id.

**B-cubed** precision, recall and F1 over G, micro-pooled over the slice; **pairwise** precision, recall and F1 over mention pairs of the same document, pooled. Reported as absolutes and against the
numbers the earlier measurement quoted (pairwise F1 .861, B-cubed .927 on non-nested GUM proper names).

**Failing inputs** (the audit's nine numbered failures, `reading-rules-audit/READING-RULES-AUDIT.md` section 3 and stage files), each a unit test with its own fixture, the fixture asserting first that the plain arm
exhibits the failure (so a fixture that stops failing fails the test):

| id | the audit's failure | predicate for "fixed or typed" |
|---|---|---|
| F1 | the id is founder-dependent (`ref:auto:frankenstein` on a prefix, `ref:auto:victor_frankenstein` on the whole) | with one `address`, a prefix read and the whole read give the same ledger id for the being whose first mention is in the prefix; the plain ids differ |
| F2 | "Mr." and "Mrs. Bennet" are one being | in one sentence: two ledger referents and a `referent_split` gap; in two sentences: one referent and a `referent_merge_unearned` gap; both must hold |
| F3 | two Smiths merge into one corroborated edge through `form:` ids | the ledger has no edge with more than one statement across the two Smith statements; each statement has its own end1 referent |
| F4 | edge ends are lowercased strings and the face is the longest nested string | every ledger edge end that resolves carries `ref_…` and `spn_…`; `foldLog(log)` finds that span bound to that ref |
| F5 | the pronoun rewrite makes a self-link edge | no ledger edge has equal end referents for that statement and an `edge_self_link_by_rewrite` gap is raised |
| F6 | names with connectors, hyphens or numerals are cut up | counted fixed only if both parts hold: (a) Henry IV, V and VIII are three ledger referents; (b) "Ludwig van Beethoven" is no `ludwig -van-> beethoven` edge. Part (b) is declared not addressed (it needs the parse or a giver to tell "van" from "and"), so F6 is a declared miss |
| F7 | three notions of "the beings" in one read | declared not addressed (they live in the index and the pronoun pass) |
| F8 | the atoms path mints its own entities | declared not addressed (not reached by `readDocument`; handed to the owner of weft-atoms) |
| F9 | the weft's cross-document identity is a slug | declared not addressed here (khora#82 is the weft's; an address is per source, so a cross-source link stays an explicit CON of kind correspondence with a rung) |

**Tests from the lens** (unit tests, no GUM, no lexicon, stub givers only): T1 a CON or SYN without a giver is refused; `foldLog` finds no referent without a bound span and no edge end that is a bare
string where a referent resolves. T2 same core and different modifiers in one sentence: two referents; in different sentences: one referent and a gap; two beings sharing every predicate stay two. T3 the address survives
a longer name, a prefix read and a renamed face. T4 a Roman numeral on a core is a character of the sign: IV, V, VIII are three. T5 a name binds as `symbol`, a pronoun as `index`, no icon. T6 undecided is a gap, never a default, and
a gap never becomes a hit. T7 re-reading under another frame appends events; `foldLog` at an earlier cursor returns the earlier state.

**Controls (built to fail).**
- **C1, shuffled assignments.** Within each document, the ledger labels of the covered names are permuted among them, 199 draws, seed 20261111 (the golden's draw count and alpha). The real ledger's B-cubed F1 must exceed the 95th percentile of
  the shuffled draws on both slices, or the metric does not discriminate and nothing is claimed.
- **C2, the option off.** The entries of `readDocument(text, opts)` and of `readDocument(text, { ...opts, referents: false })` on this branch are byte-identical, `ms` set to 0, to those on the base commit, over every document of A and E and the four probe fixtures.
- **C3, a gate seen firing.** Each gap type above fires on at least one fixture; a type that never fires is removed from the code before the PR (or left as a comment, not a gate).

## Bars (decided now; every one must hold on E, and A is reported with the same weight)

- **B1** name B-cubed F1 of the ledger arm >= the plain arm's minus 0.005, on A and on E. (0.005 is the user's own margin: ".927 minus 0.005".)
- **B2** name pairwise F1 of the ledger arm >= the plain arm's minus 0.005, on A and on E.
- **B3** the ledger binds at least the plain arm's share of G, minus 0.005 (a ledger that drops mentions to look pure is not better).
- **B4** the share of the nine failures fixed or typed >= 5 of 9 (F1 to F5), with F6 to F9 declared misses above. The share is reported over nine, not over the ones attempted.
- **B5** C1 holds on both slices; C2 holds with zero differing bytes; C3 holds.
- **B6** all of T1 to T7 pass.

## Decision rule and what is not claimed

The slice is offered for merge only if B1 to B6 hold on E. If any fails, the PR says which, with its numbers, and the option stays off by default (it is always off by default). If B1 or B2 fails on E while holding on A,
that is reported as an overfit to the design slice. Not claimed whatever the numbers: that a referent exists (a supposedly real object, MS 634); that two spans in different sentences are or are not one being (a gap); that
per-statement polarity is fixed (it is not: the plain edge folds it, S4 F2); that cross-document identity is addressed; that typos are handled (deferred; graded; no number invented).
Reported, not barred: the number of each gap type; the number of referents split and of unbound mentions; id stability across prefix and whole on A for both arms; milliseconds per document with and without the option.
