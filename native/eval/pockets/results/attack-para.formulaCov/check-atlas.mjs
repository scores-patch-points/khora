// check-atlas.mjs -- does lib.mjs reproduce the atlas formulaCov cells (v, nullMean, nullSd, z) with the atlas seeds? usage: node check-atlas.mjs id1,id2,...
import { loadCached, atlasPocket, halves, cell, f } from "./lib.mjs";
const ids = process.argv[2].split(","); const out = [];
for (const id of ids) {
  const p = loadCached(id), H = halves(p), A = atlasPocket(id), row = { id };
  for (const w of ["discover", "confirm"]) { const c = cell(H[w], id, w, 10), a = A.halves[w]["para.formulaCov"];
    row[w] = { mine: [c.v, c.nullMean, c.nullSd, c.z], atlas: [a.v, a.nullMean, a.nullSd, a.z], same: c.v === a.v && c.nullMean === a.nullMean && c.nullSd === a.nullSd && c.z === a.z }; }
  out.push(row); console.error(id, row.discover.same, row.confirm.same, f(row.discover.mine[3], 1), f(row.discover.atlas[3], 1));
}
console.log(JSON.stringify(out));
