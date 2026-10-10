// attackD2.mjs -- ATTACK D part 2: NEW PLANTED WORLDS built with the repo's planted machinery (loaders/_planted-core.mjs, _planted-worlds1.mjs imported unchanged), each in 3 replicates (suffix r0..r2: other documents), 100 docs x ~1000 tokens, lexicon "A".
//  iid worlds (no structure; exchangeable inside a unit, so comp.asym must stay ~0 whatever exponent / unit-length law):  iid-s0.8-D1, iid-s1.3-D2, iid-s1.6-D1, iid-s1.0-short (units 2..6), iid-s1.0-long (units 20..40), iid-lencomp (iid given the unit length: short units steep Zipf, long units flat)
//  rev     reversible rank-bin Markov chain (symmetric coupling: bins paired 0<->1 2<->3 4<->5 6<->7): company WITHOUT direction (stationary start every unit)
//  flow / flowR  the pl-markov directed 8-cycle and the same cycle reversed (company WITH direction; the two must give opposite signs)
//  grad+ / grad-  NO company at all: every token independent, but the Zipf exponent depends on the relative position in the unit (steep->flat = frequent-first; flat->steep = the reverse)
//  edge+ / edge-  NO company: interior iid Zipf(1.0); unit-initial token from the 12 commonest types and unit-final from ranks >= 100 (edge+), or the reverse (edge-)
// For each pocket: comp.asym cell (v, z; atlas protocol: halves(), 10 within-unit draws, seeds seedOf(id, which, "comp", "within-unit", k)) and condR z (does company exist?).   Output D2.json.   node attackD2.mjs
import fs from "node:fs";
import path from "node:path";
import { halves, cell, statusOf, prep, HERE, f } from "./lib.mjs";
import { validate } from "../../lib/pocket.mjs";
import { asymVar } from "./asymvar.mjs";
import { computeComp } from "../../laws/_comp_core.mjs";
import { V, NDOCS, buildDocs, lexicon, drawCdf, cdfOf, zipfW, makeLen } from "../../loaders/_planted-core.mjs";
import { D1, D2, zA, PI, EDGES, FLOW } from "../../loaders/_planted-worlds1.mjs";
const REPS = 3, NB = EDGES.length - 1, zw = zipfW(V, 1.0);
const uni = (lo, hi) => (rnd) => lo + Math.floor(rnd() * (hi - lo + 1)), SHORT = uni(2, 6), LONG = uni(20, 40);
const iid = (cdf, len) => (rng) => () => { const L = len(rng), u = []; for (let k = 0; k < L; k++) u.push(drawCdf(cdf, rng())); return u; };
const zCache = new Map(), zS = (s) => { const k = s.toFixed(2); if (!zCache.has(k)) zCache.set(k, cdfOf(zipfW(V, s))); return zCache.get(k); };
function ipf(A) {
  let J = A.map((r) => r.slice());
  for (let it = 0; it < 2000; it++) { J = J.map((row, i) => { const s = row.reduce((a, b) => a + b, 0); return row.map((x) => (x * PI[i]) / s); }); for (let j = 0; j < NB; j++) { let s = 0; for (let i = 0; i < NB; i++) s += J[i][j]; for (let i = 0; i < NB; i++) J[i][j] *= PI[j] / s; } }
  return J.map((row, i) => { const s = row.reduce((a, b) => a + b, 0); return row.map((x) => x / s); });
}
const binCdf = Array.from({ length: NB }, (_, b) => cdfOf(zw.slice(EDGES[b], EDGES[b + 1])));
const markov = (M) => { const mc = M.map((r) => cdfOf(r)), pc = cdfOf(PI); return (rng) => () => { const L = D1(rng), u = []; let b = drawCdf(pc, rng()); for (let k = 0; k < L; k++) { if (k) b = drawCdf(mc[b], rng()); u.push(EDGES[b] + drawCdf(binCdf[b], rng())); } return u; }; };
const flowM = (flow) => ipf(Array.from({ length: NB }, (_, i) => Array.from({ length: NB }, (_, j) => 1 + 11 * (j === flow[i] ? 1 : 0)))), FLOWR = FLOW.map((_, i) => FLOW.indexOf(i)), PAIR = [1, 0, 3, 2, 5, 4, 7, 6];
const grad = (s0, s1) => (rng) => () => { const L = D1(rng), u = []; for (let i = 0; i < L; i++) { const q = L > 1 ? i / (L - 1) : 0; u.push(drawCdf(zS(Math.round((s0 + (s1 - s0) * q) * 10) / 10), rng())); } return u; };
const topC = cdfOf(zw.slice(0, 12)), rareC = cdfOf(zw.slice(100)), edge = (headTop) => (rng) => () => { const L = D1(rng), u = []; for (let i = 0; i < L; i++) u.push(i === 0 ? (headTop ? drawCdf(topC, rng()) : 100 + drawCdf(rareC, rng())) : i === L - 1 ? (headTop ? 100 + drawCdf(rareC, rng()) : drawCdf(topC, rng())) : drawCdf(zA, rng())); return u; };
const lencomp = (rng) => () => { const L = D2(rng); return Array.from({ length: L }, () => drawCdf(zS(Math.max(0.8, Math.min(1.6, 1.6 - 0.04 * L))), rng())); };
const WORLDS = [["iid-s0.8-D1", iid(zS(0.8), D1)], ["iid-s1.3-D2", iid(zS(1.3), D2)], ["iid-s1.6-D1", iid(zS(1.6), D1)], ["iid-s1.0-short", iid(zA, SHORT)], ["iid-s1.0-long", iid(zA, LONG)], ["iid-lencomp", lencomp],
  ["rev", markov(flowM(PAIR))], ["flow", markov(flowM(FLOW))], ["flowR", markov(flowM(FLOWR))], ["grad+", grad(1.5, 0.6)], ["grad-", grad(0.6, 1.5)], ["edge+", edge(true)], ["edge-", edge(false)]];
const out = []; const lex = lexicon("A");
for (const [name, dm] of WORLDS) for (let r = 0; r < REPS; r++) {
  const id = `adv-${name}-r${r}`, { units, docOf } = buildDocs(id, NDOCS, dm, lex), p = { id, group: "adv", register: "planted", language: "zxx", script: "latn", units, docOf, meta: {} }; validate(p);
  const H = halves(p), c = {}, cr = {};
  for (const w of ["discover", "confirm"]) { c[w] = cell(H[w], 10, id, w); cr[w] = cell(H[w], 10, id, w, (v) => computeComp(v).condR); }
  const row = { id, world: name, rep: r, tokens: units.reduce((a, u) => a + u.length, 0), status: statusOf(c.discover, c.confirm), vD: c.discover.v, zD: c.discover.z, vC: c.confirm.v, zC: c.confirm.z, condRz: [cr.discover.z, cr.confirm.z] };
  out.push(row); console.error(`${id} ${row.status} v ${f(row.vD, 4)}/${f(row.vC, 4)} z ${f(row.zD, 1)}/${f(row.zC, 1)} condR z ${f(row.condRz[0], 1)}/${f(row.condRz[1], 1)}`);
}
fs.writeFileSync(path.join(HERE, "D2.json"), JSON.stringify({ worlds: WORLDS.map((w) => w[0]), reps: REPS, rows: out }, null, 1));
