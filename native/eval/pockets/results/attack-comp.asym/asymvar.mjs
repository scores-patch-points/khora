// asymvar.mjs -- re-implementation of comp.asym with switches, and cheap candidate rivals, all on the repo's own prep() output (ids, rank bins tb, counts). New file.
//   asymVar(P, {margin, mm, K, minOcc, mode})  margin = minimum distance (in tokens) of the CENTRE token from either unit edge (1 = the repo's rule: a neighbour on both sides);
//     mode "entropy" (default): mean over the K commonest types (cnt >= minOcc, >= minOcc centre occurrences) of (H_R - H_L)/(H_R + H_L), H = Miller-Madow (mm) or plug-in entropy of the neighbour rank bin;
//     mode "meanbin": per type (mR - mL)/(mR + mL), m = mean rank bin of the right / left neighbour;  "distinct": per type (dR - dL)/(dR + dL), d = distinct neighbour TYPES among the first 32 centre occurrences;
//     "topadj": per type P(right neighbour is one of the K commonest types) - P(left neighbour is).   Needs >= 10 qualifying types, else null.
//   with defaults it equals laws/_comp_neigh.mjs asymStat().eq exactly (check-variants.mjs asserts this).
//   edgeGrad(P): mean over units of >= 6 tokens of [mean bin(last two) - mean bin(first two)].   posSlope(P): pooled OLS slope of rank bin on relative position (i-s)/(L-1), units >= 4 tokens.
import { entropy, entropyMM, NB } from "../../laws/_comp_prep.mjs";

export function asymVar(P, o = {}) {
  const { margin = 1, mm = true, K = 20, minOcc = 40, mode = "entropy" } = o;
  const { us, w, tb, cnt, V, nUnits } = P, slot = new Int32Array(V).fill(-1), el = [];
  for (let t = 0; t < V; t++) if (cnt[t] >= minOcc) el.push(t);
  if (el.length < 10) return null;
  const top = el.slice().sort((a, b) => cnt[b] - cnt[a] || a - b).slice(0, K), isTop = new Uint8Array(V); top.forEach((t) => { isTop[t] = 1; });
  el.forEach((t, q) => { slot[t] = q; });
  const S = el.length, hL = new Float64Array(S * NB), hR = new Float64Array(S * NB), nI = new Float64Array(S), tL = new Float64Array(S), tR = new Float64Array(S), sL = new Float64Array(S), sR = new Float64Array(S);
  const dsL = mode === "distinct" ? Array.from({ length: S }, () => new Set()) : null, dsR = mode === "distinct" ? Array.from({ length: S }, () => new Set()) : null;
  for (let k = 0; k < nUnits; k++) {
    const s = us[k], e = us[k + 1];
    for (let i = s + margin; i <= e - 1 - margin; i++) {
      const q = slot[w[i]]; if (q < 0) continue;
      hL[q * NB + tb[i - 1]]++; hR[q * NB + tb[i + 1]]++;
      if (mode === "meanbin") { sL[q] += tb[i - 1]; sR[q] += tb[i + 1]; }
      if (mode === "topadj") { tL[q] += isTop[w[i - 1]]; tR[q] += isTop[w[i + 1]]; }
      if (mode === "distinct" && nI[q] < 32) { dsL[q].add(w[i - 1]); dsR[q].add(w[i + 1]); }
      nI[q]++;
    }
  }
  let sum = 0, m = 0;
  for (let q = 0; q < S; q++) {
    if (nI[q] < minOcc || !isTop[el[q]]) continue;
    let d;
    if (mode === "entropy") {
      const a = mm ? entropyMM(hL.subarray(q * NB, (q + 1) * NB)) : entropy(hL.subarray(q * NB, (q + 1) * NB))[0], b = mm ? entropyMM(hR.subarray(q * NB, (q + 1) * NB)) : entropy(hR.subarray(q * NB, (q + 1) * NB))[0];
      if (!(a + b > 0)) continue; d = (b - a) / (b + a);
    } else if (mode === "meanbin") { const a = sL[q] / nI[q], b = sR[q] / nI[q]; if (!(a + b > 0)) continue; d = (b - a) / (b + a); }
    else if (mode === "distinct") { const a = dsL[q].size, b = dsR[q].size; d = (b - a) / (b + a); }
    else if (mode === "topadj") d = (tR[q] - tL[q]) / nI[q];
    else throw new Error("mode " + mode);
    sum += d; m++;
  }
  return m >= 10 ? sum / m : null;
}
export function edgeGrad(P) {
  const { us, tb, nUnits } = P; let s = 0, n = 0;
  for (let k = 0; k < nUnits; k++) { const a = us[k], e = us[k + 1]; if (e - a < 6) continue; s += (tb[e - 1] + tb[e - 2]) / 2 - (tb[a] + tb[a + 1]) / 2; n++; }
  return n >= 20 ? s / n : null;
}
export function posSlope(P) {
  const { us, tb, nUnits } = P; let n = 0, sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (let k = 0; k < nUnits; k++) { const a = us[k], e = us[k + 1], L = e - a; if (L < 4) continue; for (let i = a; i < e; i++) { const x = (i - a) / (L - 1), y = tb[i]; n++; sx += x; sy += y; sxy += x * y; sxx += x * x; } }
  if (n < 200) return null; const vx = sxx - (sx * sx) / n; return vx > 0 ? (sxy - (sx * sy) / n) / vx : null;
}
/** per-type asymmetries of the K commonest types in rank order (the terms averaged by asymVar, entropy mode, Miller-Madow): array of length K with null for types that do not qualify (>= 40 interior occurrences). */
export function asymTypes(P, o = {}) {
  const { K = 20, minOcc = 40 } = o, { us, w, tb, cnt, V, nUnits } = P, slot = new Int32Array(V).fill(-1), el = [];
  for (let t = 0; t < V; t++) if (cnt[t] >= minOcc) el.push(t);
  const top = el.slice().sort((a, b) => cnt[b] - cnt[a] || a - b).slice(0, K); top.forEach((t, q) => { slot[t] = q; });
  const hL = new Float64Array(K * NB), hR = new Float64Array(K * NB), nI = new Float64Array(K);
  for (let k = 0; k < nUnits; k++) { const s = us[k], e = us[k + 1]; for (let i = s + 1; i < e - 1; i++) { const q = slot[w[i]]; if (q < 0) continue; hL[q * NB + tb[i - 1]]++; hR[q * NB + tb[i + 1]]++; nI[q]++; } }
  return Array.from({ length: K }, (_, q) => { if (q >= top.length || nI[q] < minOcc) return null; const a = entropyMM(hL.subarray(q * NB, (q + 1) * NB)), b = entropyMM(hR.subarray(q * NB, (q + 1) * NB)); return a + b > 0 ? (b - a) / (b + a) : null; });
}
