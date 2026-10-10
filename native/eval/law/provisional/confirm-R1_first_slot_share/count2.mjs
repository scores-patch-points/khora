// count2.mjs — COUNT-ONLY coverage with the coarse key (no score, no AUC).
import { loadIrcDay } from "./lib.mjs";
import { coverage, ircClass, KEY_COARSE } from "./pairs.mjs";
const days = process.argv.slice(2); const tot = {};
for (const k of days) { const d = loadIrcDay(k), c = coverage(d, ircClass, KEY_COARSE), g = d.lang === "en" ? "EN" : "NONEN"; tot[g] = tot[g] ?? { pos: 0, pairs: 0 }; tot[g].pos += c.nPos; tot[g].pairs += c.pairs; }
console.log(JSON.stringify(tot));
