// organs/whom.js — the second operand of the fold, declared WITH HOLDINGS. Pure, no model, no clock, no constant.
//
// CALLIMACHUS-SHAPE.md "For whom" and build Step 0: the answer ladder named its experiencer { who: "the asker" }, which the
// experiencer gate accepted because it checks that a name exists, not that anything is held. A whom here is refused unless it names a
// holder and PASSES what it holds; an empty collection is a declared first contact, an omitted one declares nothing.
//
//   declareWhom({...})           → frozen whom: giver, kind, told (Map claim key → output address), seen (Set of Pinax ids), thread, ...
//   distanceOf(touched, whom)    → how much of what the question touches is absent from what the whom holds. Returned as a number. 1
//                                  with an empty whom is the CATALOG pole (the void reader; Callimachus's own Pinakes); 0 is held.
//   partitionByWhom(items, whom) → fresh / held, with the typed reason `held: already told to this whom at <address>` — distinct from
//                                  "below the floor". The lens adds nothing; this only says what it left out, or typed as held, and why.
//
// NOT HERE (named, not implied). (1) It does not use kernel/for-whom.js `createForWhom`: that frame (giver, question, ground, priors,
// universe, medium, knowing) carries a DMD-coherence gate with hand-set floors, and wiring it is a separate step. (2) Distance does not
// choose a shape; where "near" becomes a figure and "far" a ground is H1's null to measure. (3) Holdings are reported, not yet
// re-weighted: the ladder's lead is unchanged by what the whom holds. `told` keys are the ladder's atom ids; a whom built from earlier
// outputs must map their grounds onto the same ids.

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
export function declareWhom({ giver, kind = "person", told, seen, thread = [], priors = null, medium = null, lang = null, boundary = null } = {}) {
  if (!WHOM_KINDS.includes(kind)) throw new Error(`declareWhom: kind must be one of ${WHOM_KINDS.join(", ")} (got ${JSON.stringify(kind)})`);
  const isVoid = kind === "void";
  if (!isVoid) {
    if (!giver || typeof giver !== "string") throw new Error("declareWhom: a giver is required — who is this fold for?");
    if (PLACEHOLDER.test(giver.trim())) throw new Error(`declareWhom: ${JSON.stringify(giver)} is a placeholder, not a whom. Name the holder and pass what they hold.`);
  }
  if (told === undefined || seen === undefined) throw new Error("declareWhom: `told` and `seen` must be passed; an empty collection declares a first contact, an omitted one declares nothing");
  const toldMap = told instanceof Map ? new Map(told) : new Map([...told].map((k) => [k, null]));
  const seenSet = new Set(seen);
  if (isVoid && (toldMap.size || seenSet.size)) throw new Error("declareWhom: the void reader holds nothing; a whom with holdings is a person, an institution, a statute, a document or a past self");
  // A statute or document is a whom whose holdings ARE its bytes: `boundary` names where it ends, so a null can be taken against it.
  if ((kind === "statute" || kind === "document") && !boundary) throw new Error(`declareWhom: a ${kind} is a whom only with a boundary (the null needs an edge)`);
  const holdings = { told: toldMap.size, seen: seenSet.size, thread: thread.length };
  return Object.freeze({
    giver: isVoid ? null : giver, kind, told: toldMap, seen: seenSet, thread: Object.freeze([...thread]), priors, medium, lang, boundary,
    holdings, empty: !toldMap.size && !seenSet.size && !thread.length,
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
  if (!whom || !whom.told) throw new Error("distanceOf: a declared whom is required (declareWhom)");
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
export function partitionByWhom(items = [], whom, { keyOf = (x) => x.key ?? x.id, pageOf = (x) => x.page ?? x.pinax } = {}) {
  if (!whom || !whom.told) throw new Error("partitionByWhom: a declared whom is required (declareWhom)");
  const fresh = [], held = [];
  for (const it of items) {
    const k = keyOf(it);
    if (whom.told.has(k)) held.push({ item: it, reason: { kind: "held", told: true, at: whom.told.get(k), text: `held: already told to this whom${whom.told.get(k) ? ` at ${whom.told.get(k)}` : ""}` } });
    else fresh.push({ item: it, seenPage: whom.seen.has(pageOf(it)) });
  }
  return { fresh, held };
}

