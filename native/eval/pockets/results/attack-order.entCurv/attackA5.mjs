// attackA5.mjs -- ATTACK A (continued): EDGE ABLATION on all 391 real pockets. Delete the FIRST token of every unit (dropFirst), or the LAST (dropLast), keep units that still have >= 3 tokens, recompute the atlas cell
// (ranks re-derived on the ablated view, 10 within-unit null draws, atlas seeds). If entCurv is "edges specialised", removing either edge should shrink it; a statistic carried by ONE edge flips / vanishes under that ablation only.
//   node attackA5.mjs PART NPARTS [ids] -> A5_raw_<PART>.jsonl
import fs from "node:fs";
import path from "node:path";
import { loadCached, halves, cell, statusOf, HERE, TABLE } from "./lib.mjs";
const [PART, NP, FILTER] = [Number(process.argv[2] || 0), Number(process.argv[3] || 1), process.argv[4]];
const T = TABLE(), rows = T.rows.filter((r) => r.kind === "real" && !r.thin && (!FILTER || FILTER.split(",").includes(r.id)));
const mine = rows.filter((_, i) => i % NP === PART);
const cut = (view, first) => { const units = [], docOf = []; view.units.forEach((u, k) => { if (u.length >= 4) { units.push(first ? u.slice(1) : u.slice(0, -1)); docOf.push(view.docOf[k]); } }); return { ...view, units, docOf }; };
const out = fs.createWriteStream(path.join(HERE, `A5_raw_${PART}.jsonl`));
for (const r of mine) {
  const p = loadCached(r.id), H = halves(p), o = { id: r.id, grain: r.grain, register: r.register, status0: r.status, v0: r.v["order.entCurv"], variants: {} };
  for (const [name, first] of [["dropFirst", true], ["dropLast", false]]) {
    const c = ["discover", "confirm"].map((w) => cell(cut(H[w], first), { seedId: r.id, which: w }));
    o.variants[name] = c[0] && c[1] && c[0].z != null && c[1].z != null ? { status: statusOf(c[0], c[1]), v: (c[0].v + c[1].v) / 2, z: [c[0].z, c[1].z] } : { status: "undef" };
  }
  out.write(JSON.stringify(o) + "\n");
  console.error(`${r.id} ${r.status} first ${o.variants.dropFirst.status} last ${o.variants.dropLast.status}`);
}
out.end();
