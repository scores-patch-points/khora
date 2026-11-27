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

## 9. Is the cross-language role disagreement our binding? (`translation-roles.mjs`, exploratory)

Question from the owner, after the reported translation test found roles the worst witness (section 8): is that our bad binding, or something else? War and Peace chapters 1 to 3, Zenodotus aligned files (English, Russian). Paragraphs aligned by cumulative length (mutual nearest: 86 pairs); only the 44 pairs with the same number of sentences are kept, so sentence k matches sentence k. For hand-picked names that occur exactly once in both aligned sentences (gold: the author's reading; 18 mentions), the role of the name's **phrase head** is compared at three levels (a first version compared the matched token, which gave a flat or compound part of a multiword name and overstated the disagreement).

| level | agrees |
|---|---|
| UD relation base (parser) | 14 of 18 (78%) |
| kāraka label (our mapping, `karakaRows` / `panini`) | 14 of 18 (78%) |
| agent vs not | 15 of 18 (83%) |
| base agrees, kāraka differs (**our mapping**) | **0** |

The four base disagreements: three are the **English parser on speech tags after a quotation** ("replied Anna Pávlovna" gets conj, "whispered Anna Pávlovna to one" gets obj, "said Prince Hippolyte" gets root), and one is a Russian parse (Hélène, in apposition to "Дочь", labelled the subject). So on this sample the disagreement is **the parser**, not the kāraka mapping, which adds none. This matches the "Parsing fixes" session's hand audit of 30 disagreements (about 26 reading or map faults: English inversions of "said Prince Vasíli", English appositions, Russian case errors; 3 real divergences), though that audit used the older `karaka-map.mjs` mapping. The first test's 7 of 16 for roles therefore most likely measures those parser faults and the older mapping, not role evidence as such.

Limits: 18 mentions; gold is the author's own; the equal-sentence-count filter keeps 44 of 86 paragraph pairs and biases toward simple ones; speech tags after quotations are common in this text, so this chapter range is a hard case for the English parser. Not run: the other session's matching test itself with `karakaRows` roles in place of the older mapping, which is the direct re-test.

## 10. Meaningful relationships, not "saw" and "interrupted" (exploratory; the owner's question: what would their wiki page say?)

A wiki page lists what changed between two people, not what they did. Two ways to find that mechanically, both tried on War and Peace.

**(a) Consequence by co-presence** (`relationship-impact.mjs`). For each event with two named people among its participants, compare how often the pair is mentioned together in the 150 sentences after against the 150 before, against random positions in that pair's own history; score each verb by its mean z. 112 names, 1,500 events, 39 verbs with at least 8 events. Highest: hear, come, talk, meet, lead, send, see; lowest: let, have, listen, put, leave, hand. **Weak:** it rewards contact events and misses love (−0.41, because lovers are often apart). For Prince Andrew and Natásha it found the ball and "Natásha had refused Prince Andrew", among noise.

**(b) Episodes ranked by predictive surprise** (`relationship-episodes.mjs`). Events between the same pair with gaps of at most 15 sentences are one episode; each episode's class is its commonest verb; surprise is −ln p(class | the pair's own earlier episodes), smoothed toward the book's class mix, ranked by surprise × log2(1 + events); persistence is the Jensen-Shannon divergence between the class mix of the next and the previous episodes. **Better:** it surfaced beats a wiki page would carry: Pierre and Hélène, the attraction (sentence 6533, "he could no longer see her as a distant beauty") and "He hated her and was forever sundered from her" (9660); Pierre and Prince Andrew, their first meeting (684), the reunion embrace (11687); Prince Andrew and Natásha, the approach at the ball (14239 to 14255) and "Prince Andrew came up to her with downcast eyes" (14484). Three pairs, read by the author; not scored.

**Surprise is also a binding-fault detector.** Two of Andrew and Natásha's top episodes (27836, "the monk advised her to pray"; 32187, "Pierre sometimes felt as if he was vanishing") are not about Andrew: a pronoun was bound to him wrongly, which makes the event surprising for the pair by construction. Pinned (`surprising-episodes-are-binding-faults`).

**Lifting little events into larger kinds failed twice (negative results).** (1) The hyperlexicon: 338 verbs between named people, 0 classes of 3 or more verbs sharing a hypernym within two steps; wiktionary records few hypernyms for verbs, so "move through the hyperlexicon" has to use other relations (syn, coord, derived) or something else. (2) Kind induction over how verbs behave (roles in the frame, case markers on arguments, what kind of referent fills each role, follows a quotation, negation): khora's inducer built **one kind holding 710 of 736 verbs** (frame features included) and **623 of 682** (frame features dropped, bond quantile 0.92, prevalence 0.08), so every episode gets the same class and surprise collapses. The features do not separate event kinds at this population. Not tried: richer features (the kinds of the participants, as induced in section 3; the position in the pair's history), a verb vector from the book's own context, or the hyperlexicon's synonym and coordinate relations.

Where this leaves the wiki paragraph: the pieces are (1) relation nouns and kin (section 4, about half right), (2) high-surprise, persistent episodes (this section), (3) the pair's first and last contact and its breaks (a refusal, a hate, a death), said in the book's own sentences. Not generated text.

## 11. Our own verb hypernyms, from the glosses, through the reader (`gloss-hypernyms.mjs`; the owner's direction; exploratory)

The owner's point: induce kinds on the **glosses of the words, read through the reader** (genus and the roles filled under it), not on how verbs behave (section 10, which collapsed into one kind), and use an embedder where it helps. 1,315 verbs with at least 5 uses in War and Peace; 1,052 have an infinitive-reading gloss in the dictionary (kaikki).

- **(a) Genus by reading the gloss.** 716 of 1,315 verbs got a genus (the gloss's root verb; its own gloss gives the next step up, three steps in all); 91 genus classes of 3 to 40 verbs, placing 481. Good where the genus is specific ("perceive: see, know, seem, hear, whisper, overhear"; "place: put, lay, cover, locate"; "move: stop, approach, step, roll"); **poor where the genus is a light verb**, because the meaning then lives in the differentia: "have: leave, love, show, smile, need", "cause: laugh, flush, frighten, jump, bend", "give: reply, receive, like, abandon". So genus alone is the weaker signal for verbs.
- **(b) The frozen embedder over the glosses** (nomic-embed-text, a codec; all-pairs cosine mean 0.61, sd 0.05; neighbours kept only above mean + 2.5 sd, mutual 3-nearest, connected components of 3 to 40 verbs): 81 classes placing 588 of 1,052. The nearest neighbours are the right ones (say: pronounce, speak, talk; look: gaze, glance, eye; die: decease, kill, perish; refuse: reject, deny, forbid; love: embrace, caress, cherish). Coherent classes include **commitment** (marry, promise, defend, assure, entrust, commit, confess, protect, trust), asking and answering (ask, reply, answer, inquire, demand), death and hiding (kill, die, hide, conceal, execute, perish), decision (decide, settle, choose, resolve), speech manner (speak, talk, whisper, mutter, murmur); some are noisy ("live, win, compare, hinder, last, endure, defeat").
- **Used in the episodes** (the embedding classes lead, a genus class fills in where the embedding found none): 101 classes over 210 of the 338 verbs between named people. The surprise ranking now names the beats by class: Pierre and Hélène, the break is *blame/hate* ("He hated her and was forever sundered from her"); Prince Andrew and Natásha, the ball is *approach/dance/beckon*, the courtship *like/enjoy*, and a new episode after his death, "she meant Prince Andrew… we forget him" (31998), which is a relationship moment the verb ranking could not see.

Limits: classes cover 210 of 338 verbs in the events; no scoring (three pairs read by the author); the embedder is a model (khora's rules allow a frozen embedding codec, never generation); episodes still include binding faults (pinned); the threshold comes from the embeddings' own spread, but the 2.5 sd and k = 3 are declared dials.
