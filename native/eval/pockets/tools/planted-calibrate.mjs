// eval/pockets/tools/planted-calibrate.mjs — false-positive calibration of the atlas mechanics on REPLICATE iid worlds (same generators as pl-null / pl-null2, other document seeds).
//   node tools/planted-calibrate.mjs [--reps 20] [--out results/planted-calibration.json]
// Counts (statistic, half) cells with |z| >= 4 and |z| >= 2 over the reference statistics whose z is defined (the lexicon-level ones are invariant under every null and are excluded).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { halves, nullView, seedOf } from "../lib/pocket.mjs";
import { NDOCS, buildDocs, lexicon } from "../loaders/_planted-core.mjs";
import { NULL, NULL2 } from "../loaders/_planted-worlds1.mjs";
import { STATS } from "./selfcheck-stats.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const REPS = Number(opt("--reps", 20)), OUT = path.resolve(HERE, "..", opt("--out", "results/planted-calibration.json")), DRAWS = 10;
const USE = STATS.filter((s) => !["lenFreq", "zipfSlope", "meanUnitLen", "nInitBound"].includes(s.id));
const msd = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
const out = { note: "replicate iid worlds, reference statistics, 10 null draws per cell", reps: REPS, stats: USE.map((s) => s.id), worlds: {} };
for (const [name, W] of [["pl-null", NULL], ["pl-null2", NULL2]]) {
  let cells = 0, ge4 = 0, ge2 = 0; const hits = [];
  for (let r = 0; r < REPS; r++) {
    const id = `${name}-rep${r}`, { units, docOf } = buildDocs(id, NDOCS, W.docMaker, lexicon(W.lexTag)), H = halves({ id, units, docOf });
    for (const which of ["discover", "confirm"]) for (const s of USE) {
      const view = H[which], v = s.fn(view), xs = [];
      for (let k = 0; k < DRAWS; k++) { const x = s.fn(nullView(view, s.null, seedOf(id, which, "calib", s.id, k))); if (Number.isFinite(x)) xs.push(x); }
      const { m, sd } = xs.length >= 3 ? msd(xs) : { m: NaN, sd: NaN }, z = Number.isFinite(v) && sd > 0 ? (v - m) / sd : null;
      if (z == null) continue; cells++; if (Math.abs(z) >= 4) { ge4++; hits.push({ id, which, stat: s.id, z: +z.toFixed(2) }); } if (Math.abs(z) >= 2) ge2++;
    }
    console.error(`${id} done; running |z|>=4: ${ge4}/${cells}`);
  }
  out.worlds[name] = { cells, ge4, ge2, rateGe4: ge4 / cells, rateGe2: ge2 / cells, hits };
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.error(JSON.stringify(Object.fromEntries(Object.entries(out.worlds).map(([k, v]) => [k, { cells: v.cells, ge4: v.ge4, ge2: v.ge2 }]))));
