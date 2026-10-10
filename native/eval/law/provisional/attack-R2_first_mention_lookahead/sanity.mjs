// sanity.mjs — NOT a test. Calibration of my own implementation (common.mjs, stats.mjs) against the confirmer's reported numbers, on the confirmer's EN days. Informs nothing but "does my pipeline reproduce the baseline".
import fs from "node:fs";
import { loadDay, candidates, matchPairs, K0, rngOf } from "./common.mjs";
import { auc, wtl, thr, ctl, summ } from "./stats.mjs";
const DAYS = JSON.parse(fs.readFileSync("../confirm-R2_first_mention_lookahead/days.json", "utf8")).confirmSet.EN;
const t0 = Date.now(), pairs = [], docs = [];
for (const k of DAYS) { const d = loadDay(k); docs.push(d); const c = candidates(d); const r = matchPairs(c, undefined, K0(4), 1, "sanity"); pairs.push(...r.pairs); }
// brute-force check of INIT_Tinf on 300 random candidates of the biggest day
const big = docs.reduce((a, b) => (b.N > a.N ? b : a)), cs = candidates(big), rr = rngOf("sanity-bf"); let bad = 0;
for (let n = 0; n < 300; n++) { const c = cs[Math.floor(rr() * cs.length)]; let b = 0; big.T.forEach((m, k) => { if (k !== c.m && m[0] === c.w) b++; }); if (b !== c.INIT_Tinf) bad++; }
console.log("brute-force INIT_Tinf mismatches:", bad, "/300 on", big.key, big.N);
const s = summ(pairs, "INIT_Tinf", 300, "sanity"); console.log(JSON.stringify({ secs: (Date.now() - t0) / 1000, n: s.n, days: s.days, auc: s.auc, wtl: s.wtl, ci: s.ci, ctl: ctl(pairs), thr2: thr(pairs, "INIT_Tinf", 2), CNT_Tinf: auc(pairs, "CNT_Tinf"), CNT_T128: auc(pairs, "CNT_T128"), INIT_T128: auc(pairs, "INIT_T128") }));
