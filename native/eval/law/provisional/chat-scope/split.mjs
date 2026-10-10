// split.mjs — fixed discovery/confirm split of IRC days (run once; output split.json is then frozen). Uses NO score and NO rule output.
// Unused = not in results/name-rule-informal.irc.json gold.files and not in results/name-company*/report.json C3.days. Eligible = unused and >= 20 gold nickname-mention occurrences
// (selection on a label count, not on any score). Within each channel the eligible days are sorted by date and alternately assigned: even index -> DISCOVERY, odd index -> CONFIRM.
import fs from "node:fs";
import path from "node:path";
import { listDays, loadDay } from "./load.mjs";
const R = "/Users/mlacy/Documents/3.0/khora/native/eval/law/results";
const used = new Set(JSON.parse(fs.readFileSync(path.join(R, "name-rule-informal.irc.json"), "utf8")).gold.files);
for (const d of ["name-company", "name-company-pairblocks"]) for (const k of JSON.parse(fs.readFileSync(path.join(R, d, "report.json"), "utf8")).C3.days) used.add(k);
const out = { used: [...used].sort(), discovery: [], confirm: [], ineligible: [], note: "even index within channel -> discovery, odd -> confirm" };
const byCh = new Map();
for (const d of listDays()) {
  if (used.has(d.key)) continue;
  const x = loadDay(d); let pos = 0; for (const m of x.msgs) for (const w of m.t) if (x.nicks.has(w) && !x.topic.has(w) && w !== m.n) pos++;
  if (pos < 20) { out.ineligible.push({ key: d.key, pos }); continue; }
  (byCh.get(d.channel) ?? byCh.set(d.channel, []).get(d.channel)).push({ key: d.key, pos, msgs: x.msgs.length });
}
for (const [c, ds] of byCh) ds.sort((a, b) => (a.key < b.key ? -1 : 1)).forEach((d, i) => (i % 2 === 0 ? out.discovery : out.confirm).push(d));
fs.writeFileSync(new URL("./split.json", import.meta.url), JSON.stringify(out, null, 1));
const cnt = (a) => Object.fromEntries([...new Set(a.map((d) => d.key.split("/")[0]))].map((c) => [c, a.filter((d) => d.key.startsWith(c + "/")).length]));
console.log(JSON.stringify({ used: out.used.length, discovery: cnt(out.discovery), confirm: cnt(out.confirm), ineligible: out.ineligible.length }));
