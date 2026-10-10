// native/eval/law/planted-util.mjs — seeded utilities for the planted languages (eval/law/planted.mjs).
// Pre-registration: the header of planted.mjs governs every definition used here; this file holds only
// deterministic, dependency-free helpers (seeds, a seeded stream, Zipf sampling, strings, small statistics).
// No Math.random anywhere: every draw is a pure function of sha256("khora-law-v2" 0x1f parts...).

import { createHash } from "node:crypto";

export const ROOT = "khora-law-v2";
export const LN2 = Math.LN2;
export const PROB_FLOOR = 1e-4;                       // design 2.8: probabilities floored at 1e-4 and renormalised

export function sha256hex(text) { return createHash("sha256").update(text).digest("hex"); }

/** sha256 over (ROOT, ...parts) joined by 0x1f (the join corpus.mjs::seedFor uses). */
export function seedDigest(...parts) {
  return createHash("sha256").update([ROOT, ...parts.map(String)].join("\x1f")).digest();
}
/** uint32 seed: first 32 bits of the digest (same value as corpus.mjs::seedFor for the same parts). */
export function seedFor(...parts) { return seedDigest(...parts).readUInt32BE(0) >>> 0; }

function sfc32(a, b, c, d) {
  return function next() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** A seeded stream. Everything a generator needs, as methods; `child(...)` forks a named independent stream. */
export function makeRng(...parts) {
  const dg = seedDigest(...parts);
  const u = sfc32(dg.readUInt32BE(0), dg.readUInt32BE(4), dg.readUInt32BE(8), dg.readUInt32BE(12));
  for (let i = 0; i < 16; i++) u();
  const rng = {
    parts,
    u,
    int(n) { return Math.floor(u() * n); },
    range(lo, hi) { return lo + Math.floor(u() * (hi - lo + 1)); },
    bernoulli(p) { return u() < p; },
    normal() {
      let a = 0; while (a === 0) a = u();
      return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * u());
    },
    /** Knuth's product method (exact for the small lambdas used here). */
    poisson(lambda) {
      const L = Math.exp(-lambda);
      let k = 0, p = 1;
      do { k++; p *= u(); } while (p > L && k < 400);
      return k - 1;
    },
    pick(arr) { return arr[Math.floor(u() * arr.length)]; },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(u() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
      return arr;
    },
    perm(n) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = i; return rng.shuffle(a); },
    child(...more) { return makeRng(...parts, ...more); },
  };
  return rng;
}

// ───────────────────────── Zipf and categorical sampling ─────────────────────────

/** Cumulative distribution of p(rank r) proportional to r^-s, r = 1..n. */
export function zipfCdf(n, s = 1.0) {
  const cdf = new Float64Array(n);
  let z = 0;
  for (let r = 1; r <= n; r++) z += Math.pow(r, -s);
  let acc = 0;
  for (let r = 1; r <= n; r++) { acc += Math.pow(r, -s) / z; cdf[r - 1] = acc; }
  cdf[n - 1] = 1;
  return cdf;
}
export function cdfOf(weights) {
  const n = weights.length;
  const cdf = new Float64Array(n);
  let z = 0;
  for (let i = 0; i < n; i++) z += weights[i];
  let acc = 0;
  for (let i = 0; i < n; i++) { acc += weights[i] / z; cdf[i] = acc; }
  cdf[n - 1] = 1;
  return cdf;
}
/** Index drawn from a CDF by binary search. */
export function drawCdf(cdf, uni) {
  let lo = 0, hi = cdf.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] >= uni) hi = mid; else lo = mid + 1; }
  return lo;
}

// ───────────────────────── strings: per-language random alphabets ─────────────────────────

const BLOCKS = [
  [0x61, 26],      // Latin a-z
  [0x3b1, 24],     // Greek alpha-omega (skipping final sigma is harmless: lowercase only)
  [0x430, 32],     // Cyrillic a-ya
  [0x10d0, 33],    // Georgian Mkhedruli
  [0x561, 38],     // Armenian
];
/** A random alphabet of `size` distinct lowercase letters drawn from one random script block (per language). */
export function makeAlphabet(rng, size = 22) {
  const [base, len] = rng.pick(BLOCKS);
  const idx = rng.perm(len).slice(0, Math.min(size, len));
  return idx.map((i) => String.fromCodePoint(base + i));
}
export function randomString(rng, alphabet, len) {
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[rng.int(alphabet.length)];
  return s;
}
/** `count` distinct random strings; lengths 2 + geometric(mean ~2.2), capped at maxLen. Identity-safe (NFC lowercase). */
export function uniqueForms(rng, alphabet, count, { minLen = 2, maxLen = 10, taken = null } = {}) {
  const seen = taken ?? new Set();
  const out = [];
  let guard = 0;
  while (out.length < count) {
    if (++guard > count * 200 + 1000) throw new Error("uniqueForms: alphabet too small for the requested number of forms");
    const g = Math.floor(-Math.log(1 - rng.u()) * 2.2);
    const len = Math.min(maxLen, minLen + g + (guard > count * 20 ? 2 : 0));
    const f = randomString(rng, alphabet, len).normalize("NFC").toLowerCase();
    if (seen.has(f)) continue;
    seen.add(f);
    out.push(f);
  }
  return out;
}

// ───────────────────────── small statistics ─────────────────────────

export const log2 = (x) => Math.log(x) / LN2;
export function mean(a) { let s = 0; for (const x of a) s += x; return a.length ? s / a.length : NaN; }
export function sd(a) { if (a.length < 2) return 0; const m = mean(a); let s = 0; for (const x of a) s += (x - m) * (x - m); return Math.sqrt(s / (a.length - 1)); }
export function quantile(arr, q) {
  if (!arr.length) return NaN;
  const a = Array.from(arr).sort((x, y) => x - y);
  const pos = (a.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return a[lo] + (a[hi] - a[lo]) * (pos - lo);
}
/** Entropy in bits of a count vector (Map or array). */
export function entropyBits(counts) {
  const vals = counts instanceof Map ? [...counts.values()] : Array.from(counts);
  let n = 0; for (const c of vals) n += c;
  if (!n) return 0;
  let h = 0; for (const c of vals) if (c > 0) h -= (c / n) * log2(c / n);
  return h;
}
/** Binomial CDF P(X <= k), exact by summation in log space. */
export function binomCdf(k, n, p) {
  if (k < 0) return 0;
  if (k >= n) return 1;
  if (p <= 0) return 1;
  if (p >= 1) return 0;
  let lg = 0; const lf = [0]; for (let i = 1; i <= n; i++) { lg += Math.log(i); lf.push(lg); }
  let s = 0;
  for (let i = 0; i <= k; i++) s += Math.exp(lf[n] - lf[i] - lf[n - i] + i * Math.log(p) + (n - i) * Math.log(1 - p));
  return Math.min(1, s);
}
/** Lower one-sided (1 - alpha) Clopper-Pearson bound for k successes in n trials, by bisection. */
export function clopperPearsonLower(k, n, alpha = 0.05) {
  if (k <= 0) return 0;
  if (k >= n) return Math.pow(alpha, 1 / n);
  let lo = 0, hi = 1;
  for (let it = 0; it < 80; it++) {
    const mid = (lo + hi) / 2;
    // P(X >= k | p = mid) = 1 - cdf(k - 1); lower bound is the p where this equals alpha
    if (1 - binomCdf(k - 1, n, mid) > alpha) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}
/** Smallest k with P(Binomial(N, 1 - piLo) > k) <= 0.01 (design 2.10(6)). */
export function toleranceK(N, piLo, tail = 0.01) {
  for (let k = 0; k <= N; k++) if (1 - binomCdf(k, N, 1 - piLo) <= tail) return k;
  return N;
}
/** Binary entropy in bits. */
export function h2(p) { if (p <= 0 || p >= 1) return 0; return -p * log2(p) - (1 - p) * log2(1 - p); }
/** Solve h2-based information 1 - h2(pi) = bits for pi in [0.5, 1) by bisection. */
export function piForBits(bits) {
  if (bits <= 0) return 0.5;
  if (bits >= 1) return 1;
  let lo = 0.5, hi = 1;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (1 - h2(mid) < bits) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/**
 * Finite-sample Bayes lookup oracle (design 2.8, Appendix A): the cross-entropy, in bits per token on the test
 * tokens, of the table P(role | key) estimated on the training tokens with add-1/2 smoothing, probabilities floored
 * at PROB_FLOOR and renormalised. Keys unseen in training fall back to the training class prior (the finite-sample
 * part). `ceMaj` is the cross-entropy of that prior. G = ceMaj - ce, in bits.
 */
export function lookupOracle(trainKeys, trainRoles, testKeys, testRoles, R) {
  const prior = new Float64Array(R);
  const table = new Map();
  for (let i = 0; i < trainKeys.length; i++) {
    const k = trainKeys[i], r = trainRoles[i];
    prior[r]++;
    let row = table.get(k); if (!row) { row = new Float64Array(R); table.set(k, row); }
    row[r]++;
  }
  const nTr = trainKeys.length;
  const norm = (vec, add) => {
    const p = new Float64Array(R); let z = 0;
    for (let r = 0; r < R; r++) { p[r] = vec[r] + add; z += p[r]; }
    for (let r = 0; r < R; r++) p[r] /= z;
    let z2 = 0; for (let r = 0; r < R; r++) { if (p[r] < PROB_FLOOR) p[r] = PROB_FLOOR; z2 += p[r]; }
    for (let r = 0; r < R; r++) p[r] /= z2;
    return p;
  };
  const pPrior = norm(prior, nTr ? 1e-9 : 1);
  const pRows = new Map();
  for (const [k, row] of table) pRows.set(k, norm(row, 0.5));
  let ce = 0, ceMaj = 0;
  for (let i = 0; i < testKeys.length; i++) {
    const r = testRoles[i];
    const p = pRows.get(testKeys[i]) ?? pPrior;
    ce -= log2(p[r]);
    ceMaj -= log2(pPrior[r]);
  }
  const n = testKeys.length || 1;
  return { ce: ce / n, ceMaj: ceMaj / n, G: (ceMaj - ce) / n, n: testKeys.length, cells: table.size, seenShare: testKeys.length ? testKeys.reduce((a, k) => a + (table.has(k) ? 1 : 0), 0) / testKeys.length : 0 };
}
