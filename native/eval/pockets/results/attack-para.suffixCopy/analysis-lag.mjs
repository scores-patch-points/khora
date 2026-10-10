// analysis-lag.mjs -- ratio (observed suffix hits / within-document null hits) at lag L, atlas-P+ pockets, by group and for code vs non-code.
import path from "node:path";
import { HERE, readJson, atlasRows, writeJson, median } from "./common.mjs";
const J = readJson(path.join(HERE, "out/lag.json")), A = atlasRows(), LAGS = [1, 2, 3, 4, 8, 16];
const present = Object.values(A).filter((r) => r.status === "P+").map((r) => r.id), out = { nPresent: present.length, byClass: {} };
const classes = { all: () => true, code: (id) => J[id].register === "code", "non-code": (id) => J[id].register !== "code", bk: (id) => J[id].group === "bk", fm: (id) => J[id].group === "fm", ml: (id) => J[id].group === "ml", oc: (id) => J[id].group === "oc", ud: (id) => J[id].group === "ud", cd: (id) => J[id].group === "cd" };
for (const [cn, fn] of Object.entries(classes)) {
  const ids = present.filter(fn), row = { n: ids.length };
  for (const L of LAGS) { const rs = ids.filter((id) => J[id].lags[L].nullHits > 0.5 && J[id].lags[L].np >= 100).map((id) => J[id].lags[L].hits / J[id].lags[L].nullHits); row["L" + L] = { n: rs.length, medianRatio: rs.length ? +median(rs).toFixed(2) : null, shareAbove1: rs.length ? +(100 * rs.filter((r) => r > 1).length / rs.length).toFixed(0) : null }; }
  out.byClass[cn] = row;
}
writeJson("out/analysis-lag.json", out);
console.log("median (observed hits / within-document null hits) at lag L; [share of pockets with ratio > 1]");
for (const [cn, r] of Object.entries(out.byClass)) console.log(cn.padEnd(9), "n", String(r.n).padStart(3), LAGS.map((L) => `L${L}: ${r["L" + L].medianRatio} [${r["L" + L].shareAbove1}%] (n${r["L" + L].n})`).join("  "));
