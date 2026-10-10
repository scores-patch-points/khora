// laws/tests/comp/_t_worlds.mjs — inline synthetic worlds for the comp tests (the planted loader has no rigid-collocation world and no fixed-length sweep). Deterministic (rngOf/seedOf only).
import { rngOf, seedOf } from "../../../lib/pocket.mjs";
import { makeLen } from "../../../loaders/_planted-core.mjs";

const word = (i) => { let s = ""; let n = i + 1; while (n > 0) { n -= 1; s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26); } return "q" + s; }; // q + bijective base-26: distinct lowercase tokens
function zipfSampler(types, alpha, rnd) {
  const cdf = new Float64Array(types); let t = 0; for (let r = 0; r < types; r++) { t += 1 / Math.pow(r + 1, alpha); cdf[r] = t; }
  return () => { const x = rnd() * t; let lo = 0, hi = types - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < x) lo = m + 1; else hi = m; } return lo; };
}
/** iid Zipf world (no structure of any kind). len: "D1" | "D2" (planted unit-length laws) | a fixed integer length. ~1000-token documents. */
export function iidWorld(tag, nTokens, { types = 5000, alpha = 1.0, len = "D1" } = {}) {
  const rnd = rngOf(seedOf("comp-test-iid", tag)), draw = zipfSampler(types, alpha, rnd), L = typeof len === "number" ? () => len : makeLen(len);
  const units = [], docOf = []; let t = 0, d = 0, td = 0;
  while (t < nTokens) { const n = L(rnd), u = []; for (let j = 0; j < n; j++) u.push(word(draw())); units.push(u); docOf.push(d); t += n; td += n; if (td >= 1000) { d++; td = 0; } }
  return { id: `iid-${tag}`, which: "discover", units, docOf };
}
/** iid world in which every occurrence of each of 40 'head' types (ranks 30..69) is followed by its own fixed partner token (a type of rank >= 3000, so it is almost never met elsewhere):
 *  rigid-right for the 40 heads (share of eligible types ~ 40 / eligible), rigid-left for the partners that reach >= 10 occurrences. */
export function collocWorld(tag, nTokens) {
  const w = iidWorld(tag, nTokens), pair = new Map(); for (let r = 30; r < 70; r++) pair.set(word(r), word(3000 + r));
  const units = w.units.map((u) => { const o = []; for (const x of u) { o.push(x); if (pair.has(x)) o.push(pair.get(x)); } return o; });
  return { ...w, id: `colloc-${tag}`, units };
}
