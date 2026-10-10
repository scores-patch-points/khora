// timeFamilies.mjs -- CPU seconds of each law family's compute() on the same ~50k-token view (cost proxy for "cheapest rival"). Wall time is useless on a loaded machine; process.cpuUsage is used.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { HERE, loadCached, halves, tokensOf } from "./lib.mjs";
const LAWS = path.join(HERE, "../../laws");
const p = loadCached(process.argv[2] || "bk-moby-dick"), H = halves(p).discover;
let units = [], docOf = [], t = 0; for (let k = 0; k < H.units.length && t < 50000; k++) { units.push(H.units[k]); docOf.push(H.docOf[k]); t += H.units[k].length; }
const view = { id: p.id, which: "discover", units, docOf }, out = { pocket: p.id, tokens: t, families: {} };
for (const f of fs.readdirSync(LAWS).filter((x) => x.endsWith(".mjs") && !x.startsWith("_")).sort()) {
  const m = await import(pathToFileURL(path.join(LAWS, f)).href); if (!m.FAMILY) continue;
  const c0 = process.cpuUsage(); m.compute(view); const c1 = process.cpuUsage(c0); out.families[m.FAMILY] = { cpuSeconds: (c1.user + c1.system) / 1e6, stats: m.STATS.length };
}
fs.writeFileSync(path.join(HERE, "out/time_families.json"), JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
