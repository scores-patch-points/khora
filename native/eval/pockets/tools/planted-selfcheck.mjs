// eval/pockets/tools/planted-selfcheck.mjs — verify the planted worlds with the atlas' own mechanics (halves() split, nullView(), 10 seeded draws, z = (v - nullMean)/nullSd) using the simple reference statistics in selfcheck-stats.mjs.
//   node tools/planted-selfcheck.mjs [--pockets id1,id2] [--out results/planted-selfcheck.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { halves, nullView, seedOf } from "../lib/pocket.mjs";
import { load } from "../loaders/planted.mjs";
import { STATS } from "./selfcheck-stats.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = path.resolve(HERE, "..", opt("--out", "results/planted-selfcheck.json")), only = opt("--pockets", null)?.split(","), DRAWS = 10;
const msd = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
const res = { note: "reference statistics (tools/selfcheck-stats.mjs) on planted pockets; same split and null mechanics as run-atlas.mjs; DRAWS=10", draws: DRAWS, pockets: {} };
for (const p of await load(only)) {
  const H = halves(p); res.pockets[p.id] = {};
  for (const which of ["discover", "confirm"]) {
    const view = H[which]; res.pockets[p.id][which] = {};
    for (const s of STATS) {
      const v = s.fn(view), xs = [];
      for (let k = 0; k < DRAWS; k++) { const x = s.fn(nullView(view, s.null, seedOf(p.id, which, "selfcheck", s.id, s.null, k))); if (Number.isFinite(x)) xs.push(x); }
      const { m, sd } = xs.length >= 3 ? msd(xs) : { m: NaN, sd: NaN };
      res.pockets[p.id][which][s.id] = { v, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, null: s.null };
    }
    console.error(`${p.id}/${which} done`);
  }
}
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
const f = (x) => (x == null ? "   .  " : (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(2)).padStart(6));
console.error(["pocket/half".padEnd(18), ...STATS.map((s) => s.id.slice(0, 9).padStart(9))].join(" "));
for (const [id, hs] of Object.entries(res.pockets)) for (const [w, r] of Object.entries(hs)) console.error([`${id}/${w.slice(0, 3)}`.padEnd(18), ...STATS.map((s) => `${f(r[s.id].v).padStart(5)}|${f(r[s.id].z).trim().padStart(4)}`)].join(" "));
