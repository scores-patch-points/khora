// organs/holdings.js — what a whom already holds, declared as CLAIM KEYS. Pure, no model, no clock, no constant.
//
// NAMING (2026-10-14, agreed with the callimachus/twin-reader session): `organs/whom.js` and the ladder's `whom` option belong to that
// branch (W as pinned bytes; "held" is exact byte containment; held candidates are DROPPED and every witness re-based). This file used
// to claim both names and ordered held claims after fresh ones in the ladder: two meanings of "held" in one ladder. It no longer touches
// the ladder. A claim-key match is a different witness from byte containment, and is typed as one (`witness: "claim-key"`).
//
// CALLIMACHUS-SHAPE.md "For whom" and build Step 0: the answer ladder named its experiencer { who: "the asker" }, which the
// experiencer gate accepted because it checks that a name exists, not that anything is held. A whom here is refused unless it names a
// holder and PASSES what it holds; an empty collection is a declared first contact, an omitted one declares nothing.
//
//   declareHoldings({...})           → frozen holdings: giver, kind, told (Map claim key → output address), seen (Set of Pinax ids), thread, ...
//   distanceOf(touched, whom)    → how much of what the question touches is absent from what the whom holds. Returned as a number. 1
//                                  with an empty whom is the CATALOG pole (the void reader; Callimachus's own Pinakes); 0 is held.
//   partitionByHoldings(items, whom) → fresh / held, with the typed reason `held: already told to this whom at <address>` — distinct from
//                                  "below the floor". The lens adds nothing; this only says what it left out, or typed as held, and why.
//
// NOT HERE (named, not implied). (1) It does not use kernel/for-whom.js `createForWhom`: that frame (giver, question, ground, priors,
// universe, medium, knowing) carries a DMD-coherence gate with hand-set floors, and wiring it is a separate step. (2) Distance does not
// choose a shape; where "near" becomes a figure and "far" a ground is H1's null to measure. (3) Holdings are reported, not yet
// re-weighted, and nothing here is wired into answerLadder. An ordering-not-dropping arm (held claims after fresh ones, typed held, with
// a drop list) existed on callimachus/shape a557374a and is a candidate RIVAL ARM to twin-reader's drop semantics, to be pre-registered
// there, never shipped beside it. `told` keys are the ladder's atom ids.

const PLACEHOLDER = /^(the )?(asker|user|reader|someone|anyone|nobody|everyone|you)$/i;
/** What a whom may be. The fold does not care which: each is a corpus with a boundary. */
export const WHOM_KINDS = Object.freeze(["person", "institution", "statute", "document", "past-self", "void"]);

/**
 * Declare the second operand. `told` is a Map(claim key → the output address that told it) or an array of keys; `seen` is a Set/array
 * of Pinax ids (content hashes, so "seen" is exact set membership on bytes). Both must be PASSED — an empty collection is a declared
 * first contact; an omitted one is an undeclared whom, and refused.
 *
 * `kind: "void"` is the source-only fold: W empty by construction, the catalog pole. It is the one whom allowed no giver.
 */
export function declareHoldings({ giver, kind = "person", told, seen, thread = [], priors = null, medium = null, lang = null, boundary = null } = {}) {
  if (!WHOM_KINDS.includes(kind)) throw new Error(`declareHoldings: kind must be one of ${WHOM_KINDS.join(", ")} (got ${JSON.stringify(kind)})`);
  const isVoid = kind === "void";
  if (!isVoid) {
    if (!giver || typeof giver !== "string") throw new Error("declareHoldings: a giver is required — who is this fold for?");
    if (PLACEHOLDER.test(giver.trim())) throw new Error(`declareHoldings: ${JSON.stringify(giver)} is a placeholder, not a whom. Name the holder and pass what they hold.`);
  }
  if (told === undefined || seen === undefined) throw new Error("declareHoldings: `told` and `seen` must be passed; an empty collection declares a first contact, an omitted one declares nothing");
  const toldMap = told instanceof Map ? new Map(told) : new Map([...told].map((k) => [k, null]));
  const seenSet = new Set(seen);
  if (isVoid && (toldMap.size || seenSet.size)) throw new Error("declareHoldings: the void reader holds nothing; a whom with holdings is a person, an institution, a statute, a document or a past self");
  // A statute or document is a whom whose holdings ARE its bytes: `boundary` names where it ends, so a null can be taken against it.
  if ((kind === "statute" || kind === "document") && !boundary) throw new Error(`declareHoldings: a ${kind} is a whom only with a boundary (the null needs an edge)`);
  const counts = { told: toldMap.size, seen: seenSet.size, thread: thread.length };
  return Object.freeze({
    giver: isVoid ? null : giver, kind, witness: "claim-key", told: toldMap, seen: seenSet, thread: Object.freeze([...thread]), priors, medium, lang, boundary,
    holdings: counts, empty: !toldMap.size && !seenSet.size && !thread.length,
  });
}

/**
 * How far U's touched region is from W. `touched` is a list of { key, page } — the claims the question touches and the Pinax each
 * lives in. Returns both distances because "told" and "seen" are different holdings: a claim on a page the whom was shown is
 * available to them, not yet told.
 *
 *   told = share of touched claims this whom was never told;  seen = share whose page this whom was never shown.
 *
 * The number is returned; where it falls on a shape is the shape layer's null to measure, not this file's constant to write.
 */
export function distanceOf(touched = [], whom) {
  if (!whom || !whom.told) throw new Error("distanceOf: declared holdings are required (declareHoldings)");
  const n = touched.length;
  if (!n) return { touched: 0, told: null, seen: null, pole: null, why: "the question touches nothing in the record; there is no distance to measure (Nagarjuna's neither)" };
  const unTold = touched.filter((t) => !whom.told.has(t.key)).length;
  const unSeen = touched.filter((t) => !whom.seen.has(t.page)).length;
  const told = unTold / n, seen = unSeen / n;
  const pole = whom.empty ? "catalog" : told === 0 ? "held" : null;
  return { touched: n, told, seen, absentTold: unTold, absentSeen: unSeen, pole };
}

/**
 * Split items into what is new to this whom and what they already hold. Held items are not deleted: each carries the typed reason,
 * so a lens can place them as a reminder (typed as one) or drop them with the reason on the record. `keyOf` / `pageOf` read an item.
 */
export function partitionByHoldings(items = [], whom, { keyOf = (x) => x.key ?? x.id, pageOf = (x) => x.page ?? x.pinax } = {}) {
  if (!whom || !whom.told) throw new Error("partitionByHoldings: declared holdings are required (declareHoldings)");
  const fresh = [], held = [];
  for (const it of items) {
    const k = keyOf(it);
    if (whom.told.has(k)) held.push({ item: it, reason: { kind: "held", told: true, at: whom.told.get(k), text: `held: already told to this whom${whom.told.get(k) ? ` at ${whom.told.get(k)}` : ""}` } });
    else fresh.push({ item: it, seenPage: whom.seen.has(pageOf(it)) });
  }
  return { fresh, held };
}


// ---- W as claim spans ----------------------------------------------------------------------------------------------------------

/**
 * A reader's claims, for the grain (organs/grain.js): W's pinned units read by the SAME claim reader as U (callimachus.js readCorpus),
 * each atom a span { id, address, text, side: "W", claim: { subj, pred, obj, polarity } } addressed into W's own text layer. Suggested
 * by the twin-reader session, whose `whomPinned` records these are.
 *
 * Entity ids are per corpus: U and W are matched on SURFACE strings (grain.js normalizes), never on ids. This is a claim-key witness,
 * not byte containment (twin-reader's `heldIn`); the grain types it as one.
 *
 * `received` (optional, default null = as before) is passed to readCorpus: `{ verbs }` reads W through the vocabulary the RECORD's own reading
 * earned (a thread is read in the record's terms; it never writes back). See W-READER-PREREG.md: that, not a received POS prior, recovered the spans shown. A short thread yields few or no atoms (the reader needs
 * recurrence to admit a subject): an empty result is a typed absence, not an error.
 */
export async function claimsOfWhom(pinned, { slice, question = "", received = null } = {}) {
  const { readCorpus } = await import("./callimachus.js");
  const { spansFromRecord } = await import("./grain.js");
  if (!pinned?.length) return { spans: [], why: "no pinned units: the void reader" };
  const record = readCorpus(pinned, { question, received });
  const spans = await spansFromRecord(record, { slice, side: "W" });
  return { spans, atoms: record.atoms.length, why: spans.length ? null : "the claim reader admitted no claim from W's units (a short thread has too little recurrence to admit a subject)" };
}
