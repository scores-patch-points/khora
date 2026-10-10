// show.mjs — compact tables from a results JSON (read-only helper). usage: node show.mjs FILE STRATUM FACET [scopes comma] [colregex]
import fs from "node:fs";
const [f, st = "LATER", fa = "ALL", scopes = "EN,DE,ES,IT", re = "."] = process.argv.slice(2);
const R = JSON.parse(fs.readFileSync(f, "utf8")); const sc = scopes.split(","); const cols = R.columns.filter((c) => new RegExp(re).test(c));
const pad = (s, n) => String(s).padEnd(n);
console.log(pad("col", 12) + sc.map((s) => pad(s, 22)).join(""));
console.log(pad("n/days/ctl", 12) + sc.map((s) => { const c = R.cells[`${st}|${s}|${fa}`]; return pad(c ? `${c.n}/${c.days}/${c.ctlOk ? "ok" : "VOID " + JSON.stringify(c.ctl)}` : "-", 22); }).join(""));
for (const c of cols) console.log(pad(c, 12) + sc.map((s) => { const x = R.cells[`${st}|${s}|${fa}`]; if (!x || x.auc[c] == null) return pad("-", 22); const ci = x.ci?.[c]; return pad(`${x.auc[c].toFixed(3)}${ci && ci[0] != null ? ` [${ci[0].toFixed(2)},${ci[1].toFixed(2)}]` : ""}`, 22); }).join(""));
