import fs from "node:fs";
const r = JSON.parse(fs.readFileSync(new URL("./results-iid.json", import.meta.url), "utf8"));
console.log("R", r.R, "\nstat      def nullZ  zMean  zSd  share4 share2 zMax   vMean    vSd   nullMeanBias");
let c4 = 0, c = 0;
for (const [k, x] of Object.entries(r.perStat)) { c += x.definedCells; c4 += x.share4 * x.definedCells; console.log(k.padEnd(9), String(x.definedCells).padEnd(4), String(x.nullZ).padEnd(5), String(x.zMean).padEnd(6), String(x.zSd).padEnd(5), String(x.share4).padEnd(6), String(x.share2).padEnd(6), String(x.zMax).padEnd(6), String(x.vMean).padEnd(8), String(x.vSd).padEnd(6), x.nullMeanBias); }
console.log("overall |z|>=4 cells", Math.round(c4), "of", c, "=", (c4 / c * 100).toFixed(2) + "%");
