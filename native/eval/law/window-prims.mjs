// eval/law/window-prims.mjs — LOCAL PRIMITIVES for eval/law/window.mjs (the bound, T6).
//
// Why this file exists. window.mjs is built concurrently with corpus.mjs, company.mjs, learner.mjs, induce.mjs
// and slots.mjs. Its measurement logic is dependency-injected (every learner, predictor, impact function and
// SESOI is a parameter), and THIS file supplies small, deterministic, dependency-free defaults so that the bound can
// be measured, and tested on a planted toy, without waiting for the siblings: a CoNLL-U reader, the seeded
// permutation / nested-prefix sampler, the COMP-OCC window features (boundary-blind padding, prefix property),
// a multinomial logistic regression (learner L1 of the design, deterministic L-BFGS), a one-hidden-layer network
// (a LABELLED stand-in for learner L2), unsupervised class induction (PPMI + randomised SVD + spherical k-means,
// K* by split-half stability against the within-sentence-shuffle null, design 2.4) and the little linear algebra
// they need. Nothing here reads a gold label except the loader (which only parses it) and the scorer arguments
// the caller passes (y). No LLM, no pretrained weights, no external data (khora is a ZERO-MODEL reader).
// Where a sibling (learner.mjs, induce.mjs, corpus.mjs, company.mjs) is wired by run.mjs, equal treatment of the
// arms is the caller's job; the local defaults are labelled in every output (provenance).
//
// Contract used by window.mjs:
//   observation  = { ids: string[] (the sentence stream identities), i: number, sid: number, y: number }
//   X (features) = { n, stride, idx: Int32Array(n*stride) }   rung w uses the first w columns of every row
//   model        = { kind: "LR"|"MLP", K, w, ... }              scoreModel(model, X) -> { pred, prob? }

import { createHash } from "node:crypto";
import fs from "node:fs";

// ---------------------------------------------------------------------------------------------------------------
// seeds and randomness (every random choice is a pure function of seedFor(...) and a mulberry32 stream)
export const SEED_NS = "khora-law-v2";
export const seedFor = (...parts) => createHash("sha256").update([SEED_NS, ...parts].join("\x1f")).digest().readUInt32BE(0);
export function mulberry32(a) {
  let s = a | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const mix32 = (h) => {
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
};
export function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export const gauss = (rng) => {
  let u = 0; while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
};
export function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  return arr;
}
export const permutation = (n, rng) => shuffleInPlace(Array.from({ length: n }, (_, i) => i), rng);

// ---------------------------------------------------------------------------------------------------------------
// CoNLL-U (D1 of the design 2.1: syntactic words = rows with a plain integer ID; punctuation leaves the STREAM)
export const UPOS14 = Object.freeze(["ADJ", "ADP", "ADV", "AUX", "CCONJ", "DET", "INTJ", "NOUN", "NUM", "PART", "PRON", "PROPN", "SCONJ", "VERB"]);
export const UPOS14_INDEX = new Map(UPOS14.map((u, i) => [u, i]));
export const norm = (form) => form.normalize("NFC").toLowerCase();

/** Parse CoNLL-U text into sentences { sid, newdoc, words: [{ form, upos }] } (words INCLUDE PUNCT; the stream drops it). */
export function parseConllu(text) {
  const sentences = [];
  let words = [], newdoc = false, pendingNewdoc = false;
  const flush = () => { if (words.length) sentences.push({ sid: sentences.length, newdoc, words }); words = []; newdoc = false; };
  for (const raw of text.split("\n")) {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (line === "") { flush(); if (pendingNewdoc) { /* newdoc without a sentence: carried to the next */ } continue; }
    if (line.charCodeAt(0) === 35) { if (/^#\s*newdoc/.test(line)) { if (words.length) flush(); pendingNewdoc = true; } continue; }
    const f = line.split("\t");
    if (f.length < 10 || !/^\d+$/.test(f[0])) continue;
    if (!words.length) { newdoc = pendingNewdoc; pendingNewdoc = false; }
    words.push({ form: f[1], upos: f[3] });
  }
  flush();
  return sentences;
}
export function loadConlluFile(path) {
  if (/test\.conllu(\.gz)?$/.test(path)) throw new Error(`window-prims: refuses to read a TEST file (${path}); the test path is behind the pre-registration guard of run.mjs`);
  return parseConllu(fs.readFileSync(path, "utf8"));
}
export const UD_ROOT = "/private/tmp/claude-501";
export function splitPath(stem, split) {
  if (split === "train") return `${UD_ROOT}/tb/${stem === "kor" ? "kor-gsd" : stem}/train.conllu`;
  if (split === "dev") return `${UD_ROOT}/ud-eval/${stem}/dev.conllu`;
  throw new Error(`window-prims: split "${split}" is not readable here (train and dev only; test only through run.mjs under the guard)`);
}
export function loadSplit(stem, split) {
  const p = splitPath(stem, split);
  if (!fs.existsSync(p)) return { gap: "no_data", path: p, sentences: [] };
  return { path: p, sentences: loadConlluFile(p) };
}

/** The stream of a sentence (PUNCT removed, heard rule S2) with identities and the PARALLEL gold UPOS. */
export function streamOf(sentence) {
  const ids = [], upos = [];
  for (const w of sentence.words) if (w.upos !== "PUNCT") { ids.push(norm(w.form)); upos.push(w.upos); }
  return { ids, upos, sid: sentence.sid, newdoc: !!sentence.newdoc };
}
export const countWords = (sentences) => sentences.reduce((a, s) => a + s.words.length, 0);

/** capSample (design 3.2): the longest prefix of a seeded permutation whose total word count (incl. PUNCT) is <= nCap. */
export function permuteSentences(sentences, seed) {
  const order = permutation(sentences.length, mulberry32(seed));
  return order.map((k) => sentences[k]);
}
export function prefixByWords(permuted, nWords) {
  const out = []; let tot = 0;
  for (const s of permuted) { if (tot + s.words.length > nWords) break; out.push(s); tot += s.words.length; }
  return { sentences: out, words: tot };
}

// ---------------------------------------------------------------------------------------------------------------
// exposure, identity hashing, boundary-blind padding (design 2.3: COMP-OCC)
export function makeHasher() {
  const cache = new Map();
  return (id) => { let h = cache.get(id); if (h === undefined) { h = fnv1a(id); cache.set(id, h); } return h; };
}
/** The unlabelled exposure: identity counts and the unigram CDF used for boundary-blind padding and resample controls. */
export function makeExposure(streams, { hasher = makeHasher() } = {}) {
  const count = new Map(); let total = 0;
  for (const ids of streams) for (const id of ids) { count.set(id, (count.get(id) ?? 0) + 1); total++; }
  const vocab = [...count.keys()].sort();
  const cdf = new Float64Array(vocab.length); let acc = 0;
  for (let i = 0; i < vocab.length; i++) { acc += count.get(vocab[i]) / Math.max(1, total); cdf[i] = acc; }
  const hashes = new Uint32Array(vocab.length); for (let i = 0; i < vocab.length; i++) hashes[i] = hasher(vocab[i]);
  return { count, total, vocab, cdf, hashes, hasher };
}
function drawIndex(cdf, u) {
  let lo = 0, hi = cdf.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] >= u) hi = mid; else lo = mid + 1; }
  return lo;
}
/** Identity hash of the pad filler at (sentence, signed offset): i.i.d. unigram draws, no sentinel, no boundary flag. */
export function padHash(exposure, base, sid, key) {
  const u = mix32((base ^ Math.imul((sid + 1) | 0, 0x9e3779b1) ^ Math.imul((key + 0x20000) | 0, 0x85ebca6b)) >>> 0) / 4294967296;
  return exposure.hashes[drawIndex(exposure.cdf, u)];
}
/** An unigram identity (string) drawn from the exposure for a given uniform u (used by the resample controls). */
export const unigramIdentity = (exposure, u) => exposure.vocab[drawIndex(exposure.cdf, u)];

/**
 * COMP-OCC window features. Row r = the observation; columns in the order  L1, R1, L2, R2, ... (non-causal) or L1, L2, ...
 * (causal), so that the first (causal ? h : 2h) columns are exactly the rung-h window (PREFIX PROPERTY). The centre token is
 * never read. A feature = (signed offset, identity hash) mixed to D buckets; value 1; no cross-offset normalisation.
 */
export function buildMaster(obsList, { causal, Lw, D = 1 << 16, exposure, padBase, hasher = exposure.hasher }) {
  const width = causal ? Lw : 2 * Lw;
  const n = obsList.length;
  const idx = new Int32Array(n * width);
  const mask = D - 1;
  for (let r = 0; r < n; r++) {
    const o = obsList[r], ids = o.ids, len = ids.length, i = o.i, sid = o.sid, base = r * width;
    let c = 0;
    for (let d = 1; d <= Lw; d++) {
      const pl = i - d;
      const hl = pl >= 0 ? hasher(ids[pl]) : padHash(exposure, padBase, sid, -d);
      idx[base + c++] = mix32((hl ^ Math.imul((-d) | 0, 0x9e3779b1)) >>> 0) & mask;
      if (!causal) {
        const pr = i + d;
        const hr = pr < len ? hasher(ids[pr]) : padHash(exposure, padBase, sid, d);
        idx[base + c++] = mix32((hr ^ Math.imul(d | 0, 0x9e3779b1)) >>> 0) & mask;
      }
    }
  }
  return { n, stride: width, idx, causal, Lw, D };
}
export const rungWidth = (rung, causal, Lw) => (rung === "whole" ? Lw : Math.min(rung, Lw)) * (causal ? 1 : 2);

// ---------------------------------------------------------------------------------------------------------------
// learner L1: multinomial logistic regression, mean cross-entropy + lambda/2 ||W||^2, deterministic L-BFGS
const compactCache = new WeakMap();
/** Compact the hashed ids that occur in the training rows (rung width w); eval rows map through cmap (-1 = unseen, ignored). */
export function prepareTrain(X, w) {
  let perX = compactCache.get(X);
  if (!perX) { perX = new Map(); compactCache.set(X, perX); }
  let prep = perX.get(w);
  if (prep) return prep;
  const cmap = new Int32Array(X.D).fill(-1);
  let m = 0;
  const cidx = new Int32Array(X.n * w);
  for (let r = 0; r < X.n; r++) {
    const b = r * X.stride;
    for (let j = 0; j < w; j++) {
      const h = X.idx[b + j];
      let c = cmap[h];
      if (c < 0) { c = m++; cmap[h] = c; }
      cidx[r * w + j] = c;
    }
  }
  prep = { cidx, m, cmap, w, n: X.n };
  perX.set(w, prep);
  return prep;
}
function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

/** Deterministic L-BFGS with Armijo backtracking. fg(x, g) -> f (writes the gradient into g). */
export function lbfgsMinimize(fg, x, { maxIter = 500, tol = 1e-6, gref = 1, mem = 7 } = {}) {
  const n = x.length;
  const Hist = n > 1.5e6 ? Float32Array : Float64Array;
  let g = new Float64Array(n), gn = new Float64Array(n), xn = new Float64Array(n), d = new Float64Array(n);
  let f = fg(x, g);
  const S = [], Y = [], rho = [];
  let iters = 0, gnorm = Math.sqrt(dot(g, g)), converged = gnorm <= tol * gref;
  for (; iters < maxIter && !converged; iters++) {
    // two-loop recursion
    d.set(g);
    const k = S.length, alpha = new Array(k);
    for (let i = k - 1; i >= 0; i--) { let a = 0; const s = S[i]; for (let j = 0; j < n; j++) a += s[j] * d[j]; a *= rho[i]; alpha[i] = a; const y = Y[i]; for (let j = 0; j < n; j++) d[j] -= a * y[j]; }
    if (k) { const y = Y[k - 1], s = S[k - 1]; let yy = 0, sy = 0; for (let j = 0; j < n; j++) { yy += y[j] * y[j]; sy += s[j] * y[j]; } const gam = sy / yy; for (let j = 0; j < n; j++) d[j] *= gam; }
    for (let i = 0; i < k; i++) { let b = 0; const y = Y[i]; for (let j = 0; j < n; j++) b += y[j] * d[j]; b *= rho[i]; const s = S[i]; const c = alpha[i] - b; for (let j = 0; j < n; j++) d[j] += s[j] * c; }
    for (let j = 0; j < n; j++) d[j] = -d[j];
    let gd = dot(g, d);
    if (!(gd < 0)) { S.length = 0; Y.length = 0; rho.length = 0; for (let j = 0; j < n; j++) d[j] = -g[j]; gd = -gnorm * gnorm; }
    let t = S.length === 0 ? Math.min(1, 1 / Math.max(gnorm, 1e-12)) : 1, fn = NaN, ok = false;
    for (let ls = 0; ls < 40; ls++) {
      for (let j = 0; j < n; j++) xn[j] = x[j] + t * d[j];
      fn = fg(xn, gn);
      if (Number.isFinite(fn) && fn <= f + 1e-4 * t * gd) { ok = true; break; }
      t *= 0.5;
    }
    if (!ok) break;
    const s = new Hist(n), y = new Hist(n);
    let sy = 0;
    for (let j = 0; j < n; j++) { s[j] = xn[j] - x[j]; y[j] = gn[j] - g[j]; sy += s[j] * y[j]; }
    if (sy > 1e-12) { S.push(s); Y.push(y); rho.push(1 / sy); if (S.length > mem) { S.shift(); Y.shift(); rho.shift(); } }
    const df = f - fn;
    x.set(xn); const tmp = g; g = gn; gn = tmp; f = fn;
    gnorm = Math.sqrt(dot(g, g));
    if (gnorm <= tol * gref) { converged = true; iters++; break; }
    if (df >= 0 && df < 1e-13 * Math.max(1, Math.abs(f))) { iters++; break; }
  }
  return { f, iters, gnorm, converged };
}

/**
 * Fit the L1 learner on rung-w rows of X. opts: K classes, lambda, warm = a previous model on the SAME prep (path), weights
 * (per-row bootstrap counts), maxIter, tol. y = Int32Array of class ids (rows with y < 0 are skipped via weight 0).
 */
export function fitLR(X, w, y, { K, lambda, warm = null, weights = null, maxIter = 500, tol = 1e-6, gref = null } = {}) {
  const prep = prepareTrain(X, w);
  const { cidx, m, n } = prep;
  const dim = m * K + K;
  const wt = new Float64Array(n);
  let wsum = 0;
  for (let r = 0; r < n; r++) { const v = y[r] >= 0 ? (weights ? weights[r] : 1) : 0; wt[r] = v; wsum += v; }
  const z = new Float64Array(K);
  const fg = (th, g) => {
    g.fill(0);
    let loss = 0;
    const bOff = m * K;
    for (let r = 0; r < n; r++) {
      const wr = wt[r]; if (wr === 0) continue;
      const cb = r * w;
      for (let k = 0; k < K; k++) z[k] = th[bOff + k];
      for (let j = 0; j < w; j++) { const o = cidx[cb + j] * K; for (let k = 0; k < K; k++) z[k] += th[o + k]; }
      let mx = z[0]; for (let k = 1; k < K; k++) if (z[k] > mx) mx = z[k];
      let se = 0; for (let k = 0; k < K; k++) { z[k] = Math.exp(z[k] - mx); se += z[k]; }
      const yr = y[r];
      loss += wr * (Math.log(se) - Math.log(z[yr]));
      const sc = wr / wsum / se;
      for (let k = 0; k < K; k++) z[k] *= sc; // p_k * wr / wsum
      z[yr] -= wr / wsum;
      for (let k = 0; k < K; k++) g[bOff + k] += z[k];
      for (let j = 0; j < w; j++) { const o = cidx[cb + j] * K; for (let k = 0; k < K; k++) g[o + k] += z[k]; }
    }
    loss /= wsum;
    let reg = 0;
    for (let i = 0; i < bOff; i++) { reg += th[i] * th[i]; g[i] += lambda * th[i]; }
    return loss + 0.5 * lambda * reg;
  };
  const th = new Float64Array(dim);
  if (warm && warm.th && warm.th.length === dim) th.set(warm.th);
  let gr = gref;
  if (gr == null) { const g0 = new Float64Array(dim); const t0 = new Float64Array(dim); fg(t0, g0); gr = Math.max(Math.sqrt(dot(g0, g0)), 1e-12); }
  const info = lbfgsMinimize(fg, th, { maxIter, tol, gref: gr });
  return { kind: "LR", K, w, m, cmap: prep.cmap, D: X.D, th, lambda, iters: info.iters, converged: info.converged, gnorm: info.gnorm, gref: gr };
}

export const PROB_FLOOR = 1e-4;
/** Score rows of X: argmax and (if y given) the per-token loss in bits with the probability floor 1e-4 renormalised (2.8). */
export function scoreLR(model, X, y = null, { wantProb = false } = {}) {
  const { K, w, m, cmap, th } = model;
  const n = X.n;
  const pred = new Int32Array(n);
  const loss = y ? new Float64Array(n) : null;
  const prob = wantProb ? new Float32Array(n * K) : null;
  const z = new Float64Array(K);
  const bOff = m * K;
  for (let r = 0; r < n; r++) {
    for (let k = 0; k < K; k++) z[k] = th[bOff + k];
    const b = r * X.stride;
    for (let j = 0; j < w; j++) { const c = cmap[X.idx[b + j]]; if (c >= 0) { const o = c * K; for (let k = 0; k < K; k++) z[k] += th[o + k]; } }
    let mx = z[0], am = 0; for (let k = 1; k < K; k++) if (z[k] > mx) { mx = z[k]; am = k; }
    pred[r] = am;
    let se = 0; for (let k = 0; k < K; k++) { z[k] = Math.exp(z[k] - mx); se += z[k]; }
    if (loss && y[r] >= 0) {
      let s2 = 0;
      for (let k = 0; k < K; k++) { z[k] = Math.max(z[k] / se, PROB_FLOOR); s2 += z[k]; }
      loss[r] = -Math.log2(z[y[r]] / s2);
      if (prob) for (let k = 0; k < K; k++) prob[r * K + k] = z[k] / s2;
    } else if (prob) for (let k = 0; k < K; k++) prob[r * K + k] = z[k] / se;
  }
  return { pred, loss, prob };
}
export function majorityModel(y, K) {
  const c = new Float64Array(K); let t = 0;
  for (const v of y) if (v >= 0) { c[v]++; t++; }
  const p = Array.from(c, (v) => Math.max(v / Math.max(t, 1), PROB_FLOOR)); const s = p.reduce((a, b) => a + b, 0);
  return { kind: "MAJ", K, p: p.map((v) => v / s) };
}
export function scoreMajority(maj, y) {
  const loss = new Float64Array(y.length);
  for (let r = 0; r < y.length; r++) loss[r] = y[r] >= 0 ? -Math.log2(maj.p[y[r]]) : 0;
  return loss;
}
export const meanOver = (arr, y = null) => { let s = 0, c = 0; for (let i = 0; i < arr.length; i++) if (!y || y[i] >= 0) { s += arr[i]; c++; } return c ? s / c : NaN; };

/**
 * Fit a lambda path (descending, warm-started) and keep the model with the lowest mean cross-entropy on the selection rows.
 * Returns { model, lambda, path: [{ lambda, ce, iters }] }. The whole tuning budget is the grid.
 */
export const LAMBDA_GRID = Object.freeze([1e-4, 1e-3, 1e-2, 1e-1, 1, 10]);
export function fitLRPath(Xtr, w, ytr, { K, Xsel, ysel, grid = LAMBDA_GRID, weights = null, maxIter = 500, tol = 1e-6 }) {
  const order = [...grid].sort((a, b) => b - a);
  let warm = null, best = null, gref = null; const path = [];
  for (const lambda of order) {
    const model = fitLR(Xtr, w, ytr, { K, lambda, warm, weights, maxIter, tol, gref });
    gref = model.gref; // the gradient norm at theta = 0 does not depend on lambda: computed once per path
    const { loss } = scoreLR(model, Xsel, ysel);
    const ce = meanOver(loss, ysel);
    path.push({ lambda, ce, iters: model.iters, converged: model.converged });
    if (!best || ce < best.ce) best = { model, ce, lambda };
    warm = model;
  }
  return { model: best.model, lambda: best.lambda, ce: best.ce, path };
}

// ---------------------------------------------------------------------------------------------------------------
// learner L2 STAND-IN: one hidden layer of 64 ReLU units on the sparse unit features, Adam (1e-3, batch 256, 30 epochs).
// LABELLED stand-in (kind "MLP-standin"): the first-layer Adam update and the weight decay lambda are applied LAZILY to the rows
// touched by the batch (sparse embedding optimisers), because a dense update of D x 64 parameters per step is unaffordable in
// plain JavaScript. Deterministic given the seed. The first layer is indexed by the compact feature map like L1.
export function fitMLP(X, w, y, { K, lambda = 1e-3, hidden = 64, epochs = 30, batch = 256, lr = 1e-3, seed = 1, weights = null } = {}) {
  const prep = prepareTrain(X, w);
  const { cidx, m, cmap, n } = prep;
  const rng = mulberry32(seed >>> 0);
  const H = hidden;
  const W1 = new Float32Array(m * H), mW1 = new Float32Array(m * H), vW1 = new Float32Array(m * H);
  const b1 = new Float32Array(H), mb1 = new Float32Array(H), vb1 = new Float32Array(H);
  const W2 = new Float32Array(K * H), mW2 = new Float32Array(K * H), vW2 = new Float32Array(K * H);
  const b2 = new Float32Array(K), mb2 = new Float32Array(K), vb2 = new Float32Array(K);
  const s1 = 0.1 / Math.sqrt(Math.max(w, 1)), s2 = 1 / Math.sqrt(H);
  for (let i = 0; i < W1.length; i++) W1[i] = gauss(rng) * s1;
  for (let i = 0; i < W2.length; i++) W2[i] = gauss(rng) * s2;
  const rows = []; for (let r = 0; r < n; r++) if (y[r] >= 0 && (!weights || weights[r] > 0)) rows.push(r);
  const hid = new Float32Array(H), pre = new Float32Array(H), logits = new Float64Array(K), dh = new Float32Array(H);
  const gW1 = new Map(); const gW2 = new Float32Array(K * H), gb2 = new Float32Array(K), gb1 = new Float32Array(H);
  const B1 = 0.9, B2 = 0.999, EPS = 1e-8;
  let step = 0;
  for (let ep = 0; ep < epochs; ep++) {
    shuffleInPlace(rows, rng);
    for (let s = 0; s < rows.length; s += batch) {
      const e = Math.min(rows.length, s + batch), bs = e - s;
      gW1.clear(); gW2.fill(0); gb2.fill(0); gb1.fill(0);
      for (let q = s; q < e; q++) {
        const r = rows[q], cb = r * w, rw = weights ? weights[r] : 1;
        for (let h = 0; h < H; h++) pre[h] = b1[h];
        for (let j = 0; j < w; j++) { const o = cidx[cb + j] * H; for (let h = 0; h < H; h++) pre[h] += W1[o + h]; }
        for (let h = 0; h < H; h++) hid[h] = pre[h] > 0 ? pre[h] : 0;
        let mx = -Infinity;
        for (let k = 0; k < K; k++) { let a = b2[k]; const o = k * H; for (let h = 0; h < H; h++) a += W2[o + h] * hid[h]; logits[k] = a; if (a > mx) mx = a; }
        let se = 0; for (let k = 0; k < K; k++) { logits[k] = Math.exp(logits[k] - mx); se += logits[k]; }
        dh.fill(0);
        for (let k = 0; k < K; k++) {
          const dz = (logits[k] / se - (k === y[r] ? 1 : 0)) * rw / bs;
          gb2[k] += dz; const o = k * H;
          for (let h = 0; h < H; h++) { gW2[o + h] += dz * hid[h]; dh[h] += dz * W2[o + h]; }
        }
        for (let h = 0; h < H; h++) { if (pre[h] <= 0) dh[h] = 0; gb1[h] += dh[h]; }
        for (let j = 0; j < w; j++) {
          const c = cidx[cb + j]; let g = gW1.get(c);
          if (!g) { g = new Float32Array(H); gW1.set(c, g); }
          for (let h = 0; h < H; h++) g[h] += dh[h];
        }
      }
      step++;
      const bc1 = 1 - Math.pow(B1, step), bc2 = 1 - Math.pow(B2, step);
      const upd = (P, M, V, i, g) => { const gg = g + lambda * P[i]; M[i] = B1 * M[i] + (1 - B1) * gg; V[i] = B2 * V[i] + (1 - B2) * gg * gg; P[i] -= lr * (M[i] / bc1) / (Math.sqrt(V[i] / bc2) + EPS); };
      for (const [c, g] of gW1) { const o = c * H; for (let h = 0; h < H; h++) upd(W1, mW1, vW1, o + h, g[h]); }
      for (let i = 0; i < W2.length; i++) upd(W2, mW2, vW2, i, gW2[i]);
      for (let i = 0; i < K; i++) { const gg = gb2[i]; mb2[i] = B1 * mb2[i] + (1 - B1) * gg; vb2[i] = B2 * vb2[i] + (1 - B2) * gg * gg; b2[i] -= lr * (mb2[i] / bc1) / (Math.sqrt(vb2[i] / bc2) + EPS); }
      for (let i = 0; i < H; i++) { const gg = gb1[i]; mb1[i] = B1 * mb1[i] + (1 - B1) * gg; vb1[i] = B2 * vb1[i] + (1 - B2) * gg * gg; b1[i] -= lr * (mb1[i] / bc1) / (Math.sqrt(vb1[i] / bc2) + EPS); }
    }
  }
  return { kind: "MLP-standin", K, w, H, m, cmap, D: X.D, W1, b1, W2, b2, lambda };
}
export function scoreMLP(model, X, y = null) {
  const { K, w, H, cmap, W1, b1, W2, b2 } = model;
  const n = X.n, pred = new Int32Array(n), loss = y ? new Float64Array(n) : null;
  const hid = new Float32Array(H), z = new Float64Array(K);
  for (let r = 0; r < n; r++) {
    for (let h = 0; h < H; h++) hid[h] = b1[h];
    const b = r * X.stride;
    for (let j = 0; j < w; j++) { const c = cmap[X.idx[b + j]]; if (c >= 0) { const o = c * H; for (let h = 0; h < H; h++) hid[h] += W1[o + h]; } }
    for (let h = 0; h < H; h++) if (hid[h] < 0) hid[h] = 0;
    let mx = -Infinity, am = 0;
    for (let k = 0; k < K; k++) { let a = b2[k]; const o = k * H; for (let h = 0; h < H; h++) a += W2[o + h] * hid[h]; z[k] = a; if (a > mx) { mx = a; am = k; } }
    pred[r] = am;
    if (loss && y[r] >= 0) {
      let se = 0; for (let k = 0; k < K; k++) { z[k] = Math.exp(z[k] - mx); se += z[k]; }
      let s2 = 0; for (let k = 0; k < K; k++) { z[k] = Math.max(z[k] / se, PROB_FLOOR); s2 += z[k]; }
      loss[r] = -Math.log2(z[y[r]] / s2);
    }
  }
  return { pred, loss };
}
export const scoreModel = (model, X, y = null) => (model.kind === "LR" ? scoreLR(model, X, y) : scoreMLP(model, X, y));

/** The learner registry the bound uses (L1 primary; L2 stand-in labelled). fitPath(Xtr, w, ytr, {K, Xsel, ysel, weights}) -> {model, lambda, ce}. */
export const LOCAL_LEARNERS = {
  L1: { name: "L1", provenance: "window-prims fitLR (L-BFGS, mean CE + lambda/2||W||^2)", fitPath: fitLRPath, fitAt: (Xtr, w, ytr, o) => fitLR(Xtr, w, ytr, o), score: scoreModel },
  L2: {
    name: "L2", provenance: "window-prims fitMLP (STAND-IN: sparse lazy Adam, hidden 64 ReLU, 30 epochs)",
    fitPath(Xtr, w, ytr, { K, Xsel, ysel, grid = LAMBDA_GRID, weights = null, seed = 1 }) {
      let best = null;
      for (const lambda of grid) {
        const model = fitMLP(Xtr, w, ytr, { K, lambda, weights, seed });
        const ce = meanOver(scoreMLP(model, Xsel, ysel).loss, ysel);
        if (!best || ce < best.ce) best = { model, ce, lambda };
      }
      return best;
    },
    fitAt: (Xtr, w, ytr, o) => fitMLP(Xtr, w, ytr, o),
    score: scoreModel,
  },
};

// ---------------------------------------------------------------------------------------------------------------
// unsupervised class induction (design 2.4): PPMI at offsets -2,-1,+1,+2 -> randomised SVD -> spherical k-means;
// K* = the largest K in the ladder whose split-half ARI exceeds the 95th percentile of the same statistic on
// within-sentence-shuffled halves (the repo's perturbation null); d = K. K* = 1 is the typed gap no_unsup_conclusion.
export function adjustedRand(a, b) {
  const n = a.length; if (n < 2) return 0;
  const ca = new Map(), cb = new Map(), cab = new Map();
  for (let i = 0; i < n; i++) {
    ca.set(a[i], (ca.get(a[i]) ?? 0) + 1); cb.set(b[i], (cb.get(b[i]) ?? 0) + 1);
    const key = a[i] * 4096 + b[i]; cab.set(key, (cab.get(key) ?? 0) + 1);
  }
  const c2 = (x) => (x * (x - 1)) / 2;
  let sab = 0, sa = 0, sb = 0;
  for (const v of cab.values()) sab += c2(v);
  for (const v of ca.values()) sa += c2(v);
  for (const v of cb.values()) sb += c2(v);
  const exp = (sa * sb) / c2(n), mx = (sa + sb) / 2;
  return mx - exp === 0 ? 0 : (sab - exp) / (mx - exp);
}
function orthonormalise(Q, nr, nc) { // modified Gram-Schmidt, columns of Q (row-major nr x nc)
  for (let j = 0; j < nc; j++) {
    for (let p = 0; p < j; p++) { let d = 0; for (let i = 0; i < nr; i++) d += Q[i * nc + j] * Q[i * nc + p]; for (let i = 0; i < nr; i++) Q[i * nc + j] -= d * Q[i * nc + p]; }
    let nrm = 0; for (let i = 0; i < nr; i++) nrm += Q[i * nc + j] ** 2; nrm = Math.sqrt(nrm);
    if (nrm < 1e-12) { for (let i = 0; i < nr; i++) Q[i * nc + j] = 0; } else for (let i = 0; i < nr; i++) Q[i * nc + j] /= nrm;
  }
}
function jacobiEigen(A, n) { // symmetric, returns { values, vectors (row-major n x n, columns = eigenvectors) }
  const V = new Float64Array(n * n); for (let i = 0; i < n; i++) V[i * n + i] = 1;
  for (let sweep = 0; sweep < 12; sweep++) {
    let off = 0; for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p * n + q] ** 2;
    if (off < 1e-18) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      const apq = A[p * n + q]; if (Math.abs(apq) < 1e-300) continue;
      const th = (A[q * n + q] - A[p * n + p]) / (2 * apq);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(1 + th * th));
      const c = 1 / Math.sqrt(1 + t * t), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k * n + p], akq = A[k * n + q]; A[k * n + p] = c * akp - s * akq; A[k * n + q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p * n + k], aqk = A[q * n + k]; A[p * n + k] = c * apk - s * aqk; A[q * n + k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k * n + p], vkq = V[k * n + q]; V[k * n + p] = c * vkp - s * vkq; V[k * n + q] = s * vkp + c * vkq; }
    }
  }
  const values = new Float64Array(n); for (let i = 0; i < n; i++) values[i] = A[i * n + i];
  return { values, vectors: V };
}
/** Sparse PPMI over a vocabulary (rows) and the same vocabulary as contexts, offsets +-1,+-2 within the sentence. */
export function ppmiMatrix(sentences, vocabIndex, offsets = [-2, -1, 1, 2]) {
  const nV = vocabIndex.size;
  const pair = new Map(); const rowSum = new Float64Array(nV), colSum = new Float64Array(nV); let tot = 0;
  for (const ids of sentences) {
    for (let i = 0; i < ids.length; i++) {
      const r = vocabIndex.get(ids[i]); if (r === undefined) continue;
      for (const o of offsets) {
        const p = i + o; if (p < 0 || p >= ids.length) continue;
        const c = vocabIndex.get(ids[p]); if (c === undefined) continue;
        const key = r * nV + c; pair.set(key, (pair.get(key) ?? 0) + 1); rowSum[r]++; colSum[c]++; tot++;
      }
    }
  }
  const rows = [], cols = [], vals = [];
  for (const [key, v] of pair) {
    const r = Math.floor(key / nV), c = key % nV;
    const pmi = Math.log((v * tot) / (rowSum[r] * colSum[c]));
    if (pmi > 0) { rows.push(r); cols.push(c); vals.push(pmi); }
  }
  // CSR by row
  const ptr = new Int32Array(nV + 1);
  for (const r of rows) ptr[r + 1]++;
  for (let i = 0; i < nV; i++) ptr[i + 1] += ptr[i];
  const fill = ptr.slice(0, nV), col = new Int32Array(rows.length), val = new Float64Array(rows.length);
  for (let e = 0; e < rows.length; e++) { const p = fill[rows[e]]++; col[p] = cols[e]; val[p] = vals[e]; }
  return { nV, ptr, col, val };
}
function spMul(A, Om, q) { // A (nV x nV sparse) * Om (nV x q dense) -> nV x q
  const Y = new Float64Array(A.nV * q);
  for (let r = 0; r < A.nV; r++) for (let e = A.ptr[r]; e < A.ptr[r + 1]; e++) { const v = A.val[e], co = A.col[e] * q; for (let j = 0; j < q; j++) Y[r * q + j] += v * Om[co + j]; }
  return Y;
}
function spMulT(A, Yv, q) { // A^T * Y
  const Z = new Float64Array(A.nV * q);
  for (let r = 0; r < A.nV; r++) for (let e = A.ptr[r]; e < A.ptr[r + 1]; e++) { const v = A.val[e], co = A.col[e] * q; for (let j = 0; j < q; j++) Z[co + j] += v * Yv[r * q + j]; }
  return Z;
}
/** Rank-d embedding of the rows of the sparse matrix (U sqrt(sigma)), rows L2-normalised. */
export function embedPPMI(A, d, rng) {
  const nV = A.nV; const rank = Math.max(1, Math.min(d, nV - 1));
  const l = Math.min(nV, rank + 5);
  const Om = new Float64Array(nV * l); for (let i = 0; i < Om.length; i++) Om[i] = gauss(rng);
  let Y = spMul(A, Om, l); orthonormalise(Y, nV, l);
  for (let it = 0; it < 2; it++) { let Z = spMulT(A, Y, l); orthonormalise(Z, nV, l); Y = spMul(A, Z, l); orthonormalise(Y, nV, l); }
  const Zt = spMulT(A, Y, l); // nV x l  (= B^T)
  const G = new Float64Array(l * l);
  for (let i = 0; i < nV; i++) for (let a = 0; a < l; a++) { const za = Zt[i * l + a]; if (za === 0) continue; for (let b = 0; b < l; b++) G[a * l + b] += za * Zt[i * l + b]; }
  const { values, vectors } = jacobiEigen(G, l);
  const order = Array.from({ length: l }, (_, i) => i).sort((a, b) => values[b] - values[a]).slice(0, rank);
  const E = new Float64Array(nV * rank);
  for (let ci = 0; ci < rank; ci++) {
    const col = order[ci], sig = Math.sqrt(Math.max(values[col], 0)), sc = Math.sqrt(sig);
    for (let i = 0; i < nV; i++) { let s = 0; for (let a = 0; a < l; a++) s += Y[i * l + a] * vectors[a * l + col]; E[i * rank + ci] = s * sc; }
  }
  for (let i = 0; i < nV; i++) { let n2 = 0; for (let c = 0; c < rank; c++) n2 += E[i * rank + c] ** 2; n2 = Math.sqrt(n2) || 1; for (let c = 0; c < rank; c++) E[i * rank + c] /= n2; }
  return { E, dim: rank };
}
/** Spherical k-means with k-means++ seeding. Returns labels (Int32Array) and the centroids. */
export function sphericalKMeans(E, n, d, K, rng, maxIter = 25) {
  K = Math.min(K, n);
  const C = new Float64Array(K * d);
  const first = Math.floor(rng() * n); for (let c = 0; c < d; c++) C[c] = E[first * d + c];
  const best = new Float64Array(n).fill(Infinity);
  for (let k = 1; k < K; k++) {
    let tot = 0;
    for (let i = 0; i < n; i++) { let dp = 0; for (let c = 0; c < d; c++) dp += E[i * d + c] * C[(k - 1) * d + c]; const dist = Math.max(0, 1 - dp); if (dist < best[i]) best[i] = dist; tot += best[i] * best[i]; }
    let r = rng() * (tot || 1), pick = n - 1;
    for (let i = 0; i < n; i++) { r -= best[i] * best[i]; if (r <= 0) { pick = i; break; } }
    for (let c = 0; c < d; c++) C[k * d + c] = E[pick * d + c];
  }
  const lab = new Int32Array(n).fill(-1);
  for (let it = 0; it < maxIter; it++) {
    let changed = 0;
    for (let i = 0; i < n; i++) {
      let bk = 0, bv = -Infinity;
      for (let k = 0; k < K; k++) { let dp = 0; const o = k * d; for (let c = 0; c < d; c++) dp += E[i * d + c] * C[o + c]; if (dp > bv) { bv = dp; bk = k; } }
      if (lab[i] !== bk) { lab[i] = bk; changed++; }
    }
    if (!changed) break;
    C.fill(0); const cnt = new Int32Array(K);
    for (let i = 0; i < n; i++) { const k = lab[i]; cnt[k]++; for (let c = 0; c < d; c++) C[k * d + c] += E[i * d + c]; }
    for (let k = 0; k < K; k++) {
      if (!cnt[k]) { const j = Math.floor(rng() * n); for (let c = 0; c < d; c++) C[k * d + c] = E[j * d + c]; continue; }
      let n2 = 0; for (let c = 0; c < d; c++) n2 += C[k * d + c] ** 2; n2 = Math.sqrt(n2) || 1; for (let c = 0; c < d; c++) C[k * d + c] /= n2;
    }
  }
  return { labels: lab, C };
}
export const INDUCTION_LADDER = Object.freeze([2, 4, 8, 16, 32, 64, 128]);
/**
 * Induce identity classes from the unlabelled streams (arrays of identities). Deterministic given seed. ARRIVALS_FLOOR = 2.
 * K candidates are limited to K <= |V|/2 (a class has at least minMembers = 2 members: structural, design 2.4/section 10).
 */
export function induceClasses(streams, { seed, ladder = INDUCTION_LADDER, minCount = 2, nNull = 20, maxIter = 25 } = {}) {
  const count = new Map();
  for (const ids of streams) for (const id of ids) count.set(id, (count.get(id) ?? 0) + 1);
  const V = [...count.keys()].filter((k) => count.get(k) >= minCount).sort();
  if (V.length < 8) return { K: 1, gap: "no_unsup_conclusion", reason: "vocabulary_too_small", vocab: V.length, classOf: new Map(), stability: [] };
  const rng = mulberry32(seed);
  const halves = (sents, r) => { const o = permutation(sents.length, r); const h = Math.floor(sents.length / 2); return [o.slice(0, h).map((k) => sents[k]), o.slice(h).map((k) => sents[k])]; };
  const countOf = (sents) => { const c = new Map(); for (const ids of sents) for (const id of ids) c.set(id, (c.get(id) ?? 0) + 1); return c; };
  const prepHalf = (sents) => {
    const c = countOf(sents);
    const vocab = [...c.keys()].filter((k) => c.get(k) >= minCount).sort();
    const vi = new Map(vocab.map((v, i) => [v, i]));
    return { vocab, vi, A: ppmiMatrix(sents, vi) };
  };
  const clusterAt = (P, K, r) => { const { E, dim } = embedPPMI(P.A, K, r); return sphericalKMeans(E, P.vocab.length, dim, K, r, maxIter).labels; };
  const arisFor = (hA, hB, K, r) => {
    const common = hA.vocab.filter((v) => hB.vi.has(v));
    if (common.length < 4 * K) return NaN;
    const la = clusterAt(hA, K, r), lb = clusterAt(hB, K, r);
    const a = common.map((v) => la[hA.vi.get(v)]), b = common.map((v) => lb[hB.vi.get(v)]);
    return adjustedRand(a, b);
  };
  const real = halves(streams, rng); const rA = prepHalf(real[0]), rB = prepHalf(real[1]);
  const nulls = [];
  for (let p = 0; p < nNull; p++) {
    const sh = streams.map((ids) => shuffleInPlace(ids.slice(), rng));
    const hh = halves(sh, rng); nulls.push([prepHalf(hh[0]), prepHalf(hh[1])]);
  }
  const stability = []; let Kstar = 1;
  const cap = Math.floor(V.length / 2);
  for (const K of ladder) {
    if (K > cap) { stability.push({ K, skipped: "K > |V|/2" }); continue; }
    const ari = arisFor(rA, rB, K, mulberry32(seedFor("induce", seed, K, "real")));
    const nullAris = nulls.map(([a, b], p) => arisFor(a, b, K, mulberry32(seedFor("induce", seed, K, "null", p)))).filter(Number.isFinite).sort((a, b) => a - b);
    const null95 = nullAris.length ? nullAris[Math.min(nullAris.length - 1, Math.ceil(0.95 * nullAris.length) - 1)] : NaN;
    const pass = Number.isFinite(ari) && Number.isFinite(null95) && ari > null95;
    stability.push({ K, ari, null95, nNull: nullAris.length, pass });
    if (pass) Kstar = K;
  }
  if (Kstar === 1) return { K: 1, gap: "no_unsup_conclusion", reason: "no_K_clears_the_null", vocab: V.length, classOf: new Map(), stability };
  const vi = new Map(V.map((v, i) => [v, i]));
  const A = ppmiMatrix(streams, vi);
  const { E, dim } = embedPPMI(A, Kstar, mulberry32(seedFor("induce", seed, "final")));
  const { labels } = sphericalKMeans(E, V.length, dim, Kstar, mulberry32(seedFor("induce", seed, "final-km")), maxIter);
  const classOf = new Map(V.map((v, i) => [v, labels[i]]));
  return { K: Kstar, classOf, vocab: V.length, stability, gap: null };
}
