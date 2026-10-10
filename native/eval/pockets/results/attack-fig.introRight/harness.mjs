// harness.mjs -- reproduce atlas cells of fig.introRight on cached pockets with this lib (must match results/atlas/<id>.json exactly).
import fs from "node:fs";
import path from "node:path";
import { halves, cellOf, loadCached, HERE, f } from "./lib.mjs";
const ids = process.argv[2].split(","), out = {};
for (const id of ids) {
  const p = loadCached(id), H = halves(p), atlas = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas", `${id}.json`), "utf8")), r = {};
  for (const w of ["discover", "confirm"]) {
    const c = cellOf(H[w], "introRight", 10), a = atlas.halves[w]["fig.introRight"];
    r[w] = { mine: c, atlas: a, maxAbsDiff: Math.max(Math.abs(c.v - a.v), Math.abs(c.nullMean - a.nullMean), Math.abs(c.nullSd - a.nullSd), Math.abs(c.z - a.z)) };
  }
  out[id] = r; console.error(id, f(r.discover.maxAbsDiff, 12), f(r.confirm.maxAbsDiff, 12), "z", f(r.discover.mine.z, 2), f(r.confirm.mine.z, 2));
}
fs.writeFileSync(path.join(HERE, "harness.json"), JSON.stringify(out, null, 1));
