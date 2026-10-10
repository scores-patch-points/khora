// attackB.mjs -- ATTACK B (cheaper rival). Across the real non-thin atlas pockets: partial Spearman of the pocket-level v of order.entSlope on every other atlas statistic's pocket-level v,
// controlling log10 tokens and mean unit length (ranks regressed out). Pre-fixed readings: a rival that explains >= 0.7 of the variance (partial rho^2 >= 0.7) makes the law a restatement.
//   node attackB.mjs -> B_rival.json
import fs from "node:fs";
import path from "node:path";
import { TABLE, HERE, rank, pearson, spearman, f } from "./lib.mjs";
const T = TABLE(), S = "order.entSlope";
const rows = T.rows.filter((r) => r.kind === "real" && !r.thin && r.v[S] != null && r.status !== "nodata");
// ---- linear algebra helpers (OLS by normal equations, Gauss-Jordan)
function solve(A, b) { const n = b.length, M = A.map((r, i) => [...r, b[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c]; if (Math.abs(d) < 1e-12) return null; for (let k = c; k <= n; k++) M[c][k] /= d; for (let r = 0; r < n; r++) if (r !== c) { const g = M[r][c]; for (let k = c; k <= n; k++) M[r][k] -= g * M[c][k]; } } return M.map((r) => r[n]); }
function ols(y, X) { // X: array of columns; intercept added; returns residuals and R2
  const n = y.length, cols = [new Array(n).fill(1), ...X], k = cols.length;
  const A = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => cols[i].reduce((s, v, t) => s + v * cols[j][t], 0))), b = cols.map((c) => c.reduce((s, v, t) => s + v * y[t], 0));
  const beta = solve(A, b); if (!beta) return null;
  const res = y.map((v, t) => v - cols.reduce((s, c, i) => s + beta[i] * c[t], 0)), my = y.reduce((a, c) => a + c, 0) / n;
  const ssr = res.reduce((s, v) => s + v * v, 0), sst = y.reduce((s, v) => s + (v - my) ** 2, 0);
  return { res, r2: 1 - ssr / sst, adjR2: 1 - (ssr / (n - k)) / (sst / (n - 1)) };
}
const auc = (pos, neg) => { const all = [...pos.map((v) => [v, 1]), ...neg.map((v) => [v, 0])]; const r = rank(all.map((x) => x[0])); let sp = 0; all.forEach((x, i) => { if (x[1]) sp += r[i]; }); return (sp - (pos.length * (pos.length + 1)) / 2) / (pos.length * neg.length); };
function analyse(set, label) {
  const y = set.map((r) => r.v[S]), ry = rank(y), cT = rank(set.map((r) => Math.log10(r.tokens))), cU = rank(set.map((r) => r.mul)), ctl = [cT, cU];
  const base = ols(ry, ctl), out = { label, n: set.length, controlsOnly: { R2_rankV_on_logTokens_meanUnitLen: base.r2, rho_tokens: spearman(y, set.map((r) => r.tokens)), rho_unitLen: spearman(y, set.map((r) => r.mul)) }, rivals: [] };
  const signs = set.map((r) => Math.sign(r.v[S]));
  for (const st of T.stats) {
    if (st === S) continue;
    const ok = set.map((r) => r.v[st] != null); if (ok.filter(Boolean).length < 0.8 * set.length) continue;
    const sub = set.filter((_, i) => ok[i]), ys = rank(sub.map((r) => r.v[S])), xs = rank(sub.map((r) => r.v[st])), c1 = rank(sub.map((r) => Math.log10(r.tokens))), c2 = rank(sub.map((r) => r.mul));
    const ry2 = ols(ys, [c1, c2]), rx2 = ols(xs, [c1, c2]), prho = pearson(ry2.res, rx2.res), rho = pearson(ys, xs);
    const pos = sub.filter((r) => r.v[S] > 0).map((r) => r.v[st]), neg = sub.filter((r) => r.v[S] < 0).map((r) => r.v[st]);
    const a = pos.length && neg.length ? auc(pos, neg) : null;
    out.rivals.push({ stat: st, n: sub.length, rho, partialRho: prho, partialR2: prho * prho, signAUC: a, signAUCbest: a == null ? null : Math.max(a, 1 - a) });
  }
  out.rivals.sort((p, q) => Math.abs(q.partialRho) - Math.abs(p.partialRho));
  // greedy forward selection on rank(v) with controls, up to 4 rivals, reporting R2 and adjR2
  const cols = {}; for (const st of T.stats) if (st !== S && set.every((r) => r.v[st] != null)) cols[st] = rank(set.map((r) => r.v[st]));
  const chosen = [], path_ = [];
  for (let step = 0; step < 4; step++) {
    let best = null;
    for (const st of Object.keys(cols)) { if (chosen.includes(st)) continue; const m = ols(ry, [...ctl, ...chosen.map((c) => cols[c]), cols[st]]); if (m && (!best || m.adjR2 > best.adjR2)) best = { st, r2: m.r2, adjR2: m.adjR2 }; }
    if (!best) break; chosen.push(best.st); path_.push(best);
  }
  out.greedyRankOLS = path_;
  // pooled R2 of ALL rivals + controls (upper bound of "explained by the battery"), ridge-free with n >> k check
  const allk = Object.keys(cols); if (allk.length + 3 < set.length / 3) { const m = ols(ry, [...ctl, ...allk.map((c) => cols[c])]); out.allRivalsR2 = m && { k: allk.length, r2: m.r2, adjR2: m.adjR2 }; }
  return out;
}
const res = { statistic: S, populations: {} };
res.populations.allReal390 = analyse(rows, "all real non-thin pockets with a defined entSlope");
res.populations.present245 = analyse(rows.filter((r) => r.status === "P+" || r.status === "P-"), "PRESENT pockets only (either sign)");
res.populations.presentWord = analyse(rows.filter((r) => (r.status === "P+" || r.status === "P-") && r.grain === "word"), "PRESENT pockets, word grain");
// sign-prediction accuracy of each rival's own sign, for PRESENT pockets that are also PRESENT in the rival
const P = rows.filter((r) => r.status === "P+" || r.status === "P-");
res.signAgreement = T.stats.filter((s) => s !== S).map((st) => { const both = P.filter((r) => r.st[st] === "P+" || r.st[st] === "P-"); if (both.length < 30) return null; const ag = both.filter((r) => (r.status === "P+") === (r.st[st] === "P+")).length; return { stat: st, nBoth: both.length, agree: ag, share: ag / both.length }; }).filter(Boolean).map((x) => ({ ...x, best: Math.max(x.share, 1 - x.share), flipped: x.share < 0.5 })).sort((a, b) => b.best - a.best).slice(0, 12);
fs.writeFileSync(path.join(HERE, "B_rival.json"), JSON.stringify(res, null, 1));
for (const [k, o] of Object.entries(res.populations)) {
  console.log(`== ${k} n=${o.n}  controls-only R2=${f(o.controlsOnly.R2_rankV_on_logTokens_meanUnitLen)} rho(tokens)=${f(o.controlsOnly.rho_tokens)} rho(unitLen)=${f(o.controlsOnly.rho_unitLen)}`);
  for (const r of o.rivals.slice(0, 8)) console.log(`  ${r.stat.padEnd(18)} rho=${f(r.rho)} partial=${f(r.partialRho)} R2=${f(r.partialR2)} signAUC=${f(r.signAUC)} n=${r.n}`);
  console.log("  greedy:", o.greedyRankOLS.map((g) => `${g.st}(R2 ${f(g.r2)}, adj ${f(g.adjR2)})`).join(" -> "), "| all-battery R2", o.allRivalsR2 ? `${f(o.allRivalsR2.r2)} adj ${f(o.allRivalsR2.adjR2)} k=${o.allRivalsR2.k}` : "NA");
}
console.log("sign agreement top:", res.signAgreement.slice(0, 6).map((x) => `${x.stat} ${x.agree}/${x.nBoth}${x.flipped ? " (flipped)" : ""}`).join(" | "));
