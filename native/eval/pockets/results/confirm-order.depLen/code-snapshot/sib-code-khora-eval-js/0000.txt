// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══  eval/barker/profile-stats.mjs  (Barker, the profile: numerics)
// Written BEFORE the first run. Pure arithmetic, no fs, no network, no model, no EO vocabulary. This file implements,
// verbatim, the definitions stated in the pre-registration header of eval/barker/profiles.mjs (the claims, the
// definitions of every cell, the nulls, the power checks and the pass rules live there and are not restated here).
// What THIS file claims, and how it can fail:
//   S1 exactness: hurwitzZeta, the discrete power-law maximum likelihood and the exact binomial tail agree with
//      independent closed forms / brute force to 1e-9 (tests/barker-profiles.test.js).
//   S2 recovery: discretePowerLawMLE recovers a planted discrete power law (alpha 2.0, 5,000 draws) within 0.08;
//      dfaHurst reads 0.5 +/- 0.06 on an exchangeable (shuffled) series and >= 0.6 on a planted persistent series of
//      the same length (the control built to fail and the power check of the same instrument).
//   S3 strahler: the order of a planted complete binary tree of height h is h; a path has order 1.
// Typed numbers here (PROVISIONAL, BARKER 3.8): minimum tail types for the power-law fit = 50 (Clauset et al. style
// floor); DFA smallest scale 16 and largest scale L/8; Euler-Maclaurin cut K=20 terms.
// ═══ END PRE-REGISTRATION ═══

// ── basics ────────────────────────────────────────────────────────────────────
export const sum = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
export const mean = (a) => (a.length ? sum(a) / a.length : NaN);
export const sd = (a) => {
  if (a.length < 2) return NaN;
  const m = mean(a); let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - m) ** 2;
  return Math.sqrt(s / (a.length - 1));
};
/** q-quantile of an UNSORTED array (linear interpolation, type 7). */
export function quantile(arr, q) {
  const a = Array.from(arr).filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return NaN;
  const h = (a.length - 1) * q; const lo = Math.floor(h); const hi = Math.ceil(h);
  return a[lo] + (a[hi] - a[lo]) * (h - lo);
}
export const percentileCI = (vals, lo = 0.025, hi = 0.975) => {
  const v = Array.from(vals).filter((x) => Number.isFinite(x));
  return v.length >= 20 ? [quantile(v, lo), quantile(v, hi)] : null;
};

/** Shannon entropy in bits of a list of non-negative counts (plug-in). */
export function entropyBits(counts) {
  let n = 0; for (const c of counts) n += c;
  if (n <= 0) return 0;
  let h = 0;
  for (const c of counts) if (c > 0) h -= (c / n) * Math.log2(c / n);
  return h;
}
/** Plug-in entropy plus the Miller-Madow correction (m-1)/(2n) nats, in bits. */
export function millerMadowBits(counts) {
  let n = 0; let m = 0;
  for (const c of counts) { n += c; if (c > 0) m++; }
  if (n <= 0) return 0;
  return entropyBits(counts) + (m - 1) / (2 * n * Math.LN2);
}

/** OLS of y on x: { slope, intercept, r2, n }. */
export function olsFit(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = mean(xs); const my = mean(ys);
  let sxx = 0; let sxy = 0; let syy = 0;
  for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); syy += (ys[i] - my) ** 2; }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy), n };
}

// ── exact binomial tail ───────────────────────────────────────────────────────
export function lgamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let a = c[0]; const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
const logChoose = (n, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
/** P(X >= k | n, p), exact (log-sum-exp). */
export function binomUpperTail(k, n, p = 0.5) {
  if (k <= 0) return 1;
  if (k > n) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const lp = Math.log(p); const lq = Math.log(1 - p);
  const terms = [];
  for (let i = k; i <= n; i++) terms.push(logChoose(n, i) + i * lp + (n - i) * lq);
  const m = Math.max(...terms);
  let s = 0; for (const t of terms) s += Math.exp(t - m);
  return Math.min(1, Math.exp(m) * s);
}

// ── discrete power law (Clauset, Shalizi, Newman 2009) ────────────────────────
/** Hurwitz zeta  sum_{k>=0} (q+k)^-alpha, direct sum of K terms then Euler-Maclaurin (error far below 1e-9). */
export function hurwitzZeta(alpha, q, K = 20) {
  let s = 0;
  for (let k = 0; k < K; k++) s += (q + k) ** -alpha;
  const x = q + K;
  s += x ** (1 - alpha) / (alpha - 1) + 0.5 * x ** -alpha + (alpha * x ** (-alpha - 1)) / 12
    - (alpha * (alpha + 1) * (alpha + 2) * x ** (-alpha - 3)) / 720;
  return s;
}
function mleAlpha(n, sumLn, xmin) {
  const ll = (a) => -a * sumLn - n * Math.log(hurwitzZeta(a, xmin));
  let lo = 1.01; let hi = 6; const gr = (Math.sqrt(5) - 1) / 2;
  let c = hi - gr * (hi - lo); let d = lo + gr * (hi - lo);
  let fc = ll(c); let fd = ll(d);
  for (let it = 0; it < 80; it++) {
    if (fc > fd) { hi = d; d = c; fd = fc; c = hi - gr * (hi - lo); fc = ll(c); }
    else { lo = c; c = d; fc = fd; d = lo + gr * (hi - lo); fd = ll(d); }
  }
  return (lo + hi) / 2;
}
/**
 * Discrete power-law fit of a list of positive integer values (type frequencies). x_min is chosen among the distinct
 * values leaving >= minTail values in the tail by minimising the KS distance. Returns
 * { alpha, xmin, ks, nTail, s } with s = 1/(alpha-1) (the rank-frequency Zipf exponent), or null.
 */
export function discretePowerLawMLE(values, { minTail = 50 } = {}) {
  const x = Array.from(values).filter((v) => v >= 1).sort((a, b) => a - b);
  if (x.length < minTail) return null;
  const distinct = [...new Set(x)];
  let best = null;
  for (const xmin of distinct) {
    const tail = x.filter((v) => v >= xmin);
    if (tail.length < minTail) break;
    let sumLn = 0; for (const v of tail) sumLn += Math.log(v);
    const alpha = mleAlpha(tail.length, sumLn, xmin);
    const z0 = hurwitzZeta(alpha, xmin);
    // KS: empirical vs model CDF at every distinct tail value
    const vals = [...new Set(tail)];
    let idx = 0; let ks = 0;
    for (const v of vals) {
      let le = idx; while (le < tail.length && tail[le] <= v) le++;
      const emp = le / tail.length; idx = le;
      const mod = 1 - hurwitzZeta(alpha, v + 1) / z0;
      ks = Math.max(ks, Math.abs(emp - mod));
    }
    if (!best || ks < best.ks) best = { alpha, xmin, ks, nTail: tail.length, s: 1 / (alpha - 1) };
  }
  return best;
}

// ── sequence statistics ───────────────────────────────────────────────────────
/** Burstiness B=(sigma-mu)/(sigma+mu) of the inter-arrival times of an increasing list of positions; needs >= 5 events. */
export function burstiness(positions) {
  if (positions.length < 5) return null;
  const tau = [];
  for (let i = 1; i < positions.length; i++) tau.push(positions[i] - positions[i - 1]);
  const mu = mean(tau);
  let v = 0; for (const t of tau) v += (t - mu) ** 2;
  const sg = Math.sqrt(v / tau.length);
  return sg + mu === 0 ? null : (sg - mu) / (sg + mu);
}
/**
 * Detrended fluctuation analysis Hurst exponent of a numeric series (profile of the mean-centred series, linear
 * detrend per non-overlapping segment, log-spaced scales 16..L/8 with ratio 2^(1/2)); null if fewer than 5 scales.
 */
export function dfaHurst(series, { minScale = 16, maxDiv = 8 } = {}) {
  const L = series.length;
  const maxScale = Math.floor(L / maxDiv);
  if (maxScale < minScale * 2) return null;
  let mu = 0; for (let i = 0; i < L; i++) mu += series[i]; mu /= L;
  const P1 = new Float64Array(L + 1); const P2 = new Float64Array(L + 1); const P3 = new Float64Array(L + 1);
  let acc = 0;
  for (let g = 0; g < L; g++) {
    acc += series[g] - mu;
    P1[g + 1] = P1[g] + acc; P2[g + 1] = P2[g] + acc * acc; P3[g + 1] = P3[g] + g * acc;
  }
  const xs = []; const ys = [];
  const scales = [];
  for (let s = minScale; s <= maxScale; s = Math.max(s + 1, Math.round(s * Math.SQRT2))) scales.push(s);
  for (const s of scales) {
    const nseg = Math.floor(L / s);
    if (nseg < 4) continue;
    const tbar = (s - 1) / 2; const stt = (s * (s * s - 1)) / 12;
    let tot = 0;
    for (let k = 0; k < nseg; k++) {
      const a = k * s;
      const sx = P1[a + s] - P1[a]; const sxx = P2[a + s] - P2[a];
      const sgx = P3[a + s] - P3[a]; const stx = sgx - a * sx; // sum of t_local * X
      const xbar = sx / s;
      const cov = stx - tbar * sx; // sum (t - tbar) X
      const rss = sxx - s * xbar * xbar - (cov * cov) / stt;
      tot += Math.max(0, rss) / s;
    }
    const F = Math.sqrt(tot / nseg);
    if (F > 0) { xs.push(Math.log(s)); ys.push(Math.log(F)); }
  }
  if (xs.length < 5) return null;
  return olsFit(xs, ys).slope;
}

// ── Strahler / trees ──────────────────────────────────────────────────────────
/** Fit ln N_k = a - k ln(Rb) over the orders with N_k >= minCount; needs >= 3 orders. { rb, r2, orders } | null. */
export function strahlerFit(counts, { minCount = 10 } = {}) {
  const ks = []; const ys = [];
  for (let k = 1; k < counts.length; k++) if (counts[k] >= minCount) { ks.push(k); ys.push(Math.log(counts[k])); }
  if (ks.length < 3) return null;
  const f = olsFit(ks, ys);
  return { rb: Math.exp(-f.slope), r2: f.r2, orders: ks.length };
}
/**
 * Depth of every word (root depth 1) from a 1-based head array (head 0 = root); null if a cycle or a bad head.
 * head: array-like of integers where head[i] is the head id of word i+1.
 */
export function depthsOf(head) {
  const n = head.length;
  const d = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    if (d[i]) continue;
    const path = []; let x = i; let guard = 0;
    while (x >= 0 && d[x] === 0) {
      path.push(x); if (++guard > n + 1) return null;
      const h = head[x];
      if (h < 0 || h > n) return null;
      x = h > 0 ? h - 1 : -1;
    }
    let base = x >= 0 ? d[x] : 0;
    for (let j = path.length - 1; j >= 0; j--) { base += 1; d[path[j]] = base; }
  }
  return d;
}
/** Strahler order of every node of a rooted tree given parent index array (-1 = root) and node mask. */
export function strahlerOrders(parent, depth, mask) {
  const n = parent.length;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => depth[b] - depth[a]);
  const maxOrd = new Int32Array(n); const cntMax = new Int32Array(n); const ord = new Int32Array(n);
  for (const i of idx) {
    if (!mask[i]) continue;
    ord[i] = maxOrd[i] === 0 ? 1 : (cntMax[i] >= 2 ? maxOrd[i] + 1 : maxOrd[i]);
    const p = parent[i];
    if (p >= 0 && mask[p]) {
      if (ord[i] > maxOrd[p]) { maxOrd[p] = ord[i]; cntMax[p] = 1; } else if (ord[i] === maxOrd[p]) cntMax[p] += 1;
    }
  }
  return ord;
}

// ── Fisher-Yates ──────────────────────────────────────────────────────────────
export function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  return arr;
}

// ── character model: order-2 Witten-Bell with 2-fold held-out scoring ─────────
class WittenBell {
  constructor(streams) {
    this.c3 = new Map(); this.c2 = new Map(); this.c1 = new Map();
    this.n3 = new Map(); this.n2 = new Map(); this.N = 0;
    const PAD = "\u0002";
    for (const st of streams) {
      const t = [PAD, PAD, ...st];
      for (let i = 2; i < t.length; i++) {
        const c = t[i]; const k3 = t[i - 2] + t[i - 1]; const k2 = t[i - 1];
        let m3 = this.c3.get(k3); if (!m3) { m3 = new Map(); this.c3.set(k3, m3); }
        m3.set(c, (m3.get(c) ?? 0) + 1); this.n3.set(k3, (this.n3.get(k3) ?? 0) + 1);
        let m2 = this.c2.get(k2); if (!m2) { m2 = new Map(); this.c2.set(k2, m2); }
        m2.set(c, (m2.get(c) ?? 0) + 1); this.n2.set(k2, (this.n2.get(k2) ?? 0) + 1);
        this.c1.set(c, (this.c1.get(c) ?? 0) + 1); this.N += 1;
      }
    }
    this.T1 = this.c1.size; this.V = this.T1 + 1;
  }
  p(c2prev, c1prev, c) {
    const p1 = ((this.c1.get(c) ?? 0) + this.T1 / this.V) / (this.N + this.T1);
    const d2 = this.c2.get(c1prev);
    let p2 = p1;
    if (d2) { const t2 = d2.size; p2 = ((d2.get(c) ?? 0) + t2 * p1) / (this.n2.get(c1prev) + t2); }
    const k3 = c2prev + c1prev; const d3 = this.c3.get(k3);
    if (d3) { const t3 = d3.size; return ((d3.get(c) ?? 0) + t3 * p2) / (this.n3.get(k3) + t3); }
    return p2;
  }
}
/**
 * streams: array of code-point arrays (one per sentence); starts: array of Sets of unit-initial indices (same length).
 * 2-fold by sentence index parity. For every offset o the "initial" set is {b+o}. Positions index<2 are excluded.
 * Returns { gap: {o: bits}, h2: bits per char, nPos, nInit } or null when too small (< 10 streams).
 */
export function boundaryModel(streams, starts, offsets = [-2, -1, 0, 1, 2]) {
  const S = streams.length;
  if (S < 10) return null;
  const sumInit = Object.fromEntries(offsets.map((o) => [o, 0])); const nInit = Object.fromEntries(offsets.map((o) => [o, 0]));
  let tot = 0; let totN = 0;
  const perOffsetOther = Object.fromEntries(offsets.map((o) => [o, 0]));
  for (let fold = 0; fold < 2; fold++) {
    const train = []; for (let k = 0; k < S; k++) if (k % 2 !== fold) train.push(streams[k]);
    const m = new WittenBell(train);
    for (let k = 0; k < S; k++) {
      if (k % 2 !== fold) continue;
      const st = streams[k]; const B = starts[k];
      const PAD = "\u0002";
      const t = [PAD, PAD, ...st];
      const bits = new Float64Array(st.length);
      for (let j = 2; j < st.length; j++) {
        bits[j] = -Math.log2(m.p(t[j], t[j + 1], t[j + 2])); // context = st[j-2], st[j-1]; char = st[j]
        tot += bits[j]; totN += 1;
      }
      for (const o of offsets) {
        const init = new Uint8Array(st.length);
        for (const b of B) { const q = b + o; if (q >= 2 && q < st.length) init[q] = 1; }
        let si = 0; let ni = 0; let so = 0; let no = 0;
        for (let j = 2; j < st.length; j++) { if (init[j]) { si += bits[j]; ni++; } else { so += bits[j]; no++; } }
        sumInit[o] += si; nInit[o] += ni; perOffsetOther[o] += so; nInit[`o${o}`] = (nInit[`o${o}`] ?? 0) + no;
      }
    }
  }
  const gap = {};
  for (const o of offsets) {
    const ni = nInit[o]; const no = nInit[`o${o}`];
    gap[o] = ni && no ? sumInit[o] / ni - perOffsetOther[o] / no : NaN;
  }
  return { gap, h2: totN ? tot / totN : NaN, nPos: totN, nInit: nInit[0] };
}
