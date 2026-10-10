// variants.mjs -- deterministic pocket transformations used by the size / unit-length / tokenisation attack (A). Every function maps a pocket to a pocket (same id, same fields).
import { sha256, subsampleDocs, tokensOf } from "./lib.mjs";
const keepNonEmpty = (p, units, docOf) => { const U = [], D = []; units.forEach((u, k) => { if (u.length) { U.push(u); D.push(docOf[k]); } }); return { ...p, units: U, docOf: D }; };
/** re-cut every document's token stream into consecutive windows of exactly L tokens (remainder dropped): equal unit length by construction. */
export function rechunk(p, L) {
  const U = [], D = []; let s = 0;
  while (s < p.units.length) {
    let e = s; while (e < p.units.length && p.docOf[e] === p.docOf[s]) e++;
    const flat = []; for (let k = s; k < e; k++) for (const w of p.units[k]) flat.push(w);
    for (let i = 0; i + L <= flat.length; i += L) { U.push(flat.slice(i, i + L)); D.push(p.docOf[s]); }
    s = e;
  }
  return { ...p, units: U, docOf: D };
}
const typeCounts = (p) => { const c = new Map(); for (const u of p.units) for (const w of u) c.set(w, (c.get(w) || 0) + 1); return c; };
/** delete the rarest 1% of types (ties broken by sha256 of the type, never alphabetically) */
export function dropRarest(p, frac = 0.01) {
  const c = typeCounts(p), types = [...c.keys()].sort((a, b) => c.get(a) - c.get(b) || (sha256(`${p.id}:rare:${a}`) < sha256(`${p.id}:rare:${b}`) ? -1 : 1));
  const drop = new Set(types.slice(0, Math.ceil(frac * types.length)));
  return keepNonEmpty(p, p.units.map((u) => u.filter((w) => !drop.has(w))), p.docOf);
}
export function dropHapax(p) { const c = typeCounts(p); return keepNonEmpty(p, p.units.map((u) => u.filter((w) => c.get(w) > 1)), p.docOf); }
/** merge inflected variants crudely: keep the first k code points of every token (a string function, no list) */
export function stem(p, k = 5) { return { ...p, units: p.units.map((u) => u.map((w) => { const a = Array.from(w); return a.length > k ? a.slice(0, k).join("") : w; })) }; }
/** keep only the first copy of each distinct whole unit (exact token sequence) of the pocket */
export function dedupe(p) { const seen = new Set(), U = [], D = []; p.units.forEach((u, k) => { const key = u.join("\x1f"); if (!seen.has(key)) { seen.add(key); U.push(u); D.push(p.docOf[k]); } }); return { ...p, units: U, docOf: D }; }
export const VARIANTS = {
  size60: { minTokens: 60000, make: (p) => subsampleDocs(p, 60000, "sz60") },
  size60_L8: { minTokens: 60000, make: (p) => rechunk(subsampleDocs(p, 60000, "sz60"), 8) },
  size60_L16: { minTokens: 60000, make: (p) => rechunk(subsampleDocs(p, 60000, "sz60"), 16) },
  size60_L32: { minTokens: 60000, make: (p) => rechunk(subsampleDocs(p, 60000, "sz60"), 32) },
  size60_rare1: { minTokens: 60000, make: (p) => dropRarest(subsampleDocs(p, 60000, "sz60")) },
  size60_hapax: { minTokens: 60000, make: (p) => dropHapax(subsampleDocs(p, 60000, "sz60")) },
  size60_stem5: { minTokens: 60000, make: (p) => stem(subsampleDocs(p, 60000, "sz60"), 5) },
  size30: { minTokens: 30000, make: (p) => subsampleDocs(p, 30000, "sz30") },
  size30_L16: { minTokens: 30000, make: (p) => rechunk(subsampleDocs(p, 30000, "sz30"), 16) },
  full_dedupe: { minTokens: 0, make: (p) => dedupe(p) },
};
