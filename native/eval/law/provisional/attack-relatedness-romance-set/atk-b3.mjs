// attack-relatedness-romance-set/atk-b3.mjs — ATTACK B5: donor- and target-fixed-effects estimate of "relatedness beyond Western-European neighbours" (Romance->Romance minus Germanic->Romance), per split.
//   NAME_COMPANY_PAIRBLOCK=1 node atk-b3.mjs <dev|test|A|B|C|X|Y>  (writes results/B3-<split>.json)   |   node atk-b3.mjs sum
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5; written before the first AUC of this file was computed) ═══════════════════════════════════════════════════
// DISCLOSURE. As atk-b2.mjs: seen all of A, A2, C, B1-B3 and the B4 permutation (Romance S 0.046-0.068, p <= 0.0012 in 7/7 splits; Germanic donors rank 2nd; R - G = +0.027 pooled in the equalised triples).
//   Not seen: any fixed-effects estimate. The scoper's own regression (sameGenus +0.0545 on dev) compared same-genus dyads with ALL other dyads, so Germanic donors sat in the control; this file separates the Western-European
//   neighbour dyads from the rest.
// MODEL (per split, single-donor matrices M[d][t] of atk-b2.mjs: 4 seeded draws, 100 pairs, eligible = >= 100 pairs): M[d][t] = a_t + b_d + c1 [d in R, t in R] + c2 [d in G, t in R] + c3 [d in R, t in G] + c4 [d in G, t in G] + e.
//   a_t target fixed effects (target detectability), b_d donor fixed effects (donor quality); R = Romance, G = Germanic (groups.mjs); other dyads are the reference. Least squares, pigeonhole bootstrap over targets and donors (B = 300).
// QUANTITIES. RELATEDNESS BEYOND NEIGHBOURS for Romance targets: delta_R = c1 - c2 (Romance donors vs Germanic donors, same targets, donor quality removed); for Germanic targets delta_G = c4 - c3.
//   NEIGHBOUR EFFECT: c2 (Germanic donors vs other donors for Romance targets), c3. Pass thresholds as the rule's family: relatedness beyond neighbours HOLDS iff pooled-over-splits delta_R >= 0.05 with lower bound > 0;
//   FALLS iff pooled delta_R < 0.03. Pooled = mean over the 7 splits.
// BLIND PREDICTIONS. delta_R = +0.025 (0.01-0.05) per split, pooled FALLS; c2 = +0.06 (0.04-0.09); delta_G = +0.02. Thresholds may be tightened after seeing discovery data, never loosened.
// ═══ END OF PRE-REGISTRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HERE, ROM, GER, rs } from "./atk-lib.mjs";
import { loadRoster, round, mean } from "./atk-eval.mjs";
import { SPLITS } from "./atk-b.mjs";
import { STEMS } from "../family-vs-relatedness/groups.mjs";
import { loadLang, headerHash, fitProbe, aucOn, pairSample, quantile } from "../family-vs-relatedness/lib.mjs";

const SELF = fileURLToPath(import.meta.url);
const loadSplit = (split) => (split === "dev" || split === "test" ? Object.fromEntries(STEMS.map((s) => [s, loadLang(split, s, "FIRST")]).filter(([, L]) => L)) : loadRoster(split, "V0M0", STEMS, false, ["BOTH", "POSITION"]));
function solve(M, b) {
  const n = b.length, A = M.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; const d = A[c][c] || 1e-12; for (let r = c + 1; r < n; r++) { const f = A[r][c] / d; if (f) for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; } }
  const x = new Array(n).fill(0); for (let r = n - 1; r >= 0; r--) { let v = A[r][n]; for (let k = r + 1; k < n; k++) v -= A[r][k] * x[k]; x[r] = v / (A[r][r] || 1e-12); } return x;
}
const cov = (d, t) => [ROM.includes(d) && ROM.includes(t) ? 1 : 0, GER.includes(d) && ROM.includes(t) ? 1 : 0, ROM.includes(d) && GER.includes(t) ? 1 : 0, GER.includes(d) && GER.includes(t) ? 1 : 0];
function fit(M, wT = null, wD = null) {
  const rows = []; for (const d of Object.keys(M)) for (const t of Object.keys(M[d])) if (d !== t && M[d][t] != null) rows.push({ d, t, y: M[d][t] });
  const T = [...new Set(rows.map((r) => r.t))], D = [...new Set(rows.map((r) => r.d))].sort(), tI = new Map(T.map((x, i) => [x, i])), dI = new Map(D.map((x, i) => [x, i - 1])), p = 4 + T.length + D.length - 1;
  const XtX = Array.from({ length: p }, () => new Array(p).fill(0)), Xty = new Array(p).fill(0);
  for (const r of rows) { const w = (wT ? wT[r.t] ?? 0 : 1) * (wD ? wD[r.d] ?? 0 : 1); if (!w) continue; const idx = [], c = cov(r.d, r.t); c.forEach((v, j) => { if (v) idx.push(j); }); idx.push(4 + tI.get(r.t)); const di = dI.get(r.d); if (di >= 0) idx.push(4 + T.length + di); for (const a of idx) { Xty[a] += w * r.y; for (const b of idx) XtX[a][b] += w; } }
  for (let j = 4; j < p; j++) XtX[j][j] += 1e-6; const be = solve(XtX, Xty); return { c1: be[0], c2: be[1], c3: be[2], c4: be[3], dR: be[0] - be[1], dG: be[3] - be[2] };
}
if (process.argv[1] === SELF && SPLITS.includes(process.argv[2])) {
  const split = process.argv[2], langs = loadSplit(split), el = Object.keys(langs).filter((s) => langs[s].pairs >= 100), M = {};
  for (const d of el) { M[d] = {}; const acc = {}; for (let r = 0; r < 4; r++) { const rnd = rs("sd", split, d, r), f = fitProbe([{ L: langs[d], idx: pairSample(langs[d], 100, rnd) }], "BOTH"); for (const t of el) if (t !== d) (acc[t] ??= []).push(aucOn(f, langs[t], "BOTH")); } for (const t of Object.keys(acc)) M[d][t] = mean(acc[t].filter((x) => x != null)); }
  const est = fit(M), T = el, rnd = rs("boot", split), B = {}; for (const k of ["c1", "c2", "c3", "c4", "dR", "dG"]) B[k] = [];
  for (let b = 0; b < 300; b++) { const wT = Object.fromEntries(T.map((x) => [x, 0])), wD = Object.fromEntries(T.map((x) => [x, 0])); for (let i = 0; i < T.length; i++) { wT[T[Math.floor(rnd() * T.length)]]++; wD[T[Math.floor(rnd() * T.length)]]++; } const be = fit(M, wT, wD); for (const k of Object.keys(B)) B[k].push(be[k]); }
  fs.writeFileSync(path.join(HERE, "results", `B3-${split}.json`), JSON.stringify({ split, headerSha256: headerHash(SELF), eligible: el.length, est: Object.fromEntries(Object.entries(est).map(([k, v]) => [k, round(v)])), ci: Object.fromEntries(Object.entries(B).map(([k, v]) => [k, [round(quantile(v, 0.025)), round(quantile(v, 0.975))]])) }, null, 1));
  console.error(`${split} el${el.length} ${JSON.stringify(est)}`);
} else if (process.argv[1] === SELF && process.argv[2] === "sum") {
  const R = SPLITS.map((s) => JSON.parse(fs.readFileSync(path.join(HERE, "results", `B3-${s}.json`), "utf8"))), pooled = (k) => round(mean(R.map((r) => r.est[k])));
  const res = { headerSha256: headerHash(SELF), perSplit: Object.fromEntries(R.map((r) => [r.split, { dR: r.est.dR, dRci: r.ci.dR, c1: r.est.c1, c2: r.est.c2, dG: r.est.dG, dGci: r.ci.dG }])), pooled: { dR: pooled("dR"), c1: pooled("c1"), c2: pooled("c2"), c3: pooled("c3"), c4: pooled("c4"), dG: pooled("dG"), dRsplitsGe05: R.filter((r) => r.est.dR >= 0.05).length, dRlowerPos: R.filter((r) => r.ci.dR[0] > 0).length } };
  res.pooled.verdict = res.pooled.dR < 0.03 ? "FALLS" : res.pooled.dR >= 0.05 && res.pooled.dRsplitsGe05 >= 5 ? "HOLDS" : "NARROWED"; fs.writeFileSync(path.join(HERE, "results", "B3-summary.json"), JSON.stringify(res, null, 1));
  for (const r of R) console.log(r.split, `dR ${r.est.dR} [${r.ci.dR}] c1 ${r.est.c1} c2 ${r.est.c2} | dG ${r.est.dG} [${r.ci.dG}] c3 ${r.est.c3} c4 ${r.est.c4}`); console.log(JSON.stringify(res.pooled));
}
