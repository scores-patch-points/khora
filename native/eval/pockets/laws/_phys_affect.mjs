// laws/_phys_affect.mjs — AFFECT statistics of the "phys" family: affect and affectAsym. See laws/phys.mjs.
// RARE tokens: the rarest types, taken in order of ascending count, until they hold 10% of the half's tokens; inside the last count level the types are chosen by an even deterministic stride
// over first-occurrence order (so the class is neither the early nor the late hapaxes). RANK BIN of a type = one of 7 EQUAL-MASS bins of the frequency-rank order (the commonest types holding the first 1/7 of the tokens, ...), a tie group of equal counts sitting at the middle of its token mass.
// For every rare token the tokens at lags 1 and 2 on each side INSIDE THE SAME UNIT are collected; affect = Jensen-Shannon DISTANCE (square root of the divergence in bits) between their rank-bin histogram and the histogram of all tokens;
// affectAsym = (J_right - J_left) / (J_right + J_left).

const NBIN = 7, LAGS = 2, TARGET = 0.1, MIN_TOKENS = 4000, MIN_RARE = 200, MIN_SIDE = 200;

function jsd(p, q) {
  let sp = 0, sq = 0; for (let k = 0; k < NBIN; k++) { sp += p[k]; sq += q[k]; }
  if (!(sp > 0) || !(sq > 0)) return null;
  let d = 0;
  for (let k = 0; k < NBIN; k++) { const a = p[k] / sp, b = q[k] / sq, m = (a + b) / 2; if (a > 0) d += 0.5 * a * Math.log2(a / m); if (b > 0) d += 0.5 * b * Math.log2(b / m); }
  return d;
}

export function affectStats(P) {
  const res = { affect: null, affectAsym: null };
  if (P.N < MIN_TOKENS) return res;
  const order = new Int32Array(P.V); for (let t = 0; t < P.V; t++) order[t] = t;
  order.sort((a, b) => P.cnt[a] - P.cnt[b] || a - b);
  const rare = new Uint8Array(P.V), want = TARGET * P.N; let mass = 0, q = 0;
  while (q < P.V && mass < want) {
    let r = q; const c = P.cnt[order[q]]; while (r < P.V && P.cnt[order[r]] === c) r++;
    const levelMass = c * (r - q);
    if (mass + levelMass <= want) { for (let k = q; k < r; k++) rare[order[k]] = 1; mass += levelMass; }
    else { // partial level: every k-th type by even stride until the target mass is met
      const frac = (want - mass) / levelMass; let acc = 0;
      for (let k = q; k < r; k++) { acc += frac; if (acc >= 1) { acc -= 1; rare[order[k]] = 1; mass += c; } }
      mass = want;
    }
    q = r;
  }
  // EQUAL-MASS RANK BINS: types in rank order, a tie group of equal counts is placed at the middle of its cumulative token mass, and its bin is floor(NBIN * that mass position / N):
  // bin 0 holds the commonest ~1/7 of all tokens, bin 6 the rarest ~1/7. (The first version used 12 octaves of rank: its tail bins were almost empty, the divergence was chi-square with few
  // effective degrees of freedom and a skewed null; equal-mass bins are all well populated.)
  const bin = new Int8Array(P.V);
  for (let r = 0, acc = 0; r < P.V;) { let e = r; const c = P.cnt[P.byRank[r]]; while (e + 1 < P.V && P.cnt[P.byRank[e + 1]] === c) e++; const gm = c * (e - r + 1), b = Math.min(NBIN - 1, Math.floor((NBIN * (acc + gm / 2)) / P.N)); for (let k = r; k <= e; k++) bin[P.byRank[k]] = b; acc += gm; r = e + 1; }
  const base = new Float64Array(NBIN), R = new Float64Array(NBIN), L = new Float64Array(NBIN); let nRare = 0;
  for (let i = 0; i < P.N; i++) base[bin[P.tid[i]]]++;
  for (let u = 0; u < P.nU; u++) {
    const s = P.us[u], e = P.us[u + 1];
    for (let i = s; i < e; i++) {
      if (!rare[P.tid[i]]) continue;
      nRare++;
      for (let l = 1; l <= LAGS; l++) { if (i + l < e) R[bin[P.tid[i + l]]]++; if (i - l >= s) L[bin[P.tid[i - l]]]++; }
    }
  }
  let nR = 0, nL = 0; for (let k = 0; k < NBIN; k++) { nR += R[k]; nL += L[k]; }
  if (nRare < MIN_RARE || nR < MIN_SIDE || nL < MIN_SIDE) return res;
  const both = new Float64Array(NBIN); for (let k = 0; k < NBIN; k++) both[k] = R[k] + L[k];
  const jb = jsd(both, base); res.affect = jb == null ? null : Math.sqrt(jb);   // Jensen-Shannon DISTANCE (sqrt of the divergence): the plug-in divergence is chi-square-like and right-skewed under the null, its square root is near-symmetric
  const jr = jsd(R, base), jl = jsd(L, base);
  if (jr != null && jl != null && jr + jl > 1e-9) res.affectAsym = (jr - jl) / (jr + jl);
  return res;
}
