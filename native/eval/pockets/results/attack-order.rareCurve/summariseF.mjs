// summariseF.mjs -- digest of F_raw_*.jsonl -> F_summary.json: per unit-length stratum and pocket class, number of defined pockets, PRESENT + / PRESENT - counts, median v. node summariseF.mjs
import fs from "node:fs";
import path from "node:path";
import { HERE, median } from "./lib.mjs";
const rows = []; for (const f of fs.readdirSync(HERE).filter((x) => /^F_raw_\d+\.jsonl$/.test(x)).sort()) for (const l of fs.readFileSync(path.join(HERE, f), "utf8").split("\n").filter(Boolean)) rows.push(JSON.parse(l));
const NAMES = ["3-4", "5-6", "7-9", "10-14", "15-24", "25+"];
const cls = (r) => (r.grain === "code" ? "code" : r.grain === "word" ? (r.status0 === "P-" ? "word(atlas P-)" : r.status0 === "P+" ? "word(atlas P+)" : "word(other)") : r.grain);
const classes = ["word(atlas P+)", "word(atlas P-)", "word(other)", "code", "notation", "charbigram"];
const out = { n: rows.length, strata: NAMES, byClass: {} };
for (const c of classes) {
  out.byClass[c] = NAMES.map((nm, si) => { const rs = rows.filter((r) => cls(r) === c && r.strata[si]); const vs = rs.map((r) => r.strata[si].v); return { stratum: nm, nPockets: rs.length, nPplus: rs.filter((r) => r.strata[si].status === "P+").length, nPminus: rs.filter((r) => r.strata[si].status === "P-").length, nPos: vs.filter((v) => v > 0).length, medianV: vs.length ? +median(vs).toFixed(4) : null }; });
}
// all word-grain vs all code pockets (pooled), regardless of atlas status
for (const [lab, filt] of [["ALL word grain", (r) => r.grain === "word"], ["ALL code grain", (r) => r.grain === "code"]]) out.byClass[lab] = NAMES.map((nm, si) => { const rs = rows.filter((r) => filt(r) && r.strata[si]); const vs = rs.map((r) => r.strata[si].v); return { stratum: nm, nPockets: rs.length, nPplus: rs.filter((r) => r.strata[si].status === "P+").length, nPminus: rs.filter((r) => r.strata[si].status === "P-").length, nPos: vs.filter((v) => v > 0).length, medianV: vs.length ? +median(vs).toFixed(4) : null }; });
// within-code: sign by stratum for the 45 code pockets that are atlas P-
out.codePminus = NAMES.map((nm, si) => { const rs = rows.filter((r) => r.grain === "code" && r.status0 === "P-" && r.strata[si]); return { stratum: nm, n: rs.length, nPos: rs.filter((r) => r.strata[si].v > 0).length, nPminus: rs.filter((r) => r.strata[si].status === "P-").length, nPplus: rs.filter((r) => r.strata[si].status === "P+").length, medianV: rs.length ? +median(rs.map((r) => r.strata[si].v)).toFixed(4) : null }; });
fs.writeFileSync(path.join(HERE, "F_summary.json"), JSON.stringify(out, null, 1));
for (const [c, a] of Object.entries(out.byClass)) { console.log("==", c); for (const x of a) console.log("  ", x.stratum.padEnd(6), `n ${x.nPockets} P+ ${x.nPplus} P- ${x.nPminus} v>0 ${x.nPos} med ${x.medianV}`); }
console.log("== code atlas-P- by stratum"); for (const x of out.codePminus) console.log("  ", JSON.stringify(x));
