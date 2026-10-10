// laws/tests/phys/summarize.mjs — reads results-*.json and writes summary.json (the numbers quoted in the header of laws/phys.mjs). Deterministic.
import fs from "node:fs";
import { createHash } from "node:crypto";
import { STATS, PREDICT } from "../../phys.mjs";
const R = (n) => JSON.parse(fs.readFileSync(new URL(`./results-${n}.json`, import.meta.url), "utf8"));
const ids = STATS.map((s) => s.id), round = (x, d = 4) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d), S = {};
const spearman = (xs, ys) => { const rk = (a) => a.map((x) => a.filter((y) => y < x).length + (a.filter((y) => y === x).length - 1) / 2), a = rk(xs), b = rk(ys), n = a.length, ma = a.reduce((s, t) => s + t, 0) / n, mb = b.reduce((s, t) => s + t, 0) / n; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; } return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null; };
// calibration (20 iid replicates)
const cal = R("calib");
for (const id of ids) { const xs = cal.reps.map((r) => r.cells[id]).filter((c) => c.v != null && c.nullMean != null && c.nullSd > 0); cal.summary[id].meanDiffInNullSd = round(xs.reduce((a, c) => a + (c.v - c.nullMean) / c.nullSd, 0) / xs.length, 3); cal.summary[id].sdOfZ = round(Math.sqrt(xs.reduce((a, c) => a + ((c.v - c.nullMean) / c.nullSd) ** 2, 0) / xs.length), 3); } S.calibration = { reps: cal.reps.length, perStat: cal.summary, cells: ids.length * cal.reps.length, absZ4: Object.values(cal.summary).reduce((a, s) => a + s.absZ4, 0), absZ2: Object.values(cal.summary).reduce((a, s) => a + s.absZ2, 0), undefined: Object.values(cal.summary).reduce((a, s) => a + s.undefinedCells, 0) };
// calibration on 100 FRESH iid worlds (offset 1000: not the 20 above)
const cf = R("calib-fresh100"); S.calibrationFresh100 = { reps: cf.reps.length, perStat: {}, cells: 0, absZ4: 0, absZ2: 0 };
for (const id of ids) { const zs = cf.reps.map((r) => r.cells[id].z).filter((z) => z != null), m = zs.reduce((a, b) => a + b, 0) / zs.length, sd = Math.sqrt(zs.reduce((a, b) => a + (b - m) ** 2, 0) / (zs.length - 1)); S.calibrationFresh100.perStat[id] = { n: zs.length, meanZ: round(m, 3), sdZ: round(sd, 3), absZ4: zs.filter((z) => Math.abs(z) >= 4).length, absZ2: zs.filter((z) => Math.abs(z) >= 2).length }; S.calibrationFresh100.cells += zs.length; S.calibrationFresh100.absZ4 += S.calibrationFresh100.perStat[id].absZ4; S.calibrationFresh100.absZ2 += S.calibrationFresh100.perStat[id].absZ2; }
// planted: law-free worlds and recovery
const pl = R("planted"); S.planted = { iidCellsAbsZ4: 0, iidCells: 0, recovery: {} };
for (const [w, h] of Object.entries(pl)) for (const id of ids) {
  const zs = ["discover", "confirm"].map((x) => h[x].cells[id].z);
  if (w === "pl-null" || w === "pl-null2") { for (const z of zs) if (z != null) { S.planted.iidCells++; if (Math.abs(z) >= 4) S.planted.iidCellsAbsZ4++; } }
  else if (zs.every((z) => z != null && Math.abs(z) >= 4 && Math.sign(z) === Math.sign(zs[0]))) (S.planted.recovery[w] ??= {})[id] = zs[0] > 0 ? "+" : "-";
}
// real texts, pockets
const rl = R("real"), pk = R("pockets"); S.real = Object.fromEntries(Object.entries(rl).map(([k, r]) => [k, Object.fromEntries(ids.map((i) => [i, { v: r.cells[i].v, z: r.cells[i].z }]))]));
S.pockets = {}; for (const [k, r] of Object.entries(pk)) S.pockets[k] = Object.fromEntries(ids.map((i) => [i, { v: [r.discover.cells[i].v, r.confirm.cells[i].v], z: [r.discover.cells[i].z, r.confirm.cells[i].z] }]));
// first look at the blind predictions on the real halves tested here (NOT the atlas; 2 books + 5 pockets)
const halvesReal = [...Object.values(rl).map((r) => [r.cells]), ...Object.values(pk).map((r) => [r.discover.cells, r.confirm.cells])];
S.firstLook = {}; for (const id of ids) { const present = { "+": 0, "-": 0, absent: 0, ambiguous: 0, undefined: 0 }; for (const hs of halvesReal) { if (hs.length === 1) { const z = hs[0][id].z; if (z == null) present.undefined++; else if (Math.abs(z) >= 4) present[z > 0 ? "+" : "-"]++; else if (Math.abs(z) < 2) present.absent++; else present.ambiguous++; continue; } const zs = hs.map((c) => c[id].z); if (zs.some((z) => z == null)) present.undefined++; else if (zs.every((z) => Math.abs(z) >= 4 && Math.sign(z) === Math.sign(zs[0]))) present[zs[0] > 0 ? "+" : "-"]++; else if (zs.every((z) => Math.abs(z) < 2)) present.absent++; else present.ambiguous++; } S.firstLook[id] = { predicted: PREDICT[id], ...present }; }
// size and unit length
const sz = R("size"), caps = Object.keys(sz); S.size = Object.fromEntries(ids.map((i) => { const v = caps.map((c) => sz[c].cells[i].v); return [i, { v: v.map((x) => round(x, 4)), spearmanWithLogN: v.every((x) => x != null) ? round(spearman(caps.map((c) => Number(c.slice(1))), v), 2) : null, relRange: v.every((x) => x != null) ? round((Math.max(...v) - Math.min(...v)) / Math.abs(v.reduce((a, b) => a + b, 0) / v.length), 3) : null }]; }));
const ln = R("length"), Ls = Object.keys(ln); S.unitLengthIid = Object.fromEntries(ids.map((i) => { const v = Ls.map((c) => ln[c].cells[i].v); return [i, { v: v.map((x) => round(x, 5)), zByL: Ls.map((c) => ln[c].cells[i].z), spearmanWithL: v.every((x) => x != null) ? round(spearman([3, 6, 12, 24], v), 2) : null, relRange: v.every((x) => x != null) ? round((Math.max(...v) - Math.min(...v)) / Math.abs(v.reduce((a, b) => a + b, 0) / v.length), 3) : null }]; }));
const rc = R("recut"); S.recutRealText = Object.fromEntries(ids.map((i) => [i, Object.keys(rc).map((c) => ({ L: c, v: round(rc[c].cells[i].v, 4), z: rc[c].cells[i].z }))]));
const tm = R("timing"); S.timing = Object.fromEntries(Object.entries(tm).map(([k, r]) => [k, { tokens: r.tokens, types: r.types, cpuMsRuns: r.cpuMsRuns, steadyCpuMs: Math.min(...r.cpuMsRuns) , firstCallCpuMs: r.cpuMsRuns[0] }]));
const co = R("collinear"); S.collinear = { views: co.n, top: co.top, withinFamilyTop: co.withinFamilyTop };
const dt = R("det"), sc = R("script"), ed = R("edge"); S.determinism = { computeIdentical: dt.identical, atlasCellsIdentical: dt.atlasCellsIdentical }; S.scriptInvariance = { cyrillic: sc.cyrillicIdentical, cjk: sc.cjkIdentical }; S.edge = Object.fromEntries(Object.entries(ed.cases).map(([k, v]) => [k, { tokens: v.tokens, allFiniteOrNull: v.allFiniteOrNull, error: v.error ?? null }]));
const fr = JSON.parse(fs.readFileSync(new URL("./predict-frozen.json", import.meta.url), "utf8")), canon = JSON.stringify(Object.keys(PREDICT).sort().map((k) => [k, PREDICT[k]]));
S.predictFrozen = { frozenSha256: fr.sha256, currentSha256: createHash("sha256").update(canon).digest("hex"), unchanged: fr.sha256 === createHash("sha256").update(canon).digest("hex") };
fs.writeFileSync(new URL("./summary.json", import.meta.url), JSON.stringify(S, null, 1) + "\n");
console.log(JSON.stringify({ calibration: { cells: S.calibration.cells, absZ4: S.calibration.absZ4, absZ2: S.calibration.absZ2 }, planted: S.planted, firstLook: S.firstLook, predictFrozen: S.predictFrozen, determinism: S.determinism, script: S.scriptInvariance, size: S.size, unitLengthIid: Object.fromEntries(Object.entries(S.unitLengthIid).map(([k, v]) => [k, [v.spearmanWithL, v.relRange]])) }, null, 1));
