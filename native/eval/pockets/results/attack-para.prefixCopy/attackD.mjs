// attackD.mjs -- ATTACK D (planted worlds without the claimed mechanism).  Runs dworlds.mjs worlds and the atlas planted worlds through the atlas protocol (halves, unit-order null, atlas seeds, 10 draws) and a
// within-document null (50 draws).  Output out/D/worlds.json.   node attackD.mjs
import fs from "node:fs";
import path from "node:path";
import { halves, cells, statusOf, HERE } from "./lib.mjs";
import { WORLDS, build } from "./dworlds.mjs";
import { load as loadPlanted } from "../../loaders/planted.mjs";
fs.mkdirSync(path.join(HERE, "out/D"), { recursive: true });
const KEYS = ["prefixCopy", "firstTokCopy", "posPar", "posParTail"];
const pockets = WORLDS.map((w) => build(w)).concat(await loadPlanted(["pl-null", "pl-null2", "pl-burst", "pl-frames", "pl-parallel", "pl-mix", "pl-markov", "pl-length"]));
const out = [];
for (const p of pockets) {
  const H = halves(p), row = { id: p.id, units: p.units.length, tokens: p.units.reduce((a, u) => a + u.length, 0), notes: p.meta?.notes ?? null, global: {}, within: {} };
  const g = {}, w = {};
  for (const which of ["discover", "confirm"]) { g[which] = cells(H[which], { keys: KEYS, nullKind: "unit-order", draws: 10 }); w[which] = cells(H[which], { keys: KEYS, nullKind: "within-doc", draws: 50, tag: "D" }); }
  for (const k of KEYS) {
    row.global[k] = { status: statusOf(g.discover[k], g.confirm[k]), z: [g.discover[k].z, g.confirm[k].z], v: [g.discover[k].v, g.confirm[k].v], nullMean: [g.discover[k].nullMean, g.confirm[k].nullMean] };
    row.within[k] = { status: statusOf(w.discover[k], w.confirm[k]), z: [w.discover[k].z, w.confirm[k].z], nullMean: [w.discover[k].nullMean, w.confirm[k].nullMean] };
  }
  out.push(row);
  const fz = (x) => (x == null ? "NA" : x.toFixed(1));
  console.error(`${p.id.padEnd(22)} prefix global ${row.global.prefixCopy.status.padEnd(3)} z ${fz(row.global.prefixCopy.z[0])}/${fz(row.global.prefixCopy.z[1])} v ${row.global.prefixCopy.v[0]?.toFixed(4)} | within ${row.within.prefixCopy.status.padEnd(3)} z ${fz(row.within.prefixCopy.z[0])}/${fz(row.within.prefixCopy.z[1])} | posPar g ${row.global.posPar.status} first g ${row.global.firstTokCopy.status}`);
}
fs.writeFileSync(path.join(HERE, "out/D/worlds.json"), JSON.stringify(out, null, 1));
