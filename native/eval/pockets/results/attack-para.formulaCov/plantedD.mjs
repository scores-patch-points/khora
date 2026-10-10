// plantedD.mjs -- ATTACK D: planted worlds that lack the claimed mechanism (multiword formulaic reuse) and still reproduce the pattern, or do not.
//   node plantedD.mjs [--reps 3] [--draws 30] [--only name1,name2] [--out out/D.json]
// Every world: 100 documents of ~1000 tokens (the atlas planted size), rng per document = rngOf(seedOf(TAG, id, "doc", d)) via the repo's buildDocs; lexicon "A" (5000 strings) from the repo.
import fs from "node:fs";
import path from "node:path";
import { HERE, halves, cell, status, f, tokensOf } from "./lib.mjs";
import { V, drawCdf, cdfOf, zipfW, makeLen, buildDocs, lexicon, NDOCS } from "../../loaders/_planted-core.mjs";
import { rngOf, seedOf } from "../../lib/pocket.mjs";
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const REPS = Number(opt("--reps", 3)), DRAWS = Number(opt("--draws", 30)), only = opt("--only", null)?.split(","), OUT = path.join(HERE, opt("--out", "out/D.json"));
const D1 = makeLen("D1"), D2 = makeLen("D2"), constLen = (n) => () => n;
const zcdf = (a, n = V) => cdfOf(zipfW(n, a));
const iidUnit = (rng, len, cdf) => { const L = len(rng), u = []; for (let k = 0; k < L; k++) u.push(drawCdf(cdf, rng())); return u; };
const iid = (a, len, n = V) => ({ docMaker: (rng) => { const c = zcdf(a, n); return () => iidUnit(rng, len, c); } });
// ---- order structure WITHOUT multiword formulas -------------------------------------------------------------------------------------------------
const sorted = (a, len) => ({ docMaker: (rng) => { const c = zcdf(a); return () => iidUnit(rng, len, c).sort((x, y) => x - y); } });                       // iid bag, then ascending by type index
const runs = (a, len, p) => ({ docMaker: (rng) => { const c = zcdf(a); return () => { const L = len(rng), u = []; while (u.length < L) { const t = drawCdf(c, rng()); let r = 1; while (rng() < p && r < 12) r++; for (let k = 0; k < r && u.length < L; k++) u.push(t); } return u; }; } }); // stutter runs
const dupWithin = (a, len, p) => ({ docMaker: (rng) => { const c = zcdf(a), seen = []; return () => { if (seen.length && rng() < p) return seen[Math.floor(rng() * seen.length)].slice(); const u = iidUnit(rng, len, c); seen.push(u); return u; }; } });
const POOLS = new Map(); const pool = (k, a, len) => { if (!POOLS.has(k)) { const r = rngOf(seedOf("advD", "pool", k)), c = zcdf(a), P = []; for (let i = 0; i < 20; i++) P.push(iidUnit(r, len, c)); POOLS.set(k, P); } return POOLS.get(k); };
const boiler = (a, len, p) => ({ docMaker: (rng) => { const c = zcdf(a), P = pool("b", a, len); return () => (rng() < p ? P[Math.floor(rng() * P.length)].slice() : iidUnit(rng, len, c)); } });   // licence-header style: a fixed pool of 20 units shared by all documents
// first-order Markov chain over 8 frequency-rank bins with a one-way flow of adjustable strength; words iid Zipf(1.0) inside a bin (the atlas pl-markov recipe, weaker strengths)
const EDGES = [0, 2, 7, 23, 69, 204, 594, 1724, 5000], FLOW = [1, 3, 0, 5, 2, 7, 4, 6], B = 8;
function flowWorld(strength, len = D1) {
  const zw = zipfW(V, 1.0), Hh = zw.reduce((a, b) => a + b, 0), PI = Array.from({ length: B }, (_, b) => { let s = 0; for (let i = EDGES[b]; i < EDGES[b + 1]; i++) s += zw[i]; return s / Hh; });
  let J = Array.from({ length: B }, (_, i) => Array.from({ length: B }, (_, j) => 1 + strength * (j === FLOW[i] ? 1 : 0)));
  for (let it = 0; it < 2000; it++) { J = J.map((row, i) => { const s = row.reduce((a, b) => a + b, 0); return row.map((x) => (x * PI[i]) / s); }); for (let j = 0; j < B; j++) { let s = 0; for (let i = 0; i < B; i++) s += J[i][j]; for (let i = 0; i < B; i++) J[i][j] *= PI[j] / s; } }
  const MC = J.map((row) => { const s = row.reduce((a, b) => a + b, 0); return cdfOf(row.map((x) => x / s)); }), PIC = cdfOf(PI), BC = Array.from({ length: B }, (_, b) => cdfOf(zw.slice(EDGES[b], EDGES[b + 1])));
  return { docMaker: (rng) => () => { const L = len(rng), u = []; let b = drawCdf(PIC, rng()); for (let k = 0; k < L; k++) { if (k) b = drawCdf(MC[b], rng()); u.push(EDGES[b] + drawCdf(BC[b], rng())); } return u; } };
}
// skeleton world: function-like slots from 12 types with a sparse first-order Markov chain (2 successors each), content-like slots uniform over 4000 other types (so no content-bearing 4-gram can recur by design)
const skeleton = (pF, len = D1) => ({ docMaker: (rng) => { const succ = Array.from({ length: 12 }, (_, i) => [(i * 5 + 1) % 12, (i * 7 + 3) % 12]); return () => { const L = len(rng), u = []; let s = Math.floor(rng() * 12); for (let k = 0; k < L; k++) { if (rng() < pF) { s = succ[s][rng() < 0.7 ? 0 : 1]; u.push(s); } else u.push(100 + Math.floor(rng() * 4000)); } return u; }; } });
export const WORLDS = [
  ["iid_a0.6_D1", iid(0.6, D1)], ["iid_a1.0_D1", iid(1.0, D1)], ["iid_a1.3_D1", iid(1.3, D1)], ["iid_a1.6_D1", iid(1.6, D1)], ["iid_a2.0_D1", iid(2.0, D1)],
  ["iid_a1.3_D2", iid(1.3, D2)], ["iid_a1.3_L6", iid(1.3, constLen(6))], ["iid_a1.3_L40", iid(1.3, constLen(40))],
  ["iid_a1.0_V300_D1", iid(1.0, D1, 300)], ["iid_a1.0_V50_D1", iid(1.0, D1, 50)], ["iid_a1.5_V50_L6", iid(1.5, constLen(6), 50)], ["iid_a1.0_V20_L4", iid(1.0, constLen(4), 20)],
  ["sorted_a1.0_D2", sorted(1.0, D2)], ["runs_a1.0_p0.5", runs(1.0, D2, 0.5)], ["flow_s3", flowWorld(3)], ["flow_s11", flowWorld(11)],
  ["dupWithin_a1.0_p0.05", dupWithin(1.0, D2, 0.05)], ["dupWithin_a1.0_p0.2", dupWithin(1.0, D2, 0.2)], ["boiler_a1.0_p0.1", boiler(1.0, D2, 0.1)],
  ["skeleton_pF0.5", skeleton(0.5)], ["skeleton_pF0.3", skeleton(0.3)],
];
const res = []; const lex = lexicon("A");
for (const [name, spec] of WORLDS) {
  if (only && !only.includes(name)) continue;
  for (let r = 0; r < REPS; r++) {
    const id = `adv-${name}-r${r}`, { units, docOf } = buildDocs(id, NDOCS, spec.docMaker, lex), p = { id, units, docOf }, H = halves(p), c = {};
    for (const w of ["discover", "confirm"]) c[w] = cell(H[w], id, w, DRAWS, "advD");
    // atlas-style status from the FIRST 10 draws only (what the atlas would have seen)
    const c10 = {}; for (const w of ["discover", "confirm"]) c10[w] = cell(H[w], id, w, 10, "advD");
    const st = status(c10.discover, c10.confirm), stExt = status(c.discover, c.confirm);
    res.push({ world: name, rep: r, id, tokens: tokensOf(units), meanUnitLength: tokensOf(units) / units.length, status10: st.s, statusExt: stExt.s, shifted: st.shifted ?? null, discover: c.discover, confirm: c.confirm, z10: [c10.discover.z, c10.confirm.z] });
    console.error(`${id} v=${f(c.discover.v, 4)}/${f(c.confirm.v, 4)} null=${f(c.discover.nullMean, 4)} z10=${f(c10.discover.z, 1)}/${f(c10.confirm.z, 1)} ${st.s}`);
  }
}
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
