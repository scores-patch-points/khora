// count.mjs — COUNT-ONLY coverage census of the candidate untouched IRC days (no score, no AUC is computed or printed). Used to decide the pooling plan before pre-registration.
import { loadIrcDay } from "./lib.mjs";
import { coverage, ircClass } from "./pairs.mjs";
const days = process.argv.slice(2);
let tot = {};
for (const k of days) {
  const d = loadIrcDay(k), c = coverage(d, ircClass), g = d.lang === "en" ? "EN" : "NONEN";
  console.log(k.padEnd(32), "msgs", d.T.length, "tok", d.nTok, "nicks", d.nicks.size, "LATERpos", c.nPos, "exactPairs", c.pairs);
  tot[g] = tot[g] ?? { pos: 0, pairs: 0, days: 0 }; tot[g].pos += c.nPos; tot[g].pairs += c.pairs; tot[g].days++;
}
console.log(JSON.stringify(tot));
