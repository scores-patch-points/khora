// eval/physics-handles/curvature-report.mjs — analysis of curvature.mjs: implements the rules of ITS pre-registered header (C1..C5, WG, M), nothing else.
import fs from "node:fs";
import path from "node:path";
import { round, mean, median, quantile, spearman, partialSpearman, ols, mulberry32, shuffleInPlace, sum, headerSha256 } from "./lib.mjs";

const load = (dir, name) => { const f = path.join(dir, `${name}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };
const boot = (n, stat, { B = 300, seed = 1 } = {}) => { const rnd = mulberry32(seed), v = []; for (let t = 0; t < B; t++) { const idx = Array.from({ length: n }, () => Math.floor(rnd() * n)); const x = stat(idx); if (Number.isFinite(x)) v.push(x); } return { lo: round(quantile(v, 0.025)), hi: round(quantile(v, 0.975)) }; };
const binomP = (k, n) => { // one-sided P(X >= k), X ~ Bin(n, 0.5), exact via logs
  let p = 0; const lg = (m) => { let s = 0; for (let i = 2; i <= m; i++) s += Math.log(i); return s; };
  for (let j = k; j <= n; j++) p += Math.exp(lg(n) - lg(j) - lg(n - j) - n * Math.log(2)); return Math.min(1, p); };

export async function report(dir) {
  const names = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.endsWith(".H1.json") && !f.startsWith("_")).map((f) => f.replace(".json", ""));
  const R = { headerSha256: headerSha256(new URL("./curvature.mjs", import.meta.url).pathname), corpora: {}, tests: {} };
  const C = Object.fromEntries(names.map((n) => [n, load(dir, n)]).filter(([, r]) => r && !r.gap && r.per.length >= 40));
  const per = {};
  for (const [name, r] of Object.entries(C)) {
    const P = r.per.filter((p) => Number.isFinite(p.Cdel) && Number.isFinite(p.Crand) && p.Cdel > 0 && p.Crand > 0);
    const lg = (x) => Math.log(x), out = { bodies: P.length, K1: r.K1?.C, K2: r.K2?.same, kNN: r.kNN };
    // C1
    const above = P.filter((p) => p.Cdel > p.Crand).length; out.C1 = { shareExcessPositive: round(above / P.length), signP: round(binomP(above, P.length), 4), medianExcessRel: round(median(P.map((p) => (p.Cdel - p.Crand) / p.Crand))) };
    // C2
    const sl = (get) => { const o = ols(P.map((p) => lg(p.n)), P.map((p) => lg(get(p)))); return o ? o.b : NaN; };
    out.C2 = { slopeDelete: round(sl((p) => p.Cdel)), ciDelete: boot(P.length, (idx) => { const o = ols(idx.map((i) => lg(P[i].n)), idx.map((i) => lg(P[i].Cdel))); return o ? o.b : NaN; }, { seed: 2 }), slopeRandom: round(sl((p) => p.Crand)), ciRandom: boot(P.length, (idx) => { const o = ols(idx.map((i) => lg(P[i].n)), idx.map((i) => lg(P[i].Crand))); return o ? o.b : NaN; }, { seed: 3 }) };
    // C3
    const sp = (a) => { const xs = [], ys = []; a.forEach((v, i) => { if (v !== null && v !== undefined) { xs.push(i); ys.push(v); } }); return xs.length >= 4 ? spearman(xs, ys) : null; };
    out.C3 = { del: round(sp(r.radialMean.del)), col: round(sp(r.radialMean.col)), radialDel: r.radialMean.del.map((x) => round(x, 7)), radialCol: r.radialMean.col.map((x) => round(x, 7)), nearShareMedian: round(median(P.map((p) => p.nearShare).filter((x) => x !== null))) };
    // C4
    out.C4 = { medianMaskOverDelete: round(median(P.filter((p) => p.Cmask >= 0).map((p) => p.Cmask / p.Cdel))), medianColOverDelete: round(median(P.map((p) => p.Ccol / p.Cdel))) };
    // C5
    const G = P.filter((p) => p.geo && p.geo.bendThrough !== null && p.geo.bendOther !== null);
    out.C5 = { bodiesInT: G.length, throughLongerShare: G.length ? round(G.filter((p) => p.geo.bendThrough > p.geo.bendOther).length / G.length) : null, meanBendThrough: round(mean(G.map((p) => p.geo.bendThrough))), meanBendOther: round(mean(G.map((p) => p.geo.bendOther))), betweennessVsLogN: G.length >= 10 ? round(spearman(G.map((p) => lg(p.n)), G.map((p) => p.geo.through))) : null, betweennessVsEallGivenN: G.length >= 10 ? round(partialSpearman(G.map((p) => p.geo.through), G.map((p) => p.Eall), [G.map((p) => lg(p.n))])) : null };
    // WG
    const W = P.filter((p) => Number.isFinite(p.Eeven) && Number.isFinite(p.Codd) && p.Codd > 0), lgn = (a) => a.map((p) => lg(p.n));
    const raw = spearman(W.map((p) => p.Eeven), W.map((p) => p.Codd)), part = partialSpearman(W.map((p) => p.Eeven), W.map((p) => p.Codd), [lgn(W)]);
    const ci = boot(W.length, (idx) => partialSpearman(idx.map((i) => W[i].Eeven), idx.map((i) => W[i].Codd), [idx.map((i) => lg(W[i].n))]), { seed: 4 });
    // deranged control: Codd permuted among bodies of the same count quartile
    const rnd = mulberry32(5), nulls = []; for (let t = 0; t < 1000; t++) { const c = W.map((p) => p.Codd); for (const qq of [0, 1, 2, 3]) { const idx = W.map((p, i) => (p.quartile === qq ? i : -1)).filter((i) => i >= 0); const vals = shuffleInPlace(idx.map((i) => c[i]), rnd); idx.forEach((i, k) => { c[i] = vals[k]; }); } nulls.push(partialSpearman(W.map((p) => p.Eeven), c, [lgn(W)])); }
    const shuf = (r.shufPer ?? []).filter((p) => Number.isFinite(p.Eeven) && Number.isFinite(p.Codd) && p.Codd > 0);
    const shufPart = shuf.length >= 15 ? partialSpearman(shuf.map((p) => p.Eeven), shuf.map((p) => p.Codd), [shuf.map((p) => lg(p.n))]) : null;
    out.WG = { bodies: W.length, rawSpearman: round(raw), partialGivenLogN: round(part), ci, derangedQ95: round(quantile(nulls, 0.95)), derangedMean: round(mean(nulls)), shuffledCorpusPartial: round(shufPart), shuffledBodies: shuf.length, spearmanEvenVsLogN: round(spearman(W.map((p) => p.Eeven), lgn(W))), spearmanCoddVsLogN: round(spearman(W.map((p) => p.Codd), lgn(W))) };
    out.WG.oneQuantity = part >= 0.3 && ci.lo > 0.1 && part - quantile(nulls, 0.95) >= 0.15 && shufPart !== null && Math.abs(shufPart) <= part / 2;
    // M
    const M = (r.momentum ?? []).filter((m) => m.R !== null && Number.isFinite(m.R)); const Rs = M.map((m) => m.R);
    out.M = { bodies: M.length, medianR: round(median(Rs)), ci: M.length >= 10 ? boot(M.length, (idx) => median(idx.map((i) => Rs[i])), { seed: 6 }) : null, reliability: M.filter((m) => m.R1 && m.R2).length >= 10 ? round(spearman(M.filter((m) => m.R1 && m.R2).map((m) => m.R1), M.filter((m) => m.R1 && m.R2).map((m) => m.R2))) : null, Jslope: (() => { const pts = M.flatMap((m) => m.J.filter(([, a]) => a > 0).map(([n, a]) => [lg(n), lg(a)])); const o = pts.length >= 10 ? ols(pts.map((x) => x[0]), pts.map((x) => x[1])) : null; return o ? round(o.b) : null; })() };
    per[name] = out;
  }
  R.corpora = per;
  const ks = Object.keys(per), share = (f) => ({ n: ks.length, k: ks.filter((k) => f(per[k])).length, share: round(ks.filter((k) => f(per[k])).length / Math.max(1, ks.length)) });
  R.tests.C1 = { ...share((c) => c.C1.shareExcessPositive >= 0.6 && c.C1.signP <= 0.05), medianShare: round(median(ks.map((k) => per[k].C1.shareExcessPositive))) }; R.tests.C1.pass = R.tests.C1.share >= 0.6; R.tests.C1.falsified = ks.filter((k) => per[k].C1.shareExcessPositive >= 0.4 && per[k].C1.shareExcessPositive <= 0.6).length / Math.max(1, ks.length) >= 0.5;
  R.tests.C2 = { ...share((c) => c.C2.slopeDelete >= 0.3 && c.C2.slopeDelete <= 1.2 && c.C2.slopeRandom >= 0.3 && c.C2.slopeRandom <= 1.2 && Math.abs(c.C2.slopeDelete - c.C2.slopeRandom) <= 0.15), medianSlopeDelete: round(median(ks.map((k) => per[k].C2.slopeDelete))), medianSlopeRandom: round(median(ks.map((k) => per[k].C2.slopeRandom))) };
  R.tests.C3 = { del: share((c) => c.C3.del !== null && c.C3.del <= -0.7), col: share((c) => c.C3.col !== null && c.C3.col <= -0.7) }; R.tests.C3.pass = R.tests.C3.del.share >= 0.75;
  R.tests.C4 = { ...share((c) => c.C4.medianMaskOverDelete >= 0.5), median: round(median(ks.map((k) => per[k].C4.medianMaskOverDelete))), note: "MASK and COLDROP are identical by construction in this geometry" }; R.tests.C4.pass = R.tests.C4.share >= 0.75;
  R.tests.C5 = { ...share((c) => c.C5.throughLongerShare !== null && c.C5.throughLongerShare >= 0.75), medianBetweennessVsLogN: round(median(ks.map((k) => per[k].C5.betweennessVsLogN).filter((x) => x !== null))), medianPartialBetweennessVsE: round(median(ks.map((k) => per[k].C5.betweennessVsEallGivenN).filter((x) => x !== null))) };
  R.tests.WG = { ...share((c) => c.WG.oneQuantity), medianRaw: round(median(ks.map((k) => per[k].WG.rawSpearman))), medianPartial: round(median(ks.map((k) => per[k].WG.partialGivenLogN))), partialsByCorpus: Object.fromEntries(ks.map((k) => [k, per[k].WG.partialGivenLogN])), medianShuffledPartial: round(median(ks.map((k) => per[k].WG.shuffledCorpusPartial).filter((x) => x !== null))), medianDerangedQ95: round(median(ks.map((k) => per[k].WG.derangedQ95))), medianSpearmanEvenVsLogN: round(median(ks.map((k) => per[k].WG.spearmanEvenVsLogN))), medianSpearmanCoddVsLogN: round(median(ks.map((k) => per[k].WG.spearmanCoddVsLogN))) };
  const stems = [...new Set(ks.filter((k) => /^ud-/.test(k)).map((k) => k.replace(/^ud-/, "").replace(/-[AB]$/, "")))].filter((s) => per[`ud-${s}-A`] && per[`ud-${s}-B`]);
  R.tests.WG.crossFold = { stems: stems.length, agree: stems.filter((s) => Math.abs(per[`ud-${s}-A`].WG.partialGivenLogN - per[`ud-${s}-B`].WG.partialGivenLogN) <= 0.2).length, rule: ">= 6 of 8 stems with |rho_A - rho_B| <= 0.20", detail: Object.fromEntries(stems.map((s) => [s, [per[`ud-${s}-A`].WG.partialGivenLogN, per[`ud-${s}-B`].WG.partialGivenLogN]])) };
  R.tests.WG.oneQuantityOverall = R.tests.WG.share >= 0.6 && R.tests.WG.crossFold.agree >= 6;
  R.tests.M = { M1: share((c) => c.M.ci && c.M.ci.hi < 1), medianR: round(median(ks.map((k) => per[k].M.medianR).filter((x) => x !== null))), reliability: share((c) => c.M.reliability !== null && c.M.reliability >= 0.3), medianReliability: round(median(ks.map((k) => per[k].M.reliability).filter((x) => x !== null))), medianJslope: round(median(ks.map((k) => per[k].M.Jslope).filter((x) => x !== null))) }; R.tests.M.M1pass = R.tests.M.M1.share >= 0.6;
  R.tests.K = { K1_allZero: ks.every((k) => per[k].K1 === 0), K2_allSame: ks.every((k) => per[k].K2) };
  fs.writeFileSync(path.join(dir, "_report.json"), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R.tests, null, 1));
  return R;
}
