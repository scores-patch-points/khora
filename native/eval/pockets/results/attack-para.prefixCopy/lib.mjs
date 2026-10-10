// lib.mjs -- shared helpers of the ATTACK on para.prefixCopy (new file; imports lib/pocket.mjs only, edits nothing).
// Everything here works on an index view: each unit gets an integer index, the null shuffles the INDEX array with the repo's own nullView() (same rng consumption as on token units, so with the
// atlas seeds the atlas draws are reproduced exactly, checked by check-atlas.mjs).  Statistics are copies of the loops in laws/_para_adj.mjs, evaluated on the permuted index sequence.
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
const R = (x) => (Number.isFinite(x) ? Math.round(x * 1099511627776) / 1099511627776 : null); // the atlas rounding (multiples of 2^-40)
const K = 8, MIN_PAIRS = 50;

/** prep a view {units:string[][], docOf} -> flat arrays: ids8 (first 8 token ids of each unit, -1 padded), len, ukey (hash of the whole unit), docOf. */
export function prepView(view) {
  const U = view.units.length, idOf = new Map(), ids8 = new Int32Array(U * K).fill(-1), len = new Int32Array(U), ukey = new Float64Array(U);
  const mixh = (h, x) => { h = Math.imul(h ^ x, 0x9e3779b1); return h ^ (h >>> 15); };
  for (let u = 0; u < U; u++) {
    const un = view.units[u]; len[u] = un.length; let h1 = un.length, h2 = ~un.length;
    for (let j = 0; j < un.length; j++) {
      let id = idOf.get(un[j]); if (id === undefined) { id = idOf.size; idOf.set(un[j], id); }
      if (j < K) ids8[u * K + j] = id;
      h1 = mixh(h1, id + 0x1234567); h2 = mixh(h2, id ^ 0x7654321);
    }
    ukey[u] = (h1 >>> 0) * 2097152 + ((h2 >>> 0) & 2097151);
  }
  const docOf = view.docOf && view.docOf.length === U ? view.docOf : new Array(U).fill(0);
  return { U, ids8, len, ukey, docOf, V: idOf.size };
}

/** All adjacency statistics of one permutation (perm[pos] = unit placed at position pos; docOf stays attached to positions, as in the atlas null).
 *  prefixCopy / suffixCopy / posPar are exact copies of laws/_para_adj.mjs; firstTokCopy, posParTail, prefixNoDup, dupAdj are NEW rivals/leakage decompositions on the SAME pair set as prefixCopy. */
export function bundle(P, perm) {
  const { U, ids8, len, ukey, docOf } = P;
  let np = 0, pre = 0, first = 0, dup = 0, preDup = 0;
  const c = new Float64Array(K), m = new Float64Array(K);
  for (let u = 1; u < U; u++) {
    if (docOf[u] !== docOf[u - 1]) continue;
    const a = perm[u - 1], b = perm[u], la = len[a], lb = len[b];
    const l = Math.min(la, lb, K); for (let k = 0; k < l; k++) { c[k]++; if (ids8[a * K + k] === ids8[b * K + k]) m[k]++; }
    if (la < 2 || lb < 2) continue;
    np++;
    const f0 = ids8[a * K] === ids8[b * K], p2 = f0 && ids8[a * K + 1] === ids8[b * K + 1];
    if (f0) first++;
    if (p2) pre++;
    if (ukey[a] === ukey[b]) { dup++; if (p2) preDup++; }
  }
  let s = 0, n = 0; for (let k = 0; k < K; k++) if (c[k] >= MIN_PAIRS) { s += m[k] / c[k]; n++; }
  let st = 0, nt = 0; for (let k = 2; k < K; k++) if (c[k] >= MIN_PAIRS) { st += m[k] / c[k]; nt++; }
  return {
    np, pre, first, dup, preDup,
    prefixCopy: np >= MIN_PAIRS ? R(pre / np) : null,
    firstTokCopy: np >= MIN_PAIRS ? R(first / np) : null,
    prefixNoDup: np >= MIN_PAIRS ? R((pre - preDup) / np) : null,
    dupAdj: np >= MIN_PAIRS ? R(dup / np) : null,
    prefixGivenFirst: np >= MIN_PAIRS && first >= 30 ? R(pre / first) : null,
    posPar: n >= 3 && c[0] >= MIN_PAIRS && c[1] >= MIN_PAIRS ? R(s / n) : null,
    posParTail: nt >= 3 ? R(st / nt) : null,
  };
}
export const STATKEYS = ["prefixCopy", "firstTokCopy", "prefixNoDup", "dupAdj", "posPar", "posParTail", "prefixGivenFirst"];
const stat = (xs) => { const n = xs.length, mu = xs.reduce((a, b) => a + b, 0) / n; return { m: mu, sd: Math.sqrt(xs.reduce((a, b) => a + (b - mu) ** 2, 0) / Math.max(1, n - 1)) }; };

/** within-document unit-order shuffle: units are re-dealt only among the positions of their own document. */
export function withinDocPerm(docOf, seed) {
  const rnd = rngOf(seed), U = docOf.length, ix = Array.from({ length: U }, (_, k) => k);
  let s = 0;
  while (s < U) {
    let e = s; while (e < U && docOf[e] === docOf[s]) e++;
    for (let i = e - 1; i > s; i--) { const j = s + Math.floor(rnd() * (i - s + 1)); const t = ix[i]; ix[i] = ix[j]; ix[j] = t; }
    s = e;
  }
  return ix;
}
/** The atlas null permutation: nullView(view,"unit-order",seed) on an index view. */
export const globalPerm = (U, docOf, id, which, seed) => nullView({ id, which, units: Array.from({ length: U }, (_, k) => k), docOf }, "unit-order", seed).units;

/** cell of every statistic in `keys` on a view: observed (identity permutation) vs `draws` null permutations.
 *  nullKind "unit-order" = the atlas null with atlas seeds seedOf(id, which, "para", "unit-order", k) (id/which overridable);  "within-doc" = within-document shuffle with seeds seedOf(id, which, tag, "within-doc", k). */
export function cells(view, { keys = STATKEYS, nullKind = "unit-order", draws = 10, seedId = view.id, which = view.which, tag = "attack" } = {}) {
  const P = prepView(view), U = P.U, ident = Int32Array.from({ length: U }, (_, k) => k), obs = bundle(P, ident), xs = Object.fromEntries(keys.map((k) => [k, []])), npDraw = [];
  for (let k = 0; k < draws; k++) {
    const perm = nullKind === "unit-order" ? globalPerm(U, P.docOf, seedId, which, seedOf(seedId, which, "para", "unit-order", k)) : withinDocPerm(P.docOf, seedOf(seedId, which, tag, "within-doc", k));
    const b = bundle(P, perm); for (const key of keys) if (Number.isFinite(b[key])) xs[key].push(b[key]); npDraw.push(b.np);
  }
  const out = {};
  for (const key of keys) {
    const v = obs[key], a = xs[key], { m, sd } = a.length >= 3 ? stat(a) : { m: NaN, sd: NaN };
    out[key] = { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: a.length };
  }
  out._meta = { U, np: obs.np, pre: obs.pre, dup: obs.dup, preDup: obs.preDup, first: obs.first, tokens: tokensOf(view.units), nullNpMean: npDraw.reduce((a, b) => a + b, 0) / npDraw.length };
  return out;
}
export const statusOf = (a, b) => {
  if (!a || !b || a.z == null || b.z == null) return "undef";
  if (Math.abs(a.z) >= 4 && Math.abs(b.z) >= 4 && a.z * b.z > 0) return a.z > 0 ? "P+" : "P-";
  if (Math.abs(a.z) < 2 && Math.abs(b.z) < 2) return "A";
  return "M";
};
export const optOf = (argv) => (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
