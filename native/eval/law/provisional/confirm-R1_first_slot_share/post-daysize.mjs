// post-daysize.mjs — POST-HOC descriptive (no verdict weight): fixed-threshold precision/recall by day size (messages), scoper confirm days + the 20 untouched tiny days. Natural prevalence, unmatched.
import fs from "node:fs";
import { loadIrcDay, round } from "./lib.mjs";
import { ircClass } from "./pairs.mjs";
import { natural } from "./cells.mjs";
const S = JSON.parse(fs.readFileSync(new URL("../chat-scope/split.json", import.meta.url), "utf8"));
const keys = [...S.confirm.map((d) => d.key), ...S.ineligible.map((d) => d.key)], docs = keys.map(loadIrcDay);
const bucket = (n) => (n < 150 ? "a:<150" : n < 500 ? "b:150-499" : n < 1500 ? "c:500-1499" : "d:>=1500");
const out = {};
for (const lang of ["en", "nonen"]) for (const b of ["a:<150", "b:150-499", "c:500-1499", "d:>=1500"]) {
  const ds = docs.filter((d) => (lang === "en") === (d.lang === "en") && bucket(d.T.length) === b); if (!ds.length) continue;
  const n = natural(ds, ircClass); out[`${lang} ${b}`] = { days: ds.length, msgs: ds.reduce((s, d) => s + d.T.length, 0), tp: n.ALL.tp, fp: n.ALL.fp, fn: n.ALL.fn, precision: n.ALL.precision, recall: n.ALL.recall, fpr: n.ALL.fpr, baselinePrecision: n.flagEveryInitialBaseline.precision };
}
fs.writeFileSync(new URL("./results/post-daysize.json", import.meta.url), JSON.stringify(out)); for (const [k, v] of Object.entries(out)) console.log(k.padEnd(16), JSON.stringify(v));
