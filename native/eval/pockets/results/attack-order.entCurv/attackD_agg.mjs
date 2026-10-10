// attackD_agg.mjs -- summarise D_worlds.json (new planted worlds) next to the atlas's own planted worlds -> D_summary.json
import fs from "node:fs";
import path from "node:path";
import { HERE, TABLE, f } from "./lib.mjs";
const D = JSON.parse(fs.readFileSync(path.join(HERE, "D_worlds.json"), "utf8")).worlds, T = TABLE();
const sgn = (st) => (st === "P+" ? "+" : st === "P-" ? "-" : st === "A" ? "0" : "~");
const rows = D.map((w) => ({ id: w.id, world: w.world, len: w.len, meanUnitLength: w.meanUnitLength, entCurv_oct: w.stats.oct.status, v: +((w.stats.oct.vD + w.stats.oct.vC) / 2).toFixed(4), zmin: +Math.min(Math.abs(w.stats.oct.zD), Math.abs(w.stats.oct.zC)).toFixed(1),
  entCurv_half: w.stats.half.status, entCurv_mass4: w.stats.mass4.status, v_mass4: +((w.stats.mass4.vD + w.stats.mass4.vC) / 2).toFixed(4), rareCurve: w.stats.rareCurve.status, entSlope: w.stats.entSlope.status, rareSlope: w.stats.rareSlope.status,
  midMinusFirst: +((w.thirds[0].midMinusFirst + w.thirds[1].midMinusFirst) / 2).toFixed(4), midMinusLast: +((w.thirds[0].midMinusLast + w.thirds[1].midMinusLast) / 2).toFixed(4) }));
const atlasPl = T.rows.filter((r) => r.group === "pl" || r.id.startsWith("pl-")).map((r) => ({ id: r.id, entCurv: r.st["order.entCurv"], v: r.v["order.entCurv"] != null ? +r.v["order.entCurv"].toFixed(4) : null, rareCurve: r.st["order.rareCurve"], entSlope: r.st["order.entSlope"] }));
const out = { newWorlds: rows, atlasPlanted: atlasPl };
// logic of the attack
const by = (w, l) => rows.find((r) => r.world === w && r.len === l);
out.claims = {
  nullWorldsAbsentOct: ["null", "null2", "lenmix"].every((w) => ["long", "short"].every((l) => by(w, l).entCurv_oct !== "P+" && by(w, l).entCurv_oct !== "P-")),
  oneEdgeIsEnoughForPositive: ["start", "end"].map((w) => ["long", "short"].map((l) => by(w, l).entCurv_oct)),
  driftNoEdgeStillPositive: ["long", "short"].map((l) => by("drift", l).entCurv_oct),
  twoEdgeMechanismCanBeNegative: ["long", "short"].map((l) => ({ both: by("both", l).entCurv_oct, bothpeak: by("bothpeak", l).entCurv_oct })),
  sameWorldSignFlipsWithUnitLength: ["kwpeak"].map((w) => ({ long: by(w, "long").entCurv_oct, short: by(w, "short").entCurv_oct })),
  sameWorldSignFlipsWithBinScheme: rows.filter((r) => (r.entCurv_oct === "P+" && r.entCurv_mass4 === "P-") || (r.entCurv_oct === "P-" && r.entCurv_mass4 === "P+")).map((r) => r.id),
};
fs.writeFileSync(path.join(HERE, "D_summary.json"), JSON.stringify(out, null, 1));
console.log("world".padEnd(22), "mul  oct v zmin | half mass4 v4 | rare entSl rareSl | mid-first mid-last");
for (const r of rows) console.log(r.id.padEnd(22), String(r.meanUnitLength).padEnd(5), sgn(r.entCurv_oct), String(r.v).padEnd(8), String(r.zmin).padEnd(6), "|", sgn(r.entCurv_half), sgn(r.entCurv_mass4), String(r.v_mass4).padEnd(8), "|", sgn(r.rareCurve), sgn(r.entSlope), sgn(r.rareSlope), "|", r.midMinusFirst, r.midMinusLast);
console.log(JSON.stringify(out.claims));
console.log(JSON.stringify(atlasPl));
