// attackA2.mjs -- ATTACK A part 2 (definition / grain variants of the statistic itself, on the FULL halves, atlas seeds): for each pocket where comp.asym is PRESENT in the atlas,
// the cell (v, nullMean, nullSd, z; 10 within-unit draws) of  plug (plug-in entropy instead of Miller-Madow), deep2 / deep3 (centre token >= 2 / 3 tokens from both unit edges: first/last 1 or 2 tokens never serve as neighbour),
// k10 / k40 (10 / 40 commonest types instead of 20).  Output A2/<id>.json.   node attackA2.mjs [--pockets id1,id2]
import fs from "node:fs";
import path from "node:path";
import { halves, cell, statusOf, loadCached, prep, TABLE, HERE } from "./lib.mjs";
import { asymVar } from "./asymvar.mjs";
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const WANT = opt("--pockets", null)?.split(",") ?? TABLE().filter((r) => r.kind === "real" && (r.status === "P+" || r.status === "P-")).map((r) => r.id), OUT = path.join(HERE, "A2");
fs.mkdirSync(OUT, { recursive: true });
const rowOf = new Map(TABLE().map((r) => [r.id, r]));
const VAR = { plug: { mm: false }, deep2: { margin: 2 }, deep3: { margin: 3 }, k10: { K: 10 }, k40: { K: 40 } };
for (const id of WANT) {
  const file = path.join(OUT, `${id}.json`); if (fs.existsSync(file)) continue;
  const r = rowOf.get(id), p = loadCached(id), H = halves(p), res = { id, atlasStatus: r.status, register: r.register, group: r.group, language: r.language, tokens: r.tokens, meanUnitLength: r.meanUnitLength, variants: {} };
  for (const [name, o] of Object.entries(VAR)) {
    const fn = (view) => asymVar(prep(view), o), cells = {};
    for (const w of ["discover", "confirm"]) cells[w] = cell(H[w], 10, id, w, fn);
    res.variants[name] = { discover: cells.discover, confirm: cells.confirm, status: statusOf(cells.discover, cells.confirm) };
  }
  fs.writeFileSync(file, JSON.stringify(res)); console.error(`${id} ${r.status} ${Object.entries(res.variants).map(([k, x]) => `${k}:${x.status}`).join(" ")}`);
}
