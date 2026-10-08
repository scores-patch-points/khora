# The weft ↔ ruliad seam (contract)

How khora's **weft** (the reading log) connects to the **ruliad** (the hyperlexicon generated from it, janus /
Relate). One direction, one parser, addresses all the way back. Written 2026-10-07, while both are being built.

## The shape

```
   khora (Differentiate)                      janus (Relate)
   ─────────────────────                      ──────────────
   read-door ──► weft.jsonl  ──(weftAttestations)──►  ruliad ──► hyperlexicon (the field)
   (WeftEntry@1, append-only)   the SEAM (read-only)          (affordances, witnesses → weft addresses)
```

**One-way.** khora produces the weft; the ruliad consumes it. The ruliad NEVER writes the weft. (Same direction
as the import graph: janus imports khora, never the reverse — a cycle is impossible.)

## The unit khora produces: `WeftEntry@1`

Append-only JSONL (`native/eval/weft/weft.jsonl`), one line per document read. Fields the ruliad may use:

| field | meaning |
|---|---|
| `address` | the source (path under ethos); the weft's own key. Also `seq`, `category`, `language` |
| `cast[]` | the beings: `{ ref, surface, allSurfaces, mentionsAt[] }` — `mentionsAt` are byte anchors (addressable) |
| `relations[]` | the attested compositions: `{ relation, scope:{byteOffset}, participants:[{ref,surface,standing,resolution}] }` |
| `gaps[]`, `error` | typed gaps / a read failure — never silent |

## The seam: `weftAttestations(weft, {asOf})`

The SINGLE extraction both sides use — imported from `native/the-fold/weft.js`. The ruliad must NOT re-parse
`weft.jsonl`. It yields one `WeftAttestation@1` per relation:

```js
{ schema: "WeftAttestation@1",
  witness: "01-literature-books/gitenberg/pg120_Treasure-Island.txt#250",  // <source>#<byteOffset> — the address
  source, at, category,
  label: "wrote",                                                           // the relation
  left:  { ref, surface, standing },                                        // end1 (standing: referent | unresolved_surface | …)
  right: { ref, surface, standing } }                                       // end2
```

Its a **generator** (the corpus is large — stream it). `asOf` is a pass-seq cursor (fold the past: P3).

## The @2 seam: `weftReferents(weft, {asOf})`

Janus asked for this (`janus/KIND-INDUCTION-REPLY.md`), because induction needs a referent's whole occurrence
record, not just pairwise attestations. Additive to the seam; one parser still. Yields one `WeftReferents@2`
per referent:

```js
{ schema: "WeftReferents@2", ref, surfaces, mentionsAt, passes,   // identity + addressability; passes = weft passes seen
  company: { "<otherRef>": <co-presence count> } }                // Map<ref,count> — COMPANY ONLY, never content
```

**COMPANY is `Map<ref,count>`, both-bound only** (every end `standing:"referent"`; an unresolved end is not a
being the referent keeps company with) — **company only, never content** (no labels, no other-surface). The weft
stays **kind-free**: janus induces kinds *from* `company` (company-induced, never taught), keying affordances by
kind where it can. Cursor-native: `asOf` folds the past, so kinds re-key without erasing (P3).

## What the ruliad produces: the hyperlexicon (the field)

Composition affordances keyed by **(left, right) → observed label(s)** (or by induced kinds — see below), each row:

- `standing`: `candidate` (attested, not yet licensed) — never `given` without a named giver;
- `giver`: **the weft** (the giver IS the record — "a prior is not derived");
- `witnesses`: the **weft addresses** from the attestations (`source#byte`). Every field row must re-expand into
  the weft by `reopen(address, { read })` (`native/the-fold/weft.js`) — the holograph property: every part points
  at the whole.

## Kinds

The weft is **kind-free**: it supplies surfaces/refs/addresses. The **ruliad owns the kinds** (induce them, Relate
side) and keys affordances by kind where it can, by surface otherwise. Do not push kind induction into the weft.

## Identity

`ref` ids are per-document (`ref:auto:<surface>`). Cross-document identity is the **ruliad's** decision (by
surface/kind); the weft does not promise global identity.

## Discipline

- **One parser.** Both sides call `weftAttestations`; no second reading of the file (no duplicate organs).
- **Versioned, additive.** `WeftEntry@1` / `WeftAttestation@1`. Add fields; never repurpose one.
- **No assertion from the weft.** The weft is attested *reading*, `standing: candidate`; the ruliad licenses, and
  a `given` affordance needs a named giver (the hyperlexicon's own law).

## Files

| side | file |
|---|---|
| builder (produces the weft) | `native/eval/weft/build-weft.mjs` → `weft.jsonl` |
| the log organ + the seam | `native/the-fold/weft.js` (`appendPass`, `clothAt`, `reopen`, `mouthFacing`, `weftAttestations`) |
| the field (ruliad) | janus — consumes `weftAttestations` |
