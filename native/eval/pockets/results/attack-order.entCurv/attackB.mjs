// attackB.mjs -- ATTACK B (cheaper rival) on order.entCurv. Reads table.json only (the atlas). Across the real non-thin pockets with a defined entCurv cell:
//   partial Spearman of entCurv on every other atlas statistic, controlling rank(log tokens) and rank(mean unit length); for v (pocket mean of the two halves), for z (mean of the two half z) and, among PRESENT pockets only, for the SIGN.
//   rho^2 of the partial correlation is the share of the (rank-)variance of the pattern the rival explains net of size and unit length; the >= 0.7 rule is applied to it.
//   Then greedy forward selection of up to 6 rivals (rank-regression, 10-fold deterministic CV R^2) to see whether a COMBINATION of rivals restates the pattern, plus the within-register residual check
//   (eta^2 of entCurv on register / group / grain before and after regressing the best rival out).
//   node attackB.mjs -> B_rival.json
import fs from "node:fs";
import path from "node:path";
import { rank, pearson, TABLE, HERE, sha256, f } from "./lib.mjs";
const T = TABLE(), S = "order.entCurv";
const real = T.rows.filter((r) => r.kind === "real" && !r.thin && r.v[S] != null && r.mz[S] != null);
const n = real.length, stats = T.stats.filter((s) => s !== S);
const lt = real.map((r) => Math.log10(r.tokens)), mu = real.map((r) => r.mul);
const zmean = (r, s) => (r.zs[s] && r.zs[s][0] != null && r.zs[s][1] != null ? (r.zs[s][0] + r.zs[s][1]) / 2 : null);
// residualise a vector on [1, controls...] by OLS (controls already rank-transformed)
function resid(y, X) { // X: array of columns; normal equations via Gauss-Jordan
  const k = X.length + 1, m = y.length, A = Array.from({ length: k }, () => new Float64Array(k + 1));
  const col = (j, i) => (j === 0 ? 1 : X[j - 1][i]);
  for (let i = 0; i < m; i++) for (let a = 0; a < k; a++) { for (let b = 0; b < k; b++) A[a][b] += col(a, i) * col(b, i); A[a][k] += col(a, i) * y[i]; }
  for (let a = 0; a < k; a++) { let p = a; for (let r = a + 1; r < k; r++) if (Math.abs(A[r][a]) > Math.abs(A[p][a])) p = r; [A[a], A[p]] = [A[p], A[a]]; const d = A[a][a] || 1e-12; for (let b = a; b <= k; b++) A[a][b] /= d; for (let r = 0; r < k; r++) if (r !== a) { const g = A[r][a]; for (let b = a; b <= k; b++) A[r][b] -= g * A[a][b]; } }
  const beta = A.map((row) => row[k]); return y.map((yy, i) => { let p = 0; for (let j = 0; j < k; j++) p += beta[j] * col(j, i); return yy - p; });
}
const partial = (x, y, ctrl) => pearson(resid(x, ctrl), resid(y, ctrl));
function partialRho(idx, ys, xs, ctrlRaw) { // all on the subset idx; ys, xs raw vectors over `real`
  const Y = rank(idx.map((i) => ys[i])), X = rank(idx.map((i) => xs[i])), C = ctrlRaw.map((c) => rank(idx.map((i) => c[i])));
  return { partial: partial(X, Y, C), raw: pearson(X, Y) };
}
const vE = real.map((r) => r.v[S]), zE = real.map((r) => zmean(r, S));
const all = real.map((_, i) => i);
const res = { n, S, controls: ["log10 tokens", "mean unit length"], byV: [], byZ: [], bySignAmongPresent: [] };
const rowsFor = (target, idx, getter, label) => {
  const out = [];
  for (const s of stats) {
    const xs = real.map((r) => getter(r, s)), ok = idx.filter((i) => xs[i] != null && Number.isFinite(xs[i]) && target[i] != null);
    if (ok.length < 30) continue;
    const r = partialRho(ok, target, xs, [lt, mu]);
    if (!Number.isFinite(r.partial)) continue;
    out.push({ stat: s, n: ok.length, rawRho: +r.raw.toFixed(4), partialRho: +r.partial.toFixed(4), partialRho2: +(r.partial ** 2).toFixed(4) });
  }
  return out.sort((a, b) => Math.abs(b.partialRho) - Math.abs(a.partialRho));
};
res.byV = rowsFor(vE, all, (r, s) => r.v[s], "v");
res.byZ = rowsFor(zE, all, (r, s) => zmean(r, s), "z");
const present = all.filter((i) => real[i].status === "P+" || real[i].status === "P-"), signV = real.map((r) => (r.status === "P+" ? 1 : r.status === "P-" ? -1 : null));
res.bySignAmongPresent = rowsFor(signV, present, (r, s) => r.v[s], "sign");
const word = all.filter((i) => real[i].grain === "word");
res.byV_wordGrain = rowsFor(vE, word, (r, s) => r.v[s], "vword").slice(0, 15);
res.nPresent = present.length; res.nWord = word.length;
// does any single rival reach rho^2 >= 0.7 ?
const top = (a) => a.slice(0, 12);
res.top12V = top(res.byV); res.top12Z = top(res.byZ); res.top12Sign = top(res.bySignAmongPresent);
res.maxRho2 = { v: res.byV[0].partialRho2, z: res.byZ[0].partialRho2, sign: res.bySignAmongPresent[0].partialRho2 };
res.rivalReaches07 = { v: res.byV.filter((r) => r.partialRho2 >= 0.7).map((r) => r.stat), z: res.byZ.filter((r) => r.partialRho2 >= 0.7).map((r) => r.stat), sign: res.bySignAmongPresent.filter((r) => r.partialRho2 >= 0.7).map((r) => r.stat) };
// greedy forward selection with 10-fold deterministic CV R^2 on rank(v) (controls always included)
const fold = real.map((r) => parseInt(sha256("attackB-fold:" + r.id).slice(0, 8), 16) % 10);
const rk = (xs) => rank(xs.map((x) => (x == null ? 0 : x)));
function cvR2(cols, y) { // y rank vector, cols rank vectors (controls first); OLS CV predictions
  const m = y.length, pred = new Float64Array(m);
  for (let k = 0; k < 10; k++) {
    const tr = [], te = []; for (let i = 0; i < m; i++) (fold[i] === k ? te : tr).push(i);
    const k1 = cols.length + 1, A = Array.from({ length: k1 }, () => new Float64Array(k1 + 1)), col = (j, i) => (j === 0 ? 1 : cols[j - 1][i]);
    for (const i of tr) for (let a = 0; a < k1; a++) { for (let b = 0; b < k1; b++) A[a][b] += col(a, i) * col(b, i); A[a][k1] += col(a, i) * y[i]; }
    for (let a = 0; a < k1; a++) A[a][a] += 1e-6;
    for (let a = 0; a < k1; a++) { let p = a; for (let r = a + 1; r < k1; r++) if (Math.abs(A[r][a]) > Math.abs(A[p][a])) p = r; [A[a], A[p]] = [A[p], A[a]]; const d = A[a][a]; for (let b = a; b <= k1; b++) A[a][b] /= d; for (let r = 0; r < k1; r++) if (r !== a) { const g = A[r][a]; for (let b = a; b <= k1; b++) A[r][b] -= g * A[a][b]; } }
    for (const i of te) { let p = 0; for (let j = 0; j < k1; j++) p += A[j][k1] * col(j, i); pred[i] = p; }
  }
  const my = y.reduce((a, b) => a + b, 0) / m; let sse = 0, sst = 0; for (let i = 0; i < m; i++) { sse += (y[i] - pred[i]) ** 2; sst += (y[i] - my) ** 2; }
  return 1 - sse / sst;
}
const complete = stats.filter((s) => real.every((r) => r.v[s] != null && Number.isFinite(r.v[s])));
const Y = rk(vE), ctrl = [rk(lt), rk(mu)], base = cvR2(ctrl, Y), chosen = [], cols = [...ctrl];
res.forward = { statsComplete: complete.length, controlsOnlyCvR2: +base.toFixed(4), steps: [] };
for (let step = 0; step < 6; step++) {
  let best = null;
  for (const s of complete) { if (chosen.includes(s)) continue; const r2 = cvR2([...cols, rk(real.map((r) => r.v[s]))], Y); if (!best || r2 > best.r2) best = { s, r2 }; }
  chosen.push(best.s); cols.push(rk(real.map((r) => r.v[best.s]))); res.forward.steps.push({ add: best.s, cvR2: +best.r2.toFixed(4) });
}
// residual check: pocket-class structure of entCurv before / after regressing the best single rival (and the 6-stat set) out
const eta2 = (y, cats) => { const m = y.reduce((a, b) => a + b, 0) / y.length, g = new Map(); y.forEach((v, i) => { const o = g.get(cats[i]) || [0, 0]; o[0] += v; o[1]++; g.set(cats[i], o); }); let ssb = 0, sst = 0; for (const [, [s, c]] of g) ssb += c * (s / c - m) ** 2; for (const v of y) sst += (v - m) ** 2; return ssb / sst; };
const bestRival = res.byV[0].stat;
const rr1 = resid(Y, [...ctrl, rk(real.map((r) => r.v[bestRival]))]), rr6 = resid(Y, cols), rr0 = resid(Y, ctrl);
res.residualStructure = { bestRival, eta2: {} };
for (const a of ["register", "group", "grain", "script"]) { const cats = real.map((r) => r[a]); res.residualStructure.eta2[a] = { raw: +eta2(Y, cats).toFixed(4), afterControls: +eta2(rr0, cats).toFixed(4), afterBestRival: +eta2(rr1, cats).toFixed(4), afterForward6: +eta2(rr6, cats).toFixed(4), levels: new Set(cats).size }; }
// the sign split among PRESENT pockets: how well does the sign of the best rivals predict it (accuracy)?
const acc = (s) => { let ok = 0, tot = 0; for (const i of present) { const x = real[i].v[s]; if (x == null || !Number.isFinite(x)) continue; tot++; if ((x > 0 ? 1 : -1) === signV[i]) ok++; } return { stat: s, accuracy: +(ok / tot).toFixed(4), n: tot }; };
res.signAccuracy = { baseRateMajority: +(Math.max(present.filter((i) => signV[i] > 0).length, present.filter((i) => signV[i] < 0).length) / present.length).toFixed(4), top: res.bySignAmongPresent.slice(0, 8).map((r) => acc(r.stat)), rareCurve: acc("order.rareCurve"), rareSlope: acc("order.rareSlope"), entSlope: acc("order.entSlope") };
fs.writeFileSync(path.join(HERE, "B_rival.json"), JSON.stringify(res, null, 1));
console.log("n", n, "present", present.length, "maxRho2", JSON.stringify(res.maxRho2), "reaches0.7", JSON.stringify(res.rivalReaches07));
console.log("top v:", res.top12V.slice(0, 8).map((r) => `${r.stat} p=${f(r.partialRho)} raw=${f(r.rawRho)}`).join(" | "));
console.log("top z:", res.top12Z.slice(0, 5).map((r) => `${r.stat} p=${f(r.partialRho)}`).join(" | "));
console.log("top sign:", res.top12Sign.slice(0, 5).map((r) => `${r.stat} p=${f(r.partialRho)}`).join(" | "));
console.log("forward:", JSON.stringify(res.forward));
console.log("residual:", JSON.stringify(res.residualStructure));
console.log("signAccuracy:", JSON.stringify(res.signAccuracy));
