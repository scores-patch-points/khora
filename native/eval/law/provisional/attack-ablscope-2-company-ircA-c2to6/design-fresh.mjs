// design-fresh.mjs -- DESIGN-TIME COUNTS ONLY (no dSelf, no score): which IRC days are unused by the confirmer, and how many strict pairs can they and the confirmer's days supply.
import fs from "node:fs";
import path from "node:path";
import { CONF, RES } from "./lib-atk.mjs";
import { loadIrcDay, indexAndCandidates, pairsStrict, IRC_ROOT } from "./lib-strict.mjs";
import { excludedDays, allDays } from "../confirm-ablscope-2-company-ircA-c2to6/design-days.mjs";
const days = JSON.parse(fs.readFileSync(path.join(CONF, "days.json"), "utf8")), excl = excludedDays();
const usedConf = new Set([...days.english, ...days.other].map((d) => d.name));
const M = 256, out = { confEn: days.english.map((d) => d.name), freshEn: [], freshOther: [], confOther: days.other.map((d) => d.name) };
for (const [tag, chans, lang] of [["freshEn", ["ubuntu", "kubuntu", "xubuntu", "ubuntu-server"], "en"], ["freshOther", ["ubuntu-de", "ubuntu-es", "ubuntu-it"], "other"]])
  for (const d of allDays(chans)) { if (excl.has(d.name) || usedConf.has(d.name)) continue; if ((lang === "en") !== (d.lang === "en")) continue; out[tag].push(d.name); }
const countStrict = (names) => { const t = {}; let P = 0; for (const n of names) { const doc = loadIrcDay(path.join(IRC_ROOT, `${n}.txt`), n), cand = indexAndCandidates(doc, M);
  for (const st of ["c2", "c3", "c4_6"]) { const k = pairsStrict(cand, doc, { stratum: st }).length; t[st] = (t[st] ?? 0) + k; P += cand.P.filter((r) => r.grp === "A" && r.stratum === st).length; } } return { strictPairs: t, positives: P }; };
console.log("fresh en days", out.freshEn.length, "fresh other", out.freshOther.length);
console.log("conf en strict", JSON.stringify(countStrict(out.confEn)));
console.log("fresh en strict", JSON.stringify(countStrict(out.freshEn)));
console.log("fresh other strict", JSON.stringify(countStrict(out.freshOther)));
console.log("conf other strict", JSON.stringify(countStrict(out.confOther)));
fs.writeFileSync(path.join(RES, "days-attack.json"), JSON.stringify(out, null, 1));
