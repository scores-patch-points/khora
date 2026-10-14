# Callimachus: putting mechanical clauses into any shape, and inducing the shape

Design record, written 2026-10-14 by a Callimachus side session, from the user's question: *how can clauses made with no model be nested into any shape, for any kind of output, and where does the system **induce** the shape that fits?*

Read `CALLIMACHUS.md` first; this file depends on it, and §6 there (falsified work) binds this file too. This is a design, not a build. Section 7 holds two small measurements made to settle questions the design depends on. They were run from a scratch script; no organ was changed.

House rules this design is held to:
- the model is only the mouth;
- no hand-set thresholds (a null decides, and only its draws and seed are declared);
- every stage is a whole answer, and higher layers re-weight lower ones;
- omnilingual by NL → grammar → EOT → grammar → NL;
- Nagarjuna owns the void, Koestler the holons, Callimachus the record and the telling.

---

## 0. The answer in one paragraph

A clause is already a holon: an addressed proposition whose segments say where every word came from. Every larger unit (sentence, paragraph, section, list, table row, slide, stanza) is **the same kind of node one level up**. The parent is built from its children. Its only words of its own are joins and labels, and those may say nothing the children's grounds don't carry. A *shape* is a tree of slots, each slot a small void with features (position, count, class, role word, the move it makes). That tree is never declared. It comes from four sources, each deciding its features against its own null:
- the ask, read into a void;
- instances of the form, fetched or held;
- the material's own holarchy;
- the person's prior outputs.

The **material sets what is possible**: a table needs propositions that share a slot set, a timeline needs claims with dates of their own, sections need groups that clear the Kind null. The **ask and the instances set what is probable**. When no shape survives, the answer is a typed gap (Nagarjuna's *neither*) with the unshaped claim sheet as its floor, never a template. Placing clauses into a shape is a lens: it selects, orders, groups and frames, and it outputs what it drops. The *medium* (prose, list, table, slide) is a projection of the finished tree, and the Ground reader (`the-fold/medium.js`) reads it back to prove nothing was added or lost. That proof already works for five of six media (§7.1).

---

## 1. What already exists (read before proposing anything)

Each entry says what the module does today, in its own terms, and what it lacks for this question.

### Clauses and their tree

**`adapters/text/clause-spans.js`.** `clauseSpans(sentence)` returns a tree of clause spans: `{start, end, parentIndex, relation}`, where relation is root, coordinate, elaborates, subordinate or relative. The boundaries come from closed classes in `priors.js`:
- `;` makes a coordinate;
- `:` makes an elaboration, nested under the clause before it;
- a coordinator followed by a subject pronoun makes a coordinate;
- a subordinator or wh-relative makes a subordinate or relative, but only when it doesn't open the sentence.

`propositionSpans` splits compound predicates inside a clause, using a measured VERB/AUX-dominant POS prior. It records the elided subject as a **pointer** (`sharesSubjectWith`), never a copied string.

It holds the user's framing verbatim: "human language is a series of nested propositions of increasing abstraction — clause, sentence, paragraph, section — each itself a GFP, each drillable and collapsible."

Its limits:
- it is English-scoped (it says so);
- three gaps are disclosed: "that", fronted subordinates, pied-piped relatives;
- it stops at the sentence. Nothing above the sentence uses these five relations yet.

### The draft's tree

**`the-fold/eot-draft.js`.** `buildDraft` lays the material out as whole → parts → points. Parts follow the material's own block seams; points are its sentences, with byte offsets and a boundary splitter that never drops bytes. It also records:
- the *subject* (names every part carries);
- *pervasive* names (in more parts than not);
- the ask's *choosing* words (a topic word held by at most half the parts);
- a *bridge* per part (a non-pervasive name shared with the part before). A part with no bridge is a transition that must be written, and it is recorded as such.

Its header states the law in this file's terms: "the material sets what is POSSIBLE … the ask sets what is PROBABLE." `floorProjection` is the floor every later stage must beat.

Its limit: the tree is the *source's* holarchy. Nothing maps it onto a *target* form.

### The nine-stage generation pipeline (`native/the-fold/`)

These modules already do most of the shape induction this question needs, but none of them is wired to Callimachus.

**`shape.js`** learns a form from fetched sources, never from a table ("we don't want a set of shapes pre-set"). It reads three things:
- count-and-unit claims ("fourteen lines"), kept when **more hosts than not** state them;
- the pages' own verse blocks (instances, measured rather than reported);
- the title words and heading words a majority of hosts use (the form's name and its named parts).

`matchShape` measures lines, words, sentences and paragraphs, and says *unmeasured* for anything else. `surfForShape` does at most one more round of searching, and an unlearned shape is "an honest gap, not a default".

**`paradigm.js`** asks every form the 27 cube questions on its instances, against a **population null**:
- hypergeometric tests for marks and role words;
- a rank-sum test for measures;
- a Poisson-binomial test against each unit's own shuffle, for relations between positions (rhyme, same first word);
- a binomial test for order.

A feature is admitted at level 1/T over every test the definition ran, and only when more instances hold it than not. The Interpretation row (DEF/EVA/REC) is named as judgement, never counted. `evaluateParadigm` is EVA·Paradigm: it scores a candidate against the learned features, with a cut calibrated in sample. `learnParadigmEmergent` and `detectParadigmPlurality` handle forms that turn out to be several forms.

**`medium.js`** (the Ground reader) turns any text into elements:
- heading, item, label or line;
- with marker kind, indent, block, words, syllables, first and last word, rhyme keys and end punctuation.

`segmentCollection` cuts a collection into instances against a seeded random-cut uniformity null.

**`form-prior.js`** learns a form by **expectation**, one instance at a time. The form is whatever slots became predictable beyond an order-destroyed null, and it is learned at the instance count where one more instance stops moving it. *The turn* (Meyer) is a predicted slot that an instance deviates from. `emergentFacts` generates the slot types from whatever attributes the reader puts on an element.

**`arc.js`** leans every element onto a stance and a terrain from its own parse, against the collection's baseline, and folds runs of the same stance into **moves**. This is SYN·Pattern: what the parts *do*, in order. It runs in khora today (§7.2).

**`form-priors.js` + `form-priors.jsonl`** are an append-only log of measured form observations (182 lines today), folded on every read so a wrong prior gets outvoted. It is "similar to a claude skill, but … folded from an append-only log".

**`canonical-sections.js`**:
- `huntDeclaredStructure(form)` reads several "how to write a ___" guides and keeps the section headings that recur across independent hosts;
- `WHITE_PAPER_SECTIONS` is a *declared* prior that labels itself as one.

**`form-referent.js`** + **`void-spec.js`** handle the ask:
- `declareForm` treats an anaphor ("again", "like before") as a referent into the engine's own ledger, so the shape is the last piece's shape;
- `candidateFormToken` reads the form word, keeping a lexicalised modifier ("white paper");
- `askedExtent` reads stated lengths;
- `declareVoidSpec` lays the void out level by level (whole, part, sentence, verbiage, grounding).

**`surf.js` / `hunt.js`**:
- surf fetches across hosts;
- hunt admits fetched paragraphs as ground only when they carry the void.

Exemplar pages (what the form *is*) are never ground: they are read for shape only. This split is what keeps instances from leaking into content.

**`arrange.js`**, **`essay-fold.js`** compose an essay outline (thesis, body by beings, tension, return) with reasoning checks. Two declared forms remain in them, and both say so in their names:
- `DECLARED_FORM = { paragraphs: 5 }`;
- `DEFAULT_ESSAY_BEATS`, whose charges are word lists about a river.

These are the declared templates this design retires.

### The holons and the void

**`organs/void-holarchy.js`** (Koestler) says every level is a void with nine operator fields (slot, anchor, admits, extent, relation, composition, cardinality, admission, reopensOn), and every level is both a whole and a filler of the level above. Levels are structural; the modality only *names* them:
- text: document, section, paragraph, sentence, clause;
- music: work, movement, phrase, bar;
- film: work, act, scene, shot;
- code: artifact, module, function, statement.

The law: "low sets possibility for high, high probability for low."

**`the-fold/void-shape.js` `declareVoid`** (Nagarjuna) is the nine-operator declaration. Its verdicts are the four corners of `hl.js`:
- filled: is;
- refuted: is-not;
- contested: both;
- gap: neither.

A filler stands only for the extent it is shown to cover.

### Generated sentences as pointers

**`organs/output-holograph.js`** (Koestler): every generated sentence is a pointer, either a byte address or `self:model`. It names three tiers: the holograph, the shadow, the echo.

### Callimachus itself

- **`organs/cube-telling.js`** works per cell. Each of the 27 cells returns **language-neutral propositions** `{type, slots, grounds}`, or `{alts, take, cap}`, and `realizer()` resolves the slots into segments. A cell is voiced, silent, gap or desert (SYN·Ground). `FRAME_WORDS` declares each cell's frame words (PL14). Its shape is declared: one paragraph per terrain, in stance order (`readingOrder`, `renderMarkdown`).
- **`adapters/text/telling-grammar.{en,es}.js`** has one construction per proposition type, plus CLDR lists, dates and plurals through `Intl`.
- **`organs/answer-ladder.js`**:
  - the line comes from perception;
  - the paragraph from logos;
  - the brief from pathos (lead, tension, other sides, release);
  - the dossier is the whole telling, and the claim sheet is every atom.

  Its sizes are declared, but its *mechanism* (each layer adds log-odds to every candidate; a stage reports whether its lead moved and which witness moved it) is exactly the one a shape layer must join.
- **`organs/claim-realize.js`** turns a claim into a net-new paraphrase by grammatical alternations, through gates. This gives the placer *alternatives* per claim, and alternatives are what let a slot be fitted without adding words.
- **The fold-blocks kit** (the-fold `fold-blocks*.js`) lays a block catalog on the 27 cells, with a DESERT at SYN·Ground. Its kernel commits an assembly **whole or not at all** (the watchmaker law, `!EVA`). The weave fills atoms in law order: library, box, hunt, then mouth last. The model selects blocks; this design selects mechanically and keeps the watchmaker law.

### What this inventory shows

The induction machinery exists, is tested against nulls, and loads in khora (all eleven modules import cleanly, checked 2026-10-14). What is missing is the **seam** between it and Callimachus:
- a node type shared by clauses and every level above them;
- a material-possibility reader;
- a placer that fits addressed clauses into learned slots;
- a projector that writes a medium and reads it back.

---

## 2. The unit and the nesting law

### 2.1 The clause as a holon

A **node** is one type at every level:

```
node = {
  level,        // structural depth (void-holarchy HOLON_LEVELS), named by the medium only at render
  edge,         // its relation to its parent: root | coordinate | elaborates | subordinate | relative
  prop,         // the language-neutral proposition {type, slots, grounds}, at a leaf; at a parent, null or a label proposition
  segs,         // realized segments: frame | value | source+address | grammar | self:model (CALLIMACHUS §0)
  cell,         // CONTENT address: the cube cell of the record the proposition reads (cube-telling's key)
  lean,         // MOVE address: the stance/terrain its realized sentence leans to (arc.js), filled after realization
  grounds,      // for a leaf, its own; for a parent, the union of its children's (never more)
  children,
}
```

The leaf is today's Callimachus sentence. Each node is a GFP:
- its **Figure** is its lead child (or, at a leaf, the claim);
- its **Ground** is what it stands on (its grounds, and the sibling it elaborates);
- its **Pattern** is the relation across its children (the edge types and their order).

That is the user's "each itself a GFP, each drillable and collapsible":
- *drill* = descend to the children and their bytes;
- *collapse* = show only the node's label proposition, or its lead child.

**Two addresses, not one.** A node carries a *content* cell (what in the record it reports) and a *move* lean (what act its sentence performs as read by a parse). They are different coordinates and must not be conflated. Measured in §7.2: across 204 telling sentences, the two agree at chance (terrain 25/204, label-shuffle p = 0.21).

### 2.2 Composing upward: the five edges at every level

The clause tree's five relations generalise unchanged above the sentence. The edge, not the medium, is the structure:

| edge | at clause level (clause-spans) | above it | media that can carry it |
|---|---|---|---|
| **coordinate** | `;`, "and he" | sibling claims of equal rank | the sentences in a paragraph, list items, table rows, slides in a deck, stanzas |
| **elaborates** | `:` | a child that unpacks its parent | a heading over its section, a lead sentence over its support, a row under its header, a slide title over its bullets |
| **subordinate** | because, although, when | a node that conditions another (a time, a condition, a concession) | a fronted clause, a dated block, a "however" paragraph, the tension beat |
| **relative** | who, which | a node that modifies a referent another node names | an appositive, a table cell describing a row's entity, a footnote, a gloss |
| **root** | the main clause | the whole | title + body, the letter, the poem |

Three composition laws hold at every level. They are Koestler's law made checkable.

**N1. Grounds only flow up.** `parent.grounds = ⋃ children.grounds`. A parent's own words are joins (CLDR list patterns, connectives) and **labels**. A label is a proposition computed from its children's shared slots: a heading names the figure or kind the children share, and a topic sentence is a children-level `most_named` or `groups`. A label word that no child's grounds carry fails. This is PL9 and PL13 lifted to every level: "low sets possibility for high".

**N2. The parent sets the children's probability.** A parent slot (the form's "section 2: the tension") re-weights which children are drawn into it. This is "high sets probability for low", and it is the same log-odds re-weighting the answer ladder already does.

**N3. Watchmaker commit.** A node commits whole or not at all, after its children validate. A failed child is dropped and recorded (L10). It never leaves a half-node (fold-blocks kernel `!EVA`).

### 2.3 Across media: a medium is a projection, not a structure

Rows, cells, items, lines and slides are **names a medium gives to levels and edges**, just as `MODALITIES` names levels. The projection is a pure function `project(tree, medium)`, and each medium has a **licence** that the material must meet (§3.2):

| medium | its law on the tree |
|---|---|
| prose | coordinate siblings are run into one paragraph; elaborates becomes a paragraph break under a lead |
| list | coordinate siblings become items; elaborates nests a sub-list |
| **table** | coordinate siblings that share **one proposition type and one slot set** become rows; slots become columns; the parent's label becomes the caption. Without a shared slot set there is no table. |
| timeline | coordinate siblings ordered by a time slot each claim carries **itself** (not a page's publication date; `undated_claims` in the DST telling already says when this fails) |
| slides | elaborates-headed groups become slides, each holding at most what one level holds; the root label becomes the title slide |
| letter | the root carries an experiencer slot (pathos: whom). Opening and closing are constructions in the grammar adapter, keyed by the experiencer. |
| FAQ | a question node elaborated by its answer node; the question is the asker's own void, realized (`question-grammar`) |
| code comment | the leaf's prop attached to a code span. The address is the code's own byte span. |
| poem | lines with CON·Figure pair constraints (rhyme, same first word) learned by paradigm.js. Mechanical clauses can meet them only through **choice among realizer alternatives**, never by adding words, so most poems will be typed gaps, and honestly so. |

### 2.4 Legal nesting: dependency order, and polytemporal constitution

**What §6 forbids.** Operator-chain prefix closure over UD feature cells was measured three ways, including per referent across the reading, and failed: it rewards role diversity, not sense. This design does **not** reuse it. What §6 keeps is "order over arcs": a word may not outlive or outrank its head, and a predicate may not hang on a non-predicate. That is lifted here to nodes.

**L1. Order over arcs, at every level.** A child never outranks its parent: its level is strictly lower. A label is a predicate over its children, never over a sibling.

**L2. The two times of a node (polytemporal, bitemporal).** Every node has a **reading time** (its position in the output) and a **constitution time** (when the referent it uses is SIG'd, named and admitted, and INS'd, given its kind). The user's point is that a pronoun can come first and its SIG and INS later: "When she arrived, Curie …"; a title names what its section will constitute; a thesis states what the body grounds. The law:

> A use may precede its constitution only **inside the smallest holon that contains both**, and that holon must close with the constitution done. Across a holon boundary, constitution precedes use.

This is a scope law, not a prefix-closure law:
- cataphora inside a sentence is licensed (the sentence is the scope);
- a pronoun in section 2 whose antecedent is first named in section 3 is not.

It makes **retroactive constitution** the normal case for labels:
- titles, headings, topic sentences and theses are *built last* (bottom-up, from their children, N1) and *read first* (top-down);
- the build order is the holarchy's possibility order;
- the reading order is the form's probability order.

**L3. The falsifier for L2, pre-registered so it is not §6 again.**
- Measure it on real pieces (fetched instances of several forms).
- Statistic: the share of referent uses whose constitution closes within their smallest containing holon.
- Null: the **same sentences reshuffled across holon boundaries, with order kept inside each holon** (99 seeded draws, seed declared).

If real pieces don't beat that null, L2 is not a law of these forms, and it is recorded in §6 as falsified. The difference from the failed test: the statistic depends on *holon boundaries and order*, which shuffling destroys. The §6 test depended on role diversity, which re-dealing preserved.

---

## 3. Where the shape is induced, and from what

A shape is `EOOutputShape` (proposed): a slot tree, each slot a level void (`defineLevelVoid`: slot, anchor, admits, extent, relation, composition, cardinality, admission, reopensOn), plus **features**, each with its source, its test, its p-value and its support. A slot's fields are filled only by a source whose null admitted them, and an unfilled field is a typed under-specification, as `void-holarchy` already reports.

### 3.1 The four sources

**(a) The ask, read into a void.** Organs: `question-void.js`, `void-spec.js` `candidateFormToken` / `askedExtent` / `declareForm`, and `longform.js`.

It gives:
- the **form word** (a pointer to instances, not a shape);
- **stated extents** ("five bullets", "two pages");
- the **experiencer** (whom);
- the relation asked.

Its null: none is needed for what the person *states*, because a stated count is a **given** whose giver is the person, recorded as such. What the ask *implies* is not read: a word list of genres would be a table. The form word is only resolved through (b) or (d).

It sets probability only. A stated "table of the senators' votes" makes a table probable; it cannot make one possible.

**(b) Instances of the target form, fetched or held.** Organs: `shape.js` (stated counts, by host majority), `paradigm.js` (features vs. a population null at 1/T), `form-prior.js` (expectation beyond an order-destroyed null), `arc.js` (moves), `canonical-sections.js` (headings across hosts), and `form-priors.jsonl` (the log, so a form is not re-learned every time). Exemplar pages are never ground (hunt.js).

It gives slot count, seams, role words (heading words, first words), pair relations, the order of role words, and the **arc of moves**.

Its null: the one each organ already uses, unchanged. paradigm's 1/T and majority bar, form-prior's order-destroyed null, medium's random-cut null.

It sets both. Instances say what the form allows (its slots) and what it expects (its order and moves).

**(c) The material's own holarchy.** Organs: `eot-draft.js` (whole, parts, points; subject; bridges) and the Callimachus record (facets from the Kind null, grounds or Atmosphere, frames or Paradigm, claims with standing, dates the claims carry).

It gives **possibility**. Which slots can be filled at all, and which media are licensed (§3.2).

Its null: each material feature is admitted by the organ that measures it. Kind edges by the binomial, standing by independence, camps only when the Paradigm reader clears its own null (moving to the registered organs: the cell-organs sibling session).

**(d) The person's prior outputs.** Organs: `form-referent.js` (an anaphor resolves to the last piece), the document ledger, and Callimachus's own `telling.addressed.json` files. Each sentence in them already carries `{cell, terrain, stance, at, segments}`.

It gives a form whose slots are labelled in **content cells**, not only move leans. That is the only source where slot→cell is observed directly, with no parser (§4.1).

Its null: the paradigm contrast with the person's outputs as instances and other outputs as the population.

It sets probability, and it is the strongest prior of the four for "do it like last time".

### 3.2 Possibility from the material: the medium licences

Each licence is a fact about the record, decided by an organ that already has a null. None is a threshold chosen here.

| shape feature | possible only when | read from |
|---|---|---|
| sections | the record's Kind facets: more than one facet admitted by the Kind null | `interpret().facets` (to move to `kernel/terrain-induction.js`) |
| table | two or more coordinate propositions share a type and a slot set | the propositions themselves (type + slot keys) |
| timeline | two or more claims carry **their own** dates | the atoms' dated extents; the telling's `undated_claims` already detects the negative |
| tension and release (brief) | logos finds a contest, or camps exist | `adjudicate` margins, `CONTRADICTED` / `UNDETERMINED` standing |
| quotation-led form | named speakers with earned attitude verbs | `CON·Figure` (said), attitudes earned by quote adjacency |
| N items | the material holds at least N admissible distinct claims | the answer ladder's candidate set after the duplicate collapse |

If the ask makes a feature probable and the material makes it impossible, the answer is not to fill the slot with something nearby. The slot is a typed **refuted** (*is-not*: "a timeline was asked for; no claim carries a date of its own").

### 3.3 Combining the sources: low possibility, high probability

1. **Possible set.** The slot features that (b) or (d) admitted past their nulls, or that (a) stated, intersected with the licences of (c). A feature outside the possible set never reaches the probability step. That makes it the low bar: it admits.
2. **Probable shape.** Among possible features, each source adds log-odds the way the ladder's layers do: the ask's stated features, the person's prior, then instance support, each weighted by its own surprisal against the base rate of that feature across the form log. "Probable" means **it beats every draw of a per-ask null**: the same features with their source attributions shuffled among the possible set (draws and seed declared). That makes it the high bar: it licenses.
3. **Higher re-weights lower.** Once a shape is chosen, it is a new witness column in the answer ladder: "fits a slot of the chosen form". It re-scores every candidate claim. A layer is admitted only if Useful rises and WRONG never rises, on dev and held (VOID-WORK rule 1). The shape is **a fourth layer after perception, logos and pathos**, the form layer. It answers to the same bars and does not get exempted because it is "only presentation".

### 3.4 When no shape is induced

The four corners decide it:

| corner | what happened |
|---|---|
| **filled** (is) | a shape cleared both bars |
| **contested** (both) | two shapes clear and neither beats the other's null (`detectParadigmPlurality` already finds this). Both are reported; the reader chooses. |
| **refuted** (is-not) | the asked form is impossible on this material (§3.2) |
| **gap** (neither) | nothing was learned: no instances, too few to power the test, no prior output, and the ask states no extent |

For a gap, the output is the **unshaped floor**: the claim sheet in record order, with each sentence addressed. The output also states *which source failed and why*, using `learnShape().basis` and paradigm's `refused`. The floor is not a template. It is the absence of grouping, the same role `floorProjection` plays for the draft, and every shaped answer must beat it on the same measures.

---

## 4. From a shape to a placement of propositions

### 4.1 Which cell feeds which slot: measured, never declared

The tempting move is a table saying, for example, that Ground-grain cells feed the opening, Figure cells the body, and Pattern cells the tension. That would be a declared template one level down. Instead, the slot→cell map comes from one of two places.

**From the person's prior Callimachus outputs (source d).** Their sentences carry content cells, so a slot's cell distribution is counted directly, and a cell enters a slot's `admits` when its share beats the share under a slot-label shuffle.

**From instances (source b), through move leans.** Instance slots carry *move* leans (arc.js), and Callimachus propositions carry *content* cells. §7.2 shows these two coordinates do not agree on the same sentence, so the placer compares **like with like**:
- realize each candidate (the realizer's alternatives included);
- lean the realized sentence with the **same** arc reader and baseline as the instances;
- match leans to slot moves.

The content cell rides along as a payload. It is never used as if it were a move.

A first guess at the map, written down only so that it can be falsified:
- Existence-domain Ground cells (holdings, collection, refused) feed a form's frame or meta slots: the caption, the opening reference, the "about this record" slide;
- Structure-domain Figure cells (said, voices) feed body items;
- Interpretation-domain Pattern cells (camps, contested) feed the tension and close.

The measurement in §5 step 3 either earns this guess or refutes it.

### 4.2 The placer is a lens (spec L10: select, order, group, frame; output what it drops)

Its inputs:
- the shape's slot tree, with features;
- the candidate leaves (each a proposition with realizer alternatives `alts`, and paraphrase levels 1–2 when the claim-realize gates pass);
- the ladder's per-candidate log-odds.

The four acts, each typed in the output:
- **select**: which leaves enter at all (the ladder's scores plus the form witness);
- **order**: sequence alignment of leaves to slots, scored by slot-feature fit plus ladder log-odds. A DP over an ordered slot sequence, like Needleman–Wunsch on moves; a bipartite assignment for unordered slots (table rows ordered by a slot the rows share). Gaps on either side are allowed and recorded: an empty slot is a typed *gap*, and an unplaced leaf is a drop;
- **group**: which parent a leaf hangs under. Edges come from the record: `elaborates` when a leaf's grounds are contained in a parent label's grounds, `coordinate` when leaves share a proposition type, `subordinate` only when a time or condition slot grounds it;
- **frame**: a slot's own words. These are frame words whose **giver is the form's instances** (a heading word a majority of hosts use, from `shape.js` parts or `canonical-sections.js`), or a label proposition computed from the children (N1). They are declared per slot, exactly as `FRAME_WORDS` declares per cell, and PL14 checks them.

It never:
- writes a word a slot has not declared;
- edits a copied byte (narrowing only, `cleanSpan`);
- generates a claim to fill a slot;
- moves the mouth's additions out of `self:model`.

What it **outputs as dropped**, as a list with a typed reason for each:
- the leaves not placed;
- the slots left empty;
- the alternatives not taken.

### 4.3 The projection proves itself

After placement, `project(tree, medium)` writes the medium, and **`medium.js` `elementsOf` reads it back**. Three checks follow.

1. **One element per placed node of the medium's content class.** Items for a list, lines for verse, one paragraph per prose block.
2. **Every sentence survives whole in exactly one element,** and every source segment still re-verifies against its pinned bytes.
3. **No content element was added** that is not a node.

Then `evaluateParadigm(shape's paradigm, readBack)` scores the result against the learned form. That is EVA·Paradigm on our own output, the same organ that learned the form.

§7.1 shows the read-back half works today for prose, bullets, numbered lists, slides and plain lines. It fails for tables, because the Ground reader has no table class.

---

## 5. Omnilingual

The same rule as the telling applies: the lens is medium-blind and language-blind, and the adapter speaks.

**Language-neutral** (the lens and shape layer):
- the node tree and its five edges;
- levels;
- proposition types and slots;
- content cells;
- counts, order and cardinality;
- the licences (§3.2);
- the void fields;
- the drop list;
- the four corners.

**Supplied by a grammar adapter** (per language):

| feature | source |
|---|---|
| list joins | CLDR via `Intl.ListFormat` |
| list numbering, ordinals | `Intl.NumberFormat` numbering systems; `Intl.PluralRules({type: "ordinal"})` |
| dates on a timeline axis | `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat` |
| writing direction for a table or slide | `Intl.Locale#getTextInfo` |
| sentence, word and grapheme cuts | `Intl.Segmenter` |
| quotation marks | CLDR delimiters |
| constructions: letter openings and closings, FAQ question form, label propositions | per-language construction table, a new construction per new proposition type, giver named |
| prose laws | language-specific PL3, PL4, PL6 beside the universal ones |
| frame words learned from instances | **instances in that language** |

The last row needs care. A heading word learned from English hosts is an English frame word. The **role** (slot position, what it labels) transfers across languages; the **word** does not. A Spanish answer in an English-learned form has a typed gap per label until Spanish instances are fetched. It is never a translation.

What is English-only today, and must be disclosed wherever it is used:
- `clause-spans.js` (it says so);
- `arc.js` (the EWT parser is the only UD treebank on disk, so move leans are English-only);
- `medium.js` (its first-word, last-word and rhyme fields match `[a-z]`, so they are Latin-script and English-shaped). The structural classes (heading, item, block) are closer to neutral, but `CLOSE`/`STRONG` punctuation is Western.

Instance-learned shapes for other scripts need the Ground reader rebuilt on `Intl.Segmenter` and Unicode property classes first.

---

## 6. Built vs truly new

| piece | status | what is left |
|---|---|---|
| clause tree, five edges | **built** (clause-spans, English) | lift the five edges above the sentence (§2.2); fronted-subordinate gap |
| addressed leaves, segments, laws | **built** (composer, prose-laws, cube-telling, telling-grammar) | none for the leaf |
| leaf alternatives | **built** (`alts`; claim-realize levels 1–2) | wire claim-realize into the ladder (CALLIMACHUS §8, already owed) |
| level voids, nine operators | **built** (void-holarchy, void-shape, void-spec) | produce `EOOutputShape` as a void-holarchy instance |
| form word, stated extent, anaphor | **built** (void-spec, longform, form-referent) | read from the Callimachus question-void too |
| shape from instances | **built** (shape, paradigm, form-prior, arc, canonical-sections, form-priors log) | wire to Callimachus; **no tests in khora** for paradigm, form-prior or arc (their probes were in retired eoreader7) |
| exemplars never ground | **built** (hunt.js) | keep it so in the Callimachus collector |
| material holarchy | **built** (eot-draft; the record's facets, grounds, frames) | the licence reader (§3.2), **new**, small |
| medium read-back | **built** for heading, item, line and block (medium.js) | **new**: a table class (pipe rows, header row, separator) and a frame-break class (`---`) |
| ladder re-weighting by layer | **built** (answer-ladder) | add the form layer as a witness column, **new** |
| the node type spanning levels | **new** | small: a shape over existing leaves |
| licences and the four-corner shape verdict | **new** | |
| placer (select, order, group, frame, drops) | **new** | the main build |
| projector per medium | **new** | pure functions; the read-back is the test |
| L2 scope law and its null | **new** | measurement first, law only if it survives |
| declared templates to retire | exists | `arrange.js` `DECLARED_FORM`, `essay-fold.js` `DEFAULT_ESSAY_BEATS`, `canonical-sections.js` `WHITE_PAPER_SECTIONS` (labelled as declared), the telling's paragraph-per-terrain, the ladder's sizes. Each stays as a *declared prior with its giver* until an induced shape beats it on the same bars, then it becomes a fallback-for-comparison only. |

**Hand-set constants in the organs this design would reuse.** These belong in CALLIMACHUS §7 when wired.

| constant | where |
|---|---|
| `minSupport = 0.8`, `stabilityFloor = 0.9` | `form-prior.js` `necessaryFacts` |
| `tolerance = 0.2` for words | `shape.js` `matchShape` |
| the five-instance floor | `paradigm.js` and `form-prior.js` (stated as structural, still a number) |
| the in-sample `satisfies.cut` | `paradigm.js` (should be held out) |
| `rnd = Math.random` default | `form-prior.js` `necessaryFacts` (not seeded) |

---

## 7. Measured this session (to settle two design questions)

Both measurements are reproduced by `native/scripts/callimachus-shape-measure.mjs` (modes `roundtrip` and `lean`), run against khora at `2255241b`; no organ was changed. The data are existing Callimachus run outputs in `callimachus-runs/` (outside the repo):
- `permanent-dst`;
- the drive eval's `A/compute-0` … `A/compute-9`.

They are pinned by the sha256 of their eleven sha256 lines in that order: `798d67e9e8ee362b…`. The drive eval was still writing runs while this was measured, so the pinned set is named rather than globbed.

### 7.1 Can the Ground reader verify a medium projection? Yes, for five of six media

**Method.** I took the 26 addressed sentences of the DST telling (`permanent-dst/telling.addressed.json`), grouped them by terrain (9 groups), projected them into six media, and read each back with `medium.js` `elementsOf`.

| medium | classes read back | content elements (wanted) | sentences not found whole in one element |
|---|---|---|---|
| prose (terrain heading + paragraph) | heading 9, line 9 | 9 (9) | 0/26 |
| bullets under headings | heading 9, item 26 | 26 (26) | 0/26 |
| numbered list | item 26 | 26 (26) | 0/26 |
| slides (`# title`, bullets, `---`) | heading 9, item 26 | 26 (26) | 0/26 |
| plain lines | line 26 | 26 (26) | 0/26 |
| **table** (markdown pipes) | line 27 | 27 (26) | 0/26 |

**Settled:**
- the read-back verifier (§4.3) needs no new organ for prose, lists and line media;
- tables are read as lines, with the header row counted as content and no cells or columns;
- slide boundaries (`---`) are invisible: slides read the same as headed bullets.

So a table class and a frame-break class must be added to the Ground reader (closed typographic grammar, the ruler not the shape) before tables and slides can be verified. That is step 1 of §8.

### 7.2 Is a proposition's content cell the same coordinate as its sentence's move lean? No

**Method.** I took 204 telling sentences, from permanent-dst and the 10 compute runs. I leaned each with `arc.js` `attachArc` (EWT parser, the collection's own baseline, one unit per sentence) and compared the lean with the cell `cube-telling` declared for it.

**Null.** Shuffle the declared labels among sentences, 999 draws, seeded with `createSeededRng({purpose: "callimachus-shape.lean-null", n})`.

| | declared = leaned | p (label shuffle) |
|---|---|---|
| terrain | 25/204 | 0.210 |
| stance | 17/204 | 0.974 |

The most common pairs are spread across terrains: Void→Paradigm 11, Entity→Paradigm 11, Entity→Entity 11, Kind→Field 11, Field→Network 11.

Two larger, unpinned sets taken while the drive eval was still writing gave the same answer:
- 312 sentences: terrain p = 0.33;
- 590 sentences: terrain p = 0.26, stance p = 0.90.

**Caveat.** The sentences are not independent: eleven runs of largely the same constructions, so the effective n is closer to the number of distinct constructions. A positive result would have needed that correction. A null result does not.

**Settled.** The cell a proposition is *about* and the move its sentence *makes* are different coordinates. The placer must match leans to leans and carry cells as payload (§4.1). Slot→cell maps can be counted directly only from outputs that carry content cells, which today means the person's own Callimachus outputs.

---

## 8. Build plan, ranked: smallest licensed step first

Each step is a whole answer on its own, and each has a falsifier and a pre-registered bar written before it runs.
- Nulls declare only draws and seed.
- "Beats the null" means beats every draw (p ≤ 1/(draws+1)) unless the step names its level.
- Bars are run on dev **and** held.
- The pre-registration goes in `eval/callimachus/` beside the drive eval (sibling session), before any result.

### Step 1. Projector + read-back verifier for the media the reader can already read; add `table` and `frame-break` to medium.js

**Files:**
- `organs/shape-project.js`, new and pure: `project(tree, medium)` → text plus a segment map;
- `the-fold/medium.js`: two closed classes.

**Falsifier.** Any projection whose read-back loses a sentence, splits one across elements, or adds a content element. For a table: a row whose cells don't read back to the proposition's slots.

**Bar.**
- 0 losses and 0 additions on every telling in `callimachus-runs/` across all media;
- existing medium.js consumers unchanged, compared test by test by name (memory: suite diff by test name);
- a negative control: a deliberately dropped sentence must fail.

### Step 2. The licence reader (§3.2) and the four-corner shape verdict, with the unshaped floor

**Files:** `organs/shape-licence.js`, new and pure over the record.

**Falsifier.** A licence granted on a record that cannot fill it (for example "timeline" when every claim's date is a publication date), or refused on a record that can.

**Bar.**
- on the existing runs, every licence decision agrees with a hand-audited sheet of what each record can fill, prepared blind to the code;
- on DST, timeline must be *refuted* (the telling already says no claim carries its own date).

### Step 3. The slot→cell map from Callimachus's own outputs (source d), the only source with content cells

**Falsifier.** A cell's share in a slot does not beat the slot-label shuffle (999 draws, seeded).

**Bar.** Report every cell–slot pair with its p-value. The §4.1 first-guess map is **earned** only for pairs past the bar, and refuted for the rest, which go in §6 of CALLIMACHUS.md.

**Note.** The current answer-ladder sizes and the 27-cell telling are the only "forms" with many outputs, so this step first measures whether the declared paragraph-per-terrain shape is even consistent across runs. That is a useful negative or positive on its own.

### Step 4. Instance-learned shape → placer → projection, for one form family at a time, starting with forms the reader already measures (lists, FAQ, brief)

**Files:**
- `organs/shape-place.js`, new: the L10 lens with drops;
- wiring: `shape.js` / `paradigm.js` / `arc.js` from Callimachus's collector, with exemplars kept out of ground.

**Falsifier.** The placed output, read back and scored by `evaluateParadigm` for the learned form, does not beat (i) the **same leaves in a random assignment to the same slots** (seeded, 999 draws) and (ii) the **unshaped floor**.

**Bars.**
1. EVA·Paradigm satisfaction beats both nulls on held-out forms. The satisfies-cut is recalibrated **held-out**, not in sample.
2. 0 ungrounded sentences.
3. **The form layer passes the ladder's own rule.** Useful rises and WRONG never rises, against the drive-eval baseline, scored by the sibling eval session's frozen gold.

### Step 5. The L2 scope law (§2.4), measurement before law

**Falsifier and bar** as pre-registered in L3: real pieces must beat a cross-holon reshuffle that keeps order inside each holon.

If L2 fails, it is recorded in §6 of CALLIMACHUS.md and the placer keeps only N1–N3 and L1.

### Step 6. Languages

- Rebuild the Ground reader's word fields on `Intl.Segmenter` and Unicode classes. Bar: the English results of steps 1 and 4 are unchanged.
- Add construction rows for label propositions in `es`.
- Fetch Spanish instances for one form, and report per-label gaps where none exist.

### Step 7. Retire the declared templates

Retire `DECLARED_FORM`, `DEFAULT_ESSAY_BEATS`, the telling's paragraph-per-terrain and the ladder's fixed sizes, one at a time, only after the induced shape beats each one on step 4's bars. Each stays as a named comparison arm.

---

## 9. Seams with the sibling sessions (2026-10-14)

- **Clause-level reading** (`clause-spans.js`, branch `callimachus/clause-segmentation`): its tree is the leaf level of §2. Fronted subordinates and "that" are the gaps that most affect L2's measurement.
- **Cell organs** (`callimachus/cell-organs`): Kind, Atmosphere and Paradigm move from stand-ins to registered organs. §3.2's section, camp and period licences read whatever those organs admit, so this design waits on them rather than reading the stand-ins.
- **Drive eval** (`callimachus/drive-eval`): the form layer is admitted or not by that pre-registered harness, never by its own author's measure alone.
