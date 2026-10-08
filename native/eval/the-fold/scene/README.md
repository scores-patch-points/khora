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

## The law (archons: Houdini · Ostrom · Rubin · Itti-Baldi · Koopman)

- A scene is an Ostrom action situation: `{positions (Ground) · actors (Figure) ·
  actions→outcomes, valenced (Pattern)}`.
- A scene starts where the ground is most wrong; ends where belief is revised
  (bayes-delta to the holograph); typed once/finite/recurring by the DMD of its
  surprise stream.
- Kinds of scenes are INDUCED from company, never taught; the priors supply the
  grammar (pos·case-marking·morphology) and the carried ground (expectation), never
  the kinds themselves.

## Hardcoded (disclosed, draft)

The drivers resolve absolute workspace paths (`/Users/mlacy/Documents/3.0/…`):
`khora/native/eval/lavar/greek.mjs`, `janus/priors/*`, `Zenodotus/…/homer-*.txt`,
`janus/native/organs/kind-induction.js`. De-hardcode when this leaves draft.