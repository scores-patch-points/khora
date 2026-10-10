// analysis-B.mjs -- attack B (cheaper rival): (1) across pockets, partial Spearman of the suffixCopy pattern on every other statistic of the 81-statistic atlas battery, controlling log10 tokens and mean unit length;
// (2) the same for the cheap rivals computed here on the very same pair set (last-token copy, prefix copy, exact duplicate adjacent units), and a pair-level decomposition of the suffixCopy hits.
import fs from "node:fs";
import path from "node:path";
import { HERE, dirJson, atlasRows, statusOf, f, median, mean, writeJson, readJson, countBy } from "./common.mjs";
import { partialSpearman, spearman, ranks, residuals, pearson } from "./stats.mjs";
const M = readJson(path.join(HERE, "../atlas-matrix.json")), si = M.statistics.indexOf("para.suffixCopy");
const real = M.pockets.filter((p) => p.kind === "real" && !p.thin);
const cell = (p, s) => p.cells[M.statistics.indexOf(s)];
const zMean = (c) => (c[1] != null && c[3] != null ? (c[1] + c[3]) / 2 : null), vMean = (c) => (c[0] != null && c[2] != null ? (c[0] + c[2]) / 2 : null);
const out = { n: real.length, definedSuffix: real.filter((p) => zMean(cell(p, "para.suffixCopy")) != null).length, rivalsZ: [], rivalsV: [] };
for (const [mode, pick, dest] of [["z", zMean, "rivalsZ"], ["v", vMean, "rivalsV"]]) {
  for (const s of M.statistics) {
    if (s === "para.suffixCopy") continue;
    const rows = real.filter((p) => pick(cell(p, "para.suffixCopy")) != null && pick(cell(p, s)) != null);
    if (rows.length < 60) continue;
    const y = rows.map((p) => pick(cell(p, "para.suffixCopy"))), x = rows.map((p) => pick(cell(p, s))), Z = [rows.map((p) => Math.log10(p.tokens)), rows.map((p) => p.meanUnitLength)];
    const rho = spearman(x, y), prho = partialSpearman(x, y, Z);
    // total R2 of rank(y) on [ranked controls + ranked rival]
    const ry = ranks(y), rz = Z.map(ranks), r1 = residuals(ry, [...rz, ranks(x)]), r0 = residuals(ry, rz), sst = ry.reduce((a, b) => a + (b - mean(ry)) ** 2, 0);
    const R2 = 1 - r1.reduce((a, b) => a + b * b, 0) / sst, R2ctrl = 1 - r0.reduce((a, b) => a + b * b, 0) / sst;
    out[dest].push({ stat: s, n: rows.length, rho: +rho.toFixed(3), partialRho: +prho.toFixed(3), partialR2: +(prho * prho).toFixed(3), totalR2WithControls: +R2.toFixed(3), controlsR2: +R2ctrl.toFixed(3) });
  }
  out[dest].sort((a, b) => Math.abs(b.partialRho) - Math.abs(a.partialRho));
}
// controls alone: how much of the pattern do tokens and unit length explain?
{ const rows = real.filter((p) => zMean(cell(p, "para.suffixCopy")) != null); const y = rows.map((p) => zMean(cell(p, "para.suffixCopy"))), ry = ranks(y), rz = [rows.map((p) => Math.log10(p.tokens)), rows.map((p) => p.meanUnitLength)].map(ranks), r0 = residuals(ry, rz), sst = ry.reduce((a, b) => a + (b - mean(ry)) ** 2, 0); out.controlsAloneR2_z = +(1 - r0.reduce((a, b) => a + b * b, 0) / sst).toFixed(3); out.nControlsAlone = rows.length; }
// ---- part 2: cheap rivals on the SAME pair set (out/real, unit-order null, 20 draws) ----
const R = dirJson("out/real"), atlas = atlasRows();
const ids = Object.keys(R), zOf = (id, key) => { const d = R[id].halves.discover["unit-order"][key], c = R[id].halves.confirm["unit-order"][key]; return d.z != null && c.z != null ? (d.z + c.z) / 2 : null; };
out.cheap = {};
for (const key of ["lastCopy", "prefixCopy", "dupAdj", "condSecond", "sufNoDup", "sufNoPre"]) {
  const rows = ids.filter((id) => zOf(id, "suffixCopy") != null && zOf(id, key) != null);
  const y = rows.map((id) => zOf(id, "suffixCopy")), x = rows.map((id) => zOf(id, key)), Z = [rows.map((id) => Math.log10(R[id].meta.tokens)), rows.map((id) => R[id].meta.meanUnitLength)];
  const prho = partialSpearman(x, y, Z);
  out.cheap[key] = { n: rows.length, rho: +spearman(x, y).toFixed(3), partialRho: +prho.toFixed(3), partialR2: +(prho * prho).toFixed(3) };
}
// pair-level decomposition of the suffix hits in the atlas-P+ pockets (halves pooled)
const presentIds = Object.values(atlas).filter((r) => r.status === "P+").map((r) => r.id);
const dec = presentIds.map((id) => {
  let S2 = 0, S1 = 0, D = 0, S2P = 0, np = 0, P2 = 0, nS1 = 0, nS2 = 0;
  for (const w of ["discover", "confirm"]) { const c = R[id].halves[w]["unit-order"], m = c._meta, nop = c.sufNoPre.v; S2 += m.S2; S1 += m.S1; D += m.D; np += m.np; P2 += m.P2; S2P += nop != null ? m.S2 - nop * (m.np - m.P2) : NaN; nS1 += m.nullS1Mean; nS2 += m.nullS2Mean; }
  return { id, S2, S1, D, S2P, np, P2, nullS1: nS1, nullS2: nS2, fracDup: S2 ? D / S2 : null, fracPre: S2 ? S2P / S2 : null, fracNeither: S2 ? (S2 - S2P) / S2 : null, condObs: S1 ? S2 / S1 : null, condNull: nS1 ? nS2 / nS1 : null };
}).filter((r) => r.S2 > 0);
const medOf = (k) => +median(dec.map((r) => r[k]).filter((x) => x != null && Number.isFinite(x))).toFixed(3);
out.decomposition = { nPresentWithHits: dec.length, pooledS2: dec.reduce((a, r) => a + r.S2, 0), pooledDup: dec.reduce((a, r) => a + r.D, 0), pooledSufAndPre: dec.reduce((a, r) => a + r.S2P, 0), medianFracDup: medOf("fracDup"), medianFracPre: medOf("fracPre"), medianFracNeither: medOf("fracNeither"), medianCondObs: medOf("condObs"), medianCondNull: medOf("condNull"), shareCondAboveNull: +(100 * dec.filter((r) => r.condObs > r.condNull).length / dec.length).toFixed(1) };
out.statusCounts = {};
for (const key of ["suffixCopy", "lastCopy", "condSecond", "prefixCopy", "dupAdj", "sufNoDup", "sufNoPre"]) out.statusCounts[key] = countBy(presentIds, (id) => statusOf(R[id].halves.discover["unit-order"][key], R[id].halves.confirm["unit-order"][key]));

// cheap rivals on the effect-size scale: mean v over halves, partial Spearman controlling log10 tokens and mean unit length; all pockets with v defined, and the atlas-P+ pockets only
{ const vOf = (id, key) => { const d = R[id].halves.discover["unit-order"][key].v, c = R[id].halves.confirm["unit-order"][key].v; return d != null && c != null ? (d + c) / 2 : null; };
  out.cheapV = {};
  for (const [scope, idset] of [["allDefined", ids], ["atlasPresentOnly", ids.filter((id) => atlas[id]?.status === "P+")]]) {
    out.cheapV[scope] = {};
    for (const key of ["lastCopy", "prefixCopy", "dupAdj", "sufNoDup", "sufNoPre"]) {
      const rows = idset.filter((id) => vOf(id, "suffixCopy") != null && vOf(id, key) != null), y = rows.map((id) => vOf(id, "suffixCopy")), x = rows.map((id) => vOf(id, key)), Z = [rows.map((id) => Math.log10(R[id].meta.tokens)), rows.map((id) => R[id].meta.meanUnitLength)], prho = partialSpearman(x, y, Z);
      out.cheapV[scope][key] = { n: rows.length, rho: +spearman(x, y).toFixed(3), partialRho: +prho.toFixed(3), partialR2: +(prho * prho).toFixed(3) };
    }
  } }
writeJson("out/analysis-B.json", out);
console.log("cheap rivals on v:", JSON.stringify(out.cheapV));
console.log("controls alone R2 on rank(z_suffix):", out.controlsAloneR2_z, "n", out.nControlsAlone);
console.log("TOP rivals by |partial rho| on mean z (controls: log10 tokens, mean unit length):");
for (const r of out.rivalsZ.slice(0, 12)) console.log(" ", r.stat.padEnd(18), "n", r.n, "rho", r.rho, "partial", r.partialRho, "R2partial", r.partialR2, "R2total", r.totalR2WithControls);
console.log("TOP rivals by |partial rho| on mean v:");
for (const r of out.rivalsV.slice(0, 12)) console.log(" ", r.stat.padEnd(18), "n", r.n, "rho", r.rho, "partial", r.partialRho, "R2partial", r.partialR2, "R2total", r.totalR2WithControls);
console.log("cheap rivals (same pairs):", JSON.stringify(out.cheap));
console.log("decomposition:", JSON.stringify(out.decomposition));
console.log("status in atlas-P+ pockets (20 draws):", JSON.stringify(out.statusCounts));
