// attackA5_agg.mjs -- aggregate edge ablation -> A5_summary.json
import fs from "node:fs";
import path from "node:path";
import { HERE, median } from "./lib.mjs";
const rows = [0, 1, 2, 3].flatMap((i) => fs.readFileSync(path.join(HERE, `A5_raw_${i}.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const sg = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0), out = { n: rows.length, groups: {} };
for (const [lab, f] of [["word P+", (r) => r.grain === "word" && r.status0 === "P+"], ["word P-", (r) => r.grain === "word" && r.status0 === "P-"], ["code P-", (r) => r.grain === "code" && r.status0 === "P-"], ["code P+", (r) => r.grain === "code" && r.status0 === "P+"], ["charbigram P-", (r) => r.grain === "charbigram" && r.status0 === "P-"], ["notation P+", (r) => r.grain === "notation" && r.status0 === "P+"], ["all P+", (r) => r.status0 === "P+"], ["all P-", (r) => r.status0 === "P-"]]) {
  const rs = rows.filter(f), g = { n: rs.length };
  for (const name of ["dropFirst", "dropLast"]) {
    const xs = rs.map((r) => r.variants[name]).filter((x) => x.status !== "undef" && x.v != null), rets = xs.map((x, i) => 0);
    const ret = rs.filter((r) => r.variants[name].status !== "undef").map((r) => (r.variants[name].v * sg(r.v0)) / Math.abs(r.v0));
    g[name] = { evaluated: xs.length, sameSignShare: +(ret.filter((x) => x > 0).length / ret.length).toFixed(3), medianRetention: +median(ret).toFixed(3), PRESENTsame: rs.filter((r) => (r.variants[name].status === "P+" && r.v0 > 0) || (r.variants[name].status === "P-" && r.v0 < 0)).length, PRESENTopp: rs.filter((r) => (r.variants[name].status === "P+" && r.v0 < 0) || (r.variants[name].status === "P-" && r.v0 > 0)).length };
  }
  out.groups[lab] = g;
}
fs.writeFileSync(path.join(HERE, "A5_summary.json"), JSON.stringify(out, null, 1));
for (const [k, g] of Object.entries(out.groups)) console.log(k.padEnd(14), "n", g.n, "| dropFirst", JSON.stringify(g.dropFirst), "| dropLast", JSON.stringify(g.dropLast));
