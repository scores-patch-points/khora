// attackA_agg.mjs -- aggregate A_raw_*.jsonl into A_summary.json (per variant, per atlas sign: how many keep the sign, are PRESENT same / opposite, median v ratio) + by-group breakdown.
import fs from "node:fs";
import path from "node:path";
import { HERE, median, f } from "./lib.mjs";
const rows = [0, 1, 2, 3].flatMap((i) => fs.readFileSync(path.join(HERE, `A_raw_${i}.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const variants = Object.keys(rows[0].variants);
const sg = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const sum = { n: rows.length, baseMaxAbsDiffToAtlas: Math.max(...rows.map((r) => r.variants.base.maxAbsDiffToAtlas)), variants: {}, byKind: {} };
const kindOf = (r) => (r.grain === "code" ? "code-grain" : r.grain === "notation" ? "notation" : r.grain === "charbigram" ? "charbigram" : "word-grain");
function agg(rs, vname) {
  const o = { atlasN: rs.length, evaluated: 0, skipped: 0, Psame: 0, Popp: 0, M: 0, A: 0, weakSame: 0, weakOpp: 0, signKept: 0, ratios: [], zHalfMedian: [] };
  for (const r of rs) {
    const x = r.variants[vname], s0 = sg(r.v0);
    if (!x || x.skipped || x.v == null) { o.skipped++; continue; }
    o.evaluated++;
    const st = x.status, dsame = (st === "P+" && s0 > 0) || (st === "P-" && s0 < 0), dopp = (st === "P+" && s0 < 0) || (st === "P-" && s0 > 0);
    if (dsame) o.Psame++; else if (dopp) o.Popp++; else if (st === "M") o.M++; else if (st === "A") o.A++;
    const zs = [x.discover.z, x.confirm.z];
    if (zs.every((z) => z != null && Math.abs(z) >= 2 && sg(z) === s0)) { if (!dsame) o.weakSame++; }
    if (zs.every((z) => z != null && Math.abs(z) >= 2 && sg(z) === -s0)) { if (!dopp) o.weakOpp++; }
    if (sg(x.v) === s0) o.signKept++;
    o.ratios.push((x.v * s0) / Math.abs(r.v0));       // signed retention: 1 = same effect size, 0 = vanished, <0 flipped
  }
  o.medianRetention = median(o.ratios); o.signKeptShare = o.evaluated ? +(o.signKept / o.evaluated).toFixed(3) : null; delete o.ratios; return o;
}
for (const v of variants) {
  sum.variants[v] = { plus: agg(rows.filter((r) => r.v0 > 0), v), minus: agg(rows.filter((r) => r.v0 < 0), v) };
}
for (const k of ["word-grain", "code-grain", "notation", "charbigram"]) {
  const rs = rows.filter((r) => kindOf(r) === k); if (!rs.length) continue;
  sum.byKind[k] = { n: rs.length, nPlus: rs.filter((r) => r.v0 > 0).length, nMinus: rs.filter((r) => r.v0 < 0).length, variants: {} };
  for (const v of variants) sum.byKind[k].variants[v] = { plus: agg(rs.filter((r) => r.v0 > 0), v), minus: agg(rs.filter((r) => r.v0 < 0), v) };
}
// replicate ceiling: r0 vs r1 at the same design (sign agreement of v)
for (const d of ["tok7500", "tok7500len10"]) {
  let both = 0, same = 0, bothP = 0, sameP = 0;
  for (const r of rows) { const a = r.variants[d + "_r0"], b = r.variants[d + "_r1"]; if (!a || !b || a.v == null || b.v == null) continue; both++; if (sg(a.v) === sg(b.v)) same++; if ((a.status === "P+" || a.status === "P-") && (b.status === "P+" || b.status === "P-")) { bothP++; if (a.status === b.status) sameP++; } }
  sum["replicateCeiling_" + d] = { both, signAgree: same, bothPresent: bothP, bothPresentSameSign: sameP };
}
// the REVERSAL itself under equal size + equal mean unit length: pocket-level signed v (mean over the 2 replicates), by atlas class
const rev = {};
for (const d of ["tok7500", "tok7500len10", "len10full", "tok20000"]) {
  const get = (r) => { const xs = d.startsWith("tok7500") ? [r.variants[d + "_r0"], r.variants[d + "_r1"]] : [r.variants[d]]; const vs = xs.filter((x) => x && x.v != null).map((x) => x.v); return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null; };
  const o = {};
  for (const k of ["word-grain", "code-grain", "notation", "charbigram"]) { const vs = rows.filter((r) => kindOf(r) === k).map(get).filter((x) => x != null); if (vs.length) o[k] = { n: vs.length, medianV: +median(vs).toFixed(5), share_pos: +(vs.filter((x) => x > 0).length / vs.length).toFixed(3) }; }
  rev[d] = o;
}
sum.signByKindUnderVariant = rev;
fs.writeFileSync(path.join(HERE, "A_summary.json"), JSON.stringify(sum, null, 1));
console.log("n", rows.length, "base diff", sum.baseMaxAbsDiffToAtlas);
for (const v of variants) { const p = sum.variants[v].plus, m = sum.variants[v].minus; console.log(v.padEnd(14), "P+ (", p.atlasN, ") eval", p.evaluated, "same", p.Psame, "opp", p.Popp, "signKept", p.signKept, "ret", f(p.medianRetention), " | P- (", m.atlasN, ") eval", m.evaluated, "same", m.Psame, "opp", m.Popp, "signKept", m.signKept, "ret", f(m.medianRetention)); }
console.log(JSON.stringify(sum.signByKindUnderVariant));
console.log(JSON.stringify({ a: sum.replicateCeiling_tok7500, b: sum.replicateCeiling_tok7500len10 }));
