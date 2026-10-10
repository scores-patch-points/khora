// run-real.mjs -- attacks B2 + E: for every real pocket, suffixCopy and its rival / decomposition statistics under FOUR null worlds (atlas unit-order; within-document; length-class-preserving; within-document + length-class), 20 draws, both halves.
//   node run-real.mjs [--ids a,b|all] [--draws 20] [--out out/real]
import fs from "node:fs";
import path from "node:path";
import { halves, cells, prepView, loadCached, HERE, CACHE, NULLKINDS, tokensOf, optOf } from "./lib.mjs";
const o = optOf(process.argv.slice(2)), ids0 = o("--ids", "all"), DRAWS = Number(o("--draws", 20)), OUT = path.join(HERE, o("--out", "out/real"));
fs.mkdirSync(OUT, { recursive: true });
const ids = ids0 === "all" ? fs.readdirSync(CACHE).filter((x) => x.endsWith(".json")).map((x) => x.slice(0, -5)).sort() : ids0.split(",");
for (const id of ids) {
  const file = path.join(OUT, `${id}.json`);
  if (fs.existsSync(file)) continue;
  const p = loadCached(id), H = halves(p), res = { id, meta: { group: p.group, register: p.register, language: p.language, script: p.script ?? null, grain: p.meta?.grain ?? null, tokens: tokensOf(p.units), units: p.units.length, docs: new Set(p.docOf).size, meanUnitLength: tokensOf(p.units) / p.units.length }, draws: DRAWS, halves: {} };
  for (const which of ["discover", "confirm"]) {
    const P = prepView(H[which]); res.halves[which] = {};
    for (const kind of NULLKINDS) res.halves[which][kind] = cells(P, { id, which, nullKind: kind, draws: DRAWS });
  }
  fs.writeFileSync(file, JSON.stringify(res));
  console.error(id, "done");
}
console.error("ALL DONE", ids.length);
