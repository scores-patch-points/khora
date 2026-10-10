// confirm-R1_first_slot_share/cells.mjs — cell evaluation (controls, strict fallback, CIs, bars) and natural-prevalence tally. New file.
import { pAuc, bootPairs, bootDays, thrRule, round, lb, streamIndex, ishare, THETA } from "./lib.mjs";
export const CTL = ["i", "len", "cl", "lc"], BAND = [0.45, 0.55];
export const nullQ95 = (n) => round(0.5 + (1.645 * 0.5) / Math.sqrt(Math.max(1, n)));
const strictOf = (ps) => ps.filter((p) => p.pos.len === p.neg.len && p.pos.cl === p.neg.cl && p.pos.i === p.neg.i && Math.abs(p.pos.lc - p.neg.lc) <= 0.15);
const COL = "ishare";
const beyond = (ps, rival) => { const f = (x) => Math.floor(Math.log2(1 + x)), keep = ps.filter((p) => f(p.pos[rival]) === f(p.neg[rival])); return { kept: keep.length, share: round(keep.length / Math.max(1, ps.length)), auc: keep.length >= 20 ? round(pAuc(keep, COL)) : null }; };
function stats(ps, seed) {
  const o = { n: ps.length, clusters: new Set(ps.map((p) => p.day)).size, ctl: {} };
  if (!ps.length) return { ...o, ctlOk: false };
  for (const c of CTL) o.ctl[c] = round(pAuc(ps, c)); o.ctl.mday = round(pAuc(ps, "mday")); o.ctl.b = round(pAuc(ps, "b"));
  o.ctlOk = CTL.every((c) => o.ctl[c] >= BAND[0] && o.ctl[c] <= BAND[1]);
  o.auc = round(pAuc(ps, COL)); o.nullQ95 = nullQ95(o.n);
  if (o.n >= 40) { o.ci = bootPairs(ps, COL, 1, 300, seed + "p"); if (o.clusters >= 4) o.clusterCi = bootDays(ps, COL, 1, 300, seed + "c"); }
  o.thr = thrRule(ps, COL, THETA); o.beyond = { CNT_C128: beyond(ps, "cnt128") };
  return o;
}
/** One cell. Full pairs; if any control is outside [0.45,0.55] the STRICT subset (equal raw i, message length, character length, |d log2 count| <= 0.15; n >= 40) replaces it; else VOID.
 *  bars: {minN, auc, lower, clusterMin} — lower is checked against the pair CI and, when the cell has >= clusterMin clusters, against the cluster CI as well (the smaller one gates). */
export function evalCell(ps, bars, seed = "cell") {
  const full = stats(ps, seed); let used = full, variant = "full";
  if (!full.ctlOk) { const s = stats(strictOf(ps), seed + "s"); if (s.ctlOk && s.n >= 40) { used = s; variant = "strict"; } else { used = null; variant = full.n < 40 ? "TOO_FEW" : "VOID"; } }
  if (!used) return { variant, full, holdsCore: false, reason: variant === "TOO_FEW" ? "fewer than 40 pairs" : "controls out of band; strict subset too small or out of band" };
  const minN = variant === "strict" ? 40 : bars.minN;
  let lower = used.ci?.[0] ?? null; if (used.clusterCi && used.clusters >= (bars.clusterMin ?? 1e9)) lower = Math.min(lower, used.clusterCi[0]);
  const why = used.n < minN ? "n below minimum" : used.auc < bars.auc ? "AUC below bar" : lower == null || lower < Math.max(bars.lower, used.nullQ95) ? "lower bound below bar" : "";
  return { variant, full, used, lower, holdsCore: !why, reason: why };
}
/** Natural prevalence (UNMATCHED; the positional confound is part of how the rule works): every LATER token >= 3 chars (IRC gold). */
export function natural(docs, classOf, theta = THETA) {
  const T = { ALL: {}, INIT: {}, NONINIT: {} }, base = { tp: 0, fp: 0, fn: 0, tn: 0 };
  const add = (g, y, f) => { g[y ? (f ? "tp" : "fn") : f ? "fp" : "tn"] = (g[y ? (f ? "tp" : "fn") : f ? "fp" : "tn"] ?? 0) + 1; };
  for (const d of docs) { const ix = streamIndex(d.T), seen = new Map();
    d.T.forEach((m, k) => m.forEach((w, i) => { const kk = seen.get(w) ?? 0; seen.set(w, kk + 1); if (kk === 0) return; const c = classOf(d, k, i, w); if (!c) return; const y = c === "P", f = ishare(ix, w, k) >= theta; add(T.ALL, y, f); add(i === 0 ? T.INIT : T.NONINIT, y, f); add(base, y, i === 0); })); }
  const prf = (o) => { const tp = o.tp ?? 0, fp = o.fp ?? 0, fn = o.fn ?? 0, tn = o.tn ?? 0; return { tp, fp, fn, tn, precision: round(tp / Math.max(1, tp + fp)), recall: round(tp / Math.max(1, tp + fn)), fpr: round(fp / Math.max(1, fp + tn)), prevalence: round((tp + fn) / Math.max(1, tp + fn + fp + tn)) }; };
  return { ALL: prf(T.ALL), INIT: prf(T.INIT), NONINIT: prf(T.NONINIT), flagEveryInitialBaseline: prf(base) };
}
export const addNat = (A, B) => { for (const k of Object.keys(B)) { A[k] ??= {}; for (const f of ["tp", "fp", "fn", "tn"]) A[k][f] = (A[k][f] ?? 0) + B[k][f]; } return A; };
