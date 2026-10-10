// eval/physics-handles/attraction.mjs — the attraction kernel of a body, shared by gravity.mjs, curvature.mjs and equivalence.mjs.
//
// ATTRACTION OF A BODY b AT RANGE d (the operational definition of "gravity" used throughout):
//   company(b, d, side) = the tokens found at token distance in a dyadic lag bin d on one side of the mentions of b, inside the same document, b itself excluded, each
//   token POSITION used at most once per (bin, side). q = the distribution of that company; pi = the unigram distribution of the corpus.
//   D_b(d) = sum_c (q_c - pi_c)^2   the squared L2 distance of the company from the background = the EXCESS COINCIDENCE: how much likelier two tokens drawn from the
//            neighbourhood of b at range d are to be the same word than two tokens drawn from the corpus. It is estimated UNBIASEDLY at any sample size by
//            [sum_c cnt_c (cnt_c - 1)] / [n (n - 1)] - (2/n) sum_i pi(c_i) + sum_c pi_c^2   (no plug-in saturation: a first version used total variation and
//            saturated at 1 for small samples, which the planted-law check exposed; see LOG.md 17:30).
//   Under a mixture q = (1 - f) pi + f Q (a share f of the company is b's own), D = f^2 ||Q - pi||^2: D is QUADRATIC in the displacement (an "energy"), so its decay
//   exponent is twice that of the force-like amplitude a(d) = sqrt(D(d)) = f(d) ||Q - pi||, which is the quantity called attraction.
//   A_b(d)   = D_b(d) - baseline_b(d), baseline = the mean D of K random placements of b (the same number of mentions per document, uniform distinct positions): the
//              structure of the text that is not about b (phrases that repeat anyway) cancels.
//   ENERGY E_b = sum over bins and sides of A_b(d) * width(d): excess coincidence summed over the 256 neighbouring tokens (units: probability x tokens), unbiased, noisy per body.
// Units of a(d): probability^(1/2)... stated plainly: a(d) is a distance between two distributions of words (dimensionless, in [0, sqrt 2]). Invariant to case (the stream is
// lowercased) and to corpus size (a share); NOT invariant to the tokenizer (a lag is counted in word units). No model, no prior, no gold.

import { mulberry32, shuffleInPlace } from "./lib.mjs";

export const LAG_BINS = Object.freeze([[1, 1], [2, 2], [3, 4], [5, 8], [9, 16], [17, 32], [33, 64], [65, 128]]);
export const NLAG = LAG_BINS.length;
export const LAG_CENTER = LAG_BINS.map(([a, b]) => Math.sqrt(a * b));
export const LAG_WIDTH = LAG_BINS.map(([a, b]) => b - a + 1);
export const SENT_LAGS = Object.freeze([1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64]);

/** Index of a corpus: ids, per-document token arrays, unigram distribution, occurrence lists, sentence index of every token. */
export function buildIndex(docs) {
  const id = new Map(), words = [];
  const toks = [], sentOf = [];
  let N = 0;
  for (const d of docs) {
    const t = [], so = [];
    d.sents.forEach((sent, k) => { for (const w of sent) { let x = id.get(w); if (x === undefined) { x = words.length; id.set(w, x); words.push(w); } t.push(x); so.push(k); } });
    toks.push(Int32Array.from(t)); sentOf.push(Int32Array.from(so)); N += t.length;
  }
  const V = words.length, count = new Int32Array(V);
  for (const t of toks) for (const x of t) count[x] += 1;
  const pi = new Float64Array(V); for (let v = 0; v < V; v++) pi[v] = count[v] / N;
  const occDoc = Array.from({ length: V }, () => []), occPos = Array.from({ length: V }, () => []);
  toks.forEach((t, di) => { for (let p = 0; p < t.length; p++) { occDoc[t[p]].push(di); occPos[t[p]].push(p); } });
  let sumPi2 = 0; for (let v = 0; v < V; v++) sumPi2 += pi[v] * pi[v];
  return { V, id, words, toks, sentOf, count, pi, N, sumPi2, occDoc, occPos, nDocs: docs.length, docLen: toks.map((t) => t.length) };
}

/** Company of a body at the mention positions (doc[], pos[]): D (excess coincidence, unbiased estimator) per (bin, side) = bin*2 + side (side 0 = left, 1 = right), and the sample sizes. */
export function attractionAt(ix, b, docs, poss, acc, seenBuf) {
  const { toks, pi } = ix;
  const D = new Float64Array(2 * NLAG), tot = new Int32Array(2 * NLAG);
  const cnt = acc ?? new Int32Array(ix.V);
  const seen = seenBuf ?? ix.toks.map((t) => new Int32Array(t.length));
  const touched = [];
  let stamp = (ix._stamp = (ix._stamp ?? 0));
  for (let bin = 0; bin < NLAG; bin++) {
    const [lo, hi] = LAG_BINS[bin];
    for (let side = 0; side < 2; side++) {
      stamp += 1;
      let n = 0;
      for (let m = 0; m < poss.length; m++) {
        const di = docs[m], t = toks[di], p = poss[m], len = t.length, sm = seen[di];
        for (let d = lo; d <= hi; d++) {
          const q = side === 0 ? p - d : p + d;
          if (q < 0 || q >= len) continue;
          if (sm[q] === stamp) continue;
          sm[q] = stamp;
          const c = t[q];
          if (c === b) continue;
          if (cnt[c]++ === 0) touched.push(c);
          n++;
        }
      }
      const slot = bin * 2 + side;
      tot[slot] = n;
      if (n >= 2) {
        let coll = 0, cross = 0;
        for (const c of touched) { const k = cnt[c]; coll += k * (k - 1); cross += k * pi[c]; cnt[c] = 0; }
        D[slot] = coll / (n * (n - 1)) - (2 / n) * cross + ix.sumPi2;
      } else { for (const c of touched) cnt[c] = 0; D[slot] = NaN; }
      touched.length = 0;
    }
  }
  ix._stamp = stamp;
  return { D, tot };
}

/** Random placement of a body with the same number of mentions in each document (uniform distinct positions inside the document). */
export function randomPlacement(ix, docs, rnd) {
  const byDoc = new Map(); for (const d of docs) byDoc.set(d, (byDoc.get(d) ?? 0) + 1);
  const D = [], P = [];
  for (const [d, n] of byDoc) {
    const len = ix.docLen[d];
    if (n >= len) { for (let p = 0; p < len; p++) { D.push(d); P.push(p); } continue; }
    if (n * 4 > len) { const a = shuffleInPlace(Array.from({ length: len }, (_, i) => i), rnd); for (let i = 0; i < n; i++) { D.push(d); P.push(a[i]); } continue; }
    const seen = new Set();
    while (seen.size < n) seen.add(Math.floor(rnd() * len));
    for (const p of seen) { D.push(d); P.push(p); }
  }
  return { docs: D, poss: P };
}

/** A_b for the given mention positions; K random-placement draws of which the first `kBase` give the baseline and the rest give null A (for the band). */
export function attractionExcess(ix, b, docs, poss, { kBase = 5, kBand = 5, seed = 1, acc = null, seen = null } = {}) {
  const real = attractionAt(ix, b, docs, poss, acc, seen);
  const rnd = mulberry32(seed);
  const base = new Float64Array(2 * NLAG), nb = new Float64Array(2 * NLAG), nulls = [];
  for (let k = 0; k < kBase + kBand; k++) {
    const pl = randomPlacement(ix, docs, rnd), r = attractionAt(ix, b, pl.docs, pl.poss, acc, seen);
    if (k < kBase) { for (let s = 0; s < 2 * NLAG; s++) if (Number.isFinite(r.D[s])) { base[s] += r.D[s]; nb[s] += 1; } }
    else nulls.push(r);
  }
  const A = new Float64Array(2 * NLAG), Anull = nulls.map(() => new Float64Array(2 * NLAG));
  for (let s = 0; s < 2 * NLAG; s++) {
    if (!nb[s] || !Number.isFinite(real.D[s])) { A[s] = NaN; nulls.forEach((_, j) => { Anull[j][s] = NaN; }); continue; }
    const bt = base[s] / nb[s];
    A[s] = real.D[s] - bt;
    nulls.forEach((r, j) => { Anull[j][s] = Number.isFinite(r.D[s]) ? r.D[s] - bt : NaN; });
  }
  return { A, Anull, tot: real.tot };
}

/** energy (excess coincidence x tokens) from an A vector (both sides, all bins); NaN bins contribute 0 */
export function energyOf(A) { let s = 0; for (let bin = 0; bin < NLAG; bin++) for (let side = 0; side < 2; side++) { const v = A[bin * 2 + side]; if (Number.isFinite(v)) s += v * LAG_WIDTH[bin]; } return s; }

// ── fitting two laws to a curve ───────────────────────────────────────────────────────────────────────────────────────────────────────
/** power A = a d^-alpha and exponential A = a exp(-d/lambda) fitted to the points (x > 0, y > 0) by least squares in log y; AIC with Gaussian residuals, k = 2 each. */
export function fitLaws(x, y, minPoints = 4) {
  const pts = x.map((xi, i) => [xi, y[i]]).filter(([xi, yi]) => Number.isFinite(yi) && yi > 0 && xi > 0);
  if (pts.length < minPoints) return { gap: "too_few_usable_bins", usable: pts.length };
  const ly = pts.map(([, yi]) => Math.log(yi));
  const fit = (u) => { const n = u.length, mu = u.reduce((a, b) => a + b, 0) / n, my = ly.reduce((a, b) => a + b, 0) / n; let sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sxx += (u[i] - mu) ** 2; sxy += (u[i] - mu) * (ly[i] - my); } const b = sxx > 0 ? sxy / sxx : 0, a = my - b * mu; let rss = 0; for (let i = 0; i < n; i++) rss += (ly[i] - a - b * u[i]) ** 2; return { a, b, rss }; };
  const pw = fit(pts.map(([xi]) => Math.log(xi))), ex = fit(pts.map(([xi]) => xi));
  const n = pts.length, aic = (rss) => n * Math.log(Math.max(rss, 1e-12) / n) + 4;
  return { usable: n, alpha: -pw.b, amp: Math.exp(pw.a), rssPower: pw.rss, lambda: ex.b < 0 ? -1 / ex.b : Infinity, rssExp: ex.rss, aicPower: aic(pw.rss), aicExp: aic(ex.rss), dAIC: aic(ex.rss) - aic(pw.rss) /* >0: power wins */ };
}

/** Weighted least squares in LINEAR space over ALL bins (no selection of bins by the null band: selecting "usable" bins truncates the noise and biases the exponent upward in the tail,
 *  which the planted-law check exposed). Models for the excess coincidence D(d): power D = c^2 d^(-2 alpha) and exponential D = c^2 exp(-2 d / lambda) (alpha is the exponent of the
 *  force-like amplitude sqrt(D)); the amplitude is optimal for each shape parameter on a grid. chi2 = sum_i ((D_i - model_i) / sigma_i)^2; k = 2 each; dAIC = chi2_exp - chi2_power (> 0: power wins). */
export function fitWeighted(x, D, sigma, { squared = true } = {}) {
  const idx = x.map((_, i) => i).filter((i) => Number.isFinite(D[i]) && Number.isFinite(sigma[i]) && sigma[i] > 0);
  if (idx.length < 4) return { gap: "too_few_bins", usable: idx.length };
  const w = idx.map((i) => 1 / sigma[i] ** 2), d = idx.map((i) => D[i]), xs = idx.map((i) => x[i]);
  const scan = (grid, shape) => { let best = null; for (const t of grid) { const g = xs.map((xi) => shape(xi, t)); let num = 0, den = 0; for (let i = 0; i < g.length; i++) { num += w[i] * d[i] * g[i]; den += w[i] * g[i] * g[i]; } const c2 = den > 0 ? Math.max(0, num / den) : 0; let chi = 0; for (let i = 0; i < g.length; i++) chi += w[i] * (d[i] - c2 * g[i]) ** 2; if (!best || chi < best.chi) best = { t, c2, chi }; } return best; };
  const gridA = Array.from({ length: 201 }, (_, k) => k * 0.02), gridL = Array.from({ length: 200 }, (_, k) => 0.5 * Math.pow(1000 / 0.5, k / 199));
  const k2 = squared ? 2 : 1;
  const pw = scan(gridA, (xi, a) => xi ** (-k2 * a)), ex = scan(gridL, (xi, l) => Math.exp((-k2 * xi) / l));
  let chi0 = 0; for (let i = 0; i < d.length; i++) chi0 += w[i] * d[i] ** 2;
  return { usable: idx.length, alpha: pw.t, amp: squared ? Math.sqrt(pw.c2) : pw.c2, chiPower: pw.chi, lambda: ex.t, chiExp: ex.chi, chiZero: chi0, dAIC: ex.chi + 4 - (pw.chi + 4), signal: chi0 - pw.chi };
}

// ── pooled curves over a set of bodies, null band, bootstrap ──────────────────────────────────────────────────────────────────────────
/** per-body excess (with the band-draw null vectors) for every body of `bodyIds` (corpus-wide positions) */
export function pooledAttraction(ix, bodyIds, { seed = 1, kBase = 5, kBand = 5 } = {}) {
  const acc = new Int32Array(ix.V), seen = ix.toks.map((t) => new Int32Array(t.length)), per = [];
  for (const b of bodyIds) {
    const r = attractionExcess(ix, b, ix.occDoc[b], ix.occPos[b], { kBase, kBand, seed: (seed * 1000003 + b * 7919) >>> 0, acc, seen });
    per.push({ id: b, n: ix.count[b], A: r.A, Anull: r.Anull, tot: r.tot });
  }
  return { per };
}
/** the pooled null mean of each band draw over a set of bodies (indices into per) */
export function nullMeans(per, pick) {
  const kBand = per[0]?.Anull.length ?? 0, out = Array.from({ length: kBand }, () => new Float64Array(2 * NLAG));
  for (let s = 0; s < 2 * NLAG; s++) for (let j = 0; j < kBand; j++) { let t = 0, n = 0; for (const p of pick) { const v = per[p].Anull[j][s]; if (Number.isFinite(v)) { t += v; n++; } } out[j][s] = n ? t / n : NaN; }
  return out;
}
const sideMean = (v, bin) => { const a = v[bin * 2], b = v[bin * 2 + 1]; return Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : Number.isFinite(a) ? a : Number.isFinite(b) ? b : NaN; };
const curveOf = (per, pick, getter) => {
  const both = new Float64Array(NLAG), left = new Float64Array(NLAG), right = new Float64Array(NLAG);
  for (let bin = 0; bin < NLAG; bin++) {
    let s = 0, n = 0, sl = 0, nl = 0, sr = 0, nr = 0;
    for (const p of pick) { const v = getter(per[p]); const a = v[bin * 2], b = v[bin * 2 + 1]; if (Number.isFinite(a) && Number.isFinite(b)) { s += (a + b) / 2; n++; } if (Number.isFinite(a)) { sl += a; nl++; } if (Number.isFinite(b)) { sr += b; nr++; } }
    both[bin] = n ? s / n : NaN; left[bin] = nl ? sl / nl : NaN; right[bin] = nr ? sr / nr : NaN;
  }
  return { both, left, right };
};
const amp = (D) => Array.from(D, (v) => (Number.isFinite(v) && v > 0 ? Math.sqrt(v) : NaN));
/** The pooled excess-coincidence curve D(d), its null band (largest |null mean| over the band draws), the bins above the band (existence), the force-like amplitude a = sqrt(D), the two weighted
 *  fits over all bins (the energy exponent is twice the amplitude exponent) and body-bootstrap intervals (curve, exponent). A fit is returned only if >= 4 bins lie above the band (else the typed gap). */
export function summarizeAttraction(pooled, { B = 200, seed = 1, minBodies = 5, minAbove = 4 } = {}) {
  const { per } = pooled;
  const all = pooled.pick ?? per.map((_, i) => i);
  if (all.length < minBodies) return { gap: "too_few_bodies", bodies: all.length };
  const nullD = nullMeans(per, all);
  const cur = curveOf(per, all, (p) => p.A);
  const band = new Float64Array(NLAG);
  for (let bin = 0; bin < NLAG; bin++) band[bin] = Math.max(...nullD.map((v) => Math.abs(sideMean(v, bin))));
  const rnd = mulberry32(seed), boots = [];
  for (let t = 0; t < B; t++) { const pick = Array.from({ length: all.length }, () => all[Math.floor(rnd() * all.length)]); boots.push(curveOf(per, pick, (p) => p.A).both); }
  const q = (xs, p) => { const s2 = xs.filter(Number.isFinite).sort((a, b) => a - b); return s2.length ? s2[Math.min(s2.length - 1, Math.max(0, Math.ceil(p * s2.length) - 1))] : null; };
  const sigma = Array.from({ length: NLAG }, (_, bin) => { const v = boots.map((c) => c[bin]).filter(Number.isFinite); if (v.length < 3) return NaN; const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); });
  const above = Array.from(cur.both).filter((v, i) => v > band[i]).length;
  const X = Array.from(LAG_CENTER);
  const fit = above >= minAbove ? fitWeighted(X, Array.from(cur.both), sigma) : { gap: "too_few_usable_bins", usable: above };
  const alphas = [], dAICs = [];
  if (above >= minAbove) for (const c of boots) { const f = fitWeighted(X, Array.from(c), sigma); if (f.alpha !== undefined) { alphas.push(f.alpha); dAICs.push(f.dAIC); } }
  return {
    bodies: all.length, D: Array.from(cur.both), DLeft: Array.from(cur.left), DRight: Array.from(cur.right), DLo: Array.from({ length: NLAG }, (_, b) => q(boots.map((c) => c[b]), 0.025)), DHi: Array.from({ length: NLAG }, (_, b) => q(boots.map((c) => c[b]), 0.975)),
    sigma, band: Array.from(band), binsAboveBand: above, amplitude: Array.from(cur.both, (v) => (v > 0 ? Math.sqrt(v) : NaN)),
    fit, alphaCI: alphas.length ? [q(alphas, 0.025), q(alphas, 0.975)] : null, dAICshare: dAICs.length ? dAICs.filter((d) => d >= 4).length / dAICs.length : null,
  };
}
