// analysis-A2.mjs -- how equal is the unit length after the length-band restriction? mean length of the units inside each band, and of the PAIRS used (both units in band), across the atlas-P+ pockets.
import fs from "node:fs";
import { loadCached, prepView, halves } from "./lib.mjs";
import { atlasRows, writeJson } from "./common.mjs";
import { quantile } from "./stats.mjs";
const A = atlasRows(), ids = Object.values(A).filter((r) => r.status === "P+").map((r) => r.id), bands = { all: [1, 1e9], "band-S": [2, 6], "band-M": [6, 14], "band-L": [15, 40] }, res = {};
for (const id of ids) {
  const p = loadCached(id), P = prepView({ units: p.units, docOf: p.docOf }); res[id] = {};
  for (const [b, [lo, hi]] of Object.entries(bands)) { let s = 0, n = 0, ps = 0, pn = 0; for (let u = 0; u < P.U; u++) { if (P.len[u] >= lo && P.len[u] <= hi) { s += P.len[u]; n++; } if (u && P.docOf[u] === P.docOf[u - 1] && P.len[u] >= Math.max(2, lo) && P.len[u] <= hi && P.len[u - 1] >= Math.max(2, lo) && P.len[u - 1] <= hi) { ps += P.len[u]; pn++; } } res[id][b] = { meanLen: n ? s / n : null, pairMeanLen: pn ? ps / pn : null, pairs: pn }; }
}
const out = {};
for (const b of Object.keys(bands)) { const m = ids.map((id) => res[id][b].meanLen).filter((x) => x != null), pm = ids.map((id) => res[id][b].pairMeanLen).filter((x) => x != null); out[b] = { n: m.length, meanLen: [0.05, 0.25, 0.5, 0.75, 0.95].map((q) => +quantile(m, q).toFixed(2)), pairMeanLen: [0.05, 0.25, 0.5, 0.75, 0.95].map((q) => +quantile(pm, q).toFixed(2)), cv: +(Math.sqrt(m.reduce((a, x) => a + (x - m.reduce((s, y) => s + y, 0) / m.length) ** 2, 0) / m.length) / (m.reduce((s, y) => s + y, 0) / m.length)).toFixed(3) }; }
writeJson("out/analysis-A2.json", out);
console.log("quantiles 5/25/50/75/95 of the mean unit length across the atlas-P+ pockets"); for (const [b, v] of Object.entries(out)) console.log(b.padEnd(8), "n", v.n, "meanLen", v.meanLen.join(" "), " pairMeanLen", v.pairMeanLen.join(" "), "CV", v.cv);
