// index.mjs — per-day stream index and the fixed candidate scores. Text only: the observables are word forms, message boundaries, message-initial slot, rank bins, windows.
// NOTHING here reads the speaker field, a nickname list, capitals (tokens are lowercased), a POS prior or a word list.
export const INF = 1e9;
export const WS = [8, 32, 128, INF];
const lb = (a, x) => { let lo = 0, hi = a.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < x) lo = mid + 1; else hi = mid; } return lo; };
const ub = (a, x) => { let lo = 0, hi = a.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] <= x) lo = mid + 1; else hi = mid; } return lo; };
/** Build the index of one day's stream T = array of messages, each an array of lowercase tokens. */
export function buildIndex(T) {
  const count = new Map(); for (const m of T) for (const w of m) count.set(w, (count.get(w) ?? 0) + 1);
  const order = [...count].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)), bins = new Map();
  order.forEach(([w], r) => bins.set(w, Math.min(11, Math.floor(Math.log2(r + 1)))));
  const msgIdx = new Map(), initIdx = new Map(), initNext = new Map(), nonInit = new Map();
  const push = (mp, w, v) => (mp.get(w) ?? mp.set(w, []).get(w)).push(v);
  T.forEach((m, k) => {
    const seen = new Set();
    m.forEach((w, i) => { if (!seen.has(w)) { seen.add(w); push(msgIdx, w, k); } });
    push(initIdx, m[0], k); push(initNext, m[0], m.length > 1 ? bins.get(m[1]) : 12);
    for (let i = 1; i < m.length; i++) push(nonInit, m[i], [k, i, i + 1 < m.length ? bins.get(m[i + 1]) : 12]);
  });
  return { T, count, bins, msgIdx, initIdx, initNext, nonInit };
}
const rng = (m, W, mode, n) => (mode === "C" ? [[Math.max(0, m - W), m - 1]] : [[Math.max(0, m - W), m - 1], [m + 1, Math.min(n - 1, m + W)]]);
const cntIn = (a, rs) => (a ? rs.reduce((s, [lo, hi]) => s + (hi >= lo ? ub(a, hi) - lb(a, lo) : 0), 0) : 0);
const sliceIn = (a, rs) => { const out = []; if (!a) return out; for (const [lo, hi] of rs) for (let j = lb(a, lo); hi >= lo && j < a.length && a[j] <= hi; j++) out.push(j); return out; };
const entropy = (xs) => { const c = new Map(); for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1); let h = 0; for (const v of c.values()) { const p = v / xs.length; h -= p * Math.log2(p); } return h; };
/** All candidate columns for the occurrence (message m, token index i, form w). Stat families (X = window W in messages, mode C = prefix only / T = both sides, current message excluded):
 *  CNT = messages in the window containing w (RIVAL: plain local recurrence); INIT = messages in the window where w is the FIRST word (candidate R1);
 *  ISHARE = (INIT+1)/(CNT+2) (Laplace; concentration in the first-word slot, candidate R2); NDIV = distinct next-token FORMS after w's first-word occurrences, smoothed (distinct+1)/(n+2);
 *  NBIN = entropy of the next-token RANK BIN after w's first-word occurrences (frame specificity, higher = less specific); REC = -log2(1+gap to the last earlier first-word occurrence, capped 512);
 *  FNEXT = -(rank bin of the token after this occurrence, 12 at message end) (vocative frame, available at first mention); CON = 1 - overlap of next-bin distributions initial vs non-initial (prefix). */
export function scoresAt(ix, m, i, w) {
  const n = ix.T.length, out = {}, cur = ix.T[m];
  for (const mode of ["C", "T"]) for (const W of WS) {
    const rs = rng(m, W, mode, n), tag = `${mode}${W === INF ? "inf" : W}`;
    const c = cntIn(ix.msgIdx.get(w), rs), ii = sliceIn(ix.initIdx.get(w), rs);
    out[`CNT_${tag}`] = c; out[`INIT_${tag}`] = ii.length; out[`ISHARE_${tag}`] = (ii.length + 1) / (c + 2);
    if (W === 128 || W === INF) {
      const nx = ii.map((j) => ix.initNext.get(w)[j]); out[`NBIN_${tag}`] = ii.length >= 2 ? entropy(nx) : 0;
      const nf = ii.map((j) => ix.T[ix.initIdx.get(w)[j]][1] ?? "$"); out[`NDIV_${tag}`] = (new Set(nf).size + 1) / (ii.length + 2);
    }
  }
  const ia = ix.initIdx.get(w) ?? [], p = lb(ia, m) - 1; out.REC_C = -Math.log2(1 + (p >= 0 ? Math.min(512, m - ia[p]) : 512));
  out.FNEXT = -(i + 1 < cur.length ? ix.bins.get(cur[i + 1]) : 12);
  const a = (ix.initNext.get(w) ?? []).slice(0, Math.max(0, lb(ix.initIdx.get(w) ?? [], m))), b = (ix.nonInit.get(w) ?? []).filter((r) => r[0] < m).map((r) => r[2]);
  if (a.length >= 2 && b.length >= 2) { const pa = new Array(13).fill(0), pb = new Array(13).fill(0); a.forEach((x) => pa[x] += 1 / a.length); b.forEach((x) => pb[x] += 1 / b.length); out.CON_C = 1 - pa.reduce((s, x, k) => s + Math.min(x, pb[k]), 0); } else out.CON_C = 0;
  return out;
}
