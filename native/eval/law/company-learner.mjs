// native/eval/law/company-learner.mjs — the shared learner family (L1, L2), hashing,
// group normalisation, PCA, seeded utilities. Governed by the pre-registration in
// company.mjs (sections 3 D3/D11 and 4). One implementation for EVERY arm: equal
// treatment is enforced by there being exactly one learner. No pretrained
// weights, no embeddings, no external data; node built-ins only.
//
// Design matrices:
//   sparse (hashed)  { kind: "csr",   n, D, rowPtr:Int32Array(n+1), idx:Int32Array, val:Float32Array }
//   dense            { kind: "dense", n, d, data:Float32Array(n*d) }
// Labels are Int32Array of class ids 0..K-1. Probabilities are Float64Array(n*K),
// floored at PROB_FLOOR and renormalised. Cross-entropy is in bits.

import { createHash } from "node:crypto";

export const TAG = "khora-law-v2";
export const LAMBDA_GRID = Object.freeze([1e-4, 1e-3, 1e-2, 1e-1, 1, 10]);
export const PROB_FLOOR = 1e-4;
export const HASH_D = 1 << 16;
export const HASH_D_SMALL = 1 << 10;
export const LR_MEMORY = 10;
export const LR_MAX_ITER = 500;
export const LR_TOL = 1e-6;
export const MLP_HIDDEN = 64;
export const MLP_LR = 1e-3;
export const MLP_BATCH = 256;
export const MLP_EPOCHS = 30;

// ───────────────────────── shared utilities (seeded, deterministic) ─────────────────────────

/** First 32 bits of sha256 over (TAG, ...parts) joined by NUL. */
export function seedFor(...parts) {
  const h = createHash("sha256").update([TAG, ...parts].map(String).join("\u0000")).digest();
  return h.readUInt32BE(0);
}
export function seedHex(...parts) {
  return createHash("sha256").update([TAG, ...parts].map(String).join("\u0000")).digest("hex");
}
/** mulberry32: a 32-bit seeded stream of uniforms in [0,1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** murmur3 32-bit finaliser. */
export function fmix32(x) {
  x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}
/** FNV-1a 32-bit over UTF-16 code units. */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function bucketOf(group, key, D = HASH_D) {
  return fmix32(fnv1a(group + "|" + key)) & (D - 1);
}
/** Standard normal by Box-Muller from a uniform stream. */
export function gaussian(rng) {
  let u = 0; while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
/** In-place seeded Fisher-Yates. */
export function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
export function permutation(n, rng) {
  const a = new Int32Array(n);
  for (let i = 0; i < n; i++) a[i] = i;
  return shuffleInPlace(a, rng);
}

// ───────────────────────── hashing and group normalisation (D3) ─────────────────────────

/**
 * Hash the sparse blocks of an arm into one CSR matrix.
 * blocks: [{ name, rows: Array<{keys:string[], vals?:number[]} | null> }] (each rows.length === n).
 * Every block (feature GROUP) is L2-normalised to unit norm per token after
 * collisions are added, so an arm with more features is not advantaged by scale.
 */
export function hashFeatures(blocks, n, D = HASH_D) {
  const caches = blocks.map(() => new Map());
  const idx = [];
  const val = [];
  const rowPtr = new Int32Array(n + 1);
  const acc = new Map();
  for (let r = 0; r < n; r++) {
    for (let b = 0; b < blocks.length; b++) {
      const cell = blocks[b].rows[r];
      if (!cell || !cell.keys.length) continue;
      const keys = cell.keys, vals = cell.vals;
      acc.clear();
      const cache = caches[b];
      for (let k = 0; k < keys.length; k++) {
        let bk = cache.get(keys[k]);
        if (bk === undefined) { bk = bucketOf(blocks[b].name, keys[k], D); cache.set(keys[k], bk); }
        acc.set(bk, (acc.get(bk) ?? 0) + (vals ? vals[k] : 1));
      }
      let ss = 0;
      for (const v of acc.values()) ss += v * v;
      const inv = ss > 0 ? 1 / Math.sqrt(ss) : 0;
      const ids = [...acc.keys()].sort((a, c) => a - c);
      for (const id of ids) { idx.push(id); val.push(acc.get(id) * inv); }
    }
    rowPtr[r + 1] = idx.length;
  }
  return { kind: "csr", n, D, rowPtr, idx: Int32Array.from(idx), val: Float32Array.from(val), activeMean: n ? idx.length / n : 0 };
}

/** Group normalisation of one dense block to unit L2 norm per row (the dense analogue of D3). */
export function groupNormalise(X) {
  const out = new Float32Array(X.data.length);
  for (let i = 0; i < X.n; i++) {
    let ss = 0;
    for (let j = 0; j < X.d; j++) { const v = X.data[i * X.d + j]; ss += v * v; }
    const inv = ss > 0 ? 1 / Math.sqrt(ss) : 0;
    for (let j = 0; j < X.d; j++) out[i * X.d + j] = X.data[i * X.d + j] * inv;
  }
  return { kind: "dense", n: X.n, d: X.d, data: out };
}

export function denseFrom(rows, d) {
  const n = rows.length;
  const data = new Float32Array(n * d);
  for (let i = 0; i < n; i++) data.set(rows[i], i * d);
  return { kind: "dense", n, d, data };
}
export function hconcatDense(mats) {
  const n = mats[0].n;
  const d = mats.reduce((s, m) => s + m.d, 0);
  const data = new Float32Array(n * d);
  let off = 0;
  for (const m of mats) {
    for (let i = 0; i < n; i++) for (let j = 0; j < m.d; j++) data[i * d + off + j] = m.data[i * m.d + j];
    off += m.d;
  }
  return { kind: "dense", n, d, data };
}
/** Concatenate sparse CSR matrices column-wise by union of rows (hashes already in one space). */
export function hconcatSparse(mats) {
  const n = mats[0].n;
  const rowPtr = new Int32Array(n + 1);
  let nnz = 0;
  for (const m of mats) nnz += m.idx.length;
  const idx = new Int32Array(nnz), val = new Float32Array(nnz);
  let p = 0;
  for (let i = 0; i < n; i++) {
    for (const m of mats) {
      for (let e = m.rowPtr[i]; e < m.rowPtr[i + 1]; e++) { idx[p] = m.idx[e]; val[p] = m.val[e]; p++; }
    }
    rowPtr[i + 1] = p;
  }
  return { kind: "csr", n, D: mats[0].D, rowPtr, idx, val, activeMean: n ? nnz / n : 0 };
}
export function selectRows(X, rows) {
  const n = rows.length;
  if (X.kind === "dense") {
    const data = new Float32Array(n * X.d);
    for (let r = 0; r < n; r++) data.set(X.data.subarray(rows[r] * X.d, (rows[r] + 1) * X.d), r * X.d);
    return { kind: "dense", n, d: X.d, data };
  }
  const rowPtr = new Int32Array(n + 1);
  let nnz = 0;
  for (let r = 0; r < n; r++) nnz += X.rowPtr[rows[r] + 1] - X.rowPtr[rows[r]];
  const idx = new Int32Array(nnz), val = new Float32Array(nnz);
  let p = 0;
  for (let r = 0; r < n; r++) {
    const i = rows[r];
    for (let e = X.rowPtr[i]; e < X.rowPtr[i + 1]; e++) { idx[p] = X.idx[e]; val[p] = X.val[e]; p++; }
    rowPtr[r + 1] = p;
  }
  return { kind: "csr", n, D: X.D, rowPtr, idx, val, activeMean: n ? nnz / n : 0 };
}
export function vstack(mats) {
  if (mats[0].kind === "dense") {
    const d = mats[0].d, n = mats.reduce((s, m) => s + m.n, 0);
    const data = new Float32Array(n * d);
    let o = 0; for (const m of mats) { data.set(m.data, o); o += m.data.length; }
    return { kind: "dense", n, d, data };
  }
  const n = mats.reduce((s, m) => s + m.n, 0);
  const rowPtr = new Int32Array(n + 1);
  const nnz = mats.reduce((s, m) => s + m.idx.length, 0);
  const idx = new Int32Array(nnz), val = new Float32Array(nnz);
  let r = 0, p = 0;
  for (const m of mats) {
    for (let i = 0; i < m.n; i++) {
      for (let e = m.rowPtr[i]; e < m.rowPtr[i + 1]; e++) { idx[p] = m.idx[e]; val[p] = m.val[e]; p++; }
      rowPtr[++r] = p;
    }
  }
  return { kind: "csr", n, D: mats[0].D, rowPtr, idx, val, activeMean: n ? nnz / n : 0 };
}

// ───────────────────────── compact columns (train-active buckets) ─────────────────────────

/** Map hashed buckets present in the train matrix to compact columns 0..p-1. */
export function compactMap(Xtrain) {
  if (Xtrain.kind === "dense") return { map: null, p: Xtrain.d };
  const map = new Int32Array(Xtrain.D).fill(-1);
  let p = 0;
  for (let e = 0; e < Xtrain.idx.length; e++) { const b = Xtrain.idx[e]; if (map[b] < 0) map[b] = p++; }
  return { map, p };
}
export function applyCompact(X, cm) {
  if (X.kind === "dense") return X;
  const n = X.n, rowPtr = new Int32Array(n + 1);
  const idx = [], val = [];
  for (let i = 0; i < n; i++) {
    for (let e = X.rowPtr[i]; e < X.rowPtr[i + 1]; e++) {
      const c = cm.map[X.idx[e]];
      if (c >= 0) { idx.push(c); val.push(X.val[e]); }
    }
    rowPtr[i + 1] = idx.length;
  }
  return { kind: "csr", n, D: cm.p, rowPtr, idx: Int32Array.from(idx), val: Float32Array.from(val), activeMean: X.activeMean };
}
function width(X) { return X.kind === "dense" ? X.d : X.D; }

// ───────────────────────── L1: multinomial logistic regression, L-BFGS ─────────────────────────

/** Objective and gradient of mean CE + (lambda/2)||W||^2. theta = [W (p*K, feature-major), b (K)]. */
export function lrObjective(X, y, K, lambda, theta, grad) {
  const n = X.n, p = width(X);
  const nW = p * K;
  grad.fill(0);
  const z = new Float64Array(K);
  let loss = 0;
  const dense = X.kind === "dense";
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < K; c++) z[c] = theta[nW + c];
    if (dense) {
      const o = i * X.d;
      for (let j = 0; j < X.d; j++) { const v = X.data[o + j]; if (v === 0) continue; const base = j * K; for (let c = 0; c < K; c++) z[c] += v * theta[base + c]; }
    } else {
      for (let e = X.rowPtr[i]; e < X.rowPtr[i + 1]; e++) { const v = X.val[e], base = X.idx[e] * K; for (let c = 0; c < K; c++) z[c] += v * theta[base + c]; }
    }
    let mx = -Infinity; for (let c = 0; c < K; c++) if (z[c] > mx) mx = z[c];
    let s = 0; for (let c = 0; c < K; c++) { z[c] = Math.exp(z[c] - mx); s += z[c]; }
    const lse = mx + Math.log(s);
    const yi = y[i];
    loss += lse - (Math.log(z[yi]) + mx);
    const inv = 1 / s;
    for (let c = 0; c < K; c++) z[c] = z[c] * inv; // P
    z[yi] -= 1;                                      // dz
    if (dense) {
      const o = i * X.d;
      for (let j = 0; j < X.d; j++) { const v = X.data[o + j]; if (v === 0) continue; const base = j * K; for (let c = 0; c < K; c++) grad[base + c] += v * z[c]; }
    } else {
      for (let e = X.rowPtr[i]; e < X.rowPtr[i + 1]; e++) { const v = X.val[e], base = X.idx[e] * K; for (let c = 0; c < K; c++) grad[base + c] += v * z[c]; }
    }
    for (let c = 0; c < K; c++) grad[nW + c] += z[c];
  }
  const invN = 1 / n;
  let reg = 0;
  for (let q = 0; q < nW; q++) { grad[q] = grad[q] * invN + lambda * theta[q]; reg += theta[q] * theta[q]; }
  for (let c = 0; c < K; c++) grad[nW + c] *= invN;
  return loss * invN + 0.5 * lambda * reg;
}

function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function norm2(a) { return Math.sqrt(dot(a, a)); }

/** Deterministic L-BFGS. fg(x, g) fills g and returns f. */
export function lbfgs(fg, x0, { m = LR_MEMORY, maxIter = LR_MAX_ITER, tol = LR_TOL } = {}) {
  const dim = x0.length;
  let x = Float64Array.from(x0);
  let g = new Float64Array(dim);
  let f = fg(x, g);
  const g0n = Math.max(norm2(g), 1e-300);
  const S = [], Y = [], R = [];
  let iters = 0, converged = false, reason = "maxIter";
  const xn = new Float64Array(dim), gn = new Float64Array(dim), d = new Float64Array(dim), q = new Float64Array(dim);
  for (; iters < maxIter; iters++) {
    const gnorm = norm2(g);
    if (gnorm <= tol * g0n) { converged = true; reason = "grad"; break; }
    q.set(g);
    const k = S.length, alpha = new Float64Array(k);
    for (let i = k - 1; i >= 0; i--) { alpha[i] = R[i] * dot(S[i], q); const yi = Y[i]; for (let j = 0; j < dim; j++) q[j] -= alpha[i] * yi[j]; }
    const gamma = k ? dot(S[k - 1], Y[k - 1]) / dot(Y[k - 1], Y[k - 1]) : 1 / Math.max(1, gnorm);
    for (let j = 0; j < dim; j++) q[j] *= gamma;
    for (let i = 0; i < k; i++) { const beta = R[i] * dot(Y[i], q); const si = S[i]; for (let j = 0; j < dim; j++) q[j] += si[j] * (alpha[i] - beta); }
    for (let j = 0; j < dim; j++) d[j] = -q[j];
    let gd = dot(g, d);
    if (!(gd < 0)) { for (let j = 0; j < dim; j++) d[j] = -g[j]; gd = -dot(g, g); S.length = 0; Y.length = 0; R.length = 0; }
    let t = 1, fn = f, ok = false;
    for (let bt = 0; bt < 40; bt++) {
      for (let j = 0; j < dim; j++) xn[j] = x[j] + t * d[j];
      fn = fg(xn, gn);
      if (Number.isFinite(fn) && fn <= f + 1e-4 * t * gd) { ok = true; break; }
      t *= 0.5;
    }
    if (!ok) { reason = "linesearch"; break; }
    const s = new Float64Array(dim), yv = new Float64Array(dim);
    for (let j = 0; j < dim; j++) { s[j] = xn[j] - x[j]; yv[j] = gn[j] - g[j]; }
    const sy = dot(s, yv);
    if (sy > 1e-10 * norm2(s) * norm2(yv)) {
      S.push(s); Y.push(yv); R.push(1 / sy);
      if (S.length > m) { S.shift(); Y.shift(); R.shift(); }
    }
    const df = Math.abs(f - fn);
    x.set(xn); g.set(gn); f = fn;
    if (df <= 1e-12 * Math.max(1, Math.abs(f))) { converged = true; reason = "stall"; iters++; break; }
  }
  return { x, f, iters, converged, reason, gradNorm: norm2(g), g0: g0n };
}

/**
 * Train L1. X must already be in compact columns (use compactMap/applyCompact for sparse).
 * init: optional warm start (same shape). Returns a model object.
 */
export function trainLR(X, y, { K, lambda, init = null, maxIter = LR_MAX_ITER, tol = LR_TOL } = {}) {
  const p = width(X);
  const dim = p * K + K;
  const x0 = new Float64Array(dim);
  if (init && init.length === dim) x0.set(init);
  else {
    // initial intercepts at the log class prior: a starting point only; the problem is strictly convex
    const cnt = new Float64Array(K).fill(1e-3);
    for (let i = 0; i < y.length; i++) cnt[y[i]]++;
    let s = 0; for (let c = 0; c < K; c++) s += cnt[c];
    for (let c = 0; c < K; c++) x0[p * K + c] = Math.log(cnt[c] / s);
  }
  const res = lbfgs((th, g) => lrObjective(X, y, K, lambda, th, g), x0, { maxIter, tol });
  return { kind: "lr", K, p, lambda, theta: res.x, iters: res.iters, converged: res.converged, reason: res.reason, objective: res.f, gradNorm: res.gradNorm };
}

export function predictLR(model, X) {
  const { K, p, theta } = model, nW = p * K;
  const n = X.n, P = new Float64Array(n * K);
  const z = new Float64Array(K);
  const dense = X.kind === "dense";
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < K; c++) z[c] = theta[nW + c];
    if (dense) {
      const o = i * X.d;
      for (let j = 0; j < X.d; j++) { const v = X.data[o + j]; if (v === 0) continue; const base = j * K; for (let c = 0; c < K; c++) z[c] += v * theta[base + c]; }
    } else {
      for (let e = X.rowPtr[i]; e < X.rowPtr[i + 1]; e++) { const v = X.val[e], base = X.idx[e] * K; for (let c = 0; c < K; c++) z[c] += v * theta[base + c]; }
    }
    softmaxInto(z, P, i * K, K);
  }
  return floorProba(P, n, K);
}

function softmaxInto(z, P, o, K) {
  let mx = -Infinity; for (let c = 0; c < K; c++) if (z[c] > mx) mx = z[c];
  let s = 0; for (let c = 0; c < K; c++) { const e = Math.exp(z[c] - mx); P[o + c] = e; s += e; }
  for (let c = 0; c < K; c++) P[o + c] /= s;
}
/** Floor at PROB_FLOOR and renormalise (in place). */
export function floorProba(P, n, K) {
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let c = 0; c < K; c++) { let v = P[i * K + c]; if (v < PROB_FLOOR) v = PROB_FLOOR; P[i * K + c] = v; s += v; }
    for (let c = 0; c < K; c++) P[i * K + c] /= s;
  }
  return P;
}

// ───────────────────────── L2: one hidden layer, Adam ─────────────────────────

function newMLP(p, K, H, X, rng) {
  // effective fan-in: mean squared input norm (a group is unit norm, a standardised dense row has ~d)
  let ss = 0;
  if (X.kind === "dense") { for (let i = 0; i < Math.min(X.n, 2000); i++) for (let j = 0; j < X.d; j++) ss += X.data[i * X.d + j] ** 2; ss /= Math.max(1, Math.min(X.n, 2000)); }
  else { for (let i = 0; i < Math.min(X.n, 2000); i++) for (let e = X.rowPtr[i]; e < X.rowPtr[i + 1]; e++) ss += X.val[e] ** 2; ss /= Math.max(1, Math.min(X.n, 2000)); }
  const s1 = Math.sqrt(2 / Math.max(ss, 1e-6));
  const s2 = Math.sqrt(2 / (H + K));
  const W1 = new Float64Array(p * H), W2 = new Float64Array(H * K);
  for (let i = 0; i < W1.length; i++) W1[i] = s1 * gaussian(rng);
  for (let i = 0; i < W2.length; i++) W2[i] = s2 * gaussian(rng);
  return { p, K, H, W1, b1: new Float64Array(H), W2, b2: new Float64Array(K) };
}

function mlpForwardRow(m, X, i, hpre, h, z) {
  const { H, K, W1, b1, W2, b2 } = m;
  for (let u = 0; u < H; u++) hpre[u] = b1[u];
  if (X.kind === "dense") {
    const o = i * X.d;
    for (let j = 0; j < X.d; j++) { const v = X.data[o + j]; if (v === 0) continue; const base = j * H; for (let u = 0; u < H; u++) hpre[u] += v * W1[base + u]; }
  } else {
    for (let e = X.rowPtr[i]; e < X.rowPtr[i + 1]; e++) { const v = X.val[e], base = X.idx[e] * H; for (let u = 0; u < H; u++) hpre[u] += v * W1[base + u]; }
  }
  for (let c = 0; c < K; c++) z[c] = b2[c];
  for (let u = 0; u < H; u++) {
    const a = hpre[u] > 0 ? hpre[u] : 0; h[u] = a;
    if (a !== 0) { const base = u * K; for (let c = 0; c < K; c++) z[c] += a * W2[base + c]; }
  }
}

/** Mean CE (nats) + (lambda/2)(||W1||^2 + ||W2||^2) over all rows, forward only (gradient-check helper). */
export function mlpLoss(m, X, y, lambda) {
  const n = X.n, K = m.K;
  const hpre = new Float64Array(m.H), h = new Float64Array(m.H), z = new Float64Array(K), P = new Float64Array(K);
  let loss = 0;
  for (let i = 0; i < n; i++) {
    mlpForwardRow(m, X, i, hpre, h, z);
    softmaxInto(z, P, 0, K);
    loss -= Math.log(Math.max(P[y[i]], 1e-300));
  }
  let reg = 0;
  for (let i = 0; i < m.W1.length; i++) reg += m.W1[i] ** 2;
  for (let i = 0; i < m.W2.length; i++) reg += m.W2[i] ** 2;
  return loss / n + 0.5 * lambda * reg;
}

/** Analytic full-batch gradient of mlpLoss (gradient-check helper; same backprop as training). */
export function mlpGradient(m, X, y, lambda) {
  const n = X.n, { H, K } = m;
  const gW1 = new Float64Array(m.W1.length), gb1 = new Float64Array(H), gW2 = new Float64Array(m.W2.length), gb2 = new Float64Array(K);
  const hpre = new Float64Array(H), h = new Float64Array(H), z = new Float64Array(K), P = new Float64Array(K), dh = new Float64Array(H);
  for (let i = 0; i < n; i++) {
    mlpForwardRow(m, X, i, hpre, h, z);
    softmaxInto(z, P, 0, K);
    P[y[i]] -= 1;
    for (let c = 0; c < K; c++) { P[c] /= n; gb2[c] += P[c]; }
    for (let u = 0; u < H; u++) {
      let s = 0; const base = u * K;
      for (let c = 0; c < K; c++) { gW2[base + c] += h[u] * P[c]; s += m.W2[base + c] * P[c]; }
      dh[u] = hpre[u] > 0 ? s : 0; gb1[u] += dh[u];
    }
    if (X.kind === "dense") { const o = i * X.d; for (let j = 0; j < X.d; j++) { const v = X.data[o + j]; if (v === 0) continue; const base = j * H; for (let u = 0; u < H; u++) gW1[base + u] += v * dh[u]; } }
    else for (let e = X.rowPtr[i]; e < X.rowPtr[i + 1]; e++) { const v = X.val[e], base = X.idx[e] * H; for (let u = 0; u < H; u++) gW1[base + u] += v * dh[u]; }
  }
  for (let i = 0; i < gW1.length; i++) gW1[i] += lambda * m.W1[i];
  for (let i = 0; i < gW2.length; i++) gW2[i] += lambda * m.W2[i];
  return { gW1, gb1, gW2, gb2 };
}

/** Accumulate the batch gradient of rows order[s0..s1) into the buffers; returns the number of touched first-layer rows. */
function mlpAccumulate(m, X, y, order, s0, s1, st) {
  const { H, K } = m;
  const { gW1, gb1, gW2, gb2, touchedFlag, touched, hpre, h, z, P, dh } = st;
  const B = s1 - s0, dense = X.kind === "dense";
  gb1.fill(0); gW2.fill(0); gb2.fill(0);
  let nt = 0;
  for (let q = s0; q < s1; q++) {
    const i = order[q];
    mlpForwardRow(m, X, i, hpre, h, z);
    softmaxInto(z, P, 0, K);
    P[y[i]] -= 1;
    for (let c = 0; c < K; c++) { P[c] /= B; gb2[c] += P[c]; }
    for (let u = 0; u < H; u++) {
      let sacc = 0; const base = u * K;
      for (let c = 0; c < K; c++) { gW2[base + c] += h[u] * P[c]; sacc += m.W2[base + c] * P[c]; }
      dh[u] = hpre[u] > 0 ? sacc : 0; gb1[u] += dh[u];
    }
    if (dense) {
      const o = i * X.d;
      for (let j = 0; j < X.d; j++) {
        const v = X.data[o + j]; if (v === 0) continue;
        if (!touchedFlag[j]) { touchedFlag[j] = 1; touched[nt++] = j; }
        const base = j * H; for (let u = 0; u < H; u++) gW1[base + u] += v * dh[u];
      }
    } else {
      for (let e = X.rowPtr[i]; e < X.rowPtr[i + 1]; e++) {
        const j = X.idx[e], v = X.val[e];
        if (!touchedFlag[j]) { touchedFlag[j] = 1; touched[nt++] = j; }
        const base = j * H; for (let u = 0; u < H; u++) gW1[base + u] += v * dh[u];
      }
    }
  }
  return nt;
}

/** One Adam step (first layer: touched rows only, weight decay coupled into the gradient). */
function mlpAdam(m, st, nt, t, lambda, lr) {
  const { H, K } = m;
  const { gW1, gb1, gW2, gb2, mW1, vW1, mb1, vb1, mW2, vW2, mb2, vb2, touchedFlag, touched } = st;
  const b1 = 0.9, b2 = 0.999, eps = 1e-8;
  const c1 = 1 - Math.pow(b1, t), c2 = 1 - Math.pow(b2, t);
  const stepScale = lr / c1, sc2 = 1 / c2;
  for (let k = 0; k < nt; k++) {
    const j = touched[k], base = j * H;
    for (let u = 0; u < H; u++) {
      const gi = gW1[base + u] + lambda * m.W1[base + u];
      const mi = b1 * mW1[base + u] + (1 - b1) * gi, vi = b2 * vW1[base + u] + (1 - b2) * gi * gi;
      mW1[base + u] = mi; vW1[base + u] = vi;
      m.W1[base + u] -= stepScale * mi / (Math.sqrt(vi * sc2) + eps);
      gW1[base + u] = 0;
    }
    touchedFlag[j] = 0;
  }
  for (let u = 0; u < H; u++) {
    const gi = gb1[u];
    mb1[u] = b1 * mb1[u] + (1 - b1) * gi; vb1[u] = b2 * vb1[u] + (1 - b2) * gi * gi;
    m.b1[u] -= stepScale * mb1[u] / (Math.sqrt(vb1[u] * sc2) + eps);
  }
  for (let q = 0; q < H * K; q++) {
    const gi = gW2[q] + lambda * m.W2[q];
    mW2[q] = b1 * mW2[q] + (1 - b1) * gi; vW2[q] = b2 * vW2[q] + (1 - b2) * gi * gi;
    m.W2[q] -= stepScale * mW2[q] / (Math.sqrt(vW2[q] * sc2) + eps);
  }
  for (let c = 0; c < K; c++) {
    const gi = gb2[c];
    mb2[c] = b1 * mb2[c] + (1 - b1) * gi; vb2[c] = b2 * vb2[c] + (1 - b2) * gi * gi;
    m.b2[c] -= stepScale * mb2[c] / (Math.sqrt(vb2[c] * sc2) + eps);
  }
}

/**
 * Train L2 (X in compact columns). Seeded init and batch order; row-sparse Adam
 * on the first layer (exact Adam when every row is active in every batch).
 */
export function trainMLP(X, y, { K, lambda, seed = 1, hidden = MLP_HIDDEN, epochs = MLP_EPOCHS, batch = MLP_BATCH, lr = MLP_LR } = {}) {
  const p = width(X), n = X.n, H = hidden;
  const rng = mulberry32(seed);
  const m = newMLP(p, K, H, X, rng);
  const st = {
    gW1: new Float64Array(p * H), gb1: new Float64Array(H), gW2: new Float64Array(H * K), gb2: new Float64Array(K),
    mW1: new Float64Array(p * H), vW1: new Float64Array(p * H), mb1: new Float64Array(H), vb1: new Float64Array(H),
    mW2: new Float64Array(H * K), vW2: new Float64Array(H * K), mb2: new Float64Array(K), vb2: new Float64Array(K),
    touchedFlag: new Uint8Array(p), touched: new Int32Array(p),
    hpre: new Float64Array(H), h: new Float64Array(H), z: new Float64Array(K), P: new Float64Array(K), dh: new Float64Array(H),
  };
  let t = 0;
  const order = permutation(n, rng);
  for (let ep = 0; ep < epochs; ep++) {
    shuffleInPlace(order, rng);
    for (let s0 = 0; s0 < n; s0 += batch) {
      const nt = mlpAccumulate(m, X, y, order, s0, Math.min(n, s0 + batch), st);
      t++;
      mlpAdam(m, st, nt, t, lambda, lr);
    }
  }
  return { kind: "mlp", K, p, lambda, net: m, epochs, seed };
}

export function predictMLP(model, X) {
  const m = model.net, K = model.K, n = X.n;
  const P = new Float64Array(n * K);
  const hpre = new Float64Array(m.H), h = new Float64Array(m.H), z = new Float64Array(K);
  for (let i = 0; i < n; i++) {
    mlpForwardRow(m, X, i, hpre, h, z);
    softmaxInto(z, P, i * K, K);
  }
  return floorProba(P, n, K);
}

export function predict(model, X) {
  return model.kind === "lr" ? predictLR(model, X) : predictMLP(model, X);
}

// ───────────────────────── metrics ─────────────────────────

/** Per-token cross-entropy in bits. */
export function ceBitsPerToken(P, y, K) {
  const n = y.length, out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = -Math.log2(P[i * K + y[i]]);
  return out;
}
export function meanOf(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : NaN; }
/** The training class prior as a probability matrix (MAJ), floored and renormalised. */
export function priorProba(yTrain, K, n) {
  const cnt = new Float64Array(K);
  for (let i = 0; i < yTrain.length; i++) cnt[yTrain[i]]++;
  const P = new Float64Array(n * K);
  for (let i = 0; i < n; i++) for (let c = 0; c < K; c++) P[i * K + c] = cnt[c] / Math.max(1, yTrain.length);
  return floorProba(P, n, K);
}
export function accuracyOf(P, y, K) {
  let ok = 0;
  for (let i = 0; i < y.length; i++) { let b = 0, bv = -1; for (let c = 0; c < K; c++) if (P[i * K + c] > bv) { bv = P[i * K + c]; b = c; } if (b === y[i]) ok++; }
  return ok / Math.max(1, y.length);
}
export function macroF1(P, y, K) {
  const tp = new Float64Array(K), fp = new Float64Array(K), fn = new Float64Array(K), present = new Uint8Array(K);
  for (let i = 0; i < y.length; i++) {
    let b = 0, bv = -1; for (let c = 0; c < K; c++) if (P[i * K + c] > bv) { bv = P[i * K + c]; b = c; }
    present[y[i]] = 1;
    if (b === y[i]) tp[b]++; else { fp[b]++; fn[y[i]]++; }
  }
  let s = 0, k = 0;
  for (let c = 0; c < K; c++) { if (!present[c]) continue; const den = 2 * tp[c] + fp[c] + fn[c]; s += den ? (2 * tp[c]) / den : 0; k++; }
  return k ? s / k : 0;
}
/** G = CE(base) - CE(arm), bits per token, from per-token loss arrays. */
export function infoGain(ceBase, ceArm) { return meanOf(ceBase) - meanOf(ceArm); }

// ───────────────────────── lambda selection (the one tuning budget) ─────────────────────────

/**
 * Select lambda on the tune set and fit once per lambda on the train set. Returns the
 * best model (by mean tune CE, ties to the larger lambda), the curve, and a predict(X) closure
 * that applies the train-active column compaction. learner: "L1" | "L2".
 * Training matrices are hashed (csr) or dense; tune/eval are in the same space.
 */
export function fitSelect(Xtrain, ytrain, Xtune, ytune, { K, learner = "L1", lambdas = LAMBDA_GRID, seed = 1, epochs = MLP_EPOCHS, hidden = MLP_HIDDEN, maxIter = LR_MAX_ITER } = {}) {
  const cm = compactMap(Xtrain);
  const Xt = applyCompact(Xtrain, cm), Xu = applyCompact(Xtune, cm);
  const curve = [];
  let best = null, warm = null;
  const order = [...lambdas].sort((a, b) => b - a); // large to small: warm starts for L1
  for (const lam of order) {
    let model;
    if (learner === "L1") {
      model = trainLR(Xt, ytrain, { K, lambda: lam, init: warm, maxIter });
      warm = model.theta;
    } else {
      model = trainMLP(Xt, ytrain, { K, lambda: lam, seed: seedFor("mlp", seed, lam), epochs, hidden });
    }
    const P = learner === "L1" ? predictLR(model, Xu) : predictMLP(model, Xu);
    const ce = meanOf(ceBitsPerToken(P, ytune, K));
    curve.push({ lambda: lam, tuneCE: ce, iters: model.iters ?? null, converged: model.converged ?? null });
    if (!best || ce < best.ce - 1e-12 || (Math.abs(ce - best.ce) <= 1e-12 && lam > best.lambda)) best = { lambda: lam, ce, model };
  }
  curve.sort((a, b) => a.lambda - b.lambda);
  return {
    learner, lambda: best.lambda, tuneCE: best.ce, curve, model: best.model, activeColumns: cm.p,
    predict: (X) => predict(best.model, applyCompact(X, cm)),
  };
}

// ───────────────────────── PCA (design contract: pca(X, d)) ─────────────────────────

/** Symmetric eigendecomposition by cyclic Jacobi. A is n*n row-major Float64Array (destroyed). */
export function jacobiEigen(A, n, { sweeps = 30, tol = 1e-12 } = {}) {
  const V = new Float64Array(n * n);
  for (let i = 0; i < n; i++) V[i * n + i] = 1;
  for (let sw = 0; sw < sweeps; sw++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i * n + j] ** 2;
    if (off < tol) break;
    for (let pI = 0; pI < n - 1; pI++) {
      for (let q = pI + 1; q < n; q++) {
        const apq = A[pI * n + q];
        if (Math.abs(apq) < 1e-300) continue;
        const theta = (A[q * n + q] - A[pI * n + pI]) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k * n + pI], akq = A[k * n + q];
          A[k * n + pI] = c * akp - s * akq; A[k * n + q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[pI * n + k], aqk = A[q * n + k];
          A[pI * n + k] = c * apk - s * aqk; A[q * n + k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k * n + pI], vkq = V[k * n + q];
          V[k * n + pI] = c * vkp - s * vkq; V[k * n + q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const vals = new Float64Array(n);
  for (let i = 0; i < n; i++) vals[i] = A[i * n + i];
  return { values: vals, vectors: V }; // column j of V is eigenvector j (V[k*n + j])
}

/** Unsupervised PCA of a dense matrix to d = min(d, rank) components, fitted on X (the train sample). */
export function pca(X, d) {
  const n = X.n, p = X.d;
  const mean = new Float64Array(p);
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) mean[j] += X.data[i * p + j];
  for (let j = 0; j < p; j++) mean[j] /= Math.max(1, n);
  const C = new Float64Array(p * p);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < p; a++) { const va = X.data[i * p + a] - mean[a]; if (va === 0) continue; for (let b = a; b < p; b++) C[a * p + b] += va * (X.data[i * p + b] - mean[b]); }
  }
  for (let a = 0; a < p; a++) for (let b = a; b < p; b++) { C[a * p + b] /= Math.max(1, n - 1); C[b * p + a] = C[a * p + b]; }
  const { values, vectors } = jacobiEigen(C, p);
  const order = [...values.keys()].sort((a, b) => values[b] - values[a]);
  let rank = 0; for (const v of values) if (v > 1e-10) rank++;
  const dd = Math.max(1, Math.min(d, rank || 1, p));
  const comps = new Float64Array(dd * p);
  for (let r = 0; r < dd; r++) for (let k = 0; k < p; k++) comps[r * p + k] = vectors[k * p + order[r]];
  const project = (Y) => {
    const out = new Float32Array(Y.n * dd);
    for (let i = 0; i < Y.n; i++) for (let r = 0; r < dd; r++) { let s = 0; for (let k = 0; k < p; k++) s += (Y.data[i * p + k] - mean[k]) * comps[r * p + k]; out[i * dd + r] = s; }
    return { kind: "dense", n: Y.n, d: dd, data: out };
  };
  return { d: dd, mean, components: comps, eigenvalues: order.slice(0, dd).map((o) => values[o]), project };
}
