// check-atlas.mjs -- selfcheck: cell() reproduces the atlas order.entSlope cells (v, nullMean, nullSd, z) of given pockets.  node check-atlas.mjs id1,id2,...
import fs from "node:fs";
import path from "node:path";
import { loadCached, pocketCell, HERE } from "./lib.mjs";
const ids = process.argv[2].split(","), out = [];
for (const id of ids) {
  const p = loadCached(id), a = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas", `${id}.json`), "utf8")), c = pocketCell(p);
  const row = { id, maxAbsDiff: 0 };
  for (const [w, mine] of [["discover", c.D], ["confirm", c.C]]) {
    const A = a.halves[w]["order.entSlope"];
    for (const k of ["v", "nullMean", "nullSd", "z"]) row.maxAbsDiff = Math.max(row.maxAbsDiff, Math.abs(A[k] - mine[k]));
    row[w] = { atlas: [A.v, A.z], mine: [mine.v, mine.z] };
  }
  out.push(row); console.log(JSON.stringify(row));
}
fs.writeFileSync(path.join(HERE, "check-atlas.json"), JSON.stringify(out));
