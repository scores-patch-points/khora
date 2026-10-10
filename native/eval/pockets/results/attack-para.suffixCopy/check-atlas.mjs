// check-atlas.mjs -- harness check: reproduce the atlas para.suffixCopy and para.prefixCopy cells (v, nullMean, nullSd, z) with the attack's own code on the cached pockets, both halves, atlas seeds.
//   node check-atlas.mjs [id1,id2,...|all] [out.json]
import fs from "node:fs";
import path from "node:path";
import { halves, cells, prepView, loadCached, HERE, f, CACHE } from "./lib.mjs";
const arg = process.argv[2] || "all", outf = process.argv[3] || "check-atlas.json";
const ids = arg === "all" ? fs.readdirSync(CACHE).filter((x) => x.endsWith(".json")).map((x) => x.slice(0, -5)).sort() : arg.split(",");
const res = {}; let worst = 0, worstId = null, nCells = 0, nBad = 0;
for (const id of ids) {
  const p = loadCached(id), H = halves(p), A = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas", `${id}.json`), "utf8")); res[id] = {};
  for (const which of ["discover", "confirm"]) {
    const P = prepView(H[which]), c = cells(P, { id, which, keys: ["suffixCopy", "prefixCopy"], draws: 10 });
    for (const key of ["suffixCopy", "prefixCopy"]) {
      const a = A.halves[which]["para." + key], b = c[key]; let d = 0;
      for (const fld of ["v", "nullMean", "nullSd", "z"]) { const x = a[fld], y = b[fld]; if (x == null && y == null) continue; if (x == null || y == null) { d = Infinity; break; } d = Math.max(d, Math.abs(x - y)); }
      res[id][`${which}.${key}`] = { atlasZ: a.z, mineZ: b.z, maxAbsDiff: d }; nCells++; if (d > 1e-9) nBad++;
      if (d > worst) { worst = d; worstId = id; }
    }
  }
  console.error(id, "suffix z", f(res[id]["discover.suffixCopy"].mineZ), f(res[id]["confirm.suffixCopy"].mineZ), "worst so far", worst);
}
console.error("DONE pockets", ids.length, "cells", nCells, "cells differing > 1e-9:", nBad, "worst abs diff", worst, worstId);
fs.writeFileSync(path.join(HERE, outf), JSON.stringify({ pockets: ids.length, cells: nCells, cellsDiffering: nBad, worstAbsDiff: worst, worstId, res }));
