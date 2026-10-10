// attackB_cv.mjs -- selection-bias control for ATTACK B: greedy forward selection of k battery rivals (+ log tokens, mean unit length) on rank(v of order.entSlope).
// (1) permutation null of the in-sample R2 of the same greedy procedure (y permuted, seeded), (2) nested leave-one-pocket-out predicted R2 (selection redone inside every fold).
//   node attackB_cv.mjs [POP=all|present] [K=3] [PERMS=40]  -> B_cv_<POP>.json
import fs from "node:fs";
import path from "node:path";
import { TABLE, HERE, rank, f, rngOf, seedOf } from "./lib.mjs";
const POP = process.argv[2] || "all", K = Number(process.argv[3] || 3), PERMS = Number(process.argv[4] || 40);
const T = TABLE(), S = "order.entSlope";
let rows = T.rows.filter((r) => r.kind === "real" && !r.thin && r.v[S] != null && r.status !== "nodata");
if (POP === "present") rows = rows.filter((r) => r.status === "P+" || r.status === "P-");
const n = rows.length, stats = T.stats.filter((s) => s !== S && rows.every((r) => r.v[s] != null));
const colsAll = stats.map((s) => rank(rows.map((r) => r.v[s]))), ctl = [rank(rows.map((r) => Math.log10(r.tokens))), rank(rows.map((r) => r.mul))];
const y0 = rank(rows.map((r) => r.v[S]));
// fast OLS via normal equations on arrays of columns restricted to index set `ix`
function fit(y, X, ix) {
  const k = X.length + 1, A = Array.from({ length: k }, () => new Float64Array(k)), b = new Float64Array(k), row = new Float64Array(k);
  for (const t of ix) { row[0] = 1; for (let j = 0; j < X.length; j++) row[j + 1] = X[j][t]; for (let a = 0; a < k; a++) { b[a] += row[a] * y[t]; for (let c = a; c < k; c++) A[a][c] += row[a] * row[c]; } }
  for (let a = 0; a < k; a++) for (let c = 0; c < a; c++) A[a][c] = A[c][a];
  const M = Array.from({ length: k }, (_, i) => [...A[i], b[i]]);
  for (let c = 0; c < k; c++) { let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c]; if (Math.abs(d) < 1e-9) return null; for (let q = c; q <= k; q++) M[c][q] /= d; for (let r = 0; r < k; r++) if (r !== c) { const g = M[r][c]; if (g) for (let q = c; q <= k; q++) M[r][q] -= g * M[c][q]; } }
  const beta = M.map((r) => r[k]); let ssr = 0, my = 0; for (const t of ix) my += y[t]; my /= ix.length; let sst = 0;
  for (const t of ix) { let p = beta[0]; for (let j = 0; j < X.length; j++) p += beta[j + 1] * X[j][t]; ssr += (y[t] - p) ** 2; sst += (y[t] - my) ** 2; }
  return { beta, r2: 1 - ssr / sst };
}
const predict = (beta, X, t) => { let p = beta[0]; for (let j = 0; j < X.length; j++) p += beta[j + 1] * X[j][t]; return p; };
function greedy(y, ix, k) { const chosen = []; let last = null; for (let s = 0; s < k; s++) { let best = null; for (let c = 0; c < colsAll.length; c++) { if (chosen.includes(c)) continue; const m = fit(y, [...ctl, ...chosen.map((q) => colsAll[q]), colsAll[c]], ix); if (m && (!best || m.r2 > best.r2)) best = { c, r2: m.r2 }; } chosen.push(best.c); last = best.r2; } return { chosen, r2: last }; }
const all = Array.from({ length: n }, (_, i) => i);
const real = greedy(y0, all, K);
const out = { pop: POP, n, K, candidates: stats.length, inSample: { chosen: real.chosen.map((c) => stats[c]), r2: real.r2 } };
// controls-only R2
out.controlsOnlyR2 = fit(y0, ctl, all).r2;
// permutation null of greedy R2
const rnd = rngOf(seedOf("attackB", POP, K)), nullR2 = [];
for (let b = 0; b < PERMS; b++) { const perm = all.slice(); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; } const yp = perm.map((i) => y0[i]); nullR2.push(greedy(yp, all, K).r2); }
nullR2.sort((a, b) => a - b); out.permNullR2 = { n: PERMS, mean: nullR2.reduce((a, b) => a + b, 0) / PERMS, max: nullR2[PERMS - 1], q95: nullR2[Math.floor(PERMS * 0.95)] };
// nested LOO predicted R2
let press = 0, sst = 0; const my = y0.reduce((a, b) => a + b, 0) / n;
for (let i = 0; i < n; i++) { const ix = all.filter((t) => t !== i), g = greedy(y0, ix, K), X = [...ctl, ...g.chosen.map((c) => colsAll[c])], m = fit(y0, X, ix); press += (y0[i] - predict(m.beta, X, i)) ** 2; sst += (y0[i] - my) ** 2; }
out.nestedLooR2 = 1 - press / sst;
fs.writeFileSync(path.join(HERE, `B_cv_${POP}.json`), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
