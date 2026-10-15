# The reality levels — an ontology-extraction spec

*Drafted 2026-10-15, at the user's direction. Two questions opened it,
near-verbatim: "how can we talk about the levels of reality of things in
there, extracted mechanically?" and then "how can we use the hyperlexicon to
help with this?" Standing: **design spec** — it names what already exists and
proposes the wiring between the existing organs. Where this document and the
code or its tests disagree, the code and its tests win; where a claim here
names a mechanism, the mechanism is cited by file. First material: the
Titanic, 1912 workspace (`holodeck-samples/titanic-1912/readings.json`, eight
readings of one night).*

---

## 0. The one invariant

A thing's **level of reality is a record, not a label.** It is never assigned
by a model and never read off the thing's own bytes as a verdict; it is
computed at S0–S2 or declared by a named giver at S3, and it is addressed,
givers attached, revisitable. The record has five coordinates:

```
RealityLevel@1 {
  grain        Ground | Figure | Pattern      — the wheel's grain (§1)
  universe     world | counterfactual | hypothetical | stipulated | …   (universe.js)
  realityKind  real | fictionalized-real | fictional | unexamined       (reality-kind.js)
  witnesses    [ { source, instrument, recipe } ]                      (hyperlexicon P57)
  standing     candidate | given | earned | refuted | …                (abstraction registry)
}
```

Nothing in this spec lets a model decide any of those five. Genre is declared,
never induced (reality-kind.js:64); correspondence is measured by an oracle on
facts and by nothing else (THE-CORE-MECHANISM.md:128). The record is evidence;
the mouth voices it and never produces it.

## 1. "Level" is already three named axes — never bare

`native/docs/LEVELS.md` fixed this vocabulary on 2026-09-01; this spec cites
it and does not re-derive it. Rule 1 there is law here too: say **floor** or
**stratum**, never bare "level."

- **floor** (F0–F6) — *grade of operand*: what a mechanism operates ON.
  `F0 units → F1 referents → F2 arrangements → F3 claims → F4½ nesting →
  F5 corroborated notes → F6 premises` (LEVELS.md:16-39).
- **stratum** (S0–S3) — *channel of evidence*: `S0 bytes / S1 script /
  S2 heard / S3 meaning`. The **heard rule** and the **trust rule** bind
  every organ below (LEVELS.md:62-77).
- **the grains** (the wheel) — `Ground / Figure / Pattern`, named once as
  `Void / Beings / Fold` (THE-WHEEL.md, canonical; cited at THE-27-CELLS.md:63,
  THE-CORE-MECHANISM.md:23). "A being is the fold at a point."

Above those, `THE-WAYS-OF-KNOWING.md` names **nine spokes** for how a thing is
known. Three carry the reality-levels question: **4. TRIANGULATION**
(independence COUNTED, never assumed), **5. TESTIMONY** (a named, qualified
giver), **8. APOPHASIS** (a measured absence — the refusal that reached its
object).

## 2. What already exists — cited, not re-derived

| organ | file | what it already answers |
|---|---|---|
| reality-kind | `native/organs/reality-kind.js` | is a referent real / fictionalized-real / fictional — INS·Kind, a fixed 3-template instantiation, never statistical discovery |
| universe | `native/organs/universe.js` | what type of world a build is in, declared before anything is said in it (Handle: Lewis) |
| for-whom | `native/kernel/for-whom.js` | the universe is a coordinate of the frame; one being read for-whom, never recomputed |
| hyperlexicon (ledger) | `native/organs/hyperlexicon.js` | first sighting INS, re-sighting SYN, **witnesses and spans unioned** (P57); `foldWithStanding` |
| abstraction registry | `native/kernel/hyperlexicon-abstraction.js` | the cross-terrain record of *what the system has learned to recognize*; standing ∈ candidate/given/earned/refuted; the META LAW at depth+1 |
| the pair | `native/docs/THE-HOLOGRAPH.md:500-522` | holograph is PER-SOURCE; hyperlexicon is CROSS-READING; its crown is the meta-node |
| nesting's wall | THE-HOLOGRAPH.md:183, THE-WAYS-OF-KNOWING.md:83 | witnesses of "X says P" never corroborate P |
| holon level | `eoreader7/legacy-eoreader6.1/holon_level/index.js` | is one regime a LEVEL above another? `above / peer / unstable` from two Born-null-gated probes |
| source standing (surface) | `holodeck/index.html:3486-3510` | inferRole / STANDING_C / KIND_ORDER — a document's own register, declared |

The four things this spec does **not** re-derive: the floor and stratum laws
(LEVELS.md); the cube and its grains (THE-27-CELLS.md, THE-WHEEL.md); the
three composition families (THE-CORE-MECHANISM.md); and nesting's wall.

## 3. The model — a thing's reality-level, by grain

A workspace holds three kinds of thing, one per grain. Each gets its
reality-level record from the same five coordinates, filled differently.

**A Being (Ground/Figure — a referent).** Its reality-level is its
`realityKind` in each universe it is established in, with the witnesses that
established it. "Captain Smith" is `real` in the `world` universe (witnessed
by the Senate speech, the Board of Trade report, the Beesley memoir, the
Tribune page) and `fictionalized-real` in the film's universe (witnessed by
the screenplay, by correspondence to the world-Smith). "Jack Dawson" is
`fictional` in the film's universe and has no world-end at all: it is not
refused, it is **examined against every declared-nonfiction source and found
uncorresponded** (reality-kind.js:73-78), `checkedAgainst` naming what ran.

**A Claim (Figure/Link — an edge).** Its reality-level is its **standing**,
which is a property of the witness SET and not of any member
(THE-27-CELLS.md, EVA·Pattern `standing`): AGREE / SINGLE / DISAGREE /
CONTRADICTED / UNDETERMINED, with `sources` and `instruments` counted apart
(hyperlexicon.js `foldWithStanding`). The claim `(Titanic, sank, 1912-04-15)`
carries four independent world-witnesses and reads triangulated; the same
claim witnessed only by the screenplay is single-source in a `stipulated`
universe. **A claim's level is its witness set plus the universe those
witnesses stand in**, and nesting's wall forbids the screenplay's witness from
climbing to the world's claim.

**A Pattern (Pattern/Network — a recurrence).** Its reality-level is the
abstraction registry's **standing**: `candidate → given → earned → refuted`,
where a coherent abstraction is provisional until it demonstrates a
consequence, and a refuted row is PRESERVED with its defeat recorded
(hyperlexicon-abstraction.js:15-25).

## 4. The operations — all mechanical, all at S0–S2 or giver-declared

**O1 · `universeOf` — declare the world at birth.** Already built
(`universe.js`). For each reading, the universe is declared from its medium
and its sources before anything is said in it (`DEF·Ground`), and recorded on
the ledger's frame:

- a 1912 account with sources and no stipulated facts → **world**;
- a story with no source → **stipulated** ("referents that exist only in the
  telling"; lookups off — Lily is not on Wikipedia);
- a story with sources and stipulated false facts → **counterfactual**;
- the truth of the stipulation left open → **hypothetical**.

The Cameron screenplay is the worked case: it stands on the 1912 world's
sources and stipulates facts nobody could check, so it reads **counterfactual**
(`universeOf`, `stipulations[].truth === "false"`), and its revision rule is
`stipulate`, never `dispute` — in a told world a person's word replaces the
old one.

**O2 · `classifyReferents` — type a being, cross-source.** Already built
(`reality-kind.js`). The caller declares each source's genre (`fiction` |
`nonfiction`; anything else is **refused**, not guessed). The organ compares
only fiction↔nonfiction name pairs by `namesCorefer` **and a non-generic
shared token**, and returns one row per (source, referent): `REAL` on the
nonfiction side by the source's own declaration; `FICTIONALIZED_REAL` with a
correspondence; `FICTIONAL` with `checkedAgainst` naming every nonfiction
source actually examined. It decides nothing about whether a source IS fiction
— that is the caller's named judgment.

**O3 · witness-standing — level a claim.** Already built, in the ledger.
`foldWithStanding` hands each note its `sources`, `instruments`, `undeclared`,
`standing`, `kinds`; the consumer reads the level and never recomputes one.
The TRIANGULATION spoke is the code: independence is counted, and two sources
through one decoder are one reading (THE-WAYS-OF-KNOWING.md:71-83).

The three operations are the same act in THE-CORE-MECHANISM.md's census, at
three grains: compare a figure to the ground it was rebuilt from (O1 declares
the ground); compare a being to the other readings' beings (O2); count the
witnesses that survived (O3).

## 5. The hyperlexicon wiring — the proposal

This is the new work. The hyperlexicon is the CROSS-READING half of the
holograph pair (THE-HOLOGRAPH.md:500-522): "the earned knowledge of many
readings, which becomes the received floor of the next." Reality-level is
exactly such cross-reading knowledge, so it belongs here and not in any single
reading.

**Where each wire lands (one owner per capability, SYSTEM-MAP:64).** The
hyperlexicon's one home is the khora — `janus/native/kernel/hyperlexicon.js`
is a SHIM (`export * from "…/khora/native/kernel/hyperlexicon.js"`), so
janus imports the registry and never copies it. Therefore **W1, W2 and W4
change the khora's data structure** (`kernel/hyperlexicon.js`,
`kernel/hyperlexicon-abstraction.js`); **W3 is a janus derivation** (the
cross-source identity adjudication, mode Relate). §11 gives the full wiring.

**W1 · Reality-kind rows become abstraction rows, with standing.** (khora —
the registry's home.) Today
`reality-kind.js` recomputes the cross-source comparison on every call, and
its own disclosed limit is that a referent called fictional today "could
correspond to a second source nobody checked yet" (reality-kind.js:75-77).
Register each classification as an accountability row keyed by
`(referent, universe)`:

```
(referent:smith, is-reality-kind, real)             witness in universe:world
(referent:dawson, is-reality-kind, fictional)       checkedAgainst:[world sources], standing:candidate
```

Standing starts `candidate` — nominated by an encounter, not yet tested. A
later reading that finds a correspondence **refutes** the fictional row
(`refuteAbstraction`), which PRESERVES the defeat rather than overwriting the
old classification (hyperlexicon-abstraction.js:214-243). That is the honest
form of "examined, not convicted": the ledger holds what was examined and
when, and a later examination that changes the answer is a recorded revision,
never a silent flip.

**W2 · `universe` joins the composition coordinate.** (khora — the registry's
home; janus enforces the license when it derives.) The abstraction registry
already keys composition affordances on a coordinate space
(`cell: · terrain: · grain: ·`, hyperlexicon-abstraction.js:8-14). Add the
universe as a fourth coordinate:

```
compositionCoords(hl, left, right, { leftOp, leftGrain, rightOp, rightGrain, universe })
```

Then a composition license earned reading the 1912 record — `sank(steamship,…)`
composes — does NOT carry into the screenplay's counterfactual universe, and
`hl.js`'s own law ("only a GIVEN affordance with a named giver licenses
composition", THE-WAYS-OF-KNOWING.md:98-121) refuses the join. This is
nesting's wall made per-world and mechanical: cross-universe composition is
refused unless an affordance is declared for that universe.

**W3 · The crown carries for-whom — the fiction boundary is the meta-node's
shape.** (janus — mode Relate; the cross-source identity adjudication.) The
hyperlexicon's crown is the meta-node: "the same being across
translations, adjudicated for-whom" (THE-HOLOGRAPH.md:513; for-whom.js:83-99).
A meta-node is one being with a `for-whom` per universe. "Smith" is one
meta-node with a **world-end** (several world-witnesses) and a **telling-end**
(the screenplay, `fictionalized-real` by correspondence). "Dawson" is a
meta-node with a telling-end and **no world-end** — fictional by the shape of
the ledger, not by a threshold. No rule decides fictionality here; the
absence of a world-end does.

**W4 · The meta law teaches the extractor itself.** (khora — the registry's
home; the depth+1 row is an abstraction like any other.) A Pattern-grain
abstraction may belong to a meta-abstraction of the same terrain at `depth+1`
(hyperlexicon-abstraction.js:31-38; THE-KINDS-ON-KINDS.md). Read the Titanic,
then Borodino, then Schleswig, and the recurring shape of reality-level
distinction ("an official report's numeric claims recur across independent
sources; a compilation's do not") becomes a depth+1 abstraction that primes
the next corpus. That is the loops-on-loops the holograph doc predicts:
ontology-extraction earning a received floor.

## 6. The Titanic walkthrough

`holodeck-samples/titanic-1912/readings.json` holds eight readings, and the
spec's whole point is that their differences are almost entirely standing and
universe, not operand grade.

| # | reading | genre (declared) | universe | level it occupies |
|---|---|---|---|---|
| 0 | Senate speech (Smith) | nonfiction | world | a witness with a giver |
| 1 | Board of Trade report | nonfiction | world | an institutional finding |
| 2 | Beesley memoir | nonfiction | world | first-person witness |
| 3 | Marshall compilation | nonfiction | world | second-hand, restated |
| 4 | Walker, *Unsinkable* | nonfiction | world | a thesis ABOUT the event |
| 5 | "Numbers saved" table | nonfiction | world | figures, no prose |
| 6 | Tribune front page + OCR | nonfiction | world | S1 stratum (pixels read by machine) |
| 7 | Cameron 1997 script | **fiction** | **counterfactual** | not a 1912 account |

The sample already declares the fiction case in prose (readings.json, note on
[7]: "a modern, fictional retelling, not a 1912 account"). That is a received
prior with a giver — it is not derivable from the bytes, and this spec does not
pretend it is.

Run over the eight casts:

- **`classifyReferents`** with genre {7: fiction, rest: nonfiction}: `Smith`,
  `Ismay`, `Andrews`, the officers, `Moody` — `REAL` on the world side;
  `fictionalized-real` where the screenplay names them. `Jack Dawson`,
  `Rose DeWitt Bukater`, `Cal Hockley` — `FICTIONAL`, `checkedAgainst` naming
  the seven nonfiction readings actually compared.
- **The "band played as the ship sank" claim** — the spec's exemplar. In the
  world it is a claim with several witnesses and a contested polarity
  (`Nearer, My God, to Thee` vs. other tunes); its reality-level is its
  standing and its witness set, and the disagreement stays on the record
  (EVA·Pattern `standing`). In the screenplay the same sentence is a
  stipulation, level `stipulated`, and nesting's wall keeps its witness from
  climbing to the world's claim.
- **The meta-node of "Captain Smith"** spans all eight readings and carries
  `for-whom` per universe; the crown's job (W3) is to hold the world-end and
  the telling-end apart, and to render "According to X" from the standing
  cell, never from a string.

## 7. Controls and falsifiers (II.23 discipline)

Every organ above already ships a control or a named refusal; the wiring must
not lose them.

1. **The genre refusal is a control.** A source handed to `classifyReferents`
   with no genre is REFUSED (`no_genre_declared`), never guessed
   (reality-kind.js:118-121). The spec keeps this a hard refusal: no universe,
   no level.
2. **The generic-token guard is a built-to-fail.** A cross-document identity
   claim on a common given name ("pierre") is refused
   (reality-kind.js:86-109) — and its disclosed cost (it also refuses the
   correct Napoleon/Kutuzov) stays named, opt-in, off by default.
3. **The stipulated universe is the falsifier for W2.** Plant the screenplay
   alone (no world sources) and the composition that reads `world` must
   return nothing; widen to the eight readings and the world compositions
   lift. If a world license composes inside the stipulated universe, W2 is
   wrong.
4. **A stated-then-confirmed prediction for W4.** Before the depth+1
   abstraction exists, predict that the reality-level kinds it learns on the
   1912 corpus recur (unlifted) on a held-out multi-account corpus; if the
   second floor reads flat, the seam starved its objects and W4 is refuted
   (THE-KINDS-ON-KINDS.md:42-49).

## 8. What this refuses to claim

- **Genre is declared, never induced.** The system computes nothing about
  whether a source IS fiction; the caller names it, with a giver.
- **Coherence is not correspondence.** This apparatus establishes which
  standing, stated by whom, corroborated by how many independent readings —
  never which account is TRUE to the night. Only an oracle on facts says that
  (THE-CORE-MECHANISM.md:128).
- **Fiction is not non-existence.** "Fictional" means examined against every
  declared-nonfiction source and found uncorresponded, `checkedAgainst`
  naming what ran (reality-kind.js:71-78) — never "does not exist."
- **The model decides nothing.** Every coordinate of `RealityLevel@1` is
  computed mechanically or declared by a giver. This is LEVELS.md's trust
  rule as a schema.

## 9. Cells and registration

- `realityKind` is already an organ at **INS·Kind** (capacities.js:380-388),
  a second organ beside `skill` at the same cell.
- The reality-kind **registration** (W1) is SYN·Figure in the hyperlexicon's
  own grammar — a re-sighting folds into the same note with witnesses unioned
  (THE-27-CELLS.md, `hear`), not a new INS birth.
- The composition **coordinate** (W2) is an extension of the existing
  coordinate key space, not a new dictionary.
- `universeOf` is the frame's `universe` coordinate at `DEF·Ground`
  (for-whom.js:83-99); the ledger records it at birth, once.

## 10. Open

1. The `(referent, universe)` key into the abstraction registry is proposed,
   not built; the registry's row id is currently over `(cell, depth, label)`
   (hyperlexicon-abstraction.js:118-120) and needs the referent+universe
   extension, or reality-kind notes ride `hears` under a verb like
   `is-reality-kind` and the registry reads them.
2. The fiction↔nonfiction correspondence is name-level and weak; composing it
   with `bridges.js`' corroborated triples (stronger, where both exist) is
   real, scoped, unattempted work (reality-kind.js:56-62).
3. The depth+1 abstraction (W4) has no first measured run; THE-KINDS-ON-KINDS
   is the model for how to state its prediction before building it.
4. `holon_level`'s `above / peer / unstable` is the vocabulary for asking
   whether one reading's account stands as a level above another's on a
   series (existence-dependency + possibility-constraint); wiring it to the
   corroboration tier is named, not done.

## 11. Wiring — into the khora, janus, penelope, and the surfaces

The Fold is a three-body spine, and the reality-levels work crosses all three.
The modes are fixed (`janus/README.md`; `penelope/SYSTEM-MAP.md`):

| body | mode | owns | keeps |
|---|---|---|---|
| **khora** | Differentiate | every organ, adapter, kernel module — the base; produces ground | nothing (releases the trace) |
| **janus** | Relate | the reasoning closure — reaction, refutation, cascade, derivation, logos; **imports** the khora | nothing of its own |
| **penelope** | Generate | the generation spine + the ledger + the mouth + the seal | the record |
| **the-fold / holodeck** | — | the port + the page; runs the khora's organs in the tab | the browser store |

Two facts fix the seams. `janus/native/kernel/hyperlexicon.js` is a SHIM
(`export * from "…/khora/native/kernel/hyperlexicon.js"` — "ONE home: khora is
the base"); and penelope reaches siblings only through
`organs/kernel-reach.mjs` (`KHORA_HOME`/`JANUS_HOME`, typed `<repo>-absent`).
So **the hyperlexicon registry is the khora's; janus is its consumer.**

### 11.1 khora — perceive the level (Differentiate)

The level is a fold over the record, perceived here, model-free.

- **`level-profile.js` (new organ — BUILT, `native/kernel/level-profile.js`,
  tested in `native/tests/level-profile.test.js`).** For each referent, count
  which of the nine terrains its own *admitted* acts landed on
  (`clearance`, `relations`, `cast`, `kinds`), and emit `EOLevelProfile@1` — a
  3×3 occupancy with **typed absences**, a grain mix, and a
  `permutationControl` (the II.23 shuffling null). Legal because a cell types
  an act (`THE-27-CELLS.md:69`); the referent is never given a cell from its
  content. Emanon/protogon/holon fall out as the grain mix, replacing the
  `MASS_FLOOR`/coupling thresholds fitted to Frankenstein
  (`legacy-ported/packages/host/corpus.js`).
- **`universe.js` + `reality-kind.js` (exist).** `universeOf` declares the
  world at birth; `classifyReferents` types the being cross-source. Genre stays
  caller-declared (`reality-kind.js:64`); a source with no genre is refused.
- **The registry extension (W1/W2).** Reality-kind rows land as hyperlexicon
  abstraction rows with standing; **W2 is BUILT** — `compositionCoords` now
  takes a `universe` and consults universe-tagged coordinates before the
  universal (untagged) key space, so a license tagged `@world` never carries
  into `stipulated` (`kernel/hyperlexicon-abstraction.js`, tested in
  `native/tests/hyperlexicon-abstraction.test.js`); W1 (the reality-kind row)
  remains proposed. This is the khora's `kernel/hyperlexicon.js` +
  `kernel/hyperlexicon-abstraction.js` — the data structure, not the derivation.
- All three ride out the khora door `POST /v1/read` as **addressed**
  `EORead@1` records, so every surface gets the level with its bytes. The khora
  releases it; penelope keeps it.

### 11.2 janus — relate it across readings and worlds (Relate)

Everything "what follows from the record" is janus, and it **imports** the
khora's registry via the shim.

- **W3, the crown/meta-node for-whom.** Cross-version identity ("the same
  being across translations, adjudicated for-whom") is a Relate act: janus
  holds the meta-node, the khora holds the graph it reads.
- **Nesting's wall as a refutation rule.** "A stipulation from the film cannot
  compose into the world" is `reaction.js`/`refutation.js` territory — the
  per-universe composition license is *enforced* here, over the coordinate the
  khora declared (W2).
- **The seam** is `khora/native/organs/reason-gate.js` (`classifyTurn`→
  `derive`, reason-gate.js:143): khora *settles* (perceives the level) → janus
  *derives* (relates across sources and worlds) → khora *surfaces*.

### 11.3 penelope — keep, seal, and voice it (Generate)

- **The record.** Reality-level records are **sealed** here (a facing page per
  artifact); the ladder `read → box → hunt → mouth → test → seal` is where a
  *claim's* level is **tested** (test) and **sealed** (seal). The standing
  rules go in `GLAUCA-EOT.md` / `TAPESTRY.md` (append-only, each with a
  falsifying control).
- **The mouth.** Every model call routes through penelope's mouth; the level
  reaches it **with addresses struck** — the mouth *voices* standing, never
  computes it (the holograph firewall). "Whose ground is this read against" is
  the per-claim question the mouth's admission answers.
- **The DMD gate.** `inUniverse` already lives in penelope's prose adapter;
  the `universe` coordinate joins it, so a generation in a stipulated world is
  gated apart from one in the world.
- Reaches khora and janus via `kernel-reach.mjs`; a missing sibling is a typed
  skip, never a re-derivation.

### 11.4 the holodeck / the fold (draw it)

- The surface **vendors the khora's organs** through the one refresh script
  (`SYSTEM-MAP` migration #2) — `level-profile`, `reality-kind`, `universe`
  are never re-implemented. This kills reinvention #1 (the inline stance) and
  #3 (the hand-vendored copy) in the same move.
- The browser port renders the per-referent 3×3 occupancy, the per-claim
  standing, and the per-source universe — **as records**, addresses on the
  record and struck at the mouth. It reads penelope's sealed records for the
  ledger view and adds no ontology logic.

### 11.5 The flow, and the rules that hold it

**khora perceives** (`LevelProfile@1` + `universe` + `reality-kind`,
addressed) **→ janus relates** (registry: identity, per-universe license,
meta-node) **→ penelope keeps and mouths** (seal, ledger, addresses struck) **→
the holodeck draws; the fold is the whole.**

- **One owner per capability** (SYSTEM-MAP:64): level-profile organ → khora;
  registry extension → khora kernel; identity adjudication + refutation →
  janus; seal/mouth/ledger → penelope; render → surface.
- **The khora keeps nothing:** the profile is a trace, released; the record is
  penelope's.
- **Givers named:** genre and universe declared at the surface or by a received
  prior; a source with neither is refused, never guessed.
- **Falsifiers travel into the khora** (II.23); penelope's red rungs become
  standing rules, not retries.

---

## 12. The register face, and disambiguation by for-whom

A thing's profile must answer, in a person's words, **what it is and who is
saying so** — the user's own bar: *"I don't know what 'the Great Eastern'
is."* That face is **fiction vs journalism and kin**, and it lives in
`native/kernel/reality-register.js` (built — tested in
`native/tests/reality-register.test.js`).

**Two axes, kept apart.** REGISTER is a property of the SOURCE, DECLARED by a
giver, never induced (a source with no register is refused). REALITY is a
property of the THING, read from where it is attested and from an external
world anchor. A source that makes truth-claims (journalism, report, testimony,
reference, data) anchors a thing in the world; a source that tells a story
(fiction) does not. The fold is `realityRegister`: fiction-only → fictional;
truth-claiming only → real; both → fictionalized-real; no truth-claiming
attestation, no anchor → unexamined.

**Wikipedia is the anchor, and it answers "what is this".** The lead sentence
of a name's article is the plain description a person needs — *"SS Great
Eastern was an iron-hulled steamship designed by Isambard Kingdom Brunel"* —
and the same lead gives world from story (classifyAnchor over the lead). The
resolver uses Wikipedia's **action API** (the REST summary endpoint answered
429 here; the action API answered 200 with the same lead).

**Disambiguation is the for-whom work (S113 — identity exists only for-whom).**
A bare name is ambiguous: "Great Eastern" is a disambiguation page, "Carpathia"
the Roman province, "Lusitania" the province not the ship. Wikipedia **proposes**
senses (the disambiguation links, or a search); it does not decide. The FRAME
decides: the for-whom's `question` biases the search, its universe coordinate
admits the world- or story-family of senses, and — decisively — the for-whom's
GROUND, the **hyperlexicon's earned correspondences**, resolves an established
name before the network is even hit. Measured here: name-only Wikipedia FAILS
on its own ("Lusitania" → the province; "the Great Eastern" → "Sinking of the
Titanic"), and the same names resolve correctly the moment the earned
correspondence is in the frame's ground. So the resolver proposes and, when no
single sense wins, returns a **typed ambiguity with its candidates** — never a
silent wrong pick.

**The read lands as case-law.** `registerNotes` emits `(referent,
is-reality-kind, real)`, `(referent, attested-by, journalism)`, `(referent,
corresponds-to, wikipedia:SS_Great_Eastern)` — ordinary hyperlexicon notes
(`hyperlexicon-routes.js`'s `noteId` shape), so the NEXT for-whom resolves from
the ledger, and a later finding that contradicts one is a recorded revision,
never a silent flip.

**The face, shown.** On the Titanic workspace, registers declared per reading,
the profile of a thing renders as:

```
the Great Eastern — real
   told by:   Commentary, Report
   what it is: SS Great Eastern was an iron-hulled steamship designed by
               Isambard Kingdom Brunel, and built by John Scott Russell & Co. in 1858.
Titanic — fictionalized-real
   told by:   Report, Testimony, Fiction          (the 1912 accounts AND the 1997 film)
   what it is: RMS Titanic was a British ocean liner that sank on 15 April 1912…
Jack Dawson — fictional
   told by:   Fiction
```

**One coordinate named.** The for-whom's `universe` field is the
referents/relations it can hold (an array); the world/fiction coordinate is a
separate fact (`universeOf`, organs/universe.js). The resolver reads the
coordinate (`universeKind`) and never the array.

## 13. The profile page — the surface wireframe

The surface renders a thing as a page whose headline is a person's question —
**what is this, and who says so** — built by `native/kernel/profile-page.js`
(pure, surface-neutral; tested in `native/tests/profile-page.test.js`), which
composes the reality-register face (§12), the claims with their standing, and
one muted engine line. It draws records and decides nothing.

```
╔════════════════════════════════════════════════════════════════════════════╗
║ the Great Eastern                                            ● real · 1858 ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║ SS Great Eastern was an iron-hulled steamship designed by Isambard King…   ║
║ ↳ what it is · Wikipedia https://en.wikipedia.org/wiki/SS_Great_Eastern    ║
║                                                                            ║
║  TOLD BY ───────────────────────────────────────────────────────────────── ║
║ ▪ board-of-trade-1912   Report · truth-claiming                            ║
║ ▪ walker-unsinkable-1912   Commentary                                      ║
║                                                                            ║
║  WHAT THE SOURCES SAY ──────────────────────────────────────────────────── ║
║ ● the largest ship of her day, exceeded only by the Titan… 2 of 2 src      ║
║ ● her watertight bulkheads ran to the topmost deck 2 of 3 src              ║
║ ◐ 680 ft long · 27,000 tons from the report's table                        ║
╚════════════════════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════════════════════╗
║ Titanic                                        ◐ fictionalized-real · 1912 ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║ RMS Titanic was a British ocean liner that sank on 15 April 1912 after …   ║
║ ↳ what it is · Wikipedia https://en.wikipedia.org/wiki/RMS_Titanic         ║
║                                                                            ║
║  TOLD BY ───────────────────────────────────────────────────────────────── ║
║ ▪ board-of-trade-1912   Report · truth-claiming                            ║
║ ▪ beesley-memoir-1912   Testimony · truth-claiming                         ║
║ ◇ cameron-screenplay-1997   Fiction · NOT evidence                         ║
║                                                                            ║
║  WHAT THE SOURCES SAY ──────────────────────────────────────────────────── ║
║ ● built by Harland & Wolff, Belfast 4 of 4 src                             ║
║                                                                            ║
║  DISAGREEMENTS ─────────────────────────────────────────────────────────── ║
║ ◐ lives lost                                                               ║
║ ◐ the band played as she sank                                              ║
║ 1,500 (British report) ⟷ 1,635 (Marshall, 1912)                            ║
║ agreed by 4 sources · the tune disputed by 2                               ║
║                                                                            ║
║ ▸ engine · Ground █ · Figure ▆ · Pattern · (6/9 terrains absent)           ║
╚════════════════════════════════════════════════════════════════════════════╝

╔════════════════════════════════════════════════════════════════════════════╗
║ Jack Dawson                                             ✕ fictional · 1997 ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║ ▸ No world anchor found — no truth-claiming source attests it,             ║
║ and Wikipedia places no such being in the world. (examined, not convicted) ║
║                                                                            ║
║  TOLD BY ───────────────────────────────────────────────────────────────── ║
║ ◇ cameron-screenplay-1997   Fiction · NOT evidence                         ║
╚════════════════════════════════════════════════════════════════════════════╝

   Titanic, 1912 — one night, several accounts ─────────────────────────────
     ● real   Titanic · Carpathia · Capt. Edward Smith
     ◐ fictionalized-real   Titanic (the film's)
     ✕ fictional   Jack Dawson · Rose DeWitt Bukater
     ? unexamined   the 'unsinkable' claim
```

**The design rules, and why.**

- **The headline is a person's question.** `● real / ◐ fictionalized-real /
  ✕ fictional / ? unexamined` replaces the engine's emanon/protogon/holon.
- **Register rides the source; reality rides the thing** (§12). The TOLD BY
  block IS the apparatus; the fiction line is marked *NOT evidence* (nesting's
  wall, rendered).
- **The engine's occupancy is one muted line**, `▸ engine · … (N/9 terrains
  absent)` — `levelProfile` collapsed, a stack trace, never the page.
- **Disagreements are a first-class row** (`⟷`), because "do they agree" is
  what a reader asks.
- **Every line traces to a record** — the source, the figure, the address; an
  unanchored name says so (*examined, not convicted*), never smoothed.

**The API.** `profileCard(thing, { reality, level, claims, width })`,
`profileIndex({ title, things, width })`, `LEGEND`, `REALITY_BADGE`.

## Appendix — append-only revision ledger

Each entry records a decision, dated, without erasing prior entries.

### 2026-10-15 — the first fold

- The question is framed as a **record** (`RealityLevel@1`), not a label;
  every coordinate is mechanical or giver-declared (§0).
- "Level" is cited as three named axes — floor, stratum, grain — never bare
  (§1), per LEVELS.md's rule 1.
- The modelling reuses `reality-kind.js` (O2), `universe.js` (O1) and the
  hyperlexicon's `foldWithStanding` (O3); none is changed (§4).
- The proposal is four wires into the hyperlexicon: reality-kind as
  abstraction rows with standing (W1); `universe` as a composition coordinate
  (W2); the crown's for-whom as the fiction boundary (W3); the meta law as
  the extractor learning itself (W4).
- First material: the Titanic workspace; the screenplay is the counterfactual
  control.

### 2026-10-15 — the wiring (§11)

- The reality-levels work is placed on the three-body spine (khora
  Differentiates, janus Relates, penelope Generates; the surface draws), per
  `janus/README.md` and `penelope/SYSTEM-MAP.md`.
- **§5 corrected by ownership:** the hyperlexicon registry's one home is the
  khora (`janus/native/kernel/hyperlexicon.js` is a re-export shim), so
  W1/W2/W4 change the khora's data structure and **W3 alone is a janus
  derivation**.
- A new khora organ, `level-profile.js`, is named: a referent's level is a 3×3
  terrain-occupancy fold over its own admitted acts, with typed absences —
  never a lookup (§11.1).
- The claim-tested-and-sealed leg is penelope's (test → seal); the
  address-struck mouth and the `inUniverse` DMD gate carry the ground side
  (§11.3).
- The surface vendors the khora's organs by the one refresh script and adds no
  ontology logic (§11.4).

### 2026-10-15 — the first organs built

- **`native/kernel/level-profile.js`** lands (§11.1): a referent's level is a
  3×3 terrain occupancy folded over its own admitted acts, with typed absences,
  a grain mix, the emanon/protogon/holon nomination, and a `permutationControl`
  (the II.23 null). `native/tests/level-profile.test.js`, 9 tests: the terrain
  aggregation over modes; the grain-mix nomination; typed refusals for
  unaddressed/untyped/non-cell acts; the disclosed empty being; and the
  II.23 positive (grain-clustered establishes) and negative (flat does not)
  controls.
- **W2 lands** (§5, §11.2): `compositionCoords` gains an optional `universe`;
  a license tagged `@world` is not consulted under `stipulated`, an untagged
  row is universal, and without a declared universe the lookup is byte-identical
  to before. Tested in `native/tests/hyperlexicon-abstraction.test.js`.
- **Still open:** W1 (reality-kind rows as abstraction rows), W3 (the janus
  meta-node derivation), the penelope seal/mouth leg, and the surface vendor.
  The `level-profile` organ's own cell/registration is not assigned — an empty
  cell is a lead, not a verdict (C4).

### 2026-10-15 — the register face, and disambiguation by for-whom (§12)

- **`native/kernel/reality-register.js`** lands: a thing's profile gains a
  register/reality face answering *what is this and who says so*. Register is
  DECLARED (source, giver-named, refused if absent); reality is a fold over
  attestation and a Wikipedia world anchor. Tested in
  `native/tests/reality-register.test.js` (5 tests).
- **Wikipedia answers "what is this"** (the lead sentence) and tells world from
  story; the resolver uses the action API (the REST summary endpoint 429'd here).
- **Disambiguation is the for-whom** (S113): Wikipedia PROPOSES senses, the
  frame's universe admits a family, and the hyperlexicon's earned correspondences
  DECIDE. Measured: name-only Wikipedia fails ("Lusitania" → the Roman province,
  "the Great Eastern" → "Sinking of the Titanic"); the earned name resolves
  correctly. An unearned ambiguity is TYPED with its candidates, never a silent
  wrong pick.
- The read lands as hyperlexicon notes (`is-reality-kind`, `attested-by`,
  `corresponds-to`) — case-law for the next reading.

### 2026-10-15 — the profile page (§13)

- **`native/kernel/profile-page.js`** lands: `profileCard`, `profileIndex`,
  `LEGEND`, `REALITY_BADGE` — a pure, surface-neutral renderer composing the
  register/reality face, the claims with their standing, and one muted engine
  line. Tested in `native/tests/profile-page.test.js` (6 tests).
- The headline is a person's question (*what is this, who says so*); the
  engine's terrain occupancy is one collapsed line; disagreements are a
  first-class row; every line traces to a record.
