// results/confirm-order.depLen/check-vs-atlas.mjs — instrument check: the cell computation of confirm.mjs (copied logic of run-atlas.mjs) must reproduce the stored atlas cells order.depLen of atlas pockets bit for bit.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { halves, nullView, seedOf } from "../../lib/pocket.mjs";
import * as order from "../../laws/order.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), res = [];
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
for (const [loader, id] of [["ud.mjs", "ud-eng"], ["ud.mjs", "ud-por"], ["books.mjs", "bk-oz"], ["books.mjs", "bk-treasure-island"]]) {
  const [p] = await (await import(pathToFileURL(path.join(HERE, "../../loaders", loader)).href)).load([id]), A = JSON.parse(fs.readFileSync(path.join(HERE, `../atlas/${id}.json`), "utf8")), H = halves(p);
  for (const which of ["discover", "confirm"]) {
    const view = H[which], obs = order.compute(view), xs = [];
    for (let k = 0; k < 10; k++) xs.push(order.compute(nullView(view, "within-unit", seedOf(p.id, which, "order", "within-unit", k))).depLen);
    const { m, sd } = stat(xs.filter(Number.isFinite)), mine = { v: obs.depLen, nullMean: m, nullSd: sd, z: (obs.depLen - m) / sd }, ref = A.halves[which]["order.depLen"];
    res.push({ id, which, identical: ["v", "nullMean", "nullSd", "z"].every((k) => mine[k] === ref[k]), mineZ: mine.z, atlasZ: ref.z });
  }
}
console.log(JSON.stringify(res)); fs.writeFileSync(path.join(HERE, "check-vs-atlas.json"), JSON.stringify(res, null, 1));
