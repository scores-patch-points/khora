// provisional/polarity-map/lib2.mjs — E-series features: company diversity EXCESS over a position-preserving null, asymmetry, slot composition. New file.
import { docOf, formCap, pairsOf, pairAuc, pooledAuc, round, mean, rngFor, seedFor } from "./lib.mjs";
const ib = (i) => (i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3);
const D = (arr) => { const m = new Map(); for (const x of arr) m.set(x, (m.get(x) ?? 0) + 1); const n = arr.length; let c = 0; for (const v of m.values()) c += v * (v - 1); return n > 1 ? 1 - c / (n * (n - 1)) : null; };
export const FEATS2 = ["DLf", "DRf", "Af", "DLx", "DRx", "Ax", "DLbx", "DRbx", "pEdgeL", "pTopL", "pRareL", "pEdgeR", "pTopR", "pRareR"];
const other = (len, b, rnd) => { let p = Math.floor(rnd() * (len - 1)); if (p >= b) p += 1; return p; }; // a position uniformly among the unit's OTHER positions
/** E-series features of the FORM at (s,i). mode FULL: all its occurrences; CAUSAL4: the 4 before. NULL = position-preserving shuffle: each occurrence keeps its index b in its unit
 *  (edge stays edge), but its neighbour is a uniformly random OTHER token of the same unit; the excess is D_obs minus the mean of B0 null draws. Slot types of a neighbour: edge (bin 12),
 *  top (rank bin <= 1: the 3 commonest forms), rare (bin >= 7), mid otherwise; pXY = share of the occurrences whose neighbour is of that type. */
export function features2(P, s, i, mode, rnd, B0 = 8) {
  const w = P.stream[s][i], o = P.occ.get(w), k = P.kArr[s][i], js = [];
  if (mode === "FULL") for (let j = 0; j < o.length / 2; j++) js.push(j); else for (let j = k - 4; j < k; j++) js.push(j);
  const lf = [], rf = [], lb = [], rb = [], NL = Array.from({ length: B0 }, () => []), NR = Array.from({ length: B0 }, () => []), NLb = Array.from({ length: B0 }, () => []), NRb = Array.from({ length: B0 }, () => []);
  for (const j of js) {
    const a = o[2 * j], b = o[2 * j + 1], u = P.stream[a], len = u.length, hasL = b > 0, hasR = b + 1 < len;
    const l = hasL ? u[b - 1] : "^", r = hasR ? u[b + 1] : "$"; lf.push(l); rf.push(r); lb.push(hasL ? P.bins.get(l) ?? 11 : 12); rb.push(hasR ? P.bins.get(r) ?? 11 : 12);
    for (let t = 0; t < B0; t++) {
      const x = hasL ? u[other(len, b, rnd)] : "^", y = hasR ? u[other(len, b, rnd)] : "$";
      NL[t].push(x); NR[t].push(y); NLb[t].push(hasL ? P.bins.get(x) ?? 11 : 12); NRb[t].push(hasR ? P.bins.get(y) ?? 11 : 12);
    }
  }
  const nm = (A) => mean(A.map(D)), dl = D(lf), dr = D(rf), dlb = D(lb), drb = D(rb);
  const share = (A, f) => A.filter(f).length / A.length, top = (x) => x <= 1, rare = (x) => x >= 7 && x < 12, edge = (x) => x === 12;
  return { DLf: dl, DRf: dr, Af: dr - dl, DLx: dl - nm(NL), DRx: dr - nm(NR), Ax: (dr - nm(NR)) - (dl - nm(NL)), DLbx: dlb - nm(NLb), DRbx: drb - nm(NRb),
    pEdgeL: share(lb, edge), pTopL: share(lb, top), pRareL: share(lb, rare), pEdgeR: share(rb, edge), pTopR: share(rb, top), pRareR: share(rb, rare) };
}
export function evalCell2(rows, mode, rnd, B = 300) {
  const n = rows.length / 2; if (!n) return { pairs: 0 };
  const F = rows.map((r) => features2(r.P, r.s, r.i, mode, rnd));
  const pos = rows.filter((_, k) => k % 2 === 0), neg = rows.filter((_, k) => k % 2 === 1), cl = pos.map((r) => `${r.doc}|${r.w}`), y = rows.map((r) => r.y);
  const cell = { pairs: n, feats: {}, ctrl: {} };
  for (const f of FEATS2) { const x = F.map((o) => o[f]), vp = x.filter((_, k) => k % 2 === 0), vn = x.filter((_, k) => k % 2 === 1); cell.feats[f] = { ...pairAuc(vp, vn, cl, B, rnd), pooled: round(pooledAuc(x, y)), mean: round(mean(vp)), meanNeg: round(mean(vn)) }; }
  const ctl = { pos: (r) => ib(r.i), logn: (r) => Math.log2(r.P.occ.get(r.w).length / 2) };
  for (const [nm, g] of Object.entries(ctl)) cell.ctrl[nm] = round(pairAuc(pos.map(g), neg.map(g), cl, 0, rnd).auc);
  cell.posControlOk = cell.ctrl.pos >= 0.45 && cell.ctrl.pos <= 0.55; cell.freqControlOk = cell.ctrl.logn >= 0.45 && cell.ctrl.logn <= 0.55;
  return cell;
}
/** same pairs as lib.runCells (same seeds), E-series features */
export function runCells2(bases, def, mode, seedTag, { B = 300, maxPairs = 600, get = (b) => ({ P: b.P, gold: b.gold }) } = {}) {
  const rows = [], per = Math.ceil(maxPairs / bases.length);
  for (const b of bases) {
    const { P, gold } = get(b), r = rngFor(seedFor("polarity-map", seedTag, b.name, mode)), pr = pairsOf(docOf(b, def, mode, P, gold), "LATER", r, Math.max(3000, per * 5));
    for (const x of formCap(pr.rows, 3, per)) { x.P = P; rows.push(x); }
  }
  return evalCell2(rows, mode, rngFor(seedFor("polarity-map", "E", seedTag, bases[0].name, mode)), B);
}
