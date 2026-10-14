// cli/claim-identity.mjs — ONE IDENTITY FOR ONE CLAIM, in one place (nesting-fix J D2, 2026-10-14).
//
// The audit counted three identity functions for one claim: the ledger's per-line id (a hash of
// at · pid · index · ground · rel), the spiral's content string, and the recall fold's caselessIdentity. The
// first changes every run (so no later store could ever join on it) and the ledger's `supersedes` was null on
// every line. What is shared here:
//
//   claimKey(c) / claimId(c)  the claim's CONTENT address, `[¬]rel(ARG0, ARG1) @ ground`. It is the spiral's node
//                              id (it always was — old spiral logs read unchanged) and it is carried on every
//                              ledger claim line as `claimId`, so one claim is one string in both stores. The
//                              ledger's own line `id` stays what it was: the id of one STATEMENT of the claim.
//   slotOf(c)                  the claim's slot, `[ground, rel, ARG0]` — what a revision or retraction replaces.
//   revisionKind(prev, next)   "retraction" (same object, polarity flipped) | "revision" (the relation is declared
//                              functional and the object differs) | null. The spiral's withdrawals and the
//                              ledger's `supersedes` are both decided HERE, so they cannot drift.
//
// Pure; no I/O; no janus dependency (the ledger and the doorway import it on stacks with no spiral).
export const str = (x) => (x === undefined || x === null ? "" : String(x));

/** The content address of one claim — the spiral node id and the ledger's `claimId`. */
export const claimKey = (c) => `${c?.polarity === "-" ? "¬" : ""}${str(c?.rel)}(${str(c?.roles?.ARG0)}, ${str(c?.roles?.ARG1)}) @ ${str(c?.ground)}`;
export const claimId = claimKey;

export const slotOf = (c) => JSON.stringify([str(c?.ground), str(c?.rel), str(c?.roles?.ARG0)]);

/** What a claim is, for deciding what it replaces. */
export const metaOf = (c) => ({ key: claimKey(c), slot: slotOf(c), object: str(c?.roles?.ARG1), polarity: c?.polarity === "-" ? "-" : "+", rel: str(c?.rel) });

/** The set of relations a run declares functional (strings or {rel}). */
export const functionalRels = (declare) => new Set((declare?.functional ?? []).map((f) => (typeof f === "string" ? f : f?.rel)).filter(Boolean));

/** What `next` does to `prev` when both sit in one slot: "retraction" | "revision" | null. */
export function revisionKind(prev, next, functional = new Set()) {
  if (!prev || !next || prev.slot !== next.slot || prev.key === next.key) return null;
  if (prev.object === next.object && prev.polarity !== next.polarity) return "retraction";
  if (functional.has(next.rel) && prev.object !== next.object && prev.polarity === next.polarity) return "revision";
  return null;
}

/** A ledger `reasoning-claim` line, read back as a claim. Lines written before `claimId` existed read the same. */
export const claimOfLine = (l) => ({ ground: l?.ground, rel: l?.rel, roles: l?.roles ?? {}, polarity: l?.polarity === "-" ? "-" : "+" });
