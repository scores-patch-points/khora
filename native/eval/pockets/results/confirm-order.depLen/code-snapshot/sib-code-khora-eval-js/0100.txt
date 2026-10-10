// strat.mjs — STRATIFIED AUC (cell-pooled matching). Every positive is compared with ALL negatives in its matching cell (ties 0.5); per-positive win rates are averaged. This is the 1-1 matched design without the
// throw-away of unmatched positives and negatives (the count-only census showed 1-1 pairs are too few on tiny streams and in UD). Negatives are pooled across the given docs when pooled=true; each occurrence is scored inside its own doc.
// CI = bootstrap over CLUSTERS = (doc, form) pairs, so repeated mentions of one name count once (conservative). Controls are the same raw columns compared the same way. rivalBin adds log2(1+CNT_C128) to the cell (beyond-count AUC).
import { streamIndex, ishare, cnt128, rngOf, SEED, round } from "./lib.mjs";
import { KEY_EXACT, KEY_COARSE } from "./pairs.mjs";
const ibk = (i) => (i <= 3 ? i : i <= 5 ? 4 : i <= 9 ? 5 : 6), fq2 = (n) => Math.floor(2 * Math.log2(Math.max(1, n))), clb = (w) => Math.min(11, [...w].length), mlb4 = (n) => (n <= 4 ? 0 : n <= 8 ? 1 : n <= 16 ? 2 : 3);
export const KEY_A = (o, ix) => [ibk(o.i), fq2(ix.count.get(o.w)), clb(o.w), mlb4(o.len)].join("|");
export { KEY_EXACT, KEY_COARSE };
const COLS = ["ishare", "i", "len", "cl", "lc"], CTLS = ["i", "len", "cl", "lc"];
export function stratAuc(docs, classOf, keyFn, { pooled = false, rivalBin = false, seed = "strat", B = 500 } = {}) {
  const P = [], N = new Map();
  for (const d of docs) {
    const ix = streamIndex(d.T), seen = new Map();
    d.T.forEach((m, k) => m.forEach((w, i) => {
      const kk = seen.get(w) ?? 0; seen.set(w, kk + 1); if (kk === 0) return; const c = classOf(d, k, i, w); if (!c) return;
      const o = { w, i, len: m.length }, cn = cnt128(ix, w, k); o.key = (pooled ? "" : d.key + "#") + keyFn(o, ix) + (rivalBin ? "|r" + Math.floor(Math.log2(1 + cn)) : "");
      o.v = { ishare: ishare(ix, w, k), i, len: m.length, cl: [...w].length, lc: Math.log2(ix.count.get(w)) }; o.cl = d.key + "|" + w; o.init = i === 0; o.dep = d.D?.[k]?.[i]; o.docid = d.docid?.[k] ?? d.key;
      if (c === "P") P.push(o); else (N.get(o.key) ?? N.set(o.key, []).get(o.key)).push(o);
    }));
  }
  const rows = [];
  for (const p of P) { const a = N.get(p.key); if (!a?.length) continue; const r = { cl: p.cl, init: p.init, dep: p.dep, docid: p.docid, win: {} }; for (const c of COLS) { let s = 0; for (const q of a) s += p.v[c] > q.v[c] ? 1 : p.v[c] === q.v[c] ? 0.5 : 0; r.win[c] = s / a.length; } rows.push(r); }
  const out = summarize(rows, P.length, N, seed, B); Object.defineProperty(out, "rows", { value: rows, enumerable: false }); return out;
}
const mean = (rs, c) => rs.reduce((s, r) => s + r.win[c], 0) / Math.max(1, rs.length);
export function summarize(rows, nPos, N, seed, B = 500) {
  const out = { nPos, covered: rows.length, negTokens: N ? [...N.values()].reduce((s, a) => s + a.length, 0) : null, clusters: new Set(rows.map((r) => r.cl)).size, auc: {}, ci: null };
  for (const c of COLS) out.auc[c] = rows.length ? round(mean(rows, c)) : null;
  out.ctlOk = rows.length ? CTLS.every((c) => out.auc[c] >= 0.45 && out.auc[c] <= 0.55) : false;
  if (rows.length >= 10) {
    const by = new Map(); for (const r of rows) (by.get(r.cl) ?? by.set(r.cl, []).get(r.cl)).push(r); const cl = [...by.values()], rnd = rngOf(SEED, seed), v = [];
    for (let b = 0; b < B; b++) { const pick = []; for (let k = 0; k < cl.length; k++) pick.push(...cl[Math.floor(rnd() * cl.length)]); v.push(mean(pick, "ishare")); }
    v.sort((a, b) => a - b); out.ci = [round(v[Math.floor(0.025 * B)]), round(v[Math.ceil(0.975 * B) - 1])]; out.nullQ95 = round(0.5 + (1.645 * 0.5) / Math.sqrt(out.clusters));
  }
  return out;
}
