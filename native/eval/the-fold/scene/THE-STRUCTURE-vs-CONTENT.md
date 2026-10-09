# Structure vs content — the omnimodal parser

*Canonicalized 2026-10-09. One sentence: the fold parses every medium into
**structure** (the arrangement — seats, roles, kinds-as-positions, bounded
trajectory modes) and **content** (the particular beings who fill those seats
at their byte addresses), one parser, applied omnimodally, parameterized by
genre norms that decide *which* signals count as structure — never whether
structure exists.*

## The split

A text is not a sequence of words. It is **arrangement** (structure) with a
**filling** (content). Two texts can share the same structure and differ in
content — two novels, two symphonies, two code units — and the fold's whole
business is to read the structure as the evidence and the content as the
instance.

- **Structure** = what survives replacing the entire cast. The seat a subject
  occupies, the role it plays (agent/patient/recipient), the kind-position it
  lands on in the induced-kinds graph, the way its trajectory settles or
  cycles under the DMD bound. Structure is *how things are arranged.*
- **Content** = the particular beings at those seats. Darcy in the subject
  seat at byte 113602; Elizabeth in the object seat at 120147. Content is
  *who is there,* addressable, replaceable, traceable to the byte.

## The parser

`structure-content.mjs::parseStructureContent(read, { genre })`:

1. **Content** — the cast (referents → byte addresses) and the claims (bound
   edges: subject · act · object, each at its story-order and span).
2. **Structure** — the role-seats used; the **kind-positions** induced over
   per-scene company (`induceKinds`, the same Janus organ as the Greek read);
   and the **DMD mode** of the claim trajectory (settle/cycle — bounded).
3. **The falsifier** — `permuteCast`: replace the whole cast with itself
   under a permutation; if the structure (seats, kind-positions, mode) does
   not survive unchanged, the structure was actually content — the parser
   conflated the two. This is precisely what the English wordlist-prior did
   when it let dictionary membership (content) decide who was seated
   (structure). "Darcy was writing" bound no subject because *content* was
   asked to do *structure's* job.

## Omnimodal

The same parser has no medium-specific code. A text, a score, a film, a code
unit each has arrangement (its seams, its roles, its kinds-positions, its
trajectory), and the parser reads those. What differs is the **genre norm**:
- **epic prose** (Greek/Sanskrit): the norm says structure lives in the
  case-endings — pro-drop seats recover the speaker; kind-positions govern
  the epithets.
- **novel prose** (English): the norm says structure lives in word order and
  recurrence — dialogue-attribution recovers the turned speaker from the
  activated cast.
- **music** : a motif is a recurring figure; the norm decides whether meter
  is the seat that carries it. (The Greek scene-kinds read already runs at
  the same grain as a cadence.)
- **code** : identifiers recur and keep company; the norm decides whether the
  call-site is the seat that binds the binding.

One parser; the genre norm parameterizes **which** signals count as structure.
The night's proof: the SAME structure/content split that reads the Odyssey by
case-endings is what finally let the English seam bind Darcy — by position and
recurrence, the moment the prior stopped pretending content was structure.