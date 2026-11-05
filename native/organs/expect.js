// expect.js — what is LIKELY CONNECTED to a being, earned from a reader's ground. Medium-blind: the ground is arrangements (end1, label, end2).
//
// Omnimodal by construction: a being is a being whether it was minted from a page or nominated in a frame. When anything — a sentence, a detector, a
// fixation — puts a being forward, the ground that reader has already folded says what tends to come with it, and by what relation. Those are
// EXPECTATIONS (top-down): where to look next, what to test, and what would be a surprise. They are never facts about the new material.
//
// EARNED, NEVER TYPED. Raw co-occurrence is dominated by hubs (pronouns, light relations) that connect to everything. So a connection counts only when
// it beats a MEASURED NULL: the same ground with its second ends shuffled across rows (seeded), which keeps every end's and every label's frequency
// and destroys which end goes with which. For each candidate the observed count is compared with the null's 99th percentile over `draws` shuffles.
//
// expectations(ground, being, { draws, seed, q, floor }) → { being, rows, beings: [{ key, observed, ceiling, via }], relations: [{ label, observed,
//   ceiling, roles }], null: { draws, q, floor } }
//   ground   an array of [end1, label, end2] (already folded keys; the caller decides how faces become keys)
// A being or relation is listed only when observed > the null's q-quantile AND observed >= floor. Everything else is dropped, and the counts of what
// was dropped are returned, so a caller can see how much the null refused.
import { lcg, shuffled } from "../kernel/continuation.js";
import { nullOf } from "../kernel/earning.js";

export function expectations(ground, being, { draws = 20, seed = 0, q = 0.99, floor = 2 } = {}) {
  const rows = ground.filter((r) => Array.isArray(r) && r.length === 3);
  const touches = (r) => r[0] === being || r[2] === being;
  const count = (rs) => {
    const B = new Map(), L = new Map();
    for (const [a, l, b] of rs) {
      if (a === being && b !== being) { B.set(b, (B.get(b) ?? 0) + 1); L.set(`${l}|as end1`, (L.get(`${l}|as end1`) ?? 0) + 1); }
      else if (b === being && a !== being) { B.set(a, (B.get(a) ?? 0) + 1); L.set(`${l}|as end2`, (L.get(`${l}|as end2`) ?? 0) + 1); }
    }
    return { B, L };
  };
  const real = count(rows.filter(touches));
  // the null: second ends shuffled across ALL rows (frequencies kept, pairing destroyed), counted the same way
  const rng = lcg(seed), ends2 = rows.map((r) => r[2]), nullB = new Map(), nullL = new Map();
  for (let k = 0; k < draws; k++) {
    const e2 = shuffled(ends2, rng), shuffledRows = rows.map((r, i) => [r[0], r[1], e2[i]]);
    const c = count(shuffledRows.filter(touches));
    for (const key of real.B.keys()) { if (!nullB.has(key)) nullB.set(key, []); nullB.get(key).push(c.B.get(key) ?? 0); }
    for (const key of real.L.keys()) { if (!nullL.has(key)) nullL.set(key, []); nullL.get(key).push(c.L.get(key) ?? 0); }
  }
  const ceil = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? 0; };
  const beings = [], relations = []; let refusedB = 0, refusedL = 0;
  for (const [key, observed] of real.B) { const ceiling = ceil(nullB.get(key) ?? [0]); if (observed > ceiling && observed >= floor) beings.push({ key, observed, ceiling }); else refusedB++; }
  for (const [k, observed] of real.L) { const ceiling = ceil(nullL.get(k) ?? [0]); const [label, role] = k.split("|"); if (observed > ceiling && observed >= floor) relations.push({ label, role, observed, ceiling }); else refusedL++; }
  const lift = (x) => (x.observed + 1) / (x.ceiling + 1);
  beings.sort((a, b) => lift(b) - lift(a) || b.observed - a.observed); relations.sort((a, b) => lift(b) - lift(a) || b.observed - a.observed);
  return { being, rows: rows.filter(touches).length, beings, relations, refused: { beings: refusedB, relations: refusedL }, null: { ...nullOf({ destroys: "which end goes with which", keeps: "every end's and every label's frequency", draws, q }), floor, seed, kind: "second ends shuffled across the ground" } };
}
