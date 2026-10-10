// compact table of results-planted.json: v / z per statistic, both halves
import fs from "node:fs";
const R = JSON.parse(fs.readFileSync(new URL("./results-planted.json", import.meta.url), "utf8"));
const ids = Object.keys(Object.values(R.pockets)[0].discover.cells);
console.log("stat".padEnd(9), Object.keys(R.pockets).map((p) => p.slice(3).padEnd(21)).join(""));
for (const s of ids) console.log(s.padEnd(9), Object.keys(R.pockets).map((p) => ["discover", "confirm"].map((w) => { const c = R.pockets[p][w].cells[s]; return `${c.v ?? "-"}/${c.z ?? "-"}`; }).join(" ").padEnd(21)).join(""));
console.log("cpu ms", Object.keys(R.pockets).map((p) => String(R.pockets[p].discover.cpuMsPerCall).padEnd(21)).join(""));
