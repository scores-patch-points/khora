// days.mjs — seeded, disjoint draw of IRC channel-days NOT used by name-rule-informal (gold.files) or name-company (C3.days). Selection only.
import fs from "node:fs";
import { ircPool, HERE } from "./lib-data.mjs";
import { rngFor, seedFor } from "../../impact.mjs";
import path from "node:path";
const pool = ircPool(), rnd = rngFor(seedFor("ablation-scope", "irc-days"));
for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
const out = { poolSize: pool.length, discovery: pool.slice(0, 4).map((p) => p.name).sort(), confirmation: pool.slice(4, 8).map((p) => p.name).sort(), spare: pool.slice(8, 12).map((p) => p.name).sort() };
fs.writeFileSync(path.join(HERE, "days.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
