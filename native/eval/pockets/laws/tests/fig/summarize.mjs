// tests/fig/summarize.mjs — collect the results-*.json of the "fig" family into summary.json (and print the key tables).  node summarize.mjs
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PREDICT, STATS, FAMILY } from "../../fig.mjs";
const H = new URL(".", import.meta.url).pathname, rd = (n) => JSON.parse(fs.readFileSync(`${H}${n}`, "utf8")), ids = STATS.map((s) => s.id);
const out = { family: FAMILY, stats: ids };
// 1. PREDICT frozen before any run? (recompute the digest of the same body)
const fr = rd("predict-frozen.json"), body = JSON.stringify({ family: FAMILY, stats: STATS.map((s) => ({ id: s.id, null: s.null })), predict: PREDICT, note: fr.note }, null, 1);
out.predictFrozen = { sha256Frozen: fr.sha256, sha256Now: createHash("sha256").update(body).digest("hex"), unchanged: fr.sha256 === createHash("sha256").update(body).digest("hex") };
// 2. calibration on replicate iid worlds
const cal = rd("results-calib.json"); let n = 0, g4 = 0, g2 = 0;
for (const k of Object.keys(cal)) for (const s of ids) { const o = cal[k][s]; n += o.n; g4 += o.ge4; g2 += o.ge2; }
out.calibration = { cells: n, absZge4: g4, absZge2: g2, shareGe2: +(g2 / n).toFixed(4), perStat: Object.fromEntries(ids.map((s) => [s, Object.fromEntries(Object.keys(cal).map((k) => [k, cal[k][s]]))])) };
// 3. unit-length / size dependence of the raw statistic in iid worlds (v at L = 6, 12, 24; N = 20k, 50k)
const iid = rd("results-iid.json");
out.iidRawV = Object.fromEntries(ids.map((s) => [s, Object.fromEntries(Object.entries(iid).map(([k, r]) => [k, r.stats[s].v]))]));
out.iidZ = Object.fromEntries(Object.entries(iid).map(([k, r]) => [k, Object.fromEntries(ids.map((s) => [s, r.stats[s].z]))]));
// 4. planted recovery
const pl = rd("results-planted.json"), cu = rd("results-custom.json");
out.planted = Object.fromEntries(Object.entries({ ...pl, ...cu }).map(([k, r]) => [k, Object.fromEntries(ids.map((s) => [s, r.stats[s].z]))]));
// 5. real books (dev): z at 50k tokens, and G1-like rank correlation of v with mean unit length over the book pockets
const g1 = rd("results-g1books.json"), ok = Object.entries(g1).filter(([, r]) => r.stats), rk = (a) => { const o = a.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; for (let k = i; k <= j; k++) r[o[k][1]] = (i + j) / 2; i = j + 1; } return r; };
const sp = (x, y) => { const a = rk(x), b = rk(y), n = a.length, ma = a.reduce((p, q) => p + q, 0) / n, mb = b.reduce((p, q) => p + q, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (a[i] - ma) * (b[i] - mb); sxx += (a[i] - ma) ** 2; syy += (b[i] - mb) ** 2; } return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null; };
out.devBooks = { n: ok.length, ids: ok.map(([k]) => k), perStat: {} };
for (const s of ids) {
  const rows = ok.filter(([, r]) => r.stats[s].v != null), v = rows.map(([, r]) => r.stats[s].v), ml = rows.map(([, r]) => r.meanUnitLen), z = rows.map(([, r]) => r.stats[s].z).filter((x) => x != null);
  out.devBooks.perStat[s] = { nDefined: rows.length, spearmanVsMeanUnitLen: rows.length > 5 ? +sp(v, ml).toFixed(2) : null, nPos4: z.filter((x) => x >= 4).length, nNeg4: z.filter((x) => x <= -4).length, nAbsLt2: z.filter((x) => Math.abs(x) < 2).length, nZ: z.length, medianZ: z.length ? +[...z].sort((a, b) => a - b)[Math.floor(z.length / 2)].toFixed(1) : null, predict: PREDICT[s] };
}
out.timing = rd("results-timing.json"); out.determinism = (({ sameInputTwice, sameNullTwice, inputUnmutated }) => ({ sameInputTwice, sameNullTwice, inputUnmutated }))(rd("results-determinism.json"));
const ed = rd("results-edge.json"); out.edge = Object.fromEntries(Object.entries(ed).map(([k, v]) => [k, { err: v.err, anyNaN: v.anyNaN }]));
fs.writeFileSync(`${H}summary.json`, JSON.stringify(out, null, 1) + "\n");
console.log("predict unchanged:", out.predictFrozen.unchanged, "| calibration cells", n, "|z|>=4:", g4, "|z|>=2:", (100 * g2 / n).toFixed(1) + "%");
console.log("dev books:", ok.length, "pockets");
console.log("stat".padEnd(12), "predict".padEnd(11), "rho(len)".padStart(9), "pos4".padStart(5), "neg4".padStart(5), "|z|<2".padStart(6), "medZ".padStart(7), "n".padStart(4));
for (const s of ids) { const o = out.devBooks.perStat[s]; console.log(s.padEnd(12), o.predict.padEnd(11), String(o.spearmanVsMeanUnitLen).padStart(9), String(o.nPos4).padStart(5), String(o.nNeg4).padStart(5), String(o.nAbsLt2).padStart(6), String(o.medianZ).padStart(7), String(o.nZ).padStart(4)); }
