// tests/fig/show.mjs — print a results-*.json as a compact table: node show.mjs planted [field=z|v|nm|sd]
import fs from "node:fs";
const part = process.argv[2], field = process.argv[3] || "z", d = JSON.parse(fs.readFileSync(new URL(`results-${part}.json`, import.meta.url)));
const rows = Object.entries(d).filter(([, r]) => r.stats), ids = Object.keys(rows[0][1].stats);
console.log(["pocket".padEnd(26), "tok".padStart(6), "ms".padStart(4), ...ids.map((s) => s.slice(0, 10).padStart(10))].join(" "));
for (const [k, r] of rows) console.log([k.padEnd(26), String(r.tokens).padStart(6), String(r.ms).padStart(4), ...ids.map((s) => String(r.stats[s][field] ?? "null").padStart(10))].join(" "));
