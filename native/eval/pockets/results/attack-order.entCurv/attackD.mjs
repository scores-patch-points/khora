// attackD.mjs -- ATTACK D (planted worlds) on order.entCurv. For every world of worlds.mjs x {LONG, SHORT} unit lengths: split by document parity (lib halves), compute with the atlas protocol
// (10 within-unit null draws, seeds derived from the pocket id) entCurv with octave bins (the registered statistic), with half-octave bins and 4 equal-mass bins, plus rareCurve / entSlope / rareSlope
// for context, and the third-entropy decomposition (mid - first, mid - last, in units of H(pooled)).   node attackD.mjs [worldCSV] -> D_worlds.json
import fs from "node:fs";
import path from "node:path";
import { halves, prep, posStats, entc, cell, statusOf, HERE, f } from "./lib.mjs";
import { WORLD_NAMES, buildWorld } from "./worlds.mjs";
const only = process.argv[2]?.split(",");
const FN = { oct: (P) => posStats(P).entCurv, half: (P) => entc(P, { scheme: "half" })?.curv, mass4: (P) => entc(P, { scheme: "mass4" })?.curv, rareCurve: (P) => posStats(P).rareCurve, entSlope: (P) => posStats(P).entSlope, rareSlope: (P) => posStats(P).rareSlope };
const out = { worlds: [] };
for (const lenName of ["long", "short"]) for (const name of WORLD_NAMES) {
  if (only && !only.includes(name)) continue;
  const p = buildWorld(name, lenName), H = halves(p), Ps = { discover: prep(H.discover), confirm: prep(H.confirm) }, o = { id: p.id, world: name, len: lenName, tokens: p.units.reduce((n, u) => n + u.length, 0), units: p.units.length, stats: {} };
  o.meanUnitLength = +(o.tokens / o.units).toFixed(2);
  for (const [k, fn] of Object.entries(FN)) {
    const D = cell(H.discover, { fn, P: Ps.discover }), C = cell(H.confirm, { fn, P: Ps.confirm });
    o.stats[k] = { status: statusOf(D, C), vD: D.v, vC: C.v, zD: D.z, zC: C.z };
  }
  o.thirds = ["discover", "confirm"].map((w) => { const e = entc(Ps[w]); return { midMinusFirst: (e.H[1] - e.H[0]) / e.Hp, midMinusLast: (e.H[1] - e.H[2]) / e.Hp, H: e.H, Hp: e.Hp }; });
  out.worlds.push(o);
  console.error(`${o.id} mul ${o.meanUnitLength} entCurv oct ${o.stats.oct.status} (${f(o.stats.oct.vD, 4)}/${f(o.stats.oct.vC, 4)} z ${f(o.stats.oct.zD, 1)}/${f(o.stats.oct.zC, 1)}) half ${o.stats.half.status} mass4 ${o.stats.mass4.status} (${f(o.stats.mass4.vD, 4)}) | rareCurve ${o.stats.rareCurve.status} entSlope ${o.stats.entSlope.status} rareSlope ${o.stats.rareSlope.status}`);
}
fs.writeFileSync(path.join(HERE, only ? `D_worlds_${only.join("-")}.json` : "D_worlds.json"), JSON.stringify(out, null, 1));
