// size, unit-length, determinism, script-invariance, synthetic-collocation and timing checks of the comp family. node run-checks.mjs > results-checks.json
import * as fam from "../../comp.mjs";
import { iidWorld, collocWorld } from "./_t_worlds.mjs";
import { bookView, atlasCells, cpuMs, round, tokensOf, regroup, mapChars } from "./_t_util.mjs";
import { prep } from "../../_comp_prep.mjs";
import { neighbourTypeStats } from "../../_comp_neigh.mjs";
const ids = fam.STATS.map((s) => s.id), mean = (a) => (a.length ? a.reduce((p, q) => p + q, 0) / a.length : null);
const rank = (a) => { const ix = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length); ix.forEach(([, i], k) => { r[i] = k; }); return r; };
const spearman = (x, y) => { if (x.length < 3) return null; const a = rank(x), b = rank(y), ma = mean(a), mb = mean(b); let sab = 0, saa = 0, sbb = 0; a.forEach((v, i) => { sab += (v - ma) * (b[i] - mb); saa += (v - ma) ** 2; sbb += (b[i] - mb) ** 2; }); return saa && sbb ? sab / Math.sqrt(saa * sbb) : null; };
const out = { note: "see header of each section" };
function sweep(label, points, mk, reps) { // points: x values; mk(x, rep) -> view ; returns per-stat mean v per point and Spearman(v, x) over the points
  const table = {}; for (const id of ids) table[id] = [];
  for (const x of points) { const acc = {}; for (const id of ids) acc[id] = []; for (let r = 0; r < reps; r++) { const c = fam.compute(mk(x, r)); for (const id of ids) if (c[id] != null) acc[id].push(c[id]); } for (const id of ids) table[id].push(mean(acc[id])); }
  const res = {}; for (const id of ids) { const ok = points.map((x, i) => [x, table[id][i]]).filter(([, v]) => v != null); res[id] = { means: table[id].map((v) => round(v, 4)), spearman: round(spearman(ok.map((p) => p[0]), ok.map((p) => p[1])), 2), definedPoints: ok.length }; }
  return { label, points, perStat: res };
}
const GE = "01-literature-books/gitenberg/pg1400_Great-Expectations.txt";
out.sizeIid = sweep("iid Zipf(1.0) D1 world, 6 replicates per size; x = tokens", [10000, 20000, 40000, 80000, 150000], (n, r) => iidWorld(`sz${n}_${r}`, n), 6);
const ge = bookView(GE, "ge", 190000), capAt = (n) => { let t = 0, e = 0; while (e < ge.units.length && t < n) t += ge.units[e++].length; return { ...ge, units: ge.units.slice(0, e), docOf: ge.docOf.slice(0, e) }; };
out.sizeReal = sweep("Great Expectations prefix of x tokens (one text, one replicate)", [10000, 20000, 40000, 80000, 150000], (n) => capAt(n), 1);
out.lenIid = sweep("iid Zipf(1.0) world with FIXED unit length x, 50k tokens, 6 replicates", [3, 5, 8, 12, 20, 40], (L, r) => iidWorld(`ln${r}`, 50000, { len: L }), 6);
out.lenReal = sweep("Great Expectations 60k tokens regrouped into units of x tokens", [5, 8, 12, 20, 40], (L) => regroup(capAt(60000), L), 1);
const w = iidWorld("det", 30000), a = JSON.stringify(fam.compute(w)), b = JSON.stringify(fam.compute(iidWorld("det", 30000)));
out.determinism = { computeTwiceIdentical: a === b, atlasCellsTwiceIdentical: JSON.stringify(atlasCells(w, 10, "det")) === JSON.stringify(atlasCells(iidWorld("det", 30000), 10, "det")) };
const g60 = capAt(60000), base = fam.compute(g60), shift = (off) => (c) => String.fromCodePoint(c.codePointAt(0) + off), rev = (c) => String.fromCodePoint(0x7a + 0x61 - c.codePointAt(0));
const cmp = (m) => Object.fromEntries(ids.map((id) => [id, base[id] == null && m[id] == null ? 0 : round(Math.abs(base[id] - m[id]), 8)]));
out.scriptInvariance = { orderPreservingCyrillicShift_maxAbsDiff: Math.max(...Object.values(cmp(fam.compute(mapChars(g60, shift(0x3a0)))))), orderPreservingCJKShift_maxAbsDiff: Math.max(...Object.values(cmp(fam.compute(mapChars(g60, shift(0x4e00 - 0x61)))))), orderReversingMap_absDiffPerStat: cmp(fam.compute(mapChars(g60, rev))), note: "tie-break among equal counts is by string order, so only an order-reversing alphabet map can move ranks (and only among tied types)" };
const cw = collocWorld("c1", 50000), P = prep(cw), nb = neighbourTypeStats(P);
out.collocation = { note: "iid world + 40 heads (ranks 30-69) each always followed by its own fixed partner (rank >= 3000)", hardL: round(nb.hardL, 4), hardR: round(nb.hardR, 4), eligL: nb.eligL, eligR: nb.eligR, expectedHardRApprox: round(40 / nb.eligR, 4), cells: atlasCells(cw, 10, "colloc-test"), iidReference: atlasCells(iidWorld("c1", 50000), 10, "colloc-test") };
const timing = {};
for (const [name, v] of [["iid-D1-150k", iidWorld("t1", 150000)], ["iid-D2-alpha1.3-150k", iidWorld("t2", 150000, { len: "D2", alpha: 1.3 })], ["great-expectations-150k", capAt(150000)], ["iid-fixedL3-150k", iidWorld("t3", 150000, { len: 3 })], ["iid-fixedL60-150k", iidWorld("t4", 150000, { len: 60 })], ["iid-bigvocab-150k", iidWorld("t5", 150000, { types: 60000, alpha: 0.9 })]]) {
  const ms = [0, 1, 2, 3, 4].map(() => cpuMs(() => fam.compute(v)).cpu); timing[name] = { tokens: tokensOf(v), types: prep(v).V, cpuMsMean: round(mean(ms), 1), cpuMsMax: round(Math.max(...ms), 1) };
}
out.timing = { budgetMs: 700, perCall: timing };
console.log(JSON.stringify(out));
