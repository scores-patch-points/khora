// attackB2.mjs -- ATTACK B (own cheap rivals computed on the raw pockets, both halves, all 391 real pockets): decomposition of depLen into
//   adj   = ln(#same-bin pairs at distance 1 / E under the within-unit shuffle, E = sum m(m-1)/L)            (immediate class repetition: the cheapest possible spacing statistic)
//   ge2   = ln((obs - adjObs)/(exp - adjExp))                                                                 (spacing of same-bin successors that are NOT adjacent)
//   v     = depLen itself (check: equals the atlas cell).   node attackB2.mjs -> B2.json
import fs from "node:fs";
import path from "node:path";
import { halves, binUnits, depParts, loadCached, TABLE, HERE } from "./lib.mjs";
const rows = TABLE().filter((r) => r.kind === "real" && !r.thin), out = [];
for (const r of rows) {
  const H = halves(loadCached(r.id)), o = { id: r.id, status: r.status, atlasV: [r.vD, r.vC] };
  for (const [k, w] of [["D", "discover"], ["C", "confirm"]]) {
    const { bu, P } = binUnits(H[w]), d = depParts(bu, P.B);
    o["v" + k] = d.v; o["adj" + k] = d.adjObs > 0 && d.adjExp > 0 ? Math.log(d.adjObs / d.adjExp) : null;
    const obs2 = d.obs - d.adjObs, exp2 = d.exp - d.adjExp; o["ge2" + k] = obs2 > 0 && exp2 > 0 ? Math.log(obs2 / exp2) : null;
    o["adjShare" + k] = d.adjObs / Math.max(1, d.exp > 0 ? (d.obs > 0 ? d.obs : 1) : 1);
  }
  out.push(o);
}
const bad = out.filter((o) => Math.abs(o.vD - o.atlasV[0]) > 1e-7 || Math.abs(o.vC - o.atlasV[1]) > 1e-7);
fs.writeFileSync(path.join(HERE, "B2.json"), JSON.stringify({ rows: out, mismatchWithAtlas: bad.map((b) => b.id) }));
console.log("pockets", out.length, "v mismatches vs atlas:", bad.length);
