// report.mjs — prints a compact summary of a discovery-/confirm- cell JSON (reads results only; no computation of new AUC).
import fs from "node:fs";
const f = process.argv[2], j = JSON.parse(fs.readFileSync(f, "utf8"));
const R = j.regression;
console.log("cell", j.cell, "split", j.split ?? "dev", "targets", j.targets.length, "donors", j.donors.length, "thin:", (j.thin ?? []).join(" "));
for (const k of ["wo3", "wo2", "know"]) { const r = R[k]; console.log(k, "n", r.n, Object.entries(r.est).map(([c, v]) => `${c} ${v} [${r.ci[c].lo},${r.ci[c].hi}]`).join(" | ")); }
console.log("perm genus", JSON.stringify(R.wo3.permGenus), "perm order", JSON.stringify(R.wo3.permOrder));
console.log("position control coefs", JSON.stringify(R.positionControl), "\nsham coefs", JSON.stringify(R.shamControl), "\nmeanA/P/S", R.meanA, R.meanP, R.meanS, "donorMeanSpread", JSON.stringify(R.donorMeanSpread));
if (j.contrasts) {
  const c = j.contrasts;
  for (const k of ["GENUS_a-b", "ORDER_b-c", "GENUSvsNOT_a-e", "SAMEvsRANDOM_a-d", "ORDERvsRANDOM_b-d"]) console.log(k, JSON.stringify({ ...c[k], perTarget: undefined }));
  console.log("setMeans", JSON.stringify(c.setMeans), "\nposition", JSON.stringify(c.positionControl), "\nshuffled", JSON.stringify(c.shuffledControl));
  for (const [k, g] of Object.entries(j.groupTable)) console.log(k, `n ${g.n} pass ${g.nPass} same ${g.meanSame} ctrl ${g.meanCtrl} diff ${JSON.stringify(g.diffBoot)} pos ${g.positionControl} shuf ${g.shuffledControl} passing [${g.passing}] failing [${g.failing}]`);
}
