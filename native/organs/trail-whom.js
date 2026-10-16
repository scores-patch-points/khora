// organs/trail-whom.js — the reader's trail (what the fold already showed or said to them) as W spans. Pure; no model, no clock.
//
// Run 7 of OWN-WORDS-PREREG showed the only reader-dependence the evidence supports: a reader who was SHOWN spans (held = the same
// bytes or arrangement). The-fold keeps that trail; this organ turns it into the W spans `foldWithWhom` takes, so a surface calls one
// function and holds no capability of its own (memory: surfaces are thin clients).
//
//   whomFromTrail(trail, { universe })   → { spans, unresolved, counts }
//   accumulate(trail, shown, { turn, via }) → a new trail with the addresses the record side showed this turn, deduplicated
//
// A trail entry is `{ address, turn, via: "seen" | "spoken" }`. `seen`: the reader was shown the passage. `spoken`: the fold said it to
// them. Both name UNIVERSE addresses on purpose (whom-standing.js REFERS_TO_U).
//
// TWO LAWS, from ledger L38 and from the layer's own N3:
//   - the trail grows only by RECORD-side addresses (what the fold selected from U). W-side addresses are never re-added, so the
//     accumulating chain cannot double each step (L38: 136, 266, 527, 1049, 2093 claims) and its stop rule is about the record.
//   - an address the universe does not hold is returned in `unresolved`, typed, never silently dropped and never admitted: a trail that
//     names bytes this universe does not have is not evidence about this region.
export const TRAIL_VIA = Object.freeze(["seen", "spoken"]);

export function whomFromTrail(trail = [], { universe = [] } = {}) {
  const byAddress = new Map();
  for (const u of universe) { const k = u?.address; if (!k) continue; (byAddress.get(k) ?? byAddress.set(k, []).get(k)).push(u); }
  const spans = [], unresolved = [];
  const seen = new Set();
  for (const t of trail ?? []) {
    const via = TRAIL_VIA.includes(t?.via) ? t.via : null;
    if (!via || !t?.address) { unresolved.push({ address: t?.address ?? null, turn: t?.turn ?? null, why: !via ? "unknown-via" : "no-address" }); continue; }
    const key = `${via}|${t.address}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const us = byAddress.get(t.address);
    if (!us) { unresolved.push({ address: t.address, turn: t.turn ?? null, via, why: "not-in-universe" }); continue; }
    for (const u of us) spans.push({ ...u, side: "W", id: `${via}-${u.id}`, provenance: { kind: via, ref: `turn:${t.turn ?? "?"}` } });
  }
  return { spans, unresolved, counts: { trail: (trail ?? []).length, spans: spans.length, unresolved: unresolved.length } };
}

/** A new trail: the old one plus the addresses the record side showed this turn that it did not already hold (same `via`). */
export function accumulate(trail = [], shown = [], { turn = null, via = "seen" } = {}) {
  if (!TRAIL_VIA.includes(via)) throw new Error(`accumulate: via must be one of ${TRAIL_VIA.join(", ")}`);
  const have = new Set((trail ?? []).map((t) => `${t.via}|${t.address}`));
  const out = [...(trail ?? [])];
  for (const a of shown ?? []) {
    const address = typeof a === "string" ? a : a?.address;
    if (!address) continue;
    const k = `${via}|${address}`;
    if (have.has(k)) continue;
    have.add(k);
    out.push({ address, turn, via });
  }
  return out;
}
