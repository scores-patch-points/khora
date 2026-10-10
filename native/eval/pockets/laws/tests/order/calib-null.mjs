// calib-null.mjs — false-positive calibration of the "order" family: (A) 20 replicate iid worlds of each planted null kind (same generators as pl-null / pl-null2, other seeds), both halves, 10 within-unit null draws,
// count cells with |z| >= 4 / >= 2; (B) REAL pockets whose tokens were shuffled WITHIN each unit once (law-free for this family by construction, real vocabulary, real unit lengths): z of that shuffled pocket against 10 independent null draws.
//   node calib-null.mjs out.json [reps]
import fs from "node:fs";
import { halves, nullView, seedOf } from "../../../lib/pocket.mjs";
import { NDOCS, buildDocs, lexicon } from "../../../loaders/_planted-core.mjs";
import { NULL, NULL2 } from "../../../loaders/_planted-worlds1.mjs";
import * as fam from "../../order.mjs";
const [out, repsArg] = process.argv.slice(2), REPS = Number(repsArg || 20);
const msd = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
const zOf = (view, id, which, tag) => { const obs = fam.compute(view), dr = []; for (let k = 0; k < 10; k++) dr.push(fam.compute(nullView(view, "within-unit", seedOf(id, which, tag, k)))); const z = {}; for (const s of fam.STATS) { const xs = dr.map((d) => d[s.id]).filter(Number.isFinite), { m, sd } = xs.length >= 3 ? msd(xs) : { m: NaN, sd: NaN }; z[s.id] = Number.isFinite(obs[s.id]) && sd > 0 ? (obs[s.id] - m) / sd : null; } return z; };
const res = { A: {}, B: {} };
for (const [name, W] of [["pl-null", NULL], ["pl-null2", NULL2]]) {
  let cells = 0, ge4 = 0, ge2 = 0; const hits = [], perStat = Object.fromEntries(fam.STATS.map((s) => [s.id, { cells: 0, ge4: 0, ge2: 0 }]));
  for (let r = 0; r < REPS; r++) {
    const id = `${name}-rep${r}`, { units, docOf } = buildDocs(id, NDOCS, W.docMaker, lexicon(W.lexTag)), H = halves({ id, units, docOf });
    for (const which of ["discover", "confirm"]) { const z = zOf(H[which], id, which, "calib");
      for (const s of fam.STATS) { const v = z[s.id]; if (v == null) continue; cells++; perStat[s.id].cells++; if (Math.abs(v) >= 4) { ge4++; perStat[s.id].ge4++; hits.push({ id, which, stat: s.id, z: +v.toFixed(2) }); } if (Math.abs(v) >= 2) { ge2++; perStat[s.id].ge2++; } } }
  }
  res.A[name] = { reps: REPS, cells, ge4, ge2, rateGe4: +(ge4 / cells).toFixed(4), rateGe2: +(ge2 / cells).toFixed(4), hits, perStat }; console.error(name, "done", ge4, ge2, cells);
}
const LOADER = { bk: "books", ud: "ud", cd: "codemisc", ml: "ml", oc: "organic" };
for (const id of ["bk-great-expect", "ud-fra", "cd-cc-python", "ml-lzh-shiji", "oc-irc-ubuntu-0406", "bk-dante"]) {
  const { load } = await import(`../../../loaders/${LOADER[id.split("-")[0]]}.mjs`), [p] = await load([id]); if (!p) continue;
  const H = halves(p); res.B[id] = {};
  for (const which of ["discover", "confirm"]) { const sh = nullView(H[which], "within-unit", seedOf("calib-real-shuffle", id, which)), z = zOf(sh, id, which, "calibB"); res.B[id][which] = Object.fromEntries(Object.entries(z).map(([k, v]) => [k, v == null ? null : +v.toFixed(2)])); }
  console.error(id, "done");
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
