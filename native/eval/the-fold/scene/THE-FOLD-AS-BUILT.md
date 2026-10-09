# THE FOLD, AS BUILT — the canonical read of the machine as it stands

*2026-10-08/09. Read this file before touching any of the machinery it names.
It is the map; the files are the territory. It records what the fold IS and the
DOCTRINE that binds every seam, so a future session does not have to re-derive
either.*

## 1. What the fold is

A **model-free reader of the Greek Odyssey**. It takes bytes and produces an
ATTESTED READING — not an answer a model would give, but a record of what the
read bound, refused, and was changed by, at char addresses. The summary is a
residue of that record, not the point. The point is the reading as an object.

The whole stack, top to bottom (each stratum an order; each organ a coordination):

```
byte → Greek grammar seam → beings → bound co-reference → channels (per-being
       theory of mind) → visits (walk by pull) → the telling → the spiral
       — with DMD-bounded ACCURACY over the whole-book EOT as the referee
```

## 2. Where it lives

All under `khora/native/eval/the-fold/scene/` unless noted:

| file | role |
|---|---|
| `reader.mjs` | the shared read → clauses + EOT. THE load-bearing seam. |
| `lavar/greek.mjs` | the Greek grammar (case/person/voice/mood/tense from endings tables). |
| `channels.mjs` | one pheromone trail per identity (Atta decay) + per-being holograph = theory of mind. |
| `visits.mjs` | the visiting reader: walks by pull (heat × open = longing), rezero journaled. |
| `spiral.mjs` | REC recursion `tell∘admit` measured; limit-cycle at assertion-rent floor. |
| `summarize.mjs` | the telling: WHO·ACT·PATIENT clauses, delta as footnote, refusal. |
| `sensefield.mjs` / `greek-shadow.mjs` | khora-side meaning: PPMI manifold + shadow as DMD eigenvalues. |
| `lexeme.mjs` | hyperlexicon: any word looked up, nothing a hard `?` wall. |
| `translate.mjs` | the janus dictionary (giver-named glosses), longest-stem fallback. |
| `compact-eot.mjs` / `eot-odyssey-521664.min.json` | the lean, meaningful EOT. |
| `accuracy.mjs` | DMD-bounded claim referee (see §5). |
| `readfull.mjs` | reads the WHOLE Odyssey (521,664 chars) into EOT. |
| `THE-BOARDING-CLAUSE.md` | the measured fallback tiers + the discipline. |

The mind-wandering apparatus (the **walk as the telling surface**) lives in
`the-fold/experiments/mind-wandering/` — `holograph.mjs` (walk the read's edges),
`compose.mjs` (sentence mull), `penelope.mjs` (archon routing + verified
refrains), `homeric-witness.mjs` (give the Homer archon back his own text).

## 3. The doctrine (the part that must not be re-derived)

1. **No model.** Every value is an organ reading a prior or a seam. A model may
   enter ONLY as the constrained mouth at the end (render attested propositions),
   never in the loop, never to decide.
2. **Measured, never hand-typed.** Class of a word, a window, a floor — all come
   from a prior's OWN tables at the prior's OWN declared floors. A hand-set
   literal is a falsification (see THE-BOARDING-CLAUSE.md: the invented
   `minShare: 0.8` was removed).
3. **Refuse, never guess.** A read that cannot bind says "could not bind", shows
   the gap — it does not invent. Refusal is a real verdict, the negative of
   accuracy.
4. **The third person is the voice of the affected.** The telling is third
   person; NO being named "you"/"I" is ever created from person-pronouns (the
   visitor gate: a referent whose rendered name is "you"/"I" is refused, at
   every binding path).
5. **janus = the laws** (priors, dictionary, giver-named, consulted);
   **khora = the perceptions** (sense-field, felt-sense, inner voice — rebuilt
   at read time, an act, never precomputed). The dictionary anchors are janus;
   the manifold between them is khora.
6. **The observer is what changes.** Meaning = the proposition's delta on the
   activated portion bounded by salient identity networks. What ascends the
   grain axis is the observer's belief, not a copy of the text. For-whom is the
   principle.
7. **Truth is an asymptotic approach to the noumenal.** The spiral measured:
   no fixed point, a limit cycle at the assertion-rent floor (pitch ~0.079 on
   the 150k read). Approach feels like receding; up and in are one motion.
   (3.0/the-compression.md §6.)

## 4. The EOT: what shape consumables expect

The LEAN, MEANINGFUL shape (`eot-odyssey-521664.min.json`) is the record other
organs consume. Built by `compact-eot.mjs` from the full EOT:

- **referents**: `[{ h: hash, n: name }]`
- **edges**: each SELF-CONTAINED (no cross-indexing), `{
    a: story order (the clause's order, NOT array index),
    v: act surface (Greek),
    s: subject referent INDEX into referents[] (int or null),
    o: object referent index,
    p: char span [start, end] into the source,
    d: the clause's OWN DMD delta (bayes, 4-dec)
  }`
- **voice**: `[{ k: kind, a: at, w: who, f: from, s: surface }]`
- counts + `extras` (chapters/telling/lint/channels/spiral/visits).

**CRITICAL trap to remember:** in the FULL EOT, `edges[i].at` is the clause's
story order (`c.order`) and `sceneSignal[i]` is indexed by ARRAY POSITION — the
two are NOT equal. Consumer code must read the per-edge `d`, never look up
`sceneSignal[at]`.

**"Only record meaningful differences":** the meaningful cut keeps exactly the
edges where a NAMED being does a real act, OR is acted upon, OR the clause
cleared the read's own 90th-percentile blink. Drop the ambient. Measured:
full 4.57MB → meaningful 657KB (14.4%) → gzipped 140KB (3.1%), 6,824 edges.
This is the DMD principle made storage: a difference that makes no difference is
not record.

## 5. Accuracy — how to ask "is it accurate?"

`accuracy.mjs`, over the full-Odyssey EOT. A claim is ACCURATE iff the record
BINDS it at its address:
- the subject resolves to a named referent, the act is a real edge, the span's
  per-edge delta cleared the floor.
- VERBATIM presence in the source is irrelevant — what your words mean is what
  the READ attested at the address.
- Refusal is the negative: an unbound claim is REFUSED cleanly, never a false
  negative, never a "no, wrong" — it's "the read did not bind this."

Measured exemplars (DMD-signed):
- `Telemachus boarded the ship` → ✓ `βαῖν'` a=255, d=0.6064 (NOT 0.477 — that
  was the mis-index bug, fixed by folding d per-edge).
- `Athena addressed Telemachus` → ✓ `προσέφη` a=40, d=0.164.
- Unbound claims (Zeus smote, a fake act) → refused.

The walk proposes (mind-wandering), the EOT attests or refuses (accuracy).

## 6. The walk as the telling surface

`the-fold/experiments/mind-wandering/holograph.mjs::makeHoloMuller`:
- FEED IT A THOUGHT ("Telemachus and the coming of Athena") → the being-names
  are the standing focus.
- Each step follows ONE bound edge whose subject is in focus, IN the read's own
  story order — a continuous thread about the thought's cast.
- **janus** licenses continuity ("X is on the thread"); off-thread candidates
  are REFUSED.
- **penelope** routes one archon (mechanical, idf-weighted) and lays its
  verified sentences as refrains where their words touch the thread.
- Unglossed acts render in the read's OWN Greek in quotes (disclosed) — never an
  invented verb. "The unbound seat" = an edge with no resolvable subject.

The Homeric witness (`homeric-witness.mjs`) restores the Homer archon's voice
from the source file's own bytes at its manifest anchor — the poem's words by
identity. Verifying quotes by string-splitting is WRONG; verify by construction
(bytes ARE the source) and by the EOT bind (accuracy.mjs).

## 7. Commit state (where this canon owes its receipts)

- khora `scores-patch-points`: `e3f8ab2` (meaningful EOT), `f492382` (accuracy),
  `b7cfccd` (third-person), `9982825` (scale-aware chaptering), `5d2abcf`
  (boarding clause).
- the-fold `scores-patch-points`: `0e6b975` (homeric-witness).

## 8. Cross-lingual — the Sanskrit seam (2026-10-09)

The architecture was always one seam with many priors. `greekClauses` is
parameterized by a prior set; janus already carried the Sanskrit priors
(`case-marking-san.json`, `pos-san.json` — 228 nominal endings, 530 verb
endings, 31,132 POS forms). `reader-san.mjs` reuses the SAME machinery (case-
vote, personOf, activation, admit, the EOT schema) with the Sanskrit priors
and the Rigveda (IAST, GRETIL) as material.

- Measured: 60,000 chars → 2,098 clauses, 1,206 sentences, 499 referents in
  ~944ms; Agni (agn) appears as OBJECT 23× — the hymns invoke the fire-god
  (agnim īḻe "Agni I praise", dūtam "the messenger", vṛṇīmahe "we choose").
- The seams are the SAME janus builds: stem-normalization (inflections → one
  being; Sanskrit has 31k forms but each surface is its own referent until a
  san-lemma layer unifies), pronouns→referent (sva/aham/tvam), and a Sanskrit
  gloss dictionary for names (translate-san) — the Greek dictionary is Greek.
- The tokenizer is shared (`\p{L}` catches IAST); sentence-split on ॥|; no
  Sanskrit articles (articleMode "off").

## 9. Open seams (refused, never typed shut)

- **Cube**: Kind (INS·Pattern) needs an Aspect prior; Unraveling (SEG·Pattern)
  needs a VerbForm prior — both are janus measurements, not seam patches.
- **Gloss gap**: unglossed verbs still show the read's own Greek in quotes —
  the verb-lemma layer is the janus build that makes the walk English
  throughout.
- **Loop II** (re-reading the telling's *sentences*) not yet built — the present
  spiral re-admits propositions, not the mouth's sentences.