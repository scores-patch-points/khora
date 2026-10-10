// attack-A3.mjs -- ATTACK A, FOLLOW-UP: is the effect carried by a few recurring nickname forms (non-independence of pairs)?   node attack-A3.mjs
// ═══ PRE-REGISTRATION (written BEFORE the first run of this file) ═══
// DISCLOSURE. Seen: confirmer's form-clustered bootstrap (0.834 [0.797, 0.869]); attack-A/A2/C/C2 outputs of mine. NOT computed before this header: the number of distinct positive forms, form concentration, leave-top-k-forms-out or one-pair-per-form AUCs.
// DATA. The 350 confirmer primary pairs (group A, c2+c3+c4_6); and my S_FBL1 conf pairs (attack-A2, 136 pairs).
// TESTS. FA concentration: distinct positive forms, pairs held by the 5 / 10 most frequent positive forms. FB leave-top-k-forms-out (k = 5, 10, 20, by number of pairs, ties by name): stratified AUC of -dSelf and R_INIT with cluster bootstrap (B=1000).
//   FC one-pair-per-positive-form: 500 random draws keeping one random pair for each distinct positive form: median and 5th percentile of the stratified AUC of -dSelf and R_INIT.
//   SURVIVES iff FB(k=10) AUC(-dSelf) >= 0.75 with lower bound > 0.65 and FC 5th percentile >= 0.75 on the confirmer pairs.   FALLS iff FB(k=10) < 0.65 or FC median < 0.65.
// BLIND PREDICTIONS. P1 positives span >= 100 distinct forms and the top 10 forms hold <= 25% of the pairs (0.7). P2 SURVIVES (0.8); FC median within 0.03 of 0.834 (0.8).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RES, CONF, headerSha, readJsonl, NEG, strat, boot, round, quantile, rngFor, groupBy } from "./lib-atk.mjs";
import { seedFor } from "../../impact.mjs";
const SHA = headerSha(fileURLToPath(import.meta.url)), B = 1000, RI = (m) => m.R_INIT;
const sets = { confirmer350: readJsonl(path.join(CONF, "rows.en.jsonl")).filter((r) => r.grp === "A" && ["c2", "c3", "c4_6"].includes(r.stratum)), S_FBL1: readJsonl(path.join(RES, "rows.A2.jsonl")).filter((r) => r.set === "conf") };
const res = { ruleId: "ablscope-2-company-ircA-c2to6", attack: "A3 form concentration", headerSha256: SHA, B };
for (const [name, S] of Object.entries(sets)) {
  const key = (r) => `${r.doc}|${r.p.w}`, byForm = groupBy(S, (r) => r.p.w), ranked = [...byForm].map(([w, ps]) => [w, ps.length]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)), o = {};
  o.concentration = { pairs: S.length, distinctPositiveForms: byForm.size, top5Pairs: ranked.slice(0, 5).reduce((t, x) => t + x[1], 0), top10Pairs: ranked.slice(0, 10).reduce((t, x) => t + x[1], 0), top10: ranked.slice(0, 10).map((x) => `${x[0]}:${x[1]}`) };
  o.leaveTopOut = {}; let sd = 400;
  for (const k of [5, 10, 20]) { const drop = new Set(ranked.slice(0, k).map((x) => x[0])), ps = S.filter((r) => !drop.has(r.p.w)), a = boot(ps, (q) => strat(q, NEG), { B, seed: sd++ }), b = boot(ps, (q) => strat(q, RI), { B, seed: sd++ }); o.leaveTopOut[`k${k}`] = { pairs: ps.length, aucNegDSelf: a.point, ci: [a.lo, a.hi], aucRInit: b.point, ciRInit: [b.lo, b.hi] }; }
  const rnd = rngFor(seedFor("atk-A3", name)), da = [], dr = [];
  for (let d = 0; d < 500; d++) { const ps = []; for (const [, g] of byForm) ps.push(g[Math.floor(rnd() * g.length)]); da.push(strat(ps, NEG)); dr.push(strat(ps, RI)); }
  o.onePairPerForm = { draws: 500, negDSelf: { median: round(quantile(da, 0.5)), q05: round(quantile(da, 0.05)) }, R_INIT: { median: round(quantile(dr, 0.5)), q05: round(quantile(dr, 0.05)) } };
  res[name] = o;
}
const c = res.confirmer350; res.verdict = c.leaveTopOut.k10.aucNegDSelf >= 0.75 && c.leaveTopOut.k10.ci[0] > 0.65 && c.onePairPerForm.negDSelf.q05 >= 0.75 ? "SURVIVES" : (c.leaveTopOut.k10.aucNegDSelf < 0.65 || c.onePairPerForm.negDSelf.median < 0.65 ? "FALLS" : "NARROWS");
fs.writeFileSync(path.join(RES, "attack-A3.json"), JSON.stringify(res, null, 1)); console.log(res.verdict, JSON.stringify(res, null, 0));
