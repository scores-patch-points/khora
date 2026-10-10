// harness2.mjs -- the generalised statistic with default options must equal the atlas introRight/introLeft cells (v, nullMean, z) exactly.
import fs from "node:fs"; import path from "node:path";
import { halves, loadCached, HERE, f } from "./lib.mjs"; import { cellFn, introSide } from "./variants.mjs";
for (const id of process.argv[2].split(",")) {
  const p = loadCached(id), H = halves(p), at = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas", `${id}.json`), "utf8"));
  for (const w of ["discover", "confirm"]) for (const [side, key] of [["R", "fig.introRight"], ["L", "fig.introLeft"]]) {
    const c = cellFn(H[w], (P) => introSide(P, { side }), 10), a = at.halves[w][key];
    console.log(id, w, key, "max abs diff v/nullMean/z:", f(Math.abs(c.v - a.v), 12), f(Math.abs(c.nullMean - a.nullMean), 12), f(Math.abs(c.z - a.z), 10));
  }
}
