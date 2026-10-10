// attack-C3.mjs -- ATTACK C, FOLLOW-UP 2: does the ablation keep any information that the plain initial-share count lacks, and where?   node attack-C3.mjs
// ═══ PRE-REGISTRATION (written BEFORE the first run of this file) ═══
// DISCLOSURE. Seen (attack-B B5 and attack-C): per stratum on the 466 confirmer pairs, AUC(-dSelf) vs AUC(R_INIT): c2 0.816 vs 0.784 (88 pairs), c3 0.833 vs 0.892, c4_6 0.844 vs 0.924, c7_15 0.832 vs 0.967; the confirmer's unmatched population
//   supplement gives c2 0.831 vs 0.781. Pooled residual of dSelf after (c, nInit) cell means: AUC 0.455 [0.41, 0.50]; pairs tied on R_INIT and c (all strata, 58 pairs): -dSelf 0.616 and first-token-fixed-shuffle 0.606.
//   NOT computed before this header: any c2-only difference with an interval, any tie-subset AUC per stratum with an interval, any per-dimension AUC inside ties.
// HYPOTHESIS UNDER TEST (mine, derived from the above): at c = 2 the plain share R_INIT takes only the values 0.5 and 1, so it cannot rank within a value; -dSelf is a finer score and may beat it there. If so the ablation is NECESSARY at c2 only.
// TESTS (stratified = within stratum; cluster bootstrap B=1000 over day x quartile blocks). SETS: S1 = confirmer c2 pairs (88); S2 = my S_FBL1 c2 pairs (attack-A2, exact c/fbin, |dlen|<=1); S3 = S1 + S2 pooled as separate pair lists (not independent: shared positives; descriptive).
//   C3a  delta2 = AUC(-dSelf) - AUC(R_INIT) at c2 on S1 and S2, with bootstrap interval: NECESSARY-AT-C2 iff the lower bound of delta2 > 0 on S1 AND on S2.
//   C3b  inside c2 pairs tied on R_INIT (both 1 or both 0.5): AUC(-dSelf) with interval (n >= 25 required, else not evaluable); the same for c3 and c4_6 tie subsets (descriptive).
//   C3c  inside the c2 tie subset: AUC of each descriptor-dimension change (both signs reported as -dd[k]) and of the first-token-fixed shuffle (S1 only): which part of the ablation carries the tie-break.
// BLIND PREDICTIONS. P1 delta2 on S1 is positive (0.70) but its interval includes 0 (0.65). P2 tie-subset AUC at c2 in [0.55, 0.70] (0.55). P3 the carrying dimension in the c2 ties is distRight or entRight (right-context spread) (0.45) and not initShare (0.95, initShare is constant inside ties by construction).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RES, CONF, headerSha, readJsonl, NEG, strat, boot, round, mean } from "./lib-atk.mjs";
const SHA = headerSha(fileURLToPath(import.meta.url)), B = 1000, RI = (m) => m.R_INIT, DIM = ["log1p_count", "distLeft", "distRight", "entLeft", "entRight", "initShare", "finalShare"];
const S1 = readJsonl(path.join(CONF, "rows.en.jsonl")).filter((r) => r.grp === "A" && ["c2", "c3", "c4_6"].includes(r.stratum)), ex = new Map(readJsonl(path.join(RES, "rows.C-extra.jsonl")).map((r) => [r.id, r]));
for (const r of S1) { const e = ex.get(r.id); r.p.sf = e.p.sf; r.n.sf = e.n.sf; }
const S2 = readJsonl(path.join(RES, "rows.A2.jsonl")).filter((r) => r.set === "conf"), res = { ruleId: "ablscope-2-company-ircA-c2to6", attack: "C3 c2 residual", headerSha256: SHA, B };
const ev = (ps, f, seed) => (ps.length >= 25 ? (({ point, lo, hi }) => ({ n: ps.length, auc: point, ci: [lo, hi] }))(boot(ps, (q) => strat(q, f), { B, seed })) : { n: ps.length, auc: null });
let sd = 300;
for (const [name, S] of [["S1", S1], ["S2", S2]]) {
  const c2 = S.filter((x) => x.stratum === "c2"), d = boot(c2, (q) => strat(q, NEG) - strat(q, RI), { B, seed: sd++ }), o = { c2Pairs: c2.length, aucNegDSelf: round(strat(c2, NEG)), aucRInit: round(strat(c2, RI)), delta2: { point: d.point, ci: [d.lo, d.hi] } };
  o.ties = {}; for (const st of ["c2", "c3", "c4_6"]) { const t = S.filter((x) => x.stratum === st && x.p.R_INIT === x.n.R_INIT); o.ties[st] = ev(t, NEG, sd++); }
  const t2 = c2.filter((x) => x.p.R_INIT === x.n.R_INIT); o.c2TiesDims = Object.fromEntries(DIM.map((n, k) => [`-d.${n}`, t2.length >= 25 ? round(strat(t2, (m) => -m.dd[k])) : null])); if (name === "S1") o.c2TiesFixFirst = t2.length >= 25 ? round(strat(t2, (m) => -mean(m.sf))) : null;
  res[name] = o;
}
res.necessaryAtC2 = res.S1.delta2.ci[0] > 0 && res.S2.delta2.ci[0] > 0;
fs.writeFileSync(path.join(RES, "attack-C3.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
