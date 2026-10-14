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

## For whom: the lens that induces the shape (read this first)

The user's definition, given 2026-10-14 and relayed near-verbatim by the Callimachus spec session: a prompt "is a stated 'for whom', it is a lens, it is telling the universe to fold, bounded by differences that make a difference, to unfold itself from a particular perspective."

This anchors everything below. The shape is not a property of the material, and it is not a genre chosen from the ask's form word. It is **how the pinned universe unfolds for one perspective**. The other three sources in §3 (the ask, instances, the material) are read *through* the whom. They do not stand beside it.

### What the whom is today: a placeholder

- The answer ladder declares its experiencer as `{ who: "the asker", read: "<question> over N pinned pages" }` (`answer-ladder.js` line 145). The `requireExperiencer` gate (Panini, `experiencer.js`) refuses a missing experiencer but accepts a name with no content.
- `realizeClaim({ whom })` records `whom` and never uses it (`claim-realize.js` line 261: "recorded, never used").
- `kernel/for-whom.js` already has the right frame, `createForWhom({ giver, question, ground, priors, universe, medium, knowing })`, with a fold (`foldForWhom`) and a three-leg gate:
  - DMD coherence against a shuffled trajectory null;
  - material discovery;
  - question relevance (Bateson).

  Callimachus does not call it.

### What the whom holds, and where each part comes from mechanically

The whom is a declared field **with content**. Each part has a mechanical source that already exists, and none of it needs a model.

| part of the whom | what it is | where it comes from |
|---|---|---|
| **giver** | who is asking | the session or requester id the doorway already carries (`held-turns.mjs` `heldKey(requester, …)`; the experiencer's `who`) |
| **thread** | the turns of this conversation, and the referents and claims already told in it | the conversation log Wald reads for its `thread` pull; prior answers' `telling.addressed.json` in the same thread |
| **pages already seen** | the sources this whom has already been shown | the sha256s of every Pinax version in this whom's earlier records. Pinax addresses are content hashes, so "seen" is exact set membership on bytes, not a fuzzy match |
| **claims already told** | the propositions this whom has already received | the output addresses in earlier `telling.addressed.json` files: each sentence's `{cell, at, grounds}` |
| **prior outputs** | the shapes this whom has already been given or has written | `form-referent.js` `resolveFormReferent` over the document ledger (`the-fold/document-ledger.js`); earlier Callimachus outputs, which carry content cells (§4.1) |
| **priors** | the forms and terms this whom has made predictable | `form-priors.jsonl` folded **per giver**, plus the `form-prior.js` expectation stream run over this whom's prior outputs |
| **medium** | where the answer lands | the surface the request came through (view.html, chat, CLI, file), declared by the doorway |
| **language** | the whom's language | the ask's language (`question-grammar.<lang>`), or the thread's |

Each part is a *holding*, and **the holdings are the ground the new answer is a difference against**. A whom with no holdings is a real case, a first contact. It is declared as empty, which is different from leaving the field unset.

### Differences that make a difference, measured relative to the holdings

Every null in this design is taken **against what the whom already holds**, not against the record alone:

- **Novelty.** A claim the whom was already told (same claim key, same independent sources) carries no surprisal for them. Its weight in the ladder is its surprisal against the whom's told set, not against the record's base rate. This uses the same `−log2(share)` the ladder already computes, with the whom's holdings as the population.
- **The window.** `kernel/activation.js` `dmdWindow(observations, derive, { candidates })` finds the depth at which a difference stops making a difference to a derived conclusion. Here the observations are the whom's holdings in thread order, and the conclusion is the induced shape. The window measures **how much of the whom's history the shape depends on**, so the depth of the thread is measured rather than chosen.
- **The gate.** `gateForWhomFold` is the three-leg gate. A reading for this whom that is not coherent above its shuffled null, or that touches none of the whom's question terms, does not get to shape the answer. Its defaults include hand-set floors (`minTrajectoryLength = 12`, `minDiscovered`, `minRelevance`); they go on the CALLIMACHUS §7 list when wired.
- **Shape features.** A form feature the whom already holds as a prior is *probable* for them. A feature the whom has never seen still needs instances to clear their null (§3.1 b).

### The two-whom property, as a test

**The same words from two whoms should fold the same pinned universe into different shapes, and both must stay byte-addressed.**

- **Same universe.** The two outputs share one record: the same Pinax versions and the same atoms. Only selection, order, grouping and framing may differ, because the lens adds nothing (spec L10).
- **Different shapes.** They should differ exactly where the whoms' holdings differ, and only there. If two whoms with *identical* holdings get different shapes, the lens is not a function of the whom: a bug. If two whoms whose holdings differ in ways that make a difference (by `dmdWindow`) get the *same* shape, the whom is still a placeholder: the property fails.
- **Both addressed.** Every sentence in both outputs re-verifies against its bytes. Each output's drop list says what it left out *because this whom already holds it*, as a typed reason distinct from "below the floor".

The falsifier and bar are step 0 of the build plan (§8).

### How the rest of this file reads through the whom

- **§2.** The node's `grounds` gain a sibling, `heldBy`: whether this whom already holds the node. A held node can still be placed (as context, or a reminder), but it is typed as such, never presented as new.
- **§3.** Source (d), the person's prior outputs, is part of the whom. Source (a), the ask, is the whom's stated part. Sources (b) and (c) are read through it: which instances count is filtered by the whom's language and medium, and which material is new is filtered by what the whom has seen.
- **§3.3.** The per-ask null becomes a **per-whom** null: the source attributions are shuffled among features possible *for this whom*.
- **§4.** The placer's drop list gains the reason `held: already told to this whom at <output address>`.
- **§5.** The whom's language picks the grammar adapter and the instance pool.

---

## The fold as a function (after "The Prompt Is a Crease")

The user's essay "The Prompt Is a Crease" (2026-10-14) is used here as **inspiration, not spec**. What is already true of the code is marked **[holds]**. What is a claim still owed a test is marked **[H*n*]**, with its falsifier.

### The signature

> **fold(U, W, Q, N, C) → addressed spans + seams**

| argument | what it is | here |
|---|---|---|
| U | the pinned universe | the Pinax versions and the record built over them |
| W | the whom's corpus | the holdings of the section above |
| Q | the words, as a handle on U | the question, read into a void (`question-void.js`) |
| N | the nulls | the born nulls, with draws and seed declared |
| C | the crease ledger | every earlier fold against U (below) |

**[holds] Two kinds of output.** The output has exactly two kinds of material:
- **addressed spans**: copied bytes with a Pinax address;
- **seams**: every place where no span joins two others.

The composer already types this split. Source segments are spans. Frame, value and grammar segments are the grammar's **declared** seams. `self:model` is the mouth, and it is confined to seams by construction: `mouth-repair.js` refuses any repair that touches a copied segment or adds a content word.

**[holds] Seam density is computable today,** and every fold should report it first: the share of output bytes that are not copied spans. §7.3 measures it on the existing tellings.

### Distance induces shape

**[H1] Distance induces shape.** Define the distance between Q and W as how much of what Q touches in U is absent from W. That is a share of the anchored atoms, scored against a null that resamples W at the same size. The hypothesis is that distance, not a declared size, picks the fold:
- **near** (the whom holds most of it): a figure, one line with one address, the difference only;
- **far**: a ground, meaning structure, relations, who says what, and where pages differ.

On this reading "line", "brief", "abstract" and "dossier" are names for folds at particular distances, not templates. The answer ladder's fixed sizes would become points on a measured axis.

**Falsifier.** The twin-reader experiment: the same Q over the same U, once with a dense W and once with W = ∅. It runs as a separate session, [twin-reader-fold-the-who](#local_00d7bf64-5ead-45c3-8d69-409ba42ea184).

H1 is refuted if either of these holds:
- the two folds do not differ in shape (count, levels, the ratio of figure to ground) beyond the W-resample null;
- they differ in the opposite direction: the near reader gets more structure.

**[H2] W = ∅ gives the catalog.** With nothing held, the fold is a catalog: what the universe holds, from whom, how pinned. That is Callimachus's own Pinakes role. §7.3 is suggestive but is not a test, because no W was varied: the 27-cell tellings, which are read today for no particular whom, are almost entirely seam, meaning the grammar describing the record.

### Grain: select, then run the triad (the user's specification, 2026-10-14; built in `organs/grain.js`)

H1 said distance induces shape. The specification gives the mechanism, in two steps over the same four inputs (U, W, Q, N).

**Selecting.** Q activates a region R of U. R splits against W into **held** spans H (a W span on the same arrangement: the same subject and predicate) and **absent** spans A. Distance is the share of A. The shuffle null permutes W's predicates among W's spans, keeping every vocabulary item and destroying the pairing, so a hit that survives it is more than words in common.

| the reader holds | grain | rule |
|---|---|---|
| nothing beyond the null | **Ground** | H does not beat every draw (p ≤ 1/(draws+1)) |
| some, and some is absent | **Figure** | H beats the null, and A ≥ H |
| most | **Pattern** | H beats the null, and H > A (the house majority rule, "more than not") |

**Running.** At the selected grain the triad runs in order: **clear, witness, generate**. Clearing is the clear step at *every* grain (the only fold with no reader in it); the witness step holds the refusing cell and then the corroborating cell; a fold that skips a role is unclosed. Each held span goes through the corroboration verdict (`mergeTestimony`) **between U and W**: the claim under test is a W span, the witnesses are U's spans on its arrangement. The verdict selects the **mode** (the column): Differentiate when the record refuses, Relate when it corroborates, Generate when something must be laid down.

| | Differentiate | Relate | Generate |
|---|---|---|---|
| **Ground** | Clearing: R against U's own null only; no reader, zero seams | Tending: W's held spans that U corroborates, both addresses, no sentence between | Cultivating: the survivors by their own divisions, ordered by activation, a seam between divisions |
| **Figure** | Dissecting: each W span beside the U span that refuses it, no verdict on who is right | Binding: the W span beside the U span that corroborates it | Making: the absent spans by salience against W, each beside its nearest held span; a seam only when no shared entity joins them |
| **Pattern** | Unraveling: W holds an edge between two held things, U holds no path or a contradicting one; the absence is a flagged seam with no words | Tracing: W's edge is corroborated; the chain of U spans that walks it | Composing: an edge U holds among held things that W lacks, addressed at both ends; its new bytes are the joins |

**The mouth is confined.** Only the generating cell carries seams; clear and witness cells output pairs and chains of addressed spans with nothing between them (`closure.mouthConfined`, computed). **If every contact verdict is UNDETERMINED** the mode cannot be selected; the fold runs at Ground whatever the distance and sets `selectorUnreadable`. Every item carries a computed `stance: { grain, mode, cell }`. Output is the same in all nine: addressed spans interleaved with flagged seams.

**Measured on synthetic fixtures (`grain.test.mjs`), not on a corpus.**
- A reader holding the region's vocabulary but none of its claims is Ground (H = 0).
- Three held of eight did **not** beat the null at 199 draws (exceeded 1, p = 0.01); four held of eight did. A reader holding a few claims in a small W is Ground. That is the strict "beats every draw" rule showing its power, not a bug; it is reported as `null.exceeded`, `null.p` and `null.permutations`.
- A reader holding the whole region is Pattern; the empty reader is Ground, Clearing has seam density 0.
- A reader who holds the region's arrangements beyond the null but about other objects (every verdict UNDETERMINED) is run at Ground.
- Clearing is first at all three grains and the later cells never contain a span Clearing dropped.

**Not done, and not decided.**
- The Figure/Pattern cut is the majority rule, not a measured null.
- Clearing's "U's own null" is the caller's `survives` (default: activation > 0, the ladder's evidence floor).
`claimsOfWhom` reads W with the same claim reader as U; on a three-sentence thread the reader admitted 0 atoms (too little recurrence to admit a subject), so it returns a typed absence, and a W must be a real thread.
- Matching is exact surface (articles stripped, case folded): "approved" never meets "approves".
- The answer ladder is not routed through this; it still answers at fixed sizes.
- The ledger and the twin-reader harness (`callimachus/twin-reader`) have not run against it.

#### Where this was already solved (prior work, read 2026-10-14)

The grain is mostly existing machinery given a second corpus, and the stance table was already canonical. What I found, and what I did not:

| Piece of the specification | Already in | Note |
|---|---|---|
| The nine stance names, mode × grain | `kernel/cube.js` `STANCE_BY_MODE`; `cellOf(op, grain).stance`, stamped by `organs/derivation.js`, `organs/cube-telling.js`, `organs/story-shapes.js` | `grain.js` first hand-typed a copy; it now derives `CELLS` from this table, with a test that they are identical. |
| The cube refuted as a content classifier ("95.7% of naive content-based cell assignments survived shuffling the words") | `docs/THE-MODULE-CENSUS.md`; memory `eoreader7-cube-classifies-moves-not-content` | The addendum's explanation of this (distance is reader-relative) is **not** tested by an arrangement-level distance; see GRAIN-PREREG "What is not claimed". |
| Significance for the reader, measured against a ground built only from the reader's own prior experience, against a permutation null | `eoreader6/scripts/triad-independence.mjs` (copies in `commoncite/eoreader7/scripts/` and `eoWebLLM/eoreader6/scripts/`); `eo-evidence/POLICY.md` P7 notes it reads an absolute path and its numbers are cited in CUBE.md | This is the second-operand thesis, in an earlier form, for one axis, and it cannot run from a clean checkout. |
| The difference window: "walk candidate depths outward and take the shallowest at which forgetting everything older no longer changes what the reader concludes" | `kernel/activation.js` `dmdWindow` | Tracing's hop expansion is this with the reference changed: a shortest walk **is** the shallowest depth that reproduces the conclusion. `grain.js` uses a breadth-first walk, not `dmdWindow` itself. |
| The corroboration verdict (AGREE, SINGLE, UNDETERMINED, DISAGREE, CONTRADICTED) | `organs/capacity-runner.js` `mergeTestimony`, `landContest` ("four walls") | Used unchanged, with U's spans as witnesses to a W span. |
| Interpretation at Ground: a declared gap, a witness, a re-zero | `kernel/notes.js` `declareVoid` / `rezeroVoid` / `foldVoids` (READING-SPEC S70, S71; wall 9, 13/13); `kernel/commitments.js` declare / evaluate / concede (S56, 19 tests) | The one place a whom already existed: the engine's own prior ground. |
| The ledger the work is entered in | `fold-rules/ledger/ledger.json` (RefutationLedger@1) and `preflight.py` | L31–L33 added 2026-10-14. `eo-evidence/` (P1–P8, standing) is the method but is stale (eoreader6, last commit August). |
| Output as addressed span or marked `self:model` | `organs/output-holograph.js` | The contract `seamReport` measures. |

**Two names collide.** `kernel/ground-closure.js` uses "closure" for the ground *closing* (deposits exceed passage: sclerosis, the failure). `grain.js`'s `closure.closed: true` means the *triad is complete*. A reader of the fold's output could take it backwards. `organs/stance.js` uses "stance" for a text's position toward a theme (`in_terms`, `against`, `off_being`), unrelated to the cube's stance. Neither is renamed here: the field names are in a ratified pre-registration, so a rename is an amendment and the user's call.

**A caution from §6.** `closure.closed` is a completeness check on what ran, not evidence the fold is good: the operator-chain closure over UD feature cells was falsified three ways because "closure over this mapping rewards role diversity, not sense". Do not cite `closed` as a result.

**Not found.** The July "Generate-row output-shape ladder" and a file literally named for the August "triad-closure check". Nearest: `CAPABILITY-POLICIES.md` (the-fold-latest root) lines 158 ("every claimed closure lands with a falsifiable specimen") and 232 ("mode, domain, and grain are each closed triads by declaration"), the nine-stage generation modules (`shape.js`, `paradigm.js`, `form-prior.js`), and `triad-independence.mjs`. A pointer is welcome.

### Results: the grain experiment (permanent-dst, runs 1–3, 2026-10-14)

Pre-registration `eval/callimachus/GRAIN-PREREG.md` (ratified, amendments 1–3); runner `eval/callimachus/grain-arms.mjs`; outputs local only, `callimachus-runs/grain-2026-10-14/results{,.run2,.run3}.json`. Runs 1, 2 and 3 agree on every prediction except G6, which was a harness defect corrected in amendments 2 and 3 (amendment 2's diagnosis was incomplete and stays in the log). All 40 W hashes matched.

| | prediction | result |
|---|---|---|
| G1 | the void fold is Ground; Clearing has no seam; closed | **holds** (92 spans, 0 seams, Cultivating 7 seams) |
| G2 | dense: beats the null, Figure or Pattern, moves past every re-dealt null | **holds under the registered measure** (Figure; H 10 of 92, exceeded 0 of 199; d = 0.098 against a null maximum of 0.061, 18 of 18). **U-side movement is 0**: see L36 |
| G3 | B gets Figure | **uninformative**: B's 14 blocks admitted no claim (nor did any of the 19 B nulls) |
| G4 | the chain's grain never falls and the chain stops | **falsified**: Ground, Figure, Figure, Figure, Figure, Ground; not stopped in 5 steps |
| G5 | contract, closure, confined mouth, re-slice | **holds** (7 folds) |
| G6 | the same reader folds the same bytes identically | **holds** after amendments 2–3; only `atoms` and `sha256` bookkeeping differed |
| G7 | all-UNDETERMINED falls to Ground | **uninformative**: not exercised (dense: 10 SINGLE, 1 UNDETERMINED) |
| G8 | calibration: at most 1 of 19 shuffled universes non-Ground | **holds** (0 of 19; `null.real` 0 of 19) |

**What the numbers say, and do not say.**
- **The selector held up; the reader did not.** G8 holds, but the claim reader admitted 766–873 claims from the word-shuffled pages against 573 from the real ones (L34). A count of claims is not evidence of structure.
- **The W reader limits the grain** (L35). Shown exactly the 92 region spans, the reader admitted 50 claims and held 21, so the fold ran at Figure, not Pattern. In the accumulating chain the W only grew, yet admitted claims went 50, 68, 92, 176, 138 and held 21, 17, 12, 33, 11. G4 is falsified by the instrument's non-monotone reading, not by anything the reader holds.
- **G2 "held" and eliminated nothing about the record** (L36). Clearing runs first and emits the whole region at every grain, so the record-side addresses equal the void fold's by construction.
- **Dense, in cells.** Dissecting 0 (no span of the reader's is refused); Binding 10 pairs, no seam; Making 82 items with 57 seams, because 57 of the 82 absent spans share no entity with a held span. The mouth's only work is where the record has no join, as specified.
- **The re-dealt dense nulls** ran 14 at Ground and 5 at Figure. They are sentences drawn from the same record, so some are literally region claims: this null is a null for *which* sentences, not for held-ness.

**Not shown.** Pattern was never reached. "The reader gets the grain it lacks" (G3) was not tested. Nothing here bears on the addendum's explanation of the cube's shuffle-survival.

### Results: the W-reader experiment (permanent-dst, one run, 2026-10-14)

Pre-registration `eval/callimachus/W-READER-PREREG.md`, script `eval/callimachus/w-reader-roundtrip.mjs` (committed `0ef9022e` before the run), output local only `callimachus-runs/w-reader-2026-10-14/results.json`. The reader's verbs are admitted only if they follow `minSurfaces` distinct capitalised surfaces; a short thread cannot clear that (the grain experiment's L35). Tested: a received POS prior as the admitter (R1), against the reader as it was (R0) and against the record's own earned vocabulary (R2, a ceiling, not a prior).

| reader / W | claims | recall of the 92 region spans | precision | shuffled mean claims | shuffled / real |
|---|---|---|---|---|---|
| R0 / the 92 spans shown | 50 | 0.228 (21) | 0.46 | 45.4 | 0.91 |
| R1 / the 92 spans shown | 58 | 0.304 (28) | 0.50 | 73.5 | **1.27** |
| R2 / the 92 spans shown | 136 | 0.978 (90) | 0.71 | 125.3 | 0.92 |
| R0 / twin-reader B (14 blocks) | 0 | 0.000 | n/a | 0.8 | n/a |
| R1 / twin-reader B | 1 | 0.000 | 0.00 | 5.9 | 5.9 |
| R2 / twin-reader B | 19 | 0.087 (8) | 0.63 | 19.3 | 1.01 |

| | prediction | result |
|---|---|---|
| H1 | R1's recall exceeds R0's | **holds** (0.228 → 0.304) |
| H2 | R1's shuffled/real ratio is no higher than R0's | **FALSIFIED** (0.91 → 1.27) |
| H3 | R1 admits at least one claim from B | holds, trivially: 1 claim against a shuffled mean of 5.9 |
| H4 | R1 does not lose precision | holds (0.46 → 0.50) |

**What it says.**
- **The prior as admitter inflates noise more than text.** It added 21 verbs, among them `did`, `was`, `should` (AUX counts as verb-dominant). Refusal worked: it removed 5 non-verbs (`all`, `as`, `from`, `if`, `through`) that recurrence alone had admitted. Ledger L37.
- **The limit is verb admission, and the vocabulary the universe was read with carries it.** With the record's own earned verbs the reader recovers 90 of the 92 spans it was shown. That is not a prior: it is the engine's accumulated vocabulary, and for *contact* it is the correct reader, since a W verb outside the record's vocabulary could match no record claim anyway. On twin-reader's B file (14 blocks) R2 admits 19 claims where R0 admits none and recovers 8 of the 92 spans; that is not a claim about how much B holds, only that the reader is no longer blind to it. (Reading the record's own sentences with the record's own vocabulary is close to circular; the Wdense row, whose blocks are other sentences of the record, is the less circular one: recall 0.109 → 0.511.)
- **Counts are still not structure.** Even R2 admits 125 claims from shuffled text against 136 from real. The signal is the arrangement match to the region, which this experiment did not measure on the shuffles.

**Not shown.** Whether a prior used only as a refuser (minSurfaces 2) beats R0; whether recall under shuffle collapses for R2 (the calibration the grain needs); anything about the grain with R2 as the W reader. Each is a new registration.

### Results: the grain experiment, second registration (record-vocabulary reader, one run, 2026-10-14)

Pre-registration `eval/callimachus/GRAIN-R2-PREREG.md`, runner `eval/callimachus/grain-arms-r2.mjs` (committed `ca104aae` before the run), outputs local only `callimachus-runs/grain-r2-2026-10-14/` (`results.json`, `results.demo.md`). The person's thread is read **through** the record's own earned vocabulary (49 verbs); no received POS prior. All 40 W hashes matched.

| | prediction | result |
|---|---|---|
| N1 | void is Ground, Clearing silent, closed | **holds** |
| N2 | the 92 spans shown are held and run at Pattern | **holds** (136 claims; held 90, absent 2) |
| N3 | calibration of the reader: shuffled-W is not read as holding the region | **holds** (19 of 19 Ground; held at most 7 against 90) |
| N4 | dense beats the null, Figure/Pattern, holds more than every re-dealt reader | **holds** (Pattern; held 47 against a re-dealt maximum of 28) |
| N5 | B is informative and gets Figure, no Making leak | **falsified**: 19 claims, held 8, null not beaten (exceeded 182 of 199, chance mean 9.2); Ground |
| N6 | the chain never falls and stops | **falsified as registered**: the grain never fell (Pattern from step 1) but the stop rule is unreachable by construction (ledger L38); the record-side copied set was identical at every step |
| N7 | calibration of the selector: at most 1 of 19 shuffled universes non-Ground | **holds** (0 of 19) |
| N8 | determinism | **holds** (no differing field) |
| N9 | contract, closure, mouth confined, re-slice | **holds** (9 folds) |

**What it says.**
- **The reader and the selector are now calibrated on both controls.** Shuffled-W: 19 of 19 at Ground; shuffled-U: 0 of 19. Claim counts still do not discriminate (shuffled-W admitted 111–137 claims against 136 real); the held count does.
- **The void fold answers the ask first.** Cultivating's first span is "On July 14, 2026, the House passed a Sunshine Protection Act bill backed by President Trump." (the best-activated span), then the rest of the region, seven seams in 92 items.
- **Pattern, by a margin of two, mostly echoes** (L39). Dense: held 47, absent 45. Tracing shows 48 of the reader's own sentences beside the identical record sentences; Composing and Unraveling are empty; the 45 absent spans are shown in no cell. The fold is closed, addressed and gave the reader almost nothing new.
- **B is not shown a Figure.** B holds 8 spans and chance holds 9.2 on average: it does not hold more than a re-dealt reader would.
- **The chain's growth is an artifact** (L38): W doubles each step because the fold's own copied spans, re-addressed, are added back.

**Not shown.** Whether a measured cut on held beats the majority rule; whether surfacing the absent set at Pattern is the right repair; "the reader gets the grain it lacks" (B's null was not beaten); anything with a person's thread instead of a constructed reader.

### Results: the grain experiment, third registration (the new is never left unshown; one run, 2026-10-14)

Pre-registration `eval/callimachus/GRAIN-R3-PREREG.md` (amendment 1 records a crashed first execution that wrote no result), runner `eval/callimachus/grain-arms-r3.mjs`, outputs local only `callimachus-runs/grain-r3-2026-10-14/` (`results.json`, `answers.html`). The change is in `grain.js`: Composing also places every absent cleared span; Tracing types an echo apart from a walked chain; `forceGrain` and `distance.margin` exist for evaluation. The cut (H > A) is unchanged.

| | prediction | result |
|---|---|---|
| M1 | every absent cleared span is shown in a cell other than Clearing | **holds** (92 folds: 4 asks × void, dense, B, shown and the 19 re-dealt readers) |
| M2 | the cut no longer decides what is new | **holds** (168 forced folds, Figure and Pattern both) |
| M3 | echo typing is truthful | **holds** (the four Pattern folds with a Tracing cell) |
| M4 | nothing else moved vs the second registration | **holds** (void copied set, grains, held, absent; shuffled-W 19 of 19 Ground; shuffled-U 0 of 19; determinism) |

M1 and M2 are close to guaranteed by construction; they show the change works and would catch a regression.

**What the reader is shown now (House ask, dense reader).** Pattern by 47 held against 45 absent (margin 0.022). Tracing: 2 real chains and 46 echoes (96% echo), listed after the chains and collapsed in the page. Composing: no new connection between held things, and 45 new passages, each beside a held passage. Of the 45, 41 have an anchor, 25 distinct anchors, the most-used serving 7; 4 are shown alone. For the other three asks the dense reader is at Figure with 195–209 new passages (ledger L40).

**Not shown.** That the answer is good: no cut ranks the absent set against the reader, attachment is by byte distance when no entity is shared, and no person's thread was used. B stays at Ground for every ask (held 3–8, null not beaten).

### The whom can be any pinned corpus

**[H3] The second argument can be any pinned corpus with a null.** The same operation with a different W:

| U | W | the fold is |
|---|---|---|
| a statute | the logs | an audit; its seams are the amendment agenda |
| a contract | the invoices | a reconciliation |
| the record | a prior answer | a reply |
| the record | a past self | drift |

The code already takes W as an argument: `createForWhom`'s `ground` and `universe` are corpora, not names. The first test pair is the cheapest one: a reply, with W = a prior `telling.addressed.json`. It is H3's falsifier on the smallest scale. A reply must drop or mark as held every claim the prior answer told, and differ from a W = ∅ fold beyond the resample null.

### The crease ledger

**[new; nothing built] The crease ledger C.** Every fold against U is kept as a first-class, append-only object: its W (by hash), Q, N (draws and seed), its output addresses, and its seams. Later folds are then measured against earlier perspectives:
- what this whom was already told (the `heldBy` field);
- what other whoms were told;
- where seams recur, which is where U itself is thin.

It follows the discipline of `form-priors.jsonl` and `document-ledger.js`: append-only, folded on read, never edited. `telling.addressed.json` is already one fold's record. What is missing is the ledger that keys these records by U and W.

**[H4] Recurring seams locate U's gaps.** A seam that recurs across creases from different whoms marks a place the universe cannot join itself. That is a collection target for Wald, and the agenda in the audit case. The falsifier: recurring seams are no more frequent than seams under a whom-label shuffle across the ledger.

### Prior art for zero-model generators

There are two families of generator that use no model, and Callimachus is both:
- **Rulebooks:** Pāṇini's grammar, Llull's wheels. The construction tables and prose laws are a rulebook.
- **Corpora:** the Markov chain run on *Eugene Onegin*, the cento (a poem stitched from lines of other poems), and ELIZA read as "a cento of the whom". Addressed spans are a cento.

The difference from both families is the null and the address. Every joint is a typed seam, every piece is pinned, and no choice is made without beating a null.

---

## 0. The answer in one paragraph

A clause is already a holon: an addressed proposition whose segments say where every word came from. Every larger unit (sentence, paragraph, section, list, table row, slide, stanza) is **the same kind of node one level up**. The parent is built from its children. Its only words of its own are joins and labels, and those may say nothing the children's grounds don't carry. A *shape* is a tree of slots, each slot a small void with features (position, count, class, role word, the move it makes). That tree is never declared. It is induced **for a whom** (the section above), from four sources read through that whom, each deciding its features against its own null:
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
  heldBy,       // whether this whom already holds it (told at <output address>, or a seen Pinax sha256); null = new to them
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
| for-whom frame, fold, three-leg gate | **built** (`kernel/for-whom.js`), not called by Callimachus | fill it with holdings (§For whom); wire as the experiencer and `realizeClaim`'s `whom` |
| dmdWindow | **built** (`kernel/activation.js`) | use it over the whom's holdings for the window |
| crease ledger C (every fold keyed by U, W hash, Q, N, with its seams) | **new**; one fold's record already exists (`telling.addressed.json`) | append-only ledger keyed by U and W; feeds `heldBy`, H1 and H4 |
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
| `minTrajectoryLength = 12`, `minDiscovered`, `minRelevance` | `kernel/for-whom.js` `gateForWhomFold` |

---

## 7. Measured this session

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

### 7.3 Seam density of today's tellings

**Seam density** is the share of output bytes in non-source segments (frame, value, grammar, `self:model`). I computed it from the `segments` arrays in the same pinned eleven files as §7.2 (script mode `seams`).

| telling | bytes | seam density | split (frame / value / source bytes) |
|---|---|---|---|
| permanent-dst | 3,532 | 0.668 | 1,830 / 530 / 1,172 |
| compute-5 | 3,939 | 0.457 | 1,521 / 281 / 2,137 |
| compute-6 | 2,185 | 0.832 | 1,512 / 307 / 366 |
| compute-2, -4, -9 | 1,586 to 1,719 | 0.953 to 0.973 | under 82 source bytes each |
| compute-0, -1, -3, -7, -8 | 1,358 to 1,467 | **1.000** | no copied bytes at all |

**What this shows:**
- Five of eleven 27-cell tellings copy no source bytes at all. They are the grammar describing the record: counts, dates, who was refused.
- That fits H2 (a telling for no whom is a catalog), but it is not a test of H2, because no W was varied.
- It is also a warning for §4. The telling's declared shape puts most of its words in seams, so an induced shape has a low bar to clear on seam density.

Seam density is to be reported first by every fold from build step 0 on.

## 8. Build plan, ranked: smallest licensed step first

Each step is a whole answer on its own, and each has a falsifier and a pre-registered bar written before it runs.
- Nulls declare only draws and seed.
- "Beats the null" means beats every draw (p ≤ 1/(draws+1)) unless the step names its level.
- Bars are run on dev **and** held.
- The pre-registration goes in `eval/callimachus/` beside the drive eval (sibling session), before any result.

### Step 0. Give the whom content, and test the two-whom property

**Files:**
- `organs/whom.js`, new and pure: build the holdings from what already exists. That means `createForWhom` (`kernel/for-whom.js`) filled with the giver, the thread's earlier `telling.addressed.json` files, their Pinax sha256s and told-claim keys, and their prior outputs.
- Pass the result as the ladder's experiencer and as `realizeClaim`'s `whom`.

**Falsifier.** Two failures count:
- two whoms with identical holdings, asked the same words over one pinned universe, get different outputs;
- two whoms whose holdings differ by claims the record would otherwise lead with get the same lead and the same drops.

**Bar.**
- Every fold reports its seam density first.
- Identical holdings give byte-identical outputs: 0 differences.
- Differing holdings give outputs that differ where the holdings differ. Each claim one whom already holds is either dropped with the reason `held` or placed typed as held.
- Every sentence in both outputs re-verifies against its bytes.
- The swap-null: shuffle the holdings between the two whoms (seeded) and the differences must follow the holdings.

This step needs no induced shape, so it runs on today's ladder. It is the smallest move that makes the whom real.

**Status, 2026-10-14 (reconciled with `callimachus/twin-reader`; tests green):**

Step 0's file name and ladder option are taken by the twin-reader branch: `organs/whom.js` (W as pinned bytes, "held" is exact containment, held candidates are **dropped** and every witness re-based on the reader's population; PR scores-patch-points/khora#11). This branch had also built a `whom` ladder option that **ordered** held claims after fresh ones, which would have given a reader two meanings of "held" in one ladder. It is withdrawn from the ladder. It survives in the history (`a557374a`) as a **candidate rival arm**: to be pre-registered against twin-reader's drop semantics, never shipped beside it.

- **Here, and not wired into `answerLadder`:**
  - `organs/holdings.js`: `declareHoldings` (claim keys: `told`, `seen`; refuses a placeholder giver and an omitted holding; `witness: "claim-key"`), `distanceOf`, `partitionByHoldings` (typed `held` reason), `claimsOfWhom(pinned, { slice })` (W's units read by the same claim reader as U, as W spans; a thread too short to admit a claim is a typed absence).
  - `organs/seam-ledger.js`: `seamReport` (addressed share, seam density, mouth share, each seam with the spans it joins, and a contract verdict), `creaseEntry`, `untouchedBy`.
  - `organs/grain.js`: the selection and the nine modes ("Grain" below).
- **Held has two witnesses and they are typed apart.** Byte containment (twin-reader's `heldIn`) is the ladder's. A claim-arrangement match (same subject and predicate, this branch) is a different witness; `foldGrain` reports `distance.witness: "claim-arrangement"`.
- **Bar, as it now stands.**
  - Seam density is reported first: `seamReport`, not yet on the ladder's stages (twin-reader's `seamsOf` feeds `folds.json`; swapping needs its numbers checked before and after).
  - W = ∅ is byte-identical because the ladder is untouched here.
  - The swap-null, the many-whom shuffle, and "differing holdings differ where they differ" belong to twin-reader's pre-registration (P5, P6), not to this branch.
- **Not decided.**
  - The ordering arm's pre-registration.
  - The Figure/Pattern cut.
  - A grain arm in twin-reader's harness: it needs its own pre-registration, committed before it runs.
- **Ledger.** `creaseEntry` makes one record; no ledger is stored, so H4 has nothing to read.

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
- **Twin reader** (`callimachus/twin-reader`, PR scores-patch-points/khora#11): owns `organs/whom.js` and the ladder's `whom` option (W as bytes; held is dropped). Agreed 2026-10-14: this branch renamed its holdings to `organs/holdings.js` and left the ladder alone; seam-ledger.js and grain.js stay. One finding from that branch bears on the grain: its P3 ("a far reader gets more structure") was **falsified**, and post hoc, unregistered, the reader got the grain it *lacks* (a W holding figures was given ground back; a W holding ground was given figures). That is the natural first pre-registration for `foldGrain`, with an accumulating W (a reader who holds only the last fold is a 2-cycle).
- **Drive eval** (`callimachus/drive-eval`): the form layer is admitted or not by that pre-registered harness, never by its own author's measure alone.
