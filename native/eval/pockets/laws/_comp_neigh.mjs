// laws/_comp_neigh.mjs — neighbour-TYPE statistics of the "comp" family: diversity versus frequency, rigid types, same-left / same-right repeat rates, left/right entropy asymmetry.
// Neighbour identity is an opaque integer id of the type in the half; a neighbour must lie inside the same unit (no neighbour across a unit edge).
import { NB, LN2, entropyMM, finite } from "./_comp_prep.mjs";

const MINC = 8, KFIX = 32, ASYM_MIN = 40;
// SOFT RIGID SHARE. A type counts 1 when its commonest neighbour has >= 0.8 of its occurrences (the brief's definition) and exp(-(0.8 - m) / 0.15) below that (m = 0.65 -> 0.37, 0.5 -> 0.135, 0.3 -> 0.036).
// Reason: the HARD share is (almost) exactly 0 in every shuffle (a type with >= 10 occurrences hardly ever has 8 of them with one neighbour by chance), so its atlas z would be undefined (nullSd = 0) or a
// lumpy count of chance events (40 iid replicates: 5% of cells at |z| >= 4 with scale 0.05; none with 0.15). The soft share is never below the hard share and has a smooth null. hardL / hardR are returned for the tests only.
const SOFT = 0.15;
/** one pass over types with count >= 8: occurrences with a left / right neighbour, count of the commonest neighbour type -> rigidL, rigidR; distinct neighbour types among each type's first 32 left and first 32 right occurrences -> divSlope */
export function neighbourTypeStats(P, soft = SOFT) {
  const { us, w, cnt, V, nUnits } = P;
  const mapL = new Map(), mapR = new Map(), nL = new Int32Array(V), nR = new Int32Array(V), mL = new Int32Array(V), mR = new Int32Array(V), fL = new Int32Array(V), fR = new Int32Array(V);
  for (let k = 0; k < nUnits; k++) {
    const s = us[k], e = us[k + 1];
    for (let i = s; i < e; i++) {
      const t = w[i]; if (cnt[t] < MINC) continue;
      if (i > s) { const key = t * V + w[i - 1], c = (mapL.get(key) ?? 0) + 1; mapL.set(key, c); if (c > mL[t]) mL[t] = c; nL[t]++; if (c === 1 && nL[t] <= KFIX) fL[t]++; }
      if (i < e - 1) { const key = t * V + w[i + 1], c = (mapR.get(key) ?? 0) + 1; mapR.set(key, c); if (c > mR[t]) mR[t] = c; nR[t]++; if (c === 1 && nR[t] <= KFIX) fR[t]++; }
    }
  }
  let eL = 0, rL = 0, eR = 0, rR = 0, sL = 0, sR = 0; const xs = [], ys = [];
  for (let t = 0; t < V; t++) {
    if (cnt[t] < MINC) continue;
    if (nL[t] >= 10) { eL++; const m = mL[t] / nL[t]; if (m >= 0.8) { rL++; sL++; } else sL += Math.exp(-(0.8 - m) / soft); }
    if (nR[t] >= 10) { eR++; const m = mR[t] / nR[t]; if (m >= 0.8) { rR++; sR++; } else sR += Math.exp(-(0.8 - m) / soft); }
    if (nL[t] >= KFIX && nR[t] >= KFIX) { xs.push(Math.log(cnt[t])); ys.push(Math.log((fL[t] + fR[t]) / 2)); }
  }
  let divSlope = null;
  if (xs.length >= 15) {
    const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0;
    for (let j = 0; j < n; j++) { sxy += (xs[j] - mx) * (ys[j] - my); sxx += (xs[j] - mx) ** 2; }
    divSlope = sxx > 0 ? finite(sxy / sxx) : null;
  }
  return { divSlope, nDiv: xs.length, rigidL: eL >= 20 ? sL / eL : null, rigidR: eR >= 20 ? sR / eR : null, hardL: eL >= 20 ? rL / eL : null, hardR: eR >= 20 ? rR / eR : null, eligL: eL, eligR: eR };
}
/** consecutive occurrences of a type (stream order): share with the same left / right neighbour type as the previous occurrence that had that neighbour */
export function sameStats(P) {
  const { us, w, V, nUnits } = P, lastL = new Int32Array(V).fill(-1), lastR = new Int32Array(V).fill(-1);
  let pl = 0, hl = 0, pr = 0, hr = 0;
  for (let k = 0; k < nUnits; k++) {
    const s = us[k], e = us[k + 1];
    for (let i = s; i < e; i++) {
      const t = w[i];
      if (i > s) { const x = w[i - 1], p = lastL[t]; if (p >= 0) { pl++; if (p === x) hl++; } lastL[t] = x; }
      if (i < e - 1) { const x = w[i + 1], p = lastR[t]; if (p >= 0) { pr++; if (p === x) hr++; } lastR[t] = x; }
    }
  }
  return { sameL: pl >= 200 ? hl / pl : null, sameR: pr >= 200 ? hr / pr : null };
}
/** head-direction proxy over the 20 commonest types that have >= 40 interior occurrences (a neighbour on both sides): eq = mean over those types of (H_R - H_L) / (H_R + H_L), every type counted once;
 *  pooled = the count-weighted version over ALL types with >= 40 interior occurrences. H = Miller-Madow entropy (bits) of the rank bin of the type's right / left neighbour. Needs >= 10 types.
 *  Why equal weights: pooled over all occurrences, the count-weighted difference H(L|W) - H(R|W) is, by the symmetry of mutual information, only an effect of the first and last pair of each unit (an edge
 *  effect), so it cannot carry direction; a type-by-type sign can (a word that binds to its left host has a narrow left company and a broad right one). Why the 20 commonest types: they exist in every
 *  pocket of >= ~10k tokens and are (nearly) the same set at any size; over all types with >= 40 occurrences the value drifted with pocket size on one novel (0.009 at 10k tokens, 0.032 at 150k,
 *  because the qualifying set grows from ~25 to ~300 types), over the top 20 it stayed in -0.009..-0.004. */
export function asymStat(P) {
  const { us, w, tb, cnt, V, nUnits } = P, slot = new Int32Array(V).fill(-1), K = 20, el = [];
  for (let t = 0; t < V; t++) if (cnt[t] >= ASYM_MIN) el.push(t);
  if (el.length < 10) return { eq: null, pooled: null };
  const top = el.slice().sort((a, b) => cnt[b] - cnt[a] || a - b).slice(0, K), isTop = new Uint8Array(V); top.forEach((t) => { isTop[t] = 1; });
  el.forEach((t, q) => { slot[t] = q; });
  const S = el.length, hL = new Float64Array(S * NB), hR = new Float64Array(S * NB), nI = new Float64Array(S);
  for (let k = 0; k < nUnits; k++) {
    const s = us[k], e = us[k + 1];
    for (let i = s + 1; i < e - 1; i++) { const q = slot[w[i]]; if (q < 0) continue; hL[q * NB + tb[i - 1]]++; hR[q * NB + tb[i + 1]]++; nI[q]++; }
  }
  let num = 0, den = 0, sum = 0, m = 0;
  for (let q = 0; q < S; q++) {
    if (nI[q] < ASYM_MIN) continue;
    const a = entropyMM(hL.subarray(q * NB, (q + 1) * NB)), b = entropyMM(hR.subarray(q * NB, (q + 1) * NB));
    if (!(a + b > 0)) continue;
    num += nI[q] * (b - a); den += nI[q] * (b + a);
    if (isTop[el[q]]) { sum += (b - a) / (b + a); m++; }
  }
  return m >= 10 ? { eq: finite(sum / m), pooled: den > 0 ? finite(num / den) : null } : { eq: null, pooled: null };
}
