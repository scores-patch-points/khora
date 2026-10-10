// attackD.mjs -- ATTACK D (planted worlds WITHOUT the claimed mechanism; new worlds, nothing in the repo is edited). Generators are seeded (rngOf/seedOf, namespace "attackD-rc"); no Math.random, no Date.
//  D1 CALIBRATION GRID of iid worlds (no structure at all): Zipf exponent {0.8,1.0,1.4} x vocabulary {50,400,5000,40000} x unit-length law {const 3, const 8, lognormal (median 9), shifted exponential (mean 14), bimodal 3|30}
//     x length-coupled bag {no, yes: long units draw from a flatter Zipf, short units from a steeper one = bag-level length-rarity link, no order}. 60,000 tokens, 40 documents. Cell = atlas cell (10 draws) plus a 100-draw z.
//  D2 SEGMENTATION WORLDS: an iid Zipf(1.0, 5000 types) token stream with NO order structure is cut into units by a content-dependent boundary rule: between tokens t_k and t_{k+1} a boundary falls with hazard
//     1-(1-base)(1-b[t_k rare])(1-d[t_k freq])(1-c[t_{k+1} rare])(1-a[t_{k+1} freq]), rare = type index >= 250, freq = index < 10, base 0.06. Knobs a,b,c,d in {0, 0.35} (16 worlds) plus 2 strong worlds. Same 60,000 tokens / 40 docs.
//  D3 the repo's planted worlds built for OTHER laws (pl-frames, pl-mix, pl-markov, pl-burst, pl-parallel, pl-length, pl-null, pl-null2): rareCurve decomposed into left / right contributions.
//   node attackD.mjs [part]  part in {D1,D2,D3} -> D_<part>.json
import fs from "node:fs";
import path from "node:path";
import { HERE, rngOf, seedOf, halves, prep, rcSums, rcValue, shuffledXs, cell, statusOf } from "./lib.mjs";
const PART = process.argv[2] || "D2";
const zipfCdf = (V, s) => { const c = new Float64Array(V); let t = 0; for (let i = 0; i < V; i++) { t += Math.pow(i + 1, -s); c[i] = t; } for (let i = 0; i < V; i++) c[i] /= t; c[V - 1] = 1; return c; };
const draw = (cdf, u) => { let lo = 0, hi = cdf.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] > u) hi = m; else lo = m + 1; } return lo; };
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const LENS = { c3: (r) => 3, c8: (r) => 8, logn: (r) => Math.max(2, Math.min(45, Math.round(Math.exp(Math.log(9) + 0.55 * gauss(r))))), expo: (r) => Math.min(70, 2 + Math.floor(-Math.log(1 - r()) * 12)), bimodal: (r) => (r() < 0.5 ? 3 : 30) };
const N = 60000, NDOC = 40;
const decomp = (units, docOf, id) => {
  const H = halves({ id, units, docOf }), res = {};
  for (const w of ["discover", "confirm"]) {
    const P = prep(H[w]); if (P.N < 2000 || P.V < 30) { res[w] = null; continue; }
    const S = rcSums(P.xs, P.unitStart, P.U), v = rcValue(S), dn = Math.sqrt(S.Sxx * S.Sqq), nul = [], nuL = [], nuR = [];
    for (let k = 0; k < 10; k++) { const T = rcSums(shuffledXs(P, seedOf(id, w, "order", "within-unit", k)), P.unitStart, P.U); nul.push(rcValue(T)); nuL.push(T.SxqL / Math.sqrt(T.Sxx * T.Sqq)); nuR.push(T.SxqR / Math.sqrt(T.Sxx * T.Sqq)); }
    const z = (x, a) => { const m = a.reduce((p, q) => p + q, 0) / a.length, s = Math.sqrt(a.reduce((p, q) => p + (q - m) ** 2, 0) / (a.length - 1)); return s > 0 ? (x - m) / s : null; };
    res[w] = { v, z: z(v, nul), cL: S.SxqL / dn, cLz: z(S.SxqL / dn, nuL), cR: S.SxqR / dn, cRz: z(S.SxqR / dn, nuR), N: P.N, V: P.V, mul: P.N / P.U };
  }
  return res;
};
const row = (r) => ({ vD: r.discover?.v, vC: r.confirm?.v, zD: r.discover?.z, zC: r.confirm?.z, cL: [r.discover?.cL, r.confirm?.cL], cR: [r.discover?.cR, r.confirm?.cR], status: r.discover && r.confirm ? statusOf(r.discover, r.confirm) : "undef", mul: r.discover?.mul, N: [r.discover?.N, r.confirm?.N], V: [r.discover?.V, r.confirm?.V] });
// ---------- D1
if (PART === "D1") {
  const out = [];
  for (const s of [0.8, 1.0, 1.4]) for (const V of [50, 400, 5000, 40000]) for (const ln of Object.keys(LENS)) for (const coupled of [false, true]) {
    const id = `D1-s${s}-V${V}-${ln}-${coupled ? "cpl" : "iid"}`, cdf = zipfCdf(V, s), cdfFlat = zipfCdf(V, 0.6), cdfSteep = zipfCdf(V, 1.6), units = [], docOf = [];
    for (let d = 0; d < NDOC; d++) { const rnd = rngOf(seedOf("attackD-rc", id, d)); let tok = 0; while (tok < N / NDOC) { const L = LENS[ln](rnd), c = !coupled ? cdf : L >= 9 ? cdfFlat : cdfSteep, u = []; for (let k = 0; k < L; k++) u.push("w" + draw(c, rnd())); units.push(u); docOf.push(d); tok += L; } }
    const H = halves({ id, units, docOf }), cc = [cell(H.discover, { draws: 10 }), cell(H.confirm, { draws: 10 })], c100 = [cell(H.discover, { draws: 100 }), cell(H.confirm, { draws: 100 })];
    out.push({ id, s, V, len: ln, coupled, tokens: [cc[0]?.N, cc[1]?.N], vD: cc[0]?.v, vC: cc[1]?.v, zD: cc[0]?.z, zC: cc[1]?.z, status: cc[0] && cc[1] ? statusOf(cc[0], cc[1]) : "undef", z100D: c100[0]?.z, z100C: c100[1]?.z });
  }
  const abs4 = out.flatMap((o) => [o.zD, o.zC]).filter(Number.isFinite).filter((z) => Math.abs(z) >= 4).length, cells = out.flatMap((o) => [o.zD, o.zC]).filter(Number.isFinite).length;
  const st = out.reduce((a, o) => { a[o.status] = (a[o.status] || 0) + 1; return a; }, {});
  fs.writeFileSync(path.join(HERE, "D_D1.json"), JSON.stringify({ worlds: out.length, halfCells: cells, absZ10ge4: abs4, statusCounts: st, maxAbsV: Math.max(...out.flatMap((o) => [o.vD, o.vC]).filter(Number.isFinite).map(Math.abs)), maxAbsZ10: Math.max(...out.flatMap((o) => [o.zD, o.zC]).filter(Number.isFinite).map(Math.abs)), maxAbsZ100: Math.max(...out.flatMap((o) => [o.z100D, o.z100C]).filter(Number.isFinite).map(Math.abs)), rows: out }, null, 1));
  console.log(JSON.stringify({ worlds: out.length, halfCells: cells, absZ10ge4: abs4, st, undef: out.filter((o) => o.status === "undef").map((o) => o.id) }));
}
// ---------- D2
if (PART === "D2") {
  const V = 5000, cdf = zipfCdf(V, 1.0), RARE = 250, FREQ = 10, BASE = 0.06, out = [];
  const knobs = []; for (const a of [0, 0.35]) for (const b of [0, 0.35]) for (const c of [0, 0.35]) for (const d of [0, 0.35]) knobs.push({ a, b, c, d });
  knobs.push({ a: 0.8, b: 0, c: 0, d: 0.8 }, { a: 0, b: 0.8, c: 0.8, d: 0 });
  for (const k of knobs) {
    const id = `D2-a${k.a}-b${k.b}-c${k.c}-d${k.d}`, units = [], docOf = [];
    for (let doc = 0; doc < NDOC; doc++) {
      const rnd = rngOf(seedOf("attackD-rc", "D2stream", doc)), cutRnd = rngOf(seedOf("attackD-rc", id, doc)); // the token stream is IDENTICAL across worlds; only the cut rule changes
      let cur = [], prev = -1, tok = 0;
      while (tok < N / NDOC) {
        const t = draw(cdf, rnd()); tok++;
        if (prev >= 0) {
          let keep = 1 - BASE; if (prev >= RARE) keep *= 1 - k.b; if (prev < FREQ) keep *= 1 - k.d; if (t >= RARE) keep *= 1 - k.c; if (t < FREQ) keep *= 1 - k.a;
          if (cutRnd() > keep) { units.push(cur); docOf.push(doc); cur = []; }
        }
        cur.push("w" + t); prev = t;
      }
      if (cur.length) { units.push(cur); docOf.push(doc); }
    }
    out.push({ id, ...k, ...row(decomp(units, docOf, id)) });
  }
  fs.writeFileSync(path.join(HERE, "D_D2.json"), JSON.stringify({ note: "iid Zipf(1.0,5000) token stream, identical in every world; units cut by a content-dependent boundary hazard (see header). rare = index >= 250 (mass ~0.33), freq = index < 10 (mass ~0.32).", worlds: out }, null, 1));
  for (const o of out) console.log(o.id.padEnd(30), "v", (o.vD ?? NaN).toFixed(3), (o.vC ?? NaN).toFixed(3), "z", (o.zD ?? NaN).toFixed(1), (o.zC ?? NaN).toFixed(1), o.status, "cL", (o.cL[0] ?? NaN).toFixed(3), "cR", (o.cR[0] ?? NaN).toFixed(3), "mul", (o.mul ?? NaN).toFixed(1));
}
// ---------- D3
if (PART === "D3") {
  const { load } = await import("../../loaders/planted.mjs"), ps = await load(null), out = [];
  for (const p of ps) out.push({ id: p.id, ...row(decomp(p.units, p.docOf, p.id)) });
  fs.writeFileSync(path.join(HERE, "D_D3.json"), JSON.stringify(out, null, 1));
  for (const o of out) console.log(o.id.padEnd(12), "v", (o.vD ?? NaN).toFixed(3), (o.vC ?? NaN).toFixed(3), "z", (o.zD ?? NaN).toFixed(1), (o.zC ?? NaN).toFixed(1), o.status, "cL", (o.cL[0] ?? NaN).toFixed(3), "cR", (o.cR[0] ?? NaN).toFixed(3), "mul", (o.mul ?? NaN).toFixed(1));
}
