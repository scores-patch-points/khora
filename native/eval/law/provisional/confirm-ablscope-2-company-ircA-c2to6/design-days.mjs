// design-days.mjs -- DESIGN-TIME inventory for the confirmation of rule ablscope-2-company-ircA-c2to6. COUNTS ONLY: no c.dSelf, no descriptor, no score of any kind is computed here.
// Purpose: apply a fixed day-selection rule (by how many eligible positives a day can supply, never by any outcome) and print the exclusion ledger. Writes results/days.json.
//   node design-days.mjs
// EXCLUDED (touched by an earlier test of this theory or by the ablation-scope lens): every day in name-rule-informal.irc.json gold.files, name-company(-pairblocks) report.json C3.days,
//   every IRC day under ablation-scope/data/*/*.summary.json (discovery rounds 1-2, confirmation, M64), and the days named in ablation-scope/rinit-plain.mjs GROUPS (read there with the plain R_INIT count).
// SELECTION RULE (fixed here, before any score exists): English channels (ubuntu, kubuntu, xubuntu, ubuntu-server): every unused day with lang "en" and >= 6 eligible group-A positives at local count 2..6
//   (eligible = message-initial gold nick occurrence, s >= 256, form >= 3 chars, form >= 3 times in the day, c in 2..6).  Non-English channels (ubuntu-de, -es, -it): same rule with >= 4 positives (extension, never part of the PASS rule).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadIrcDay, IRC_ROOT, LAW } from "../ablation-scope/lib-data.mjs";
import { indexAndCandidates } from "../ablation-scope/lib-pairs.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCOPER = path.join(LAW, "provisional", "ablation-scope");
const RINIT_DAYS = ["kubuntu/2007-03-15", "ubuntu-de/2011-07-15", "ubuntu-es/2010-11-15", "ubuntu-es/2011-03-15", "ubuntu-it/2010-11-15", "ubuntu-it/2011-03-15", "ubuntu-it/2012-03-15", "ubuntu-it/2013-03-15", "ubuntu-it/2013-07-15", "ubuntu-it/2014-03-15"];

export function excludedDays() {
  const used = new Map();
  const add = (n, why) => { n = n.replace(/\.txt$/, ""); (used.get(n) ?? used.set(n, []).get(n)).push(why); };
  const rd = (p) => JSON.parse(fs.readFileSync(path.join(LAW, "results", p), "utf8"));
  for (const f of rd("name-rule-informal.irc.json").gold.files) add(f, "name-rule-informal");
  for (const d of ["name-company", "name-company-pairblocks"]) for (const f of rd(`${d}/report.json`).C3.days) add(f, d);
  const sc = path.join(SCOPER, "data");
  for (const sub of fs.readdirSync(sc)) for (const f of fs.readdirSync(path.join(sc, sub)).filter((x) => x.endsWith(".summary.json"))) {
    const s = JSON.parse(fs.readFileSync(path.join(sc, sub, f), "utf8")); if (s.corpus === "irc") add(s.doc, `ablation-scope/${sub}`);
  }
  for (const d of RINIT_DAYS) add(d, "ablation-scope/rinit-plain");
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
  const M = 256, excl = excludedDays(), res = { excludedCount: excl.size, excluded: Object.fromEntries([...excl].sort()), english: [], other: [], skipped: [] };
  for (const group of [["en", ["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"], 6], ["other", ["ubuntu-de", "ubuntu-es", "ubuntu-it"], 4]]) {
    const [tag, chans, minP] = group;
    for (const d of allDays(chans)) {
      if (excl.has(d.name)) continue;
      const doc = loadIrcDay(d.path, d.name), cand = indexAndCandidates(doc, M);
      const P = cand.P.filter((r) => r.grp === "A" && r.c >= 2 && r.c <= 6), N = cand.N.filter((r) => r.grp === "A" && r.c >= 2 && r.c <= 6);
      const row = { name: d.name, lang: d.lang, messages: d.messages, units: doc.stream.length, goldForms: doc.goldForms.length, A_P_c2to6: P.length, A_N_c2to6: N.length, A_P_c7p: cand.P.filter((r) => r.grp === "A" && r.c >= 7).length };
      const ok = (tag === "en" ? d.lang === "en" : d.lang !== "en") && P.length >= minP && N.length >= 3 * minP;
      (ok ? res[tag === "en" ? "english" : "other"] : res.skipped).push(row);
    }
  }
  fs.writeFileSync(path.join(HERE, "results", "days.json"), JSON.stringify(res, null, 1));
  for (const k of ["english", "other"]) { console.log(k, res[k].length, "days, positives", res[k].reduce((a, r) => a + r.A_P_c2to6, 0)); for (const d of res[k]) console.log("  ", d.name.padEnd(26), d.lang, String(d.messages).padStart(5), "P", String(d.A_P_c2to6).padStart(3), "N", String(d.A_N_c2to6).padStart(4)); }
  console.log("skipped", res.skipped.length, "excluded", res.excludedCount);
}
