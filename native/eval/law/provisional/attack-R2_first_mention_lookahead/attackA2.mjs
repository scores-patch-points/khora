// attackA2.mjs — ATTACK A2: is the erosion under local-recurrence matching a CONTROL effect or a SELECTION effect? (rule R2_first_mention_lookahead, lens chat-scope). Run: node attackA2.mjs (never "run") -> results/attackA2.json
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first run of this file; sha256 of this block is recorded in the output JSON) ═══
// QUESTION. attackA found: matching additionally on exact CNT_T128 / CNT_T32 / both / the distance to the next mention (gap) lowers the paired AUC from 0.68 to 0.58-0.60 / 0.58 / 0.547, but those keys also DROP positives that find no equal-cell negative
//   (CF n 485 -> 337 / 335 / 330 / 262). Matching on a recency variable could (i) really remove a confound (control effect), or (ii) just keep a subpopulation of positives that was weaker anyway (selection effect), or (iii) over-control a variable
//   that is part of the mechanism (the rule's first-slot recurrences ARE next mentions). This script separates (i)/(ii) and shows the dose-response of the gap control; (iii) is a judgement left to the report.
// DISCLOSURE (seen): attackA results (above) and attackC results: shuffles that keep the multiset of first words (msgshuf 0.656-0.665, blockshuf 0.671-0.677, firstswap 0.681) leave the effect; wordshuf 0.545; the count rivals without slot information are 0.52-0.62
//   (CNT_T128 0.614/0.618; ngap 0.601/0.604); the lexicon rival nbg 0.731/0.718; INIT_T128 0.660/0.655. NOT seen: AUC of K0-matched pairs restricted to the positives retained by K4/K5/K7/K8; any dose-response of the gap key.
// DATA / METHOD. CF (26 EN days) and ALL_EN (80 EN days). For key K in {K3 (exact CNT_Tinf), K4 (exact CNT_T128, cap 8), K5 (exact CNT_T32, cap 5), K7 (floor gap), K8 (CNT_Tinf cap 8 + CNT_T128 cap 6)} (all = K0 + the extra cell variable):
//   P_K = positives that obtain a partner under K (seed s). AUC_K = paired AUC of the K pairs. AUC_K0|P = paired AUC of K0 pairs built with positives restricted to P_K (negatives drawn from the full K0 pool; same seeds). AUC_K0|notP = K0 AUC on the positives that K dropped.
//   Seeds 1..5; means reported. Attribution: CONTROL effect iff AUC_K0|P - AUC_K >= 0.03; SELECTION effect iff AUC_K0|P within 0.03 of AUC_K AND AUC_K0|P <= AUC_K0(all) - 0.03; both may hold partly (report the shares: control share = (AUC_K0|P - AUC_K) / (AUC_K0 - AUC_K)).
// DOSE-RESPONSE of the gap control (K0 + one gap bin variable): G3 = bin of log2(1+gap) {<=2, <=5, >5}; G6 = floor(g/2); G12 = floor(g); G24 = floor(2g), where g = log2(1+gap), gap = distance in messages to the next message that contains the form (20 = never). Reported: n, AUC.
// BLIND PREDICTIONS (CF and ALL_EN agree): the erosion is mostly a CONTROL effect for K7 (control share >= 0.6), mixed for K4/K5/K8 (share 0.3-0.8), small for K3 (share <= 0.5 and AUC_K0|P within 0.03 of K0); AUC_K0|P7 in [0.60, 0.67];
//   dose-response monotone non-increasing from G3 to G24 within 0.01 tolerance, G3 in [0.60, 0.68], G24 in [0.52, 0.60].
// NOT TESTED: anything beyond the above. If a code bug is found after the first run it is fixed, the whole run repeated, and an AMENDMENT appended below the block (thresholds may only tighten).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { loadDay, candidates, matchPairs, gold, GOLD0, ibk, clb, mlb, rnd4 } from "./common.mjs";
import { auc, mean, summ } from "./stats.mjs";
import { headerSha, CODE, enDays } from "./hdr.mjs";
const D = enDays(), CF = D.CF, ALL = [...new Set([...D.CF, ...D.SD, ...D.SC])], SEEDS = [1, 2, 3, 4, 5], cp = (x, m) => Math.min(x, m), SHA = headerSha(import.meta.url);
const K0 = (x) => [ibk(x.i), Math.floor(4 * x.lc), clb(x.w), mlb(x.L)].join("|"), KX = {
  K3: (x) => [K0(x), cp(x.CNT_Tinf, 12)].join("|"), K4: (x) => [K0(x), cp(x.CNT_T128, 8)].join("|"), K5: (x) => [K0(x), cp(x.CNT_T32, 5)].join("|"), K7: (x) => [K0(x), Math.floor(x.gap)].join("|"), K8: (x) => [K0(x), cp(x.CNT_Tinf, 8), cp(x.CNT_T128, 6)].join("|") };
const G = { G3: (x) => [K0(x), x.gap <= 2 ? 0 : x.gap <= 5 ? 1 : 2].join("|"), G6: (x) => [K0(x), Math.floor(x.gap / 2)].join("|"), G12: (x) => [K0(x), Math.floor(x.gap)].join("|"), G24: (x) => [K0(x), Math.floor(2 * x.gap)].join("|") };
const cands = new Map(); for (const k of ALL) cands.set(k, candidates(loadDay(k), 3).filter((x) => x.cl >= 3));
const pid = (x) => x.day + "|" + x.w, OUT = { headerSha256: SHA, code: CODE(), decomposition: {}, dose: {} }, t0 = Date.now();
for (const [pop, days] of [["CF", CF], ["ALL_EN", ALL]]) {
  OUT.decomposition[pop] = {}; const base = mean(SEEDS.map((s) => auc(days.flatMap((k) => matchPairs(cands.get(k), GOLD0, K0, s, "A2b").pairs), "INIT_Tinf")));
  for (const [kn, kf] of Object.entries(KX)) {
    const r = { K0all: rnd4(base), AUC_K: [], AUC_K0P: [], AUC_K0notP: [], nK: [], nK0P: [] };
    for (const s of SEEDS) {
      const pk = days.flatMap((k) => matchPairs(cands.get(k), GOLD0, kf, s, kn).pairs), P = new Set(pk.map((p) => pid(p.pos)));
      const k0P = days.flatMap((k) => matchPairs(cands.get(k).filter((x) => gold(x, GOLD0) !== "P" || P.has(pid(x))), GOLD0, K0, s, "A2c" + kn).pairs), k0N = days.flatMap((k) => matchPairs(cands.get(k).filter((x) => gold(x, GOLD0) !== "P" || !P.has(pid(x))), GOLD0, K0, s, "A2d" + kn).pairs);
      r.AUC_K.push(auc(pk, "INIT_Tinf")); r.AUC_K0P.push(auc(k0P, "INIT_Tinf")); r.AUC_K0notP.push(k0N.length >= 20 ? auc(k0N, "INIT_Tinf") : NaN); r.nK.push(pk.length); r.nK0P.push(k0P.length);
    }
    const o = { K0all: r.K0all, AUC_K: rnd4(mean(r.AUC_K)), AUC_K0_given_P: rnd4(mean(r.AUC_K0P)), AUC_K0_given_notP: rnd4(mean(r.AUC_K0notP.filter((x) => !Number.isNaN(x)))), nK: Math.round(mean(r.nK)), nK0P: Math.round(mean(r.nK0P)) };
    o.controlShare = rnd4((o.AUC_K0_given_P - o.AUC_K) / (o.K0all - o.AUC_K)); o.controlEffect = o.AUC_K0_given_P - o.AUC_K >= 0.03; o.selectionEffect = Math.abs(o.AUC_K0_given_P - o.AUC_K) <= 0.03 && o.AUC_K0_given_P <= o.K0all - 0.03; OUT.decomposition[pop][kn] = o;
  }
  OUT.dose[pop] = {}; for (const [gn, gf] of Object.entries(G)) { const per = SEEDS.map((s) => days.flatMap((k) => matchPairs(cands.get(k), GOLD0, gf, s, gn).pairs)); OUT.dose[pop][gn] = { n: Math.round(mean(per.map((p) => p.length))), auc: rnd4(mean(per.map((p) => auc(p, "INIT_Tinf")))), ciDay: summ(per[0], "INIT_Tinf", 400, gn + pop).ci.day }; }
  process.stderr.write(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${pop} done\n`);
}
OUT.seconds = (Date.now() - t0) / 1000; fs.writeFileSync(new URL("./results/attackA2.json", import.meta.url), JSON.stringify(OUT, null, 1)); console.log(JSON.stringify({ sha: SHA, decomposition: OUT.decomposition, dose: OUT.dose }, null, 1));
