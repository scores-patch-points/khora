// check-atlas.mjs -- reproduce atlas comp.asym cells (v, nullMean, nullSd, z; both halves; 10 draws) with lib.mjs; maxAbsDiff must be ~0.   node check-atlas.mjs id1,id2,...  (default: 8 fixed pockets)
import fs from "node:fs";
import path from "node:path";
import { halves, cell, loadCached, HERE, f } from "./lib.mjs";
const ids = (process.argv[2] ?? "bk-alice,cd-js-eochat,oc-irc-ubuntu-0607,bk-aeneid-la").split(","), out = {};
for (const id of ids) {
  if (!fs.existsSync(path.join(HERE, "../atlas", `${id}.json`))) { console.error("no atlas file", id); continue; }
  const p = loadCached(id), H = halves(p), atlas = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas", `${id}.json`), "utf8")), r = {};
  for (const w of ["discover", "confirm"]) {
    const c = cell(H[w], 10), a = atlas.halves[w]["comp.asym"];
    r[w] = { mine: c, atlas: a, maxAbsDiff: Math.max(Math.abs(c.v - a.v), Math.abs(c.nullMean - a.nullMean), Math.abs(c.nullSd - a.nullSd), Math.abs(c.z - a.z)) };
  }
  out[id] = r; console.error(id, f(r.discover.maxAbsDiff, 12), f(r.confirm.maxAbsDiff, 12), "z", f(r.discover.mine.z, 2), f(r.confirm.mine.z, 2), "atlas z", f(r.discover.atlas.z, 2), f(r.confirm.atlas.z, 2));
}
fs.writeFileSync(path.join(HERE, "check-atlas.json"), JSON.stringify(out, null, 1));
