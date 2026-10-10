// laws/_freq_misc.mjs — preprocessing and the type-level / unit-level statistics of the "freq" family (leading underscore: the atlas ignores this file).
// All sums are in a fixed order, no randomness: byte-identical output for the same input.

/** code-point length of a token (so astral / non-latin scripts are measured per character, not per UTF-16 unit) */
const cpLen = (w) => { let n = 0; for (let i = 0; i < w.length; i++, n++) { const c = w.charCodeAt(i); if (c >= 0xd800 && c <= 0xdbff && i + 1 < w.length) i++; } return n; };

/** view -> typed arrays: ids (token stream in unit order), per-type string/length/count, per-unit length/start/doc */
export function prep(view) {
  const U = view.units.length; let T = 0;
  for (const u of view.units) T += u.length;
  const ids = new Int32Array(T), uLen = new Int32Array(U), uStart = new Int32Array(U), map = new Map(), strs = [];
  let t = 0;
  for (let k = 0; k < U; k++) {
    const u = view.units[k]; uStart[k] = t; uLen[k] = u.length;
    for (let j = 0; j < u.length; j++) { const w = u[j]; let id = map.get(w); if (id === undefined) { id = strs.length; map.set(w, id); strs.push(w); } ids[t++] = id; }
  }
  const nTypes = strs.length, tlen = new Int32Array(nTypes), cnt = new Int32Array(nTypes);
  for (let i = 0; i < nTypes; i++) tlen[i] = cpLen(strs[i]);
  for (let i = 0; i < T; i++) cnt[ids[i]]++;
  return { T, U, ids, uLen, uStart, nTypes, strs, tlen, cnt, docOf: view.docOf };
}

const avgRanks = (v) => { const n = v.length, ix = Array.from({ length: n }, (_, i) => i).sort((a, b) => v[a] - v[b] || a - b), r = new Float64Array(n); for (let i = 0; i < n;) { let j = i; while (j + 1 < n && v[ix[j + 1]] === v[ix[i]]) j++; for (let k = i; k <= j; k++) r[ix[k]] = (i + j) / 2; i = j + 1; } return r; };
/** Pearson r of two equal-length numeric arrays; null if either has no variance */
const isConst = (a) => { for (let i = 1; i < a.length; i++) if (a[i] !== a[0]) return false; return true; };   // exact test: float residue must never fake variance
export const pearson = (x, y) => { const n = x.length; if (n < 3 || isConst(x) || isConst(y)) return null; let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; } mx /= n; my /= n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; } return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null; };

/** abbrev: Spearman rho(count, code-point length) over the K commonest types (ties in count broken by string order; needs >= K types) */
function abbrev(P, K = 500) {
  if (P.nTypes < K) return null;
  const sorted = Int32Array.from(P.cnt).sort(), thr = sorted[P.nTypes - K], cand = [];
  for (let i = 0; i < P.nTypes; i++) if (P.cnt[i] >= thr) cand.push(i);
  cand.sort((a, b) => P.cnt[b] - P.cnt[a] || (P.strs[a] < P.strs[b] ? -1 : P.strs[a] > P.strs[b] ? 1 : 0));
  const top = cand.slice(0, K), x = avgRanks(top.map((i) => P.cnt[i])), y = avgRanks(top.map((i) => P.tlen[i]));
  return pearson(x, y);
}
/** menzerath: Pearson r(ln unit length, mean code-point length of the unit's tokens) over units */
function menzerath(P) {
  if (P.U < 30) return null;
  const x = new Float64Array(P.U), y = new Float64Array(P.U);
  for (let k = 0; k < P.U; k++) { let s = 0; for (let j = P.uStart[k], e = j + P.uLen[k]; j < e; j++) s += P.tlen[P.ids[j]]; x[k] = Math.log(P.uLen[k]); y[k] = s / P.uLen[k]; }
  return pearson(x, y);
}
/** recurLen: standardised mean length difference, tokens recurring within W previous tokens of the same document minus the rest */
function recurLen(P, W = 20) {
  const last = new Int32Array(P.nTypes).fill(-1); let n1 = 0, s1 = 0, n0 = 0, s0 = 0, sq = 0, docStart = 0, curDoc = -1, t = 0;
  for (let k = 0; k < P.U; k++) {
    if (P.docOf[k] !== curDoc) { curDoc = P.docOf[k]; docStart = t; }
    for (let j = 0, e = P.uLen[k]; j < e; j++, t++) {
      const id = P.ids[t], L = P.tlen[id], lp = last[id]; sq += L * L;
      if (lp >= docStart && t - lp <= W) { n1++; s1 += L; } else { n0++; s0 += L; }
      last[id] = t;
    }
  }
  if (n1 < 30 || n0 < 30) return null;
  const n = n1 + n0, S = s1 + s0, vnum = n * sq - S * S;   // integer sums: the variance numerator is exact
  return vnum > 0 ? (s1 / n1 - s0 / n0) / (Math.sqrt(vnum) / n) : null;
}
/** unit-length statistics on ln(unit length) and raw length */
function unitStats(P) {
  const out = { lenAcf1: null, lenDocEps: null, lenCV: null, lenLogSkew: null }, U = P.U;
  if (U < 30) return out;
  const x = new Float64Array(U); let sL = 0, sL2 = 0, m = 0;
  for (let k = 0; k < U; k++) { x[k] = Math.log(P.uLen[k]); sL += P.uLen[k]; sL2 += P.uLen[k] * P.uLen[k]; m += x[k]; }
  const constLen = isConst(P.uLen), vnum = U * sL2 - sL * sL;   // exact integer arithmetic
  out.lenCV = sL > 0 ? Math.sqrt(Math.max(0, vnum) / (U * (U - 1))) / (sL / U) : null;
  m /= U; let m2 = 0, m3 = 0; for (let k = 0; k < U; k++) { const d = x[k] - m; m2 += d * d; m3 += d * d * d; } m2 /= U; m3 /= U; out.lenLogSkew = !constLen && m2 > 0 ? m3 / Math.pow(m2, 1.5) : null;
  const xa = [], xb = []; for (let k = 0; k + 1 < U; k++) if (P.docOf[k] === P.docOf[k + 1]) { xa.push(x[k]); xb.push(x[k + 1]); }
  out.lenAcf1 = xa.length >= 30 ? pearson(xa, xb) : null;
  let D = 0, SSB = 0, SSW = 0; const sums = new Map();
  for (let k = 0; k < U; k++) { let e = sums.get(P.docOf[k]); if (!e) sums.set(P.docOf[k], (e = { n: 0, s: 0 })); e.n++; e.s += x[k]; }
  D = sums.size; for (const e of sums.values()) { const md = e.s / e.n; SSB += e.n * (md - m) * (md - m); }
  for (let k = 0; k < U; k++) { const e = sums.get(P.docOf[k]); const d = x[k] - e.s / e.n; SSW += d * d; }
  if (!constLen && D >= 2 && U - D > 0 && SSB + SSW > 0) out.lenDocEps = (SSB - ((D - 1) * SSW) / (U - D)) / (SSB + SSW);
  return out;
}
/** INERT statistics (shuffle-invariant) are put on a dyadic grid of 2^-30 so that ten identical draws average to exactly the same double: nullSd is then exactly 0 and the atlas z is null, never a rounding-noise z of +-0.95 */
const GRID = 1073741824, q = (x) => (x == null ? null : Math.round(x * GRID) / GRID);
export function typeAndUnitStats(P) { const u = unitStats(P); return { abbrev: q(abbrev(P)), menzerath: menzerath(P), recurLen: recurLen(P), lenAcf1: u.lenAcf1, lenDocEps: u.lenDocEps, lenCV: q(u.lenCV), lenLogSkew: q(u.lenLogSkew) }; }
