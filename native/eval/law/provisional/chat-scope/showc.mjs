// showc.mjs — compact print of confirm(.dry).json (read-only helper). usage: node showc.mjs FILE
import fs from "node:fs";
const R = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
console.log("mode", R.mode, "days", R.days.length, "swarm", R.swarmDays.length, "sha", R.headerSha256.slice(0, 12));
for (const rn of ["R1", "R2"]) {
  console.log(`\n=== ${rn} ${R.rules[rn].column} theta ${R.rules[rn].theta} stratum ${R.rules[rn].stratum}`);
  for (const [k, c] of Object.entries(R.cells)) { if (!k.startsWith(rn)) continue; const u = c.strict ?? c.full; const [, , sc, fa] = k.split("|");
    console.log(`${sc.padEnd(14)}${fa.padEnd(8)}${c.variant.padEnd(7)} n=${String(u?.n ?? c.full.n).padEnd(5)} d=${String(u?.days ?? c.full.days).padEnd(3)} auc=${u?.auc ?? "-"} ci=${JSON.stringify(u?.ci ?? null)} dayCi=${JSON.stringify(u?.dayCi ?? null)} thr=${u?.thr ? `${u.thr.tpr}/${u.thr.fpr}/${u.thr.balPrec}` : "-"} beyond=${u?.beyondRival ? Object.entries(u.beyondRival).map(([a, b]) => a + ":" + b.auc).join(",") : "-"} ${c.holds ? "HOLDS" : "no: " + c.reason}${c.variant === "VOID" ? " ctl=" + JSON.stringify(c.full.ctl) : ""}`); }
}
console.log("\nSHUF", JSON.stringify(R.shuf));
console.log("\nVERDICT", JSON.stringify(R.verdict_R1), JSON.stringify(R.verdict_R2));
for (const g of Object.keys(R.natural)) for (const rn of Object.keys(R.natural[g])) for (const [f, o] of Object.entries(R.natural[g][rn])) console.log(`NAT ${g.padEnd(6)}${rn.padEnd(4)}${f.padEnd(8)} P=${o.precision} R=${o.recall} FPR=${o.fpr} prev=${o.prevalence} tp=${o.tp} fp=${o.fp} fn=${o.fn}`);
