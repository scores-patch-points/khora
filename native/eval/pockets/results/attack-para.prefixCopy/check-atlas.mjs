// check-atlas.mjs -- harness check: reproduce the atlas para.prefixCopy and para.posPar cells (v, nullMean, nullSd, z) on cached pockets, both halves, atlas seeds. Reports max abs diff.
//   node check-atlas.mjs id1,id2,... [out.json]
import fs from "node:fs";
import path from "node:path";
import { halves, cells, loadCached, HERE, f } from "./lib.mjs";
const ids = process.argv[2].split(","), outf = process.argv[3];
const res = {}; let worst = 0;
for (const id of ids) {
  const p = loadCached(id), H = halves(p), A = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas", `${id}.json`), "utf8")); res[id] = {};
  for (const which of ["discover", "confirm"]) {
    const c = cells(H[which], { keys: ["prefixCopy", "posPar"], draws: 10 });
    for (const [mine, key] of [["prefixCopy", "para.prefixCopy"], ["posPar", "para.posPar"]]) {
      const a = A.halves[which][key], b = c[mine]; let d = 0;
      for (const fld of ["v", "nullMean", "nullSd", "z"]) { const x = a[fld], y = b[fld]; if (x == null && y == null) continue; if (x == null || y == null) { d = Infinity; break; } d = Math.max(d, Math.abs(x - y)); }
      res[id][`${which}.${mine}`] = { atlas: a, mine: b, maxAbsDiff: d }; worst = Math.max(worst, d);
      console.error(id, which, mine, "atlas z", f(a.z), "mine z", f(b.z), "diff", d);
    }
  }
}
console.error("WORST", worst);
if (outf) fs.writeFileSync(path.join(HERE, outf), JSON.stringify({ worstAbsDiff: worst, res }, null, 1));
