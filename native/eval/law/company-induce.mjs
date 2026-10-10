// native/eval/law/company-induce.mjs — unsupervised induction within a language
// (doc 2.4; company.mjs header section 3 D6/D7). No labels, no priors: only the
// language's own unlabelled exposure Q_0 (identities of the capped train split).
// PPMI against context identities at offsets {-2,-1,+1,+2}, randomised SVD,
// spherical k-means, K* by split-half stability against the within-sentence
// shuffle null. Class identifiers never cross a language boundary.
//
// Everything is seeded; reruns are byte-identical. Plain JavaScript (no BLAS).

import { mulberry32, gaussian, shuffleInPlace, permutation, jacobiEigen, seedFor } from "./company-learner.mjs";

export const ARRIVALS_FLOOR = 2;
export const K_LADDER = Object.freeze([2, 4, 8, 16, 32, 64, 128]);
export const RANK_MAX = 128;
export const NULL_PAIRS = 20;
export const NULL_QUANTILE = 0.95;
export const CTX_OFFSETS = Object.freeze([-2, -1, 1, 2]);
export const KMEANS_ITERS_STABILITY = 20;
export const KMEANS_ITERS_FINAL = 50;

// ───────────────────────── adjusted Rand index ─────────────────────────

export function ari(a, b) {
  const n = a.length;
  if (n < 2) return 0;
  const cont = new Map(), ra = new Map(), rb = new Map();
  for (let i = 0; i < n; i++) {
    const k = a[i] + "," + b[i];
    cont.set(k, (cont.get(k) ?? 0) + 1);
    ra.set(a[i], (ra.get(a[i]) ?? 0) + 1);
    rb.set(b[i], (rb.get(b[i]) ?? 0) + 1);
  }
  const c2 = (x) => x * (x - 1) / 2;
  let sumC = 0, sumA = 0, sumB = 0;
  for (const v of cont.values()) sumC += c2(v);
  for (const v of ra.values()) sumA += c2(v);
  for (const v of rb.values()) sumB += c2(v);
  const total = c2(n), expected = sumA * sumB / total, maxIdx = (sumA + sumB) / 2;
  if (maxIdx === expected) return 0;
  return (sumC - expected) / (maxIdx - expected);
}

// ───────────────────────── sparse PPMI ─────────────────────────

/** Vocabulary V_ind: identities with at least `floor` occurrences, ordered (count desc, identity asc). */
export function vocabularyOf(sentences, floor = ARRIVALS_FLOOR) {
  const cnt = new Map();
  for (const s of sentences) for (const w of s) cnt.set(w, (cnt.get(w) ?? 0) + 1);
  const ids = [...cnt.keys()].filter((w) => cnt.get(w) >= floor).sort((a, b) => cnt.get(b) - cnt.get(a) || (a < b ? -1 : a > b ? 1 : 0));
  const index = new Map(ids.map((w, i) => [w, i]));
  return { ids, index, count: cnt };
}

/** Positive PMI (plain: no smoothing, no shift) of V_ind rows against V_ind contexts. CSR by row. */
export function buildPPMI(sentences, vocab, offsets = CTX_OFFSETS) {
  const nV = vocab.ids.length;
  const pair = new Map();
  const rowSum = new Float64Array(nV), colSum = new Float64Array(nV);
  let N = 0;
  for (const s of sentences) {
    const n = s.length;
    for (let i = 0; i < n; i++) {
      const r = vocab.index.get(s[i]);
      if (r === undefined) continue;
      for (const o of offsets) {
        const j = i + o;
        if (j < 0 || j >= n) continue;
        const c = vocab.index.get(s[j]);
        if (c === undefined) continue;
        const key = r * nV + c;
        pair.set(key, (pair.get(key) ?? 0) + 1);
        rowSum[r]++; colSum[c]++; N++;
      }
    }
  }
  const keys = [...pair.keys()].sort((a, b) => a - b);
  const rowPtr = new Int32Array(nV + 1);
  const col = [], val = [];
  let cur = 0;
  for (const key of keys) {
    const r = Math.floor(key / nV), c = key - r * nV;
    const v = Math.log(pair.get(key) * N / (rowSum[r] * colSum[c]));
    while (cur < r) rowPtr[++cur] = col.length;
    if (v > 0) { col.push(c); val.push(v); }
  }
  while (cur < nV) rowPtr[++cur] = col.length;
  return { n: nV, m: nV, rowPtr, col: Int32Array.from(col), val: Float64Array.from(val), rowSum, colSum, N };
}

// ───────────────────────── randomised SVD (Halko, columns as arrays) ─────────────────────────

function spmv(A, x, y) { // y = A x
  for (let r = 0; r < A.n; r++) { let s = 0; for (let e = A.rowPtr[r]; e < A.rowPtr[r + 1]; e++) s += A.val[e] * x[A.col[e]]; y[r] = s; }
}
function spmtv(A, x, y) { // y = A^T x
  y.fill(0);
  for (let r = 0; r < A.n; r++) { const xr = x[r]; if (xr === 0) continue; for (let e = A.rowPtr[r]; e < A.rowPtr[r + 1]; e++) y[A.col[e]] += A.val[e] * xr; }
}
function orthColumns(cols) {
  for (let j = 0; j < cols.length; j++) {
    const v = cols[j];
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < j; i++) { const u = cols[i]; let d = 0; for (let k = 0; k < v.length; k++) d += u[k] * v[k]; for (let k = 0; k < v.length; k++) v[k] -= d * u[k]; }
    }
    let nm = 0; for (let k = 0; k < v.length; k++) nm += v[k] * v[k];
    nm = Math.sqrt(nm);
    if (nm < 1e-10) v.fill(0); else for (let k = 0; k < v.length; k++) v[k] /= nm;
  }
  return cols;
}

/** Randomised SVD of a sparse matrix: returns { S (desc), U: columns (n each), V: columns (m each) } of rank <= rank. */
export function randomizedSVD(A, rank, rng, { oversample = 10, powerIters = 2 } = {}) {
  const l = Math.max(1, Math.min(rank + oversample, A.n, A.m));
  const omega = Array.from({ length: l }, () => { const v = new Float64Array(A.m); for (let k = 0; k < A.m; k++) v[k] = gaussian(rng); return v; });
  let Y = omega.map((w) => { const y = new Float64Array(A.n); spmv(A, w, y); return y; });
  for (let it = 0; it < powerIters; it++) {
    orthColumns(Y);
    const Z = Y.map((y) => { const z = new Float64Array(A.m); spmtv(A, y, z); return z; });
    orthColumns(Z);
    Y = Z.map((z) => { const y = new Float64Array(A.n); spmv(A, z, y); return y; });
  }
  const Q = orthColumns(Y);
  const Bt = Q.map((q) => { const b = new Float64Array(A.m); spmtv(A, q, b); return b; }); // columns of B^T (m each), B = Q^T A
  // G = B B^T = Bt^T Bt  (l x l)
  const G = new Float64Array(l * l);
  for (let i = 0; i < l; i++) for (let j = i; j < l; j++) { let d = 0; const a = Bt[i], b = Bt[j]; for (let k = 0; k < A.m; k++) d += a[k] * b[k]; G[i * l + j] = d; G[j * l + i] = d; }
  const { values, vectors } = jacobiEigen(G, l);
  const order = [...values.keys()].sort((a, b) => values[b] - values[a]).slice(0, Math.min(rank, l));
  const S = [], U = [], V = [];
  for (const o of order) {
    const sig2 = values[o];
    if (sig2 <= 1e-12) break;
    const sig = Math.sqrt(sig2);
    const u = new Float64Array(A.n), v = new Float64Array(A.m);
    for (let i = 0; i < l; i++) { const w = vectors[i * l + o]; if (w === 0) continue; const q = Q[i], b = Bt[i]; for (let k = 0; k < A.n; k++) u[k] += w * q[k]; for (let k = 0; k < A.m; k++) v[k] += w * b[k]; }
    for (let k = 0; k < A.m; k++) v[k] /= sig;
    S.push(sig); U.push(u); V.push(v);
  }
  return { S, U, V };
}

// ───────────────────────── embeddings and spherical k-means ─────────────────────────

/** Rows U S^(1/2) restricted to the first d columns, L2-normalised AFTER truncation. Float64Array n*d. */
export function embedRows(svd, n, d) {
  const dd = Math.min(d, svd.S.length);
  const E = new Float64Array(n * dd);
  for (let k = 0; k < dd; k++) { const sc = Math.sqrt(svd.S[k]), u = svd.U[k]; for (let i = 0; i < n; i++) E[i * dd + k] = u[i] * sc; }
  for (let i = 0; i < n; i++) {
    let nm = 0; for (let k = 0; k < dd; k++) nm += E[i * dd + k] ** 2;
    nm = Math.sqrt(nm);
    if (nm > 0) for (let k = 0; k < dd; k++) E[i * dd + k] /= nm;
  }
  return { E, d: dd };
}

/** Spherical k-means (cosine) with k-means++ seeding. E rows unit-norm (or zero). Returns { assign, centroids, K }. */
export function sphericalKMeans(E, n, d, Kreq, rng, { maxIter = KMEANS_ITERS_FINAL } = {}) {
  const K = Math.max(1, Math.min(Kreq, n));
  const cent = new Float64Array(K * d);
  const best = new Float64Array(n).fill(-Infinity); // max cosine to chosen centroids
  const first = Math.floor(rng() * n);
  for (let k = 0; k < d; k++) cent[k] = E[first * d + k];
  const updBest = (c) => { for (let i = 0; i < n; i++) { let s = 0; const o = i * d, co = c * d; for (let k = 0; k < d; k++) s += E[o + k] * cent[co + k]; if (s > best[i]) best[i] = s; } };
  updBest(0);
  for (let c = 1; c < K; c++) {
    let tot = 0; const w = new Float64Array(n);
    for (let i = 0; i < n; i++) { const dist = Math.max(0, 1 - best[i]); w[i] = dist * dist; tot += w[i]; }
    let pick = n - 1;
    if (tot > 0) { let r = rng() * tot; for (let i = 0; i < n; i++) { r -= w[i]; if (r <= 0) { pick = i; break; } } } else pick = Math.floor(rng() * n);
    for (let k = 0; k < d; k++) cent[c * d + k] = E[pick * d + k];
    updBest(c);
  }
  const assign = new Int32Array(n).fill(-1);
  const sims = new Float64Array(n);
  for (let it = 0; it < maxIter; it++) {
    let changed = 0;
    for (let i = 0; i < n; i++) {
      let bi = 0, bv = -Infinity; const o = i * d;
      for (let c = 0; c < K; c++) { let s = 0; const co = c * d; for (let k = 0; k < d; k++) s += E[o + k] * cent[co + k]; if (s > bv) { bv = s; bi = c; } }
      sims[i] = bv;
      if (assign[i] !== bi) { assign[i] = bi; changed++; }
    }
    if (!changed && it > 0) break;
    const sum = new Float64Array(K * d), cnt = new Int32Array(K);
    for (let i = 0; i < n; i++) { const c = assign[i]; cnt[c]++; for (let k = 0; k < d; k++) sum[c * d + k] += E[i * d + k]; }
    for (let c = 0; c < K; c++) {
      if (cnt[c] === 0) { // re-seed an empty cluster at the worst-fitting point
        let wi = 0, wv = Infinity; for (let i = 0; i < n; i++) if (sims[i] < wv) { wv = sims[i]; wi = i; }
        for (let k = 0; k < d; k++) cent[c * d + k] = E[wi * d + k];
        sims[wi] = Infinity;
        continue;
      }
      let nm = 0; for (let k = 0; k < d; k++) nm += sum[c * d + k] ** 2;
      nm = Math.sqrt(nm) || 1;
      for (let k = 0; k < d; k++) cent[c * d + k] = sum[c * d + k] / nm;
    }
  }
  return { assign, centroids: cent, K, d };
}

// ───────────────────────── split-half stability ladder ─────────────────────────

function shuffledWithin(sentences, seed) {
  const rng = mulberry32(seed);
  return sentences.map((s) => shuffleInPlace(s.slice(), rng));
}

/** Per half: PPMI, SVD (cached), embedding by rung. */
function halfModel(sents, rankWanted, seed) {
  const vocab = vocabularyOf(sents);
  if (vocab.ids.length < 8) return { vocab, svd: null };
  const A = buildPPMI(sents, vocab);
  const rank = Math.min(rankWanted, vocab.ids.length - 1);
  const svd = randomizedSVD(A, rank, mulberry32(seed));
  return { vocab, svd };
}

/**
 * K* by split-half stability against the within-sentence-shuffle null (doc 2.4).
 * Returns { ladder: [{K, ari, nullP95, nullAris, passes}], kStar (1 = typed gap), commonSize }.
 */
export function stabilityLadder(sentences, { seed, ladder = K_LADDER, nullPairs = NULL_PAIRS, rankMax = RANK_MAX, iters = KMEANS_ITERS_STABILITY } = {}) {
  const rng = mulberry32(seedFor("induce-split", seed));
  const perm = permutation(sentences.length, rng);
  const half = Math.floor(sentences.length / 2);
  const A0 = [], B0 = [];
  for (let i = 0; i < sentences.length; i++) (i < half ? A0 : B0).push(sentences[perm[i]]);
  const variants = [{ a: A0, b: B0, tag: "real" }];
  for (let r = 0; r < nullPairs; r++) variants.push({ a: shuffledWithin(A0, seedFor("induce-null", seed, r, "a")), b: shuffledWithin(B0, seedFor("induce-null", seed, r, "b")), tag: "null" + r });
  const results = variants.map(() => new Map());
  let commonSize = 0;
  for (let v = 0; v < variants.length; v++) {
    const ha = halfModel(variants[v].a, rankMax, seedFor("induce-svd", seed, v, "a"));
    const hb = halfModel(variants[v].b, rankMax, seedFor("induce-svd", seed, v, "b"));
    if (!ha.svd || !hb.svd) continue;
    const common = ha.vocab.ids.filter((w) => hb.vocab.index.has(w));
    if (v === 0) commonSize = common.length;
    const rankA = ha.svd.S.length, rankB = hb.svd.S.length;
    for (const K of ladder) {
      if (K > Math.floor(common.length / 4) || K > rankA || K > rankB) continue;
      const ea = embedRows(ha.svd, ha.vocab.ids.length, K), eb = embedRows(hb.svd, hb.vocab.ids.length, K);
      const ka = sphericalKMeans(ea.E, ha.vocab.ids.length, ea.d, K, mulberry32(seedFor("induce-km", seed, v, K, "a")), { maxIter: iters });
      const kb = sphericalKMeans(eb.E, hb.vocab.ids.length, eb.d, K, mulberry32(seedFor("induce-km", seed, v, K, "b")), { maxIter: iters });
      const la = [], lb = [];
      for (const w of common) { la.push(ka.assign[ha.vocab.index.get(w)]); lb.push(kb.assign[hb.vocab.index.get(w)]); }
      results[v].set(K, ari(la, lb));
    }
  }
  const out = [];
  let kStar = 1;
  for (const K of ladder) {
    if (!results[0].has(K)) continue;
    const real = results[0].get(K);
    const nulls = [];
    for (let v = 1; v < variants.length; v++) if (results[v].has(K)) nulls.push(results[v].get(K));
    nulls.sort((x, y) => x - y);
    const p95 = nulls.length ? nulls[Math.min(nulls.length - 1, Math.ceil(NULL_QUANTILE * nulls.length) - 1)] : Infinity;
    const passes = real > p95 && real > 0;
    out.push({ K, ari: real, nullP95: p95, nNull: nulls.length, passes });
    if (passes && K > kStar) kStar = K;
  }
  return { ladder: out, kStar, commonSize, halves: [A0.length, B0.length] };
}

// ───────────────────────── the induction object ─────────────────────────

/**
 * induceClasses(sentences, { seed, stem, ladder, nullPairs }) — the unsupervised induction of doc 2.4.
 * sentences: arrays of identities (the capped train split, labels never read).
 * Returns the induction object: K (1 = typed gap), type classes, centroids, occurrence-level class by
 * fold-in, class-bigram and boundary tables. All identifiers are within-language.
 */
export function induceClasses(sentences, { seed = "x", ladder = K_LADDER, nullPairs = NULL_PAIRS, rankMax = RANK_MAX, kOverride = null } = {}) {
  const vocab = vocabularyOf(sentences);
  const base = { schema: "LawInduction@1", vocabSize: vocab.ids.length, seed };
  if (vocab.ids.length < 16) return { ...base, K: 1, gap: "vocab_too_small", stability: null, classOfType: () => -1, classOfOccurrence: () => -1 };
  const stab = kOverride ? { ladder: [], kStar: kOverride, commonSize: null } : stabilityLadder(sentences, { seed, ladder, nullPairs, rankMax });
  const K = stab.kStar;
  if (K <= 1) return { ...base, K: 1, gap: "no_K_clears_the_shuffle_null", stability: stab, classOfType: () => -1, classOfOccurrence: () => -1 };
  const A = buildPPMI(sentences, vocab);
  const rank = Math.min(rankMax, vocab.ids.length - 1);
  const svd = randomizedSVD(A, Math.max(rank, K), mulberry32(seedFor("induce-final-svd", seed)));
  const emb = embedRows(svd, vocab.ids.length, K);
  const km = sphericalKMeans(emb.E, vocab.ids.length, emb.d, K, mulberry32(seedFor("induce-final-km", seed)), { maxIter: KMEANS_ITERS_FINAL });
  const d = emb.d;
  const typeClass = km.assign;
  const typeCount = new Int32Array(K);
  for (let i = 0; i < typeClass.length; i++) typeCount[typeClass[i]]++;
  // fold-in operator V S^(-1/2) restricted to d columns
  const nctx = vocab.ids.length;
  const Vfold = new Float64Array(nctx * d);
  for (let k = 0; k < d; k++) { const isq = 1 / Math.sqrt(svd.S[k]); const v = svd.V[k]; for (let c = 0; c < nctx; c++) Vfold[c * d + k] = v[c] * isq; }
  const ctxLogN = new Float64Array(nctx);
  for (let c = 0; c < nctx; c++) ctxLogN[c] = A.colSum[c] > 0 ? A.colSum[c] : 1;
  const Npairs = A.N;
  const cent = km.centroids;
  const classOfType = (id) => { const r = vocab.index.get(id); return r === undefined ? -1 : typeClass[r]; };
  const wBuf = new Float64Array(d);
  /** Occurrence-level class by fold-in of the window (offsets -2,-1 causal; -2..+2 non-causal); mask = index excluded. */
  const classOfOccurrence = (ids, j, { causal = true, mask = -1 } = {}) => {
    wBuf.fill(0);
    const offs = causal ? OFFS_CAUSAL : OFFS_BOTH;
    let nc = 0; const cols = [];
    for (let q = 0; q < offs.length; q++) {
      const p = j + offs[q];
      if (p < 0 || p >= ids.length || p === mask) continue;
      const c = vocab.index.get(ids[p]);
      if (c === undefined) continue;
      cols.push(c); nc++;
    }
    if (!nc) return -1;
    let any = false;
    for (const c of cols) {
      const r = Math.max(0, Math.log(Npairs / (nc * ctxLogN[c])));
      if (r === 0) continue;
      any = true;
      for (let k = 0; k < d; k++) wBuf[k] += r * Vfold[c * d + k];
    }
    if (!any) return -1;
    let nm = 0; for (let k = 0; k < d; k++) nm += wBuf[k] * wBuf[k];
    if (!(nm > 0)) return -1;
    nm = Math.sqrt(nm);
    let bi = 0, bv = -Infinity;
    for (let c = 0; c < K; c++) { let s = 0; const co = c * d; for (let k = 0; k < d; k++) s += wBuf[k] * cent[co + k]; if (s > bv) { bv = s; bi = c; } }
    return bi;
  };
  // class-bigram and boundary tables from Q_0 (non-V_ind tokens are the "other" bin K)
  const bin = K + 1;
  const cnt = new Float64Array(bin * bin), rowSum = new Float64Array(bin), init = new Float64Array(bin), fin = new Float64Array(bin);
  let nSent = 0;
  for (const s of sentences) {
    if (!s.length) continue;
    nSent++;
    let prev = -1;
    for (let i = 0; i < s.length; i++) {
      const c0 = classOfType(s[i]); const c = c0 < 0 ? K : c0;
      if (i === 0) init[c]++;
      if (i === s.length - 1) fin[c]++;
      if (prev >= 0) { cnt[prev * bin + c]++; rowSum[prev]++; }
      prev = c;
    }
  }
  const surprisal = (c1, c2) => { const a = c1 < 0 ? K : c1, b = c2 < 0 ? K : c2; return -Math.log2((cnt[a * bin + b] + 1) / (rowSum[a] + bin)); };
  const initSurprisal = (c) => { const a = c < 0 ? K : c; return -Math.log2((init[a] + 1) / (nSent + bin)); };
  const finSurprisal = (c) => { const a = c < 0 ? K : c; return -Math.log2((fin[a] + 1) / (nSent + bin)); };
  return {
    ...base, K, gap: null, d, stability: stab,
    ids: vocab.ids, index: vocab.index, typeClass, typeCount, centroids: cent,
    classOfType, classOfOccurrence, surprisal, initSurprisal, finSurprisal,
    ctxCount: ctxLogN, Npairs, Vfold,
  };
}
const OFFS_CAUSAL = Object.freeze([-2, -1]);
const OFFS_BOTH = Object.freeze([-2, -1, 1, 2]);
