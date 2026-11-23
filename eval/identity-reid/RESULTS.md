# Identity out of the graph (exploratory)

2026-11-23. Scripts here: `identity-reid.mjs` (re-identification across context), `alias-probe.mjs` (merging names that share no word). Inputs: a saved ordered read of each book and the cast (`referentsInOrder`). **Exploratory: no preregistration, no gold labels beyond the alias pairs named below (from the author's knowledge of the book), one fresh run.**

## The definition under test (the owner's)

Two things are the same if the universe folded at two points, bounded by differences that make a difference, has the same shape of relationships between referents. Earlier: a person's identity is everything that makes them different from other people, bounded by differences that make a difference.

## 1. Does the fold re-identify a referent across context?

Blocks of 150 sentences alternate A / B so both halves span the arc. For each name with at least 12 frames in each half, its A vector is matched against every name's B vector (cosine, tf-idf); MRR and top-1 / top-5 of its own B.

War and Peace (dev), 77 names, chance MRR 0.064, top-1 0.013:

| features | MRR | top-1 | top-5 |
|---|---|---|---|
| verbs (`role:verb`) | 0.271 | 0.182 | 0.338 |
| **partners (who it shares an event with)** | **0.532** | **0.429** | **0.636** |
| edges (`role:verb:partner`) | 0.302 | 0.247 | 0.338 |
| verbs + partners | 0.497 | 0.429 | 0.545 |
| verbs + partners, only where significant in A (G² ≥ 3.84) | 0.347 | 0.247 | 0.442 |
| partners, only where significant in A | 0.320 | 0.221 | 0.442 |

Dorian Gray (fresh, one run, frozen script, sha256 a7e6649a25006c95), 9 names, chance MRR 0.308: verbs 0.573, partners 0.593, edges 0.533, verbs + partners 0.629, verbs + partners significant-only 0.549, partners significant-only 0.117. Nine names cannot rank the families; it confirms only that relations re-identify above chance.

Findings:

1. Relations to other referents carry identity; what a referent does in general carries much less (4× chance against 8×). Adding verbs to partners did not help.
2. **Negative result:** keeping only features statistically significant in A *lowers* re-identification on both books. Statistical unusualness picks scene-bound differences; what makes a difference to identity is what **recurs across contexts**.
3. With at least one partner recurring in both halves: 33 of 61 names at rank 1 (54%), 49 within the top 5. With none: 0 of 16, and those are scene-bound nodes (places such as Vyázma, Austerlitz and Vienna; groups such as the Frenchmen; minor figures; median 39 mentions against 112). Nothing to match on is not a mismatch.
4. Why the other 28 fail, node by node: **twins share a neighbourhood** (Sónya's nearest B is Natásha, 0.16 own against 0.19; Pétya and Denísov; Mademoiselle Bourienne and Mary); **hubs win** (Natásha, 1,209 mentions, is the wrong answer for Sónya, God and Mademoiselle Bourienne); **mis-merged referents carry two people's partners** ("Rostóv / Emperor / Count Rostóv", "Nicholas / Prince", "Petersburg / Brothers", "Denísov / Intendant General Kiríl Andréevich Denísov"), so the test also probes cast quality.

## 2. Can two names that share no word be merged from the graph alone?

Whole-book partner folds for the 131 names with at least 25 mentions; for each pair, the fold cosine, the rank of each as the other's nearest fold (of 130), and the co-argument clauses (the two names are arguments of the same verb in one clause: an entity does not act on itself, so this is a **cannot-link**).

| pair | known | fold cosine | rank each way (of 130) | co-argument clauses |
|---|---|---|---|---|
| Bonaparte ~ Napoleon | alias | 0.06 | 10 / 23 | 1 |
| Buonaparte ~ Napoleon | alias | 0.04 | 8 / 45 | 0 |
| Bezúkhov ~ Pierre | alias | 0.05 | 7 / 47 | 0 |
| Bezúkhova ~ Hélène | alias | 0.06 | 14 / 26 | 2 |
| Natásha ~ Sónya | different | 0.25 | 1 / 1 | 25 |
| Mary ~ Natásha | different | 0.20 | 2 / 3 | 27 |
| Dólokhov ~ Anatole | different | 0.12 | 1 / 8 | 13 |
| Kutúzov ~ Napoleon | different | 0.09 | 7 / 8 | 2 |
| Anatole ~ Hippolyte | different | 0.04 | 37 / 20 | 0 |

(Two alias pairs the string rule already merged, Kutúzov / Michael Ilariónovich and Andrew / Bolkónski; two I looked for were not found as names.)

Findings:

1. **Fold similarity alone does not merge aliases; it confuses close associates for them.** True aliases sit well above chance (rank 7 to 47 against a median of about 65) but far from nearest, and the people who share a neighbourhood (lovers, siblings, friends) rank first.
2. **The cannot-link separates them cleanly** (13 to 27 co-argument clauses for different people against 0 to 2 for aliases). The rule that fits: **same = similar fold and never together in one event.**
3. Aliases are register-bound: "Bonaparte" is what the salon speakers say, "Napoleon" is the narration, so the *partners* of each are partly its speakers, not its own relations. The verbs and roles done to it are probably the better shared shape for an alias (untested).

## What to run next (none run)

- Hub correction (PMI in place of tf-idf) for the twins and hubs in section 1.
- Backoff: match on partners, break ties on role and verb.
- The merge rule: same = fold similarity above a shuffled null, no co-argument clause, and typed must-links from the text's own identity assertions (apposition, predicate: "Napoleon, the Emperor"). Falsifier: the known aliases above merge and the controls do not, scored on a held-out book.
- **Across translations**: see section 8. My first idea here (match folds by shared roles and verbs across two translations) is **contradicted** by another session's test: roles from two different parsers disagree too often to be evidence.

Limits: exploratory; one dev book and one fresh book with 9 names; the cast itself is uncorrected (the mis-merges above); alias gold is from the author's knowledge of the book.

## 3. The dependency order of facts, through kind induction (`kind-order.mjs`)

Kinds from khora's `kernel/entity-kind-induction.js` (stable basins in the interaction field, held against a random-subset null) over the role:verb channels of the 118 names with at least 25 mentions. Three stable kinds covering 37 names, found without grammar: **k1**, 19 main characters (Pierre, Napoleon, Borís, Dólokhov…), who kiss, refuse, embrace and cry; **k2**, 9 aides and officers (Ermólov, Zherkóv, Nesvítski…), who hear, notice, turn and say; **k3**, 9 **places** (Moscow, Paris, Vílna, Kalúga), which are reached, left, gone to and come to. Facts a kind shares come first; what a name adds beyond its kind (lift against the kind's rate) reads as its identity: Kutúzov reports, informs, commands, sends; Napoleon orders, nods, remarks, kills; Natásha sang, whispers, insists, listens; Sónya runs, bursts, marries; Prince Andrew dies, causes, returns.

Re-identification by partners, on the 29 names that have a kind (exploratory, one book): all names as candidates MRR 0.772, top-1 69%; same kind only as candidates 0.875, 79% (partly the smaller field); **residual after the kind's mean removed, same candidates as the baseline: 0.866, top-1 83%**. The residual row is the clean one. n = 29; not yet run on a fresh book.

## 4. Kin as facts (`kin-probe.mjs`)

Kin nouns come from a giver (the hyperlexicon's wiktionary hypernyms, three steps up, against seed concepts: relative, kinsman, sibling, parent, spouse, kin, child, offspring): father, mother, brother, husband and son are kin; friend is not; **wife is missing** from the class (a gap in the giver). 59 kin nominals (637 mentions); 57% of the mentions are tied to a name by the text's own assertion, so both ends of the fact are bound. **Many bound facts are wrong**: right are "Hélène is Prince Vasíli's daughter", "Prince Hippolyte is Prince Vasíli's son", "Borís is Anna Mikháylovna's son", "Bezúkhov is Pierre's father"; wrong are "Véra is Prince Andrew's sister", "Speránski is Prince Andrew's son", "Kutúzov is Anatole's father", "Sónya is Borís's mother"; several tie to a vocative form ("Father", "Brother") instead of a person. Roughly half of the printed top 13 are right.

**"Bezúkhov ~ Pierre" in section 2 was not an alias.** Count Bezúkhov is Pierre's *father* until his death and the title then passes to Pierre: a dependency between facts (a death) that no string or fold similarity sees. Section 2's "alias" gold for that pair is wrong.

## 5. Composition on the kin facts

Father and mother are functions, so two names tied as one person's father are one person (a must-link), and parent˘;parent minus identity gives siblings. On these facts: **0 of 6** parent slots hold more than one name (too sparse to merge anything), and the single derived sibling pair, Mary ~ Natásha, is **wrong** (one wrong tie, one wrong derived fact: error compounds along a chain, and an open world gives what is derivable, not what is true). The functional dependency already works one level down: the cast keys a possessed noun by its possessor, so every "his father" of one person is one description referent. What is missing is tying that referent to a name (a vocative, an apposition, a title).

## Deal-breakers and dependencies (the owner's note, not yet built)

Facts about people carry constraints: dead people do not act (the Bezúkhov title above), one person is in one place at a time, one father and one mother, he or she, a marriage needs two living people. Each is a typed, checkable constraint that vetoes a merge or exposes a mis-merge, and a dependency (title passes at death; widow needs a death) is an ordering of facts. The kind layer comes first; these hard constraints sit between kind and individual.

## 6. Patronymics as meaning (`patronymic-probe.mjs`)

A patronymic is a kin fact inside a name: the suffix gives the sex (-ich, -na) and the root the father's first name ("Andréevich": son of Andrei). Suffix table declared (Russian patronymic morphology), applied to the name forms of 33 referents with at least 8 mentions. Where the book's own pronouns decide the sex (7 referents), the patronymic's sex agrees **7 of 7**. It also exposes mis-merges: "Prince Andrew" carries *Andréevich* (the old prince's patronymic; Andrew's own is Nikoláevich, which points at the old prince's first name Nikolái, and the infant 'Nicholas Andréevich' is a third bearer), and one Denísov referent holds *Andréevich* where another holds *Dmítrich* (one father each: a deal-breaker for merging). The title referents "Emperor" and "Majesty" hold the patronymics Timoféevich and Fëdorovna, which belong to named people. The father's first name still has to be matched to a referent across spellings (Nicholas / Nikolái): the hyperlexicon's cross-language name nodes are the way, untried.

## 7. Where Janus's organs fit (read, not yet wired; the Janus checkout is `~/Documents/janus`)

- `merge-gate.mjs`: *would merging two referents break a rule?* One-valued rules (one father, one patronymic), order rules (an act never before a birth), verdicts contradicted / unbound / beyond-reach; "failing to find a conflict is never 'same'". It is handed khora's `kernel/kind-functional-induction.js` and `kernel/identity-exclusion.js` (both exist in khora). This is the veto for the merge pins.
- `kinship.js`: kin derived from facts and rules read from a giver's glosses, typed gaps, and a `parent_cycle` gap for a name conflation that makes a person their own ancestor (the Mary ~ Natásha derivation). A model may only file an opinion.
- `binding-evidence.mjs`: lists every candidate a pronoun could bind to with the raw facts (agreement match / mismatch / unknown) and picks nothing; the judgment is Penelope's. **The cast's pronoun fallback picks; Janus's design says the reader should list candidates with facts and a rule-keeper should judge.**
- `constraints.js` (one-valued, acyclic, requires, conflicts; Conflict / Silence / Resolution) and `nonsense.js` (inverted roles, one-shot agents).

## 8. Reported by another session: the translation test (not run or verified here)

War and Peace chapters 1 to 3, English against Russian: 100 aligned paragraph pairs (83 one-to-one), 16 Russian name forms matched to English names; the gold is that session's own reading of the two editions (not an external check). Correct of 16: same aligned paragraph 13; parser roles matching in the paragraph 7; mention order within the paragraph 9 (right 9 of 10 when it had evidence, no evidence on 6; it caught a Russian case form, Анна Павловне, that co-occurrence got wrong); same paragraph plus order 12. Shifting the alignment by 2 to 50 paragraphs drops every method to 0 to 3 of 16, so the alignment signal is real. "The same roles in the same event" is falsified as the witness at this size. Not tested: merging a name with its nickname or patronymic inside one language, and the typed-relations idea. Our same-language partner folds use one parser and are not affected by the two-parser disagreement; the translation case is.

## Pins

Fourteen defects found along the way are pinned in `PINS.md` (and as pharos entries of kind `pin`, status open), each with the node, what was bound wrongly, evidence sentences from the book, and where to look first. Several name their cause from the evidence (a cannot-link would have vetoed Emperor / Rostóv; grandfather and grandson share a name and patronymic).
