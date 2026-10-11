// the-fold/eot-weft.mjs — EOT → WEFT: the single reading log, and identity
// resolved at the level the ontology says identity lives.
//
// THE DECISION (2026-10-11). The corpus EOT is ONE append-only file — the WEFT
// (weft.js). Each per-source EOT (`@field/EOT-v1`) becomes ONE addressed pass.
// Per-source holograph = `clothAt` over that source's passes; whole-corpus
// holograph = `clothAt` over the weft; the hyperlexicon = the field janus folds
// from the weft's attestations.
//
// CROSS-SOURCE IDENTITY IS NOT A SPELLING (S113). The first cut keyed the
// cross-source ref on a normalized NAME — wrong level, and it false-merged
// ("case"/"casé") while it could never tell two same-spelled beings apart.
// The ontology already names the right rule (`kernel/identity-meet.js` has TWO
// levels): the FORM (the surfaces a frame names) and the POINT (the referent
// the record carries the form on — "the being, not the spelling"). So:
//   · every pass carries its SOURCE-LOCAL points (`pointOf(source, hash)`, a
//     birth in the reading it was read in — never a spelling);
//   · the cloth folds by POINT, so nothing merges across sources by accident;
//   · cross-source sameness is a JOIN, an act at the identity level, and it is
//     decided the way the ontology says: for-whom-gated, and surviving only the
//     MEET over for-whoms (`survivingIdentityAtPoints` — a pair one frame joins
//     and another splits does not survive). A shared form may NOMINATE a
//     candidate join (`candidateJoins`); only the meet EARNS it (`resolveCrossSource`).
//
// PURE. No disk, no model. The DRIVER owns I/O.

import { appendPass, clothAt, emptyWeft, holonAddress, weftAttestations, weftReferents } from "./weft.js";
import { refsOf, survivingIdentityAtPoints } from "../kernel/identity-meet.js";

export const CORPUS_EOT_SCHEMA = "CorpusEOT@1";

/** The norm a form is compared by — for NOMINATION ONLY (a candidate join).
 *  Never the identity, which lives at the point (`pointOf`). */
export const normForm = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** A referent's POINT: its birth in the reading it was read in. A referent id
 *  is a birth, not a spelling (S80) — so two documents that spell a being the
 *  same get two points until a JOIN says otherwise, and two documents that
 *  spell it differently keep distinct points until the same join. */
export const pointOf = (source, hash) => (hash ? `${source}::${hash}` : null);

const atOfEdge = (e) => (Array.isArray(e?.span) ? e.span[0] : (Number.isFinite(e?.at) ? e.at : null));
const clauseOfEdge = (e) => (Number.isFinite(e?.at) ? e.at : null);
const nameOf = (eot, hash) => (eot.referents ?? []).find((r) => r.hash === hash)?.name ?? null;

/**
 * One EOT → one weft pass. `cast` from the referents (ref = the source-local
 * POINT, surface = the reading's own form), `relations` from the BOUND edges
 * (both ends present — a null end is a typed gap). `address` defaults to
 * `eot.source` and is the base of every point.
 */
export function eotToPass(eot, { address = null } = {}) {
  if (!eot || typeof eot !== "object") throw new TypeError("eotToPass: an EOT object is required");
  const src = address ?? eot.source ?? null;
  if (!src) throw new TypeError("eotToPass: a pass must carry an address (eot.source)");
  const cast = (eot.referents ?? [])
    .filter((r) => pointOf(src, r.hash))
    .map((r) => ({ ref: pointOf(src, r.hash), surface: r.name, allSurfaces: r.name ? [r.name] : [] }));
  const bound = (eot.edges ?? []).filter((e) => e.subject && e.object && e.action);
  const relations = bound.map((e) => {
    const at = atOfEdge(e);
    return {
      relation: e.action,
      at: at ?? null,
      clause: clauseOfEdge(e),
      scope: { byteOffset: at ?? null },
      participants: [
        { ref: pointOf(src, e.subject), surface: nameOf(eot, e.subject) ?? e.subject, standing: "referent" },
        { ref: pointOf(src, e.object), surface: nameOf(eot, e.object) ?? e.object, standing: "referent" },
      ],
    };
  });
  return {
    address: src,
    category: eot.medium ?? null,
    language: eot.language ?? null,
    counts: eot.counts ?? null,
    origin: holonAddress(src, 0),
    cast,
    relations,
  };
}

/** Append one EOT as a pass (immutable; P1). Returns a NEW weft. */
export const appendEot = (weft, eot, { address = null } = {}) => appendPass(weft ?? emptyWeft(), eotToPass(eot, { address }));

/** Serialize the weft as JSONL — one pass per line (the append-only file). */
export function serializeWeftJsonl(weft) {
  const list = weft ?? [];
  return list.length ? list.map((p) => JSON.stringify(p)).join("\n") + "\n" : "";
}

/** Parse a JSONL weft back into a frozen pass list, order preserved. */
export function parseWeftJsonl(text) {
  const lines = String(text ?? "").split("\n").filter((l) => l.trim());
  return Object.freeze(lines.map((l) => Object.freeze(JSON.parse(l))));
}

/** The append primitive: extend a JSONL string with ONE pass line (never a rewrite). */
export const appendLine = (text, pass) => `${text ?? ""}${JSON.stringify(pass)}\n`;

/** The per-source holograph: the cloth over that source's passes (points stay local). */
export const holographFor = (weft, address) => clothAt((weft ?? []).filter((p) => p.address === address));

// ── The identity level ────────────────────────────────────────────────────

/** The shared record the identity organs read: the weft's relations as
 *  EOHyperedge@1, each end carrying its form (surface) and its POINT (ref). */
export function foldOf(weft) {
  const graphEntries = [];
  let i = 0;
  for (const pass of weft ?? []) {
    for (const rel of pass.relations ?? []) {
      const parts = rel.participants ?? [];
      if (parts.length < 2 || !rel.relation) continue;
      const at = rel.at ?? rel.scope?.byteOffset ?? null;
      graphEntries.push({
        schema: "EOHyperedge@1", id: `weft:${pass.seq}:${i++}`, witness: holonAddress(pass.address, at),
        scope: { byteOffset: at }, relation: rel.relation,
        participants: parts.map((p) => ({ surface: p.surface ?? null, ref: p.ref ?? null })),
      });
    }
  }
  return { graphEntries };
}

/** CANDIDATE joins — nomination only, never a decision. A form carried on
 *  points in two or more DISTINCT sources nominates those points for a join;
 *  the result is a candidate with witnesses (the addresses), standing
 *  "candidate". Two same-spelled beings nominate too — the meet decides. */
export function candidateJoins(weft) {
  const byForm = new Map(); // normForm -> { form, points:Set, sources:Set, witnesses:[] }
  for (const pass of weft ?? []) {
    for (const c of pass.cast ?? []) {
      const f = normForm(c.surface);
      if (!f || !c.ref) continue;
      const e = byForm.get(f) ?? { form: c.surface, points: new Set(), sources: new Set(), witnesses: [] };
      e.points.add(c.ref);
      e.sources.add(pass.address);
      const at = holonAddress(pass.address, 0);
      if (!e.witnesses.includes(at)) e.witnesses.push(at);
      byForm.set(f, e);
    }
  }
  const out = [];
  for (const [f, e] of byForm) {
    if (e.points.size < 2 || e.sources.size < 2) continue; // one being, or only one source
    out.push(Object.freeze({
      schema: "EOIdentityCandidate@1", basis: "shared-form",
      form: e.form, key: f,
      points: Object.freeze([...e.points].sort()),
      witnesses: Object.freeze(e.witnesses),
      standing: "candidate",
      because: "a shared surface nominates these points for a join — nomination is not identity; only the for-whom meet decides (S113)",
    }));
  }
  return Object.freeze(out);
}

/**
 * resolveCrossSource(weft, { reads }) — decide the joins AT THE IDENTITY LEVEL.
 * `reads` are the for-whom frames (each `{ forWhom, ctx:{ supports, attacks } }`);
 * the shared record (`foldOf(weft)`) is injected into each. Runs
 * `survivingIdentityAtPoints`: each analog admitted frame contributes its
 * relation at the POINT level; the survivors are the point-pairs SOME admitted
 * frame holds and NONE splits. Returns `{ survivors, splits, refused }` where
 * `survivors`/`splits` are `[pointA, pointB]` pairs.
 */
export function resolveCrossSource(weft, { reads = [] } = {}) {
  const fold = foldOf(weft);
  const withFold = (reads ?? []).map((r) => ({ forWhom: r.forWhom, ctx: { ...(r.ctx ?? {}), fold: r.ctx?.fold ?? fold } }));
  const meet = survivingIdentityAtPoints(withFold);
  const pairs = (keys) => keys.map((k) => k.split("\u0000"));
  return Object.freeze({
    schema: "EOCrossSourceIdentity@1",
    fold: { graphEntries: fold.graphEntries.length },
    survivors: Object.freeze(pairs(meet.survivors)),
    splits: Object.freeze(pairs(meet.splits)),
    refused: meet.refused,
  });
}

/** Apply EARNED joins: rewrite every point to its canonical root (union-find),
 *  so the cloth folds joined points into one being. Pass `resolveCrossSource`'s
 *  `survivors` (never candidates). */
export function applyJoins(weft, pairs = []) {
  const parent = new Map();
  const find = (x) => { while (parent.get(x) !== undefined && parent.get(x) !== x) x = parent.get(x); return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb); };
  for (const [a, b] of pairs ?? []) { if (!parent.has(a)) parent.set(a, a); if (!parent.has(b)) parent.set(b, b); union(a, b); }
  const canon = (x) => (parent.has(x) ? find(x) : x);
  const mapEnd = (p) => ({ ...p, ref: canon(p.ref) });
  return (weft ?? []).map((pass) => ({
    ...pass,
    cast: (pass.cast ?? []).map((c) => ({ ...c, ref: canon(c.ref) })),
    relations: (pass.relations ?? []).map((r) => ({ ...r, participants: (r.participants ?? []).map(mapEnd) })),
  }));
}

/** The whole-file holograph. With no `joins` the cloth folds by POINT — source-
 *  local beings, nothing merged by spelling. Pass EARNED joins (the survivors
 *  of `resolveCrossSource`) to fold the joined points into one holograph. */
export function holographAll(weft, { joins = [] } = {}) {
  return clothAt(joins.length ? applyJoins(weft, joins) : (weft ?? []));
}

export { weftAttestations, weftReferents, emptyWeft, clothAt, holonAddress, refsOf };
