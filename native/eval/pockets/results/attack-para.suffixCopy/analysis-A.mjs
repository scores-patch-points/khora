// analysis-A.mjs -- attack A: does suffixCopy survive equal token counts, equal unit-length bands and alternative tokenisations in the pockets where the atlas calls it PRESENT (P+, 10 draws)?
import { dirJson, atlasRows, statusOf, f, median, mean, writeJson, countBy, poissonZ, powerAt4 } from "./common.mjs";
import { spearman } from "./stats.mjs";
const A = dirJson("out/A"), real = dirJson("out/real"), atlas = atlasRows();
const present = Object.values(atlas).filter((r) => r.status === "P+").map((r) => r.id).filter((id) => A[id] && real[id]);
const baseRatio = (id) => { const d = real[id].halves.discover["unit-order"]._meta, c = real[id].halves.confirm["unit-order"]._meta; return (d.S2 + c.S2) / Math.max(1e-9, d.nullS2Mean + c.nullS2Mean); };
const VARS = ["tok-rare1pct", "tok-hapax", "tok-stem5", "tok-nodiacr", "band-S", "band-M", "band-L", "sub40-r0", "sub40-r1", "sub100-r0", "sub40band-r0"];
const out = { nPresentAtlas: Object.values(atlas).filter((r) => r.status === "P+").length, nPresentWithData: present.length, baseStatus20: countBy(present, (id) => statusOf(real[id].halves.discover["unit-order"].suffixCopy, real[id].halves.confirm["unit-order"].suffixCopy)), variants: {} };
for (const name of ["base20", ...VARS]) {
  const rows = [];
  for (const id of present) {
    const v = name === "base20" ? { discover: real[id].halves.discover["unit-order"], confirm: real[id].halves.confirm["unit-order"] } : A[id].variants[name];
    if (!v || !v.discover || !v.confirm) { rows.push({ id, status: "unavailable" }); continue; }
    const st = statusOf(v.discover.suffixCopy, v.confirm.suffixCopy), md = v.discover._meta, mc = v.confirm._meta;
    const br = baseRatio(id), lamD = md.nullS2Mean, lamC = mc.nullS2Mean;
    const pw = powerAt4(lamD, br * lamD).p * powerAt4(lamC, br * lamC).p;
    const zr = [poissonZ(md.S2, md.nullS2), poissonZ(mc.S2, mc.nullS2)];
    const hits = md.S2 + mc.S2, nullHits = lamD + lamC;
    rows.push({ id, group: atlas[id].group, status: st, pair: md.np + mc.np, hits, nullHits, ratio: hits / Math.max(1e-9, nullHits), robustP: zr[0] >= 4 && zr[1] >= 4, pooledPoisZ: poissonZ(hits, md.nullS2.map((x, i) => x + mc.nullS2[i])), expectedP: pw, baseRatio: br });
  }
  const av = rows.filter((r) => r.status !== "unavailable"), n = av.length, c = countBy(av, (r) => r.status);
  const both = av.filter((r) => r.pair >= 100 && r.nullHits >= 1);
  const byGroup = {}; for (const g of ["bk", "cd", "fm", "ml", "oc", "ud"]) { const x = av.filter((r) => r.group === g); byGroup[g] = { n: x.length, "P+": x.filter((r) => r.status === "P+").length, expectedP: +x.reduce((a, r) => a + r.expectedP, 0).toFixed(1) }; }
  out.variants[name] = {
    nAvailable: n, status: c, sharePplus: n ? +(100 * (c["P+"] || 0) / n).toFixed(1) : null,
    robustPoissonPresent: av.filter((r) => r.robustP).length, expectedPplusIfEffectSizeKept: +av.reduce((a, r) => a + r.expectedP, 0).toFixed(1),
    medianRatioObsOverNull: +median(av.map((r) => r.ratio)).toFixed(2), medianBaseRatio: +median(av.map((r) => r.baseRatio)).toFixed(2),
    shareRatioAbove1: +(100 * av.filter((r) => r.ratio > 1).length / Math.max(1, n)).toFixed(1), shareRatioAbove1_whereNullHitsGe1: +(100 * both.filter((r) => r.ratio > 1).length / Math.max(1, both.length)).toFixed(1), nNullHitsGe1: both.length,
    pooledPoissonZge4: av.filter((r) => r.pooledPoisZ >= 4).length,
    spearmanLogRatioVsBase: av.length > 5 ? +spearman(av.map((r) => Math.log(r.ratio + 0.05)), av.map((r) => Math.log(r.baseRatio + 0.05))).toFixed(3) : null,
    byGroup,
  };
  if (name.startsWith("sub")) { const rt = A; const rs = present.filter((id) => A[id]?.variants[name]); out.variants[name].realisedTokensMedian = median(rs.map((id) => A[id].variants[name].realisedTokens)); out.variants[name].skipped = present.filter((id) => A[id]?.skipped?.[name]).length; }
  out.variants[name].rows = rows;
}
writeJson("out/analysis-A.json", out);
const line = (n, v) => `${n.padEnd(14)} avail ${String(v.nAvailable).padStart(3)}  P+ ${String(v.status["P+"] || 0).padStart(3)} (${String(v.sharePplus).padStart(5)}%)  expectedP+(effect kept) ${String(v.expectedPplusIfEffectSizeKept).padStart(6)}  M ${v.status.M || 0} A ${v.status.A || 0} P- ${v.status["P-"] || 0} undef ${(v.status.zundef || 0) + (v.status.nodata || 0)}  robustPois ${v.robustPoissonPresent}  pooledPoisZ>=4 ${v.pooledPoissonZge4}  ratio>1: ${v.shareRatioAbove1}% (nullHits>=1: ${v.shareRatioAbove1_whereNullHitsGe1}% of ${v.nNullHitsGe1})  medRatio ${v.medianRatioObsOverNull} vs base ${v.medianBaseRatio}  rho(logratio,base) ${v.spearmanLogRatioVsBase}`;
console.log("atlas P+ pockets:", out.nPresentAtlas, "with run data:", out.nPresentWithData, "base status at 20 draws:", JSON.stringify(out.baseStatus20));
for (const [n, v] of Object.entries(out.variants)) console.log(line(n, v));

// ---- second part: ALL real pockets (not only the atlas-P+ ones): is the cross-pocket pattern (which groups carry the law) a size / length-class effect? ----
const allIds = Object.keys(real).filter((id) => A[id]);
const part2 = {};
for (const name of ["base20", "sub40-r0", "sub40-r1", "sub100-r0", "band-M", "sub40band-r0", "tok-hapax", "tok-stem5"]) {
  const g = {};
  for (const id of allIds) {
    const v = name === "base20" ? { discover: real[id].halves.discover["unit-order"], confirm: real[id].halves.confirm["unit-order"] } : A[id].variants[name];
    if (!v || !v.discover || !v.confirm) continue;
    const st = statusOf(v.discover.suffixCopy, v.confirm.suffixCopy), grp = atlas[id]?.group ?? real[id].meta.group, reg = real[id].meta.register === "code" ? "code" : "noncode";
    for (const key of [grp, "ALL", "reg:" + reg]) { g[key] = g[key] || { n: 0, "P+": 0, "P-": 0, A: 0, M: 0, undef: 0 }; g[key].n++; const s = st === "zundef" || st === "nodata" ? "undef" : st; g[key][s]++; }
  }
  part2[name] = g;
}
writeJson("out/analysis-A-allpockets.json", part2);
console.log("\nALL real pockets, P+ counts (n available) by group: base20 / sub40-r0 / sub40-r1 / sub100-r0 / band-M / sub40band-r0");
for (const key of ["ALL", "bk", "cd", "fm", "ml", "oc", "ud", "reg:code", "reg:noncode"]) console.log(key.padEnd(12), Object.keys(part2).map((nm) => { const x = part2[nm][key]; return x ? `${nm}:${x["P+"]}/${x.n}(${(100 * x["P+"] / x.n).toFixed(0)}%)` : nm + ":NA"; }).join("  "));
