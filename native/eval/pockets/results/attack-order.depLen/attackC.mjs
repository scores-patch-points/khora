// attackC.mjs -- ATTACK C (multiplicity, shared property, leave-one-out) on order.depLen, from results/atlas-matrix.json only.   node attackC.mjs -> attackC.json
// Cells: statuses P+ / P- / A / M of the stored matrix; PRESENT indicator = P+ or P-; defined = status in {P+,P-,A,M}.  eta^2 definitions are the atlas's (SS_between/SS_total of the indicator on the categories;
// r^2 of log10 attribute on the indicator); first reproduced exactly, then attacked.  Permutations: seeded (rngOf/seedOf), no Math.random.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rngOf, seedOf } from "../../lib/pocket.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), M = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas-matrix.json"), "utf8"));
const S = M.statistics, DEP = S.indexOf("order.depLen"), P = M.pockets.filter((p) => p.kind === "real" && !p.thin), n = P.length;
const DEF = new Set(["P+", "P-", "A", "M"]);
const ints = (arr) => { const m = new Map(); return Int32Array.from(arr, (x) => { if (!m.has(x)) m.set(x, m.size); return m.get(x); }); };
const cats = { group: ints(P.map((p) => p.group)), register: ints(P.map((p) => p.register)), script: ints(P.map((p) => p.script ?? "na")) };
const nums = { tokens: Float64Array.from(P, (p) => Math.log10(p.tokens)), meanUnitLength: Float64Array.from(P, (p) => Math.log10(p.meanUnitLength)), docs: Float64Array.from(P, (p) => Math.log10(p.docs)) };
const ATTRS = ["group", "register", "script", "tokens", "meanUnitLength", "docs"];
const K = (lab) => { let k = 0; for (const x of lab) if (x + 1 > k) k = x + 1; return k; };

/** eta^2 of indicator y (Float64Array) on labels lab (Int32Array) over the index list ix */
function etaCat(y, lab, ix, kmax) {
  const s = new Float64Array(kmax), c = new Int32Array(kmax); let sy = 0, syy = 0;
  for (const i of ix) { const l = lab[i]; s[l] += y[i]; c[l]++; sy += y[i]; syy += y[i] * y[i]; }
  const m = sy / ix.length, tot = syy - ix.length * m * m; if (tot <= 1e-12) return NaN;
  let bet = 0; for (let g = 0; g < kmax; g++) if (c[g]) bet += (s[g] * s[g]) / c[g]; bet -= ix.length * m * m;
  return bet / tot;
}
function r2Num(y, x, ix) {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0; const m = ix.length;
  for (const i of ix) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; syy += y[i] * y[i]; sxy += x[i] * y[i]; }
  const cov = sxy - (sx * sy) / m, vx = sxx - (sx * sx) / m, vy = syy - (sy * sy) / m; return vx > 1e-12 && vy > 1e-12 ? (cov * cov) / (vx * vy) : NaN;
}
const effect = (y, attr, ix, perm = null) => {   // eta^2 / r^2 of attribute `attr` (labels permuted by perm: label of pocket i is lab[perm[i]])
  if (cats[attr]) { const lab = perm ? Int32Array.from(cats[attr], (_, i) => cats[attr][perm[i]]) : cats[attr]; return etaCat(y, lab, ix, K(cats[attr])); }
  const x = perm ? Float64Array.from(nums[attr], (_, i) => nums[attr][perm[i]]) : nums[attr]; return r2Num(y, x, ix);
};
const shuffled = (rnd, m) => { const a = Int32Array.from({ length: m }, (_, i) => i); for (let i = m - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const indicator = (si) => { const y = new Float64Array(n), ix = []; for (let i = 0; i < n; i++) { const st = P[i].cells[si][4]; if (!DEF.has(st)) continue; ix.push(i); y[i] = st === "P+" || st === "P-" ? 1 : 0; } return { y, ix }; };
const signSplit = (si) => { const y = new Float64Array(n), ix = []; for (let i = 0; i < n; i++) { const st = P[i].cells[si][4]; if (st === "P+" || st === "P-") { ix.push(i); y[i] = st === "P+" ? 1 : 0; } } return { y, ix }; };
const out = { n, statistics: S.length, definedCellsAllStats: 0 };
for (let si = 0; si < S.length; si++) for (let i = 0; i < n; i++) if (DEF.has(P[i].cells[si][4])) out.definedCellsAllStats++;

// ---- C0: reproduce the atlas shared-property rows for depLen (eta^2 values)
const I = indicator(DEP), SG = signSplit(DEP);
out.reproduce = { presence: Object.fromEntries(ATTRS.map((a) => [a, effect(I.y, a, I.ix)])), signSplit: Object.fromEntries(ATTRS.map((a) => [a, effect(SG.y, a, SG.ix)])), nDefined: I.ix.length, nPresent: I.ix.filter((i) => I.y[i]).length, nSign: SG.ix.length };
console.log("reproduce presence eta2:", JSON.stringify(out.reproduce.presence), " signSplit:", JSON.stringify(out.reproduce.signSplit));

// ---- C1: counts and the planted-iid false-PRESENT reference (from results/law-table.json)
const LT = JSON.parse(fs.readFileSync(path.join(HERE, "../law-table.json"), "utf8")), fp = LT.falsePresent;
const binom = (k, nn, p) => { let lg = 0; for (let i = 1; i <= k; i++) lg += Math.log((nn - k + i) / i); return Math.exp(lg + k * Math.log(p) + (nn - k) * Math.log1p(-p)); };
const cp95 = (k, nn) => { // upper Clopper-Pearson 95% (one-sided) for k/nn by bisection
  let lo = k / nn, hi = 1; for (let it = 0; it < 80; it++) { const mid = (lo + hi) / 2; let c = 0; for (let j = 0; j <= k; j++) c += binom(j, nn, mid); if (c > 0.05) lo = mid; else hi = mid; } return (lo + hi) / 2; };
const rate4Up = cp95(fp.plantedIid.absZge4, fp.plantedIid.halfCells);
const t9tail = (() => { // P(|T9| >= 4) by numerical integration of the t density, df = 9
  const df = 9, c = Math.exp(0.5 * Math.log(1 / (df * Math.PI)) + (lgam((df + 1) / 2) - lgam(df / 2))); let s = 0; const h = 0.0005;
  for (let x = 4; x < 400; x += h) s += c * Math.pow(1 + (x * x) / df, -(df + 1) / 2) * h; return 2 * s;
  function lgam(z) { const g = 7, co = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; z -= 1; let x = co[0]; for (let i = 1; i < g + 2; i++) x += co[i] / (z + i); const t = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x); }
})();
const pP = fp.binomialReference.p, pT = (t9tail * t9tail) / 2, pUp = (rate4Up * rate4Up) / 2, nDep = I.ix.length;
out.counts = { statistics: S.length, realPockets: n, definedCells: out.definedCellsAllStats, depLenDefinedCells: nDep, depLenPresentCells: out.reproduce.nPresent,
  pPresentFromIid: pP, pPresentFromT9: pT, rate4UpperCP95: rate4Up, pPresentUpper: pUp,
  expectedFalsePresentAllCells: { iidRate: out.definedCellsAllStats * pP, t9Theory: out.definedCellsAllStats * pT, upper95: out.definedCellsAllStats * pUp },
  expectedFalsePresentDepLen: { iidRate: nDep * pP, t9Theory: nDep * pT, upper95: nDep * pUp },
  observedPresentAllCells: fp.observedPresentRealCells, tailProbObserved140OrMoreDepLen_upper95: (() => { let t = 0; for (let k = 140; k <= nDep; k++) t += binom(k, nDep, pUp); return t; })() };
console.log("counts", JSON.stringify(out.counts));
fs.writeFileSync(path.join(HERE, "attackC.json"), JSON.stringify(out, null, 1));
export { P, n, S, DEP, ATTRS, cats, nums, effect, shuffled, indicator, signSplit, DEF, out, etaCat, K, rngOf, seedOf, HERE, fs, path };
