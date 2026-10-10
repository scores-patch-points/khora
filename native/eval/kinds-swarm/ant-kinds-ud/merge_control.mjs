// merge_control.mjs — copies the amended control block (A1: shuffled-run margins, empirical p) from induced_v2/<stem>.json into induced/<stem>.json
// after checking that the re-run reproduced the SAME kinds (form -> leaf) — a determinism / reproducibility check of the induction.
import fs from "node:fs";
for (const stem of process.argv.slice(2)) {
  const a = `induced/${stem}.json`, b = `induced_v2/${stem}.json`;
  if (!fs.existsSync(b)) { console.log(stem, "no v2"); continue; }
  const A = JSON.parse(fs.readFileSync(a, "utf8")), B = JSON.parse(fs.readFileSync(b, "utf8"));
  const same = A.forms.length === B.forms.length && A.forms.every((f, i) => f[0] === B.forms[i][0] && f[2] === B.forms[i][2] && f[3] === B.forms[i][3]);
  console.log(stem, "same kinds:", same, "K*", A.Kstar, B.Kstar, "ctrl", JSON.stringify(B.control.shuffledMargins), "obs", B.control.obsMargin, "p", B.control.empiricalP);
  if (same) { A.control = B.control; fs.writeFileSync(a, JSON.stringify(A)); }
}
