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

## 10. Clause segmentation before the claim is read (2026-10-14, session `eaadca`)

**Goal:** raise how many witnessed claims get a lawful, read-back, net-new paraphrase from `claim-realize.js` (level 2, no model). On the 12-claim sample in §5, 7 refusals were parser misreadings: a predicate hung on a noun or a number, "bill" tagged AUX, a fronted date made the root.

### 10.1 What was built

| Piece | Where | Giver |
|---|---|---|
| **Attested tags.** A tag is admitted for a form only when UD English-EWT attests that form with that tag; an unseen form keeps every class. Two scopes: `closed` (the UD closed classes ADP AUX CCONJ DET PART PRON SCONJ; NUM is excluded because digit numerals are productive) and `all` (every class, a tag dictionary). Additive: `tagSentence` and `analyse` are unchanged. | `adapters/text/english-parser.js` `tagSentenceAttested`, `analyseAttested`, `parseText({ attested })` | UD v2 u/pos (closed classes); the treebank's own lexicon |
| **Which scope the claim reader uses** is decided by measurement (§10.2), not by assertion. | `claim-realize.js` `readRows`, `READ_SCOPE = "all"` | `scripts/eval-attested-tags.mjs` |
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

### 10.2 Measured: the attested-tag scopes, held out

`node native/scripts/eval-attested-tags.mjs --gold …/en_ewt-ud-dev.conllu --gold …/en_ewt-ud-test.conllu`. This is the official dev and test splits: 4,078 sentences and 50,243 words the tagger never trained on. Gold tokenization is fed to every arm. The null is a paired sign-flip over sentences; only the draws (999) and the seed ("attested-tags") are declared. (The fixtures sit untracked in the main khora checkout: `native/eval/fixtures/ud-english-ewt/`.)

| Arm | UPOS | UAS | LAS |
|---|---|---|---|
| plain tagger | 93.75 | 79.54 | 74.68 |
| closed classes held to EWT | 93.81 | 79.60 | 74.77 (vs plain p = 0.005) |
| **every class held to EWT** | **94.39** | **79.87** | **75.23** (vs plain p = 0.001; vs closed p = 0.002) |

The every-class arm changed 1,225 tags: 716 are now right, and 396 that were right are now wrong. It is still the measured winner, so it is what the claim reader uses.

### 10.3 Measured: the DST record, before and after

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
- Neither is a parser misreading. Both are the next places to work (§10.6).

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

### 10.4 Still wrong among the 41 (read by hand, not hidden)

| Output | Why it is wrong |
|---|---|
| "The semiannual clock changes result in …, and … resulting in more health problems and traffic accidents has been shown by studies." | **Both** parses tag "result" as NOUN, so the clause reads as one object. The agreement check is two readings of one giver and cannot catch a shared misreading (Pearl, again). |
| "Their clocks will be set by Americans by one hour." [omitted: back] and "Their clocks will be set by Tennesseans back an hour." | The particle of *set back* is not labelled `compound:prt` by the parser, so the particle law cannot see it. |
| "For early 2025 that includes legislation for permanent standard time, a bill is planned." | The relative clause is hung on "2025" in both parses. |
| "Senate leaders have not committed however." and "DST has been expanded … additionally." | A one-word connective moved to the end without its comma. Lawful, but poor. |

### 10.5 Tried and falsified, or corrected

| What | Measured | Outcome |
|---|---|---|
| Clause segmentation alone to fix "bill" AUX | Parsed alone, "the House passed a Sunshine Protection Act bill backed by President Trump." still tags *bill* AUX | Segmentation does not fix tagging. The attested-tag constraint does. |
| Moved span must hang on the root (or the patient) when read back | Refused "The bill was passed by the Senate in 2022 by unanimous consent." (stacked PPs: "by unanimous consent" hangs on "2022") | Too strict: PP attachment among the clause's own arguments is the reader's ambiguity. Replaced by "no clausal relation crossed". |
| CASE on every Case=Nom pronoun | Refused "by it": the lexicon keeps only the first feature set per form, and "it" is listed Nom | Restricted to lemmas with a distinct accusative form. |
| ROLES keyed by surface form | "must pass the Senate" slipped through, because "pass" ≠ "passed" | Keyed by EWT lemma. |
| Two-parse agreement as a witness | The shared NOUN reading of "result" passes both | It is a check, not a witness. The independent witness stays relations.js. |

No new hand-set threshold was added. The tag scope was chosen by the held-out null (§10.2). Every cut is a closed class or a punctuation convention with a giver.

### 10.6 Open, next

- **relations.js names auxiliaries, copulas and nouns** as predicates (230 refusals). Feed it the attested tags, or have it name the lexical head.
- A **copular alternation** ("X is Y" → "Y is what X is"; or "According to X, …" for evaluative copulars) would take on the 54 cop refusals.
- **Garden paths in the read-back:** "N backed by X was passed by Y". The read-back could use the same segmentation and agreement as the source reading, instead of one whole-sentence parse.
- **Particles the parser does not label**, and connectives moved without their comma (§10.4).
- `readClause` wiring into the answer ladder, with `roles` built from the record, as the measure script does.

### 10.7 How to run

```bash
node native/scripts/claim-realize-measure.mjs --out 3.0/callimachus-runs/permanent-dst [--show N] [--json FILE]
node native/scripts/eval-attested-tags.mjs --gold <en_ewt-ud-dev.conllu> --gold <en_ewt-ud-test.conllu>
node --test native/organs/claim-realize.test.mjs
```
