// stats.mjs — AUC, cluster bootstrap, within-pair permutation null, stratified AUC (NEW FILE; no dependency on a classifier).
import { rngFor } from "../../impact.mjs";

export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const quantile = (xs, q) => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))] : null; };
export const median = (xs) => quantile(xs, 0.5);
export const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);

/** Mann-Whitney AUC of positives vs negatives, ties count half. */
export function aucPN(pos, neg) {
  if (!pos.length || !neg.length) return null;
  const all = [...pos.map((v) => [v, 1]), ...neg.map((v) => [v, 0])].sort((a, b) => a[0] - b[0]);
  let rank = 0, sum = 0;
  for (let i = 0; i < all.length;) { let j = i; while (j < all.length && all[j][0] === all[i][0]) j++; const avg = (i + 1 + j) / 2; for (let k = i; k < j; k++) if (all[k][1]) sum += avg; i = j; }
  return (sum - (pos.length * (pos.length + 1)) / 2) / (pos.length * neg.length);
}
/** A pair = {p: {score...}, n: {score...}, block}. AUC of a named score over a list of pairs. */
export const aucPairs = (pairs, f) => aucPN(pairs.map((x) => f(x.p)), pairs.map((x) => f(x.n)));

/** Weighted mean of per-stratum AUCs: pairsBy = { stratum: pairs[] }. */
export function stratAuc(pairsBy, f) {
  let w = 0, a = 0;
  for (const ps of Object.values(pairsBy)) { if (ps.length < 2) continue; const x = aucPairs(ps, f); if (x == null) continue; a += x * ps.length; w += ps.length; }
  return w ? a / w : null;
}
function resampleBlocks(pairsBy, rnd) {
  const blocks = new Set(); for (const ps of Object.values(pairsBy)) for (const x of ps) blocks.add(x.block);
  const ids = [...blocks], draw = ids.map(() => ids[Math.floor(rnd() * ids.length)]);
  const cnt = new Map(); for (const b of draw) cnt.set(b, (cnt.get(b) ?? 0) + 1);
  const out = {};
  for (const [st, ps] of Object.entries(pairsBy)) { out[st] = []; for (const x of ps) { const k = cnt.get(x.block) ?? 0; for (let r = 0; r < k; r++) out[st].push(x); } }
  return out;
}
/** Cluster bootstrap of a stratified AUC (and of a difference between two scores). Returns {point, lo, hi}. lo/hi use quantiles qLo/qHi (default 2.5/97.5). */
export function bootStrat(pairsBy, f, { B = 1000, seed = 1, g = null, qLo = 0.025, qHi = 0.975 } = {}) {
  const rnd = rngFor(seed), pt = stratAuc(pairsBy, f), pt2 = g ? stratAuc(pairsBy, g) : null, xs = [];
  for (let b = 0; b < B; b++) { const rs = resampleBlocks(pairsBy, rnd), a = stratAuc(rs, f); if (a == null) continue; if (g) { const c = stratAuc(rs, g); if (c != null) xs.push(a - c); } else xs.push(a); }
  const point = g ? (pt == null || pt2 == null ? null : pt - pt2) : pt;
  return { point: round(point), lo: round(quantile(xs, qLo)), hi: round(quantile(xs, qHi)) };
}
/** Within-pair label-swap permutation null of the stratified AUC. Returns {q95, mean, p} where p = P(null >= observed). */
export function permStrat(pairsBy, f, { B = 1000, seed = 1 } = {}) {
  const rnd = rngFor(seed), obs = stratAuc(pairsBy, f), xs = [];
  const sw = (x) => ({ p: x.n, n: x.p, block: x.block });
  for (let b = 0; b < B; b++) {
    const ps = {}; for (const [st, arr] of Object.entries(pairsBy)) ps[st] = arr.map((x) => (rnd() < 0.5 ? sw(x) : x));
    const a = stratAuc(ps, f); if (a != null) xs.push(a);
  }
  return { q95: round(quantile(xs, 0.95)), mean: round(mean(xs)), p: round(xs.filter((v) => v >= obs - 1e-12).length / Math.max(1, xs.length), 4) };
}
