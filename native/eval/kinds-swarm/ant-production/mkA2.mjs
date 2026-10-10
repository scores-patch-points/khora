import fs from "node:fs";
import { loadCorpus, HERE } from "./lib.mjs";
import { planA2 } from "./sampleA2.mjs";
const [name, n, unseen] = process.argv.slice(2);
const c = loadCorpus(name), p = planA2(c, Number(n), { unseenControls: unseen === "U" });
fs.writeFileSync(`${HERE}/results/plan-${name}A.json`, JSON.stringify(p));
const by = {}; for (const u of p.units) (by[u.ctl] ??= []).push(u);
console.log(name, "names", p.nNames, "dropped", p.dropped, "pools S/U", p.S, p.U, Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.length])));
for (const k of Object.keys(by)) console.log(k, [...new Set(by[k].map((u) => u.w))].slice(0, 18).join(" "), "wc", JSON.stringify([1, 2, 3].map((q) => by[k].filter((u) => u.wc === q).length)));
