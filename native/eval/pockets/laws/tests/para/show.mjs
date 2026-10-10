// show.mjs — print z (or "n" for null z) per statistic for every entry of a results-<suite>.json.  node show.mjs <suite> [v]
import fs from "node:fs";
const suite = process.argv[2], mode = process.argv[3] || "z", J = JSON.parse(fs.readFileSync(new URL(`./results-${suite}.json`, import.meta.url), "utf8"));
const ids = ["adjNg2", "adjNg3", "adjNg4", "prefixCopy", "suffixCopy", "posPar", "lcsLift", "lagDecay", "refrain", "dupShare", "formulaCov", "tmplReuse"];
console.log("".padEnd(24) + ids.map((i) => i.slice(0, 9).padStart(10)).join(""));
for (const [k, r] of Object.entries(J)) { if (!r.stats) continue; console.log(k.padEnd(24) + ids.map((i) => { const c = r.stats[i]; const x = mode === "v" ? c.v : c.z; return (x === null ? "n" : Math.abs(x) >= 100 ? x.toFixed(0) : mode === "v" ? x.toPrecision(3) : x.toFixed(1)).padStart(10); }).join("")); }
