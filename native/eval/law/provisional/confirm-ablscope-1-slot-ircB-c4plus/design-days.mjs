// design-days.mjs -- DESIGN-TIME day inventory for the confirmation of rule ablscope-1-slot-ircB-c4plus. COUNTS ONLY: no ablation / impact record is read or computed here.
// Purpose: pick the untouched IRC days (selection by how many matched pairs the day can supply, never by any outcome), and print the exclusion ledger.
//   node design-days.mjs [--match v3]            (prints JSON)
// EXCLUDED (touched by an earlier ablation-instrument test of this theory): every day in name-rule-informal.irc.json gold.files, name-company(-pairblocks) report.json C3.days,
// and every day the ablation-scope lens read in discovery round 1/2 or its own confirmation (from its data/ directories). Other ants read some days with other instruments; disclosed in the registered header, not excluded.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadIrcDay, IRC_ROOT, LAW } from "../ablation-scope/lib-data.mjs";
import { indexAndCandidates, pairsForCellV3, strataOf } from "../ablation-scope/lib-pairs.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };

export function excludedDays() {
  const used = new Map();
  const add = (n, why) => { n = n.replace(/\.txt$/, ""); (used.get(n) ?? used.set(n, []).get(n)).push(why); };
  const rd = (p) => JSON.parse(fs.readFileSync(path.join(LAW, "results", p), "utf8"));
  for (const f of rd("name-rule-informal.irc.json").gold.files) add(f, "name-rule-informal");
  for (const d of ["name-company", "name-company-pairblocks"]) for (const f of rd(`${d}/report.json`).C3.days) add(f, d);
  const sc = path.join(LAW, "provisional", "ablation-scope", "data");
  for (const sub of fs.readdirSync(sc)) for (const f of fs.readdirSync(path.join(sc, sub)).filter((x) => x.endsWith(".summary.json"))) {
    const s = JSON.parse(fs.readFileSync(path.join(sc, sub, f), "utf8")); if (s.corpus === "irc") add(s.doc, `ablation-scope/${sub}`);
  }
  return used;
}
export function allDays(channels) {
  const out = [];
  for (const ch of channels) { const dir = path.join(IRC_ROOT, ch); for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".txt")).sort()) {
    const p = path.join(dir, f), head = fs.readFileSync(p, "utf8").slice(0, 400), m = /messages: "(\d+)"/.exec(head), l = /lang: "(\w+)"/.exec(head);
    out.push({ name: `${ch}/${f.replace(/\.txt$/, "")}`, path: p, messages: m ? Number(m[1]) : 0, lang: l ? l[1] : "?", channel: ch }); } }
  return out;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const M = 256, excl = excludedDays(), res = { excludedCount: excl.size, excluded: Object.fromEntries([...excl].sort()), days: [] };
  for (const d of allDays(["ubuntu", "kubuntu", "xubuntu", "ubuntu-server", "ubuntu-de", "ubuntu-es", "ubuntu-it"])) {
    if (excl.has(d.name)) continue;
    const doc = loadIrcDay(d.path, d.name), cand = indexAndCandidates(doc, M);
    const cnt = {}; for (const st of ["c2", "c3", "c4_6", "c7_15", "c16p"]) cnt[st] = { P: cand.P.filter((r) => r.grp === "B" && r.stratum === st).length, N: cand.N.filter((r) => r.grp === "B" && r.stratum === st).length };
    const pairs = {}; let tot = 0;
    for (const st of ["c4_6", "c7_15", "c16p"]) { const r = pairsForCellV3(cand, doc, M, { grp: "B", stratum: st, n: 60, seedTag: "design" }); pairs[st] = r.pairs.length; tot += r.pairs.length; }
    res.days.push({ ...d, path: undefined, units: doc.stream.length, goldForms: doc.goldForms.length, B_counts: cnt, v3PairsAvail: pairs, v3PairsTotal: tot });
  }
  fs.writeFileSync(path.join(HERE, "results", "design-days.json"), JSON.stringify(res, null, 1));
  for (const d of res.days) console.log(d.name.padEnd(26), d.lang, String(d.messages).padStart(5), "units", String(d.units).padStart(5), "gold", String(d.goldForms).padStart(3), JSON.stringify(d.v3PairsAvail), "tot", d.v3PairsTotal);
}
