// dworlds.mjs -- PLANTED WORLDS for attack D on fig.introRight (new file). Every world is built WITHOUT any first-mention (introduction) mechanism, except the two positive-control worlds
// whose mechanism is stated. Deterministic: per-document rng = rngOf(seedOf("attack-introRight-v1", worldId, "doc", d)); no Math.random, no Date.
// A world = {id, units, docOf} (the Pocket interface minus metadata). Token strings are lowercase letter+base36 codes (no punctuation, never digits-only).
import { rngOf, seedOf } from "../../lib/pocket.mjs";
import { zipfW, cdfOf, drawCdf } from "../../loaders/_planted-core.mjs";
const TAG = "attack-introRight-v1";
export const str = (cls, i) => cls + i.toString(36);
/** 1 + geometric, mean m (code-like short units), clipped to 40 */
export const shortLen = (m = 4.5) => (rnd) => { const p = 1 / (m - 0.0), u = rnd(); return Math.min(40, 1 + Math.floor(Math.log(1 - u) / Math.log(1 - 1 / (m - 0.999)))); };
export function lognormLen(mu = Math.log(9), sg = 0.55) { return (rnd) => { const g = Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd()); return Math.max(2, Math.min(45, Math.round(Math.exp(mu + sg * g)))); }; }
export function build(id, ndocs, docTokens, mkDoc) {
  const units = [], docOf = [];
  for (let d = 0; d < ndocs; d++) { const rng = rngOf(seedOf(TAG, id, "doc", d)), make = mkDoc(rng, d); let t = 0; while (t < docTokens) { const u = make(); units.push(u); docOf.push(d); t += u.length; } }
  return { id, units, docOf };
}
// ---------------------------------------------------------------------------------------------------------- Markov on rank bins (the atlas pl-markov mechanism, parametrised)
export const EDGES = [0, 2, 7, 23, 69, 204, 594, 1724, 5000], V = 5000;
export const FLOW_ORIG = [1, 3, 0, 5, 2, 7, 4, 6];
export const inverse = (f) => { const g = new Array(f.length); f.forEach((j, i) => (g[j] = i)); return g; };
export function markovSpec(flow, strength) {
  const B = EDGES.length - 1, zw = zipfW(V, 1.0), H = zw.reduce((a, b) => a + b, 0);
  const PI = Array.from({ length: B }, (_, b) => { let s = 0; for (let i = EDGES[b]; i < EDGES[b + 1]; i++) s += zw[i]; return s / H; });
  let J = Array.from({ length: B }, (_, i) => Array.from({ length: B }, (_, j) => 1 + strength * (j === flow[i] ? 1 : 0)));
  for (let it = 0; it < 2000; it++) { J = J.map((row, i) => { const s = row.reduce((a, b) => a + b, 0); return row.map((x) => (x * PI[i]) / s); }); for (let j = 0; j < B; j++) { let s = 0; for (let i = 0; i < B; i++) s += J[i][j]; for (let i = 0; i < B; i++) J[i][j] *= PI[j] / s; } }
  const M = J.map((row) => { const s = row.reduce((a, b) => a + b, 0); return row.map((x) => x / s); });
  return { MCDF: M.map((r) => cdfOf(r)), PICDF: cdfOf(PI), BINCDF: Array.from({ length: B }, (_, b) => cdfOf(zw.slice(EDGES[b], EDGES[b + 1]))) };
}
export const markovWorld = (id, flow, strength, lenFn, ndocs, docTokens = 1000) => { const S = markovSpec(flow, strength); return build(id, ndocs, docTokens, (rng) => () => { const L = lenFn(rng), u = []; let b = drawCdf(S.PICDF, rng()); for (let k = 0; k < L; k++) { if (k) b = drawCdf(S.MCDF[b], rng()); u.push(str("m", EDGES[b] + drawCdf(S.BINCDF[b], rng()))); } return u; }); };
// ---------------------------------------------------------------------------------------------------------- three-class slot grammar (code-like): keyword K, recurring identifier R, hapax-prone literal H
// Class chain per unit; the token inside a class is drawn independently of everything else (no first-mention privilege anywhere). orient "+" : hapax-prone tokens are followed by frequent keywords, recurring ones by rarer tokens;
// orient "-": the reverse. orient "0": all rows equal (no class structure).
const ROWS = {
  "+": { K: [0.2, 0.5, 0.3], R: [0.1, 0.35, 0.55], H: [0.8, 0.15, 0.05] },
  "-": { K: [0.2, 0.5, 0.3], R: [0.8, 0.15, 0.05], H: [0.1, 0.35, 0.55] },
  "0": { K: [0.35, 0.35, 0.3], R: [0.35, 0.35, 0.3], H: [0.35, 0.35, 0.3] },
};
export function slotWorld(id, orient, lenFn, ndocs, docTokens = 1000, lambda = 1) {
  const mixRow = (a, b) => a.map((x, i) => (1 - lambda) * x + lambda * b[i]);   // lambda = strength of the class grammar (1 = full orient matrix, 0 = neutral)
  const zK = cdfOf(zipfW(40, 1.2)), zR = cdfOf(zipfW(1500, 1.0)), zH = cdfOf(zipfW(20000, 1.0)), rows = { K: mixRow(ROWS["0"].K, ROWS[orient].K), R: mixRow(ROWS["0"].R, ROWS[orient].R), H: mixRow(ROWS["0"].H, ROWS[orient].H) }, cdf = { K: cdfOf(rows.K), R: cdfOf(rows.R), H: cdfOf(rows.H) }, CL = ["K", "R", "H"]; let fresh = 0;
  return build(id, ndocs, docTokens, (rng, d) => () => {
    const L = lenFn(rng), u = []; let c = CL[drawCdf(cdfOf([0.3, 0.4, 0.3]), rng())];
    for (let k = 0; k < L; k++) { if (k) c = CL[drawCdf(cdf[c], rng())]; u.push(c === "K" ? str("k", drawCdf(zK, rng())) : c === "R" ? str("r", drawCdf(zR, rng())) : rng() < 0.85 ? str("h", 100000 + d * 100000 + fresh++) : str("g", drawCdf(zH, rng()))); }
    return u;
  });
}
// ---------------------------------------------------------------------------------------------------------- positive controls WITH a stated mechanism
// iid Zipf(1.0) over 50000 types (so a long hapax tail exists); NAME-LIKE types = indices 100..4999 (mid-frequency). A name-like type that occurs >= 2 times in the world is a figure-to-be; the token after it inside the unit is overwritten by a
// frame marker (one of the 5 commonest types).  mode "first": the frame follows ONLY the first occurrence of the type in the world (a genuine introduction frame: first mention privileged).
//  mode "all": the frame follows EVERY occurrence of such a type (a type-class frame: no first-mention privilege; hapax and tail types carry no frame).
export function frameWorld(id, mode, lenFn, ndocs, docTokens = 1000) {
  const z = cdfOf(zipfW(50000, 1.0)), w = build(id, ndocs, docTokens, (rng) => () => { const L = lenFn(rng), u = []; for (let k = 0; k < L; k++) u.push(drawCdf(z, rng())); return u; });
  const cnt = new Map(); for (const u of w.units) for (const t of u) cnt.set(t, (cnt.get(t) || 0) + 1);
  const seen = new Set(), rm = rngOf(seedOf(TAG, id, "marker"));
  w.units = w.units.map((u) => { const o = u.slice(); for (let k = 0; k + 1 < u.length; k++) { const t = u[k]; if (t >= 100 && t < 5000 && cnt.get(t) >= 2) { if (mode === "all" || !seen.has(t)) o[k + 1] = Math.floor(rm() * 5); seen.add(t); } } return o; });
  w.units = w.units.map((u) => u.map((t) => str("w", t)));
  return w;
}
