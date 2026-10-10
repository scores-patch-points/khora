// check-atlas.mjs -- instrument check: the attack's cell() on the cached pocket reproduces the atlas rareCurve cell bit for bit. node check-atlas.mjs id1,id2,...
import { loadCached, atlasOf, pocketCell, halves, cell } from "./lib.mjs";
const ids = (process.argv[2] || "bk-alice,ud-eng,cd-cc-python").split(","), out = [];
for (const id of ids) {
  const p = loadCached(id), a = atlasOf(id).halves, H = halves(p);
  for (const w of ["discover", "confirm"]) {
    const c = cell(H[w]), A = a[w]["order.rareCurve"];
    const same = c.v === A.v && c.nullMean === A.nullMean && c.nullSd === A.nullSd && c.z === A.z;
    out.push({ id, which: w, mine: [c.v, c.nullMean, c.nullSd, c.z], atlas: [A.v, A.nullMean, A.nullSd, A.z], identical: same });
  }
}
console.log(JSON.stringify(out, null, 1));
