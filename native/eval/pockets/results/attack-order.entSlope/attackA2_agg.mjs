// attackA2_agg.mjs -- aggregate A2_raw_*.jsonl (size curve of entSlope and of the pooled-profile tilt sigma).  node attackA2_agg.mjs -> A2_summary.json
import fs from "node:fs";
import path from "node:path";
import { HERE, spearman, rngOf, seedOf, f } from "./lib.mjs";
const rows = []; for (const fn of fs.readdirSync(HERE).filter((x) => /^A2_raw_\d+\.jsonl$/.test(x))) for (const l of fs.readFileSync(path.join(HERE, fn), "utf8").split("\n").filter(Boolean)) rows.push(JSON.parse(l));
const med = (a) => { a = a.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null; };
const sizes = ["5000", "7500", "10000", "20000", "40000", "80000", "full"], out = { n: rows.length, bySize: {} };
// pocket-level value per size = mean over replicates of the mean of the two halves, replicate counted only when both halves defined
const lvl = (o, N, k) => { const xs = o.cells.filter((c) => String(c.N) === N && c.discover?.v != null && c.confirm?.v != null && c.discover[k] != null && c.confirm[k] != null).map((c) => (c.discover[k] + c.confirm[k]) / 2); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
const eta2 = (y, g) => { const m = y.reduce((a, b) => a + b, 0) / y.length, sst = y.reduce((a, b) => a + (b - m) ** 2, 0); if (!sst) return 0; const s = new Map(), c = new Map(); y.forEach((v, i) => { s.set(g[i], (s.get(g[i]) || 0) + v); c.set(g[i], (c.get(g[i]) || 0) + 1); }); let ssb = 0; for (const [k, v] of s) ssb += c.get(k) * (v / c.get(k) - m) ** 2; return ssb / sst; };
const permP = (y, g, tag, B = 1000) => { const rnd = rngOf(seedOf("attackA2", tag)), obs = eta2(y, g), gg = g.slice(); let ge = 0; for (let b = 0; b < B; b++) { for (let i = gg.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [gg[i], gg[j]] = [gg[j], gg[i]]; } if (eta2(y, gg) >= obs - 1e-12) ge++; } return { eta2: obs, p: (ge + 1) / (B + 1) }; };
for (const N of sizes) {
  const o = { classes: {} }, ok = rows.filter((r) => lvl(r, N, "v") != null);
  o.nDefined = ok.length; o.nUndefinedByCause = rows.length - ok.length;
  for (const cls of ["P+", "P-"]) { const s = ok.filter((r) => r.status0 === cls), v = s.map((r) => lvl(r, N, "v")), sg = s.map((r) => lvl(r, N, "sigma")), want = cls === "P+" ? 1 : -1;
    o.classes[cls] = { nOrig: rows.filter((r) => r.status0 === cls).length, nDefined: s.length, medianV: med(v), shareVpositive: v.filter((x) => x > 0).length / s.length, shareSignKept: v.filter((x) => Math.sign(x) === want).length / s.length, medianSigma: med(sg), shareSigmaPositive: sg.filter((x) => x > 0).length / s.length }; }
  // cell-level: sign of v vs sign of sigma (shift positive both)
  const cells = []; for (const r of ok) for (const c of r.cells.filter((c) => String(c.N) === N && c.discover?.v != null && c.confirm?.v != null)) { const sg = (c.discover.sigma + c.confirm.sigma) / 2, sh = (c.discover.shift + c.confirm.shift) / 2, v = (c.discover.v + c.confirm.v) / 2; cells.push({ v, sg, sh }); }
  o.cellsSigmaSignAgrees = cells.filter((c) => c.sh > 0 && Math.sign(c.sg) === Math.sign(c.v)).length / Math.max(1, cells.filter((c) => c.sh > 0).length); o.nCells = cells.length;
  o.spearmanVsigma = spearman(ok.map((r) => lvl(r, N, "v")), ok.map((r) => lvl(r, N, "sigma")));
  const y = ok.map((r) => (lvl(r, N, "v") > 0 ? 1 : 0)); o.registerSignOfV = ok.length > 30 ? { positive: y.reduce((a, b) => a + b, 0), n: y.length, ...permP(y, ok.map((r) => r.register), "reg-" + N) } : null;
  out.bySize[N] = o;
}
// within-pocket monotone trend: Spearman(log N, v) over the sizes where defined (>=4 sizes)
const trend = rows.map((r) => { const pts = sizes.map((N) => [N === "full" ? Math.log(Math.min(...r.halfTokens)) : Math.log(Number(N)), lvl(r, N, "v")]).filter((p) => p[1] != null); return pts.length >= 4 ? { id: r.id, st: r.status0, rho: spearman(pts.map((p) => p[0]), pts.map((p) => p[1])), n: pts.length } : null; }).filter(Boolean);
out.withinPocketTrend = { n: trend.length, shareVincreasesWithN: trend.filter((t) => t.rho > 0).length / trend.length, medianRho: med(trend.map((t) => t.rho)), P_plus: { n: trend.filter((t) => t.st === "P+").length, share: trend.filter((t) => t.st === "P+" && t.rho > 0).length / trend.filter((t) => t.st === "P+").length, medianRho: med(trend.filter((t) => t.st === "P+").map((t) => t.rho)) }, P_minus: { n: trend.filter((t) => t.st === "P-").length, share: trend.filter((t) => t.st === "P-" && t.rho > 0).length / trend.filter((t) => t.st === "P-").length, medianRho: med(trend.filter((t) => t.st === "P-").map((t) => t.rho)) } };
const sg = rows.map((r) => { const pts = sizes.map((N) => [N === "full" ? Math.log(Math.min(...r.halfTokens)) : Math.log(Number(N)), lvl(r, N, "sigma")]).filter((p) => p[1] != null); return pts.length >= 4 ? spearman(pts.map((p) => p[0]), pts.map((p) => p[1])) : null; }).filter((x) => x != null);
out.sigmaTrend = { n: sg.length, shareSigmaIncreasesWithN: sg.filter((x) => x > 0).length / sg.length, medianRho: med(sg) };
// per-register medians of v by size for registers with >= 8 PRESENT pockets
const regs = {}; for (const r of rows) (regs[r.register] ??= []).push(r);
out.byRegister = Object.entries(regs).filter(([, v]) => v.length >= 8).map(([k, v]) => ({ register: k, n: v.length, nPos0: v.filter((r) => r.status0 === "P+").length, medianV: Object.fromEntries(sizes.map((N) => [N, med(v.map((r) => lvl(r, N, "v")))])), shareVpos: Object.fromEntries(sizes.map((N) => { const x = v.map((r) => lvl(r, N, "v")).filter((q) => q != null); return [N, x.length ? +(x.filter((q) => q > 0).length / x.length).toFixed(2) : null]; })) }));
fs.writeFileSync(path.join(HERE, "A2_summary.json"), JSON.stringify(out, null, 1));
for (const N of sizes) { const o = out.bySize[N]; console.log(`N=${N.padEnd(5)} defined ${o.nDefined}/${rows.length} | orig P+: n=${o.classes["P+"].nDefined} medV ${f(o.classes["P+"].medianV, 4)} v>0 ${f(o.classes["P+"].shareVpositive, 2)} medSigma ${f(o.classes["P+"].medianSigma, 3)} | orig P-: n=${o.classes["P-"].nDefined} medV ${f(o.classes["P-"].medianV, 4)} v<0 ${f(1 - o.classes["P-"].shareVpositive, 2)} medSigma ${f(o.classes["P-"].medianSigma, 3)} | cells sign(sigma)=sign(v) ${f(o.cellsSigmaSignAgrees, 3)} rho(v,sigma) ${f(o.spearmanVsigma, 3)} | register sign-of-v eta2 ${o.registerSignOfV ? f(o.registerSignOfV.eta2, 3) + " p=" + f(o.registerSignOfV.p, 3) + " (+" + o.registerSignOfV.positive + "/" + o.registerSignOfV.n + ")" : "NA"}`); }
console.log(JSON.stringify(out.withinPocketTrend), JSON.stringify(out.sigmaTrend));
for (const r of out.byRegister) console.log(r.register.padEnd(10), "n", r.n, "P+0", r.nPos0, "shareV>0:", JSON.stringify(r.shareVpos));
