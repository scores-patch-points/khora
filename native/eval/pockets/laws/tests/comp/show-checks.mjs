import fs from "node:fs";
const R = JSON.parse(fs.readFileSync(new URL("./results-checks.json", import.meta.url), "utf8"));
for (const k of ["sizeIid", "sizeReal", "lenIid", "lenReal"]) { const s = R[k]; console.log("==", k, "|", s.label, "| points", s.points.join(",")); for (const [id, x] of Object.entries(s.perStat)) console.log("  ", id.padEnd(9), ("rho " + x.spearman).padEnd(10), x.means.join("  ")); }
console.log("determinism", JSON.stringify(R.determinism)); console.log("scriptInvariance", JSON.stringify(R.scriptInvariance));
console.log("collocation hard", R.collocation.hardL, R.collocation.hardR, "elig", R.collocation.eligL, R.collocation.eligR, "expected hardR~", R.collocation.expectedHardRApprox);
for (const id of ["rigidL", "rigidR", "condR", "sameL", "sameR", "divSlope", "miDecay"]) console.log("   ", id.padEnd(9), "colloc", JSON.stringify(R.collocation.cells[id]), "| iid", JSON.stringify(R.collocation.iidReference[id]));
console.log("timing", JSON.stringify(R.timing));
