# Callimachus: the research record, and how it is told

The process record for this work. Read it before building anything near it.

It keeps what was built, why, what each gate checks and who gave it, and what was tried and **falsified**, with the numbers. Every section is append-only: a later finding goes below an earlier one, never over it.

First written 2026-10-14 (Callimachus session `e522ff`). Spec of record: the user's *CALLIMACHUS* draft 1, 2026-10-14, kept beside this file as `CALLIMACHUS-SPEC.md` when it lands.

## 0. What it is, in one paragraph

You ask a question. Callimachus collects the pages once, **pins each by the sha256 of its exact bytes**, and reads every claim as a **byte span** of those bytes. It then reads up the ladder: who said it, what it is about, how many independent sources carry it, and where the pages differ.

Answers come at **every size**: a line, a paragraph, a brief, a 27-cell telling, a claim sheet. Each size is a whole answer, and each bigger one is chosen by more of the stack.

Copied words keep their addresses. Generated words are typed as one of four things:
- frame words from a declared grammar;
- values computed from the record;
- grammar a paraphrase needed;
- `self:model` from the mouth.

Nothing is ever paraphrased past what the gates admit.

## 1. Who owns what

Recorded with the Wald session, 2026-10-14; the user corrected it the same day. The record of the void work is `the-fold` `docs/archons/VOID-WORK.md`, branch `void/universe`.

| Owner | Owns | Seam with Callimachus |
|---|---|---|
| **Nagarjuna** | **The void**: `the-fold/void-shape.js` `declareVoid` (`EOVoidDeclaration@1`, nine operators). Its verdicts are the four corners of `hl.js` (Belnap–Dunn): filled = is, refuted = is-not, contested = both, gap = neither. | `organs/question-void.js` reads a question **into** his void. A lens that reports a void's outcome uses those four values. |
| **Koestler** | **The holons**: `organs/void-holarchy.js` (low sets possibility for high; high sets probability for low). Also `organs/output-holograph.js`: every generated sentence is a pointer, either a byte address or a marked `self:model`. | Every snip, paraphrase and mouth repair here answers to that typing (see §5). |
| **Wald** | The pull: what must be fetched for a turn. | None in the writer. |
| **Callimachus** | **The record and the telling**: Pinax fixity, the claim ladder, the lenses, the answer ladder, the paraphrase levels. | Not a registered archon. It has no `Handle:` line, no Solon register entry, no compendium entry. Registering it needs a proposal the user ratifies (Solon's rule); it is never self-enacted. |

## 2. The pipeline, file by file (khora `native/`)

| Stage | File | What it does |
|---|---|---|
| Fixity | `organs/pinax.js` | `Pinax@1` per source version: raw and text hashes, NFC/LF text layer, stichometry, incipit and explicit. Versioned byte addresses `px_…/layer@sha12#bS-E`, a UTF-8/code point/UTF-16 offset map, and two-axis fixity verdicts (intact, re_encoded, revised, moved, altered, address_error, unchecked) with an archive witness and sigla. |
| The ladder | `organs/callimachus.js` | See the list below. |
| Composer | `organs/composer.js`, `organs/prose-laws.js` | Segments (frame, value, source+address), the laws PL1–PL14 (§4), and `narrow`/`cleanSpan`, which narrow a span and never edit it. |
| The telling | `organs/cube-telling.js` | All 27 `op·grain` cells (`kernel/cube.js` `cellOf`), each **voiced**, **silent**, **gap** or **desert**. Cells emit **language-neutral propositions**; `realizer()` resolves the slots and the grammar realizes them. Kind, Atmosphere and Paradigm are read by the engine's registered cell organs through thin adapters in `organs/telling-organs.js` (§10). |
| Grammars | `adapters/text/telling-grammar.{en,es}.js` | One construction per proposition type. Lists, dates and plurals come from **CLDR via `Intl`**. Per-construction frame words are read from each construction's own literals (PL14). Spanish is the author's grammar, not yet reviewed by a native speaker. |
| The question | `adapters/text/question-grammar.{en,es}.js` → `organs/question-void.js` | English uses the UD parser (EWT); a clause-initial wh-word counts as interrogative whatever its tag. Spanish uses closed classes only; there is no Spanish parser on disk, and it says so. The reading becomes `declareVoid({ slot: type, anchor: [names], admits, relation })` plus a `void:` id. |
| Sized answers | `organs/answer-ladder.js` | See §3. |
| Claim paraphrase | `organs/claim-realize.js` | `realizeClaim({ claim, grounds, lang, whom, witness })`. See §5. |
| Mouth repair | `organs/mouth-repair.js` | `repairSentence(s, { draw, source, model, mouth })`. See §5. |
| Runner | `scripts/callimachus-run.mjs` | See below. |

What `organs/callimachus.js` does:
- Claims are byte spans. Located vs reported is decided by structure: quotation regions, embeddings and **attribution frames**, never a verb list.
- **Attitude verbs are earned** by a leave-one-out binomial on quote adjacency (within 3 words) or clausal objects.
- **Figures** are admitted by recurrence and **consequence** (they must act in some claim). CLDR month and weekday names are declined.
- Title abbreviations are measured from the corpus.
- **Independence** comes from winnowing, citation and lineage. Standing is AGREE, SINGLE, UNDETERMINED or CONTRADICTED.

What `scripts/callimachus-run.mjs` does:
- Collection: round-0 queries built from the question's own words, plus operator seeds.
- `--replay` rebuilds from the pinned layers, so runs compare like with like.
- `--lang en,es` and `--ask …` (repeatable).
- Outputs: `view.html` (Answers, Telling, Dossier, Claim sheet tabs; clicking a copied segment opens its bytes) and `telling.addressed.json`, in which the telling is itself pinned and each sentence has an output address.

## 3. Sized answers: every stage a whole answer, each re-weighting the one below

`answer-ladder.js`. Candidates are claims. Each layer adds log-odds; a stage re-scores **every** candidate with all layers up to it, and reports whether its lead moved and which witness moved it.

1. **Perception** → the **line**. The witnesses are anchor, actor (the figure is the relation's subject: CON·Link), admits, relation, and the question's words, each weighed by its own surprisal. **Admits only counts once a content witness binds the claim**: a date alone answers no "when". A zero-evidence question is refused, not filled: its corner is **neither**.
2. **Logos** → the **paragraph**. The witnesses are chains (log2), agreement, a named speaker (counted once), and `logos()` claim cycles. `kernel/contest.js` `adjudicate` decides whether the lead binds, against **margins from a seeded permutation null**. If it doesn't bind, both readings are shown.
3. **Pathos** → the **brief**. The experiencer is declared (`organs/experiencer.js`). `strainOf` sets how many sides to show, camps are balanced, and `pathosOf` rhythm (Murch) re-picks a flatlined draft. The order is: lead first, then the tension (where pages differ), then the other sides, then the release (what holds).
4. The **dossier** is the whole 27-cell telling. The **claim sheet** is every atom.

Every stage reports the void's outcome as one of **Nagarjuna's four corners**: `hl.js`'s Belnap–Dunn strings, computed from two supports through `hl.js` `verdictOfSupport` (`cornerOf` in `answer-ladder.js`). **is** (`bound`): the lead binds past the null. **both** (`contested`): it doesn't clear its runner-up. **is-not** (`contradicted`): every evidence-bearing candidate is negative, or a polar question's bound lead is. **neither** (`unbound`): nothing carries the question. `contest.js`'s own verdict is kept beside it as `corner.contest`. The mapping is the one `precision-race.js` already uses.

Measured on the DST record (10 pinned pages):
- "When did the House pass the Sunshine Protection Act?" → "On July 14, 2026, the House passed…"
- "Did the Senate pass the bill?" → "In 2022, the Senate passed the bill by unanimous consent…"
- "Who opposes…?" → "Opponents of the Sunshine Protection Act argue…"

## 4. The laws (`prose-laws.js`), each with its giver

| Law | Says | Giver |
|---|---|---|
| PL1 | Opening capital, on cased scripts only | CMOS 6.1 |
| PL2 | Terminal punctuation | CMOS 6.12 |
| PL3 | No numeral opener (English) | CMOS 9.5 |
| PL4 | Zero to nine spelled out; CMOS 9.7 numeral mode outranks it | CMOS 9.2 / 9.7 |
| PL5 | Agreement | grammar |
| PL6 | a/an (by letter, declared) | CMOS 5.72 |
| PL7 | Quotes balance | CMOS 6.9 |
| PL8 | A quotation is a clean whole clause | `docs/VOICE.md` "their words" |
| PL9 | No causal claim in frame words | the-fold `telling.mjs` |
| PL10 | Plain language | `fold-chat-folds.js` |
| PL11 | Openers vary | the author |
| PL12 | At most 35 frame words | the author, after plainlanguage.gov |
| PL13 | Every sentence grounded and addressed | spec L2/L4 |
| PL14 | Frame words declared per construction | the callimachus_1 proof's `verifySentence` |

## 5. Paraphrase: four levels, each optional above the first

1. **Verbatim snip**, always: the copied bytes, cleaned only by narrowing.
2. **Mechanical claim paraphrase** (`claim-realize.js`, no model). The source clause is parsed (UD English-EWT parser) into its argument subtrees as byte spans. Grammatical alternations recombine them: active → passive, an adjunct moved, "According to X, …". Only grammar words are generated (was/were, by, according to, the participle). Verb forms come from **EWT-attested** forms (`formsFromParserLexicon`). The gates, all must pass:
   - **independent witness**: the Callimachus relation reader (`relations.js`) must agree on the predicate and subject;
   - **logos at the clause**: a predicate must be the root or hang on a predicate;
   - the prose laws and declared words;
   - **copied segments re-verify** against their bytes;
   - **reverse equate**: parse back to the same predicate and arguments;
   - **anchors**: every number and proper name carried, or disclosed as omitted (prosify's law);
   - **logos within arguments**: no carried word outlives or outranks its head; moving a prepositional phrase between the object and the verb is licensed, because it is the reader's attachment ambiguity;
   - **net new with no constant**: at least one word adjacency the source never holds.

   Measured: **5 of 12** witnessed DST claims, for example "The bill was passed by the Senate in 2022 by unanimous consent." and "According to critics, it could create uncomfortably dark winter mornings, particularly in northern states." Every refusal is typed.
3. **Mouth repair** (`mouth-repair.js`, the local small model: `gemma2:2b` via the khora channel `:11434` with `MOUTH_IDENTITY`). The mouth is asked to fix grammar only, and its reply is **diffed word by word** (LCS):
   - kept words stay in their original segments, with their addresses;
   - **additions become `self:model` segments** (Koestler's typing), recorded as EOT additions;
   - deleting copied words, adding a content word the source doesn't hold, or altering bytes inside a segment refuses the repair, and the unrepaired sentence stands.

   Live, 2026-10-14: the four grammatical paraphrases came back unchanged, as they should.
4. **Fold** into the final output, with every segment typed (frame, value, source+address, form, `self:model`).

## 6. Falsified: tried, measured, refused (do not rebuild these)

| What | Measured | Why it failed |
|---|---|---|
| Cross-language question matching by 4-letter stems | Spanish "¿Quién se opone…?" found the answer only through the "permanent"/"permanente" cognate | Luck, not a bridge. The real machinery is `kernel/identity-induction.js`, plus the Wikidata `qidBridge` (English-only). The UDHR Dice alignment lives only in retired eoreader7: it linked 9–48 words per language, and the adposition test failed there. |
| Reverse equate with the **same** parser as the only check | Passed "Time approaches are saved by daylight." | One reader agreeing with itself (the Pearl caveat). Fixed by the independent `relations.js` witness. |
| Plain EOT round trip as paraphrase (`eot-rich` → `eot-realize`) | With gold EWT forms: "be more would beneficial", "Trump President" | Per-relation order statistics can't place sibling auxiliaries or a title inside a name. Realize at **claim** level instead. |
| `the-fold/telling.mjs` as a writer | 23 composed sentences, 0 unjustified, yet "Anna greeted prince, and educate bear" | Lint-clean, but telegraphic. |
| Operator-chain prefix closure over UD feature cells (`CELL_OF_GRAMMAR`), **per sentence** | 10.6% of 2,000 real sentences closed; 62.6% with NUL given | NUL is almost never morphological, and the test would refuse 37–89% of real English. |
| The same, **per mention channel** | Real 4.2% vs shuffled 4.6% (5.3% vs 6.5% with NUL given) | Feature cells are per word, so word order is invisible to them: no discrimination. |
| The same, **per referent across the reading** (polytemporal: lower operators may be constituted later, the user's point) | Real referents closed 37.3% by the end vs a null of 56.9–76.5% (mentions re-dealt among referents, 99 seeded draws). 2% closed at first mention. | Closure over this mapping rewards **role diversity**, not sense. The bitemporal frame stands (operators are used before what they depend on is constituted); the test statistic does not. **Order over arcs** (outlive/outrank head; a predicate on a non-predicate) is what catches nonsense. |
| A 6-gram overlap bar for "net new" | — | A hand-set number. Replaced by the source as its own null. |
| Scalar distance picks the grain: the far reader's brief is more structural than the near reader's (twin-reader P3, 2026-10-14; one universe, one question) | Void 5 of 10 structural (0.50); dense 5 of 8 (0.625). Post hoc, unregistered: the reader gets the grain it **lacks** | Distance behaved per grain, not as a scalar. `grain.js`'s selector is a scalar-distance rule: its pre-registration (`GRAIN-PREREG.md` G3) carries this as a prediction. Refutation ledger L31. |
| A "beats every draw" predicate-shuffle null for held-ness, on a small W (`grain.test.mjs`; **synthetic fixtures**, not a corpus) | W of 11 claim spans, region of 8: 3 held exceeded the null in 1–2 of 199 draws (p ≈ 0.01) and ran at Ground; 4 held beat every draw | A small W cannot certify itself under a rule that strict, so "did not beat the null" is not "holds nothing". Reported as `null.exceeded` / `null.permutations`. Refutation ledger L32. |
| Reading a reader's thread with the record's own claim reader (`holdings.js` `claimsOfWhom`) | A three-sentence thread plus filler admitted 0 atoms (scratch run); a five-sentence thread admitted at least 3 | The reader admits a subject only on recurrence and consequence; an arm whose W admits no claim is "uninformative", never a pass. Thin: two sizes, one style. Refutation ledger L33. |
| Accumulating W as the grain's reader across five steps (grain experiment G4, permanent-dst) | Grain Ground, Figure, Figure, Figure, Figure, Ground; admitted claims 50, 68, 92, 176, 138 as W only grew; not stopped | The claim reader read a larger W as holding less (held 33 → 11 at the last step). Instrument-limited, not a finding about the reader. Refutation ledger L35. |
| The claim reader on word-shuffled pages (grain experiment calibration arm, 19 seeds) | 766–873 atoms from shuffled pages against 573 from real | It admits more claims from noise than from text. The selector downstream was calibrated (0 of 19 non-Ground); the reader is not. Refutation ledger L34. |
| Movement measured as Jaccard distance over copied addresses, with Clearing first | U-side distance 0 for dense and B; d = 0.098 comes from added W-side addresses | The measure cannot see the record move. Refutation ledger L36. |
| An accumulating chain whose step adds the fold's own copied spans back to W (grain experiment, second registration N6) | W doubled each step (claims 136, 266, 527, 1049, 2093); the copied set never repeated; the record-side set was constant (92) and the grain Pattern from step 1 | The stop rule counted addresses the chain itself creates. Refutation ledger L38. |
| Pattern selected by a bare majority, dense reader (held 47, absent 45) | Tracing 48 items, mostly the reader's own sentence beside the identical record sentence; Composing 0; the 45 absent spans in no cell | The fold is closed and addressed and shows the reader almost nothing new. Refutation ledger L39. |
| Showing the whole absent set as the repair for a thin answer (grain experiment, third registration) | The new is always shown (M1–M4 hold), but it is 45 passages for the House ask and 195–209 for three others, in relevance order with no cut; 25 distinct anchors for 41 attached items; 46 of 48 Tracing items remain echoes | Showing everything that is new is not showing what is worth knowing. Refutation ledger L40. |

## 7. Hand-set constants still owed a null (the user's rule: no hand-set thresholds; born rule, DMD all the way)

| Constant | Where |
|---|---|
| `WINNOW_K=24`, `WINNOW_W=8`, `SHARE_FLOOR=0.5` | callimachus.js |
| `MIN_ENTITY_SENTENCES=2` | callimachus.js |
| `ATTITUDE_ALPHA=0.01` | callimachus.js (cube-telling Kind no longer uses it, §10) |
| `QUOTE_FRAME_WORDS=3` | callimachus.js |
| `INCIPIT_BYTES=64`, `SPAN_EDGE_BYTES=16`, `ADDRESS_HASH_HEX=12` | pinax.js; identity aids, not gates |
| `minActivation: 1`, `contestedMargin = max(p95, p99)` | answer-ladder.js; the p-levels are conventions |
| Brief sides 3/5, speaker caps (8, 3, 2, 1), alternative caps (12) | answer-ladder.js, cube-telling.js |
| PL12 at 35 words | prose-laws.js |
| `POPULATION_NULL` 19 draws at the inducer's own 0.95 quantile; `ATMOSPHERE_REGIME` received from source.js | telling-organs.js (§10): the draws are the fewest that resolve the quantile |

Each one should be replaced by a measured value from a null over the material, with only its draws and seed declared.

## 8. Open work

- **REC·Pattern (`reshape`)** needs the question's void loop (`void-loop.js` openLoop → proposeFrom → admit) run over the record. That is the void-in-the-universe work, owned by Nagarjuna (§10).
- **The terrain-induction false positive** (§10) belongs to the kernel organ, not to this adapter. The population null here is the measured guard; whether `entity-kind-induction.js` should carry it itself is the kernel's call.
- **Cross-language referents**: `identity-induction.js` ("same thing, for someone, when the universes folded on them match beyond a null") plus `qidBridge` with non-English titles.
- **Paraphrase in other languages** needs a bilingual lexicon (or the question's own language as the record's), plus a UD treebank per language for its parser and forms.
- Wire `realizeClaim` (level 2) and `repairSentence` (level 3) into the answer ladder's lines, beside the verbatim snip.
- The **Spanish grammar** needs a native speaker's review.

## 9. How to run

```bash
node native/scripts/callimachus-run.mjs --question "…" --search 10 --url <seed> --out <dir>
node native/scripts/callimachus-run.mjs --question "…" --replay --lang en,es --ask "…" --ask "…" --out <dir>
node --test native/organs/{pinax,callimachus,cube-telling,telling-organs,answer-ladder,claim-realize,mouth-repair}.test.mjs
```

Live repair needs the mouth channel on `:11434` with `gemma2:2b`. Without it, level 3 reports "no mouth reachable" and changes nothing.

## 10. The three terrains on the engine's own organs (2026-10-14)

The stand-ins are retired. Every cell of Kind, Atmosphere and Paradigm now calls a registered organ (`organs/capacities.js`) through a thin adapter in `organs/telling-organs.js`, which only reshapes the record into the organ's own input. No organ was copied, and none was changed.

| Cell | Before (stand-in) | After (registered organ) |
|---|---|---|
| SIG·Pattern (Kind) | co-mention graph, binomial at `ATTITUDE_ALPHA` | `kinds`: `kernel/terrain-induction.js` over the figures, each featured by the figures it co-arrives with in one claim |
| NUL·Pattern (Kind) | count of claims outside every group | `kindnull`: each induced group challenged again by `testKindMembers`; plus the same count |
| INS·Pattern (Kind) | largest components | the largest held kinds (same construction) |
| EVA·Ground (Atmosphere) | pages grouped by publication month | `atmosphere`: the aperture meter (`the-fold/aperture.js`), one arrival per page in order of publication; each page above, below or placed against the continuation null of the pages before it |
| REC·Ground (Atmosphere) | fixity only | `regime`: `source.js` `atmosphereBoundaries` → `loops/atmosphere.js` `readAtmosphere` over the pages' text in order of publication, at the received `ATMOSPHERE_REGIME` `{window 5, draws 256, tolerance 3, hop 5}`; then fixity |
| DEF·Ground (Atmosphere) | undated-claims disclosure | unchanged (`frame` is the registered organ; nothing new to say) |
| DEF·Pattern (Paradigm) | a page's dominant facet; camps if ≥2 facets each dominate ≥2 pages (hand-set) | terrain induction over the **pages**, each featured by the figures it names (the same co-arrival, one grain up), with the same two nulls |
| EVA·Pattern (Paradigm) | count of `CONTRADICTED` claims | `standing`: `capacity-runner.js` `mergeTestimony` per claim, one reading per independent chain ("holds") and per opposite-polarity rival chain on another page ("refused"); DISAGREE and CONTRADICTED are told |
| REC·Pattern (Paradigm) | gap, owner: author | still a gap, now owned by **nagarjuna**. `reshape` needs the findings of the question's void loop, and that loop is not run over the record. |

Not touched: REC·Figure (`rezero`) is a Lens cell and was never a stand-in. Its telling still reads silences from `record.omissions`. Wiring `concedeEvaluation` there needs a log of checked claims, which the record doesn't keep.

**Cell statuses, `permanent-dst` replay (`--lang en,es`, the five asks of §3):**

| | voiced | silent | gap | desert | sentences | lawful | copied segments verified |
|---|---|---|---|---|---|---|---|
| before, en | 24 | 1 (SYN·Figure) | 1 (REC·Pattern) | 1 | 26 | 26/26 | 40/40 |
| after, en | 24 | 1 (SYN·Figure) | 1 (REC·Pattern) | 1 | 28 | 28/28 | 36/36 |
| after, es | 24 | 1 (SYN·Figure) | 1 (REC·Pattern) | 1 | 28 | 28/28 | 33/33 |

No cell changed status, and the two languages answer every cell the same way. SYN·Figure is silent in both: in English no indirect-speech candidate passes the laws on this record, and in Spanish it is silent by design, because the grammar declines indirect speech rather than code-switch. The answers, telling included, re-verify 603/603 copied segments against the pinned layers.

**Omnilingual check, and a Spanish bug it found.** `cube-telling.test.mjs` now requires every proposition type the lens emits to have a construction in **both** grammars, and the en and es tellings to give every cell the same status. On the fixture it failed: Spanish CON·Ground went silent, because PL4 read the day numeral inside a CLDR date ("1 de octubre de 2026") as a stray digit. English escaped only because its date form puts a comma after the day. Dates and months are CLDR output, received rather than written, so both grammars now mark them `cldr` the way they already mark list joiners. Not yet tested: a pinned **non-English record**. None exists yet (the clause-level session is collecting one), and the organs are medium-blind (their refusals are typed codes, never prose), so it should only need a replay.

What the three terrains **say** changed:

- **Kind.** Before: "Four groups of figures…; the largest joins Daylight Saving Time and Standard Time (30 claims)". After: one group holds, "Clinical Sleep Medicine, European, and World" (nine claims), and the NUL cell says that of two groups found, one holds.
- **Atmosphere.** Before: "seven periods" by month. After: page by page, six pages brought wording the pages before them did not predict, two (witness.usatoday.com, fox29.com) kept closer to it than chance, and the first two had nothing before them. Taken whole, the wording shifts once, at aasm.org (October 31, 2023), after the two Wikipedia pages.
- **Paradigm.** Before: two camps split on dominant facet. After: one camp of 7 pages, centered on the Sunshine Protection Act and Daylight Saving Time; the other 3 (aasm.org, usatoday.com, savestandardtime.com) stand apart. `mergeTestimony` finds no DISAGREE (94 SINGLE, 35 SINGLE-with-differing-rivals). Callimachus's own `standing` field is kept for SYN·Pattern and the claim sheet.
- **Answers**, as four corners: "Should the US…?" **is** at every stage. "Who opposes…?" and "When did the House pass…?" **both** (`no_margin`). "Did the Senate pass the bill?" **both** at the line, **is** from the paragraph up. The Spanish "¿Quién se opone…?" **is**.

**Falsified, and fixed by a measured null (the population null).** The adapter's negative control, structureless co-arrivals of 30 figures, showed that `terrainInduction` **and** `testKindMembers` both pass a near-whole-population basin (28–29 of 30) on **4 of 8 seeds**, plus 2–3-figure loner kinds on 2 more. Both nulls compare a basin only with random subsets of the same population, and noise still has a best basin. The guard calls the same organ on the population with its feature values shuffled (each unit keeps its arrival count and each value its frequency), and tells a kind only when its binding energy beats the 95th percentile of the best held energy across 19 shuffles. Measured, seeds 1–8:

| | false kinds on noise | planted groups (two of 8, in 30) recovered |
|---|---|---|
| without the population null | 4/8 seeds | 8/8 seeds, both groups every time, plus spurious small kinds on 2 |
| with it | 0/8 | ≥1 group on 6/8 seeds, both groups on 5 |

On `permanent-dst` the population null refuses the 29-figure "group" (binding 0.154 against a bar of 0.211). That is the before-telling's "largest" group, now shown to be the noise shape. It keeps the four sleep-medicine figures (0.314). The page camp clears narrowly (0.343 against 0.326).

**Feature sets, disclosed rather than chosen.** Co-arrival is declared once, because it is the relation THE-27-CELLS.md records for SIG·Pattern's own use and the one the stand-in measured. With the population null on `permanent-dst`: `with` (co-arrival) holds 1 kind. `page`, `acts`, `with+acts` and `with+page+acts` hold none.

**Organ inputs that did not match, and their adapters:** figures and pages become `terrainEvidence` rows (unit, feature, value, sequence = the atom's place); the record's pages, joined in publication order, become `atmosphereBoundaries`'s body, and its regions are mapped back to each atom's byte offset (`a.ground_id`); a claim's chains become `mergeTestimony` readings.

## 11. Clause segmentation before the claim is read (2026-10-14, session `eaadca`)

**Goal:** raise how many witnessed claims get a lawful, read-back, net-new paraphrase from `claim-realize.js` (level 2, no model). On the 12-claim sample in §5, 7 refusals were parser misreadings: a predicate hung on a noun or a number, "bill" tagged AUX, a fronted date made the root.

### 11.1 What was built

| Piece | Where | Giver |
|---|---|---|
| **Attested tags.** A tag is admitted for a form only when UD English-EWT attests that form with that tag; an unseen form keeps every class. Two scopes: `closed` (the UD closed classes ADP AUX CCONJ DET PART PRON SCONJ; NUM is excluded because digit numerals are productive) and `all` (every class, a tag dictionary). Additive: `tagSentence` and `analyse` are unchanged. | `adapters/text/english-parser.js` `tagSentenceAttested`, `analyseAttested`, `parseText({ attested })` | UD v2 u/pos (closed classes); the treebank's own lexicon |
| **Which scope the claim reader uses** is decided by measurement (§11.2), not by assertion. | `claim-realize.js` `readRows`, `READ_SCOPE = "all"` | `scripts/eval-attested-tags.mjs` |
| **Clause segmentation.** See the list below this table. | `claim-realize.js` `segmentClauses` | CMOS 6.22, 6.25, 6.26; UD v2 cc/conj, SCONJ, mark; EWT PronType |
| **Each clause parsed alone.** A fronted adjunct is parsed alone too, then hung on the predicate as an oblique. | `readClause` | CMOS 6.25 (it modifies the clause it introduces) |
| **Two parses agree.** A clause reading is accepted only where the whole-sentence parse and the clause parse give the predicate (same token, same lemma) the same arguments: nsubj, obj, iobj, ccomp, xcomp, csubj and obl, over the same bytes inside the clause. This is an agreement check between **two readings of one giver**. It is *not* a second witness: the independent witness is still `relations.js` (§6, Pearl). | `readClause`, `argsKey` | the user's two-witness rule, applied as a check |
| **A subordinate predicate is not asserted.** The witness's predicate sitting in a subordinate or fronted subordinate clause is refused, typed. A predicate carrying a `mark` dependent ("has yet *to* take") is refused too. Before this, "If the measure ultimately passes both chambers…" came out as "Both chambers are passed by the measure." | `readClause`, `claimFromRows` | UD v2 mark |
| **The verb group.** When relations.js names an auxiliary ("Sleep experts *have* opposed…"), the claim anchors on its lexical head; the witness agrees if it names the head or one of its auxiliaries. A copula's head is nominal and is still refused. | `readClause`, the witness check in `realizeClaim` | CGEL ch. 3 (auxiliary + lexical head) |
| **Passive keeps the auxiliary chain.** A modal is copied with its address ("could be created"). The perfect is re-agreed ("experts have opposed the idea" → "the idea has been opposed by experts"), or copied bare after a modal. Progressive and do-support chains get no passive. An object that holds its own subject is a clause, and gets no passive. | `englishAlternations` | CGEL ch. 3 §2 (auxiliary order), ch. 11 |
| **Omission ledger.** Every content word of the sentence that no copied segment carries is accounted for. See the list below this table. | `omissionLedger`, `checkDisclosure` | UD v2 core arguments; EWT Polarity/PronType=Neg; compound:prt |
| **Moved spans read back inside their clause.** A moved adjunct may hang on the predicate or on one of its nominal arguments (that is the reader's PP-attachment ambiguity, and stays licensed). It may not cross a clausal relation (acl advcl ccomp xcomp csubj parataxis, or a conjoined predicate). | `movedReadBack` (part of reverse equate) | the reverse equate's own contract: "the same argument bytes in their new roles" |
| **The according-to read-back.** It now checks that the report's own head reads back as the root, and as the root when the report is parsed alone. The head need not be a verb: a copular report ("would be more beneficial") is a clause. | `reverseEquateRoles` | UD v2 cop |
| **CASE.** A pronoun after a frame preposition ("by", "according to") must not be nominative, but only where English has a distinct accusative: an EWT lemma with another Case=Acc form (he/him, they/them). "By it" stands. | `formLaws` | CGEL ch. 5 §16.2 |
| **PAIRS.** A copied segment holds its brackets and parentheses in pairs ("[ 69" refused). | `formLaws` | CMOS 6.95, 6.101 |
| **ROLES** (optional `roles`). A passive whose new patient the record itself attests as the doer of the same lemma is refused. "It passed the Senate" uses a path object; "The Senate was passed by it" reverses an attested role. | `roleLaw`; the measure script builds `roles` from every relations.js subject in the record | the record |
| **Positional capital.** A moved span is case-folded only when its capital was positional: after only non-letters ("[ 10 ] It"), at a line start, or after a colon. A capital anywhere else belongs to a name and stays. | `partsToSegs` | CMOS 6.63 |

The segmentation cuts, read off the whole-sentence parse:
- **Fronted:** comma-delimited segments at the head of the sentence. A verbless one with no subject is an adjunct ("On July 14, 2026"). One opened by a subordinator is a subordinate clause.
- **Coordinate:** a CCONJ between two stretches that each hold a predicate, after a comma or as the parse's cc of a predicate.
- **Subordinate:** an SCONJ, a wh-word, or a `mark`, after a comma or as the mark of an advcl or acl.
- **Never cut:** a complement clause (ccomp, csubj, xcomp is an argument), or anything inside quotation marks (opaque).

How the omission ledger decides:
- A dropped **core argument** of the predicate is **refused**.
- A dropped **negation** in the clause is **refused**.
- A dropped **phrasal-verb particle** is **refused**.
- Anything else is **disclosed** as `omitted`, each with its byte address. Within the clause, the unit is a contiguous run of a dropped subtree. Outside it, the unit is the whole other clause or fronted segment.
- Before this, "yet for ending the twice-yearly clock change" was dropped silently.

Every earlier gate is kept unchanged:
- the independent witness;
- logos at the clause;
- the prose laws;
- bytes re-verify;
- reverse equate;
- anchors;
- logos within arguments;
- net new.

### 11.2 Measured: the attested-tag scopes, held out

`node native/scripts/eval-attested-tags.mjs --gold …/en_ewt-ud-dev.conllu --gold …/en_ewt-ud-test.conllu`. This is the official dev and test splits: 4,078 sentences and 50,243 words the tagger never trained on. Gold tokenization is fed to every arm. The null is a paired sign-flip over sentences; only the draws (999) and the seed ("attested-tags") are declared. (The fixtures sit untracked in the main khora checkout: `native/eval/fixtures/ud-english-ewt/`.)

| Arm | UPOS | UAS | LAS |
|---|---|---|---|
| plain tagger | 93.75 | 79.54 | 74.68 |
| closed classes held to EWT | 93.81 | 79.60 | 74.77 (vs plain p = 0.005) |
| **every class held to EWT** | **94.39** | **79.87** | **75.23** (vs plain p = 0.001; vs closed p = 0.002) |

The every-class arm changed 1,225 tags: 716 are now right, and 396 that were right are now wrong. It is still the measured winner, so it is what the claim reader uses.

### 11.3 Measured: the DST record, before and after

`node native/scripts/claim-realize-measure.mjs --out 3.0/callimachus-runs/permanent-dst`:
- It replays all 10 pages from `layers/` exactly as `callimachus-run.mjs --replay` does; each must reproduce its pinned sha256 or the run stops.
- It sends **every atom with a relations.js witness** through `realizeClaim`, one call per (sentence, predicate, subject) position: **560 positions**.
- "Before" is the same script against `callimachus/paraphrase` @ `2255241b`.

| | Before | After |
|---|---|---|
| **Paraphrased** (≥ 1 alternative passed every gate), all 560 positions | **25** (20 distinct sentences) | **41** (37 distinct sentences) |
| Paraphrased, subject an admitted referent (149 positions) | 14 | 20 |

Movement between the two runs: 11 kept, 14 lost, 30 gained.

What the 14 lost were, each now refused by a named gate:

| Refused output | Now refused because |
|---|---|
| "Both chambers are passed by the measure." (×2) | the "If…" clause is not asserted |
| "By unanimous consent, it passed." (×2) | it is a "when…" clause |
| "A version was introduced by Scott of the bill last year from both parties." | a "When…" clause |
| "He told in 2025." (×2) | a core argument was dropped |
| "In a statement, she said." | a dropped negation inside the quotation |
| "…Substitute House Bill 1196, [ 69 in 2019." | PAIRS |
| "The Sunshine Protection Act was passed by house." | logos |
| "Resolutions were passed … to abolish the annual transitions in the late 2010s." | the moved adjunct reads back inside an acl |
| "The House passed a bill … to eliminate the clock change in July." | read back |
| "Laws were passed by 19 states." | a core argument was dropped; an over-refusal, kept as conservative |

**Refusals by group**:

| Group | Before | After |
|---|---|---|
| logos at the clause (predicate hangs on a non-predicate) | 241 | 101 |
| relations.js and the parser disagree | 162 | 6 |
| the witness's predicate is not read as a verb | 89 | 230 |
| predicate in a subordinate clause (new) | — | 58 |
| an alternative was built and a gate refused it | 19 | 47 |
| no alternation applies | 20 | 45 |
| the sentence and clause parses disagree (new) | — | 17 |
| a predicate carrying a mark (new) | — | 8 |
| no EWT participle | 4 | 7 |

The full per-reason tallies print from the script.

Reading the after column:
- Most of the 230 "not a verb" refusals are **relations.js naming a non-predicate**: "is" (73), "more", "by", "bill", "or", "law", "year".
- Most of the 101 logos refusals are **copular clauses**: a cop on an ADJ or NOUN (54). No copular alternation is built.
- Neither is a parser misreading. Both are the next places to work (§11.6).

**The §5 sample** (`paraphrase.html` shows 11 witnessed positions; the "5 of 12" in §5 counted the 2022 Senate sentence's two passing alternatives separately) is 4 positions paraphrased before and the same 4 after, but its refusals moved:
- **"On July 14, 2026, the House passed a … bill backed by President Trump."** The clause is now read right: "bill" is a NOUN, the fronted date is re-joined, and the two parses agree. Both alternatives are refused at read-back, correctly: "…bill backed by President Trump on July 14, 2026" re-scopes the date onto *backed*.
- **"Sleep experts have opposed the idea…"** It is now anchored on *opposed* and gets the perfect passive. It is refused because the read-back parses "Saving" (in Daylight Saving Time) as a verb.
- **"Opponents … argue …"** "argue" is a VERB now (every-class attestation). The according-to is refused because the read-back makes "opponents" the root.

Paraphrases gained, for example:
- "Since 1915, DST has been supported by the Chamber of Commerce."
- "The idea has been approved by the Senate so far."
- "According to others, mornings are more important, especially for schoolchildren and workers who start their day early."
- "Until 1918, the United States did not adopt it."
- "Bipartisan support has grown in recent years." [omitted, with address: "for ending the clock changes altogether"]
- "The bill was approved by the House by a bipartisan 308-117 vote, one of the strongest congressional showings." [omitted: "yet"; "for ending the twice-yearly clock change"]

### 11.4 Still wrong among the 41 (read by hand, not hidden)

| Output | Why it is wrong |
|---|---|
| "The semiannual clock changes result in …, and … resulting in more health problems and traffic accidents has been shown by studies." | **Both** parses tag "result" as NOUN, so the clause reads as one object. The agreement check is two readings of one giver and cannot catch a shared misreading (Pearl, again). |
| "Their clocks will be set by Americans by one hour." [omitted: back] and "Their clocks will be set by Tennesseans back an hour." | The particle of *set back* is not labelled `compound:prt` by the parser, so the particle law cannot see it. |
| "For early 2025 that includes legislation for permanent standard time, a bill is planned." | The relative clause is hung on "2025" in both parses. |
| "Senate leaders have not committed however." and "DST has been expanded … additionally." | A one-word connective moved to the end without its comma. Lawful, but poor. |

### 11.5 Tried and falsified, or corrected

| What | Measured | Outcome |
|---|---|---|
| Clause segmentation alone to fix "bill" AUX | Parsed alone, "the House passed a Sunshine Protection Act bill backed by President Trump." still tags *bill* AUX | Segmentation does not fix tagging. The attested-tag constraint does. |
| Moved span must hang on the root (or the patient) when read back | Refused "The bill was passed by the Senate in 2022 by unanimous consent." (stacked PPs: "by unanimous consent" hangs on "2022") | Too strict: PP attachment among the clause's own arguments is the reader's ambiguity. Replaced by "no clausal relation crossed". |
| CASE on every Case=Nom pronoun | Refused "by it": the lexicon keeps only the first feature set per form, and "it" is listed Nom | Restricted to lemmas with a distinct accusative form. |
| ROLES keyed by surface form | "must pass the Senate" slipped through, because "pass" ≠ "passed" | Keyed by EWT lemma. |
| Two-parse agreement as a witness | The shared NOUN reading of "result" passes both | It is a check, not a witness. The independent witness stays relations.js. |

No new hand-set threshold was added. The tag scope was chosen by the held-out null (§11.2). Every cut is a closed class or a punctuation convention with a giver.

### 11.6 Open, next

- **relations.js names auxiliaries, copulas and nouns** as predicates (230 refusals). Feed it the attested tags, or have it name the lexical head.
- A **copular alternation** ("X is Y" → "Y is what X is"; or "According to X, …" for evaluative copulars) would take on the 54 cop refusals.
- **Garden paths in the read-back:** "N backed by X was passed by Y". The read-back could use the same segmentation and agreement as the source reading, instead of one whole-sentence parse.
- **Particles the parser does not label**, and connectives moved without their comma (§11.4).
- `readClause` wiring into the answer ladder, with `roles` built from the record, as the measure script does.

### 11.7 How to run

```bash
node native/scripts/claim-realize-measure.mjs --out 3.0/callimachus-runs/permanent-dst [--show N] [--json FILE]
node native/scripts/eval-attested-tags.mjs --gold <en_ewt-ud-dev.conllu> --gold <en_ewt-ud-test.conllu>
node --test native/organs/claim-realize.test.mjs
```

## 12. The house clause layer, elevated; and the same layer in another language (2026-10-14, session `eaadca`, amendment)

The user, on §11: "we've done clauses better before, elevate that" and "test it omnilingually". §11's own `segmentClauses` is **retired**. `claim-realize.js` now cuts clauses with the house clause layer, `adapters/text/clause-spans.js` (2026-09-23). Its `segmentClauses` export is a thin adapter over `clauseSpans`.

### 12.1 What `clause-spans.js` gained

All of it is additive. Existing callers (`relations-gfp.js`, `gfp-relations-composed.js`, `received-vocabulary-relations.js`) pass no options and see one change only: gap 2.

| Change | What it does |
|---|---|
| **Gap 2 closed: the fronted clause.** | A sentence-initial subordinator-opened segment ends at its comma ("Because it rained, \| the match…"). The main clause after it is the root, and the fronted clause carries `fronted: true` with the main clause as its parent. With `opts.posPrior` or `opts.rows`, a fronted **adjunct** is cut too. Its test: a verbless comma segment while the rest holds a predicate. Its opener: ADP, ADV, NUM or a digit by the prior, or, by the parse, nothing in it is the rest's subject. "On July 14, 2026, \| the House…" is cut; "The bill, the House said, passed." is not. |
| **`opts.posPrior`** | A token is a predicate when its dominant tag is VERB or AUX. This licenses the fronted adjunct and a **coordinate cut after comma + coordinator** when the stretch after it holds a predicate. Pro-drop languages need this: no subject pronoun follows "y". |
| **`opts.rows`** (a UD parse) | Every cut needs the closed class **and** the parse: two witnesses for a cut. A complement clause (ccomp, csubj, xcomp) is never cut. "after" tagged ADP ("repealed after two years") is not a subordinator. A coordinator cuts after a comma, or as the cc of a conjoined predicate, with a predicate on both sides. |
| **Gap 1, "that", with a parse** | "That" cuts when the parse makes it the mark of an advcl or acl, or a relative pronoun. Without a parse it stays excluded (§12.3 measures why). |
| **`opts.opaqueQuotes`** | No cut inside paired quotation marks. |
| **`closedClassesFromPrior(posPrior)`** | A language's coordinators (CCONJ-dominant forms) and subordinators (SCONJ-dominant), **derived** from the received UD POS prior `priors/pos-<iso639-3>.json`, with the prior's own giver. Relativizers and subject pronouns come back **empty, and it says so**: a POS prior has no PronType. Spanish (UD_Spanish-AnCora, train split) derives coordinators *y pero e o i sino ni u ó ou* and subordinators *como pues mientras aunque si cuando porque*. |

### 12.2 Measured: clause boundaries against an independent witness, in two languages

`node native/scripts/clause-witness-agreement.mjs --out <record> --lang eng|spa [--parser] [--verbal] [--add-sub that|que]`:
- The script is language-neutral. It replays a pinned record from `layers/`.
- The witness is relations.js, as stored on each atom: the stretch from its subject's start to its predicate.
- **Witness agreement** is the share of those stretches that no clause boundary cuts.
- The **null** re-deals the same number of boundaries per sentence uniformly over the sentence's word starts (999 seeded draws; seed "clause-witness"). Only the draws and the seed are declared.
- `--verbal` keeps only witnesses whose predicate is VERB- or AUX-dominant in the language's own POS prior. relations.js also names prepositions and stray English words as predicates, especially on the Spanish pages.

The **Spanish record** is `3.0/callimachus-runs/cambio-hora-es`:
- Question: "¿Debería la Unión Europea eliminar el cambio de hora estacional?"
- Collected with `callimachus-run.mjs --search 10 --url es.wikipedia.org/wiki/Horario_de_verano --lang es`, then replayed.
- 8 pinned pages: es.wikipedia, cadenaser, rtve, eldiario, hosteltur, baenegocios, economiadigital, diariodesevilla.
- 4 absences: El País ×2 and the Council of the EU answered 403; one Wikipedia page was 404.
- 444 atoms.

| Record | Mode | Boundaries (fronted) | Witness agreement | Null | p |
|---|---|---|---|---|---|
| **eng** DST, 560 stretches | bare (priors.js) | 283 (27) | 95.2% | 93.3% | 0.026 |
| | + POS prior | 385 (93) | 95.2% | 90.5% | 0.001 |
| | + UD parse | 478 (106) | 95.0% | 88.1% | 0.001 |
| **eng**, verbal witnesses (332) | bare / prior / parse | 216 / 300 / 359 | 99.4 / 99.4 / 98.2% | 93.1 / 89.5 / 87.3% | 0.001 each |
| **spa** cambio de hora, 418 stretches | bare (derived from AnCora) | 225 (7) | 98.1% | 92.3% | 0.001 |
| | + POS prior | 320 (87) | 98.1% | 89.1% | 0.001 |
| **spa**, verbal witnesses (199) | bare / prior | 130 / 198 | 97.5 / 97.5% | 91.7 / 88.1% | 0.001 each |

In both languages, each mode finds more boundaries than the one before it while witness agreement holds. The null falls as boundaries are added, so the margin over chance grows.

**There is no Spanish parse arm.** There is no Spanish parser on disk: `pos-spa.json` is a tag-count prior, not a treebank. So the two-parse agreement of §11 cannot run in Spanish, and witness agreement is the agreement available there.

### 12.3 Falsified: gap 1 by the prior alone

Arm `--add-sub that|que`: the excluded form is added to the subordinators.

| Language | Boundaries | Witness agreement | Null | p |
|---|---|---|---|---|
| Spanish *que*, all witnesses | 544 (from 320) | 84.7% (from 98.1%) | 82.5% | **0.081** |
| Spanish *que*, verbal witnesses | 364 | 79.9% | 79.7% | **0.52** |
| English *that*, all witnesses | 488 (from 385) | 94.5% (from 95.2%) | — | still beats the null |
| English *that*, verbal witnesses | — | 98.5% (from 99.4%) | — | still beats the null |

- **Spanish "que" as a closed-class boundary is falsified.** Its cuts are indistinguishable from random ones.
- **English "that" costs witness agreement in both subsets.** It stays excluded without a parse.
- The module's 2026-09-23 judgment was "too close to a three-way split to trust". It is now a measurement: pos-eng gives *that* SCONJ 994 / PRON 851 / DET 176, and AnCora gives *que* PRON 6,859 / SCONJ 6,348.
- With a parse, "that" is decided per token (§12.1).

### 12.4 Paraphrase yield, per language

**English (DST record, 560 witnessed positions, `claim-realize-measure.mjs`):**

| | Paraphrased | Distinct sentences | Referent subjects |
|---|---|---|---|
| §11, own segmentation | 41 | 37 | 20 |
| **with clause-spans.js** | **51** | **42** | **23** |

The before was 25 (§11.3). Of those 25, 12 still pass and 13 are refused by §11's gates.

Gained over §11, for example:
- "The Florida Senate approved the Sunshine Protection Act in 2018."
- "According to Scott, he hears from constituents."
- "The House passed a bill with bipartisan support in July." (its relative clause disclosed as omitted)

Still poor, all lawful:
- "From Trump, the measure has backing."
- "By both chambers in these states, none have yet been agreed." This is a faithful but marked fronting of the source's own passive agent, after the `;` cut clause-spans makes.

**Spanish: 0 of 418, every one refused with one typed reason.** A Spanish claim paraphrased in Spanish needs three things, none on disk:
1. A Spanish UD treebank, to parse the clause and to attest verb forms (participles, and the person and number forms of *ser* and *haber*). UD_Spanish-AnCora is the giver of `pos-spa.json`, but only its tag counts are on disk, not the treebank.
2. Spanish alternations with their givers: the periphrastic passive ("fue aprobado por"), the reflexive passive ("se aprobó"), "según X, …" for reports, and clitic doubling when an object is fronted.
3. Spanish prose laws: PL3 and PL4 are English conventions.

An English claim told in Spanish would also need a bilingual lexicon. What already works in Spanish today, with no new data:
- the clause layer (§12.2);
- the relations.js witness;
- the record, telling and answers.

### 12.5 How to run

```bash
node native/scripts/clause-witness-agreement.mjs --out 3.0/callimachus-runs/permanent-dst --lang eng --parser [--verbal] [--add-sub that]
node native/scripts/clause-witness-agreement.mjs --out 3.0/callimachus-runs/cambio-hora-es --lang spa [--verbal] [--add-sub que]
node native/scripts/claim-realize-measure.mjs --out 3.0/callimachus-runs/cambio-hora-es --lang es   # 0: the typed refusal
node --test native/adapters/text/clause-spans.test.mjs native/organs/claim-realize.test.mjs
```

## 13. The reader as the second operand: the twin-reader experiment (2026-10-14)

The question, from the user's essay *The Prompt Is a Crease*: is the reader-state corpus W the second operand of every fold? If so, salience, novelty and the DMD boundary are relations between the universe and W, not properties of the source. Pre-registered in `eval/callimachus/TWIN-READER-PREREG.md` (commit `68f652ff`). The mechanism and the harness were frozen in `f4ac1238`, before the run. Results are in `eval/callimachus/twin-reader.results.json`. W's bytes are not committed; only their sha256s are.

### What was built

| Where | What |
|---|---|
| `organs/whom.js` (new, pure) | `readWhom(pinned)`: W is bytes. Its files are pinned with `makePinax` under `whom:<name>`, and its units are blank-line blocks in thread order, each addressed into W's own text layer. `VOID_READER` is W = ∅. Also `heldIn`, `sentenceHeld`, `restrictWhom` and `seamsOf`. |
| `organs/answer-ladder.js` | `whom` option. A candidate whose span bytes W holds is **held**: surprisal −log2 1 = 0, so it leaves the population and is dropped with its W address. Every witness's base rate becomes the share among what is new to this reader. The question-word witness also counts W's units in its document frequency. The margin null is drawn over the same population, and a told cell sentence W holds is not told again. If every candidate that carries the question is held, the void is *held* (construction `already_held`, en + es), which is different from empty. |
| `organs/claim-realize.js` | **Net new** for a reader: the null is the source clause **plus W**. `novelty.newForWhom` and `novelty.heldByWhom` are reported. |
| `scripts/callimachus-run.mjs` | `--whom PATH` (repeatable, local files only). `folds.json` holds per ask: **seam density per stage, reported first**, the crease, the reader's drops, and the **DMD window over W**. That is `dmdWindow` with the thread's units as observations and the fold as the conclusion: the shallowest depth of recent thread that reproduces the whole-W fold. `--replay` now reuses the pinned fixity (the drive-eval fix). |

With W = ∅ every measure reduces to the source-relative one, and `answers.json` keeps its exact bytes. Seams and the reader go in `folds.json`, never into the answer.

### Results: `permanent-dst`, "When did the House pass the Sunshine Protection Act?"

There are 387 candidates, 59 of which carry "House" or "Senate". The dense W is one turn plus those 59 sentences (60 units). It held 61 candidates, because two quote spans sit inside held sentences.

| | prediction | result |
|---|---|---|
| P1 | the folds differ | **holds** |
| P2 | the dense reader's lead is absent from their W | **holds** at all three stages (a check of the byte test, as registered) |
| P2b | the dense line still answers: a content witness and `admits` | **holds as registered**, but see the caveat below |
| P3 | the far reader's brief is more structural than the near reader's | **falsified**: void 5/10 = 0.50, dense 5/8 = 0.625 |
| P4 | W = ∅ is today's output, byte for byte | **holds**: all 8 files, all 5 asks, en + es, for both no `--whom` and an empty `--whom` dir, against base `3b084a80` + the replay hunk |
| P5 | crease movement beats re-dealt W | **holds**: d = 0.5625 against a null max of 0.2857 (19/19 draws; 7 draws moved it 0) |
| P6 | B reads A's fold, asks again: the fold changes again | **holds**: d = 0.9412 against a null max of 0.1538 (19/19); B's lead is not quoted in A |
| P7 | a function of W | **holds**: two dense runs are byte-identical in `answers.json` and `folds.json` |

**The three lines:**
- **void**: "On July 14, 2026, the House passed a Sunshine Protection Act bill backed by President Trump." (en.wikipedia.org)
- **dense**: "The Sunshine Protection Act was first introduced in 2018 by U.S." The lead moved to Opponents… at the paragraph.
- **B**: "In July, the House passed a bill with bipartisan support…" (time.com). This is a House-passage claim the void reader was never shown.

**Reported, not predicted:**
- **DMD window.** Dense: 45 of 60 units. The oldest 15, the turn and the first 14 shown sentences, make no difference to the fold. B: 10 of 14.
- **Seam density** (seams per word, line/paragraph/brief):

  | reader | line | paragraph | brief |
  |---|---|---|---|
  | void | 0.154 | 0.115 | 0.138 |
  | dense | 0.182 | 0.126 | 0.160 |
  | B | 0.077 | 0.099 | 0.108 |

  B's fold is the most copied: 132 of 185 brief words are source bytes. No arm has a `self:model` word: no mouth is in this path.
- **The chain.** C reads B's fold and asks again, and gets A's fold back exactly: a **2-cycle**. A reader who holds only the last fold oscillates between two creases. To walk forward, a reader must accumulate, so W must be the thread, not the last answer.

### Falsified, or weaker than it looks (do not over-read these)

- **P3, the scalar-distance reading of "near gets a figure, far gets a ground", is falsified.** The dense reader's brief is *more* structural, because its W held figures (59 single claims) and no ground. B's W held the void fold's ground sentences (tension, release), and B's brief came out 1 structural to 5 figures. Post hoc, unregistered: **what W holds decides which grain comes back. The reader gets the grain it lacks**, not the grain its distance predicts. Distance is not a scalar here. It is per grain. This needs its own pre-registration before it is claimed.
- **P2b passes its letter, not its spirit.** The dense line carries a date (`admits`) and the Act (anchor), but it tells *when the Act was introduced*, not when the House passed it. Every House-passage claim is held, so the honest answer for this reader is "you already hold that". `already_held` fires only when **no** candidate carries any witness. The ladder has no notion that the question's *relation* is exhausted while its anchor is not. Also, the line's sentence is cut at "U.S." by the sentence splitter, a defect older than this work.
- **P2 is guaranteed by construction** (held candidates leave the population). It tests the byte test, nothing more.
- **One universe, one question.** The passes are an existence proof that W moves the crease and that the movement follows what W holds (P5, P6 against re-dealt W). They are not a rate.

### Hand-set constants this adds (for §7)

None in the mechanism: held is exact containment, and base rates are −log2(share). In the experiment: 19 null draws (the fewest for p ≤ 0.05), "most" of the House/Senate material taken as all of it, and the chain capped at 20 steps (it stopped at C).

### Open

- **Relation exhaustion.** Make the void *held* per declared slot, not only as a whole. If every carrier of the question's relation is held, the line should say so rather than fall to an anchor + date. Pre-register first.
- **Grain-wise distance.** Pre-register "the reader gets the grain it lacks" on another universe and question, with W built to hold only ground versus only figures.
- **Accumulating readers.** W = thread + every fold shown, and its trajectory against the 2-cycle.
- `realizeClaim` is still not wired into the ladder, so the W-relative net new is exercised only by its unit test.
- The dossier (stage 4, the 27-cell telling) is not yet folded for the reader. It stays the catalog.

## 14. Added on `callimachus/shape`: holdings, seams and the grain (2026-10-14)

Written after the user's essay "The Prompt Is a Crease". The design is in `CALLIMACHUS-SHAPE.md` ("For whom", "The fold as a function", "Grain", Step 0). What landed in code, none of it wired into `answerLadder` (the ladder's `whom` option belongs to the twin-reader branch, agreed 2026-10-14):

| File | What it does |
|---|---|
| `organs/holdings.js` | `declareHoldings`: what a whom already holds, as claim keys. A placeholder giver ("the asker") and an omitted `told`/`seen` are refused; an empty one is a declared first contact. `kind` may be a person, institution, statute, document, past self, or `void` (the catalog pole). `distanceOf`: share of touched claims never told / never shown. `partitionByHoldings`: fresh vs `held`, typed. `claimsOfWhom`: W's pinned units read by the claim reader as W spans. |
| `organs/seam-ledger.js` | `seamReport`: bytes by kind, addressed share, seam density, mouth share, each seam with the spans it joins, and a contract verdict. `creaseEntry` and `untouchedBy`: the ledger's entry and the holdings-provenance check; no store. |
| `organs/grain.js` | The grain: `splitRegion` (held / absent, with the predicate-shuffle null), `selectGrain` (Ground / Figure / Pattern), `contactVerdict` (`mergeTestimony` across U and W), the nine cells (Clearing runs first at every grain; only the generating cell may carry a seam), `foldGrain` (selection, contacts, the cells in order, closure, `selectorUnreadable` falls back to Ground). |

Open, in addition to §8: the ordering-not-dropping ladder arm is withdrawn (history only) pending a pre-registration as a rival to twin-reader's; no grain arm in the twin-reader harness; nothing builds holdings from earlier tellings; no ledger store; H1–H4 in `CALLIMACHUS-SHAPE.md` are unmeasured.

Tests: `node --test native/organs/{seam-ledger,grain}.test.mjs`.
