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
| after, es | 24 | 1 | 1 | 1 | 28 | 28/28 | 33/33 |

No cell changed status. What the three terrains **say** changed:

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
