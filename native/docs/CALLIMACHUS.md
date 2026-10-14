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
| The telling | `organs/cube-telling.js` | All 27 `op·grain` cells (`kernel/cube.js` `cellOf`), each **voiced**, **silent**, **gap** or **desert**. Cells emit **language-neutral propositions**; `realizer()` resolves the slots and the grammar realizes them. Kind, Atmosphere and Paradigm are declared stand-ins (§6). |
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

1. **Perception** → the **line**. The witnesses are anchor, actor (the figure is the relation's subject: CON·Link), admits, relation, and the question's words, each weighed by its own surprisal. **Admits only counts once a content witness binds the claim**: a date alone answers no "when". A zero-evidence question is refused (`below_floor`), not filled.
2. **Logos** → the **paragraph**. The witnesses are chains (log2), agreement, a named speaker (counted once), and `logos()` claim cycles. `kernel/contest.js` `adjudicate` decides whether the lead binds, against **margins from a seeded permutation null**. If it doesn't bind, both readings are shown.
3. **Pathos** → the **brief**. The experiencer is declared (`organs/experiencer.js`). `strainOf` sets how many sides to show, camps are balanced, and `pathosOf` rhythm (Murch) re-picks a flatlined draft. The order is: lead first, then the tension (where pages differ), then the other sides, then the release (what holds).
4. The **dossier** is the whole 27-cell telling. The **claim sheet** is every atom.

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
| `ATTITUDE_ALPHA=0.01` | callimachus.js; also used by cube-telling Kind |
| `QUOTE_FRAME_WORDS=3` | callimachus.js |
| `INCIPIT_BYTES=64`, `SPAN_EDGE_BYTES=16`, `ADDRESS_HASH_HEX=12` | pinax.js; identity aids, not gates |
| `minActivation: 1`, `contestedMargin = max(p95, p99)` | answer-ladder.js; the p-levels are conventions |
| Brief sides 3/5, speaker caps (8, 3, 2, 1), alternative caps (12) | answer-ladder.js, cube-telling.js |
| PL12 at 35 words | prose-laws.js |

Each one should be replaced by a measured value from a null over the material, with only its draws and seed declared.

## 8. Open work

- **Kind, Atmosphere, Paradigm** in the telling are stand-ins. Wire them to the registered cell organs listed in `docs/THE-27-CELLS.md`: `kinds`/`kindnull` (now `kernel/terrain-induction.js`, on branch `terrain-induction`), `atmosphere`, `regime`, `standing`, `rezero`, `reshape`.
- **Cross-language referents**: `identity-induction.js` ("same thing, for someone, when the universes folded on them match beyond a null") plus `qidBridge` with non-English titles.
- **Paraphrase in other languages** needs a bilingual lexicon (or the question's own language as the record's), plus a UD treebank per language for its parser and forms.
- **Void verdicts** in lenses should use the four `hl.js` values (§1). The ladder's `below_floor` is the "gap" (neither) corner.
- Wire `realizeClaim` (level 2) and `repairSentence` (level 3) into the answer ladder's lines, beside the verbatim snip.
- The **Spanish grammar** needs a native speaker's review.

## 9. How to run

```bash
node native/scripts/callimachus-run.mjs --question "…" --search 10 --url <seed> --out <dir>
node native/scripts/callimachus-run.mjs --question "…" --replay --lang en,es --ask "…" --ask "…" --out <dir>
node --test native/organs/{pinax,callimachus,cube-telling,answer-ladder,claim-realize,mouth-repair}.test.mjs
```

Live repair needs the mouth channel on `:11434` with `gemma2:2b`. Without it, level 3 reports "no mouth reachable" and changes nothing.

## 10. Measured against the-fold's no-model drive test (2026-10-14)

Pre-registered in `native/eval/callimachus/PREREG.md`, which was committed and pushed before any eval prompt ran. Full results are in `native/eval/callimachus/RESULTS.md`.

**The setup.**
- The prompts are the-fold `eval/modelless`'s 48 answerable ones (compute, slot, holder, compound, follow-up, multilingual), with its gold regexes.
- Collection is round-0 DuckDuckGo at `--search 10`, pinned, and answered by `--replay` from the pins.
- The arms are the ladder's line, paragraph and brief. There is no model in any arm.

**The bars.** B1: confident wrong = 0, as in the baseline. B2: committed correct ≥ 10, against the baseline's 9 of 48.

**Result: no arm passes, in any of three live collections.**

| arm | committed correct (A / A-fix / B) | confident wrong (A / A-fix / B) |
|---|---|---|
| line | 5 / 5 / 6 | 28 / 33 / 32 |
| paragraph | 0 / 0 / 0 | 3 / 3 / 2 |
| brief | 0 / 0 / 0 | 3 / 3 / 2 |

- Of the line's 5 correct leads in A, only 2 answer the question; the other 3 carry the gold string while saying something else.
- Gold is in the paragraph's copied bytes on 22 to 24 of 48 records, so the loss is in the reading, not only in retrieval.

Falsified, with the specimens in RESULTS.md:
- **Perception, as built, picks claims about the figure, not claims that fill the slot.** Anchor, actor and words reward naming the question's figures. Nothing asks whether the claim puts a filler of the admitted kind in the open position of the asked relation. Example: "Who is the US president?" → "The president of the United States (POTUS) is the head of state…".
- **The `words` witness rewards restating the question.** Example: Spanish capital of Australia → "…la respuesta más habitual es Sydney o Melbourne."
- **`candidatesOf` admits interrogatives as claims**, because `?` counts as a sentence end.
- **The permutation-null contest is not a correctness guard.** It bound 5 times across A and B, and all 5 were wrong. A clear margin over a column set that rewards the wrong thing is a clear margin for the wrong claim.
- **The line has no abstention except `below_floor`**, so every one of findings 1–3 is committed.

Also found:
- Sentences are cut at "St.", and one of those cut sentences was a bound lead.
- Collection has no timeframe ("Who is the US president" pinned *Joe Biden – Wikipedia*).
- Compute has no lane: 3 of 10 compute records have zero sentence candidates.
- Follow-ups have no binder.
- Han text is `below_floor`.

Fixed along the way:
- `cube-telling.js` threw on a page whose declared publication date does not parse. That killed 5 of 48 run-A collections; there is now a regression test.
- `--replay` refetched every page for fixity, so a replay depended on today's web. It now reuses the pinned verdicts.

**Next, needing its own pre-registration.** Run against the same pins (`drive.mjs --replay-only`), so web variance is out:
- a slot-filler witness: the claim's relation holds the question's figure in one position and an admitted-kind filler in the asked one;
- an interrogative filter;
- a timeframe witness for present-tense holders;
- an abstention for the line.

### 10.1 Omnilingual arms and seam density (Amendment 1, 2026-10-14)

The pre-registration was amended before any Spanish run; results are in `native/eval/callimachus/RESULTS.md`, "Amendment 1 results". No model was used, and `self:model` words are 0.

- **Spanish questions** (42, translated and frozen) were asked two ways: over the English pins, and over Spanish pages collected live. The table counts line commits.

  | arm | committed correct | confident wrong | below_floor |
  |---|---|---|---|
  | English reference | 5 | 28 | 9 |
  | ES→EN | 9 | 16 | 17 |
  | ES→ES | 11 | 24 | 7 |

  - Read by hand, 7 of ES→ES's 11 correct leads answer the question, for example "La capital de Canadá es Ottawa."
  - B1 fails in every arm.
- **Cross-language matching is only names and cognate stems.** `identity-induction.js` and `qidBridge` are unwired, so ES→EN refuses 17 of 42 for lack of any shared witness.
- **fr, de, ru, zh and it are read by the English parser.** The runner's sniff knows only es; there is no third question grammar, telling grammar or parser on disk. A language-identification step before the grammar is owed.
- **The telling is 100% lawful and byte-verified in both en and es.** Lawful is not correct: every confident-wrong lead is lawful.
- **Seam density.** Answers are 63–77% copied, addressed source bytes, 5–10% computed values (mostly attribution) and 17–40% frame words. The figures are pooled per arm and stage; per category and per language are in RESULTS.
  - The seam tells a reader which words are ours. It says nothing about whether a quoted claim answers the question.
- **Gold-regex defect.** The holder gold `Leo` matches "Napo*leo*n", which gave one false credit in ES→EN. Gold regexes need word boundaries.
- **`--qlang`** now declares the question grammar instead of sniffing it.
