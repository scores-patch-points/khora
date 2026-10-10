// lib.mjs -- shared helpers of the ATTACK on para.suffixCopy (new file; imports lib/pocket.mjs only, edits nothing).
// A view is prepared once into flat per-unit arrays (last / second-last / first / second token ids, length, whole-unit hash, document). The nulls shuffle an INDEX array (perm[position] = unit placed there;
// document membership stays attached to POSITIONS, exactly as in the atlas null), so with the atlas seeds the atlas draws are reproduced exactly (see check-atlas.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { halves, nullView, seedOf, rngOf, sha256 } from "../../lib/pocket.mjs";
export { halves, nullView, seedOf, rngOf, sha256 };
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CACHE = "/private/tmp/claude-501/-Users-mlacy-Library-Application-Support-Claude-scratch-workspaces-4bf59fed-b26b-4f7d-a90f-11d28a16ba25-1a7b49f0-7962-48a4-8bfc-8a3bc2e27d2d-scratch-2026-10-05-fe56a5/d30d63fe-3592-46d4-90e3-d18dc306abd3/scratchpad/cache-dl";
export const loadCached = (id) => JSON.parse(fs.readFileSync(path.join(CACHE, `${id}.json`), "utf8"));
export const MATRIX = () => JSON.parse(fs.readFileSync(path.join(HERE, "../atlas-matrix.json"), "utf8"));
export const f = (x, d = 3) => (x == null || !Number.isFinite(x) ? "NA" : Number(x).toFixed(d));
export const tokensOf = (units) => units.reduce((n, u) => n + u.length, 0);
export const R = (x) => (Number.isFinite(x) ? Math.round(x * 1099511627776) / 1099511627776 : null); // the atlas rounding (multiples of 2^-40)
export const MIN_PAIRS = 50;
export const optOf = (argv) => (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };

/** Prepare a view {units:string[][], docOf} into flat arrays. map: optional token -> token|null (alternative tokenisation; dropped tokens vanish, units that become empty vanish). */
export function prepView(view, map = null) {
  const idOf = new Map(), L1 = [], L2 = [], F1 = [], F2 = [], len = [], ukey = [], docOf = [];
  const mixh = (h, x) => { h = Math.imul(h ^ x, 0x9e3779b1); return h ^ (h >>> 15); };
  const has = view.docOf && view.docOf.length === view.units.length;
  for (let u = 0; u < view.units.length; u++) {
    let un = view.units[u];
    if (map) { const o = []; for (const t of un) { const m = map(t); if (m != null) o.push(m); } un = o; }
    if (!un.length) continue;
    const ids = new Array(un.length); let h1 = un.length, h2 = ~un.length;
    for (let j = 0; j < un.length; j++) {
      let id = idOf.get(un[j]); if (id === undefined) { id = idOf.size; idOf.set(un[j], id); }
      ids[j] = id; h1 = mixh(h1, id + 0x1234567); h2 = mixh(h2, id ^ 0x7654321);
    }
    const n = ids.length;
    L1.push(ids[n - 1]); L2.push(n >= 2 ? ids[n - 2] : -1); F1.push(ids[0]); F2.push(n >= 2 ? ids[1] : -1);
    len.push(n); ukey.push((h1 >>> 0) * 2097152 + ((h2 >>> 0) & 2097151)); docOf.push(has ? view.docOf[u] : 0);
  }
  return { U: len.length, L1: Int32Array.from(L1), L2: Int32Array.from(L2), F1: Int32Array.from(F1), F2: Int32Array.from(F2), len: Int32Array.from(len), ukey: Float64Array.from(ukey), docOf, V: idOf.size, tokens: len.reduce((a, b) => a + b, 0) };
}

/** length class used by the length-preserving nulls: exact length up to 10, then half-octaves */
export const lenClass = (n) => (n <= 10 ? n : 10 + Math.floor(2 * Math.log2(n / 10)));

/** All pair statistics of one permutation. perm[pos] = unit at position pos. band = [lo, hi]: only pairs with BOTH lengths inside the band (and >= 2) are used. */
export function bundle(P, perm, band = null) {
  const { U, L1, L2, F1, F2, len, ukey, docOf } = P;
  let np = 0, S1 = 0, S2 = 0, P2 = 0, D = 0, S2P = 0;
  for (let u = 1; u < U; u++) {
    if (docOf[u] !== docOf[u - 1]) continue;
    const a = perm[u - 1], b = perm[u], la = len[a], lb = len[b];
    if (la < 2 || lb < 2) continue;
    if (band && (la < band[0] || la > band[1] || lb < band[0] || lb > band[1])) continue;
    np++;
    const s1 = L1[a] === L1[b], s2 = s1 && L2[a] === L2[b], p2 = F1[a] === F1[b] && F2[a] === F2[b];
    if (s1) S1++;
    if (s2) S2++;
    if (p2) P2++;
    if (ukey[a] === ukey[b]) D++;
    if (s2 && p2) S2P++;
  }
  const ok = np >= MIN_PAIRS;
  return {
    np, S1, S2, P2, D, S2P,
    suffixCopy: ok ? R(S2 / np) : null,
    lastCopy: ok ? R(S1 / np) : null,
    condSecond: ok && S1 >= 20 ? R(S2 / S1) : null,
    prefixCopy: ok ? R(P2 / np) : null,
    dupAdj: ok ? R(D / np) : null,
    sufNoDup: np - D >= MIN_PAIRS ? R((S2 - D) / (np - D)) : null,
    sufNoPre: np - P2 >= MIN_PAIRS ? R((S2 - S2P) / (np - P2)) : null,
  };
}
export const STATKEYS = ["suffixCopy", "lastCopy", "condSecond", "prefixCopy", "dupAdj", "sufNoDup", "sufNoPre"];

/** permutation generators. all return perm (array, perm[pos] = unit). */
export function globalPerm(P, id, which, seed) { return nullView({ id, which, units: Array.from({ length: P.U }, (_, k) => k), docOf: P.docOf }, "unit-order", seed).units; }
/** group-preserving shuffle: positions are grouped by keyOf(position) (observed layout); the units sitting in a group are re-dealt among the group's positions. */
export function groupPerm(groups, U, seed) {
  const rnd = rngOf(seed), perm = new Array(U);
  for (const g of groups) {
    const ix = g.slice();
    for (let i = ix.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = ix[i]; ix[i] = ix[j]; ix[j] = t; }
    for (let k = 0; k < g.length; k++) perm[g[k]] = ix[k];
  }
  return perm;
}
export function makeGroups(P, kind) {
  const m = new Map();
  for (let u = 0; u < P.U; u++) {
    const key = kind === "within-doc" ? `${P.docOf[u]}` : kind === "len" ? `${lenClass(P.len[u])}` : kind === "doc-len" ? `${P.docOf[u]}|${lenClass(P.len[u])}` : null;
    if (key === null) throw new Error("kind " + kind);
    let g = m.get(key); if (!g) { g = []; m.set(key, g); } g.push(u);
  }
  return [...m.values()];
}
export const NULLKINDS = ["unit-order", "within-doc", "len", "doc-len"];

const sdOf = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
/** cells of every statistic on a prepared view. nullKind "unit-order" uses the atlas seeds seedOf(id, which, "para", "unit-order", k); the others use seedOf(id, which, "sfxatk", kind, k).
 *  Returns {stat: {v, nullMean, nullSd, z, n, zPois}, _meta: {np, S2, nullS2Mean, ...}} */
export function cells(P, { id, which, nullKind = "unit-order", draws = 10, band = null, keys = STATKEYS, tag = "" } = {}) {
  const obs = bundle(P, Int32Array.from({ length: P.U }, (_, k) => k), band), xs = Object.fromEntries(keys.map((k) => [k, []])), S2 = [], NP = [], S1 = [];
  const groups = nullKind === "unit-order" ? null : makeGroups(P, nullKind);
  for (let k = 0; k < draws; k++) {
    const perm = nullKind === "unit-order" ? globalPerm(P, id, which, seedOf(id, which, "para", "unit-order", k)) : groupPerm(groups, P.U, seedOf(id, which, "sfxatk" + tag, nullKind, k));
    const b = bundle(P, perm, band); for (const key of keys) if (Number.isFinite(b[key])) xs[key].push(b[key]); S2.push(b.S2); NP.push(b.np); S1.push(b.S1);
  }
  const out = {};
  for (const key of keys) {
    const v = obs[key], a = xs[key], { m, sd } = a.length >= 3 ? sdOf(a) : { m: NaN, sd: NaN };
    out[key] = { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: a.length };
  }
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  out._meta = { U: P.U, tokens: P.tokens, np: obs.np, S1: obs.S1, S2: obs.S2, P2: obs.P2, D: obs.D, nullS2Mean: mean(S2), nullS1Mean: mean(S1), nullNpMean: mean(NP), nullS2: S2 };
  return out;
}
export const statusOf = (a, b) => {
  if (!a || !b || a.z == null || b.z == null) return a && b && a.v != null && b.v != null ? "zundef" : "nodata";
  if (Math.abs(a.z) >= 4 && Math.abs(b.z) >= 4 && a.z * b.z > 0) return a.z > 0 ? "P+" : "P-";
  if (Math.abs(a.z) < 2 && Math.abs(b.z) < 2) return "A";
  return "M";
};
