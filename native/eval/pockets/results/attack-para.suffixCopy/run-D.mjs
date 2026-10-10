// run-D.mjs -- attack D: planted worlds WITHOUT the claimed mechanism. 17 settings x R replicate pockets, plus the 8 atlas planted pockets, each under the four null worlds, both halves.
//   node run-D.mjs [--reps 10] [--draws 10] [--out out/D.json]
import fs from "node:fs";
import path from "node:path";
import { halves, cells, prepView, HERE, NULLKINDS, statusOf, optOf, tokensOf } from "./lib.mjs";
import { settings, buildPocket } from "./planted-worlds.mjs";
import { load as loadAtlasPlanted } from "../../loaders/planted.mjs";
const o = optOf(process.argv.slice(2)), REPS = Number(o("--reps", 10)), DRAWS = Number(o("--draws", 10)), OUT = path.join(HERE, o("--out", "out/D.json"));
const one = (p) => {
  const H = halves(p), r = { id: p.id, tokens: tokensOf(p.units), units: p.units.length, nulls: {} };
  for (const kind of NULLKINDS) {
    const c = {};
    for (const which of ["discover", "confirm"]) c[which] = cells(prepView(H[which]), { id: p.id, which, nullKind: kind, draws: DRAWS, keys: ["suffixCopy", "lastCopy", "prefixCopy"] });
    const sc = (k) => ({ status: statusOf(c.discover[k], c.confirm[k]), zD: c.discover[k].z, zC: c.confirm[k].z, vD: c.discover[k].v, vC: c.confirm[k].v, nullD: c.discover[k].nullMean, nullC: c.confirm[k].nullMean });
    r.nulls[kind] = { suffixCopy: sc("suffixCopy"), lastCopy: sc("lastCopy"), prefixCopy: sc("prefixCopy"), S2D: c.discover._meta.S2, S2C: c.confirm._meta.S2, npD: c.discover._meta.np, npC: c.confirm._meta.np, nullS2D: c.discover._meta.nullS2Mean, nullS2C: c.confirm._meta.nullS2Mean };
  }
  return r;
};
const out = { reps: REPS, draws: DRAWS, settings: {}, atlasPlanted: [] };
for (const s of settings()) {
  out.settings[s.key] = [];
  for (let rep = 0; rep < REPS; rep++) { out.settings[s.key].push(one(buildPocket(s, rep))); }
  const st = out.settings[s.key].map((r) => r.nulls["unit-order"].suffixCopy.status);
  console.error(s.key, "unit-order statuses", st.join(" "));
}
for (const p of await loadAtlasPlanted()) { out.atlasPlanted.push(one(p)); console.error(p.id, out.atlasPlanted.at(-1).nulls["unit-order"].suffixCopy.status); }
fs.writeFileSync(OUT, JSON.stringify(out));
console.error("ALL DONE");
