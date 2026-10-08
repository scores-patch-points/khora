# The scene folding — draft (2026-10-08)

The mechanical fold of a read BOOK, in Greek, no model. Committed as a DRAFT:
the spine runs end to end, the kinds are partially degenerate, and the finding
is on the record.

## The pipeline (each driver)

```
EOT      greek-read.mjs        the pro-drop seam reads Greek clauses (subject·verb·object + CASE)
         greek-odyssey.mjs     the EOT read AGAINST the Iliad as prior (verb-level surprise)
scenes   action-situation.mjs  action situations bounded by BAYES-surprise to the holograph
                               (admit().bayes over {position,actor,action,outcome}) + the
                               position-vocabulary ground (a new role ends a situation)
kinds    scene-kinds.mjs       janus induceKinds over each scene's {position·action·outcome}
                               company -> SCENE-KINDS, falsified against the frequency band
```

## What works (measured, Odyssey 100–120k chars)

- Greek EOT: ~800–1000 clauses; pro-drop subjects typed, never fabricated.
- Scenes: 180–405 action situations, bounded by the delta to the holograph; the
  Iliad seeds the carried ground so the Odyssey's openers are real surprise.
- Induced scene-kinds: janus clusters situations by company; **genuine kinds
  emerged** — the nostos-return (`νοστήσας·πατρίδα` ×2), the god-scene (`θεῶν` ×3),
  the cattle-taboo (`ἤσθιον·βοῦς`) as its own kind.

## The finding (the falsifier fires)

`K00` = the 341-of-405 blob (scene with little but `∅:Acc`/`o:∅`), most kinds
singletons. The induction is at the wrong ELEMENT GRAIN — I fed surface verbs and
case-pairs (every verb near-unique), so scenes only cluster on the empty seats.
That is the measured "a kind must be more than a frequency band" wall.

**Next lever (names itself):** induce the ELEMENTS into kinds first — verb LEMMAS
(from the case-morph priors), ROLE-classes (agent/patient/recipient, not `Nom:Acc`
pairs), outcome-kinds — then run the scene-kind induction again. The blob dissolves
into the Ostrom kinds (reception, assembly, intrigue, landing, taboo, destruction, reunion).

## The swarm falsification (2026-10-08) — scene-kinds do NOT resolve at this element layer

Five ants, one EOT (Odyssey, 981 clauses), measured on the same metrics. Converged verdict: **falsified**.

| ant | lever | result |
|---|---|---|
| terrain | sim × threshold sweep, both scene grains | **0 of 20 cells non-degenerate**; blob→singleton cliff, no middle |
| elements | element-kinds BEFORE scene-kinds (two-level) | **falsified** — the blob moves UP a level; the degeneracy is **recursive**, not element-grain |
| seq | bigram/trigram transitions as company | blob 100%→90%, never resolves; "right axis, elements too shallow" |
| scenes | arena-granulation 8/15/25 + DMD-typed | **falsified** — bigger arenas share MORE generic elements and weld HARDER; blob 1.000 at every grain |
| gold | 30 hand-labelled scenes (GoldScenes@1) as testament | **NMI 0.000** for base/bag; trigram's 8 kinds are singleton noise (NMI 0.256) |

The mechanism: a **weld** — single-linkage connects the whole corpus at a generic-seat similarity floor (`o:∅` · pro-drop `(∅)` · `v:Past:Act:Ind`; coarse welds at jaccard 0.206, fine at 0.143 via `agt:gen` alone), and above the floor only unique-tail scenes survive as singletons. Two catches: the **shuffled-scene-company null is vacuous** under intrinsic separation (permuting whole vectors = a graph relabel; it fires only against an external gold), and no induced cell clears the **frequency-band** falsifier.

**The one surviving lever:** the elements are TOO SHALLOW. The scenes' distinguishing content lives in the **outcomes** — δῶρα, βοῦς, μνηστῆρες, the loom, the bow — which are surface-unique or `∅`. Until the noun/object layer has its own kinds (Greek noun lemma + being resolution; the weak `greekBeings` is the known gap), role·tense·∅-outcome will always weld. **The scene-kinds need the object-kinds underneath them.**

## The law (archons: Houdini · Ostrom · Rubin · Itti-Baldi · Koopman)

- A scene is an Ostrom action situation: `{positions (Ground) · actors (Figure) ·
  actions→outcomes, valenced (Pattern)}`.
- A scene starts where the ground is most wrong; ends where belief is revised
  (bayes-delta to the holograph); typed once/finite/recurring by the DMD of its
  surprise stream.
- Kinds of scenes are INDUCED from company, never taught; the priors supply the
  grammar (pos·case-marking·morphology) and the carried ground (expectation), never
  the kinds themselves.

## Rung status (the ninth-layer build, 2026-10-08)

| rung | state | record |
|---|---|---|
| 1 `NUL` | named | the empty chapter-expectation; bayes-surprise's `createHolograph` is its mechanism |
| 2 `SIG` | measured | the pro-drop seam, 89.4% case on UD PROIEL; this session's 981 Odyssey clauses |
| **3 `INS`** | **done** | `layer0-ins.mjs` + `janus/priors/lemma/grc-lemma.json`: stem by the case prior + PROIEL lemmas, ending-prior as the gate, pronouns excluded → Telemachus ×5-cases, Odysseus (incl. -ῆος), Athena, Penelope, γυνή ×5, ἀνήρ ×6, θεοί ×6 |
| 4 `SEG` | partial | scenes bounded by bayes-to-the-holograph + position-vocabulary; arena grain still misfit |
| 5 `FLD∨…` | principled | the weft/nomos as the garden; MOUTH-LAST |
| 6 `CON` | **worked — stigmergically** | **`scene-trails.mjs`: deposit · evaporate · follow** — every scene deposits +1 on each referent-kind it holds; every scene evaporates (×0.92, prune <0.05); the kinds are the trails that SURVIVE because they recur (ἀνήρ 2.47, θυμός 2.41, Ζεύς 2.25, θεός, χείρ, **ξεῖνος** — the guest, the xenia center — οἶνος, θάλασσα, πῦρ). Each scene kinds to its strongest surviving trail; the sequence IS the referent-rhythm. **The static weld (0-of-20 similarity cells non-degenerate) dies; the stigmergic key is recurrence over the log — the ant-swarm's own deposit·evaporate·follow, no fitted threshold.** |
| 7 `DEF` | **falsified at this grain — the type-layer is NEXT** | the DEF-rung swarm (config/follow/prior/gold2): config-trails recur 0× in a 190k read (the survivor is a tail artifact; falsifier fires); reference-trail vs human types = chance (NMI 0.646, null 0.622±0.028, z=0.9 — the trail is a GROSZ CENTER, not a scene-kind); but cross-book stigmergy WORKS (the Iliad's war-trails carry; the Odyssey's surviving new: trails are the household set) and FOLLOWING the trails gives a real summary. **Next: a second level over the centers — the center-profile-in-time, inducted over the whole corpus, where the assembly-center recurs book after book.** |
| 8 `EVA` | mechanism | bayes-deviation + polarity; the script target missing |
| 9 `REC` | near | realize via the pivot; the reason-gate |

**The standing law refuted-and-sharpened:** each element knob (∅ → pronouns → universal adjectives) excludes one more generic class and the weld survives — so the scene-kind cannot be found in the *grammatical* grain at all. It lives in recurrence (rungs 7 + 4 over the whole corpus), which is the plan's `DEF` rung. The route forward is not a finer similarity; it is more *time* — the whole Odyssey, then the corpus in chronological order, where the situation-types actually repeat.

## Hardcoded (disclosed, draft)

The drivers resolve absolute workspace paths (`/Users/mlacy/Documents/3.0/…`):
`khora/native/eval/lavar/greek.mjs`, `janus/priors/*`, `Zenodotus/…/homer-*.txt`,
`janus/native/organs/kind-induction.js`. De-hardcode when this leaves draft.