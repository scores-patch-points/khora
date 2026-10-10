// attackE.mjs -- INTRODUCTION-SPECIFICITY diagnostics on REAL pockets (part of attack D's reading: is the pattern a first-mention frame or a recurring-versus-hapax TYPE-CLASS effect?).
//   node attackE.mjs <idlist|file> [tag] -> E_<tag>.json.  Per pocket, atlas halves, 10 within-unit draws, d = v - nullMean (half-average):
//   d1 = introRight (first occurrences, the atlas statistic);  d2 / d3 = the same with the 2nd / 3rd occurrence of recurring types as events (hapax first occurrences stay the negatives);
//   fs = paired first-vs-second contrast (types with >= 2 occurrences, both with a right neighbour), standardised, null = within-unit shuffle;
//   dose = d for positives restricted to own count in [2], [3,4], [5,8], [9,16], [17,inf) (frequency dose-response).
import fs from "node:fs"; import path from "node:path";
import { halves, loadCached, HERE, f, statusOf } from "./lib.mjs"; import { cellFn, introSide, firstVsLater, dCell } from "./variants.mjs";
const [idsArg, tag = ""] = process.argv.slice(2);
const ids = fs.existsSync(idsArg) ? fs.readFileSync(idsArg, "utf8").trim().split(",") : idsArg.split(",");
const out = {};
for (const id of ids) {
  const p = loadCached(id), H = halves(p), r = {};
  const defs = { d1: (P) => introSide(P, { occ: 1 }), d2: (P) => introSide(P, { occ: 2 }), d3: (P) => introSide(P, { occ: 3 }), fs: (P) => firstVsLater(P),
    c2: (P) => introSide(P, { occ: 1, cntLo: 2, cntHi: 2 }), c34: (P) => introSide(P, { occ: 1, cntLo: 3, cntHi: 4 }), c58: (P) => introSide(P, { occ: 1, cntLo: 5, cntHi: 8 }), c916: (P) => introSide(P, { occ: 1, cntLo: 9, cntHi: 16 }), c17: (P) => introSide(P, { occ: 1, cntLo: 17 }) };
  for (const [k, fn] of Object.entries(defs)) {
    const a = cellFn(H.discover, fn, 10, id, "discover"), b = cellFn(H.confirm, fn, 10, id, "confirm"), da = dCell(a), db = dCell(b);
    r[k] = { d: da != null && db != null ? (da + db) / 2 : null, dD: da, dC: db, zD: a.z, zC: b.z, status: statusOf(a, b) };
  }
  out[id] = r;
  console.error(id.padEnd(24), "d1", f(r.d1.d, 3), r.d1.status, "| d2", f(r.d2.d, 3), "(z", f(r.d2.zD, 1), f(r.d2.zC, 1) + ") d3", f(r.d3.d, 3), "| fs", f(r.fs.d, 3), "(z", f(r.fs.zD, 1), f(r.fs.zC, 1) + ") | dose", ["c2", "c34", "c58", "c916", "c17"].map((k) => f(r[k].d, 2)).join(" "));
}
fs.writeFileSync(path.join(HERE, `E${tag ? "_" + tag : ""}.json`), JSON.stringify(out, null, 1));
