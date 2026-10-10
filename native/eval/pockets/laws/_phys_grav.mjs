// laws/_phys_grav.mjs — GRAVITY-LAW statistics of the "phys" family: gravAlpha, gravBeta, gravAlphaSd. See laws/phys.mjs.
// Bodies = the K = 100 commonest types of the half. The 8 disjoint CHUNKS are 8 evenly spaced blocks of whole units of at most ~6,000 tokens each (sampleBlocks: chunk size does not grow with the half, so
// the dispersion of alpha across chunks has the same sampling noise in every half of >= 48,000 tokens; smaller halves use blocks of N / 8). For each chunk c:
//  1. SELECT the attracted pairs from the OTHER 7 chunks only: directed pairs (a, b) of bodies whose count at lags 1-2 exceeds the independent expectation (expected count >= 1), ranked by the Poisson z
//     (O - E) / sqrt(E); the top 10% are "attracted pairs". Selection never sees chunk c, so the chunk's counts for these pairs are an unbiased test sample (no winner's-curse noise floor).
//  2. MEASURE in chunk c, at the lags 1, 2, 3, 4, 6, 8, 12, 16 (same document), the lift L = observed / expected of the attracted pairs, expected = (positions with a valid partner at that lag) * p_a * p_b
//     with the CHUNK'S own type frequencies; pairs are put in 3 groups of equal size by the product of their half-wide masses (counts) M_g.
//  3. FIT ln L = k - alpha * ln(lag) + beta * ln(M_g) by OLS over the (up to 24) cells with an observed count. alpha = distance exponent of the attraction of attracted pairs, beta = mass exponent
//     (Newton's m_a m_b law gives a lift independent of the masses: beta = 0; the report found the pull per neighbour weaker for frequent bodies).
// Why this and not the lift of all pairs: aggregated over all pairs the lift is CONSERVED (the shares of the partners sum to 1), so alpha and beta of an aggregate are arbitrary in sign; the first
// version of this module did exactly that and gave alpha < 0 in the planted markov and frames worlds. Selection out of chunk is floor-free: under a token-global shuffle the selected pairs are random,
// L = 1 at every lag and alpha = beta = 0 up to noise.
import { mean, sampleBlocks } from "./_phys_prep.mjs";

const K = 100, NCH = 8, G = 3, MIN_TOKENS = 8000, MIN_CELLS = 12, MIN_CHUNKS = 6, Q = 0.1, MIN_SEL = 30, DL = [1, 2, 3, 4, 6, 8, 12, 16], NL = DL.length;
const LN_DL = DL.map(Math.log);

/** y ~ 1 + x1 + x2 by Cramer's rule on the normal equations; null if singular */
function ols3(rows) {
  let n = 0, s1 = 0, s2 = 0, s11 = 0, s12 = 0, s22 = 0, sy = 0, s1y = 0, s2y = 0;
  for (const [x1, x2, y] of rows) { n++; s1 += x1; s2 += x2; s11 += x1 * x1; s12 += x1 * x2; s22 += x2 * x2; sy += y; s1y += x1 * y; s2y += x2 * y; }
  const A = [[n, s1, s2], [s1, s11, s12], [s2, s12, s22]], B = [sy, s1y, s2y];
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A), vx1 = s11 - (s1 * s1) / n, vx2 = s22 - (s2 * s2) / n;
  // the three mass groups must really differ in mass (spread of ln M_g >= 0.2 on average), else beta is a ratio of two near-zero numbers
  if (!(vx1 > 1e-9) || !(vx2 / n > 0.01) || !(Math.abs(D) > 1e-12 * (1 + Math.abs(n * s11 * s22)))) return null;
  const col = (c) => A.map((r, i) => r.map((v, j) => (j === c ? B[i] : v)));
  return [det(col(0)) / D, det(col(1)) / D, det(col(2)) / D];
}

/** number of anchor positions i in [cs, ce) whose partner i + l lies in [cs, ce) and in the same document, for l = 0..16 */
function validCounts(P, cs, ce) {
  const valid = new Float64Array(17);
  for (let i = cs; i < ce;) { let e = i + 1; while (e < ce && P.doc[e] === P.doc[i]) e++; const D = e - i; for (let l = 1; l <= 16; l++) if (D > l) valid[l] += D - l; i = e; }
  return valid;
}

export function gravStats(P) {
  const res = { gravAlpha: null, gravBeta: null, gravAlphaSd: null };
  if (P.N < MIN_TOKENS || P.V < 50) return res;
  const tk = new Int16Array(P.N); for (let i = 0; i < P.N; i++) { const r = P.rank[P.tid[i]]; tk[i] = r < K ? r : -1; }
  const mG = new Float64Array(K); for (let a = 0; a < K && a < P.V; a++) mG[a] = P.cnt[P.byRank[a]];
  // the 8 chunks are the size-equalised blocks (8 evenly spaced blocks of whole units, at most ~6,000 tokens each; see sampleBlocks): chunk size does not grow with the half
  const ch = sampleBlocks(P);
  if (ch.length < MIN_CHUNKS) return res;
  // pass 1: per-chunk counts of the bodies and of directed pairs at lags 1-2
  const C12 = [], nA = [], V12 = [], valid = []; const G12 = new Float64Array(K * K); let V12G = 0;
  for (const { cs, ce } of ch) {
    const c12 = new Float64Array(K * K), na = new Float64Array(K), v = validCounts(P, cs, ce);
    for (let i = cs; i < ce; i++) {
      const a = tk[i]; if (a < 0) continue;
      na[a]++; const d = P.doc[i];
      for (let l = 1; l <= 2; l++) { const j = i + l; if (j >= ce || P.doc[j] !== d) break; const b = tk[j]; if (b >= 0) c12[a * K + b]++; }
    }
    for (let q = 0; q < K * K; q++) G12[q] += c12[q];
    C12.push(c12); nA.push(na); valid.push(v); V12.push(v[1] + v[2]); V12G += v[1] + v[2];
  }
  const pG = Float64Array.from(mG, (x) => x / P.N), al = [], be = [];
  for (let c = 0; c < ch.length; c++) {
    const { cs, ce } = ch[c], Nc = ce - cs, na = nA[c], Vtr = V12G - V12[c];
    // 1. selection from the other chunks
    const el = [];
    for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) {
      const E = Vtr * pG[a] * pG[b]; if (E < 1) continue;
      el.push([(G12[a * K + b] - C12[c][a * K + b] - E) / Math.sqrt(E), a * K + b]);
    }
    if (el.length < MIN_SEL * 2) continue;
    el.sort((x, y) => y[0] - x[0] || x[1] - y[1]);
    const nsel = Math.max(MIN_SEL, Math.ceil(Q * el.length)), sel = el.slice(0, nsel).map((e) => e[1]);
    // 2. groups by half-wide mass product (terciles of the selected pairs)
    const prod = sel.map((k) => mG[Math.floor(k / K)] * mG[k % K]), sp = Float64Array.from(prod).sort(), cut = [sp[Math.floor(sp.length / 3)], sp[Math.floor((2 * sp.length) / 3)]];
    const grp = new Int8Array(K * K).fill(-1), sumM = new Float64Array(G), cnt = new Float64Array(G), sumE = new Float64Array(G);
    sel.forEach((k, q) => { const g = prod[q] >= cut[1] ? 2 : prod[q] >= cut[0] ? 1 : 0; grp[k] = g; sumM[g] += prod[q]; cnt[g]++; sumE[g] += (na[Math.floor(k / K)] * na[k % K]) / (Nc * Nc); });
    const O = new Float64Array(G * NL);
    for (let i = cs; i < ce; i++) {
      const a = tk[i]; if (a < 0) continue;
      const d = P.doc[i];
      for (let q = 0; q < NL; q++) { const j = i + DL[q]; if (j >= ce || P.doc[j] !== d) break; const b = tk[j]; if (b >= 0) { const g = grp[a * K + b]; if (g >= 0) O[g * NL + q]++; } }
    }
    // 3. fit
    const rows = [];
    for (let g = 0; g < G; g++) {
      if (cnt[g] === 0) continue;
      const lnM = Math.log(sumM[g] / cnt[g]);
      for (let q = 0; q < NL; q++) { const E = valid[c][DL[q]] * sumE[g], o = O[g * NL + q]; if (o > 0 && E > 0) rows.push([LN_DL[q], lnM, Math.log(o / E)]); }
    }
    if (rows.length < MIN_CELLS) continue;
    const f = ols3(rows); if (f) { al.push(-f[1]); be.push(f[2]); }
  }
  if (al.length < MIN_CHUNKS) return res;
  res.gravAlpha = mean(al); res.gravBeta = mean(be);
  const m = res.gravAlpha; res.gravAlphaSd = Math.sqrt(al.reduce((s, x) => s + (x - m) ** 2, 0) / (al.length - 1));
  return res;
}
