// design-balance.mjs -- DESIGN-TIME balance check for the confirmation of ablscope-2-company-ircA-c2to6. NO c.dSelf, NO descriptor, NO company score is computed here: only pair counts and the AUCs of the six
// MATCHED-OUT control variables (R_LOGC, R_POS, R_IPOS, R_FB, R_LEN, R_SL), which must sit in [0.45, 0.55] before any score is read.
//   node design-balance.mjs [--match v3] [--set en|other] [--n 150]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadIrcDay } from "../ablation-scope/lib-data.mjs";
import { indexAndCandidates, pairsForCellV3 } from "../ablation-scope/lib-pairs.mjs";
import { controlScores, CONTROLS } from "../ablation-scope/features.mjs";
import { stratAuc, round } from "../ablation-scope/stats.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const MATCH = opt("--match", "v3"), SET = opt("--set", "en"), N = Number(opt("--n", 150)), M = 256;
const days = JSON.parse(fs.readFileSync(path.join(HERE, "results", "days.json"), "utf8"))[SET === "en" ? "english" : "other"];
const by = { c2: [], c3: [], c4_6: [] }, perDay = [];
for (const d of days) {
  const doc = loadIrcDay(path.join("/Users/mlacy/Documents/3.0/ethos/19-organic-community/ubuntu-irc", `${d.name}.txt`), d.name), cand = indexAndCandidates(doc, M);
  let got = 0;
  for (const st of Object.keys(by)) {
    const r = pairsForCellV3(cand, doc, M, { grp: "A", stratum: st, n: N, seedTag: "confirm2" });
    for (const p of r.pairs) { by[st].push({ p: controlScores(p.pos), n: controlScores(p.neg), block: `${doc.name}|q${Math.min(3, Math.floor((4 * p.pos.s) / cand.nMsg))}` }); got += 1; }
  }
  perDay.push([d.name, d.A_P_c2to6, got]);
}
const n = Object.values(by).flat().length;
const ctl = Object.fromEntries(CONTROLS.map((c) => [c, round(stratAuc(by, (m) => m[c]))]));
console.log(JSON.stringify({ match: MATCH, set: SET, pairs: n, perStratum: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.length])), controls: ctl, inBand: Object.values(ctl).every((v) => v >= 0.45 && v <= 0.55) }));
console.log(perDay.map((x) => x.join(":")).join("  "));
