import fs from "node:fs";
const files = process.argv.slice(2);
const ids = ["burstB","burstBmid","burstM","repAdj","kerSlope","kerCurv","kerFar","persist","driftSlope","driftTail","hurst"];
const f = (x, w = 7) => (x == null ? "null" : (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(Math.abs(x) < 1 ? 3 : 2))).padStart(w);
for (const file of files) for (const r of JSON.parse(fs.readFileSync(file, "utf8"))) {
  console.log(`\n${r.pocket}/${r.slice} tokens=${r.tokens} units=${r.units} docs=${r.docs} cpu/call=${r.cpuSecPerNullCall}s`);
  console.log("stat".padEnd(11) + ["v", "nullMean", "nullSd", "z"].map((h) => h.padStart(9)).join(""));
  for (const s of ids) { const t = r.stats[s]; console.log(s.padEnd(11) + [t.v, t.nullMean, t.nullSd, t.z].map((x) => f(x, 9)).join("") + (t.n < 10 ? `  n=${t.n}` : "")); }
}
