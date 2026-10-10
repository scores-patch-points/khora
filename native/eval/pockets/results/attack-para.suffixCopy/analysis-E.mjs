// analysis-E.mjs -- attack E (null-world narrowing on real pockets): the atlas null shuffles units across the whole view; the law is about the PREVIOUS unit. Re-test suffixCopy against nulls that keep (i) each unit's document
// (within-doc), (ii) each position's length class (len), (iii) both (doc-len), 20 draws, in the pockets where the atlas calls the law PRESENT.
import { dirJson, atlasRows, statusOf, f, median, mean, writeJson, countBy, poissonZ } from "./common.mjs";
const R = dirJson("out/real"), atlas = atlasRows();
const KINDS = ["unit-order", "within-doc", "len", "doc-len"];
const present = Object.values(atlas).filter((r) => r.status === "P+").map((r) => r.id);
const out = { nPresentAtlas: present.length, kinds: {}, byGroup: {}, decomposition: {} };
const cl = (id, k) => { const d = R[id].halves.discover[k], c = R[id].halves.confirm[k]; return { st: statusOf(d.suffixCopy, c.suffixCopy), hits: d._meta.S2 + c._meta.S2, nullHits: d._meta.nullS2Mean + c._meta.nullS2Mean, pz: poissonZ(d._meta.S2 + c._meta.S2, d._meta.nullS2.map((x, i) => x + c._meta.nullS2[i])), robust: poissonZ(d._meta.S2, d._meta.nullS2) >= 4 && poissonZ(c._meta.S2, c._meta.nullS2) >= 4, group: R[id].meta.group, register: R[id].meta.register, tokens: R[id].meta.tokens }; };
for (const k of KINDS) {
  const rows = present.map((id) => ({ id, ...cl(id, k) })), c = countBy(rows, (r) => r.st);
  out.kinds[k] = { status: c, nPplus: c["P+"] || 0, robustPoissonBothHalves: rows.filter((r) => r.robust).length, pooledPoissonZge4: rows.filter((r) => r.pz >= 4).length, medianPooledRatio: +median(rows.map((r) => r.hits / Math.max(1e-9, r.nullHits))).toFixed(2), shareRatioAbove1: +(100 * rows.filter((r) => r.hits > r.nullHits).length / rows.length).toFixed(1), shareRatioBelow1: +(100 * rows.filter((r) => r.hits < r.nullHits).length / rows.length).toFixed(1) };
  for (const g of ["bk", "cd", "fm", "ml", "oc", "ud"]) { const x = rows.filter((r) => r.group === g); (out.byGroup[g] ||= {})[k] = `${x.filter((r) => r.st === "P+").length}/${x.length}`; }
}
// all-pocket status counts (391) under each null for context
out.allPockets = Object.fromEntries(KINDS.map((k) => [k, countBy(Object.keys(R), (id) => statusOf(R[id].halves.discover[k].suffixCopy, R[id].halves.confirm[k].suffixCopy))]));
// joint survival
const surv = (ks) => present.filter((id) => ks.every((k) => statusOf(R[id].halves.discover[k].suffixCopy, R[id].halves.confirm[k].suffixCopy) === "P+")).length;
out.joint = { allFour: surv(KINDS), unitOrderAndWithinDoc: surv(["unit-order", "within-doc"]), unitOrderAndLen: surv(["unit-order", "len"]), unitOrderAndDocLen: surv(["unit-order", "doc-len"]) };
// decomposition of the log excess: doc-level share = log(nullWithinDoc / nullGlobal) / log(obs / nullGlobal); adjacency share = rest. also length-level.
const dec = [];
for (const id of present) { const g = cl(id, "unit-order"), w = cl(id, "within-doc"), l = cl(id, "len"), dl = cl(id, "doc-len"); if (g.hits < 20 || g.nullHits <= 0 || w.nullHits <= 0 || l.nullHits <= 0 || dl.nullHits <= 0) continue; const tot = Math.log(g.hits / g.nullHits); if (tot <= 0.1) continue;
  dec.push({ id, group: g.group, register: g.register, ratioGlobal: g.hits / g.nullHits, docShare: Math.log(w.nullHits / g.nullHits) / tot, lenShare: Math.log(l.nullHits / g.nullHits) / tot, docLenShare: Math.log(dl.nullHits / g.nullHits) / tot, hits: g.hits }); }
const med = (a, k) => +median(a.map((r) => r[k])).toFixed(3);
out.decomposition = { n: dec.length, note: "pockets with >= 20 hits; share of log(obs/null_global) explained by the null that keeps documents (docShare), length classes (lenShare), or both (docLenShare)", median: { docShare: med(dec, "docShare"), lenShare: med(dec, "lenShare"), docLenShare: med(dec, "docLenShare") }, byGroup: Object.fromEntries(["bk", "cd", "fm", "ml", "oc", "ud"].map((g) => { const x = dec.filter((r) => r.group === g); return [g, x.length ? { n: x.length, docShare: med(x, "docShare"), lenShare: med(x, "lenShare"), docLenShare: med(x, "docLenShare"), medianRatioGlobal: +median(x.map((r) => r.ratioGlobal)).toFixed(1) } : null]; })), code: (() => { const x = dec.filter((r) => r.register === "code"); return { n: x.length, docShare: med(x, "docShare"), lenShare: med(x, "lenShare"), docLenShare: med(x, "docLenShare") }; })() };
import { quantile } from "./stats.mjs";
out.decomposition.quantiles = Object.fromEntries(["docShare", "lenShare", "docLenShare"].map((k) => [k, [0.1, 0.25, 0.5, 0.75, 0.9].map((q) => +quantile(dec.map((r) => r[k]), q).toFixed(3))]));
out.decomposition.shareOfPocketsWithLenShareAbove05 = +(100 * dec.filter((r) => r.lenShare > 0.5).length / dec.length).toFixed(1);
out.decomposition.shareOfPocketsWithDocShareAbove05 = +(100 * dec.filter((r) => r.docShare > 0.5).length / dec.length).toFixed(1);
out.decomposition.shareOfPocketsWithDocShareAbove08 = +(100 * dec.filter((r) => r.docShare > 0.8).length / dec.length).toFixed(1);
out.ratioQuantiles = Object.fromEntries(KINDS.map((k) => [k, [0.1, 0.25, 0.5, 0.75, 0.9].map((q) => +quantile(present.map((id) => { const c = cl(id, k); return c.hits / Math.max(1e-9, c.nullHits); }), q).toFixed(2))]));
writeJson("out/analysis-E.json", out);
console.log(JSON.stringify({ ...out, decomposition: { ...out.decomposition } }, null, 1));
