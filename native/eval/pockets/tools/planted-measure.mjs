// eval/pockets/tools/planted-measure.mjs — REALISED properties of the planted pockets, measured from the generated token streams with the generators' own role knowledge (lexicon index -> role).
// Used only by planted-truth.mjs. Deterministic.
import { V, lexicon } from "../loaders/_planted-core.mjs";
import { lenPmf } from "../loaders/_planted-core.mjs";
import { EDGES, FLOW, PI, MARKOV_M, BURST, BURST_W, binOfIndex } from "../loaders/_planted-worlds1.mjs";
import { FW, NAME0, NNAMES, FRAMES, FRAME_W, VOC_P, CAST, PAR, MIX_ASSIGN } from "../loaders/_planted-worlds2.mjs";
const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
const counts = (p) => { const c = new Map(); for (const u of p.units) for (const w of u) c.set(w, (c.get(w) || 0) + 1); return c; };
const ranked = (c) => [...c.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
const ols = (x, y) => { const n = x.length, mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; } return sxy / sxx; };
const pearson = (x, y) => { const n = x.length, mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n; let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return a / Math.sqrt(b * c); };
export function common(p) {
  const c = counts(p), rk = ranked(c), N = rk.reduce((a, [, k]) => a + k, 0), top = rk.slice(0, 300);
  return { tokens: N, units: p.units.length, docs: new Set(p.docOf).size, types: c.size, meanUnitLen: r4(N / p.units.length), zipfSlope300: r4(ols(top.map((_, i) => Math.log(i + 1)), top.map(([, k]) => Math.log(k)))), collisionProb: r4(rk.reduce((a, [, k]) => a + (k / N) ** 2, 0)), top3tokenShare: r4(rk.slice(0, 3).reduce((a, [, k]) => a + k, 0) / N) };
}
const streams = (p) => { const d = []; p.units.forEach((u, k) => { (d[p.docOf[k]] ||= []).push(...u); }); return d; };
export function burst(p) {
  const lags = [1, 2, 3, 5, 10, 20, 40, 60], D = streams(p), W = BURST_W.reduce((a, b) => a + b, 0), out = {};
  for (const l of lags) { let n = 0, s = 0; for (const f of D) for (let t = l; t < f.length; t++) { n++; if (f[t] === f[t - l]) s++; } out[`lag${l}`] = { measured: r4(s / n), firstOrderKernelExcess: r4((BURST.q * BURST_W[l - 1]) / W) }; }
  return { sameTypeAtLag: out, note: "measured = P(x_t == x_{t-lag}) inside a document stream (units concatenated); firstOrderKernelExcess = q*w(lag)/sum(w) is the direct-copy part only, chains of copies add to it; iid baseline = collisionProb" };
}
export function markov(p) {
  const rk = ranked(counts(p)), bin = new Map(rk.map(([w], i) => [w, EDGES.findIndex((e, b) => b < EDGES.length - 1 && i >= e && i < EDGES[b + 1])])), idx = new Map(lexicon("A").map((w, i) => [w, i]));
  const mat = (f) => { const T = Array.from({ length: 8 }, () => new Array(8).fill(0)); for (const u of p.units) for (let k = 1; k < u.length; k++) T[f(u[k - 1])][f(u[k])]++; return T.map((r) => { const s = r.reduce((a, b) => a + b, 0); return r.map((x) => x / s); }); };
  const byDesign = mat((w) => binOfIndex(idx.get(w))), byRank = mat((w) => bin.get(w)), diff = (M) => r4(Math.max(...M.flatMap((r, i) => r.map((x, j) => Math.abs(x - MARKOV_M[i][j])))));
  return { designM: MARKOV_M.map((r) => r.map(r4)), realisedMByDesignBin: byDesign.map((r) => r.map(r4)), maxAbsDiffByDesignBin: diff(byDesign), realisedMByRealisedRankBin: byRank.map((r) => r.map(r4)), maxAbsDiffByRealisedRankBin: diff(byRank), flowBin: FLOW, designFlowProb: MARKOV_M.map((r, i) => r4(r[FLOW[i]])), realisedFlowProbByDesignBin: byDesign.map((r, i) => r4(r[FLOW[i]])), realisedFlowProbByRealisedRankBin: byRank.map((r, i) => r4(r[FLOW[i]])), designDiagonal: MARKOV_M.map((r, i) => r4(r[i])), stationaryZipfMass: PI.map(r4), note: "design bins = the generator's frequency-rank bins (type index ranges, ranks 1-2, 3-7, 8-23, 24-69, 70-204, 205-594, 595-1724, 1725-5000). A reader only sees REALISED frequency ranks: in the sparse tail (counts of 1-3) sampling noise reshuffles ranks across bin edges, which attenuates the matrix recovered by realised-rank bins (see the second matrix)." };
}
export function parallel(p) {
  let n = 0, f = 0, l = 0; for (let k = 1; k < p.units.length; k++) if (p.docOf[k] === p.docOf[k - 1]) { n++; const a = p.units[k], b = p.units[k - 1]; if (a[0] === b[0]) f++; if (a[a.length - 1] === b[b.length - 1]) l++; }
  const pm = lenPmf("D1"), pge3 = pm.filter((x) => x.len >= 3).reduce((a, x) => a + x.p, 0), c = common(p).collisionProb, design = PAR.p * pge3 * 0.5;
  return { pairs: n, firstTokenEqual: r4(f / n), lastTokenEqual: r4(l / n), designedPrefixCopyRate: r4(design), impliedPrefixCopyRate: r4((f / n - c) / (1 - c)), impliedSuffixCopyRate: r4((l / n - c) / (1 - c)), note: "implied = (measured - chance collision)/(1 - chance); a unit that copies a prefix always matches its first token, chance collisions add the rest (first unit of a document is never a copy, so the implied rate is slightly below the design)" };
}
export function length(p) {
  const x = [], y = []; for (const u of p.units) { x.push(Math.log(u.length)); y.push(u.reduce((a, w) => a + w.length, 0) / u.length); }
  const rk = ranked(counts(p)).filter(([, k]) => k >= 2);
  return { pearsonLnUnitLenVsMeanStringLen: r4(pearson(x, y)), lettersPerUnitLnLen: r4(ols(x, y)), stringLenPerDecadeOfRank: r4(ols(rk.map((_, i) => Math.log10(i + 1)), rk.map(([w]) => w.length))), designStringLenPerDecade: 2.4, meanStringLen: r4(y.reduce((a, b) => a + b) / y.length), lexiconBumps: lexicon("L").bumps };
}
