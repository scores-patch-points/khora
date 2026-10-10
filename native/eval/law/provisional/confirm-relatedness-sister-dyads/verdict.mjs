// eval/law/provisional/confirm-relatedness-sister-dyads/verdict.mjs — the REGISTERED analysis of confirm.mjs (pre-registration header is in confirm.mjs; this file is frozen by it and its sha256 is
// written into every result JSON). Pure functions of the transfer matrices; no data is read except results/transfer-<CELL>.json and data/meta.json. NEW FILE.
import fs from "node:fs";
import path from "node:path";
import { HERE, TB, EXT, round, mean, quantile, rngFor, seedFor } from "./fresh.mjs";
import { genus, fam, script, morph, WO3, STEMS } from "../family-vs-relatedness/groups.mjs";
import { sub, CLUSTERS } from "../family-vs-relatedness/subbranch.mjs";

export const IN_SCOPE = ["IWR", "NGm", "CWGm", "Hind"], LADDER = [["IWR", "NGm", "CWGm", "Hind"], ["IWR", "NGm", "CWGm"], ["IWR", "NGm"], ["IWR"]];
const rs = (...p) => rngFor(seedFor("conf-rel-sister", "verdict", ...p));
export const q95n = (n) => 0.5 + 1.645 * Math.sqrt((2 * n + 1) / (12 * n * n));
const GEN = (s) => EXT[s]?.[1] ?? genus(s), CL = (s) => sub(s) ?? EXT[s]?.[2] ?? null;
/** annotation / source twins in THIS data (treebank families): all *_gsd treebanks, SET (hrv srp), and the Hindi-Urdu treebank pair. */
export const TEAM = { spa: "GSD", fra: "GSD", deu: "GSD", ind: "GSD", jpn: "GSD", kor: "GSD", cmn: "GSD", hrv: "SET", srp: "SET", hin: "HU", urd: "HU" };
export const isTwin = (d, t) => !!TEAM[d] && TEAM[d] === TEAM[t];
const isGSDtwin = (x) => isTwin(x.d, x.t) && TEAM[x.d] === "GSD", isHU = (x) => TEAM[x.d] === "HU" && TEAM[x.t] === "HU";

/** dyad records for pairs (d,t) selected by `want(d,t)`. A,P,S,SH,FL = matrices of one cell; pairsN = target pair counts. */
export function dyadsOf(X, want) {
  const { A, P, S, SH, FL, pairs } = X, out = [];
  for (const d of Object.keys(A)) for (const t of Object.keys(A[d])) {
    if (d === t || !want(d, t) || A[d][t] == null || !pairs[t]) continue;
    const ctrl = mean(Object.keys(A).filter((x) => x !== t && GEN(x) !== GEN(t) && A[x]?.[t] != null).map((x) => A[x][t])), n = pairs[t], auc = A[d][t], q = q95n(n), fl = FL?.[d]?.[t] ?? null;
    out.push({ d, t, cluster: CL(t), auc, ctrl: round(ctrl), diff: round(auc - ctrl), q95: round(q), flipQ95: fl, n, pass: auc >= 0.6 && auc > q && auc - ctrl >= 0.05, passFlip: fl == null ? null : auc >= 0.6 && auc > fl && auc - ctrl >= 0.05, twin: isTwin(d, t), pos: P?.[d]?.[t] ?? null, sham: S?.[d]?.[t] ?? null, shuf: SH?.[d]?.[t] ?? null });
  }
  return out;
}
export const boot = (xs, B, rnd) => {
  if (!xs.length) return { mean: null, lo: null, hi: null, n: 0 };
  const m = []; for (let b = 0; b < B; b++) { let t = 0; for (let k = 0; k < xs.length; k++) t += xs[Math.floor(rnd() * xs.length)]; m.push(t / xs.length); }
  return { mean: round(mean(xs)), lo: round(quantile(m, 0.025)), hi: round(quantile(m, 0.975)), n: xs.length };
};
const band = (v) => v != null && v >= 0.45 && v <= 0.55;
/** the registered tests T1-T7 on a set of dyads. `noTwin` is the variant of T7 (drops GSD twins and hin-urd). */
export function evaluate(dyads, tag) {
  const n = dyads.length, nPass = dyads.filter((x) => x.pass).length, frac = n ? nPass / n : 0;
  const byC = {}; for (const x of dyads) (byC[x.cluster] ??= []).push(x);
  const perCluster = Object.fromEntries(Object.entries(byC).map(([c, v]) => [c, { n: v.length, nPass: v.filter((x) => x.pass).length, meanAuc: round(mean(v.map((x) => x.auc))), meanCtrl: round(mean(v.map((x) => x.ctrl))) }]));
  const byT = {}; for (const x of dyads) (byT[x.t] ??= []).push(x.diff); const perTarget = Object.fromEntries(Object.entries(byT).map(([t, v]) => [t, round(mean(v))]));
  const db = boot(Object.values(byT).map(mean), 2000, rs("boot", tag));
  const m = (k) => { const v = dyads.map((x) => x[k]).filter((x) => x != null); return v.length ? mean(v) : null; };
  const pos = m("pos"), sham = m("sham"), shuf = m("shuf"), meanAuc = mean(dyads.map((x) => x.auc));
  const nt = dyads.filter((x) => !isGSDtwin(x) && !isHU(x)), ntPass = nt.filter((x) => x.pass).length;
  const T = {
    T1_eligible_ge6: n >= 6, T2_pass_ge70: frac >= 0.7, T3_clusters_ge50: Object.values(perCluster).every((c) => c.n < 2 || c.nPass / c.n >= 0.5), T4_diffLo_gt_0p03: db.lo != null && db.lo > 0.03,
    T5_position_sham_in_band: band(pos) && band(sham), T6_shuffled_le_0p55_and_5below: shuf != null && shuf <= 0.55 && meanAuc - shuf >= 0.05, T7_noTwin_pass_ge60: nt.length >= 6 && ntPass / nt.length >= 0.6,
  };
  return { n, nPass, frac: round(frac), perCluster, perTarget, diffBoot: db, meanAuc: round(meanAuc), meanCtrl: round(mean(dyads.map((x) => x.ctrl))), position: round(pos), sham: round(sham), shuffled: round(shuf),
    noTwin: { n: nt.length, nPass: ntPass, frac: round(nt.length ? ntPass / nt.length : 0) }, passFlip: { n: dyads.filter((x) => x.passFlip != null).length, nPass: dyads.filter((x) => x.passFlip).length }, tests: T, holds: Object.values(T).every(Boolean),
    failing: dyads.filter((x) => !x.pass).map((x) => `${x.d}>${x.t}:${x.auc}`) };
}
/** registered ladder: broadest rung that holds, else NOT_CONFIRMED. CONFIRMED only for the full in-scope rung. Void controls are reported and block any confirmation. */
export function verdictOf(X, tag) {
  const rungs = LADDER.map((cl) => ({ clusters: cl, ev: evaluate(dyadsOf(X, (d, t) => cl.includes(CL(d)) && CL(d) === CL(t) && !EXT[d] && !EXT[t]), `${tag}-${cl.join("+")}`) }));
  const full = rungs[0].ev, hit = rungs.find((r) => r.ev.holds);
  const failIf = full.frac < 0.5 || (full.diffBoot.mean ?? 0) < 0.03 || !band(full.position) || !band(full.sham);
  const verdict = full.holds ? "CONFIRMED" : hit ? "PARTIAL" : "NOT_CONFIRMED";
  return { verdict, narrowedScope: hit ? hit.clusters : null, failIf, rungs: rungs.map((r) => ({ clusters: r.clusters, ...r.ev })) };
}
// ── relatedness gradient (copy of sister.mjs: dyadic fixed-effects regression, target and donor effects, pigeonhole bootstrap) ───────────
const GCOV = ["sameSub", "sameGenusNotSub", "sameFamilyOnly", "sameOrder", "sameScript", "sameMorph", "sameTeam"], ROSTER = new Set(STEMS);
function gradRows(A) {
  const rows = [];
  for (const d of Object.keys(A)) for (const t of Object.keys(A[d])) {
    const v = A[d][t]; if (v == null || d === t || !ROSTER.has(d) || !ROSTER.has(t) || WO3[d] === "MIXED" || WO3[t] === "MIXED") continue;
    const ss = sub(d) && sub(d) === sub(t), sg = genus(d) === genus(t), sf = fam(d) === fam(t);
    rows.push({ d, t, y: v, x: [ss ? 1 : 0, sg && !ss ? 1 : 0, sf && !sg ? 1 : 0, WO3[d] === WO3[t] ? 1 : 0, script(d) === script(t) ? 1 : 0, morph(d) === morph(t) ? 1 : 0, isTwin(d, t) ? 1 : 0] });
  }
  return rows;
}
function solve(M, b) {
  const n = b.length, A = M.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c] || 1e-12; for (let r = c + 1; r < n; r++) { const f = A[r][c] / d; if (f) for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; } }
  const x = new Array(n).fill(0); for (let r = n - 1; r >= 0; r--) { let v = A[r][n]; for (let k = r + 1; k < n; k++) v -= A[r][k] * x[k]; x[r] = v / (A[r][r] || 1e-12); } return x;
}
function regressG(rows, wT = null, wD = null) {
  const T = [...new Set(rows.map((r) => r.t))], D = [...new Set(rows.map((r) => r.d))].sort(), tI = new Map(T.map((x, i) => [x, i])), dI = new Map(D.map((x, i) => [x, i - 1])), k = GCOV.length, p = k + T.length + D.length - 1;
  const XtX = Array.from({ length: p }, () => new Array(p).fill(0)), Xty = new Array(p).fill(0);
  for (const r of rows) {
    const w = (wT ? wT[r.t] ?? 0 : 1) * (wD ? wD[r.d] ?? 0 : 1); if (!w) continue;
    const idx = [], val = []; r.x.forEach((v, j) => { if (v) { idx.push(j); val.push(v); } }); idx.push(k + tI.get(r.t)); val.push(1); const di = dI.get(r.d); if (di >= 0) { idx.push(k + T.length + di); val.push(1); }
    for (let a = 0; a < idx.length; a++) { Xty[idx[a]] += w * val[a] * r.y; for (let b = 0; b < idx.length; b++) XtX[idx[a]][idx[b]] += w * val[a] * val[b]; }
  }
  for (let j = k; j < p; j++) XtX[j][j] += 1e-6;
  const beta = solve(XtX, Xty); return Object.fromEntries(GCOV.map((c, j) => [c, beta[j]]));
}
export function gradient(A, B, rnd) {
  const rows = gradRows(A), est = regressG(rows), T = [...new Set(rows.map((r) => r.t))], D = [...new Set(rows.map((r) => r.d))], reps = [];
  for (let b = 0; b < B; b++) {
    const wT = Object.fromEntries(T.map((x) => [x, 0])), wD = Object.fromEntries(D.map((x) => [x, 0]));
    for (let i = 0; i < T.length; i++) wT[T[Math.floor(rnd() * T.length)]] += 1; for (let i = 0; i < D.length; i++) wD[D[Math.floor(rnd() * D.length)]] += 1;
    reps.push(regressG(rows, wT, wD));
  }
  const ci = (f) => { const v = reps.map(f); return [round(quantile(v, 0.025)), round(quantile(v, 0.975))]; };
  const diffSF = est.sameSub - est.sameFamilyOnly, diffCI = ci((r) => r.sameSub - r.sameFamilyOnly);
  const graded = est.sameSub > est.sameGenusNotSub && est.sameGenusNotSub > est.sameFamilyOnly && est.sameFamilyOnly > 0 && diffSF >= 0.03 && diffCI[0] > 0;
  return { n: rows.length, est: Object.fromEntries(Object.entries(est).map(([k, v]) => [k, round(v)])), ci: Object.fromEntries(GCOV.map((c) => [c, ci((r) => r[c])])), sameSubMinusFamilyOnly: { est: round(diffSF), ci: diffCI }, sameOrderSpansZero: ci((r) => r.sameOrder)[0] <= 0 && ci((r) => r.sameOrder)[1] >= 0, graded };
}
