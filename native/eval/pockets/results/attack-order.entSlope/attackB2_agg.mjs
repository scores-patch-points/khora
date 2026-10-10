// attackB2_agg.mjs -- aggregate B2_*.json (text-computed rivals Lin, shift, sigma, Pred) against the atlas entSlope cells.  node attackB2_agg.mjs -> B2_rival.json
import fs from "node:fs";
import path from "node:path";
import { TABLE, HERE, rank, pearson, spearman, f, rngOf, seedOf } from "./lib.mjs";
const T = TABLE(), byId = new Map(T.rows.map((r) => [r.id, r]));
let rows = [];
for (const fn of fs.readdirSync(HERE).filter((x) => /^B2_\d+\.json$/.test(x))) for (const o of JSON.parse(fs.readFileSync(path.join(HERE, fn), "utf8"))) { const a = o.halves.discover, c = o.halves.confirm, r = byId.get(o.id); if (!a || !c || !r) continue; const m = (k) => (a[k] + c[k]) / 2; rows.push({ id: o.id, r, ent: m("entSlope"), Lin: m("Lin"), shift: m("shift"), sigma: m("sigma"), Pred: m("Pred"), shiftBoth: a.shift > 0 && c.shift > 0, sigBoth: Math.sign(a.sigma) === Math.sign(c.sigma) ? Math.sign(a.sigma) : 0, status: r.status, rare: r.v["order.rareSlope"], tok: r.tokens, mul: r.mul, reg: r.register }); }
rows.sort((a, b) => (a.id < b.id ? -1 : 1));
const out = { nPockets: rows.length }, P = rows.filter((x) => x.status === "P+" || x.status === "P-");
const col = (set, k) => set.map((x) => x[k]);
const pc = (set, kx) => { // partial Spearman of ent on kx controlling log tokens and mean unit length
  const R = (a) => rank(a), y = R(col(set, "ent")), x = R(col(set, kx)), c1 = R(set.map((s) => Math.log10(s.tok))), c2 = R(set.map((s) => s.mul));
  const res = (v) => { const X = [c1, c2], n = v.length; // OLS on two regressors + intercept via normal equations
    const cols = [new Array(n).fill(1), ...X], k = cols.length, A = cols.map((a) => cols.map((b) => a.reduce((s, q, i) => s + q * b[i], 0))), b = cols.map((a) => a.reduce((s, q, i) => s + q * v[i], 0));
    const M = A.map((r, i) => [...r, b[i]]); for (let i = 0; i < k; i++) { let p = i; for (let r = i + 1; r < k; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r; [M[i], M[p]] = [M[p], M[i]]; const d = M[i][i]; for (let q = i; q <= k; q++) M[i][q] /= d; for (let r = 0; r < k; r++) if (r !== i) { const g = M[r][i]; for (let q = i; q <= k; q++) M[r][q] -= g * M[i][q]; } }
    const beta = M.map((r) => r[k]); return v.map((t, i) => t - cols.reduce((s, c, j) => s + beta[j] * c[i], 0)); };
  return pearson(res(y), res(x)); };
for (const [label, set] of [["all", rows], ["present", P], ["presentWord", P.filter((x) => x.r.grain === "word")]]) {
  out[label] = { n: set.length };
  for (const k of ["Lin", "Pred", "sigma", "shift", "rare"]) { const s = set.filter((x) => x[k] != null); out[label][k] = { n: s.length, spearman: spearman(col(s, "ent").slice(0, 0).concat(s.map((x) => x.ent)), col(s, k)), pearson: pearson(s.map((x) => x.ent), col(s, k)), partialSpearman: pc(s, k) }; out[label][k].partialR2 = out[label][k].partialSpearman ** 2; out[label][k].spearmanR2 = out[label][k].spearman ** 2; out[label][k].pearsonR2 = out[label][k].pearson ** 2; }
}
// sign tables among PRESENT pockets
const tab = {}; for (const x of P) { const key = `sigma${x.sigBoth > 0 ? "+" : x.sigBoth < 0 ? "-" : "0"}|shift${x.shiftBoth ? "+" : "other"}|ent${x.status}`; tab[key] = (tab[key] || 0) + 1; } out.signTablePresent = tab;
const ok = (set, g) => set.filter((x) => g(x) === (x.status === "P+")).length;
out.signAccuracyPresent = { n: P.length, signSigma: ok(P, (x) => x.sigma > 0) / P.length, signPred: ok(P, (x) => x.Pred > 0) / P.length, signLin: ok(P, (x) => x.Lin > 0) / P.length, signShiftOnly: ok(P, (x) => x.shift > 0) / P.length, globalMajority: Math.max(P.filter((x) => x.status === "P+").length, P.filter((x) => x.status === "P-").length) / P.length, nShiftPositive: P.filter((x) => x.shiftBoth).length };
out.signAccuracyAll = { n: rows.length, signSigmaVsSignEnt: rows.filter((x) => Math.sign(x.sigma) === Math.sign(x.ent)).length / rows.length, signPredVsSignEnt: rows.filter((x) => Math.sign(x.Pred) === Math.sign(x.ent)).length / rows.length };
// is sigma itself register-scoped? eta2 of sigma (continuous) on register among all 390, permutation
const eta2c = (v, g) => { const m = v.reduce((a, b) => a + b, 0) / v.length, sst = v.reduce((a, b) => a + (b - m) ** 2, 0), s = new Map(), c = new Map(); v.forEach((x, i) => { s.set(g[i], (s.get(g[i]) || 0) + x); c.set(g[i], (c.get(g[i]) || 0) + 1); }); let ssb = 0; for (const [k, t] of s) ssb += c.get(k) * (t / c.get(k) - m) ** 2; return ssb / sst; };
const permEta = (v, g, tag) => { const rnd = rngOf(seedOf("attackB2", tag)), obs = eta2c(v, g), gg = g.slice(); let ge = 0; for (let b = 0; b < 1000; b++) { for (let i = gg.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [gg[i], gg[j]] = [gg[j], gg[i]]; } if (eta2c(v, gg) >= obs - 1e-12) ge++; } return { eta2: obs, p: (ge + 1) / 1001 }; };
out.sigmaByRegister = permEta(rows.map((x) => x.sigma), rows.map((x) => x.reg), "sigma-reg");
out.entByRegister = permEta(rows.map((x) => x.ent), rows.map((x) => x.reg), "ent-reg");
// by-register mean of sigma and share sigma<0, with entSlope share +
const byReg = {}; for (const x of rows) { const k = x.reg; (byReg[k] ??= { n: 0, sigNeg: 0, entPos: 0 }); byReg[k].n++; byReg[k].sigNeg += x.sigma < 0 ? 1 : 0; byReg[k].entPos += x.ent > 0 ? 1 : 0; }
out.byRegister = Object.entries(byReg).filter(([, v]) => v.n >= 8).map(([k, v]) => ({ register: k, n: v.n, shareSigmaNegative: v.sigNeg / v.n, shareEntPositive: v.entPos / v.n }));
// accuracy of sigma under the pocket's own pooled profile where it is "profile-determined": pockets with |shift|>0.2 both halves
out.shiftDistribution = { share_shift_gt0_bothHalves: rows.filter((x) => x.shiftBoth).length / rows.length, medianShift: [...rows.map((x) => x.shift)].sort((a, b) => a - b)[Math.floor(rows.length / 2)] };
fs.writeFileSync(path.join(HERE, "B2_rival.json"), JSON.stringify(out, null, 1));
for (const k of ["all", "present", "presentWord"]) console.log(k, JSON.stringify(Object.fromEntries(["Lin", "Pred", "sigma", "shift", "rare"].map((s) => [s, [out[k][s].spearman, out[k][s].partialSpearman, out[k][s].pearsonR2].map((v) => +v.toFixed(3))]))), "[spearman, partialSpearman, pearsonR2]");
console.log(JSON.stringify(out.signTablePresent)); console.log(JSON.stringify(out.signAccuracyPresent)); console.log(JSON.stringify(out.signAccuracyAll)); console.log(JSON.stringify(out.sigmaByRegister), JSON.stringify(out.entByRegister), JSON.stringify(out.shiftDistribution));
