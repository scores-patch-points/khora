// laws/_burst_kernel.mjs — the REPEAT KERNEL: P(type of token i already occurred within the previous d tokens of the same document), d = 1,2,4,...,128, against its exact chance value.
// Observed: one pass; gap to the previous occurrence of the same type inside the same document (the document's own first token has window 0), histogram of gaps 1..128.
// Chance (exact, no simulation): for a token whose type has c occurrences in the view, under random placement of the view's tokens the other c-1 occurrences are uniform over the other N-1 positions,
//   so P(none in a window of w positions) = C(N-1-w, c-1) / C(N-1, c-1) = G(N-w) G(N-c+1) / (G(N-w-c+1) G(N)) (G = Gamma). Averaged over the type law c/N and over the token's in-document offset
//   j (window = min(d, j)), this is the expected hit count E(d) of the token-global null, which makes ln L(d) ~ 0 for every d in a law-free text.
export const LAGS = [1, 2, 4, 8, 16, 32, 64, 128];
const lgam = (x) => { let s = 0; while (x < 10) { s -= Math.log(x); x += 1; } const y = 1 / (x * x); return s + (x - 0.5) * Math.log(x) - x + 0.9189385332046727 + (1 / 12 - y * (1 / 360 - y / 1260)) / x; };
/** orthogonal quadratic fit of y on x: returns {a, b, c} with y ~ a + b u + c (u^2 - mean u^2), u = x - mean x; b = slope, c = quadratic (curvature) coefficient. */
export function quadFit(x, y) {
  const n = x.length, xm = x.reduce((s, v) => s + v, 0) / n, u = x.map((v) => v - xm), u2m = u.reduce((s, v) => s + v * v, 0) / n, q = u.map((v) => v * v - u2m);
  let suy = 0, suu = 0, sqy = 0, sqq = 0, sy = 0;
  for (let i = 0; i < n; i++) { suy += u[i] * y[i]; suu += u[i] * u[i]; sqy += q[i] * y[i]; sqq += q[i] * q[i]; sy += y[i]; }
  return { a: sy / n, b: suy / suu, c: sqq > 0 ? sqy / sqq : 0 };
}
export function kernelDetail(P) {
  const { T, N, V, cnt, unitStart, docOf, U } = P, DMAX = 128;
  const last = new Int32Array(V).fill(-1), hist = new Float64Array(DMAX + 1), offH = new Float64Array(DMAX + 1);
  let docStart = 0;
  for (let u = 0; u < U; u++) {
    if (u === 0 || docOf[u] !== docOf[u - 1]) docStart = unitStart[u];
    for (let p = unitStart[u], e = unitStart[u + 1]; p < e; p++) {
      const t = T[p], l = last[t], j = p - docStart;
      offH[j > DMAX ? DMAX : j]++;
      if (l >= docStart) { const g = p - l; if (g <= DMAX) hist[g]++; }
      last[t] = p;
    }
  }
  const cc = new Map(); for (let t = 0; t < V; t++) cc.set(cnt[t], (cc.get(cnt[t]) || 0) + 1);
  const lgN = lgam(N), lgW = new Float64Array(DMAX + 1), G = new Float64Array(DMAX + 1);
  for (let w = 0; w <= DMAX; w++) lgW[w] = lgam(N - w);
  for (const [c, m] of cc) {
    if (c < 2) continue;
    const base = lgam(N - c + 1) - lgN;
    for (let w = 1; w <= DMAX; w++) { const pn = N - w - c + 1 >= 1 ? Math.exp(lgW[w] - lgam(N - w - c + 1) + base) : 0; G[w] += (m * c / N) * (1 - pn); }
  }
  const out = [];
  let hits = 0, gi = 1;
  for (const d of LAGS) {
    while (gi <= d) hits += hist[gi++];
    let E = 0; for (let j = 0; j <= DMAX; j++) E += offH[j] * G[j < d ? j : d];
    out.push({ d, hits, expected: E, lift: Math.log((hits + 0.5) / (E + 0.5)) });
  }
  return out;
}
export function kernelStats(P) {
  const k = kernelDetail(P), x = LAGS.map(Math.log), y = k.map((r) => r.lift), f = quadFit(x, y);
  return { repAdj: y[0], kerSlope: f.b, kerCurv: f.c, kerFar: y[LAGS.length - 1] };
}
