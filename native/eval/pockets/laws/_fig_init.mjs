// laws/_fig_init.mjs — UNIT-INITIAL and CONVERGENCE statistics of the "fig" family (null: within-unit): initEnrich, initSplit, initFollow, converge.
// A figure token's figure status does not change under a within-unit shuffle (it depends on unit distances only), so the null of the initial-slot statistics is exact: a figure token is initial with probability 1/len(unit).

const RARE_M = 100;   // initFollow: follower diversity is rarefied to 100 events

/** expected number of distinct types in a random draw of m of the N events (without replacement); counts of the types are in `hist` (count -> number of types with that count) */
function rarefied(hist, N, m) {
  let e = 0;
  for (const [n, h] of hist) {
    let prod = 1;
    if (N - n < m) prod = 0; else for (let j = 0; j < m; j++) prod *= (N - n - j) / (N - j);
    e += h * (1 - prod);
  }
  return e;
}

export function initial(P) {
  const { N, T, tok, uOf, uStart, fig } = P;
  const out = { initEnrich: null, initSplit: null, initFollow: null, converge: null };
  if (N < 2000) return out;
  const nf = new Int32Array(T), ni = new Int32Array(T), es = new Float64Array(T), ev = new Float64Array(T), nfAll = new Int32Array(T), follow = new Int32Array(T);
  let nInit = 0, E = 0, nEv = 0;
  for (let i = 0; i < N; i++) {
    if (!fig[i]) continue;
    const t = tok[i], u = uOf[i], L = uStart[u + 1] - uStart[u];
    nfAll[t]++;
    if (L < 2) continue;                                     // a one-token unit has no position
    nf[t]++; es[t] += 1 / L; ev[t] += (1 / L) * (1 - 1 / L); E += 1 / L;
    if (i === uStart[u]) { ni[t]++; nInit++; follow[tok[i + 1]]++; nEv++; }
  }
  if (nInit >= 20 && E > 0) out.initEnrich = Math.log2(nInit / E);   // 0 when figure tokens are initial exactly as often as chance (1/len) predicts
  let k = 0, ssq = 0;
  for (let t = 0; t < T; t++) if (nf[t] >= 8) { const d = ni[t] - es[t]; ssq += (d * d - ev[t]) / (nf[t] * nf[t]); k++; }   // (observed - chance)^2 minus the chance variance of a binomial count: unbiased for the squared deviation of the true initial propensity
  if (k >= 20) out.initSplit = ssq / k;                                // mean over recurring types of the excess squared deviation of the initial share from its chance share (0 = no position-boundness)
  if (nEv >= 150) { const hist = new Map(); for (let t = 0; t < T; t++) if (follow[t]) hist.set(follow[t], (hist.get(follow[t]) || 0) + 1); out.initFollow = rarefied(hist, nEv, RARE_M) / RARE_M; }
  // converge: for every type with >= 12 figure mentions, distinct neighbour types (left and right, a unit edge counts as one neighbour) among its mentions 1-4 (8 slots) minus those among its mentions 9-12 (8 slots), over 8
  const slot = new Int32Array(T).fill(-1); let K = 0;
  for (let t = 0; t < T; t++) if (nfAll[t] >= 12) slot[t] = K++;
  if (K >= 20) {
    const nb = new Int32Array(K * 16), seen = new Int32Array(K), EDGE = T;
    for (let i = 0; i < N; i++) {
      if (!fig[i]) continue;
      const s = slot[tok[i]]; if (s < 0) continue;
      const kk = ++seen[s];
      if (kk > 12 || (kk > 4 && kk < 9)) continue;
      const u = uOf[i], off = s * 16 + (kk <= 4 ? (kk - 1) * 2 : 8 + (kk - 9) * 2);
      nb[off] = i > uStart[u] ? tok[i - 1] : EDGE; nb[off + 1] = i + 1 < uStart[u + 1] ? tok[i + 1] : EDGE;
    }
    const distinct = (a, o) => { let d = 0; for (let x = 0; x < 8; x++) { let dup = false; for (let y = 0; y < x; y++) if (a[o + y] === a[o + x]) { dup = true; break; } if (!dup) d++; } return d; };
    let sum = 0;
    for (let s = 0; s < K; s++) sum += (distinct(nb, s * 16) - distinct(nb, s * 16 + 8)) / 8;
    out.converge = sum / K;
  }
  return out;
}
