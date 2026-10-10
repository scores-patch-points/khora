// selfcheck.mjs -- verifies (1) cached pockets reproduce atlas entCurv cells (v, nullMean, nullSd, z) exactly, (2) entc() default equals posStats().entCurv.
//   node selfcheck.mjs [idCSV]
import fs from "node:fs";
import path from "node:path";
import { loadCached, halves, cell, entc, prep, posStats, HERE } from "./lib.mjs";
const ids = (process.argv[2] || "bk-alice,cd-cc-json,ud-eng,ml-lat-livy,fm-wlc-torah").split(",");
let worst = 0;
for (const id of ids) {
  const p = loadCached(id), H = halves(p), a = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas", `${id}.json`), "utf8")).halves;
  for (const w of ["discover", "confirm"]) {
    const c = cell(H[w]), A = a[w]["order.entCurv"], P = prep(H[w]), e = entc(P);
    const d = Math.abs(c.v - A.v) + Math.abs(c.nullMean - A.nullMean) + Math.abs(c.nullSd - A.nullSd) + Math.abs(c.z - A.z), d2 = Math.abs(e.curv - posStats(P).entCurv);
    worst = Math.max(worst, d, d2);
    console.log(id, w, "z", c.z.toFixed(3), "atlas z", A.z.toFixed(3), "absdiff", d.toExponential(1), "entc-vs-posStats", d2.toExponential(1));
  }
}
console.log("WORST", worst);
