// provisional/polarity-map/lib3.mjs — U-series (unit-initial / unit-final EXCESS) features and a generic cell runner (features supplied by the caller). New file.
import { docOf, formCap, pairsOf, pairAuc, pooledAuc, round, mean, rngFor, seedFor } from "./lib.mjs";
import { features2, FEATS2 } from "./lib2.mjs";
const ib = (i) => (i === 0 ? 0 : i === 1 ? 1 : i <= 3 ? 2 : 3);
export const FEATSU = ["pInit", "pInitX", "pFinal", "pFinalX", "invLen"];
/** mentions of the form: FULL = all (the current one included); CAUSAL4 = the 4 before. pInit = share at unit index 0; pInitX = pInit - mean(1/len) (the share expected if the index were uniform in the unit;
 *  a form whose mentions sit in short units starts them more often by chance); pFinal/pFinalX likewise for the last index (units of length >= 2 only count toward the final share). */
export function featuresU(P, s, i, mode) {
  const w = P.stream[s][i], o = P.occ.get(w), k = P.kArr[s][i], js = [];
  if (mode === "FULL") for (let j = 0; j < o.length / 2; j++) js.push(j); else for (let j = k - 4; j < k; j++) js.push(j);
  let init = 0, fin = 0, inv = 0;
  for (const j of js) { const a = o[2 * j], b = o[2 * j + 1], len = P.stream[a].length; if (b === 0) init++; if (b === len - 1) fin++; inv += 1 / len; }
  const n = js.length;
  return { pInit: init / n, pInitX: (init - inv) / n, pFinal: fin / n, pFinalX: (fin - inv) / n, invLen: inv / n };
}
export const allFeatures = (P, s, i, mode, rnd) => ({ ...features2(P, s, i, mode, rnd), ...featuresU(P, s, i, mode) });
export const FEATS_ALL = [...FEATS2, ...FEATSU];
export function evalGeneric(rows, mode, rnd, B, featFn, names) {
  const n = rows.length / 2; if (!n) return { pairs: 0 };
  const F = rows.map((r) => featFn(r.P, r.s, r.i, mode, rnd));
  const pos = rows.filter((_, k) => k % 2 === 0), neg = rows.filter((_, k) => k % 2 === 1), cl = pos.map((r) => `${r.doc}|${r.w}`), y = rows.map((r) => r.y);
  const cell = { pairs: n, nPosForms: new Set(cl).size, feats: {}, ctrl: {} };
  for (const f of names) { const x = F.map((o) => o[f]), vp = x.filter((_, k) => k % 2 === 0), vn = x.filter((_, k) => k % 2 === 1); cell.feats[f] = { ...pairAuc(vp, vn, cl, B, rnd), pooled: round(pooledAuc(x, y)), mean: round(mean(vp)), meanNeg: round(mean(vn)) }; }
  const ctl = { pos: (r) => ib(r.i), logn: (r) => Math.log2(r.P.occ.get(r.w).length / 2) };
  for (const [nm, g] of Object.entries(ctl)) cell.ctrl[nm] = round(pairAuc(pos.map(g), neg.map(g), cl, 0, rnd).auc);
  cell.posControlOk = cell.ctrl.pos >= 0.45 && cell.ctrl.pos <= 0.55; cell.freqControlOk = cell.ctrl.logn >= 0.45 && cell.ctrl.logn <= 0.55;
  return cell;
}
/** same pairs as lib.runCells for the same (bases, def, mode, seedTag); seedPrefix lets the confirmation draw its own pairs */
export function runCellsG(bases, def, mode, seedTag, featFn, names, { B = 300, maxPairs = 600, get = (b) => ({ P: b.P, gold: b.gold }), seedPrefix = "polarity-map" } = {}) {
  const rows = [], per = Math.ceil(maxPairs / bases.length), meta = { dropped: 0, pairsBeforeCap: 0 };
  for (const b of bases) {
    const { P, gold } = get(b), r = rngFor(seedFor(seedPrefix, seedTag, b.name, mode)), pr = pairsOf(docOf(b, def, mode, P, gold), "LATER", r, Math.max(3000, per * 5));
    meta.dropped += pr.dropped; meta.pairsBeforeCap += pr.pairs;
    for (const x of formCap(pr.rows, 3, per)) { x.P = P; rows.push(x); }
  }
  return { ...evalGeneric(rows, mode, rngFor(seedFor(seedPrefix, "G", seedTag, bases[0].name, mode)), B, featFn, names), ...meta };
}
