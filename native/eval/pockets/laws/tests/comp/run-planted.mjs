// planted-world test of the comp family: both halves of every planted pocket, atlas-identical z (10 draws per null kind), CPU time per call. node run-planted.mjs > results-planted.json
import { load } from "../../../loaders/planted.mjs";
import { halves } from "../../../lib/pocket.mjs";
import * as fam from "../../comp.mjs";
import { atlasCells, cpuMs, round, tokensOf } from "./_t_util.mjs";
const out = { family: fam.FAMILY, note: "v = observed value, nullMean/nullSd over 10 seeded draws of the statistic's own null kind, z as run-atlas.mjs; both halves of each planted pocket (~50k tokens each)", pockets: {} };
for (const p of await load()) {
  const H = halves(p); out.pockets[p.id] = {};
  for (const which of ["discover", "confirm"]) {
    const v = H[which], t = cpuMs(() => fam.compute(v));
    out.pockets[p.id][which] = { tokens: tokensOf(v), units: v.units.length, cpuMsPerCall: round(t.cpu, 1), cells: atlasCells(v, 10, "planted-test") };
  }
  console.error(p.id, "done");
}
console.log(JSON.stringify(out));
