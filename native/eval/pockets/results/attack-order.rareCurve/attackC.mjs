// attackC.mjs -- ATTACK C (multiplicity and the SHARED PROPERTY). Own implementation (nothing imported from classify-*.mjs), deterministic (rngOf/seedOf).
//  C1 cell counts and expected false PRESENT cells: statistics x pockets tested by the atlas; planted-iid and shuffled-control false-PRESENT rates from law-table.json; exact binomial / Clopper-Pearson against the 255 observed rareCurve PRESENT cells; t9 reference.
//  C2 SHARED PROPERTY of the PRESENT pockets (indicator PRESENT = P+ or P-) on group / register / script / log10 tokens / log10 mean unit length / log10 docs: observed eta2 (or r2), 2000-draw permutation p over pocket labels, Westfall-Young minP;
//     leave-one-pocket-out (390 deletions, eta2 and 2000-draw p each), leave-one-register-out, leave-one-group-out, group-STRATIFIED permutation (indicator permuted inside each loader group: does register carry information beyond the group?).
//  C3 SIGN SPLIT among PRESENT pockets (P+ versus P-): eta2 on register and on grain, permutations, leave-one-register-out, and the same restricted to word-grain pockets only (code and charbigram removed).
//  C4 selection multiplicity: how many of the 81 statistics are REVERSAL or POCKET-SPECIFIC with shared p < 0.05, Bonferroni arithmetic.   node attackC.mjs -> C_multiplicity.json
import fs from "node:fs";
import path from "node:path";
import { HERE, rngOf, seedOf } from "./lib.mjs";
const T = JSON.parse(fs.readFileSync(path.join(HERE, "table.json"), "utf8")).rows.filter((r) => r.status !== "nodata");
const D = 2000, out = { nPockets: T.length };
const logC = (n, k) => { let s = 0; for (let i = 1; i <= k; i++) s += Math.log((n - k + i) / i); return s; };
// ---------- C1
{
  const L = JSON.parse(fs.readFileSync(path.join(HERE, "../law-table.json"), "utf8")), M = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas-matrix.json"), "utf8"));
  const fp = L.falsePresent, nStat = M.statistics.length, real = M.pockets.filter((p) => p.kind === "real" && !p.thin);
  let defined = 0, present = 0; for (const p of real) for (const c of p.cells) if (c && c[4] && !["nodata", "zundef"].includes(c[4])) { defined++; if (c[4] === "P+" || c[4] === "P-") present++; }
  const p0 = fp.binomialReference.p, n = T.length, k = T.filter((r) => r.status === "P+" || r.status === "P-").length;
  let logTail = -Infinity; { const terms = []; for (let j = k; j <= n; j++) terms.push(logC(n, j) + j * Math.log(p0) + (n - j) * Math.log(1 - p0)); const mx = Math.max(...terms); logTail = mx + Math.log(terms.reduce((a, b) => a + Math.exp(b - mx), 0)); }
  const ctrlRare = M.pockets.filter((p) => p.kind === "control").map((p) => p.cells[M.statistics.indexOf("order.rareCurve")]?.[4]);
  out.C1 = { statistics: nStat, realNonThinPockets: real.length, statisticTimesPocketCells: nStat * real.length, definedRealCells: defined, presentRealCells: present, rareCurveCells: n, rareCurvePresent: k,
    plantedIid: { halfCells: fp.plantedIid.halfCells, absZge4: fp.plantedIid.absZge4, rate4: fp.plantedIid.rate4, presentObserved: fp.plantedIid.presentCellsObserved },
    controls: { halfCells: fp.controls.halfCells, absZge4: fp.controls.absZge4, presentObserved: fp.controls.presentCellsObserved },
    pFalsePresentPerCell: p0, expectedFalsePresentAllCells: +(defined * p0).toFixed(3), expectedFalsePresentRareCurve: +(n * p0).toFixed(4),
    log10BinomialTailP255of390: +(logTail / Math.LN10).toFixed(1),
    upperBound95FalsePresentRate: { fromPlanted0of153: 3 / 153, fromControls0of1447: 3 / 1447, pooled0of1600: 3 / 1600 },
    expectedFalsePresentRareCurveUpper: +(n * 3 / 1600).toFixed(2),
    rareCurveInShuffledControls: { cells: ctrlRare.length, status: ctrlRare.reduce((a, s) => { a[s] = (a[s] || 0) + 1; return a; }, {}) },
    expectedPresentIfPerHalfRateIs: { rate4: +(fp.plantedIid.rate4 ** 2 / 2).toExponential(2), t9: +(0.0031 ** 2 / 2).toExponential(2), note: "P(|t9|>=4)=0.0031 per half; both halves with one sign = rate^2/2" } };
}
// ---------- shared machinery
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const cats = (labels) => { const m = new Map(); const c = labels.map((l) => { const k = String(l ?? "NA"); if (!m.has(k)) m.set(k, m.size); return m.get(k); }); return { cat: c, k: m.size, levels: [...m.keys()] }; };
function eta2(y, cat, k) { const n = y.length, m = mean(y), sum = new Float64Array(k), cnt = new Float64Array(k); let sst = 0; for (let i = 0; i < n; i++) { sum[cat[i]] += y[i]; cnt[cat[i]]++; sst += (y[i] - m) ** 2; } if (!(sst > 0)) return 0; let ssb = 0; for (let g = 0; g < k; g++) if (cnt[g]) ssb += cnt[g] * (sum[g] / cnt[g] - m) ** 2; return ssb / sst; }
function r2num(x, y) { const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0; }
const shuf = (a, rnd) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ATTR = (rows) => [{ name: "group", t: "c", ...cats(rows.map((r) => r.group)) }, { name: "register", t: "c", ...cats(rows.map((r) => r.register)) }, { name: "script", t: "c", ...cats(rows.map((r) => r.script)) },
  { name: "grain", t: "c", ...cats(rows.map((r) => r.grain)) }, { name: "tokens", t: "n", x: rows.map((r) => Math.log10(r.tokens)) }, { name: "meanUnitLength", t: "n", x: rows.map((r) => Math.log10(r.mul)) }, { name: "docs", t: "n", x: rows.map((r) => Math.log10(r.docs)) }];
const eff = (a, y) => (a.t === "c" ? eta2(y, a.cat, a.k) : r2num(a.x, y));
/** permutation p (own) per attribute + Westfall-Young minP; optional strata (array of stratum ids): permute y within strata */
function shared(rows, ind, seed, strata = null, attrs = ATTR(rows), draws = D) {
  const rnd = rngOf(seed), obs = attrs.map((a) => eff(a, ind)), perm = attrs.map(() => new Float64Array(draws)), groups = new Map();
  if (strata) strata.forEach((s, i) => { if (!groups.has(s)) groups.set(s, []); groups.get(s).push(i); });
  for (let d = 0; d < draws; d++) {
    let yp;
    if (strata) { yp = ind.slice(); for (const ix of groups.values()) { const v = shuf(ix.map((i) => ind[i]), rnd); ix.forEach((i, j) => { yp[i] = v[j]; }); } } else yp = shuf(ind.slice(), rnd);
    attrs.forEach((a, j) => { perm[j][d] = eff(a, yp); });
  }
  const pOwn = obs.map((v, j) => (1 + perm[j].filter((x) => x >= v - 1e-12).length) / (1 + draws));
  const mu = perm.map((p) => mean(Array.from(p))), sd = perm.map((p, j) => Math.sqrt(mean(Array.from(p).map((x) => (x - mu[j]) ** 2))));
  return attrs.map((a, j) => ({ attr: a.name, effect: +obs[j].toFixed(4), nullMean: +mu[j].toFixed(4), nullSd: +sd[j].toFixed(4), zApprox: +((obs[j] - mu[j]) / sd[j]).toFixed(1), p: +pOwn[j].toFixed(5), levels: a.t === "c" ? a.k : undefined }));
}
// ---------- C2 shared property of PRESENT
const ind = T.map((r) => (r.status === "P+" || r.status === "P-" ? 1 : 0));
out.C2 = { nPresent: ind.reduce((a, b) => a + b, 0), n: T.length, perm2000: shared(T, ind, seedOf("attackC-rc", "shared")) };
out.C2.groupStratified = shared(T, ind, seedOf("attackC-rc", "shared-strat"), T.map((r) => r.group), [ATTR(T)[1]]);
{ // leave-one-pocket-out: eta2(register) range and worst p
  const eRange = [], pAll = [];
  for (let i = 0; i < T.length; i++) { const rows = T.filter((_, j) => j !== i), a = ATTR(rows)[1], y = rows.map((r) => (r.status === "P+" || r.status === "P-" ? 1 : 0)), e = eta2(y, a.cat, a.k); eRange.push(e); if (i % 10 === 0) pAll.push(shared(rows, y, seedOf("attackC-rc", "lopo", i), null, [a])[0].p); }
  out.C2.leaveOnePocketOut = { n: T.length, eta2Register: { min: +Math.min(...eRange).toFixed(4), max: +Math.max(...eRange).toFixed(4) }, pEvery10thDeletion: { n: pAll.length, max: Math.max(...pAll) } };
}
{ // leave-one-register-out and leave-one-group-out
  const lo = (key) => [...new Set(T.map((r) => r[key]))].sort().map((lv) => { const rows = T.filter((r) => r[key] !== lv), y = rows.map((r) => (r.status === "P+" || r.status === "P-" ? 1 : 0)), res = shared(rows, y, seedOf("attackC-rc", "lo", key, lv), null, ATTR(rows).filter((a) => ["register", "group"].includes(a.name))); return { left: lv, n: rows.length, nPresent: y.reduce((a, b) => a + b, 0), register: res.find((x) => x.attr === "register"), group: res.find((x) => x.attr === "group") }; });
  const R = lo("register"); out.C2.leaveOneRegisterOut = { minEta2: Math.min(...R.map((x) => x.register.effect)), maxP: Math.max(...R.map((x) => x.register.p)), worst: R.slice().sort((a, b) => b.register.p - a.register.p).slice(0, 3).map((x) => ({ left: x.left, eta2: x.register.effect, p: x.register.p })) };
  const G = lo("group"); out.C2.leaveOneGroupOut = G.map((x) => ({ left: x.left, n: x.n, nPresent: x.nPresent, registerEta2: x.register.effect, registerP: x.register.p }));
}
// ---------- C3 sign split among PRESENT
const PR = T.filter((r) => r.status === "P+" || r.status === "P-"), sg = (rows) => rows.map((r) => (r.status === "P+" ? 1 : 0));
out.C3 = { nPos: PR.filter((r) => r.status === "P+").length, nNeg: PR.filter((r) => r.status === "P-").length, all: shared(PR, sg(PR), seedOf("attackC-rc", "sign")), allGroupStratified: shared(PR, sg(PR), seedOf("attackC-rc", "sign-strat"), PR.map((r) => r.group), [ATTR(PR)[1]]) };
const PW = PR.filter((r) => r.grain === "word");
out.C3.wordGrainOnly = { nPos: PW.filter((r) => r.status === "P+").length, nNeg: PW.filter((r) => r.status === "P-").length, perm: shared(PW, sg(PW), seedOf("attackC-rc", "sign-word")) };
{ const R = [...new Set(PR.map((r) => r.register))].sort().map((lv) => { const rows = PR.filter((r) => r.register !== lv); return { left: lv, eta2: +eta2(sg(rows), ATTR(rows)[1].cat, ATTR(rows)[1].k).toFixed(4) }; }); out.C3.leaveOneRegisterOut = { minEta2: Math.min(...R.map((x) => x.eta2)), argmin: R.sort((a, b) => a.eta2 - b.eta2)[0].left }; }
// register profile for the + / - claim (Fisher exact two-sided is overkill: counts only) and non-code negatives by register
out.C3.negativesWordGrain = PW.filter((r) => r.status === "P-").reduce((a, r) => { a[r.register] = (a[r.register] || 0) + 1; return a; }, {});
// ---------- C4 selection multiplicity
{
  const L = JSON.parse(fs.readFileSync(path.join(HERE, "../law-table.json"), "utf8")).statistics, rev = L.filter((s) => (s.statuses || []).includes("REVERSAL")), spec = L.filter((s) => (s.statuses || []).includes("POCKET-SPECIFIC"));
  const sel = (s) => s.sharedProperty && s.sharedProperty.pMax < 0.05;
  out.C4 = { statistics: L.length, nReversal: rev.length, nPocketSpecific: spec.length, nEither: new Set([...rev, ...spec].map((s) => s.stat)).size, nEitherWithSharedPmaxLt05: [...new Set([...rev, ...spec])].filter(sel).length, reversalStats: rev.map((s) => s.stat),
    bonferroniNote: "p resolution with 2000 draws is 1/2001 = 0.0005; times 81 statistics = 0.04; times 81 x 6 attributes = 0.24 (not resolvable with 2000 draws, see zApprox in C2)" };
}
fs.writeFileSync(path.join(HERE, "C_multiplicity.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
