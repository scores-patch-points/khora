# Unbuilt reading capacities — what to add, what it aids, how to test it

Assembled under the reading discipline (no LLM in the loop, no hand-set
thresholds, preregister → stamp → freeze → ONE run on unseen data, falsify
first). This is a proposal document, not a spec entry: nothing here is
built, wired, or measured until it is. It is a standing list the spec can
absorb one `## S<n>` at a time, the way S32 and S33 already absorbed the
anaphora family.

## The ground state, stated once so this never drifts

- **The cube is cell-complete.** `capacities.js` + `moves.js::coverage`
  against `kernel/cube.js` reports **27/27 cells occupied, 0 empty, 0
  illegal** (checked 2026-11-22). THE-27-CELLS.md's "three empty Ground
  cells" header is stale: INS·Ground=`preflight`, CON·Ground=`field`,
  DEF·Ground=`frame`+`setting`.
- **The anaphora family is already built, but unconsumed.** READING-SPEC
  S32 + S33 built six capacities from an external theory document that
  mapped the linguistic anaphora family onto the nine operators:
  - ellipsis (schema) — `kernel/completion.js` (NUL·Figure for the absent
    slot, CON·Figure to resolve)
  - bridging — `kernel/affordance-reference.js` (SYN·Figure mint,
    CON·Figure bind)
  - cataphora — `kernel/pending-sig.js` (SIG·Figure open, CON·Figure close)
  - quantifier-bound (donkey) anaphora — `kernel/scoped-kind.js`
    (SYN·Pattern mint, CON·Pattern resolve-in-scope)
  - modal subordination — `kernel/holder-scope.js`
  - tense-as-anaphora — `kernel/temporal-reference.js` (INS·Figure
    individuate, REC·Ground advance); this one alone is registered on real
    capacities (`narrative-time`, `code-time`).
  All six pass P71's first leg (identical unmodified kernel code over two
  disjoint domains) but **not** the second leg (a real falsification case on
  unseen material), and none is wired to a live adapter.
- **What is genuinely absent** — a concept with no organ AND no spec entry —
  is three things, and those are the subject of this report:
  **binding theory** (a constraint on reference, not a resolution),
  **illocutionary force** (what a sentence *does*, not what it *means*),
  and **switch-reference** (cross-clausal subject tracking).

The one concept that is correctly absent is implicature/entailment: it is
reasoning, janus's logos, and the reason-gate (II.9) refuses it at the
reading layer. It is named here only to keep the boundary visible.

---

## 1. Binding theory — c-command and Principle A (reflexives)

**What it is.** A constraint on the reference machinery this repo already
has, not a new resolution. The reader resolves pronouns to admitted
referents (`cast`, `coref.js`), and `coref.js` already carries reflexives
in its pronoun set — but "himself" resolves exactly like "him": no
Principle-A constraint that a reflexive must bind to a locally c-commanding
antecedent. The dependency trees needed to compute c-command already exist
(the sentence diagrammer / Chomsky seam, scholia's UD rows), so this is a
filter over structure the reader already produces, not a new statistic.

**What it aids.** The bar. The fixed external giver is the official CorefUD
scorer (CoNLL F1, MUC/B-cubed/CEAFe, head match, singletons ignored) over
every mention on CorefUD 1.3 dev, macro-averaged per language. Round 24:
English 28.2. Reflexives are third-person mentions and are currently scored
as if they were ordinary pronouns, so every reflexive the reader misbinds
is a direct debit against the 94. Principle A converts "John saw himself"
from an ambiguity (any male referent) into a determinism (the local
c-commanding NP).

**Where it slots.** It is a *path*, not one cell — the same shape as
deixis. Compute the c-command domains: SEG·Pattern (unravel the tree at its
seams). Apply them as a gate on the existing resolution: CON·Figure (bind
the figure), reusing `contest.js::adjudicate` so no new threshold is
introduced and the constraint only *restricts candidates* rather than
scoring them.

**How to test it.**
- *Falsify first (gold-free):* on LitBank dev, predict the reflexive subset
  (himself/herself/itself/themselves) resolves no better than the
  non-reflexive third-person pronoun subset — i.e. the reader currently
  carries no Principle A. Count reflexive-mention F1 against plain-pronoun
  F1 from the reader's own output; no annotation required.
- *Gold:* the CorefUD scorer, LitBank + GUM dev, reflexive-mention subset,
  preregistered, one frozen run. The claim is that reflexive-mention F1
  moves while non-reflexive F1 does not regress.
- *Falsifying control:* a reflexive whose binder is NOT the clause subject
  — a picture-NP ("a picture of himself") or an emphatic/logophoric
  "himself" whose real antecedent is non-local. Principle A must not
  silently over-constrain those; a typed gap (or a declared exception
  prior) is the correct refusal, never a silent fallback.

---

## 2. Illocutionary force — what a sentence does

**What it is.** Classifying a sentence's act — assert / direct / commit /
ask — as distinct from its grammatical mood. Surface form does not
determine force: "Could you pass the salt?" is a request, "You will go" is
a command. The reader currently treats every sentence as an assertion,
which is why the claim pipeline and the reason-gate see directives as
truth-apt claims.

**What it aids.** The fold reads normative prose (constitutions, charters,
policies, instructions) — material whose sentences are largely *directives*
("shall", "must", "may"), not assertions. Distinguishing force decides what
becomes a grounded, falsifiable *claim* versus a binding *norm*. It also
feeds the false-absence organ (`FalseAbsence@1`): a question's force differs
from a denial's, and treating a directive as an assertion is how a norm
gets laundered into a fact.

**Where it slots.** Atmosphere terrain — DEF·Ground (the interpretive
frame/register) and EVA·Ground (what is asserted). Mood already maps
(imperative→NUL·Ground, indicative→EVA·Ground), but force is a
reclassification over mood + deontic-verb + subject-person cues, computed
from structure and lexicon — never reasoned.

**How to test it.**
- *Falsify first (gold-free):* on a normative text the fold already reads
  (a city charter or FOLD-CONSTITUTION), predict the reader currently
  admits directive sentences ("X shall Y", "X must Y") into the claim
  pipeline as assertions. Count directive sentences treated as truth-apt
  claims by the current reason-gate/claim path.
- *Gold:* a small hand-annotated force set over the fold's own normative
  corpus (labels preregistered: assert / directive / commissive /
  expressive), so it is a mechanism test over the material the system
  actually reads, not a generic speech-act corpus.
- *Falsifying control:* a surface-declarative that is actually a request
  ("Could you pass the salt?") or a rhetorical question — where mood and
  force diverge. The classifier must type the divergence as a gap rather
  than assert a force its cues do not license.

---

## 3. Switch-reference — cross-clausal subject tracking

**What it is.** Tracking whether a later clause shares the earlier clause's
subject. This is the general form of a bug already on the record —
READING-SPEC line 4653: in "she opened it, AND found…", the relation
extractor takes the coordinator "and" as the subject instead of carrying
"she" forward. The same-subject/different-subject distinction is also the
Winograd-schema problem and logophoricity ("heᵢ said heᵢ would go").

**What it aids.** The referent rule's own named weakness: "the rung's
clause-local gender evidence takes the one named being in a clause as the
referent." Cross-clausal subject tracking is exactly the fix — it supplies
the structural parallelism that clause-local evidence lacks. It also
directly repairs the line-4653 bug, recovering relations on compound
sentences, which are not a corner case but the ordinary shape of prose.

**Where it slots.** CON·Pattern (Network·Tracing — a recurring arrangement
of clause chaining) with SYN·Pattern (composing the chained clauses into a
network). The carry-forward across a coordinator is CON·Pattern by
definition: one recurring arrangement, not one labelled edge.

**How to test it.**
- *Falsify first (gold-free):* Winograd schemas — predict the clause-local
  default picks the wrong antecedent on a fixed schema set (e.g. "The
  trophy doesn't fit in the suitcase because it's too big": it = trophy).
  The reader's own output decides; no annotation required.
- *Gold:* the Winograd Schema Challenge set, preregistered, one frozen run
  — but scoped to the *structural* subset where parallelism/c-command
  disambiguates, because the knowledge-heavy subset is janus's logos, not
  reading. Report the split explicitly.
- *Falsifying control:* a schema whose correct antecedent requires world
  knowledge — structural tracking alone picks wrong (or right by luck).
  That case must be typed as a janus gap, never silently resolved; and the
  line-4653 "and found" case must remain correct when the two clauses do
  NOT share a subject (a genuine different-subject switch must not be
  papered over by carry-forward).

---

## The wire-up work (what is already built and needs P71's second leg)

Not new builds, but the honest remainder for the six S32/S33 organs:

1. **Run P71 leg 2** on each — a real falsification case on material the
   discovery never saw, where the organ's absence visibly fails and its
   presence visibly succeeds. This is the gate between
   "built-tested-unconsumed" and "a capacity."
2. **Wire the schema-ellipsis organ (`completion.js`) to an English
   adapter.** It types a caller-declared schema's unfilled roles; it does
   not yet type the free-text gap (gapping, sluicing, the coordinated
   elided subject of line 4653). Free-text ellipsis is the *one* genuinely
   unbuilt member of the anaphora family — a new organ over `completion`'s
   own NUL·Figure/CON·Figure cells, whose candidate collector is a parse
   of the coordinated clause rather than a declared schema.
3. **Re-audit the "built, unconsumed" label** against the registry: with the
   cube at 27/27, the remaining question is no longer "which cell is empty"
   but "which cell's organ has never been exercised on live material." That
   is a wiring question, and it is the one this report is not allowed to
   answer by assertion.

## The boundary, kept explicit

Implicature and entailment stay out. The reason-gate (II.9) refuses them at
the model, and they are janus's logos, not the perceiver's reading. Any of
the three capacities above that reaches for world knowledge rather than
structure must stop at the same line: structure and lexicon are khora's;
what follows from them is janus's.
