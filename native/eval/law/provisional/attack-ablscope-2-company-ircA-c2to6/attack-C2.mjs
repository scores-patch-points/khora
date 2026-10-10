// attack-C2.mjs -- ATTACK C, FOLLOW-UP: is the plain-count signal independent of RECENCY (gap to the previous mention) and burstiness?   node attack-C2.mjs
// ═══ PRE-REGISTRATION (written BEFORE the first run of this file) ═══
// DISCLOSURE. From attack-C.mjs (seen): on the 350 confirmer pairs GAPPREV (minus the message distance to the previous window mention) scores 0.734 and R_BURST 0.747 although neither was matched out; R_INIT 0.880, -dSelf 0.834, fixFirstShuf 0.833,
//   count-only reconstruction 0.813, residual of dSelf after counts 0.455. NOT computed before this header: any subset or conditional analysis below.
// TESTS (pairs = the 350 confirmer primary pairs, group A, c2+c3+c4_6; stratified AUC, cluster bootstrap B=1000 over day x quartile blocks; gap = message distance to the previous window mention, M+1 = 257 when none precedes in the window).
//   T1 near-tied recency: pairs with |gap_p - gap_n| <= 3.   T2 non-burst: pairs with both gaps > 16.   T3 adversarial: pairs where the NAME is LESS recent than its negative (gap_p > gap_n).   For each subset: AUC of R_INIT and of -dSelf (n >= 40 required; else not evaluable).
//   RECENCY-INDEPENDENT iff in T1, T2 and T3 the R_INIT AUC >= 0.75 with bootstrap lower bound > 0.60.
//   T4 paired-difference logistic PROBE (an existence test, not a rule): symmetrised pair differences of the standardised features [R_INIT, -dSelf, -log1p(gap), R_BURST] (no intercept, ridge 1.0); report coefficients with a block bootstrap (B=300) 95% interval.
// BLIND PREDICTIONS. P1 R_INIT >= 0.78 in T1, T2, T3 (0.75). P2 -dSelf >= 0.72 in each (0.65). P3 in T4 the R_INIT coefficient is the largest and its interval excludes 0; the gap coefficient interval includes 0 or is smaller than R_INIT's (0.60).
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RES, CONF, headerSha, readJsonl, NEG, strat, boot, round, mean, quantile, rngFor } from "./lib-atk.mjs";
const SHA = headerSha(fileURLToPath(import.meta.url)), B = 1000, STR = ["c2", "c3", "c4_6"];
const r1 = readJsonl(path.join(CONF, "rows.en.jsonl")).filter((r) => r.grp === "A" && STR.includes(r.stratum)), ex = new Map(readJsonl(path.join(RES, "rows.C-extra.jsonl")).map((r) => [r.id, r]));
for (const r of r1) { const e = ex.get(r.id); r.p.gap = e.p.gap; r.n.gap = e.n.gap; }
const RI = (m) => m.R_INIT, subsets = { T1_nearTied: (r) => Math.abs(r.p.gap - r.n.gap) <= 3, T2_bothNonBurst: (r) => r.p.gap > 16 && r.n.gap > 16, T3_nameLessRecent: (r) => r.p.gap > r.n.gap };
const res = { ruleId: "ablscope-2-company-ircA-c2to6", attack: "C2 recency", headerSha256: SHA, B, subsets: {} };
let sd = 200;
for (const [k, f] of Object.entries(subsets)) { const ps = r1.filter(f); if (ps.length < 40) { res.subsets[k] = { pairs: ps.length, note: "not evaluable" }; continue; }
  const a = boot(ps, (q) => strat(q, RI), { B, seed: sd++ }), b = boot(ps, (q) => strat(q, NEG), { B, seed: sd++ }), g = boot(ps, (q) => strat(q, (m) => -m.gap), { B, seed: sd++ });
  res.subsets[k] = { pairs: ps.length, aucRInit: a.point, ciRInit: [a.lo, a.hi], aucNegDSelf: b.point, ciNegDSelf: [b.lo, b.hi], aucGapPrev: g.point, ciGap: [g.lo, g.hi] }; }
res.recencyIndependent = Object.values(res.subsets).every((s) => s.aucRInit != null && s.aucRInit >= 0.75 && s.ciRInit[0] > 0.6);
// T4: paired-difference ridge-logistic probe
const FE = [["R_INIT", RI], ["negDSelf", NEG], ["negLogGap", (m) => -Math.log1p(m.gap)], ["R_BURST", (m) => m.R_BURST]];
function fit(X, y, lam = 1) { const d = X[0].length; let w = new Array(d).fill(0);
  for (let it = 0; it < 25; it++) { const g = w.map((v) => lam * v), H = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => (i === j ? lam : 0)));
    X.forEach((x, n) => { const p = 1 / (1 + Math.exp(-x.reduce((t, v, i) => t + v * w[i], 0))); for (let i = 0; i < d; i++) { g[i] += (p - y[n]) * x[i]; for (let j = 0; j < d; j++) H[i][j] += p * (1 - p) * x[i] * x[j]; } });
    const A = H.map((r, i) => [...r, g[i]]); for (let i = 0; i < d; i++) { let pv = i; for (let k = i + 1; k < d; k++) if (Math.abs(A[k][i]) > Math.abs(A[pv][i])) pv = k; [A[i], A[pv]] = [A[pv], A[i]]; for (let k = 0; k < d; k++) if (k !== i) { const f = A[k][i] / A[i][i]; for (let j = i; j <= d; j++) A[k][j] -= f * A[i][j]; } }
    const step = A.map((r, i) => r[d] / r[i]); w = w.map((v, i) => v - step[i]); } return w; }
function coefs(ps) { const D = ps.map((r) => FE.map(([, f]) => f(r.p) - f(r.n))), sdv = FE.map((_, i) => Math.sqrt(mean(D.map((x) => x[i] ** 2))) || 1), Z = D.map((x) => x.map((v, i) => v / sdv[i]));
  return fit([...Z, ...Z.map((x) => x.map((v) => -v))], [...Z.map(() => 1), ...Z.map(() => 0)]); }
const point = coefs(r1), rnd = rngFor(7), blocks = [...new Set(r1.map((r) => r.block))], draws = [];
for (let b = 0; b < 300; b++) { const cnt = new Map(); for (let k = 0; k < blocks.length; k++) { const x = blocks[Math.floor(rnd() * blocks.length)]; cnt.set(x, (cnt.get(x) ?? 0) + 1); }
  const ps = []; for (const r of r1) for (let k = 0; k < (cnt.get(r.block) ?? 0); k++) ps.push(r); draws.push(coefs(ps)); }
res.probeCoefficients = Object.fromEntries(FE.map(([n], i) => [n, { coef: round(point[i]), ci: [round(quantile(draws.map((d) => d[i]), 0.025)), round(quantile(draws.map((d) => d[i]), 0.975))] }]));
fs.writeFileSync(path.join(RES, "attack-C2.json"), JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
