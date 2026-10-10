// attackB.mjs -- ATTACK B (cheaper rival). Pattern y = v(order.rareCurve) (mean of the two half values) over the real non-thin pockets of the atlas. Every other atlas statistic s is a candidate rival.
//  B1 per rival: raw Spearman rho(y, s), PARTIAL Spearman controlling rank(log10 tokens) and rank(mean unit length) (residualise both ranks on [1, rank logtok, rank mul], Pearson), partial rho^2 = share of the variance of the pattern.
//  B2 forward selection of up to 5 rivals (controls always in) on ranks: in-sample R^2 and NESTED 10-fold CV R^2 (selection redone inside each training fold; folds by sha256(id)); pools: ALL candidates, CHEAP-only (one pass over x and positions, or counts only).
//  B3 sign-split: among PRESENT pockets (P+ / P-), AUC of every statistic for separating the signs (sign-aware: max(AUC, 1-AUC)).
//  B4 label models: R^2 / adjusted R^2 / CV R^2 of rank(y) on one-hot grain, group, register, script, language-family labels (is the pattern a restatement of a LABEL?).
//  Subsets: all (n = 390), wordgrain, present (P+ or P-), present-wordgrain. node attackB.mjs -> B_rival.json
import fs from "node:fs";
import path from "node:path";
import { HERE, rank, pearson, sha256 } from "./lib.mjs";
const T = JSON.parse(fs.readFileSync(path.join(HERE, "table.json"), "utf8")), S = T.stats.filter((s) => s !== "order.rareCurve");
const ALL = T.rows.filter((r) => r.v != null);
// cost classes decided from the statistic statements (not measured): C1 one pass over x/ranks and unit positions or over counts only; C2 needs a bigram/pair table or per-unit class sets; C3 needs lag kernels, document structure or neighbour search
const C1 = new Set(["order.rareSlope", "order.initDev", "order.finalDev", "order.entSlope", "order.entCurv", "order.depLen", "order.branch", "freq.zipfAlpha", "freq.heapsBeta", "freq.ttr", "freq.hapaxShare", "freq.rankBinEnt", "freq.abbrev", "freq.menzerath", "freq.recurLen", "freq.lenAcf1", "freq.lenDocEps", "freq.lenCV", "freq.lenLogSkew"]);
const costOf = (s) => (C1.has(s) ? "C1" : s.startsWith("order.") || s.startsWith("comp.") || s.startsWith("fig.") || s.startsWith("para.") ? "C2" : "C3");
// ---- linear algebra (tiny, deterministic)
function solve(A, b) { const n = b.length, M = A.map((r, i) => [...r, b[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c] || 1e-12; for (let r = 0; r < n; r++) if (r !== c) { const k = M[r][c] / d; for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; } } return M.map((r, i) => r[n] / (r[i] || 1e-12)); }
function ols(X, y) { const n = X.length, p = X[0].length, A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0); for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) { b[j] += X[i][j] * y[i]; for (let k = 0; k < p; k++) A[j][k] += X[i][j] * X[i][k]; } for (let j = 1; j < p; j++) A[j][j] += 1e-9; return solve(A, b); }
const pred = (X, w) => X.map((r) => r.reduce((a, x, j) => a + x * w[j], 0));
const resid = (X, y) => { const w = ols(X, y), p = pred(X, w); return y.map((v, i) => v - p[i]); };
const r2 = (X, y) => { const p = pred(X, ols(X, y)), m = y.reduce((a, b) => a + b, 0) / y.length; let sse = 0, sst = 0; for (let i = 0; i < y.length; i++) { sse += (y[i] - p[i]) ** 2; sst += (y[i] - m) ** 2; } return 1 - sse / sst; };
const zs = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length, s = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) || 1; return a.map((x) => (x - m) / s); };
const rk = (a) => zs(rank(a));
export function partial(rows, getY, getX) {
  const idx = rows.map((_, i) => i).filter((i) => Number.isFinite(getY(rows[i])) && Number.isFinite(getX(rows[i])) && Number.isFinite(rows[i].tokens));
  const R = idx.map((i) => rows[i]), y = rk(R.map(getY)), x = rk(R.map(getX)), c1 = rk(R.map((r) => Math.log10(r.tokens))), c2 = rk(R.map((r) => r.mul));
  const C = R.map((_, i) => [1, c1[i], c2[i]]), py = resid(C, y), px = resid(C, x);
  return { n: R.length, raw: pearson(y, x), partial: pearson(py, px) };
}
const subsets = { all: ALL, wordgrain: ALL.filter((r) => r.grain === "word"), present: ALL.filter((r) => r.status === "P+" || r.status === "P-"), presentWord: ALL.filter((r) => (r.status === "P+" || r.status === "P-") && r.grain === "word") };
const out = { n: ALL.length, controls: ["rank log10 tokens", "rank mean unit length"], costClassNote: "C1 = one pass over x/ranks and positions or counts only; C2 = needs bigram/pair table; C3 = lag kernels/document structure. Assigned from the statistic statements, not timed (timing would put a clock in the output).", subsets: {} };
for (const [name, rows] of Object.entries(subsets)) {
  const byV = [];
  for (const s of S) { const q = partial(rows, (r) => r.v, (r) => r.V[s]); if (q.n >= 60) byV.push({ stat: s, cost: costOf(s), n: q.n, rawRho: +q.raw.toFixed(4), partialRho: +q.partial.toFixed(4), partialRho2: +(q.partial ** 2).toFixed(4) }); }
  byV.sort((a, b) => b.partialRho2 - a.partialRho2);
  out.subsets[name] = { n: rows.length, top: byV.slice(0, 12), cheapestC1Top: byV.filter((x) => x.cost === "C1").slice(0, 6) };
}
// ---- B2 forward selection (all data, subset "all"), nested CV
function design(rows, sel) { const y = rk(rows.map((r) => r.v)), c1 = rk(rows.map((r) => Math.log10(r.tokens))), c2 = rk(rows.map((r) => r.mul)); const cols = sel.map((s) => rk(rows.map((r) => r.V[s]))); return { y, X: rows.map((_, i) => [1, c1[i], c2[i], ...cols.map((c) => c[i])]) }; }
function forward(rows, pool, K) {
  const sel = [], trace = [];
  for (let k = 0; k < K; k++) {
    let best = null;
    for (const s of pool) { if (sel.includes(s)) continue; const { y, X } = design(rows, [...sel, s]), r = r2(X, y); if (!best || r > best.r) best = { s, r }; }
    sel.push(best.s); trace.push({ k: k + 1, add: best.s, cost: costOf(best.s), R2: +best.r.toFixed(4) });
  }
  return { sel, trace };
}
const poolOK = (rows) => S.filter((s) => rows.filter((r) => Number.isFinite(r.V[s])).length >= 0.97 * rows.length);
function forwardAll(rows, label, poolFilter) {
  const pool = poolOK(rows).filter(poolFilter), cc = rows.filter((r) => pool.every((s) => Number.isFinite(r.V[s])));
  const base = r2(design(cc, []).X, design(cc, []).y), res = { label, nPool: pool.length, nComplete: cc.length, controlsOnlyR2: +base.toFixed(4) }, K = 5;
  const f = forward(cc, pool, K); res.trace = f.trace;
  const fold = (r) => parseInt(sha256(r.id).slice(0, 8), 16) % 10;
  res.cv = [];
  for (let k = 1; k <= K; k++) {
    const oof = new Array(cc.length).fill(null);
    for (let g = 0; g < 10; g++) {
      const tr = cc.filter((r) => fold(r) !== g), te = cc.filter((r) => fold(r) === g), sel = forward(tr, pool, k).sel;
      const dTr = design(tr, sel), w = ols(dTr.X, dTr.y);
      // test rows standardised with TRAIN statistics: rank-transform within train+test jointly is unavoidable for ranks; we rank within the combined set (transductive rank, labels of test y not used in the fit)
      const both = tr.concat(te), dB = design(both, sel), pB = pred(dB.X.slice(tr.length), w);
      te.forEach((r, i) => { oof[cc.indexOf(r)] = [pB[i], dB.y[tr.length + i]]; });
    }
    const ys = oof.map((o) => o[1]), m = ys.reduce((a, b) => a + b, 0) / ys.length; let sse = 0, sst = 0; for (const [p, y] of oof) { sse += (y - p) ** 2; sst += (y - m) ** 2; }
    res.cv.push({ k, nestedCvR2: +(1 - sse / sst).toFixed(4) });
  }
  return res;
}
out.forward = [forwardAll(ALL, "all stats, all pockets", () => true), forwardAll(ALL, "C1 (cheap) stats only, all pockets", (s) => costOf(s) === "C1"), forwardAll(subsets.wordgrain, "all stats, word-grain pockets", () => true), forwardAll(subsets.present, "all stats, PRESENT pockets", () => true)];
// ---- B3 sign-split AUC among present pockets (P+ vs P-)
function auc(pos, neg) { const all = pos.map((x) => [x, 1]).concat(neg.map((x) => [x, 0])); const r = rank(all.map((a) => a[0])); let sr = 0; all.forEach((a, i) => { if (a[1]) sr += r[i]; }); return (sr - (pos.length * (pos.length + 1)) / 2) / (pos.length * neg.length); }
const PR = subsets.present, sgn = [];
for (const s of S) { const p = PR.filter((r) => r.status === "P+" && Number.isFinite(r.V[s])).map((r) => r.V[s]), n = PR.filter((r) => r.status === "P-" && Number.isFinite(r.V[s])).map((r) => r.V[s]); if (p.length >= 20 && n.length >= 20) { const a = auc(p, n); sgn.push({ stat: s, cost: costOf(s), nPos: p.length, nNeg: n.length, auc: +Math.max(a, 1 - a).toFixed(4), sign: a >= 0.5 ? "+ with P+" : "- with P+" }); } }
sgn.sort((a, b) => b.auc - a.auc);
{ // also: AUC of rareCurve's own v is 1 by definition; report the best rival and the count above 0.9
  const nP = PR.filter((r) => r.status === "P+").length, nN = PR.filter((r) => r.status === "P-").length;
  out.signSplit = { nPos: nP, nNeg: nN, top: sgn.slice(0, 10), nAbove90: sgn.filter((x) => x.auc >= 0.9).length, nAbove95: sgn.filter((x) => x.auc >= 0.95).length };
}
// ---- B4 label models (rank y on one-hot labels), adj R2 and 5-fold-ish nested CV (10 folds by hash)
function labelModel(rows, attrs) {
  const levels = attrs.map((a) => [...new Set(rows.map((r) => r[a]))].sort()), cols = [];
  attrs.forEach((a, j) => levels[j].slice(1).forEach((lv) => cols.push(rows.map((r) => (r[a] === lv ? 1 : 0)))));
  const y = rk(rows.map((r) => r.v)), X = rows.map((_, i) => [1, ...cols.map((c) => c[i])]), R2 = r2(X, y), p = cols.length, n = rows.length;
  const fold = (r) => parseInt(sha256(r.id).slice(0, 8), 16) % 10, oof = new Array(n).fill(0);
  for (let g = 0; g < 10; g++) { const tr = [], te = []; rows.forEach((r, i) => (fold(r) === g ? te : tr).push(i)); const w = ols(tr.map((i) => X[i]), tr.map((i) => y[i])); te.forEach((i) => { oof[i] = X[i].reduce((a, x, j) => a + x * w[j], 0); }); }
  const m = y.reduce((a, b) => a + b, 0) / n; let sse = 0, sst = 0; for (let i = 0; i < n; i++) { sse += (y[i] - oof[i]) ** 2; sst += (y[i] - m) ** 2; }
  return { attrs, nParams: p, R2: +R2.toFixed(4), adjR2: +(1 - (1 - R2) * (n - 1) / (n - p - 1)).toFixed(4), cvR2: +(1 - sse / sst).toFixed(4) };
}
out.labels = {};
for (const [name, rows] of [["all", ALL], ["wordgrain", subsets.wordgrain]]) out.labels[name] = [["grain"], ["group"], ["script"], ["register"], ["language"], ["grain", "register"], ["group", "register"]].filter((a) => !(name === "wordgrain" && a[0] === "grain" && a.length === 1)).map((a) => labelModel(rows, a));
fs.writeFileSync(path.join(HERE, "B_rival.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ topAll: out.subsets.all.top.slice(0, 6), forward: out.forward.map((f) => ({ l: f.label, nComplete: f.nComplete, base: f.controlsOnlyR2, trace: f.trace.map((t) => `${t.add}:${t.R2}`), cv: f.cv.map((c) => c.nestedCvR2) })), sign: out.signSplit, labels: out.labels }, null, 1));
