// diag-being.mjs — EXPLORATORY (post-hoc): is the cast's slope difference in P&P carried by tokens the reader HEARS as beings (entry slots)?
import fs from "node:fs"; import path from "node:path";
import { OUT, round, mean } from "./lib.mjs";
const nov = process.argv[2] ?? "pp", recs = [];
for (const f of fs.readdirSync(OUT).filter((f) => f.startsWith(`frag-${nov}-shard`))) for (const l of fs.readFileSync(path.join(OUT, f), "utf8").split("\n").filter(Boolean)) { const r = JSON.parse(l); if (!r.determinism) { r.D1 = Math.log2(1 + r.changed); recs.push(r); } }
const grp = (r) => r.groups.includes("cast") ? "cast" : r.groups.includes("ctrlF") ? "ctrlF" : "other";
const hi = recs.filter((r) => r.m >= 3 && (r.groups.includes("cast") || r.groups.includes("ctrlF")));
const out = {};
for (const g of ["cast", "ctrlF"]) for (const being of [true, false]) {
  const rs = hi.filter((r) => r.groups.includes(g) && r.isBeing === being);
  const bins = {}; for (let mb = 2; mb < 8; mb++) { const x = rs.filter((r) => r.mb === mb); if (x.length) bins[mb] = { n: x.length, d1: round(mean(x.map((r) => r.D1)), 2), entry: round(mean(x.map((r) => r.entry)), 2) }; }
  out[`${g}|being=${being}`] = { n: rs.length, meanD1: round(mean(rs.map((r) => r.D1)), 3), meanEntry: round(mean(rs.map((r) => r.entry)), 3), shareNull: round(mean(rs.map((r) => (r.null ? 1 : 0)))), byMbin: bins };
}
console.log(JSON.stringify(out, null, 1));
