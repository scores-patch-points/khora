// laws/_burst_units.mjs — discourse-level statistics: unit-to-unit persistence, topic drift, and the DFA (Hurst-type) exponent of the word-rank series.
// PERSISTENCE / DRIFT. Content set of a unit = its distinct types with within-view mid-rank > 100 and count >= 2 (a fixed RANK cutoff; a type that occurs once cannot persist).
//   Raw Jaccard of adjacent units is a function of unit length and of the autocorrelation of unit length (long units sit next to long units), so every near pair (u, u+lag) is paired with a
//   FAR partner v: a unit of the same content-size class as u+lag (size 1..14, 15+), at distance > 64 units from u, chosen by a fixed integer hash of (u, lag). The lift is
//   ln( mean J(u, u+lag) / mean J(u, v) ) over the pairs where both exist; a law-free text has lift ~ 0 at every lag, whatever its unit-length law and length autocorrelation.
export const CONTENT_CUT = 100, LAGS_U = [1, 2, 4, 8, 16, 32], FAR = 64, MIN_PAIRS = 30, NCLS = 15;
const SCALES = [16, 32, 64, 128, 256, 512, 1024];
function olsSlope(x, y) { const n = x.length, xm = x.reduce((s, v) => s + v, 0) / n, ym = y.reduce((s, v) => s + v, 0) / n; let a = 0, b = 0; for (let i = 0; i < n; i++) { a += (x[i] - xm) * (y[i] - ym); b += (x[i] - xm) ** 2; } return a / b; }

export function jaccardLifts(P) {
  const { T, V, U, cnt, mid, unitStart } = P;
  const co = new Int32Array(U + 1), cs = new Int32Array(T.length), seen = new Int32Array(V);
  let q = 0;
  for (let u = 0; u < U; u++) {
    co[u] = q;
    for (let p = unitStart[u], e = unitStart[u + 1]; p < e; p++) { const t = T[p]; if (cnt[t] >= 2 && mid[t] > CONTENT_CUT && seen[t] !== u + 1) { seen[t] = u + 1; cs[q++] = t; } }
  }
  co[U] = q;
  const cls = new Int8Array(U), members = Array.from({ length: NCLS + 1 }, () => []);
  for (let u = 0; u < U; u++) { const s = co[u + 1] - co[u]; cls[u] = s ? Math.min(s, NCLS) : 0; if (s) members[cls[u]].push(u); }
  const mark = new Int32Array(V), sJ = new Float64Array(LAGS_U.length), sB = new Float64Array(LAGS_U.length), nP = new Float64Array(LAGS_U.length);
  const hitsOf = (v, stamp) => { let h = 0; for (let k = co[v], e = co[v + 1]; k < e; k++) if (mark[cs[k]] === stamp) h++; return h; };
  for (let u = 0; u < U; u++) {
    const sa = co[u + 1] - co[u]; if (!sa) continue;
    for (let k = co[u], e = co[u + 1]; k < e; k++) mark[cs[k]] = u + 1;
    for (let li = 0; li < LAGS_U.length; li++) {
      const w = u + LAGS_U[li]; if (w >= U || !cls[w]) continue;
      const L = members[cls[w]]; if (L.length < 2) continue;
      const i0 = ((Math.imul(u + 1, 0x9e3779b1) ^ Math.imul(LAGS_U[li], 0x85ebca6b)) >>> 0) % L.length;
      let v = -1;
      for (let k = 0; k < 8; k++) { const c = L[(i0 + k) % L.length]; if (Math.abs(c - u) > FAR) { v = c; break; } }
      if (v < 0) continue;
      const sw = co[w + 1] - co[w], sv = co[v + 1] - co[v], hw = hitsOf(w, u + 1), hv = hitsOf(v, u + 1);
      sJ[li] += hw / (sa + sw - hw); sB[li] += hv / (sa + sv - hv); nP[li]++;
    }
  }
  return LAGS_U.map((lag, li) => ({ lag, pairs: nP[li], J: nP[li] ? sJ[li] / nP[li] : null, Jfar: nP[li] ? sB[li] / nP[li] : null, lift: nP[li] >= MIN_PAIRS && sJ[li] > 0 && sB[li] > 0 ? Math.log(sJ[li] / sB[li]) : null }));
}
/** DFA-1 exponent of x_i = ln mid-rank of token i's type: profile of the centred series, non-overlapping windows of s tokens, linear detrend, F(s) = rms residual, slope of ln F on ln s. */
export function dfaExponent(P) {
  const { T, N, mid } = P, x = new Float64Array(N); let m = 0;
  for (let i = 0; i < N; i++) { x[i] = Math.log(mid[T[i]]); m += x[i]; }
  m /= N;
  const Y = new Float64Array(N); let c = 0;
  for (let i = 0; i < N; i++) { c += x[i] - m; Y[i] = c; }
  const lx = [], ly = [];
  for (const s of SCALES) {
    const nw = Math.floor(N / s); if (nw < 8) continue;
    const tm = (s - 1) / 2, Stt = (s * (s * s - 1)) / 12; let acc = 0;
    for (let w = 0; w < nw; w++) {
      const a = w * s, y0 = Y[a]; let sy = 0, sky = 0, syy = 0;
      for (let k = 0; k < s; k++) { const y = Y[a + k] - y0; sy += y; sky += k * y; syy += y * y; }
      const Sty = sky - tm * sy, ssr = syy - (sy * sy) / s - (Sty * Sty) / Stt;
      acc += Math.max(ssr, 0) / s;
    }
    if (acc > 0) { lx.push(Math.log(s)); ly.push(0.5 * Math.log(acc / nw)); }
  }
  return lx.length >= 4 ? olsSlope(lx, ly) : null;
}
export function unitStats(P) {
  const out = { persist: null, driftSlope: null, driftTail: null, hurst: dfaExponent(P) };
  if (P.U >= 130) {
    const L = jaccardLifts(P), lifts = L.map((r) => r.lift);
    out.persist = lifts[0]; out.driftTail = lifts[LAGS_U.length - 1];
    if (lifts.every((v) => v !== null)) out.driftSlope = olsSlope(LAGS_U.map(Math.log), lifts);
  }
  return out;
}
