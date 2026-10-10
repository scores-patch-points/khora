// table.mjs — compact per-language table from results/dev/lang/*.json (stdout only)
import fs from "node:fs";
const stems = process.argv.slice(2);
const f = (x, d = 2) => (x == null ? "  -  " : Number(x).toFixed(d));
console.log("lang   | T2a eta fs.p ur.p | nom.p | joint p: shad imp coll | goldPROPN cos q05 amp/ampNull | K3a PROPN AUC P Kd PK C | PK-Kd[lo] C-PK[hi] | K3b det | simpson rev/canc (PROPN,NOUN)");
for (const s of stems) {
  const r = JSON.parse(fs.readFileSync(`results/dev/lang/${s}.json`, "utf8"));
  const t = r.T2a_all, j = r.joint, k = r.K3a.PROPN, g = j.gold?.PROPN ?? {};
  const kb = Object.values(r.K3b ?? {});
  const sp = (c) => (r.simpson[c].gap ? "-" : `${r.simpson[c].reversal.obs}/${r.simpson[c].cancellation.obs}`);
  console.log(`${s.padEnd(8)}| ${f(t?.eta2, 3)} ${f(t?.freqStratified.p, 3)} ${f(t?.unrestricted.p, 3)} | ${f(r.T2a_nominal?.freqStratified.p, 3)} | ${f(j.dispersion?.shadow?.p, 3)} ${f(j.dispersion?.imprint?.p, 3)} ${f(j.dispersion?.collateral?.p, 3)} | ${f(g.cosToRand, 3)} ${f(g.nullQ05, 3)} ${f(g.amplification)}/${f(g.ampNullMean)} | ${k.gap ? "gap(" + k.rows + ")" : `${f(k.auc.P)} ${f(k.auc.Kd)} ${f(k.auc.PK)} ${f(k.auc.C)} | ${f(k.diffs["PK-Kd"].point)}[${f(k.diffs["PK-Kd"].lo)}] ${f(k.diffs["C-PK"].point)}[${f(k.diffs["C-PK"].hi)}]`} | ${kb.filter((x) => x.detectable).length}/${kb.length} | ${sp("PROPN")}, ${sp("NOUN")}`);
}
