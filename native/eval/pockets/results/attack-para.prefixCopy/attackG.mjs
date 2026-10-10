// attackG.mjs -- does the SECOND token add anything?  prefixGivenFirst = P(same 2-token opening | same first token), atlas pair set, atlas null (unit-order, atlas seeds, 50 draws) and within-document null (50 draws).
// out/G/<id>.json.  node attackG.mjs ids.txt
import fs from "node:fs";
import path from "node:path";
import { halves, cells, loadCached, HERE, optOf } from "./lib.mjs";
const ids = fs.readFileSync(path.join(HERE, process.argv[2] ?? "defined385.txt"), "utf8").split("\n").filter(Boolean);
fs.mkdirSync(path.join(HERE, "out/G"), { recursive: true });
const res = {};
for (const id of ids) {
  const H = halves(loadCached(id)); res[id] = {};
  for (const w of ["discover", "confirm"]) {
    const g = cells(H[w], { keys: ["prefixGivenFirst", "firstTokCopy"], nullKind: "unit-order", draws: 50 }), n = cells(H[w], { keys: ["prefixGivenFirst", "firstTokCopy"], nullKind: "within-doc", draws: 50, tag: "G" });
    res[id][w] = { gz: g.prefixGivenFirst.z, gv: g.prefixGivenFirst.v, gnm: g.prefixGivenFirst.nullMean, wz: n.prefixGivenFirst.z, first: g._meta.first, pre: g._meta.pre, np: g._meta.np };
  }
}
fs.writeFileSync(path.join(HERE, "out/G/all.json"), JSON.stringify(res));
console.error("done", Object.keys(res).length);
