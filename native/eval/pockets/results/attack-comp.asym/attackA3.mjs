// attackA3.mjs -- ATTACK A part 3: which of the 20 commonest types carry the sign?  For every atlas-PRESENT pocket and both halves: the per-type terms d_t = (H_R - H_L)/(H_R + H_L) of the 20 commonest types (asymTypes),
// mean of the terms over ranks 1-5, 6-10, 11-15, 16-20, 1-10, 11-20, the share of the qualifying types whose own term has the pocket's atlas sign, and the sign of mean(1-10) vs mean(11-20).   Output A3.json.   node attackA3.mjs
import fs from "node:fs";
import path from "node:path";
import { halves, loadCached, prep, TABLE, HERE } from "./lib.mjs";
import { asymTypes } from "./asymvar.mjs";
const rows = TABLE().filter((r) => r.kind === "real" && (r.status === "P+" || r.status === "P-")), out = [];
const mean = (a) => { const x = a.filter((v) => v != null); return x.length ? x.reduce((p, q) => p + q, 0) / x.length : null; };
for (const r of rows) {
  const H = halves(loadCached(r.id)), rec = { id: r.id, status: r.status, register: r.register, group: r.group, language: r.language, halves: {} };
  for (const w of ["discover", "confirm"]) {
    const d = asymTypes(prep(H[w])), sg = r.status === "P+" ? 1 : -1, q = d.filter((x) => x != null);
    rec.halves[w] = { n: q.length, g1_5: mean(d.slice(0, 5)), g6_10: mean(d.slice(5, 10)), g11_15: mean(d.slice(10, 15)), g16_20: mean(d.slice(15, 20)), g1_10: mean(d.slice(0, 10)), g11_20: mean(d.slice(10, 20)), all: mean(d), shareOwnSign: q.length ? q.filter((x) => Math.sign(x) === sg).length / q.length : null, terms: d.map((x) => (x == null ? null : Number(x.toFixed(4)))) };
  }
  out.push(rec);
}
fs.writeFileSync(path.join(HERE, "A3.json"), JSON.stringify(out));
console.error("done", out.length);
