// attackB2.mjs -- candidate cheap rivals / definition variants of comp.asym, observed value v only, both halves, every real non-thin pocket in the atlas table.  Output B2raw.json {id: {discover: {name: v}, confirm: {...}}}.
//   node attackB2.mjs [--pockets id1,id2]
import fs from "node:fs";
import path from "node:path";
import { halves, loadCached, prep, TABLE, HERE } from "./lib.mjs";
import { asymVar, edgeGrad, posSlope } from "./asymvar.mjs";
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const WANT = opt("--pockets", null)?.split(",") ?? TABLE().filter((r) => r.kind === "real" && !r.thin).map((r) => r.id), out = {};
const V = {
  asym: (P) => asymVar(P), plug: (P) => asymVar(P, { mm: false }), deep2: (P) => asymVar(P, { margin: 2 }), deep3: (P) => asymVar(P, { margin: 3 }),
  k10: (P) => asymVar(P, { K: 10, minOcc: 40 }), k40: (P) => asymVar(P, { K: 40 }), meanbin: (P) => asymVar(P, { mode: "meanbin" }), distinct: (P) => asymVar(P, { mode: "distinct" }), topadj: (P) => asymVar(P, { mode: "topadj" }),
  edgeGrad, posSlope,
};
for (const id of WANT) {
  const p = loadCached(id), H = halves(p); out[id] = {};
  for (const w of ["discover", "confirm"]) { const P = prep(H[w]); out[id][w] = {}; for (const [k, fn] of Object.entries(V)) { const x = fn(P); out[id][w][k] = Number.isFinite(x) ? x : null; } }
  console.error(id);
}
fs.writeFileSync(path.join(HERE, "B2raw.json"), JSON.stringify(out));
