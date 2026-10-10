// attack-PM-R2-left-company-polarity/attack-lib2.mjs -- form-level profile of the rule's statistic DLx and of its cheap rivals; strict matchers; evaluation. NEW FILE.
import { divOf, mean, round, rngFor, seedFor, shuffleIn, docOf, ib, cb, lb, fb, wr, pairAuc, quantile } from "./attack-lib.mjs";
const cache = new WeakMap();
export const r9 = (x) => (x == null || Number.isNaN(x) ? x : Math.round(x * 1e9) / 1e9 + 0); // tie tolerance: |x| < 5e-10 is exactly 0 (all-edge forms give DLx = +-1e-17 float noise otherwise; see attack-A header amendment)
/** Form-level profile of word form w in stream P. Uses ALL its mentions (FULL), like the rule. Own implementation of DLx (B0 null draws), plus
 *  Dobs (raw left diversity), Dnull (company-free: position + unit composition only), es (share of mentions that are unit-initial), fs (share of mentions whose null is
 *  non-degenerate: unit index >= 1 and unit length >= 3), DLxF (excess over those free mentions only; needs >= 3 of them). Deterministic: rnd seeded by the form. */
export function profile(P, w, B0 = 24) {
  let m = cache.get(P); if (!m) cache.set(P, (m = new Map())); let r = m.get(w); if (r) return r;
  const o = P.occ.get(w), n = o.length / 2, rnd = rngFor(seedFor("pm-r2-attack", "profile", w, String(n)));
  const obs = [], nul = Array.from({ length: B0 }, () => []), obsF = [], nulF = Array.from({ length: B0 }, () => []);
  let edge = 0, free = 0, sumLen = 0, sumI = 0, lastPos = 0, bins = 0, umin = Infinity, umax = -Infinity;
  for (let j = 0; j < o.length; j += 2) {
    const u = P.stream[o[j]], b = o[j + 1], len = u.length; sumLen += len; sumI += b; if (b === len - 1) lastPos++; if (o[j] < umin) umin = o[j]; if (o[j] > umax) umax = o[j];
    if (b === 0) { edge++; obs.push("^"); for (const a of nul) a.push("^"); continue; }
    obs.push(u[b - 1]); const isFree = len >= 3; if (isFree) { free++; obsF.push(u[b - 1]); }
    for (let t = 0; t < B0; t++) { let q = Math.floor(rnd() * (len - 1)); if (q >= b) q += 1; nul[t].push(u[q]); if (isFree) nulF[t].push(u[q]); }
  }
  const Dobs = divOf(obs), Dnull = mean(nul.map(divOf)), DF = obsF.length >= 3 ? divOf(obsF) - mean(nulF.map(divOf)) : null;
  r = { n, es: edge / n, fs: free / n, ml: sumLen / n, mi: sumI / n, ls: lastPos / n, Dobs: r9(Dobs), Dnull: r9(Dnull), DLx: r9(Dobs - Dnull), DLxF: r9(DF), nFree: free, ch: [...w].length, sp: (umax - umin) / P.stream.length };
  m.set(w, r); return r;
}
/** matched pair candidates: LATER mentions (k>0) of FULL-eligible forms (>= 3 mentions), class by gold at the mention (exactly the confirmer's eligibility) */
export function candidates(base, def) {
  const P = base.P, dc = docOf(base, def, "FULL", P, base.gold), seen = new Map(), Pl = [], Nl = [];
  P.stream.forEach((sent, s) => sent.forEach((w, i) => {
    const k = seen.get(w) ?? 0; seen.set(w, k + 1); if (k === 0) return; const c = dc.cls(s, i); if (!c) return;
    const o = { s, i, w, n: P.count.get(w), key: [ib(i), cb(w), lb(sent.length)].join("|"), doc: base.name, P }; (c === "P" ? Pl : Nl).push(o);
  }));
  return { Pl, Nl };
}
/** strict matcher. opts: cn (max |n-n'|, absolute), cnRel (max relative |n-n'|/n, used when cn is null), ces/cfs (max |es-es'| / |fs-fs'|, null = off), fbExact (also same floor-log2 count bin), needFreeMin (both forms need >= this many free mentions).
 *  Always exact on [unit-index bucket of the sampled mention, char-length bucket, unit-length bucket] like pairsOf. Negatives are used once (nearest in normalised distance). Rows [P,N,P,N...]. */
export function strictPairs(cands, rnd, opts, maxPairs = 600) {
  const { Pl, Nl } = cands, pool = new Map(); let dropped = 0;
  const okForm = (w, P) => { const f = profile(P, w); return (!opts.needFreeMin || f.nFree >= opts.needFreeMin) && (opts.esMax == null || f.es <= opts.esMax) && (opts.esMin == null || f.es >= opts.esMin); };
  for (const o of Nl) { if (!okForm(o.w, o.P)) continue; (pool.get(o.key) ?? pool.set(o.key, []).get(o.key)).push(o); }
  for (const a of pool.values()) shuffleIn(a, rnd);
  const rows = [];
  for (const p of shuffleIn(Pl.filter((o) => okForm(o.w, o.P)), rnd)) {
    if (rows.length >= maxPairs * 2) break; const a = pool.get(p.key); if (!a) { dropped++; continue; }
    const pp = profile(p.P, p.w); let best = -1, bd = Infinity;
    for (let j = 0; j < a.length; j++) {
      const q = a[j], qp = profile(q.P, q.w), dn = Math.abs(q.n - p.n);
      if (opts.cn != null && dn > opts.cn) continue; if (opts.cn == null && opts.cnRel != null && dn > opts.cnRel * p.n) continue;
      if (opts.fbExact && fb(q.n) !== fb(p.n)) continue;
      if (opts.cch != null && Math.abs(qp.ch - pp.ch) > opts.cch) continue; if (opts.cml != null && Math.abs(qp.ml - pp.ml) > opts.cml * pp.ml) continue; if (opts.csp != null && Math.abs(qp.sp - pp.sp) > opts.csp) continue;
      const de = Math.abs(qp.es - pp.es), df = Math.abs(qp.fs - pp.fs);
      if (opts.ces != null && de > opts.ces) continue; if (opts.cfs != null && df > opts.cfs) continue;
      const d = dn / Math.max(1, p.n) + de + df + (opts.cch != null ? Math.abs(qp.ch - pp.ch) / 10 : 0) + (opts.cml != null ? Math.abs(qp.ml - pp.ml) / Math.max(1, pp.ml) : 0) + (opts.csp != null ? Math.abs(qp.sp - pp.sp) : 0); if (d < bd) { bd = d; best = j; if (d === 0) break; }
    }
    if (best < 0) { dropped++; continue; }
    const q = a.splice(best, 1)[0]; rows.push({ ...p, y: 1 }, { ...q, y: 0 });
  }
  return { rows, dropped };
}
export function capPerForm(rows, cap = 3) { // <= cap pairs per positive form and per negative form (as formCap)
  const cp = new Map(), cn = new Map(), out = [];
  for (let k = 0; k < rows.length / 2; k++) { const p = rows[2 * k], q = rows[2 * k + 1], a = cp.get(p.w) ?? 0, b = cn.get(q.w) ?? 0; if (a >= cap || b >= cap) continue; cp.set(p.w, a + 1); cn.set(q.w, b + 1); out.push(p, q); }
  return out;
}
export const HALF = (x) => [x.filter((_, k) => k % 2 === 0), x.filter((_, k) => k % 2 === 1)];
/** matched-pair AUC of a per-row value (rows [P,N,...]); pairs with a null value are dropped; cluster bootstrap CI over positive forms */
export function aucOfRows(rows, valueOf, B, rnd) {
  const vp = [], vn = [], cl = [];
  for (let k = 0; k < rows.length / 2; k++) { const a = valueOf(rows[2 * k]), b = valueOf(rows[2 * k + 1]); if (a == null || b == null || Number.isNaN(a) || Number.isNaN(b)) continue; vp.push(a); vn.push(b); cl.push(`${rows[2 * k].doc}|${rows[2 * k].w}`); }
  if (!vp.length) return { auc: null, n: 0 };
  const r = pairAuc(vp, vn, cl, B, rnd); return { auc: r.auc, lo: r.lo, hi: r.hi, n: vp.length, nClusters: r.nClusters, meanP: round(mean(vp)), meanN: round(mean(vn)) };
}
export const VAL = { DLx: (r) => profile(r.P, r.w).DLx, DLxF: (r) => profile(r.P, r.w).DLxF, Dobs: (r) => profile(r.P, r.w).Dobs, nDnull: (r) => -profile(r.P, r.w).Dnull,
  logn: (r) => Math.log2(profile(r.P, r.w).n), es: (r) => profile(r.P, r.w).es, fs: (r) => profile(r.P, r.w).fs, nfs: (r) => -profile(r.P, r.w).fs, ml: (r) => profile(r.P, r.w).ml, mi: (r) => profile(r.P, r.w).mi,
  ch: (r) => profile(r.P, r.w).ch, ls: (r) => profile(r.P, r.w).ls, sp: (r) => profile(r.P, r.w).sp, pos: (r) => ib(r.i), slen: (r) => r.P.stream[r.s].length, bin: (r) => r.P.bins.get(r.w) ?? 11 };

/** SHAM-COMPANY profile: the same form and mentions, but the "observed" left neighbours are replaced by an independent position-preserving null draw (company destroyed, positions, units, counts kept). Returns DLx of that draw. */
export function shamDLx(P, w, rnd, B0 = 24) {
  const o = P.occ.get(w), draws = Array.from({ length: B0 + 1 }, () => []);
  for (let j = 0; j < o.length; j += 2) { const u = P.stream[o[j]], b = o[j + 1], len = u.length; for (const a of draws) { if (b === 0) a.push("^"); else { let q = Math.floor(rnd() * (len - 1)); if (q >= b) q += 1; a.push(u[q]); } } }
  const D = draws.map(divOf); return r9(D[0] - mean(D.slice(1)));
}
