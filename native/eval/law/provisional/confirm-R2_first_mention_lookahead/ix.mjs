// ix.mjs — day index, the R2 score (and its rivals / sham slots), and the exact-cell matched-pair builder for the FIRST stratum.
import { shuffleIn, rngOf } from "./lib.mjs";
export const lb = (a, x) => { if (!a) return 0; let lo = 0, hi = a.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
export const ub = (a, x) => { if (!a) return 0; let lo = 0, hi = a.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] <= x) lo = mid + 1; else hi = mid; } return lo; };
const push = (mp, w, v) => (mp.get(w) ?? mp.set(w, []).get(w)).push(v);
/** count = whole-day TOKEN count of a form (matching / controls only); msgIdx = sorted message indices containing the form; initIdx / secIdx / lastIdx = messages whose first / second / last word is the form. bins = rank bin of the whole-day count (12 log2 bins). */
export function buildIx(T) {
  const count = new Map(), msgIdx = new Map(), initIdx = new Map(), secIdx = new Map(), lastIdx = new Map();
  T.forEach((m, k) => { const seen = new Set(); for (const w of m) { count.set(w, (count.get(w) ?? 0) + 1); if (!seen.has(w)) { seen.add(w); push(msgIdx, w, k); } } push(initIdx, m[0], k); if (m.length > 1) push(secIdx, m[1], k); push(lastIdx, m[m.length - 1], k); });
  const order = [...count].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)), bins = new Map(); order.forEach(([w], r) => bins.set(w, Math.min(11, Math.floor(Math.log2(r + 1)))));
  return { T, count, bins, msgIdx, initIdx, secIdx, lastIdx };
}
const others = (a, m) => (a ? a.length - (a[lb(a, m)] === m ? 1 : 0) : 0);
const near = (a, m, W) => (a ? ub(a, m + W) - lb(a, m - W) - (a[lb(a, m)] === m ? 1 : 0) : 0);
/** THE RULE: INIT_Tinf = number of OTHER messages of the day whose first word is w.  Rivals: CNT_Tinf (other messages containing w), CNT_T128 / INIT_T128 (same inside +-128 messages).
 *  Sham slots: SEC_Tinf (second word), LAST_Tinf (last word).  FNEXT = -(rank bin of the following token; 12 at message end): the prefix-only frame score of the rule's outOfScope clause. */
export function scoresAt(ix, m, i, w) {
  const cur = ix.T[m];
  return { INIT_Tinf: others(ix.initIdx.get(w), m), CNT_Tinf: others(ix.msgIdx.get(w), m), CNT_T128: near(ix.msgIdx.get(w), m, 128), INIT_T128: near(ix.initIdx.get(w), m, 128),
    SEC_Tinf: others(ix.secIdx.get(w), m), LAST_Tinf: others(ix.lastIdx.get(w), m), FNEXT: -(i + 1 < cur.length ? ix.bins.get(cur[i + 1]) : 12) };
}
export const ibk = (i) => (i <= 3 ? i : i <= 5 ? 4 : i <= 9 ? 5 : 6);
export const clb = (w) => Math.min(11, [...w].length);
export const mlb = (n) => (n <= 7 ? n : n <= 9 ? 8 : n <= 11 ? 9 : n <= 14 ? 10 : n <= 19 ? 11 : n <= 27 ? 12 : n <= 40 ? 13 : 14);
/** FIRST-stratum matched pairs. Positive = first occurrence of a form (in stream order) labelled "P"; negative = first occurrence of a form labelled "N". Exact cell on
 *  (within-message index bucket, floor(Q * log2 whole-day count), character length bucket, message-length bucket); Q = 4 (quarter octave) or 8 (eighth). Without replacement;
 *  an unmatched positive is dropped and counted. max = positives tried per day (random order). */
export function firstPairs(doc, max, Q, tag) {
  const ix = doc.ix ?? (doc.ix = buildIx(doc.T)), rnd = rngOf("R2confirm-pairs", doc.key, tag, Q), seen = new Set(), P = [], N = [];
  doc.T.forEach((m, k) => m.forEach((w, i) => {
    if (seen.has(w)) return; seen.add(w); const c = doc.label(k, i, w); if (!c) return;
    (c === "P" ? P : N).push({ m: k, i, w, len: m.length, key: [ibk(i), Math.floor(Q * Math.log2(ix.count.get(w))), clb(w), mlb(m.length)].join("|") });
  }));
  const pool = new Map(); for (const o of N) (pool.get(o.key) ?? pool.set(o.key, []).get(o.key)).push(o); for (const a of pool.values()) shuffleIn(a, rnd);
  const rec = (o) => ({ w: o.w, m: o.m, i: o.i, len: o.len, cl: [...o.w].length, lc: Math.log2(ix.count.get(o.w)), ...scoresAt(ix, o.m, o.i, o.w) });
  const pairs = []; let dropped = 0;
  for (const p of shuffleIn(P, rnd)) { if (pairs.length >= max) break; const a = pool.get(p.key); if (!a?.length) { dropped++; continue; } pairs.push({ pos: rec(p), neg: rec(a.pop()) }); }
  return { pairs, dropped, nPos: P.length, nNeg: N.length };
}
/** Unmatched natural tally for the FIRST stratum: one row per labelled first occurrence {y, init (message-initial), s: INIT_Tinf, c: CNT_Tinf, i}. */
export function firstRows(doc) {
  const ix = doc.ix ?? (doc.ix = buildIx(doc.T)), seen = new Set(), rows = [];
  doc.T.forEach((m, k) => m.forEach((w, i) => { if (seen.has(w)) return; seen.add(w); const c = doc.label(k, i, w); if (!c) return; const s = scoresAt(ix, k, i, w); rows.push({ y: c === "P" ? 1 : 0, init: i === 0, s: s.INIT_Tinf, c: s.CNT_Tinf, c128: s.CNT_T128 }); }));
  return rows;
}
