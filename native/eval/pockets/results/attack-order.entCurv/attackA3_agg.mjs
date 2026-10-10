// attackA3_agg.mjs -- aggregate A3_raw_*.jsonl (bin-granularity sweep and unit-length strata, all real pockets) into A3_summary.json
import fs from "node:fs";
import path from "node:path";
import { HERE, median, f } from "./lib.mjs";
const rows = [0, 1, 2, 3].flatMap((i) => fs.readFileSync(path.join(HERE, `A3_raw_${i}.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const kinds = ["word", "code", "notation", "charbigram"], grainOf = (r) => r.grain;
const SCH = Object.keys(rows[0].schemes), STR = Object.keys(rows[0].strata);
const vOf = (x) => (x && x.D && x.C && x.D.v != null && x.C.v != null ? (x.D.v + x.C.v) / 2 : null);
const cnt = (rs, get) => { const o = { n: 0, "P+": 0, "P-": 0, M: 0, A: 0, undef: 0 }; for (const r of rs) { const s = get(r)?.status ?? "undef"; o.n++; o[s in o ? s : "undef"]++; } const vs = rs.map((r) => vOf(get(r))).filter((x) => x != null); o.medianV = vs.length ? +median(vs).toFixed(5) : null; o.shareVpos = vs.length ? +(vs.filter((x) => x > 0).length / vs.length).toFixed(3) : null; return o; };
const out = { n: rows.length, schemes: {}, strata: {} };
for (const s of SCH) { out.schemes[s] = { all: cnt(rows, (r) => r.schemes[s]) }; for (const k of kinds) out.schemes[s][k] = cnt(rows.filter((r) => grainOf(r) === k), (r) => r.schemes[s]); out.schemes[s].reversal = out.schemes[s].all["P+"] >= 3 && out.schemes[s].all["P-"] >= 3; }
for (const s of STR) { out.strata[s] = { all: cnt(rows, (r) => r.strata[s]) }; for (const k of kinds) out.strata[s][k] = cnt(rows.filter((r) => grainOf(r) === k), (r) => r.strata[s]); }
// within-pocket sign pattern across strata (pockets with >= 2 defined strata): does the sign depend on the stratum within a pocket?
const sg = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
let multi = 0, flips = 0, shortPosLongNeg = 0, shortNegLongPos = 0; const flipRows = [];
for (const r of rows) {
  const vs = STR.map((s) => ({ s, v: vOf(r.strata[s]) })).filter((x) => x.v != null);
  if (vs.length < 2) continue; multi++;
  const signs = new Set(vs.map((x) => sg(x.v))); if (signs.size > 1) { flips++; flipRows.push(r.id); if (vs[0].v > 0 && vs[vs.length - 1].v < 0) shortPosLongNeg++; if (vs[0].v < 0 && vs[vs.length - 1].v > 0) shortNegLongPos++; }
}
out.withinPocket = { pocketsWith2plusStrata: multi, signChangesAcrossStrata: flips, shortPos_longNeg: shortPosLongNeg, shortNeg_longPos: shortNegLongPos };
// the central comparison: at a FIXED length stratum, is the code-vs-word sign split still there? (pockets defined in that stratum, pocket-mean v)
out.fixedLengthSplit = {};
for (const s of STR) { const w = rows.filter((r) => r.grain === "word").map((r) => vOf(r.strata[s])).filter((x) => x != null), c = rows.filter((r) => r.grain === "code").map((r) => vOf(r.strata[s])).filter((x) => x != null);
  out.fixedLengthSplit[s] = { word: { n: w.length, medianV: +median(w).toFixed(5), sharePos: +(w.filter((x) => x > 0).length / Math.max(1, w.length)).toFixed(3) }, code: { n: c.length, medianV: c.length ? +median(c).toFixed(5) : null, sharePos: c.length ? +(c.filter((x) => x > 0).length / c.length).toFixed(3) : null } }; }
// pockets whose atlas status is P- : sign and status at fixed strata
const minus = rows.filter((r) => r.status0 === "P-"), plus = rows.filter((r) => r.status0 === "P+");
out.atlasMinusAtStrata = Object.fromEntries(STR.map((s) => [s, cnt(minus, (r) => r.strata[s])]));
out.atlasPlusAtStrata = Object.fromEntries(STR.map((s) => [s, cnt(plus, (r) => r.strata[s])]));
fs.writeFileSync(path.join(HERE, "A3_summary.json"), JSON.stringify(out, null, 1));
const pr = (o) => `n${o.n} P+${o["P+"]} P-${o["P-"]} M${o.M} A${o.A} u${o.undef} medV ${o.medianV} pos ${o.shareVpos}`;
console.log("== schemes (rows: all / word / code)");
for (const s of SCH) console.log(s.padEnd(7), "ALL", pr(out.schemes[s].all), "| WORD", pr(out.schemes[s].word), "| CODE", pr(out.schemes[s].code), "| rev", out.schemes[s].reversal);
console.log("== strata");
for (const s of STR) console.log(s.padEnd(6), "ALL", pr(out.strata[s].all), "| WORD", pr(out.strata[s].word), "| CODE", pr(out.strata[s].code));
console.log(JSON.stringify(out.withinPocket)); console.log(JSON.stringify(out.fixedLengthSplit));
console.log("atlas P- at strata:", JSON.stringify(Object.fromEntries(STR.map((s) => [s, pr(out.atlasMinusAtStrata[s])]))));
