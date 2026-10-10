// tests/para/_t_worlds.mjs — test-only synthetic worlds for the para family (all seeded with rngOf; no Math.random, no Date).
import { rngOf, seedOf } from "../../../lib/pocket.mjs";
const V = 5000, cdfs = new Map();
const cdfOf = (alpha) => { if (!cdfs.has(alpha)) { const c = new Float64Array(V); let s = 0; for (let i = 0; i < V; i++) { s += 1 / Math.pow(i + 1, alpha); c[i] = s; } for (let i = 0; i < V; i++) c[i] /= s; cdfs.set(alpha, c); } return cdfs.get(alpha); };
const zipf = (r, cdf = cdfOf(1)) => { const x = r(); let lo = 0, hi = V - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] >= x) hi = m; else lo = m + 1; } return lo; };
const name = (i) => { let s = "", k = i + 1; while (k > 0) { s = String.fromCharCode(97 + (k - 1) % 26) + s; k = Math.floor((k - 1) / 26); } return "w" + s; };
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

/** iid Zipf tokens; unit lengths lognormal(mu, sigma) with AR(1) autocorrelation rho of the log-length inside a document; documents closed at >= docTokens. */
export function lengthWorld({ tag, alpha = 1, tokens = 50000, mu = Math.log(9), sigma = 0.55, rho = 0, docTokens = 1000, minLen = 2, maxLen = 60 }) {
  const r = rngOf(seedOf("para-test", tag)), cdf = cdfOf(alpha), units = [], docOf = []; let n = 0, d = 0, dn = 0, z = gauss(r);
  while (n < tokens) {
    z = rho * z + Math.sqrt(1 - rho * rho) * gauss(r);
    const L = Math.max(minLen, Math.min(maxLen, Math.round(Math.exp(mu + sigma * z)))), u = [];
    for (let i = 0; i < L; i++) u.push(name(zipf(r, cdf)));
    units.push(u); docOf.push(d); n += L; dn += L; if (dn >= docTokens) { d++; dn = 0; z = gauss(r); }
  }
  return { id: tag, which: "discover", units, docOf };
}
/** Same iid tokens but a REFRAIN world: every 8th-12th unit of a document is a verbatim copy of one of 3 fixed refrains (length 6); the rest is the iid world. */
export function refrainWorld({ tag, tokens = 50000 }) {
  const w = lengthWorld({ tag, tokens }), r = rngOf(seedOf("para-test", tag, "refrain")), R = [0, 1, 2].map(() => Array.from({ length: 6 }, () => name(zipf(r))));
  for (let u = 0; u < w.units.length; u++) if (u % 10 === 7) w.units[u] = R[Math.floor(r() * 3)].slice();
  return w;
}
